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
