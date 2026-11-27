# 1.3.6 — 修 1.3.5 的客户端入口回归（ctx.slots 裸读）

日期：2026-11-27　基线：1.3.5（10c2ca9）　宿主目标：DSH Desktop 0.2.2-rc.5 / Cordis 4.1.0

## 现象

1.3.5 安装并重启 Desktop 后，**所有** `persona` 代码块信封都以原始文本显示：结论 / 建议 / 风险卡片、身份头、主题视觉全部消失。不是某张卡解析失败，而是客户端半区整体没有执行。

## 根因（文件:行 + 异常文本）

1. `src/client.js:5335`（1.3.5）：

   ```js
   configFallbackSlots = ctx?.slots ?? null
   ```

   这是 `apply()` 的第一条语句，**且在 try/catch 之外**。
2. 本插件模块导出 `inject: []`（`src/client.js:5330`，1.3.5 同）。`slots` 服务由 ui-renderer 的兄弟 fiber 提供，不是本插件声明依赖。
3. DSH 所用 Cordis **4.1.0** 的 context 代理拒绝读取未 inject 的服务属性，抛：

   ```text
   Error: cannot get property "slots" without inject
   ```

   （`@deepseek-ai/cordis/lib/index.js` 的 ReflectService get trap：未声明属性在 fiber 链上找不到 committed/provision 后抛错。）
4. 异常发生在 `enable()` 之前，`apply` 立即中断：视觉层 style、MutationObserver、persona 装饰、侧边栏入口、设置卡全部没有初始化。Cordis 把该插件标记为失败，其余宿主 UI 继续运行，所以聊天正常显示，只是所有 persona 消息退回原始代码块。
5. 1.3.5 的 2 条新测试没抓到，是因为它们的 `ctx` 是普通对象（`ctx.slots` 直接可读），从未模拟宿主代理「未 inject 属性即抛」的语义。

## 修复

- `src/client.js:5358-5369`（构建产物 `lib/client.js:5360-5371`）：apply 里**删除** `ctx?.slots` 裸读；占位注册只通过
  `ctx?.inject?.(['slots'], (child) => { configFallbackSlots = child?.slots ?? null; installConfigSlotFallback(...) })`
  获取 slots。`inject: []` 保持不变——消息装饰不能反过来被设置页服务卡住。
- `src/client.js:108-128`（`lib/client.js:110-130`）：`installConfigSlotFallback` 全部收敛。
  - 占位 `register` 放在单独 try/catch：声明/注册被拒时只置 `configFallbackFailed`，不外抛；
  - `slots.inject` 自身失败同样只置位、不重试；
  - 真实卡片接管后仍先撤占位；`disposeConfigCard` 的恢复路径保留。
- 注释锚点：`src/client.js:92-99` 写明「占位注册必须拿到已注入 slots 的 child context」；`src/client.js:5349-5357` 写明严禁裸读 `ctx.slots`。

## 证据（宿主式 harness，非自研直调）

harness 位置：`.tools/probe-136-real-apply.mjs`（不随包）。做法：linkedom 真实 DOM + 从 `app.asar` 解包出的 **Cordis 4.1.0**，先由一个兄弟插件 `ctx.provide('slots', …)`，再以 `{ inject: [], apply: ctx => module.apply(ctx) }` 加载 `lib/client.js`，最后渲染 persona 信封并触发 observer/decorate。

| 断言 | 1.3.5 `lib/client.js` | 1.3.6 `lib/client.js` |
| --- | --- | --- |
| apply 结果 | `Error: cannot get property "slots" without inject` | `null` |
| 视觉层 `#dsh-structured-skin-style` | 不存在 | 存在 |
| `data-dsh-structured="active"` | null | `active` |
| MutationObserver | 0 个 | 1 个且已 observe |
| `plugins.bundle.config` 占位 | 未发生（apply 已死） | inject + register（key `dsh-structured`） |
| persona 信封装饰 | 未执行（卡片全掉） | `kind=normal`，cards `[conclusion,next,risk]`，身份头 1 |
| `short` 信封 | — | `kind=short`，cards `[short]` |

补充：`ctx.slots` 由**兄弟 fiber** 提供时，即使服务已就绪，未 inject 的插件裸读仍抛同一错误——这是确定性行为，不是时序竞争。

## 回归测试（2 条，加入 `test/client-config-page.test.mjs`）

均加载**发布产物** `lib/client.js`，ctx 用 Proxy 模拟 Cordis：读 `slots` 立即抛 `cannot get property "slots" without inject`，其它未声明服务同样抛；`inject(['slots'], cb)` 把回调存起来稍后手动投递。

| 测试 | 覆盖 |
| --- | --- |
| `宿主兼容：apply 不裸读 ctx.slots；slots 异步到达才注册占位，卡片正常（1.3.6）` | `slotsReads=0`；apply 不抛；style/observer 在 slots 到达前已就绪；投递前 0 注册、投递后 1 条且 key 正确；persona normal 三卡 + 身份头 |
| `宿主兼容：slots 注册失败只影响设置占位，apply 与卡片装饰不抛（1.3.6）` | `register` 抛错被吞、不产生注册；apply 不抛；short 信封仍装饰为卡 |

## 验证

| 项 | 结果 |
| --- | --- |
| `node scripts/build.mjs` | exit 0；构建器报数 `lib/index.js` 41,972 B / `lib/client.js` 301,273 B；实盘文件 56,250 / 324,619 B |
| `node --test test/*.test.mjs` | **172/172 pass**（1.3.5 为 170，新增 2） |
| `npm pack --json --ignore-scripts` | **64 文件 / 1,888,259 B / unpacked 2,917,135 B**（见下基线） |
| 宿主式 harness | 见上表，1.3.5 失败 / 1.3.6 通过 |

pack 基线：`test/pack.test.mjs` 的 PINNED 由 1.3.4 的 1,880,757 / 2,892,849 更新为 **1,888,259 / 2,917,135**（1.3.6 新增测试与注释；仍按 ±16 KB 容差校验）。

## 重启后验证步骤

1. 更新到 1.3.6 后重新打开 Desktop（客户端 bundle 在启动时组合）。
2. 控制台**不应**再有 `cannot get property "slots" without inject` 或 `dsh-structured: failed`；设置卡注册成功时会出现 `[dsh-structured] bundle config … registered`。
3. 打开任一含 persona 信封的历史消息：应渲染为身份头 + 三卡，而不是代码块。
4. 插件管理器 → 结构化输出 → 详情页：设置卡应出现；若只显示「配置正在加载…」，说明 `setupConfigPage` 的 settings/React 门仍未通过（与本次回归无关，占位保证配置区不整块消失）。

## 风险与边界

- 占位注册仍是「尽力而为」：`slots` 永不出现、声明拒绝或注册被拒时，设置卡可能缺失或停留在「配置正在加载…」；消息装饰不受影响（本次修复的核心保证）。
- 未改宿主版式、prompt 合同、配置项或历史消息；旧消息不回溯。
- 未在真实 Desktop 端做点击验收（本轮无重启令牌）；宿主式 harness 使用与 app.asar 同一份 Cordis 4.1.0 与真实 bundle，但 Electron 侧的 module loader 仍需 Boss 重启确认。
- 本轮**未** commit / tag / push / npm publish / 市场 PR。

## 变更文件

- `src/client.js`、`lib/client.js`（build 同步）
- `test/client-config-page.test.mjs`（+2 宿主式回归）
- `test/pack.test.mjs`（基线 1,888,252 / 2,917,128）
- `package.json`（1.3.6）、`CHANGELOG.md`、本文件
