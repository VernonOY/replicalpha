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
