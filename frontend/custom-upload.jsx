// Custom upload modal — drag PDF, set time/name/tags/family.
function CustomUpload({ open, onClose, onAdd }) {
  const [lang] = window.useLang ? window.useLang() : [window.__lang || 'zh'];
  const FAMILIES = window.FACTOR_FAMILIES;
  const [step, setStep] = React.useState('drop'); // drop | meta | running | done
  const [filename, setFilename] = React.useState('');
  const [meta, setMeta] = React.useState({
    title: '', authors: '', year: 2025, month: 6,
    family: 'momentum', factor: '', formula: '',
    universe: 'CSI 300', tags: '', notes: '',
    influence: 3,
  });
  const [progress, setProgress] = React.useState(0);
  const [stageIdx, setStageIdx] = React.useState(0);
  const [created, setCreated] = React.useState(null);
  const STAGES = ['Extract','Codegen','Lint','Backtest','Red Team','Score'];

  function reset() {
    setStep('drop'); setFilename(''); setProgress(0); setStageIdx(0); setCreated(null);
    setMeta({ title:'', authors:'', year:2025, month:6, family:'momentum', factor:'', formula:'', universe:'CSI 300', tags:'', notes:'', influence:3 });
  }
  function close() { onClose(); setTimeout(reset, 200); }

  function onDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) accept(f);
  }
  function onPick(e) {
    const f = e.target.files[0];
    if (f) accept(f);
  }
  function accept(f) {
    setFilename(f.name);
    // guess title from filename
    const stem = f.name.replace(/\.[^.]+$/, '').replace(/_/g,' ').replace(/-/g,' ');
    const m = stem.match(/(\d{4})/);
    setMeta(s => ({...s,
      title: stem.replace(/\d{4}/g,'').replace(/\s+/g,' ').trim(),
      year: m ? parseInt(m[1]) : 2025,
    }));
    setStep('meta');
  }

  async function commit() {
    setStep('running'); setProgress(0); setStageIdx(0);
    for (let i = 0; i < STAGES.length; i++) {
      setStageIdx(i);
      for (let j = 0; j < 16; j++) {
        await wait(60 + Math.random()*60);
        setProgress(((i*16 + j+1) / (STAGES.length*16)) * 100);
      }
    }
    const newPaper = buildPaperFromMeta(meta, filename);
    setCreated(newPaper);
    onAdd(newPaper);
    setStep('done');
  }

  if (!open) return null;
  return (
    <div onClick={close} style={{
      position:'fixed', inset:0, zIndex:200, background:'rgba(11,14,20,0.7)',
      display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'10vh',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'min(720px, 92vw)', maxHeight:'82vh',
        background:'var(--surface-1)', border:'1px solid var(--border)',
        borderRadius:8, display:'flex', flexDirection:'column', overflow:'hidden',
        boxShadow:'0 24px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12}}>
          <div style={{width:24, height:24, borderRadius:5, background:'var(--accent-dim)', border:'1px solid var(--accent)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14}}>↑</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13, color:'var(--text-1)'}}>{window.t("upload.modal.title")}</div>
            <Mono size={10} color="var(--text-3)">{window.t("upload.modal.subtitle")}</Mono>
          </div>
          <Mono size={10} color="var(--text-3)">{step === 'drop' ? '1/3' : step === 'meta' ? '2/3' : '3/3'}</Mono>
          <button onClick={close} style={{background:'transparent', border:'none', color:'var(--text-3)', fontSize:18, cursor:'pointer', marginLeft:8}}>×</button>
        </div>

        <div style={{flex:1, overflow:'auto'}}>
          {step === 'drop' && (
            <div style={{padding:32}}>
              <label
                onDragOver={e=>e.preventDefault()} onDrop={onDrop}
                style={{
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  padding:48, border:'1.5px dashed var(--border)', borderRadius:8,
                  background:'var(--surface-0)', cursor:'pointer', gap:14,
                }}>
                <div style={{width:56, height:56, borderRadius:8, background:'var(--accent-dim)', border:'1px solid var(--accent)', color:'var(--accent)', fontSize:24, display:'flex', alignItems:'center', justifyContent:'center'}}>↑</div>
                <div style={{fontSize:14, color:'var(--text-1)'}}>{window.t("upload.modal.drop_zone")}</div>
                <Mono size={11} color="var(--text-3)">{window.t("upload.modal.drop_hint")}</Mono>
                <input type="file" accept=".pdf,.md,.docx,.txt" onChange={onPick} style={{display:'none'}}/>
                <button type="button" onClick={(e)=>e.currentTarget.parentElement.querySelector('input').click()} style={{
                  marginTop:6, padding:'8px 18px', borderRadius:5, fontSize:12, fontWeight:500,
                  background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer',
                }}>{window.t("upload.modal.browse")}</button>
              </label>
              <div style={{marginTop:18, textAlign:'center'}}>
                <button onClick={()=>{ setFilename('untitled_strategy.md'); setStep('meta'); }} style={{
                  background:'transparent', border:'none', color:'var(--accent)', fontSize:12, cursor:'pointer', textDecoration:'underline',
                }}>{window.t("upload.modal.write_note")}</button>
              </div>
            </div>
          )}

          {step === 'meta' && (
            <div style={{padding:24}}>
              <Mono size={10} color="var(--text-3)" style={{marginBottom:14, display:'block'}}>FILE: {filename}</Mono>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
                <Field label="Title" full>
                  <input value={meta.title} onChange={e=>setMeta({...meta, title:e.target.value})} style={inp()}/>
                </Field>
                <Field label="Authors / source">
                  <input value={meta.authors} onChange={e=>setMeta({...meta, authors:e.target.value})} placeholder="e.g. Wang & Chen / internal note" style={inp()}/>
                </Field>
                <Field label="Universe">
                  <select value={meta.universe} onChange={e=>setMeta({...meta, universe:e.target.value})} style={inp()}>
                    {window.UNIVERSES.map(u => <option key={u}>{u}</option>)}
                  </select>
                </Field>
                <Field label="Year">
                  <input type="number" value={meta.year} onChange={e=>setMeta({...meta, year: parseInt(e.target.value)||2025})} style={inp()}/>
                </Field>
                <Field label="Month">
                  <input type="number" min={1} max={12} value={meta.month} onChange={e=>setMeta({...meta, month: parseInt(e.target.value)||1})} style={inp()}/>
                </Field>
                <Field label="Factor family">
                  <div style={{display:'flex', gap:4, flexWrap:'wrap'}}>
                    {FAMILIES.map(f => (
                      <button key={f.id} onClick={()=>setMeta({...meta, family:f.id})} style={{
                        padding:'5px 9px', borderRadius:3, fontSize:10.5, fontFamily:'var(--mono)',
                        background: meta.family===f.id?'var(--accent)':'var(--surface-2)',
                        color: meta.family===f.id?'#fff':'var(--text-2)',
                        border:'1px solid '+(meta.family===f.id?'var(--accent)':'var(--border)'),
                        cursor:'pointer',
                      }}>{f.short}</button>
                    ))}
                  </div>
                </Field>
                <Field label="Influence (★)">
                  <div style={{display:'flex', gap:4}}>
                    {[1,2,3,4,5].map(n => (
                      <span key={n} onClick={()=>setMeta({...meta, influence:n})} style={{
                        cursor:'pointer', fontSize:18, color: n<=meta.influence?'var(--accent)':'var(--border)',
                      }}>★</span>
                    ))}
                  </div>
                </Field>
                <Field label="Factor name (optional)">
                  <input value={meta.factor} onChange={e=>setMeta({...meta, factor:e.target.value})} placeholder="e.g. mom_6m" style={{...inp(), fontFamily:'var(--mono)'}}/>
                </Field>
                <Field label="Formula (optional)">
                  <input value={meta.formula} onChange={e=>setMeta({...meta, formula:e.target.value})} placeholder="pct_change(close, 126)" style={{...inp(), fontFamily:'var(--mono)'}}/>
                </Field>
                <Field label="Tags (comma-separated)" full>
                  <input value={meta.tags} onChange={e=>setMeta({...meta, tags:e.target.value})} placeholder="personal-strategy, A-share, post-pub-decay" style={inp()}/>
                </Field>
                <Field label="Notes" full>
                  <textarea value={meta.notes} onChange={e=>setMeta({...meta, notes:e.target.value})} rows={3} placeholder="What's interesting about this paper? What do you expect to find?" style={{...inp(), resize:'vertical'}}/>
                </Field>
              </div>
            </div>
          )}

          {step === 'running' && (
            <div style={{padding:32}}>
              <div style={{textAlign:'center', marginBottom:24}}>
                <div style={{fontSize:14, color:'var(--text-1)', marginBottom:4}}>{STAGES[stageIdx]}…</div>
                <Mono size={10} color="var(--text-3)">{filename} · stage {stageIdx+1}/{STAGES.length}</Mono>
              </div>
              <div style={{display:'flex', gap:4, marginBottom:24}}>
                {STAGES.map((s, i) => (
                  <div key={s} style={{flex:1, height:6, borderRadius:3, background: i<stageIdx?'#22c55e':i===stageIdx?'var(--accent)':'var(--surface-2)'}}/>
                ))}
              </div>
              <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8}}>
                {STAGES.map((s, i) => (
                  <div key={s} style={{
                    padding:'8px 10px', borderRadius:4, fontSize:11,
                    background: i===stageIdx?'var(--accent-dim)':'var(--surface-0)',
                    border:'1px solid '+(i===stageIdx?'var(--accent)':'var(--border)'),
                    color: i<stageIdx?'#22c55e':i===stageIdx?'var(--accent)':'var(--text-3)',
                    fontFamily:'var(--mono)',
                  }}>{i<stageIdx?'✓':i===stageIdx?'…':' '} {s}</div>
                ))}
              </div>
              <div style={{marginTop:24, height:3, background:'var(--surface-2)', borderRadius:2, overflow:'hidden'}}>
                <div style={{width: progress+'%', height:'100%', background:'var(--accent)', transition:'width 0.1s'}}/>
              </div>
            </div>
          )}

          {step === 'done' && created && (
            <div style={{padding:32}}>
              <div style={{textAlign:'center', marginBottom:24}}>
                <div style={{
                  width:56, height:56, borderRadius:'50%', background:'rgba(34,197,94,0.15)', border:'2px solid #22c55e',
                  color:'#22c55e', fontSize:24, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px',
                }}>✓</div>
                <div style={{fontSize:16, color:'var(--text-1)', marginBottom:4}}>{window.t("upload.modal.added")}</div>
                <Mono size={11} color="var(--text-3)">id={created.id} · score={fmt.score(created.score)} · {created.verdict}</Mono>
              </div>
              <div style={{padding:14, background:'var(--surface-0)', border:'1px solid var(--border)', borderRadius:5}}>
                <div style={{fontSize:13, color:'var(--text-1)', marginBottom:4}}>{created.title}</div>
                <Mono size={11} color="var(--text-3)">{created.authors} · {created.year} · {created.universe}</Mono>
                <div style={{marginTop:10, display:'flex', gap:14, fontFamily:'var(--mono)', fontSize:11}}>
                  <span style={{color:'var(--text-3)'}}>IC paper</span><span style={{color:'var(--text-1)'}}>{fmt.ic(created.ic_paper)}</span>
                  <span style={{color:'var(--text-3)'}}>IC repro</span><span style={{color: window.VERDICT_COLORS[created.verdict].fill}}>{fmt.ic(created.ic_repro)}</span>
                  <span style={{color:'var(--text-3)'}}>Sharpe</span><span style={{color:'var(--text-1)'}}>{fmt.sharpe(created.sharpe)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', gap:10, alignItems:'center'}}>
          <Mono size={10} color="var(--text-3)">{step==='drop'?window.t("upload.modal.hint_drop"):step==='meta'?window.t("upload.modal.hint_meta"):step==='running'?window.t("upload.modal.hint_running"):window.t("upload.modal.hint_done")}</Mono>
          <div style={{flex:1}}/>
          {step === 'meta' && <button onClick={()=>setStep('drop')} style={btnGhost()}>{window.t("upload.modal.back")}</button>}
          {step === 'meta' && <button disabled={!meta.title} onClick={commit} style={{...btnPrimary(), opacity: meta.title?1:0.4}}>{window.t("upload.modal.run_pipeline")}</button>}
          {step === 'done' && <button onClick={close} style={btnGhost()}>{window.t("upload.modal.add_another")}</button>}
          {step === 'done' && <button onClick={()=>{ close(); window.__openRun && window.__openRun(created.id); }} style={btnPrimary()}>{window.t("upload.modal.open_run")}</button>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div style={{gridColumn: full?'1 / -1':'auto'}}>
      <Mono size={10} color="var(--text-3)" style={{marginBottom:6, display:'block', letterSpacing:0.5, textTransform:'uppercase'}}>{label}</Mono>
      {children}
    </div>
  );
}
function inp() {
  return {
    width:'100%', background:'var(--surface-0)', border:'1px solid var(--border)',
    borderRadius:4, padding:'7px 10px', color:'var(--text-1)', fontSize:12,
    fontFamily:'var(--sans)', boxSizing:'border-box',
  };
}
function btnPrimary() {
  return { padding:'7px 14px', borderRadius:4, fontSize:12, fontWeight:500, background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer' };
}
function btnGhost() {
  return { padding:'7px 12px', borderRadius:4, fontSize:12, background:'transparent', border:'1px solid var(--border)', color:'var(--text-2)', cursor:'pointer' };
}

function buildPaperFromMeta(m, filename) {
  const seed = (m.title.length + m.year * 7) % 200;
  const ic_paper = 0.015 + (seed % 30) / 1000;
  const ic_repro = ic_paper * (0.4 + Math.random() * 0.5) * (Math.random() > 0.7 ? -1 : 1);
  const sign_flip = (ic_paper > 0) !== (ic_repro > 0);
  const score = sign_flip ? 0 : Math.min(1, Math.abs(ic_repro / ic_paper));
  const verdict = score > 0.6 ? 'green' : score > 0.2 ? 'yellow' : 'red';
  let s = 0, x = seed; const sp = [];
  for (let i = 0; i < 36; i++) {
    x = (x * 9301 + 49297) % 233280;
    s += (x / 233280 - 0.5) * 2 + ic_repro * 30;
    sp.push(s);
  }
  return {
    id: 'r-u' + Date.now().toString(36),
    title: m.title || filename,
    authors: m.authors || 'You',
    year: m.year, month: m.month,
    family: m.family,
    factor: m.factor || (m.family + '_v1'),
    formula: m.formula || 'placeholder(close)',
    universe: m.universe,
    period_paper: `${m.year-3}-${m.year}`,
    period_repro: '2023-01 → 2025-04',
    ic_paper, ic_repro, ic_std: 0.25 + Math.random()*0.1,
    cumret: ic_repro * 400,
    maxdd: 8 + Math.random()*15,
    sharpe: ic_repro * 30,
    score, verdict, sign_flip,
    influence: m.influence,
    redteam: sign_flip ? [{ check:'sign_flip', severity:'critical', note:'IC sign opposite to claim' }] : [],
    tags: ['user-uploaded', ...(m.tags||'').split(',').map(s=>s.trim()).filter(Boolean)],
    notes: m.notes,
    spark: sp,
    userUploaded: true,
  };
}

window.CustomUpload = CustomUpload;
