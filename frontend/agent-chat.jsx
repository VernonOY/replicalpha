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
