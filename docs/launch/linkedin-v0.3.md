# LinkedIn launch post · replicalpha v0.3 (with screenshots)

> Paste these into LinkedIn. Drop in 4-6 of the screenshots from `docs/images/screenshots/` as a carousel. Pin the post.

---

## English version

**Title hook (first line, the only thing visible before "see more"):**

> I built an open-source agent that reads a quant research paper, reproduces the factor, and tells you whether it still works on new data. Most don't.

**Body:**

For the past month I've been building **replicalpha** — a tool that takes a quant research paper PDF and runs it through a 6-stage pipeline:

📄 PDF → ResearchCard (LLM extraction)
🐍 Python factor code (DSL + LLM fallback, qtype-linted for look-ahead)
📊 pandas quintile IC backtest
🧪 Red Team Validator (5 fixed checks: overfitting, small-cap exposure, data leakage, sample concentration, factor redundancy)
🎯 Reproducibility score + plain-English verdict

The killer feature: **every paper you've ever read becomes a node on a personal timeline**, color-coded by whether it still works.

Headline finding from this week, reproducing **Zeng & Liu (2016) "Momentum and Reversal Effects on the Chinese Stock Market"** on CSI 300 top-30 with Tushare daily data, 2022-2024:

→ Paper claimed: 6-month reversal IC = **+0.013** (positive)
→ Our reproduction: IC = **−0.022** (sign-flipped to momentum)
→ Reproducibility score: **0.00**

The reversal effect didn't just decay. It flipped sign. This is why we need cheap, automated reproduction infrastructure.

---

🔗 Repo: https://github.com/VernonOY/replicalpha (MIT)
🔗 Bilingual README (EN/中文)
🔗 Real demo with charts in the README

Built on top of `paper2alpha` (PDF → ResearchCard) and `qtype` (look-ahead lint), both also open. Part of my **alpha-kit** stack — 7 small composable tools shipped over the past 4 weeks.

Curious to hear how others approach factor reproducibility. What papers do you wish someone would re-run on 2024 data?

#quant #quantitativefinance #factorinvesting #factorresearch #opensource #python #fintech #algotrading #researchreproduction #reproducibility #alphakit

---

## 中文版

**Hook(第一句):**

> 写了一个开源 agent:把量化研报丢进去,5 分钟告诉你这篇论文的因子今天还能不能用。大部分都不能用了。

**正文:**

过去一个月在做一个叫 **replicalpha** 的工具,流程是:

📄 论文 PDF → ResearchCard(LLM 抽取)
🐍 自动生成 Python 因子代码(DSL + LLM 补充 + qtype 静态检查)
📊 pandas 分位数 IC 回测
🧪 红队审查(5 项固定检查:过拟合、小市值暴露、未来函数泄露、样本集中度、因子冗余)
🎯 可复现性评分 + 人话判决

杀手 feature:**你读过的每一篇研报都成为一条时间线上的节点**,按"还成不成立"染色。

本周复现的头号发现 —— **Zeng & Liu (2016)《中国股市动量效应与反转效应研究》** 在 CSI 300 前 30 + Tushare 日级数据 + 2022-2024 的窗口下:

→ 论文声称:6 月反转 IC = **+0.013**(正向反转)
→ 我们复现:IC = **−0.022**(符号翻转 → 变成动量)
→ 可复现性得分:**0.00**

反转效应不仅是"衰减"了,是符号反转了。这正是我们需要廉价、自动化的复现基础设施的原因 —— 学术研报里有大量"看起来好但今天根本不成立"的因子,过去要靠手工才能验证,现在 5 分钟出结论。

---

🔗 仓库:https://github.com/VernonOY/replicalpha(MIT)
🔗 双语 README(EN/中文)
🔗 完整的 charts demo 在 README 里

底下用了 `paper2alpha`(PDF → ResearchCard)和 `qtype`(前视偏差静态检查),都是我自己开源的,属于 **alpha-kit** —— 4 周内做完的 7 个小工具组合栈。

想听听各位对因子复现这事的看法。**你最想看哪篇老研报在 2024 年数据上还能不能跑出来?**

#量化投资 #量化研究 #因子投资 #开源 #Python #量化复现 #alphakit #fintech #quant

---

## @-mention 候选(用之前先确认)

LinkedIn 上的活跃量化大牛(请你自己去 LinkedIn 搜确认 handle 后再 tag,我**没法验证 handle**,瞎 @ 错人会很尴尬):

**英文圈(active on LinkedIn):**
- **Marcos López de Prado** — 量化 ML 圈最高调的人之一,经常发 LinkedIn 长文,大概率会回复
- **Wes Gray** — Alpha Architect,LinkedIn 高频发长文,做 factor research
- **Igor Halperin** — NYU + Fidelity,量化 ML
- **Antoine Falck** — 量化 / 因子方向研究员,经常发研报点评
- **Robert Carver** — `pysystemtrade` 作者,英国对冲基金,博主
- **Cliff Asness** — AQR 创始人(账号活跃度一般,但 follower 巨多)
- **Igor Tulchinsky** — WorldQuant 创始人
- **Bryan Kelly** — Yale 教授 + AQR 研究主管(他可能不太用 LinkedIn,但值得试)

**中文圈(LinkedIn 活跃 + 量化背景):**
- 国内量化私募创始人 / PM(你比我熟,自己挑认识的 / 想 build 关系的)
- 一些海外华人 quant 从 GS / Citadel / Two Sigma 离职做开源工具的
- 阿里 / 字节量化研究方向的 ML 工程师

**学术圈(可能不在 LinkedIn 但值得在论文复现内容里 @):**
- **Andrew Lo (MIT Sloan)** — Adaptive Markets,可能有 LinkedIn
- **Stefan Nagel (Chicago Booth)** — 因子衰减权威研究者
- **Kewei Hou (Ohio State)** — China A-share factor model 作者
- **Larry Glosten / Eugene Fama** — 几乎肯定不上 LinkedIn,跳过

**避免 @ 的(不会回复的浪费):**
- 已退休的学术大佬(Fama, French)
- 死了的 finance 史上人物(明显道理)
- 与 quant 不直接相关的 generic finance influencer(不是目标受众)

---

## 发布策略

1. **挑 4-6 张图做 carousel**(LinkedIn carousel 比单图触达高 50%):
   - 01-timeline.png(主角)
   - 02-verdict.png(反差最强 — 教科书级 sign-flip)
   - 03-factors.png(跨论文洞察)
   - 04-portfolio.png(让看的人能想象产品价值)
   - 06-library.png(showing 26 papers已经在系统里的密度,有 social proof 错觉)
   - 08-zh-mode.png(中文版受众触达)

2. **发布时间**:北京/纽约 quant 都要看到 → 周二 / 周三 美东时间 09:00-11:00 (= 北京时间 21:00-23:00),双高峰

3. **第一条评论**置顶链接(LinkedIn 算法对外链不友好,正文里只放一个,详细链接放第一条评论)

4. **追蹤指标**:24h impressions、点击 GitHub 的 referral、issue/star 涨幅

5. **跟进**:发布 48h 后看哪些大牛 like / 评论了,逐一回复 + 私信深聊
