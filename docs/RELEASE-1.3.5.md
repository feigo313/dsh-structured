# 1.3.5 — 让详情页配置区先拿到 slot key

日期：2026-11-27　基线：1.3.4（72eb553）　宿主：DSH Desktop 0.2.2-rc.5

## 现象

插件管理器 → 结构化输出 1.3.4 → 详情页：描述 / 组件列表 / 版本 / 来源都在，**组件列表与版本区之间没有设置卡**（宿主的配置区在组件列表之前，整块 `[data-plugin-config]` 不存在）。`sidebarEntry: false`。

## 宿主判定链（app.asar 解包到 .tools/host）

1. `dsh/node_modules/@deepseek-ai/dsh-client-ui-plugin-manager/src/client/PluginManagerPage.tsx:819-825`：
   `{configured ? <section data-plugin-config>{renderSlot('plugins.bundle.config', {view:'page'}, {entryKey: pkg.name})}</section> : null}`
   编译产物同一逻辑在 `lib/client.js:274274`。
2. 同一文件 `:1817`：`configured={ledger.bundles.has(openPkg.name)}`。
3. `config-ledger.ts:40-71`（编译产物 `lib/client.js:2384-3088`）：
   `bundles = new Set(ctx.slots.entries('plugins.bundle.config').flatMap(e => e.options.key === undefined ? [] : [e.options.key]))`。
   也就是说：**详情页配置区是否渲染，只取决于账本里有没有以 bundle 包名为 key 的 `plugins.bundle.config` 条目**，与 settings describe、Config schema、sidebarEntry 都无关。
4. `slot-contract.ts:132-186`：`plugins.bundle.config` 是 `kind:'keyed', scope:'root'`，key 必须等于 bundle 包名；只有 `view:'page'` 一种视图。
5. 该 slot 由插件管理器自己的 `main` 注册声明（编译产物 `lib/client.js:329008`：`children: { …, "plugins.bundle.config": {kind:'keyed', scope:'root'}, … }`），页面能打开就说明声明已存在。

## 根因

**1.3.4 把「注册时机」改对了，但没把「注册是否发生」从 settings/React 依赖链里摘出来。**

1.3.4 的注册仍然在 `setupConfigPage()` 内部（`src/client.js:5034-5042`），而 `setupConfigPage` 只有走过下面这条链才会执行（`src/client.js:5370-5376`）：

```js
ctx.inject(['configForms', 'slots'], (child) => {
  const form = child.configForms?.get('dsh-structured')
  if (form) setupConfigPage(child, form)
})
```

然后在 `setupConfigPage` 入口还有四道**静默 return**（`src/client.js:3755-3775` 一带）：

- `typeof require !== 'function'`
- `typeof child?.configForms?.get !== 'function'`
- `child.slots.inject/register` 非函数
- `typeof form?.set !== 'function'`
- 之后 `require('react/jsx-runtime' / 'react' / primitives)` 失败、`ui.Switch/SegmentedControl` 非函数、`react.useState` 非函数也直接 return

任何一环不成立，**记账本 key 的那次 `slots.register` 根本不会发生**；宿主详情页看到 `ledger.bundles` 没有 `dsh-structured`，于是连 `[data-plugin-config]` 这层 section 都不渲染——不是卡片内容空白，而是整块区域不存在，正好对应用户看到的现象。

1.3.4 的假设错在哪：它认为「离开 `whileServed` 就与 settings 解耦了」。实际上 `whileServed` 只是最外层的一道门；`setupConfigPage` 依旧挂在 `ctx.inject(['configForms','slots'])` 之下，并且内部还有 require / primitives / hooks / `form.set` 四道静默门。宿主不关心这些门，只关心 key。

## 为什么自研 harness 通过、真实宿主不渲染

`test/client-config-page.test.mjs` 里所有注册断言都是**直接调用** `module.__test.setupConfigPage(child, form)`，并传入一个**同步构造好的 fake child**（`configForms.get` 直接返回 form、`slots` 的 inject 立即执行、register 只记录参数）。它验证的是「函数被调用后会不会 register」，从未验证：

- 真实宿主里 `ctx.inject(['configForms','slots'])` 的子 fiber 是否真的启动；
- 真实 `slots.inject` 的「等声明 → 回调 → register」生命周期；
- 详情页读 `ledger.bundles` 的时机与 key 的关系。

所以 harness 能证明「注册代码本身符合 API」（我们还用宿主 cordis 4.1.0 + 真 `ctx.inject` 跑过一遍，services 齐备时三个 slot 都能注册），但不能证明「真实宿主里 key 一定被注册」。

## 1.3.5 修复

最小改动（`src/client.js`，构建同步到 `lib/client.js`）：

- **apply 入口先占位**（`src/client.js:5336`）：先按已有的 `ctx.slots` 尝试注册；若 `slots` 服务尚未就绪，再走 `ctx.inject(['slots'])` 等它就绪后注册（`src/client.js:5338`）。这条链**只等 slots，不等 configForms/React**，向 `plugins.bundle.config` 注册 `key: 'dsh-structured'` 的占位组件。
- 占位组件是**纯字符串** `() => '配置正在加载…'`（`src/client.js:94`），不 require React/jsx/primitives，因此不会再被模块门禁挡住。
- `setupConfigPage` 的真实卡片注册前先撤占位（`src/client.js:5036`），避免同 key 两条互相遮蔽；真实卡片之后被卸载时恢复占位（`src/client.js:5060`），配置区不整块消失。
- 两行诊断日志：`bundle config slot placeholder registered` / `bundle config card registered`，用于重启后判断走的是哪条路。

新增测试 2 条（`test/client-config-page.test.mjs`）：

- 完全无 `configForms` 时，`apply` 仍注册 `plugins.bundle.config`，key=`dsh-structured`，组件返回占位字符串；
- 真实卡片注册前占位被 dispose，账本里最终是 `StructuredConfigCard`。

## 验证

- `npm run build`；`npm test` → **170/170**（原 168 + 2）。
- 版本 1.3.5；**未 commit / 未 push**。

## 重启后验证步骤

1. 重装/更新到 1.3.5 后重新打开 Desktop（客户端 bundle 在启动时组合，必须重开应用）。
2. 打开插件管理器 → 结构化输出 → 详情页。
3. 预期：组件列表之前出现设置卡；控制台有 `[dsh-structured] bundle config card registered`。
4. 若只看到「配置正在加载…」：控制台应有 `bundle config slot placeholder registered` 而没有 `bundle config card registered`，说明 `setupConfigPage` 的某道门仍在真实宿主里失败——把控制台文本带回即可定位具体门（这是本次无法在无重启、无令牌条件下读取的最后一环）。
5. 若仍无任何配置区：说明 `slots.inject` 连声明都没等到，控制台也不会出现上述任一日志，届时需要宿主 renderer 的 slot 声明日志。
