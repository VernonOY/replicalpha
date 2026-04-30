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
