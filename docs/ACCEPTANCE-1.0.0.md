# dsh-structured 1.0.17 验收（未发布）

[1.0.17 · 代码/构建] `npm test` 110/110；`npm run build` 完成；pack 58 文件 / 2411503 B / unpacked 3155523 B（较 1.0.16 基线 +477 / +2283）。三处视觉修正：① 代码块 banner 改 `position:static`（宿主 `_bannerWrap` 是 sticky + 不透明底，我们清掉了底色，长代码块滚动时标题会叠字）；② 「代码 · 」前缀改为条件显示（只在 `data-dsh-structured-lang` 存在时输出，避免无语言块显示「代码 · 代码块」）；③ `[class*="_fenceSeat"]:has(> .dss-code){margin:0}` 让卡片 14px 间距不再被宿主的 16px 折叠吞掉，宿主其它块保持原样。回归断言锁住这三条。

[1.0.16 · 代码/构建] `npm test` 109/109；`npm run build` 完成；pack 58 文件 / 2411026 B / unpacked 3153240 B（较 1.0.15 基线 +1587 B，来自 fenceSeat 修复与 seated fixture）。rc.2 起 `.fenceSeat` 包裹层的「没包裹住」已修：块外正文过滤改为排除子树含 persona 块的节点，错误降级路径清空 seat；回归 fixture 按 rc.2 真实 DOM（fenceSeat + Rp banner「代码块」+ pre>code>span.line）构造，断言出卡 3 张 / 零 `.md-code-block` / 零空 seat / 块外正文存活。rc.3 兼容性实测：渲染契约哈希类名与 rc.2 逐项相同、`systemPrompt.section` / `getSectionOrder` 签名不变、隔离 DSH_HOME 下 `plugin add dsh-structured@1.0.15` PASS、`--dump-config` exit 0。

[1.0.14 · 字体跟随] 卡片 / 正文 / 标题 / 表格 / 代码字号改用宿主 ui-theme 变量（--dsh-content-font-size / --dsh-code-font-size），字体栈改用 --dsh-font-family-text / --dsh-font-family-code；未设置时逐像素等价（style-gate ok:true）。设置页字体族跟随、字号不变。

[1.0.15 · 代码/构建] `npm test` 108/108；`npm run build` 完成；`desktop-check` 全 PASS；`theme-contrast` 60；`theme-hue-distance` 12；`lib` 由 src 构建并注入鲸鱼娘 JSON；pack 58 文件 / 2409439 B / unpacked 3147306 B（1.0.3 起 7 张截图全部为本地部署实机高清图，体积较旧版明显上升属预期；代码与文档部分与 1.0.2 相当）。仓库新增 `.gitattributes` 统一 LF，`scripts/build.mjs` 构建时把 CRLF 折成 LF，保证 `lib/` 与 `src/` 字节一致、pack 体积不随检出状态漂移；本地实机截图产物统一 `*-local.png` 命名并被 `.gitignore` + package.json `files` 双重排除，不进 git 也不进包。pack 数字为**本地 Windows 基线**；`test/pack.test.mjs` 对 size/unpackedSize 按 ±16 KB 容差校验（tar 条目元数据随平台差异 ~137 B，Linux CI 与本地内容相同、字节数不同），文件数与必含/排除清单仍为精确断言。

[1.0.10 · 字段内裸引号修复] 模型在中文里直接写 ASCII 双引号（“这份“低”不是系统的功劳”）时，JSON 断在第一个内层引号上；1.0.9 的字段抢救只能抢救到引号之前的半句话，卡片看起来像回复被截断。现在解析失败分支先做 repairInnerQuotes：按结构判断字符串内的引号，若其后第一个非空白字符不是逗号、右花括号、右方括号或冒号，就按内容引号转义，整段 JSON 恢复正常解析、字段完整渲染。回归用例直接用实机原文（lead / body / risk 各含未转义引号）。

[1.0.12 · 降级不再摊 JSON] 字段不合合同（table 里写成 `状态`、多一个 `extra`、建议超 5 条、表格超 20 行）时，旧逻辑整条降级并保留原始 JSON，卡片全丢。现在走宽松还原：能读到 lead/body/suggestions/risk 就出三卡，table 的 rows 从同层数组还原（含一维摊平按表头宽度切行），实在不行只加一句「表格未能渲染」，原始 JSON 不再展示。超量建议与行数全部保留。

[1.0.11 · 降级提示去重] persona 块解析失败且原文含 `table` 时，渲染器保留原始块并加一句提示；提示此前每轮重渲染都会插入一次（实机一条回复出现 10 条），且提示句本身不带判重。现在按 `data-dsh-plugin-generated` 去重，同一消息恒为 1 条提示，原始内容不删。

[1.0.12 · 降级规则收口] 全库只有一条降级规则：能还原出 lead 就出卡（表格能还原就还原，还原不了加一句「表格未能渲染」），还原不了才退普通段落；**任何分支都不把原始 persona JSON 摊给用户**。多个内容块/多个对象：第一个出卡，其余按正文展开并各加一句提示；截断的字段保留残文本。不变量探针（.tools/probe-invariants.mjs）覆盖 12 类载荷：无原始 JSON 泄漏、关键内容不丢、重复渲染 DOM 稳定。

[1.0.10 · 引号回溯与不丢内容] 内层引号后紧跟 ASCII 标点（`"他说"好",然后走了"`、table 单元格 `["X","Y"]`）时，单次结构判定仍会截断；解析失败分支改为回溯候选搜索（深度 ≤3、总尝试 ≤120），把可疑收尾引号改判为内容引号，并按「首尾带引号字符串 → 引号奇数个 → 转义数」排序选最合理结果。抢救结果缺 `table` 时改为保留原始块并加提示，禁止静默丢整张表；抢救建议上限从 5 放宽到 20；逗号分隔的双顶层对象也判冲突。回归：内层引号后紧邻逗号、table 单元格方括号引号、8 条建议、逗号分隔双对象四组用例。

[1.0.10 · 同族修复] 除裸引号外，另修两类同源的内容损失：① 值里含 `{"a":1}` 片段时引号后跟冒号，不再被误判成键的收尾引号（lead 不会被砍到 `{`）；② 字符串内裸换行 / 制表符等控制字符先转义，table 单元格含换行不再丢整张表；③ 字段抢救路径先修引号再抢救，降级时正文也不截断。探针矩阵 22 种畸形变体 + 5 组边界（超长正文、suggestions 超限、emoji、table 换行、多块）全部无内容损失、无原始 JSON 泄漏。

[1.0.10 · 冲突不丢内容] 多个 persona 块、或一个块里塞两个顶层对象时，旧逻辑会删掉第一块 / 只渲染第一个对象，等于静默吞掉模型的后半段回复。现在这两类判为合同冲突并**保留全部原文**，只加一句安静提示（「内容块有冲突，已按原文展开」），不做任何删除。顶层对象计数只认深度 0 且紧接上一个对象结束或文本开头的 `{`，中途错误闭合后尾随的 `"table":{...}` 不会被误判成第二份文档。

[1.0.9 · 可读降级] 1.0.8 的 fail-open 会把原始 JSON 留在页面上；本版改为「先抢救字段，再决定形态」：语法类畸形抽出 `lead`/`body`/`suggestions`/`risk`（含数组提前闭合后掉在外面的裸字符串），凑齐即按正常三卡渲染，凑不齐才降级普通段落，原始 JSON 代码块一律移除。校验类失败（多字段/超限/version 不符）仍降级普通排版，不硬套卡片。回归：video session 原样畸形块断言「正常三卡 + 零代码块 + 零原始 JSON」。

[1.0.8 · 错误卡下线] 模型输出畸形 persona JSON 时不再渲染「内容合同错误」卡：解析 / 校验失败一律 fail-open 为普通排版，原文保留，`console.warn` 留痕。覆盖 `Expected ':' after property name`、`Expected ',' or '}'`、`Unexpected non-whitespace character` 与中途闭合各类；1.0.7 的修复尝试仍先跑，失败才降级。回归用 legacy 断言替代原 error 断言。style-gate PASS（`artifacts/style-gate/2026-11-06T08-18-19-339Z/`）。

[1.0.7 · 畸形 JSON 修复 + 设置页宽度] 1) 模型把 `conclusion` 提前闭合、`body` 落到根上时，多余 `}` 会提前关掉根对象，`table`/`suggestions`/`risk` 变成尾随内容（`Unexpected non-whitespace character after JSON at position N`）。解析失败后在该位置附近删一个错位 `}` 重试，并把根级 `body` 挪回 `conclusion.body`，过内容校验才渲染，否则仍走错误卡并保留原文。2) 语气风格页根节点继承 `.dss-config` 的 `max-width:760px`，比结构化输出窄一截；上限改为 `100%`。回归：中途闭合 table/normal 两种 kind、尾部多余 `}`、不可见字符、语义非法保持 error。style-gate PASS（证据 `artifacts/style-gate/2026-11-06T07-54-47-595Z/`）：首轮被一个残留的 headless ego 实例卡在 onboarding 提示，清掉该实例后重跑通过。

[1.0.6 · 非会话界面隔离] 插件设置页 / 市场详情页 / 文档预览里的 markdown 不属于模型回复：`findFlowScope` 对不在任何会话容器内的节点返回 `external`，渲染器只走视觉层，不套内容合同、不挂身份头、不显示「内容合同错误」。此前打开第三方插件设置页会在插件描述上方弹出「未找到 assistant 消息容器（PersonaMode 无法定位回复）」。会话内定位不到 assistant 容器时改为 fail-open 走 legacy 排版，不再向用户暴露内部诊断。

[1.0.0 · v5 回复皮肤] 软面卡片台：12px 圆角卡 + 3px 左条 + 同构渐变面；结论 / 下一步 / 风险线标题（PersonaMode 的模型内容槽位卡标签统一为「建议」）；表格蓝 tint 表头、26% / 18% 列宽、首列 600 墨字、三色状态签；代码浅色卡 + 「代码 · 语言」线标题 + 双方框复制钮；深色卡面 / 表头 / 代码面 / 状态签全量适配。静态三态×明暗×三主题证据：`artifacts/prototype/v5-<theme>-<light|dark>-<normal|table|code>.png`（18 张；三主题统一 v5 token，按主题分组校验）；设置页证据：`assets/screenshots/11-config-page.png`（1.0.3 语气风格 tab 实机渲染）+ `artifacts/prototype/v5-settings-light.png` / `v5-settings-dark.png`。这些证据在 `artifacts/` 下，被 `.gitignore` 忽略，**local-only，不进 git**。

[1.0.0 · 语气设置页] 无基础 / 进阶页签、无 JSON 编辑入口；档案行（88px 头像可上传并居中裁方压 128px JPEG dataURL、名称、签名）+ 昵称 / 自称 / 开场 / 性格 / 收尾五字段 + 计数 + 64 格 emoji 弹层 + 固定规则行 + 保存行 + 样式预览（普通 / 表格 / 短答 / 代码）。模板只保留默认蓝色大肥鱼 + 用户另存模板，支持行内删除 / 删空提示 / 恢复默认。保存走宿主 `form.mutate` 一次原子六字段操作（persona / personaEnabled / personaRevision / personaName / personaSignature / personaAvatar）；无 `mutate` 的旧宿主才顺序写 + 写后读回 + 补偿回滚，回滚失败显示“回滚失败，profile 可能半保存”。

[1.0.0 · tone 合同] tone@1 schema / 长度上限 / 严格白名单 / 64KB / 转义逻辑保持；默认鲸鱼 JSON style 已清为纯语言描述；档案字段不进 tone JSON。默认鲸鱼头像内嵌为 128px JPEG dataURL，`personaAvatar` 空值使用内置图。

[1.0.0 · PersonaMode] `personaEnabled=true` 只注入内容合同；`BUILTIN_STYLE_TEXT` / `TAIL_REMINDER` / `GENUI_ROUTING_TEXT` 不注入；`personaEnabled=false` 保持 StructuredMode 原行为。模型只交一个 `persona` fenced JSON（version 1；kind normal/short/table；内容槽位），身份头、前缀、三卡、收尾由 `renderPersonaContent` 固定渲染；模型不再输出 Markdown 卡片。合同与实现一致：`suggestions` 1-5 条、`table.head` 2-6 列、`table.rows` 1-20 行。assistant 回复缺块走 legacy 普通排版并保留原文；多块、JSON / 字段非法才显示「内容合同错误」。块存在时模型写在块外的自然正文由插件优先渲染信封内容；裸文本残留交给 legacy 结构化，不弹错误卡。代码 / diff / 报错 / GenUI 走例外通道。旧历史消息在 `personaEnabled` 激活时快照，不回溯、不重写；配置变化只刷新已受管渲染与身份头。流式半截内容先用宿主 `data-streaming` 信号 + 可测试稳定窗口保留原内容，块完成且仍非法才报错。JSON 解析先剥离全部不可见字符（ZWSP/ZWNJ/ZWJ/LRM/RLM/BOM/U+180E/NBSP/U+2007/U+202F/U+2028/U+2029/NEL/VT/FF）再试；真非法时错误卡插在原回复之前，原文保留不被抹掉；模型写在 persona 块外的自然正文保留；persona 块与其它代码块共存不再误报「必须唯一」。`/structured` 在 PersonaMode 下只报模式，不切换。人格只注入根会话（lead）：子代理（origin=subagent / delegationDepth>0 / parentSession）、委派与聊天 fork 会话硬排除，不受 `includeSubagents` 影响（Boss 2026-11-04 拍板）；header 缺失 fail-open 按根会话处理。默认开启，用户可在设置中关闭；已显式关闭的配置在升级后保持关闭。

[1.0.0 · 预览/真实共用 PersonaRenderer] normal/table/short 预览与真实回复共用 `renderPersonaContent`，输入都是内容对象，不再先造 Markdown 样例；身份头、前缀、三卡、收尾同源。code 预览与真实 code 都走 `decorateStructured` 的 code 例外样式；code 预览样本在设置页构造，不参与内容合同。预览 tab 为普通 / 表格 / 短答 / 代码；真实回复按宿主真实 DOM 选择器定位：`[data-chat-flow-kind="assistant-step"]`、`[data-chat-group-part="response"]`、`[class*="assistantContent"]`、`[data-slot="conversation.chat.node"]` 父级兜底；reasoning / step-process / 上下文注入等过程节点不套内容合同。找不到 assistant flow 显示显式 error，不回落普通排版。身份头 live 验证移到 Phase 4（未执行，UNVERIFIED）。

[1.0.0 · 关闭清理] `personaEnabled=false` 时从每个受管 `_markdown_` 清除 `data-dsh-persona-kind`、`data-dsh-persona-fallback`、`data-dsh-persona-error`、`data-dsh-persona-pending`，删除 `.dss-persona-prefix` / `.dss-persona-suffix` 节点，再走 `decorateStructured`；通用卡保留，前后缀文本不再可见。测试覆盖 normal 开启 → 关闭 → 再装饰，以及 active 状态下配置订阅自动清理。

[1.0.0 · 审计修复] P1：深色表格表头改用独立 `--dss-th-text`（浅色 `#115e59` / 深色 `#5eead4`），不再复用线标签的 `--dss-blue-text`；gate 期望同步为 `rgb(94, 234, 212)`。P2：`emptyTone()` 兜底文案去掉“先给结论”，只保留语言风格；short 改为 `kind=short` 内容槽位，由 renderer 生成短答卡；删除用户文本正则猜 short 与模型 Markdown 短答卡。`style-gate --check` 新增源码树绑定：`src/lib/scripts/test/fixtures` 与证据 HEAD 不一致时直接 `STYLE_GATE_STALE`。

[1.0.3 · 发布前 bug 修复（2026-11-04）] ① 合法 persona JSON 被不可见字符判死：模型输出里的 15 种不可见字符（ZWSP/ZWNJ/ZWJ/LRM/RLM/BOM/U+180E/NBSP/U+2007/U+202F/U+2028/U+2029/NEL/VT/FF）会让 V8 报 `Unexpected non-whitespace character after JSON` 并把整条回复替换成错误卡；现在解析前按码位剥离再试，报错时原文保留在错误卡下方。② 块外正文被静默删除 / 误报块冲突：模型写在 persona 块外的自然正文保留在卡片下方；persona 块与其它代码块共存不再误报「必须唯一」，只有多个 persona 块才算冲突。回归：探针 A/B/C1–C8/D + 15 种不可见字符用例，100/100。

[1.0.0 · PersonaMode 修复轮（2026-11-02，FAIL 审计复核）] P0：渲染缓存保存原始 envelope 文本 / 哈希与配置签名，重复 `decorate`（含 observer 自触发）仍为原 kind；插件生成节点带 `data-dsh-plugin-generated` 标记，MutationObserver 忽略自生成子树；PersonaMode 激活时快照旧历史 + `data-chat-turn` 水位，配置变化只走 `managedOnly` 刷新，不对旧历史全量重扫。P1：流式半截 JSON / 字段不全先 pending（`data-streaming` 完成信号 + 500ms 稳定窗口）并保留原 DOM，完成且仍非法才 error；找不到 assistant flow 显式 error；关闭删除前后缀节点与文本；合同写明 1-5 / 1-20 并测 6 / 21；`.md-diff` 与报错回复走例外，不再显示内容合同错误。P2：Persona 建议卡标签统一「建议」；预览补短答 tab，code 预览改走真实 code 例外通道；回归测试补 observer 自触发 / 旧历史 / 配置订阅 / partial-stream / no-flow / diff / 6 / 21 / 关闭文本 / 预览同源。

[1.0.0 · 手动样式 gate] 真实浏览器检查不进 `npm test`；显式 `DSH_STRUCTURED_STYLE_GATE=1 node scripts/style-gate.mjs` 启动 detached worker 后立即返回，`node scripts/style-gate.mjs --check` 读结果；校验 computedStyle（v5 卡片 / 表头 / 状态签 / 代码卡 / 深色 / 800px）与 Persona 视觉 21 条断言（身份头 38px/16px、前缀 12.5px、后缀 12px+dotted、结论 19px/700、建议绿、风险琥珀、短答紫、表格青边与青绿表头渐变），证据写入 `artifacts/style-gate/<timestamp>/`（local-only，不进 git）。当前证据：`artifacts/style-gate/2026-11-04T13-06-22-407Z/`（HEAD `9536d12`，ok=true，failures=[]）；旧「gate 不覆盖 Persona」的限制已作废。

[1.0.0 · 已知限制提示] PersonaMode 仍需模型输出 `persona` 内容块；缺块走 legacy 普通排版；块存在但 JSON / 字段非法才显示「内容合同错误」。旧历史消息不会回溯重渲染；流式回复在块完成前不报错，稳定窗口到期且仍无合法块才报错。验收使用新回复。

[1.0.0 · 未验] 桌面实机真实聊天与设置页预览并排对照、身份头 live 验证、真实 Electron 长会话 / 虚拟列表重挂旧消息、工具输出 / reasoning / 压缩摘要不套 Persona 合同的 live 抽查、两会话 A 保存→B 下一条立即生效、隔离 temp cwd P01–P10 基线、beta ≥3 / default-on 8–10 且 ≥60% 偏好 gate 0 人、当前 HEAD 的真实模型 A/S/B/C/D 重跑，均未执行；发布门禁仍 NO-GO。未 push / publish / PR / 安装 desktop。
