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
