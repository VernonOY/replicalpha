# LinkedIn 发布文案 · replicalpha v0.3

> 复制 → 粘贴 → 加 carousel → 发。两个版本(EN / 中文),挑一个发,或两条都发。

---

## ⓐ English version

**Hook line (the only thing visible before "see more" — make it count):**

> I built an open-source Agent that reads a quant research paper, reproduces the factor on new data, and tells you whether it still works. Most don't.

**Body:**

For the last month I've been building **replicalpha** — drop a research PDF in, get back: structured paper metadata, executable Python factor code (qtype-linted, no look-ahead bias), a pandas long-short backtest, a Red Team report flagging overfitting / small-cap / data-leakage / sample concentration / factor redundancy, and a one-line reproducibility verdict.

The killer view: every paper you've ever read becomes a node on a personal timeline, color-coded by whether the factor still reproduces today.

📍 **Headline finding from this week:**
Reproducing Zeng & Liu (2016) "Momentum and Reversal Effects on the Chinese Stock Market" on CSI 300 top-30 with Tushare daily data, 2022–2024 window:

→ Paper claimed: 6-month reversal IC = **+0.013** (positive reversal effect)
→ Reproduced: IC = **−0.022** (sign-flipped)
→ Reproducibility score: **0.00**

The reversal effect didn't just decay. It sign-flipped. This is exactly why we need cheap, automated reproduction infrastructure.

💡 **Standing on the shoulders of giants:**
- Campbell Harvey, Yan Liu & Heqing Zhu — *"…and the Cross-Section of Expected Returns"* mapped the factor zoo and started the multiple-testing reckoning
- Marcos López de Prado — *Advances in Financial ML* gave the playbook for taking backtest overfitting seriously
- David McLean & Jeffrey Pontiff — *"Does Academic Research Destroy Stock Return Predictability?"* showed post-publication decay is real
- Cliff Asness, Andrea Frazzini & Lasse Pedersen — *Quality Minus Junk* (still reproduces beautifully in our backtest, which is reassuring)
- Wes Gray (Alpha Architect) — practitioner ethos that quant should be open

Built on top of two of my smaller open-source tools — `paper2alpha` (PDF → ResearchCard) and `qtype` (look-ahead static lint) — both also MIT, both part of an `alpha-kit` stack I shipped over the past 4 weeks.

**The whole stack is open. The README is bilingual. The screenshots are in the repo.**

🔗 https://github.com/VernonOY/replicalpha
🔗 Twitter / X thread coming this week

What papers do you wish someone would re-run on 2024 data? Drop them in the comments — I'll line them up.

---

**Tag candidates (search the exact handle before tagging — I can't verify):**
@Marcos López de Prado · @Wes Gray · @Robert Carver · @Igor Halperin · @Antoine Falck · @Cliff Asness · @Bryan Kelly · @Igor Tulchinsky

**Hashtags:**
#quant #factorinvesting #factorresearch #reproducibility #replicability #researchreproduction #opensource #python #pandas #fintech #algotrading #quantitativefinance #alphaarchitect #factorzoo

---

## ⓑ 中文版

**Hook(第一句):**

> 写了一个开源 Agent:把一份量化研报丢进去,5 分钟告诉你这篇论文的因子今天还能不能用。大部分都不能用了。

**正文:**

过去一个月在做一个叫 **replicalpha** 的东西。一句话流程:论文 PDF → 结构化元数据 → 自动生成 Python 因子代码(过 qtype 静态检查,无前视偏差)→ pandas 分位数 IC 多空回测 → 红队审查(5 项检查:过拟合提示 / 小市值暴露 / 未来函数泄漏 / 样本集中度 / 因子冗余)→ 可复现性评分 + 一句人话判决。

杀手 feature:你读过的每一篇研报都成为时间线上的一个节点,按"还能不能用"上色。

📍 **本周头号发现:**
在 CSI 300 前 30 + Tushare 日级数据 + 2022–2024 的窗口下,复现 Zeng & Liu (2016)《中国股市动量效应与反转效应研究》:

→ 论文声称:6 月反转 IC = **+0.013**(正向反转效应)
→ 我们复现:IC = **−0.022**(符号翻转)
→ 可复现性评分:**0.00**

反转不仅是衰减了 —— 是符号反转了。这正是我们需要廉价、自动化的复现基础设施的理由 ——
学术研报里有一大批"看起来漂亮但今天根本不成立"的因子,过去靠手工才验证得了,现在 5 分钟一个判决。

💡 **站在以下巨人的肩膀上:**
- **Campbell Harvey, Yan Liu, Heqing Zhu** — 《...and the Cross-Section of Expected Returns》开启了"因子动物园"和多重检验的反思
- **Marcos López de Prado** — 《Advances in Financial Machine Learning》定义了"严肃对待回测过拟合"这件事的方法论
- **David McLean, Jeffrey Pontiff** — 《Does Academic Research Destroy Stock Return Predictability?》量化证明发表后衰减是真的
- **Cliff Asness, Andrea Frazzini, Lasse Pedersen** — 《Quality Minus Junk》(我们这里依然完美复现,谢天谢地)
- **Wes Gray (Alpha Architect)** — practitioner 视角的"量化应该开源"

底下用了我自己另外两个开源小工具 —— `paper2alpha`(PDF → ResearchCard)和 `qtype`(前视偏差静态 lint),都是 MIT,都是 4 周内陆续做的 `alpha-kit` 工具栈的一部分。

**全栈开源 · 双语 README · 截图全在仓库里。**

🔗 https://github.com/VernonOY/replicalpha
🔗 Twitter 线程下周发

你最想看哪一篇老研报在 2024 年数据上还跑不跑得出来?评论里告诉我,我排队跑。

---

**Tag 候选(发前请自行在 LinkedIn 搜确认 handle — 我没法验证):**
@Marcos López de Prado · @Wes Gray · @Robert Carver · @Igor Halperin · @Antoine Falck · @Cliff Asness

**国内圈如果想 @:**
本来想列一些国内活跃在 LinkedIn 的 quant 圈大佬,但 LinkedIn 中国用户基数小、handle 容易错。**建议直接 @ 你认识的、想 build 关系的人**(比私募 PM、quant researcher、券商研究所方向同事)。

**Hashtags(中英文混发,触达广):**
#量化投资 #量化研究 #因子投资 #量化复现 #开源 #Python #fintech #alphakit
#quant #factorinvesting #reproducibility #researchreproduction #opensource

---

## 发布建议

1. **Carousel(轮播图)** — LinkedIn 上 carousel 比单图触达高 ~50%。建议放 6 张:
   1. `07-hero.png`(主视觉)
   2. `08-verdict.png`(反差最强 — Vol-of-Vol Reproduced 绿圆环 / 或换 sign-flip 红色那篇)
   3. `01-timeline.png`(timeline 全景)
   4. `06-portfolio.png`(equity curve · 显示工具深度)
   5. `05-monitor.png`(实时 IC 衰减监控 · 显示工具持续价值)
   6. `03-ide.png`(IDE workspace · 显示能动手改)

2. **图片直链(LinkedIn 不允许 hot-link,所以 carousel 上传文件即可)**:
   ```
   https://github.com/VernonOY/replicalpha/raw/main/docs/images/screenshots/01-timeline.png
   https://github.com/VernonOY/replicalpha/raw/main/docs/images/screenshots/03-ide.png
   ...
   ```
   (这个链接给评论 / 跨平台分享用)

3. **发布时间** — 美东周二/三 09:00–11:00(= 北京 21:00–23:00),英中两个时区高峰
4. **第一条评论** 置顶完整链接(LinkedIn 算法对正文外链不友好,把"补充链接 / 仓库 README / 中文版"放第一评论)
5. **24h 内** 主动回复每一条评论 + 给点赞过的 PM 私信深聊
