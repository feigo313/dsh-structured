[AC-001/002] `npm test` 36/36（含严格卡片 10 反例 + 9 正例 + GenUI 跳过）；`node scripts/desktop-check.mjs` 全 PASS；`lib/index.js`、`lib/client.js` 与 src 一致。
[AC-003] `structured-test` 已安装 0.8.2（B 构建，`lib/client.js` hash 与仓库一致），headless 一轮 `completed`；`session-inspect --session session-343e363b-73ca-4c9c-80ed-52d099f5cb8b --last-system --grep "结构化输出（本会话已启用"` 命中 1；`npm pack` 38 文件 / 763106 B / unpacked 962368 B。
[AC-004/005] `visual` 配置与 client `configForms` 读取测试通过，`/structured off` 仍只控制提示词；桌面 bundle 详情页 `visual` 字段的实机可见/可切换 **未验**（未触碰 desktop profile）；未 push、未 publish、未提市场 PR。
