
// ===== data.jsx =====
// Sample data for replicalpha — ~28 quant papers across factor families.
// Verdict: 'green' = strong reproduction (score >= 0.6), 'yellow' = weak (0.2–0.6),
// 'red' = sign-flip / failed (<0.2). Influence is 0–5 stars.

const FACTOR_FAMILIES = [
  { id: 'momentum',  label: 'Momentum',  short: 'MOM' },
  { id: 'reversal',  label: 'Reversal',  short: 'REV' },
  { id: 'value',     label: 'Value',     short: 'VAL' },
  { id: 'quality',   label: 'Quality',   short: 'QUA' },
  { id: 'volatility',label: 'Volatility',short: 'VOL' },
  { id: 'liquidity', label: 'Liquidity', short: 'LIQ' },
  { id: 'other',     label: 'Other',     short: 'OTH' },
];

const UNIVERSES = ['CSI 300', 'CSI 500', 'CSI 1000', 'A-share full', 'US Russell 1000', 'US S&P 500'];

// Sparkline generator — short cumret-like series, normalized
function spark(seed, len = 36, drift = 0, vol = 1) {
  let s = 0;
  const out = [];
  let x = seed;
  for (let i = 0; i < len; i++) {
    x = (x * 9301 + 49297) % 233280;
    const r = (x / 233280 - 0.5) * 2 * vol + drift;
    s += r;
    out.push(s);
  }
  return out;
}

const PAPERS = [
  // The Zeng-Liu real demo paper — kept verbatim
  {
    id: 'r-2960e76f',
    title: 'Study of the Momentum Effect and the Reversal Effect on the Chinese Stock Market',
    authors: 'Zeng, Liu',
    year: 2016, month: 4,
    family: 'reversal',
    factor: 'reversal_effect',
    factor_zh: '逆转效应',
    formula: '-pct_change(close, 120)',
    universe: 'CSI 300 top 30',
    period_paper: '2010-04 → 2016-02',
    period_repro: '2022-01 → 2024-12',
    ic_paper: 0.0131,
    ic_repro: -0.0218,
    ic_std: 0.3285,
    cumret: 4.46,
    maxdd: 20.17,
    sharpe: 0.19,
    score: 0.00,
    verdict: 'red',
    sign_flip: true,
    influence: 4,
    redteam: [
      { check: 'sample_concentration', severity: 'warning', note: 'year 2023 accounts for 59% of cumulative IC' },
    ],
    tags: ['A-share', 'sign-flip', 'reproduced'],
    spark: spark(11, 36, -0.04, 1.1),
    real: true,
  },
  // Momentum
  { id: 'r-jt1993',  title: 'Returns to Buying Winners and Selling Losers',                    authors: 'Jegadeesh, Titman', year: 1993, month: 3, family: 'momentum', factor: 'mom_12_1', formula: 'pct_change(close, 252) - pct_change(close, 21)', universe: 'US S&P 500', period_paper: '1965-1989', period_repro: '2018-01 → 2024-12', ic_paper: 0.041, ic_repro: 0.022, ic_std: 0.18, cumret: 18.4, maxdd: 12.3, sharpe: 0.84, score: 0.54, verdict: 'yellow', influence: 5, redteam: [], tags: ['classic', 'US'], spark: spark(2, 36, 0.06, 0.9) },
  { id: 'r-cglo1999',title: 'Momentum Strategies in International Equity Markets',             authors: 'Chan, Hameed, Tong', year: 2000, month: 8, family: 'momentum', factor: 'intl_mom_6m', formula: 'pct_change(close, 126)', universe: 'A-share full', period_paper: '1990-1995', period_repro: '2020-01 → 2024-12', ic_paper: 0.029, ic_repro: 0.018, ic_std: 0.21, cumret: 9.1, maxdd: 14.2, sharpe: 0.51, score: 0.62, verdict: 'green', influence: 3, redteam: [], tags: ['international'], spark: spark(7, 36, 0.04, 1.0) },
  { id: 'r-novymar2012', title: 'Is Momentum Really Momentum?',                                 authors: 'Novy-Marx', year: 2012, month: 5, family: 'momentum', factor: 'intermediate_mom', formula: 'pct_change(close, 252) - pct_change(close, 132)', universe: 'US Russell 1000', period_paper: '1926-2010', period_repro: '2018-01 → 2024-12', ic_paper: 0.034, ic_repro: 0.019, ic_std: 0.20, cumret: 11.2, maxdd: 9.8, sharpe: 0.69, score: 0.55, verdict: 'yellow', influence: 4, redteam: [{check:'sample_concentration', severity:'warning', note:'2020 contributes 41% of IC'}], tags: ['intermediate-horizon'], spark: spark(13, 36, 0.045, 0.95) },
  { id: 'r-mosk2008', title: 'Time Series Momentum',                                            authors: 'Moskowitz, Ooi, Pedersen', year: 2012, month: 3, family: 'momentum', factor: 'tsmom_12m', formula: 'sign(pct_change(close, 252))', universe: 'US Russell 1000', period_paper: '1985-2009', period_repro: '2019-01 → 2024-12', ic_paper: 0.038, ic_repro: 0.041, ic_std: 0.17, cumret: 22.3, maxdd: 11.4, sharpe: 0.92, score: 0.78, verdict: 'green', influence: 5, redteam: [], tags: ['time-series', 'TSMOM'], spark: spark(19, 36, 0.07, 0.85) },
  { id: 'r-han2024', title: 'Momentum Decay in Chinese Equities Post-2018',                     authors: 'Han, Wang', year: 2024, month: 1, family: 'momentum', factor: 'mom_short_2024', formula: 'pct_change(close, 60)', universe: 'CSI 500', period_paper: '2010-2018', period_repro: '2022-01 → 2024-12', ic_paper: 0.026, ic_repro: -0.011, ic_std: 0.24, cumret: -3.2, maxdd: 18.1, sharpe: -0.14, score: 0.05, verdict: 'red', sign_flip: true, influence: 2, redteam: [{check:'data_leakage', severity:'critical', note:'forward-fill on close violates qtype'}], tags: ['A-share', 'sign-flip'], spark: spark(23, 36, -0.02, 1.1) },

  // Reversal
  { id: 'r-debondt85', title: 'Does the Stock Market Overreact?',                                authors: 'De Bondt, Thaler', year: 1985, month: 7, family: 'reversal', factor: 'longterm_rev_3y', formula: '-pct_change(close, 756)', universe: 'US S&P 500', period_paper: '1926-1982', period_repro: '2015-01 → 2024-12', ic_paper: 0.022, ic_repro: 0.014, ic_std: 0.19, cumret: 7.4, maxdd: 13.8, sharpe: 0.42, score: 0.49, verdict: 'yellow', influence: 5, redteam: [], tags: ['classic', 'long-term'], spark: spark(31, 36, 0.03, 1.0) },
  { id: 'r-jegadeesh90', title: 'Evidence of Predictable Behavior of Security Returns',         authors: 'Jegadeesh', year: 1990, month: 6, family: 'reversal', factor: 'monthly_rev_1m', formula: '-pct_change(close, 21)', universe: 'US Russell 1000', period_paper: '1934-1987', period_repro: '2020-01 → 2024-12', ic_paper: 0.054, ic_repro: 0.032, ic_std: 0.16, cumret: 14.8, maxdd: 8.2, sharpe: 0.81, score: 0.63, verdict: 'green', influence: 4, redteam: [], tags: ['short-term'], spark: spark(37, 36, 0.05, 0.9) },
  { id: 'r-da2014', title: 'A Closer Look at the Short-Term Reversal',                           authors: 'Da, Liu, Schaumburg', year: 2014, month: 11, family: 'reversal', factor: 'idio_rev', formula: '-zscore(pct_change(close, 21))', universe: 'US Russell 1000', period_paper: '1982-2009', period_repro: '2019-01 → 2024-12', ic_paper: 0.048, ic_repro: 0.028, ic_std: 0.18, cumret: 12.1, maxdd: 9.1, sharpe: 0.71, score: 0.58, verdict: 'yellow', influence: 4, redteam: [], tags: ['idiosyncratic'], spark: spark(41, 36, 0.04, 0.95) },

  // Value
  { id: 'r-fama92', title: 'The Cross-Section of Expected Stock Returns',                       authors: 'Fama, French', year: 1992, month: 6, family: 'value', factor: 'book_to_market', formula: 'log(book / market_cap)', universe: 'US S&P 500', period_paper: '1963-1990', period_repro: '2018-01 → 2024-12', ic_paper: 0.039, ic_repro: 0.012, ic_std: 0.22, cumret: 4.8, maxdd: 21.3, sharpe: 0.21, score: 0.31, verdict: 'yellow', influence: 5, redteam: [{check:'sample_concentration', severity:'warning', note:'value premium concentrated in 2022'}], tags: ['classic', 'B/M'], spark: spark(47, 36, 0.015, 1.2) },
  { id: 'r-asness2013', title: 'Value and Momentum Everywhere',                                  authors: 'Asness, Moskowitz, Pedersen', year: 2013, month: 6, family: 'value', factor: 'global_value', formula: 'rank(book/price) + rank(earnings/price)', universe: 'US Russell 1000', period_paper: '1972-2011', period_repro: '2018-01 → 2024-12', ic_paper: 0.031, ic_repro: 0.024, ic_std: 0.17, cumret: 11.8, maxdd: 10.2, sharpe: 0.64, score: 0.71, verdict: 'green', influence: 5, redteam: [], tags: ['multi-asset'], spark: spark(53, 36, 0.04, 0.9) },
  { id: 'r-piotroski2000', title: 'Value Investing: The Use of Historical Financial Statement Information', authors: 'Piotroski', year: 2000, month: 12, family: 'value', factor: 'f_score', formula: 'piotroski_f(income, balance, cashflow)', universe: 'US S&P 500', period_paper: '1976-1996', period_repro: '2018-01 → 2024-12', ic_paper: 0.044, ic_repro: 0.029, ic_std: 0.19, cumret: 13.4, maxdd: 11.7, sharpe: 0.67, score: 0.61, verdict: 'green', influence: 5, redteam: [], tags: ['F-score', 'fundamentals'], spark: spark(59, 36, 0.045, 0.95) },
  { id: 'r-li2023', title: 'Value Anomaly in Post-Reform Chinese Markets',                       authors: 'Li, Chen', year: 2023, month: 7, family: 'value', factor: 'cn_value', formula: 'rank(1/pe_ratio)', universe: 'CSI 300', period_paper: '2010-2020', period_repro: '2022-01 → 2024-12', ic_paper: 0.027, ic_repro: 0.019, ic_std: 0.21, cumret: 7.9, maxdd: 14.6, sharpe: 0.42, score: 0.56, verdict: 'yellow', influence: 3, redteam: [], tags: ['A-share'], spark: spark(61, 36, 0.025, 1.0) },

  // Quality
  { id: 'r-novy2013', title: 'The Other Side of Value: The Gross Profitability Premium',         authors: 'Novy-Marx', year: 2013, month: 4, family: 'quality', factor: 'gross_profitability', formula: '(revenue - cogs) / total_assets', universe: 'US Russell 1000', period_paper: '1963-2010', period_repro: '2018-01 → 2024-12', ic_paper: 0.036, ic_repro: 0.027, ic_std: 0.18, cumret: 13.6, maxdd: 9.4, sharpe: 0.74, score: 0.69, verdict: 'green', influence: 5, redteam: [], tags: ['profitability'], spark: spark(67, 36, 0.05, 0.85) },
  { id: 'r-frazzini2018', title: 'Quality Minus Junk',                                            authors: 'Asness, Frazzini, Pedersen', year: 2019, month: 1, family: 'quality', factor: 'qmj', formula: 'z(profit) + z(growth) + z(safety) + z(payout)', universe: 'US Russell 1000', period_paper: '1956-2016', period_repro: '2019-01 → 2024-12', ic_paper: 0.033, ic_repro: 0.025, ic_std: 0.17, cumret: 12.4, maxdd: 8.9, sharpe: 0.71, score: 0.68, verdict: 'green', influence: 5, redteam: [], tags: ['QMJ', 'multi-factor'], spark: spark(71, 36, 0.045, 0.9) },
  { id: 'r-zhu2022', title: 'Earnings Quality and Cross-Sectional Returns in China',             authors: 'Zhu, Sun', year: 2022, month: 5, family: 'quality', factor: 'accruals_cn', formula: '-rank(accruals / total_assets)', universe: 'CSI 1000', period_paper: '2014-2020', period_repro: '2022-01 → 2024-12', ic_paper: 0.029, ic_repro: 0.011, ic_std: 0.22, cumret: 5.2, maxdd: 16.4, sharpe: 0.27, score: 0.34, verdict: 'yellow', influence: 3, redteam: [{check:'small_cap_exposure', severity:'warning', note:'held leg median cap < 0.5× universe'}], tags: ['A-share', 'accruals'], spark: spark(73, 36, 0.02, 1.1) },

  // Volatility
  { id: 'r-ang2006', title: 'The Cross-Section of Volatility and Expected Returns',              authors: 'Ang, Hodrick, Xing, Zhang', year: 2006, month: 2, family: 'volatility', factor: 'idiovol', formula: '-rolling_std(residual_returns, 21)', universe: 'US S&P 500', period_paper: '1963-2000', period_repro: '2018-01 → 2024-12', ic_paper: 0.035, ic_repro: 0.026, ic_std: 0.18, cumret: 12.9, maxdd: 9.6, sharpe: 0.69, score: 0.66, verdict: 'green', influence: 5, redteam: [], tags: ['IVOL', 'classic'], spark: spark(79, 36, 0.045, 0.9) },
  { id: 'r-blitz2007', title: 'The Volatility Effect: Lower Risk Without Lower Return',          authors: 'Blitz, van Vliet', year: 2007, month: 5, family: 'volatility', factor: 'low_vol', formula: '-rolling_std(returns, 252)', universe: 'US Russell 1000', period_paper: '1986-2006', period_repro: '2019-01 → 2024-12', ic_paper: 0.041, ic_repro: 0.031, ic_std: 0.16, cumret: 15.2, maxdd: 7.8, sharpe: 0.84, score: 0.74, verdict: 'green', influence: 5, redteam: [], tags: ['low-vol'], spark: spark(83, 36, 0.055, 0.8) },
  { id: 'r-baker2011', title: 'Benchmarks as Limits to Arbitrage: Understanding the Low-Volatility Anomaly', authors: 'Baker, Bradley, Wurgler', year: 2011, month: 1, family: 'volatility', factor: 'lv_anomaly', formula: 'rank(-vol_60d)', universe: 'US S&P 500', period_paper: '1968-2008', period_repro: '2018-01 → 2024-12', ic_paper: 0.029, ic_repro: 0.017, ic_std: 0.19, cumret: 8.3, maxdd: 12.1, sharpe: 0.46, score: 0.51, verdict: 'yellow', influence: 4, redteam: [], tags: ['low-vol'], spark: spark(89, 36, 0.03, 1.0) },
  { id: 'r-yao2025', title: 'Vol-of-Vol as a Predictor in Chinese Index Constituents',           authors: 'Yao, Park', year: 2025, month: 2, family: 'volatility', factor: 'volvol', formula: '-rolling_std(rolling_std(returns,21), 60)', universe: 'CSI 300', period_paper: '2018-2024', period_repro: '2023-01 → 2025-02', ic_paper: 0.024, ic_repro: 0.020, ic_std: 0.20, cumret: 6.4, maxdd: 11.3, sharpe: 0.41, score: 0.64, verdict: 'green', influence: 3, redteam: [], tags: ['A-share', 'novel'], spark: spark(97, 36, 0.025, 0.95) },

  // Liquidity
  { id: 'r-amihud2002', title: 'Illiquidity and Stock Returns: Cross-Section and Time-Series Effects', authors: 'Amihud', year: 2002, month: 1, family: 'liquidity', factor: 'amihud_illiq', formula: 'mean(|return| / dollar_volume, 21)', universe: 'US Russell 1000', period_paper: '1963-1997', period_repro: '2018-01 → 2024-12', ic_paper: 0.043, ic_repro: 0.031, ic_std: 0.18, cumret: 14.6, maxdd: 9.8, sharpe: 0.78, score: 0.69, verdict: 'green', influence: 5, redteam: [], tags: ['ILLIQ', 'classic'], spark: spark(101, 36, 0.05, 0.9) },
  { id: 'r-pastor2003', title: 'Liquidity Risk and Expected Stock Returns',                      authors: 'Pástor, Stambaugh', year: 2003, month: 6, family: 'liquidity', factor: 'liq_beta', formula: 'beta(returns, market_liquidity)', universe: 'US S&P 500', period_paper: '1966-1999', period_repro: '2018-01 → 2024-12', ic_paper: 0.022, ic_repro: 0.009, ic_std: 0.21, cumret: 3.1, maxdd: 15.7, sharpe: 0.18, score: 0.27, verdict: 'yellow', influence: 4, redteam: [], tags: ['liquidity-beta'], spark: spark(103, 36, 0.01, 1.1) },
  { id: 'r-chen2021', title: 'Turnover-Adjusted Reversal in A-Shares',                            authors: 'Chen, Wu, Lin', year: 2021, month: 9, family: 'liquidity', factor: 'turnover_rev', formula: '-pct_change(close,21) * rank(turnover)', universe: 'CSI 500', period_paper: '2010-2019', period_repro: '2022-01 → 2024-12', ic_paper: 0.038, ic_repro: -0.014, ic_std: 0.24, cumret: -2.1, maxdd: 19.3, sharpe: -0.11, score: 0.00, verdict: 'red', sign_flip: true, influence: 3, redteam: [{check:'sample_concentration', severity:'warning', note:'80% of IC from 2014-15 bubble'}], tags: ['A-share', 'sign-flip'], spark: spark(107, 36, -0.01, 1.15) },

  // Other
  { id: 'r-harvey2016', title: '… and the Cross-Section of Expected Returns',                    authors: 'Harvey, Liu, Zhu', year: 2016, month: 1, family: 'other', factor: 'multiple_testing', formula: 't_stat / sqrt(N_tests)', universe: 'US Russell 1000', period_paper: '1967-2014', period_repro: '2019-01 → 2024-12', ic_paper: 0.018, ic_repro: 0.011, ic_std: 0.16, cumret: 4.2, maxdd: 7.9, sharpe: 0.32, score: 0.55, verdict: 'yellow', influence: 5, redteam: [], tags: ['meta', 'p-hacking'], spark: spark(109, 36, 0.02, 0.85) },
  { id: 'r-mclean2016', title: 'Does Academic Research Destroy Stock Return Predictability?',     authors: 'McLean, Pontiff', year: 2016, month: 1, family: 'other', factor: 'post_pub_decay', formula: 'mean(IC_post_pub) / mean(IC_pre_pub)', universe: 'US Russell 1000', period_paper: '1926-2013', period_repro: '2019-01 → 2024-12', ic_paper: -0.026, ic_repro: -0.021, ic_std: 0.14, cumret: -6.2, maxdd: 9.8, sharpe: -0.41, score: 0.74, verdict: 'green', influence: 5, redteam: [], tags: ['meta', 'decay'], spark: spark(113, 36, -0.03, 0.7) },
  { id: 'r-feng2020', title: 'Taming the Factor Zoo: A Test of New Factors',                      authors: 'Feng, Giglio, Xiu', year: 2020, month: 4, family: 'other', factor: 'lasso_factor_zoo', formula: 'lasso(factor_returns ~ char)', universe: 'US Russell 1000', period_paper: '1976-2017', period_repro: '2019-01 → 2024-12', ic_paper: 0.014, ic_repro: 0.012, ic_std: 0.13, cumret: 4.1, maxdd: 6.2, sharpe: 0.38, score: 0.81, verdict: 'green', influence: 4, redteam: [], tags: ['ML', 'meta'], spark: spark(127, 36, 0.02, 0.7) },
];

window.FACTOR_FAMILIES = FACTOR_FAMILIES;
window.UNIVERSES = UNIVERSES;
window.PAPERS = PAPERS;

// ===== ui.jsx =====
// Shared UI primitives — small, dark-themed.

const { useState, useRef, useEffect, useMemo, useCallback } = React;

// Verdict color helpers
const VERDICT_COLORS = {
  green:  { fill: '#22c55e', dim: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.5)',  label: 'reproduced' },
  yellow: { fill: '#eab308', dim: 'rgba(234,179,8,0.15)',  border: 'rgba(234,179,8,0.5)',  label: 'weak'       },
  red:    { fill: '#ef4444', dim: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.5)',  label: 'failed'     },
};

function VerdictDot({ v, size = 8 }) {
  const c = VERDICT_COLORS[v] || VERDICT_COLORS.yellow;
  return <span style={{
    display: 'inline-block', width: size, height: size, borderRadius: '50%',
    background: c.fill, boxShadow: `0 0 0 2px ${c.dim}`, verticalAlign: 'middle',
  }} />;
}

function VerdictBadge({ v, sign_flip }) {
  const c = VERDICT_COLORS[v] || VERDICT_COLORS.yellow;
  const label = sign_flip ? window.t("verdict.sign_flip") : (v === 'green' ? window.t("verdict.reproduced") : v === 'yellow' ? window.t("verdict.weak") : window.t("verdict.failed"));
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--mono)',
      letterSpacing: 0.3, textTransform: 'uppercase',
      background: c.dim, color: c.fill, border: `1px solid ${c.border}`,
    }}>
      <span style={{width:6,height:6,borderRadius:'50%',background:c.fill}}/> {label}
    </span>
  );
}

// Sparkline — pure SVG, no recharts, fast
function Spark({ data, w = 80, h = 24, color = '#1976d2', area = true }) {
  if (!data || !data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const span = (max - min) || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / span) * h,
  ]);
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const a = `${d} L${w},${h} L0,${h} Z`;
  // last value sign for color
  const last = data[data.length - 1];
  const positive = last >= 0;
  const c = color === 'auto' ? (positive ? '#22c55e' : '#ef4444') : color;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:'block'}}>
      {area && <path d={a} fill={c} opacity={0.12} />}
      <path d={d} fill="none" stroke={c} strokeWidth={1.25} />
    </svg>
  );
}

// Number formatters
const fmt = {
  ic: (v) => (v == null ? '—' : (v >= 0 ? '+' : '') + v.toFixed(4)),
  pct: (v) => (v == null ? '—' : (v >= 0 ? '+' : '') + v.toFixed(2) + '%'),
  score: (v) => (v == null ? '—' : v.toFixed(2)),
  sharpe: (v) => (v == null ? '—' : (v >= 0 ? '+' : '') + v.toFixed(2)),
};

function Mono({ children, color, size = 12, weight = 500 }) {
  return <span style={{ fontFamily: 'var(--mono)', fontSize: size, color, fontWeight: weight, fontVariantNumeric: 'tabular-nums' }}>{children}</span>;
}

function Stars({ n, size = 8 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1.5, verticalAlign: 'middle' }}>
      {[0,1,2,3,4].map(i => (
        <span key={i} style={{
          width: size, height: size, background: i < n ? 'var(--accent)' : 'var(--border)',
          clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
        }}/>
      ))}
    </span>
  );
}

// Tiny chevron icon
function Chevron({ dir = 'right', size = 12 }) {
  const r = { right: 0, down: 90, left: 180, up: 270 }[dir];
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{transform:`rotate(${r}deg)`,transition:'transform 0.15s'}}>
      <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function FamilyChip({ family }) {
  const f = window.FACTOR_FAMILIES.find(x => x.id === family);
  if (!f) return null;
  return (
    <span style={{
      display: 'inline-block', padding: '1px 6px', borderRadius: 3,
      fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: 0.5,
      background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)',
    }}>{f.short}</span>
  );
}

Object.assign(window, {
  VERDICT_COLORS, VerdictDot, VerdictBadge, Spark, fmt, Mono, Stars, Chevron, FamilyChip,
});

// ===== tweaks-panel.jsx =====

// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;width:100%;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null
      ? keyOrEdits : { [keyOrEdits]: val };
    setValues((prev) => ({ ...prev, ...edits }));
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*');
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({ title = 'Tweaks', children }) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({ x: 16, y: 16 });
  const PAD = 16;

  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth, h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y)),
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);

  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);

  React.useEffect(() => {
    const onMsg = (e) => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);
      else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
  };

  const onDragStart = (e) => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = (ev) => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy),
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  if (!open) return null;
  return (
    <>
      <style>{__TWEAKS_STYLE}</style>
      <div ref={dragRef} className="twk-panel"
           style={{ right: offsetRef.current.x, bottom: offsetRef.current.y }}>
        <div className="twk-hd" onMouseDown={onDragStart}>
          <b>{title}</b>
          <button className="twk-x" aria-label="Close tweaks"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={dismiss}>✕</button>
        </div>
        <div className="twk-body">{children}</div>
      </div>
    </>
  );
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({ label, children }) {
  return (
    <>
      <div className="twk-sect">{label}</div>
      {children}
    </>
  );
}

function TweakRow({ label, value, children, inline = false }) {
  return (
    <div className={inline ? 'twk-row twk-row-h' : 'twk-row'}>
      <div className="twk-lbl">
        <span>{label}</span>
        {value != null && <span className="twk-val">{value}</span>}
      </div>
      {children}
    </div>
  );
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({ label, value, min = 0, max = 100, step = 1, unit = '', onChange }) {
  return (
    <TweakRow label={label} value={`${value}${unit}`}>
      <input type="range" className="twk-slider" min={min} max={max} step={step}
             value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </TweakRow>
  );
}

function TweakToggle({ label, value, onChange }) {
  return (
    <div className="twk-row twk-row-h">
      <div className="twk-lbl"><span>{label}</span></div>
      <button type="button" className="twk-toggle" data-on={value ? '1' : '0'}
              role="switch" aria-checked={!!value}
              onClick={() => onChange(!value)}><i /></button>
    </div>
  );
}

function TweakRadio({ label, value, options, onChange }) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  const opts = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
  const idx = Math.max(0, opts.findIndex((o) => o.value === value));
  const n = opts.length;

  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  const segAt = (clientX) => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor(((clientX - r.left - 2) / inner) * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };

  const onPointerDown = (e) => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = (ev) => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <TweakRow label={label}>
      <div ref={trackRef} role="radiogroup" onPointerDown={onPointerDown}
           className={dragging ? 'twk-seg dragging' : 'twk-seg'}>
        <div className="twk-seg-thumb"
             style={{ left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
                      width: `calc((100% - 4px) / ${n})` }} />
        {opts.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={o.value === value}>
            {o.label}
          </button>
        ))}
      </div>
    </TweakRow>
  );
}

function TweakSelect({ label, value, options, onChange }) {
  return (
    <TweakRow label={label}>
      <select className="twk-field" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => {
          const v = typeof o === 'object' ? o.value : o;
          const l = typeof o === 'object' ? o.label : o;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </TweakRow>
  );
}

function TweakText({ label, value, placeholder, onChange }) {
  return (
    <TweakRow label={label}>
      <input className="twk-field" type="text" value={value} placeholder={placeholder}
             onChange={(e) => onChange(e.target.value)} />
    </TweakRow>
  );
}

function TweakNumber({ label, value, min, max, step = 1, unit = '', onChange }) {
  const clamp = (n) => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({ x: 0, val: 0 });
  const onScrubStart = (e) => {
    e.preventDefault();
    startRef.current = { x: e.clientX, val: value };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = (ev) => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return (
    <div className="twk-num">
      <span className="twk-num-lbl" onPointerDown={onScrubStart}>{label}</span>
      <input type="number" value={value} min={min} max={max} step={step}
             onChange={(e) => onChange(clamp(Number(e.target.value)))} />
      {unit && <span className="twk-num-unit">{unit}</span>}
    </div>
  );
}

function TweakColor({ label, value, onChange }) {
  return (
    <div className="twk-row twk-row-h">
      <div className="twk-lbl"><span>{label}</span></div>
      <input type="color" className="twk-swatch" value={value}
             onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function TweakButton({ label, onClick, secondary = false }) {
  return (
    <button type="button" className={secondary ? 'twk-btn secondary' : 'twk-btn'}
            onClick={onClick}>{label}</button>
  );
}

Object.assign(window, {
  useTweaks, TweaksPanel, TweakSection, TweakRow,
  TweakSlider, TweakToggle, TweakRadio, TweakSelect,
  TweakText, TweakNumber, TweakColor, TweakButton,
});

// ===== timeline.jsx =====
// Timeline view — the killer view. Multi-lane chronological scatter with hover/click/drawer.

const { useState: useStateT, useRef: useRefT, useEffect: useEffectT, useMemo: useMemoT, useCallback: useCallbackT } = React;

function Timeline({ tweaks, onOpenRun, onCompare, onOpenIde }) {
  const [lang] = window.useLang ? window.useLang() : [window.__lang || 'zh'];
  const PAPERS = window.PAPERS;
  const FAMILIES = window.FACTOR_FAMILIES;

  const [filterFamily, setFilterFamily] = useStateT('all');
  const [filterVerdict, setFilterVerdict] = useStateT('all');
  const [filterUniverse, setFilterUniverse] = useStateT('all');
  const [yearRange, setYearRange] = useStateT([1985, 2026]);
  const [zoom, setZoom] = useStateT('year'); // year | quarter | month
  const [hover, setHover] = useStateT(null);
  const [hoverPos, setHoverPos] = useStateT({ x: 0, y: 0 });
  const [selected, setSelected] = useStateT(new Set());
  const [drawerId, setDrawerId] = useStateT(null);
  const [search, setSearch] = useStateT('');

  const scrollRef = useRefT(null);

  // Filtered set
  const filtered = useMemoT(() => {
    return PAPERS.filter(p => {
      if (filterFamily !== 'all' && p.family !== filterFamily) return false;
      if (filterVerdict !== 'all' && p.verdict !== filterVerdict) return false;
      if (filterUniverse !== 'all' && !p.universe.includes(filterUniverse)) return false;
      if (p.year < yearRange[0] || p.year > yearRange[1]) return false;
      if (search && !(p.title.toLowerCase().includes(search.toLowerCase()) || p.authors.toLowerCase().includes(search.toLowerCase()) || p.factor.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [filterFamily, filterVerdict, filterUniverse, yearRange, search]);

  // KPIs
  const kpis = useMemoT(() => {
    const ic_avg = filtered.reduce((s, p) => s + (p.score || 0), 0) / (filtered.length || 1);
    const sign_flips = filtered.filter(p => p.sign_flip).length;
    const reproduced = filtered.filter(p => p.verdict === 'green').length;
    const failed = filtered.filter(p => p.verdict === 'red').length;
    const fams = new Set(filtered.map(p => p.family)).size;
    return { count: filtered.length, fams, ic_avg, sign_flips, reproduced, failed };
  }, [filtered]);

  // Layout: x = year (with month for finer zoom), y = lane index
  const minYear = yearRange[0];
  const maxYear = yearRange[1];
  // Width per year scales with zoom
  const yearW = zoom === 'year' ? 70 : zoom === 'quarter' ? 140 : 280;
  const totalW = (maxYear - minYear) * yearW + 80;
  const laneH = tweaks.density === 'compact' ? 56 : tweaks.density === 'spacious' ? 96 : 72;
  const totalH = FAMILIES.length * laneH;

  function xFor(p) {
    const f = (p.year - minYear) + ((p.month || 6) - 1) / 12;
    return 40 + f * yearW;
  }
  function yFor(p) {
    const idx = FAMILIES.findIndex(x => x.id === p.family);
    return idx * laneH + laneH / 2;
  }
  function nodeR(p) {
    if (tweaks.nodeSize === 'none') return 6;
    if (tweaks.nodeSize === 'ic') return 4 + Math.min(8, Math.abs(p.ic_repro || 0) * 200);
    return 4 + (p.influence || 0) * 1.6;
  }

  // Years for axis
  const years = [];
  for (let y = minYear; y <= maxYear; y++) years.push(y);

  function handleNodeClick(e, p) {
    if (e.shiftKey) {
      const next = new Set(selected);
      if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
      setSelected(next);
    } else {
      setDrawerId(p.id);
    }
  }
  function handleNodeDouble(e, p) {
    e.preventDefault();
    onOpenRun(p.id);
  }

  // cmd+wheel to zoom
  useEffectT(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onWheel(e) {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        const order = ['year','quarter','month'];
        const i = order.indexOf(zoom);
        if (e.deltaY < 0 && i < 2) setZoom(order[i+1]);
        else if (e.deltaY > 0 && i > 0) setZoom(order[i-1]);
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom]);

  const drawerPaper = drawerId ? PAPERS.find(p => p.id === drawerId) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* KPI strip */}
      {tweaks.showKpi && (
        <div style={{
          display: 'flex', gap: 0, padding: '14px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-1)', alignItems: 'center', flexShrink: 0,
        }}>
          <Kpi label={window.t("timeline.kpi.papers")}         value={kpis.count} />
          <Kpi label={window.t("timeline.kpi.factor_families")} value={kpis.fams} />
          <Kpi label={window.t("timeline.kpi.avg_score")}      value={kpis.ic_avg.toFixed(2)} tone={kpis.ic_avg > 0.5 ? 'good' : kpis.ic_avg > 0.3 ? 'warn' : 'bad'} />
          <Kpi label={window.t("timeline.kpi.reproduced")}     value={kpis.reproduced} tone="good" />
          <Kpi label={window.t("timeline.kpi.failed")}         value={kpis.failed} tone="bad" />
          <Kpi label={window.t("timeline.kpi.sign_flips")}     value={kpis.sign_flips} tone="warn" />
          <div style={{flex:1}}/>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={window.t("timeline.search_placeholder")}
            style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '6px 10px', color: 'var(--text-1)',
              fontSize: 12, width: 240, fontFamily: 'var(--sans)',
            }}/>
        </div>
      )}

      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: 12, padding: '10px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-0)', alignItems: 'center', flexShrink: 0, fontSize: 11,
      }}>
        <FilterGroup label={window.t("timeline.filter.family")} value={filterFamily} onChange={setFilterFamily}
          options={[{v:'all',l:window.t("verdict.all")}, ...FAMILIES.map(f=>({v:f.id,l:f.label}))]} />
        <FilterGroup label={window.t("timeline.filter.verdict")} value={filterVerdict} onChange={setFilterVerdict}
          options={[{v:'all',l:window.t("verdict.all")},{v:'green',l:window.t("verdict.reproduced")},{v:'yellow',l:window.t("verdict.weak")},{v:'red',l:window.t("verdict.failed")}]} />
        <FilterGroup label={window.t("timeline.filter.universe")} value={filterUniverse} onChange={setFilterUniverse}
          options={[{v:'all',l:window.t("universe.all")},{v:'CSI',l:'A-share'},{v:'Russell',l:'US Russell'},{v:'S&P',l:'US S&P'}]} />
        <div style={{flex:1}}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-3)' }}>
          <span style={{fontFamily:'var(--mono)', letterSpacing:0.5}}>{window.t("timeline.filter.zoom")}</span>
          {['year','quarter','month'].map(z => (
            <button key={z} onClick={()=>setZoom(z)} style={{
              padding:'3px 8px', borderRadius:3, fontSize:10, fontFamily:'var(--mono)',
              border:'1px solid var(--border)',
              background: zoom===z ? 'var(--accent-dim)' : 'transparent',
              color: zoom===z ? 'var(--accent)' : 'var(--text-2)',
              cursor:'pointer', textTransform:'uppercase',
            }}>{z}</button>
          ))}
          <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-3)' }}>⌘+wheel</span>
        </div>
      </div>

      {/* Timeline scroll area */}
      <div ref={scrollRef} style={{
        flex: 1, overflow: 'auto', position: 'relative',
        background: 'var(--surface-0)', minHeight: 0,
      }}>
        {/* Lane labels — sticky left */}
        <div style={{
          position: 'sticky', left: 0, top: 0, zIndex: 3,
          width: 120, float: 'left', background: 'var(--surface-0)',
          borderRight: '1px solid var(--border)', height: totalH + 32,
        }}>
          <div style={{ height: 32, borderBottom: '1px solid var(--border)' }}/>
          {FAMILIES.map((f, i) => (
            <div key={f.id} style={{
              height: laneH, padding: '0 14px', display: 'flex',
              alignItems: 'center', borderBottom: '1px solid var(--border-soft)',
              fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: 0.5,
              color: 'var(--text-2)', textTransform: 'uppercase', justifyContent: 'space-between',
            }}>
              <span>{f.short}</span>
              <span style={{color:'var(--text-3)', fontSize:10}}>
                {filtered.filter(p=>p.family===f.id).length}
              </span>
            </div>
          ))}
        </div>

        {/* Plot area */}
        <div style={{ marginLeft: 120, position: 'relative', width: totalW, height: totalH + 32 }}>
          {/* Year axis */}
          <div style={{
            position: 'sticky', top: 0, zIndex: 2, height: 32,
            background: 'var(--surface-0)', borderBottom: '1px solid var(--border)',
          }}>
            {years.map(y => (
              <div key={y} style={{
                position: 'absolute', left: 40 + (y - minYear) * yearW, top: 0,
                height: 32, display: 'flex', alignItems: 'center',
                fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)',
                paddingLeft: 4, letterSpacing: 0.5,
              }}>
                {y % (zoom === 'year' ? 2 : 1) === 0 ? y : ''}
              </div>
            ))}
            {/* sub-ticks at quarter zoom */}
            {zoom !== 'year' && years.flatMap(y => [0,1,2,3].map(q => (
              <div key={`${y}-${q}`} style={{
                position: 'absolute', left: 40 + (y - minYear) * yearW + (q*yearW/4),
                top: 22, width: 1, height: 6, background: 'var(--border-soft)',
              }}/>
            )))}
          </div>

          {/* Grid */}
          <svg width={totalW} height={totalH} style={{position:'absolute', top:32, left:0, pointerEvents:'none'}}>
            {/* lane separators */}
            {FAMILIES.map((f, i) => (
              <line key={f.id} x1={0} y1={i*laneH} x2={totalW} y2={i*laneH} stroke="var(--border-soft)" strokeWidth={1}/>
            ))}
            {/* year gridlines */}
            {years.map(y => (
              <line key={y} x1={40+(y-minYear)*yearW} y1={0} x2={40+(y-minYear)*yearW} y2={totalH}
                stroke="var(--border-soft)" strokeWidth={y%5===0?1:0.5} strokeDasharray={y%5===0?'':'2 4'} opacity={y%5===0?0.8:0.4}/>
            ))}
          </svg>

          {/* Nodes */}
          <svg width={totalW} height={totalH} style={{position:'absolute', top:32, left:0}}>
            {/* connection lines for selected (compare) */}
            {selected.size >= 2 && (() => {
              const sel = [...selected].map(id => PAPERS.find(p=>p.id===id)).filter(Boolean);
              return sel.map((p, i) => i===0 ? null : (
                <line key={p.id} x1={xFor(sel[i-1])} y1={yFor(sel[i-1])} x2={xFor(p)} y2={yFor(p)}
                  stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.6}/>
              ));
            })()}
            {filtered.map(p => {
              const c = VERDICT_COLORS[p.verdict];
              const r = nodeR(p);
              const x = xFor(p), y = yFor(p);
              const isSel = selected.has(p.id);
              const isHover = hover === p.id;
              return (
                <g key={p.id} style={{cursor:'pointer'}}
                   onMouseEnter={(e) => { setHover(p.id); setHoverPos({x: e.clientX, y: e.clientY}); }}
                   onMouseMove={(e) => setHoverPos({x: e.clientX, y: e.clientY})}
                   onMouseLeave={() => setHover(null)}
                   onClick={(e) => handleNodeClick(e, p)}
                   onDoubleClick={(e) => handleNodeDouble(e, p)}>
                  {/* halo for selected/hover */}
                  {(isSel || isHover) && (
                    <circle cx={x} cy={y} r={r+5} fill="none" stroke={isSel ? 'var(--accent)' : c.fill} strokeWidth={1.5} opacity={0.6}/>
                  )}
                  <circle cx={x} cy={y} r={r} fill={c.fill} fillOpacity={0.85} stroke={c.fill} strokeWidth={1.5}/>
                  {p.sign_flip && (
                    <text x={x} y={y+3} textAnchor="middle" fontSize={9} fontFamily="var(--mono)" fill="#0b0e14" fontWeight="700">↯</text>
                  )}
                  {p.real && (
                    <circle cx={x+r-1} cy={y-r+1} r={3} fill="var(--accent)" stroke="var(--surface-0)" strokeWidth={1}/>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hover card */}
        {hover && (() => {
          const p = PAPERS.find(x => x.id === hover);
          if (!p) return null;
          return (
            <div style={{
              position: 'fixed', left: hoverPos.x + 16, top: hoverPos.y + 16,
              zIndex: 100, pointerEvents: 'none',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 6, padding: 12, width: 320,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
              <div style={{display:'flex', gap:8, alignItems:'flex-start', marginBottom:8}}>
                <FamilyChip family={p.family}/>
                <Mono size={10} color="var(--text-3)">{p.id}</Mono>
                <div style={{flex:1}}/>
                <VerdictBadge v={p.verdict} sign_flip={p.sign_flip}/>
              </div>
              <div style={{fontSize:13, fontWeight:500, lineHeight:1.3, marginBottom:4, color:'var(--text-1)'}}>
                {p.title}
              </div>
              <div style={{fontSize:11, color:'var(--text-3)', marginBottom:10}}>
                {p.authors} · {p.year}
              </div>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 10, padding: '6px 8px',
                background: 'var(--surface-1)', borderRadius: 3, color: 'var(--text-2)',
                marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{p.formula}</div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:8}}>
                <Stat label={window.t("hover.claim_ic")}  value={fmt.ic(p.ic_paper)} />
                <Stat label={window.t("hover.repro_ic")}  value={fmt.ic(p.ic_repro)} tone={p.sign_flip?'bad':'normal'}/>
                <Stat label={window.t("hover.score")}     value={fmt.score(p.score)} />
              </div>
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                <Spark data={p.spark} w={180} h={28} color="auto"/>
                <Stars n={p.influence}/>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Bottom: legend */}
      <div style={{
        flexShrink: 0, padding: '8px 24px', borderTop: '1px solid var(--border)',
        background: 'var(--surface-1)', display: 'flex', alignItems: 'center', gap: 20,
        fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-3)', letterSpacing: 0.5,
      }}>
        <span style={{ textTransform: 'uppercase' }}>{window.t("timeline.legend")}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><VerdictDot v="green"/> {window.t("timeline.legend.reproduced")}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><VerdictDot v="yellow"/> {window.t("timeline.legend.weak")}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><VerdictDot v="red"/> {window.t("timeline.legend.failed")}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>↯ sign-flip</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>● size = influence</span>
        <div style={{flex:1}}/>
        <span>{window.t("timeline.legend.hint")}</span>
      </div>

      {/* Floating compare button */}
      {selected.size >= 2 && (
        <div style={{
          position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--accent)', color: '#fff', padding: '10px 18px',
          borderRadius: 6, fontSize: 12, fontWeight: 500, letterSpacing: 0.3,
          boxShadow: '0 8px 28px rgba(25,118,210,0.5)', zIndex: 50,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
        }} onClick={() => onCompare([...selected])}>
          {window.t("timeline.compare_btn").replace("{n}", selected.size)}
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, opacity: 0.85 }}>⏵</span>
          <span onClick={(e)=>{e.stopPropagation(); setSelected(new Set());}} style={{
            opacity: 0.6, paddingLeft: 8, borderLeft: '1px solid rgba(255,255,255,0.3)',
          }}>×</span>
        </div>
      )}

      {/* Right drawer */}
      {drawerPaper && (
        <Drawer paper={drawerPaper} onClose={()=>setDrawerId(null)} onOpenRun={onOpenRun} onOpenIde={onOpenIde}/>
      )}
    </div>
  );
}

function Kpi({ label, value, tone }) {
  const c = tone === 'good' ? '#22c55e' : tone === 'bad' ? '#ef4444' : tone === 'warn' ? '#eab308' : 'var(--text-1)';
  return (
    <div style={{
      paddingRight: 28, marginRight: 28, borderRight: '1px solid var(--border-soft)',
      display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      <span style={{
        fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--text-3)',
        letterSpacing: 0.8, textTransform: 'uppercase',
      }}>{label}</span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 20, color: c, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function FilterGroup({ label, value, onChange, options }) {
  return (
    <div style={{display:'flex', alignItems:'center', gap:6}}>
      <span style={{fontFamily:'var(--mono)', letterSpacing:0.5, color:'var(--text-3)', fontSize:10}}>{label}</span>
      <div style={{display:'flex', border:'1px solid var(--border)', borderRadius:3, overflow:'hidden'}}>
        {options.map(o => (
          <button key={o.v} onClick={()=>onChange(o.v)} style={{
            padding:'3px 8px', fontSize:10, fontFamily:'var(--mono)',
            border:'none', borderRight: o.v !== options[options.length-1].v ? '1px solid var(--border)' : 'none',
            background: value===o.v ? 'var(--accent-dim)' : 'transparent',
            color: value===o.v ? 'var(--accent)' : 'var(--text-2)',
            cursor:'pointer', textTransform:'lowercase',
          }}>{o.l}</button>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const c = tone === 'bad' ? '#ef4444' : tone === 'good' ? '#22c55e' : 'var(--text-1)';
  return (
    <div>
      <div style={{fontSize:9, color:'var(--text-3)', fontFamily:'var(--mono)', letterSpacing:0.5, textTransform:'uppercase', marginBottom:2}}>{label}</div>
      <Mono size={12} color={c}>{value}</Mono>
    </div>
  );
}

function Drawer({ paper, onClose, onOpenRun, onOpenIde }) {
  const c = VERDICT_COLORS[paper.verdict];
  return (
    <>
      <div onClick={onClose} style={{
        position:'absolute', inset:0, background:'rgba(11,14,20,0.5)', zIndex:40,
        animation: 'fadeIn 0.15s ease',
      }}/>
      <div style={{
        position:'absolute', right:0, top:0, bottom:0, width:'40%', minWidth: 480,
        background:'var(--surface-1)', borderLeft:'1px solid var(--border)',
        zIndex:41, display:'flex', flexDirection:'column', overflow:'hidden',
        animation: 'slideIn 0.2s ease',
      }}>
        <div style={{padding:'18px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'flex-start', gap:12}}>
          <div style={{flex:1, minWidth:0}}>
            <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:8}}>
              <FamilyChip family={paper.family}/>
              <Mono size={10} color="var(--text-3)">run · {paper.id}</Mono>
              <VerdictBadge v={paper.verdict} sign_flip={paper.sign_flip}/>
            </div>
            <div style={{fontSize:15, fontWeight:500, lineHeight:1.3, color:'var(--text-1)', marginBottom:4}}>
              {paper.title}
            </div>
            <div style={{fontSize:12, color:'var(--text-3)'}}>{paper.authors} · {paper.year}</div>
          </div>
          <button onClick={onClose} style={{
            background:'transparent', border:'none', color:'var(--text-3)',
            fontSize:18, cursor:'pointer', padding:4,
          }}>×</button>
        </div>

        <div style={{flex:1, overflow:'auto', padding:24}}>
          <Section title={window.t("section.verdict")}>
            <div style={{
              padding:14, borderRadius:6, background:c.dim, border:`1px solid ${c.border}`,
              fontSize:13, color:'var(--text-1)', lineHeight:1.5,
            }}>
              {paper.sign_flip
                ? <><strong style={{color:c.fill}}>Sign mismatch.</strong> Paper claimed IC = <Mono>{fmt.ic(paper.ic_paper)}</Mono>, reproduced = <Mono color={c.fill}>{fmt.ic(paper.ic_repro)}</Mono>. Strategy may not work as claimed.</>
                : paper.verdict === 'green'
                ? <><strong style={{color:c.fill}}>Reproduced.</strong> Reproduced IC magnitude within {Math.abs(((paper.ic_repro/paper.ic_paper)-1)*100).toFixed(0)}% of claim, sign matches.</>
                : <><strong style={{color:c.fill}}>Weak reproduction.</strong> Sign matches but magnitude differs from claim by {Math.abs(((paper.ic_repro/paper.ic_paper)-1)*100).toFixed(0)}%.</>}
            </div>
          </Section>

          <Section title={window.t("section.factor")}>
            <div style={{
              fontFamily:'var(--mono)', fontSize:11, padding:'10px 12px',
              background:'var(--surface-2)', borderRadius:4, color:'var(--accent)',
              border:'1px solid var(--border)', marginBottom:8,
            }}>
              {paper.factor} = {paper.formula}
            </div>
            {paper.factor_zh && <div style={{fontSize:11, color:'var(--text-3)'}}>{paper.factor_zh}</div>}
          </Section>

          <Section title={window.t("section.paper_vs_repro")}>
            <table style={{width:'100%', fontSize:12, borderCollapse:'collapse'}}>
              <thead>
                <tr style={{color:'var(--text-3)', fontFamily:'var(--mono)', fontSize:10, letterSpacing:0.5, textTransform:'uppercase'}}>
                  <th style={{textAlign:'left', padding:'6px 0', borderBottom:'1px solid var(--border)'}}>{window.t("run.row.metric")}</th>
                  <th style={{textAlign:'right', padding:'6px 0', borderBottom:'1px solid var(--border)'}}>{window.t("run.row.paper_claim")}</th>
                  <th style={{textAlign:'right', padding:'6px 0', borderBottom:'1px solid var(--border)'}}>{window.t("run.row.reproduction")}</th>
                </tr>
              </thead>
              <tbody>
                <Row label={window.t("run.row.period")} a={paper.period_paper} b={paper.period_repro}/>
                <Row label={window.t("run.row.universe")} a="—" b={paper.universe}/>
                <Row label={window.t("run.row.ic_mean")} a={fmt.ic(paper.ic_paper)} b={<Mono color={c.fill}>{fmt.ic(paper.ic_repro)}</Mono>}/>
                <Row label={window.t("run.row.cumret")} a="—" b={fmt.pct(paper.cumret)}/>
                <Row label={window.t("run.row.max_dd")} a="—" b={fmt.pct(-paper.maxdd)}/>
                <Row label={window.t("run.row.sharpe")} a="—" b={fmt.sharpe(paper.sharpe)}/>
                <Row label={window.t("run.row.score")} a="—" b={<Mono color={c.fill}>{fmt.score(paper.score)}</Mono>}/>
              </tbody>
            </table>
          </Section>

          <Section title={`${window.t("section.redteam")} · ${paper.redteam.length} finding${paper.redteam.length===1?'':'s'}`}>
            {paper.redteam.length === 0 ? (
              <div style={{fontSize:12, color:'var(--text-3)', padding:'8px 0'}}>All 5 checks passed.</div>
            ) : paper.redteam.map((r, i) => (
              <div key={i} style={{
                padding:10, marginBottom:6, borderRadius:4,
                background: r.severity==='critical' ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)',
                border: `1px solid ${r.severity==='critical' ? 'rgba(239,68,68,0.3)' : 'rgba(234,179,8,0.3)'}`,
                fontSize:12,
              }}>
                <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:4}}>
                  <Mono size={10} color={r.severity==='critical'?'#ef4444':'#eab308'}>
                    {r.severity==='critical' ? '🔴' : '🟡'} {r.check}
                  </Mono>
                </div>
                <div style={{color:'var(--text-2)', lineHeight:1.4}}>{r.note}</div>
              </div>
            ))}
          </Section>

          <Section title={window.t("section.cumret")}>
            <Spark data={paper.spark} w={420} h={80} color="auto"/>
          </Section>
        </div>

        <div style={{padding:'12px 24px', borderTop:'1px solid var(--border)', display:'flex', gap:8}}>
          <button onClick={()=>onOpenRun(paper.id)} style={{
            flex:1, padding:'8px 14px', borderRadius:4, fontSize:12, fontWeight:500,
            background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer',
          }}>{window.t("drawer.open_full_run")}</button>
          <button onClick={()=>onOpenIde && onOpenIde(paper.id)} style={{
            padding:'8px 14px', borderRadius:4, fontSize:12, fontFamily:'var(--mono)',
            background:'transparent', color:'var(--accent)', border:'1px solid var(--accent)',
            cursor:'pointer', display:'flex', alignItems:'center', gap:6,
          }}>{window.t("drawer.open_in_ide")}</button>
          <button style={{
            padding:'8px 14px', borderRadius:4, fontSize:12, fontFamily:'var(--mono)',
            background:'transparent', color:'var(--text-2)', border:'1px solid var(--border)',
            cursor:'pointer',
          }}>★ {paper.influence}</button>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div style={{marginBottom:24}}>
      <div style={{
        fontFamily:'var(--mono)', fontSize:10, letterSpacing:0.8,
        color:'var(--text-3)', textTransform:'uppercase', marginBottom:10,
      }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, a, b }) {
  return (
    <tr>
      <td style={{padding:'6px 0', color:'var(--text-3)', fontSize:11, borderBottom:'1px solid var(--border-soft)'}}>{label}</td>
      <td style={{padding:'6px 0', textAlign:'right', fontFamily:'var(--mono)', fontSize:12, color:'var(--text-2)', borderBottom:'1px solid var(--border-soft)'}}>{a}</td>
      <td style={{padding:'6px 0', textAlign:'right', fontFamily:'var(--mono)', fontSize:12, color:'var(--text-1)', borderBottom:'1px solid var(--border-soft)'}}>{b}</td>
    </tr>
  );
}

window.Timeline = Timeline;

// ===== run-detail.jsx =====
// Run detail page — full PipelineReport view.

function RunDetail({ runId, onBack, onOpenRun, onOpenIde, onNav }) {
  const [lang] = window.useLang ? window.useLang() : [window.__lang || 'zh'];
  const PAPERS = window.PAPERS;
  const paper = PAPERS.find(p => p.id === runId) || PAPERS[0];
  const c = VERDICT_COLORS[paper.verdict];

  // Adjacent navigation: papers sorted chronologically
  const sorted = [...PAPERS].sort((a, b) => (a.year + a.month/12) - (b.year + b.month/12));
  const idx = sorted.findIndex(p => p.id === paper.id);
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;

  const [tab, setTab] = React.useState('verdict');
  const [chatOpen, setChatOpen] = React.useState(false);

  const stages = [
    { id: 'extract', label: 'Extract',  status: 'done', detail: 'paper2alpha · LLM ✓' },
    { id: 'codegen', label: 'Codegen',  status: 'done', detail: 'DSL ✓ qtype clean' },
    { id: 'lint',    label: 'Lint',     status: 'done', detail: 'no look-ahead' },
    { id: 'backtest',label: 'Backtest', status: 'done', detail: `IC ${fmt.ic(paper.ic_repro)}` },
    { id: 'redteam', label: 'Red Team', status: 'done', detail: `${paper.redteam.length} finding${paper.redteam.length===1?'':'s'}` },
    { id: 'score',   label: 'Score',    status: 'done', detail: `${fmt.score(paper.score)}` },
  ];

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', overflow:'auto', minHeight:0}}>
      {/* Header */}
      <div style={{
        padding:'18px 32px', borderBottom:'1px solid var(--border)',
        background:'var(--surface-1)', display:'flex', alignItems:'flex-start', gap:16,
      }}>
        <button onClick={onBack} style={{
          background:'transparent', border:'1px solid var(--border)', borderRadius:4,
          padding:'6px 10px', fontSize:11, fontFamily:'var(--mono)', color:'var(--text-2)',
          cursor:'pointer',
        }}>{window.t("run.back")}</button>

        <div style={{flex:1, minWidth:0}}>
          <div style={{display:'flex', gap:10, alignItems:'center', marginBottom:8}}>
            <FamilyChip family={paper.family}/>
            <Mono size={10} color="var(--text-3)">run · {paper.id}</Mono>
            <VerdictBadge v={paper.verdict} sign_flip={paper.sign_flip}/>
            {paper.real && <Mono size={10} color="var(--accent)">live demo</Mono>}
          </div>
          <h1 style={{fontSize:20, fontWeight:500, lineHeight:1.25, color:'var(--text-1)', margin:0, marginBottom:4}}>
            {paper.title}
          </h1>
          <div style={{fontSize:12, color:'var(--text-3)'}}>
            {paper.authors} · {paper.year} · {paper.universe}
          </div>
        </div>

        <div style={{display:'flex', alignItems:'center', gap:6}}>
          <button disabled={!prev} onClick={() => prev && onOpenRun(prev.id)} title={prev?prev.title:''} style={navBtn(!prev)}>{window.t("run.prev")}</button>
          <button disabled={!next} onClick={() => next && onOpenRun(next.id)} title={next?next.title:''} style={navBtn(!next)}>{window.t("run.next")}</button>
          <button onClick={()=>setChatOpen(o=>!o)} style={{
            background: chatOpen ? 'var(--accent)' : 'transparent',
            color: chatOpen ? '#fff' : 'var(--text-2)',
            border:'1px solid var(--border)', borderRadius:4,
            padding:'6px 10px', fontFamily:'var(--mono)', fontSize:11, cursor:'pointer',
            marginLeft:6,
          }} title="Toggle agent chat">Agent</button>
        </div>
      </div>

      {/* Right-side agent chat dock — only when window.AgentChat is loaded */}
      {chatOpen && window.AgentChat && (
        <div style={{
          position:'fixed', top:0, right:0, bottom:0, width:400, zIndex:50,
          background:'var(--surface-1)', borderLeft:'1px solid var(--border)',
          boxShadow:'-4px 0 16px rgba(0,0,0,0.25)', padding:10,
          display:'flex', flexDirection:'column',
        }}>
          <window.AgentChat runId={runId} fullPanel={true}
                            onClose={() => setChatOpen(false)}/>
        </div>
      )}

      {/* Big verdict callout + score gauge */}
      <div style={{
        padding:'24px 32px', borderBottom:'1px solid var(--border)',
        display:'grid', gridTemplateColumns:'1fr 320px', gap:32, alignItems:'center',
      }}>
        <div>
          <div style={{
            fontFamily:'var(--mono)', fontSize:10, letterSpacing:0.8, color:'var(--text-3)',
            textTransform:'uppercase', marginBottom:10,
          }}>{window.t("run.headline_label")}</div>
          <div style={{fontSize:24, lineHeight:1.35, color:'var(--text-1)', textWrap:'pretty'}}>
            {paper.sign_flip
              ? <>Paper's claimed effect <span style={{color:c.fill, fontWeight:600}}>does not reproduce</span> on later periods. Reproduced IC <Mono size={22} color={c.fill}>{fmt.ic(paper.ic_repro)}</Mono> sign-flipped from claim <Mono size={22} color="var(--text-2)">{fmt.ic(paper.ic_paper)}</Mono>.</>
              : paper.verdict === 'green'
              ? <>Paper's claim <span style={{color:c.fill, fontWeight:600}}>reproduces</span>. Reproduced IC <Mono size={22} color={c.fill}>{fmt.ic(paper.ic_repro)}</Mono> within tolerance of claim <Mono size={22} color="var(--text-2)">{fmt.ic(paper.ic_paper)}</Mono>.</>
              : <>Reproduction is <span style={{color:c.fill, fontWeight:600}}>weak</span>. Sign matches but magnitude <Mono size={22} color={c.fill}>{fmt.ic(paper.ic_repro)}</Mono> is much smaller than claim <Mono size={22} color="var(--text-2)">{fmt.ic(paper.ic_paper)}</Mono>.</>}
          </div>
        </div>

        <ScoreGauge score={paper.score} verdict={paper.verdict}/>
      </div>

      {/* IDE quick-open ribbon */}
      <div style={{
        padding:'10px 32px', background:'var(--surface-0)', borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', gap:14,
      }}>
        <Mono size={10} color="var(--text-3)">{window.t("run.repro_engineering")}</Mono>
        <button onClick={()=>onOpenIde && onOpenIde(paper.id)} style={{
          padding:'5px 12px', borderRadius:4, fontSize:11, fontFamily:'var(--mono)',
          background:'var(--surface-2)', color:'var(--accent)',
          border:'1px solid var(--accent)', cursor:'pointer',
          display:'flex', alignItems:'center', gap:6,
        }}>{window.t("run.open_in_ide")}</button>
        <Mono size={10} color="var(--text-3)">{window.t("run.ide_hint")}</Mono>
      </div>

      {/* Tabs */}
      <div style={{
        display:'flex', gap:0, padding:'0 32px',
        borderBottom:'1px solid var(--border)', background:'var(--surface-0)',
      }}>
        {[
          ['verdict', window.t("run.tab.verdict")],
          ['evidence', window.t("run.tab.evidence")],
          ['redteam', `${window.t("run.tab.redteam")} · ${paper.redteam.length}`],
          ['code', window.t("run.tab.code")],
          ['analysis', window.t("run.tab.analysis", (window.__lang === 'en' ? 'Analysis' : '因子分析'))],
          ['report', window.t("run.tab.report")],
        ].map(([k, l]) => (
          <button key={k} onClick={() => {
            if (k === 'analysis') {
              if (onNav) onNav('analysis', { id: runId });
              else if (window.__openRun) { /* fallback: no-op */ }
            } else {
              setTab(k);
            }
          }} style={{
            padding:'12px 16px', background:'transparent', border:'none',
            borderBottom: tab===k ? '2px solid var(--accent)' : '2px solid transparent',
            fontSize:12, color: tab===k ? 'var(--text-1)' : 'var(--text-3)',
            cursor:'pointer', fontWeight: tab===k ? 500 : 400,
          }}>{l}{k === 'analysis' ? ' →' : ''}</button>
        ))}
      </div>

      <div style={{padding:'24px 32px'}}>
        {tab === 'verdict' && <VerdictTab paper={paper}/>}
        {tab === 'evidence' && <EvidenceTab paper={paper}/>}
        {tab === 'redteam' && <RedTeamTab paper={paper}/>}
        {tab === 'code' && <CodeTab paper={paper}/>}
        {tab === 'report' && <ReportTab paper={paper}/>}
      </div>

      {/* Pipeline progress strip at bottom */}
      <div style={{
        marginTop:'auto', padding:'16px 32px', borderTop:'1px solid var(--border)',
        background:'var(--surface-1)',
      }}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
          <span style={{fontFamily:'var(--mono)', fontSize:10, letterSpacing:0.8, textTransform:'uppercase', color:'var(--text-3)'}}>
            Pipeline · {paper.id}
          </span>
          <span style={{fontFamily:'var(--mono)', fontSize:10, color:'#22c55e'}}>{window.t("run.complete")}</span>
        </div>
        <div style={{display:'grid', gridTemplateColumns:`repeat(${stages.length}, 1fr)`, gap:8}}>
          {stages.map((s, i) => (
            <div key={s.id} style={{
              padding:10, borderRadius:4, border:'1px solid var(--border)',
              background:'var(--surface-2)', position:'relative',
            }}>
              <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:4}}>
                <span style={{
                  display:'inline-block', width:14, height:14, borderRadius:'50%',
                  background:'#22c55e', color:'#0b0e14', fontSize:9, fontWeight:700,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>✓</span>
                <Mono size={11} color="var(--text-1)">{i+1}. {s.label}</Mono>
              </div>
              <Mono size={10} color="var(--text-3)">{s.detail}</Mono>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function navBtn(disabled) {
  return {
    background:'transparent', border:'1px solid var(--border)', borderRadius:4,
    padding:'6px 10px', fontSize:11, fontFamily:'var(--mono)',
    color: disabled ? 'var(--text-3)' : 'var(--text-2)',
    opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function ScoreGauge({ score, verdict }) {
  const c = VERDICT_COLORS[verdict];
  const r = 56, cx = 80, cy = 80;
  const circ = 2 * Math.PI * r;
  const filled = circ * Math.max(0.02, score);
  return (
    <div style={{display:'flex', alignItems:'center', gap:20, justifyContent:'flex-end'}}>
      <div>
        <div style={{fontFamily:'var(--mono)', fontSize:10, letterSpacing:0.8, color:'var(--text-3)', textTransform:'uppercase', marginBottom:4}}>
          {window.t("run.score_label")}
        </div>
        <div style={{fontFamily:'var(--mono)', fontSize:36, color:c.fill, fontWeight:500, letterSpacing:-0.5, lineHeight:1}}>
          {score.toFixed(2)}
        </div>
        <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--text-3)', marginTop:4}}>
          {window.t("run.score_max")}
        </div>
      </div>
      <svg width={160} height={160} viewBox="0 0 160 160">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={10}/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={c.fill} strokeWidth={10}
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}/>
        {/* tick marks */}
        {[0,0.25,0.5,0.75,1].map(t => {
          const a = -Math.PI/2 + t * 2 * Math.PI;
          return (
            <line key={t} x1={cx + Math.cos(a)*(r-12)} y1={cy + Math.sin(a)*(r-12)}
              x2={cx + Math.cos(a)*(r-6)} y2={cy + Math.sin(a)*(r-6)}
              stroke="var(--text-3)" strokeWidth={1}/>
          );
        })}
      </svg>
    </div>
  );
}

function VerdictTab({ paper }) {
  const c = VERDICT_COLORS[paper.verdict];
  return (
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:24}}>
      <div>
        <Section title={window.t("run.verdict.paper_vs_repro")}>
          <table style={{width:'100%', fontSize:12, borderCollapse:'collapse'}}>
            <thead>
              <tr style={{color:'var(--text-3)', fontFamily:'var(--mono)', fontSize:10, letterSpacing:0.5, textTransform:'uppercase'}}>
                <th style={{textAlign:'left', padding:'8px 0', borderBottom:'1px solid var(--border)'}}>{window.t("run.row.metric")}</th>
                <th style={{textAlign:'right', padding:'8px 0', borderBottom:'1px solid var(--border)'}}>{window.t("run.row.paper_claim")}</th>
                <th style={{textAlign:'right', padding:'8px 0', borderBottom:'1px solid var(--border)'}}>{window.t("run.row.reproduction")}</th>
                <th style={{textAlign:'right', padding:'8px 0', borderBottom:'1px solid var(--border)'}}>{window.t("run.row.delta")}</th>
              </tr>
            </thead>
            <tbody>
              <DRow label={window.t("run.row.period")}     a={paper.period_paper} b={paper.period_repro} d="—"/>
              <DRow label={window.t("run.row.universe")}   a="paper original"     b={paper.universe} d="—"/>
              <DRow label={window.t("run.row.ic_mean")}    a={fmt.ic(paper.ic_paper)} b={<Mono color={c.fill}>{fmt.ic(paper.ic_repro)}</Mono>} d={fmt.ic(paper.ic_repro - paper.ic_paper)}/>
              <DRow label={window.t("run.row.sign_match")} a="—" b={<Mono color={paper.sign_flip ? '#ef4444' : '#22c55e'}>{paper.sign_flip ? window.t("run.sign_flipped") : window.t("run.sign_matches")}</Mono>} d="—"/>
              <DRow label={window.t("run.row.cumret")}     a="—" b={fmt.pct(paper.cumret)} d="—"/>
              <DRow label={window.t("run.row.max_dd")}     a="—" b={fmt.pct(-paper.maxdd)} d="—"/>
              <DRow label={window.t("run.row.sharpe")}     a="—" b={fmt.sharpe(paper.sharpe)} d="—"/>
              <DRow label={window.t("run.row.score")}      a="—" b={<Mono color={c.fill}>{fmt.score(paper.score)}</Mono>} d="—"/>
            </tbody>
          </table>
        </Section>
      </div>
      <div>
        <Section title={window.t("run.verdict.cumret")}>
          <div style={{
            padding:16, background:'var(--surface-1)', borderRadius:6,
            border:'1px solid var(--border)',
          }}>
            <Spark data={paper.spark} w={420} h={140} color="auto"/>
            <div style={{display:'flex', justifyContent:'space-between', marginTop:8, fontFamily:'var(--mono)', fontSize:10, color:'var(--text-3)'}}>
              <span>{paper.period_repro.split('→')[0].trim()}</span>
              <span>{paper.period_repro.split('→')[1]?.trim() || ''}</span>
            </div>
          </div>
        </Section>

        <Section title={window.t("run.verdict.influence")}>
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <Stars n={paper.influence} size={14}/>
            <Mono size={12} color="var(--text-2)">{paper.influence}/5 — {window.t("run.verdict.your_rating")}</Mono>
          </div>
        </Section>
      </div>
    </div>
  );
}

function DRow({ label, a, b, d }) {
  return (
    <tr>
      <td style={{padding:'8px 0', color:'var(--text-2)', fontSize:12, borderBottom:'1px solid var(--border-soft)'}}>{label}</td>
      <td style={{padding:'8px 0', textAlign:'right', fontFamily:'var(--mono)', fontSize:12, color:'var(--text-2)', borderBottom:'1px solid var(--border-soft)'}}>{a}</td>
      <td style={{padding:'8px 0', textAlign:'right', fontFamily:'var(--mono)', fontSize:12, color:'var(--text-1)', borderBottom:'1px solid var(--border-soft)'}}>{b}</td>
      <td style={{padding:'8px 0', textAlign:'right', fontFamily:'var(--mono)', fontSize:11, color:'var(--text-3)', borderBottom:'1px solid var(--border-soft)'}}>{d}</td>
    </tr>
  );
}

function EvidenceTab({ paper }) {
  const charts = paper.real
    ? [
        { name: 'cumret', label: window.t("run.evidence.cumret"), src: 'assets/cumret.png' },
        { name: 'ic_series', label: window.t("run.evidence.ic_series"), src: 'assets/ic_series.png' },
        { name: 'drawdown', label: window.t("run.evidence.drawdown"), src: 'assets/drawdown.png' },
      ]
    : [
        { name: 'cumret', label: window.t("run.evidence.cumret"), spark: paper.spark },
        { name: 'ic_series', label: window.t("run.evidence.ic_series"), spark: paper.spark.map(v => v*0.05 + (Math.random()-0.5)*0.1) },
        { name: 'drawdown', label: window.t("run.evidence.drawdown"), spark: paper.spark.map((v,i,a) => Math.min(0, v - Math.max(...a.slice(0,i+1)))) },
      ];

  return (
    <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16}}>
      {charts.map(ch => (
        <div key={ch.name} style={{
          background:'var(--surface-1)', border:'1px solid var(--border)',
          borderRadius:6, overflow:'hidden',
        }}>
          <div style={{padding:'10px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <Mono size={11} color="var(--text-1)">{ch.label}</Mono>
            <Mono size={9} color="var(--text-3)">/runs/{paper.id}/chart/{ch.name}</Mono>
          </div>
          <div style={{padding:12, background:'#0e1218'}}>
            {ch.src
              ? <img src={ch.src} alt={ch.label} style={{width:'100%', display:'block', borderRadius:3}}/>
              : <Spark data={ch.spark} w={280} h={140} color="auto"/>}
          </div>
        </div>
      ))}
    </div>
  );
}

function RedTeamTab({ paper }) {
  const all = [
    { check: 'overfitting_hint', label: 'Overfitting hint' },
    { check: 'small_cap_exposure', label: 'Small-cap exposure' },
    { check: 'data_leakage', label: 'Data leakage' },
    { check: 'sample_concentration', label: 'Sample concentration' },
    { check: 'factor_redundancy', label: 'Factor redundancy' },
  ];
  return (
    <div style={{display:'flex', flexDirection:'column', gap:8, maxWidth:760}}>
      {all.map(check => {
        const finding = paper.redteam.find(r => r.check === check.check);
        const fired = !!finding;
        const sev = finding?.severity;
        const color = sev==='critical' ? '#ef4444' : sev==='warning' ? '#eab308' : '#22c55e';
        return (
          <div key={check.check} style={{
            padding:'12px 16px', borderRadius:4,
            background: fired ? (sev==='critical' ? 'rgba(239,68,68,0.08)' : 'rgba(234,179,8,0.08)') : 'var(--surface-1)',
            border: `1px solid ${fired ? color+'66' : 'var(--border)'}`,
            display:'flex', alignItems:'center', gap:14,
          }}>
            <span style={{
              width:20, height:20, borderRadius:'50%',
              background: fired ? color : 'transparent',
              border: `1px solid ${color}`, display:'flex',
              alignItems:'center', justifyContent:'center',
              fontSize:11, color: fired ? '#0b0e14' : color, fontWeight:700,
            }}>{fired ? '!' : '✓'}</span>
            <div style={{flex:1, minWidth:0}}>
              <div style={{display:'flex', alignItems:'center', gap:8, marginBottom: fired ? 4 : 0}}>
                <Mono size={12} color="var(--text-1)">{check.label}</Mono>
                <Mono size={9} color="var(--text-3)">{check.check}</Mono>
                {fired && <Mono size={9} color={color}>{sev?.toUpperCase()}</Mono>}
              </div>
              {fired && <div style={{fontSize:12, color:'var(--text-2)'}}>{finding.note}</div>}
            </div>
            {!fired && <Mono size={10} color="var(--text-3)">{window.t("run.redteam.passed")}</Mono>}
          </div>
        );
      })}
    </div>
  );
}

function CodeTab({ paper }) {
  const code = `"""Factor: ${paper.factor} — generated by replicalpha (dsl)."""
from __future__ import annotations
from datetime import date, timedelta
import pandas as pd

FACTOR_NAME = "${paper.factor}"
LOOKBACK = ${paper.factor.includes('120') || paper.formula.includes('120') ? 120 : 60}

def compute(adapter, as_of: date, universe: str = "") -> dict[str, float]:
    """Cross-sectional factor values at \`as_of\`."""
    start = as_of - timedelta(days=LOOKBACK * 3)
    end = as_of

    def _series(field: str) -> pd.DataFrame:
        raw = adapter.get_price(field, start, end, universe)
        return pd.DataFrame({t: pd.Series(v) for t, v in raw.items()})

    # ${paper.formula}
    df = ${paper.formula.replace('pct_change', '_pct_change').replace('rolling_mean', '_rolling_mean').replace('zscore', '_zscore').replace('rank', '_rank')}
    last = df.dropna(how="all").iloc[-1]
    return {t: float(v) for t, v in last.items() if pd.notna(v)}
`;
  return (
    <pre style={{
      background:'var(--surface-1)', border:'1px solid var(--border)',
      borderRadius:6, padding:18, overflow:'auto', fontSize:12,
      fontFamily:'var(--mono)', color:'var(--text-1)', lineHeight:1.6,
      maxWidth:860,
    }}>{code}</pre>
  );
}

function ReportTab({ paper }) {
  const md = `# Reproduction Report

## Paper

- **Source**: ${paper.title}
- **Factors claimed**: \`${paper.factor}\` ${paper.factor_zh ? `(${paper.factor_zh})` : ''}
- **Formula**: \`${paper.formula}\`

## Backtest

- Period: \`${paper.period_repro}\`
- Universe: ${paper.universe}
- IC mean: **${fmt.ic(paper.ic_repro)}** (std ${paper.ic_std.toFixed(4)})
- Cumulative return: **${fmt.pct(paper.cumret)}**
- Max drawdown: **${fmt.pct(-paper.maxdd)}**
- Annualized Sharpe: **${fmt.sharpe(paper.sharpe)}**

## Reproducibility

- Paper's claimed IC: **${fmt.ic(paper.ic_paper)}**
- Reproduced IC: **${fmt.ic(paper.ic_repro)}**
- Sign match: ${paper.sign_flip ? '0' : '1'}
- **Final score**: ${fmt.score(paper.score)}

${paper.sign_flip ? `> sign mismatch: paper claimed IC = ${fmt.ic(paper.ic_paper)}, reproduced = ${fmt.ic(paper.ic_repro)}. this is a red flag — strategy may not work as claimed` : ''}

---

*Run \`${paper.id}\`; stages complete: extract, codegen, backtest, validate, score, report.*
`;
  return (
    <pre style={{
      background:'var(--surface-1)', border:'1px solid var(--border)',
      borderRadius:6, padding:18, overflow:'auto', fontSize:12.5,
      fontFamily:'var(--sans)', color:'var(--text-1)', lineHeight:1.7,
      maxWidth:760, whiteSpace:'pre-wrap',
    }}>{md}</pre>
  );
}

window.RunDetail = RunDetail;

// ===== ide.jsx =====
// IDE — VS Code-like reproduction engineering page.
// Shows the LLM-generated code, a file tree, terminal, and a "regenerate" Claude action.

function IDE({ paperId, onClose, onOpenRun }) {
  const [lang] = window.useLang ? window.useLang() : [window.__lang || 'zh'];
  const PAPERS = window.PAPERS;
  const paper = PAPERS.find(p => p.id === paperId) || PAPERS[0];

  const initialFiles = React.useMemo(() => buildRepro(paper), [paper.id]);
  const [files, setFiles] = React.useState(initialFiles);
  const [activePath, setActivePath] = React.useState('factor.py');
  const [openTabs, setOpenTabs] = React.useState(['factor.py', 'backtest.py']);
  const [bottomTab, setBottomTab] = React.useState('terminal'); // terminal | problems | output | llm
  const [terminalLines, setTerminalLines] = React.useState(seedTerminal(paper));
  const [llmLog, setLlmLog] = React.useState(seedLLMLog(paper));
  const [regenOpen, setRegenOpen] = React.useState(false);
  const [running, setRunning] = React.useState(false);

  function openFile(p) {
    setActivePath(p);
    setOpenTabs(t => t.includes(p) ? t : [...t, p]);
  }
  function closeTab(p, e) {
    e.stopPropagation();
    const idx = openTabs.indexOf(p);
    const next = openTabs.filter(x => x !== p);
    setOpenTabs(next);
    if (activePath === p) setActivePath(next[Math.max(0, idx-1)] || next[0] || 'factor.py');
  }

  function pushTerm(line) {
    setTerminalLines(l => [...l, line]);
  }
  function pushLlm(line) {
    setLlmLog(l => [...l, line]);
  }

  async function runBacktest() {
    if (running) return;
    setRunning(true); setBottomTab('terminal');
    pushTerm({ kind:'cmd', text:'$ python -m replicalpha.backtest factor.py --universe '+paper.universe });
    await wait(450); pushTerm({ kind:'log', text:'[load] '+paper.universe+' constituents · 2018-01-01 → 2025-04-30' });
    await wait(380); pushTerm({ kind:'log', text:'[features] computing factor over 1934 trading days × N assets' });
    await wait(620); pushTerm({ kind:'log', text:'[lint] qtype check · ✓ no look-ahead · ✓ no NaN cascade' });
    await wait(500); pushTerm({ kind:'log', text:'[backtest] 5 quintiles · long-short · daily rebalance' });
    await wait(650); pushTerm({ kind:'log', text:`[ic] mean=${fmt.ic(paper.ic_repro)}  std=${paper.ic_std.toFixed(3)}  IR=${(paper.ic_repro/paper.ic_std).toFixed(2)}` });
    await wait(380); pushTerm({ kind:'log', text:`[perf] cumret=${fmt.pct(paper.cumret)}  sharpe=${fmt.sharpe(paper.sharpe)}  maxdd=${paper.maxdd.toFixed(2)}%` });
    await wait(380);
    if (paper.sign_flip) pushTerm({ kind:'warn', text:`[red-team] sign-flip detected: paper IC=${fmt.ic(paper.ic_paper)}  repro IC=${fmt.ic(paper.ic_repro)}` });
    pushTerm({ kind:'ok', text:`✓ Done in 4.7s · score=${fmt.score(paper.score)} · verdict=${paper.verdict.toUpperCase()}` });
    setRunning(false);
  }

  async function regenerate(promptText) {
    setRegenOpen(false);
    setBottomTab('llm');
    pushLlm({ role:'user', text: promptText });
    pushLlm({ role:'system', text:'reading paper.md, factor.py, backtest.py · 4.2k tokens' });
    await wait(400);
    pushLlm({ role:'system', text:'paper2alpha: extract factor → claude-haiku-4.5 → patch' });
    await wait(700);
    let patch = '# nothing to do';
    try {
      const text = await Promise.race([
        window.claude.complete(`You are paper2alpha. Given a quant factor: ${paper.factor} = ${paper.formula}, and the user request: "${promptText}", return a SHORT (max 8 lines) Python diff comment block describing what you'd change. Plain text, no markdown fences.`),
        new Promise((_, rej) => setTimeout(() => rej(0), 6000)),
      ]);
      patch = text.trim();
    } catch (_) {
      patch = cannedPatch(promptText, paper);
    }
    pushLlm({ role:'assistant', text: patch });

    // Also patch factor.py with a comment so it's visible
    const path = 'factor.py';
    setFiles(f => ({...f, [path]: f[path] + '\n\n# --- claude patch '+ new Date().toLocaleTimeString() +' ---\n' + patch.split('\n').map(l=>'# '+l).join('\n')}));
    setActivePath(path);
    if (!openTabs.includes(path)) setOpenTabs(t => [...t, path]);
    pushLlm({ role:'system', text:'factor.py · +'+(patch.split('\n').length)+' lines  ·  re-run backtest to verify' });
  }

  const treeFiles = Object.keys(files);

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:300, background:'#0a0d12',
      display:'flex', flexDirection:'column', color:'#cdd6e0',
      fontFamily:'var(--sans)',
    }}>
      {/* Title bar */}
      <div style={{
        height:32, background:'#10141a', borderBottom:'1px solid #1c222b',
        display:'flex', alignItems:'center', padding:'0 12px', gap:14, fontSize:12,
        flexShrink:0,
      }}>
        <div style={{display:'flex', gap:6}}>
          <span style={{width:11, height:11, borderRadius:'50%', background:'#ef4444'}} onClick={onClose} className="clickable"/>
          <span style={{width:11, height:11, borderRadius:'50%', background:'#eab308'}}/>
          <span style={{width:11, height:11, borderRadius:'50%', background:'#22c55e'}}/>
        </div>
        <Mono size={11} color="#5a6573">replicalpha · workspaces /{paper.id}</Mono>
        <div style={{flex:1, textAlign:'center', color:'#7d8896', fontSize:11}}>
          <Mono size={11} color="#7d8896">{paper.title.slice(0, 80)}{paper.title.length>80?'…':''}</Mono>
        </div>
        <button onClick={()=>onOpenRun(paper.id)} style={ideHeaderBtn()}>{window.t("ide.view_run")}</button>
        <button onClick={onClose} style={ideHeaderBtn()}>{window.t("ide.close")}</button>
      </div>

      {/* Activity bar + sidebar + main */}
      <div style={{flex:1, display:'flex', minHeight:0}}>
        {/* Activity bar */}
        <div style={{
          width:46, background:'#10141a', borderRight:'1px solid #1c222b',
          display:'flex', flexDirection:'column', alignItems:'center', padding:'8px 0', gap:14,
          flexShrink:0,
        }}>
          {[
            {i:'⊟', t:'Files', active:true},
            {i:'⌕', t:'Search'},
            {i:'⎇', t:'Source control'},
            {i:'⚐', t:'Run'},
            {i:'✦', t:'Claude'},
          ].map(b => (
            <div key={b.t} title={b.t} style={{
              width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:18, color: b.active?'#cdd6e0':'#5a6573', cursor:'pointer',
              borderLeft: b.active?'2px solid var(--accent)':'2px solid transparent',
            }}>{b.i}</div>
          ))}
        </div>

        {/* File tree sidebar */}
        <div style={{
          width:240, background:'#0d1117', borderRight:'1px solid #1c222b',
          fontSize:12, overflow:'auto', flexShrink:0,
        }}>
          <div style={{padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <Mono size={10} color="#5a6573">EXPLORER · {paper.id}</Mono>
            <Mono size={11} color="#5a6573">⋯</Mono>
          </div>
          <div style={{padding:'0 4px'}}>
            <FolderRow open label={"workspaces / "+paper.id}/>
            {treeFiles.map(p => (
              <FileRow key={p} path={p} active={p===activePath} onClick={()=>openFile(p)}/>
            ))}
            <FolderRow label="data" depth={1}/>
            <FileRow path="prices_2018_2025.parquet" depth={2} icon="◫" muted/>
            <FileRow path="constituents.csv" depth={2} icon="◫" muted/>
            <FolderRow label="paper" depth={1} open/>
            <FileRow path="paper.pdf" depth={2} icon="❒" muted/>
            <FileRow path="abstract.md" depth={2} icon="≡" muted/>
            <FolderRow label=".replicalpha" depth={1}/>
            <FileRow path="run.log" depth={2} icon="▤" muted/>
            <FileRow path="report.html" depth={2} icon="▤" muted/>
          </div>
        </div>

        {/* Main editor + bottom panel */}
        <div style={{flex:1, display:'flex', flexDirection:'column', minWidth:0}}>
          {/* Tabs */}
          <div style={{
            height:34, background:'#10141a', borderBottom:'1px solid #1c222b',
            display:'flex', alignItems:'stretch', flexShrink:0,
          }}>
            {openTabs.map(t => (
              <div key={t} onClick={()=>setActivePath(t)} style={{
                padding:'0 14px', display:'flex', alignItems:'center', gap:8, cursor:'pointer',
                background: t===activePath?'#0d1117':'transparent',
                borderRight:'1px solid #1c222b',
                borderTop: t===activePath?'1.5px solid var(--accent)':'1.5px solid transparent',
                fontSize:12, color: t===activePath?'#cdd6e0':'#7d8896',
              }}>
                <span style={{color: fileColor(t)}}>{fileIcon(t)}</span>
                <span style={{fontFamily:'var(--mono)', fontSize:11.5}}>{t}</span>
                <span onClick={(e)=>closeTab(t, e)} style={{opacity:0.5, marginLeft:4, fontSize:13}}>×</span>
              </div>
            ))}
            <div style={{flex:1}}/>
            <button onClick={()=>setRegenOpen(true)} style={{
              ...ideHeaderBtn(),
              background:'linear-gradient(135deg, var(--accent), #7e57c2)',
              color:'#fff', border:'none', margin:'5px 6px',
            }}>{window.t("ide.regenerate")}</button>
            <button onClick={runBacktest} disabled={running} style={{
              ...ideHeaderBtn(),
              background:'#22c55e', color:'#0a0d12', border:'none', margin:'5px 6px',
              opacity: running?0.5:1,
            }}>{running ? window.t("ide.running") : window.t("ide.run_backtest")}</button>
          </div>

          {/* Editor */}
          <div style={{flex:1, overflow:'auto', background:'#0d1117', position:'relative', minHeight:0}}>
            <CodeView code={files[activePath] || ''} path={activePath}/>
          </div>

          {/* Bottom panel */}
          <div style={{
            height:240, borderTop:'1px solid #1c222b', background:'#10141a',
            display:'flex', flexDirection:'column', flexShrink:0,
          }}>
            <div style={{
              height:32, borderBottom:'1px solid #1c222b', display:'flex', alignItems:'stretch',
              padding:'0 6px', gap:2,
            }}>
              {(() => {
                const tabLabels = { terminal: window.t("ide.tab.terminal"), problems: window.t("ide.tab.problems"), output: window.t("ide.tab.output"), llm: window.t("ide.tab.llm"), agent: 'AGENT' };
                const tabs = window.AgentChat ? ['terminal','problems','output','llm','agent'] : ['terminal','problems','output','llm'];
                return tabs.map(t => (
                <div key={t} onClick={()=>setBottomTab(t)} style={{
                  padding:'0 14px', display:'flex', alignItems:'center', cursor:'pointer',
                  fontFamily:'var(--mono)', fontSize:11, letterSpacing:0.5,
                  color: t===bottomTab?'#cdd6e0':'#5a6573',
                  borderBottom: t===bottomTab?'2px solid var(--accent)':'2px solid transparent',
                  textTransform:'uppercase',
                  position:'relative',
                }}>
                  {tabLabels[t]}
                  {t==='llm' && llmLog.length > 0 && (
                    <span style={{marginLeft:6, padding:'1px 5px', background:'var(--accent-dim)', color:'var(--accent)', borderRadius:99, fontSize:9}}>{llmLog.length}</span>
                  )}
                </div>
                ));
              })()}
            </div>
            <div style={{flex:1, overflow:'auto', padding: bottomTab==='agent' ? 0 : '8px 14px', fontFamily:'var(--mono)', fontSize:11.5, lineHeight:1.6}}>
              {bottomTab==='terminal' && <Terminal lines={terminalLines}/>}
              {bottomTab==='problems' && <Problems paper={paper}/>}
              {bottomTab==='output' && <OutputTab paper={paper}/>}
              {bottomTab==='llm' && <LLMTab log={llmLog} onPrompt={()=>setRegenOpen(true)}/>}
              {bottomTab==='agent' && window.AgentChat && (
                <window.AgentChat runId={paperId} fullPanel={true}/>
              )}
            </div>
          </div>

          {/* Status bar */}
          <div style={{
            height:22, background:'var(--accent)', color:'#fff',
            display:'flex', alignItems:'center', padding:'0 12px', fontSize:10.5,
            fontFamily:'var(--mono)', letterSpacing:0.3, flexShrink:0,
          }}>
            <span>main</span>
            <span style={{margin:'0 12px', opacity:0.6}}>·</span>
            <span>↑0 ↓0</span>
            <span style={{margin:'0 12px', opacity:0.6}}>·</span>
            <span>{paper.universe}</span>
            <div style={{flex:1}}/>
            <span>Python 3.11 · qtype</span>
            <span style={{margin:'0 12px', opacity:0.6}}>·</span>
            <span>UTF-8</span>
            <span style={{margin:'0 12px', opacity:0.6}}>·</span>
            <span>LF</span>
            <span style={{margin:'0 12px', opacity:0.6}}>·</span>
            <span>Ln 1, Col 1</span>
          </div>
        </div>
      </div>

      {regenOpen && <RegenModal paper={paper} onClose={()=>setRegenOpen(false)} onSubmit={regenerate}/>}
    </div>
  );
}

function ideHeaderBtn() {
  return {
    background:'transparent', border:'1px solid #1c222b', color:'#cdd6e0',
    fontSize:11, padding:'4px 10px', borderRadius:3, cursor:'pointer',
    fontFamily:'var(--mono)',
  };
}

function FolderRow({ label, open, depth=0 }) {
  return (
    <div style={{
      padding:'3px 8px 3px '+(8 + depth*12)+'px',
      display:'flex', alignItems:'center', gap:6, color:'#7d8896', fontSize:11.5,
    }}>
      <span style={{fontSize:10}}>{open?'▾':'▸'}</span>
      <span style={{color: open?'#eab308':'#7d8896', fontSize:11}}>📁</span>
      <span>{label}</span>
    </div>
  );
}
function FileRow({ path, active, onClick, depth=1, icon, muted }) {
  return (
    <div onClick={onClick} style={{
      padding:'3px 8px 3px '+(8 + depth*12)+'px',
      display:'flex', alignItems:'center', gap:6, cursor: onClick?'pointer':'default',
      color: muted?'#5a6573':active?'#cdd6e0':'#a8b2c0',
      background: active?'#1c222b':'transparent', fontSize:11.5,
    }}>
      <span style={{color: fileColor(path), fontSize:11}}>{icon || fileIcon(path)}</span>
      <span style={{fontFamily:'var(--mono)'}}>{path.split('/').pop()}</span>
    </div>
  );
}
function fileIcon(p) {
  if (p.endsWith('.py')) return '🐍';
  if (p.endsWith('.md')) return '≡';
  if (p.endsWith('.yaml') || p.endsWith('.yml') || p.endsWith('.toml')) return '⚙';
  if (p.endsWith('.json')) return '{}';
  return '▤';
}
function fileColor(p) {
  if (p.endsWith('.py')) return '#3b82f6';
  if (p.endsWith('.md')) return '#94a3b8';
  if (p.endsWith('.yaml') || p.endsWith('.yml')) return '#a78bfa';
  if (p.endsWith('.json')) return '#eab308';
  return '#7d8896';
}

function CodeView({ code, path }) {
  const lines = code.split('\n');
  return (
    <div style={{padding:'12px 0', fontFamily:'var(--mono)', fontSize:12.5, lineHeight:1.55}}>
      {lines.map((ln, i) => (
        <div key={i} style={{display:'flex'}}>
          <div style={{
            width:48, textAlign:'right', paddingRight:14,
            color:'#3a4252', userSelect:'none', flexShrink:0,
          }}>{i+1}</div>
          <div style={{whiteSpace:'pre', flex:1, paddingRight:18}}>
            {tokens(ln, path)}
          </div>
        </div>
      ))}
    </div>
  );
}

// Tiny syntax highlighter — Python/Markdown.
function tokens(line, path) {
  if (path.endsWith('.md')) return mdTokens(line);
  if (path.endsWith('.json')) return jsonTokens(line);
  return pyTokens(line);
}
function pyTokens(line) {
  const out = [];
  // comment
  const c = line.indexOf('#');
  let main = line, comment = '';
  if (c >= 0 && !line.slice(0, c).match(/['"]/)) {
    main = line.slice(0, c); comment = line.slice(c);
  }
  // tokenize main
  const re = /(""".*?"""|'.*?'|".*?"|\b(?:def|class|return|import|from|as|if|elif|else|for|while|in|not|and|or|is|None|True|False|with|try|except|raise|lambda|yield|assert|pass|break|continue)\b|\b\d+\.?\d*\b|[A-Za-z_]\w*|[^\w\s])/g;
  let m, last = 0, key = 0;
  while ((m = re.exec(main)) !== null) {
    if (m.index > last) out.push(<span key={key++}>{main.slice(last, m.index)}</span>);
    const t = m[0];
    let color = '#cdd6e0';
    if (/^(def|class|return|import|from|as|if|elif|else|for|while|in|not|and|or|is|with|try|except|raise|lambda|yield|assert|pass|break|continue)$/.test(t)) color = '#c084fc';
    else if (/^(None|True|False)$/.test(t)) color = '#fb923c';
    else if (/^["'`]/.test(t)) color = '#86efac';
    else if (/^\d/.test(t)) color = '#fb923c';
    else if (/^[A-Z]/.test(t)) color = '#67e8f9';
    out.push(<span key={key++} style={{color}}>{t}</span>);
    last = re.lastIndex;
  }
  if (last < main.length) out.push(<span key={key++}>{main.slice(last)}</span>);
  if (comment) out.push(<span key={key++} style={{color:'#5a6573', fontStyle:'italic'}}>{comment}</span>);
  return out.length ? out : [<span key="0">{' '}</span>];
}
function mdTokens(line) {
  if (line.startsWith('#')) return <span style={{color:'#67e8f9', fontWeight:600}}>{line}</span>;
  if (line.startsWith('- ') || line.startsWith('* ')) return <span><span style={{color:'#c084fc'}}>{line.slice(0,2)}</span>{line.slice(2)}</span>;
  if (line.startsWith('>')) return <span style={{color:'#86efac'}}>{line}</span>;
  return <span>{line}</span>;
}
function jsonTokens(line) {
  return <span style={{color:'#cdd6e0'}}>{line.replace(/("[^"]*")/g, '$1')}</span>;
}

function Terminal({ lines }) {
  return (
    <>
      {lines.map((l, i) => (
        <div key={i} style={{color: termColor(l.kind)}}>{l.text}</div>
      ))}
      <div style={{color:'var(--accent)'}}>$ <span style={{display:'inline-block', animation:'blink 1s infinite'}}>▌</span></div>
    </>
  );
}
function termColor(k) {
  return { cmd:'#cdd6e0', log:'#a8b2c0', warn:'#eab308', err:'#ef4444', ok:'#22c55e' }[k] || '#a8b2c0';
}

function Problems({ paper }) {
  if (!paper.redteam || !paper.redteam.length) return <span style={{color:'#5a6573'}}>{window.t("ide.no_problems")}</span>;
  return paper.redteam.map((r, i) => (
    <div key={i} style={{padding:'4px 0', display:'flex', gap:10}}>
      <span style={{color: r.severity==='critical'?'#ef4444':'#eab308'}}>● {r.severity.toUpperCase()}</span>
      <span style={{color:'#cdd6e0'}}>{r.check}</span>
      <span style={{color:'#7d8896'}}>{r.note}</span>
      <span style={{flex:1}}/>
      <span style={{color:'#5a6573'}}>backtest.py:{40 + i*7}</span>
    </div>
  ));
}
function OutputTab({ paper }) {
  return (
    <>
      <div style={{color:'#7d8896'}}>[replicalpha:run] paper={paper.id} family={paper.family} universe={paper.universe}</div>
      <div style={{color:'#a8b2c0'}}>  metrics: ic={fmt.ic(paper.ic_repro)}  cumret={fmt.pct(paper.cumret)}  sharpe={fmt.sharpe(paper.sharpe)}  maxdd={paper.maxdd.toFixed(2)}%</div>
      <div style={{color:'#a8b2c0'}}>  artifacts: equity_curve.png  ic_series.png  drawdown.png  report.html</div>
      <div style={{color: paper.score>=0.6?'#22c55e':paper.score>=0.2?'#eab308':'#ef4444'}}>  verdict: {paper.verdict.toUpperCase()}  score={fmt.score(paper.score)}{paper.sign_flip?'  · sign-flip':''}</div>
    </>
  );
}
function LLMTab({ log, onPrompt }) {
  return (
    <>
      {log.map((l, i) => (
        <div key={i} style={{padding:'4px 0', display:'flex', gap:10, alignItems:'flex-start'}}>
          <span style={{
            color: l.role==='user'?'var(--accent)':l.role==='assistant'?'#22c55e':'#5a6573',
            minWidth:80, flexShrink:0,
          }}>[{l.role}]</span>
          <span style={{color: l.role==='system'?'#7d8896':'#cdd6e0', whiteSpace:'pre-wrap', textWrap:'pretty'}}>{l.text}</span>
        </div>
      ))}
      <div style={{padding:'8px 0'}}>
        <button onClick={onPrompt} style={{
          background:'transparent', border:'1px dashed var(--accent)',
          color:'var(--accent)', padding:'6px 12px', borderRadius:3, cursor:'pointer',
          fontFamily:'var(--mono)', fontSize:11,
        }}>+ new claude prompt</button>
      </div>
    </>
  );
}

function RegenModal({ paper, onClose, onSubmit }) {
  const [prompt, setPrompt] = React.useState('');
  const presets = [
    'Fix the sign-flip — switch sign convention to match paper',
    'Add winsorization at 1%/99% before computing factor',
    'Use weekly rebalance instead of daily',
    'Filter out stocks below 1B USD market cap',
    'Add industry-neutralization (subtract industry median)',
  ];
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(11,14,20,0.85)', zIndex:400,
      display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'14vh',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'min(680px, 90vw)', background:'#10141a', border:'1px solid #1c222b',
        borderRadius:8, overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,0.7)',
      }}>
        <div style={{padding:'14px 18px', borderBottom:'1px solid #1c222b', display:'flex', alignItems:'center', gap:10}}>
          <div style={{
            width:24, height:24, borderRadius:5, background:'linear-gradient(135deg, var(--accent), #7e57c2)',
            display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13,
          }}>✦</div>
          <div style={{fontSize:13, color:'#cdd6e0'}}>{window.t("ide.regen.title")}</div>
          <div style={{flex:1}}/>
          <Mono size={10} color="#5a6573">paper={paper.id} · model=claude-haiku-4.5</Mono>
        </div>
        <div style={{padding:18}}>
          <textarea
            autoFocus value={prompt} onChange={e=>setPrompt(e.target.value)}
            placeholder={window.t("ide.regen.placeholder")}
            style={{
              width:'100%', minHeight:90, background:'#0d1117', border:'1px solid #1c222b',
              borderRadius:5, padding:'12px 14px', color:'#cdd6e0', fontFamily:'var(--mono)',
              fontSize:12.5, resize:'vertical',
            }}/>
          <div style={{marginTop:14, display:'flex', flexWrap:'wrap', gap:6}}>
            <Mono size={10} color="#5a6573" style={{marginRight:4}}>{window.t("ide.regen.quick_prompts")}</Mono>
            {presets.map(p => (
              <button key={p} onClick={()=>setPrompt(p)} style={{
                padding:'4px 10px', borderRadius:99, fontSize:10.5,
                background:'#0d1117', border:'1px solid #1c222b', color:'#a8b2c0', cursor:'pointer',
                fontFamily:'var(--mono)',
              }}>{p}</button>
            ))}
          </div>
        </div>
        <div style={{padding:'12px 18px', borderTop:'1px solid #1c222b', display:'flex', gap:10, alignItems:'center'}}>
          <Mono size={10} color="#5a6573">⌘+Enter to submit</Mono>
          <div style={{flex:1}}/>
          <button onClick={onClose} style={{padding:'6px 12px', borderRadius:4, fontSize:12, background:'transparent', border:'1px solid #1c222b', color:'#a8b2c0', cursor:'pointer'}}>{window.t("ide.regen.cancel")}</button>
          <button disabled={!prompt.trim()} onClick={()=>onSubmit(prompt)} style={{
            padding:'6px 14px', borderRadius:4, fontSize:12, fontWeight:500,
            background:'var(--accent)', color:'#fff', border:'none',
            opacity: prompt.trim()?1:0.4, cursor: prompt.trim()?'pointer':'not-allowed',
          }}>{window.t("ide.regen.submit")}</button>
        </div>
      </div>
    </div>
  );
}

function buildRepro(p) {
  return {
    'README.md':
`# ${p.title}
${p.authors} (${p.year})

**Factor:** \`${p.factor}\`
**Universe:** ${p.universe}
**Reproduction period:** ${p.period_repro}

## Verdict
score = ${fmt.score(p.score)} · ${p.verdict.toUpperCase()}${p.sign_flip?' (sign-flip)':''}

## Files
- factor.py — formula
- backtest.py — pipeline
- redteam.py — checks
- config.yaml — universe & dates
`,
    'factor.py':
`# Auto-generated by paper2alpha · do not edit by hand
# Source: ${p.title} (${p.authors}, ${p.year})
# Verdict: ${p.verdict.toUpperCase()}${p.sign_flip?' · sign-flip detected':''}

import pandas as pd
import numpy as np
from replicalpha.qtype import factor, asof, lookback


@factor(name="${p.factor}", family="${p.family}")
def ${p.factor}(close: pd.DataFrame, volume: pd.DataFrame = None, **kw):
    """${p.factor_zh || p.factor}

    Formula (from paper):
        ${p.factor} = ${p.formula}

    Notes:
    - ranked cross-sectionally each day
    - long top-quintile, short bottom-quintile, daily rebalance
    """
    raw = ${pyExpr(p)}
    # cross-sectional rank, normalized to [-1, 1]
    return raw.rank(axis=1, pct=True) * 2 - 1
`,
    'backtest.py':
`from replicalpha.engine import Backtest, Universe
from replicalpha.metrics import ic, sharpe, maxdd
import factor


cfg = {
    "universe":   "${p.universe}",
    "start":      "${(p.period_repro || '').split('→')[0].trim()}",
    "end":        "${(p.period_repro || '').split('→')[1] ? p.period_repro.split('→')[1].trim() : ''}",
    "rebalance":  "1D",
    "n_quintile": 5,
}


def run():
    bt = Backtest(cfg)
    bt.add_factor(factor.${p.factor})
    res = bt.run()
    print("ic     :", ic(res))
    print("sharpe :", sharpe(res))
    print("maxdd  :", maxdd(res))
    res.save("artifacts/")
    return res


if __name__ == "__main__":
    run()
`,
    'redteam.py':
`from replicalpha.redteam import check_leakage, check_concentration, check_overfit, check_costs, check_survivorship


def audit(result):
    findings = []
    findings += check_leakage(result)         # look-ahead, future data
    findings += check_concentration(result)   # one stock dominates
    findings += check_overfit(result)         # too many parameters
    findings += check_costs(result)           # turnover-aware
    findings += check_survivorship(result)    # delisted stocks
    return findings
`,
    'config.yaml':
`# replicalpha run config
paper:
  id: ${p.id}
  title: "${p.title.replace(/"/g, '\\"')}"
  authors: "${p.authors}"
  year: ${p.year}

universe: ${p.universe}
period:
  start: "${(p.period_repro||'').split('→')[0].trim()}"
  end:   "${(p.period_repro||'').split('→')[1] ? p.period_repro.split('→')[1].trim() : ''}"

backtest:
  rebalance: 1D
  n_quintile: 5
  costs_bps: 5

redteam:
  enabled: true
  checks: [leakage, concentration, overfit, costs, survivorship]
`,
  };
}

function pyExpr(p) {
  // Quick sanitizer: turn the formula into something pandas-ish
  const f = p.formula;
  return f
    .replace(/pct_change\(close,\s*(\d+)\)/g, 'close.pct_change($1)')
    .replace(/rank\(/g, 'rank_cs(')
    .replace(/zscore\(([^)]+)\)/g, 'zscore_cs($1)')
    .replace(/log\(/g, 'np.log(')
    .replace(/sign\(/g, 'np.sign(')
    .replace(/sqrt\(/g, 'np.sqrt(')
    .replace(/std\((\d+)\)/g, 'rolling_std($1)') || 'close';
}

function seedTerminal(p) {
  return [
    { kind:'cmd', text:'$ replicalpha workspace open '+p.id },
    { kind:'log', text:'workspace ready · '+Object.keys(buildRepro(p)).length+' files · '+(p.universe)+' loaded' },
    { kind:'log', text:'last run: '+(p.verdict==='green'?'reproduced ✓':p.verdict==='red'?'failed ✗':'weak ⚠')+' · score '+fmt.score(p.score) },
  ];
}
function seedLLMLog(p) {
  return [
    { role:'system', text:'paper2alpha v0.4.1 · model=claude-haiku-4.5' },
    { role:'system', text:'extract factor → '+p.factor+' = '+p.formula },
    { role:'assistant', text:'Generated factor.py (28 lines), backtest.py (24 lines), redteam.py (15 lines), config.yaml. All files pass qtype lint. Recommend running backtest before customizing.' },
  ];
}
function cannedPatch(prompt, p) {
  if (/sign[ -]?flip|sign convention/i.test(prompt)) return `flip sign of factor:\n  - return raw.rank(...) * 2 - 1\n  + return -(raw.rank(...) * 2 - 1)\nrationale: paper IC = ${fmt.ic(p.ic_paper)} but reproduction IC = ${fmt.ic(p.ic_repro)} · sign-flip indicates the formula is computing the inverse of what the paper specified. Inverting gives expected direction.`;
  if (/winsoriz/i.test(prompt)) return `add winsorization step:\n  + raw = raw.clip(raw.quantile(0.01, axis=1), raw.quantile(0.99, axis=1), axis=0)\nplaced before rank step. Reduces influence of extreme values which often drive false-positive ICs.`;
  if (/weekly|rebalance/i.test(prompt)) return `change rebalance frequency:\n  - rebalance: 1D\n  + rebalance: 1W\nNote: this will cut transaction costs by ~5x but may reduce IC magnitude proportionally to factor decay rate.`;
  if (/market cap|mcap|filter/i.test(prompt)) return `add market cap filter:\n  + universe = universe[universe.mcap_usd >= 1e9]\napplied at universe construction. Drops smallcaps where the factor signal is dominated by noise.`;
  return `proposed change for: "${prompt}"\n  + apply requested transformation\n  + re-run backtest to verify\nestimated impact on IC: ±10-30%\nsuggested next step: run \`▶ Run backtest\` to verify.`;
}

window.IDE = IDE;

// ===== ai-search.jsx =====
// AI Search modal — Claude-powered. Search latest research, add to timeline.

function AISearch({ open, onClose, onAddPapers }) {
  const [lang] = window.useLang ? window.useLang() : [window.__lang || 'zh'];
  const [query, setQuery] = React.useState('');
  const [phase, setPhase] = React.useState('idle'); // idle | searching | results
  const [results, setResults] = React.useState([]);
  const [picked, setPicked] = React.useState(new Set());
  const [logLines, setLogLines] = React.useState([]);

  const presets = [
    'Latest momentum factors in CSI 500 (2024)',
    'Post-publication decay of value anomalies',
    'Volatility timing strategies after 2020',
    'Machine learning factors that beat Fama-French',
  ];

  function pushLog(s) { setLogLines(l => [...l, { t: new Date().toLocaleTimeString(), msg: s }]); }

  async function runSearch(q) {
    setQuery(q);
    setPhase('searching');
    setLogLines([]);
    setResults([]);
    pushLog(`POST /search?q="${q}"`);
    await wait(400);
    pushLog('arxiv.org · 47 hits · filtering quant.q-fin');
    await wait(500);
    pushLog('ssrn.com · 23 hits · ranking by citation');
    await wait(400);
    pushLog('google scholar · 31 hits · merging');
    await wait(500);
    pushLog('LLM · ranking by reproducibility likelihood…');

    // Try claude.complete; fall back to canned data if unavailable.
    let papers = null;
    try {
      const text = await Promise.race([
        window.claude.complete(`Return ONLY valid JSON, no prose. Find 5 plausible recent quant finance research papers about: "${q}". For each return: {"title","authors","year","family","factor","formula","ic_paper","universe","abstract"}. family must be one of: momentum, reversal, value, quality, volatility, liquidity, other. Return as {"papers":[...]}`),
        new Promise((_, rej) => setTimeout(() => rej('timeout'), 8000)),
      ]);
      const j = JSON.parse(text.replace(/```json|```/g, '').trim());
      papers = j.papers || j;
    } catch (e) {
      pushLog('LLM unavailable · using cached results');
    }
    if (!papers || !Array.isArray(papers)) papers = synthResults(q);

    pushLog(`✓ ${papers.length} candidates ranked`);
    setResults(papers.map((p, i) => ({
      ...p,
      _id: 'r-ai' + Date.now() + '-' + i,
      _selected: false,
    })));
    setPhase('results');
  }

  function togglePick(id) {
    setPicked(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function commitAdd() {
    const picks = results.filter(r => picked.has(r._id)).map(r => aiToPaper(r));
    onAddPapers(picks);
    onClose();
    setPicked(new Set());
    setResults([]);
    setQuery('');
    setPhase('idle');
  }

  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:200, background:'rgba(11,14,20,0.7)',
      display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'10vh',
      animation:'fadeIn 0.15s ease',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'min(720px, 90vw)', maxHeight:'80vh',
        background:'var(--surface-1)', border:'1px solid var(--border)',
        borderRadius:8, display:'flex', flexDirection:'column', overflow:'hidden',
        boxShadow:'0 24px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12}}>
          <div style={{
            width:24, height:24, borderRadius:5,
            background:'linear-gradient(135deg, var(--accent), #7e57c2)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#fff', fontSize:13, fontWeight:700, fontFamily:'var(--mono)',
          }}>✦</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13, fontWeight:500, color:'var(--text-1)'}}>{window.t("ai_search.title")}</div>
            <Mono size={10} color="var(--text-3)">{window.t("ai_search.subtitle")}</Mono>
          </div>
          <button onClick={onClose} style={{background:'transparent', border:'none', color:'var(--text-3)', fontSize:18, cursor:'pointer'}}>×</button>
        </div>

        <div style={{padding:18, borderBottom:'1px solid var(--border)'}}>
          <div style={{display:'flex', gap:8, marginBottom:10}}>
            <input
              value={query} onChange={e=>setQuery(e.target.value)}
              onKeyDown={e=>{ if (e.key==='Enter' && query.trim()) runSearch(query); }}
              placeholder={window.t("ai_search.placeholder")}
              autoFocus
              style={{
                flex:1, background:'var(--surface-2)', border:'1px solid var(--border)',
                borderRadius:5, padding:'10px 14px', color:'var(--text-1)', fontSize:13,
              }}/>
            <button disabled={!query.trim() || phase==='searching'} onClick={()=>runSearch(query)} style={{
              padding:'10px 18px', borderRadius:5, fontSize:12, fontWeight:500,
              background: phase==='searching' ? 'var(--surface-2)' : 'var(--accent)',
              color:'#fff', border:'none', cursor: phase==='searching'?'wait':'pointer',
              opacity: !query.trim() ? 0.4 : 1,
            }}>{phase==='searching' ? window.t("ai_search.searching") : window.t("ai_search.search_btn")}</button>
          </div>

          {phase === 'idle' && (
            <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
              <Mono size={10} color="var(--text-3)" style={{marginRight:4}}>{window.t("ai_search.try")}</Mono>
              {presets.map(p => (
                <button key={p} onClick={()=>runSearch(p)} style={{
                  padding:'4px 10px', borderRadius:99, fontSize:11,
                  background:'var(--surface-2)', border:'1px solid var(--border)',
                  color:'var(--text-2)', cursor:'pointer',
                }}>{p}</button>
              ))}
            </div>
          )}
        </div>

        <div style={{flex:1, overflow:'auto', padding: phase==='results'?0:18}}>
          {phase === 'searching' && (
            <div style={{fontFamily:'var(--mono)', fontSize:11, lineHeight:1.7, color:'var(--text-2)'}}>
              {logLines.map((l, i) => (
                <div key={i} style={{display:'flex', gap:10}}>
                  <span style={{color:'var(--text-3)'}}>{l.t}</span>
                  <span style={{color: l.msg.startsWith('✓')?'#22c55e':'var(--text-2)'}}>{l.msg}</span>
                </div>
              ))}
              <div style={{marginTop:8, color:'var(--accent)'}}>
                <span style={{display:'inline-block', animation:'blink 1s infinite'}}>▌</span>
              </div>
            </div>
          )}

          {phase === 'results' && results.map(r => (
            <div key={r._id} onClick={()=>togglePick(r._id)} style={{
              padding:'14px 18px', borderBottom:'1px solid var(--border-soft)',
              display:'flex', gap:14, cursor:'pointer',
              background: picked.has(r._id) ? 'var(--accent-dim)' : 'transparent',
            }}>
              <div style={{
                width:18, height:18, borderRadius:4, marginTop:2,
                border:`1.5px solid ${picked.has(r._id)?'var(--accent)':'var(--border)'}`,
                background: picked.has(r._id)?'var(--accent)':'transparent',
                color:'#fff', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0,
              }}>{picked.has(r._id) ? '✓' : ''}</div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:4}}>
                  <FamilyChip family={r.family}/>
                  <Mono size={10} color="var(--text-3)">{r.year}</Mono>
                  <Mono size={10} color="var(--accent)">arxiv</Mono>
                </div>
                <div style={{fontSize:13, color:'var(--text-1)', marginBottom:3, lineHeight:1.3}}>{r.title}</div>
                <div style={{fontSize:11, color:'var(--text-3)', marginBottom:6}}>{r.authors}</div>
                <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--accent)', marginBottom:6}}>{r.factor} = {r.formula}</div>
                <div style={{fontSize:11.5, color:'var(--text-2)', lineHeight:1.5, textWrap:'pretty'}}>{r.abstract}</div>
              </div>
            </div>
          ))}
        </div>

        {phase === 'results' && (
          <div style={{padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12}}>
            <Mono size={11} color="var(--text-3)">{window.t("ai_search.selected").replace("{n}", picked.size).replace("{total}", results.length)}</Mono>
            <div style={{flex:1}}/>
            <button onClick={onClose} style={{padding:'8px 14px', borderRadius:4, fontSize:12, background:'transparent', border:'1px solid var(--border)', color:'var(--text-2)', cursor:'pointer'}}>{window.t("ai_search.cancel")}</button>
            <button disabled={!picked.size} onClick={commitAdd} style={{
              padding:'8px 16px', borderRadius:4, fontSize:12, fontWeight:500,
              background:'var(--accent)', color:'#fff', border:'none',
              cursor: picked.size?'pointer':'not-allowed', opacity: picked.size?1:0.4,
            }}>{window.t("ai_search.add_btn").replace("{n}", picked.size)}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function aiToPaper(r) {
  const seed = Math.floor(Math.random() * 200);
  const ic_repro = (Math.random() - 0.45) * 0.04;
  const sign_flip = (r.ic_paper > 0) !== (ic_repro > 0);
  const score = sign_flip ? 0 : Math.min(1, Math.abs(ic_repro / r.ic_paper));
  const verdict = score > 0.6 ? 'green' : score > 0.2 ? 'yellow' : 'red';
  const month = Math.floor(Math.random() * 12) + 1;
  return {
    id: r._id,
    title: r.title, authors: r.authors, year: r.year, month,
    family: r.family, factor: r.factor, formula: r.formula,
    universe: r.universe || 'CSI 300',
    period_paper: `${r.year-3}-${r.year}`,
    period_repro: '2023-01 → 2025-04',
    ic_paper: r.ic_paper,
    ic_repro,
    ic_std: 0.2 + Math.random() * 0.1,
    cumret: ic_repro * 400,
    maxdd: 8 + Math.random() * 12,
    sharpe: ic_repro * 30,
    score, verdict, sign_flip,
    influence: 2 + Math.floor(Math.random() * 3),
    redteam: sign_flip ? [{ check: 'sample_concentration', severity: 'warning', note: 'recent year contributes >50% of IC' }] : [],
    tags: ['AI-found', 'new'],
    spark: makeSpark(seed, ic_repro),
    aiFound: true,
  };
}

function makeSpark(seed, drift) {
  let s = 0, x = seed; const out = [];
  for (let i = 0; i < 36; i++) {
    x = (x * 9301 + 49297) % 233280;
    s += (x / 233280 - 0.5) * 2 + drift * 50;
    out.push(s);
  }
  return out;
}

function synthResults(q) {
  const ql = q.toLowerCase();
  let fam = 'momentum';
  if (ql.includes('value') || ql.includes('book')) fam = 'value';
  else if (ql.includes('vol')) fam = 'volatility';
  else if (ql.includes('liquid')) fam = 'liquidity';
  else if (ql.includes('quality') || ql.includes('profit')) fam = 'quality';
  else if (ql.includes('reversal') || ql.includes('overreact')) fam = 'reversal';
  else if (ql.includes('decay') || ql.includes('post-pub')) fam = 'other';

  const samples = {
    momentum: [
      { title:'Cross-Sectional Momentum and the Risk of Crashes in CSI 300', authors:'Wang, Chen, Liu', year:2025, family:'momentum', factor:'crash_adj_mom', formula:'pct_change(close,126)*sign(skew_30d)', ic_paper:0.031, universe:'CSI 300', abstract:'Standard 6-month momentum loses its edge during regime shifts; this paper proposes a skewness-conditioned momentum that mitigates crash risk in Chinese equities, 2018-2024.' },
      { title:'Earnings Momentum vs Price Momentum: Post-COVID Evidence', authors:'Park, Yamada', year:2024, family:'momentum', factor:'eps_drift', formula:'rank(eps_surprise)*decay(0.95,90)', ic_paper:0.026, universe:'US Russell 1000', abstract:'PEAD survives the COVID regime; price momentum does not. We document a 3.4× higher Sharpe for earnings momentum 2020-2024.' },
      { title:'Intraday Momentum and Closing Auction Predictability', authors:'Bouchaud et al.', year:2024, family:'momentum', factor:'intraday_drift', formula:'pct_change(close,5)-pct_change(open,5)', ic_paper:0.018, universe:'US S&P 500', abstract:'Last-30min returns predict next-open returns with t-stat 14.3; effect halves in liquid universes.' },
    ],
    value: [
      { title:'Has Value Recovered? Out-of-Sample Evidence 2020-2025', authors:'Asness, Liew', year:2025, family:'value', factor:'composite_value', formula:'z(b/p)+z(e/p)+z(cf/p)', ic_paper:0.034, universe:'US Russell 1000', abstract:'Composite value beats single-metric value across all geographies; cyclical recovery 2022-23 lifts long-horizon Sharpe.' },
      { title:'Intangibles-Adjusted Book-to-Market in the AI Era', authors:'Park, Wong', year:2024, family:'value', factor:'iam_b2m', formula:'log((book + R&D_capital)/market)', ic_paper:0.029, universe:'US S&P 500', abstract:'Capitalizing R&D as intangibles partially restores B/M’s explanatory power among AI-exposed names.' },
    ],
    volatility: [
      { title:'Vol-of-Vol Risk Premium in Chinese Index Constituents', authors:'Yao, Park', year:2025, family:'volatility', factor:'volvol', formula:'-rolling_std(rolling_std(returns,21),60)', ic_paper:0.024, universe:'CSI 300', abstract:'Stocks with rising vol-of-vol underperform by 3.2% annualized; effect is monotonic across quintiles.' },
      { title:'Conditional Idio-Vol After Regime Detection', authors:'Hassan, Vu', year:2024, family:'volatility', factor:'cond_ivol', formula:'-zscore(idio_vol_21d|regime)', ic_paper:0.027, universe:'US Russell 1000', abstract:'IVOL anomaly only fires in low-VIX regimes; conditioning on a regime classifier doubles IC magnitude.' },
    ],
    liquidity: [
      { title:'Turnover-Adjusted Reversal Refresh on A-Share Mid-Caps', authors:'Lin, Hu', year:2024, family:'liquidity', factor:'turnover_rev_v2', formula:'-pct_change(close,21)*log(1+turnover)', ic_paper:0.033, universe:'CSI 500', abstract:'2014-2019 sample shows IC 0.038; rolling 2020-2024 shows IC 0.011 — significant decay.' },
    ],
    quality: [
      { title:'AI-Native Quality: Capex-to-AI-Revenue Ratio', authors:'Zhang, Bell', year:2025, family:'quality', factor:'ai_capex_eff', formula:'rank(capex/ai_revenue)', ic_paper:0.022, universe:'US S&P 500', abstract:'Among AI-tagged firms, lower capex-per-AI-revenue predicts higher 12m returns.' },
    ],
    reversal: [
      { title:'Long-Horizon Reversal Returns to A-Shares Post-2018', authors:'Tan, Liu', year:2024, family:'reversal', factor:'lt_rev_5y', formula:'-pct_change(close,1260)', ic_paper:0.019, universe:'CSI 1000', abstract:'5-year reversal becomes statistically significant only after 2018 deregulation; pre-2018 sample IC ≈ 0.' },
    ],
    other: [
      { title:'Decay of 153 Anomalies: A Replication Pre-Registry Update', authors:'McLean, Pontiff, Lu', year:2025, family:'other', factor:'meta_decay', formula:'mean(IC_post)/mean(IC_pre)', ic_paper:-0.024, universe:'US Russell 1000', abstract:'Updated to 2024: 64% of published anomalies decayed by ≥50%; quality factors most resilient.' },
      { title:'P-Hacking in Factor Research: A Systematic Audit', authors:'Harvey, Liu', year:2025, family:'other', factor:'haircut_t', formula:'t_stat - sqrt(2*log(N_tests))', ic_paper:0.014, universe:'US Russell 1000', abstract:'After multiple-testing haircut, only 23 of 412 surveyed factors retain t > 3.' },
    ],
  };
  return samples[fam] || samples.momentum;
}

window.AISearch = AISearch;

// ===== custom-upload.jsx =====
// Custom upload modal — drag PDF, set time/name/tags/family.
function CustomUpload({ open, onClose, onAdd }) {
  const [lang] = window.useLang ? window.useLang() : [window.__lang || 'zh'];
  const FAMILIES = window.FACTOR_FAMILIES;
  const [step, setStep] = React.useState('drop'); // drop | meta | running | done
  const [filename, setFilename] = React.useState('');
  const [meta, setMeta] = React.useState({
    title: '', authors: '', year: 2025, month: 6,
    family: 'momentum', factor: '', formula: '',
    universe: 'CSI 300', tags: '', notes: '',
    influence: 3,
  });
  const [progress, setProgress] = React.useState(0);
  const [stageIdx, setStageIdx] = React.useState(0);
  const [created, setCreated] = React.useState(null);
  const STAGES = ['Extract','Codegen','Lint','Backtest','Red Team','Score'];

  function reset() {
    setStep('drop'); setFilename(''); setProgress(0); setStageIdx(0); setCreated(null);
    setMeta({ title:'', authors:'', year:2025, month:6, family:'momentum', factor:'', formula:'', universe:'CSI 300', tags:'', notes:'', influence:3 });
  }
  function close() { onClose(); setTimeout(reset, 200); }

  function onDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) accept(f);
  }
  function onPick(e) {
    const f = e.target.files[0];
    if (f) accept(f);
  }
  function accept(f) {
    setFilename(f.name);
    // guess title from filename
    const stem = f.name.replace(/\.[^.]+$/, '').replace(/_/g,' ').replace(/-/g,' ');
    const m = stem.match(/(\d{4})/);
    setMeta(s => ({...s,
      title: stem.replace(/\d{4}/g,'').replace(/\s+/g,' ').trim(),
      year: m ? parseInt(m[1]) : 2025,
    }));
    setStep('meta');
  }

  async function commit() {
    setStep('running'); setProgress(0); setStageIdx(0);
    for (let i = 0; i < STAGES.length; i++) {
      setStageIdx(i);
      for (let j = 0; j < 16; j++) {
        await wait(60 + Math.random()*60);
        setProgress(((i*16 + j+1) / (STAGES.length*16)) * 100);
      }
    }
    const newPaper = buildPaperFromMeta(meta, filename);
    setCreated(newPaper);
    onAdd(newPaper);
    setStep('done');
  }

  if (!open) return null;
  return (
    <div onClick={close} style={{
      position:'fixed', inset:0, zIndex:200, background:'rgba(11,14,20,0.7)',
      display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'10vh',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'min(720px, 92vw)', maxHeight:'82vh',
        background:'var(--surface-1)', border:'1px solid var(--border)',
        borderRadius:8, display:'flex', flexDirection:'column', overflow:'hidden',
        boxShadow:'0 24px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12}}>
          <div style={{width:24, height:24, borderRadius:5, background:'var(--accent-dim)', border:'1px solid var(--accent)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14}}>↑</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13, color:'var(--text-1)'}}>{window.t("upload.modal.title")}</div>
            <Mono size={10} color="var(--text-3)">{window.t("upload.modal.subtitle")}</Mono>
          </div>
          <Mono size={10} color="var(--text-3)">{step === 'drop' ? '1/3' : step === 'meta' ? '2/3' : '3/3'}</Mono>
          <button onClick={close} style={{background:'transparent', border:'none', color:'var(--text-3)', fontSize:18, cursor:'pointer', marginLeft:8}}>×</button>
        </div>

        <div style={{flex:1, overflow:'auto'}}>
          {step === 'drop' && (
            <div style={{padding:32}}>
              <label
                onDragOver={e=>e.preventDefault()} onDrop={onDrop}
                style={{
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  padding:48, border:'1.5px dashed var(--border)', borderRadius:8,
                  background:'var(--surface-0)', cursor:'pointer', gap:14,
                }}>
                <div style={{width:56, height:56, borderRadius:8, background:'var(--accent-dim)', border:'1px solid var(--accent)', color:'var(--accent)', fontSize:24, display:'flex', alignItems:'center', justifyContent:'center'}}>↑</div>
                <div style={{fontSize:14, color:'var(--text-1)'}}>{window.t("upload.modal.drop_zone")}</div>
                <Mono size={11} color="var(--text-3)">{window.t("upload.modal.drop_hint")}</Mono>
                <input type="file" accept=".pdf,.md,.docx,.txt" onChange={onPick} style={{display:'none'}}/>
                <button type="button" onClick={(e)=>e.currentTarget.parentElement.querySelector('input').click()} style={{
                  marginTop:6, padding:'8px 18px', borderRadius:5, fontSize:12, fontWeight:500,
                  background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer',
                }}>{window.t("upload.modal.browse")}</button>
              </label>
              <div style={{marginTop:18, textAlign:'center'}}>
                <button onClick={()=>{ setFilename('untitled_strategy.md'); setStep('meta'); }} style={{
                  background:'transparent', border:'none', color:'var(--accent)', fontSize:12, cursor:'pointer', textDecoration:'underline',
                }}>{window.t("upload.modal.write_note")}</button>
              </div>
            </div>
          )}

          {step === 'meta' && (
            <div style={{padding:24}}>
              <Mono size={10} color="var(--text-3)" style={{marginBottom:14, display:'block'}}>FILE: {filename}</Mono>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
                <Field label="Title" full>
                  <input value={meta.title} onChange={e=>setMeta({...meta, title:e.target.value})} style={inp()}/>
                </Field>
                <Field label="Authors / source">
                  <input value={meta.authors} onChange={e=>setMeta({...meta, authors:e.target.value})} placeholder="e.g. Wang & Chen / internal note" style={inp()}/>
                </Field>
                <Field label="Universe">
                  <select value={meta.universe} onChange={e=>setMeta({...meta, universe:e.target.value})} style={inp()}>
                    {window.UNIVERSES.map(u => <option key={u}>{u}</option>)}
                  </select>
                </Field>
                <Field label="Year">
                  <input type="number" value={meta.year} onChange={e=>setMeta({...meta, year: parseInt(e.target.value)||2025})} style={inp()}/>
                </Field>
                <Field label="Month">
                  <input type="number" min={1} max={12} value={meta.month} onChange={e=>setMeta({...meta, month: parseInt(e.target.value)||1})} style={inp()}/>
                </Field>
                <Field label="Factor family">
                  <div style={{display:'flex', gap:4, flexWrap:'wrap'}}>
                    {FAMILIES.map(f => (
                      <button key={f.id} onClick={()=>setMeta({...meta, family:f.id})} style={{
                        padding:'5px 9px', borderRadius:3, fontSize:10.5, fontFamily:'var(--mono)',
                        background: meta.family===f.id?'var(--accent)':'var(--surface-2)',
                        color: meta.family===f.id?'#fff':'var(--text-2)',
                        border:'1px solid '+(meta.family===f.id?'var(--accent)':'var(--border)'),
                        cursor:'pointer',
                      }}>{f.short}</button>
                    ))}
                  </div>
                </Field>
                <Field label="Influence (★)">
                  <div style={{display:'flex', gap:4}}>
                    {[1,2,3,4,5].map(n => (
                      <span key={n} onClick={()=>setMeta({...meta, influence:n})} style={{
                        cursor:'pointer', fontSize:18, color: n<=meta.influence?'var(--accent)':'var(--border)',
                      }}>★</span>
                    ))}
                  </div>
                </Field>
                <Field label="Factor name (optional)">
                  <input value={meta.factor} onChange={e=>setMeta({...meta, factor:e.target.value})} placeholder="e.g. mom_6m" style={{...inp(), fontFamily:'var(--mono)'}}/>
                </Field>
                <Field label="Formula (optional)">
                  <input value={meta.formula} onChange={e=>setMeta({...meta, formula:e.target.value})} placeholder="pct_change(close, 126)" style={{...inp(), fontFamily:'var(--mono)'}}/>
                </Field>
                <Field label="Tags (comma-separated)" full>
                  <input value={meta.tags} onChange={e=>setMeta({...meta, tags:e.target.value})} placeholder="personal-strategy, A-share, post-pub-decay" style={inp()}/>
                </Field>
                <Field label="Notes" full>
                  <textarea value={meta.notes} onChange={e=>setMeta({...meta, notes:e.target.value})} rows={3} placeholder="What's interesting about this paper? What do you expect to find?" style={{...inp(), resize:'vertical'}}/>
                </Field>
              </div>
            </div>
          )}

          {step === 'running' && (
            <div style={{padding:32}}>
              <div style={{textAlign:'center', marginBottom:24}}>
                <div style={{fontSize:14, color:'var(--text-1)', marginBottom:4}}>{STAGES[stageIdx]}…</div>
                <Mono size={10} color="var(--text-3)">{filename} · stage {stageIdx+1}/{STAGES.length}</Mono>
              </div>
              <div style={{display:'flex', gap:4, marginBottom:24}}>
                {STAGES.map((s, i) => (
                  <div key={s} style={{flex:1, height:6, borderRadius:3, background: i<stageIdx?'#22c55e':i===stageIdx?'var(--accent)':'var(--surface-2)'}}/>
                ))}
              </div>
              <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8}}>
                {STAGES.map((s, i) => (
                  <div key={s} style={{
                    padding:'8px 10px', borderRadius:4, fontSize:11,
                    background: i===stageIdx?'var(--accent-dim)':'var(--surface-0)',
                    border:'1px solid '+(i===stageIdx?'var(--accent)':'var(--border)'),
                    color: i<stageIdx?'#22c55e':i===stageIdx?'var(--accent)':'var(--text-3)',
                    fontFamily:'var(--mono)',
                  }}>{i<stageIdx?'✓':i===stageIdx?'…':' '} {s}</div>
                ))}
              </div>
              <div style={{marginTop:24, height:3, background:'var(--surface-2)', borderRadius:2, overflow:'hidden'}}>
                <div style={{width: progress+'%', height:'100%', background:'var(--accent)', transition:'width 0.1s'}}/>
              </div>
            </div>
          )}

          {step === 'done' && created && (
            <div style={{padding:32}}>
              <div style={{textAlign:'center', marginBottom:24}}>
                <div style={{
                  width:56, height:56, borderRadius:'50%', background:'rgba(34,197,94,0.15)', border:'2px solid #22c55e',
                  color:'#22c55e', fontSize:24, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px',
                }}>✓</div>
                <div style={{fontSize:16, color:'var(--text-1)', marginBottom:4}}>{window.t("upload.modal.added")}</div>
                <Mono size={11} color="var(--text-3)">id={created.id} · score={fmt.score(created.score)} · {created.verdict}</Mono>
              </div>
              <div style={{padding:14, background:'var(--surface-0)', border:'1px solid var(--border)', borderRadius:5}}>
                <div style={{fontSize:13, color:'var(--text-1)', marginBottom:4}}>{created.title}</div>
                <Mono size={11} color="var(--text-3)">{created.authors} · {created.year} · {created.universe}</Mono>
                <div style={{marginTop:10, display:'flex', gap:14, fontFamily:'var(--mono)', fontSize:11}}>
                  <span style={{color:'var(--text-3)'}}>IC paper</span><span style={{color:'var(--text-1)'}}>{fmt.ic(created.ic_paper)}</span>
                  <span style={{color:'var(--text-3)'}}>IC repro</span><span style={{color: window.VERDICT_COLORS[created.verdict].fill}}>{fmt.ic(created.ic_repro)}</span>
                  <span style={{color:'var(--text-3)'}}>Sharpe</span><span style={{color:'var(--text-1)'}}>{fmt.sharpe(created.sharpe)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', gap:10, alignItems:'center'}}>
          <Mono size={10} color="var(--text-3)">{step==='drop'?window.t("upload.modal.hint_drop"):step==='meta'?window.t("upload.modal.hint_meta"):step==='running'?window.t("upload.modal.hint_running"):window.t("upload.modal.hint_done")}</Mono>
          <div style={{flex:1}}/>
          {step === 'meta' && <button onClick={()=>setStep('drop')} style={btnGhost()}>{window.t("upload.modal.back")}</button>}
          {step === 'meta' && <button disabled={!meta.title} onClick={commit} style={{...btnPrimary(), opacity: meta.title?1:0.4}}>{window.t("upload.modal.run_pipeline")}</button>}
          {step === 'done' && <button onClick={close} style={btnGhost()}>{window.t("upload.modal.add_another")}</button>}
          {step === 'done' && <button onClick={()=>{ close(); window.__openRun && window.__openRun(created.id); }} style={btnPrimary()}>{window.t("upload.modal.open_run")}</button>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div style={{gridColumn: full?'1 / -1':'auto'}}>
      <Mono size={10} color="var(--text-3)" style={{marginBottom:6, display:'block', letterSpacing:0.5, textTransform:'uppercase'}}>{label}</Mono>
      {children}
    </div>
  );
}
function inp() {
  return {
    width:'100%', background:'var(--surface-0)', border:'1px solid var(--border)',
    borderRadius:4, padding:'7px 10px', color:'var(--text-1)', fontSize:12,
    fontFamily:'var(--sans)', boxSizing:'border-box',
  };
}
function btnPrimary() {
  return { padding:'7px 14px', borderRadius:4, fontSize:12, fontWeight:500, background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer' };
}
function btnGhost() {
  return { padding:'7px 12px', borderRadius:4, fontSize:12, background:'transparent', border:'1px solid var(--border)', color:'var(--text-2)', cursor:'pointer' };
}

function buildPaperFromMeta(m, filename) {
  const seed = (m.title.length + m.year * 7) % 200;
  const ic_paper = 0.015 + (seed % 30) / 1000;
  const ic_repro = ic_paper * (0.4 + Math.random() * 0.5) * (Math.random() > 0.7 ? -1 : 1);
  const sign_flip = (ic_paper > 0) !== (ic_repro > 0);
  const score = sign_flip ? 0 : Math.min(1, Math.abs(ic_repro / ic_paper));
  const verdict = score > 0.6 ? 'green' : score > 0.2 ? 'yellow' : 'red';
  let s = 0, x = seed; const sp = [];
  for (let i = 0; i < 36; i++) {
    x = (x * 9301 + 49297) % 233280;
    s += (x / 233280 - 0.5) * 2 + ic_repro * 30;
    sp.push(s);
  }
  return {
    id: 'r-u' + Date.now().toString(36),
    title: m.title || filename,
    authors: m.authors || 'You',
    year: m.year, month: m.month,
    family: m.family,
    factor: m.factor || (m.family + '_v1'),
    formula: m.formula || 'placeholder(close)',
    universe: m.universe,
    period_paper: `${m.year-3}-${m.year}`,
    period_repro: '2023-01 → 2025-04',
    ic_paper, ic_repro, ic_std: 0.25 + Math.random()*0.1,
    cumret: ic_repro * 400,
    maxdd: 8 + Math.random()*15,
    sharpe: ic_repro * 30,
    score, verdict, sign_flip,
    influence: m.influence,
    redteam: sign_flip ? [{ check:'sign_flip', severity:'critical', note:'IC sign opposite to claim' }] : [],
    tags: ['user-uploaded', ...(m.tags||'').split(',').map(s=>s.trim()).filter(Boolean)],
    notes: m.notes,
    spark: sp,
    userUploaded: true,
  };
}

window.CustomUpload = CustomUpload;

// ===== pages.jsx =====
// Secondary pages: landing, factors, library, upload, compare, progress.

function Landing({ onStart }) {
  const PAPERS = window.PAPERS;
  const FAMILIES = window.FACTOR_FAMILIES;
  const sample = PAPERS.slice(0, 14);

  return (
    <div style={{height:'100%', overflow:'auto', background:'var(--surface-0)'}}>
      <div style={{maxWidth:1100, margin:'0 auto', padding:'80px 32px 60px'}}>
        <div style={{
          display:'inline-flex', gap:8, alignItems:'center', padding:'4px 10px',
          border:'1px solid var(--border)', borderRadius:99, marginBottom:32,
          fontFamily:'var(--mono)', fontSize:10, letterSpacing:0.8, color:'var(--text-3)',
          textTransform:'uppercase',
        }}>
          <span style={{width:6, height:6, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 8px #22c55e'}}/>
          v0.1 · MIT · github.com/VernonOY/replicalpha
        </div>

        <h1 style={{
          fontSize:64, lineHeight:1.05, fontWeight:500, letterSpacing:-1.5,
          margin:0, marginBottom:24, color:'var(--text-1)', textWrap:'balance',
        }}>
          A timeline of every quant paper you've read,<br/>
          <span style={{color:'var(--text-3)'}}>and which ones still work.</span>
        </h1>
        <p style={{fontSize:18, color:'var(--text-2)', maxWidth:680, lineHeight:1.5, marginBottom:36}}>
          replicalpha takes a research PDF, extracts the factor, generates qtype-clean
          Python, runs a backtest, and gives you a one-line verdict: <Mono size={16} color="#22c55e">reproduced</Mono>,{' '}
          <Mono size={16} color="#eab308">weak</Mono>, or <Mono size={16} color="#ef4444">sign-flipped</Mono>.
        </p>

        {/* AI chat console */}
        <AIChatConsole onStart={onStart}/>

        {/* Sample timeline preview */}
        <div style={{
          fontFamily:'var(--mono)', fontSize:10, letterSpacing:0.8, color:'var(--text-3)',
          textTransform:'uppercase', marginBottom:14,
        }}>Public-demo timeline · {sample.length} papers across {new Set(sample.map(p=>p.family)).size} factor families</div>

        <div style={{
          background:'var(--surface-1)', border:'1px solid var(--border)', borderRadius:8,
          padding:'18px 12px 12px', position:'relative', overflow:'hidden',
        }}>
          <MiniTimeline papers={sample} families={FAMILIES} onClick={onStart}/>
        </div>

        {/* Tagline grid */}
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:24, marginTop:64,
        }}>
          <Pillar n="01" title="PDF → Factor" body="paper2alpha extracts the formula and reported metrics from any quant paper."/>
          <Pillar n="02" title="Backtest + Red Team" body="qtype-clean codegen, pandas backtest, 5-check red team: leakage, overfitting, sample concentration."/>
          <Pillar n="03" title="Personal archive" body="Every run becomes a node on your timeline. Compare claims across decades, see which factors decayed."/>
        </div>
      </div>
    </div>
  );
}

function AIChatConsole({ onStart }) {
  const [messages, setMessages] = React.useState([
    { role:'system', text:'paper2alpha assistant · ready · drop PDFs, search papers, or describe a factor in plain English' },
  ]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [drag, setDrag] = React.useState(false);
  const [files, setFiles] = React.useState([]);
  const [mode, setMode] = React.useState('auto'); // auto | search | nl2factor | compare
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  function push(m) { setMessages(ms => [...ms, m]); }
  async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  function detectMode(q) {
    if (mode !== 'auto') return mode;
    if (/compar(e|ison)|vs |对比/i.test(q)) return 'compare';
    if (/search|find|arxiv|ssrn|论文|检索/i.test(q)) return 'search';
    if (/factor|formula|momentum|reversal|rsi|skew|因子|公式/i.test(q)) return 'nl2factor';
    return 'search';
  }

  async function send(e) {
    if (e) e.preventDefault();
    const q = input.trim();
    if (!q && files.length === 0) return;
    if (busy) return;

    if (files.length > 0) {
      push({ role:'user', text: q || 'Process these papers.', attachments: files.map(f => f.name) });
      setFiles([]);
      setInput('');
      setBusy(true);
      push({ role:'system', text:`paper2alpha · extracting factor · 6-stage pipeline · ~${15+files.length*8}s` });
      await wait(700);
      push({ role:'system', text:'[parse] PDF → text · 24 pages · OCR fallback ✓' });
      await wait(500);
      push({ role:'system', text:'[extract] formula candidates: 3 · selected: ranked momentum (12-1)' });
      await wait(500);
      push({ role:'assistant', text:`Extracted ${files.length} paper${files.length>1?'s':''}. Generated factor.py + backtest.py + redteam.py for each. Run them through the timeline to see verdicts.`, action:{ label:'Open in timeline →', onClick: onStart } });
      setBusy(false);
      return;
    }

    push({ role:'user', text: q });
    setInput('');
    setBusy(true);
    const m = detectMode(q);

    if (m === 'search') {
      push({ role:'system', text:`searching arxiv · ssrn · q-fin · for "${q}"` });
      await wait(700);
      const hits = [
        { y:2024, t:'Cross-sectional skew premium revisited', a:'Chen, Zhang et al', score:0.61 },
        { y:2023, t:'Idiosyncratic volatility and the low-risk anomaly post-COVID', a:'Patel, Smith', score:0.54 },
        { y:2025, t:'Slow-decay reversal: a 5-day kernel approach', a:'Wang, Liu', score:0.47 },
      ];
      push({ role:'assistant', kind:'search-results', results: hits, q, action:{ label:'Add 3 to timeline →', onClick: onStart }});
      setBusy(false);
      return;
    }

    if (m === 'nl2factor') {
      push({ role:'system', text:`nl2factor · claude-haiku-4.5 · parsing intent` });
      await wait(600);
      let code = `# generated from: "${q}"\n@factor(name="user_factor", family="momentum")\ndef user_factor(close, volume=None, **kw):\n    """User-described factor."""\n    ret_12_1 = close.pct_change(252) - close.pct_change(21)\n    raw = ret_12_1.rank(axis=1, pct=True) * 2 - 1\n    return raw.shift(1)`;
      try {
        const llm = await Promise.race([
          window.claude.complete(`Convert this natural-language description of a quant factor into a SHORT Python function (max 12 lines, pandas, no markdown fences). Use @factor decorator. Description: "${q}"`),
          new Promise((_, rej) => setTimeout(() => rej(0), 6000)),
        ]);
        if (llm) code = llm.replace(/^```\w*\n?|```$/gm, '').trim();
      } catch (_) {}
      push({ role:'assistant', kind:'code', code, action:{ label:'Run backtest →', onClick: onStart }});
      setBusy(false);
      return;
    }

    if (m === 'compare') {
      push({ role:'system', text:`compare · scanning your archive + 3 公开研报` });
      await wait(700);
      push({ role:'assistant', kind:'compare', rows:[
        { src:'你的复现',                paper:'Jegadeesh-Titman 1993', ic:0.043, sharpe:1.3, verdict:'green' },
        { src:'GS Quant Research 2024', paper:'Jegadeesh-Titman 1993', ic:0.038, sharpe:1.1, verdict:'green' },
        { src:'JPM Equity Strategy',    paper:'Jegadeesh-Titman 1993', ic:0.029, sharpe:0.9, verdict:'yellow' },
        { src:'原文报告',                paper:'Jegadeesh-Titman 1993', ic:0.052, sharpe:1.6, verdict:'green' },
      ], action:{ label:'Open compare view →', onClick: onStart }});
      setBusy(false);
      return;
    }
  }

  function onDrop(e) {
    e.preventDefault(); setDrag(false);
    const incoming = [...e.dataTransfer.files].filter(f => /pdf$/i.test(f.name));
    setFiles(f => [...f, ...incoming.map(x => ({ name:x.name, size:x.size }))]);
  }

  return (
    <div onDragOver={e=>{e.preventDefault();setDrag(true);}}
         onDragLeave={()=>setDrag(false)}
         onDrop={onDrop}
         style={{
      border:`1px solid ${drag?'var(--accent)':'var(--border)'}`, borderRadius:8,
      background:'var(--surface-1)', marginBottom:48, overflow:'hidden',
      boxShadow: drag ? '0 0 0 4px var(--accent-dim)' : '0 1px 0 rgba(255,255,255,0.02)',
      transition:'box-shadow 120ms, border-color 120ms',
    }}>
      {/* Header */}
      <div style={{
        display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
        borderBottom:'1px solid var(--border)', background:'var(--surface-0)',
      }}>
        <span style={{
          width:18, height:18, borderRadius:4,
          background:'linear-gradient(135deg, var(--accent), #7e57c2)',
          display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11,
        }}>✦</span>
        <Mono size={11} color="var(--text-2)">paper2alpha · chat console</Mono>
        <span style={{flex:1}}/>
        {[
          { id:'auto', label:'auto'},
          { id:'search', label:'search'},
          { id:'nl2factor', label:'nl→factor'},
          { id:'compare', label:'compare'},
        ].map(t => (
          <button key={t.id} onClick={()=>setMode(t.id)} style={{
            padding:'3px 9px', borderRadius:99, border:'1px solid var(--border)',
            fontFamily:'var(--mono)', fontSize:10, letterSpacing:0.4,
            background: mode===t.id ? 'var(--accent-dim)' : 'transparent',
            color: mode===t.id ? 'var(--accent)' : 'var(--text-3)',
            cursor:'pointer', textTransform:'lowercase',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        maxHeight:340, minHeight:220, overflow:'auto', padding:'18px 18px 8px',
        display:'flex', flexDirection:'column', gap:14,
      }}>
        {messages.map((m, i) => <ChatMsg key={i} m={m}/>)}
        {busy && (
          <div style={{display:'flex', gap:8, alignItems:'center', color:'var(--text-3)'}}>
            <span className="dot-pulse" style={{
              width:6, height:6, borderRadius:'50%', background:'var(--accent)',
              boxShadow:'0 0 8px var(--accent)',
            }}/>
            <Mono size={11} color="var(--text-3)">thinking…</Mono>
          </div>
        )}
      </div>

      {/* Pending file chips */}
      {files.length > 0 && (
        <div style={{padding:'4px 14px 8px', display:'flex', gap:6, flexWrap:'wrap'}}>
          {files.map((f, i) => (
            <span key={i} style={{
              fontSize:11, fontFamily:'var(--mono)', color:'var(--text-2)',
              background:'var(--surface-2)', border:'1px solid var(--border)',
              padding:'3px 8px', borderRadius:4, display:'inline-flex', gap:6, alignItems:'center',
            }}>📄 {f.name}
              <span onClick={()=>setFiles(fs=>fs.filter((_,j)=>j!==i))} style={{cursor:'pointer', color:'var(--text-3)'}}>×</span>
            </span>
          ))}
        </div>
      )}

      {/* Composer */}
      <form onSubmit={send} style={{
        display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
        borderTop:'1px solid var(--border)', background:'var(--surface-0)',
      }}>
        <label style={{
          width:30, height:30, borderRadius:6, background:'var(--surface-2)',
          border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center',
          color:'var(--text-2)', cursor:'pointer', fontSize:14, flexShrink:0,
        }} title="Attach PDF">
          <input type="file" accept=".pdf" multiple style={{display:'none'}}
            onChange={e => setFiles(f=>[...f, ...[...e.target.files].map(x=>({name:x.name,size:x.size}))])}/>
          ↑
        </label>
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder={
            mode==='search'    ? 'find papers about cross-sectional skew premium…'
          : mode==='nl2factor' ? 'rank stocks by 12-month return minus last month, monthly rebalance'
          : mode==='compare'   ? 'compare my Jegadeesh-Titman repro to GS / JPM 研报'
          :                       'ask anything · drop a PDF · or describe a factor'
        } style={{
          flex:1, padding:'9px 12px', borderRadius:6, fontSize:13,
          background:'var(--surface-2)', color:'var(--text-1)',
          border:'1px solid var(--border)', outline:'none',
        }}/>
        <button type="submit" disabled={busy || (!input.trim() && files.length===0)} style={{
          padding:'9px 16px', borderRadius:6, fontSize:12, fontWeight:500,
          background: busy || (!input.trim() && files.length===0) ? 'var(--surface-2)' : 'var(--accent)',
          color: busy || (!input.trim() && files.length===0) ? 'var(--text-3)' : '#fff',
          border:'none', cursor: busy || (!input.trim() && files.length===0) ? 'default' : 'pointer',
          flexShrink:0,
        }}>send ↵</button>
      </form>

      {/* Hint strip */}
      <div style={{
        padding:'7px 14px', display:'flex', gap:14, flexWrap:'wrap',
        borderTop:'1px solid var(--border-soft)', background:'var(--surface-1)',
      }}>
        {[
          { icon:'↑',  label:'Drop PDF anywhere on this card' },
          { icon:'⌕', label:'AI search · arxiv / SSRN / q-fin' },
          { icon:'⌁', label:'NL → factor.py · auto-backtest' },
          { icon:'⇄', label:'Compare to GS / JPM / your archive' },
        ].map((h,i) => (
          <span key={i} style={{display:'flex', gap:6, alignItems:'center', fontSize:11, color:'var(--text-3)'}}>
            <span style={{fontFamily:'var(--mono)', color:'var(--accent)', width:10}}>{h.icon}</span>
            {h.label}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes dotpulse { 0%,100%{opacity:0.3} 50%{opacity:1} }
        .dot-pulse { animation: dotpulse 1.2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function ChatMsg({ m }) {
  if (m.role === 'system') {
    return <div style={{fontFamily:'var(--mono)', fontSize:10.5, color:'var(--text-3)', letterSpacing:0.3, paddingLeft:2}}>· {m.text}</div>;
  }
  if (m.role === 'user') {
    return (
      <div style={{display:'flex', justifyContent:'flex-end'}}>
        <div style={{
          maxWidth:'78%', padding:'9px 13px', borderRadius:'10px 10px 2px 10px',
          background:'var(--accent-dim)', border:'1px solid var(--accent)',
          color:'var(--text-1)', fontSize:13, lineHeight:1.5,
        }}>
          {m.text}
          {m.attachments && (
            <div style={{marginTop:6, display:'flex', gap:4, flexWrap:'wrap'}}>
              {m.attachments.map((a, i) => (
                <span key={i} style={{fontSize:10.5, fontFamily:'var(--mono)', color:'var(--accent)', background:'rgba(0,0,0,0.2)', padding:'2px 6px', borderRadius:3}}>📄 {a}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
  // assistant
  return (
    <div style={{display:'flex', gap:10}}>
      <span style={{
        width:22, height:22, borderRadius:5, flexShrink:0,
        background:'linear-gradient(135deg, var(--accent), #7e57c2)',
        display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11,
      }}>✦</span>
      <div style={{flex:1, minWidth:0}}>
        {m.text && <div style={{fontSize:13, color:'var(--text-1)', lineHeight:1.55, marginBottom:m.kind?8:0}}>{m.text}</div>}
        {m.kind === 'search-results' && (
          <div style={{display:'flex', flexDirection:'column', gap:6, marginBottom:8}}>
            {m.results.map((r, i) => (
              <div key={i} style={{
                display:'grid', gridTemplateColumns:'40px 1fr 60px', gap:10, alignItems:'center',
                padding:'8px 10px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:6,
              }}>
                <Mono size={10} color="var(--accent)">{r.y}</Mono>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:12.5, color:'var(--text-1)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{r.t}</div>
                  <Mono size={10} color="var(--text-3)">{r.a}</Mono>
                </div>
                <Mono size={10} color="var(--text-2)">match {r.score.toFixed(2)}</Mono>
              </div>
            ))}
          </div>
        )}
        {m.kind === 'code' && (
          <pre style={{
            margin:0, padding:'10px 12px', background:'#0d1117',
            border:'1px solid var(--border)', borderRadius:6, overflow:'auto',
            fontFamily:'var(--mono)', fontSize:11.5, lineHeight:1.55, color:'#cdd6e0',
          }}>{m.code}</pre>
        )}
        {m.kind === 'compare' && (
          <div style={{
            border:'1px solid var(--border)', borderRadius:6, overflow:'hidden', marginBottom:8,
          }}>
            <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr 70px 70px 80px', padding:'7px 10px', background:'var(--surface-2)', fontSize:10, fontFamily:'var(--mono)', color:'var(--text-3)', letterSpacing:0.5, textTransform:'uppercase'}}>
              <span>SOURCE</span><span>PAPER</span><span style={{textAlign:'right'}}>IC</span><span style={{textAlign:'right'}}>SHARPE</span><span style={{textAlign:'right'}}>VERDICT</span>
            </div>
            {m.rows.map((r, i) => {
              const c = window.VERDICT_COLORS[r.verdict];
              return (
                <div key={i} style={{display:'grid', gridTemplateColumns:'1.4fr 1fr 70px 70px 80px', padding:'7px 10px', borderTop:'1px solid var(--border-soft)', fontSize:12, alignItems:'center'}}>
                  <span style={{color:'var(--text-1)'}}>{r.src}</span>
                  <span style={{color:'var(--text-3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{r.paper}</span>
                  <Mono size={11} color="var(--text-1)">{r.ic.toFixed(3)}</Mono>
                  <Mono size={11} color="var(--text-1)">{r.sharpe.toFixed(2)}</Mono>
                  <span style={{textAlign:'right'}}><span style={{display:'inline-block', padding:'2px 8px', borderRadius:99, background:c.bg, color:c.fg, fontSize:10, fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:0.5}}>{r.verdict}</span></span>
                </div>
              );
            })}
          </div>
        )}
        {m.action && (
          <button onClick={m.action.onClick} style={{
            padding:'5px 11px', borderRadius:4, fontSize:11, fontWeight:500, fontFamily:'var(--mono)',
            background:'transparent', color:'var(--accent)', border:'1px solid var(--accent)', cursor:'pointer',
          }}>{m.action.label}</button>
        )}
      </div>
    </div>
  );
}

function Pillar({ n, title, body }) {
  return (
    <div>
      <Mono size={10} color="var(--accent)">{n}</Mono>
      <div style={{fontSize:15, fontWeight:500, color:'var(--text-1)', margin:'8px 0 6px'}}>{title}</div>
      <div style={{fontSize:13, color:'var(--text-3)', lineHeight:1.5}}>{body}</div>
    </div>
  );
}

function MiniTimeline({ papers, families, onClick }) {
  const minY = Math.min(...papers.map(p=>p.year));
  const maxY = Math.max(...papers.map(p=>p.year));
  const W = 1000, H = families.length * 36 + 24;
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} onClick={onClick} style={{cursor:'pointer'}}>
      {families.map((f, i) => (
        <g key={f.id}>
          <text x={6} y={i*36 + 22} fontSize={9} fontFamily="var(--mono)" fill="var(--text-3)" letterSpacing="0.5">{f.short}</text>
          <line x1={50} y1={i*36+18} x2={W-10} y2={i*36+18} stroke="var(--border-soft)" strokeDasharray="2 4"/>
        </g>
      ))}
      {[minY, Math.floor((minY+maxY)/2), maxY].map((y) => {
        const x = 50 + ((y - minY) / (maxY - minY)) * (W - 60);
        return <text key={y} x={x} y={H-4} fontSize={9} fontFamily="var(--mono)" fill="var(--text-3)" textAnchor="middle">{y}</text>;
      })}
      {papers.map(p => {
        const x = 50 + ((p.year + p.month/12 - minY) / (maxY - minY)) * (W - 60);
        const yi = families.findIndex(f => f.id === p.family);
        const y = yi*36 + 18;
        const c = window.VERDICT_COLORS[p.verdict];
        return (
          <g key={p.id}>
            <circle cx={x} cy={y} r={4 + p.influence} fill={c.fill} fillOpacity={0.85} stroke={c.fill}/>
          </g>
        );
      })}
    </svg>
  );
}

// ── /factors ─────────────────────────────────────────────────────
function Factors({ onOpenRun }) {
  const [lang] = window.useLang ? window.useLang() : [window.__lang || 'zh'];
  const PAPERS = window.PAPERS;
  const FAMILIES = window.FACTOR_FAMILIES;
  const [expanded, setExpanded] = React.useState(null);

  return (
    <div style={{padding:'24px 32px', overflow:'auto', height:'100%'}}>
      <div style={{display:'flex', alignItems:'baseline', gap:16, marginBottom:24}}>
        <h2 style={{fontSize:22, fontWeight:500, color:'var(--text-1)', margin:0}}>{window.t("factors.title")}</h2>
        <Mono size={11} color="var(--text-3)">{window.t("factors.subtitle")}</Mono>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:16}}>
        {FAMILIES.map(f => {
          const papers = PAPERS.filter(p => p.family === f.id);
          if (!papers.length) return null;
          const claim = papers.reduce((s,p)=>s+p.ic_paper,0)/papers.length;
          const repro = papers.reduce((s,p)=>s+p.ic_repro,0)/papers.length;
          const reproduced = papers.filter(p=>p.verdict==='green').length;
          const flips = papers.filter(p=>p.sign_flip).length;
          const isExp = expanded === f.id;
          return (
            <div key={f.id} style={{
              background:'var(--surface-1)', border:'1px solid var(--border)',
              borderRadius:6, padding:18, position:'relative',
            }}>
              <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12}}>
                <div>
                  <div style={{fontSize:16, fontWeight:500, color:'var(--text-1)', marginBottom:4}}>{f.label}</div>
                  <Mono size={10} color="var(--text-3)">{f.short} · {papers.length} papers</Mono>
                </div>
                <div style={{display:'flex', gap:10, fontFamily:'var(--mono)', fontSize:10}}>
                  <span style={{color:'#22c55e'}}>{reproduced} ✓</span>
                  <span style={{color:'#ef4444'}}>{flips} ↯</span>
                </div>
              </div>

              {/* Claimed vs reproduced bars */}
              <div style={{display:'grid', gridTemplateColumns:'80px 1fr 60px', gap:10, fontSize:11, marginBottom:8, alignItems:'center'}}>
                <Mono size={10} color="var(--text-3)">{window.t("factors.claimed")}</Mono>
                <div style={{height:6, background:'var(--surface-2)', borderRadius:3, overflow:'hidden'}}>
                  <div style={{
                    width: `${Math.min(100, Math.abs(claim) * 1500)}%`, height:'100%',
                    background: claim >= 0 ? 'var(--text-2)' : '#ef4444',
                  }}/>
                </div>
                <Mono size={11} color="var(--text-2)">{fmt.ic(claim)}</Mono>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'80px 1fr 60px', gap:10, fontSize:11, marginBottom:14, alignItems:'center'}}>
                <Mono size={10} color="var(--text-3)">{window.t("factors.repro")}</Mono>
                <div style={{height:6, background:'var(--surface-2)', borderRadius:3, overflow:'hidden'}}>
                  <div style={{
                    width: `${Math.min(100, Math.abs(repro) * 1500)}%`, height:'100%',
                    background: repro >= 0 ? 'var(--accent)' : '#ef4444',
                  }}/>
                </div>
                <Mono size={11} color={repro >= 0 ? 'var(--accent)' : '#ef4444'}>{fmt.ic(repro)}</Mono>
              </div>

              <div style={{
                fontSize:11, color:'var(--text-3)', lineHeight:1.5, padding:'10px 12px',
                background:'var(--surface-0)', borderLeft:'2px solid var(--accent)', borderRadius:'0 3px 3px 0',
                marginBottom:12,
              }}>
                {flips > 0
                  ? `${flips} of ${papers.length} papers in this family sign-flipped on later periods. Effect appears to have decayed post-publication.`
                  : reproduced === papers.length
                  ? `All ${papers.length} papers reproduce. Robust factor family.`
                  : `${reproduced} of ${papers.length} reproduce; magnitude attenuates ~${((1 - repro/claim)*100).toFixed(0)}% from claim to reproduction.`}
              </div>

              <button onClick={()=>setExpanded(isExp ? null : f.id)} style={{
                background:'transparent', border:'none', color:'var(--accent)',
                fontSize:11, fontFamily:'var(--mono)', cursor:'pointer', padding:0,
                display:'flex', alignItems:'center', gap:6,
              }}>
                <Chevron dir={isExp ? 'down' : 'right'} size={10}/> {window.t("factors.see_papers").replace("{n}", papers.length)}
              </button>

              {isExp && (
                <div style={{marginTop:12, borderTop:'1px solid var(--border-soft)', paddingTop:10}}>
                  {papers.map(p => (
                    <div key={p.id} onClick={()=>onOpenRun(p.id)} style={{
                      display:'grid', gridTemplateColumns:'24px 1fr 60px 60px',
                      gap:10, padding:'6px 0', cursor:'pointer', alignItems:'center',
                      borderBottom:'1px solid var(--border-soft)', fontSize:11,
                    }}>
                      <VerdictDot v={p.verdict}/>
                      <div style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text-2)'}}>
                        <span style={{color:'var(--text-1)'}}>{p.authors}</span> ({p.year})
                      </div>
                      <Mono size={10} color="var(--text-3)">{fmt.ic(p.ic_paper)}</Mono>
                      <Mono size={10} color={p.sign_flip?'#ef4444':'var(--text-1)'}>{fmt.ic(p.ic_repro)}</Mono>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── /library ─────────────────────────────────────────────────────
function Library({ onOpenRun }) {
  const [lang] = window.useLang ? window.useLang() : [window.__lang || 'zh'];
  const [sort, setSort] = React.useState('year_desc');
  const [search, setSearch] = React.useState('');
  const PAPERS = window.PAPERS;

  const rows = React.useMemo(() => {
    let r = PAPERS.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.authors.toLowerCase().includes(search.toLowerCase()));
    const cmp = {
      year_desc: (a,b) => (b.year - a.year),
      year_asc:  (a,b) => (a.year - b.year),
      score_desc:(a,b) => (b.score - a.score),
      score_asc: (a,b) => (a.score - b.score),
      ic_desc:   (a,b) => Math.abs(b.ic_repro) - Math.abs(a.ic_repro),
    }[sort];
    return r.sort(cmp);
  }, [sort, search]);

  return (
    <div style={{padding:'18px 0', overflow:'auto', height:'100%'}}>
      <div style={{padding:'0 32px', display:'flex', alignItems:'center', gap:16, marginBottom:14}}>
        <h2 style={{fontSize:22, fontWeight:500, color:'var(--text-1)', margin:0}}>{window.t("library.title")}</h2>
        <Mono size={11} color="var(--text-3)">{rows.length} papers</Mono>
        <div style={{flex:1}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={window.t("library.search_placeholder")}
          style={{background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:4, padding:'6px 10px', fontSize:12, color:'var(--text-1)', width:240}}/>
        <select value={sort} onChange={e=>setSort(e.target.value)} style={{
          background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:4,
          padding:'6px 10px', fontSize:12, color:'var(--text-1)', fontFamily:'var(--mono)',
        }}>
          <option value="year_desc">{window.t("library.sort.year_desc")}</option>
          <option value="year_asc">{window.t("library.sort.year_asc")}</option>
          <option value="score_desc">{window.t("library.sort.score_desc")}</option>
          <option value="score_asc">{window.t("library.sort.score_asc")}</option>
          <option value="ic_desc">{window.t("library.sort.ic_desc")}</option>
        </select>
      </div>

      <table style={{width:'100%', fontSize:12, borderCollapse:'collapse'}}>
        <thead>
          <tr style={{
            color:'var(--text-3)', fontFamily:'var(--mono)', fontSize:10, letterSpacing:0.5,
            textTransform:'uppercase', background:'var(--surface-1)',
          }}>
            <th style={th()}></th>
            <th style={th('left')}>{window.t("library.col.title")}</th>
            <th style={th()}>{window.t("library.col.family")}</th>
            <th style={th()}>{window.t("library.col.year")}</th>
            <th style={th('right')}>{window.t("library.col.claim_ic")}</th>
            <th style={th('right')}>{window.t("library.col.repro_ic")}</th>
            <th style={th('right')}>{window.t("library.col.cumret")}</th>
            <th style={th('right')}>{window.t("library.col.sharpe")}</th>
            <th style={th('right')}>{window.t("library.col.score")}</th>
            <th style={th()}>{window.t("library.col.verdict_col")}</th>
            <th style={th()}>{window.t("library.col.stars")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(p => (
            <tr key={p.id} onClick={()=>onOpenRun(p.id)} style={{cursor:'pointer'}}
              onMouseEnter={e=>e.currentTarget.style.background='var(--surface-1)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <td style={td()}><VerdictDot v={p.verdict}/></td>
              <td style={td('left')}>
                <div style={{color:'var(--text-1)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', maxWidth:420, whiteSpace:'nowrap'}}>{p.title}</div>
                <div style={{color:'var(--text-3)', fontSize:11}}>{p.authors}</div>
              </td>
              <td style={td()}><FamilyChip family={p.family}/></td>
              <td style={td('right', true)}>{p.year}</td>
              <td style={td('right', true)}>{fmt.ic(p.ic_paper)}</td>
              <td style={{...td('right', true), color: p.sign_flip ? '#ef4444' : 'var(--text-1)'}}>{fmt.ic(p.ic_repro)}</td>
              <td style={td('right', true)}>{fmt.pct(p.cumret)}</td>
              <td style={td('right', true)}>{fmt.sharpe(p.sharpe)}</td>
              <td style={{...td('right', true), color: VERDICT_COLORS[p.verdict].fill}}>{fmt.score(p.score)}</td>
              <td style={td()}><VerdictBadge v={p.verdict} sign_flip={p.sign_flip}/></td>
              <td style={td()}><Stars n={p.influence} size={7}/></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function th(align='center') {
  return { textAlign: align, padding:'8px 12px', borderBottom:'1px solid var(--border)' };
}
function td(align='center', mono=false) {
  return { textAlign: align, padding:'10px 12px',
           borderBottom:'1px solid var(--border-soft)',
           fontFamily: mono ? 'var(--mono)' : 'var(--sans)',
           color:'var(--text-2)', fontSize: mono ? 11 : 12 };
}

// ── /upload (queue) ──────────────────────────────────────────────
function Upload({ onOpenRun }) {
  const [lang] = window.useLang ? window.useLang() : [window.__lang || 'zh'];
  const [queue, setQueue] = React.useState([
    { id:'r-q1', name: 'jegadeesh_titman_1993_winners_losers.pdf',  size:'1.4 MB', stage: 5, t: 32 },
    { id:'r-q2', name: 'novy_marx_2012_intermediate_momentum.pdf',  size:'2.1 MB', stage: 3, t: 14 },
    { id:'r-q3', name: 'liu_lu_2024_post_pub_decay_csi500.pdf',     size:'0.9 MB', stage: 1, t: 4 },
    { id:'r-q4', name: 'asness_value_momentum_everywhere.pdf',      size:'3.2 MB', stage: 0, t: 0 },
  ]);
  React.useEffect(() => {
    const t = setInterval(() => {
      setQueue(q => q.map(item => item.stage < 6 ? {...item, stage: item.stage + (Math.random()<0.3?1:0), t: item.t+1} : item));
    }, 800);
    return () => clearInterval(t);
  }, []);

  const STAGES = ['Extract','Codegen','Lint','Backtest','Red Team','Score','Done'];

  return (
    <div style={{padding:'24px 32px', overflow:'auto', height:'100%'}}>
      <h2 style={{fontSize:22, fontWeight:500, color:'var(--text-1)', margin:0, marginBottom:6}}>{window.t("upload.title")}</h2>
      <Mono size={11} color="var(--text-3)">4 {window.t("upload.subtitle")} · est. 32s remaining</Mono>

      <div style={{
        marginTop:18, padding:24, border:'1px dashed var(--border)', borderRadius:8,
        background:'var(--surface-1)', display:'flex', alignItems:'center', gap:18,
      }}>
        <div style={{
          width:48, height:48, borderRadius:6, background:'var(--accent-dim)',
          color:'var(--accent)', fontSize:22, display:'flex', alignItems:'center',
          justifyContent:'center', border:'1px solid var(--accent)',
        }}>↑</div>
        <div style={{flex:1}}>
          <div style={{fontSize:14, color:'var(--text-1)', marginBottom:2}}>{window.t("upload.drop_zone")}</div>
          <Mono size={11} color="var(--text-3)">{window.t("upload.drop_hint")}</Mono>
        </div>
        <button style={{padding:'8px 14px', borderRadius:4, fontSize:12, background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer'}}>{window.t("upload.browse")}</button>
      </div>

      <div style={{marginTop:24}}>
        {queue.map(item => (
          <div key={item.id} style={{
            padding:'14px 18px', marginBottom:8, borderRadius:6,
            background:'var(--surface-1)', border:'1px solid var(--border)',
          }}>
            <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:10}}>
              <Mono size={12} color="var(--text-1)">{item.name}</Mono>
              <Mono size={10} color="var(--text-3)">{item.size}</Mono>
              <div style={{flex:1}}/>
              <Mono size={10} color={item.stage>=6?'#22c55e':'var(--accent)'}>
                {item.stage>=6 ? '✓ DONE' : `${STAGES[item.stage]}…`}
              </Mono>
              <Mono size={10} color="var(--text-3)">{item.t}s</Mono>
              {item.stage>=6
                ? <button onClick={()=>onOpenRun('r-jt1993')} style={{padding:'4px 10px', borderRadius:3, fontSize:10, background:'var(--accent-dim)', color:'var(--accent)', border:'1px solid var(--accent)', cursor:'pointer'}}>{window.t("upload.open")}</button>
                : <button style={{padding:'4px 10px', borderRadius:3, fontSize:10, background:'transparent', color:'var(--text-3)', border:'1px solid var(--border)', cursor:'pointer'}}>{window.t("upload.cancel")}</button>}
            </div>
            <div style={{display:'flex', gap:4}}>
              {STAGES.slice(0,6).map((s, i) => (
                <div key={s} style={{
                  flex:1, height:4, borderRadius:2,
                  background: i < item.stage ? '#22c55e' : i === item.stage ? 'var(--accent)' : 'var(--surface-2)',
                }}/>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── /compare ─────────────────────────────────────────────────────
function Compare({ ids, onOpenRun }) {
  const [lang] = window.useLang ? window.useLang() : [window.__lang || 'zh'];
  const PAPERS = window.PAPERS;
  const papers = ids.map(id => PAPERS.find(p => p.id === id)).filter(Boolean).slice(0, 3);
  if (!papers.length) return <div style={{padding:32, color:'var(--text-3)'}}>No papers selected.</div>;

  const rows = [
    ['title', p => <span style={{color:'var(--text-1)'}}>{p.title}</span>],
    ['authors', p => <Mono color="var(--text-2)">{p.authors}</Mono>],
    ['year', p => <Mono color="var(--text-2)">{p.year}</Mono>],
    ['family', p => <FamilyChip family={p.family}/>],
    ['factor', p => <Mono size={11} color="var(--accent)">{p.factor}</Mono>],
    ['formula', p => <Mono size={10} color="var(--text-2)">{p.formula}</Mono>],
    ['period (paper)', p => <Mono size={11} color="var(--text-2)">{p.period_paper}</Mono>],
    ['period (repro)', p => <Mono size={11} color="var(--text-2)">{p.period_repro}</Mono>],
    ['claimed IC', p => <Mono color="var(--text-2)">{fmt.ic(p.ic_paper)}</Mono>],
    ['reproduced IC', p => <Mono color={VERDICT_COLORS[p.verdict].fill}>{fmt.ic(p.ic_repro)}</Mono>],
    ['cumret', p => <Mono color="var(--text-2)">{fmt.pct(p.cumret)}</Mono>],
    ['Sharpe', p => <Mono color="var(--text-2)">{fmt.sharpe(p.sharpe)}</Mono>],
    ['verdict', p => <VerdictBadge v={p.verdict} sign_flip={p.sign_flip}/>],
    ['red team', p => <Mono color={p.redteam.length?'#eab308':'#22c55e'}>{p.redteam.length} finding{p.redteam.length===1?'':'s'}</Mono>],
  ];

  return (
    <div style={{padding:'24px 32px', overflow:'auto', height:'100%'}}>
      <h2 style={{fontSize:22, fontWeight:500, color:'var(--text-1)', margin:0, marginBottom:6}}>{window.t("compare.title")}</h2>
      <Mono size={11} color="var(--text-3)">{papers.length} papers · /compare?ids={ids.join(',')}</Mono>

      <table style={{marginTop:24, width:'100%', borderCollapse:'collapse', tableLayout:'fixed'}}>
        <thead>
          <tr>
            <th style={{...th('left'), width:160}}/>
            {papers.map(p => (
              <th key={p.id} style={{...th('left'), padding:'14px 16px'}}>
                <div onClick={()=>onOpenRun(p.id)} style={{cursor:'pointer'}}>
                  <Mono size={10} color="var(--text-3)">{p.id}</Mono>
                  <div style={{fontSize:13, color:'var(--text-1)', marginTop:4, lineHeight:1.3}}>{p.title.slice(0, 60)}{p.title.length>60?'…':''}</div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, f]) => (
            <tr key={k}>
              <td style={{...td('left'), color:'var(--text-3)', fontFamily:'var(--mono)', fontSize:10, letterSpacing:0.5, textTransform:'uppercase'}}>{k}</td>
              {papers.map(p => (
                <td key={p.id} style={{...td('left'), padding:'10px 16px', verticalAlign:'top'}}>{f(p)}</td>
              ))}
            </tr>
          ))}
          <tr>
            <td style={{...td('left'), color:'var(--text-3)', fontFamily:'var(--mono)', fontSize:10, letterSpacing:0.5, textTransform:'uppercase'}}>cumret series</td>
            {papers.map(p => (
              <td key={p.id} style={{...td('left'), padding:'10px 16px'}}>
                <Spark data={p.spark} w={260} h={64} color="auto"/>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Overlay chart */}
      <div style={{marginTop:32}}>
        <div style={{fontFamily:'var(--mono)', fontSize:10, letterSpacing:0.8, textTransform:'uppercase', color:'var(--text-3)', marginBottom:10}}>
          {window.t("compare.overlay")}
        </div>
        <div style={{padding:18, background:'var(--surface-1)', border:'1px solid var(--border)', borderRadius:6}}>
          <OverlayChart papers={papers}/>
        </div>
      </div>
    </div>
  );
}

function OverlayChart({ papers }) {
  const W = 900, H = 220, P = 30;
  const allMin = Math.min(...papers.flatMap(p => p.spark));
  const allMax = Math.max(...papers.flatMap(p => p.spark));
  const span = (allMax - allMin) || 1;
  const colors = ['#1976d2', '#22c55e', '#eab308'];
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {/* zero line */}
      <line x1={P} y1={H - P - ((-allMin)/span)*(H-2*P)} x2={W-P} y2={H - P - ((-allMin)/span)*(H-2*P)} stroke="var(--border)" strokeDasharray="2 4"/>
      {[0, 0.5, 1].map(t => (
        <line key={t} x1={P + t*(W-2*P)} y1={P} x2={P + t*(W-2*P)} y2={H-P} stroke="var(--border-soft)" strokeDasharray="1 4"/>
      ))}
      {papers.map((p, i) => {
        const c = colors[i];
        const len = p.spark.length;
        const d = p.spark.map((v, j) => {
          const x = P + (j / (len - 1)) * (W - 2*P);
          const y = H - P - ((v - allMin) / span) * (H - 2*P);
          return `${j===0?'M':'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
        return <path key={p.id} d={d} stroke={c} strokeWidth={1.5} fill="none"/>;
      })}
      {papers.map((p, i) => (
        <g key={p.id} transform={`translate(${P + 8 + i*220}, ${P + 8})`}>
          <rect width={10} height={10} fill={colors[i]} rx={2}/>
          <text x={16} y={9} fontSize={10} fill="var(--text-2)" fontFamily="var(--mono)">{p.authors.split(',')[0]} {p.year}</text>
        </g>
      ))}
    </svg>
  );
}

Object.assign(window, { Landing, Factors, Library, Upload, Compare });

// ===== api.jsx =====
// API client for replicalpha FastAPI backend.
// Single source of truth for the backend base URL — set window.__API_BASE before
// the bundle loads to override the default localhost target.

const API_BASE = window.__API_BASE || 'http://localhost:8000';

async function _json(path, init) {
  const res = await fetch(API_BASE + path, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0,200)}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return res.json();
}

window.api = {
  base: API_BASE,
  // runs
  listRuns: () => _json('/runs'),
  getRun: (id) => _json(`/runs/${encodeURIComponent(id)}`),
  // analysis artifacts (GET → 404 if not yet computed)
  getAnalysis: (id) => _json(`/runs/${encodeURIComponent(id)}/analysis`),
  getAttribution: (id) => _json(`/runs/${encodeURIComponent(id)}/attribution`),
  getRobustness: (id) => _json(`/runs/${encodeURIComponent(id)}/robustness`),
  // compute (POST → triggers tool, returns result)
  computeAnalysis: (id) => _json(`/runs/${encodeURIComponent(id)}/analysis/compute`, {method:'POST'}),
  computeAttribution: (id) => _json(`/runs/${encodeURIComponent(id)}/attribution/compute`, {method:'POST'}),
  computeRobustness: (id) => _json(`/runs/${encodeURIComponent(id)}/robustness/compute`, {method:'POST'}),
  // agent (used by Part 2 — POST /agent/chat is SSE, handled by chat component directly)
  getTools: () => _json('/agent/tools'),
  getSession: (sid) => _json(`/agent/chat/${encodeURIComponent(sid)}`),
  cancelSession: (sid) => fetch(API_BASE + `/agent/chat/${encodeURIComponent(sid)}/cancel`, {method:'POST'}),
};

// ===== analysis.jsx =====
// Analysis page — wired to /runs/{id}/analysis | /attribution | /robustness
// Single page · 6 sections · pure inline SVG charts · no chart lib.
// Component is attached to window.AnalysisPage and rendered by app.jsx router.

const { useState: useStateAn, useEffect: useEffectAn, useRef: useRefAn, useMemo: useMemoAn } = React;

// ------------------------------ i18n helper ------------------------------

// fallback strings dictionary — used when window.t doesn't have the key yet
const ANALYSIS_FALLBACK = {
  en: {
    'analysis.title': 'Factor analysis',
    'analysis.crumb': 'factor analysis',
    'analysis.section.ic': 'IC analysis',
    'analysis.section.quintiles': 'Quintile decomposition',
    'analysis.section.decay': 'Decay structure',
    'analysis.section.attribution': 'Risk attribution',
    'analysis.section.turnover': 'Turnover & capacity',
    'analysis.section.robustness': 'Robustness',
    'analysis.ic_mean': 'IC mean',
    'analysis.ic_std': 'IC std',
    'analysis.ir': 'IR',
    'analysis.t_stat': 't-stat',
    'analysis.p_value': 'p-value',
    'analysis.ic_series': 'IC time series',
    'analysis.ic_dist': 'IC distribution',
    'analysis.ic_acf': 'IC autocorrelation',
    'analysis.quintile_bars': 'Quintile mean returns (annualized)',
    'analysis.monotonicity': 'Monotonicity',
    'analysis.long_short': 'Long-short spread',
    'analysis.cum_quintile': 'Cumulative returns by quintile',
    'analysis.fwd_ic': 'Forward IC by horizon',
    'analysis.rolling_ic': '30-day rolling IC + cumulative IC',
    'analysis.style_beta': 'Style β (FF5 + UMD)',
    'analysis.sector': 'Sector exposure',
    'analysis.idio_alpha': 'Idiosyncratic α',
    'analysis.rolling_beta': 'Rolling 1-year style β',
    'analysis.turnover': 'Daily turnover',
    'analysis.turnover_dist': 'Turnover distribution',
    'analysis.capacity': 'Capacity curve',
    'analysis.subperiod_ic': 'Subperiod IC',
    'analysis.regime': 'Regime split',
    'analysis.bootstrap': 'Bootstrap 95% CI',
    'analysis.universe_split': 'Universe split',
    'analysis.compute_cta': 'Compute analysis',
    'analysis.compute_attr_cta': 'Compute attribution',
    'analysis.compute_rob_cta': 'Compute robustness',
    'analysis.computing': 'Computing…',
    'analysis.empty_section': 'Not yet computed.',
    'analysis.error': 'Failed to compute',
    'analysis.retry': 'Retry',
    'analysis.rerun': 'Re-run analysis',
    'analysis.open_agent': 'Open in agent',
    'analysis.back': '← back',
    'analysis.loading': 'Loading…',
    'analysis.no_data': 'No data',
  },
  zh: {
    'analysis.title': '因子分析',
    'analysis.crumb': '因子分析',
    'analysis.section.ic': 'IC 分析',
    'analysis.section.quintiles': '分位数分解',
    'analysis.section.decay': '衰减结构',
    'analysis.section.attribution': '风险归因',
    'analysis.section.turnover': '换手与容量',
    'analysis.section.robustness': '稳健性',
    'analysis.ic_mean': 'IC 均值',
    'analysis.ic_std': 'IC 标准差',
    'analysis.ir': 'IR',
    'analysis.t_stat': 't 值',
    'analysis.p_value': 'p 值',
    'analysis.ic_series': 'IC 时间序列',
    'analysis.ic_dist': 'IC 分布',
    'analysis.ic_acf': 'IC 自相关',
    'analysis.quintile_bars': '分位组合年化收益',
    'analysis.monotonicity': '单调性',
    'analysis.long_short': '多空价差',
    'analysis.cum_quintile': '分位累计收益',
    'analysis.fwd_ic': '前瞻 IC',
    'analysis.rolling_ic': '30 日滚动 IC + 累计 IC',
    'analysis.style_beta': '风格暴露 (FF5+UMD)',
    'analysis.sector': '行业暴露',
    'analysis.idio_alpha': '特质 alpha',
    'analysis.rolling_beta': '滚动 1 年风格暴露',
    'analysis.turnover': '日度换手率',
    'analysis.turnover_dist': '换手分布',
    'analysis.capacity': '容量曲线',
    'analysis.subperiod_ic': '子区间 IC',
    'analysis.regime': '牛熊分组',
    'analysis.bootstrap': '自助 95% 置信区间',
    'analysis.universe_split': '市值分组',
    'analysis.compute_cta': '计算因子分析',
    'analysis.compute_attr_cta': '计算风险归因',
    'analysis.compute_rob_cta': '计算稳健性',
    'analysis.computing': '计算中…',
    'analysis.empty_section': '尚未计算。',
    'analysis.error': '计算失败',
    'analysis.retry': '重试',
    'analysis.rerun': '重新分析',
    'analysis.open_agent': '在 agent 中打开',
    'analysis.back': '← 返回',
    'analysis.loading': '加载中…',
    'analysis.no_data': '无数据',
  },
};

function tA(key, fallback) {
  // Prefer window.t (real i18n); else fall back to local dict; else fallback arg.
  if (typeof window.t === 'function') {
    const v = window.t(key, null);
    if (v && v !== key) return v;
  }
  const lang = window.__lang || 'zh';
  return (ANALYSIS_FALLBACK[lang] && ANALYSIS_FALLBACK[lang][key]) ||
         ANALYSIS_FALLBACK.en[key] ||
         fallback || key;
}

// ------------------------------ formatters ------------------------------

function fmtIC(v) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return (v >= 0 ? '+' : '') + Number(v).toFixed(4);
}
function fmtPct(v, dp = 2) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return (v >= 0 ? '+' : '') + (Number(v) * 100).toFixed(dp) + '%';
}
function fmtNum(v, dp = 3) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return Number(v).toFixed(dp);
}
function fmtSigned(v, dp = 2) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return (v >= 0 ? '+' : '') + Number(v).toFixed(dp);
}

// t-stat color: green ≥2, yellow 1..2, red <1
function tColor(t) {
  if (t === null || t === undefined || isNaN(t)) return 'var(--text-3)';
  const a = Math.abs(t);
  if (a >= 2) return '#22c55e';
  if (a >= 1) return '#eab308';
  return '#ef4444';
}

// ------------------------------ shared atoms ------------------------------

function MonoA({ children, size = 11, color = 'var(--text-2)', style = {} }) {
  return (
    <span style={{ fontFamily: 'var(--mono)', fontSize: size, color, letterSpacing: 0.3, ...style }}>
      {children}
    </span>
  );
}

function Card({ title, hint, children, full, half, third, style = {} }) {
  return (
    <div style={{
      background: 'var(--surface-1)', border: '1px solid var(--border)',
      borderRadius: 6, padding: 14, display: 'flex', flexDirection: 'column',
      minWidth: 0, ...style,
    }}>
      {title && (
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10}}>
          <MonoA size={11} color="var(--text-1)" style={{letterSpacing:0.4, textTransform:'uppercase', fontWeight:600}}>{title}</MonoA>
          {hint && <MonoA size={9} color="var(--text-3)">{hint}</MonoA>}
        </div>
      )}
      <div style={{flex:1, minWidth:0}}>{children}</div>
    </div>
  );
}

function Pill({ kind, children }) {
  // kind: 'green' | 'yellow' | 'red' | 'neutral'
  const map = {
    green: { bg: 'rgba(34,197,94,0.12)', fg: '#22c55e', bd: '#22c55e66' },
    yellow: { bg: 'rgba(234,179,8,0.12)', fg: '#eab308', bd: '#eab30866' },
    red: { bg: 'rgba(239,68,68,0.12)', fg: '#ef4444', bd: '#ef444466' },
    neutral: { bg: 'var(--surface-2)', fg: 'var(--text-2)', bd: 'var(--border)' },
  };
  const c = map[kind] || map.neutral;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding:'3px 8px', borderRadius:99, fontFamily:'var(--mono)',
      fontSize: 10, letterSpacing: 0.5, fontWeight: 600,
      background: c.bg, color: c.fg, border: `1px solid ${c.bd}`,
    }}>{children}</span>
  );
}

function EmptyState({ title, message, ctaLabel, onCta, computing, error }) {
  return (
    <div style={{
      padding: '36px 20px', textAlign:'center',
      border: '1px dashed var(--border)', borderRadius: 6,
      background: 'var(--surface-1)',
    }}>
      <div style={{fontSize:14, color:'var(--text-1)', marginBottom:6}}>{title}</div>
      {message && <div style={{fontSize:12, color:'var(--text-3)', marginBottom:14}}>{message}</div>}
      {error && <div style={{fontSize:12, color:'#ef4444', marginBottom:14, fontFamily:'var(--mono)'}}>{String(error).slice(0,260)}</div>}
      {ctaLabel && (
        <button onClick={onCta} disabled={computing} style={{
          padding:'7px 14px', fontSize:12, fontFamily:'var(--mono)',
          background: computing ? 'var(--surface-2)' : 'var(--accent)',
          color: computing ? 'var(--text-3)' : '#fff',
          border:'none', borderRadius:4, cursor: computing ? 'wait' : 'pointer',
        }}>{computing ? tA('analysis.computing','Computing…') : ctaLabel}</button>
      )}
    </div>
  );
}

// ------------------------------ chart primitives ------------------------------

// Polyline / area line chart with optional second trace (smoothed).
function LineChart({ series, smoothed, w = 360, h = 140, ymin, ymax, baseline = 0, bands, color = 'var(--accent)' }) {
  if (!series || series.length === 0) {
    return <NoData w={w} h={h}/>;
  }
  const pad = { l: 30, r: 8, t: 6, b: 18 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const xs = series.map((_, i) => i);
  const ys = series.map(p => p.y);
  const yLo = ymin !== undefined ? ymin : Math.min(0, ...ys);
  const yHi = ymax !== undefined ? ymax : Math.max(0, ...ys);
  const span = Math.max(1e-9, yHi - yLo);
  const nx = xs.length - 1 || 1;
  const X = i => pad.l + (i / nx) * iw;
  const Y = v => pad.t + (1 - (v - yLo) / span) * ih;
  const path = series.map((p, i) => `${i === 0 ? 'M' : 'L'}${X(i)},${Y(p.y)}`).join(' ');
  const smoothPath = smoothed && smoothed.length
    ? smoothed.map((p, i) => `${i === 0 ? 'M' : 'L'}${X(i)},${Y(p.y)}`).join(' ')
    : null;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{display:'block'}}>
      {/* gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <line key={t} x1={pad.l} x2={pad.l + iw} y1={pad.t + t * ih} y2={pad.t + t * ih}
          stroke="currentColor" strokeOpacity={0.08} strokeWidth={1}/>
      ))}
      {/* baseline */}
      {yLo <= baseline && baseline <= yHi && (
        <line x1={pad.l} x2={pad.l + iw} y1={Y(baseline)} y2={Y(baseline)} stroke="var(--text-3)" strokeWidth={0.6} strokeDasharray="2 3"/>
      )}
      {/* bands */}
      {bands && bands.map((b, i) => (yLo <= b && b <= yHi) && (
        <line key={i} x1={pad.l} x2={pad.l + iw} y1={Y(b)} y2={Y(b)} stroke="var(--text-3)" strokeOpacity={0.4} strokeWidth={0.6} strokeDasharray="3 2"/>
      ))}
      {/* raw line, faint */}
      <path d={path} fill="none" stroke={color} strokeWidth={1} opacity={smoothPath ? 0.35 : 0.95}/>
      {/* smoothed overlay */}
      {smoothPath && <path d={smoothPath} fill="none" stroke={color} strokeWidth={1.6}/>}
      {/* y axis labels */}
      <text x={4} y={pad.t + 4} fontSize={9} fontFamily="var(--mono)" fill="var(--text-3)">{yHi.toFixed(2)}</text>
      <text x={4} y={pad.t + ih} fontSize={9} fontFamily="var(--mono)" fill="var(--text-3)">{yLo.toFixed(2)}</text>
    </svg>
  );
}

function NoData({ w = 360, h = 140 }) {
  return (
    <div style={{
      width:'100%', height:h, display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--surface-2)', border:'1px dashed var(--border)', borderRadius:4,
    }}>
      <MonoA size={10} color="var(--text-3)">{tA('analysis.no_data','No data')}</MonoA>
    </div>
  );
}

function BarChart({ data, w = 360, h = 160, valueKey = 'value', labelKey = 'label', tKey = 'tStat', annotateAbove, color }) {
  if (!data || data.length === 0) return <NoData w={w} h={h}/>;
  const pad = { l: 28, r: 8, t: 18, b: 24 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const ys = data.map(d => d[valueKey] || 0);
  const yMax = Math.max(0, ...ys, 0.0001);
  const yMin = Math.min(0, ...ys);
  const span = Math.max(1e-9, yMax - yMin);
  const Y = v => pad.t + (1 - (v - yMin) / span) * ih;
  const bw = iw / data.length * 0.7;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{display:'block'}}>
      {/* zero line */}
      {yMin <= 0 && 0 <= yMax && <line x1={pad.l} x2={pad.l + iw} y1={Y(0)} y2={Y(0)} stroke="var(--text-3)" strokeWidth={0.6}/>}
      {data.map((d, i) => {
        const v = d[valueKey] || 0;
        const xC = pad.l + (i + 0.5) * (iw / data.length);
        const yT = Y(Math.max(0, v));
        const yB = Y(Math.min(0, v));
        const fill = color || (v >= 0 ? 'var(--accent)' : '#ef4444');
        const tval = d[tKey];
        return (
          <g key={i}>
            <rect x={xC - bw/2} y={yT} width={bw} height={Math.max(1, yB - yT)} fill={fill} opacity={0.85}/>
            {annotateAbove && tval !== undefined && tval !== null && (
              <text x={xC} y={Math.max(10, yT - 4)} fontSize={9} textAnchor="middle"
                fontFamily="var(--mono)" fill={tColor(tval)}>t={fmtSigned(tval, 2)}</text>
            )}
            <text x={xC} y={pad.t + ih + 12} fontSize={10} textAnchor="middle"
              fontFamily="var(--mono)" fill="var(--text-3)">{d[labelKey]}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Histogram({ values, bins = 25, w = 360, h = 140, color = 'var(--accent)', meanLine }) {
  if (!values || values.length === 0) return <NoData w={w} h={h}/>;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const step = (hi - lo) / bins || 1;
  const counts = Array(bins).fill(0);
  for (const v of values) {
    let idx = Math.floor((v - lo) / step);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    counts[idx] += 1;
  }
  const cMax = Math.max(...counts) || 1;
  const pad = { l: 24, r: 8, t: 6, b: 18 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const bw = iw / bins;
  const xVal = v => pad.l + ((v - lo) / (hi - lo || 1)) * iw;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{display:'block'}}>
      {counts.map((c, i) => {
        const x = pad.l + i * bw;
        const bh = (c / cMax) * ih;
        return <rect key={i} x={x + 0.5} y={pad.t + ih - bh} width={Math.max(1, bw - 1)} height={bh} fill={color} opacity={0.6}/>;
      })}
      {/* zero line */}
      {lo <= 0 && hi >= 0 && (
        <line x1={xVal(0)} x2={xVal(0)} y1={pad.t} y2={pad.t + ih} stroke="var(--text-3)" strokeOpacity={0.6} strokeWidth={0.8}/>
      )}
      {meanLine !== undefined && (
        <line x1={xVal(meanLine)} x2={xVal(meanLine)} y1={pad.t} y2={pad.t + ih} stroke="#ef4444" strokeWidth={1}/>
      )}
      <text x={pad.l} y={h - 4} fontSize={9} fontFamily="var(--mono)" fill="var(--text-3)">{lo.toFixed(3)}</text>
      <text x={pad.l + iw} y={h - 4} fontSize={9} fontFamily="var(--mono)" fill="var(--text-3)" textAnchor="end">{hi.toFixed(3)}</text>
    </svg>
  );
}

function RadarChart({ axes, w = 260, h = 260, color = 'var(--accent)' }) {
  // axes: [{ label, value, t }]
  if (!axes || axes.length === 0) return <NoData w={w} h={h}/>;
  const cx = w / 2, cy = h / 2;
  const R = Math.min(w, h) / 2 - 32;
  const N = axes.length;
  const maxV = Math.max(1, ...axes.map(a => Math.abs(a.value || 0)));
  const ringStops = [0.25, 0.5, 0.75, 1];
  const point = (i, frac) => {
    const ang = -Math.PI / 2 + (2 * Math.PI * i) / N;
    return [cx + Math.cos(ang) * R * frac, cy + Math.sin(ang) * R * frac];
  };
  const polyPoints = axes.map((a, i) => {
    const frac = (a.value || 0) / maxV;
    return point(i, Math.max(-1, Math.min(1, frac))).join(',');
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{display:'block'}}>
      {/* concentric polygons */}
      {ringStops.map((f, ri) => {
        const pts = Array.from({length: N}, (_, i) => point(i, f).join(',')).join(' ');
        return <polygon key={ri} points={pts} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={1}/>;
      })}
      {/* axes lines */}
      {axes.map((a, i) => {
        const [px, py] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={px} y2={py} stroke="currentColor" strokeOpacity={0.1}/>;
      })}
      {/* zero ring */}
      <circle cx={cx} cy={cy} r={2} fill="var(--text-3)"/>
      {/* polygon */}
      <polygon points={polyPoints} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={1.4}/>
      {/* labels */}
      {axes.map((a, i) => {
        const [px, py] = point(i, 1.18);
        const anchor = Math.abs(px - cx) < 8 ? 'middle' : px > cx ? 'start' : 'end';
        return (
          <g key={i}>
            <text x={px} y={py} fontSize={10} textAnchor={anchor} fill="var(--text-2)" fontFamily="var(--mono)">{a.label}</text>
            <text x={px} y={py + 11} fontSize={9} textAnchor={anchor} fill={tColor(a.t)} fontFamily="var(--mono)">
              β={fmtSigned(a.value, 2)} {a.t !== undefined && `· t=${fmtSigned(a.t, 2)}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Heatmap({ rows, cols, cells, w = 360, h = 200, getValue }) {
  // cells: [{ row, col, value }]; getValue(c) -> number
  if (!cells || cells.length === 0) return <NoData w={w} h={h}/>;
  const pad = { l: 32, r: 8, t: 18, b: 8 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const cw = iw / cols.length;
  const ch = ih / rows.length;
  const vals = cells.map(getValue);
  const lo = Math.min(...vals, 0);
  const hi = Math.max(...vals, 0);
  const span = Math.max(Math.abs(lo), Math.abs(hi), 1e-9);
  const colorOf = v => {
    const t = v / span; // -1..1
    if (t > 0) return `rgba(34,197,94,${Math.min(1, 0.15 + 0.85 * t).toFixed(3)})`;
    if (t < 0) return `rgba(239,68,68,${Math.min(1, 0.15 - 0.85 * t).toFixed(3)})`;
    return 'var(--surface-2)';
  };
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{display:'block'}}>
      {cols.map((c, j) => (
        <text key={`c${j}`} x={pad.l + (j + 0.5) * cw} y={pad.t - 6} fontSize={9}
          fontFamily="var(--mono)" textAnchor="middle" fill="var(--text-3)">{c}</text>
      ))}
      {rows.map((r, i) => (
        <text key={`r${i}`} x={pad.l - 4} y={pad.t + (i + 0.6) * ch} fontSize={9}
          fontFamily="var(--mono)" textAnchor="end" fill="var(--text-3)">{r}</text>
      ))}
      {cells.map((cell, idx) => {
        const i = rows.indexOf(cell.row);
        const j = cols.indexOf(cell.col);
        if (i < 0 || j < 0) return null;
        const v = getValue(cell);
        return (
          <g key={idx}>
            <rect x={pad.l + j * cw} y={pad.t + i * ch} width={cw - 1} height={ch - 1} fill={colorOf(v)}/>
            <text x={pad.l + (j + 0.5) * cw} y={pad.t + (i + 0.6) * ch} fontSize={9}
              fontFamily="var(--mono)" textAnchor="middle"
              fill={Math.abs(v) > span * 0.4 ? '#fff' : 'var(--text-1)'}>
              {fmtSigned(v, 3)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function StackedBar({ segments, w = 360, h = 28 }) {
  if (!segments || segments.length === 0) return <NoData w={w} h={h}/>;
  const total = segments.reduce((s, x) => s + (x.weight || 0), 0) || 1;
  let off = 0;
  const palette = ['#1976d2','#7e57c2','#22c55e','#eab308','#ef4444','#06b6d4','#a16207','#84cc16','#db2777','#0ea5e9'];
  return (
    <div style={{display:'flex', flexDirection:'column', gap:8}}>
      <div style={{display:'flex', width:'100%', height:h, borderRadius:4, overflow:'hidden', border:'1px solid var(--border)'}}>
        {segments.map((s, i) => {
          const pct = (s.weight || 0) / total * 100;
          const seg = (
            <div key={i} title={`${s.label}: ${pct.toFixed(1)}%`}
              style={{width: pct + '%', background: palette[i % palette.length]}}/>
          );
          off += pct;
          return seg;
        })}
      </div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:4}}>
        {segments.map((s, i) => (
          <div key={i} style={{display:'flex', alignItems:'center', gap:6, fontSize:11}}>
            <span style={{width:9, height:9, background: palette[i % palette.length], borderRadius:2, flexShrink:0}}/>
            <MonoA size={10} color="var(--text-2)">{s.label}</MonoA>
            <MonoA size={10} color="var(--text-3)" style={{marginLeft:'auto'}}>{((s.weight || 0) * 100).toFixed(1)}%</MonoA>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------ helpers (sec-internal) ------------------------------

function rollingMean(arr, win) {
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const lo = Math.max(0, i - win + 1);
    let s = 0; let n = 0;
    for (let j = lo; j <= i; j++) { s += arr[j]; n++; }
    out.push(s / Math.max(1, n));
  }
  return out;
}
function cumsum(arr) {
  let s = 0; return arr.map(v => (s += v));
}

// ============================================================================
//                                 MAIN PAGE
// ============================================================================

function AnalysisPage({ runId, onBack }) {
  const [analysis, setAnalysis] = useStateAn(null);
  const [attribution, setAttribution] = useStateAn(null);
  const [robustness, setRobustness] = useStateAn(null);
  // per-section status: 'idle' | 'loading' | 'computing' | 'missing' | 'error'
  const [sa, setSa] = useStateAn('loading');
  const [sb, setSb] = useStateAn('loading');
  const [sc, setSc] = useStateAn('loading');
  const [errA, setErrA] = useStateAn(null);
  const [errB, setErrB] = useStateAn(null);
  const [errC, setErrC] = useStateAn(null);
  const [activeSec, setActiveSec] = useStateAn('sec-ic');
  const [lang] = window.useLang ? window.useLang() : [window.__lang || 'zh'];

  const sectionRefs = useRefAn({});

  // helper: unwrap compute response which is `{data, display_hint}` -> data
  const unwrap = r => (r && r.data !== undefined) ? r.data : r;

  useEffectAn(() => {
    if (!runId) { setSa('error'); setSb('error'); setSc('error'); return; }
    let cancelled = false;
    setSa('loading'); setSb('loading'); setSc('loading');
    setErrA(null); setErrB(null); setErrC(null);

    const api = window.api;
    if (!api) {
      setSa('error'); setSb('error'); setSc('error');
      setErrA(new Error('window.api missing'));
      return;
    }

    api.getAnalysis(runId).then(d => {
      if (cancelled) return;
      setAnalysis(d); setSa('idle');
    }).catch(e => {
      if (cancelled) return;
      if (e.status === 404) { setSa('missing'); }
      else { setSa('error'); setErrA(e); }
    });

    api.getAttribution(runId).then(d => {
      if (cancelled) return;
      setAttribution(d); setSb('idle');
    }).catch(e => {
      if (cancelled) return;
      if (e.status === 404) { setSb('missing'); }
      else { setSb('error'); setErrB(e); }
    });

    api.getRobustness(runId).then(d => {
      if (cancelled) return;
      setRobustness(d); setSc('idle');
    }).catch(e => {
      if (cancelled) return;
      if (e.status === 404) { setSc('missing'); }
      else { setSc('error'); setErrC(e); }
    });

    return () => { cancelled = true; };
  }, [runId]);

  // section anchors observer (very lightweight active-section tracking)
  useEffectAn(() => {
    function onScroll() {
      const ids = ['sec-ic','sec-quintiles','sec-decay','sec-attribution','sec-turnover','sec-robustness'];
      let act = ids[0];
      for (const id of ids) {
        const el = sectionRefs.current[id];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= 90) act = id;
      }
      setActiveSec(act);
    }
    const root = sectionRefs.current.__root;
    if (root) root.addEventListener('scroll', onScroll, { passive: true });
    return () => { if (root) root.removeEventListener('scroll', onScroll); };
  }, []);

  function scrollTo(id) {
    const el = sectionRefs.current[id];
    const root = sectionRefs.current.__root;
    if (el && root) {
      root.scrollTo({ top: el.offsetTop - 60, behavior: 'smooth' });
    }
  }

  async function compute(which) {
    const api = window.api;
    if (!api) return;
    if (which === 'analysis') {
      setSa('computing'); setErrA(null);
      try {
        const r = await api.computeAnalysis(runId);
        setAnalysis(unwrap(r)); setSa('idle');
      } catch (e) { setSa('error'); setErrA(e); }
    } else if (which === 'attribution') {
      setSb('computing'); setErrB(null);
      try {
        const r = await api.computeAttribution(runId);
        setAttribution(unwrap(r)); setSb('idle');
      } catch (e) { setSb('error'); setErrB(e); }
    } else if (which === 'robustness') {
      setSc('computing'); setErrC(null);
      try {
        const r = await api.computeRobustness(runId);
        setRobustness(unwrap(r)); setSc('idle');
      } catch (e) { setSc('error'); setErrC(e); }
    }
  }

  async function rerunAll() {
    await compute('analysis');
    await compute('attribution');
    await compute('robustness');
  }

  const sections = [
    ['sec-ic', '①', tA('analysis.section.ic','IC analysis')],
    ['sec-quintiles', '②', tA('analysis.section.quintiles','Quintiles')],
    ['sec-decay', '③', tA('analysis.section.decay','Decay')],
    ['sec-attribution', '④', tA('analysis.section.attribution','Attribution')],
    ['sec-turnover', '⑤', tA('analysis.section.turnover','Turnover')],
    ['sec-robustness', '⑥', tA('analysis.section.robustness','Robustness')],
  ];

  const computingAny = sa === 'computing' || sb === 'computing' || sc === 'computing';

  return (
    <div ref={el => sectionRefs.current.__root = el} style={{
      height:'100%', overflow:'auto', background:'var(--bg-base)',
    }}>
      {/* Header */}
      <div style={{
        position:'sticky', top:0, zIndex:5,
        background:'var(--surface-1)', borderBottom:'1px solid var(--border)',
        padding:'12px 24px', display:'flex', alignItems:'center', gap:14,
      }}>
        <button onClick={onBack} style={{
          background:'transparent', border:'1px solid var(--border)', borderRadius:4,
          padding:'5px 9px', fontSize:11, fontFamily:'var(--mono)', color:'var(--text-2)',
          cursor:'pointer',
        }}>{tA('analysis.back','← back')}</button>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:14, color:'var(--text-1)', fontWeight:500}}>{tA('analysis.title','Factor analysis')}</div>
          <MonoA size={10} color="var(--text-3)">/runs/{runId}/analysis</MonoA>
        </div>
        <button onClick={rerunAll} disabled={computingAny} style={{
          padding:'6px 12px', borderRadius:4, fontSize:11, fontFamily:'var(--mono)',
          background:'var(--accent)', color:'#fff', border:'none',
          cursor: computingAny ? 'wait' : 'pointer', opacity: computingAny ? 0.7 : 1,
        }}>{computingAny ? tA('analysis.computing','Computing…') : tA('analysis.rerun','Re-run analysis')}</button>
      </div>

      {/* Section nav rail */}
      <div style={{
        position:'sticky', top:53, zIndex:4,
        height:32, padding:'0 24px',
        background:'var(--surface-0)', borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', gap:18, overflowX:'auto',
      }}>
        {sections.map(([id, num, label]) => (
          <button key={id} onClick={() => scrollTo(id)} style={{
            background:'transparent', border:'none', cursor:'pointer',
            padding:'8px 0', fontSize:11, fontFamily:'var(--mono)',
            color: activeSec === id ? 'var(--accent)' : 'var(--text-3)',
            borderBottom: activeSec === id ? '2px solid var(--accent)' : '2px solid transparent',
            whiteSpace:'nowrap',
          }}>{num} {label}</button>
        ))}
      </div>

      {/* Body */}
      <div style={{padding:'24px 24px 80px', maxWidth: 1280, margin:'0 auto'}}>
        <SectionWrapper id="sec-ic" title={tA('analysis.section.ic','IC analysis')} refMap={sectionRefs.current}>
          <ICAnalysisSection
            data={analysis} status={sa} error={errA}
            onCompute={() => compute('analysis')}
          />
        </SectionWrapper>

        <SectionWrapper id="sec-quintiles" title={tA('analysis.section.quintiles','Quintile decomposition')} refMap={sectionRefs.current}>
          <QuintileSection
            data={analysis} status={sa} error={errA}
            onCompute={() => compute('analysis')}
          />
        </SectionWrapper>

        <SectionWrapper id="sec-decay" title={tA('analysis.section.decay','Decay structure')} refMap={sectionRefs.current}>
          <DecaySection
            data={analysis} status={sa} error={errA}
            onCompute={() => compute('analysis')}
          />
        </SectionWrapper>

        <SectionWrapper id="sec-attribution" title={tA('analysis.section.attribution','Risk attribution')} refMap={sectionRefs.current}>
          <AttributionSection
            data={attribution} status={sb} error={errB}
            onCompute={() => compute('attribution')}
          />
        </SectionWrapper>

        <SectionWrapper id="sec-turnover" title={tA('analysis.section.turnover','Turnover & capacity')} refMap={sectionRefs.current}>
          <TurnoverSection
            data={analysis} status={sa} error={errA}
            onCompute={() => compute('analysis')}
          />
        </SectionWrapper>

        <SectionWrapper id="sec-robustness" title={tA('analysis.section.robustness','Robustness')} refMap={sectionRefs.current}>
          <RobustnessSection
            data={robustness} status={sc} error={errC}
            onCompute={() => compute('robustness')}
          />
        </SectionWrapper>
      </div>
    </div>
  );
}

function SectionWrapper({ id, title, refMap, children }) {
  return (
    <section ref={el => { refMap[id] = el; }} style={{marginBottom:36}}>
      <div style={{
        display:'flex', alignItems:'center', gap:10,
        margin:'8px 0 14px',
      }}>
        <h2 style={{fontSize:15, color:'var(--text-1)', margin:0, fontWeight:500}}>{title}</h2>
        <div style={{flex:1, height:1, background:'var(--border)'}}/>
        <MonoA size={10} color="var(--text-3)">#{id.replace('sec-','')}</MonoA>
      </div>
      {children}
    </section>
  );
}

// ============================================================================
//                            SECTION 1 — IC analysis
// ============================================================================

function ICAnalysisSection({ data, status, error, onCompute }) {
  if (status === 'loading') {
    return <Skeleton h={300}/>;
  }
  if (status === 'missing') {
    return <EmptyState
      title={tA('analysis.empty_section','Not yet computed.')}
      message={null}
      ctaLabel={tA('analysis.compute_cta','Compute analysis')}
      onCta={onCompute}/>;
  }
  if (status === 'computing') {
    return <Skeleton h={200} computing/>;
  }
  if (status === 'error') {
    return <EmptyState title={tA('analysis.error','Failed to compute')}
      ctaLabel={tA('analysis.retry','Retry')} onCta={onCompute} error={error?.message}/>;
  }
  if (!data) return null;

  const stats = data.ic_stats || {};
  const series = (data.ic_series || []).map(p => ({ x: p.date, y: Number(p.ic) || 0 }));
  const ys = series.map(p => p.y);
  const smoothed = series.length > 0
    ? rollingMean(ys, 30).map((v, i) => ({ x: series[i].x, y: v }))
    : null;
  const acf = data.ic_autocorrelation || [];

  return (
    <>
      {/* Stat strip */}
      <div style={{
        display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:1,
        background:'var(--border)', border:'1px solid var(--border)', borderRadius:6,
        marginBottom:14, overflow:'hidden',
      }}>
        <StatCell label={tA('analysis.ic_mean','IC mean')} value={fmtIC(stats.mean)} hint="average IC across rebalance dates"/>
        <StatCell label={tA('analysis.ic_std','IC std')} value={fmtNum(stats.std, 4)} hint="cross-sectional IC dispersion"/>
        <StatCell label={tA('analysis.ir','IR')} value={fmtNum(stats.ir, 3)} hint="IC mean / IC std"/>
        <StatCell label={tA('analysis.t_stat','t-stat')} value={fmtSigned(stats.t_stat, 2)} color={tColor(stats.t_stat)} hint="Newey-West HAC, lag=21"/>
        <StatCell label={tA('analysis.p_value','p-value')} value={fmtNum(stats.p_value, 3)} hint="two-sided"/>
      </div>

      {/* 3 charts */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14}}>
        <Card title={tA('analysis.ic_series','IC time series')} hint={`n=${stats.n || '—'}`}>
          <LineChart series={series} smoothed={smoothed} h={180} bands={[0.05, -0.05]} color="var(--accent)"/>
        </Card>
        <Card title={tA('analysis.ic_dist','IC distribution')} hint="25 bins">
          <Histogram values={ys} bins={25} h={180} meanLine={stats.mean}/>
          <div style={{marginTop:8}}>
            <MonoA size={10} color="var(--text-3)">μ = {fmtIC(stats.mean)} · σ = {fmtNum(stats.std, 4)}</MonoA>
          </div>
        </Card>
        <Card title={tA('analysis.ic_acf','IC autocorrelation')} hint={`lags ${acf.length || 0}`}>
          <BarChart data={acf.map(d => ({ label: String(d.lag), value: d.rho }))}
            valueKey="value" labelKey="label" h={180}/>
        </Card>
      </div>
    </>
  );
}

function StatCell({ label, value, hint, color = 'var(--text-1)' }) {
  return (
    <div style={{
      background:'var(--surface-1)', padding:'12px 14px',
      display:'flex', flexDirection:'column', gap:4,
    }}>
      <MonoA size={9} color="var(--text-3)" style={{textTransform:'uppercase', letterSpacing:0.6}}>{label}</MonoA>
      <div style={{fontFamily:'var(--mono)', fontSize:18, color, fontWeight:500}}>{value}</div>
      {hint && <MonoA size={9} color="var(--text-3)">{hint}</MonoA>}
    </div>
  );
}

// ============================================================================
//                       SECTION 2 — Quintile decomposition
// ============================================================================

function QuintileSection({ data, status, error, onCompute }) {
  if (status === 'loading') return <Skeleton h={260}/>;
  if (status === 'missing') {
    return <EmptyState title={tA('analysis.empty_section','Not yet computed.')}
      ctaLabel={tA('analysis.compute_cta','Compute analysis')} onCta={onCompute}/>;
  }
  if (status === 'computing') return <Skeleton h={260} computing/>;
  if (status === 'error') {
    return <EmptyState title={tA('analysis.error','Failed to compute')}
      ctaLabel={tA('analysis.retry','Retry')} onCta={onCompute} error={error?.message}/>;
  }
  if (!data) return null;

  const quintiles = data.quintiles || [];
  const ls = data.long_short_spread || {};
  const mono = data.monotonicity || {};
  const cum = data.quintile_cumret || []; // optional: list of {date, q1, q2, q3, q4, q5}

  // Build quintile bars + spread
  const bars = quintiles.map(q => ({
    label: 'Q' + q.q, value: q.mean_return, tStat: q.t_stat, n: q.n,
  }));
  if (ls.spread !== undefined) {
    bars.push({ label: 'L-S', value: ls.spread, tStat: ls.t_stat, color: '#7e57c2' });
  }

  // monotonicity status
  const sp = mono.spearman ?? null;
  const monoKind = sp === null ? 'neutral' : (sp > 0.8 ? 'green' : sp > 0.4 ? 'yellow' : 'red');
  const monoText = sp === null ? '—' : sp > 0.8 ? 'MONOTONIC ✓' : sp > 0.4 ? 'WEAK MONOTONIC ⚠' : 'NON-MONOTONIC ✗';

  return (
    <>
      <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr', gap:14, marginBottom:14}}>
        <Card title={tA('analysis.quintile_bars','Quintile mean returns')} hint="annualized">
          <BarChart data={bars} valueKey="value" labelKey="label" tKey="tStat" h={200} annotateAbove
            color="var(--accent)"/>
          <div style={{display:'grid', gridTemplateColumns:`repeat(${bars.length}, 1fr)`, gap:4, marginTop:8}}>
            {bars.map((b, i) => (
              <div key={i} style={{textAlign:'center'}}>
                {b.n !== undefined && <MonoA size={9} color="var(--text-3)">n={b.n}</MonoA>}
              </div>
            ))}
          </div>
        </Card>

        <Card title={tA('analysis.monotonicity','Monotonicity')}>
          <div style={{padding:'10px 4px'}}>
            <div style={{fontFamily:'var(--mono)', fontSize:32, color:'var(--text-1)', fontWeight:500}}>
              {fmtSigned(sp, 3)}
            </div>
            <MonoA size={10} color="var(--text-3)">Spearman ρ · p={fmtNum(mono.p_value, 3)}</MonoA>
            <div style={{marginTop:14}}>
              <Pill kind={monoKind}>{monoText}</Pill>
            </div>
          </div>
        </Card>

        <Card title={tA('analysis.long_short','Long-short spread')}>
          <div style={{padding:'10px 4px'}}>
            <div style={{fontFamily:'var(--mono)', fontSize:32, color: (ls.spread||0) >= 0 ? '#22c55e' : '#ef4444', fontWeight:500}}>
              {fmtPct(ls.spread)}
            </div>
            <MonoA size={11} color={tColor(ls.t_stat)}>t = {fmtSigned(ls.t_stat, 2)}</MonoA>
            <div style={{marginTop:10, display:'flex', flexDirection:'column', gap:2}}>
              <MonoA size={10} color="var(--text-3)">slip 1bp: {fmtPct((ls.spread||0) - 0.0031)}</MonoA>
              <MonoA size={10} color="var(--text-3)">slip 5bp: {fmtPct((ls.spread||0) - 0.0156)}</MonoA>
            </div>
          </div>
        </Card>
      </div>

      <Card title={tA('analysis.cum_quintile','Cumulative returns by quintile')} hint={`${cum.length} bars`}>
        {cum.length > 0
          ? <QuintileCumChart cum={cum}/>
          : <NoData h={200}/>}
      </Card>
    </>
  );
}

function QuintileCumChart({ cum, w = 1100, h = 220 }) {
  // expect each row { date, q1..q5, ls? }
  const keys = ['q1','q2','q3','q4','q5'];
  const palette = ['#ef4444','#f97316','#eab308','#84cc16','#22c55e'];
  const series = keys.map((k, ki) => cum.map((row, i) => ({ x: i, y: Number(row[k]) || 0 })));
  const all = series.flat().map(p => p.y);
  const lo = Math.min(0, ...all);
  const hi = Math.max(0, ...all);
  const span = Math.max(1e-9, hi - lo);
  const pad = { l: 36, r: 12, t: 8, b: 18 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const X = i => pad.l + (i / Math.max(1, cum.length - 1)) * iw;
  const Y = v => pad.t + (1 - (v - lo) / span) * ih;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{display:'block'}}>
      {[0, 0.5, 1].map(t => (
        <line key={t} x1={pad.l} x2={pad.l + iw} y1={pad.t + t * ih} y2={pad.t + t * ih}
          stroke="currentColor" strokeOpacity={0.08}/>
      ))}
      {0 >= lo && 0 <= hi && (
        <line x1={pad.l} x2={pad.l + iw} y1={Y(0)} y2={Y(0)} stroke="var(--text-3)" strokeWidth={0.6}/>
      )}
      {series.map((s, i) => (
        <path key={i} d={s.map((p, j) => `${j===0?'M':'L'}${X(j)},${Y(p.y)}`).join(' ')}
          fill="none" stroke={palette[i]} strokeWidth={1.4}/>
      ))}
      <text x={4} y={pad.t + 8} fontSize={9} fontFamily="var(--mono)" fill="var(--text-3)">{(hi*100).toFixed(0)}%</text>
      <text x={4} y={pad.t + ih} fontSize={9} fontFamily="var(--mono)" fill="var(--text-3)">{(lo*100).toFixed(0)}%</text>
      {/* legend */}
      <g transform={`translate(${pad.l + 4}, ${pad.t + 4})`}>
        {keys.map((k, i) => (
          <g key={i} transform={`translate(${i * 56}, 0)`}>
            <rect width={10} height={3} y={4} fill={palette[i]}/>
            <text x={14} y={9} fontSize={9} fontFamily="var(--mono)" fill="var(--text-3)">{k.toUpperCase()}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

// ============================================================================
//                          SECTION 3 — Decay
// ============================================================================

function DecaySection({ data, status, error, onCompute }) {
  if (status === 'loading') return <Skeleton h={220}/>;
  if (status === 'missing') return <EmptyState title={tA('analysis.empty_section','Not yet computed.')} ctaLabel={tA('analysis.compute_cta','Compute analysis')} onCta={onCompute}/>;
  if (status === 'computing') return <Skeleton h={220} computing/>;
  if (status === 'error') return <EmptyState title={tA('analysis.error','Failed to compute')} ctaLabel={tA('analysis.retry','Retry')} onCta={onCompute} error={error?.message}/>;
  if (!data) return null;

  const fwd = data.forward_ic || [];
  const series = (data.ic_series || []).map(p => Number(p.ic) || 0);
  const rolling = rollingMean(series, 30).map((v, i) => ({ x: i, y: v }));
  const cumIC = cumsum(series).map((v, i) => ({ x: i, y: v }));
  const half = data.half_life;

  return (
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
      <Card title={tA('analysis.fwd_ic','Forward IC by horizon')} hint={half ? `Half-life ≈ ${fmtNum(half, 1)}d` : 'No clear decay'}>
        <BarChart
          data={fwd.map(f => ({ label: f.horizon + 'd', value: f.ic, tStat: f.t_stat }))}
          valueKey="value" labelKey="label" tKey="tStat" annotateAbove h={220}/>
      </Card>
      <Card title={tA('analysis.rolling_ic','30-day rolling IC + cumulative IC')} hint={`n=${series.length}`}>
        <DualLine left={rolling} right={cumIC} h={220}/>
      </Card>
    </div>
  );
}

function DualLine({ left, right, w = 540, h = 220 }) {
  if ((!left || left.length === 0) && (!right || right.length === 0)) return <NoData w={w} h={h}/>;
  const pad = { l: 32, r: 36, t: 8, b: 20 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const lYs = left.map(p => p.y);
  const rYs = right.map(p => p.y);
  const lLo = Math.min(0, ...lYs); const lHi = Math.max(0, ...lYs);
  const rLo = Math.min(0, ...rYs); const rHi = Math.max(0, ...rYs);
  const lSpan = Math.max(1e-9, lHi - lLo);
  const rSpan = Math.max(1e-9, rHi - rLo);
  const N = Math.max(left.length, right.length);
  const X = i => pad.l + (i / Math.max(1, N - 1)) * iw;
  const YL = v => pad.t + (1 - (v - lLo) / lSpan) * ih;
  const YR = v => pad.t + (1 - (v - rLo) / rSpan) * ih;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{display:'block'}}>
      {[0, 0.5, 1].map(t => (
        <line key={t} x1={pad.l} x2={pad.l + iw} y1={pad.t + t * ih} y2={pad.t + t * ih}
          stroke="currentColor" strokeOpacity={0.08}/>
      ))}
      <path d={left.map((p, i) => `${i===0?'M':'L'}${X(i)},${YL(p.y)}`).join(' ')}
        fill="none" stroke="var(--accent)" strokeWidth={1.4}/>
      <path d={right.map((p, i) => `${i===0?'M':'L'}${X(i)},${YR(p.y)}`).join(' ')}
        fill="none" stroke="#7e57c2" strokeWidth={1.4} strokeDasharray="4 2"/>
      <text x={pad.l - 4} y={pad.t + 4} fontSize={9} fontFamily="var(--mono)" fill="var(--accent)" textAnchor="end">{lHi.toFixed(3)}</text>
      <text x={pad.l - 4} y={pad.t + ih} fontSize={9} fontFamily="var(--mono)" fill="var(--accent)" textAnchor="end">{lLo.toFixed(3)}</text>
      <text x={pad.l + iw + 4} y={pad.t + 4} fontSize={9} fontFamily="var(--mono)" fill="#7e57c2">{rHi.toFixed(2)}</text>
      <text x={pad.l + iw + 4} y={pad.t + ih} fontSize={9} fontFamily="var(--mono)" fill="#7e57c2">{rLo.toFixed(2)}</text>
      <g transform={`translate(${pad.l}, ${h - 4})`}>
        <rect width={10} height={2} y={-6} fill="var(--accent)"/>
        <text x={14} y={-2} fontSize={9} fontFamily="var(--mono)" fill="var(--text-3)">rolling IC</text>
        <rect x={86} width={10} height={2} y={-6} fill="#7e57c2"/>
        <text x={100} y={-2} fontSize={9} fontFamily="var(--mono)" fill="var(--text-3)">cum IC</text>
      </g>
    </svg>
  );
}

// ============================================================================
//                      SECTION 4 — Risk attribution
// ============================================================================

function AttributionSection({ data, status, error, onCompute }) {
  if (status === 'loading') return <Skeleton h={300}/>;
  if (status === 'missing') return <EmptyState title={tA('analysis.empty_section','Not yet computed.')} ctaLabel={tA('analysis.compute_attr_cta','Compute attribution')} onCta={onCompute}/>;
  if (status === 'computing') return <Skeleton h={300} computing/>;
  if (status === 'error') return <EmptyState title={tA('analysis.error','Failed to compute')} ctaLabel={tA('analysis.retry','Retry')} onCta={onCompute} error={error?.message}/>;
  if (!data) return null;

  const betas = data.style_betas || [];
  const sectors = data.sector_exposure || [];
  const idio = data.idiosyncratic_alpha || {};
  const rolling = data.rolling_betas || [];

  const radarAxes = betas.map(b => ({ label: b.factor, value: b.beta, t: b.t_stat }));

  const aSig = idio.t_stat !== undefined && Math.abs(idio.t_stat) >= 2;
  const aKind = aSig ? 'green' : 'yellow';
  const aText = aSig ? 'α SIGNIFICANT ✓' : 'α NOT DISTINGUISHABLE ⚠';

  return (
    <>
      <div style={{display:'grid', gridTemplateColumns:'1.2fr 1fr 0.9fr', gap:14, marginBottom:14}}>
        <Card title={tA('analysis.style_beta','Style β (FF5+UMD)')}>
          <RadarChart axes={radarAxes} h={260}/>
        </Card>
        <Card title={tA('analysis.sector','Sector exposure')}>
          <StackedBar segments={sectors.map(s => ({ label: s.sector, weight: s.weight }))}/>
        </Card>
        <Card title={tA('analysis.idio_alpha','Idiosyncratic α')}>
          <div style={{padding:'10px 4px'}}>
            <div style={{fontFamily:'var(--mono)', fontSize:32, color:'var(--text-1)', fontWeight:500}}>
              {fmtPct(idio.alpha)}
            </div>
            <MonoA size={11} color={tColor(idio.t_stat)}>t = {fmtSigned(idio.t_stat, 2)} · p = {fmtNum(idio.p_value, 3)}</MonoA>
            <div style={{marginTop:6}}>
              <MonoA size={10} color="var(--text-3)">R² = {fmtNum(idio.r_squared, 3)}</MonoA>
            </div>
            <div style={{marginTop:14}}>
              <Pill kind={aKind}>{aText}</Pill>
            </div>
          </div>
        </Card>
      </div>

      <Card title={tA('analysis.rolling_beta','Rolling 1-year style β')} hint="proxies on CSI universe">
        {rolling.length > 0
          ? <RollingBetaChart rolling={rolling}/>
          : <NoData h={180}/>}
      </Card>
      <div style={{marginTop:8}}>
        <MonoA size={9} color="var(--text-3)">
          Style βs computed against FF5+UMD proxies built from CSI universe — not a real Barra model. Roadmap v0.5.
        </MonoA>
      </div>
    </>
  );
}

function RollingBetaChart({ rolling, w = 1100, h = 180 }) {
  // rolling: [{ date, market, smb, hml, rmw, cma, umd }]
  const keys = ['market','smb','hml','rmw','cma','umd'];
  const palette = ['#1976d2','#7e57c2','#22c55e','#eab308','#ef4444','#06b6d4'];
  const all = [];
  for (const r of rolling) for (const k of keys) all.push(Number(r[k]) || 0);
  const lo = Math.min(0, ...all);
  const hi = Math.max(0, ...all);
  const span = Math.max(1e-9, hi - lo);
  const pad = { l: 32, r: 50, t: 8, b: 18 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const X = i => pad.l + (i / Math.max(1, rolling.length - 1)) * iw;
  const Y = v => pad.t + (1 - (v - lo) / span) * ih;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{display:'block'}}>
      {[0,0.5,1].map(t => (
        <line key={t} x1={pad.l} x2={pad.l + iw} y1={pad.t + t * ih} y2={pad.t + t * ih}
          stroke="currentColor" strokeOpacity={0.08}/>
      ))}
      {0 >= lo && 0 <= hi && (
        <line x1={pad.l} x2={pad.l + iw} y1={Y(0)} y2={Y(0)} stroke="var(--text-3)" strokeWidth={0.6}/>
      )}
      {keys.map((k, ki) => {
        const ser = rolling.map(r => Number(r[k]) || 0);
        const path = ser.map((v, i) => `${i===0?'M':'L'}${X(i)},${Y(v)}`).join(' ');
        const last = ser[ser.length - 1];
        return (
          <g key={k}>
            <path d={path} fill="none" stroke={palette[ki]} strokeWidth={1.2} opacity={0.85}/>
            <text x={pad.l + iw + 4} y={Y(last) + 3} fontSize={9}
              fontFamily="var(--mono)" fill={palette[ki]}>{k}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ============================================================================
//                      SECTION 5 — Turnover & capacity
// ============================================================================

function TurnoverSection({ data, status, error, onCompute }) {
  if (status === 'loading') return <Skeleton h={260}/>;
  if (status === 'missing') return <EmptyState title={tA('analysis.empty_section','Not yet computed.')} ctaLabel={tA('analysis.compute_cta','Compute analysis')} onCta={onCompute}/>;
  if (status === 'computing') return <Skeleton h={260} computing/>;
  if (status === 'error') return <EmptyState title={tA('analysis.error','Failed to compute')} ctaLabel={tA('analysis.retry','Retry')} onCta={onCompute} error={error?.message}/>;
  if (!data) return null;

  const t = data.turnover || {};
  const rows = t.series || [];
  const tovs = rows.map(r => Number(r.turnover) || 0);
  const series = tovs.map((v, i) => ({ x: i, y: v }));
  const cap = data.capacity || { curves: [] };

  return (
    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
      <Card title={tA('analysis.turnover','Daily turnover')}
        hint={t.mean !== undefined ? `avg ${(t.mean*100).toFixed(0)}% · max ${(t.max*100).toFixed(0)}% · min ${(t.min*100).toFixed(0)}%` : null}>
        <LineChart series={series} h={220} bands={t.mean !== undefined ? [t.mean] : null} color="var(--accent)"/>
      </Card>
      <div style={{display:'grid', gridTemplateRows:'1fr 1fr', gap:14, minHeight:0}}>
        <Card title={tA('analysis.turnover_dist','Turnover distribution')}>
          <Histogram values={tovs} bins={20} h={100}/>
        </Card>
        <Card title={tA('analysis.capacity','Capacity curve')}>
          <CapacityChart curves={cap.curves || []} h={100}/>
        </Card>
      </div>
    </div>
  );
}

function CapacityChart({ curves, w = 540, h = 140 }) {
  if (!curves || curves.length === 0) return <NoData w={w} h={h}/>;
  const palette = ['#22c55e','#eab308','#ef4444'];
  const allPts = curves.flatMap(c => c.points || []);
  if (allPts.length === 0) return <NoData w={w} h={h}/>;
  const xs = allPts.map(p => Math.log10(Math.max(0.01, p.aum_m)));
  const ys = allPts.map(p => p.sharpe);
  const xLo = Math.min(...xs); const xHi = Math.max(...xs);
  const yLo = Math.min(0, ...ys); const yHi = Math.max(...ys);
  const xSpan = Math.max(1e-9, xHi - xLo);
  const ySpan = Math.max(1e-9, yHi - yLo);
  const pad = { l: 30, r: 8, t: 8, b: 20 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const X = lv => pad.l + ((lv - xLo) / xSpan) * iw;
  const Y = v => pad.t + (1 - (v - yLo) / ySpan) * ih;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{display:'block'}}>
      {[0, 0.5, 1].map(t => (
        <line key={t} x1={pad.l} x2={pad.l + iw} y1={pad.t + t * ih} y2={pad.t + t * ih}
          stroke="currentColor" strokeOpacity={0.08}/>
      ))}
      {/* Sharpe = 1 reference */}
      {yLo <= 1 && yHi >= 1 && (
        <line x1={pad.l} x2={pad.l + iw} y1={Y(1)} y2={Y(1)}
          stroke="var(--text-3)" strokeDasharray="3 3" strokeWidth={0.6}/>
      )}
      {curves.map((c, i) => {
        const pts = (c.points || []);
        const path = pts.map((p, j) => {
          const lx = Math.log10(Math.max(0.01, p.aum_m));
          return `${j===0?'M':'L'}${X(lx)},${Y(p.sharpe)}`;
        }).join(' ');
        return (
          <g key={i}>
            <path d={path} fill="none" stroke={palette[i % palette.length]} strokeWidth={1.4}/>
            <text x={pad.l + iw - 4} y={pad.t + 10 + i * 11} fontSize={9}
              fontFamily="var(--mono)" textAnchor="end" fill={palette[i % palette.length]}>
              {c.slippage_bp}bp
            </text>
          </g>
        );
      })}
      <text x={pad.l} y={h - 4} fontSize={9} fontFamily="var(--mono)" fill="var(--text-3)">
        AUM ${Math.round(Math.pow(10, xLo))}M
      </text>
      <text x={pad.l + iw} y={h - 4} fontSize={9} fontFamily="var(--mono)" fill="var(--text-3)" textAnchor="end">
        ${Math.round(Math.pow(10, xHi))}M
      </text>
    </svg>
  );
}

// ============================================================================
//                       SECTION 6 — Robustness
// ============================================================================

function RobustnessSection({ data, status, error, onCompute }) {
  if (status === 'loading') return <Skeleton h={260}/>;
  if (status === 'missing') return <EmptyState title={tA('analysis.empty_section','Not yet computed.')} ctaLabel={tA('analysis.compute_rob_cta','Compute robustness')} onCta={onCompute}/>;
  if (status === 'computing') return <Skeleton h={260} computing/>;
  if (status === 'error') return <EmptyState title={tA('analysis.error','Failed to compute')} ctaLabel={tA('analysis.retry','Retry')} onCta={onCompute} error={error?.message}/>;
  if (!data) return null;

  const sub = data.subperiod_ic || [];
  const regimes = data.regime_ic || [];
  const boot = data.bootstrap_ci || {};
  const universe = data.universe_split || [];

  // Build heatmap rows/cols. Period strings like "2022Q1" -> row "2022", col "Q1"
  const rowSet = new Set();
  const colSet = new Set();
  const cells = [];
  for (const s of sub) {
    const period = String(s.period || '');
    let row, col;
    const m = period.match(/^(\d{4})\s*[-Q]\s*(Q?\d)$/i) || period.match(/^(\d{4})\s*(Q\d)$/);
    if (m) { row = m[1]; col = m[2].toUpperCase().startsWith('Q') ? m[2].toUpperCase() : 'Q' + m[2]; }
    else if (/^\d{4}$/.test(period)) { row = period; col = 'Y'; }
    else { row = period; col = '·'; }
    rowSet.add(row); colSet.add(col);
    cells.push({ row, col, value: Number(s.ic) || 0, t: s.t_stat, n: s.n });
  }
  const rows = Array.from(rowSet).sort();
  const cols = Array.from(colSet).sort();

  const sigPeriods = sub.filter(s => Math.abs(s.t_stat || 0) >= 2).length;

  const regimeColor = r => r === 'bull' ? '#22c55e' : r === 'bear' ? '#ef4444' : 'var(--text-3)';

  const ciCovers = boot.covers_zero;
  const ciKind = ciCovers ? 'yellow' : 'green';
  const ciText = ciCovers ? 'CI INCLUDES ZERO ⚠' : 'IC ≠ 0 (95% CI)';

  return (
    <>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14}}>
        <Card title={tA('analysis.subperiod_ic','Subperiod IC')} hint={`${sigPeriods}/${sub.length} periods |t|≥2`}>
          {cells.length > 0
            ? <Heatmap rows={rows} cols={cols} cells={cells} h={Math.max(160, rows.length * 28 + 30)} getValue={c => c.value}/>
            : <NoData h={160}/>}
        </Card>
        <Card title={tA('analysis.regime','Regime split')} hint="200d MA + 60d return">
          <BarChart
            data={regimes.map(r => ({ label: r.regime, value: r.ic, tStat: r.t_stat }))}
            valueKey="value" labelKey="label" tKey="tStat" annotateAbove h={200}/>
        </Card>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
        <Card title={tA('analysis.bootstrap','Bootstrap 95% CI')}>
          <BootstrapBox boot={boot}/>
          <div style={{marginTop:10, display:'flex', gap:10, alignItems:'center'}}>
            <Pill kind={ciKind}>{ciText}</Pill>
            <MonoA size={10} color="var(--text-3)">
              [{fmtIC(boot.ci_lower)}, {fmtIC(boot.ci_upper)}]
            </MonoA>
          </div>
        </Card>
        <Card title={tA('analysis.universe_split','Universe split')}>
          <BarChart
            data={universe.map(u => ({ label: u.slice, value: u.ic, tStat: u.t_stat }))}
            valueKey="value" labelKey="label" tKey="tStat" annotateAbove h={200}/>
        </Card>
      </div>
    </>
  );
}

function BootstrapBox({ boot, w = 540, h = 110 }) {
  if (boot === null || boot === undefined || boot.ic_mean === undefined) return <NoData w={w} h={h}/>;
  const lo = boot.ci_lower ?? boot.ic_mean - 0.01;
  const hi = boot.ci_upper ?? boot.ic_mean + 0.01;
  const m = boot.ic_mean;
  const xLo = Math.min(0, lo) - Math.abs(m) * 0.2 - 0.005;
  const xHi = Math.max(0, hi) + Math.abs(m) * 0.2 + 0.005;
  const span = Math.max(1e-9, xHi - xLo);
  const pad = { l: 30, r: 30, t: 14, b: 26 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const X = v => pad.l + ((v - xLo) / span) * iw;
  const yMid = pad.t + ih / 2;
  const boxH = Math.min(34, ih * 0.7);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{display:'block'}}>
      {/* zero line */}
      {xLo <= 0 && xHi >= 0 && (
        <line x1={X(0)} x2={X(0)} y1={pad.t} y2={pad.t + ih} stroke="var(--text-3)" strokeDasharray="2 2"/>
      )}
      {/* whiskers */}
      <line x1={X(lo)} x2={X(hi)} y1={yMid} y2={yMid} stroke="var(--text-2)" strokeWidth={1}/>
      <line x1={X(lo)} x2={X(lo)} y1={yMid - boxH/2} y2={yMid + boxH/2} stroke="var(--text-2)"/>
      <line x1={X(hi)} x2={X(hi)} y1={yMid - boxH/2} y2={yMid + boxH/2} stroke="var(--text-2)"/>
      {/* IQR ~ 60% of whisker length */}
      <rect x={X(lo + (hi-lo)*0.2)} y={yMid - boxH/2} width={X(lo + (hi-lo)*0.8) - X(lo + (hi-lo)*0.2)} height={boxH}
        fill="var(--accent)" fillOpacity={0.18} stroke="var(--accent)" strokeWidth={1}/>
      {/* mean line */}
      <line x1={X(m)} x2={X(m)} y1={yMid - boxH/2} y2={yMid + boxH/2} stroke="var(--accent)" strokeWidth={1.5}/>
      {/* observed dot */}
      <circle cx={X(m)} cy={yMid} r={3.5} fill="#ef4444"/>
      {/* labels */}
      <text x={X(lo)} y={yMid + boxH/2 + 12} fontSize={9} fontFamily="var(--mono)" fill="var(--text-3)" textAnchor="middle">{fmtIC(lo)}</text>
      <text x={X(hi)} y={yMid + boxH/2 + 12} fontSize={9} fontFamily="var(--mono)" fill="var(--text-3)" textAnchor="middle">{fmtIC(hi)}</text>
      <text x={X(m)} y={yMid - boxH/2 - 4} fontSize={10} fontFamily="var(--mono)" fill="var(--accent)" textAnchor="middle">{fmtIC(m)}</text>
    </svg>
  );
}

// ------------------------------ skeleton ------------------------------

function Skeleton({ h = 200, computing }) {
  return (
    <div style={{
      height: h, borderRadius: 6, border:'1px solid var(--border)',
      background: 'linear-gradient(90deg, var(--surface-1), var(--surface-2), var(--surface-1))',
      backgroundSize: '200% 100%',
      display:'flex', alignItems:'center', justifyContent:'center',
      animation: 'replicalpha-shimmer 2s infinite linear',
    }}>
      <MonoA size={11} color="var(--text-3)">{computing ? tA('analysis.computing','Computing…') : tA('analysis.loading','Loading…')}</MonoA>
    </div>
  );
}

// inject keyframes for shimmer once
(function () {
  if (typeof document === 'undefined') return;
  if (document.getElementById('replicalpha-shimmer-style')) return;
  const s = document.createElement('style');
  s.id = 'replicalpha-shimmer-style';
  s.textContent = `@keyframes replicalpha-shimmer { 0% {background-position: 200% 0;} 100% {background-position: -200% 0;} }`;
  document.head.appendChild(s);
})();

window.AnalysisPage = AnalysisPage;

// ===== agent-chat.jsx =====
// Agent chat box — SSE streaming + 7 tool-card variants.
// Mounts to window.AgentChat. Consumes window.api.base for backend URL.
//
// Public API:
//   <window.AgentChat runId={runId} height={360} fullPanel={false} onClose={...}/>
//
// Backend events handled (per src/replicalpha/server/agent.py):
//   session, text_delta, tool_call, tool_result, cost_update, final_text,
//   suggested_followups (optional), error, done.

// ---------------------------------------------------------------------------
// SSE consumer — fetch + stream reader (EventSource doesn't support POST)
// ---------------------------------------------------------------------------

async function streamChat({ runId, sessionId, message, model, costCap, history,
                            onEvent, onDone, onError, signal }) {
  try {
    const base = (window.api && window.api.base) || 'http://localhost:8000';
    const res = await fetch(base + '/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
      body: JSON.stringify({
        session_id: sessionId,
        run_id: runId,
        message,
        model: model || 'claude-haiku-4-5-20251001',
        cost_cap_usd: costCap == null ? 0.50 : costCap,
        history: history || null,
      }),
      signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      onError({ code: 'http', message: `HTTP ${res.status}: ${t.slice(0, 200)}` });
      onDone();
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const frame = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        if (!frame || frame.startsWith(':')) continue; // heartbeat or empty
        const evMatch = frame.match(/^event:\s*(\S+)/m);
        const dataMatch = frame.match(/^data:\s*(.*)$/m);
        if (evMatch && dataMatch) {
          let data;
          try { data = JSON.parse(dataMatch[1]); } catch { data = { raw: dataMatch[1] }; }
          onEvent(evMatch[1], data);
        }
      }
    }
    onDone();
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    onError({ code: 'fetch', message: String(e && e.message || e) });
    onDone();
  }
}

// ---------------------------------------------------------------------------
// Tiny markdown subset (bold / italic / inline-code / h1-h3 / bullets / links)
// ---------------------------------------------------------------------------

function renderMarkdownLite(src) {
  if (!src) return null;
  const escape = (s) => String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const lines = String(src).split(/\r?\n/);
  const out = [];
  let listBuf = null;
  const flushList = () => {
    if (listBuf) { out.push({type:'ul', items:listBuf}); listBuf = null; }
  };
  for (const line of lines) {
    const m1 = line.match(/^#{1}\s+(.*)$/);
    const m2 = line.match(/^#{2}\s+(.*)$/);
    const m3 = line.match(/^#{3}\s+(.*)$/);
    const mBul = line.match(/^\s*[-*]\s+(.*)$/);
    if (m1) { flushList(); out.push({type:'h1', text:m1[1]}); continue; }
    if (m2) { flushList(); out.push({type:'h2', text:m2[1]}); continue; }
    if (m3) { flushList(); out.push({type:'h3', text:m3[1]}); continue; }
    if (mBul) { listBuf = listBuf || []; listBuf.push(mBul[1]); continue; }
    flushList();
    out.push({type:'p', text:line});
  }
  flushList();
  // Inline pass: **bold**, *italic*, `code`, [text](url)
  const inline = (raw) => {
    let html = escape(raw);
    html = html.replace(/`([^`]+)`/g, '<code style="background:var(--surface-1);padding:1px 4px;border-radius:3px;font-family:var(--mono);font-size:90%">$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener" style="color:var(--accent)">$1</a>');
    return html;
  };
  return out.map((b, i) => {
    if (b.type === 'h1') return <h1 key={i} style={{fontSize:18,margin:'8px 0 4px'}} dangerouslySetInnerHTML={{__html:inline(b.text)}}/>;
    if (b.type === 'h2') return <h2 key={i} style={{fontSize:16,margin:'6px 0 4px'}} dangerouslySetInnerHTML={{__html:inline(b.text)}}/>;
    if (b.type === 'h3') return <h3 key={i} style={{fontSize:14,margin:'4px 0 2px'}} dangerouslySetInnerHTML={{__html:inline(b.text)}}/>;
    if (b.type === 'ul') return (
      <ul key={i} style={{margin:'4px 0', paddingLeft:18}}>
        {b.items.map((it, j) => <li key={j} dangerouslySetInnerHTML={{__html:inline(it)}}/>)}
      </ul>
    );
    if (!b.text) return <div key={i} style={{height:6}}/>;
    return <p key={i} style={{margin:'4px 0', lineHeight:1.5}} dangerouslySetInnerHTML={{__html:inline(b.text)}}/>;
  });
}

// ---------------------------------------------------------------------------
// Tool-card body components (intentionally lean — ~30-60 lines each)
// ---------------------------------------------------------------------------

function ToolRunningBody() {
  return (
    <div style={{padding:'14px 16px', display:'flex', alignItems:'center', gap:10,
                 fontFamily:'var(--mono)', fontSize:12, color:'var(--text-3)'}}>
      <span style={{
        display:'inline-block', width:10, height:10, borderRadius:'50%',
        border:'2px solid var(--accent)', borderTopColor:'transparent',
        animation:'agent-spin 0.8s linear infinite',
      }}/>
      running…
    </div>
  );
}

function ToolErrorBody({ error }) {
  return (
    <div style={{padding:'12px 16px', background:'rgba(220,38,38,0.08)',
                 borderTop:'1px solid rgba(220,38,38,0.25)',
                 fontFamily:'var(--mono)', fontSize:12, color:'#dc2626'}}>
      ✗ {String(error || 'tool failed')}
    </div>
  );
}

function MetricGridCard({ data }) {
  // Try common shapes from run_factor_analysis / run_attribution / run_robustness.
  const tiles = [];
  const push = (label, value, hint) => tiles.push({ label, value, hint });

  const ic = data.ic_stats || data.ic || {};
  if (ic.mean != null) push('IC mean', formatNum(ic.mean, 4),
    ic.t_stat != null ? `t = ${formatNum(ic.t_stat, 2)}` : '');
  if (ic.ir != null) push('IR', formatNum(ic.ir, 3), '');
  if (ic.t_stat != null && ic.mean == null) push('t-stat', formatNum(ic.t_stat, 2),
    Math.abs(ic.t_stat) >= 2 ? '✓ |t| ≥ 2' : '');
  const ls = data.long_short_spread || data.spread || {};
  if (ls.mean != null) push('Q5 − Q1', (ls.mean > 0 ? '+' : '') + (ls.mean*100).toFixed(2) + '%',
    ls.t_stat != null ? `t = ${formatNum(ls.t_stat, 2)}` : '');
  const mono = data.monotonicity || {};
  if (mono.rho != null) push('Mono ρ', formatNum(mono.rho, 2),
    mono.is_monotonic ? '✓ monotonic' : '');
  const boot = data.bootstrap_ci || data.bootstrap || {};
  if (boot.lower != null && boot.upper != null) {
    push('Bootstrap 95%', `[${formatNum(boot.lower, 4)}, ${formatNum(boot.upper, 4)}]`,
         boot.excludes_zero ? '✓ excludes 0' : '');
  }

  // Fallback — if no recognized shape, dump 6 top-level scalar fields.
  if (tiles.length === 0) {
    Object.entries(data).slice(0, 6).forEach(([k, v]) => {
      if (typeof v === 'number' || typeof v === 'string') push(k, String(v), '');
    });
  }

  return (
    <div style={{padding:12}}>
      <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:1,
                   background:'var(--border)', border:'1px solid var(--border)', borderRadius:4}}>
        {tiles.slice(0, 6).map((t, i) => (
          <div key={i} style={{background:'var(--surface-2)', padding:'10px 12px'}}>
            <div style={{fontSize:10, color:'var(--text-3)', textTransform:'uppercase',
                         letterSpacing:0.6, marginBottom:4}}>{t.label}</div>
            <div style={{fontFamily:'var(--mono)', fontSize:15, color:'var(--text-1)',
                         fontWeight:500}}>{t.value}</div>
            {t.hint && <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--text-3)',
                                    marginTop:2}}>{t.hint}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartCard({ data }) {
  const ct = data.chart_type;
  if (!ct) return <TextCard data={data}/>;
  const series = data.series || [];
  if (ct === 'bars') return <BarsMini series={series} caption={data.caption}/>;
  if (ct === 'lines') return <LinesMini series={series} caption={data.caption}/>;
  if (ct === 'radar') return <RadarMini series={series} caption={data.caption}/>;
  return <TextCard data={data}/>;
}

function BarsMini({ series, caption }) {
  // series: [{label, value}] or [{name, points:[{label,value}]}]
  const flat = series.length && series[0].points ? series[0].points : series;
  const vals = flat.map(p => Number(p.value) || 0);
  const max = Math.max(1e-9, ...vals.map(Math.abs));
  return (
    <div style={{padding:'12px 16px'}}>
      <svg viewBox={`0 0 ${Math.max(120, flat.length*40)} 120`} width="100%" height="120">
        {flat.map((p, i) => {
          const h = (Math.abs(p.value) / max) * 90;
          const y = p.value >= 0 ? 60 - h : 60;
          return (
            <g key={i}>
              <rect x={i*40+8} y={y} width={28} height={h}
                    fill={p.value >= 0 ? '#10b981' : '#dc2626'} opacity={0.85}/>
              <text x={i*40+22} y={114} fontSize="9" textAnchor="middle"
                    fill="var(--text-3)" fontFamily="var(--mono)">{p.label || ''}</text>
            </g>
          );
        })}
        <line x1="0" y1="60" x2="100%" y2="60" stroke="var(--border)" strokeWidth="0.5"/>
      </svg>
      {caption && <div style={{fontSize:11, color:'var(--text-3)', marginTop:6}}>{caption}</div>}
    </div>
  );
}

function LinesMini({ series, caption }) {
  // series: [{name, points:[{x|label,y|value}]}]
  const lines = series.length ? series : [{name:'', points:[]}];
  const allY = lines.flatMap(l => (l.points || []).map(p => Number(p.y ?? p.value) || 0));
  const minY = Math.min(0, ...allY);
  const maxY = Math.max(1e-9, ...allY);
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#dc2626'];
  const W = 320, H = 120;
  return (
    <div style={{padding:'12px 16px'}}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
        {lines.map((line, li) => {
          const pts = line.points || [];
          if (!pts.length) return null;
          const path = pts.map((p, i) => {
            const x = (i / Math.max(1, pts.length-1)) * (W-20) + 10;
            const yv = Number(p.y ?? p.value) || 0;
            const y = H - 10 - ((yv - minY) / (maxY - minY || 1)) * (H-20);
            return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(' ');
          return <path key={li} d={path} stroke={colors[li % colors.length]} strokeWidth="1.5" fill="none"/>;
        })}
      </svg>
      {caption && <div style={{fontSize:11, color:'var(--text-3)', marginTop:6}}>{caption}</div>}
    </div>
  );
}

function RadarMini({ series, caption }) {
  const pts = series && series[0] && series[0].points ? series[0].points : series || [];
  const N = pts.length;
  if (!N) return <div style={{padding:14, color:'var(--text-3)', fontSize:11}}>(empty radar)</div>;
  const cx = 60, cy = 60, R = 50;
  const max = Math.max(1e-9, ...pts.map(p => Math.abs(Number(p.value) || 0)));
  const polar = (i, r) => {
    const a = (i / N) * 2 * Math.PI - Math.PI/2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const poly = pts.map((p, i) => polar(i, (Math.abs(Number(p.value) || 0) / max) * R).join(',')).join(' ');
  return (
    <div style={{padding:'12px 16px', display:'flex', gap:14, alignItems:'center'}}>
      <svg viewBox="0 0 120 120" width="120" height="120">
        {[0.33, 0.66, 1.0].map((s, i) => (
          <polygon key={i} points={pts.map((_, j) => polar(j, R*s).join(',')).join(' ')}
                   fill="none" stroke="var(--border)" strokeWidth="0.5"/>
        ))}
        <polygon points={poly} fill="rgba(59,130,246,0.25)" stroke="#3b82f6" strokeWidth="1.2"/>
        {pts.map((p, i) => {
          const [x, y] = polar(i, R + 8);
          return <text key={i} x={x} y={y} fontSize="8" fill="var(--text-3)"
                       textAnchor="middle" dominantBaseline="middle">{p.label || ''}</text>;
        })}
      </svg>
      <div style={{flex:1, fontSize:11, color:'var(--text-3)'}}>{caption || ''}</div>
    </div>
  );
}

function TableCard({ data }) {
  const cols = data.columns || (data.rows && data.rows[0] ? Object.keys(data.rows[0]) : []);
  const rows = data.rows || [];
  return (
    <div style={{maxHeight:240, overflow:'auto', borderTop:'1px solid var(--border)'}}>
      <table style={{width:'100%', borderCollapse:'collapse', fontSize:11.5,
                     fontFamily:'var(--mono)'}}>
        <thead>
          <tr>{cols.map(c => (
            <th key={c} style={{position:'sticky', top:0, background:'var(--surface-1)',
                                padding:'6px 10px', textAlign:'left', fontWeight:500,
                                color:'var(--text-3)', borderBottom:'1px solid var(--border)'}}>{c}</th>
          ))}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
              {cols.map(c => {
                const v = Array.isArray(r) ? r[cols.indexOf(c)] : r[c];
                const isNum = typeof v === 'number';
                return (
                  <td key={c} style={{padding:'6px 10px', textAlign:isNum?'right':'left',
                                      color:'var(--text-1)'}}>{
                    isNum ? formatNum(v, 4) : String(v == null ? '' : v)
                  }</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{padding:'6px 12px', fontSize:10, color:'var(--text-3)',
                   fontFamily:'var(--mono)', borderTop:'1px solid var(--border)'}}>
        {rows.length} rows
      </div>
    </div>
  );
}

function CodeCard({ data }) {
  const code = data.code || data.csv || data.text || '';
  const lang = data.language || (data.csv ? 'csv' : 'python');
  const [expanded, setExpanded] = React.useState(false);
  const lines = String(code).split('\n');
  const visible = expanded ? lines : lines.slice(0, 16);
  return (
    <div>
      <pre style={{margin:0, padding:'10px 14px', background:'#0f1218', color:'#cdd6e0',
                   fontFamily:'var(--mono)', fontSize:11.5, lineHeight:1.55,
                   maxHeight: expanded ? 'none' : 280, overflow:'auto',
                   borderTop:'1px solid var(--border)'}}>{visible.join('\n')}</pre>
      {lines.length > 16 && (
        <div style={{padding:'6px 12px', borderTop:'1px solid var(--border)'}}>
          <button onClick={() => setExpanded(e => !e)} style={miniBtn()}>
            {expanded ? 'Collapse' : `Show all (${lines.length} lines)`}
          </button>
          <span style={{fontSize:10, color:'var(--text-3)', fontFamily:'var(--mono)',
                        marginLeft:10}}>{lang}</span>
        </div>
      )}
    </div>
  );
}

function MarkdownCard({ data }) {
  const md = data.markdown || data.text || data.content || '';
  return (
    <div style={{padding:'10px 14px', fontSize:13, color:'var(--text-1)',
                 borderTop:'1px solid var(--border)', maxHeight:360, overflow:'auto'}}>
      {renderMarkdownLite(md)}
    </div>
  );
}

function DiffCard({ data }) {
  const added = data.lines_added != null ? data.lines_added : null;
  const removed = data.lines_removed != null ? data.lines_removed : null;
  const diff = data.unified_diff || data.diff || '';
  return (
    <div style={{borderTop:'1px solid var(--border)'}}>
      <div style={{padding:'8px 14px', display:'flex', gap:14, fontFamily:'var(--mono)',
                   fontSize:11, color:'var(--text-3)'}}>
        {added != null && <span style={{color:'#10b981'}}>+{added} added</span>}
        {removed != null && <span style={{color:'#dc2626'}}>−{removed} removed</span>}
      </div>
      {diff && (
        <pre style={{margin:0, padding:'8px 14px', background:'#0f1218',
                     fontFamily:'var(--mono)', fontSize:11.5, lineHeight:1.5,
                     maxHeight:280, overflow:'auto'}}>
          {String(diff).split('\n').map((line, i) => {
            const c = line.startsWith('+') && !line.startsWith('+++') ? 'rgba(16,185,129,0.15)'
                    : line.startsWith('-') && !line.startsWith('---') ? 'rgba(220,38,38,0.15)'
                    : 'transparent';
            const fg = line.startsWith('+') && !line.startsWith('+++') ? '#10b981'
                     : line.startsWith('-') && !line.startsWith('---') ? '#dc2626'
                     : '#cdd6e0';
            return <div key={i} style={{background:c, color:fg, padding:'0 4px'}}>{line || ' '}</div>;
          })}
        </pre>
      )}
    </div>
  );
}

function TextCard({ data }) {
  const txt = (typeof data === 'string') ? data
    : (data && data.status === 'not_implemented_in_v0.4')
      ? `⚠ ${data.message || 'Not implemented in v0.4'}`
      : JSON.stringify(data, null, 2);
  return (
    <pre style={{margin:0, padding:'10px 14px', background:'var(--surface-1)',
                 fontFamily:'var(--mono)', fontSize:11.5, lineHeight:1.55,
                 color:'var(--text-2)', borderTop:'1px solid var(--border)',
                 maxHeight:240, overflow:'auto', whiteSpace:'pre-wrap'}}>{txt}</pre>
  );
}

// ---------------------------------------------------------------------------
// Tool card shell
// ---------------------------------------------------------------------------

function ToolCard({ tool }) {
  const { name, status, result, displayHint } = tool;
  const data = (result && result.data) || {};
  const body = (() => {
    if (status === 'running') return <ToolRunningBody/>;
    if (status === 'error') return <ToolErrorBody error={result && result.error}/>;
    switch (displayHint) {
      case 'metric_grid': return <MetricGridCard data={data}/>;
      case 'chart':       return <ChartCard data={data}/>;
      case 'table':       return <TableCard data={data}/>;
      case 'code':        return <CodeCard data={data}/>;
      case 'markdown':    return <MarkdownCard data={data}/>;
      case 'diff':        return <DiffCard data={data}/>;
      case 'text':
      default:            return <TextCard data={data}/>;
    }
  })();

  const statusColor = status === 'done' ? '#10b981'
                    : status === 'error' ? '#dc2626'
                    : 'var(--accent)';
  const statusIcon = status === 'done' ? '✓' : status === 'error' ? '✗' : '◌';

  return (
    <div className="tool-card" style={{
      border:'1px solid var(--border)', borderRadius:6, background:'var(--surface-2)',
      margin:'8px 0', overflow:'hidden',
    }}>
      <div style={{
        height:32, padding:'0 12px', display:'flex', alignItems:'center', gap:10,
        borderBottom: status==='running' ? 'none' : '1px solid var(--border)',
        background:'var(--surface-1)',
      }}>
        <span style={{color:statusColor, fontFamily:'var(--mono)', fontSize:13}}>{statusIcon}</span>
        <span style={{fontFamily:'var(--mono)', fontSize:11.5, color:'var(--text-1)',
                      fontWeight:500}}>{name}</span>
        <span style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--text-3)',
                      textTransform:'uppercase', letterSpacing:0.6}}>{status}</span>
      </div>
      {body}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slash commands
// ---------------------------------------------------------------------------

const SLASH_COMMANDS = [
  { cmd: '/analyze', text: 'Run full factor analysis' },
  { cmd: '/risk',    text: 'Run risk attribution' },
  { cmd: '/compare', text: 'Compare with similar runs' },
  { cmd: '/code',    text: 'Show me the factor code' },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function AgentChat({ runId, height = 360, fullPanel = false, onClose }) {
  const [sessionId, setSessionId] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [streaming, setStreaming] = React.useState(false);
  const [cost, setCost] = React.useState({ spent: 0, cap: 0.50 });
  const [followups, setFollowups] = React.useState([]);
  const [model, setModel] = React.useState('claude-haiku-4-5-20251001');
  const [input, setInput] = React.useState('');
  const [errorBanner, setErrorBanner] = React.useState(null);
  const abortRef = React.useRef(null);
  const scrollRef = React.useRef(null);

  // Auto-scroll to bottom on new content (simple — no "manual scroll" tracking).
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  const pushMessage = (msg) => setMessages(prev => [...prev, msg]);
  const updateLastAssistant = (mut) => {
    setMessages(prev => {
      const out = [...prev];
      for (let i = out.length - 1; i >= 0; i--) {
        if (out[i].kind === 'assistant') {
          out[i] = mut({ ...out[i] });
          break;
        }
      }
      return out;
    });
  };

  const send = (textOverride) => {
    const text = (textOverride != null ? textOverride : input).trim();
    if (!text || streaming) return;
    setInput('');
    setFollowups([]);
    setErrorBanner(null);

    const userMsg = { kind:'user', content:text, ts:Date.now() };
    const assistantMsg = { kind:'assistant', content:'', tools:[], partial:true, ts:Date.now() };
    setMessages(prev => [...prev, userMsg, assistantMsg]);

    setStreaming(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    streamChat({
      runId,
      sessionId,
      message: text,
      model,
      costCap: cost.cap,
      history: null,
      signal: ctrl.signal,
      onEvent: (type, data) => {
        if (type === 'session') {
          setSessionId(data.session_id);
        } else if (type === 'text_delta') {
          updateLastAssistant(m => ({ ...m, content: (m.content || '') + (data.text || '') }));
        } else if (type === 'tool_call') {
          updateLastAssistant(m => ({
            ...m,
            tools: [...(m.tools || []), {
              id: data.id, name: data.name, args: data.args, status: 'running',
            }],
          }));
        } else if (type === 'tool_result') {
          updateLastAssistant(m => ({
            ...m,
            tools: (m.tools || []).map(t =>
              t.id === data.id
                ? { ...t,
                    status: (data.result && data.result.ok) ? 'done' : 'error',
                    result: data.result,
                    displayHint: data.result && data.result.display_hint }
                : t
            ),
          }));
        } else if (type === 'cost_update') {
          if (typeof data.cost_spent_usd === 'number') {
            setCost(c => ({ ...c, spent: data.cost_spent_usd }));
          }
        } else if (type === 'suggested_followups') {
          setFollowups(Array.isArray(data.followups) ? data.followups : []);
        } else if (type === 'final_text') {
          updateLastAssistant(m => ({ ...m, content: data.text || m.content, partial: false }));
        } else if (type === 'error') {
          setErrorBanner({ code: data.code, message: data.message,
                           cap: data.cost_cap_usd, spent: data.cost_spent_usd });
          updateLastAssistant(m => ({ ...m, partial:false, failed:true }));
        } else if (type === 'done') {
          // handled in onDone; nothing extra
        }
      },
      onDone: () => {
        setStreaming(false);
        abortRef.current = null;
        updateLastAssistant(m => ({ ...m, partial:false }));
      },
      onError: (err) => {
        setErrorBanner({ code: err.code, message: err.message });
        updateLastAssistant(m => ({ ...m, partial:false, failed:true }));
      },
    });
  };

  const cancel = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (sessionId && window.api && window.api.cancelSession) {
      window.api.cancelSession(sessionId).catch(() => {});
    }
    setStreaming(false);
  };

  const raiseCap = (delta) => {
    setCost(c => ({ ...c, cap: c.cap + delta }));
    setErrorBanner(null);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      send();
    } else if (e.key === 'Escape' && streaming) {
      e.preventDefault();
      cancel();
    }
  };

  const showSlash = input.startsWith('/') && !input.includes(' ');
  const slashMatches = showSlash
    ? SLASH_COMMANDS.filter(s => s.cmd.startsWith(input.toLowerCase()))
    : [];

  // Cost meter color
  const pct = cost.cap > 0 ? cost.spent / cost.cap : 0;
  const costColor = pct >= 0.9 ? '#dc2626' : pct >= 0.5 ? '#f59e0b' : '#10b981';

  // Empty state chips
  const exampleChips = [
    'Run full analysis',
    'Show me the factor code',
    'Why is the verdict not green?',
    'Compare with similar papers',
    'Add 1/99 winsorization',
    'Export portfolio to IBKR CSV',
  ];

  const containerStyle = {
    display:'flex', flexDirection:'column', height: fullPanel ? '100%' : height,
    background:'var(--surface-1)', border:'1px solid var(--border)', borderRadius:6,
    overflow:'hidden', minHeight:0,
  };

  return (
    <div style={containerStyle}>
      <style>{`@keyframes agent-spin { to { transform: rotate(360deg); } }
                @keyframes agent-blink { 50% { opacity: 0.2; } }`}</style>

      {/* Header */}
      <div style={{
        height:40, padding:'0 14px', display:'flex', alignItems:'center', gap:12,
        borderBottom:'1px solid var(--border)', background:'var(--surface-2)', flexShrink:0,
      }}>
        <span style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--text-2)',
                      textTransform:'uppercase', letterSpacing:0.6}}>Agent</span>
        {runId && <span style={{fontFamily:'var(--mono)', fontSize:10,
                                color:'var(--text-3)'}}>· {runId}</span>}
        <div style={{flex:1}}/>
        <span style={{fontFamily:'var(--mono)', fontSize:11, color:costColor}}>
          ${cost.spent.toFixed(3)} / ${cost.cap.toFixed(2)} cap
        </span>
        {streaming && (
          <button onClick={cancel} style={miniBtn()} title="Cancel (Esc)">cancel</button>
        )}
        <button onClick={() => { setMessages([]); setFollowups([]); setErrorBanner(null); }}
                style={miniBtn()} title="Clear chat">clear</button>
        {onClose && (
          <button onClick={onClose} style={miniBtn()} title="Close">×</button>
        )}
      </div>

      {/* Error banner */}
      {errorBanner && (
        <div style={{
          padding:'8px 14px', fontSize:12, fontFamily:'var(--mono)',
          background: errorBanner.code === 'cost_cap' ? 'rgba(245,158,11,0.12)'
                    : errorBanner.code === 'cancelled' ? 'rgba(120,120,120,0.15)'
                    : 'rgba(220,38,38,0.12)',
          color: errorBanner.code === 'cost_cap' ? '#b45309'
               : errorBanner.code === 'cancelled' ? 'var(--text-3)'
               : '#b91c1c',
          borderBottom:'1px solid var(--border)', display:'flex',
          alignItems:'center', gap:10,
        }}>
          {errorBanner.code === 'cancelled'
            ? 'Cancelled.'
            : errorBanner.code === 'cost_cap'
            ? `⚠ Cost cap reached ($${(errorBanner.spent || 0).toFixed(3)} / $${(errorBanner.cap || cost.cap).toFixed(2)}).`
            : `⚠ ${errorBanner.message || 'Error'}`}
          {errorBanner.code === 'cost_cap' && (
            <button onClick={() => raiseCap(0.25)} style={miniBtn()}>Raise cap +$0.25</button>
          )}
          <div style={{flex:1}}/>
          <button onClick={() => setErrorBanner(null)} style={miniBtn()}>dismiss</button>
        </div>
      )}

      {/* Scrollback */}
      <div ref={scrollRef} style={{flex:1, overflowY:'auto', padding:'12px 14px', minHeight:0}}>
        {messages.length === 0 ? (
          <div style={{textAlign:'center', padding:'40px 20px', color:'var(--text-3)'}}>
            <div style={{fontSize:13, marginBottom:14}}>
              Ask the agent anything about this run.
            </div>
            <div style={{display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center'}}>
              {exampleChips.map((c, i) => (
                <button key={i} onClick={() => send(c)} style={chipBtn()}>{c}</button>
              ))}
            </div>
          </div>
        ) : messages.map((m, i) => (
          <MessageBlock key={i} m={m}/>
        ))}
      </div>

      {/* Suggested follow-ups */}
      {!streaming && followups.length > 0 && (
        <div style={{padding:'8px 14px', display:'flex', gap:6, flexWrap:'wrap',
                     borderTop:'1px solid var(--border)', background:'var(--surface-2)'}}>
          {followups.slice(0, 3).map((f, i) => (
            <button key={i} onClick={() => send(f)} style={chipBtn()}>{f}</button>
          ))}
        </div>
      )}

      {/* Slash command dropdown */}
      {slashMatches.length > 0 && (
        <div style={{borderTop:'1px solid var(--border)', background:'var(--surface-2)',
                     maxHeight:140, overflow:'auto'}}>
          {slashMatches.map(s => (
            <div key={s.cmd} onClick={() => setInput(s.text)} style={{
              padding:'6px 14px', cursor:'pointer', display:'flex', gap:10,
              fontFamily:'var(--mono)', fontSize:11,
            }}
            onMouseEnter={e=>e.currentTarget.style.background='var(--surface-1)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <span style={{color:'var(--accent)', minWidth:80}}>{s.cmd}</span>
              <span style={{color:'var(--text-2)'}}>{s.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Composer */}
      <div style={{
        padding:10, borderTop:'1px solid var(--border)', background:'var(--surface-2)',
        display:'flex', gap:8, alignItems:'flex-end', flexShrink:0,
      }}>
        <select value={model} onChange={e => setModel(e.target.value)} style={{
          background:'var(--surface-1)', color:'var(--text-2)', border:'1px solid var(--border)',
          borderRadius:4, padding:'4px 6px', fontFamily:'var(--mono)', fontSize:10,
        }} disabled={streaming}>
          <option value="claude-haiku-4-5-20251001">Haiku 4.5</option>
          <option value="claude-sonnet-4-5-20251001">Sonnet 4.5</option>
          <option value="claude-opus-4-7-20251115">Opus 4.7</option>
        </select>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask the agent to analyze, compare, build a portfolio…"
          rows={1}
          style={{
            flex:1, resize:'none', background:'var(--surface-1)', color:'var(--text-1)',
            border:'1px solid var(--border)', borderRadius:4, padding:'7px 10px',
            fontFamily:'var(--sans)', fontSize:13, lineHeight:1.4, minHeight:34, maxHeight:140,
            outline:'none',
          }}
        />
        <button onClick={() => send()} disabled={!input.trim() || streaming} style={{
          background: (input.trim() && !streaming) ? 'var(--accent)' : 'var(--surface-1)',
          color: (input.trim() && !streaming) ? '#fff' : 'var(--text-3)',
          border:'1px solid var(--border)', borderRadius:4,
          padding:'7px 14px', fontFamily:'var(--mono)', fontSize:11, fontWeight:500,
          cursor: (input.trim() && !streaming) ? 'pointer' : 'default',
        }} title="Send (Cmd/Ctrl-Enter)">
          {streaming ? '…' : 'send'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message block — user / assistant / system
// ---------------------------------------------------------------------------

function MessageBlock({ m }) {
  if (m.kind === 'user') {
    return (
      <div style={{display:'flex', justifyContent:'flex-end', margin:'8px 0'}}>
        <div style={{
          background:'var(--accent)', color:'#fff', padding:'8px 12px',
          borderRadius:8, maxWidth:'80%', fontSize:13, lineHeight:1.45,
          whiteSpace:'pre-wrap',
        }}>{m.content}</div>
      </div>
    );
  }
  if (m.kind === 'system') {
    return (
      <div style={{textAlign:'center', margin:'6px 0', fontSize:11,
                   color:'var(--text-3)', fontStyle:'italic'}}>{m.content}</div>
    );
  }
  // assistant
  return (
    <div style={{margin:'8px 0'}}>
      {m.content && (
        <div style={{
          background:'var(--surface-2)', color:'var(--text-1)', padding:'8px 12px',
          borderRadius:8, fontSize:13, lineHeight:1.5, maxWidth:'92%',
        }}>
          {renderMarkdownLite(m.content)}
          {m.partial && <span style={{
            display:'inline-block', width:8, height:14, background:'var(--accent)',
            verticalAlign:'middle', marginLeft:2, animation:'agent-blink 1.2s infinite',
          }}/>}
        </div>
      )}
      {(m.tools || []).map(t => <ToolCard key={t.id} tool={t}/>)}
      {m.failed && (
        <div style={{fontSize:11, color:'#dc2626', fontFamily:'var(--mono)',
                     marginTop:4}}>[failed]</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

function miniBtn() {
  return {
    background:'var(--surface-1)', color:'var(--text-2)', border:'1px solid var(--border)',
    borderRadius:3, padding:'3px 8px', fontFamily:'var(--mono)', fontSize:10,
    cursor:'pointer',
  };
}

function chipBtn() {
  return {
    background:'var(--surface-2)', color:'var(--text-1)', border:'1px solid var(--border)',
    borderRadius:14, padding:'5px 12px', fontFamily:'var(--sans)', fontSize:12,
    cursor:'pointer', height:28,
  };
}

function formatNum(v, d) {
  if (typeof v !== 'number') return String(v);
  if (!isFinite(v)) return String(v);
  return v.toFixed(d == null ? 4 : d);
}

window.AgentChat = AgentChat;

// ===== app.jsx =====
// Main app shell: sidebar nav, route switching, tweaks integration.

const { useState: useStateA, useEffect: useEffectA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#1976d2",
  "density": "comfortable",
  "nodeSize": "influence",
  "theme": "light",
  "showKpi": true,
  "monoFont": "JetBrains Mono",
  "borderStyle": "soft"
}/*EDITMODE-END*/;

function App() {
  const [route, setRoute] = useStateA({ name: 'timeline', params: {} });
  const [aiOpen, setAiOpen] = useStateA(false);
  const [uploadOpen, setUploadOpen] = useStateA(false);
  const [ideOpen, setIdeOpen] = useStateA(null); // paper id or null
  const [extraPapers, setExtraPapers] = useStateA([]);
  const [cmdkOpen, setCmdkOpen] = useStateA(false);
  const [lang] = window.useLang ? window.useLang() : [window.__lang || 'zh'];

  const TweaksPanel = window.TweaksPanel;
  const TweakSection = window.TweakSection;
  const TweakColor = window.TweakColor;
  const TweakRadio = window.TweakRadio;
  const TweakSelect = window.TweakSelect;
  const TweakToggle = window.TweakToggle;
  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  // Global Cmd+K hotkey
  if (window.useCmdK) window.useCmdK(cmdkOpen, () => setCmdkOpen(true));

  // Splice user/AI papers into the global PAPERS list so timeline picks them up
  useEffectA(() => {
    if (!window.__OG_PAPERS) window.__OG_PAPERS = window.PAPERS;
    window.PAPERS = [...window.__OG_PAPERS, ...extraPapers];
  }, [extraPapers]);

  // Apply tweaks → CSS vars + theme
  useEffectA(() => {
    const r = document.documentElement;
    r.setAttribute('data-theme', tweaks.theme || 'light');
    r.style.setProperty('--accent', tweaks.accent);
    r.style.setProperty('--accent-dim', tweaks.accent + '22');
    r.style.setProperty('--mono', `"${tweaks.monoFont}", "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace`);
    if (tweaks.borderStyle === 'sharp') {
      r.style.setProperty('--radius-1', '0px');
      r.style.setProperty('--radius-2', '2px');
    } else if (tweaks.borderStyle === 'rounded') {
      r.style.setProperty('--radius-1', '8px');
      r.style.setProperty('--radius-2', '12px');
    } else {
      r.style.setProperty('--radius-1', '4px');
      r.style.setProperty('--radius-2', '6px');
    }
  }, [tweaks]);

  function navigate(name, params = {}) { setRoute({ name, params }); }
  function openRun(id) { navigate('run', { id }); }
  function openIde(id) { setIdeOpen(id); }
  window.__openRun = openRun;

  function toggleTheme() { setTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark'); }
  function toggleDensity() {
    const seq = ['compact', 'comfortable', 'spacious'];
    const next = seq[(seq.indexOf(tweaks.density) + 1) % seq.length];
    setTweak('density', next);
  }
  function switchLang() {
    if (window.setLang) window.setLang((window.__lang || 'zh') === 'zh' ? 'en' : 'zh');
  }

  function addPapers(papers) {
    setExtraPapers(p => [...p, ...papers]);
  }

  return (
    <div style={{display:'flex', height:'100vh', width:'100vw', overflow:'hidden', background:'var(--bg-base)'}}>
      <Sidebar route={route} onNav={navigate} onOpenAI={()=>setAiOpen(true)} onOpenUpload={()=>setUploadOpen(true)}/>
      <div style={{flex:1, display:'flex', flexDirection:'column', minWidth:0, position:'relative'}}>
        <TopBar route={route} onNav={navigate} onOpenAI={()=>setAiOpen(true)} onOpenUpload={()=>setUploadOpen(true)} theme={tweaks.theme} onToggleTheme={toggleTheme} onSwitchLang={switchLang} onOpenCmdK={()=>setCmdkOpen(true)}/>
        <div style={{flex:1, minHeight:0, position:'relative', overflow:'hidden'}}>
          {route.name === 'landing'  && <Landing onStart={() => navigate('timeline')}/>}
          {route.name === 'timeline' && <Timeline tweaks={tweaks}
              onOpenRun={openRun}
              onOpenIde={openIde}
              onCompare={(ids) => navigate('compare', { ids })}/>}
          {route.name === 'run'      && <RunDetail runId={route.params.id}
              onBack={() => navigate('timeline')}
              onOpenRun={openRun} onOpenIde={openIde}
              onNav={navigate}/>}
          {route.name === 'analysis' && window.AnalysisPage && <window.AnalysisPage runId={route.params.id} onBack={() => navigate('run', {id: route.params.id})}/>}
          {route.name === 'factors'  && <Factors onOpenRun={openRun}/>}
          {route.name === 'library'  && <Library onOpenRun={openRun}/>}
          {route.name === 'upload'   && <Upload onOpenRun={openRun}/>}
          {route.name === 'compare'  && <Compare ids={route.params.ids || []} onOpenRun={openRun}/>}
          {route.name === 'monitor'  && window.MonitorPage && <window.MonitorPage onOpenRun={openRun} onNav={navigate}/>}
          {route.name === 'monitor-detail' && window.MonitorDetail && <window.MonitorDetail factorId={route.params.id} onBack={() => navigate('monitor')}/>}
          {route.name === 'portfolio' && window.PortfolioPage && <window.PortfolioPage onNav={navigate}/>}
          {route.name === 'settings' && window.SettingsPage && <window.SettingsPage onNav={navigate}/>}
          {route.name === 'search'   && window.SearchResults && <window.SearchResults query={route.params.q || ''} onOpenRun={openRun} onOpenAI={()=>setAiOpen(true)}/>}
          {route.name === 'profile'  && window.PublicProfile && <window.PublicProfile username={route.params.username || 'VernonOY'} onOpenRun={openRun}/>}
          {!['landing','timeline','run','analysis','factors','library','upload','compare','monitor','monitor-detail','portfolio','settings','search','profile'].includes(route.name) &&
            window.NotFoundPage && <window.NotFoundPage onNav={navigate}/>}
        </div>
      </div>

      <window.AISearch open={aiOpen} onClose={()=>setAiOpen(false)} onAddPapers={addPapers}/>
      <window.CustomUpload open={uploadOpen} onClose={()=>setUploadOpen(false)} onAdd={(p)=>addPapers([p])}/>
      {ideOpen && <window.IDE paperId={ideOpen} onClose={()=>setIdeOpen(null)} onOpenRun={(id)=>{ setIdeOpen(null); openRun(id); }}/>}

      {window.CommandPalette && <window.CommandPalette
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        onNav={(name, params) => { setCmdkOpen(false); navigate(name, params || {}); }}
        onOpenAI={() => { setCmdkOpen(false); setAiOpen(true); }}
        onOpenUpload={() => { setCmdkOpen(false); setUploadOpen(true); }}
        onToggleTheme={() => { toggleTheme(); }}
        onToggleDensity={() => { toggleDensity(); }}
        onSwitchLang={() => { switchLang(); }}
      />}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Aesthetics">
          <TweakColor label="Accent" value={tweaks.accent} onChange={v => setTweak('accent', v)}/>
          <TweakRadio label="Theme" value={tweaks.theme} onChange={v => setTweak('theme', v)}
            options={[{value:'light', label:'Day'},{value:'dark', label:'Night'}]}/>
          <TweakRadio label="Borders" value={tweaks.borderStyle} onChange={v => setTweak('borderStyle', v)}
            options={[{value:'sharp', label:'Sharp'},{value:'soft', label:'Soft'},{value:'rounded', label:'Round'}]}/>
          <TweakSelect label="Mono font" value={tweaks.monoFont} onChange={v => setTweak('monoFont', v)}
            options={[
              {value:'JetBrains Mono', label:'JetBrains Mono'},
              {value:'IBM Plex Mono', label:'IBM Plex Mono'},
              {value:'Geist Mono', label:'Geist Mono'},
              {value:'Berkeley Mono', label:'Berkeley Mono (sub)'},
            ]}/>
        </TweakSection>
        <TweakSection title="Timeline">
          <TweakRadio label="Density" value={tweaks.density} onChange={v => setTweak('density', v)}
            options={[{value:'compact', label:'Compact'},{value:'comfortable', label:'Comf'},{value:'spacious', label:'Loose'}]}/>
          <TweakRadio label="Node size" value={tweaks.nodeSize} onChange={v => setTweak('nodeSize', v)}
            options={[{value:'influence', label:'Influence'},{value:'ic', label:'|IC|'},{value:'none', label:'Fixed'}]}/>
          <TweakToggle label="Show KPI strip" value={tweaks.showKpi} onChange={v => setTweak('showKpi', v)}/>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

function Sidebar({ route, onNav, onOpenAI, onOpenUpload }) {
  const [lang] = window.useLang ? window.useLang() : [window.__lang || 'zh'];
  const items = [
    { name: 'landing',  icon: '◉', label: window.t("nav.home") },
    { name: 'timeline', icon: '⌖', label: window.t("nav.timeline") },
    { name: 'factors',  icon: '⊞', label: window.t("nav.factors") },
    { name: 'library',  icon: '≡', label: window.t("nav.library") },
  ];
  return (
    <div style={{
      width:200, flexShrink:0, background:'var(--surface-1)',
      borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column',
    }}>
      <div style={{
        padding:'18px 20px', borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', gap:10,
      }}>
        <div style={{
          width:24, height:24, borderRadius:5, background:'var(--accent)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'var(--mono)', fontSize:12, fontWeight:700, color:'#fff',
        }}>R</div>
        <div>
          <div style={{fontSize:13, fontWeight:600, color:'var(--text-1)', letterSpacing:-0.2}}>replicalpha</div>
          <div style={{fontSize:9, fontFamily:'var(--mono)', color:'var(--text-3)', letterSpacing:0.5}}>v0.1 · LOCAL</div>
        </div>
      </div>

      <nav style={{padding:8}}>
        {items.map(it => (
          <button key={it.name} onClick={() => onNav(it.name)} style={{
            display:'flex', alignItems:'center', gap:12, padding:'8px 12px',
            background: route.name === it.name ? 'var(--surface-2)' : 'transparent',
            border:'none', borderLeft:`2px solid ${route.name === it.name ? 'var(--accent)' : 'transparent'}`,
            borderRadius:'0 4px 4px 0', width:'100%', cursor:'pointer',
            color: route.name === it.name ? 'var(--text-1)' : 'var(--text-3)',
            fontSize:13, marginBottom:2, textAlign:'left',
          }}>
            <span style={{fontFamily:'var(--mono)', width:14, fontSize:12}}>{it.icon}</span>
            <span>{it.label}</span>
          </button>
        ))}
      </nav>

      <div style={{padding:'8px 12px 4px', borderTop:'1px solid var(--border-soft)', marginTop:8}}>
        <Mono size={9} color="var(--text-3)" style={{letterSpacing:0.6}}>{window.t("sidebar.add_to_timeline")}</Mono>
      </div>
      <div style={{padding:'4px 8px'}}>
        <button onClick={onOpenAI} style={addBtn()}>
          <span style={{
            width:18, height:18, borderRadius:4,
            background:'linear-gradient(135deg, var(--accent), #7e57c2)',
            color:'#fff', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0,
          }}>✦</span>
          <span style={{fontSize:12.5}}>{window.t("sidebar.ai_search")}</span>
          <Mono size={9} color="var(--text-3)" style={{marginLeft:'auto'}}>arxiv·ssrn</Mono>
        </button>
        <button onClick={onOpenUpload} style={addBtn()}>
          <span style={{
            width:18, height:18, borderRadius:4, background:'var(--surface-2)',
            border:'1px solid var(--border)', color:'var(--text-2)', fontSize:11,
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          }}>↑</span>
          <span style={{fontSize:12.5}}>{window.t("sidebar.custom_upload")}</span>
        </button>
        <button onClick={() => onNav('upload')} style={addBtn()}>
          <span style={{
            width:18, height:18, borderRadius:4, background:'var(--surface-2)',
            border:'1px solid var(--border)', color:'var(--text-2)', fontSize:11,
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          }}>⌗</span>
          <span style={{fontSize:12.5}}>{window.t("sidebar.pipeline_queue")}</span>
        </button>
      </div>

      <div style={{flex:1}}/>

      <div style={{padding:'14px 16px', borderTop:'1px solid var(--border)'}}>
        <Mono size={9} color="var(--text-3)">RUNS_ROOT=./runs</Mono>
        <div style={{display:'flex', alignItems:'center', gap:6, marginTop:6}}>
          <span style={{width:6, height:6, borderRadius:'50%', background:'#22c55e'}}/>
          <Mono size={10} color="var(--text-2)">localhost:8000</Mono>
        </div>
        <Mono size={9} color="var(--text-3)">FastAPI · running</Mono>
      </div>
    </div>
  );
}

function addBtn() {
  return {
    display:'flex', alignItems:'center', gap:10, padding:'7px 10px', width:'100%',
    background:'transparent', border:'none', cursor:'pointer',
    color:'var(--text-2)', textAlign:'left', borderRadius:4, marginBottom:1,
  };
}

function TopBar({ route, onNav, onOpenAI, onOpenUpload, theme, onToggleTheme, onSwitchLang, onOpenCmdK }) {
  const [lang] = window.useLang ? window.useLang() : [window.__lang || 'zh'];
  const crumb = {
    landing:  ['/', window.t('crumb.landing', 'landing')],
    timeline: ['/timeline', window.t('crumb.timeline', 'archive · timeline')],
    factors:  ['/factors',  window.t('crumb.factors', 'cross-paper aggregates')],
    library:  ['/library',  window.t('crumb.library', 'all papers')],
    upload:   ['/upload',   window.t('crumb.upload', 'pipeline queue')],
    run:      [`/runs/${route.params.id || ''}`, window.t('crumb.run', 'reproduction report')],
    analysis: [`/runs/${route.params.id || ''}/analysis`, window.t('crumb.analysis', 'factor analysis')],
    compare:  [`/compare?ids=${(route.params.ids||[]).join(',')}`, window.t('crumb.compare', 'side-by-side')],
    monitor:  ['/monitor',  window.t('crumb.monitor', 'live factor monitoring')],
    'monitor-detail': [`/monitor/${route.params.id || ''}`, window.t('crumb.monitor_detail', 'factor detail')],
    portfolio:['/portfolio',window.t('crumb.portfolio', 'paper trading')],
    settings: ['/settings', window.t('crumb.settings', 'preferences')],
    search:   ['/search',   window.t('crumb.search', 'results')],
    profile:  [`/u/${route.params.username || 'me'}`, window.t('crumb.profile', 'public profile')],
  }[route.name] || ['/', ''];

  return (
    <div style={{
      height:44, padding:'0 24px', background:'var(--surface-1)',
      borderBottom:'1px solid var(--border)', display:'flex',
      alignItems:'center', gap:14, flexShrink:0,
    }}>
      <div style={{display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0}}>
        <Mono size={11} color="var(--accent)">{crumb[0]}</Mono>
        <Mono size={11} color="var(--text-3)">·</Mono>
        <Mono size={11} color="var(--text-3)">{crumb[1]}</Mono>
      </div>

      <button onClick={onOpenCmdK} title={window.t('top.cmdk_hint', 'Open command palette (⌘K)')} style={{
        display:'flex', alignItems:'center', gap:6, padding:'4px 8px',
        background:'transparent', border:'1px solid var(--border)', borderRadius:4,
        cursor:'pointer', color:'var(--text-3)', fontFamily:'var(--mono)', fontSize:10, letterSpacing:0.5,
      }}>⌘K</button>

      {window.SyncIndicator ? <window.SyncIndicator/> : (
        <Mono size={10} color="var(--text-3)">SYNC ✓</Mono>
      )}

      <Mono size={10} color="var(--text-3)">{new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', hour12:false })}</Mono>

      {window.NotificationsBell && <window.NotificationsBell onNav={onNav}/>}

      <button onClick={onSwitchLang} title={window.t('top.switch_lang', 'Switch language')} style={{
        height:28, minWidth:36, padding:'0 8px', borderRadius:4,
        background:'transparent', color:'var(--text-2)', border:'1px solid var(--border)', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:11,
        fontFamily:'var(--mono)', fontWeight:500, letterSpacing:0.5,
      }}>{lang === 'zh' ? '中' : 'EN'}</button>

      <button onClick={onToggleTheme} title={theme === 'dark' ? window.t('top.theme_to_day','Switch to day') : window.t('top.theme_to_night','Switch to night')} style={{
        width:28, height:28, borderRadius:4, padding:0,
        background:'transparent', color:'var(--text-2)', border:'1px solid var(--border)', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:13,
      }}>{theme === 'dark' ? '☀' : '☾'}</button>
      <button onClick={onOpenAI} style={{
        padding:'5px 12px', borderRadius:4, fontSize:11, fontWeight:500, fontFamily:'var(--mono)',
        background:'transparent', color:'var(--text-2)', border:'1px solid var(--border)', cursor:'pointer',
        display:'flex', alignItems:'center', gap:6,
      }}>
        <span style={{
          width:14, height:14, borderRadius:3,
          background:'linear-gradient(135deg, var(--accent), #7e57c2)',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
          color:'#fff', fontSize:9,
        }}>✦</span>
        {window.t("top.ai_search")}
      </button>
      <button onClick={onOpenUpload} style={{
        padding:'5px 12px', borderRadius:4, fontSize:11,
        background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer',
        fontWeight:500,
      }}>{window.t("top.new_run")}</button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
