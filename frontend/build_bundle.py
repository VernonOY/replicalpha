#!/usr/bin/env python3
"""Surgically inject v0.4 modules into replicalpha.html — never regenerate from JSX.

CRITICAL: do not concatenate the source `.jsx` files into the babel block. Most of
the polished v0.3 UI lives ONLY inside the babel block of `replicalpha.html` (it
was edited inline and never round-tripped back into source). Regenerating the
block from `.jsx` would lose those edits — that's how we lost MonitorPage /
PortfolioPage / Hero polish during the first v0.4 attempt.

What this script does instead:
  1. Read v0.4 source modules: `api.jsx`, `analysis.jsx`, `agent-chat.jsx`.
  2. Append them (idempotently) to the END of the babel block, between two
     sentinel comments. If a previous injection block exists, it is replaced.
  3. Refresh the inline v0.3 `<script>` block (the one whose content begins
     with `// replicalpha v0.3 additions`) from `v03-additions.compiled.js`.

Usage:
    python3 frontend/build_bundle.py
"""

from __future__ import annotations

import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
HTML = HERE / "replicalpha.html"
V03_COMPILED = HERE / "v03-additions.compiled.js"

V04_MODULES = ["api.jsx", "analysis.jsx", "agent-chat.jsx"]

INJ_OPEN = "// ===================== v0.4 surgical injection — api + analysis + agent-chat ====================="
INJ_CLOSE = "// ===================== end v0.4 injection ====================="

BABEL_OPEN = '<script type="text/babel" data-presets="react">'
V03_SENTINEL = "// replicalpha v0.3 additions"


def build_v04_block() -> str:
    parts = ["\n\n", INJ_OPEN, "\n"]
    for name in V04_MODULES:
        path = HERE / name
        if not path.exists():
            raise SystemExit(f"missing v0.4 module: {path}")
        parts.append(f"\n// ----- {name} -----\n")
        parts.append(path.read_text(encoding="utf-8"))
    parts.append("\n")
    parts.append(INJ_CLOSE)
    parts.append("\n")
    return "".join(parts)


def inject_v04(html: str, block: str) -> str:
    start = html.find(BABEL_OPEN)
    if start < 0:
        raise SystemExit("babel block missing")
    close_idx = html.find("</script>", start)
    if close_idx < 0:
        raise SystemExit("babel block close </script> missing")

    pattern = re.compile(
        r"\n*"
        + re.escape(INJ_OPEN)
        + r".*?"
        + re.escape(INJ_CLOSE)
        + r"\n*",
        re.S,
    )
    if pattern.search(html, start, close_idx):
        return pattern.sub(lambda _m: block, html, count=1)
    return html[:close_idx] + block + html[close_idx:]


V03_JSX = HERE / "v03-additions.jsx"


def refresh_v03(html: str) -> str:
    """Refresh the inline v0.3 block from the compiled English bundle.

    IMPORTANT: prefer `v03-additions.compiled.js` (English UI) over the
    `v03-additions.jsx` source. The JSX file in the repo was edited toward
    a Chinese translation that was never the user's final intent; the
    English compiled.js is what shipped in the user's last good snapshot
    (pt1 backup / 8 product screenshots).

    If neither exists, return the HTML unchanged.
    """
    source = V03_COMPILED if V03_COMPILED.exists() else V03_JSX
    if not source.exists():
        return html
    sidx = html.find(V03_SENTINEL)
    if sidx < 0:
        return html
    last_open = None
    for m in re.finditer(r"<script[^>]*>", html):
        if m.end() <= sidx:
            last_open = m
        else:
            break
    if last_open is None:
        return html
    body_start = last_open.end()
    end = html.find("</script>", body_start)
    if end < 0:
        return html
    body = source.read_text(encoding="utf-8")
    new_open = (
        '<script type="text/babel" data-presets="react">'
        if source.suffix == ".jsx"
        else "<script>"
    )
    return (
        html[: last_open.start()]
        + new_open
        + "\n"
        + body.rstrip()
        + "\n"
        + html[end:]
    )


def main() -> None:
    """Append-only inject v0.4 modules to the babel block.

    By default we DO NOT touch the inline v0.3 block — it contains the user's
    edited English `PortfolioPage` / `MonitorPage` / etc. that exist nowhere
    else (not in `v03-additions.jsx` source, not in `v03-additions.compiled.js`).
    Touching it loses those edits.

    To force-refresh from compiled.js, pass `--refresh-v03`.
    """
    import sys

    html = HTML.read_text(encoding="utf-8")
    block = build_v04_block()
    html = inject_v04(html, block)

    if "--refresh-v03" in sys.argv:
        html = refresh_v03(html)
        src = V03_COMPILED if V03_COMPILED.exists() else V03_JSX
        print(f"OK · refreshed v0.3 inline block from {src.name} (REQUESTED)")
    else:
        print("·  v0.3 inline block UNTOUCHED (use --refresh-v03 to force)")

    HTML.write_text(html, encoding="utf-8")
    print(f"OK · injected v0.4 modules ({sum((HERE/m).stat().st_size for m in V04_MODULES)} chars source)")
    print(f"Final HTML: {len(html)} chars")


if __name__ == "__main__":
    main()
