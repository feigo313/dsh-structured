# dsh-structured 0.8.3 — 验收记录

[AC-001/002] `npm test` 36/36（含新增 GenUI 优先级断言）；`node scripts/desktop-check.mjs` 全 PASS；`lib/index.js` 与 src 一致。
[AC-003] 0.8.3 已装 `structured-test`（`lib/index.js` sha256 `62f3a37d…` 与仓库一致）；headless 两轮 `session-2aa045fb-…`、`session-c1253adf-…` 首段均为 `> **` 标题卡，system prompt 含新尾提醒「组件只能排在标题卡之后」；`npm pack` 39 文件 / unpacked 964444 B。
[AC-004] 用 keyvalue 组件的请求在 headless 不触发 GenUI（无 client half），desktop 的 dsh-ui 场景未验；未 push、未 publish、未改市场 PR。
