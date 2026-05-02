// API client for replicalpha FastAPI backend.
// Single source of truth for the backend base URL — set window.__API_BASE before
// the bundle loads to override the default localhost target.

// When served by FastAPI (same-origin) leave base empty so URLs are relative;
// when opened via file://, default to the local dev server.
const API_BASE = window.__API_BASE !== undefined
  ? window.__API_BASE
  : (location.protocol === 'http:' || location.protocol === 'https:')
    ? ''
    : 'http://localhost:8000';

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

// ---------------------------------------------------------------------------
// Adapter layer — backend Pydantic field names → frontend analysis.jsx names.
// Backend keeps verbose snake_case (e.g. monotonicity.spearman_rho); frontend
// uses brief names from the design brief (e.g. monotonicity.spearman). All
// field renames live here in 3 pure functions; no other module should map
// fields. v1.0 will collapse this once the API is frozen.
// ---------------------------------------------------------------------------

function normalizeAnalysis(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const out = { ...raw };

  // ic_series: dict[date_str, float] → list[{date, ic}]
  if (raw.ic_series && !Array.isArray(raw.ic_series)) {
    out.ic_series = Object.entries(raw.ic_series)
      .map(([date, ic]) => ({ date, ic }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // monotonicity.spearman_rho → spearman
  if (raw.monotonicity) {
    out.monotonicity = {
      spearman: raw.monotonicity.spearman_rho ?? raw.monotonicity.spearman ?? null,
      p_value: raw.monotonicity.p_value ?? null,
      is_monotonic: raw.monotonicity.is_monotonic ?? null,
    };
  }

  // forward_ic[].horizon_days/ic_mean/n_obs → horizon/ic/n
  if (Array.isArray(raw.forward_ic)) {
    out.forward_ic = raw.forward_ic.map(e => ({
      horizon: e.horizon_days ?? e.horizon,
      ic: e.ic_mean ?? e.ic,
      t_stat: e.t_stat,
      p_value: e.p_value,
      n: e.n_obs ?? e.n,
    }));
  }

  // quintiles[].name/n_periods → q/n; keep mean_return/t_stat as-is
  if (Array.isArray(raw.quintiles)) {
    out.quintiles = raw.quintiles.map(e => ({
      q: e.name ?? e.q,
      mean_return: e.mean_return,
      t_stat: e.t_stat,
      n: e.n_periods ?? e.n,
    }));
  }

  // top-level long_short_spread/long_short_t_stat → nested {spread, t_stat}
  if (raw.long_short_spread !== undefined && typeof raw.long_short_spread !== 'object') {
    out.long_short_spread = {
      spread: raw.long_short_spread,
      t_stat: raw.long_short_t_stat ?? null,
    };
  }

  return out;
}

function normalizeAttribution(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const out = { ...raw };

  // top-level alpha/alpha_t_stat/alpha_p_value/r_squared → idiosyncratic_alpha {...}
  if (raw.alpha !== undefined && !raw.idiosyncratic_alpha) {
    out.idiosyncratic_alpha = {
      alpha: raw.alpha,
      t_stat: raw.alpha_t_stat ?? null,
      p_value: raw.alpha_p_value ?? null,
      r_squared: raw.r_squared ?? null,
    };
  }

  // style_betas: keep [{factor, beta, t_stat, p_value}] as-is — already matches brief.
  // Frontend may key on `factor` field; ensure it's lowercase.
  if (Array.isArray(raw.style_betas)) {
    out.style_betas = raw.style_betas.map(e => ({
      factor: (e.factor || '').toLowerCase(),
      beta: e.beta,
      t_stat: e.t_stat,
      p_value: e.p_value,
    }));
  }

  // sector_exposures[].weight/n_stocks already match (sector + weight)
  if (Array.isArray(raw.sector_exposures)) {
    out.sector_exposure = raw.sector_exposures.map(e => ({
      sector: e.sector,
      weight: e.weight,
      n_stocks: e.n_stocks,
    }));
  }

  // rolling_betas — passthrough if backend returns it (Stage 3b),
  // otherwise leave undefined → frontend NoData.

  // turnover/capacity passthrough (Stage 3d/3e).

  return out;
}

function normalizeRobustness(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const out = { ...raw };

  // Backend returns yearly + quarterly separately → frontend wants subperiod_ic combined
  // Use yearly by default; frontend Heatmap can also accept quarterly granularity.
  if (Array.isArray(raw.yearly)) {
    out.subperiod_ic = raw.yearly.map(e => ({
      period: e.period,
      ic: e.ic,
      t_stat: e.t_stat,
      n: e.n_obs ?? e.n,
    }));
  }
  if (Array.isArray(raw.quarterly)) {
    out.subperiod_ic_quarterly = raw.quarterly.map(e => ({
      period: e.period,
      ic: e.ic,
      t_stat: e.t_stat,
      n: e.n_obs ?? e.n,
    }));
  }

  // top-level regimes → regime_ic
  if (Array.isArray(raw.regimes)) {
    out.regime_ic = raw.regimes.map(e => ({
      regime: e.regime,
      ic: e.ic,
      t_stat: e.t_stat,
      n: e.n_obs ?? e.n,
    }));
  }

  // bootstrap_ic → bootstrap_ci with renamed fields
  if (raw.bootstrap_ic) {
    const b = raw.bootstrap_ic;
    out.bootstrap_ci = {
      ic_mean: b.mean ?? b.ic_mean ?? null,
      ci_lower: b.ci_lower,
      ci_upper: b.ci_upper,
      covers_zero: b.ci_lower != null && b.ci_upper != null
        ? (b.ci_lower <= 0 && b.ci_upper >= 0)
        : null,
      n_bootstrap: b.n_bootstrap,
      confidence: b.confidence,
    };
  }

  // universe_split[].slice_name/n_stocks → slice/n_stocks
  if (Array.isArray(raw.universe_split)) {
    out.universe_split = raw.universe_split.map(e => ({
      slice: e.slice_name ?? e.slice,
      ic: e.ic,
      t_stat: e.t_stat,
      n_stocks: e.n_stocks,
    }));
  }

  return out;
}

window.api = {
  base: API_BASE,
  // runs
  listRuns: () => _json('/runs'),
  getRun: (id) => _json(`/runs/${encodeURIComponent(id)}`),
  // analysis artifacts (GET → 404 if not yet computed) — wrapped with adapters
  getAnalysis: async (id) => normalizeAnalysis(await _json(`/runs/${encodeURIComponent(id)}/analysis`)),
  getAttribution: async (id) => normalizeAttribution(await _json(`/runs/${encodeURIComponent(id)}/attribution`)),
  getRobustness: async (id) => normalizeRobustness(await _json(`/runs/${encodeURIComponent(id)}/robustness`)),
  // compute (POST → triggers tool, returns result) — also normalized
  computeAnalysis: async (id) => normalizeAnalysis(await _json(`/runs/${encodeURIComponent(id)}/analysis/compute`, {method:'POST'})),
  computeAttribution: async (id) => normalizeAttribution(await _json(`/runs/${encodeURIComponent(id)}/attribution/compute`, {method:'POST'})),
  computeRobustness: async (id) => normalizeRobustness(await _json(`/runs/${encodeURIComponent(id)}/robustness/compute`, {method:'POST'})),
  // agent (used by Part 2 — POST /agent/chat is SSE, handled by chat component directly)
  getTools: () => _json('/agent/tools'),
  getSession: (sid) => _json(`/agent/chat/${encodeURIComponent(sid)}`),
  cancelSession: (sid) => fetch(API_BASE + `/agent/chat/${encodeURIComponent(sid)}/cancel`, {method:'POST'}),
  // expose normalize functions for tests / direct use
  _normalize: { analysis: normalizeAnalysis, attribution: normalizeAttribution, robustness: normalizeRobustness },
};
