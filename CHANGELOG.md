# Changelog

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

## Unreleased

- 新增 `docs/MAINTENANCE.md`（每日巡检手册）与 `docs/MAINTENANCE-LOG.md`（巡检记录）；两者不进 npm 包（`files` 增加 `!docs/MAINTENANCE*.md`，打包仍为 34 文件）。

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
