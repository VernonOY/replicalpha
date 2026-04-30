# replicalpha · v0.4 Agent chat upgrade · design brief

> Design-tool input. Static-only — backend SSE + tool-card wiring happens after Claude Design exports.
> This is an **upgrade** to the v0.3 agent chat box, NOT a new page. Same chrome, same routes — richer interaction surface.

---

## What this is

In v0.3 the agent chat is a single-shot prompt → text reply. In v0.4 the chat box becomes the **universal interface**: the user types a request, the agent uses tools to call into the replicalpha backend, and tool calls render as inline interactive cards.

User vision (verbatim from product owner):
> "后期我是希望在前端的 agent 聊天框内,实现能调动 agent 做任何事情:因子分析,组合策略,回测,报告,等等"

---

## Where this lives

The agent chat box exists in 4 places (all reuse the same component, with different `run_context` injected):

1. **Hero page (`/`)** — embedded in the bottom-center input card. No `run_context`. Tools the agent can call: `list_runs`, `search_papers`, `reproduce_paper`.
2. **Verdict page (`/runs/[id]`)** — right-side dock (collapsible drawer, default 360px wide). `run_context = current run`. Tools: all 15.
3. **IDE workspace (`/runs/[id]/workspace`)** — bottom panel, full width, 240px tall by default, resizable. `run_context = current run`. Tools: all 15.
4. **Analysis page (`/runs/[id]/analysis`)** — slide-in side drawer triggered by "Open in agent" button. `run_context = current run + analysis report pre-loaded`. Tools: all 15.

The chat **state is shared per run_id** — opening it in a different surface for the same run shows the same scrollback.

---

## Layout

The chat panel has 4 vertical regions, top-to-bottom:

```
┌─────────────────────────────────────────┐
│ HEADER  (40px)                          │  ← session title + cost meter + actions
├─────────────────────────────────────────┤
│                                         │
│ SCROLLBACK  (flex)                      │  ← messages + tool cards
│                                         │
├─────────────────────────────────────────┤
│ SUGGESTED FOLLOW-UPS  (auto, 32-72px)   │  ← 2-3 chips
├─────────────────────────────────────────┤
│ COMPOSER  (auto, 56-160px)              │  ← input + model select + send
└─────────────────────────────────────────┘
```

---

## 1. Header

Sticky top, 40px tall:

- **Left**: session title (auto-generated from first user message, e.g. "Run full analysis on Zeng & Liu 2016") · click to rename
- **Center**: cost meter (mono): `$0.018 / $0.50 cap` · color: green < 50%, yellow 50-90%, red ≥ 90% · click → settings to raise cap
- **Right**:
  - "Clear chat" icon button (with confirm dialog)
  - "Export chat" dropdown (Markdown / JSON)
  - "Switch run context" pill (small) — shows current run, click to detach from this run

If currently streaming: header shows a thin animated progress bar at the very top. If user hits Esc or clicks the cost meter: shows "Cancel?" tooltip; click cancels mid-stream.

---

## 2. Scrollback

Vertical list of message blocks. Each block is one of these types:

### 2a · User message
- Right-aligned bubble, primary blue, 8px radius
- Inter 14px, max-width 80% of panel
- Timestamp on hover (tooltip)
- Long messages collapsed at 6 lines with "Show more"

### 2b · Assistant text message
- Left-aligned bubble, surface-2 background (`#13171f` dark / `#f4f4f3` light)
- Markdown rendering (bold / code / lists / links)
- **Streamed token-by-token** (typewriter cursor at end while streaming, blinks at 1.2 Hz)
- Tiny model badge below: `Haiku 4.5 · 1.4s · 412 tokens` (mono, 60% opacity)

### 2c · Tool-call card (inline)
- Left-aligned, full-panel-width, 8px radius, surface-3 background, 1px border
- Header strip (32px tall): icon + tool name + status pill + duration
  - Status: `running` (spinner) / `done` (✓ green) / `error` (✗ red)
- **Body — varies by tool's `display_hint`** (see "Tool-card variants" below)
- Footer (24px): `[Run again]` `[Copy result]` `[Open in full page]` (where applicable)

### 2d · Suggested follow-up reply
- Renders inline after every assistant text message
- Shows 2-3 chip buttons (chip = small pill, 28px tall)
- Click chip → fills composer + auto-sends
- Examples after `run_factor_analysis`:
  - "Run risk attribution next"
  - "Compare with my other reversal factors"
  - "Why is the t-stat below 2?"

### 2e · System / status note
- Centered, italic 12px, surface-1 background
- Examples: "Connection lost. Reconnecting..." / "Cost cap reached. Raise it in settings or end session."

**Scroll behavior**:
- Auto-scroll to bottom while streaming, BUT if user manually scrolled up, do NOT auto-scroll (show a "↓ New message" floating button bottom-right instead)
- Multi-turn history: persisted per `run_id` via SQLite, loaded on chat open, infinite scroll-up to fetch older messages

---

## 3. Tool-card variants (one design per `display_hint`)

The frontend dispatches on `tool_result.display_hint` to render the body. There are 7 variants:

### Variant A · `metric_grid` (e.g. `run_factor_analysis`)
- 2×3 grid of stat tiles
- Each tile: metric label (caption), value (mono large), t-stat or context (mono small)
- Below grid: "Open full analysis →" link

```
┌─────────────────────────────────────────────┐
│ ▶ run_factor_analysis · ✓ done · 1.2s       │
├─────────────────────────────────────────────┤
│ IC mean    │ IR        │ t-stat            │
│ +0.0182    │ 0.193     │ 2.41 ✓            │
│ ─────────  │ ─────────  │ ─────────         │
│ Q5 − Q1    │ Mono ρ    │ Bootstrap 95%     │
│ +7.5%      │ 0.92      │ [+0.0042,+0.031]  │
├─────────────────────────────────────────────┤
│ Open full analysis →                        │
└─────────────────────────────────────────────┘
```

### Variant B · `chart` (e.g. `run_robustness`, `run_risk_attribution`)
- Chart container (240px tall) + caption strip below
- Chart type baked into result `data` (`{"chart_type": "bars"|"lines"|"radar", "series": [...]}`)
- Caption: 1-line summary written by the agent (e.g. "Bootstrap 95% CI excludes zero · IC = 0.0182 [+0.004, +0.031]")
- Footer: "Open full analysis →" link (where applicable)

### Variant C · `table` (e.g. `list_runs`, `compare_runs`, `query_data`)
- Table with sticky header, max 8 visible rows + scroll
- Columns inferred from `data["columns"]`, rows from `data["rows"]`
- Cells rendered with type hints (numbers right-aligned + mono, dates ISO, status as pill)
- Footer: row count + "Export CSV" link

### Variant D · `code` (e.g. `read_factor_code`, `export_csv`)
- Syntax-highlighted code block (Python / CSV)
- Max 16 lines visible by default, scroll inside, "Show all (87 lines)" link to expand
- Footer: language badge + "Copy" + "Download" buttons

### Variant E · `markdown` (e.g. `generate_report`)
- Rendered markdown (same renderer as assistant text bubbles)
- Max 24 lines visible, "Show all" expansion
- Footer: "Open in viewer" + "Download .md"

### Variant F · `diff` (e.g. `write_factor_code`)
- Two-column diff view (red left = old, green right = new)
- Or unified diff if narrow panel
- Footer: "Apply & re-run" (primary) + "Discard" (secondary) + line counts

### Variant G · `text` (fallback / stubs / errors)
- Plain text content in surface-2 background
- For stubs (`status: not_implemented_in_v0.4`): show a yellow warning icon + the status message + a small "Roadmap" link to repo issues

---

## 4. Suggested follow-ups

Renders **between** the last assistant message and the composer.

- Up to 3 chips, 28px tall, surface-2 background, 1px border, 8px radius
- Chip text: 12-30 chars · Inter 13px
- Source: each tool result includes a `suggested_followups: list[str]` field; agent runtime appends 1-2 generic ones
- Click → auto-fill composer + auto-send
- Long-press / right-click → "Use as draft" (fills composer, does NOT send)

Hide if streaming or if no follow-ups returned.

---

## 5. Composer

Bottom of panel:

- **Textarea**: auto-grow 1-6 lines, monospace placeholder ("Ask the agent to analyze, compare, build a portfolio..."), Inter 14px input
- **Slash commands** (autocomplete on `/`):
  - `/analyze` → `Run full factor analysis`
  - `/risk` → `Run risk attribution`
  - `/compare {run-id}` → `Compare with {run-id}`
  - `/code` → `Show me the factor code`
  - `/help` → list all
- **Attachment**: paper-clip icon, attaches a file (PDF) — currently disabled for v0.4 with tooltip "Coming in v0.5"
- **Model selector** (small dropdown bottom-left of composer):
  - Default: `Haiku 4.5` (fast, $)
  - Upgrades: `Sonnet 4.6` (balanced, $$) · `Opus 4.7` (deep, $$$)
- **Send button** (bottom-right): primary blue, disabled until non-empty input
  - Cmd/Ctrl-Enter shortcut sends
  - Esc cancels in-flight stream
- **Token counter** (faint, mono, bottom-right): `412 / 4096` — green < 75%, yellow 75-95%, red ≥ 95%

---

## 6. Cost cap warning

When session cost reaches 80% of cap:
- Banner at top of scrollback: "⚠ Cost cap 80% reached ($0.40 / $0.50). Wrap up soon, or [Raise cap]."

When cost cap reached during a stream:
- Stream pauses immediately
- Banner: "⚠ Cost cap reached. Continue to add $0.20 to budget? [Continue +$0.20] [End session]"
- If user clicks `Continue`, cap raised by 0.5× current; stream resumes from where it paused
- If user clicks `End session`, last partial assistant message marked `[truncated · cap reached]`

---

## 7. Streaming events

Frontend connects to `POST /agent/chat` SSE stream. Event types:

| Event | What frontend does |
|---|---|
| `text_delta` | Append token to current assistant bubble (typewriter) |
| `tool_call` | Insert new tool-card with `running` status |
| `tool_result` | Update tool-card to `done` (or `error`), render `data` per `display_hint` |
| `final_text` | Mark current assistant bubble as complete (typewriter cursor disappears) |
| `cost_update` | Update header cost meter |
| `suggested_followups` | Render chips above composer |
| `error` | Show error banner; mark current assistant bubble as `[failed]` |
| `done` | Close stream, allow new input |

Reconnect strategy: on connection drop, show "Reconnecting..." status note; auto-retry up to 3× with exponential backoff; if all fail, fall back to non-streaming POST and render full result at end.

---

## 8. Mocked example interactions (for static stub)

### Example A — Full analysis flow

```
User: Run full analysis on this paper

Agent: I'll run factor analysis, risk attribution, and robustness checks
       on r-1a2b3c4d. Starting with the core factor analysis.
       [tool-card · run_factor_analysis · running... → done · 1.2s]
       [metric_grid: IC mean +0.0182 · IR 0.193 · t 2.41 · Q5−Q1 +7.5%]

       The factor has a positive IC at the 95% level. Now risk attribution.
       [tool-card · run_risk_attribution · running... → done · 0.9s]
       [chart: radar of style βs · α = +4.2% (t=2.83)]

       The factor has significant idiosyncratic α after FF5+UMD adjustment.
       Now robustness.
       [tool-card · run_robustness · running... → done · 1.4s]
       [chart: bootstrap CI [+0.004, +0.031], excludes zero]

       Summary: this factor reproduces with statistical significance, with
       residual α distinguishable from market exposure. Bootstrap CI confirms
       IC > 0 at 95%. Main caveat: small-cap tercile drives most of the IC
       (+0.041 vs +0.002 in large cap) — suspect liquidity-related drift.

[Suggested follow-ups]: "Check sector concentration" · "Compare with QMJ"
                        · "Why is large-cap IC near zero?"
```

### Example B — Code-edit flow

```
User: Show me the factor code

Agent: [tool-card · read_factor_code · done · 0.1s]
       [code: def reversal_factor(close): ...] (87 lines)

       The factor uses a 21-day lookback with no winsorization.

User: Add 1/99 winsorization

Agent: I'll patch the function to clip extreme returns at the 1st/99th
       percentile per cross-section.
       [tool-card · write_factor_code · done · 0.2s]
       [diff: 4 lines added · old → new]

       Wrote `factor_user.py`. To re-run with this version: click "Apply
       & re-run" or run `replicalpha rerun r-1a2b3c4d --use-user-factor`.

[Suggested follow-ups]: "Apply & re-run now" · "Show me the diff inline"
```

### Example C — Compare flow

```
User: Compare this run with my other 2 reversal factors

Agent: [tool-card · list_runs(filter=family:reversal) · done · 0.1s]
       [table: 3 rows]
       [tool-card · compare_runs([r-1a2b3c4d, r-9z8y7x6w, r-5q4r3s2t]) · done · 0.2s]
       [table:
         |        | claimed IC | reproduced IC | score | verdict      |
         | r-1a2b | +0.013     | +0.018        | 0.84  | reproduced   |
         | r-9z8y | +0.022     | -0.005        | 0.21  | sign-flip    |
         | r-5q4r | +0.041     | +0.003        | 0.31  | weak         |
       ]

       r-1a2b reproduces well; r-9z8y sign-flipped; r-5q4r decayed below
       significance. Consistent with McLean & Pontiff post-publication
       decay literature.

[Suggested follow-ups]: "Why did r-9z8y flip?" · "Build a portfolio from r-1a2b"
```

---

## 9. Empty / loading / error states

**Empty (no messages)**:
- Centered, faint: "Ask the agent anything about this run." + 6 example chips:
  - "Run full analysis"
  - "Show me the factor code"
  - "Why is the verdict not green?"
  - "Compare with similar papers"
  - "Add 1/99 winsorization"
  - "Export portfolio to IBKR CSV"

**Loading initial history** (multi-turn scrollback fetch from SQLite):
- Top of scrollback: skeleton blocks for ~3 messages, shimmer

**Error — backend unavailable**:
- Banner top of scrollback: "⚠ Agent backend offline. Retrying..." + spinner
- Composer disabled

**Error — tool failed**:
- Tool-card status flips to `error` with red icon + error message in body
- Footer button: `[Retry]` (re-runs same tool with same args)

**Cost cap blocked**:
- See section 6

---

## 10. Bilingual strings

| English | 中文 |
|---|---|
| Ask the agent... | 向 agent 提问... |
| Cost cap | 成本上限 |
| Tools | 工具 |
| Running... | 运行中... |
| Done | 完成 |
| Error | 错误 |
| Retry | 重试 |
| Apply & re-run | 应用并重跑 |
| Discard | 放弃 |
| Open full analysis | 打开完整分析 |
| Export CSV | 导出 CSV |
| Export chat | 导出对话 |
| Clear chat | 清除对话 |
| Switch run context | 切换运行上下文 |
| Suggested follow-ups | 建议追问 |
| Cap reached | 已达上限 |
| Continue | 继续 |
| End session | 结束会话 |
| Reconnecting... | 重新连接中... |

---

## 11. Out of scope (will NOT be in v0.4)

- Voice input
- Image / chart attachments to user messages
- Multi-user shared chats
- Message reactions / annotations
- Forking a chat from a specific message
- Custom tool authoring UI (tools are server-defined only)
- iPad / mobile responsive

---

## 12. Hand-off

After Claude Design exports HTML, I will:
1. Locate the existing chat component (or new one if Design created one) under `replicalpha.html` or its module
2. **Surgically** wire the SSE event handler to `POST /agent/chat` and translate event types to UI mutations as in section 7
3. Wire the 7 tool-card variants to backend `tool_result.display_hint`
4. Persist scrollback to SQLite via `GET /agent/chats/{run_id}` + write on each new event
5. Keep `replicalpha.html.backup-pre-agent-v0.4` snapshot before any edit
6. Test all 7 display-hint variants against real tool calls before claiming integration done

End of brief.
