# 视觉排版方案（dsh-structured v0.3）

## 目标平台

**desktop 是主目标，本会话就运行在 dsh desktop 中。** 视觉层的设计、目检和验收都以 desktop 为准；Web 客户端只做兼容 smoke，不作为设计目标。`dsh.client.platform: 'web'` 是 DSH 客户端模块的格式，desktop 的 Web UI 也加载它，不代表 Web 优先。

## 结论

结构化只解决“信息顺序”，视觉层解决“扫读成本”。方案是三层，不动 markdown 渲染器、不接管 GenUI：

1. **结构契约**（已有）：首句结论 + 表格/清单/步骤 + 500 字上限，host 每请求注入。
2. **视觉层**（本次落地）：用客户端 CSS + 轻量 DOM 属性，给标题、表格、代码块、引用、列表、链接做统一排版；主题色全部走 `--dsw-alias-*`，自动跟随明暗主题。
3. **组件层**（交接 GenUI）：需要交互、图表、可排序表格时，用 ` ```dsh-ui ` fence 交给 `dsh-genui`；视觉层只美化它周围的普通 markdown。

视觉方向定为 **「工程蓝图」一套**：蓝色强调、等宽小标签、清晰网格、明暗自动跟随。**不提供主题选择/主题菜单**；需要个性化时只改 `style.md` 的文字规则，视觉方案保持统一。

## 现状与差距

当前回复只有 markdown 原生样式：`h1–h6` 字号差小、表格无表头层次/斑马纹、代码块只有一条语言 banner、引用块是默认灰边。截图里“已完成 / 表格 / 引用”三类内容视觉权重几乎一样，读者要靠读文字找层级。

目标不是“花”，是**一眼分层**：

- 标题能扫出章节；
- 表格能扫出表头、行、重点列；
- 代码块能一眼看出语言、边界、可复制；
- 风险/验收/结论这类语义块有颜色，但不超过 3 种语义色。

## 参考项目（市场实测）

| 项目 | 做法 | 借什么 / 不借什么 |
| --- | --- | --- |
| `@changfenhuang/dsh-genui` 0.13.0（已装） | ` ```dsh-ui ` fence → 浏览器 React 组件；有 display typography、stat card、表格、图表、callout 等组件 | 借“组件优先”的分工和设计 token 思路；**不**把普通 markdown 全改写成组件，避免每条回复都生成 JSON |
| `dsh-markdown-xyy` 2.1.5（市场，theme 类） | 原生配色增强 + 4 套明暗主题 + 用户自定义 CSS | 借“主题预设 + 用户 CSS 覆盖”的产品形态；实现上仍用我们的 scoped CSS，不替换宿主 renderer |
| `dsh-md-render` 0.5.2（市场，docs 类） | 每个 fenced block 自己渲染：语言 banner + highlight.js | 借代码块“语言 banner + 可复制”的信息结构；宿主已有高亮 HTML 时只加颜色/边框，不重复打包 highlighter |
| `dsh-message-copy-enhance` 0.2.1 | 复制选区保留 Markdown / 代码语言 | 借代码块复制按钮的交互；P2 再做，先保证视觉 |
| `dsh-concise` 0.11.3（参考实现） | 客户端扫描 `[class*="_markdown"]` + MutationObserver，给 blockquote 打 class | 借“只加 class/attribute、不搬 React 节点”的稳定做法；流式期间延迟 DOM 改写，避免冻结 |

宿主 markdown 的可用锚点（实测）：`[class*="_markdown_"]`、`.md-code-block`、`[data-code-block-banner]`、`[data-code-wrap]`、`[data-line-numbers]`、`h1–h6`、`table`、`blockquote`、`markdown-hr`。主题 token：`--dsw-alias-bg-layer-1/2`、`--dsw-alias-border-l2`、`--dsw-alias-brand-primary`、`--dsw-alias-label-primary/secondary`、`--dsw-alias-state-warn/success/error-primary`。

## 设计系统

### 字号与节奏

| 元素 | 规格 |
| --- | --- |
| 正文 | 15px / 1.72，段间距 0.72em，中文 `letter-spacing:.01em` |
| H1 | 25px / 700，下边框分隔，上 30px 下 12px |
| H2 | 20px / 700，左侧 3px 强调条，上 26px 下 10px |
| H3 | 16.5px / 650，上 20px 下 8px |
| H4 | 15px / 650 |
| H5/H6 | 13px / 700，大写 + 字距，作 eyebrow 用 |
| 表格 | 14px，表头 650，单元格 9×12px |
| 代码 | 13px / 1.65，行内代码 0.9em |

### 颜色角色

只定义 5 个语义角色，全部从宿主 token 派生，不写死明暗两套：

| 角色 | 变量 | 用途 |
| --- | --- | --- |
| 强调 | `--ds-accent` ← `--dsw-alias-brand-primary` | 标题条、表头悬停、链接、图标底 |
| 正文 | `--ds-text` ← `--dsw-alias-label-primary` | 标题/正文 |
| 次要 | `--ds-muted` ← `--dsw-alias-label-secondary` | banner、eyebrow、辅助 |
| 边界 | `--ds-border` ← `--dsw-alias-border-l2` | 表格/代码块/卡片 |
| 语义 | `--dsw-alias-state-warn/success/error-primary` | 风险/验收/错误 callout |

### 组件规格

- **标题图标**：H2/H3 按关键词映射（结论 ◆、方案 ▸、风险 ⚠、验收 ✓、对比 ⇄、下一步 →、背景 ◎、指标 ▦），放在 22px 圆角底块里；H1 不加图标，避免层级噪音。
- **表格**：1px 圆角外框、表头 `bg-layer-2`、斑马纹 55% 透明、悬停 7% 强调色、最后一行去底边；窄屏降字号/内边距。
- **代码块**：12px 圆角、1px 边框、banner 渐变底 + 语言色圆点；语言色：JS 黄、TS 蓝、Python 绿、Bash 青、JSON 紫、HTML/CSS 橙、SQL 青蓝，未知走品牌色。复用宿主高亮结果，不新增 highlighter。
- **引用块**：默认 3px 强调左边 + 6% 强调底；`风险/注意/警告` → warn 色，`验收/通过/成功` → success 色，`结论/判断/答案` → info 色；`> **结论：**` 升级为带边框和渐变的结论卡。
- **列表**：`::marker` 用强调色，项间距 0.28em；**链接**：强调色 + 2px 下划线偏移；**HR**：两侧透明的渐变细线。
- **无障碍**：所有颜色来自主题 token；`prefers-reduced-motion` 关闭过渡；不改变字号以外的布局；不隐藏任何文本。

## 架构

```text
host: systemPrompt.section (结构规则)  →  已有，不动
client: 注入 scoped CSS                →  [class*="_markdown_"] 下的 h/table/code/blockquote
client: 轻量 DOM 属性                  →  标题图标 / callout 色调 / 代码语言色
client: 结论卡                          →  blockquote 前缀匹配
GenUI: ```dsh-ui fence                 →  交互组件；视觉层不接管
```

原则：

- **CSS 优先**：能靠选择器解决的绝不做 DOM 改写；只有“按文本给语义”才加属性。
- **不搬 React 节点**：只加 class/attribute，避免 dsh-concise 踩过的流式冻结；MutationObserver + rAF 合批。
- **可回退**：所有选择器命中失败时只是“原生 markdown”，不会报错；`ctx.effect` 失败时 dispose 并降级。
- **主题跟随**：不写死浅色/深色，用 `color-mix()` 从宿主 token 派生透明度和强调底。
- **流式安全**：只改属性不改文本；重渲染后重新扫描，幂等。

## 阶段计划

### P0（已落地，v0.3.1）

CSS 视觉层 + 标题关键词图标 + callout 三色 + 代码语言色 + 结论卡；已装 desktop，可即时看效果。验收：标题/表格/代码/引用四类在明暗主题下都不溢出、不遮挡；DOM 只新增属性；`node --check` 通过；22/22 测试。

### P1（1–2 天）：单一视觉方案定稿与回归

- 锁定一套 token/字号/间距/卡片样式，不提供 `theme` 命令或主题菜单；`/structured on|off` 是唯一开关。
- 明暗由宿主 `--dsw-alias-*` 自动跟随；补对比度、密度、窄屏和 `prefers-reduced-motion` 回归。
- 验收：同一套视觉在明/暗、desktop 窗口宽度下都不溢出、不遮挡；没有主题选择入口。

### P2（2–3 天）：代码块与表格交互

- 代码块：复制按钮、语言切换（纯文本/高亮）、行号开关；复用宿主高亮，不打包 highlighter。
- 表格：横向滚动容器、复制为 Markdown/CSV、数值列右对齐（按列内容检测）；仍不搬 React 节点。
- 标题：hover 锚点链接（复制 `#标题`），用于长文导航。
- 验收：复制内容与源码一致；流式 30 秒不冻结；长表格 50 行不抖动。

### P3（2 天）：GenUI 分工与质量门

- 更新 host 注入规则：>8 行表格、图表、可交互表单 → `dsh-ui`；普通说明 → markdown。
- 视觉回归：12 条固定 prompt × 明/暗截图；检查对比度 AA、无横向溢出、无控制台错误。
- 打包：主题预览图、README、市场描述；`dsh.client` 仍需 `platform: web`。

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| 宿主内部 class 名变化（`_markdown_`、`md-code-block`） | 选择器用 `[class*="_markdown_"]` + `.md-code-block` 双保险；每次升级跑视觉回归；命中失败自动退化为原生样式 |
| 流式期间 DOM 改写导致内容冻结 | 只加属性，不改文本/节点；MutationObserver + rAF 合批；不在流式中间做 wrapper |
| 主题 token 不覆盖代码高亮色 | 复用宿主 `--dsw-alias-markdown-code-block*`（如果存在），否则用 `color-mix` 派生；不写死 hex 作为唯一来源 |
| 视觉层让回复变长/变重 | CSS 不增加内容；组件只加边框/间距；P3 用截图和 DOM 节点数做回归 |
| 用户想要不同风格 | 不提供主题菜单；视觉方案保持一套；文字规则用 `style.md` 覆盖；未来如扩展另开 opt-in 包，不进入主插件 |

## 已定

- 视觉方案：一套「工程蓝图」，不提供主题选择。
- 唯一开关：`/structured on|off`；不增加 `theme` 命令或 `visual` 配置。
- 个性化：`style.md` 只覆盖文字规则；视觉方案保持统一。
