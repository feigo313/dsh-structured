# dsh-structured 1.0.0 验收

[1.0.0 · 代码/构建] `npm test` 85/85；`npm run build` 完成；`desktop-check` 全 PASS；`theme-contrast` 60；`theme-hue-distance` 12；`lib` 由 src 构建并注入鲸鱼娘 JSON；pack 58 文件 / 789978 B / unpacked 1125404 B。
[1.0.0 · 功能/打包] Host `personaEnabled/persona/personaRevision` tone@1 注入，独立 tone section order 10250；tail 锚点只在实际注入成功时出现；skipIn 只控制后缀：短答/表格保留前缀与风格、无后缀，代码/diff/报错全跳过；style 正文口语规则 + 发送前自检；保存走宿主 `form.mutate` 一次原子操作（persona/enabled/revision）；无 `mutate` 的旧宿主才顺序写 + 写后读回校验 + 补偿回滚，批量/回滚失败保留草稿并显式报错，状态“已保存，全局生效（新消息使用）”；test profile 实测 A 表格有前缀/风格无签名、短答有前缀无后缀、B diff 无前缀/风格/签名、C 长普通回复保留签名、D off 无签名；Client 基础 3 输入、进阶 5 字段 JSON、旧格式拒绝并保留文本；`docs/1.0-PERSONA-WHALE.json` + `LICENSE-WHALE` + `NOTICE-WHALE` 随包，草稿 1.0 md、P04/P07、旧 persona-gate fixture 不随包。
[1.0.0 · 手动样式 gate] 真实浏览器检查不进 `npm test`；显式 `DSH_STRUCTURED_STYLE_GATE=1 node scripts/style-gate.mjs` 启动 detached worker 后立即返回，`node scripts/style-gate.mjs --check` 读结果；校验 computedStyle + 800px，证据写入 `artifacts/style-gate/<timestamp>/`。当前证据：待补。
[1.0.0 · 未验] 桌面实机（默认关/开启鲸鱼娘/表单↔JSON/invalid/只读/保存失败/800px/暗色）未执行；隔离 temp cwd P01–P10 基线未跑；beta ≥3 / default-on 8–10 且 ≥60% 偏好 gate 0 人，NO-GO/pending；未 push/publish/PR/安装 desktop。
