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

        {/* AI chat console — v0.4 wires the live SSE AgentChat here when loaded */}
        {window.AgentChat
          ? (
            <div style={{
              border:'1px solid var(--border)', borderRadius:8, overflow:'hidden',
              background:'var(--surface-1)', marginBottom:48, height:420,
            }}>
              <window.AgentChat runId={null} fullPanel={true} height={420}/>
            </div>
          )
          : <AIChatConsole onStart={onStart}/>}

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
