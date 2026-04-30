// ============================================================================
// replicalpha v0.3 additions — i18n, Cmd+K, notifications, sync, new pages
// ============================================================================
// All components attached to window.* and consumed by replicalpha.html.

const {
  useState: useStateV3,
  useEffect: useEffectV3,
  useMemo: useMemoV3,
  useRef: useRefV3,
  useCallback: useCallbackV3
} = React;

// ───────────────────────────── i18n ─────────────────────────────
// Lightweight i18n: pick zh by default, fall back to EN.

const I18N = {
  zh: {
    // nav
    'nav.home': '首页',
    'nav.timeline': '时间线',
    'nav.factors': '因子家族',
    'nav.library': '库',
    'nav.monitor': '监控',
    'nav.portfolio': '组合',
    'nav.settings': '设置',
    'nav.profile': '个人主页',
    'nav.workspace': '工作区',
    'nav.add_to_timeline': '加入时间线',
    'nav.ide': 'IDE',
    'nav.agent': '代理',
    'nav.custom_upload': '上传文件',
    'nav.pipeline_queue': '运行队列',
    // topbar
    'top.search_hint': '搜索 · ⌘K',
    'top.notifications': '通知',
    'top.no_notifications': '暂无新通知',
    'top.synced': '已同步',
    'top.syncing': '同步中',
    'top.offline': '离线',
    'top.last_synced': '上次同步',
    'top.new_run': '+ 新建运行',
    // command palette
    'cmd.placeholder': '输入指令、页面、论文…',
    'cmd.navigate': '前往',
    'cmd.find': '查找',
    'cmd.do': '操作',
    'cmd.recent': '最近',
    'cmd.upload_pdf': '上传 PDF',
    'cmd.new_run_url': '从 URL 新建运行',
    'cmd.rerun_last': '重跑上一篇',
    'cmd.toggle_theme': '切换日/夜',
    'cmd.toggle_density': '切换密度',
    'cmd.switch_lang': '切换语言',
    'cmd.no_results': '未找到匹配项',
    // settings
    'settings.title': '设置',
    'settings.account': '账户',
    'settings.api_keys': 'API 密钥',
    'settings.adapters': '数据源',
    'settings.models': '模型',
    'settings.appearance': '外观',
    'settings.pipeline': '流水线默认值',
    'settings.storage': '存储',
    // monitor
    'monitor.title': '监控',
    'monitor.alerts': '提醒',
    'monitor.watched': '关注的因子',
    'monitor.acknowledge': '已知',
    // portfolio
    'portfolio.title': '组合',
    'portfolio.disclaimer': '仅模拟交易,非投资建议。',
    // search
    'search.title': '搜索结果',
    'search.papers': '论文',
    'search.factors': '因子',
    'search.findings': '红队发现',
    'search.notes': '笔记 / 标注',
    'search.empty': '没有匹配项',
    // timeline KPIs & filters
    'timeline.kpi.papers': '论文',
    'timeline.kpi.factor_families': '因子家族',
    'timeline.kpi.avg_score': '平均分',
    'timeline.kpi.reproduced': '已复现',
    'timeline.kpi.failed': '失败',
    'timeline.kpi.sign_flips': '符号翻转',
    'timeline.filter.family': 'FAMILY',
    'timeline.filter.verdict': 'VERDICT',
    'timeline.filter.universe': 'UNIVERSE',
    'timeline.filter.zoom': 'ZOOM',
    'timeline.search_placeholder': '搜索论文、作者、因子…',
    'timeline.legend': '图例：',
    'timeline.legend.reproduced': '已复现',
    'timeline.legend.weak': '较弱',
    'timeline.legend.failed': '失败',
    'timeline.legend.hint': 'shift+click: 多选 · 双击: 打开运行 · 水平拖动',
    'timeline.compare_btn': '对比 {n} 篇已选',
    // verdict filter values
    'verdict.all': '全部',
    'verdict.reproduced': '已复现',
    'verdict.weak': '较弱',
    'verdict.failed': '失败',
    'verdict.sign_flip': '符号翻转',
    // universe filter values
    'universe.all': '全部',
    // hover card
    'hover.claim_ic': 'claim IC',
    'hover.repro_ic': 'repro IC',
    'hover.score': 'score',
    // drawer
    'drawer.open_full_run': '打开完整运行 →',
    'drawer.open_in_ide': '在 IDE 中打开',
    // section titles in drawer
    'section.verdict': '判定',
    'section.factor': '因子',
    'section.paper_vs_repro': '论文 vs 复现',
    'section.redteam': '红队',
    'section.cumret': '累计收益',
    // library page
    'library.title': '库',
    'library.search_placeholder': '搜索…',
    'library.col.verdict': '',
    'library.col.title': '标题 / 作者',
    'library.col.family': '因子家族',
    'library.col.year': '年份',
    'library.col.claim_ic': '声称 IC',
    'library.col.repro_ic': '复现 IC',
    'library.col.cumret': '累计收益',
    'library.col.sharpe': '夏普比',
    'library.col.score': '评分',
    'library.col.verdict_col': '判定',
    'library.col.stars': '★',
    'library.sort.year_desc': '年份 ↓',
    'library.sort.year_asc': '年份 ↑',
    'library.sort.score_desc': '评分 ↓',
    'library.sort.score_asc': '评分 ↑',
    'library.sort.ic_desc': '|IC| ↓',
    // factors page
    'factors.title': '因子家族',
    'factors.subtitle': '声称 IC vs 复现 IC，跨论文聚合',
    'factors.claimed': 'CLAIMED',
    'factors.repro': 'REPRO',
    'factors.see_papers': '查看 {n} 篇论文',
    // run detail page
    'run.back': '← 时间线',
    'run.prev': '↑ 上一篇',
    'run.next': '↓ 下一篇',
    'run.repro_engineering': '复现工程',
    'run.open_in_ide': '在 IDE 中打开',
    'run.ide_hint': '查看并编辑 Claude 生成的 factor.py · backtest.py · redteam.py',
    'run.headline_label': '主要发现',
    'run.score_label': '可复现性评分',
    'run.score_max': '/ 1.00 满分',
    'run.pipeline_label': '流水线',
    'run.complete': '✓ 完成 · 47.2s',
    'run.tab.verdict': '判定',
    'run.tab.evidence': '证据',
    'run.tab.redteam': '红队',
    'run.tab.code': '代码',
    'run.tab.report': '报告',
    // run detail verdict tab
    'run.verdict.paper_vs_repro': '论文 vs 复现',
    'run.verdict.cumret': '累计多空收益',
    'run.verdict.influence': '影响力',
    'run.verdict.your_rating': '你的评分',
    // run detail table row labels
    'run.row.metric': '指标',
    'run.row.paper_claim': '论文声称',
    'run.row.reproduction': '复现',
    'run.row.delta': 'Δ',
    'run.row.period': '周期',
    'run.row.universe': '股票池',
    'run.row.ic_mean': 'IC 均值',
    'run.row.sign_match': '符号匹配',
    'run.row.cumret': '累计收益',
    'run.row.max_dd': '最大回撤',
    'run.row.sharpe': '夏普比',
    'run.row.score': '评分',
    'run.sign_matches': '✓ 匹配',
    'run.sign_flipped': '✗ 翻转',
    // run detail evidence tab
    'run.evidence.cumret': '累计多空收益',
    'run.evidence.ic_series': '滚动 IC',
    'run.evidence.drawdown': '回撤',
    // run detail redteam tab
    'run.redteam.passed': '通过',
    // upload queue page
    'upload.title': '上传队列',
    'upload.subtitle': '篇论文在管道中',
    'upload.drop_zone': '拖拽更多 PDF 进队列',
    'upload.drop_hint': '多文件 · 每个最大 50 MB',
    'upload.browse': '浏览',
    'upload.cancel': '取消',
    'upload.open': '打开 →',
    // compare page
    'compare.title': '对比',
    'compare.overlay': '叠加累计收益',
    // IDE page
    'ide.run_backtest': '▶ 运行回测',
    'ide.running': '运行中…',
    'ide.regenerate': '✦ 用 Claude 重新生成',
    'ide.view_run': '查看运行 →',
    'ide.close': '关闭 ×',
    'ide.tab.terminal': '终端',
    'ide.tab.problems': '问题',
    'ide.tab.output': '输出',
    'ide.tab.llm': 'LLM',
    'ide.no_problems': '未发现问题。',
    'ide.regen.title': '用 Claude 重新生成代码',
    'ide.regen.placeholder': '描述修改内容…',
    'ide.regen.quick_prompts': '快捷提示：',
    'ide.regen.cancel': '取消',
    'ide.regen.submit': '重新生成 ✦',
    // custom upload modal
    'upload.modal.title': '加入你的时间线',
    'upload.modal.subtitle': 'PDF / 论文 / 策略笔记 · 个人归档',
    'upload.modal.drop_zone': '拖拽 PDF、.md 或 .docx 至此',
    'upload.modal.drop_hint': '论文 · 策略笔记 · 研究备忘录 · 最大 50 MB',
    'upload.modal.browse': '浏览文件',
    'upload.modal.write_note': '或直接撰写策略笔记 →',
    'upload.modal.run_pipeline': '运行管道 →',
    'upload.modal.add_another': '再添加一篇',
    'upload.modal.open_run': '打开运行 →',
    'upload.modal.back': '← 返回',
    'upload.modal.added': '已加入时间线',
    'upload.modal.hint_drop': '拖入文件或跳过直接写笔记',
    'upload.modal.hint_meta': '现在打标签，以后查询更精准',
    'upload.modal.hint_running': '~6s · 管道模拟中',
    'upload.modal.hint_done': '在时间线上打开新节点',
    // ai search modal
    'ai_search.title': 'AI 研究搜索',
    'ai_search.subtitle': 'arxiv · ssrn · scholar · LLM 排序',
    'ai_search.placeholder': '搜索近期论文… 如 2024 年 A 股低波动衰减',
    'ai_search.search_btn': '搜索 ✦',
    'ai_search.searching': '搜索中…',
    'ai_search.try': '试试：',
    'ai_search.cancel': '取消',
    'ai_search.add_btn': '加入时间线并运行管道 →',
    'ai_search.selected': '{n} / {total} 已选',
    // app sidebar
    'sidebar.add_to_timeline': '加入时间线',
    'sidebar.ai_search': 'AI 搜索',
    'sidebar.custom_upload': '自定义上传',
    'sidebar.pipeline_queue': '运行队列',
    // topbar new run button
    'top.ai_search': 'AI 搜索',
    // topbar extras (lang toggle, theme, cmdk hint, crumbs)
    'top.switch_lang': '切换语言',
    'top.cmdk_hint': '打开命令面板 (⌘K)',
    'top.theme_to_day': '切换日间模式',
    'top.theme_to_night': '切换夜间模式',
    'crumb.landing': '首页',
    'crumb.timeline': '档案 · 时间线',
    'crumb.factors': '跨论文聚合',
    'crumb.library': '所有论文',
    'crumb.upload': '运行队列',
    'crumb.run': '复现报告',
    'crumb.compare': '并排对比',
    'crumb.monitor': '实时因子监控',
    'crumb.monitor_detail': '因子详情',
    'crumb.portfolio': '纸面交易',
    'crumb.settings': '偏好设置',
    'crumb.search': '搜索结果',
    'crumb.profile': '公开主页'
  },
  en: {
    'nav.home': 'Home',
    'nav.timeline': 'Timeline',
    'nav.factors': 'Factors',
    'nav.library': 'Library',
    'nav.monitor': 'Monitor',
    'nav.portfolio': 'Portfolio',
    'nav.settings': 'Settings',
    'nav.profile': 'Profile',
    'nav.workspace': 'Workspace',
    'nav.add_to_timeline': 'Add to timeline',
    'nav.ide': 'IDE',
    'nav.agent': 'Agent',
    'nav.custom_upload': 'Custom upload',
    'nav.pipeline_queue': 'Pipeline queue',
    'top.search_hint': 'Search · ⌘K',
    'top.notifications': 'Notifications',
    'top.no_notifications': 'No new notifications',
    'top.synced': 'SYNC ✓',
    'top.syncing': 'SYNC...',
    'top.offline': 'OFFLINE',
    'top.last_synced': 'Last synced',
    'top.new_run': '+ New run',
    'cmd.placeholder': 'Type a command, page, or paper…',
    'cmd.navigate': 'Navigate',
    'cmd.find': 'Find',
    'cmd.do': 'Do',
    'cmd.recent': 'Recent',
    'cmd.upload_pdf': 'Upload PDF',
    'cmd.new_run_url': 'New run from URL',
    'cmd.rerun_last': 'Re-run last paper',
    'cmd.toggle_theme': 'Toggle theme',
    'cmd.toggle_density': 'Toggle density',
    'cmd.switch_lang': 'Switch language',
    'cmd.no_results': 'No results',
    'settings.title': 'Settings',
    'settings.account': 'Account',
    'settings.api_keys': 'API keys',
    'settings.adapters': 'Data adapters',
    'settings.models': 'LLM models',
    'settings.appearance': 'Appearance',
    'settings.pipeline': 'Pipeline defaults',
    'settings.storage': 'Storage',
    'monitor.title': 'Monitor',
    'monitor.alerts': 'Alerts',
    'monitor.watched': 'Watched factors',
    'monitor.acknowledge': 'Acknowledge',
    'portfolio.title': 'Portfolio',
    'portfolio.disclaimer': 'Paper trading only. Not investment advice.',
    'search.title': 'Search results',
    'search.papers': 'Papers',
    'search.factors': 'Factors',
    'search.findings': 'Red team findings',
    'search.notes': 'Notes / annotations',
    'search.empty': 'No matches',
    // timeline KPIs & filters
    'timeline.kpi.papers': 'papers',
    'timeline.kpi.factor_families': 'factor families',
    'timeline.kpi.avg_score': 'avg score',
    'timeline.kpi.reproduced': 'reproduced',
    'timeline.kpi.failed': 'failed',
    'timeline.kpi.sign_flips': 'sign-flips',
    'timeline.filter.family': 'FAMILY',
    'timeline.filter.verdict': 'VERDICT',
    'timeline.filter.universe': 'UNIVERSE',
    'timeline.filter.zoom': 'ZOOM',
    'timeline.search_placeholder': 'Search papers, authors, factors…',
    'timeline.legend': 'Legend:',
    'timeline.legend.reproduced': 'reproduced',
    'timeline.legend.weak': 'weak',
    'timeline.legend.failed': 'failed',
    'timeline.legend.hint': 'shift+click: multi-select · dbl-click: open run · drag horizontally to pan',
    'timeline.compare_btn': 'Compare {n} selected',
    // verdict filter values
    'verdict.all': 'all',
    'verdict.reproduced': 'reproduced',
    'verdict.weak': 'weak',
    'verdict.failed': 'failed',
    'verdict.sign_flip': 'sign-flip',
    // universe filter values
    'universe.all': 'all',
    // hover card
    'hover.claim_ic': 'claim IC',
    'hover.repro_ic': 'repro IC',
    'hover.score': 'score',
    // drawer
    'drawer.open_full_run': 'Open full run →',
    'drawer.open_in_ide': '</> Open in IDE',
    // section titles in drawer
    'section.verdict': 'Verdict',
    'section.factor': 'Factor',
    'section.paper_vs_repro': 'Paper vs Reproduction',
    'section.redteam': 'Red Team',
    'section.cumret': 'Cumulative return',
    // library page
    'library.title': 'Library',
    'library.search_placeholder': 'Search…',
    'library.col.verdict': '',
    'library.col.title': 'title / authors',
    'library.col.family': 'family',
    'library.col.year': 'year',
    'library.col.claim_ic': 'claim IC',
    'library.col.repro_ic': 'repro IC',
    'library.col.cumret': 'cumret',
    'library.col.sharpe': 'Sharpe',
    'library.col.score': 'score',
    'library.col.verdict_col': 'verdict',
    'library.col.stars': '★',
    'library.sort.year_desc': 'Year ↓',
    'library.sort.year_asc': 'Year ↑',
    'library.sort.score_desc': 'Score ↓',
    'library.sort.score_asc': 'Score ↑',
    'library.sort.ic_desc': '|IC| ↓',
    // factors page
    'factors.title': 'Factor families',
    'factors.subtitle': 'claimed IC vs reproduced IC, aggregated across papers',
    'factors.claimed': 'CLAIMED',
    'factors.repro': 'REPRO',
    'factors.see_papers': 'See {n} papers',
    // run detail page
    'run.back': '← timeline',
    'run.prev': '↑ prev',
    'run.next': '↓ next',
    'run.repro_engineering': 'REPRO ENGINEERING',
    'run.open_in_ide': '</> Open in IDE',
    'run.ide_hint': 'view & edit Claude-generated factor.py · backtest.py · redteam.py',
    'run.headline_label': 'Headline finding',
    'run.score_label': 'Reproducibility score',
    'run.score_max': '/ 1.00 max',
    'run.pipeline_label': 'Pipeline',
    'run.complete': '✓ COMPLETE · 47.2s',
    'run.tab.verdict': 'Verdict',
    'run.tab.evidence': 'Evidence',
    'run.tab.redteam': 'Red Team',
    'run.tab.code': 'Code',
    'run.tab.report': 'Report',
    // run detail verdict tab
    'run.verdict.paper_vs_repro': 'Paper vs Reproduction',
    'run.verdict.cumret': 'Cumulative long-short return',
    'run.verdict.influence': 'Influence',
    'run.verdict.your_rating': 'your rating',
    // run detail table row labels
    'run.row.metric': 'metric',
    'run.row.paper_claim': 'paper claim',
    'run.row.reproduction': 'reproduction',
    'run.row.delta': 'Δ',
    'run.row.period': 'period',
    'run.row.universe': 'universe',
    'run.row.ic_mean': 'IC mean',
    'run.row.sign_match': 'sign match',
    'run.row.cumret': 'cumret',
    'run.row.max_dd': 'max DD',
    'run.row.sharpe': 'Sharpe',
    'run.row.score': 'score',
    'run.sign_matches': '✓ matches',
    'run.sign_flipped': '✗ flipped',
    // run detail evidence tab
    'run.evidence.cumret': 'Cumulative long-short return',
    'run.evidence.ic_series': 'Rolling IC',
    'run.evidence.drawdown': 'Drawdown',
    // run detail redteam tab
    'run.redteam.passed': 'passed',
    // upload queue page
    'upload.title': 'Upload queue',
    'upload.subtitle': 'papers in pipeline',
    'upload.drop_zone': 'Drop more PDFs to enqueue',
    'upload.drop_hint': 'multi-file · max 50 MB each',
    'upload.browse': 'Browse',
    'upload.cancel': 'Cancel',
    'upload.open': 'Open →',
    // compare page
    'compare.title': 'Compare',
    'compare.overlay': 'Overlaid cumulative returns',
    // IDE page
    'ide.run_backtest': '▶ Run backtest',
    'ide.running': 'Running…',
    'ide.regenerate': '✦ Regenerate with Claude',
    'ide.view_run': 'View run →',
    'ide.close': 'Close ×',
    'ide.tab.terminal': 'terminal',
    'ide.tab.problems': 'problems',
    'ide.tab.output': 'output',
    'ide.tab.llm': 'llm',
    'ide.no_problems': 'No problems detected.',
    'ide.regen.title': 'Regenerate code with Claude',
    'ide.regen.placeholder': 'Describe the change…',
    'ide.regen.quick_prompts': 'QUICK PROMPTS:',
    'ide.regen.cancel': 'Cancel',
    'ide.regen.submit': 'Regenerate ✦',
    // custom upload modal
    'upload.modal.title': 'Add to your timeline',
    'upload.modal.subtitle': 'PDF / paper / strategy note · personal archive',
    'upload.modal.drop_zone': 'Drop a PDF, .md, or .docx here',
    'upload.modal.drop_hint': 'paper · strategy note · research memo · max 50 MB',
    'upload.modal.browse': 'Browse files',
    'upload.modal.write_note': 'or write a strategy note from scratch →',
    'upload.modal.run_pipeline': 'Run pipeline →',
    'upload.modal.add_another': 'Add another',
    'upload.modal.open_run': 'Open run →',
    'upload.modal.back': '← Back',
    'upload.modal.added': 'Added to timeline',
    'upload.modal.hint_drop': 'Drop a file or skip to write a note',
    'upload.modal.hint_meta': 'Tagging now means richer queries later',
    'upload.modal.hint_running': '~6s · pipeline simulated',
    'upload.modal.hint_done': 'Open the new node on the timeline',
    // ai search modal
    'ai_search.title': 'AI Research Search',
    'ai_search.subtitle': 'arxiv · ssrn · scholar · LLM-ranked',
    'ai_search.placeholder': 'Find recent papers on… e.g. low-vol decay in A-shares 2024',
    'ai_search.search_btn': 'Search ✦',
    'ai_search.searching': 'Searching…',
    'ai_search.try': 'TRY:',
    'ai_search.cancel': 'Cancel',
    'ai_search.add_btn': 'Add {n} to timeline · run pipeline →',
    'ai_search.selected': '{n} of {total} selected',
    // app sidebar
    'sidebar.add_to_timeline': 'ADD TO TIMELINE',
    'sidebar.ai_search': 'AI search',
    'sidebar.custom_upload': 'Custom upload',
    'sidebar.pipeline_queue': 'Pipeline queue',
    // topbar new run button
    'top.ai_search': 'AI search',
    // topbar extras (lang toggle, theme, cmdk hint, crumbs)
    'top.switch_lang': 'Switch language',
    'top.cmdk_hint': 'Open command palette (⌘K)',
    'top.theme_to_day': 'Switch to day',
    'top.theme_to_night': 'Switch to night',
    'crumb.landing': 'landing',
    'crumb.timeline': 'archive · timeline',
    'crumb.factors': 'cross-paper aggregates',
    'crumb.library': 'all papers',
    'crumb.upload': 'pipeline queue',
    'crumb.run': 'reproduction report',
    'crumb.compare': 'side-by-side',
    'crumb.monitor': 'live factor monitoring',
    'crumb.monitor_detail': 'factor detail',
    'crumb.portfolio': 'paper trading',
    'crumb.settings': 'preferences',
    'crumb.search': 'results',
    'crumb.profile': 'public profile'
  }
};

// global lang state lives on window so all components can read it
window.__lang = window.__lang || (() => {
  try {
    return localStorage.getItem('replicalpha:lang') || 'zh';
  } catch (e) {
    return 'zh';
  }
})();
window.t = function (key, fallback) {
  const lang = window.__lang || 'zh';
  return I18N[lang] && I18N[lang][key] || I18N.zh[key] || fallback || key;
};
window.setLang = function (lang) {
  window.__lang = lang;
  try {
    localStorage.setItem('replicalpha:lang', lang);
  } catch (e) {}
  window.dispatchEvent(new CustomEvent('replicalpha:lang-change', {
    detail: lang
  }));
};
function useLang() {
  const [lang, setLangState] = useStateV3(window.__lang || 'zh');
  useEffectV3(() => {
    const handler = e => setLangState(e.detail);
    window.addEventListener('replicalpha:lang-change', handler);
    return () => window.removeEventListener('replicalpha:lang-change', handler);
  }, []);
  return [lang, window.setLang];
}
window.useLang = useLang;

// ───────────────────────────── shared atoms ─────────────────────────────

function MonoV3({
  children,
  size = 11,
  color = 'var(--text-2)',
  style = {}
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--mono)',
      fontSize: size,
      color,
      letterSpacing: 0.3,
      ...style
    }
  }, children);
}
function PageHeaderV3({
  title,
  subtitle,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 16,
      padding: '20px 28px 16px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface-1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 600,
      color: 'var(--text-1)',
      letterSpacing: -0.3,
      marginBottom: 4
    }
  }, title), subtitle && /*#__PURE__*/React.createElement(MonoV3, {
    size: 11,
    color: "var(--text-3)"
  }, subtitle)), right);
}
function SectionCardV3({
  title,
  subtitle,
  right,
  children,
  padding = '16px 18px'
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      border: '1px solid var(--border)',
      borderRadius: 6,
      background: 'var(--surface-1)',
      marginBottom: 16,
      overflow: 'hidden'
    }
  }, (title || right) && /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 16px',
      borderBottom: '1px solid var(--border-soft)',
      background: 'var(--surface-0)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      fontWeight: 600,
      color: 'var(--text-1)'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement(MonoV3, {
    size: 10,
    color: "var(--text-3)"
  }, subtitle)), right), /*#__PURE__*/React.createElement("div", {
    style: {
      padding
    }
  }, children));
}
function VerdictBadgeV3({
  v
}) {
  const map = {
    green: {
      label: 'reproduced',
      sym: '✓',
      bg: '#22c55e22',
      fg: '#22c55e'
    },
    yellow: {
      label: 'weak',
      sym: '⚠',
      bg: '#eab30822',
      fg: '#eab308'
    },
    red: {
      label: 'sign-flip',
      sym: '⚡',
      bg: '#ef444422',
      fg: '#ef4444'
    },
    failed: {
      label: 'failed',
      sym: '✗',
      bg: '#ef444422',
      fg: '#ef4444'
    }
  };
  const m = map[v] || map.yellow;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '2px 7px',
      borderRadius: 99,
      fontSize: 10,
      background: m.bg,
      color: m.fg,
      fontFamily: 'var(--mono)',
      letterSpacing: 0.4
    }
  }, /*#__PURE__*/React.createElement("span", null, m.sym), /*#__PURE__*/React.createElement("span", {
    style: {
      textTransform: 'uppercase'
    }
  }, m.label));
}
window.MonoV3 = MonoV3;
window.PageHeaderV3 = PageHeaderV3;
window.SectionCardV3 = SectionCardV3;
window.VerdictBadgeV3 = VerdictBadgeV3;

// ───────────────────────────── Cmd+K palette ─────────────────────────────

function CommandPalette({
  open,
  onClose,
  onNav,
  onOpenAI,
  onOpenUpload,
  onToggleTheme,
  onToggleDensity,
  onSwitchLang
}) {
  const [q, setQ] = useStateV3('');
  const [hl, setHl] = useStateV3(0);
  const inputRef = useRefV3(null);
  const PAPERS = window.PAPERS || [];
  useEffectV3(() => {
    if (open) {
      setQ('');
      setHl(0);
      setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
    }
  }, [open]);
  const items = useMemoV3(() => {
    const navItems = [{
      kind: 'nav',
      label: window.t('nav.timeline'),
      key: 'timeline',
      sub: '/timeline'
    }, {
      kind: 'nav',
      label: window.t('nav.factors'),
      key: 'factors',
      sub: '/factors'
    }, {
      kind: 'nav',
      label: window.t('nav.library'),
      key: 'library',
      sub: '/library'
    }, {
      kind: 'nav',
      label: window.t('nav.monitor'),
      key: 'monitor',
      sub: '/monitor'
    }, {
      kind: 'nav',
      label: window.t('nav.portfolio'),
      key: 'portfolio',
      sub: '/portfolio'
    }, {
      kind: 'nav',
      label: window.t('nav.settings'),
      key: 'settings',
      sub: '/settings'
    }, {
      kind: 'nav',
      label: window.t('nav.profile'),
      key: 'profile',
      sub: '/u/me'
    }, {
      kind: 'nav',
      label: window.t('nav.home'),
      key: 'landing',
      sub: '/'
    }];
    const paperItems = PAPERS.slice(0, 30).map(p => ({
      kind: 'paper',
      label: p.title,
      key: p.id,
      sub: `${p.authors} · ${p.year}`,
      onPick: () => onNav('run', {
        id: p.id
      })
    }));
    const doItems = [{
      kind: 'do',
      label: window.t('cmd.upload_pdf'),
      key: '__upload',
      onPick: () => onOpenUpload()
    }, {
      kind: 'do',
      label: window.t('cmd.new_run_url'),
      key: '__agent',
      onPick: () => onOpenAI()
    }, {
      kind: 'do',
      label: window.t('cmd.toggle_theme'),
      key: '__theme',
      onPick: () => onToggleTheme()
    }, {
      kind: 'do',
      label: window.t('cmd.toggle_density'),
      key: '__density',
      onPick: () => onToggleDensity()
    }, {
      kind: 'do',
      label: window.t('cmd.switch_lang'),
      key: '__lang',
      onPick: () => onSwitchLang()
    }];
    let recent = [];
    try {
      recent = JSON.parse(localStorage.getItem('replicalpha:recent') || '[]');
    } catch (e) {}
    const recentItems = recent.slice(0, 5).map(r => ({
      kind: 'recent',
      label: r.label,
      key: r.key,
      sub: r.sub || '',
      onPick: () => r.route ? onNav(r.route, r.params || {}) : null
    }));
    const all = [...navItems, ...doItems, ...paperItems, ...recentItems];
    if (!q.trim()) return all;
    const lc = q.toLowerCase();
    return all.filter(it => it.label.toLowerCase().includes(lc) || (it.sub || '').toLowerCase().includes(lc));
  }, [q, PAPERS]);
  function pick(it) {
    if (!it) return;
    if (it.onPick) it.onPick();else if (it.kind === 'nav') onNav(it.key);
    onClose();
  }
  function onKey(e) {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHl(h => Math.min(items.length - 1, h + 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHl(h => Math.max(0, h - 1));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      pick(items[hl]);
    }
  }
  if (!open) return null;

  // group items by kind for display
  const groups = items.reduce((acc, it) => {
    (acc[it.kind] = acc[it.kind] || []).push(it);
    return acc;
  }, {});
  const groupOrder = ['nav', 'do', 'paper', 'recent'];
  const groupTitle = {
    nav: window.t('cmd.navigate'),
    do: window.t('cmd.do'),
    paper: window.t('search.papers'),
    recent: window.t('cmd.recent')
  };
  let runningIdx = -1;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.55)',
      zIndex: 1500,
      display: 'flex',
      justifyContent: 'center',
      paddingTop: '12vh'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: 580,
      maxWidth: '92vw',
      maxHeight: '70vh',
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 14,
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-3)',
      fontFamily: 'var(--mono)',
      fontSize: 13
    }
  }, "\u2318"), /*#__PURE__*/React.createElement("input", {
    ref: inputRef,
    value: q,
    onChange: e => {
      setQ(e.target.value);
      setHl(0);
    },
    onKeyDown: onKey,
    placeholder: window.t('cmd.placeholder'),
    style: {
      flex: 1,
      background: 'transparent',
      border: 'none',
      outline: 'none',
      color: 'var(--text-1)',
      fontSize: 14,
      fontFamily: 'var(--mono)'
    }
  }), /*#__PURE__*/React.createElement(MonoV3, {
    size: 9,
    color: "var(--text-3)"
  }, "ESC")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 6
    }
  }, items.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24,
      textAlign: 'center',
      color: 'var(--text-3)',
      fontSize: 12
    }
  }, window.t('cmd.no_results')), groupOrder.map(g => {
    const gItems = groups[g];
    if (!gItems || gItems.length === 0) return null;
    return /*#__PURE__*/React.createElement("div", {
      key: g,
      style: {
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '6px 10px 4px',
        fontFamily: 'var(--mono)',
        fontSize: 9,
        letterSpacing: 0.6,
        color: 'var(--text-3)',
        textTransform: 'uppercase'
      }
    }, groupTitle[g] || g), gItems.map(it => {
      runningIdx++;
      const idx = runningIdx;
      const active = idx === hl;
      return /*#__PURE__*/React.createElement("div", {
        key: `${g}-${it.key}`,
        onMouseEnter: () => setHl(idx),
        onClick: () => pick(it),
        style: {
          padding: '7px 10px',
          borderRadius: 4,
          background: active ? 'var(--accent-dim)' : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 18,
          height: 18,
          borderRadius: 3,
          flexShrink: 0,
          background: active ? 'var(--accent)' : 'var(--surface-2)',
          color: active ? '#fff' : 'var(--text-3)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--mono)',
          fontSize: 10
        }
      }, {
        nav: '→',
        do: '·',
        paper: '◆',
        recent: '↺'
      }[g]), /*#__PURE__*/React.createElement("span", {
        style: {
          flex: 1,
          fontSize: 13,
          color: 'var(--text-1)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }
      }, it.label), it.sub && /*#__PURE__*/React.createElement(MonoV3, {
        size: 10,
        color: "var(--text-3)"
      }, it.sub));
    }));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 14px',
      borderTop: '1px solid var(--border)',
      background: 'var(--surface-0)',
      display: 'flex',
      gap: 14,
      fontFamily: 'var(--mono)',
      fontSize: 9,
      color: 'var(--text-3)'
    }
  }, /*#__PURE__*/React.createElement("span", null, window.__lang === "en" ? "↑↓ Select" : "↑↓ 选择"), /*#__PURE__*/React.createElement("span", null, window.__lang === "en" ? "↵ Open" : "↵ 打开"), /*#__PURE__*/React.createElement("span", null, window.__lang === "en" ? "ESC Close" : "ESC 关闭"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", null, items.length, " ", window.__lang === "en" ? "items" : "项"))));
}
window.CommandPalette = CommandPalette;

// ───────────────────────────── Notifications ─────────────────────────────

function NotificationsBell({
  onNav
}) {
  const [open, setOpen] = useStateV3(false);
  const ref = useRefV3(null);
  const [notifs, setNotifs] = useStateV3([{
    id: 'n1',
    cat: 'pipeline',
    text: window.__lang === 'en' ? 'r-ang2006 finished · score 0.05 → 0.12' : 'r-ang2006 完成 · score 0.05 → 0.12',
    ts: '5m',
    unread: true,
    route: {
      name: 'run',
      params: {
        id: 'r-ang2006'
      }
    }
  }, {
    id: 'n2',
    cat: 'monitor',
    text: window.__lang === 'en' ? 'idio_vol IC 30d decay −77%' : 'idio_vol IC 30d 衰减 −77%',
    ts: '2h',
    unread: true,
    route: {
      name: 'monitor'
    }
  }, {
    id: 'n3',
    cat: 'agent',
    text: window.__lang === 'en' ? 'Background search done: found 3 momentum decay 2024 papers' : '后台搜索完成: 找到 3 篇 momentum decay 2024 论文',
    ts: '1d',
    unread: false,
    route: {
      name: 'timeline'
    }
  }, {
    id: 'n4',
    cat: 'system',
    text: window.__lang === 'en' ? 'Welcome to v0.3 · try ⌘K' : '欢迎使用 v0.3 · 试试 ⌘K',
    ts: '3d',
    unread: false
  }]);
  useEffectV3(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  const unread = notifs.filter(n => n.unread).length;
  const catColor = {
    pipeline: 'var(--accent)',
    monitor: '#eab308',
    agent: '#7e57c2',
    system: 'var(--text-3)'
  };
  function clickNotif(n) {
    setNotifs(ns => ns.map(x => x.id === n.id ? {
      ...x,
      unread: false
    } : x));
    if (n.route) onNav(n.route.name, n.route.params || {});
    setOpen(false);
  }
  function markAllRead() {
    setNotifs(ns => ns.map(x => ({
      ...x,
      unread: false
    })));
  }
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(v => !v),
    title: window.t('top.notifications'),
    style: {
      width: 28,
      height: 28,
      borderRadius: 4,
      padding: 0,
      position: 'relative',
      background: open ? 'var(--surface-2)' : 'transparent',
      color: 'var(--text-2)',
      border: '1px solid var(--border)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD14"), unread > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 14,
      height: 14,
      borderRadius: 99,
      padding: '0 4px',
      background: 'var(--accent)',
      color: '#fff',
      fontSize: 9,
      fontFamily: 'var(--mono)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, unread)), open && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 36,
      right: 0,
      width: 340,
      maxHeight: 420,
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 14px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-1)'
    }
  }, window.t('top.notifications')), unread > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: markAllRead,
    style: {
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontSize: 10,
      fontFamily: 'var(--mono)',
      color: 'var(--accent)'
    }
  }, window.__lang === "en" ? "Mark all read" : "全部已读")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto'
    }
  }, notifs.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24,
      textAlign: 'center',
      color: 'var(--text-3)',
      fontSize: 12
    }
  }, window.t('top.no_notifications')), notifs.map(n => /*#__PURE__*/React.createElement("button", {
    key: n.id,
    onClick: () => clickNotif(n),
    style: {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      padding: '10px 14px',
      border: 'none',
      borderBottom: '1px solid var(--border-soft)',
      background: n.unread ? 'var(--accent-dim)' : 'transparent',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 99,
      background: catColor[n.cat] || 'var(--text-3)'
    }
  }), /*#__PURE__*/React.createElement(MonoV3, {
    size: 9,
    color: catColor[n.cat]
  }, n.cat.toUpperCase()), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(MonoV3, {
    size: 9,
    color: "var(--text-3)"
  }, n.ts)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-1)',
      lineHeight: 1.4
    }
  }, n.text))))));
}
window.NotificationsBell = NotificationsBell;

// ───────────────────────────── Sync indicator ─────────────────────────────

function SyncIndicator() {
  const [state, setState] = useStateV3('synced'); // synced | syncing | offline
  // gentle simulate: cycle to syncing for 1.5s every 25s
  useEffectV3(() => {
    const id = setInterval(() => {
      setState('syncing');
      setTimeout(() => setState('synced'), 1500);
    }, 25000);
    return () => clearInterval(id);
  }, []);
  const color = state === 'synced' ? '#22c55e' : state === 'syncing' ? 'var(--accent)' : '#ef4444';
  const label = state === 'synced' ? window.t('top.synced') : state === 'syncing' ? window.t('top.syncing') : window.t('top.offline');
  return /*#__PURE__*/React.createElement("div", {
    title: `${window.t('top.last_synced')}: 30s`,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--mono)',
      fontSize: 10,
      color: 'var(--text-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 99,
      background: color,
      animation: state === 'syncing' ? 'pulseDim 1s ease-in-out infinite' : 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-2)'
    }
  }, label));
}
window.SyncIndicator = SyncIndicator;

// ───────────────────────────── Settings page ─────────────────────────────

function SettingsPage({
  tweaks,
  setTweak,
  onToggleTheme
}) {
  const [tab, setTab] = useStateV3('appearance');
  const [lang, setLangFn] = useLang();
  const tabs = [{
    id: 'account',
    label: window.t('settings.account')
  }, {
    id: 'apikeys',
    label: window.t('settings.api_keys')
  }, {
    id: 'adapters',
    label: window.t('settings.adapters')
  }, {
    id: 'models',
    label: window.t('settings.models')
  }, {
    id: 'appearance',
    label: window.t('settings.appearance')
  }, {
    id: 'pipeline',
    label: window.t('settings.pipeline')
  }, {
    id: 'storage',
    label: window.t('settings.storage')
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      overflow: 'auto',
      background: 'var(--bg-base)'
    }
  }, /*#__PURE__*/React.createElement(PageHeaderV3, {
    title: window.t('settings.title'),
    subtitle: "/settings \xB7 v0.3"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 0,
      minHeight: 'calc(100% - 76px)'
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 200,
      flexShrink: 0,
      padding: '16px 8px',
      borderRight: '1px solid var(--border)',
      background: 'var(--surface-0)'
    }
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    onClick: () => setTab(t.id),
    style: {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      padding: '8px 14px',
      borderRadius: 4,
      marginBottom: 2,
      background: tab === t.id ? 'var(--accent-dim)' : 'transparent',
      color: tab === t.id ? 'var(--accent)' : 'var(--text-2)',
      border: 'none',
      cursor: 'pointer',
      fontSize: 13
    }
  }, t.label))), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      padding: '20px 28px',
      maxWidth: 720
    }
  }, tab === 'account' && /*#__PURE__*/React.createElement(SettingsAccount, null), tab === 'apikeys' && /*#__PURE__*/React.createElement(SettingsApiKeys, null), tab === 'adapters' && /*#__PURE__*/React.createElement(SettingsAdapters, null), tab === 'models' && /*#__PURE__*/React.createElement(SettingsModels, null), tab === 'appearance' && /*#__PURE__*/React.createElement(SettingsAppearance, {
    tweaks: tweaks,
    setTweak: setTweak,
    lang: lang,
    setLang: setLangFn
  }), tab === 'pipeline' && /*#__PURE__*/React.createElement(SettingsPipeline, null), tab === 'storage' && /*#__PURE__*/React.createElement(SettingsStorage, null))));
}
function SettingRow({
  label,
  hint,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 16,
      padding: '14px 0',
      borderBottom: '1px solid var(--border-soft)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 200,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-1)',
      marginBottom: 2
    }
  }, label), hint && /*#__PURE__*/React.createElement(MonoV3, {
    size: 10,
    color: "var(--text-3)"
  }, hint)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, children));
}
function SettingsAccount() {
  return /*#__PURE__*/React.createElement(SectionCardV3, {
    title: window.t('settings.account')
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px 18px',
      textAlign: 'center',
      border: '1px dashed var(--border)',
      borderRadius: 6,
      background: 'var(--surface-0)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-2)',
      marginBottom: 8
    }
  }, window.__lang === "en" ? "Login arrives in v0.4" : "登录功能 v0.4 上线"), /*#__PURE__*/React.createElement("button", {
    disabled: true,
    style: {
      padding: '6px 14px',
      borderRadius: 4,
      fontSize: 12,
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      color: 'var(--text-3)',
      cursor: 'not-allowed'
    }
  }, window.__lang === "en" ? "Sign in with GitHub · coming soon" : "使用 GitHub 登录 · 即将开放")));
}
function SettingsApiKeys() {
  return /*#__PURE__*/React.createElement(SectionCardV3, {
    title: window.t('settings.api_keys')
  }, [{
    label: 'OpenAI',
    mask: 'sk-•••••••••••••a3f2',
    last: window.__lang === 'en' ? '2 hours ago' : '2 小时前'
  }, {
    label: 'Tushare',
    mask: '7a91••••••••••',
    last: window.__lang === 'en' ? '1 day ago' : '1 天前'
  }, {
    label: 'Anthropic',
    mask: 'sk-ant-••••••••',
    last: window.__lang === 'en' ? 'never' : '从未'
  }].map(k => /*#__PURE__*/React.createElement(SettingRow, {
    key: k.label,
    label: k.label,
    hint: (window.__lang === 'en' ? 'last used · ' : '上次使用 · ') + k.last
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    defaultValue: k.mask,
    style: inputStyleV3()
  }), /*#__PURE__*/React.createElement("button", {
    style: btnGhostV3()
  }, window.__lang === "en" ? "Test" : "测试"), /*#__PURE__*/React.createElement("button", {
    style: btnGhostV3()
  }, window.__lang === "en" ? "Update" : "更新")))));
}
function SettingsAdapters() {
  return /*#__PURE__*/React.createElement(SectionCardV3, {
    title: window.t('settings.adapters')
  }, /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Active source" : "活动数据源",
    hint: window.__lang === "en" ? "Applies to all new runs" : "生效于所有新建运行"
  }, /*#__PURE__*/React.createElement("select", {
    style: selectStyleV3()
  }, /*#__PURE__*/React.createElement("option", null, window.__lang === 'en' ? 'CSV (built-in)' : 'CSV (内置)'), /*#__PURE__*/React.createElement("option", null, "Tushare Pro"), /*#__PURE__*/React.createElement("option", null, "yfinance"), /*#__PURE__*/React.createElement("option", null, window.__lang === 'en' ? 'Custom (.py upload)' : '自定义 (.py 上传)'))), /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Universe preset" : "股票池预设"
  }, /*#__PURE__*/React.createElement("select", {
    style: selectStyleV3()
  }, /*#__PURE__*/React.createElement("option", null, window.__lang === 'en' ? 'CSI 300 top 30' : 'CSI 300 前 30'), /*#__PURE__*/React.createElement("option", null, "CSI 500"), /*#__PURE__*/React.createElement("option", null, "S&P 500"), /*#__PURE__*/React.createElement("option", null, "Russell 2000"), /*#__PURE__*/React.createElement("option", null, window.__lang === 'en' ? 'Custom ticker list' : '自定义代码列表'))), /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Custom tickers" : "自定义代码列表",
    hint: window.__lang === "en" ? "Comma-separated, .SH/.SZ suffix" : "逗号分隔,以 .SH/.SZ 结尾"
  }, /*#__PURE__*/React.createElement("textarea", {
    rows: 3,
    style: {
      ...inputStyleV3(),
      fontFamily: 'var(--mono)',
      fontSize: 11
    },
    defaultValue: "600519.SH, 000858.SZ, 600036.SH, 000333.SZ"
  })));
}
function SettingsModels() {
  const models = ['Haiku 4.5', 'Sonnet 4.6', 'Opus 4.7', 'GPT-4o-mini', 'GPT-4o'];
  return /*#__PURE__*/React.createElement(SectionCardV3, {
    title: window.t('settings.models')
  }, /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Extractor" : "提取器(Extractor)",
    hint: window.__lang === "en" ? "Reads PDF formulas" : "读取 PDF 公式"
  }, /*#__PURE__*/React.createElement("select", {
    style: selectStyleV3(),
    defaultValue: "Sonnet 4.6"
  }, models.map(m => /*#__PURE__*/React.createElement("option", {
    key: m
  }, m)))), /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Codegen" : "代码生成(Codegen)"
  }, /*#__PURE__*/React.createElement("select", {
    style: selectStyleV3(),
    defaultValue: "Sonnet 4.6"
  }, models.map(m => /*#__PURE__*/React.createElement("option", {
    key: m
  }, m)))), /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Agent" : "代理(Agent)"
  }, /*#__PURE__*/React.createElement("select", {
    style: selectStyleV3(),
    defaultValue: "Haiku 4.5"
  }, models.map(m => /*#__PURE__*/React.createElement("option", {
    key: m
  }, m)))), /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Per-run cost cap" : "单次运行成本上限",
    hint: window.__lang === "en" ? "Auto-pause if exceeded" : "超过则自动暂停"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 0.1,
    max: 5,
    step: 0.1,
    defaultValue: 0.5,
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(MonoV3, {
    size: 11,
    color: "var(--accent)"
  }, "$0.50"))));
}
function SettingsAppearance({
  tweaks,
  setTweak,
  lang,
  setLang
}) {
  return /*#__PURE__*/React.createElement(SectionCardV3, {
    title: window.t('settings.appearance')
  }, /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Theme" : "主题"
  }, /*#__PURE__*/React.createElement(SegmentedV3, {
    value: tweaks.theme,
    onChange: v => setTweak('theme', v),
    options: [{
      value: 'light',
      label: window.__lang === 'en' ? 'Day' : '日'
    }, {
      value: 'dark',
      label: window.__lang === 'en' ? 'Night' : '夜'
    }]
  })), /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Density" : "密度"
  }, /*#__PURE__*/React.createElement(SegmentedV3, {
    value: tweaks.density,
    onChange: v => setTweak('density', v),
    options: [{
      value: 'compact',
      label: window.__lang === 'en' ? 'Compact' : '紧凑'
    }, {
      value: 'comfortable',
      label: window.__lang === 'en' ? 'Comfortable' : '舒适'
    }, {
      value: 'spacious',
      label: window.__lang === 'en' ? 'Spacious' : '宽松'
    }]
  })), /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Language" : "语言"
  }, /*#__PURE__*/React.createElement(SegmentedV3, {
    value: lang,
    onChange: setLang,
    options: [{
      value: 'zh',
      label: '中文'
    }, {
      value: 'en',
      label: 'EN'
    }]
  })), /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Reduced motion" : "减弱动画",
    hint: "prefers-reduced-motion"
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-2)'
    }
  }, window.__lang === 'en' ? 'Enable' : '启用'))));
}
function SettingsPipeline() {
  return /*#__PURE__*/React.createElement(SectionCardV3, {
    title: window.t('settings.pipeline')
  }, /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Default universe" : "默认股票池"
  }, /*#__PURE__*/React.createElement("select", {
    style: selectStyleV3()
  }, /*#__PURE__*/React.createElement("option", null, "CSI 500"), /*#__PURE__*/React.createElement("option", null, "CSI 300"), /*#__PURE__*/React.createElement("option", null, "S&P 500"))), /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Default date range" : "默认日期区间"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    defaultValue: "2010-01-01",
    style: inputStyleV3()
  }), /*#__PURE__*/React.createElement("input", {
    type: "text",
    defaultValue: "2024-12-31",
    style: inputStyleV3()
  }))), /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Rebalance frequency" : "再平衡频率"
  }, /*#__PURE__*/React.createElement(SegmentedV3, {
    value: "W",
    onChange: () => {},
    options: [{
      value: 'D',
      label: window.__lang === 'en' ? 'Day' : '日'
    }, {
      value: 'W',
      label: window.__lang === 'en' ? 'W' : '周'
    }, {
      value: 'M',
      label: window.__lang === 'en' ? 'M' : '月'
    }, {
      value: 'Q',
      label: window.__lang === 'en' ? 'Q' : '季'
    }]
  })), /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Auto-extract on upload" : "上传后自动提取"
  }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    defaultChecked: true
  }), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12
    }
  }, window.__lang === "en" ? "Yes" : "是"))), /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Auto-run after extract" : "提取后自动运行"
  }, /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("input", {
    type: "checkbox"
  }), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12
    }
  }, window.__lang === "en" ? "No" : "否"))));
}
function SettingsStorage() {
  return /*#__PURE__*/React.createElement(SectionCardV3, {
    title: window.t('settings.storage')
  }, /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Cache size" : "缓存大小"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(MonoV3, {
    size: 13,
    color: "var(--text-1)"
  }, "1.2 GB"), /*#__PURE__*/React.createElement("button", {
    style: btnGhostV3()
  }, window.__lang === 'en' ? 'Clear cache' : '清除缓存'))), /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Export all runs" : "导出全部运行",
    hint: "zip \u5305\u542B PDF + factor.py + report.md"
  }, /*#__PURE__*/React.createElement("button", {
    style: btnPrimaryV3()
  }, window.__lang === "en" ? "Export zip" : "导出 zip")), /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Import zip" : "导入 zip"
  }, /*#__PURE__*/React.createElement("button", {
    style: btnGhostV3()
  }, window.__lang === "en" ? "Choose file" : "选择文件")), /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Reset to defaults" : "重置为默认"
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...btnGhostV3(),
      color: '#ef4444',
      borderColor: '#ef4444'
    }
  }, window.__lang === "en" ? "Reset all" : "重置全部")));
}

// settings atoms
function inputStyleV3() {
  return {
    flex: 1,
    padding: '6px 10px',
    fontSize: 12,
    background: 'var(--surface-0)',
    color: 'var(--text-1)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    outline: 'none',
    fontFamily: 'inherit'
  };
}
function selectStyleV3() {
  return {
    ...inputStyleV3(),
    padding: '6px 10px',
    fontFamily: 'inherit'
  };
}
function btnGhostV3() {
  return {
    padding: '5px 12px',
    borderRadius: 4,
    fontSize: 11,
    background: 'transparent',
    color: 'var(--text-2)',
    border: '1px solid var(--border)',
    cursor: 'pointer'
  };
}
function btnPrimaryV3() {
  return {
    padding: '6px 14px',
    borderRadius: 4,
    fontSize: 12,
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer'
  };
}
function SegmentedV3({
  value,
  onChange,
  options
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      border: '1px solid var(--border)',
      borderRadius: 4,
      overflow: 'hidden'
    }
  }, options.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    onClick: () => onChange(o.value),
    style: {
      padding: '5px 14px',
      fontSize: 11,
      fontFamily: 'var(--mono)',
      background: value === o.value ? 'var(--accent)' : 'transparent',
      color: value === o.value ? '#fff' : 'var(--text-2)',
      border: 'none',
      cursor: 'pointer',
      borderRight: '1px solid var(--border)'
    }
  }, o.label)));
}
window.SegmentedV3 = SegmentedV3;
window.SettingsPage = SettingsPage;

// ───────────────────────────── Search results page ─────────────────────────────

function SearchResults({
  q: initialQ,
  onOpenRun,
  onNav
}) {
  const [q, setQ] = useStateV3(initialQ || 'low-vol decay');
  const PAPERS = window.PAPERS || [];
  const lc = q.toLowerCase();
  const paperHits = PAPERS.filter(p => p.title.toLowerCase().includes(lc) || (p.authors || '').toLowerCase().includes(lc) || (p.formula || '').toLowerCase().includes(lc)).slice(0, 10);
  const factorHits = PAPERS.filter(p => (p.factor || p.factor_name || p.id || '').toLowerCase().includes(lc)).slice(0, 5);
  const findingHits = PAPERS.filter(p => (p.findings || []).some(f => (f.text || '').toLowerCase().includes(lc))).slice(0, 5);
  const noteHits = []; // user notes mock

  function highlight(text) {
    if (!text || !q.trim()) return text;
    const escaped = q.trim().replace(/[.*+?^()|[\]\\{}]/g, '\\$&');
    const re = new RegExp('(' + escaped + ')', 'ig');
    const parts = String(text).split(re);
    return parts.map((part, i) => re.test(part) ? /*#__PURE__*/React.createElement("mark", {
      key: i,
      style: {
        background: 'var(--accent-dim)',
        color: 'var(--accent)',
        padding: '0 2px',
        borderRadius: 2
      }
    }, part) : /*#__PURE__*/React.createElement("span", {
      key: i
    }, part));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      overflow: 'auto',
      background: 'var(--bg-base)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 5,
      padding: '14px 28px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface-1)',
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-3)',
      fontFamily: 'var(--mono)',
      fontSize: 14
    }
  }, "\u2315"), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: window.__lang === 'en' ? 'Search papers, factors, findings…' : '搜索论文、因子、发现…',
    style: {
      flex: 1,
      padding: '8px 12px',
      fontSize: 14,
      fontFamily: 'var(--mono)',
      background: 'var(--surface-0)',
      border: '1px solid var(--border)',
      borderRadius: 4,
      color: 'var(--text-1)',
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("select", {
    style: selectStyleV3()
  }, /*#__PURE__*/React.createElement("option", null, "\u76F8\u5173\u6027"), /*#__PURE__*/React.createElement("option", null, "\u6700\u65B0"), /*#__PURE__*/React.createElement("option", null, "\u5F97\u5206\u9AD8\u2192\u4F4E"), /*#__PURE__*/React.createElement("option", null, "\u5F97\u5206\u4F4E\u2192\u9AD8"), /*#__PURE__*/React.createElement("option", null, "\u590D\u73B0\u6700\u591A"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 28px',
      maxWidth: 980
    }
  }, paperHits.length === 0 && factorHits.length === 0 && findingHits.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '36px 24px',
      textAlign: 'center',
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      borderRadius: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: 'var(--text-1)',
      marginBottom: 8
    }
  }, window.t('search.empty'), ": ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--mono)'
    }
  }, "\"", q, "\"")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-3)',
      marginBottom: 14
    }
  }, "\u8BD5\u8BD5 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)',
      fontFamily: 'var(--mono)'
    }
  }, "idiosyncratic volatility"), ",\u6216\u7528\u4EE3\u7406\u4ECE arxiv/SSRN \u627E:"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav && onNav('agent'),
    style: btnPrimaryV3()
  }, "\u6253\u5F00\u4EE3\u7406 \u2192")), paperHits.length > 0 && /*#__PURE__*/React.createElement(SectionCardV3, {
    title: `${window.t('search.papers')} · ${paperHits.length}`
  }, paperHits.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    onClick: () => onOpenRun(p.id),
    style: {
      padding: '12px 0',
      borderBottom: '1px solid var(--border-soft)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: 'var(--text-1)',
      flex: 1
    }
  }, highlight(p.title)), /*#__PURE__*/React.createElement(VerdictBadgeV3, {
    v: p.verdict
  })), /*#__PURE__*/React.createElement(MonoV3, {
    size: 10,
    color: "var(--text-3)"
  }, p.authors, " \xB7 ", p.year, " \xB7 ", p.family, " \xB7 ", p.id), p.formula && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      padding: '4px 8px',
      background: 'var(--surface-0)',
      borderRadius: 3,
      fontFamily: 'var(--mono)',
      fontSize: 11,
      color: 'var(--text-2)'
    }
  }, highlight(p.formula))))), factorHits.length > 0 && /*#__PURE__*/React.createElement(SectionCardV3, {
    title: `${window.t('search.factors')} · ${factorHits.length}`
  }, factorHits.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    onClick: () => onOpenRun(p.id),
    style: {
      padding: '8px 0',
      borderBottom: '1px solid var(--border-soft)',
      cursor: 'pointer',
      display: 'flex',
      gap: 12,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(MonoV3, {
    size: 12,
    color: "var(--accent)"
  }, p.factor || p.factor_name || p.id), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-2)',
      flex: 1
    }
  }, p.title), /*#__PURE__*/React.createElement(VerdictBadgeV3, {
    v: p.verdict
  })))), findingHits.length > 0 && /*#__PURE__*/React.createElement(SectionCardV3, {
    title: `${window.t('search.findings')} · ${findingHits.length}`
  }, findingHits.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    onClick: () => onOpenRun(p.id),
    style: {
      padding: '8px 0',
      borderBottom: '1px solid var(--border-soft)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-1)'
    }
  }, highlight(p.findings && p.findings[0] && p.findings[0].text || '')), /*#__PURE__*/React.createElement(MonoV3, {
    size: 9,
    color: "var(--text-3)"
  }, p.title))))));
}
window.SearchResults = SearchResults;

// ───────────────────────────── Monitor page ─────────────────────────────

function MonitorPage({
  onOpenRun,
  onNav
}) {
  const PAPERS = window.PAPERS || [];
  // Use reproduced (green) papers as watched factors (mock)
  const watched = PAPERS.filter(p => p.verdict === 'green').slice(0, 6).map(p => ({
    ...p,
    icCurrent: 0.012 + Math.random() * 0.06,
    icHist: 0.04 + Math.random() * 0.03,
    decay: -0.4 - Math.random() * 0.5,
    lastUpdate: ['2h', '5h', '1d', '3h', '6h', '12h'][Math.floor(Math.random() * 6)],
    nextUpdate: '22h',
    alert: Math.random() < 0.5 ? 'decay' : null
  }));
  const alerts = watched.filter(w => w.alert).slice(0, 3);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      overflow: 'auto',
      background: 'var(--bg-base)'
    }
  }, /*#__PURE__*/React.createElement(PageHeaderV3, {
    title: window.t('monitor.title'),
    subtitle: `/monitor · ${watched.length} ${window.__lang === "en" ? "watched factors" : "个关注的因子"} · ${alerts.length} ${window.__lang === "en" ? "open alerts" : "个未处理提醒"}`,
    right: /*#__PURE__*/React.createElement("button", {
      style: btnPrimaryV3()
    }, window.__lang === "en" ? "+ Add watch" : "+ 添加关注")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 28px',
      maxWidth: 1200
    }
  }, alerts.length > 0 && /*#__PURE__*/React.createElement(SectionCardV3, {
    title: `${window.t('monitor.alerts')} · ${alerts.length}`
  }, alerts.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 14px',
      marginBottom: 8,
      border: '1px solid #eab30844',
      background: '#eab30811',
      borderRadius: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16
    }
  }, "\u26A0"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-1)',
      marginBottom: 3
    }
  }, /*#__PURE__*/React.createElement(MonoV3, {
    size: 11,
    color: "var(--accent)"
  }, a.factor || a.id), /*#__PURE__*/React.createElement("span", {
    style: {
      margin: '0 8px',
      color: 'var(--text-3)'
    }
  }, "\xB7"), /*#__PURE__*/React.createElement("span", null, window.__lang === "en" ? `IC 30d MA dropped from +${a.icHist.toFixed(3)} to +${a.icCurrent.toFixed(3)} (decay ${(a.decay * 100).toFixed(0)}%) on 2026-04-22` : `IC 30d MA 从 +${a.icHist.toFixed(3)} 跌至 +${a.icCurrent.toFixed(3)} (衰减 ${(a.decay * 100).toFixed(0)}%) 于 2026-04-22`)), /*#__PURE__*/React.createElement(MonoV3, {
    size: 10,
    color: "var(--text-3)"
  }, a.title)), /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav('monitor_detail', {
      id: a.id
    }),
    style: btnGhostV3()
  }, window.__lang === "en" ? "View →" : "查看 →"), /*#__PURE__*/React.createElement("button", {
    style: btnGhostV3()
  }, window.t('monitor.acknowledge'))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      margin: '6px 0 12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-1)'
    }
  }, window.t('monitor.watched')), /*#__PURE__*/React.createElement(MonoV3, {
    size: 10,
    color: "var(--text-3)"
  }, window.__lang === "en" ? "· Daily refresh 00:00 UTC" : "· 每日 00:00 UTC 更新")), watched.length === 0 ? /*#__PURE__*/React.createElement(EmptyStateV3, {
    title: window.__lang === "en" ? "No watched factors yet" : "还没有关注的因子",
    body: window.__lang === "en" ? "Pick a reproduced paper from your library and click 'Watch this factor' on the verdict page to track its live decay." : "从你的库中挑选一篇 reproduced 论文,在结论页点击 '关注此因子',开始追踪它的实盘衰减。",
    cta: window.__lang === "en" ? "Browse library →" : "浏览库 →",
    onCta: () => onNav('library')
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: 14
    }
  }, watched.map(w => /*#__PURE__*/React.createElement(MonitorCard, {
    key: w.id,
    w: w,
    onOpen: () => onNav('monitor_detail', {
      id: w.id
    }),
    onOpenRun: () => onOpenRun(w.id)
  })))));
}
function MonitorCard({
  w,
  onOpen,
  onOpenRun
}) {
  // mini sparkline
  const points = useMemoV3(() => Array.from({
    length: 30
  }, (_, i) => {
    const t = i / 29;
    const trend = w.icHist - (w.icHist - w.icCurrent) * t;
    const noise = (Math.sin(i * 1.7) + Math.cos(i * 2.3)) * 0.005;
    return {
      x: i,
      y: trend + noise
    };
  }), [w.id]);
  const W = 280,
    H = 60;
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  const path = points.map((p, i) => {
    const x = p.x / 29 * W;
    const y = H - (p.y - minY) / (maxY - minY || 1) * (H - 6) - 3;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--border)',
      borderRadius: 6,
      background: 'var(--surface-1)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 14px',
      borderBottom: '1px solid var(--border-soft)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement(MonoV3, {
    size: 12,
    color: "var(--accent)"
  }, w.factor || w.id), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), w.alert && /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '1px 6px',
      borderRadius: 99,
      background: '#eab30822',
      color: '#eab308',
      fontFamily: 'var(--mono)',
      fontSize: 9,
      letterSpacing: 0.5
    }
  }, "\u26A0 DECAY")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-2)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, w.title)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement(MonoV3, {
    size: 10,
    color: "var(--text-3)"
  }, window.__lang === "en" ? "Current IC (30d MA)" : "当前 IC (30d MA)"), /*#__PURE__*/React.createElement(MonoV3, {
    size: 11,
    color: "var(--text-1)"
  }, "+", w.icCurrent.toFixed(4))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement(MonoV3, {
    size: 10,
    color: "var(--text-3)"
  }, window.__lang === "en" ? "Historical mean" : "历史均值"), /*#__PURE__*/React.createElement(MonoV3, {
    size: 11,
    color: "var(--text-3)"
  }, "+", w.icHist.toFixed(4))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(MonoV3, {
    size: 10,
    color: "var(--text-3)"
  }, window.__lang === "en" ? "Decay (6 months)" : "衰减(6 个月)"), /*#__PURE__*/React.createElement(MonoV3, {
    size: 11,
    color: w.decay < -0.5 ? '#ef4444' : '#eab308'
  }, (w.decay * 100).toFixed(0), "%")), /*#__PURE__*/React.createElement("svg", {
    width: W,
    height: H,
    style: {
      display: 'block',
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: path,
    fill: "none",
    stroke: "var(--accent)",
    strokeWidth: 1.5
  }), /*#__PURE__*/React.createElement("line", {
    x1: 0,
    y1: H - 4,
    x2: W,
    y2: H - 4,
    stroke: "var(--border-soft)",
    strokeWidth: 0.5
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(MonoV3, {
    size: 9,
    color: "var(--text-3)"
  }, window.__lang === "en" ? `updated ${w.lastUpdate} ago · next in ${w.nextUpdate}` : `${w.lastUpdate} 前更新 · 下次 ${w.nextUpdate}`), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: onOpen,
    style: {
      ...btnGhostV3(),
      padding: '3px 8px',
      fontSize: 10
    }
  }, window.__lang === "en" ? "View →" : "查看 →"))));
}
function MonitorDetail({
  id,
  onBack,
  onOpenRun
}) {
  const PAPERS = window.PAPERS || [];
  const p = PAPERS.find(x => x.id === id) || PAPERS[0];
  const [range, setRange] = useStateV3('90d');

  // bigger sparkline
  const N = range === '30d' ? 30 : range === '90d' ? 90 : range === '1y' ? 365 : 730;
  const points = useMemoV3(() => Array.from({
    length: N
  }, (_, i) => {
    const t = i / (N - 1);
    const v = 0.05 - 0.04 * t + Math.sin(i * 0.3) * 0.005;
    return {
      x: i,
      y: v
    };
  }), [N]);
  const W = 1000,
    H = 220;
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  const path = points.map((pt, i) => {
    const x = pt.x / (N - 1) * W;
    const y = H - (pt.y - minY) / (maxY - minY || 1) * (H - 20) - 10;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      overflow: 'auto',
      background: 'var(--bg-base)'
    }
  }, /*#__PURE__*/React.createElement(PageHeaderV3, {
    title: `${p.factor || p.id} · ${window.__lang === "en" ? "monitor detail" : "监控详情"}`,
    subtitle: `/monitor/${p.id} · ${p.title}`,
    right: /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => onOpenRun(p.id),
      style: btnGhostV3()
    }, window.__lang === "en" ? "Verdict →" : "结论页 →"), /*#__PURE__*/React.createElement("button", {
      style: btnPrimaryV3()
    }, window.__lang === "en" ? "Re-run with latest data" : "用最新数据重跑"))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 28px',
      maxWidth: 1200
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      ...btnGhostV3(),
      marginBottom: 12
    }
  }, window.__lang === "en" ? "← Monitor" : "← 监控"), /*#__PURE__*/React.createElement(SectionCardV3, {
    title: window.__lang === "en" ? "IC time series" : "IC 时间序列",
    right: /*#__PURE__*/React.createElement(SegmentedV3, {
      value: range,
      onChange: setRange,
      options: [{
        value: '30d',
        label: window.__lang === 'en' ? '30d' : '30 天'
      }, {
        value: '90d',
        label: window.__lang === 'en' ? '90d' : '90 天'
      }, {
        value: '1y',
        label: window.__lang === 'en' ? '1y' : '1 年'
      }, {
        value: 'all',
        label: window.__lang === 'en' ? 'All' : '全部'
      }]
    })
  }, /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    height: H,
    viewBox: `0 0 ${W} ${H}`,
    preserveAspectRatio: "none",
    style: {
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("line", {
    x1: 0,
    y1: H / 2,
    x2: W,
    y2: H / 2,
    stroke: "var(--border-soft)",
    strokeDasharray: "2 4"
  }), /*#__PURE__*/React.createElement("path", {
    d: path,
    fill: "none",
    stroke: "var(--accent)",
    strokeWidth: 1.8
  }))), /*#__PURE__*/React.createElement(SectionCardV3, {
    title: window.__lang === "en" ? "Cumulative return" : "累计回报"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    height: 140,
    viewBox: `0 0 ${W} 140`,
    preserveAspectRatio: "none",
    style: {
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: `M0,120 ${Array.from({
      length: 50
    }).map((_, i) => `L${i / 49 * W},${120 - i * 1.3 - Math.sin(i * 0.4) * 6}`).join(' ')}`,
    fill: "none",
    stroke: "#22c55e",
    strokeWidth: 1.8
  }))), /*#__PURE__*/React.createElement(SectionCardV3, {
    title: window.__lang === "en" ? "Alert history" : "提醒历史"
  }, [{
    t: '2026-04-22 14:30 UTC',
    sev: 'warn',
    text: window.__lang === 'en' ? 'IC 30d MA decayed −77% (from +0.054 to +0.012)' : 'IC 30d MA 衰减 −77%(从 +0.054 跌至 +0.012)'
  }, {
    t: '2026-03-15 09:00 UTC',
    sev: 'info',
    text: window.__lang === 'en' ? 'Factor restart · recalibrated with 2024-09 data' : '因子重启 · 用 2024-09 数据重新校准'
  }, {
    t: '2026-01-08 02:11 UTC',
    sev: 'warn',
    text: window.__lang === 'en' ? 'Sample concentration warning · last 30d account for 80% of returns' : '样本集中度告警 · 近 30 天占 80% 收益'
  }].map((a, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: '10px 0',
      borderBottom: '1px solid var(--border-soft)',
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(MonoV3, {
    size: 10,
    color: "var(--text-3)",
    style: {
      width: 160,
      flexShrink: 0
    }
  }, a.t), /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '1px 6px',
      borderRadius: 3,
      fontSize: 9,
      letterSpacing: 0.4,
      background: a.sev === 'warn' ? '#eab30822' : 'var(--surface-2)',
      color: a.sev === 'warn' ? '#eab308' : 'var(--text-3)',
      fontFamily: 'var(--mono)',
      height: 14,
      alignSelf: 'center'
    }
  }, a.sev.toUpperCase()), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-1)',
      flex: 1
    }
  }, a.text)))), /*#__PURE__*/React.createElement(SectionCardV3, {
    title: window.__lang === "en" ? "Settings" : "设置"
  }, /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Decay threshold" : "衰减阈值",
    hint: window.__lang === "en" ? "Triggers an alert" : "超过即触发提醒"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 10,
    max: 90,
    defaultValue: 50,
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(MonoV3, {
    size: 11,
    color: "var(--accent)"
  }, "\u221250%"))), /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Sign-flip sensitivity" : "符号翻转敏感度"
  }, /*#__PURE__*/React.createElement(SegmentedV3, {
    value: "med",
    onChange: () => {},
    options: [{
      value: 'low',
      label: window.__lang === 'en' ? 'Low' : '低'
    }, {
      value: 'med',
      label: window.__lang === 'en' ? 'Medium' : '中'
    }, {
      value: 'high',
      label: window.__lang === 'en' ? 'High' : '高'
    }]
  })), /*#__PURE__*/React.createElement(SettingRow, {
    label: window.__lang === "en" ? "Refresh frequency" : "更新频率"
  }, /*#__PURE__*/React.createElement(SegmentedV3, {
    value: "d",
    onChange: () => {},
    options: [{
      value: 'd',
      label: window.__lang === 'en' ? 'Daily' : '每日'
    }, {
      value: 'w',
      label: window.__lang === 'en' ? 'Weekly' : '每周'
    }, {
      value: 'p',
      label: window.__lang === 'en' ? 'Paused' : '暂停'
    }]
  })))));
}
window.MonitorPage = MonitorPage;
window.MonitorDetail = MonitorDetail;

// ───────────────────────────── Portfolio page ─────────────────────────────

function PortfolioPage({
  onOpenRun,
  onNav
}) {
  const PAPERS = window.PAPERS || [];
  const reproduced = PAPERS.filter(p => p.verdict === 'green').slice(0, 5);
  if (reproduced.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        overflow: 'auto',
        background: 'var(--bg-base)'
      }
    }, /*#__PURE__*/React.createElement(PageHeaderV3, {
      title: window.t('portfolio.title'),
      subtitle: "/portfolio \xB7 v0.3"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 28
      }
    }, /*#__PURE__*/React.createElement(EmptyStateV3, {
      title: "\u8FD8\u6CA1\u6709\u7EC4\u5408",
      body: "\u4ECE\u4F60\u5173\u6CE8\u7684\u56E0\u5B50\u4E2D\u6311\u9009,\u7EC4\u6210\u4E00\u4E2A\u6A21\u62DF\u4EA4\u6613\u7EC4\u5408\u3002",
      cta: "\u53BB\u76D1\u63A7\u9009\u56E0\u5B50 \u2192",
      onCta: () => onNav('monitor')
    })));
  }
  const allocs = reproduced.map((p, i) => ({
    factor: p.factor || p.id,
    paper: p,
    weight: i === 0 ? 30 : 17,
    direction: i % 3 === 0 ? 'short' : 'long',
    value: 25000 + Math.random() * 8000,
    pnl: (Math.random() - 0.3) * 2500,
    pnlPct: (Math.random() - 0.3) * 12,
    rebalanced: ['2 天前', '4 天前', '1 周前', '昨天', '5 天前'][i] || '今天'
  }));

  // equity curve
  const N = 120;
  const eq = Array.from({
    length: N
  }, (_, i) => {
    const t = i / (N - 1);
    return 100000 + t * 12400 + Math.sin(i * 0.4) * 600;
  });
  const W = 1100,
    H = 180;
  const minE = Math.min(...eq),
    maxE = Math.max(...eq);
  const eqPath = eq.map((v, i) => {
    const x = i / (N - 1) * W;
    const y = H - (v - minE) / (maxE - minE) * (H - 16) - 8;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      overflow: 'auto',
      background: 'var(--bg-base)'
    }
  }, /*#__PURE__*/React.createElement(PageHeaderV3, {
    title: /*#__PURE__*/React.createElement("span", null, "\u7B56\u7565\u7EC4\u5408 ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        color: 'var(--text-3)',
        marginLeft: 12
      }
    }, "\xB7 \u4E2D\u56FD A \u80A1\u56E0\u5B50\u7EC4\u5408")),
    subtitle: "/portfolio",
    right: /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("select", {
      style: selectStyleV3()
    }, /*#__PURE__*/React.createElement("option", null, "\u5BFC\u51FA IBKR DAM CSV"), /*#__PURE__*/React.createElement("option", null, "\u5BFC\u51FA Tiger CSV"), /*#__PURE__*/React.createElement("option", null, "\u5BFC\u51FA Futu CSV"), /*#__PURE__*/React.createElement("option", null, "\u5BFC\u51FA\u518D\u5E73\u8861\u59D4\u6258")), /*#__PURE__*/React.createElement("button", {
      style: btnPrimaryV3()
    }, "+ \u6DFB\u52A0\u56E0\u5B50"))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 28px',
      borderBottom: '1px solid var(--border)',
      background: '#eab30811',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14
    }
  }, "\u26A0"), /*#__PURE__*/React.createElement(MonoV3, {
    size: 11,
    color: "#eab308"
  }, window.t('portfolio.disclaimer'))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 28px',
      maxWidth: 1300
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 12,
      marginBottom: 16
    }
  }, [{
    l: '总模拟 PnL',
    v: '+12.4%',
    sub: '自起始',
    c: '#22c55e'
  }, {
    l: 'YTD 回报',
    v: '+8.2%',
    sub: '2026 至今',
    c: '#22c55e'
  }, {
    l: '最大回撤',
    v: '−3.4%',
    sub: '03-15 → 03-22',
    c: '#ef4444'
  }, {
    l: 'Sharpe',
    v: '1.41',
    sub: '年化',
    c: 'var(--text-1)'
  }, {
    l: '换手率',
    v: '38%',
    sub: '月化',
    c: 'var(--text-1)'
  }].map((k, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: '12px 14px',
      border: '1px solid var(--border)',
      borderRadius: 6,
      background: 'var(--surface-1)'
    }
  }, /*#__PURE__*/React.createElement(MonoV3, {
    size: 9,
    color: "var(--text-3)",
    style: {
      letterSpacing: 0.6
    }
  }, k.l.toUpperCase()), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 600,
      color: k.c,
      fontFamily: 'var(--mono)',
      marginTop: 2
    }
  }, k.v), /*#__PURE__*/React.createElement(MonoV3, {
    size: 9,
    color: "var(--text-3)"
  }, k.sub)))), /*#__PURE__*/React.createElement(SectionCardV3, {
    title: "\u6A21\u62DF\u6743\u76CA\u66F2\u7EBF",
    subtitle: "\u5E26\u518D\u5E73\u8861\u6807\u8BB0"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    height: H,
    viewBox: `0 0 ${W} ${H}`,
    preserveAspectRatio: "none",
    style: {
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "eqfill",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "var(--accent)",
    stopOpacity: "0.3"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "var(--accent)",
    stopOpacity: "0"
  }))), /*#__PURE__*/React.createElement("path", {
    d: `${eqPath} L${W},${H} L0,${H} Z`,
    fill: "url(#eqfill)"
  }), /*#__PURE__*/React.createElement("path", {
    d: eqPath,
    fill: "none",
    stroke: "var(--accent)",
    strokeWidth: 1.8
  }), [0.25, 0.5, 0.75].map((p, i) => /*#__PURE__*/React.createElement("line", {
    key: i,
    x1: p * W,
    y1: 0,
    x2: p * W,
    y2: H,
    stroke: "var(--text-3)",
    strokeWidth: 0.5,
    strokeDasharray: "2 3",
    opacity: 0.4
  })))), /*#__PURE__*/React.createElement(SectionCardV3, {
    title: "\u6301\u4ED3\u914D\u7F6E"
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("th", {
    style: thV3()
  }, "\u56E0\u5B50"), /*#__PURE__*/React.createElement("th", {
    style: thV3()
  }, "\u6765\u6E90\u8BBA\u6587"), /*#__PURE__*/React.createElement("th", {
    style: thV3()
  }, "\u6743\u91CD"), /*#__PURE__*/React.createElement("th", {
    style: thV3()
  }, "\u65B9\u5411"), /*#__PURE__*/React.createElement("th", {
    style: thV3()
  }, "\u5F53\u524D\u4EF7\u503C"), /*#__PURE__*/React.createElement("th", {
    style: thV3()
  }, "YTD PnL"), /*#__PURE__*/React.createElement("th", {
    style: thV3()
  }, "\u4E0A\u6B21\u518D\u5E73\u8861"))), /*#__PURE__*/React.createElement("tbody", null, allocs.map(a => /*#__PURE__*/React.createElement("tr", {
    key: a.factor,
    style: {
      borderBottom: '1px solid var(--border-soft)'
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: tdV3()
  }, /*#__PURE__*/React.createElement(MonoV3, {
    size: 11,
    color: "var(--accent)"
  }, a.factor)), /*#__PURE__*/React.createElement("td", {
    style: tdV3()
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpenRun(a.paper.id),
    style: {
      background: 'none',
      border: 'none',
      color: 'var(--text-1)',
      textAlign: 'left',
      cursor: 'pointer',
      padding: 0,
      fontSize: 12
    }
  }, a.paper.title.slice(0, 50), a.paper.title.length > 50 ? '…' : '')), /*#__PURE__*/React.createElement("td", {
    style: tdV3()
  }, /*#__PURE__*/React.createElement(MonoV3, {
    size: 11
  }, a.weight, "%")), /*#__PURE__*/React.createElement("td", {
    style: tdV3()
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '1px 6px',
      borderRadius: 3,
      fontSize: 10,
      background: a.direction === 'long' ? '#22c55e22' : '#ef444422',
      color: a.direction === 'long' ? '#22c55e' : '#ef4444',
      fontFamily: 'var(--mono)'
    }
  }, a.direction === 'long' ? '多' : '空')), /*#__PURE__*/React.createElement("td", {
    style: tdV3()
  }, /*#__PURE__*/React.createElement(MonoV3, {
    size: 11
  }, "$", a.value.toLocaleString('en-US', {
    maximumFractionDigits: 0
  }))), /*#__PURE__*/React.createElement("td", {
    style: tdV3()
  }, /*#__PURE__*/React.createElement(MonoV3, {
    size: 11,
    color: a.pnl > 0 ? '#22c55e' : '#ef4444'
  }, a.pnl > 0 ? '+' : '−', "$", Math.abs(a.pnl).toLocaleString('en-US', {
    maximumFractionDigits: 0
  }), " (", a.pnlPct > 0 ? '+' : '', a.pnlPct.toFixed(1), "%)")), /*#__PURE__*/React.createElement("td", {
    style: tdV3()
  }, /*#__PURE__*/React.createElement(MonoV3, {
    size: 10,
    color: "var(--text-3)"
  }, a.rebalanced)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: btnGhostV3()
  }, "\u7F16\u8F91\u6743\u91CD"), /*#__PURE__*/React.createElement("button", {
    style: btnGhostV3()
  }, "+ \u6DFB\u52A0\u56E0\u5B50"), /*#__PURE__*/React.createElement("button", {
    style: btnGhostV3()
  }, "\u79FB\u9664\u9009\u4E2D"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(SectionCardV3, {
    title: "\u98CE\u9669\u6307\u6807"
  }, /*#__PURE__*/React.createElement(KvRowV3, {
    k: "VaR(95%, 1d)",
    v: "\u2212$1,840"
  }), /*#__PURE__*/React.createElement(KvRowV3, {
    k: "Beta(\u57FA\u51C6 CSI 300)",
    v: "0.42"
  }), /*#__PURE__*/React.createElement(KvRowV3, {
    k: "\u8DDF\u8E2A\u8BEF\u5DEE",
    v: "6.2%"
  }), /*#__PURE__*/React.createElement(KvRowV3, {
    k: "\u96C6\u4E2D\u5EA6(\u524D 5 \u6301\u4ED3)",
    v: "61%"
  })), /*#__PURE__*/React.createElement(SectionCardV3, {
    title: "\u57FA\u51C6\u9009\u62E9"
  }, /*#__PURE__*/React.createElement(SegmentedV3, {
    value: "csi300",
    onChange: () => {},
    options: [{
      value: 'csi300',
      label: 'CSI 300'
    }, {
      value: 'csi500',
      label: 'CSI 500'
    }, {
      value: 'sp500',
      label: 'S&P 500'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(MonoV3, {
    size: 10,
    color: "var(--text-3)"
  }, "\u8D85\u989D\u56DE\u62A5 vs CSI 300"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontFamily: 'var(--mono)',
      color: '#22c55e',
      marginTop: 2
    }
  }, "+5.8%"))))));
}
function thV3() {
  return {
    textAlign: 'left',
    padding: '8px 10px',
    fontFamily: 'var(--mono)',
    fontSize: 9,
    letterSpacing: 0.6,
    color: 'var(--text-3)',
    textTransform: 'uppercase',
    fontWeight: 500
  };
}
function tdV3() {
  return {
    padding: '10px 10px',
    color: 'var(--text-1)',
    verticalAlign: 'middle'
  };
}
function KvRowV3({
  k,
  v
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '6px 0',
      borderBottom: '1px solid var(--border-soft)'
    }
  }, /*#__PURE__*/React.createElement(MonoV3, {
    size: 11,
    color: "var(--text-3)"
  }, k), /*#__PURE__*/React.createElement(MonoV3, {
    size: 11,
    color: "var(--text-1)"
  }, v));
}
window.PortfolioPage = PortfolioPage;

// ───────────────────────────── Public profile ─────────────────────────────

function PublicProfile({
  username,
  onOpenRun,
  onNav
}) {
  const PAPERS = window.PAPERS || [];
  const totalPapers = PAPERS.length;
  const reproduced = PAPERS.filter(p => p.verdict === 'green').length;
  const signFlips = PAPERS.filter(p => p.verdict === 'red').length;
  const avgScore = PAPERS.reduce((s, p) => s + (p.score || 0), 0) / Math.max(1, totalPapers);
  const pinned = PAPERS.filter(p => p.verdict === 'green').slice(0, 3);
  const recent = PAPERS.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 8);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      overflow: 'auto',
      background: 'var(--bg-base)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '36px 28px 24px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface-1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      maxWidth: 1100
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 84,
      height: 84,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, var(--accent), #7e57c2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: 32,
      fontWeight: 600,
      flexShrink: 0
    }
  }, (username || 'M')[0].toUpperCase()), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 26,
      fontWeight: 600,
      color: 'var(--text-1)',
      marginBottom: 4
    }
  }, "@", username || 'me'), /*#__PURE__*/React.createElement(MonoV3, {
    size: 11,
    color: "var(--text-3)"
  }, "/u/", username || 'me', " \xB7 \u52A0\u5165 2025-11 \xB7 \u4E0A\u6D77"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-2)',
      marginTop: 8,
      maxWidth: 700,
      lineHeight: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '1px 5px',
      borderRadius: 3,
      background: 'var(--accent-dim)',
      color: 'var(--accent)',
      fontFamily: 'var(--mono)',
      fontSize: 9,
      marginRight: 6,
      letterSpacing: 0.4
    }
  }, "\uD83E\uDD16 AI"), "\u4E3B\u8981\u590D\u73B0 A \u80A1\u56E0\u5B50\u8BBA\u6587,\u770B\u597D\u8D28\u91CF\u56E0\u5B50,\u5BF9\u52A8\u91CF\u8870\u51CF\u4FDD\u6301\u6000\u7591\u3002\u6700\u8FD1\u504F\u597D idiosyncratic vol \u4E0E PEAD \u8FD9\u7C7B\u957F\u9752\u56E0\u5B50\u3002")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignSelf: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: btnGhostV3()
  }, "\u5173\u6CE8"), /*#__PURE__*/React.createElement("button", {
    style: btnGhostV3()
  }, "\u5206\u4EAB \u2197"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 28,
      marginTop: 24,
      paddingTop: 18,
      borderTop: '1px solid var(--border-soft)',
      maxWidth: 1100,
      fontFamily: 'var(--mono)',
      fontSize: 11,
      color: 'var(--text-2)',
      letterSpacing: 0.4
    }
  }, [{
    k: '论文',
    v: totalPapers
  }, {
    k: '平均得分',
    v: avgScore.toFixed(2)
  }, {
    k: '已复现',
    v: reproduced
  }, {
    k: '符号翻转',
    v: signFlips
  }, {
    k: '社区评分 ★',
    v: '4.2'
  }, {
    k: '关注 / 粉丝',
    v: '12 · 38'
  }].map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      letterSpacing: 0.6,
      color: 'var(--text-3)',
      textTransform: 'uppercase',
      marginBottom: 2
    }
  }, s.k), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: 'var(--text-1)'
    }
  }, s.v))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 28px',
      maxWidth: 1100
    }
  }, /*#__PURE__*/React.createElement(SectionCardV3, {
    title: "\u7CBE\u9009\u8BBA\u6587",
    subtitle: "user-pinned"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 12
    }
  }, pinned.map(p => /*#__PURE__*/React.createElement("button", {
    key: p.id,
    onClick: () => onOpenRun(p.id),
    style: {
      padding: '12px 14px',
      textAlign: 'left',
      border: '1px solid var(--border)',
      borderRadius: 5,
      background: 'var(--surface-0)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement(VerdictBadgeV3, {
    v: p.verdict
  }), /*#__PURE__*/React.createElement(MonoV3, {
    size: 9,
    color: "var(--text-3)"
  }, p.year, " \xB7 ", p.family)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-1)',
      lineHeight: 1.4
    }
  }, p.title), /*#__PURE__*/React.createElement(MonoV3, {
    size: 10,
    color: "var(--text-3)",
    style: {
      marginTop: 4
    }
  }, p.authors))))), /*#__PURE__*/React.createElement(SectionCardV3, {
    title: "\u8FD1\u671F\u6D3B\u52A8"
  }, recent.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    onClick: () => onOpenRun(p.id),
    style: {
      padding: '10px 0',
      borderBottom: '1px solid var(--border-soft)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(MonoV3, {
    size: 10,
    color: "var(--text-3)",
    style: {
      width: 90,
      flexShrink: 0
    }
  }, p.date || `${p.year}`), /*#__PURE__*/React.createElement(VerdictBadgeV3, {
    v: p.verdict
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-1)',
      flex: 1,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, p.title), /*#__PURE__*/React.createElement(MonoV3, {
    size: 10,
    color: "var(--text-3)"
  }, p.score != null ? `score ${p.score.toFixed(2)}` : ''))))));
}
window.PublicProfile = PublicProfile;

// ───────────────────────────── 404 / error pages ─────────────────────────────

function NotFoundPage({
  what,
  onNav
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 460,
      padding: '32px 28px',
      textAlign: 'center',
      border: '1px solid var(--border)',
      borderRadius: 8,
      background: 'var(--surface-1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      height: 56,
      borderRadius: '50%',
      margin: '0 auto 16px',
      background: 'var(--surface-2)',
      color: 'var(--text-3)',
      fontSize: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, "404"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: 'var(--text-1)',
      marginBottom: 8
    }
  }, "\u6CA1\u627E\u5230 ", what || '该页面'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-3)',
      marginBottom: 18,
      lineHeight: 1.5
    }
  }, "\u5B83\u53EF\u80FD\u5DF2\u88AB\u5220\u9664,\u6216\u8FD9\u4E2A\u94FE\u63A5\u6765\u81EA\u5176\u4ED6\u7528\u6237\u7684\u79C1\u6709\u7A7A\u95F4\u3002"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav('timeline'),
    style: btnPrimaryV3()
  }, "\u2190 \u65F6\u95F4\u7EBF"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onNav('search', {
      q: what || ''
    }),
    style: btnGhostV3()
  }, "\u641C\u7D22"))));
}
window.NotFoundPage = NotFoundPage;

// ───────────────────────────── Empty state ─────────────────────────────

function EmptyStateV3({
  title,
  body,
  cta,
  onCta
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '40px 24px',
      textAlign: 'center',
      border: '1px dashed var(--border)',
      borderRadius: 6,
      background: 'var(--surface-1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      color: 'var(--text-1)',
      marginBottom: 8
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-3)',
      marginBottom: 18,
      lineHeight: 1.5,
      maxWidth: 480,
      margin: '0 auto 18px'
    }
  }, body), cta && /*#__PURE__*/React.createElement("button", {
    onClick: onCta,
    style: btnPrimaryV3()
  }, cta));
}
window.EmptyStateV3 = EmptyStateV3;

// ───────────────────────────── global Cmd+K hotkey ─────────────────────────────

window.useCmdK = function (open, onOpen) {
  useEffectV3(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpen();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
};