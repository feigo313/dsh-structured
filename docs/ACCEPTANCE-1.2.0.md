# dsh-structured 1.2.0 验收记录

状态：**已发布（2026-11-26，三端）**。npm `dsh-structured@1.2.0`；GitHub main `aa2a130` + tag `v1.2.0` + Release 资产；市场 PR awesome-dsh-plugin#19092。
基线：`2c3bcd4`（门禁修复 / 身份头修正 / 文档；本地未发布）。

## 门禁

- `npm test`：150/150。
- `scripts/theme-contrast.mjs`：80 checks PASS。
- `scripts/theme-hue-distance.mjs`：12 checks PASS。
- `.tools/computed-style-check.mjs`：10 主题块 × 10 项 PASS（新增 custom-light / custom-dark；样式取自 `src/client.js` 的 `customThemeCss`，反向自检删样式即 FAIL）。
- `scripts/style-gate.mjs`：PASS（证据 `artifacts/style-gate/2026-11-26T12-12-56-015Z`；探针与两份夹具按 1.2.0 真实结构重写，期望值改挂 CSS token 关系；证据新鲜度由 treeHash 绑定，允许未提交工作树，STALE 判定不降）。
- `scripts/desktop-check.mjs`：30 项 PASS（真实宿主 0.2.2-rc.5）。
- pack：61 文件 / 1,826,792 B / unpacked 2,716,890 B / `sha256 8386c3b4628f23c9c87bffad3882e6bfd728e55207c6f8c9098fd4279e5d7119`。

## 已完成

- 单页设置页：标题行总开关 / 外观 / 行为 / 人格 / 输出深度 / 预览；居中、顶部留白、可滚动。
- 内容合同与人格拆分；总开关开启即注入多卡合同；人格只控风格；身份头独立；旧消息不回溯。
- 深度三档（入门/普通/专业，默认普通、无关闭）；预览讲解卡随档位变化。
- 自定义三色 HSV 拾色器；仅自定义主题显示；对比度/色相校验；讲解卡跟随主题 / 自定义色。
- 内心OS：`personaInnerOsEnabled` + 模型 `innerOs`，卡片外尾缀位置 `💭 …`。
- 风格预设示例驱动预览结论卡；emoji ☺ 弹层恢复；预设不覆盖昵称 / 自称。
- 移除开场/收尾自定义控件、视觉层开关、独立总开关区块；尾部提醒固定开启。
- **修复身份头样式失效**：活 CSS 原写 `.dss-scope .dss-persona-head …`（要求祖先带 scope），而身份头自身才是 token 载体，真实聊天结构下规则全落空（头像 auto、名字 UA 700、间距丢失）。改为 `.dss-scope.dss-persona-head …` 自持作用域；实测 38px 头像 / 650 字重 / 10px 间距；`test/style-browser.test.mjs` 加静态门禁防回退。
- **修复人工样式门禁失效**（自 1.1.0 起）：探针仍按 v5 标记取样（`.dss-status` 胶囊、`data-dsh-structured-card-type`），遇到已废弃节点直接抛 null；两份夹具改由 `lib/client.js` 真实渲染出口生成，探针选择器改 class / `data-dsh-structured-status-cell`，期望值全部落到 token 关系；证据新鲜度从「工作树等于 HEAD」改为 treeHash。
- 侧边栏入口 + main 面板：Boss 2026-11-26 19:35 在真实 Desktop 实机确认，点开与插件设置页同源。
- 1.2.0 设置页与 HSV 拾色器截图：ego lite 打开真实 Desktop Web 界面截图，裁切到设置面板（不含会话 / 工作区信息），已写入 `assets/screenshots/13-settings-1.2.0.png`、`14-color-picker-1.2.0.png`，并更新 `screenshots.json` 与 README。

## 待办

- 分支：本地 main 领先 42 / 落后 6；发布前需 rebase / merge 到 origin 并复核树。
- profile：已装本地 `file:G:/dsh-structured/dsh-structured-1.2.0.tgz`（lib 哈希与 HEAD 构建一致，2026-11-26 20:15）；需重启 Desktop 生效；npm 发布 1.2.0 后切回 registry 版本。
- 发布记录见 `docs/MAINTENANCE-LOG.md`（2026-11-26 · 1.2.0 发布）与 `docs/RELEASE-1.2.0.md`。
