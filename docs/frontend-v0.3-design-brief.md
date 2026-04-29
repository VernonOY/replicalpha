# replicalpha · v0.3 design brief

> Design-tool input. Static pages only. Backend wiring happens later.

## What is replicalpha

A tool that takes a quant research paper PDF and outputs a verdict on whether the paper's claimed factor still works on new market data. Each paper a user uploads becomes a node on a personal timeline. The product surface is **research → monitoring → execution** in three layers.

v0.2 already designed: Hero · Timeline · Library · Factor families · Single-paper verdict · IDE workspace · Agent search modal.

v0.3 = **fix details on those 7 pages + add 7 new pages + add cross-cutting components**.

---

## Visual system

### Color
- Background: dark `#0b0e14` (default) / light `#fafaf9`
- Primary: `#1976d2` (light) / `#3b82f6` (dark)
- Status — always pair color with icon, never color alone:
  - reproduced: green `#22c55e` + `✓`
  - weak: yellow `#eab308` + `⚠`
  - sign-flip: red `#ef4444` + `⚡` (lightning bolt, not ✗)
  - failed: red `#ef4444` + `✗`

### Type
- Numbers, code, factor formulas, table cells: `JetBrains Mono`
- UI prose, paper titles, headings: `Inter`
- CJK fallback: `PingFang SC` / `Noto Sans SC`

### Conventions
- Both light + dark mode designed; dark default on first load
- 24-hour time, explicit timezone (`16:00 UTC`, never `04:00 PM`)
- Numbers always signed (`+0.0260`, `−0.0110`)
- Density: 3 levels (compact / comfortable / spacious), comfortable default
- Reduced motion respect: animation only on drawer + hover-card

### Localization
- Language toggle in top nav: `EN` / `中文`
- Paper content (titles, formulas) stays in original language
- Family chips bilingual: `MOM 动量` / `REV 反转` / `VAL 价值` / `QUA 质量` / `VOL 波动率` / `LIQ 流动性` / `OTH 其他`

---

# PART 1 — Existing pages, things to fix

## Hero (`/`)

- Drop the giant serif headline. Keep the same copy at smaller size in Inter weight 700, ~3xl not 6xl.
- Add a subline for new users under the headline: *"Starting with the one you drop in below."*
- Below the agent input card, embed a **live sample timeline** showing 8-10 sample papers across factor lanes. New users see the product, not just a prompt box.
- The decorative paper tags at the top (`pead reproduced · IC 0.062` etc.) are clickable. Click → opens the corresponding sample timeline node.
- Remove "Compare to GS / JPM / your archive" — replace with "Compare to your own archive".
- KPI ribbon below hero (only visible if user has runs):
  `26 papers · 7 factor families · avg score 0.53 · 13 reproduced · 3 sign-flips`

## Timeline (`/timeline`)

- **Node sizing varies dramatically by user star rating** (1-5 stars → 6px to 24px diameter). 5-star papers ~4× the area of 1-star.
- **Node visual differentiation**:
  - reproduced = solid colored circle
  - weak = circle with thinner stroke + dot pattern
  - sign-flip = lightning bolt `⚡` inside a colored hexagon (not just a red circle)
  - failed = circle with X overlay
- Hover card (existing) — add an overlay sparkline showing **claimed (dashed grey) vs reproduced (solid colored)** IC.
- **Time cursor**: vertical line follows mouse X, year/quarter/month label at top axis.
- **Range brushing**: thin mini-timeline at bottom with draggable handles to filter time window.
- **Cluster on overlap**: at high zoom density, render a single bubble with a count (`5`); click expands.
- **Quick-filter chips above lanes**: `Just my reproduced` / `Just sign-flips` / `Just A-shares` / `Last 6 months upload`.
- **Lane reordering**: drag handle on left of each lane name; persisted.
- **Lane sort dropdown**: by paper count (default) / avg score / alphabetical / custom.
- **Multi-select**: shift-click adds (max 3, show counter); floating bottom-right CTA `Compare 3 selected ⏵`.
- **Empty states**:
  - 0 papers total: "Your timeline is empty. Drop a PDF, paste an arxiv URL, or load 5 sample papers." [Drop zone] [Load samples] [Skip]
  - 0 papers in current filter: "No reversal papers from 2020-2022. Adjust the filter or upload a new paper."

## Library (`/library`)

- **Multi-select column** (leftmost checkbox + shift-range select).
- **Batch actions toolbar** (visible when ≥1 selected): `Re-run with new universe` · `Export zip` · `Tag` · `Archive` · `Delete`.
- **Saved views** in left sidebar under "Library": user-named smart collections like *"All sign-flip A-share momentum papers"*. Save current filter+search+sort combination as named view.
- **Row hover** reveals kebab menu (`⋯`): `Open verdict` / `Open in IDE` / `Re-run` / `Tag` / `Archive`.
- **Customizable columns**: `⚙ Columns` button toggles visibility, persisted.
- **Inline editing**: star rating + tags edited directly in cell, no modal.
- **Bulk re-run modal**: shows estimated time + LLM cost.
- Add a "super-compact" density mode (1 row = 24px).

## Factor families (`/factors`)

- **Add time-decay scatter plot** below the bar comparison in each card. X = paper year, Y = reproduced IC, points colored by verdict, with linear regression trend line.
- **Narrative sentence becomes dynamic** (LLM-generated, cached 24h). Show with a 🤖 icon prefix to denote it's auto-generated.
- **"Family bundle" download** = zip with each paper's `report.md` + `factor_*.py` + a `family_summary.md`.
- **"See N papers" expander** opens an inline list within the card (no page nav), with mini rows.
- **Add 7th card "Custom"**: papers tagged into user-defined family.
- **Cross-family compare CTA** at top: `Compare momentum vs reversal vs value` opens overlaid time-decay scatters.

## Verdict page (`/runs/[id]`)

### Bug fixes
- **Cumret chart vs table mismatch**: chart shows positive trajectory, table shows negative cumret. Either show **inverted-signal** cumret with explicit label `If you traded the inverted signal: +24.6%`, or match the table (negative trajectory). Add a toggle: `Paper direction` / `Inverted`.
- **Score gauge indicator position**: gauge spans 0° (top) to 360° clockwise = 0.0 to 1.0. At 0.05 the indicator should be ~18° (just past top), not at top. Add color-coded arc segments: red 0-0.3, yellow 0.3-0.7, green 0.7-1.0. Tick marks at 0.3 and 0.7.
- **Many "—" rows** in the comparison table (paper didn't report most metrics). Collapse missing rows into a footnote: *"Paper reports IC only; cumret/Sharpe/maxDD/score computed from our reproduction."* Move computed-only metrics to a separate "Reproduction stats" panel below.
- **Universe field "paper original"** — replace with actual extracted description: e.g. "All A-shares (CSI Universe), 554 stocks", or fall back to "Universe: not specified in paper".
- **Δ column for non-numeric rows**: show meaningful diff (`Δ +6 years later`, `Δ different (CSI 500 vs paper original)`) or hide the cell. Never show `—`.

### Enhancements
- **Headline finding** splits into 2 lines:
  - L1 (large): `Paper's claimed effect does not reproduce on later periods.`
  - L2 (medium): `Reproduced IC −0.0110 sign-flipped from claim +0.0260.`
- **Influence rating** (★) moves from right column up to the header metadata strip (next to MOM tag and SIGN-FLIP badge).
- **Red Team tab** badge shows severity: `Red Team · 🟡 1 warning` (color = highest finding severity).
- **Add "What next" CTA panel** below tabs:
  ```
  ─────────────────────────────────────────────────────
    WHAT NEXT
    
    🔭  Watch this factor live           [Subscribe →]
         Track IC decay; alert on regime change.
    
    💼  Paper trade this strategy         [Add to portfolio →]
         Inverted signal: −factor → simulated PnL.
    
    ⚖   Compare with similar papers       [Compare 3 →]
         3 reversal/momentum papers in your library.
    
    ✎   Add a note to this paper          [Edit notes]
  ─────────────────────────────────────────────────────
  ```
- **Share button** in toolbar (next to Download/Open folder) opens a modal:
  - Public URL (read-only view)
  - Twitter / LinkedIn / WeChat share
  - "Download verdict card" → 1200×630 PNG with headline + score gauge + cumret sparkline
  - Embed iframe snippet
- **Diff vs prev run button** (visible only if this paper has been re-run): opens inline diff view of metrics + factor.py code changes.
- **Public-profile link** next to author name: `Han, Wang · 2024 · CSI 500 · 5 reproductions in community` (clickable to community page).

## IDE workspace (`/runs/[id]/ide`)

- **Agent quick-actions become dynamic** based on current verdict:
  - Sign-flip → `Why is the verdict not green?` / `Try the inverted signal` / `Add a quality filter`
  - Weak → `Add winsorization at 1/99` / `Try a different lookback` / `Audit for look-ahead leakage`
  - Reproduced → `Generate live monitoring config` / `Stress-test with COVID period` / `Try a different universe`
- **LLM cost / quota indicator** at bottom of agent panel: `Haiku 4.5 · $0.04 used today · ~120 calls remaining`.
- **Model selector** dropdown in agent panel: Haiku 4.5 / Sonnet 4.6 / Opus 4.7 / GPT-4o-mini / GPT-4o.
- **Run backtest button** turns into red `■ Stop` while running with elapsed time. On completion, toast: `Run finished in 2.3s · score 0.05 → 0.12 (+0.07)` with `View diff` link.
- **Diff view (after re-run)**: inline Monaco-style diff with metric delta sidebar.
- **Version history sidebar** (collapsible right rail in IDE): `v1 (2026-04-24 16:00 UTC) · v2 (16:15) · v3 (current)`. Click a version → checkout (read-only); `Restore as new version` button.
- **`View run →`** link in top bar to navigate back to the verdict page (preserve scroll/tab state on return).

## Agent search modal

- **Personalize "TRY:" suggestions**: based on user's library (e.g. "you've read 3 reversal papers, try `momentum decay 2024`").
- **Found-paper review step**: agent doesn't auto-run. Show abstract + extracted factor candidate first. User chooses [Reproduce →] or [Save for later].
- **Cost estimate per find**: "This paper has 7 factor candidates. Estimated reproduction time ~3 min, OpenAI cost ~$0.04."

---

# PART 2 — New pages

## Settings (`/settings`)

Tabs:

1. **Account** — placeholder "Sign in with GitHub coming in v0.4"
2. **API keys**:
   - OpenAI key (masked input, encrypted in browser)
   - Tushare token (same)
   - "Test connection" button per key
   - "Last used: 2 hours ago"
3. **Data adapters**:
   - Active adapter dropdown: `CSV (bundled)` / `Tushare Pro` / `yfinance` / `Custom (.py upload)`
   - Universe presets: CSI 300 top 30 / CSI 500 / S&P 500 / Russell 2000 / custom ticker list
4. **LLM models**:
   - Default extractor / codegen / agent model selectors
   - Cost cap per run slider, default `$0.50`
5. **Appearance**:
   - Theme: auto / light / dark
   - Density: compact / comfortable / spacious
   - Language: EN / 中文
   - Reduced motion toggle
6. **Pipeline defaults**: default universe, dates, rebalance freq, auto-extract on upload, auto-run after extract
7. **Storage**: cache size (`1.2 GB`), Clear caches, Export all runs as zip, Import zip, Reset to defaults

## Compare (`/compare?ids=a,b,c`)

Up to 3 papers side-by-side.

- **Header chips**: each selected paper as a chip with `✕`. `+ Add paper` button picker.
- **3-column metadata grid**: title, authors, year, family, universe, claimed IC, period, verdict badge.
- **3-column reproduction grid**: reproduced IC, score, cumret, sharpe, max DD, sign match, red team count.
- **Overlaid cumret chart** + **overlaid IC time series**, color-coded per paper.
- **Common formula highlighting**: if 2 papers share `pct_change(close, 120)`, mark them.
- **Findings consensus** (LLM) at the top: *"All 3 papers studied A-share momentum/reversal. 2 of 3 sign-flip on 2022-2024 sample."*
- **Permalink** + **Export to PDF/PNG (1600×900)**.

## Search results (`/search?q=...`)

- **Top bar**: query input + filters (family / verdict / year / universe).
- **Results in 4 sections**:
  1. **Papers** (top 10, with title/author/abstract/factor formula match snippets)
  2. **Factors** (top 5, matching factor name)
  3. **Red Team findings** (top 5, matching finding text)
  4. **Notes / annotations** (top 5, matching user annotations)
- Each row: match snippet with `<mark>` highlights + verdict badge + click to open.
- Sort: relevance (default) / newest / highest score / lowest score / most reproduced.
- **Empty state**: *"No matches for `low-vol decay`. Try `idiosyncratic volatility`. Or use the Agent to find papers from arxiv/SSRN: [Open Agent →]"*

## Error / 404 / pipeline failure pages

Show as friendly cards on the affected route, never as bare error text.

- **404**: "Run `r-foo` not found. It might have been deleted, or this URL is from another user." [← Timeline] [Search runs]
- **Pipeline failed mid-run**: yellow card `Pipeline failed at stage: codegen. Reason: factor formula not parseable.` [Open in IDE to debug →] [Retry from this stage →]
- **PDF parse error**: `PDF could not be read (encrypted? scanned-only?). Try OCR'ing first, or upload a text version.` [Try again]
- **Tushare quota exceeded**: `Tushare hit daily quota. Cached data still available; new runs will fail until reset at 00:00 UTC.` [Use yfinance instead] [Settings → API Keys]
- **OpenAI rate-limited**: `OpenAI rate-limited. Try again in 30s, or switch model to gpt-4o-mini.` [Retry] [Switch model]
- **Offline banner** (subtle, top of page): *"Working offline. Changes saved locally; will sync when online."*

## Monitor (`/monitor`) — strategic new page

Concept: user takes a `reproduced` factor from a verdict page and clicks "Watch this factor live". Backend re-runs daily; this page shows watched factors and alerts when they decay.

**Layout**:
- **Alerts section** at top (only active, unacknowledged):
  ```
  ⚠ idio_vol (r-ang2006) — IC 30d MA dropped from +0.054 to +0.012
                            (-77% decay) on 2026-04-22
                            [View details →] [Acknowledge]
  
  ⚠ pead (r-bernard1989) — Sample concentration: last 30 days account
                            for 80% of recent IC
                            [Investigate →] [Acknowledge]
  ```
  Alert types: `IC decay` / `Sign flip` / `Sample concentration` / `Universe change`. Each has a severity color and acknowledge button.

- **Watched factors grid** (cards):
  ```
  ┌─────────────────────────────────────┐
  │ idio_vol  · ang2006                 │
  │ ─────────────────────────────       │
  │ 🟡 decay alert                      │
  │ Current IC (30d MA): +0.012          │
  │ Historical avg: +0.054                │
  │ Decay: −77% over 6 months            │
  │                                     │
  │ [sparkline of last 90 days IC]      │
  │                                     │
  │ Last updated: 2 hours ago            │
  │ Next update: in 22h                  │
  │                                     │
  │ [Pause] [Unwatch] [View →]           │
  └─────────────────────────────────────┘
  ```

- **Single-factor detail** (`/monitor/[factor_id]`):
  - Full IC time series chart, zoomable (30d / 90d / 1y / all)
  - Cumulative return chart
  - Alert history timeline
  - Settings: alert thresholds (decay %, sign-flip sensitivity), update frequency (daily / weekly / paused)
  - "Re-run with current data" button

- **Empty state**: *"No factors watched yet. Pick a `reproduced` paper from your library and click 'Watch this factor live'."* [Browse library →]

## Portfolio (`/portfolio`) — strategic new page (Execution layer scaffolding)

Concept: paper-trade a portfolio built from watched factors. Simulated only.

**Layout**:
- **Header**: portfolio name, total simulated PnL `+12.4%` since inception, YTD return, max DD, Sharpe.
- **Allocations table**:
  ```
  Factor      | Source paper        | Weight | Direction | Current value | YTD PnL          | Last rebalance
  pead        | Bernard 1989        | 25%    | long      | $25,000       | +$1,840 (+7.4%)  | 2 days ago
  idio_vol    | Ang 2006            | 25%    | short     | $25,000       | −$420 (−1.7%)    | 2 days ago
  …
  [Edit weights] [+ Add factor] [Remove]
  ```
- **Simulated equity curve** (full-width chart) with rebalance markers.
- **Position breakdown** (collapsible): per-ticker positions aggregated across factors.
- **Risk metrics panel**: VaR, beta to benchmark (CSI 300 / S&P 500 dropdown), turnover.
- **Export**:
  - `Export to IBKR DAM CSV` / `Export to Tiger CSV` / `Export to Futu CSV`
  - `Export rebalance orders` for next scheduled rebalance
- **Disclaimer banner** (always visible): *"Paper trading only. Not investment advice. Strategy simulated using delayed market data."*
- **Empty state**: *"Build a portfolio from your watched factors. [Pick from monitor →]"*

## Public profile (`/u/[username]`)

Read-only when viewed by anyone else.

- **Header**: username, avatar, bio, # papers reproduced, avg score, # sign-flips found, join date
- **Stats ribbon**: `26 papers · avg score 0.53 · 13 reproduced · 3 sign-flips found · ★ 4.2 community rating`
- **Pinned papers**: 3-5 user-chosen featured reproductions
- **Recent activity feed**: last N runs in chronological order (mini cards like timeline hovers)
- **Followers / Following counts** (placeholder, can be empty)
- **LLM-generated bio**: *"Reproduces mostly A-share factor papers. Bullish on quality, skeptical of momentum decay claims."* — auto-generated based on library.

---

# PART 3 — Cross-cutting components

## Command palette (`Cmd+K`)

Always accessible. Floating modal with categories:

- **Navigate**: pages (Timeline, Library, Factors, Monitor, Portfolio, Settings), saved views
- **Find**: papers, factors, red team findings, settings options
- **Do**:
  - Upload PDF
  - New run from URL (paste arxiv/SSRN link)
  - Re-run last paper
  - Toggle theme
  - Toggle density
  - Switch language
  - Open settings
- **Recent**: last 5 papers viewed, last 3 searches

## Notifications (top-right bell + badge count)

- Categories: `Pipeline` (run finished/failed) / `Monitor` (alerts fired) / `System` (announcements) / `Agent` (long task done)
- Inline list in dropdown; click row to navigate; mark-read on click
- Settings → Notifications: per-category toggles, sound on/off

## Onboarding tour (first-time visitor)

Modal sequence:

1. *"Welcome to replicalpha. Let's reproduce your first paper."*
2. *"Drop a PDF here, or load 5 sample papers to explore."* [Drop zone] [Load samples] [Skip]
3. After loading: *"This is your timeline. Each dot is a paper."* (highlights timeline)
4. *"Click a dot to see the verdict — does the paper still work?"* (auto-clicks sample)
5. *"Want to track a factor live? Click 'Watch this factor live' on the verdict page."* (highlights CTA)
6. *"Got it. Press Cmd+K anytime for shortcuts."* [Done]

Skippable; replayable from `Settings → Help`.

## Sync / connection state (top nav)

- Online + synced: green dot + `SYNC ✓`
- Online + syncing: blue spinner + `SYNC...`
- Offline: red dot + `OFFLINE · 2 changes queued`; click for queue list
- Hover tooltip: "Last synced: 30s ago" / "Working offline since 16:02 UTC"

## Mobile responsive

Design these specifically for mobile breakpoint (< 768px):

- **Timeline**: vertical orientation (papers as vertical cards, time on Y, swipeable). KPI ribbon: horizontal scroll.
- **Verdict page**: single column, panels stacked. Cumret chart full width. Tabs become accordion.
- **Library**: card list (not table), sortable via dropdown.
- **IDE**: read-only; show file content + agent panel only. Editing locked. Banner: "Open on desktop to edit code."
- **Hero**: agent input single-column.
- **Min width target**: 360px.

## Density toggle (global, top right)

Three modes: `compact` / `comfortable` (default) / `spacious`. Affects table row height, card padding, font size globally.

## Language toggle (global, top right)

`EN` / `中文`. Switches all UI strings; paper content stays in original.

---

# PART 4 — Out of scope (don't design)

- Sign-in / accounts / OAuth (anonymous-first stays)
- Real broker integration (CSV export only, no live trade)
- Team workspaces / shared portfolios
- Cross-run agent chat (one agent per run scope only)
- Citation graph / paper references parsing
- Email / Slack notifications
- Native mobile app (web-responsive only)
- Languages beyond EN / zh-CN
- Theme customization beyond default light + dark
- Plugin marketplace

---

# Deliverables checklist

Existing pages to revise: Hero · Timeline · Library · Factor families · Verdict · IDE · Agent search modal (7 pages)

New pages to design: Settings · Compare · Search results · Error/404 · Monitor · Monitor detail · Portfolio · Public profile (8 pages)

Cross-cutting: Command palette modal · Notifications dropdown · Onboarding modal · Sync indicator · Density toggle · Language toggle · Mobile views

Both light + dark variants for everything.
