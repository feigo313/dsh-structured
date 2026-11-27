# 1.3.7 — 修真实宿主里设置卡不接管占位（child.locale 未 inject）

日期：2026-11-27　基线：1.3.6（fcaba3b）　宿主目标：DSH Desktop / Cordis 4.1.0　真实 web GUI：http://127.0.0.1:56646

## 现象

Boss 重启 Desktop 到 1.3.6 后，persona 卡片已恢复（1.3.6 修好裸读 `ctx.slots`），插件详情页也出现了「配置正在加载…」占位——说明 `ctx.inject(['slots'])` 回调与占位 register 都成功。但**真实设置卡始终没有接管**：占位一直停在加载态，详情页里改不了任何配置。

## 根因（文件:行 + 异常文本）

1. 1.3.6 的 `src/client.js:3775-3781`：

   ```js
   function setupConfigPage(child, form) {
     if (typeof require !== 'function') return
     if (typeof child?.configForms?.get !== 'function') return
     if (typeof child?.slots?.inject !== 'function' || typeof child?.slots?.register !== 'function') return
     if (typeof form?.set !== 'function') return
     if (child?.locale && typeof child.locale.getSnapshot === 'function' && localeService !== child.locale) localeService = child.locale
   ```

2. 调用点是 `ctx.inject(['configForms','slots'], (child) => …)`（`src/client.js:5414`，1.3.6 同）。**`locale` 不在依赖清单里**，Cordis 4.1.0 的服务代理读未 inject 属性直接抛：

   ```text
   cannot get property "locale" without inject
   ```

3. 异常发生在 `registerConfigCard()` 之前，被 apply 注入回调的 `catch` 吞掉，真实卡片从未注册；占位（apply 入口用 `inject(['slots'])` 注册）继续渲染「配置正在加载…」。

真实宿主控制台证据（1.3.7 诊断 instrumentation，未修前）：

```text
[dsh-structured][config-diag] slots.inject.fired · slots=object
[dsh-structured][config-diag] slots.placeholder · installed
[dsh-structured][config-diag] configForms.inject.fired · form=set=function,getSnapshot=function,subscribe=function,status=loading
[dsh-structured][config-diag] configForms.inject.failed · cannot get property "locale" without inject
```

1.3.6 的 172 条测试没抓到，是因为测试里的 `child` 是普通对象，`child.locale` 可读或不存在，从未模拟宿主代理「未 inject 即抛」的语义。

## 修复

- **`src/client.js:3803-3812`**：locale 探测包进 try/catch。读失败只记一条 `gate.locale` 诊断，不再中断建卡；语言仍由 apply 的 `ctx.inject(['locale'])` 或 document/navigator 决定。
- **`src/client.js:3798-3826`**：余下每道门（`require` / `configForms` / `slots` / `form.set` / React / UI primitives）改为 `configDegrade('<具体缺失服务>')`：写 `console.warn`、把占位文案改成 `配置不可用：<原因>`，不再静默 return。
- **`src/client.js:140`**：`configDegrade` 统一收敛原因，必要时撤掉旧占位并按新原因重新注册；`configDiag` 保留少量 `[dsh-structured][config-diag]` info 行（`configForms.inject.fired` / `gate.locale` / `card.registered`）。
- **`src/client.js:4623-4634`**：宿主表单未 ready 时，卡片显示具体配置状态（新增 i18n key `meta.statusDetail`），不再只有「插件未加载或配置暂不可用」。
- **`src/client.js:5397`**：`__test.configDiagState()` 暴露 `reason` / `cardActive` / `fallbackFailed` / `placeholderOff`，供测试与现场排查。

## 证据（真实宿主 web 客户端，非 harness）

工具：ego lite 打开 `http://127.0.0.1:56646`（与 Desktop 同一份 `app.asar` + profile `client.js`，未重启 Desktop），CDP 注入 console/exception 捕获后加载插件详情页。

| 项 | 1.3.6（修前） | 1.3.7（修后） |
| --- | --- | --- |
| `[data-plugin-config]` | 有（占位） | 有（真实卡） |
| 占位「配置正在加载…」 | 在 | 消失 |
| `[data-dsh-structured-config]` | 无 | 在 |
| 区块 | — | appearance / behavior / persona / depth / preview |
| 控制台 | `configForms.inject.failed · cannot get property "locale" without inject` | `gate.locale · ignored: …` → `card.registered · component=StructuredConfigCard` |
| 开关写回 | 不可改 | 子代理注入 false→true→false，状态行出现「已保存」 |
| 页面异常 | 无 | 无（`__dshErrors` 为空） |

截图：

- `.tmp/ego-137/1.3.7-detail-ready.png`（修后整页：真实卡 + 五区块）
- `.tmp/ego-137/1.3.7-toggle-restored.png`（切换后已还原）
- `.tmp/ego-137/detail-instrumented2.png`（修前：占位 + 失败门日志所在页面）

## 验证

| 项 | 结果 |
| --- | --- |
| `node scripts/build.mjs` | exit 0；构建器报数 `lib/index.js` 41,972 字符 / `lib/client.js` 305,366 字符；实盘 56,250 B / 329,311 B |
| `npm test` | **176/176 pass**（1.3.6 为 172，新增 4 条宿主式回归） |
| `npm pack --json --ignore-scripts` | **64 文件 / 1,893,853 B / unpacked 2,935,689 B**（`dsh-structured-1.3.7.tgz`） |
| 真实 web GUI | 见上表，卡片渲染、开关可改、占位撤掉 |

### 新增回归（4 条，`test/client-config-page.test.mjs`）

| 测试 | 覆盖 |
| --- | --- |
| `宿主兼容：child.locale 未 inject 抛错时仍注册真实卡片（1.3.7）` | 严格 Proxy 读 `locale` 必抛；真实卡片仍注册，`reason=null` |
| `宿主兼容：apply 的 configForms+slots 注入回调不会因 locale 抛错丢掉卡片（1.3.7）` | 走真实 `ctx.inject` 回调路径，form 处于 `loading` 也注册卡片 |
| `config page：服务缺失时占位文案写出具体原因，不再静默（1.3.7）` | form.set 缺失 → `reason` 与占位文案都包含 `form.set` |
| `config page：表单未就绪时显示具体状态（1.3.7）` | 卡片 unavailable 态显示 `配置状态：unavailable` |

pack 基线：`test/pack.test.mjs` 的 PINNED 由 1.3.6 的 1,888,259 / 2,917,135 更新为 **1,893,853 / 2,935,689**（仍按 ±16 KB 容差校验）。

## 风险与边界

- 降级仍是「尽力而为」：`slots` 永不出现或宿主拒绝 register 时，详情页可能没有配置区；现在至少会在控制台与（能注册时）占位文案里写出具体原因。
- 只改客户端设置卡路径；宿主版式、prompt 合同、配置 schema、历史消息均未改。
- profile 的 `package.json` 依赖仍标 1.3.6（pnpm lock），本轮只替换了 `node_modules/dsh-structured` 的产物做真实验收；正式安装 1.3.7 需按发布流程更新 profile。
- 未 commit / tag / push / npm publish / 市场 PR。
- Desktop 端无需手动刷新即可在下次启动加载新 bundle；web GUI 侧通过 ego 重新加载页面已验收。

## 变更文件

- `src/client.js`、`lib/client.js`（build 同步）
- `test/client-config-page.test.mjs`（+4 宿主式回归）
- `test/pack.test.mjs`（基线 1,893,796 / 2,935,550）
- `package.json`（1.3.7）、`CHANGELOG.md`、本文件
