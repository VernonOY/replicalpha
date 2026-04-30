// Main app shell: sidebar nav, route switching, tweaks integration.

const { useState: useStateA, useEffect: useEffectA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#1976d2",
  "density": "comfortable",
  "nodeSize": "influence",
  "theme": "light",
  "showKpi": true,
  "monoFont": "JetBrains Mono",
  "borderStyle": "soft"
}/*EDITMODE-END*/;

function App() {
  const [route, setRoute] = useStateA({ name: 'timeline', params: {} });
  const [aiOpen, setAiOpen] = useStateA(false);
  const [uploadOpen, setUploadOpen] = useStateA(false);
  const [ideOpen, setIdeOpen] = useStateA(null); // paper id or null
  const [extraPapers, setExtraPapers] = useStateA([]);
  const [cmdkOpen, setCmdkOpen] = useStateA(false);
  const [lang] = window.useLang ? window.useLang() : [window.__lang || 'zh'];

  const TweaksPanel = window.TweaksPanel;
  const TweakSection = window.TweakSection;
  const TweakColor = window.TweakColor;
  const TweakRadio = window.TweakRadio;
  const TweakSelect = window.TweakSelect;
  const TweakToggle = window.TweakToggle;
  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  // Global Cmd+K hotkey
  if (window.useCmdK) window.useCmdK(cmdkOpen, () => setCmdkOpen(true));

  // Splice user/AI papers into the global PAPERS list so timeline picks them up
  useEffectA(() => {
    if (!window.__OG_PAPERS) window.__OG_PAPERS = window.PAPERS;
    window.PAPERS = [...window.__OG_PAPERS, ...extraPapers];
  }, [extraPapers]);

  // Apply tweaks → CSS vars + theme
  useEffectA(() => {
    const r = document.documentElement;
    r.setAttribute('data-theme', tweaks.theme || 'light');
    r.style.setProperty('--accent', tweaks.accent);
    r.style.setProperty('--accent-dim', tweaks.accent + '22');
    r.style.setProperty('--mono', `"${tweaks.monoFont}", "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace`);
    if (tweaks.borderStyle === 'sharp') {
      r.style.setProperty('--radius-1', '0px');
      r.style.setProperty('--radius-2', '2px');
    } else if (tweaks.borderStyle === 'rounded') {
      r.style.setProperty('--radius-1', '8px');
      r.style.setProperty('--radius-2', '12px');
    } else {
      r.style.setProperty('--radius-1', '4px');
      r.style.setProperty('--radius-2', '6px');
    }
  }, [tweaks]);

  function navigate(name, params = {}) { setRoute({ name, params }); }
  function openRun(id) { navigate('run', { id }); }
  function openIde(id) { setIdeOpen(id); }
  window.__openRun = openRun;

  function toggleTheme() { setTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark'); }
  function toggleDensity() {
    const seq = ['compact', 'comfortable', 'spacious'];
    const next = seq[(seq.indexOf(tweaks.density) + 1) % seq.length];
    setTweak('density', next);
  }
  function switchLang() {
    if (window.setLang) window.setLang((window.__lang || 'zh') === 'zh' ? 'en' : 'zh');
  }

  function addPapers(papers) {
    setExtraPapers(p => [...p, ...papers]);
  }

  return (
    <div style={{display:'flex', height:'100vh', width:'100vw', overflow:'hidden', background:'var(--bg-base)'}}>
      <Sidebar route={route} onNav={navigate} onOpenAI={()=>setAiOpen(true)} onOpenUpload={()=>setUploadOpen(true)}/>
      <div style={{flex:1, display:'flex', flexDirection:'column', minWidth:0, position:'relative'}}>
        <TopBar route={route} onNav={navigate} onOpenAI={()=>setAiOpen(true)} onOpenUpload={()=>setUploadOpen(true)} theme={tweaks.theme} onToggleTheme={toggleTheme} onSwitchLang={switchLang} onOpenCmdK={()=>setCmdkOpen(true)}/>
        <div style={{flex:1, minHeight:0, position:'relative', overflow:'hidden'}}>
          {route.name === 'landing'  && <Landing onStart={() => navigate('timeline')}/>}
          {route.name === 'timeline' && <Timeline tweaks={tweaks}
              onOpenRun={openRun}
              onOpenIde={openIde}
              onCompare={(ids) => navigate('compare', { ids })}/>}
          {route.name === 'run'      && <RunDetail runId={route.params.id}
              onBack={() => navigate('timeline')}
              onOpenRun={openRun} onOpenIde={openIde}
              onNav={navigate}/>}
          {route.name === 'analysis' && window.AnalysisPage && <window.AnalysisPage runId={route.params.id} onBack={() => navigate('run', {id: route.params.id})}/>}
          {route.name === 'factors'  && <Factors onOpenRun={openRun}/>}
          {route.name === 'library'  && <Library onOpenRun={openRun}/>}
          {route.name === 'upload'   && <Upload onOpenRun={openRun}/>}
          {route.name === 'compare'  && <Compare ids={route.params.ids || []} onOpenRun={openRun}/>}
          {route.name === 'monitor'  && window.MonitorPage && <window.MonitorPage onOpenRun={openRun} onNav={navigate}/>}
          {route.name === 'monitor-detail' && window.MonitorDetail && <window.MonitorDetail factorId={route.params.id} onBack={() => navigate('monitor')}/>}
          {route.name === 'portfolio' && window.PortfolioPage && <window.PortfolioPage onNav={navigate}/>}
          {route.name === 'settings' && window.SettingsPage && <window.SettingsPage onNav={navigate}/>}
          {route.name === 'search'   && window.SearchResults && <window.SearchResults query={route.params.q || ''} onOpenRun={openRun} onOpenAI={()=>setAiOpen(true)}/>}
          {route.name === 'profile'  && window.PublicProfile && <window.PublicProfile username={route.params.username || 'VernonOY'} onOpenRun={openRun}/>}
          {!['landing','timeline','run','analysis','factors','library','upload','compare','monitor','monitor-detail','portfolio','settings','search','profile'].includes(route.name) &&
            window.NotFoundPage && <window.NotFoundPage onNav={navigate}/>}
        </div>
      </div>

      <window.AISearch open={aiOpen} onClose={()=>setAiOpen(false)} onAddPapers={addPapers}/>
      <window.CustomUpload open={uploadOpen} onClose={()=>setUploadOpen(false)} onAdd={(p)=>addPapers([p])}/>
      {ideOpen && <window.IDE paperId={ideOpen} onClose={()=>setIdeOpen(null)} onOpenRun={(id)=>{ setIdeOpen(null); openRun(id); }}/>}

      {window.CommandPalette && <window.CommandPalette
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        onNav={(name, params) => { setCmdkOpen(false); navigate(name, params || {}); }}
        onOpenAI={() => { setCmdkOpen(false); setAiOpen(true); }}
        onOpenUpload={() => { setCmdkOpen(false); setUploadOpen(true); }}
        onToggleTheme={() => { toggleTheme(); }}
        onToggleDensity={() => { toggleDensity(); }}
        onSwitchLang={() => { switchLang(); }}
      />}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Aesthetics">
          <TweakColor label="Accent" value={tweaks.accent} onChange={v => setTweak('accent', v)}/>
          <TweakRadio label="Theme" value={tweaks.theme} onChange={v => setTweak('theme', v)}
            options={[{value:'light', label:'Day'},{value:'dark', label:'Night'}]}/>
          <TweakRadio label="Borders" value={tweaks.borderStyle} onChange={v => setTweak('borderStyle', v)}
            options={[{value:'sharp', label:'Sharp'},{value:'soft', label:'Soft'},{value:'rounded', label:'Round'}]}/>
          <TweakSelect label="Mono font" value={tweaks.monoFont} onChange={v => setTweak('monoFont', v)}
            options={[
              {value:'JetBrains Mono', label:'JetBrains Mono'},
              {value:'IBM Plex Mono', label:'IBM Plex Mono'},
              {value:'Geist Mono', label:'Geist Mono'},
              {value:'Berkeley Mono', label:'Berkeley Mono (sub)'},
            ]}/>
        </TweakSection>
        <TweakSection title="Timeline">
          <TweakRadio label="Density" value={tweaks.density} onChange={v => setTweak('density', v)}
            options={[{value:'compact', label:'Compact'},{value:'comfortable', label:'Comf'},{value:'spacious', label:'Loose'}]}/>
          <TweakRadio label="Node size" value={tweaks.nodeSize} onChange={v => setTweak('nodeSize', v)}
            options={[{value:'influence', label:'Influence'},{value:'ic', label:'|IC|'},{value:'none', label:'Fixed'}]}/>
          <TweakToggle label="Show KPI strip" value={tweaks.showKpi} onChange={v => setTweak('showKpi', v)}/>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

function Sidebar({ route, onNav, onOpenAI, onOpenUpload }) {
  const [lang] = window.useLang ? window.useLang() : [window.__lang || 'zh'];
  const items = [
    { name: 'landing',  icon: '◉', label: window.t("nav.home") },
    { name: 'timeline', icon: '⌖', label: window.t("nav.timeline") },
    { name: 'factors',  icon: '⊞', label: window.t("nav.factors") },
    { name: 'library',  icon: '≡', label: window.t("nav.library") },
  ];
  return (
    <div style={{
      width:200, flexShrink:0, background:'var(--surface-1)',
      borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column',
    }}>
      <div style={{
        padding:'18px 20px', borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', gap:10,
      }}>
        <div style={{
          width:24, height:24, borderRadius:5, background:'var(--accent)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'var(--mono)', fontSize:12, fontWeight:700, color:'#fff',
        }}>R</div>
        <div>
          <div style={{fontSize:13, fontWeight:600, color:'var(--text-1)', letterSpacing:-0.2}}>replicalpha</div>
          <div style={{fontSize:9, fontFamily:'var(--mono)', color:'var(--text-3)', letterSpacing:0.5}}>v0.1 · LOCAL</div>
        </div>
      </div>

      <nav style={{padding:8}}>
        {items.map(it => (
          <button key={it.name} onClick={() => onNav(it.name)} style={{
            display:'flex', alignItems:'center', gap:12, padding:'8px 12px',
            background: route.name === it.name ? 'var(--surface-2)' : 'transparent',
            border:'none', borderLeft:`2px solid ${route.name === it.name ? 'var(--accent)' : 'transparent'}`,
            borderRadius:'0 4px 4px 0', width:'100%', cursor:'pointer',
            color: route.name === it.name ? 'var(--text-1)' : 'var(--text-3)',
            fontSize:13, marginBottom:2, textAlign:'left',
          }}>
            <span style={{fontFamily:'var(--mono)', width:14, fontSize:12}}>{it.icon}</span>
            <span>{it.label}</span>
          </button>
        ))}
      </nav>

      <div style={{padding:'8px 12px 4px', borderTop:'1px solid var(--border-soft)', marginTop:8}}>
        <Mono size={9} color="var(--text-3)" style={{letterSpacing:0.6}}>{window.t("sidebar.add_to_timeline")}</Mono>
      </div>
      <div style={{padding:'4px 8px'}}>
        <button onClick={onOpenAI} style={addBtn()}>
          <span style={{
            width:18, height:18, borderRadius:4,
            background:'linear-gradient(135deg, var(--accent), #7e57c2)',
            color:'#fff', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0,
          }}>✦</span>
          <span style={{fontSize:12.5}}>{window.t("sidebar.ai_search")}</span>
          <Mono size={9} color="var(--text-3)" style={{marginLeft:'auto'}}>arxiv·ssrn</Mono>
        </button>
        <button onClick={onOpenUpload} style={addBtn()}>
          <span style={{
            width:18, height:18, borderRadius:4, background:'var(--surface-2)',
            border:'1px solid var(--border)', color:'var(--text-2)', fontSize:11,
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          }}>↑</span>
          <span style={{fontSize:12.5}}>{window.t("sidebar.custom_upload")}</span>
        </button>
        <button onClick={() => onNav('upload')} style={addBtn()}>
          <span style={{
            width:18, height:18, borderRadius:4, background:'var(--surface-2)',
            border:'1px solid var(--border)', color:'var(--text-2)', fontSize:11,
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          }}>⌗</span>
          <span style={{fontSize:12.5}}>{window.t("sidebar.pipeline_queue")}</span>
        </button>
      </div>

      <div style={{flex:1}}/>

      <div style={{padding:'14px 16px', borderTop:'1px solid var(--border)'}}>
        <Mono size={9} color="var(--text-3)">RUNS_ROOT=./runs</Mono>
        <div style={{display:'flex', alignItems:'center', gap:6, marginTop:6}}>
          <span style={{width:6, height:6, borderRadius:'50%', background:'#22c55e'}}/>
          <Mono size={10} color="var(--text-2)">localhost:8000</Mono>
        </div>
        <Mono size={9} color="var(--text-3)">FastAPI · running</Mono>
      </div>
    </div>
  );
}

function addBtn() {
  return {
    display:'flex', alignItems:'center', gap:10, padding:'7px 10px', width:'100%',
    background:'transparent', border:'none', cursor:'pointer',
    color:'var(--text-2)', textAlign:'left', borderRadius:4, marginBottom:1,
  };
}

function TopBar({ route, onNav, onOpenAI, onOpenUpload, theme, onToggleTheme, onSwitchLang, onOpenCmdK }) {
  const [lang] = window.useLang ? window.useLang() : [window.__lang || 'zh'];
  const crumb = {
    landing:  ['/', window.t('crumb.landing', 'landing')],
    timeline: ['/timeline', window.t('crumb.timeline', 'archive · timeline')],
    factors:  ['/factors',  window.t('crumb.factors', 'cross-paper aggregates')],
    library:  ['/library',  window.t('crumb.library', 'all papers')],
    upload:   ['/upload',   window.t('crumb.upload', 'pipeline queue')],
    run:      [`/runs/${route.params.id || ''}`, window.t('crumb.run', 'reproduction report')],
    analysis: [`/runs/${route.params.id || ''}/analysis`, window.t('crumb.analysis', 'factor analysis')],
    compare:  [`/compare?ids=${(route.params.ids||[]).join(',')}`, window.t('crumb.compare', 'side-by-side')],
    monitor:  ['/monitor',  window.t('crumb.monitor', 'live factor monitoring')],
    'monitor-detail': [`/monitor/${route.params.id || ''}`, window.t('crumb.monitor_detail', 'factor detail')],
    portfolio:['/portfolio',window.t('crumb.portfolio', 'paper trading')],
    settings: ['/settings', window.t('crumb.settings', 'preferences')],
    search:   ['/search',   window.t('crumb.search', 'results')],
    profile:  [`/u/${route.params.username || 'me'}`, window.t('crumb.profile', 'public profile')],
  }[route.name] || ['/', ''];

  return (
    <div style={{
      height:44, padding:'0 24px', background:'var(--surface-1)',
      borderBottom:'1px solid var(--border)', display:'flex',
      alignItems:'center', gap:14, flexShrink:0,
    }}>
      <div style={{display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0}}>
        <Mono size={11} color="var(--accent)">{crumb[0]}</Mono>
        <Mono size={11} color="var(--text-3)">·</Mono>
        <Mono size={11} color="var(--text-3)">{crumb[1]}</Mono>
      </div>

      <button onClick={onOpenCmdK} title={window.t('top.cmdk_hint', 'Open command palette (⌘K)')} style={{
        display:'flex', alignItems:'center', gap:6, padding:'4px 8px',
        background:'transparent', border:'1px solid var(--border)', borderRadius:4,
        cursor:'pointer', color:'var(--text-3)', fontFamily:'var(--mono)', fontSize:10, letterSpacing:0.5,
      }}>⌘K</button>

      {window.SyncIndicator ? <window.SyncIndicator/> : (
        <Mono size={10} color="var(--text-3)">SYNC ✓</Mono>
      )}

      <Mono size={10} color="var(--text-3)">{new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', hour12:false })}</Mono>

      {window.NotificationsBell && <window.NotificationsBell onNav={onNav}/>}

      <button onClick={onSwitchLang} title={window.t('top.switch_lang', 'Switch language')} style={{
        height:28, minWidth:36, padding:'0 8px', borderRadius:4,
        background:'transparent', color:'var(--text-2)', border:'1px solid var(--border)', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:11,
        fontFamily:'var(--mono)', fontWeight:500, letterSpacing:0.5,
      }}>{lang === 'zh' ? '中' : 'EN'}</button>

      <button onClick={onToggleTheme} title={theme === 'dark' ? window.t('top.theme_to_day','Switch to day') : window.t('top.theme_to_night','Switch to night')} style={{
        width:28, height:28, borderRadius:4, padding:0,
        background:'transparent', color:'var(--text-2)', border:'1px solid var(--border)', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:13,
      }}>{theme === 'dark' ? '☀' : '☾'}</button>
      <button onClick={onOpenAI} style={{
        padding:'5px 12px', borderRadius:4, fontSize:11, fontWeight:500, fontFamily:'var(--mono)',
        background:'transparent', color:'var(--text-2)', border:'1px solid var(--border)', cursor:'pointer',
        display:'flex', alignItems:'center', gap:6,
      }}>
        <span style={{
          width:14, height:14, borderRadius:3,
          background:'linear-gradient(135deg, var(--accent), #7e57c2)',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
          color:'#fff', fontSize:9,
        }}>✦</span>
        {window.t("top.ai_search")}
      </button>
      <button onClick={onOpenUpload} style={{
        padding:'5px 12px', borderRadius:4, fontSize:11,
        background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer',
        fontWeight:500,
      }}>{window.t("top.new_run")}</button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
