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
