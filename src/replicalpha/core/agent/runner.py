"""Anthropic SDK tool-use loop for the replicalpha agent.

This module wraps :mod:`anthropic`'s streaming Messages API in a multi-turn
loop that:

1. Streams text deltas from the model as :class:`Event` objects.
2. Dispatches every ``tool_use`` content block to the
   :class:`~replicalpha.core.agent.tool_registry.ToolRegistry`.
3. Feeds tool results back to the model and loops until the model emits an
   ``end_turn`` stop reason or until ``max_iterations`` / cost cap is hit.
4. Tracks per-session cost in USD using model-specific token prices.

The runner is designed to be consumed by the FastAPI SSE endpoint
(Phase 2C) — every yielded :class:`Event` maps cleanly onto one SSE
``data:`` frame.

Test injection
--------------
The Anthropic client is injected via the constructor so that unit tests
can pass a fake client implementing the duck-typed
``messages.stream(...)`` context manager interface. No real network calls
are made by this module.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any, ClassVar, Literal, cast

from pydantic import BaseModel, ConfigDict, Field

from replicalpha.core.agent.tool_registry import ToolContext, ToolRegistry

# ---------------------------------------------------------------------------
# Public models
# ---------------------------------------------------------------------------


class ChatMessage(BaseModel):
    """One message in the conversation history.

    ``content`` is a plain string for simple turns and a list of content
    blocks (``text``, ``tool_use``, ``tool_result``) for tool-use turns.
    """

    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "assistant"]
    content: str | list[dict[str, Any]]


EventType = Literal[
    "text_delta",
    "tool_call",
    "tool_result",
    "final_text",
    "cost_update",
    "error",
    "done",
]


class Event(BaseModel):
    """One streamed event emitted by :meth:`AgentRunner.run`."""

    model_config = ConfigDict(extra="forbid")

    type: EventType
    data: dict[str, Any]


class AgentSession(BaseModel):
    """Per-conversation state carried between runner invocations."""

    model_config = ConfigDict(extra="forbid", arbitrary_types_allowed=True)

    session_id: str
    run_id: str | None = None
    model: str = "claude-haiku-4-5-20251001"
    cost_cap_usd: float = 0.50
    cost_spent_usd: float = 0.0
    history: list[ChatMessage] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------


_SYSTEM_PROMPT_TEMPLATE = (
    "You are replicalpha's research assistant. You help users analyze "
    "quantitative research papers and the factors they reproduce.\n\n"
    "You have tools to:\n"
    "- Run factor analysis, risk attribution, and robustness tests on a "
    "reproduced run\n"
    "- Read and modify the generated factor code\n"
    "- List, compare, and search through the user's archive of reproduced "
    "papers\n"
    "- Generate reports and export portfolios\n\n"
    "When the user asks for analysis, prefer to call tools rather than "
    "narrate. Show numbers from real tool results, not from imagination.\n\n"
    'When tool results have status="not_implemented_in_v0.4", briefly tell '
    "the user the feature is on the v0.5 roadmap and suggest a workaround "
    "if possible.\n\n"
    "{run_context_section}\n\n"
    "Be concise. Format key numbers in monospace using backticks. When "
    "summarizing tool results, lead with the headline number, then 1-2 "
    "sentences of context.\n"
)

_RUN_CONTEXT_TEMPLATE = """Current run context:
- run_id: {run_id}
- factor: {factor_name}
- verdict: {verdict}
- reproducibility score: {score}
"""

_NO_RUN_CONTEXT = (
    "No run is currently active. The user can ask you to list runs or reproduce a paper."
)


def _read_run_context(runs_root: Any, run_id: str) -> str:
    """Build the run context block for the system prompt.

    Reads ``runs_root/{run_id}/report.json`` (or ``pipeline_report.json``
    fallback) to fill in factor name / verdict / score. If the file does
    not exist, returns a minimal context with just the ``run_id``.
    """
    from pathlib import Path

    run_dir = Path(runs_root) / run_id
    report: dict[str, Any] | None = None
    for fname in ("report.json", "pipeline_report.json"):
        p = run_dir / fname
        if p.exists():
            try:
                report = cast(dict[str, Any], json.loads(p.read_text(encoding="utf-8")))
            except (OSError, json.JSONDecodeError):
                report = None
            break

    if report is None:
        return _RUN_CONTEXT_TEMPLATE.format(
            run_id=run_id,
            factor_name="unknown",
            verdict="unknown",
            score="unknown",
        )

    repro = report.get("reproducibility") or {}
    score = repro.get("final_score")
    verdict = report.get("verdict")
    if verdict is None and score is not None:
        if score >= 0.7:
            verdict = "strong"
        elif score >= 0.4:
            verdict = "moderate"
        else:
            verdict = "weak"

    factor_name = report.get("factor_name") or report.get("factor") or "unknown"
    return _RUN_CONTEXT_TEMPLATE.format(
        run_id=run_id,
        factor_name=factor_name,
        verdict=verdict if verdict is not None else "unknown",
        score=f"{score:.3f}" if isinstance(score, (int, float)) else "unknown",
    )


def build_system_prompt(session: AgentSession, runs_root: Any) -> str:
    """Render the system prompt for the given session."""
    if session.run_id is None:
        section = _NO_RUN_CONTEXT
    else:
        section = _read_run_context(runs_root, session.run_id)
    return _SYSTEM_PROMPT_TEMPLATE.format(run_context_section=section)


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------


class AgentRunner:
    """Multi-turn agent loop wrapping the Anthropic Messages stream API.

    Pricing is configured by class-level attributes keyed on the model
    name. Override them via subclassing or by mutating the class attribute
    if the official prices change.
    """

    INPUT_COST_PER_MTOK: ClassVar[dict[str, float]] = {
        "claude-haiku-4-5-20251001": 1.0,
        # Reasonable defaults for sibling models; extend as needed.
        "claude-sonnet-4-5-20250929": 3.0,
        "claude-opus-4-5-20251001": 15.0,
    }
    OUTPUT_COST_PER_MTOK: ClassVar[dict[str, float]] = {
        "claude-haiku-4-5-20251001": 5.0,
        "claude-sonnet-4-5-20250929": 15.0,
        "claude-opus-4-5-20251001": 75.0,
    }
    _DEFAULT_INPUT_COST: ClassVar[float] = 1.0
    _DEFAULT_OUTPUT_COST: ClassVar[float] = 5.0

    def __init__(
        self,
        registry: ToolRegistry,
        ctx: ToolContext,
        client: Any | None = None,
        model: str = "claude-haiku-4-5-20251001",
        max_iterations: int = 8,
    ) -> None:
        self.registry = registry
        self.ctx = ctx
        self._client = client  # Lazily constructed on first use if None.
        self.model = model
        self.max_iterations = max_iterations

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_client(self) -> Any:
        if self._client is not None:
            return self._client
        # Lazy import to avoid forcing an API key during unit tests.
        import anthropic

        self._client = anthropic.Anthropic()
        return self._client

    def _cost_for(self, model: str, input_tokens: int, output_tokens: int) -> float:
        in_rate = self.INPUT_COST_PER_MTOK.get(model, self._DEFAULT_INPUT_COST)
        out_rate = self.OUTPUT_COST_PER_MTOK.get(model, self._DEFAULT_OUTPUT_COST)
        return (input_tokens * in_rate + output_tokens * out_rate) / 1_000_000.0

    def _history_to_api_messages(self, history: list[ChatMessage]) -> list[dict[str, Any]]:
        """Project ChatMessage history into Anthropic API ``messages`` shape."""
        out: list[dict[str, Any]] = []
        for msg in history:
            out.append({"role": msg.role, "content": msg.content})
        return out

    def _tools_payload(self) -> list[dict[str, Any]]:
        """Map the registry schemas to Anthropic's tool definition payload."""
        return [
            {
                "name": s.name,
                "description": s.description,
                "input_schema": s.input_schema,
            }
            for s in self.registry.list_schemas()
        ]

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def run(
        self,
        session: AgentSession,
        user_message: str,
    ) -> AsyncIterator[Event]:
        """Run one user-prompted turn, possibly looping through tool calls.

        Yields events as the model streams text and as tools are
        dispatched. Mutates ``session.history`` and ``session.cost_spent_usd``
        in-place so the caller can persist them.
        """
        # Pre-flight cost-cap check: if we are already over budget, refuse
        # the turn before making any API calls.
        if session.cost_spent_usd >= session.cost_cap_usd:
            yield Event(
                type="error",
                data={
                    "code": "cost_cap",
                    "message": "Cost cap reached",
                    "cost_spent_usd": session.cost_spent_usd,
                    "cost_cap_usd": session.cost_cap_usd,
                },
            )
            yield Event(type="done", data={})
            return

        session.history.append(ChatMessage(role="user", content=user_message))

        system_prompt = build_system_prompt(session, self.ctx.runs_root)
        tools = self._tools_payload()
        client = self._get_client()

        for _iteration in range(self.max_iterations):
            messages_api = self._history_to_api_messages(session.history)

            # ----- Call the model with streaming -----
            try:
                stream_ctx = client.messages.stream(
                    model=session.model,
                    system=system_prompt,
                    tools=tools,
                    messages=messages_api,
                    max_tokens=4096,
                )
            except Exception as exc:  # pragma: no cover - defensive
                yield Event(
                    type="error",
                    data={"code": "api_error", "message": str(exc)},
                )
                yield Event(type="done", data={})
                return

            collected_text_parts: list[str] = []
            final_message: Any = None
            try:
                with stream_ctx as stream:
                    # Iterate parsed events; emit text deltas as they arrive.
                    for ev in stream:
                        ev_type = getattr(ev, "type", None)
                        if ev_type == "content_block_delta":
                            delta = getattr(ev, "delta", None)
                            delta_type = getattr(delta, "type", None)
                            if delta_type == "text_delta":
                                text_chunk = getattr(delta, "text", "")
                                if text_chunk:
                                    collected_text_parts.append(text_chunk)
                                    yield Event(
                                        type="text_delta",
                                        data={"text": text_chunk},
                                    )
                    final_message = stream.get_final_message()
            except Exception as exc:
                yield Event(
                    type="error",
                    data={"code": "api_error", "message": str(exc)},
                )
                yield Event(type="done", data={})
                return

            # ----- Cost accounting -----
            usage = getattr(final_message, "usage", None)
            input_tokens = int(getattr(usage, "input_tokens", 0) or 0)
            output_tokens = int(getattr(usage, "output_tokens", 0) or 0)
            cost = self._cost_for(session.model, input_tokens, output_tokens)
            session.cost_spent_usd += cost
            yield Event(
                type="cost_update",
                data={
                    "cost_spent_usd": session.cost_spent_usd,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                },
            )

            # ----- Inspect stop reason / content -----
            stop_reason = getattr(final_message, "stop_reason", None)
            content_blocks = list(getattr(final_message, "content", []) or [])
            assistant_blocks_for_history = _normalise_content_blocks(content_blocks)

            # Append the assistant turn to history (always, so the model
            # can see its own tool_use blocks on the next iteration).
            session.history.append(
                ChatMessage(role="assistant", content=assistant_blocks_for_history)
            )

            tool_uses = [b for b in content_blocks if getattr(b, "type", None) == "tool_use"]

            if stop_reason == "tool_use" or tool_uses:
                # Dispatch each tool call.
                tool_result_blocks: list[dict[str, Any]] = []
                for tu in tool_uses:
                    tu_id = str(getattr(tu, "id", ""))
                    tu_name = str(getattr(tu, "name", ""))
                    tu_input = dict(getattr(tu, "input", {}) or {})

                    yield Event(
                        type="tool_call",
                        data={"id": tu_id, "name": tu_name, "args": tu_input},
                    )

                    result = self.registry.call(tu_name, tu_input, self.ctx)

                    yield Event(
                        type="tool_result",
                        data={"id": tu_id, "result": result.model_dump()},
                    )

                    # Pack the tool result back into the API content shape.
                    # We always send a string; structured payload is
                    # JSON-encoded so the model can reason about it.
                    if result.ok:
                        block_content = json.dumps(result.data, default=str)
                        is_error = False
                    else:
                        block_content = json.dumps(
                            {"error": result.error, "data": result.data},
                            default=str,
                        )
                        is_error = True
                    tool_result_blocks.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": tu_id,
                            "content": block_content,
                            "is_error": is_error,
                        }
                    )

                # Append the user-side tool_result message to history.
                session.history.append(ChatMessage(role="user", content=tool_result_blocks))

                # Cost-cap check before the next iteration.
                if session.cost_spent_usd >= session.cost_cap_usd:
                    yield Event(
                        type="error",
                        data={
                            "code": "cost_cap",
                            "message": "Cost cap reached",
                            "cost_spent_usd": session.cost_spent_usd,
                            "cost_cap_usd": session.cost_cap_usd,
                        },
                    )
                    yield Event(type="done", data={})
                    return

                # Loop back for the model's follow-up turn.
                continue

            # ----- Terminal turn (end_turn / stop_sequence / max_tokens) -----
            full_text = "".join(collected_text_parts) or _extract_text(content_blocks)
            yield Event(type="final_text", data={"text": full_text})
            yield Event(type="done", data={})
            return

        # Loop fell through: hit max_iterations without finishing.
        yield Event(
            type="error",
            data={
                "code": "max_iterations",
                "message": (
                    f"agent loop exceeded max_iterations={self.max_iterations} "
                    "without producing a final response"
                ),
            },
        )
        yield Event(type="done", data={})


# ---------------------------------------------------------------------------
# Helpers (module-private)
# ---------------------------------------------------------------------------


def _normalise_content_blocks(blocks: list[Any]) -> list[dict[str, Any]]:
    """Convert SDK content blocks to plain dicts safe for re-sending."""
    out: list[dict[str, Any]] = []
    for b in blocks:
        b_type = getattr(b, "type", None)
        if b_type == "text":
            out.append({"type": "text", "text": getattr(b, "text", "")})
        elif b_type == "tool_use":
            out.append(
                {
                    "type": "tool_use",
                    "id": getattr(b, "id", ""),
                    "name": getattr(b, "name", ""),
                    "input": dict(getattr(b, "input", {}) or {}),
                }
            )
        else:
            # Best-effort fall-through: try model_dump, else stringify.
            dump = getattr(b, "model_dump", None)
            if callable(dump):
                out.append(cast(dict[str, Any], dump()))
            else:
                out.append({"type": str(b_type), "raw": str(b)})
    return out


def _extract_text(blocks: list[Any]) -> str:
    parts: list[str] = []
    for b in blocks:
        if getattr(b, "type", None) == "text":
            parts.append(str(getattr(b, "text", "")))
    return "".join(parts)
