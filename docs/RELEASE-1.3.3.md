# 1.3.3 发布记录（2026-11-27）

- 主题：内心OS（💭 尾缀）可读性——字号约 13px、颜色 ink-2，明暗主题都可读。
- 版本：`package.json` 1.3.3；`lib/` 已由 `node scripts/build.mjs` 从 `src/` 重建。
- 工件（本机实测 pack）：64 文件 / 1,876,704 B / unpacked 2,878,740 B / sha256 `fe9209eb98f17cc43709b2205167b325c613068c0ae6e3d07f3a5b36e830a617` / shasum `5bd73a919ee6a6023aaa901ba7eb1a8167223921`。
- pack 基线：`test/pack.test.mjs` 的 PINNED 维持 1,875,638 / 2,876,049 不变；实测差 +1,066 B / +2,691 B，在 ±16 KB 容差内，无需改基线。
- 门禁：`npm test` 165/165；对比度 80/80；色相 12/12；计算样式 10 主题块 × 10 项；`desktop-check` 全 PASS（真实宿主 0.2.2-rc.5）。
- 发布状态：本轮**未** commit / tag / push / npm publish / 市场 PR；GitHub、npm、市场三端仍待 Boss 同意后按流程发。

## 变更

- `.dss-persona-suffix`（💭 内心OS / 尾缀）：12px → `calc(var(--dss-code-size) * 13 / 12.5)`（默认约 13px，仍跟随宿主代码字号）；颜色 `--dss-ink-3` → `--dss-ink-2`；行高 1.65 → 1.6。
- 两份样式块同步：设置页预览 `CONFIG_CSS` 与真实聊天 `CSS`。
- 对比度实测：浅色 ink-2 `#475467` 对纸面 7.69:1（原 ink-3 `#667085` 4.97:1）；深色 ink-2 `#B7BDC9` 对 `#242629` 8.04:1（原 ink-3 `#8A92A0` 4.84:1）。两档均 ≥ WCAG AA 4.5:1；ink-2 达到 AAA 7:1。
- 回归：`test/style-browser.test.mjs` 的 1.3.3 静态门禁改为遍历**所有** `.dss-scope .dss-persona-suffix{…}` 规则（锁定 ink-2 + 13/12.5、拒绝 ink-3），并额外要求真实会话所用的 `const CSS` 活样式块带该规则，防止只改设置页预览。
- 无运行时 / 合同 / 配置项变更；旧消息不回溯。

## 验证

| 项 | 结果 |
| --- | --- |
| `node scripts/build.mjs` | `lib/index.js` 41,972 B / `lib/client.js` 297,049 B，exit 0 |
| `node --test test/*.test.mjs` | 165 pass / 0 fail |
| `node scripts/theme-contrast.mjs` | PASS 80 checks |
| `node scripts/theme-hue-distance.mjs` | PASS 12 hue checks |
| `node .tools/computed-style-check.mjs` | 全部通过（10 主题块 × 10 项） |
| `node scripts/desktop-check.mjs` | 全 PASS，真实宿主 0.2.2-rc.5 |
| `npm pack --json --ignore-scripts` | 64 文件 / 1,876,704 B / 2,878,740 B |
