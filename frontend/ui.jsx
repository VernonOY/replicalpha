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
