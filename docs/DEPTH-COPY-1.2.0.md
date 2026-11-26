# 1.2.0 输出深度文案与验收研究

> 只读研究稿 · 2026-11-26 · 范围：三档输出深度的精确文案与规则、1.2.0 验收/测试矩阵、冲突与风险。
>
> 基线：工作区 HEAD `5480cf9`（wip: start 1.2.0 persona and settings groundwork），`package.json` 版本 1.1.10，`main` ahead 13 / behind 6。
>
> 证据等级：**静态核对**（源码 / 测试 / 脚本 / 配置 / 静态稿）。**未运行** `npm test`、`desktop-check`、对比度/色相门禁：`npm test` 的 `pretest` 会重建 `lib/`，本任务不允许改代码。文中数字凡是历史实测会注明来源，否则是源码静态计数。

## 0. 结论先行

1. **三档深度的宿主骨架已经在代码里**：`CONTENT_DEPTHS`、`contentDepthRules()`、`Config.contentDepth`、`compilePersonaMode(raw, depth)`，以及可选的 `explanation` 讲解卡（`src/index.js:150-177, 243-250, 261`；渲染 `src/client.js:2043-2057`）。1.2.0 不是从零写三档，而是补齐 UI 文案、让深度脱离人格、把三档写进统一内容合同。
2. **当前最大阻塞不是文案，而是 `personaEnabled` 一个开关同时管三件事**：内容合同、语气、身份头。人格一关，宿主侧直接不注入合同（`src/index.js:662-663`），回到 1.1.10 的引用块标题卡（`BUILTIN_STYLE_TEXT`）。不先拆这个开关，"关闭人格仍多卡"在端到端上不成立。
3. **关闭人格后客户端已有"内容-only"渲染通道**（`src/client.js:2780-2796`），但它只在模型仍然发 persona 信封时生效；模型不会在没人要求时主动发信封。这是兼容旧习惯的兜底，不能当作 1.2.0 的验收证据。
4. **两套"多卡"不是一回事**：1.1.10 人格关闭时的"多卡"是引用块标题卡 + 表格（markdown 风格）；1.2.0 要的是固定 `normal` / `table` / `short` 信封的结论 / 建议 / 风险多卡。验收必须指名是哪一套，否则会出现"看起来有多卡，其实没走合同"的假 PASS。
5. **不变项必须先写成硬清单**：信封唯一、卡片集合与顺序、三层编号（A/B/C、a/b/c、1/2/3）、事实、文字风格、代码/diff/error 例外。深度只允许改讲解卡与展开量，其余任何变化都算回归。
6. **矩阵 10 项里，7 项的主判定可以自动化**（设置页结构、总开关、拆分/多卡、旧消息、深度、侧边栏注册、保存/校验）；**实机验证另列 6 项**（见 2.5），其中 HSV 拾色器与侧边栏点行没有宿主级自动化。
7. **本文件会破坏 pack 基线**：`package.json` 的 `files` 含 `docs`，只排除 `docs/PLAN-*.md`；本文件与将来新增的 `test/palette.test.mjs` 都会被收进包，59 文件 / ±16 KB 的固定断言会红。发布前必须二选一：加 `!docs/DEPTH-COPY-*.md` 排除，或更新 `PINNED_*` 与 ACCEPTANCE 基线。
8. **v4 静态稿与计划有 4 处不一致，开工前要拍板**：缺"行为"区、3 色 vs 计划里的 4 基色、预览没有讲解卡、"普通" vs 代码里的"通用"。

---

## 1. 三档输出深度：精确文案与规则

### 1.1 现状（代码事实）

| 层 | 已有什么 | 位置 | 缺口 |
| --- | --- | --- | --- |
| 常量与规范化 | `CONTENT_DEPTHS = ['beginner','general','expert']`；非法/缺省回落 `general` | `src/index.js:150-152` | 无 |
| 提示词规则 | `contentDepthRules()` 三档文案 | `src/index.js:155-177` | 第三档写「通用」，UI/计划写「普通」；入门开头"读者没有技术背景"过于绝对 |
| 合同拼接 | `compilePersonaMode(raw, depth)` = tone wrapper + 合同 + 深度 + anchor | `src/index.js:243-250` | 只在 persona section 生效；人格关就完全没有深度 |
| 配置 | `Config.contentDepth` 默认 `general` | `src/index.js:261` | 旧 profile 无该字段时靠 schema 默认（安全） |
| 设置页 | `segmented` 入门/通用/专业 + 一行 hint | `src/client.js:75-83`（深度在第 77 行） | 无"参考 eli5"说明、无每档解释、标签不是"普通" |
| 讲解卡 | `explanation: {analogy, example}`，至少一项，渲染成「讲解」卡 | 合同 `src/index.js:134`；渲染 `src/client.js:2043-2057` | 没有按档位规定"必写 / 可选 / 默认省略"；没有三档预览样例 |
| 测试 | 枚举、回落、文案、`compilePersonaMode` 带深度 | `test/structured.test.mjs:169-179`；`test/persona-ui.test.mjs:545-594` | 无"三档结构指纹一致"断言；无"人格关时深度仍生效"断言 |

补充事实：合同里写了 `conclusion.points` 每条建议 ≤32 字、`explanation` 每段 1–2 句 ≤120 字，但**插件不做字数校验，超了照常渲染**（`src/index.js:133`）。所以这些数字是提示词级软约束，验收不应把它们当渲染门禁。

### 1.2 一条总规则：深度只改「解释层」

把一条回复分成三层，1.2.0 的所有改动都必须落在这张表里：

| 层 | 谁控制 | 内容 | 深度能不能改 |
| --- | --- | --- | --- |
| 合同层 | 插件（master 开即注入） | 信封形状、`kind`、字段集合、卡片集合与顺序、标签、编号、表格/风险上限 | **不能** |
| 语气层 | 人格（tone） | 称呼、自称、前缀/后缀、口头禅、表情、`skipIn` | **不能**；深度不得写"卖萌/高冷" |
| 解释层 | 输出深度 | 讲解卡有无、类比/例子、术语解释、展开量、边界与取舍的讲法 | **只能改这一层** |

由此得到一条可机检的验收规则：

> 同一份事实内容，在三档下的**结构指纹**必须相同：卡片类型序列、结论要点条数、表格行列数、建议条数、风险有无。唯一允许变化的指纹位是"讲解卡 0/1 张"（以及它的两段文字）。

反过来说：如果切换深度后结论卡从 1 张变 2 张、编号从 A/B/C 变成 1/2/3、表格多了一行、风险从一句话变一段，都是回归，不是"深度"。

### 1.3 精确文案 A：界面（建议定稿）

以下逐字用于设置页「输出深度」区。方位按 v4 静态稿（外观 → 人格 → 输出深度 → 预览），但文案建议微调，理由见表后。

**区块标题**：`输出深度`

**区块说明**：

> 只改变解释量，不改卡片结构、编号与事实；分层参考 eli5 skill。

**三个选项**（标题 + 一行说明）：

| 值 | 标题 | 说明（逐字） |
| --- | --- | --- |
| `beginner` | 入门 | 多类比、先讲懂；术语首次出现用一句人话解释。 |
| `general` | 普通 | 默认；结论直接说，需要时才解释。 |
| `expert` | 专业 | 少类比，多机制、边界与取舍；术语直接用。 |

**底部说明（逐字）**：

> 三档始终有一档，不提供关闭；默认普通。受众分层参考 eli5 skill（Explain Like I'm 5）：入门按 5–15 岁 / 非技术读者校准，普通为默认，专业面向工程师 / 专家。入门不等于幼稚化：不卖萌、不省略边界。

**状态行**：`深度 普通`（与 v4 一致）。

与 v4 稿相比的改动及理由：

| v4 原句 | 改动 | 理由 |
| --- | --- | --- |
| 入门："多类比、步骤和术语解释；先讲懂。" | 去掉"步骤" | "步骤"是结构，不是解释量；保留会让人以为切深度会改结构/编号。 |
| 专业："少类比，多假设、边界和取舍；术语直接用。" | 改为"多机制、边界与取舍" | 与宿主规则 `contentDepthRules('expert')` 的"机制、边界、取舍和数字"对齐；"假设"属于边界的一部分。 |
| 底部只写"参考 eli5 skill" | 补全名 + 受众映射 + "不幼稚化" | 用户不知道 skill 是什么；且 5 岁措辞与工程事实冲突，必须提前写明。 |

字段标签仍用 `输出深度 / Depth`，与其它字段的中英并列风格一致。

### 1.4 精确文案 B：提示词（建议定稿）

#### 1.4.1 现状原文（代码里现在就是这些字）

~~~text
【输出深度：入门】
- 读者没有技术背景：先用生活类比或日常场景建立直觉，再给结论。
- 术语、缩写、系统名首次出现时必须用一句人话解释；不假设读者懂命令行、代码或模型机制。
- 讲解卡优先写 analogy，必要时补 example；比喻只用来建立直觉，事实和边界仍要写清楚。
~~~

~~~text
【输出深度：通用】
- 读者可能懂也可能不懂：结论直接说，术语首次出现用半句解释。
- 需要降低理解成本时才用 analogy / example；不堆比喻、不复述结论。
~~~

~~~text
【输出深度：专业】
- 读者有技术背景、了解大模型与工程实现：直接给机制、边界、取舍和数字。
- 不解释基础术语，不为了通俗牺牲精度；讲解卡可省略，需要时 example 优先于 analogy。
~~~

#### 1.4.2 建议定稿（1.2.0 用这三段，逐字）

~~~text
【输出深度：入门】
- 读者按「初中生 / 非技术同事」校准：能读懂日常说明，但不熟悉命令行、代码、模型机制与工程术语。
- 先用生活类比或日常场景建立直觉，再给结论；类比只负责建立直觉，不能替代事实。
- 术语、缩写、系统名首次出现时，用一句人话解释；一句话只讲一个概念。
- 讲解卡写 analogy（必选一份），必要时补 example；每段 1–2 句、≤120 字。
- 边界与取舍仍要写清（什么情况下不适用），不能为了通俗省略或改变事实。
- 不幼稚化、不卖萌、不堆比喻；语气由人格控制，深度不改变风格。
~~~

~~~text
【输出深度：普通】
- 读者可能懂也可能不懂：结论直接说，术语首次出现用半句解释。
- 需要降低理解成本时才用 analogy / example；不堆比喻、不复述结论。
- 默认不写讲解卡；写了就要有信息增量（类比或具体例子），不写空话。
- 边界、取舍、数字按事实给，不额外展开也不省略。
~~~

~~~text
【输出深度：专业】
- 读者有技术背景、了解大模型与工程实现：直接给机制、边界、取舍和数字。
- 不解释基础术语，不为通俗牺牲精度；不写「简单来说」「就像」式降级。
- 讲解卡默认省略；需要落地细节时写 example（可验证的命令 / 配置 / 数据），analogy 仅在能显著省字时使用。
- 明确假设、失败模式、性能 / 成本边界与替代方案；不确定的标注为推断。
~~~

**三档共同约束**（只写一次，拼在三段之后，不要每档重复）：

~~~text
【三档共同约束】
- 深度只改解释与展开；卡片结构、标签、编号（A/B/C、a/b/c、1/2/3）、事实与风险等级不变。
- 不为通俗加卡、加内容或改变结论；不确定的事实标注推断；代码 / diff / 报错不写讲解卡。
~~~

#### 1.4.3 改动理由

| 现行 | 问题 | 建议 |
| --- | --- | --- |
| "读者没有技术背景" | 绝对化；普通/专业档无法共享同一套人格；也容易写成幼儿腔 | "按初中生 / 非技术同事校准" |
| "不假设读者懂命令行、代码或模型机制" | 表述准确，保留 | 保留 |
| "讲解卡优先写 analogy" | 没有说 example 是否必写、总长度多少 | 补"必要时补 example；每段 1–2 句、≤120 字" |
| "通用" | 与 UI / 计划 / v4 的"普通"冲突 | 统一为"普通"（常量仍 `general`，只改展示文案） |
| 专业段没有"假设 / 失败模式" | 专业档与普通档的差异主要靠"不解释术语"，不够 | 补假设、失败模式、性能/成本边界、替代方案 |
| 没有共同约束 | 三档各自为政，模型容易在入门档加卡、在专业档删边界 | 加一段共同约束 |

#### 1.4.4 拼接顺序（不能乱）

现状：`compilePersonaMode` 的拼接顺序是 `tone wrapper → PERSONA_MODE_RULES → contentDepthRules → TONE_ANCHOR`（`src/index.js:248`）。

1.2.0 拆出内容-only 合同后，建议顺序保持同一语义：

`内容合同（形状/字段/编号） → 输出深度（解释层） → 三档共同约束 → 语气 wrapper（仅人格开） → anchor`

深度必须排在合同之后：先定形状，再定解释，最后才是语气。否则模型会把"深度"读成"可以改结构"。

### 1.5 三档差异矩阵

| 维度 | 入门 | 普通（默认） | 专业 |
| --- | --- | --- | --- |
| 解释量 | 讲解卡 1 张：analogy 必选（写不出就不写卡），example 可选；总 ≤2 段 | 讲解卡 0–1 张；只在术语/机制会阻碍理解时写；≤1 段 | 讲解卡默认 0 张；需要落地细节时只写 example，≤1 段 |
| 类比 | 优先，生活场景；只建立直觉，不替代事实 | 可选；不堆，不超过 1 个 | 默认不用；只在能显著省字时用工程同构类比（如"像 hash map，但……"） |
| 术语 | 首次出现一句人话解释；不假设懂命令行/代码/模型 | 首次出现半句解释 | 不解释基础术语；直接给机制、参数、版本、数字 |
| 例子 | 具体、可感知；"比如你寄快递……" | 需要时才给；一句 | 优先可验证的命令 / 配置 / 数据，不用生活例子 |
| 边界与取舍 | 必须写，用一句日常话说明"什么时候不适用"；不能只讲好处 | 正常写；必要时一句 | 必须给假设、失败模式、性能/成本、替代方案；不确定标推断 |
| 解释长度 | 每段 1–2 句、≤120 字；不新增卡片 | 同 | 同；宁缺毋滥 |
| 写不出类比时 | 删除讲解卡，保留结论/边界，不编事实 | 不写讲解卡 | 不写 analogy，改写 example |
| 读者画像 | 5–15 岁 / 非技术读者；措辞基线取 10–15 岁，5 岁只作"零背景假设" | 20–30 岁普通读者，可能懂也可能不懂 | 工程师 / 专家；懂大模型与工程实现 |
| 语气 | 不幼稚化、不卖萌；风格仍由人格控制 | 中性直接 | 精确、不客套 |

### 1.6 必须不变清单（12 条）

这 12 条是 1.2.0 的回归底线。任何一条被深度切换改变，都按 bug 处理。

| # | 不变项 | 具体要求 | 验收方式 |
| --- | --- | --- | --- |
| 1 | 信封形状 | 整个回复只有一个 persona fenced block，块内单个 JSON；块外无正文、标题、markdown 卡片、前后缀 | 解析断言：块数 = 1，块外文本为空 |
| 2 | `kind` 与字段 | `version:1`；`kind` 仅 normal / short / table；不多字段；`body` 仅历史兼容 | 校验器断言非法字段被拒 |
| 3 | 卡片集合与顺序 | normal/table：结论 →（讲解）→（表格）→ 建议 → 风险；short：仅短答；不补空卡、不合并卡 | DOM 卡片序列断言 |
| 4 | 标签 | 结论 / 建议 / 风险 / 短答 / 讲解 由插件渲染，模型不写标签 | 文本断言：标签节点由插件生成 |
| 5 | 三层编号 | 结论要点 A/B/C（≤4）；表行 a/b/c（表头不编号）；建议 1/2/3；风险不编号；组合引用 Aa1；不混用、不自造 | 渲染后编号数组断言 |
| 6 | 讲解卡不参与编号 | 增删讲解卡不得让 A/B/C、a/b/c、1/2/3 位移 | 同内容有/无 explanation 两次渲染，编号数组相等 |
| 7 | 事实 | 数字、路径、版本、命令、结论、风险等级不因档位变化；不为通俗编造或删事实 | 三档文本事实抽取比对 |
| 8 | 文字风格 | 无过程叙事（我先…/已经…/接下来…）、无收尾总结、不复述、不追加"还需要我…吗"、不奉承 | 文本正则 + 人工 |
| 9 | 代码 / diff / 报错例外 | 不交 persona 内容块，按原格式输出；不挂身份头、不出讲解卡 | 代码块断言 |
| 10 | 表格约束 | head 2–6 列、rows 1–20 行、行列一致；首列标签 ≤10 汉字；尾列状态/备注 ≤12 汉字；解释放中间列 | 合同字符串 + DOM 断言 |
| 11 | 长度软约束 | 结论要点 1–4 条、每条 ≤32 字；讲解每段 1–2 句 ≤120 字；建议 1–5 条；风险单句；插件不校验字数，超了不降级 | 只做人工/抽样，不做硬门禁 |
| 12 | 复制行为 | 整条复制不含身份头、前后缀、复制按钮；表格 TSV 带行索引 | 复制文本断言 |

### 1.7 受众校准：eli5 怎么用、不能用成什么

eli5 skill 的受众表把读者分成 Age 5 / 10 / 15 / 20–30 / 40+，以及 5th grade / middle school / senior high / college / graduate，默认 **Age 5**（`~/.agents/skills/eli5/SKILL.md:50`）。本项目的映射必须写死，不能交给模型自由发挥：

| 本项目档位 | eli5 对应 | 用法 |
| --- | --- | --- |
| 入门 | Age 10–15 + 非技术成年读者 | 用"初中生能读懂"作措辞基线；Age 5 只用于"不假设任何背景"的极限校准，不模仿玩具/糖果式幼儿腔 |
| 普通 | Age 20–30 日常读者 | 结论直接说；半句术语解释；按需举例 |
| 专业 | Engineer / Graduate school | 机制、边界、取舍、数字；不解释基础术语 |

三条硬规则：

1. **入门 ≠ 幼稚化**。eli5 自己写"Never talk down to anyone"（`SKILL.md:113`）。把工程结论写成 5 岁童话，会同时违反准确性和这条原则。5 岁端只取"零背景假设"，不取措辞。
2. **类比不能进结论/风险**。类比只放在讲解卡的 `analogy` 字段；结论的 lead/points、风险的 risk 必须是事实陈述。入门档也不能把"就像寄快递"写进结论。
3. **类比失真时删掉，不编事实**。讲解卡是可选项（入门档也只是优先，不是强制）；写不出准确类比时，保留结论与边界，宁可不写讲解卡。

可执行的读者画像（QA 盲评用）：

- P1：12 岁，会玩游戏，不会编程；能读懂日常中文说明。
- P2：非技术产品经理，懂业务，不懂实现；会看表格，不读代码。
- P3：后端工程师，熟悉 DSH / Node；不想看基础术语解释。

判据：P1 能复述结论与"什么时候不适用"；P2 能只看结论卡和表格做决定；P3 不觉得被科普、能直接拿到机制与边界。

### 1.8 同一内容三档样例

以项目自己的硬约束"`package.json` 的 `files` 必须包含 `cordis.patch.yml`"为例，只改解释层：

**入门**

~~~text
结论：漏写这一行，安装会失败，整包回滚。
- 为什么：安装时要按清单找装配文件；清单没写，就找不到。
讲解（类比）：像寄一箱设备，装箱单漏了电源线——仓库验收时整箱退回，不是只补一根线。
建议：把 cordis.patch.yml 写进 files，再打包。
风险：本地开发不受影响，只有安装/打包时才暴露。
~~~

**普通**

~~~text
结论：files 漏写 cordis.patch.yml 会导致安装校验 ENOENT，整包回滚。
- 安装器读取 bundle patch；路径不在包内就找不到。
建议：files 增加 cordis.patch.yml，重新 npm pack 验证。
风险：只在安装链路暴露，本地测试发现不了。
~~~

**专业**

~~~text
结论：bundle patch 未列入 files 时，安装校验 ENOENT 并原子回滚。
- 机制：宿主按 package.json → dsh.bundle.patch 解析装配清单；tarball 缺该文件即失败。
- 边界：只影响打包产物；dev checkout 直接读工作区，不复现。
建议：files 固定包含 cordis.patch.yml；CI 增加 npm pack 后解包断言。
风险：市场安装失败会被误判为运行时 bug；回滚是整包级，不是单文件补齐。
~~~

三份的结构指纹相同：结论 1 张 + 建议 1 张 + 风险 1 张；无表格；无 A/B/C 层级（要点只有一条，不编号）。差异只在讲解卡与术语展开。

### 1.9 与其它开关的交互

| 场景 | 深度是否生效 | 现状 | 1.2.0 要求 |
| --- | --- | --- | --- |
| 总开关开 + 人格开 | 生效 | 是（深度拼在 persona section） | 保持 |
| 总开关开 + 人格关 | 应生效 | **否**：人格关后走 `BUILTIN_STYLE_TEXT`，没有深度规则 | 必须生效（内容合同拆分后把深度拼进合同） |
| 总开关关 | 不生效 | 无注入 | 明确写进状态文案 |
| 子代理会话 | 按 `includeSubagents` | 人格只注入根会话（`isRootSessionContext`），深度随人格一起不生效 | 拍板：跟随 `includeSubagents`，或明确只对根会话 |
| `style.md` 自定义 | 规则文本被整份替换 | persona 开时 `style.md` 不注入（README:101） | 拍板：`style.md` 只覆盖"风格/排版"，不能覆盖内容合同与深度 |
| 旧消息 | 不回溯 | 已渲染内容不重算 | 保持；新回复用新档 |
| 代码 / diff / 报错 | 不适用 | 不交信封 | 保持 |

### 1.10 深度验收口径

**自动断言（可写进 node:test）**

1. `CONTENT_DEPTHS` 顺序为 beginner/general/expert；`normalizeContentDepth(undefined|'x') === 'general'`。
2. 三档 `contentDepthRules` 文本各命中关键词（入门：类比/术语；普通：默认不写；专业：机制/边界/取舍/数字），且都包含"卡片结构…不变"的共同约束。
3. `compilePersonaMode(raw, depth)` 的输出顺序：合同在前、深度在后、anchor 最后；同一 raw 三档只在深度段不同。
4. 内容-only 合同（人格关）同样包含深度段与共同约束。
5. DOM 级：同一 content 对象 + 三档 explanation（有/无）渲染，卡片类型序列、编号数组、表格行列数一致。
6. 非法 depth 配置（`Config({contentDepth:'x'})`）回落 general，且不抛错。

**人工盲评（每档 1 次，至少 2 人）**

- P1/P2/P3 各读三档同一问题回答，判断：入门是否有未解释术语、专业是否还在解释基础概念、三档事实是否一致、是否有为了通俗新增的卡片/删掉的边界。
- 反例清单：入门把类比写进风险；专业为了简洁删边界；普通堆两个类比；任何档位新增卡片或改编号。

---

## 2. 1.2.0 验收 / 测试矩阵

### 2.1 基线（HEAD `5480cf9`）

| 项目 | 当前值 | 来源 | 备注 |
| --- | --- | --- | --- |
| 版本 | 1.1.10 | `package.json` | 1.2.0 未 bump |
| 分支 | `main` ahead 13 / behind 6 | `git status -b` | 远端有 6 个本地没有的提交；发版前先对齐 |
| 测试 | 133 个 `test(` / 11 个文件 | 源码静态计数 | 1.1.10 发版记录是 131/131；wip 提交新增 2 条 |
| desktop-check | 上次全 PASS；宿主 0.2.2-rc.5 | HANDOFF / CHANGELOG | 本次未跑 |
| 对比度 | 80 项（4 主题 × 2 明暗 × 10 对） | `scripts/theme-contrast.mjs` | 加 custom 需另加断言，不要打乱 80 计数 |
| 色相 | 12 项（3 彩色主题 × 2 × success/warn；`dsh` 灰阶跳过） | `scripts/theme-hue-distance.mjs` | 阈值 25° |
| 计算样式 | 8 主题块 × 10 项 | HANDOFF（手动 `.tools/computed-style-check.mjs`） | 加 custom 后 10 块 |
| npm pack | 59 文件 / 1,564,603 B / unpacked 2,310,560 B / ±16,384 | `test/pack.test.mjs:22,26-36` | 本文件会破坏它 |
| 桌面已装 | 1.1.10（`~/.dsh/profiles/desktop/node_modules/dsh-structured`） | 实读 package.json | HANDOFF 写 1.1.9，已过期 |
| 桌面配置 | `personaEnabled: true`、`personaRevision: 31`、无 `contentDepth` | `~/.dsh/profiles/desktop/cordis.patch.yml:416-446` | 深度默认 general；新字段需 default |
| eli5 | 目录只有 `SKILL.md`，无 LICENSE / NOTICE / 上游地址 | `~/.agents/skills/eli5/` | 出处措辞见 3.5 |

### 2.2 矩阵总表

| ID | 验收项 | 现状 | 1.2.0 目标 | 自动化 |
| --- | --- | --- | --- | --- |
| S1 | 设置页 v4（单页） | 两 tab（`src/client.js:3589-3630`） | 单页分区；无 tablist；保存/预览/校验不丢 | 可自动 + 截图 |
| S2 | 插件总开关 | 无该字段；只有 `defaultEnabled` + 会话开关 | 标题行唯一开关；关 = 全链路停 | 可自动 |
| S3 | 人格 / 身份头 / 内容合同拆分 | 三件事一个 `personaEnabled` | 三个独立状态 + 合法组合约束 | 可自动 |
| S4 | 关闭人格仍多卡 | 宿主回退引用块卡；客户端仅兼容旧信封 | 人格关仍走 normal/table/short 多卡 | 可自动 |
| S5 | 旧消息不回溯 | 人格激活快照；关闭时全局删头 | 内容层不重写；装饰层边界写清 | 可自动 |
| S6 | 自定义 HSV 拾色器 | 无 custom 主题、无拾色器 | SV+色相+HEX+吸管+对比度+实时预览 | 部分实机 |
| S7 | 三档深度 | 宿主有规则；UI 只有 segmented | 三档贯通合同/预览/人格关 | 可自动 + 人工 |
| S8 | 侧边栏双入口 | 只有 `plugins.bundle.config` | `main` + `sidebar.panellist` + 详情页 | 注册可自动；点击实机 |
| S9 | 保存 / 预览 / 校验 | 人格 6 字段批量保存 + 回滚 | 新字段纳入；深度/色值校验；单页离开确认 | 可自动 |
| S10 | 门禁 | 133 / 80 / 12 / 59 文件 | 全部更新并复跑 | 可自动 + 手动 |

### 2.3 逐项判定

#### S1 设置页 v4（单页）

**判定（Given/When/Then）**

- Given 打开插件详情页，When 渲染配置区，Then：
  - `[role=tablist]` 数量为 0；不存在"结构化输出 / 语气风格"两个 tab 按钮。
  - 分区顺序：标题行（总开关）→ 外观（主题 + 3 色 + 视觉开关）→ 行为（默认开启 / 尾部提醒 / 子代理 / GenUI）→ 人格（身份头 / 称呼 / 风格预设 / 说话方式 / 内心OS / 保存）→ 输出深度 → 预览。
  - 每个分区只有一个标题；字段不重复；不嵌套多层卡片。
- When 窗口宽 390px，Then 无横向滚动；长页可滚动；分组折叠不丢字段。
- When 人格区有未保存修改，Then 离开页面 / 关闭面板要确认；只读态所有控件 `disabled`；配置不可用时显示"暂不可用"。
- When 主题 / 深度这类标"立即生效"的字段改动，Then 只 `form.set`，不经过保存按钮；人格区改动只有点保存才落盘（与 v4 的"立即生效 / 需保存" chip 对齐）。

**现状与差距**：代码仍是两 tab（`src/client.js:3589-3630`）；v4 只是静态稿（`.tmp/settings-1.2.0-v4.html`）；v4 页面里**没有"行为"区**，但 `CONFIG_FIELDS` 仍有 4 个行为字段（visual 之外的 `defaultEnabled` / `tailReminder` / `includeSubagents` / `genui`）。要么补区，要么明确删字段并改 schema，不能只在 UI 隐藏。

**落点**：`test/client-config-page.test.mjs` 重写 tab 断言；截图 `assets/screenshots/11-config-page.png` 重拍；desktop 实机 1 次。

#### S2 插件总开关

**判定**

- 位置：标题行右侧，全页唯一；不存在第二个"总开关"。
- Given 总开关关闭，Then：
  - 宿主：主 section、尾部提醒、persona section、tone anchor 全部返回空串；不因 `/structured on` 恢复。
  - 客户端：不启用视觉层（不插 `dss-*` 样式），不挂身份头，不渲染 persona 卡；已有消息保持原样。
  - 状态：`/structured status` 首行显示"插件：已关闭"；`on/off` 提示"插件总开关已关闭"，不写 `state.json`。
  - 设置页仍可打开、可操作（否则无法重新打开）。
- Given 重新打开，Then 恢复关闭前的 per-session 开关与视觉；不重置状态文件。

**现状**：无总开关字段；`defaultEnabled` 是"新会话默认值"，`/structured` 是会话级，`visual` 是独立字段。三者都不是"总开关"。

**建议字段**：`pluginEnabled: Schema.boolean().default(true)`。关闭时不要注销设置页（设置页生命周期跟 `configForms.whileServed`，不是跟 enabled）。

**落点**：`test/structured.test.mjs` 新增 apply×总开关；`test/client-visual.test.mjs` 新增不启用断言；`test/client-config-page` 断言设置页仍注册。

#### S3 人格 / 身份头 / 内容合同拆分

**状态矩阵（总开关开）**

| 内容合同 | 人格 | 身份头 | 结果 |
| --- | --- | --- | --- |
| 开 | 开 | 开 | 合同 + tone + 身份头 |
| 开 | 开 | 关 | 合同 + tone；无头像/名字/签名 |
| 开 | 关 | 关（强制） | 合同；无 tone、无前后缀、无身份头 |
| 开 | 关 | 开 | **非法**：UI 自动把身份头关掉，或保存时拒绝并提示 |

**判定**

- 内容合同由总开关控制（开即有），不再由 `personaEnabled` 控制。
- 人格只控制：`prefix/suffix`、`style`、`userName/selfName`、`skipIn`、口头禅/表情。不控制合同、不控制身份头。
- 身份头只控制：头像、显示名、签名。依赖规则单向：人格关 → 身份头必须关；人格开 → 身份头可开可关。
- 保存时做组合校验：`personaEnabled === false && identityHeadEnabled === true` 拒绝并提示；读配置时也做一次归一（防止手改 profile）。

**现状**：`personaEnabled` 同时 gate 合同与 tone（`src/index.js:662-663, 681`）；身份头由 `personaHeadConfig` 的 `enabled` 控制（`src/client.js:1007-1017`），没有独立开关；名字/签名/头像字段已独立存储。

**落点**：`test/structured.test.mjs:441-481` 必须重写（见 3.2）；新增 4 组合用例；`test/persona-ui.test.mjs` 补身份头开关断言。

#### S4 关闭人格仍多卡

**判定**

- Given 总开关开、人格关，When 模型交 normal 信封，Then：结论 / 建议 / 风险三卡齐全；无身份头、无前缀/后缀、无风格文本、无 `body` 的旧格式；编号 A/B/C、1/2/3 正常。
- table / short / explanation 同样渲染；表格行索引 a/b/c 保留；讲解卡插在结论与表格/建议之间。
- 缺块：legacy（保留原文、普通排版、不弹诊断）；非法块：错误卡（一句原因、不摊 JSON）；多个块：内容合同错误；代码 / diff / error / GenUI：例外不变。
- 旧消息：不回填（见 S5）。

**现状**：宿主在人格关时注入 `BUILTIN_STYLE_TEXT`（引用块标题卡），模型不会交信封；客户端 `renderDisabledPersonaContent`（`src/client.js:2780-2796`）只在模型"仍然发信封"时生效。端到端不成立。

**落点**：`test/persona-ui.test.mjs` 新增 disabled 模式的 normal/table/short/explanation/legacy/error 六组；`test/structured.test.mjs` 断言人格关仍注入信封合同，而不是 `BUILTIN_STYLE_TEXT`。

#### S5 旧消息不回溯

**先定义边界（否则测试会互相打架）**

| 层 | 是否回溯 | 例子 |
| --- | --- | --- |
| 内容层 | **不回溯** | 已渲染的卡片结构、编号、表格行、文本、事实 |
| 装饰层 | 允许全局即时变化，但必须在验收里列为例外 | 主题（custom/preset）、总开关、身份头开关 |

**判定**

- Given 已渲染消息 M，When 切换人格 / 身份头 / 深度 / 主题 / 总开关，Then M 的卡片数、卡片类型序列、编号数组、正文文本不变（装饰层除外）。
- Given 虚拟列表把 M 卸载再挂回，Then 不重新解析、不重写。
- Given 流式半截，Then 不判死、不提前报错。
- Given 关闭人格，Then 旧消息的卡片保留；身份头是否移除按 3.1-C5 的拍板结果执行，且必须有断言。

**现状**：人格开启时快照旧消息 + turn 水位（`src/client.js:1136-1152`）；配置变化只刷新受管消息（`1154-1164`）；测试在 `test/persona-ui.test.mjs:760-798`。缺口：关闭人格时 `removePersonaHeads(root)` 会删掉所有身份头（`1247-1251`），这是装饰层回溯；合同常开后需要新的"合同水位"，冷启动没有水位。

#### S6 自定义 HSV 拾色器

**判定**

- Given 外观区选中"自定义"，When 点击主色块，Then 打开面板：SV 区域、色相条、HEX 输入、吸管按钮、实时预览（结论/建议两张小卡）、对比度徽标。**不使用预设色板**。
- When 拖动 SV / 色相条 / 输入 HEX，Then 预览与 HEX 实时更新，但**不写 Config**；点保存才 `themeCustom` 一次落盘。
- When 点吸管，Then 若宿主支持 `EyeDropper` 则取色；不支持时隐藏按钮或提示不可用，不报错。
- When 切回预设，Then 移除注入的 `<style id="dsh-structured-custom-theme">`；再切回自定义，保留上次三色。
- 校验：非法 HEX 拒绝并提示；对比度不达标自动修正，修正后仍不达标拒绝保存；色相与状态色 <25° 给警告（不硬拒）；JSON >4KB 拒绝；坏 JSON 回落 dsh 灰阶、不白屏。
- 无障碍：色块可 Tab 聚焦、Enter 打开、方向键微调、有 `aria-label`。

**契约（建议）**

- 输入 3 色：主色 / 副色 / 辅色（示例值 `#4B5563 / #047857 / #B45309`，最终默认值待定）；基础层（页面底色/卡面/正文墨色/边框）不开放。
- 派生：软底 10–14%、状态格 8–12%、表头 10–18%；饱和度上限 S ≤ 65%；正文对比 ≥4.5、条/大字 ≥3；色相 ≥25°。
- 存储：`Config.themeCustom` JSON 字符串，schema `dsh-structured/palette@1`，≤4KB；`THEMES` 增加 `custom`。
- 应用：`applyTheme('custom')` 运行时注入浅/深两段变量；非 custom 时移除。
- 暗色：按 luminance 自动推导一套；P1 再做"单独填暗色"。

**现状**：`THEMES = ['dsh','deepseek','codex','anthropic']`（`src/index.js:56`、`src/client.js:44`）；`applyTheme` 只写 `body[data-dsh-structured-theme]`（`src/client.js:3676-3681`）；没有 `themeCustom`、派生、校验、拾色器。设置页只有 4 个主题的 segmented。

**冲突提醒**：v4 同时放了 3 个原生 `<input type=color>` 色块和一个 HSV 弹层。原生 color input 打开的是 OS 取色对话框，不是要求的 HSV 面板；验收必须明确"点击色块打开的是插件面板"，原生 input 只能作为隐藏 fallback 或去掉。

**落点**：新增 `test/palette.test.mjs`（HSV↔HEX、派生、对比度、色相、4KB、坏 JSON）；`test/client-config-page.test.mjs` 加拾色器 DOM/交互；`test/client-visual.test.mjs` 加注入/清理；`.tools/computed-style-check.mjs` 加 custom 夹具；真机验证深浅观感与 EyeDropper。

#### S7 三档深度

**判定**

- 三档常显、默认普通、无关闭；切换后下一条回复生效；非法值回落普通。
- 同一内容三档：结构指纹一致（见 1.2）；差异只在讲解卡与展开量。
- 入门：术语首次出现有解释；analogy 必选、example 可选。
- 普通：默认不写讲解卡；需要时才写。
- 专业：默认省略讲解卡；只写 example；不解释基础术语；给边界/取舍/数字。
- 人格关时仍生效（依赖 S3/S4）。
- 预览：三档都有对应预览，且包含讲解卡；预览与实际同一渲染器。

**现状**：宿主已实现（`150-177, 243-250, 261`）；UI 只有 `segmented`（`client.js:77`），文案是"通用"；无 eli5 说明、无每档 hint；深度只在 persona section 生效；预览没有讲解卡。

**落点**：`test/structured.test.mjs:169-179` 扩展；新增 content-only 合同带深度的用例；`test/persona-ui.test.mjs` 加三档结构指纹对比；人工盲评。

#### S8 侧边栏双入口

**判定**

- Given 插件正常服务，Then 侧边栏「更多」出现「结构化输出」一行，图标随 `currentColor`、`aria-hidden`、尺寸适配。
- When 点击该行，Then 选中 `key='dsh-structured'` 的面板，面板内容与详情页同一份配置卡。
- When 在面板改字段保存，Then 详情页读到同一值；反之亦然。
- When 连续开关 `personaEnabled` 10 次、切主题 3 次，Then 不出现重复行、面板不叠加。
- When 插件停用 / 命名空间未服务，Then 行与面板一起消失，不留空行。
- 详情页配置区保留，不因侧边栏新增而移除。

**宿主契约（来自 `docs/PLAN-1.2.0-ENTRIES.md` §二）**

| slot | 形状 | 要点 |
| --- | --- | --- |
| `sidebar.panellist` | `{ name, id, order, label: () => string, locale? }` | 渲染函数只收 `{ size }`；行本身不接收点击回调 |
| `main` | `{ name, key, inject }` | `key` 与行 `id` 相同；宿主点行 → 选同 key 面板 |
| `plugins.bundle.config` | `{ name, key:'dsh-structured', inject }` | 现有，保留 |

**现状**：只注册了 `plugins.bundle.config`（`src/client.js:3632-3669`）；测试的 fake slots 明确断言 `name === 'plugins.bundle.config'`（`test/client-config-page.test.mjs:135-137`），新增 slot 会让它红。

**风险**：宿主"点行选同 key 面板"只在 archive-manager 代码里见过证据，未实机确认；失败退化方案是行点击后由插件主动 `selectPanel(id)`。面板与详情页同时挂载时，要保证共用同一个 `configForms` form 实例，不能各持一份 state。

#### S9 保存 / 预览 / 校验

**判定**

- 保存：一次 `mutate` 批量提交（persona 6 字段 + 新字段），带 `revision`；失败回滚、保留草稿、可重试；写后读回不一致算失败；成功文案"已保存，全局生效（新消息使用）"。
- 立即生效字段（外观 / 输出深度 / 总开关 / 身份头）走 `form.set`；人格区走保存；同一页要像 v4 一样用"立即生效 / 需保存" chip 标清。
- 预览：normal / table / short / 代码 + 讲解 + 三档深度 + 自定义三色；预览与真实同源渲染器；预览不写 Config。
- 校验：tone@1、64KB、字段长度、`contentDepth` 枚举、palette 格式/对比度/色相、头像 png/jpeg/webp + 128px JPEG ≤64KB；错误定位到字段。
- 只读：所有控件 `disabled`、保存不可用、提示被更高层覆盖。

**现状**：PersonaEditor 已实现 6 字段批量 + revision + 回滚 + 读回（`test/persona-ui.test.mjs` 的 v5 保存/回滚用例）；预览与真实同源；但没有 depth/palette 校验、没有单页离开 guard（现在只有跨 tab 的 `personaGuard.confirm`，`src/client.js:3591-3607`）；v4 预览缺讲解卡。

**落点**：`test/persona-ui.test.mjs` 扩展 payload/回滚/读回；新增 depth/palette 校验用例；`test/client-config-page.test.mjs` 加离开确认与只读。

#### S10 门禁

见 2.4。要点：`npm test` 的 `pretest` 会重建 `lib/`，任何 src 改动必须同步提交 lib；`build-injection.test.mjs` 做逐字节比对，漏提交必红。

### 2.4 门禁命令与预期

~~~bash
npm test                                  # pretest 重建 lib；当前 133 个 test()
node scripts/desktop-check.mjs            # 全 PASS；宿主 0.2.2-rc.5
node scripts/theme-contrast.mjs           # 80/80；custom 另加断言
node scripts/theme-hue-distance.mjs       # 12/12；custom 另加断言
node .tools/computed-style-check.mjs      # 手动；8 块 ×10 → custom 后 10 块
node scripts/style-gate.mjs               # 手动；不在 npm test
npm pack --ignore-scripts                 # 59 文件 / 1,564,603 / 2,310,560 ±16KB
~~~

注意：

- `npm test` 会先 build，`lib/` 会变；在脏工作区跑完要检查 `git status`，不要把 build 产物和源码改动混在一个提交里。
- `npm pack` 会在根目录留 `.tgz`；`pack.test.mjs` 自己会清理新产物，手动跑要自己删。
- `desktop-check` 只做静态检查（文件、exports、import、profile bundle 栈），不证明真实渲染；真实加载要另做。
- `style-gate` 依赖 ego 浏览器与固定 fixture，缺失时按手册跳过并注明。

### 2.5 必须实机验证的 6 项

1. **侧边栏点行**：点「结构化输出」是否自动选中同 key 面板；不成立则走 `selectPanel` 退化。
2. **双入口同源**：面板与详情页同时打开，改一处另一处是否即时同步；关闭面板再开是否保留未保存草稿。
3. **HSV 拾色器**：拖动、HEX、吸管、对比度徽标、深浅两套观感；Electron 是否支持 `EyeDropper`。
4. **关闭人格/身份头**：旧消息与新消息的卡片、身份头、前后缀对照；确认"不回溯"的边界符合 3.1-C5 的拍板。
5. **desktop 加载 1.2.0**：用独立测试 profile 安装，确认 client bundle 加载、设置页出现、无 `producer-owned source kind` 类错误；不要用 `dsh plugin --profile desktop`。
6. **主题切换与持久化**：custom → 预设 → custom，重启 Desktop 后仍保留；坏 JSON 回落灰阶不白屏。

### 2.6 建议新增的测试（只列，不改代码）

| 目标文件 | 新增用例（建议名） | 断言要点 |
| --- | --- | --- |
| `test/structured.test.mjs` | 总开关关闭：四个 section 全空 | 主/提醒/persona/anchor 均为 `''` |
| 同上 | 人格关仍注入内容合同 | 输出含 `normal/table/short` 与深度段，不含 `> **结论**` |
| 同上 | 三档深度拼接顺序 | 合同在深度前，anchor 最后 |
| 同上 | 身份头组合校验 | persona 关 + head 开 → 归一/拒绝 |
| `test/client-config-page.test.mjs` | 单页无 tablist、分区顺序 | `[role=tablist]` 为 0；section 标题数组 |
| 同上 | 总开关唯一且在标题行 | 全页 switch 计数与位置 |
| 同上 | 拾色器打开/HEX/对比度/保存 | DOM + 调用 `themeCustom` 次数 |
| 同上 | 离开未保存确认、只读全禁用 | confirm 调用、disabled 属性 |
| `test/persona-ui.test.mjs` | 人格关三卡 + 讲解 + 表格 + 短答 | 卡片序列、编号、无 head |
| 同上 | 三档结构指纹一致 | 有/无 explanation 编号数组相等 |
| 同上 | 旧消息切换设置不重写 | textContent/编号快照相等 |
| `test/palette.test.mjs`（新） | 派生/对比度/色相/4KB/坏 JSON | 纯函数边界 |
| `test/client-visual.test.mjs` | custom 注入/移除、custom 两块 | style id、变量块数 |
| `test/theme.test.mjs` | THEMES 五值、Config 新字段默认 | 枚举与默认值 |
| `test/pack.test.mjs` | 新基线或新排除 | 文件数/体积 |

---

## 3. 冲突与风险清单

### 3.1 与 1.1.10 行为

#### C1（P0）人格与结构互斥，和"合同常开"直接冲突

- 证据：`sectionText()` 在 `personaEnabledNow()` 为真时直接返回空串（`src/index.js:662-663`）；`personaModeCompiledNow` 只在人格开时编译（`681`）；测试明确断言互斥（`test/structured.test.mjs:441-481`）。
- 影响：1.2.0 要求"总开关开着就始终注入多卡合同"，必须删除这条互斥；否则人格关 = 回到引用块卡。
- 建议：合同注入条件从 `personaEnabled` 改为 `pluginEnabled`；`personaEnabled` 只控制 tone wrapper 与身份头。互斥测试改成"人格开时只注入一套合同（避免重复），人格关时仍注入合同"。

#### C2（P0）尾部提醒文本会和内容合同打架

- 证据：人格开时注入 `PERSONA_REMINDER_TEXT`（只讲信封，`src/index.js:184-186, 742`）；人格关时注入 `TAIL_REMINDER_TEXT`（要求"第一段必须是 markdown 引用块标题卡"，`src/index.js:301-303`）。
- 影响：1.2.0 人格关但合同常开时，如果还注入 `TAIL_REMINDER_TEXT`，模型会收到"先写引用块标题卡"和"只交 persona 信封"两条相反指令，漏信封率会上升。
- 建议：新增第三种提醒 `CONTENT_REMINDER_TEXT`（只讲信封 + 字段 + 编号，不提引用块），人格关且合同开时使用；`TAIL_REMINDER_TEXT` 只留给 legacy 模式或删除。

#### C3（P1）`/structured` 语义与现有测试

- 证据：人格开时 `status` 返回"PersonaMode：已启用；StructuredMode：已关闭"，`on/off` 拒绝执行（`src/index.js:564-576`）；测试断言 `sessions` 不变（`test/structured.test.mjs:472-477`）。
- 影响：合同常开后，`/structured` 到底控制什么？如果它控制会话级合同，人格开时就不该再拒绝。
- 建议：明确三层——总开关（全局）/ `/structured`（会话级合同）/ 人格（风格）；`/structured off` 只关合同，不影响人格；状态文案重写。现有测试改为"人格开时 /structured off 仍生效，只关合同"。

#### C4（P1）`style.md` 整份覆盖与合同常开

- 证据：`style.md` 非空时整份替换 `BUILTIN_STYLE_TEXT`（`src/index.js:360-374`）；人格开时 `style.md` 不注入（README:101）。
- 影响：合同常开后，`style.md` 不能再覆盖合同（否则用户能删掉多卡）；但 README 承诺"整份覆盖"。
- 建议：把 `style.md` 的语义改为"只覆盖文字风格/排版补充"，合同与深度不可覆盖；README / ACCEPTANCE 同步改；旧用户升级时给出说明。

#### C5（P1）"旧消息不回溯"与"关闭人格全局删头"冲突

- 证据：关闭人格时 `decorate` 先 `removePersonaHeads(root)`（`src/client.js:1247-1251, 2806-2813`），会把所有消息的身份头删掉；`cleanPersonaMarkdown` 只清理受管消息（`1128-1134`）。
- 影响：如果"不回溯"包含装饰层，这是 bug；如果只包含内容层，这是预期，但必须在验收里写清，否则测试会互斥。
- 建议：在 ACCEPTANCE 写一句"内容层不回溯；主题 / 身份头开关 / 总开关属装饰层，允许全局即时生效"。若要严格不回溯，关闭人格时只对新消息生效，旧消息保留头。
- 补测试：旧消息卡片数/编号/文本快照；身份头按拍板结果断言。

#### C6（P1）`defaultEnabled` 与总开关语义重叠

- 证据：`defaultEnabled` 是"新会话默认开启"（`src/index.js:263`）；`/structured` 是会话级；没有总开关。
- 影响：再加一个 `pluginEnabled`，用户会看到两个"开启"；文案必须区分"插件 / 新会话默认 / 本会话"。
- 建议：总开关叫"启用插件"；`defaultEnabled` 改文案"新会话默认结构化"；`/structured` 状态里三行都显示。总开关关闭时不改 `state.json`，重开恢复。

#### C7（P1）升级后输出形状变化

- 影响：1.1.10 中把人格关掉、依赖 `BUILTIN_STYLE_TEXT` 的用户，1.2.0 会突然收到 persona 信封要求；模型合规率、token 成本、流式体验都会变。反之，一直开人格的用户变化较小。
- 建议：发布说明写清"人格关也走多卡合同"；保留一个迁移开关（`legacyMarkdownContract`）或至少在 1.2.0 首个版本观察一周；准备回滚到 1.1.10 的说明（profile 配置 + 重装）。

### 3.2 与现有测试

| 测试位置 | 现有断言 | 1.2.0 会怎样 | 处理 |
| --- | --- | --- | --- |
| `test/theme.test.mjs:11` | `THEMES` 深等于 4 值 | 加 `custom` 后变 5 值 | 改成包含 custom 的新数组；补 default 断言 |
| `test/theme.test.mjs:53` | 循环 6 个基础字段 | 新字段（pluginEnabled / identityHead / themeCustom）不在列表 | 扩展列表；保持 volatile/description 断言 |
| `test/client-config-page.test.mjs:258-259` | 4 个 switch + 3 个 segmented | 总开关、身份头、内心OS 会增加 switch；主题/深度/GenUI 可能变 | 改成"按字段查控件"，不要数总数 |
| `test/client-config-page.test.mjs:312` | 只读态 4 个 switch 全 disabled | 同上，数量变化 | 同上 |
| `test/client-config-page.test.mjs:415-437` | 跨 tab 不丢草稿 | 单页后没有 tab | 改成"切分区/关面板不丢草稿" |
| `test/client-config-page.test.mjs:135-137` | inject 只认 `plugins.bundle.config` | 新增 `main` / `sidebar.panellist` | fake slots 改成按名记录多 slot |
| `test/structured.test.mjs:441-481` | 人格开 → 主 section 空、通用提醒不注入、命令拒绝 | 合同常开、提醒换第三种、命令语义变 | 重写；保留"只注入一套合同"的断言 |
| `test/structured.test.mjs:300` | 人格开时提醒换专用文本 | 新增 content-only 提醒 | 扩展为三态（persona / content / legacy） |
| `test/persona-ui.test.mjs:760-798` | 旧历史不回溯（人格激活） | 合同常开需要新水位 | 保留并扩展合同水位、关闭人格的旧消息断言 |
| `test/persona-ui.test.mjs:545-594` | explanation 渲染讲解卡 | 三档要约束"必写/可选/省略" | 扩展三档 fixture；保留编号断言 |
| `test/pack.test.mjs:22,26-36` | 59 文件、固定体积 | 本文件 + palette.test 会被打包 | 见 3.3 |
| `test/build-injection.test.mjs` | src/lib 逐字节一致 | 任何 src 改动未 build 都红 | 每次改 src 后 `npm run build` 并提交 lib |
| `test/client-visual.test.mjs` 多条 | "三套主题"配色/选择器 | 加 custom 后主题数变 5 | 把"三套彩色主题"和"custom"分开断言，不要数 3 |
| `test/theme.test.mjs` 对比度/色相 | 固定 80 / 12 | custom 不在这两组里 | 单独加 custom 组，避免把 80 改成 100 导致历史基线失真 |

### 3.3 与 pack 基线

- 证据：`package.json` 的 `files` 含 `docs`、`test`，只排除 `!docs/PLAN-*.md`、部分 ACCEPTANCE/审计文档与指定 fixture；`test/pack.test.mjs:22` 断言 59 文件，`26-36` 断言 packed 1,564,603 B / unpacked 2,310,560 B（±16,384）。
- 直接后果：
  - 本文件 `docs/DEPTH-COPY-1.2.0.md` 不匹配 `!docs/PLAN-*.md` → 会被打包，文件数 59 → 60，体积增加。
  - 将来新增 `test/palette.test.mjs` → 再 +1 文件。
  - 新增/替换 `assets/screenshots` → 体积变化可能超过 ±16KB。
- 建议（二选一，发布前定）：
  1. 排除研究稿：`files` 增加 `!docs/DEPTH-COPY-*.md`；测试文件仍要算进基线。
  2. 更新基线：重算 `PINNED_SIZE` / `PINNED_UNPACKED` / 文件数，并同步 `ACCEPTANCE.md` 与 `docs/ACCEPTANCE-1.0.0.md` 的说明。
- 不要用"把测试目录从包里删掉"来解决：`test` 在 `files` 里是历史行为，删掉会改变发布物内容，属于产品决策，不是顺手改。

### 3.4 与 desktop 加载

- **profile 隔离**：desktop 是 Electron 独占，`dsh plugin --profile desktop ...` 会被拒绝；开发期用独立测试 profile，最终安装走市场或手工 pnpm，装前备份。改动 client 后不要要求用户 F5 / 刷新浏览器；由 agent 切换 bundle 或重开 Desktop。
- **静态检查不等于加载**：`desktop-check.mjs` 只查 bundle 栈、files、main/exports、node: 导入、无 Electron 专有 API；它不证明设置页/侧边栏/拾色器真的渲染。
- **client 依赖守卫**：设置页要求 `react` 与 `@deepseek-ai/dsh-client-ui-primitives`（`Switch` / `SegmentedControl`），缺失时静默不注册（`src/client.js:2829-2849`，测试 `client-config-page.test.mjs:201-207`）。新增 picker 不要引入宿主没有的模块；需要复杂交互时用 DOM/已有 primitives，保持 fail-open。
- **slot 契约未实机验证**：`sidebar.panellist` + `main` 的"点行选同 key 面板"只在 archive-manager 代码里见过证据（`docs/PLAN-1.2.0-ENTRIES.md` §二/§六）。首次实机验证若失败，退化方案是行点击后主动 `selectPanel(id)`，但行本身不接收点击回调，需要确认宿主是否暴露面板服务。
- **EyeDropper**：Chromium 支持 `window.EyeDropper`，Electron 版本/权限不一定；不支持时要隐藏按钮，不能抛错。原生 `<input type=color>` 会打开 OS 对话框，不等于插件的 HSV 面板。
- **配置合并**：`cordis.patch.yml` 注释明确"整份 config 替换，不是深合并"；desktop profile 现有 config 没有 `contentDepth` / `pluginEnabled` / `themeCustom`。新增字段必须靠 schema default 生效，不能假设 profile 会自动补；上线前用现有 profile 实测一次默认值。
- **版本兼容**：`package.json` 的 `dsh.compatibility.dshReleases` 目前登记到 0.3.0-rc.1，`engines.dsh` 是 `>=0.1.7-rc.2 <0.4.0-0 || >=0.2.1-rc.0 <0.2.2`；1.2.0 若用到新 slot，要确认目标宿主版本并补登记。

### 3.5 eli5 版权 / 出处措辞

**事实**

- 本机 eli5 skill 目录只有 `SKILL.md`，没有 LICENSE、NOTICE、作者、上游仓库地址（`~/.agents/skills/eli5/` 静态列目录）。
- `SKILL.md` 的 frontmatter 只有 `name` 与 `description`，没有 license/author 字段。
- 因此：**不能从本机材料推出可以复制、改编、再分发**；没有许可文本 ≠ 公共领域。

**建议措辞（按风险从低到高）**

| 场景 | 建议文案 | 不要写 |
| --- | --- | --- |
| 设置页底部 | "受众分层参考 eli5 skill（Explain Like I'm 5）的公开方法。" | "由 eli5 提供" / "eli5 授权" / "基于 eli5 构建" |
| README / 研究文档 | "受众分层方法参考 eli5 skill；本项目未内置该 skill，也未复制其正文。" | "遵循 eli5 规范"（暗示标准/认证） |
| 代码注释 | 只写"受众分层：入门/普通/专业"，不写来源断言 | 把 SKILL.md 段落复制进源码 |

**三条边界**

1. **只引用方法，不复制文本**：三档规则是我们自己的提示词，不是 skill 原文；不要为了"出处"把 SKILL.md 的句子搬进产品。
2. **不暗示背书**：eli5 是通用方法名（Explain Like I'm 5），不是本项目的一部分；写"参考"即可，不要写"官方""认证""合作"。
3. **5 岁口径要降级处理**：eli5 默认 Age 5（`SKILL.md:50`），但 1.2.0 的入门是"5–15 岁 / 非技术读者"。直接照搬 Age 5 的玩具/糖果类比会违反 eli5 自己的"Never talk down"（`SKILL.md:113`），也与工程事实冲突。建议：**对外写"5–15 岁"，实现按 10–15 岁基线，5 岁只作零背景假设**；如果 Boss 要求严格 5 岁，需要单独评审文案。

**如果将来要随包分发 eli5 内容**：先找到上游仓库与 LICENSE，补 `NOTICE` / 版权头，再复制；当前 1.2.0 不需要这么做（不复制正文）。

### 3.6 其它冲突（v4 / 计划 / 分支 / 文档）

#### C8（P0）v4 静态稿 vs 计划

| 不一致 | v4 稿 | PLAN / 代码 | 影响 |
| --- | --- | --- | --- |
| "行为"区 | 没有 | 开工顺序列了"行为"；`CONFIG_FIELDS` 仍有 4 个行为字段 | 字段无处可改，或悄悄从 UI 消失 |
| 自定义色数量 | 3 色（主/副/辅） | `PLAN-CUSTOM-THEME` §3 写"四基色"，§4.1 写"3 个输入"；`PLAN-1.2.0` §四写"4 基色" | 派生规则、校验、测试都按不同输入数写 |
| 预览卡 | 结论/建议/风险/短答/表格/代码 | 深度功能依赖"讲解"卡 | 用户看不到深度效果 |
| 档位名 | 普通 | 代码文案"通用" | 测试/文案不一致 |
| 侧边栏入口 | 稿里没有 | 开工顺序列了"侧边栏入口" | 验收项缺 UI 锚点 |

建议：开工前把 v4 补成"外观 / 行为 / 人格 / 输出深度 / 预览"五区，明确 3 色，预览加讲解卡，档位统一"普通"；或者由 Boss 明确删掉哪些字段/入口，再改 schema 与测试。

#### C9（P2）内心OS 不在代码里

v4 有"内心OS"开关与预览（"跟随当前风格…≤30 字"），但 `src/` 里没有任何实现。若 1.2.0 要做，需要决定：

- 只做 UI + 风格后缀（不新增信封字段）：实现最小，但"OS"只是 persona 文本的一部分；
- 新增 `os` 字段：会破坏 `strictKeys` / `validatePersonaContent` 的白名单（`src/client.js:1415`），还要改合同、预览、复制；
- 延期到 1.2.1：v4 先不放，避免"设置里有、回复里没有"。

建议：1.2.0 不做，或只做"风格文本 + 预览"的 UI 级能力，明确标注 experimental。

#### C10（P2）分支与文档漂移

- `main` ahead 13 / behind 6；远端有本地没有的提交，发版前先对齐，不要直接 tag。
- HANDOFF 数字过期：写 131/131、pack 1,560,575、桌面已装 1.1.9；实际源码 133 个 test()、pin 1,564,603、桌面 1.1.10。1.2.0 开工前先更新 HANDOFF，否则验收会拿旧数字对。
- `docs/MAINTENANCE.md` 的门禁数字也旧（30/30、60 项、34 文件），只可当流程参考，不可当基线。
- 本文件写完后 pack 基线变化，见 3.3。

### 3.7 风险登记与拍板清单

| 优先级 | 风险 | 触发条件 | 缓解 |
| --- | --- | --- | --- |
| P0 | 不拆 `personaEnabled` → "关闭人格仍多卡"无法验收 | 直接开工写 UI | 先做合同拆分（S3/S4），再写设置页 |
| P0 | 提醒文本与合同矛盾 → 漏信封率上升 | 只删互斥、不换提醒 | 新增 content-only 提醒，三态测试 |
| P0 | pack 基线被本文件/新测试打破 | 第一次 `npm test` | 先定排除或更新基线 |
| P0 | v4 缺行为区/3 vs 4 色/预览缺讲解 | 按稿直接实现 | 开工前拍板并更新 PLAN |
| P1 | 旧消息"不回溯"边界不清 | 关闭人格/身份头 | 写清内容层 vs 装饰层，补断言 |
| P1 | 总开关与 `defaultEnabled` 混淆 | 设置页上线 | 文案三分：插件/新会话/本会话 |
| P1 | 既有测试大量按 4 主题/7 字段/两 tab 写死 | 改代码 | 改成按字段/按名称断言，不数总数 |
| P1 | HSV 校验不严 → 用户存出低对比配色 | 只做前端预览 | 保存硬校验 + 自动修正 + 拒绝保存 |
| P1 | 侧边栏点行契约未验证 | 首次实现 | 先实机 1 次，失败退化 `selectPanel` |
| P2 | eli5 出处措辞暗示授权 | 文案写"基于/由…提供" | 统一"方法参考"，不复制正文 |
| P2 | desktop 新字段默认值不生效 | 旧 profile 未写新字段 | schema default + 现有 profile 实测 |
| P2 | 内心OS 只做 UI | 1.2.0 排期紧 | 延期或标 experimental |

---

## 附录 A 证据索引

| 主题 | 位置 |
| --- | --- |
| 深度常量/规则/配置/拼接 | `src/index.js:150-177, 243-250, 261` |
| 合同与 explanation | `src/index.js:122-147, 134` |
| 人格互斥注入 | `src/index.js:662-663, 681` |
| 尾部提醒 | `src/index.js:184-186, 301-303, 730-754` |
| `/structured` 命令 | `src/index.js:561-589, 787-821` |
| 内置 markdown 规则 | `src/index.js:280-293` |
| 主题枚举 | `src/index.js:56`；`src/client.js:44` |
| 配置字段 | `src/index.js:259-273`；`src/client.js:75-83` |
| 讲解卡渲染 | `src/client.js:2043-2057` |
| 人格头配置/挂载/移除 | `src/client.js:1007-1017, 1166-1245, 1247-1269` |
| 旧历史水位 | `src/client.js:1136-1152, 1154-1164` |
| 关闭人格 content-only | `src/client.js:2780-2796` |
| 设置页两 tab/注册 | `src/client.js:3589-3630, 3632-3669` |
| 主题应用 | `src/client.js:3676-3681` |
| 客户端配置订阅 | `src/client.js:3842-3896` |
| 测试：互斥/提醒 | `test/structured.test.mjs:441-481, 300` |
| 测试：旧历史/解释卡 | `test/persona-ui.test.mjs:760-798, 545-594` |
| 测试：配置页 | `test/client-config-page.test.mjs:135-137, 258-259, 312, 415-437` |
| 测试：主题枚举/字段 | `test/theme.test.mjs:10-15, 53` |
| pack 基线 | `test/pack.test.mjs:22, 26-36` |
| 静态稿 v4 | `.tmp/settings-1.2.0-v4.html` |
| 计划 | `docs/PLAN-1.2.0.md`、`docs/PLAN-CUSTOM-THEME.md`、`docs/PLAN-1.2.0-ENTRIES.md` |
| 桌面配置 | `~/.dsh/profiles/desktop/cordis.patch.yml:416-446` |
| eli5 | `~/.agents/skills/eli5/SKILL.md:17-21, 50, 79-83, 113` |

## 附录 B 未运行项与边界

- 未运行 `npm test`、`npm run build`、`scripts/desktop-check.mjs`、`theme-contrast`、`theme-hue-distance`、`computed-style-check`、`style-gate`、`measure-prose`、`npm pack`。
- 未打开真实 Desktop，未验证侧边栏/slot/拾色器渲染。
- 未修改任何代码、测试、计划、配置；只新增本文件。
- 文中"133 / 80 / 12 / 8×10 / 59 / 1,564,603"分别是静态计数与仓库固定基线，不是本轮实测；1.2.0 改完后必须重新跑并更新。

## 附录 C 待拍板问题（8 条）

1. 总开关关闭时，视觉层是否一起关？设置页是否保留？（建议：一起关显示，设置页保留）
2. "旧消息不回溯"是否包含身份头 / 主题这类装饰？（建议：内容不回溯，装饰全局生效，写进 ACCEPTANCE）
3. "行为"区的 4 个字段（默认开启 / 尾部提醒 / 子代理 / GenUI）保留还是删除？（建议保留，v4 补区）
4. 自定义色是 3 色（主/副/辅）还是 PLAN 里的 4 基色？（建议按 2026-11-19 口径 3 色，更新计划）
5. 预览是否加讲解卡与三档切换？（建议加）
6. 输出深度是否对子代理生效？（建议跟随 `includeSubagents`）
7. 内心OS 进 1.2.0 还是延期？（建议延期，避免改合同）
8. 本文件随包还是排除？（建议排除：`!docs/DEPTH-COPY-*.md`）
