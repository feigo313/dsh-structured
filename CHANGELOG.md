# Changelog

## 0.9.7 — 2026-10-26

- `BUILTIN_STYLE_TEXT` 新增金额/美元符号规则：用 `\$` 转义或反引号包裹，不写裸 `$...$`；避免被宿主 `singleDollarTextMath` 解析成公式。
- README 保留宿主 `singleDollarTextMath` 已知限制并注明 issue #2 已关闭；不改 host、不 patch app.asar、不改消息内容、不引入公式依赖。
- 测试断言规则存在，并用真实 DOM 确认 client 不改写 `$...$`。

## 0.9.6 — 2026-10-25

- first-glance 视觉层级：statement 标题 24px、去掉卡头灰色图标、表格行高与表头密度、`下一步` 无底色 + 橙色三角、标题/正文 1px 灰分隔线、表格结论去左边框；只改客户端 CSS，不改注入链路。
- client 视觉层改为增量扫描：MutationObserver 只重扫变更所在的 markdown 容器或新增子树，长会话与流式输出从整页 `querySelectorAll` 降到变更容器；首次加载仍全量扫描。
- 标题图标悬挂缩进：h2/h3 的 `::before` 图标改为悬挂缩进（h2 `padding-left:42px`、h3 `30px`，`text-indent:-30px`；图标自身 `text-indent:0`），长标题换行后续行与首行文字对齐（issue #2 第一部分）。
- 截图：01/06/07/08 换成 0.9.6 真实界面裁图（web profile 渲染），09/10 主题对照按 0.9.6 token 重做（非桌面实机）。

## 0.9.4 — 2026-10-24

- DSH 0.3.0-rc.1 兼容声明：`engines.dsh` 上限从 `<0.3.0-0` 放宽到 `<0.4.0-0`（否则 desktop 0.3.0-rc.1 的装配门禁会挡住本插件）；`dsh.compatibility.dshReleases` 补 `0.2.1-rc.3`、`0.3.0-rc.1` 为 compatible。
- 无功能改动。0.2.1-rc.3 / 0.3.0-rc.1 为**声明性兼容**：插件依赖的 systemPrompt / commands / configForms / plugins.bundle.config 均为宿主稳定服务面，未见破坏性变更公告，未逐项实测；实测后如有差异再适配或收紧。

## 0.9.3 — 2026-10-24

- 配置页主题分段：三个主题选项（DeepSeek / Codex / Anthropic）各带所代表主题的强调色——选项前 7px 圆点标识 + 选中态文字着色，明暗自适应（DeepSeek `#2563EB`/`#60A5FA`、Codex `#10A37F`/`#34D399`、Anthropic `#CC785C`/`#E8A087`，与视觉层三套 token 同源）。样式只作用于 `[data-dsh-structured-config]` 容器内，随配置页 slot 同生命周期注入/撤销。
- 截图：新增第 7 张 `assets/screenshots/11-config-page.png`（插件板块 → dsh-structured 详情页配置区实机截图，0.9.2 效果）；`screenshots.json` 与 README Screenshots 节同步。

## 0.9.2 — 2026-10-24

- 插件详情页配置区：client 注册 `plugins.bundle.config`（键 `dsh-structured`），`theme`/`visual`/`defaultEnabled`/`tailReminder`/`includeSubagents`/`genui` 六字段在 插件板块 → dsh-structured 详情页直接编辑；写入走 configForms 的 `set`（落到 active profile 的 Cordis patch），`writable=false` 时控件只读并提示。
- 背景：宿主不会从 Config schema 自动生成表单——配置页必须由插件自己的浏览器半侧注册（`dsh-client-ui-plugin-manager` slot 合同的 `plugins.bundle.config`/`plugins.row.config`）。0.8.2 引入 Config 起、直到 0.9.1，插件从未注册配置页，所以详情页一直没有设置项；本次按官方伴生包模式（`whileServed` + `slots.inject`）补齐。
- 防御：宿主 describe 未服务本命名空间、`react/jsx-runtime`/`dsh-client-ui-primitives` 缺失时静默不出配置页；配置页注入与主题/视觉联动分开挂 child inject，互不影响；headless/CLI 不加载 client 半区。
- 文档修复：README 安装节三处 `0.7.4.tgz` 过时引用改为通用写法，移除三个「（发布后）」括号，实装实测记录更新为 0.9.1；`.gitignore` 增加 `.v2c/`、`out/`。

## 0.9.1 — 2026-10-23

- 代码/diff 隔离：` ```diff `/`patch` 代码块、`[data-diff]`/`.md-diff`/GenUI diff 区域不套插件的 code/table chrome；diff 行色与宿主渲染保持原样。代码/diff 回复允许代码块或 diff 卡直接作首块，不强制标题卡。
- 设置中心：`theme`、`visual`、`defaultEnabled`、`tailReminder`、`includeSubagents`、`genui` 六个 profile 级 Config 字段，全部 `.volatile()`，带中英双语 description；标准 bundle 详情表单优先，不新增 React 依赖。
- `statusText` 显示主题与视觉层；client 订阅 `configForms` 的 theme/visual 变化；`/structured on|off` 仍只控制按会话提示词。
- 写入 active profile 的 Cordis patch；home patch/CLI overlay 优先，表单 `writable=false` 时不静默成功（README 说明）。`state.json` 仍只存会话提示词开关。
- 未做主题市场/自定义 CSS/按消息主题；未 push/publish/市场 PR。

## 0.9.0 — 2026-10-23

- 主题系统：新增 `theme` Config（deepseek/codex/anthropic，默认 deepseek）与三套明/暗 token；暗色改用宿主 `body[data-ds-dark-theme]`，删除 `[data-theme="dark"]`。
- client 通过 `configForms` 读取 theme，写 `body[data-dsh-structured-theme]`；视觉关闭时移除 style 与 `data-dsh-structured*`；configForms 缺失回落 deepseek/开启。
- 新增 `scripts/theme-contrast.mjs`（3×2 全组 ≥4.5）、`test/theme.test.mjs`；`--ds-code-bg`/`--ds-code-text` 落地；语义状态色改用 `--ds-success/warn/error`。

## 0.8.3 — 2026-10-22

- 提示词优先级加固：首段 markdown 标题卡即使后文使用 `dsh-ui` 也必须存在；`dsh-ui` 只能跟在标题卡与正文之后，不得用其 `title` 充当首卡，不得把结论/判断/风险/下一步做成 dsh-ui 组件；宿主默认要出 UI 时以插件规则为准。
- 尾部提醒同步强调「第一段必须是 markdown 标题卡，组件只能排在标题卡之后、不得充当首卡」。
- 背景：观察到报告型回复把 dsh-ui 当主卡、跳过标题卡；该会话的注入与视觉层均正常，属提示词优先级问题。

## 0.8.2 — 2026-10-22

- 视觉层从“始终开启”改为 profile 级 `visual` 配置（`Config` + `.volatile()`，默认 true）；通过 DSH 插件设置页（bundle 详情表单）切换，不再写共享的 `state.json`。
- `/structured on|off` 保持原义：只控制按会话的提示词注入；视觉层由 `visual` 控制，`/structured status` 会显示两者状态。
- client 通过 `configForms.get('dsh-structured')` 读取 `visual` 并启用/停用视觉层；`configForms` 不可用时保持默认开启，不阻断回复。
- 严格卡片识别：只认完整标签（结论/总结/答案、判断/决策、指标/数据、风险/注意/警告、下一步/行动/待办、验收/通过/完成、重点/关键）；前缀/复合词不染色；普通引用不再自动 lead；statement 仅第一块；GenUI 跳过。
- 新增 `@deepseek-ai/schemastery` peer/dev 依赖；`desktop-check` 允许宿主 schemastery import 并检查 `Config` 导出；版本 0.8.2。

## 0.8.1 — 2026-10-22

- 规则文本从“500 字硬上限”改为清晰度约束：标题即结论、按信息类型选组件、一段一主题、证据优先、短答不套卡、长答不设硬性篇幅上限。
- 表格优先 ≤5 行；信息确实多时用 `dsh-ui` 大表或拆表，不硬砍内容；不为了格式加内容，也不为了字数删信息。
- 同步 README、`docs/METRICS.md`、`docs/CARD-SYSTEM.md` 与测试断言；无运行时截断、无字数统计、无长度预算；不改 client/注入通道。

## 0.7.4 — 2026-10-21

- 发布准备：加入 `assets/screenshots/`（4 张）、`screenshots.json`、README Screenshots 与 npm/市场/GitHub Release 安装说明。
- `npm pack` 排除 `docs/RE-AUDIT-REPORT.md`、`docs/PUBLISH-READY.md` 与 `docs/RELEASE-NOTES-0.7.4.md`；打包内容 34 文件。
- 不声明 `@deepseek-ai/*` peerDependencies：插件只使用 host service，不直接 import 官方包；README 明示 `engines.dsh`/`dsh.compatibility` 是 advisory，`evaluatePluginCompatibility` 的 peer 门禁不生效（P2 风险）。
- 市场 YAML 与 fork/PR 命令放在 `marketplace/`，不提交。

## 0.7.3 — 2026-10-21

- 多段落首卡也识别为 statement：首段 `<strong>` 后带正文不再要求 `<strong>` 独占整段。
- 文档数字对齐 0.7.x：标签 13px、标题 16px、状态列 68px；移除打包文档里对 `FULL-TEST-PROMPT.md` 的引用。

## 0.7.2 — 2026-10-21

- 一页段落（`<p><strong>title</strong><br>body</p>`）也能识别为 statement 卡，不再要求两个 `<p>`。
- 删除 `blockquote[tone="info"]` 对主题 brand 的覆盖；卡片强调色固定为 `#2563eb`（暗色 `#60a5fa`）。
- GenUI 只信 `clientModules` 实时图；不回退可能被继承污染的 profile env。
- 打包文档清除本机绝对路径。

## 0.7.1 — 2026-10-21

- 首卡视觉：无标签标题卡标题 16px/700；模型只写普通 blockquote 时，client 把首段升级为 16.5px/600 的 lead 卡（图标 + 淡色表面 + 4px 强调边）。
- 标题上限放宽到 ≤60 字，避免长结论被迫退化为普通引用；表格仍 ≤5 行，正文 ≤500 字。
- 强调色固定为 `#2563eb`（暗色 `#60a5fa`），不再跟随主题的灰色 brand token。

## 0.7.0 — 2026-10-21

- P0: 首卡改为无标签标题卡（`> **一句标题**`），不再与 `~/.dsh/AGENTS.md` §7 的「No label」冲突；`statement` 卡片由 client 识别。
- P1: `measure-prose` 首屏分类器计入卡片，修复 16.7% 假阴性。
- P1: `state.json` 按 mtime 缓存热更新，外部编辑下一轮生效。
- P1: `/structured` 明确只控制提示词注入；状态文本标注视觉层始终开启。
- P1: 表格单元格 18px 留白、表头 11px/700、三列宽度 24/22/54、状态列 68px。
- P1: GenUI 自动检测优先 `clientModules`，不再被继承的 `DSH_PROFILE_DIR` 污染。
- P1: 标题 ≤24 字、表格 ≤5 行、正文 ≤500 字；可复制内容强制代码块。
- P2: 增加 `.gitignore`、`repository` / `homepage` / `bugs` 元数据，准备 GitHub/npm 发布。

## 0.6.3 — 2026-10-21

- 表格单元格留白与表头字号修正。

## 0.6.2 — 2026-10-21

- 增加「可复制内容用代码块」规则；代码块右上角提供复制按钮。

## 0.6.1 — 2026-10-21

- 卡片标题 16px/700、标签 13px、正文 15.5px；修正表格留白。

## 0.6.0 — 2026-10-21

- 卡片 SVG 线图标、状态列软底、表格 lead、单列状态着色。
