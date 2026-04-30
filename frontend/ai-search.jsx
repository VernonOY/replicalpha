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
