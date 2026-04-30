#!/usr/bin/env python3
"""Inline-bundle all JSX modules into the babel <script> block of replicalpha.html.

Idempotent. Each run regenerates `bundle.jsx` (for diffing) and rewrites the
single `<script type="text/babel" data-presets="react">…</script>` block in
`replicalpha.html` with the freshly concatenated modules.

Usage:
    python3 frontend/build_bundle.py

The actual load order is preserved from the existing v0.3 bundle (the README
shorthand omits ide/ai-search/custom-upload because those are dialogs, but they
must be present at runtime). `api.jsx` and `analysis.jsx` are inserted right
before `app.jsx` so app.jsx's router can reference `window.AnalysisPage`.
"""

from __future__ import annotations

from pathlib import Path

HERE = Path(__file__).resolve().parent
HTML = HERE / "replicalpha.html"
BUNDLE = HERE / "bundle.jsx"

# Order matters: globals declared earlier are available later.
LOAD_ORDER = [
    "data.jsx",
    "ui.jsx",
    "tweaks-panel.jsx",
    "timeline.jsx",
    "run-detail.jsx",
    "ide.jsx",
    "ai-search.jsx",
    "custom-upload.jsx",
    "pages.jsx",
    "api.jsx",        # NEW v0.4 — fetch wrapper, attaches window.api
    "analysis.jsx",   # NEW v0.4 — Analysis page, attaches window.AnalysisPage
    "agent-chat.jsx", # NEW v0.4 pt2 — SSE-streaming agent chat box, attaches window.AgentChat
    "app.jsx",
]

OPEN_TAG = '<script type="text/babel" data-presets="react">'
CLOSE_TAG = "</script>"


def build_bundle() -> str:
    parts: list[str] = []
    for fname in LOAD_ORDER:
        path = HERE / fname
        if not path.exists():
            raise SystemExit(f"missing module: {path}")
        parts.append(f"\n// ===== {fname} =====\n")
        parts.append(path.read_text(encoding="utf-8"))
    return "".join(parts)


def replace_block(html: str, new_body: str) -> str:
    start = html.find(OPEN_TAG)
    if start < 0:
        raise SystemExit(f"could not find opening tag {OPEN_TAG!r} in {HTML}")
    body_start = start + len(OPEN_TAG)
    end = html.find(CLOSE_TAG, body_start)
    if end < 0:
        raise SystemExit("could not find closing </script> for babel block")
    return (
        html[:body_start]
        + "\n"
        + new_body.lstrip("\n")
        + "\n"
        + html[end:]
    )


def main() -> None:
    bundle = build_bundle()
    BUNDLE.write_text(bundle, encoding="utf-8")
    html = HTML.read_text(encoding="utf-8")
    new_html = replace_block(html, bundle)
    HTML.write_text(new_html, encoding="utf-8")
    print(f"OK · wrote {BUNDLE.relative_to(HERE.parent)} ({len(bundle)} chars)")
    print(f"OK · rewrote babel block in {HTML.relative_to(HERE.parent)}")


if __name__ == "__main__":
    main()
