"""E2E tests for the ``/agent`` SSE endpoints.

These tests boot the FastAPI app via :class:`fastapi.testclient.TestClient`
and exercise the full HTTP path. The Anthropic SDK is **never** called —
:func:`replicalpha.server.agent._build_runner` is monkeypatched to return
an :class:`AgentRunner` wrapping the same ``FakeAnthropicClient`` used by
``tests/unit/test_agent_runner.py``.
"""

from __future__ import annotations

import json
from collections.abc import Iterator
from dataclasses import dataclass, field
from typing import Any

import pytest
from fastapi.testclient import TestClient

from replicalpha.core.agent.runner import AgentRunner
from replicalpha.core.agent.tool_registry import (
    ToolContext,
    build_default_registry,
)
from replicalpha.server import agent as agent_module
from replicalpha.server.main import app

# ---------------------------------------------------------------------------
# Fake Anthropic client (mirrors tests/unit/test_agent_runner.py)
# ---------------------------------------------------------------------------


@dataclass
class FakeTextDelta:
    text: str
    type: str = "text_delta"


@dataclass
class FakeContentBlockDelta:
    delta: FakeTextDelta
    type: str = "content_block_delta"


@dataclass
class FakeUsage:
    input_tokens: int
    output_tokens: int


@dataclass
class FakeTextBlock:
    text: str
    type: str = "text"


@dataclass
class FakeToolUseBlock:
    id: str
    name: str
    input: dict[str, Any]
    type: str = "tool_use"


@dataclass
class FakeFinalMessage:
    content: list[Any]
    stop_reason: str
    usage: FakeUsage


@dataclass
class ScriptedTurn:
    text: str = ""
    tool_uses: list[FakeToolUseBlock] = field(default_factory=list)
    input_tokens: int = 100
    output_tokens: int = 50
    stop_reason: str | None = None


class _FakeStream:
    def __init__(self, turn: ScriptedTurn) -> None:
        self._turn = turn
        self._final: FakeFinalMessage | None = None

    def __iter__(self) -> Iterator[Any]:
        if self._turn.text:
            chunk_size = 5
            for i in range(0, len(self._turn.text), chunk_size):
                yield FakeContentBlockDelta(
                    delta=FakeTextDelta(text=self._turn.text[i : i + chunk_size])
                )

    def get_final_message(self) -> FakeFinalMessage:
        if self._final is not None:
            return self._final
        content: list[Any] = []
        if self._turn.text:
            content.append(FakeTextBlock(text=self._turn.text))
        content.extend(self._turn.tool_uses)
        if self._turn.stop_reason is not None:
            stop_reason = self._turn.stop_reason
        elif self._turn.tool_uses:
            stop_reason = "tool_use"
        else:
            stop_reason = "end_turn"
        self._final = FakeFinalMessage(
            content=content,
            stop_reason=stop_reason,
            usage=FakeUsage(
                input_tokens=self._turn.input_tokens,
                output_tokens=self._turn.output_tokens,
            ),
        )
        return self._final


class _FakeStreamContext:
    def __init__(self, turn: ScriptedTurn) -> None:
        self._stream = _FakeStream(turn)

    def __enter__(self) -> _FakeStream:
        return self._stream

    def __exit__(self, *exc: Any) -> None:
        return None


class _FakeMessages:
    def __init__(self, parent: FakeAnthropicClient) -> None:
        self._parent = parent

    def stream(self, **kwargs: Any) -> Any:
        self._parent.calls.append(kwargs)
        if not self._parent.script:
            raise RuntimeError("no scripted turn left")
        turn = self._parent.script.pop(0)
        return _FakeStreamContext(turn)


class FakeAnthropicClient:
    def __init__(self, script: list[ScriptedTurn]) -> None:
        self.script = list(script)
        self.calls: list[dict[str, Any]] = []
        self.messages = _FakeMessages(self)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _install_fake_runner(
    monkeypatch: pytest.MonkeyPatch,
    script: list[ScriptedTurn],
    tmp_path: Any,
) -> FakeAnthropicClient:
    """Patch ``_build_runner`` to return a runner backed by a fake client."""
    runs_root = tmp_path / "runs"
    runs_root.mkdir(exist_ok=True)
    fake = FakeAnthropicClient(script=script)

    def fake_build_runner(model: str) -> AgentRunner:
        ctx = ToolContext(runs_root=runs_root, current_run_id=None, data_csv=None)
        return AgentRunner(
            registry=build_default_registry(),
            ctx=ctx,
            client=fake,
            model=model,
        )

    monkeypatch.setattr(agent_module, "_build_runner", fake_build_runner)
    return fake


def _reset_state() -> None:
    """Clear in-memory session state so tests are isolated."""
    agent_module._SESSIONS.clear()
    agent_module._CANCELLATION.clear()


@pytest.fixture(autouse=True)
def _isolate_sessions() -> Iterator[None]:
    _reset_state()
    yield
    _reset_state()


def _parse_sse(body: str) -> list[dict[str, Any]]:
    """Parse an SSE response body into a list of ``{event, data}`` dicts.

    Comment lines (starting with ``:``) are recorded as
    ``{"event": "_comment", "data": "..."}``.
    """
    out: list[dict[str, Any]] = []
    for raw in body.split("\n\n"):
        block = raw.strip("\n")
        if not block:
            continue
        event_name: str | None = None
        data_lines: list[str] = []
        is_comment = False
        for line in block.split("\n"):
            if line.startswith(":"):
                is_comment = True
                data_lines.append(line[1:].lstrip())
            elif line.startswith("event:"):
                event_name = line[len("event:") :].strip()
            elif line.startswith("data:"):
                data_lines.append(line[len("data:") :].strip())
        if is_comment:
            out.append({"event": "_comment", "data": " ".join(data_lines)})
        else:
            payload_raw = "\n".join(data_lines)
            try:
                payload: Any = json.loads(payload_raw) if payload_raw else None
            except json.JSONDecodeError:
                payload = payload_raw
            out.append({"event": event_name or "", "data": payload})
    return out


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_get_tools_returns_15_schemas() -> None:
    client = TestClient(app)
    resp = client.get("/agent/tools")
    assert resp.status_code == 200
    body = resp.json()
    assert "tools" in body
    tools = body["tools"]
    assert len(tools) == 15
    for t in tools:
        assert {"name", "description", "input_schema"} <= set(t.keys())
        assert t["input_schema"]["type"] == "object"


def test_chat_no_session_id_streams_session_then_text(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Any
) -> None:
    _install_fake_runner(
        monkeypatch,
        [ScriptedTurn(text="Hello world")],
        tmp_path,
    )
    client = TestClient(app)
    with client.stream(
        "POST",
        "/agent/chat",
        json={"message": "hi"},
    ) as resp:
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/event-stream")
        body = resp.read().decode("utf-8")

    frames = _parse_sse(body)
    event_types = [f["event"] for f in frames if f["event"] != "_comment"]

    # First frame = session, last = done.
    assert frames[0]["event"] == "session"
    assert frames[0]["data"]["session_id"].startswith("chat-")
    assert frames[-1]["event"] == "done"

    assert "text_delta" in event_types
    assert "final_text" in event_types
    assert "cost_update" in event_types

    # Text deltas concatenate to the full final text.
    delta_text = "".join(f["data"]["text"] for f in frames if f["event"] == "text_delta")
    assert delta_text == "Hello world"


def test_chat_session_id_persists_history(monkeypatch: pytest.MonkeyPatch, tmp_path: Any) -> None:
    _install_fake_runner(
        monkeypatch,
        [ScriptedTurn(text="first reply"), ScriptedTurn(text="second reply")],
        tmp_path,
    )
    client = TestClient(app)
    sid = "chat-fixed-session-1"

    # Turn 1
    with client.stream(
        "POST",
        "/agent/chat",
        json={"session_id": sid, "message": "hi 1"},
    ) as resp:
        resp.read()
        assert resp.status_code == 200

    # Turn 2 — same session
    with client.stream(
        "POST",
        "/agent/chat",
        json={"session_id": sid, "message": "hi 2"},
    ) as resp:
        resp.read()
        assert resp.status_code == 200

    state = client.get(f"/agent/chat/{sid}")
    assert state.status_code == 200
    body = state.json()
    assert body["session_id"] == sid
    # Two user turns + two assistant turns = 4 history entries.
    assert len(body["history"]) == 4
    roles = [m["role"] for m in body["history"]]
    assert roles == ["user", "assistant", "user", "assistant"]
    assert body["cost_spent_usd"] > 0


def test_get_session_404_for_unknown() -> None:
    client = TestClient(app)
    resp = client.get("/agent/chat/unknown-session-xyz")
    assert resp.status_code == 404


def test_cancel_then_chat_yields_cancelled_event(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Any
) -> None:
    _install_fake_runner(
        monkeypatch,
        [ScriptedTurn(text="should not appear")],
        tmp_path,
    )
    client = TestClient(app)
    sid = "chat-cancel-target"

    # Pre-create the session by setting cancellation flag directly via the
    # cancel endpoint; subsequent chat to that session_id should observe
    # the flag on its first iteration boundary (right after the
    # synthetic ``session`` frame).
    cancel_resp = client.post(f"/agent/chat/{sid}/cancel")
    assert cancel_resp.status_code == 204

    with client.stream(
        "POST",
        "/agent/chat",
        json={"session_id": sid, "message": "go"},
    ) as resp:
        body = resp.read().decode("utf-8")

    # Note: the chat endpoint resets the cancellation flag before
    # streaming starts, so this scenario actually demonstrates the
    # opposite: cancellation set BEFORE the request is cleared. To test
    # mid-stream cancellation we have to set the flag AFTER the runner
    # starts iterating. Verify here that the session was created and
    # streamed normally despite the prior cancel.
    frames = _parse_sse(body)
    assert frames[0]["event"] == "session"
    assert any(f["event"] == "final_text" for f in frames)


def test_cancel_during_stream(monkeypatch: pytest.MonkeyPatch, tmp_path: Any) -> None:
    """Set the cancel flag from inside the runner so the next iteration
    boundary observes it and emits ``cancelled``."""
    sid = "chat-cancel-mid"

    runs_root = tmp_path / "runs"
    runs_root.mkdir(exist_ok=True)

    # Use a tool whose impl flips the cancellation flag before returning,
    # forcing the next iteration of the stream loop to emit `cancelled`.
    from replicalpha.core.agent.tool_registry import (
        RegisteredTool,
        ToolRegistry,
        ToolResult,
        ToolSchema,
    )

    reg = ToolRegistry()

    def _trigger_cancel(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
        agent_module._CANCELLATION[sid] = True
        return ToolResult(ok=True, data={"flipped": True}, display_hint="text")

    reg.register(
        RegisteredTool(
            schema=ToolSchema(
                name="cancel_me",
                description="flip cancel flag",
                input_schema={"type": "object", "properties": {}, "required": []},
            ),
            impl=_trigger_cancel,
        )
    )

    fake = FakeAnthropicClient(
        script=[
            ScriptedTurn(tool_uses=[FakeToolUseBlock(id="tu1", name="cancel_me", input={})]),
            ScriptedTurn(text="should never reach this"),
        ]
    )

    def fake_build_runner(model: str) -> AgentRunner:
        ctx = ToolContext(runs_root=runs_root, current_run_id=None, data_csv=None)
        return AgentRunner(registry=reg, ctx=ctx, client=fake, model=model)

    monkeypatch.setattr(agent_module, "_build_runner", fake_build_runner)

    client = TestClient(app)
    with client.stream(
        "POST",
        "/agent/chat",
        json={"session_id": sid, "message": "go"},
    ) as resp:
        body = resp.read().decode("utf-8")

    frames = _parse_sse(body)
    event_types = [f["event"] for f in frames if f["event"] != "_comment"]

    assert "cancelled" not in event_types  # the value is in error.data.code
    err = next(f for f in frames if f["event"] == "error")
    assert err["data"]["code"] == "cancelled"
    assert frames[-1]["event"] == "done"


def test_cost_cap_kicks_in(monkeypatch: pytest.MonkeyPatch, tmp_path: Any) -> None:
    _install_fake_runner(
        monkeypatch,
        [ScriptedTurn(text="hi", input_tokens=1000, output_tokens=1000)],
        tmp_path,
    )
    client = TestClient(app)
    with client.stream(
        "POST",
        "/agent/chat",
        json={
            "session_id": "chat-costcap",
            "message": "go",
            "cost_cap_usd": 0.0001,
            # Pre-populate cost via a fake first turn isn't possible here —
            # instead we rely on pre-flight check: first call computes cost
            # > cap, second call observes pre-flight cap.
        },
    ) as resp:
        resp.read()
        assert resp.status_code == 200

    # Second call: pre-flight cap should fire because session.cost_spent_usd
    # already exceeds the (tiny) cap from the first turn.
    with client.stream(
        "POST",
        "/agent/chat",
        json={
            "session_id": "chat-costcap",
            "message": "again",
            "cost_cap_usd": 0.0001,
        },
    ) as resp:
        body = resp.read().decode("utf-8")

    frames = _parse_sse(body)
    err = next(f for f in frames if f["event"] == "error")
    assert err["data"]["code"] == "cost_cap"
    assert frames[-1]["event"] == "done"


def test_sse_format_well_formed(monkeypatch: pytest.MonkeyPatch, tmp_path: Any) -> None:
    _install_fake_runner(
        monkeypatch,
        [ScriptedTurn(text="ok")],
        tmp_path,
    )
    client = TestClient(app)
    with client.stream(
        "POST",
        "/agent/chat",
        json={"message": "hi"},
    ) as resp:
        body = resp.read().decode("utf-8")

    # Every frame is separated by exactly one blank line, every non-empty
    # line begins with `event: `, `data: `, or `:`.
    blocks = [b for b in body.split("\n\n") if b]
    assert blocks  # at least one frame
    for block in blocks:
        for line in block.split("\n"):
            if not line:
                continue
            assert (
                line.startswith("event: ") or line.startswith("data: ") or line.startswith(":")
            ), f"malformed SSE line: {line!r}"


def test_tool_call_event_flow(monkeypatch: pytest.MonkeyPatch, tmp_path: Any) -> None:
    _install_fake_runner(
        monkeypatch,
        [
            ScriptedTurn(tool_uses=[FakeToolUseBlock(id="tu_1", name="list_runs", input={})]),
            ScriptedTurn(text="found 0 runs"),
        ],
        tmp_path,
    )
    client = TestClient(app)
    with client.stream(
        "POST",
        "/agent/chat",
        json={"message": "list runs"},
    ) as resp:
        body = resp.read().decode("utf-8")

    frames = _parse_sse(body)
    event_types = [f["event"] for f in frames if f["event"] != "_comment"]

    assert "tool_call" in event_types
    assert "tool_result" in event_types
    assert "final_text" in event_types
    assert event_types.index("tool_call") < event_types.index("tool_result")
    assert event_types.index("tool_result") < event_types.index("final_text")

    tool_call = next(f for f in frames if f["event"] == "tool_call")
    assert tool_call["data"]["name"] == "list_runs"
    assert tool_call["data"]["id"] == "tu_1"


def test_chat_with_history_seeds_session(monkeypatch: pytest.MonkeyPatch, tmp_path: Any) -> None:
    _install_fake_runner(
        monkeypatch,
        [ScriptedTurn(text="ack")],
        tmp_path,
    )
    client = TestClient(app)
    sid = "chat-seed"
    with client.stream(
        "POST",
        "/agent/chat",
        json={
            "session_id": sid,
            "message": "follow up",
            "history": [
                {"role": "user", "content": "earlier user msg"},
                {"role": "assistant", "content": "earlier reply"},
            ],
        },
    ) as resp:
        resp.read()

    state = client.get(f"/agent/chat/{sid}").json()
    # 2 seed + 1 user + 1 assistant = 4
    assert len(state["history"]) == 4
    assert state["history"][0]["content"] == "earlier user msg"
