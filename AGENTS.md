# dsh-structured

DSH 插件：让助手每条实质回复默认结构化——**首句给结论，内容用组件（表格 / 清单 / 步骤）排出来**，可随时开关。

## 硬约束（都是实测踩过的坑，不要重犯）

- **禁止用 `agent/pre-step` 往请求里 append 消息**。DSH v4 要求 `source.kind` 属于宿主注册的 producer，插件自造 kind 会让整回合失败：`format v4 message requires a producer-owned source kind`。dsh-concise v0.11.2 因此把会话打挂。
- **`package.json` 的 `files` 必须列出 `cordis.patch.yml`**，否则安装校验 ENOENT 并整体回滚（dsh-concise 官方 npm 包就是这个 bug）。
- **desktop profile 由 Electron 独占**：`dsh plugin --profile desktop ...` 会被拒绝。开发期用独立测试 profile，最终安装走市场或手工 pnpm（改前备份）。
- **不碰**：`~/.dsh/AGENTS.md`、`~/.agents/memory/semantic/user-profile.md`、其他插件目录。

## 桌面端操作约定

- **desktop 是 Electron，不是浏览器。** client 插件由 desktop 应用加载/热更新；**禁止让 Boss 按 F5 或刷新浏览器来加载插件改动**。
- 安装/升级用 `plugin_manager` 或插件管理入口；需要重载时由 agent 在后台切换 bundle 或走应用自身机制，Boss 只负责看结果。
- 文档里不写“F5 / 刷新页面 / 刷新一次”这类 Web 操作；只有手工改 profile 后需要重新打开应用时才写“重新打开 Desktop”。

## 目录

- `TASK.md` — 完整任务书，开工先读
- `.tools/` — 参考仓库 clone 与临时依赖放这里，不要污染项目根

## 完成标准

以 `TASK.md` 的「验收标准」四条全过为准；自述不算证据。
