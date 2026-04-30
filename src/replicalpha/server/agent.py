"""FastAPI router exposing the replicalpha agent over HTTP.

Endpoints (all prefixed with ``/agent``):

- ``GET  /agent/tools``                   — JSON list of registered tool schemas
- ``POST /agent/chat``                    — SSE stream of agent events for one user turn
- ``POST /agent/chat/{session_id}/cancel``— Cooperatively cancels an in-flight chat
- ``GET  /agent/chat/{session_id}``       — JSON snapshot of a session's history + cost

Session storage
---------------
Sessions are persisted to SQLite via :class:`replicalpha.core.storage.Storage`.
The DB path defaults to ``~/.replicalpha/db.sqlite`` and can be overridden
with the ``REPLICALPHA_DB_PATH`` environment variable (used by tests).

Cancellation
------------
Cancellation is cooperative: the streaming generator checks
``_CANCELLATION[session_id]`` between agent events and emits an ``error``
+ ``done`` pair when the flag flips. Because we cannot interrupt the
underlying Anthropic SDK stream mid-token, "between iterations" really
means "between yielded :class:`Event` objects" — a long single tool call
will still finish before cancellation takes effect. The cancellation map
stays in-memory because it is transient by design.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import os
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict

from replicalpha.core.agent.runner import (
    AgentRunner,
    AgentSession,
    ChatMessage,
    Event,
)
from replicalpha.core.agent.tool_registry import (
    ToolContext,
    ToolRegistry,
    build_default_registry,
)
from replicalpha.core.storage import DEFAULT_DB_PATH, Storage

# ---------------------------------------------------------------------------
# Module-level state
# ---------------------------------------------------------------------------

# Cancellation is transient — keep it in-memory.
_CANCELLATION: dict[str, bool] = {}

# Single shared registry per-process. Building registries is cheap but the
# Anthropic tools list is identical across requests, so caching avoids
# re-allocating 15 schemas per call.
_REGISTRY: ToolRegistry | None = None

# Lazily-constructed storage handle. Reading the env var here (instead of at
# import time) lets tests set ``REPLICALPHA_DB_PATH`` and then call
# :func:`_reset_storage_for_tests` to pick up the new path.
_STORAGE: Storage | None = None


def _get_registry() -> ToolRegistry:
    global _REGISTRY
    if _REGISTRY is None:
        _REGISTRY = build_default_registry()
    return _REGISTRY


def _get_storage() -> Storage:
    global _STORAGE
    if _STORAGE is None:
        path_str = os.environ.get("REPLICALPHA_DB_PATH")
        path = Path(path_str) if path_str else DEFAULT_DB_PATH
        _STORAGE = Storage(path)
        _STORAGE.init_schema()
    return _STORAGE


def _reset_storage_for_tests() -> None:
    """Drop the cached storage handle. Tests use this after rewiring the env var."""
    global _STORAGE
    if _STORAGE is not None:
        _STORAGE.close()
    _STORAGE = None


def _hydrate_session(session_id: str) -> AgentSession | None:
    """Rebuild an :class:`AgentSession` from its DB rows, or ``None`` if absent."""
    storage = _get_storage()
    row = storage.get_session(session_id)
    if row is None:
        return None
    msgs = storage.get_messages(session_id, limit=10_000)
    history = [ChatMessage(role=m["role"], content=m["content"]) for m in msgs]
    return AgentSession(
        session_id=row["session_id"],
        run_id=row["run_id"],
        model=row["model"] or "claude-haiku-4-5-20251001",
        cost_cap_usd=float(row["cost_cap_usd"] or 0.50),
        cost_spent_usd=float(row["cost_spent_usd"] or 0.0),
        history=history,
    )


def _persist_session(session: AgentSession, new_messages: list[ChatMessage]) -> None:
    """Write session row + append any new messages to the DB."""
    storage = _get_storage()
    storage.upsert_session(
        session_id=session.session_id,
        run_id=session.run_id,
        model=session.model,
        cost_cap_usd=session.cost_cap_usd,
        cost_spent_usd=session.cost_spent_usd,
    )
    for m in new_messages:
        storage.append_message(
            session_id=session.session_id,
            role=m.role,
            content=m.content,
        )


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------


class ChatRequest(BaseModel):
    """POST /agent/chat request body."""

    model_config = ConfigDict(extra="forbid")

    message: str
    session_id: str | None = None
    run_id: str | None = None
    model: str = "claude-haiku-4-5-20251001"
    cost_cap_usd: float = 0.50
    history: list[ChatMessage] | None = None


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------


router = APIRouter(prefix="/agent", tags=["agent"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_runner(model: str) -> AgentRunner:
    """Construct an :class:`AgentRunner` for one chat request."""
    from replicalpha.server import main as server_main

    ctx = ToolContext(
        runs_root=server_main.RUNS_ROOT,
        current_run_id=None,
        data_csv=server_main.DATA_CSV,
    )
    return AgentRunner(registry=_get_registry(), ctx=ctx, model=model)


def _sse_frame(event: Event) -> str:
    payload = json.dumps(event.data, default=str)
    return f"event: {event.type}\ndata: {payload}\n\n"


def _sse_session_frame(session_id: str, run_id: str | None) -> str:
    payload = json.dumps({"session_id": session_id, "run_id": run_id})
    return f"event: session\ndata: {payload}\n\n"


# ---------------------------------------------------------------------------
# GET /agent/tools
# ---------------------------------------------------------------------------


@router.get("/tools")
def list_tools() -> dict[str, list[dict[str, Any]]]:
    schemas = _get_registry().list_schemas()
    return {"tools": [s.model_dump() for s in schemas]}


# ---------------------------------------------------------------------------
# GET /agent/chat/{session_id}
# ---------------------------------------------------------------------------


@router.get("/chat/{session_id}")
def get_session(session_id: str) -> dict[str, Any]:
    sess = _hydrate_session(session_id)
    if sess is None:
        raise HTTPException(status_code=404, detail=f"session {session_id} not found")
    return {
        "session_id": sess.session_id,
        "run_id": sess.run_id,
        "history": [m.model_dump() for m in sess.history],
        "cost_spent_usd": sess.cost_spent_usd,
        "cost_cap_usd": sess.cost_cap_usd,
    }


# ---------------------------------------------------------------------------
# POST /agent/chat/{session_id}/cancel
# ---------------------------------------------------------------------------


@router.post("/chat/{session_id}/cancel", status_code=204)
def cancel_session(session_id: str) -> None:
    _CANCELLATION[session_id] = True


# ---------------------------------------------------------------------------
# POST /agent/chat — SSE stream
# ---------------------------------------------------------------------------


_HEARTBEAT_INTERVAL_S = 15.0


async def _stream_chat(
    session: AgentSession,
    user_message: str,
    pre_existing_history_count: int,
) -> AsyncIterator[str]:
    """Yield SSE-formatted strings for one chat turn.

    ``pre_existing_history_count`` is the length of ``session.history`` *before*
    the runner appends the new user message. After streaming completes (success
    or cancel), only history entries beyond this index are persisted, so we
    don't double-write old messages.
    """
    yield _sse_session_frame(session.session_id, session.run_id)

    runner = _build_runner(session.model)
    iterator = runner.run(session, user_message).__aiter__()

    cancelled = False
    while True:
        if _CANCELLATION.get(session.session_id):
            _CANCELLATION[session.session_id] = False
            cancelled = True
            yield _sse_frame(Event(type="error", data={"code": "cancelled"}))
            yield _sse_frame(Event(type="done", data={}))
            break

        try:
            event = await asyncio.wait_for(iterator.__anext__(), timeout=_HEARTBEAT_INTERVAL_S)
        except TimeoutError:
            yield ": ping\n\n"
            continue
        except StopAsyncIteration:
            break

        yield _sse_frame(event)
        if event.type == "done":
            break

    # Persist whatever the runner appended to history during this turn.
    new_messages = session.history[pre_existing_history_count:]
    # Persistence failure must not blow up an in-flight stream.
    with contextlib.suppress(Exception):  # pragma: no cover - defensive
        _persist_session(session, new_messages)
    if cancelled:
        return


@router.post("/chat")
async def chat(req: ChatRequest) -> StreamingResponse:
    session_id = req.session_id or f"chat-{uuid4().hex[:12]}"
    storage = _get_storage()

    session = _hydrate_session(session_id)
    if session is None:
        seed_history = list(req.history) if req.history else []
        session = AgentSession(
            session_id=session_id,
            run_id=req.run_id,
            model=req.model,
            cost_cap_usd=req.cost_cap_usd,
            history=seed_history,
        )
        # Persist the brand-new session row + seed history immediately so a
        # follow-up GET sees it even if the stream errors out below.
        storage.upsert_session(
            session_id=session_id,
            run_id=req.run_id,
            model=req.model,
            cost_cap_usd=req.cost_cap_usd,
            cost_spent_usd=0.0,
        )
        for m in seed_history:
            storage.append_message(session_id, m.role, m.content)
    else:
        # Continuation: refresh per-call knobs only. Server-side history is
        # the source of truth — don't overwrite it from the client payload.
        if req.run_id is not None:
            session.run_id = req.run_id
        session.model = req.model
        session.cost_cap_usd = req.cost_cap_usd

    # Reset any stale cancellation flag from a previous turn.
    _CANCELLATION[session_id] = False

    pre_count = len(session.history)

    headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
    }
    return StreamingResponse(
        _stream_chat(session, req.message, pre_count),
        media_type="text/event-stream",
        headers=headers,
    )
