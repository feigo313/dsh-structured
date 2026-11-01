# dsh-structured 1.0.0 验收

[1.0.0 · 代码/构建] `npm test` 91/91；`npm run build` 完成；`desktop-check` 全 PASS；`theme-contrast` 60；`theme-hue-distance` 12；`lib` 由 src 构建并注入鲸鱼娘 JSON；pack 58 文件 / 838910 B / unpacked 1314287 B。

[1.0.0 · v5 回复皮肤] 软面卡片台：12px 圆角卡 + 3px 左条 + 同构渐变面；结论 / 下一步 / 风险线标题；表格蓝 tint 表头、26% / 18% 列宽、首列 600 墨字、三色状态签；代码浅色卡 + 「代码 · 语言」线标题 + 双方框复制钮；深色卡面 / 表头 / 代码面 / 状态签全量适配。静态三态×明暗×三主题证据：`artifacts/prototype/v5-<theme>-<light|dark>-<normal|table|code>.png`（18 张；三主题统一 v5 token，按主题分组校验）；设置页证据：`artifacts/prototype/v5-settings-light.png` / `v5-settings-dark.png`。

[1.0.0 · 语气设置页] 无基础 / 进阶页签、无 JSON 编辑入口；档案行（88px 头像可上传并居中裁方压 128px JPEG dataURL、名称、签名）+ 开场 / 性格 / 收尾三字段 + 80/1200/80 计数 + 64 格 emoji 弹层 + 固定规则行 + 保存行 + 样式预览（普通 / 表格 / 代码）。模板只保留默认蓝色大肥鱼 + 用户另存模板，支持行内删除 / 删空提示 / 恢复默认。保存走宿主 `form.mutate` 一次原子六字段操作（persona / personaEnabled / personaRevision / personaName / personaSignature / personaAvatar）；无 `mutate` 的旧宿主才顺序写 + 写后读回 + 补偿回滚，回滚失败显示“回滚失败，profile 可能半保存”。

[1.0.0 · tone 合同] tone@1 schema / 长度上限 / 严格白名单 / 64KB / 转义逻辑保持；默认鲸鱼 JSON style 已清为纯语言描述；档案字段不进 tone JSON。默认鲸鱼头像内嵌为 128px JPEG dataURL，`personaAvatar` 空值使用内置图。

[1.0.0 · PersonaMode] `personaEnabled=true` 只注入 PersonaMode 合同；`BUILTIN_STYLE_TEXT` / `TAIL_REMINDER` / `GENUI_ROUTING_TEXT` 不注入；`personaEnabled=false` 保持 StructuredMode 原行为。固定三卡（结论 / 下一步 / 风险）、卡外独立前缀 / 收尾、无全局标题卡；缺卡 / 顺序错 / 标签错 / 多余结构整条回落通用结构化，不补卡。`/structured` 在 PersonaMode 下只报模式，不切换。默认关闭。

[1.0.0 · 预览/真实共用 PersonaRenderer] 预览与真实回复共用 `renderPersonaMarkdown`：身份头、卡外前缀、三卡、收尾、table/code/short 例外、fallback 同源；预览保留身份头，真实回复按 Phase 0 spike 候选插入 `[data-chat-flow-kind="assistant-step"]`；身份头 live 验证移到 Phase 4。预览灰字为「预览为 PersonaMode 合同样本：身份头、卡外前缀、结论 / 下一步 / 风险、收尾；真实回复与预览同源。」

[1.0.0 · 审计修复] P1：深色表格表头改用独立 `--dss-th-text`（浅色 `#1d4ed8` / 深色 `#93c5fd`），不再复用线标签的 `--dss-blue-text`；gate 期望同步为 `rgb(147, 197, 253)`。P2：`emptyTone()` 兜底文案去掉“先给结论”，只保留语言风格；short 改为显式「短答」卡（1 张短答卡=short；0/多卡/错标签/带后缀=fallback），删除用户文本正则猜 short。`style-gate --check` 新增源码树绑定：`src/lib/scripts/test/fixtures` 与证据 HEAD 不一致时直接 `STYLE_GATE_STALE`。

[1.0.0 · 手动样式 gate] 真实浏览器检查不进 `npm test`；显式 `DSH_STRUCTURED_STYLE_GATE=1 node scripts/style-gate.mjs` 启动 detached worker 后立即返回，`node scripts/style-gate.mjs --check` 读结果；校验 computedStyle（v5 卡片 / 表头 / 状态签 / 代码卡 / 深色）与 800px，证据写入 `artifacts/style-gate/<timestamp>/`。当前证据：短答卡 code commit 后重跑（源码树绑定会拒绝旧证据）。

[1.0.0 · 未验] 桌面实机真实聊天与设置页预览并排对照、身份头 live 验证、两会话 A 保存→B 下一条立即生效、隔离 temp cwd P01–P10 基线、beta ≥3 / default-on 8–10 且 ≥60% 偏好 gate 0 人、当前 HEAD 的真实模型 A/S/B/C/D 重跑，均未执行；发布门禁仍 NO-GO。未 push / publish / PR / 安装 desktop。
