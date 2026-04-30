"""Unit tests for ``replicalpha.core.agent.runner``.

These tests use a hand-rolled :class:`FakeAnthropicClient` that mimics the
duck-typed surface the runner depends on (``client.messages.stream(...)``
returning a sync context manager whose ``stream`` is iterable and whose
``get_final_message()`` returns a parsed Message). No real API calls are
made.
"""

from __future__ import annotations

import json
from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pytest

from replicalpha.core.agent.runner import (
    AgentRunner,
    AgentSession,
    ChatMessage,
    Event,
    build_system_prompt,
)
from replicalpha.core.agent.tool_registry import (
    RegisteredTool,
    ToolContext,
    ToolRegistry,
    ToolResult,
    ToolSchema,
)

# ---------------------------------------------------------------------------
# Fake Anthropic client
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
    """One scripted model turn.

    ``text`` is split into one delta per word for streaming flavour. If
    ``tool_uses`` is non-empty, the ``stop_reason`` is forced to
    ``tool_use``.
    """

    text: str = ""
    tool_uses: list[FakeToolUseBlock] = field(default_factory=list)
    input_tokens: int = 100
    output_tokens: int = 50
    stop_reason: str | None = None  # auto-derived if None


class _FakeStream:
    def __init__(self, turn: ScriptedTurn) -> None:
        self._turn = turn
        self._final: FakeFinalMessage | None = None

    def __iter__(self) -> Iterator[Any]:
        # Stream the text in chunks of ~5 chars to simulate deltas.
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

        if self._parent.always_raise is not None:
            raise self._parent.always_raise

        if not self._parent.script:
            raise RuntimeError("no scripted turn left")

        turn = self._parent.script[-1] if self._parent.repeat_last else self._parent.script.pop(0)
        return _FakeStreamContext(turn)


class FakeAnthropicClient:
    """Minimal stand-in for :class:`anthropic.Anthropic`."""

    def __init__(
        self,
        script: list[ScriptedTurn] | None = None,
        always_raise: Exception | None = None,
        repeat_last: bool = False,
    ) -> None:
        self.script: list[ScriptedTurn] = list(script or [])
        self.always_raise = always_raise
        self.repeat_last = repeat_last
        self.calls: list[dict[str, Any]] = []
        self.messages = _FakeMessages(self)


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------


def _make_registry(extra_tools: list[RegisteredTool] | None = None) -> ToolRegistry:
    """Tiny registry with two no-op tools that don't touch the filesystem."""
    reg = ToolRegistry()
    list_runs = RegisteredTool(
        schema=ToolSchema(
            name="list_runs",
            description="list runs",
            input_schema={"type": "object", "properties": {}, "required": []},
        ),
        impl=lambda args, ctx: ToolResult(
            ok=True,
            data={"rows": [{"run_id": "a"}, {"run_id": "b"}], "n": 2},
            display_hint="table",
        ),
    )
    compare_runs = RegisteredTool(
        schema=ToolSchema(
            name="compare_runs",
            description="compare runs",
            input_schema={
                "type": "object",
                "properties": {"run_ids": {"type": "array"}},
                "required": ["run_ids"],
            },
        ),
        impl=lambda args, ctx: ToolResult(
            ok=True,
            data={"rows": [{"run_id": "a"}, {"run_id": "b"}], "n": 2},
            display_hint="table",
        ),
    )
    reg.register(list_runs)
    reg.register(compare_runs)
    if extra_tools:
        for t in extra_tools:
            reg.register(t)
    return reg


def _make_session(**kwargs: Any) -> AgentSession:
    base: dict[str, Any] = {"session_id": "sess-1"}
    base.update(kwargs)
    return AgentSession(**base)


def _ctx(tmp_path: Path) -> ToolContext:
    runs = tmp_path / "runs"
    runs.mkdir()
    return ToolContext(runs_root=runs)


async def _collect(runner: AgentRunner, session: AgentSession, msg: str) -> list[Event]:
    events: list[Event] = []
    async for ev in runner.run(session, msg):
        events.append(ev)
    return events


# ---------------------------------------------------------------------------
# 1. Single-turn, no tools
# ---------------------------------------------------------------------------


async def test_single_turn_text_only(tmp_path: Path) -> None:
    client = FakeAnthropicClient(script=[ScriptedTurn(text="Hello world")])
    runner = AgentRunner(registry=_make_registry(), ctx=_ctx(tmp_path), client=client)
    session = _make_session()

    events = await _collect(runner, session, "hi")

    types = [e.type for e in events]
    # text_delta(s) followed by cost_update, final_text, done.
    assert types[0] == "text_delta"
    assert "final_text" in types
    assert types[-1] == "done"
    assert "cost_update" in types
    # Concatenated deltas == final text.
    delta_text = "".join(e.data["text"] for e in events if e.type == "text_delta")
    assert delta_text == "Hello world"
    final = next(e for e in events if e.type == "final_text")
    assert final.data["text"] == "Hello world"
    # Session history grew by user + assistant.
    assert len(session.history) == 2
    assert session.history[0].role == "user"
    assert session.history[1].role == "assistant"
    # Cost incremented.
    assert session.cost_spent_usd > 0


# ---------------------------------------------------------------------------
# 2. Single tool call
# ---------------------------------------------------------------------------


async def test_single_tool_call(tmp_path: Path) -> None:
    client = FakeAnthropicClient(
        script=[
            ScriptedTurn(
                text="",
                tool_uses=[
                    FakeToolUseBlock(id="tu_1", name="list_runs", input={}),
                ],
            ),
            ScriptedTurn(text="You have 2 runs."),
        ]
    )
    runner = AgentRunner(registry=_make_registry(), ctx=_ctx(tmp_path), client=client)
    session = _make_session()

    events = await _collect(runner, session, "list runs")
    types = [e.type for e in events]

    assert "tool_call" in types
    assert "tool_result" in types
    # tool_call should precede tool_result.
    assert types.index("tool_call") < types.index("tool_result")
    # final_text appears only on the second turn.
    assert types[-1] == "done"
    assert types[-2] == "final_text"

    tool_call = next(e for e in events if e.type == "tool_call")
    assert tool_call.data["name"] == "list_runs"
    assert tool_call.data["id"] == "tu_1"

    tool_res = next(e for e in events if e.type == "tool_result")
    assert tool_res.data["result"]["ok"] is True
    assert tool_res.data["result"]["data"]["n"] == 2


# ---------------------------------------------------------------------------
# 3. Two sequential tool calls
# ---------------------------------------------------------------------------


async def test_two_sequential_tool_calls(tmp_path: Path) -> None:
    client = FakeAnthropicClient(
        script=[
            ScriptedTurn(tool_uses=[FakeToolUseBlock(id="tu_a", name="list_runs", input={})]),
            ScriptedTurn(
                tool_uses=[
                    FakeToolUseBlock(
                        id="tu_b",
                        name="compare_runs",
                        input={"run_ids": ["a", "b"]},
                    )
                ]
            ),
            ScriptedTurn(text="Done."),
        ]
    )
    runner = AgentRunner(registry=_make_registry(), ctx=_ctx(tmp_path), client=client)
    session = _make_session()

    events = await _collect(runner, session, "compare them")
    tool_call_names = [e.data["name"] for e in events if e.type == "tool_call"]
    assert tool_call_names == ["list_runs", "compare_runs"]
    assert events[-1].type == "done"
    assert events[-2].type == "final_text"


# ---------------------------------------------------------------------------
# 4. Cost cap reached mid-loop
# ---------------------------------------------------------------------------


async def test_cost_cap_aborts_before_next_iteration(tmp_path: Path) -> None:
    client = FakeAnthropicClient(
        script=[
            ScriptedTurn(
                tool_uses=[FakeToolUseBlock(id="tu_1", name="list_runs", input={})],
                input_tokens=1000,
                output_tokens=1000,  # cost = (1000*1 + 1000*5)/1e6 = 0.006
            ),
            # If it incorrectly proceeds, this turn would emit "should not see"
            ScriptedTurn(text="should not see"),
        ]
    )
    runner = AgentRunner(registry=_make_registry(), ctx=_ctx(tmp_path), client=client)
    session = _make_session(cost_cap_usd=0.0001)

    events = await _collect(runner, session, "go")
    types = [e.type for e in events]

    # Tool call happened (it's in the first turn before the cap-check).
    assert "tool_call" in types
    # Then error because cost exceeded.
    err = next(e for e in events if e.type == "error")
    assert err.data["code"] == "cost_cap"
    assert events[-1].type == "done"
    # No final_text was produced — the loop aborted.
    assert "final_text" not in types
    # Crucially the second turn was never invoked.
    assert len(client.calls) == 1


# ---------------------------------------------------------------------------
# 5. Pre-flight cost cap (already over budget)
# ---------------------------------------------------------------------------


async def test_cost_cap_preflight(tmp_path: Path) -> None:
    client = FakeAnthropicClient(script=[ScriptedTurn(text="hi")])
    runner = AgentRunner(registry=_make_registry(), ctx=_ctx(tmp_path), client=client)
    session = _make_session(cost_cap_usd=0.01, cost_spent_usd=0.05)

    events = await _collect(runner, session, "anything")
    types = [e.type for e in events]
    assert types[0] == "error"
    assert events[0].data["code"] == "cost_cap"
    assert types[-1] == "done"
    # No API call attempted.
    assert client.calls == []


# ---------------------------------------------------------------------------
# 6. API error
# ---------------------------------------------------------------------------


async def test_api_error_yields_error_event(tmp_path: Path) -> None:
    client = FakeAnthropicClient(always_raise=RuntimeError("api down"))
    runner = AgentRunner(registry=_make_registry(), ctx=_ctx(tmp_path), client=client)
    session = _make_session()

    events = await _collect(runner, session, "hi")
    err = next(e for e in events if e.type == "error")
    assert err.data["code"] == "api_error"
    assert "api down" in err.data["message"]
    assert events[-1].type == "done"


# ---------------------------------------------------------------------------
# 7. max_iterations exceeded
# ---------------------------------------------------------------------------


async def test_max_iterations_exceeded(tmp_path: Path) -> None:
    client = FakeAnthropicClient(
        script=[ScriptedTurn(tool_uses=[FakeToolUseBlock(id="x", name="list_runs", input={})])],
        repeat_last=True,
    )
    runner = AgentRunner(
        registry=_make_registry(),
        ctx=_ctx(tmp_path),
        client=client,
        max_iterations=3,
    )
    session = _make_session(cost_cap_usd=100.0)

    events = await _collect(runner, session, "go")
    err = next(e for e in events if e.type == "error")
    assert err.data["code"] == "max_iterations"
    assert events[-1].type == "done"
    # 3 iterations -> 3 stream calls.
    assert len(client.calls) == 3


# ---------------------------------------------------------------------------
# 8. Run context injected into system prompt
# ---------------------------------------------------------------------------


async def test_run_context_injected_with_report(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    runs_root.mkdir()
    run_dir = runs_root / "run-42"
    run_dir.mkdir()
    (run_dir / "report.json").write_text(
        json.dumps(
            {
                "run_id": "run-42",
                "factor_name": "momentum_12_1",
                "verdict": "strong",
                "reproducibility": {"final_score": 0.85},
            }
        ),
        encoding="utf-8",
    )

    ctx = ToolContext(runs_root=runs_root)
    client = FakeAnthropicClient(script=[ScriptedTurn(text="ok")])
    runner = AgentRunner(registry=_make_registry(), ctx=ctx, client=client)
    session = _make_session(run_id="run-42")

    await _collect(runner, session, "hello")
    assert client.calls
    sys_prompt = client.calls[0]["system"]
    assert "run-42" in sys_prompt
    assert "momentum_12_1" in sys_prompt
    assert "strong" in sys_prompt
    # Score formatted as 3-decimal float.
    assert "0.850" in sys_prompt


async def test_run_context_no_run(tmp_path: Path) -> None:
    client = FakeAnthropicClient(script=[ScriptedTurn(text="ok")])
    runner = AgentRunner(registry=_make_registry(), ctx=_ctx(tmp_path), client=client)
    session = _make_session(run_id=None)
    await _collect(runner, session, "hi")
    sys_prompt = client.calls[0]["system"]
    assert "No run is currently active" in sys_prompt


async def test_run_context_missing_report_uses_minimal(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    runs_root.mkdir()
    (runs_root / "run-x").mkdir()  # no report.json
    ctx = ToolContext(runs_root=runs_root)
    client = FakeAnthropicClient(script=[ScriptedTurn(text="ok")])
    runner = AgentRunner(registry=_make_registry(), ctx=ctx, client=client)
    session = _make_session(run_id="run-x")
    await _collect(runner, session, "hi")
    sys_prompt = client.calls[0]["system"]
    assert "run-x" in sys_prompt
    assert "unknown" in sys_prompt


async def test_run_context_pipeline_report_fallback(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    runs_root.mkdir()
    run_dir = runs_root / "run-7"
    run_dir.mkdir()
    (run_dir / "pipeline_report.json").write_text(
        json.dumps(
            {
                "run_id": "run-7",
                "factor_name": "value_pe",
                "reproducibility": {"final_score": 0.45},
            }
        ),
        encoding="utf-8",
    )
    ctx = ToolContext(runs_root=runs_root)
    client = FakeAnthropicClient(script=[ScriptedTurn(text="ok")])
    runner = AgentRunner(registry=_make_registry(), ctx=ctx, client=client)
    session = _make_session(run_id="run-7")
    await _collect(runner, session, "hi")
    sys_prompt = client.calls[0]["system"]
    # final_score 0.45 -> verdict 'moderate' inferred.
    assert "moderate" in sys_prompt
    assert "value_pe" in sys_prompt


async def test_run_context_corrupt_report(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    runs_root.mkdir()
    run_dir = runs_root / "run-c"
    run_dir.mkdir()
    (run_dir / "report.json").write_text("not json", encoding="utf-8")
    ctx = ToolContext(runs_root=runs_root)
    client = FakeAnthropicClient(script=[ScriptedTurn(text="ok")])
    runner = AgentRunner(registry=_make_registry(), ctx=ctx, client=client)
    session = _make_session(run_id="run-c")
    await _collect(runner, session, "hi")
    sys_prompt = client.calls[0]["system"]
    assert "run-c" in sys_prompt


async def test_run_context_low_score_weak(tmp_path: Path) -> None:
    runs_root = tmp_path / "runs"
    runs_root.mkdir()
    run_dir = runs_root / "run-low"
    run_dir.mkdir()
    (run_dir / "report.json").write_text(
        json.dumps({"run_id": "run-low", "reproducibility": {"final_score": 0.1}}),
        encoding="utf-8",
    )
    ctx = ToolContext(runs_root=runs_root)
    client = FakeAnthropicClient(script=[ScriptedTurn(text="ok")])
    runner = AgentRunner(registry=_make_registry(), ctx=ctx, client=client)
    session = _make_session(run_id="run-low")
    await _collect(runner, session, "hi")
    sys_prompt = client.calls[0]["system"]
    assert "weak" in sys_prompt


# ---------------------------------------------------------------------------
# 9. Tool result with ok=False is relayed
# ---------------------------------------------------------------------------


async def test_failing_tool_relayed_to_model(tmp_path: Path) -> None:
    failing_tool = RegisteredTool(
        schema=ToolSchema(
            name="boom",
            description="always fails",
            input_schema={"type": "object", "properties": {}, "required": []},
        ),
        impl=lambda args, ctx: (_ for _ in ()).throw(RuntimeError("kaboom")),
    )
    reg = _make_registry(extra_tools=[failing_tool])
    client = FakeAnthropicClient(
        script=[
            ScriptedTurn(tool_uses=[FakeToolUseBlock(id="tu_b", name="boom", input={})]),
            ScriptedTurn(text="Sorry, that failed."),
        ]
    )
    runner = AgentRunner(registry=reg, ctx=_ctx(tmp_path), client=client)
    session = _make_session()

    events = await _collect(runner, session, "go")

    # Tool result emitted with ok=False.
    tr = next(e for e in events if e.type == "tool_result")
    assert tr.data["result"]["ok"] is False
    assert "kaboom" in (tr.data["result"]["error"] or "")

    # Loop continued and finished cleanly.
    assert events[-1].type == "done"
    assert events[-2].type == "final_text"

    # Second API call's `messages` payload should contain a tool_result
    # block with is_error=True.
    second_call = client.calls[1]
    last_msg = second_call["messages"][-1]
    assert last_msg["role"] == "user"
    block = last_msg["content"][0]
    assert block["type"] == "tool_result"
    assert block["is_error"] is True
    assert "kaboom" in block["content"]


# ---------------------------------------------------------------------------
# 10. Tools schema is forwarded to the API
# ---------------------------------------------------------------------------


async def test_tools_payload_forwarded(tmp_path: Path) -> None:
    client = FakeAnthropicClient(script=[ScriptedTurn(text="ok")])
    runner = AgentRunner(registry=_make_registry(), ctx=_ctx(tmp_path), client=client)
    session = _make_session()
    await _collect(runner, session, "hi")
    tools = client.calls[0]["tools"]
    names = [t["name"] for t in tools]
    assert "list_runs" in names
    assert "compare_runs" in names
    # Anthropic's required keys are present.
    for t in tools:
        assert {"name", "description", "input_schema"} <= set(t.keys())


# ---------------------------------------------------------------------------
# 11. Cost calculation respects model-specific rates / fallbacks
# ---------------------------------------------------------------------------


async def test_cost_default_for_unknown_model(tmp_path: Path) -> None:
    client = FakeAnthropicClient(
        script=[ScriptedTurn(text="x", input_tokens=1_000_000, output_tokens=0)]
    )
    runner = AgentRunner(registry=_make_registry(), ctx=_ctx(tmp_path), client=client)
    session = _make_session(model="some-future-model-9999")
    await _collect(runner, session, "hi")
    # Default rate $1/MTok input → $1.00 for 1M tokens.
    assert session.cost_spent_usd == pytest.approx(1.0, rel=1e-6)


async def test_cost_haiku_pricing(tmp_path: Path) -> None:
    client = FakeAnthropicClient(
        script=[ScriptedTurn(text="x", input_tokens=1_000_000, output_tokens=1_000_000)]
    )
    runner = AgentRunner(registry=_make_registry(), ctx=_ctx(tmp_path), client=client)
    session = _make_session()  # haiku default
    await _collect(runner, session, "hi")
    # 1M input * $1 + 1M output * $5 = $6.0
    assert session.cost_spent_usd == pytest.approx(6.0, rel=1e-6)


# ---------------------------------------------------------------------------
# 12. build_system_prompt direct unit
# ---------------------------------------------------------------------------


def test_build_system_prompt_no_run(tmp_path: Path) -> None:
    s = build_system_prompt(_make_session(), tmp_path)
    assert "No run is currently active" in s
    assert "replicalpha's research assistant" in s


# ---------------------------------------------------------------------------
# 13. ChatMessage / Event / AgentSession schema shape
# ---------------------------------------------------------------------------


def test_models_serialise() -> None:
    msg = ChatMessage(role="user", content="hi")
    assert msg.model_dump()["content"] == "hi"
    msg2 = ChatMessage(
        role="assistant",
        content=[{"type": "text", "text": "hi"}],
    )
    assert isinstance(msg2.model_dump()["content"], list)
    ev = Event(type="text_delta", data={"text": "x"})
    assert ev.type == "text_delta"
    sess = AgentSession(session_id="s")
    assert sess.cost_cap_usd == 0.5


# ---------------------------------------------------------------------------
# 14. Empty text turn falls back to extracting from content blocks
# ---------------------------------------------------------------------------


async def test_text_extracted_from_content_blocks_when_no_deltas(
    tmp_path: Path,
) -> None:
    """If the stream emits no text_delta events but the final message has
    a text block, ``final_text`` should still carry that text."""

    class EmptyDeltaStream(_FakeStream):
        def __iter__(self) -> Iterator[Any]:
            # Yield nothing; final message still has a text block.
            return iter(())

    class EmptyDeltaCtx:
        def __init__(self, turn: ScriptedTurn) -> None:
            self._stream = EmptyDeltaStream(turn)

        def __enter__(self) -> _FakeStream:
            return self._stream

        def __exit__(self, *exc: Any) -> None:
            return None

    class FakeMessagesEmpty:
        def __init__(self, parent: Any) -> None:
            self.parent = parent

        def stream(self, **kwargs: Any) -> Any:
            self.parent.calls.append(kwargs)
            turn = self.parent.script.pop(0)
            return EmptyDeltaCtx(turn)

    class FakeClientEmpty:
        def __init__(self) -> None:
            self.script = [ScriptedTurn(text="silent text")]
            self.calls: list[dict[str, Any]] = []
            self.messages = FakeMessagesEmpty(self)

    client = FakeClientEmpty()
    runner = AgentRunner(registry=_make_registry(), ctx=_ctx(tmp_path), client=client)
    events = await _collect(runner, _make_session(), "hi")
    final = next(e for e in events if e.type == "final_text")
    assert final.data["text"] == "silent text"


# ---------------------------------------------------------------------------
# 15. mid-stream exception is reported as api_error
# ---------------------------------------------------------------------------


async def test_mid_stream_exception(tmp_path: Path) -> None:
    class BoomStream:
        def __iter__(self) -> Iterator[Any]:
            yield FakeContentBlockDelta(delta=FakeTextDelta(text="hi"))
            raise RuntimeError("stream broke")

        def get_final_message(self) -> FakeFinalMessage:  # pragma: no cover
            raise AssertionError("should not be called")

    class BoomCtx:
        def __enter__(self) -> Any:
            return BoomStream()

        def __exit__(self, *exc: Any) -> None:
            return None

    class FakeMessagesBoom:
        def __init__(self, parent: Any) -> None:
            self.parent = parent

        def stream(self, **kwargs: Any) -> Any:
            self.parent.calls.append(kwargs)
            return BoomCtx()

    class FakeClientBoom:
        def __init__(self) -> None:
            self.calls: list[dict[str, Any]] = []
            self.messages = FakeMessagesBoom(self)

    client = FakeClientBoom()
    runner = AgentRunner(registry=_make_registry(), ctx=_ctx(tmp_path), client=client)
    events = await _collect(runner, _make_session(), "hi")
    assert any(e.type == "error" and e.data["code"] == "api_error" for e in events)
    assert events[-1].type == "done"
