# 1.3.4 发布记录（2026-11-27）

- 主题：插件详情页设置卡不再随「侧边栏入口」消失——`plugins.bundle.config` 注册与 `sidebarEntry`、settings describe 彻底解耦；顺带修同卡片的 React hooks 顺序崩溃。
- 版本：`package.json` 1.3.4；`lib/` 已由 `node scripts/build.mjs` 从 `src/` 重建。
- 工件（本机实测 pack）：64 文件 / 1,880,757 B / unpacked 2,892,849 B / sha256 `84d9db2ea9cbcbfd5f9aefcc1c16b0687688fcb6e6c4a6113ef59c0a55f20ff8` / shasum `3e79427b0b874913490d964a8da8151a36149b93`。
- pack 基线：`test/pack.test.mjs` 的 PINNED 由 1,875,638 / 2,876,049 更新为 **1,880,757 / 2,892,849**（unpacked 实测 +16,800 B，超 ±16 KB 容差 416 B，按规矩重新钉基线）。
- 门禁：`node --test test/*.test.mjs` **168/168**；对比度 80/80；色相 12/12；计算样式 10 主题块 × 10 项；`desktop-check` 全 PASS（真实宿主 0.2.2-rc.5）。
- 发布状态：本轮**未** commit / tag / push / npm publish / 市场 PR；GitHub、npm、市场三端仍待 Boss 同意后按流程发。

## 根因（文件:行）

1. `src/client.js:5008-5034`（1.3.3 时是 4989-5064 的 `child.configForms.whileServed([CONFIG_NS], …)` 回调）——详情页配置卡 `plugins.bundle.config` 的注册被塞在 `configForms.whileServed` 的回调里，与侧边栏入口 / `main` 面板的挂载卸载共用同一个生命周期。宿主 `@deepseek-ai/dsh-client-ui-settings` 的 `ConfigFormsService.whileServed` 只在 settings describe 视图已经包含本命名空间时才调用这个回调，并且视图一抖动就 `off()` 拆掉整个注册。
2. 宿主 `@deepseek-ai/dsh-client-ui-plugin-manager` 的 `PackageDetail` 只在 `configured = ledger.bundles.has(pkg.name)` 为真时才渲染 `[data-plugin-config]` 区；`ledger.bundles` 就是已注册 `plugins.bundle.config` 条目的 key 集合。没有注册 = 详情页连配置区都不渲染（不是渲染空白占位），截图里只剩描述 / 安装命令 / 组件 / 版本 / 来源。
3. 于是「关掉侧边栏入口后详情页也没设置卡」的真实链路是：设置页此前只能从侧边栏面板进入（面板本身不依赖 describe），关掉入口后唯一入口变成插件详情页；而详情页的卡依赖 describe 已服务。describe 未服务 / 启动首拉失败（`SettingsDescribeMirror.ensure()` 只在 `idle` 时重试，失败态不重试）时整条注册不存在。`sidebarEntry` 的语义（`src/index.js:372`）本来就是「关闭只隐藏入口，插件板块里的设置页仍可用」，实现没兑现。
4. 同卡片的第二处缺陷：`src/client.js:4549-4567`（1.3.3）未 ready 时提前 return，ready 后才调用 6 个 `useState` / `useEffect`——同一实例的 hooks 数量从 1 变 7，`idle/unavailable → ready` 时 React 抛 "Rendered more hooks than during the previous render"，slot 错误边界吞掉后该条目渲染为空。

## 变更

- `src/client.js`：配置卡改为在 `configForms` 可用时**立即注册**（`registerConfigCard`，`src/client.js:5008-5019`），不经过 `whileServed`；setup 主动调一次 `child.configForms.describe().load()`（`src/client.js:5027`）让表单从 `idle` 进入 `ready`，失败交给宿主下一次 ensure。
- `src/client.js`：侧边栏只剩 `sidebar.panellist` + `main` 两个 slot，由 `sidebarEntry` 单独驱动（`mountSidebar` / `unmountSidebar` / `syncSidebarEntry`，`src/client.js:5040-5077`）；切换只卸载这两个 slot，配置卡既不撤销也不重复注册。
- `src/client.js`：配置卡拆成「薄壳 `StructuredConfigCard`（只读一次快照）+ 仅在 ready 时挂载的 `ConfigCardBody`」（`src/client.js:4549-4562`），两态的 hooks 数量各自恒定。
- `src/client.js`：`setupConfigPage` 的入口守卫由「必须有 `whileServed`」改为「必须有 `configForms.get`」（`src/client.js:3737`），旧宿主不再因缺 `whileServed` 而整页不注册。
- 测试：`test/client-config-page.test.mjs` 新增 3 条并改 2 条既有断言（原「describe 未服务就不注册」正是缺陷行为）；`test/persona-ui.test.mjs` harness 展开新的一层组件；`test/pack.test.mjs` 重新钉基线。
- 无运行时提示词 / 合同 / 配置项变更；旧消息不回溯。

## 验证

| 项 | 结果 |
| --- | --- |
| `node scripts/build.mjs` | `lib/index.js` 41,972 B / `lib/client.js` 297,945 B（构建器报数；实盘文件 56,250 / 320,361 B），exit 0 |
| `node --test test/*.test.mjs` | 168 pass / 0 fail |
| `node scripts/theme-contrast.mjs` | PASS 80 checks |
| `node scripts/theme-hue-distance.mjs` | PASS 12 hue checks |
| `node .tools/computed-style-check.mjs` | 全部通过（10 主题块 × 10 项） |
| `node scripts/desktop-check.mjs` | 全 PASS，真实宿主 0.2.2-rc.5 |
| `npm pack --json --ignore-scripts` | 64 文件 / 1,880,757 B / 2,892,849 B |

新增回归（`test/client-config-page.test.mjs`）：

| 测试 | 覆盖 |
| --- | --- |
| `sidebar：sidebarEntry=false 且 describe 未服务时，详情页设置卡仍在且开关可改` | 注入顺序只有 `plugins.bundle.config`；卡片「侧边栏入口」开关读到 false 并写回 true；describe 被主动拉一次 |
| `sidebar：切换 sidebarEntry 只卸载侧边栏 slot，详情页配置卡不重复注册也不撤销` | 切换只移除 `sidebar.panellist` / `main`，卡片始终 1 条 |
| `config page：form 从 loading 变 ready 时卡片 hooks 数量不增长（不再触发 hooks 顺序崩溃）` | 同一组件实例两次渲染的 hooks 计数单调不增；ready 后由独立 body 渲染 |

## 风险

- **配置卡占位态**：describe 长期失败时，卡片显示「插件未加载或配置暂不可用」而不是隐藏；这是有意的可见降级（比整块消失可诊断）。setup 会主动 `load()` 一次，失败后仍取决于宿主是否再次 ensure。
- **侧边栏不再等 describe**：`sidebarEntry=true` 时入口在 `configForms` 可用后立即出现，与旧行为（describe 服务后才出现）略有差异；若宿主从不服务该命名空间，入口仍在、面板内显示占位。
- **未在真实桌面端点验**：本轮只有 `desktop-check`（兼容性预检）与 node 测试；建议重启 Desktop 后从插件管理器打开本插件详情页，确认设置卡与「侧边栏入口」开关都在。
- **包体**：unpacked 已到基线 +16,836 B（超容差 452 B）故重新钉基线；后续再增大需再次评估。
