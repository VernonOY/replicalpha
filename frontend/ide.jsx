// IDE — VS Code-like reproduction engineering page.
// Shows the LLM-generated code, a file tree, terminal, and a "regenerate" Claude action.

function IDE({ paperId, onClose, onOpenRun }) {
  const [lang] = window.useLang ? window.useLang() : [window.__lang || 'zh'];
  const PAPERS = window.PAPERS;
  const paper = PAPERS.find(p => p.id === paperId) || PAPERS[0];

  const initialFiles = React.useMemo(() => buildRepro(paper), [paper.id]);
  const [files, setFiles] = React.useState(initialFiles);
  const [activePath, setActivePath] = React.useState('factor.py');
  const [openTabs, setOpenTabs] = React.useState(['factor.py', 'backtest.py']);
  const [bottomTab, setBottomTab] = React.useState('terminal'); // terminal | problems | output | llm
  const [terminalLines, setTerminalLines] = React.useState(seedTerminal(paper));
  const [llmLog, setLlmLog] = React.useState(seedLLMLog(paper));
  const [regenOpen, setRegenOpen] = React.useState(false);
  const [running, setRunning] = React.useState(false);

  function openFile(p) {
    setActivePath(p);
    setOpenTabs(t => t.includes(p) ? t : [...t, p]);
  }
  function closeTab(p, e) {
    e.stopPropagation();
    const idx = openTabs.indexOf(p);
    const next = openTabs.filter(x => x !== p);
    setOpenTabs(next);
    if (activePath === p) setActivePath(next[Math.max(0, idx-1)] || next[0] || 'factor.py');
  }

  function pushTerm(line) {
    setTerminalLines(l => [...l, line]);
  }
  function pushLlm(line) {
    setLlmLog(l => [...l, line]);
  }

  async function runBacktest() {
    if (running) return;
    setRunning(true); setBottomTab('terminal');
    pushTerm({ kind:'cmd', text:'$ python -m replicalpha.backtest factor.py --universe '+paper.universe });
    await wait(450); pushTerm({ kind:'log', text:'[load] '+paper.universe+' constituents · 2018-01-01 → 2025-04-30' });
    await wait(380); pushTerm({ kind:'log', text:'[features] computing factor over 1934 trading days × N assets' });
    await wait(620); pushTerm({ kind:'log', text:'[lint] qtype check · ✓ no look-ahead · ✓ no NaN cascade' });
    await wait(500); pushTerm({ kind:'log', text:'[backtest] 5 quintiles · long-short · daily rebalance' });
    await wait(650); pushTerm({ kind:'log', text:`[ic] mean=${fmt.ic(paper.ic_repro)}  std=${paper.ic_std.toFixed(3)}  IR=${(paper.ic_repro/paper.ic_std).toFixed(2)}` });
    await wait(380); pushTerm({ kind:'log', text:`[perf] cumret=${fmt.pct(paper.cumret)}  sharpe=${fmt.sharpe(paper.sharpe)}  maxdd=${paper.maxdd.toFixed(2)}%` });
    await wait(380);
    if (paper.sign_flip) pushTerm({ kind:'warn', text:`[red-team] sign-flip detected: paper IC=${fmt.ic(paper.ic_paper)}  repro IC=${fmt.ic(paper.ic_repro)}` });
    pushTerm({ kind:'ok', text:`✓ Done in 4.7s · score=${fmt.score(paper.score)} · verdict=${paper.verdict.toUpperCase()}` });
    setRunning(false);
  }

  async function regenerate(promptText) {
    setRegenOpen(false);
    setBottomTab('llm');
    pushLlm({ role:'user', text: promptText });
    pushLlm({ role:'system', text:'reading paper.md, factor.py, backtest.py · 4.2k tokens' });
    await wait(400);
    pushLlm({ role:'system', text:'paper2alpha: extract factor → claude-haiku-4.5 → patch' });
    await wait(700);
    let patch = '# nothing to do';
    try {
      const text = await Promise.race([
        window.claude.complete(`You are paper2alpha. Given a quant factor: ${paper.factor} = ${paper.formula}, and the user request: "${promptText}", return a SHORT (max 8 lines) Python diff comment block describing what you'd change. Plain text, no markdown fences.`),
        new Promise((_, rej) => setTimeout(() => rej(0), 6000)),
      ]);
      patch = text.trim();
    } catch (_) {
      patch = cannedPatch(promptText, paper);
    }
    pushLlm({ role:'assistant', text: patch });

    // Also patch factor.py with a comment so it's visible
    const path = 'factor.py';
    setFiles(f => ({...f, [path]: f[path] + '\n\n# --- claude patch '+ new Date().toLocaleTimeString() +' ---\n' + patch.split('\n').map(l=>'# '+l).join('\n')}));
    setActivePath(path);
    if (!openTabs.includes(path)) setOpenTabs(t => [...t, path]);
    pushLlm({ role:'system', text:'factor.py · +'+(patch.split('\n').length)+' lines  ·  re-run backtest to verify' });
  }

  const treeFiles = Object.keys(files);

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:300, background:'#0a0d12',
      display:'flex', flexDirection:'column', color:'#cdd6e0',
      fontFamily:'var(--sans)',
    }}>
      {/* Title bar */}
      <div style={{
        height:32, background:'#10141a', borderBottom:'1px solid #1c222b',
        display:'flex', alignItems:'center', padding:'0 12px', gap:14, fontSize:12,
        flexShrink:0,
      }}>
        <div style={{display:'flex', gap:6}}>
          <span style={{width:11, height:11, borderRadius:'50%', background:'#ef4444'}} onClick={onClose} className="clickable"/>
          <span style={{width:11, height:11, borderRadius:'50%', background:'#eab308'}}/>
          <span style={{width:11, height:11, borderRadius:'50%', background:'#22c55e'}}/>
        </div>
        <Mono size={11} color="#5a6573">replicalpha · workspaces /{paper.id}</Mono>
        <div style={{flex:1, textAlign:'center', color:'#7d8896', fontSize:11}}>
          <Mono size={11} color="#7d8896">{paper.title.slice(0, 80)}{paper.title.length>80?'…':''}</Mono>
        </div>
        <button onClick={()=>onOpenRun(paper.id)} style={ideHeaderBtn()}>{window.t("ide.view_run")}</button>
        <button onClick={onClose} style={ideHeaderBtn()}>{window.t("ide.close")}</button>
      </div>

      {/* Activity bar + sidebar + main */}
      <div style={{flex:1, display:'flex', minHeight:0}}>
        {/* Activity bar */}
        <div style={{
          width:46, background:'#10141a', borderRight:'1px solid #1c222b',
          display:'flex', flexDirection:'column', alignItems:'center', padding:'8px 0', gap:14,
          flexShrink:0,
        }}>
          {[
            {i:'⊟', t:'Files', active:true},
            {i:'⌕', t:'Search'},
            {i:'⎇', t:'Source control'},
            {i:'⚐', t:'Run'},
            {i:'✦', t:'Claude'},
          ].map(b => (
            <div key={b.t} title={b.t} style={{
              width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:18, color: b.active?'#cdd6e0':'#5a6573', cursor:'pointer',
              borderLeft: b.active?'2px solid var(--accent)':'2px solid transparent',
            }}>{b.i}</div>
          ))}
        </div>

        {/* File tree sidebar */}
        <div style={{
          width:240, background:'#0d1117', borderRight:'1px solid #1c222b',
          fontSize:12, overflow:'auto', flexShrink:0,
        }}>
          <div style={{padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <Mono size={10} color="#5a6573">EXPLORER · {paper.id}</Mono>
            <Mono size={11} color="#5a6573">⋯</Mono>
          </div>
          <div style={{padding:'0 4px'}}>
            <FolderRow open label={"workspaces / "+paper.id}/>
            {treeFiles.map(p => (
              <FileRow key={p} path={p} active={p===activePath} onClick={()=>openFile(p)}/>
            ))}
            <FolderRow label="data" depth={1}/>
            <FileRow path="prices_2018_2025.parquet" depth={2} icon="◫" muted/>
            <FileRow path="constituents.csv" depth={2} icon="◫" muted/>
            <FolderRow label="paper" depth={1} open/>
            <FileRow path="paper.pdf" depth={2} icon="❒" muted/>
            <FileRow path="abstract.md" depth={2} icon="≡" muted/>
            <FolderRow label=".replicalpha" depth={1}/>
            <FileRow path="run.log" depth={2} icon="▤" muted/>
            <FileRow path="report.html" depth={2} icon="▤" muted/>
          </div>
        </div>

        {/* Main editor + bottom panel */}
        <div style={{flex:1, display:'flex', flexDirection:'column', minWidth:0}}>
          {/* Tabs */}
          <div style={{
            height:34, background:'#10141a', borderBottom:'1px solid #1c222b',
            display:'flex', alignItems:'stretch', flexShrink:0,
          }}>
            {openTabs.map(t => (
              <div key={t} onClick={()=>setActivePath(t)} style={{
                padding:'0 14px', display:'flex', alignItems:'center', gap:8, cursor:'pointer',
                background: t===activePath?'#0d1117':'transparent',
                borderRight:'1px solid #1c222b',
                borderTop: t===activePath?'1.5px solid var(--accent)':'1.5px solid transparent',
                fontSize:12, color: t===activePath?'#cdd6e0':'#7d8896',
              }}>
                <span style={{color: fileColor(t)}}>{fileIcon(t)}</span>
                <span style={{fontFamily:'var(--mono)', fontSize:11.5}}>{t}</span>
                <span onClick={(e)=>closeTab(t, e)} style={{opacity:0.5, marginLeft:4, fontSize:13}}>×</span>
              </div>
            ))}
            <div style={{flex:1}}/>
            <button onClick={()=>setRegenOpen(true)} style={{
              ...ideHeaderBtn(),
              background:'linear-gradient(135deg, var(--accent), #7e57c2)',
              color:'#fff', border:'none', margin:'5px 6px',
            }}>{window.t("ide.regenerate")}</button>
            <button onClick={runBacktest} disabled={running} style={{
              ...ideHeaderBtn(),
              background:'#22c55e', color:'#0a0d12', border:'none', margin:'5px 6px',
              opacity: running?0.5:1,
            }}>{running ? window.t("ide.running") : window.t("ide.run_backtest")}</button>
          </div>

          {/* Editor */}
          <div style={{flex:1, overflow:'auto', background:'#0d1117', position:'relative', minHeight:0}}>
            <CodeView code={files[activePath] || ''} path={activePath}/>
          </div>

          {/* Bottom panel */}
          <div style={{
            height:240, borderTop:'1px solid #1c222b', background:'#10141a',
            display:'flex', flexDirection:'column', flexShrink:0,
          }}>
            <div style={{
              height:32, borderBottom:'1px solid #1c222b', display:'flex', alignItems:'stretch',
              padding:'0 6px', gap:2,
            }}>
              {(() => {
                const tabLabels = { terminal: window.t("ide.tab.terminal"), problems: window.t("ide.tab.problems"), output: window.t("ide.tab.output"), llm: window.t("ide.tab.llm"), agent: 'AGENT' };
                const tabs = window.AgentChat ? ['terminal','problems','output','llm','agent'] : ['terminal','problems','output','llm'];
                return tabs.map(t => (
                <div key={t} onClick={()=>setBottomTab(t)} style={{
                  padding:'0 14px', display:'flex', alignItems:'center', cursor:'pointer',
                  fontFamily:'var(--mono)', fontSize:11, letterSpacing:0.5,
                  color: t===bottomTab?'#cdd6e0':'#5a6573',
                  borderBottom: t===bottomTab?'2px solid var(--accent)':'2px solid transparent',
                  textTransform:'uppercase',
                  position:'relative',
                }}>
                  {tabLabels[t]}
                  {t==='llm' && llmLog.length > 0 && (
                    <span style={{marginLeft:6, padding:'1px 5px', background:'var(--accent-dim)', color:'var(--accent)', borderRadius:99, fontSize:9}}>{llmLog.length}</span>
                  )}
                </div>
                ));
              })()}
            </div>
            <div style={{flex:1, overflow:'auto', padding: bottomTab==='agent' ? 0 : '8px 14px', fontFamily:'var(--mono)', fontSize:11.5, lineHeight:1.6}}>
              {bottomTab==='terminal' && <Terminal lines={terminalLines}/>}
              {bottomTab==='problems' && <Problems paper={paper}/>}
              {bottomTab==='output' && <OutputTab paper={paper}/>}
              {bottomTab==='llm' && <LLMTab log={llmLog} onPrompt={()=>setRegenOpen(true)}/>}
              {bottomTab==='agent' && window.AgentChat && (
                <window.AgentChat runId={paperId} fullPanel={true}/>
              )}
            </div>
          </div>

          {/* Status bar */}
          <div style={{
            height:22, background:'var(--accent)', color:'#fff',
            display:'flex', alignItems:'center', padding:'0 12px', fontSize:10.5,
            fontFamily:'var(--mono)', letterSpacing:0.3, flexShrink:0,
          }}>
            <span>main</span>
            <span style={{margin:'0 12px', opacity:0.6}}>·</span>
            <span>↑0 ↓0</span>
            <span style={{margin:'0 12px', opacity:0.6}}>·</span>
            <span>{paper.universe}</span>
            <div style={{flex:1}}/>
            <span>Python 3.11 · qtype</span>
            <span style={{margin:'0 12px', opacity:0.6}}>·</span>
            <span>UTF-8</span>
            <span style={{margin:'0 12px', opacity:0.6}}>·</span>
            <span>LF</span>
            <span style={{margin:'0 12px', opacity:0.6}}>·</span>
            <span>Ln 1, Col 1</span>
          </div>
        </div>
      </div>

      {regenOpen && <RegenModal paper={paper} onClose={()=>setRegenOpen(false)} onSubmit={regenerate}/>}
    </div>
  );
}

function ideHeaderBtn() {
  return {
    background:'transparent', border:'1px solid #1c222b', color:'#cdd6e0',
    fontSize:11, padding:'4px 10px', borderRadius:3, cursor:'pointer',
    fontFamily:'var(--mono)',
  };
}

function FolderRow({ label, open, depth=0 }) {
  return (
    <div style={{
      padding:'3px 8px 3px '+(8 + depth*12)+'px',
      display:'flex', alignItems:'center', gap:6, color:'#7d8896', fontSize:11.5,
    }}>
      <span style={{fontSize:10}}>{open?'▾':'▸'}</span>
      <span style={{color: open?'#eab308':'#7d8896', fontSize:11}}>📁</span>
      <span>{label}</span>
    </div>
  );
}
function FileRow({ path, active, onClick, depth=1, icon, muted }) {
  return (
    <div onClick={onClick} style={{
      padding:'3px 8px 3px '+(8 + depth*12)+'px',
      display:'flex', alignItems:'center', gap:6, cursor: onClick?'pointer':'default',
      color: muted?'#5a6573':active?'#cdd6e0':'#a8b2c0',
      background: active?'#1c222b':'transparent', fontSize:11.5,
    }}>
      <span style={{color: fileColor(path), fontSize:11}}>{icon || fileIcon(path)}</span>
      <span style={{fontFamily:'var(--mono)'}}>{path.split('/').pop()}</span>
    </div>
  );
}
function fileIcon(p) {
  if (p.endsWith('.py')) return '🐍';
  if (p.endsWith('.md')) return '≡';
  if (p.endsWith('.yaml') || p.endsWith('.yml') || p.endsWith('.toml')) return '⚙';
  if (p.endsWith('.json')) return '{}';
  return '▤';
}
function fileColor(p) {
  if (p.endsWith('.py')) return '#3b82f6';
  if (p.endsWith('.md')) return '#94a3b8';
  if (p.endsWith('.yaml') || p.endsWith('.yml')) return '#a78bfa';
  if (p.endsWith('.json')) return '#eab308';
  return '#7d8896';
}

function CodeView({ code, path }) {
  const lines = code.split('\n');
  return (
    <div style={{padding:'12px 0', fontFamily:'var(--mono)', fontSize:12.5, lineHeight:1.55}}>
      {lines.map((ln, i) => (
        <div key={i} style={{display:'flex'}}>
          <div style={{
            width:48, textAlign:'right', paddingRight:14,
            color:'#3a4252', userSelect:'none', flexShrink:0,
          }}>{i+1}</div>
          <div style={{whiteSpace:'pre', flex:1, paddingRight:18}}>
            {tokens(ln, path)}
          </div>
        </div>
      ))}
    </div>
  );
}

// Tiny syntax highlighter — Python/Markdown.
function tokens(line, path) {
  if (path.endsWith('.md')) return mdTokens(line);
  if (path.endsWith('.json')) return jsonTokens(line);
  return pyTokens(line);
}
function pyTokens(line) {
  const out = [];
  // comment
  const c = line.indexOf('#');
  let main = line, comment = '';
  if (c >= 0 && !line.slice(0, c).match(/['"]/)) {
    main = line.slice(0, c); comment = line.slice(c);
  }
  // tokenize main
  const re = /(""".*?"""|'.*?'|".*?"|\b(?:def|class|return|import|from|as|if|elif|else|for|while|in|not|and|or|is|None|True|False|with|try|except|raise|lambda|yield|assert|pass|break|continue)\b|\b\d+\.?\d*\b|[A-Za-z_]\w*|[^\w\s])/g;
  let m, last = 0, key = 0;
  while ((m = re.exec(main)) !== null) {
    if (m.index > last) out.push(<span key={key++}>{main.slice(last, m.index)}</span>);
    const t = m[0];
    let color = '#cdd6e0';
    if (/^(def|class|return|import|from|as|if|elif|else|for|while|in|not|and|or|is|with|try|except|raise|lambda|yield|assert|pass|break|continue)$/.test(t)) color = '#c084fc';
    else if (/^(None|True|False)$/.test(t)) color = '#fb923c';
    else if (/^["'`]/.test(t)) color = '#86efac';
    else if (/^\d/.test(t)) color = '#fb923c';
    else if (/^[A-Z]/.test(t)) color = '#67e8f9';
    out.push(<span key={key++} style={{color}}>{t}</span>);
    last = re.lastIndex;
  }
  if (last < main.length) out.push(<span key={key++}>{main.slice(last)}</span>);
  if (comment) out.push(<span key={key++} style={{color:'#5a6573', fontStyle:'italic'}}>{comment}</span>);
  return out.length ? out : [<span key="0">{' '}</span>];
}
function mdTokens(line) {
  if (line.startsWith('#')) return <span style={{color:'#67e8f9', fontWeight:600}}>{line}</span>;
  if (line.startsWith('- ') || line.startsWith('* ')) return <span><span style={{color:'#c084fc'}}>{line.slice(0,2)}</span>{line.slice(2)}</span>;
  if (line.startsWith('>')) return <span style={{color:'#86efac'}}>{line}</span>;
  return <span>{line}</span>;
}
function jsonTokens(line) {
  return <span style={{color:'#cdd6e0'}}>{line.replace(/("[^"]*")/g, '$1')}</span>;
}

function Terminal({ lines }) {
  return (
    <>
      {lines.map((l, i) => (
        <div key={i} style={{color: termColor(l.kind)}}>{l.text}</div>
      ))}
      <div style={{color:'var(--accent)'}}>$ <span style={{display:'inline-block', animation:'blink 1s infinite'}}>▌</span></div>
    </>
  );
}
function termColor(k) {
  return { cmd:'#cdd6e0', log:'#a8b2c0', warn:'#eab308', err:'#ef4444', ok:'#22c55e' }[k] || '#a8b2c0';
}

function Problems({ paper }) {
  if (!paper.redteam || !paper.redteam.length) return <span style={{color:'#5a6573'}}>{window.t("ide.no_problems")}</span>;
  return paper.redteam.map((r, i) => (
    <div key={i} style={{padding:'4px 0', display:'flex', gap:10}}>
      <span style={{color: r.severity==='critical'?'#ef4444':'#eab308'}}>● {r.severity.toUpperCase()}</span>
      <span style={{color:'#cdd6e0'}}>{r.check}</span>
      <span style={{color:'#7d8896'}}>{r.note}</span>
      <span style={{flex:1}}/>
      <span style={{color:'#5a6573'}}>backtest.py:{40 + i*7}</span>
    </div>
  ));
}
function OutputTab({ paper }) {
  return (
    <>
      <div style={{color:'#7d8896'}}>[replicalpha:run] paper={paper.id} family={paper.family} universe={paper.universe}</div>
      <div style={{color:'#a8b2c0'}}>  metrics: ic={fmt.ic(paper.ic_repro)}  cumret={fmt.pct(paper.cumret)}  sharpe={fmt.sharpe(paper.sharpe)}  maxdd={paper.maxdd.toFixed(2)}%</div>
      <div style={{color:'#a8b2c0'}}>  artifacts: equity_curve.png  ic_series.png  drawdown.png  report.html</div>
      <div style={{color: paper.score>=0.6?'#22c55e':paper.score>=0.2?'#eab308':'#ef4444'}}>  verdict: {paper.verdict.toUpperCase()}  score={fmt.score(paper.score)}{paper.sign_flip?'  · sign-flip':''}</div>
    </>
  );
}
function LLMTab({ log, onPrompt }) {
  return (
    <>
      {log.map((l, i) => (
        <div key={i} style={{padding:'4px 0', display:'flex', gap:10, alignItems:'flex-start'}}>
          <span style={{
            color: l.role==='user'?'var(--accent)':l.role==='assistant'?'#22c55e':'#5a6573',
            minWidth:80, flexShrink:0,
          }}>[{l.role}]</span>
          <span style={{color: l.role==='system'?'#7d8896':'#cdd6e0', whiteSpace:'pre-wrap', textWrap:'pretty'}}>{l.text}</span>
        </div>
      ))}
      <div style={{padding:'8px 0'}}>
        <button onClick={onPrompt} style={{
          background:'transparent', border:'1px dashed var(--accent)',
          color:'var(--accent)', padding:'6px 12px', borderRadius:3, cursor:'pointer',
          fontFamily:'var(--mono)', fontSize:11,
        }}>+ new claude prompt</button>
      </div>
    </>
  );
}

function RegenModal({ paper, onClose, onSubmit }) {
  const [prompt, setPrompt] = React.useState('');
  const presets = [
    'Fix the sign-flip — switch sign convention to match paper',
    'Add winsorization at 1%/99% before computing factor',
    'Use weekly rebalance instead of daily',
    'Filter out stocks below 1B USD market cap',
    'Add industry-neutralization (subtract industry median)',
  ];
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(11,14,20,0.85)', zIndex:400,
      display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'14vh',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'min(680px, 90vw)', background:'#10141a', border:'1px solid #1c222b',
        borderRadius:8, overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,0.7)',
      }}>
        <div style={{padding:'14px 18px', borderBottom:'1px solid #1c222b', display:'flex', alignItems:'center', gap:10}}>
          <div style={{
            width:24, height:24, borderRadius:5, background:'linear-gradient(135deg, var(--accent), #7e57c2)',
            display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13,
          }}>✦</div>
          <div style={{fontSize:13, color:'#cdd6e0'}}>{window.t("ide.regen.title")}</div>
          <div style={{flex:1}}/>
          <Mono size={10} color="#5a6573">paper={paper.id} · model=claude-haiku-4.5</Mono>
        </div>
        <div style={{padding:18}}>
          <textarea
            autoFocus value={prompt} onChange={e=>setPrompt(e.target.value)}
            placeholder={window.t("ide.regen.placeholder")}
            style={{
              width:'100%', minHeight:90, background:'#0d1117', border:'1px solid #1c222b',
              borderRadius:5, padding:'12px 14px', color:'#cdd6e0', fontFamily:'var(--mono)',
              fontSize:12.5, resize:'vertical',
            }}/>
          <div style={{marginTop:14, display:'flex', flexWrap:'wrap', gap:6}}>
            <Mono size={10} color="#5a6573" style={{marginRight:4}}>{window.t("ide.regen.quick_prompts")}</Mono>
            {presets.map(p => (
              <button key={p} onClick={()=>setPrompt(p)} style={{
                padding:'4px 10px', borderRadius:99, fontSize:10.5,
                background:'#0d1117', border:'1px solid #1c222b', color:'#a8b2c0', cursor:'pointer',
                fontFamily:'var(--mono)',
              }}>{p}</button>
            ))}
          </div>
        </div>
        <div style={{padding:'12px 18px', borderTop:'1px solid #1c222b', display:'flex', gap:10, alignItems:'center'}}>
          <Mono size={10} color="#5a6573">⌘+Enter to submit</Mono>
          <div style={{flex:1}}/>
          <button onClick={onClose} style={{padding:'6px 12px', borderRadius:4, fontSize:12, background:'transparent', border:'1px solid #1c222b', color:'#a8b2c0', cursor:'pointer'}}>{window.t("ide.regen.cancel")}</button>
          <button disabled={!prompt.trim()} onClick={()=>onSubmit(prompt)} style={{
            padding:'6px 14px', borderRadius:4, fontSize:12, fontWeight:500,
            background:'var(--accent)', color:'#fff', border:'none',
            opacity: prompt.trim()?1:0.4, cursor: prompt.trim()?'pointer':'not-allowed',
          }}>{window.t("ide.regen.submit")}</button>
        </div>
      </div>
    </div>
  );
}

function buildRepro(p) {
  return {
    'README.md':
`# ${p.title}
${p.authors} (${p.year})

**Factor:** \`${p.factor}\`
**Universe:** ${p.universe}
**Reproduction period:** ${p.period_repro}

## Verdict
score = ${fmt.score(p.score)} · ${p.verdict.toUpperCase()}${p.sign_flip?' (sign-flip)':''}

## Files
- factor.py — formula
- backtest.py — pipeline
- redteam.py — checks
- config.yaml — universe & dates
`,
    'factor.py':
`# Auto-generated by paper2alpha · do not edit by hand
# Source: ${p.title} (${p.authors}, ${p.year})
# Verdict: ${p.verdict.toUpperCase()}${p.sign_flip?' · sign-flip detected':''}

import pandas as pd
import numpy as np
from replicalpha.qtype import factor, asof, lookback


@factor(name="${p.factor}", family="${p.family}")
def ${p.factor}(close: pd.DataFrame, volume: pd.DataFrame = None, **kw):
    """${p.factor_zh || p.factor}

    Formula (from paper):
        ${p.factor} = ${p.formula}

    Notes:
    - ranked cross-sectionally each day
    - long top-quintile, short bottom-quintile, daily rebalance
    """
    raw = ${pyExpr(p)}
    # cross-sectional rank, normalized to [-1, 1]
    return raw.rank(axis=1, pct=True) * 2 - 1
`,
    'backtest.py':
`from replicalpha.engine import Backtest, Universe
from replicalpha.metrics import ic, sharpe, maxdd
import factor


cfg = {
    "universe":   "${p.universe}",
    "start":      "${(p.period_repro || '').split('→')[0].trim()}",
    "end":        "${(p.period_repro || '').split('→')[1] ? p.period_repro.split('→')[1].trim() : ''}",
    "rebalance":  "1D",
    "n_quintile": 5,
}


def run():
    bt = Backtest(cfg)
    bt.add_factor(factor.${p.factor})
    res = bt.run()
    print("ic     :", ic(res))
    print("sharpe :", sharpe(res))
    print("maxdd  :", maxdd(res))
    res.save("artifacts/")
    return res


if __name__ == "__main__":
    run()
`,
    'redteam.py':
`from replicalpha.redteam import check_leakage, check_concentration, check_overfit, check_costs, check_survivorship


def audit(result):
    findings = []
    findings += check_leakage(result)         # look-ahead, future data
    findings += check_concentration(result)   # one stock dominates
    findings += check_overfit(result)         # too many parameters
    findings += check_costs(result)           # turnover-aware
    findings += check_survivorship(result)    # delisted stocks
    return findings
`,
    'config.yaml':
`# replicalpha run config
paper:
  id: ${p.id}
  title: "${p.title.replace(/"/g, '\\"')}"
  authors: "${p.authors}"
  year: ${p.year}

universe: ${p.universe}
period:
  start: "${(p.period_repro||'').split('→')[0].trim()}"
  end:   "${(p.period_repro||'').split('→')[1] ? p.period_repro.split('→')[1].trim() : ''}"

backtest:
  rebalance: 1D
  n_quintile: 5
  costs_bps: 5

redteam:
  enabled: true
  checks: [leakage, concentration, overfit, costs, survivorship]
`,
  };
}

function pyExpr(p) {
  // Quick sanitizer: turn the formula into something pandas-ish
  const f = p.formula;
  return f
    .replace(/pct_change\(close,\s*(\d+)\)/g, 'close.pct_change($1)')
    .replace(/rank\(/g, 'rank_cs(')
    .replace(/zscore\(([^)]+)\)/g, 'zscore_cs($1)')
    .replace(/log\(/g, 'np.log(')
    .replace(/sign\(/g, 'np.sign(')
    .replace(/sqrt\(/g, 'np.sqrt(')
    .replace(/std\((\d+)\)/g, 'rolling_std($1)') || 'close';
}

function seedTerminal(p) {
  return [
    { kind:'cmd', text:'$ replicalpha workspace open '+p.id },
    { kind:'log', text:'workspace ready · '+Object.keys(buildRepro(p)).length+' files · '+(p.universe)+' loaded' },
    { kind:'log', text:'last run: '+(p.verdict==='green'?'reproduced ✓':p.verdict==='red'?'failed ✗':'weak ⚠')+' · score '+fmt.score(p.score) },
  ];
}
function seedLLMLog(p) {
  return [
    { role:'system', text:'paper2alpha v0.4.1 · model=claude-haiku-4.5' },
    { role:'system', text:'extract factor → '+p.factor+' = '+p.formula },
    { role:'assistant', text:'Generated factor.py (28 lines), backtest.py (24 lines), redteam.py (15 lines), config.yaml. All files pass qtype lint. Recommend running backtest before customizing.' },
  ];
}
function cannedPatch(prompt, p) {
  if (/sign[ -]?flip|sign convention/i.test(prompt)) return `flip sign of factor:\n  - return raw.rank(...) * 2 - 1\n  + return -(raw.rank(...) * 2 - 1)\nrationale: paper IC = ${fmt.ic(p.ic_paper)} but reproduction IC = ${fmt.ic(p.ic_repro)} · sign-flip indicates the formula is computing the inverse of what the paper specified. Inverting gives expected direction.`;
  if (/winsoriz/i.test(prompt)) return `add winsorization step:\n  + raw = raw.clip(raw.quantile(0.01, axis=1), raw.quantile(0.99, axis=1), axis=0)\nplaced before rank step. Reduces influence of extreme values which often drive false-positive ICs.`;
  if (/weekly|rebalance/i.test(prompt)) return `change rebalance frequency:\n  - rebalance: 1D\n  + rebalance: 1W\nNote: this will cut transaction costs by ~5x but may reduce IC magnitude proportionally to factor decay rate.`;
  if (/market cap|mcap|filter/i.test(prompt)) return `add market cap filter:\n  + universe = universe[universe.mcap_usd >= 1e9]\napplied at universe construction. Drops smallcaps where the factor signal is dominated by noise.`;
  return `proposed change for: "${prompt}"\n  + apply requested transformation\n  + re-run backtest to verify\nestimated impact on IC: ±10-30%\nsuggested next step: run \`▶ Run backtest\` to verify.`;
}

window.IDE = IDE;
