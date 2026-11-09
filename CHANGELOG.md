# Changelog

## 1.0.13 — 2026-11-10

- 修复裸 JSON 信封：模型偶尔不包 ```persona 围栏、直接把 JSON 写在正文里，此前整条回复按普通文本显示。现在从严识别「回复以 { 开头 + 含 ≥3 个合同特征键 + ≤8KB + 通过合同校验」的裸信封，还原成正常三卡，原始 JSON 从页面移除；不满足条件保持普通排版，正文贴 JSON 示例不会被误吃。
- 回归：裸 JSON 段落 → 三卡 + 零原始 JSON + lead/risk 可见。

## 1.0.12 — 未发布（攒批）

- 修复「降级就摊原始 JSON」：persona 块字段不合合同（例如 model 把 table 的 rows 写成 `状态`）时，
  1.0.10/1.0.11 会保留整段原始 JSON 加一句提示，卡片全丢。现在改为宽松还原：
  能解析出 lead / body / suggestions / risk 就照常出三卡；table 的 rows 缺失时，
  从同层的其它数组还原（含摊平成一维的数组按表头宽度切行），实在还原不了才加一句「表格未能渲染」。
  原始 JSON 不再展示给用户。
- 宽松还原同样不再截断超量内容：超过 5 条建议、超过 20 行的表格全部保留展示。
- 降级逻辑收口为一条规则：**能还原就出卡，还原不了退普通段落，任何情况都不展示原始 JSON**。
  原来三个出口（冲突保留原文 / 宽松出卡 / 正则抢救成段落）各自一套判断，行为不一致；
  现在只有一个出口：逐个 persona 块做宽松还原，第一个出卡，其余按正文展开，缺表格加一句提示。
- 截断回复不再整段消失：字符串没闭合时把该字段的残文本保留下来（此前只剩一句提示，正文全丢）。
- 未定义字段（如多一个 `extra`）不再整条降级，内容完整即出卡。
- 回归：table 字段不合合同的实机载荷断言「三卡 + 表格 + 无原始 JSON + 重复渲染 DOM 稳定」。

## 1.0.11 — 2026-11-08

- 修复降级提示重复：persona 块解析失败且原文含 `table` 时，渲染器会保留原文并在前面加一句提示，
  但提示每次重渲染都插一次，实机一条回复出现 10 条重复提示。现在按 `data-dsh-plugin-generated` 去重，
  一条消息只保留一句提示，原始代码块仍然保留（不丢内容）。
- 回归：同一消息连续 decorate 10 次，提示恒为 1 条、原始块仍在。

## 1.0.10 — 2026-11-07

- 修复「回复一半就断」：模型在中文里直接写 ASCII 双引号（`"这份"低"不是系统的功劳"`）时，persona JSON 断在第一个内层引号上；1.0.9 的字段抢救只能抢到引号之前，渲染出来的三卡看起来像输出被截断。现在解析失败时先做 `repairInnerQuotes`——按结构判断字符串内的引号（维护对象 / 数组栈、区分键串与值串，值串只认其后紧跟 `,` `}` `]` 或结尾的引号为收尾），其余按内容引号转义，整段 JSON 恢复正常解析，字段完整渲染。
- 同一修复覆盖另外两类内容损失：① 值里出现 `{"a":1}` 这类片段时，内层引号后跟冒号不再被误判成键的收尾引号，lead 不再被砍到 `{` 为止；② 字符串里裸写换行 / 制表符等控制字符先转义，table 单元格含换行的回复不再丢掉整张表。
- 字段抢救路径同样先修引号再抢救：语法畸形且 version 非法等走到降级的情况，正文不再被裸引号截断成半句。
- 明确没有字数限制：合同与渲染器都不截断文本，之前的半句是 JSON 断在裸引号上、抢救逻辑只拿到前半段。
- 合同冲突不再吞内容：多个 persona 块、或一个块里塞两个顶层对象时，旧逻辑会删掉第一块 / 只渲染第一个对象。现在这两类判为冲突并保留全部原文，只加一句安静提示，不做任何删除。
- 回归：实机原文（lead / body / risk 各含未转义引号）、值内花括号、table 单元格裸换行、抢救路径完整性、多个内容块与多对象保留原文。
- 引号修复升级为回溯候选：内层引号后紧跟 ASCII `,` `]` `}` 时单次结构判定仍会误当收尾（`"他说"好",然后走了"`、table 单元格里的 `["X","Y"]`）。现在解析失败时回溯尝试把可疑引号改判为内容引号，并按「首尾带引号字符串 → 引号奇数个 → 转义数」排序挑最合理结果。
- 去重：抢救结果拿不到 `table` 时不再渲染三卡，改为保留原始块 + 一句提示——宁可丑，不许把整张表静默丢掉。
- 抢救路径的 suggestions 上限从 5 放宽到 20：超过合同上限 5 条时降级展示，但一条都不丢。
- 逗号分隔的两个顶层对象也判为合同冲突（原来只认紧邻或换行分隔），避免只渲染第一个。

## 1.0.9 — 2026-11-06

- 畸形 persona JSON 的可读降级：1.0.8 的 fail-open 只是把原始 JSON 留在页面上，显示成一大块代码，比错误卡更难读。现在解析失败时先做字段抢救——抽出 `lead` / `body` / `suggestions` / `risk`（含数组提前闭合后掉在外面的裸字符串），凑齐合同就按正常三卡渲染；凑不齐才降级成普通段落，原始 JSON 代码块一律移除。
- 覆盖场景：`suggestions` 数组提前闭合后写成 `"删除：…"` 裸串（video session 原样）、中途闭合、尾部多余 `}` 等语法类畸形。
- 校验失败但语法合法（多字段、超限、version 不符）仍降级为普通排版，不硬套卡片。

## 1.0.8 — 2026-11-06

- 合同错误卡下线：模型写坏 persona JSON（缺冒号、花括号错位、数组提前闭合等）时，不再把整条回复替换成「内容合同错误」卡。渲染器现在一律降级为普通排版——原文完整保留，只在控制台留一条 `console.warn` 供排查。用户最多看到一次「没套上卡片」，不会看到内部诊断。
- 覆盖的畸形形态：`Expected ':' after property name`、`Expected ',' or '}'`、`Unexpected non-whitespace character`，以及此前 1.0.7 修的中途闭合。修复尝试失败的块同样降级，不再报错。
- 回归：缺块 / 非法块 / 中途闭合 / 尾部多余 } / 不可见字符全部断言「legacy + 原文保留 + 零错误卡」。

## 1.0.7 — 2026-11-06

- 修复 persona JSON「中途闭合」被判死：模型把 `conclusion` 提前闭合、`body` 落到根上，body 后面多出的 `}` 提前关掉根对象，后续 `table` / `suggestions` / `risk` 变成尾随内容（`Unexpected non-whitespace character after JSON at position N`）。现在解析失败时会在该位置附近尝试删掉一个错位 `}`，并把根级 `body` 挪回 `conclusion.body`，通过内容校验即正常渲染；否则仍走错误卡并保留原文。
- 修复设置页两个 tab 宽度不一致：语气风格页根节点继承了 `.dss-config` 的 `max-width:760px`，比结构化输出窄一截；上限改为 100%，与宿主表单同宽。
- 回归：中途闭合（table / normal 两种 kind）用例；既有尾部多余 `}`、不可见字符、语义非法仍走 error 的用例全部保持。

## 1.0.6 — 2026-11-06

- 修复非会话界面被内容合同误判：打开第三方插件的设置页/详情页时，市场页会把项目 README 渲染成 markdown，插件此前把这段 README 当成 assistant 回复，于是在插件描述上方弹出一张「内容合同错误 / 未找到 assistant 消息容器」卡。现在不在任何会话容器内的 markdown 一律按外部界面处理——只走视觉层，不套内容合同、不挂身份头、不显示错误卡，原文完整保留。
- 会话内但定位不到 assistant 容器时改为 fail-open 走 legacy 排版，不再把内部诊断信息暴露给用户。
- 回归：新增「插件设置页渲染 README（标题 / 引用块 / 代码块 / 徽章）」用例，锁定非会话界面零错误卡、零身份头。

## 1.0.5 — 2026-11-05

- 修复 persona JSON 尾部多余字符导致整条回复判死：模型偶尔在合法 JSON 后多写 1–3 个 `}`，解析报 `Unexpected non-whitespace character after JSON at position N`。现在按 position 截断、去尾部 `}`（最多 3 个）重试，任一候选通过内容校验即正常渲染，并记 console.warn；全部失败才显示错误卡，原文保留。
- persona 合同新增一条：整个回复只有一个 JSON 对象，结尾只写一个 `}`，不要重复闭合。
- 回归：尾部 `}` ×1/×2/×3 三档用例，截断后语义非法仍走 error 卡。

## 1.0.4 — 2026-11-04

- 发布前两个严重 bug 修复（1.0.3 未发布，修复并入本版）：
  - 合法 persona JSON 被判死：模型输出里的不可见字符（ZWSP / ZWNJ / ZWJ / LRM / RLM / BOM / U+180E / NBSP / U+2007 / U+202F / U+2028 / U+2029 / NEL / VT / FF）会让 JSON.parse 报错并把整条回复替换成「内容合同错误」卡；现在解析前按码位剥离这些字符，解析失败时原文保留在错误卡下方。
  - 块外自然正文被静默删除：persona 块前后的正文现在保留在卡片下方；persona 块与其它代码块共存时不再误报「persona 内容块必须唯一」，只有多个 persona 块才算冲突。
- 行尾：`.gitattributes` 钉死 LF，`scripts/build.mjs` 输出折行尾，`lib/` 与 `src/` 跨检出保持逐字节一致。

## 1.0.3 — 2026-11-04

- persona 内容合同：模型只交一个 `persona` fenced JSON（version 1；normal / short / table 内容槽位），身份头、前缀、三卡（结论 / 建议 / 风险）、收尾由插件 `renderPersonaContent` 固定渲染；模型不再输出 Markdown 卡片。
- 人格默认开启：新配置默认 `personaEnabled=true`；显式关闭的配置升级后保持关闭。
- 语气字段扩为五项：昵称（userName，模型怎么称呼你）/ 自称（selfName，模型怎么称呼自己）/ 开场（prefix）/ 性格（style）/ 收尾（suffix）；昵称、自称 ≤20 字。
- 模板含头像：人格模板保存 / 恢复携带当前头像，默认模板烘焙内置鲸鱼头像。
- 渲染兜底：缺 persona 块走 legacy 普通排版并保留原文（缺块不报错）；块外自然内容容忍，不再弹「内容合同错误」；多块、JSON / 字段非法才显示错误卡；流式半截先保留原内容，完成且仍非法才报错。
- persona 合同压缩：注入文本从 2,157 字压到约 1,380 字。
- 人格只注入根会话（lead）：子代理（origin=subagent / delegationDepth>0 / parentSession）、委派、聊天 fork 会话硬排除，不受 `includeSubagents` 影响；header 缺失 fail-open。
- 发布前修复 ①（合法 persona JSON 被判死）：模型输出里的不可见字符（ZWSP / ZWNJ / ZWJ / LRM / RLM / BOM / U+180E / NBSP / U+2007 / U+202F / U+2028 / U+2029 / NEL / VT / FF）会让 V8 报 `Unexpected non-whitespace character after JSON` 并把整条回复替换成错误卡；现在解析前按码位剥离这些字符再试，报错时原文保留在错误卡下方。
- 发布前修复 ②（块外正文被静默删除 / 误报块冲突）：模型写在 persona 块外的自然正文不再被清掉，渲染后保留在卡片下方；persona 块与其它代码块共存不再误报「内容块必须唯一」，只有多个 persona 块才算冲突。

## 1.0.0 — 2026-10-31

- v5 回复皮肤：软面卡片台（12px 圆角 + 3px 左条 + 同构渐变面）；结论 / 下一步 / 风险线标题；表格蓝 tint 表头、26% / 18% 列宽、首列 600 墨字、三色状态签；代码浅色卡 + 线标题 + 双方框复制钮；深色卡面 / 表头 / 代码面 / 状态签全量适配；单一强调色 `#2563eb`。
- 语气设置页：去掉基础 / 进阶页签与 JSON 编辑；档案行（88px 头像可上传并压 128px JPEG dataURL + 名称 + 签名）+ 开场 / 性格 / 收尾 + 计数 + 64 格 emoji + 固定规则行 + 保存行 + 样式预览（普通 / 表格 / 代码）。
- Host：Config 增加 `personaEnabled/persona/personaRevision/personaName/personaSignature/personaAvatar`；独立 tone section（order 10250）；保存一次原子写六字段，旧宿主 fallback 读回 + 回滚；tone@1 schema / 64KB / 严格白名单不变，默认鲸鱼 style 清为纯语言描述。
- 模板只保留默认蓝色大肥鱼 + 用户另存；行内删除、删空提示、恢复默认；tone 注入 / skipIn 语义不变。
- 鲸鱼娘模板随包：`docs/1.0-PERSONA-WHALE.json` + `LICENSE-WHALE` + `NOTICE-WHALE`；CC-BY-NC-SA-4.0，非官方，不打包美术；构建从 JSON 单一源注入 host/client。
- 1.0.0 状态收口（2026-11-04）：桌面实机三主题×明暗截图、两会话 A 保存→B 即时生效、渲染兜底与身份头 live 抽查已完成；隔离 temp cwd P01–P10 基线与 beta/default-on 用户 gate 仍未执行；发布走 1.0.3。

## 0.9.9 — 2026-10-26

- 1.0 人格化 spec/schema：`persona.md` 追加层、结构规则始终由 base 注入、`style.md` 保留整份覆盖、profile 级、fail-open、读取顺序/优先级/长度建议/失败回退/迁移/隐私写入 `docs/1.0-PERSONA-SPEC.md`。
- 0.9.x 不实现人格：不加用户入口、不改设置页、不做人格市场/编辑器/预设包；只加三组 gate 夹具与 `docs/1.0-GATE.md`。
- Gate 未执行（0 名用户），0.9.9 标 **NO-GO / pending**；不排 0.9.10。最终 0.9 记录见 `docs/0.9-FINAL-RELEASE.md`。

## 0.9.8 — 2026-10-26

- 0.9.6 first-glance 视觉布局/字号/卡片结构冻结；只修复语义色冲突：Anthropic warn 从 `#92400E/#E0A458` 调整为 `#806000/#EAB308`，与 accent `#CC785C/#E8A087` 拉开 hue 距离；Codex 保持 `#10A37F/#34D399` 与 success `#116329/#3FB950`。
- 新增 `scripts/theme-hue-distance.mjs`（阈值 25°）与 12 项 accent/status hue 检查；60 项对比度仍全过。
- 新增 `docs/1.0-BASELINE.md`：10 条固定 prompt、注入 token 口径、首屏结构化率/散文率口径、`style.md` 整份覆盖迁移说明；实际 10-prompt 模型运行和 3×2 桌面截图未完成，明确标未验。
- 版本 0.9.8；只修 P0/P1，不加新功能。

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
