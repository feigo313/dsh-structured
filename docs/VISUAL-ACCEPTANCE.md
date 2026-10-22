# 12 条 prompt 视觉验收方案（v0.7.3）

状态：设计稿，未执行。执行后把计分表写进 `artifacts/visual-<stamp>/scorecard.md`，本文件只定义方法与门槛。

> **结论**
> **这是 12 个受控视觉态，不是 12 个随机问题**
> 每条 prompt 只负责逼出一种组件形态；渲染门与生成门分开判，避免模型这一次没按格式写，就被记成 CSS 坏了。截图是主证据，DOM 只做确认。

## 1. 边界

- **测什么**：desktop 应用内，0.7.3 的卡片、表格、状态、代码块、宽窄屏与明暗主题的渲染结果。
- **不测什么**：回答内容是否正确、注入是否命中、流式性能、卸载残留——那些在 `TASK.md` / `ACCEPTANCE.md` 的验收项，不重复。
- **与旧 12 条的关系**：T4 的 12 条是内容话题，服务散文率对照；本套是视觉探针，服务组件覆盖。两套不要混算，也不要用本套的通过率去替代散文率。
- **判定原则**：一条回复可以内容很差但视觉通过；也可以内容很好但视觉挂。两类问题分开记。

## 2. 用例

### 2.1 原文（12 行，行号即用例号；每行单独发一条，不要一次发 12 行）

```text
pnpm 和 npm 二选一，给结论和一张不超过 4 行的对比表。
给我这版的三个关键数字：测试通过数、注入命中率、散文率；没实测的标待验证，先给判断。
宿主下次升级把 markdown class 改名，会怎样？影响和排查路径。
把 Phase 2 剩余工作拆成接下来 3 步，每步一个验收信号。
只看现有证据，这版能发吗？缺什么，一条条列。
一句话：插件会改工具权限吗？
把注入、开关、fail-open、卸载残留四项检查列成状态表，没验证的标待做。
用 12 行的表列出你建议的视觉验收用例：编号、目标组件、判定门、压力条件。
给一段 PowerShell：截当前屏幕存到 artifacts\shots，文件名带时间戳。
从打包、安装、验证到回滚，给我 5 步，每步一句验收信号。
对比表格、卡片、时间线、代码块四种呈现方式：适用内容、扫读优势、代价、800px 窗口表现。
把 0.6 → 0.7 → 0.8 的发版节奏做成时间线，标出每版的验收门。
```

### 2.2 期望矩阵

| # | 目标视觉态 | 必须看到 | 反模式（出现即记缺陷） |
| --- | --- | --- | --- |
| P01 | 判断/决策卡 + 对比表 | 一句明确选择；≤4 行表；表前 `**表格结论：**` | 两段散文收尾；表格无前导；建议含糊 |
| P02 | 指标卡 | 3 个数字紧凑成组；未实测项 `⚠️ 待验证` | 编造实测值；把 3 个数字铺成 3 段 |
| P03 | 风险卡 | warn 色卡；写清影响 + 触发条件；排查路径 | 全篇中性色；只说“可能有问题” |
| P04 | 下一步卡 | next 卡 + 3 步；每步一个验收信号 | 超过 2 个强调块；步骤没有验收信号 |
| P05 | 验收卡或风险卡 | 明确“能/不能发”；缺项逐条；状态符号 | “应该可以”式结论；缺项与证据脱节 |
| P06 | 短答（负控） | ≤2 句；0 卡、0 表、0 列表 | 套结论卡；为凑格式加清单 |
| P07 | 状态表 | 4 行；状态列 `✅/⚠️`；未验证写待做 | 全 ✅ 伪造；状态写成普通文字 |
| P08 | 长表 | 12 行 4 列；表头可辨；长表不撑破页面 | 拆成多张表；行数不足；横向溢出 |
| P09 | 代码块 | `powershell` 语言标签；banner 贴合；复制可见；长行不裁 | 裸围栏；语言标签缺失；代码被截断 |
| P10 | 编号步骤 | 1–5 步；每步一句验收信号；列表 marker 清晰 | 用表格代替步骤；卡片超过 2 个 |
| P11 | 宽表 + 窄屏 | 5 列表；800px 下可读（收缩或容器内滚动） | 页面级横向滚动；列被挤成竖排 |
| P12 | GenUI / 时间线 | `dsh-ui` 组件与 markdown 共存；或 fallback 表 | 同一内容双渲染；组件内被套卡片样式 |

## 3. 判定门

### 3.1 渲染硬门（任一适用用例失败 = S1，禁止发版）

| 门 | 判据 | 方法 |
| --- | --- | --- |
| R1 卡层级 | 标签 13px；标题独立成块、16px/700；正文 15.5px；普通首段走 16.5px/600 lead 兜底 | DOM 测字号；无 DevTools 时只判层级（标签 < 标题 < 正文），字号记未验证 |
| R2 热点预算 | 强调块 ≤2；无卡中卡；结论不在普通段落重复一遍。强调块 = 卡片 blockquote + 带色 callout，不含表格与代码 | 原文 + 截图 |
| R3 表格 | 表前一行 `**表格结论：**`；无竖线；表头底色可辨；状态只染单元格/行首，不整行铺色 | 原文 + 截图 |
| R4 状态 | ✅/⚠️/❌ 字形保留；色不是唯一语义；状态文字对比度 ≥4.5:1 | DOM 取色；无 DevTools 时目检并标未验证 |
| R5 代码 | banner 与代码体贴合；语言点色正确；复制控件可见不压字；长行（>120 字符）不裁切 | 截图 |
| R6 布局 | 1440 与 800 宽均无页面级横向滚动；卡片不出界；表格要么自适应要么容器内滚动 | 截图 + `scrollWidth` |
| R7 主题 | 明/暗下卡片边界、表头、代码块、状态色都可辨；无写死白底 | 明暗成对截图 |
| R8 隔离 | `dsh-ui` 区域内无 `data-dsh-structured-*`；`<html data-dsh-structured="active">`；控制台 0 error | DOM + 控制台 |

### 3.2 契约门（未达记 S2）

| 门 | 判据 | 门槛 |
| --- | --- | --- |
| C1 首屏主卡 | 回复第一块就是卡（P06 豁免） | ≥9/11（82%） |
| C2 表格前导 | 凡 ≥2 行表格，前一行有 `**表格结论：**` | 100% |
| C3 状态符号 | 凡状态行/状态表，保留 ✅/⚠️/❌ | 100% |
| C4 代码语言 | 凡围栏代码块，有语言标签 | 100% |
| C5 短答克制 | P06：0 卡、0 表、≤2 句 | 1/1 |
| C6 篇幅 | 不设硬性字数上限；长回复信息完整、不因字数删信息（人工抽查） | 100% |

> 目标组件命中率（实际出现的卡型是否等于期望）只**报告**，不单独判失败；低于 8/12 时复盘 prompt 与注入契约，不要直接改 CSS。

### 3.3 判定

- **PASS**：R1–R8 全部适用用例通过，C1–C6 全达，无 S1。
- **PASS WITH DEFECTS**：R 全过，C 差 1–2 项，只有 S2/S3。
- **FAIL**：任一 R 失败，或 C1 < 9/11。

## 4. 执行协议

### 4.1 固定条件

- 版本：0.7.3（与 `package.json` 一致）；若 desktop 已升级，先记录实际版本再跑。
- 窗口 1440×900、缩放 100%；窄屏组改 800×900。
- 同一模型；从输入框模型名抄进报告，不猜。
- 每条 prompt **新开会话**，不在同一会话连发；避免上下文影响首屏。
- 跑前 `/structured status`，记录开关、style.md、GenUI 检测三项。

### 4.2 单条流程

1. 新建会话，原样粘贴 prompt，等流式结束、工具卡折叠。
2. 把**这条回复的顶部**滚到视口顶部（不是页面顶部），不再滚动。
3. 截 `pNN-light.png`；需要时切暗色/窄屏重截。
4. 从会话 JSONL 的 `final.text` 取原文，供文本门与字数统计。
5. 在计分表填 `P/F/–`（– 表示该门不适用）。

### 4.3 截图预算（24 张）

| 组 | 用例 | 数量 |
| --- | --- | --- |
| 明色主图 | 全 12 条 | 12 |
| 暗色对照 | P01 P03 P07 P08 P09 P11 | 6 |
| 窄屏 800 | P08 P11 P12 | 3 |
| 插件前基线 | P01 P03 P08（无插件 profile） | 3 |

命名：`artifacts/visual-<YYYYMMDD-HHMM>/p01-pnpm-light.png`，同目录放 `scorecard.md`。

> 基线必须是**没装本插件**的 profile：只执行 `/structured off` 仍有 CSS，测到的是生成差异，不是视觉差异。没有干净 profile 就把基线记 `N/A`，不要伪造。

## 5. 计分表

```markdown
# 视觉验收 <YYYY-MM-DD> · dsh-structured <version>
模型：<composer 显示名> · 窗口：1440/800 · 主题：light/dark · GenUI：on/off
结论：PASS / PASS WITH DEFECTS / FAIL

| # | 目标视觉 | 适用门 | 结果 | 缺陷 |
| --- | --- | --- | --- | --- |
| P01 | 判断卡 + 表 | R1 R2 R3 R6 C1 C2 C6 | | |
| P02 | 指标卡 | R1 R2 R6 C1 C6 | | |
| P03 | 风险卡 | R1 R2 R7 C1 C6 | | |
| P04 | 下一步卡 | R1 R2 C1 C6 | | |
| P05 | 验收卡 | R1 R2 R7 C1 C3 C6 | | |
| P06 | 短答负控 | R2 R6 C5 | | |
| P07 | 状态表 | R1 R3 R4 R7 C1 C2 C3 C6 | | |
| P08 | 长表 | R3 R6 R7 C1 C2 | | |
| P09 | 代码块 | R5 R6 R7 C1 C4 | | |
| P10 | 步骤 | R2 R6 C1 C6 | | |
| P11 | 宽表/窄屏 | R1 R3 R6 C1 C2 C6 | | |
| P12 | GenUI 隔离 | R8 R6 C1 C6 | | |
```

## 6. 前后对照与阅读效率

结构增量在这批短问题上可能本来就是 0（`docs/METRICS.md` 已披露同 prompt 配对为 0）。所以对照看**视觉增量**：

| 指标 | 基线（无插件，预期） | 目标 |
| --- | --- | --- |
| 卡壳（边框/图标/eyebrow） | 0/3 | 3/3 |
| 标题独立层级 | 0/3 | 3/3 |
| 表格前导有样式 | 0/3 | 3/3 |
| 状态行着色 | 0/3 | 3/3 |
| 首屏可扫读组件数（卡+表） | 记录 | ≥2 |
| 强调块数 | 记录 | ≤2 |

阅读效率只用**代理指标**：首卡字符距离、首屏组件数、强调块数、表格前导率。不测眼动、不计时，也不写“节省 X 秒”。

## 7. 缺陷与停止规则

| 级别 | 定义 | 处理 |
| --- | --- | --- |
| S1 | 渲染断裂：卡没样式、标题塌成正文、溢出/裁切、对比度不达标、GenUI 双渲染 | 停跑，修完重跑全套 |
| S2 | 契约未达：无卡、>2 卡、缺表格结论、缺状态符号、代码无语言、超 500 字 | 记录，修完只复跑相关用例 |
| S3 | 观感：间距、图标语义、色调偏差 | 记录，可延后 |

- 每个用例只按第一次结果计分。模型没按格式写，就是没写，不靠重跑刷到通过；诊断性重跑单独记，不计入分数。
- 同一道门在 2 个以上用例失败，停止全量跑，先修根因——否则后面 10 张截图都是废证据。

## 8. 跑之前必须确认的已知缺口

1. **卡标题层级**：0.7.3 起，one-p 首段由 16.5px/600 lead 兜底；首段带 `<strong>` 的 one-p 由 statement 兜底；R1 不再要求两个 `<p>`。
2. **GenUI 是否安装未知。** 以 `/structured status` 为准；未装时 P12 记 `N/A`，不能算通过，覆盖数写 11/12。
3. **DevTools 不一定可用。** desktop 是 Electron，若打不开控制台，R1/R4 退化为 200% 截图目检，R8 的控制台项记“未验证”，并在报告方法列写明，不要写成测量。

## 9. 附录：命令

截图（每条前改 `$name`）：

```powershell
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$name = 'p01-pnpm-light'   # 每条截图前改这里
$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
$dir = Join-Path (Get-Location) "artifacts\visual-$stamp"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)
$bmp.Save((Join-Path $dir "$name.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
```

文本门与散文率：

```powershell
node scripts/session-inspect.mjs --session <id> --replies --json
node scripts/measure-prose.mjs --sessions <12 个 id，逗号分隔> --json
```

DevTools 控制台自检（在最后一条回复渲染完后执行）：

```js
(() => {
  const roots = [...document.querySelectorAll('[class*="_markdown_"]')];
  const root = roots[roots.length - 1];
  if (!root) return { error: 'no markdown root' };
  const cards = [...root.querySelectorAll('blockquote[data-dsh-structured-card="1"]')];
  const px = (el) => (el ? getComputedStyle(el).fontSize : null);
  return {
    root: document.documentElement.getAttribute('data-dsh-structured'),
    cards: cards.length,
    detail: cards.map((card) => {
      const ps = [...card.children].filter((el) => el.tagName === 'P');
      return {
        paragraphs: ps.length,
        labelPx: px(card.querySelector('p:first-child > strong:first-child')),
        titlePx: px(card.querySelector('p:nth-child(2) > strong')),
        bodyPx: px(ps[ps.length - 1]),
      };
    }),
    tableLead: root.querySelectorAll('[data-dsh-structured-lead="table"]').length,
    statusTables: root.querySelectorAll('[data-dsh-structured-status-table="1"]').length,
    codeLangs: [...root.querySelectorAll('[data-dsh-structured-lang]')].map((el) => el.getAttribute('data-dsh-structured-lang')),
    docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
})()
```
