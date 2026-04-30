"""Agent runtime support — tool registry layer.

This module exposes the schema + implementations of tools that an agent
runtime (Anthropic tool-use API) can dispatch against. The runtime itself
lives in a separate Phase 2B module.

Public surface:

- :class:`ToolSchema` — JSON-schema-shaped tool definition for the API.
- :class:`ToolResult` — uniform structured return value with a frontend
  ``display_hint``.
- :class:`ToolContext` — runtime-supplied paths / state.
- :class:`ToolRegistry` — register / lookup / call.
- :func:`build_default_registry` — registers the v0.4 default 15 tools.
"""

from __future__ import annotations

from replicalpha.core.agent.tool_registry import (
    DisplayHint,
    RegisteredTool,
    ToolContext,
    ToolImpl,
    ToolRegistry,
    ToolResult,
    ToolSchema,
    build_default_registry,
)

__all__ = [
    "DisplayHint",
    "RegisteredTool",
    "ToolContext",
    "ToolImpl",
    "ToolRegistry",
    "ToolResult",
    "ToolSchema",
    "build_default_registry",
]
