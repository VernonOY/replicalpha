# replicalpha · v0.4 Analysis page · design brief

> Design-tool input. Static page only — backend wiring happens after Claude Design exports HTML.
> This is a **new** route added to the existing v0.3 product. Reuse v0.3's tokens, type, density, and chrome (sidebar / topbar / theme toggle / language toggle) verbatim. **Do not re-bundle existing pages.**

---

## Where this page lives

Route: `/runs/[id]/analysis`

Reached from:
1. Verdict page (`/runs/[id]`) — new tab next to "Code", "Backtest", "Red Team", **"Analysis"** (the new tab).
2. Library page row action — "Analyze" button on each run row.
3. Agent chat — when agent calls `run_factor_analysis`, the resulting tool-card has a "Open full analysis →" link to this route.

Default tab on load: **IC analysis** (section 1 below).

The page is dense — **6 sections in one scroll**, each ~one viewport tall on a 1440×900 desktop. Sections separated by a thin horizontal rule + section header with a "skip to" anchor menu sticky on the left rail.

---

## Visual reuse

- Inherit v0.3 palette, type, status pairs (color + icon).
- Background `#0b0e14` (dark default) / `#fafaf9` (light).
- Numbers / IC values in `JetBrains Mono`, signed, 4-decimal precision.
- All charts use the v0.3 chart style: thin 1px stroke, no shadow, axis labels at 11px Inter, gridline 8% opacity.
- Status colors (green / yellow / red) used consistently — green = supports the factor, red = breaks it, yellow = ambiguous.

---

## Page header

Sticky top, 56px tall:
- Left: breadcrumb `Runs / Zeng & Liu 2016 / Analysis`
- Center: paper title, single line, truncate
- Right: density toggle (compact/comfortable/spacious) + a "Re-run analysis" pill button (calls backend, shows spinner + ETA)

Below header, 32px-tall section nav rail (sticky on scroll):
`① IC · ② Quintiles · ③ Decay · ④ Attribution · ⑤ Turnover · ⑥ Robustness`

Click jumps with smooth scroll. Active section underlined.

---

## Section 1 · IC analysis

**Top: Stat strip** (5 metrics, monospace, signed). Treat this as the single-line "alphalens summary":

| Metric | Value | Hint |
|---|---|---|
| IC mean | `+0.0182` | "average IC across rebalance dates" |
| IC std | `0.0941` | "cross-sectional IC dispersion" |
| IR | `0.193` | "IC mean / IC std" |
| t-stat | `2.41` | "Newey-West HAC, lag=21" |
| p-value | `0.018` | "two-sided" |

Color the t-stat number: green if `|t| ≥ 2`, yellow if `1 ≤ |t| < 2`, red if `|t| < 1`.

**Below stat strip: 3 charts in a row** (each ~33% width):

1. **IC time series** (line chart)
   - X: rebalance date · Y: IC value
   - Two overlaid traces: raw IC (1px, 30% opacity) + 30-day moving average (2px, full opacity)
   - Horizontal zero line + dashed bands at ±0.05
   - Drag to range-zoom. Hover shows tooltip with date + IC value.

2. **IC distribution** (histogram + density curve)
   - 25 bins, blue fill 60% opacity, density curve overlaid
   - Vertical line at IC mean (red), at zero (grey)
   - X-axis label: "IC value" · Y: "frequency"
   - Annotate: `skew = +0.43 · kurtosis = 2.81`

3. **IC autocorrelation** (bar chart)
   - X: lag (1..20) · Y: ρ(lag)
   - Annotate "half-life" if ρ decays geometrically, else "no decay structure"

---

## Section 2 · Quintile decomposition

**Top-left card** (40% width):
- **Quintile bar chart** (Q1..Q5, 5 bars)
- Each bar: mean forward return (annualized %)
- Above each bar: t-stat in monospace, color-coded
- Below each bar: count `n=812`
- Q5−Q1 long-short spread shown as a separate "spread" bar to the right, distinct color (purple)

**Top-right card** (30% width):
- **Monotonicity badge**:
  - Big number: Spearman ρ between rank(quintile) and mean return
  - p-value below
  - Status pill: `MONOTONIC ✓` (green) if `ρ > 0.8 & p < 0.05`, `WEAK MONOTONIC ⚠` if `0.4 < ρ ≤ 0.8`, `NON-MONOTONIC ✗` if `ρ ≤ 0.4`

**Top-far-right card** (30% width):
- **Long-short spread + t-stat box**:
  - Big number: spread (annualized %)
  - t-stat below in mono
  - "On 1bp slippage: spread − 0.31%"
  - "On 5bp slippage: spread − 1.56%"

**Bottom row, full width**:
- **Quintile cumulative returns** — 5 lines on one chart, gradient from red (Q1) → green (Q5)
- Y axis: cumulative return %. X: date. Legend: Q1..Q5 + Long-short overlay (black, dashed).

---

## Section 3 · Decay structure

**Left** (50% width):
- **Forward IC bars** at 5 horizons: 1d / 5d / 21d / 63d / 252d
- X axis: horizon · Y: IC at that horizon
- Each bar has a t-stat label above, color-coded
- Subtitle: `Half-life ≈ 18 days` if computed, else `No clear decay`

**Right** (50% width):
- **30-day rolling IC + cumulative IC** dual-axis line
- Left axis: 30-day rolling mean IC
- Right axis: cumulative sum of IC
- Annotate inflection points (max cum IC, last cross-zero) with vertical dashed lines

---

## Section 4 · Risk attribution

**Top-left card** (40% width):
- **Style β radar chart** (hexagon, 6 axes):
  - market · size (SMB) · value (HML) · profitability (RMW) · investment (CMA) · momentum (UMD)
  - Outer ring at β = 1 · inner at β = 0 · annotated
  - Filled polygon shows the portfolio's β profile
  - Each axis label includes the β value + t-stat in mono

**Top-right card** (35% width):
- **Sector exposure** — horizontal stacked bar (one bar, 100% width, segments per sector)
- Hover segment for sector name + weight %
- Legend below in 2 columns

**Top-far-right card** (25% width):
- **Idiosyncratic α**:
  - Big number: annualized α (%)
  - t-stat + p-value below
  - R² of the regression
  - Status pill: `α SIGNIFICANT ✓` (green) if `t > 2`, else `α NOT DISTINGUISHABLE FROM ZERO ⚠`

**Bottom row, full width**:
- **Rolling 1-year style β** — 6 small lines (one per FF factor), faint trace per factor, label at end
- Reveals time-varying exposure (e.g. "factor used to be neutral on size, now -0.4")

---

## Section 5 · Turnover & capacity

**Left** (50% width):
- **Daily turnover line** — % portfolio turnover per rebalance
- Y: turnover %. X: date.
- Horizontal reference at average turnover.
- Subtitle: `avg 38% · max 91% · min 12%`

**Right-top** (50% width, 50% height):
- **Turnover distribution histogram**
- 20 bins · X: turnover % · Y: frequency

**Right-bottom** (50% width, 50% height):
- **Capacity curve** — Sharpe vs AUM (USD millions, log scale on X)
- 3 lines (one per slippage assumption: 5bp / 10bp / 20bp)
- Annotate the AUM where Sharpe drops below 1.0 — the "capacity wall"

---

## Section 6 · Robustness

**Top-left card** (50% width):
- **Yearly IC heatmap**
- Rows: years · columns: quarters · cell color = IC for that year-quarter
- Color scale: red (negative) · grey (≈0) · green (positive)
- Cell shows IC value in white text (mono)
- Title: "Subperiod IC" · subtitle: number of significant periods

**Top-right card** (50% width):
- **Regime split bars**
- 3 bars: Bull · Sideways · Bear (color-coded green / grey / red)
- Each bar height = IC during that regime
- t-stat label above each bar
- Subtitle: "Regime detection: 200d MA + 60d return"

**Bottom-left card** (50% width):
- **Bootstrap CI box plot**
- Single box showing IC distribution from 1,000 bootstrap resamples
- Box = IQR, whiskers = 95% CI, vertical line = mean, dot = observed IC
- Annotate: `[lower 95%, upper 95%]` and `coverage of zero: yes/no`
- Status pill: `IC ≠ 0 (95% CI)` (green) or `CI INCLUDES ZERO ⚠` (yellow)

**Bottom-right card** (50% width):
- **Universe split bar chart**
- 3 bars: Small-cap tercile · Mid-cap tercile · Large-cap tercile
- Each bar height = IC within that tercile
- Reveals if factor only works in small-cap / large-cap

---

## Page-level controls (top-right of page header)

- **"Re-run analysis" button** — kicks off backend recompute, full-page spinner with ETA "~12s"
- **"Open in Agent →" button** — opens agent chat in side drawer (50% width) with the current run pre-loaded as context, chat focused so user can ask "explain why my α is not significant"
- **"Export PDF" dropdown** — `Full report` / `Just charts` / `Just stats CSV`

---

## Empty / loading / error states

**Loading** (first time, before backend response):
- Skeleton cards (shimmer) for each section, height-preserved so page doesn't jump

**Empty** (run completed but no analysis computed yet):
- One big centered card: "This run hasn't been analyzed yet." `[Compute analysis (12s, free)]` `[Or use the agent: "Run full analysis"]`

**Error** (backend errored):
- Red banner at top: "Analysis failed: {error message}. Try [Re-run] or [Open in agent]."

**Partial** (some sections computed, others failed):
- Each failed section shows `⚠ Failed to compute. [Retry]` instead of charts. Other sections render normally.

---

## Mocked data structure (for static stub)

Stub each section with this schema (frontend wires to real `GET /runs/{id}/analysis` later):

```json
{
  "run_id": "r-1a2b3c4d",
  "ic_stats": {
    "mean": 0.0182, "std": 0.0941, "ir": 0.193,
    "t_stat": 2.41, "p_value": 0.018, "n": 612
  },
  "ic_series": [{"date": "2022-01-04", "ic": 0.024}, ...],
  "ic_autocorrelation": [{"lag": 1, "rho": 0.31}, ...],
  "quintiles": [
    {"q": 1, "mean_return": -0.034, "t_stat": -1.82, "n": 812},
    ...
    {"q": 5, "mean_return": 0.041, "t_stat": 2.21, "n": 812}
  ],
  "long_short_spread": {"spread": 0.075, "t_stat": 3.12},
  "monotonicity": {"spearman": 0.92, "p_value": 0.008},
  "forward_ic": [
    {"horizon": 1, "ic": 0.018, "t_stat": 2.41, "p_value": 0.018},
    {"horizon": 5, "ic": 0.014, "t_stat": 1.91, "p_value": 0.057},
    ...
  ],
  "style_betas": [
    {"factor": "market", "beta": 0.81, "t_stat": 14.2},
    ...
  ],
  "sector_exposure": [
    {"sector": "Tech", "weight": 0.31}, ...
  ],
  "idiosyncratic_alpha": {
    "alpha": 0.0421, "t_stat": 2.83, "p_value": 0.005, "r_squared": 0.62
  },
  "turnover": {
    "series": [{"date": "...", "turnover": 0.38}, ...],
    "mean": 0.38, "max": 0.91, "min": 0.12
  },
  "capacity": {
    "curves": [
      {"slippage_bp": 5, "points": [{"aum_m": 10, "sharpe": 1.6}, ...]},
      ...
    ]
  },
  "robustness": {
    "subperiod_ic": [
      {"period": "2022", "ic": 0.022, "t_stat": 1.81, "n": 250},
      ...
    ],
    "regime_ic": [
      {"regime": "bull", "ic": 0.031, "t_stat": 2.42},
      {"regime": "sideways", "ic": -0.004, "t_stat": -0.21},
      {"regime": "bear", "ic": 0.012, "t_stat": 0.91}
    ],
    "bootstrap_ci": {
      "ic_mean": 0.0182, "ci_lower": 0.0042, "ci_upper": 0.0312,
      "covers_zero": false
    },
    "universe_split": [
      {"slice": "small-cap", "ic": 0.041, "t_stat": 2.81},
      {"slice": "mid-cap", "ic": 0.012, "t_stat": 0.91},
      {"slice": "large-cap", "ic": 0.002, "t_stat": 0.12}
    ]
  }
}
```

---

## Bilingual strings

| English | 中文 |
|---|---|
| Analysis | 因子分析 |
| IC mean / std / IR / t / p | IC 均值 / 标准差 / IR / t 值 / p 值 |
| Quintile decomposition | 分位数分解 |
| Monotonicity | 单调性 |
| Long-short spread | 多空价差 |
| Decay structure | 衰减结构 |
| Forward IC | 前瞻 IC |
| Half-life | 半衰期 |
| Risk attribution | 风险归因 |
| Style β | 风格暴露 |
| Sector exposure | 行业暴露 |
| Idiosyncratic α | 特质 alpha |
| Turnover | 换手率 |
| Capacity curve | 容量曲线 |
| Robustness | 稳健性 |
| Subperiod IC | 子区间 IC |
| Regime split | 牛熊态势分组 |
| Bootstrap CI | 自助置信区间 |
| Universe split | 市值分组 |
| Re-run analysis | 重新分析 |
| Open in agent | 在 agent 中打开 |

---

## Out of scope (will NOT be in v0.4)

- Real Barra factor model (we use FF5+UMD as approximation; document this in section 4 footer: `Style βs computed against FF5+UMD proxies built from CSI universe — not a real Barra model. Roadmap v0.5.`)
- Walk-forward purged k-fold robustness section
- Sector neutralization toggle (just shown raw exposures)
- Custom user-defined regimes (only built-in 200d MA + 60d return)
- Mobile / iPad responsive

---

## Hand-off

After Claude Design exports HTML, I will:
1. Locate the new page bundle under `replicalpha.html` or as a new module
2. **Surgically** wire each chart to `GET /runs/{id}/analysis` using the JSON schema above
3. Keep `replicalpha.html.backup-pre-analysis-page` snapshot before any edit
4. Test the wiring against a real run before claiming the integration done

End of brief.
