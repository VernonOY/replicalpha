"""FastAPI router exposing the replicalpha agent over HTTP.

Endpoints (all prefixed with ``/agent``):

- ``GET  /agent/tools``                   — JSON list of registered tool schemas
- ``POST /agent/chat``                    — SSE stream of agent events for one user turn
- ``POST /agent/chat/{session_id}/cancel``— Cooperatively cancels an in-flight chat
- ``GET  /agent/chat/{session_id}``       — JSON snapshot of a session's history + cost

Session storage
---------------
For v0.4 we keep sessions in a process-local in-memory dict. This works for
the single-process FastAPI deployment that the frontend chat box targets but
is **non-persistent** — restarts wipe state. Phase 3 will replace
:data:`_SESSIONS` and :data:`_CANCELLATION` with a SQLite-backed store.

Cancellation
------------
Cancellation is cooperative: the streaming generator checks
``_CANCELLATION[session_id]`` between agent events and emits an ``error``
+ ``done`` pair when the flag flips. Because we cannot interrupt the
underlying Anthropic SDK stream mid-token, "between iterations" really
means "between yielded :class:`Event` objects" — a long single tool call
will still finish before cancellation takes effect.
"""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
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

# ---------------------------------------------------------------------------
# Module-level state (v0.4 only — replaced by SQLite in Phase 3)
# ---------------------------------------------------------------------------

_SESSIONS: dict[str, AgentSession] = {}
_CANCELLATION: dict[str, bool] = {}

# Single shared registry per-process. Building registries is cheap but the
# Anthropic tools list is identical across requests, so caching avoids
# re-allocating 15 schemas per call.
_REGISTRY: ToolRegistry | None = None


def _get_registry() -> ToolRegistry:
    global _REGISTRY
    if _REGISTRY is None:
        _REGISTRY = build_default_registry()
    return _REGISTRY


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
    """Construct an :class:`AgentRunner` for one chat request.

    Imported lazily so tests can monkeypatch it. Pulls
    ``RUNS_ROOT`` / ``DATA_CSV`` from :mod:`replicalpha.server.main` at call
    time so test reconfiguration of those constants is honoured.
    """
    from replicalpha.server import main as server_main

    ctx = ToolContext(
        runs_root=server_main.RUNS_ROOT,
        current_run_id=None,
        data_csv=server_main.DATA_CSV,
    )
    return AgentRunner(registry=_get_registry(), ctx=ctx, model=model)


def _sse_frame(event: Event) -> str:
    """Render one :class:`Event` as an SSE frame."""
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
    """Return the JSON-serialisable list of registered tool schemas."""
    schemas = _get_registry().list_schemas()
    return {"tools": [s.model_dump() for s in schemas]}


# ---------------------------------------------------------------------------
# GET /agent/chat/{session_id}
# ---------------------------------------------------------------------------


@router.get("/chat/{session_id}")
def get_session(session_id: str) -> dict[str, Any]:
    """Return the in-memory session state, or 404."""
    sess = _SESSIONS.get(session_id)
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
    """Flip the cooperative-cancel flag for a session.

    Returns 204 even if the session does not exist (idempotent) so that
    clients can fire-and-forget cancel without racing the session creation.
    """
    _CANCELLATION[session_id] = True


# ---------------------------------------------------------------------------
# POST /agent/chat — SSE stream
# ---------------------------------------------------------------------------


# Heartbeat every N seconds during quiet periods to keep proxies from
# closing the connection.
_HEARTBEAT_INTERVAL_S = 15.0


async def _stream_chat(
    session: AgentSession,
    user_message: str,
) -> AsyncIterator[str]:
    """Yield SSE-formatted strings for one chat turn.

    Sends the ``session`` frame first, then each :class:`Event` from the
    runner, with a comment heartbeat every 15s during quiet periods. If
    cancellation is requested, emits an ``error`` (code ``cancelled``) +
    ``done`` and stops.
    """
    yield _sse_session_frame(session.session_id, session.run_id)

    runner = _build_runner(session.model)
    iterator = runner.run(session, user_message).__aiter__()

    while True:
        # Cancellation is checked before every event so a long-running
        # iteration boundary still observes the flag promptly.
        if _CANCELLATION.get(session.session_id):
            _CANCELLATION[session.session_id] = False
            yield _sse_frame(Event(type="error", data={"code": "cancelled"}))
            yield _sse_frame(Event(type="done", data={}))
            return

        try:
            event = await asyncio.wait_for(iterator.__anext__(), timeout=_HEARTBEAT_INTERVAL_S)
        except TimeoutError:
            # Quiet period — emit a comment heartbeat and continue.
            yield ": ping\n\n"
            continue
        except StopAsyncIteration:
            return

        yield _sse_frame(event)
        if event.type == "done":
            return


@router.post("/chat")
async def chat(req: ChatRequest) -> StreamingResponse:
    """Stream one agent turn over Server-Sent Events.

    The first emitted frame is always a synthetic ``session`` event so the
    client knows the assigned ``session_id`` / ``run_id`` even before the
    model produces any text.
    """
    session_id = req.session_id or f"chat-{uuid4().hex[:12]}"
    session = _SESSIONS.get(session_id)
    if session is None:
        session = AgentSession(
            session_id=session_id,
            run_id=req.run_id,
            model=req.model,
            cost_cap_usd=req.cost_cap_usd,
            history=list(req.history) if req.history else [],
        )
        _SESSIONS[session_id] = session
    else:
        # Continuation: refresh per-call knobs. We deliberately do not
        # overwrite ``history`` if the client supplies one — server-side
        # state is the source of truth for a known session.
        if req.run_id is not None:
            session.run_id = req.run_id
        session.model = req.model
        session.cost_cap_usd = req.cost_cap_usd

    # Reset any stale cancellation flag from a previous turn.
    _CANCELLATION[session_id] = False

    headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
    }
    return StreamingResponse(
        _stream_chat(session, req.message),
        media_type="text/event-stream",
        headers=headers,
    )
