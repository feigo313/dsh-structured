# 交接：dsh-structured（2026-11-27 更新，1.3.7 已发布：GitHub / npm 1.3.7；市场 PR #19205 已指 v1.3.7，待合并）

> 这是**唯一可信起点**。旧会话因上下文过大归档；本文件把项目全量口径、当前状态、待办与踩坑一次写完。新会话请先读完本文件再动手。

---

## 1. 项目是什么

`G:\dsh-structured` —— DSH 插件 **dsh-structured**（npm 包名同名）。给 DSH 的回复加三层能力：

1. **结构化输出**：首句结论 + 表格/清单/步骤，规则注入 system prompt（`/structured on|off` 按会话开关）。
2. **人格模式（PersonaMode）**：模型只交一个 ` ```persona ` JSON 块，身份头 / 三卡（结论·建议·风险）/ 开场收尾由插件渲染；合同 + 专用尾部提醒都在 `src/index.js`。
3. **视觉皮肤**：客户端半区 `src/client.js` 给对话 markdown 加卡片/表格/代码块样式，三套主题（deepseek 蓝 / codex 绿 / anthropic 土褐）× 明暗。

宿主目标：DSH desktop（Electron）为主；desktop `0.2.2-rc.5` 于 2026-11-22 实测兼容（rc.3 起一路实测）；headless/CLI 不加载 client 半区。

---

## 2. 仓库结构

| 路径 | 作用 |
| --- | --- |
| `src/index.js` | 宿主半区：system prompt section（结构化规则 / 人格合同 / 尾部提醒 / tone 锚点）、`/structured` 命令、Config schema、状态文件 |
| `src/client.js` | 客户端半区：CSS 皮肤 + DOM 装饰（卡片/表格/代码/人格头/复制按钮）+ 插件详情页配置区 |
| `lib/` | 构建产物（`node scripts/build.mjs` 由 src 生成，**必须与 src 同步**） |
| `scripts/` | `build.mjs`、`desktop-check.mjs`、`theme-contrast.mjs`、`theme-hue-distance.mjs`、`style-gate.mjs`、`measure-prose.mjs` 等门禁脚本 |
| `test/` | node:test 套件（1.3.7 发布态 176 条断言，linkedom 真实 DOM + CSS 契约 + 语料回归辅助） |
| `docs/` | `MAINTENANCE.md`（手册，含 12.0 攒批规矩）、`MAINTENANCE-LOG.md`（逐轮记录）、`ACCEPTANCE-1.3.0.md`（最近一份 ACCEPTANCE；1.3.7 证据在 `RELEASE-1.3.7.md`）、`RELEASE-1.3.4.md`–`RELEASE-1.3.7.md`、`RELEASE-1.2.1.md` / `RELEASE-1.2.2.md` / `RELEASE-1.3.0.md`、`I18N.md`、`ROADMAP.md`、`PLAN-1.2.0-ENTRIES.md`、`CARD-SYSTEM.md` 等 |
| `locale/` | 中英文案 |
| `assets/` | 截图（`screenshots.json` 索引） |
| `.tools/` | **一次性脚本，不进包**（gitignore）：apply-*.mjs、market-*.mjs、push-*.mjs、corpus-persona.mjs、computed-style-check.mjs、theme-preview.mjs 等 |
| `HANDOFF.md` | 本文件（根目录，不进包） |

---

## 3. 当前状态（2026-11-27 更新 / 1.3.7 已发布）

- **1.3.7（已发布，当前版）**：修「占位后真实设置卡始终不接管」——`setupConfigPage` 在未 inject 的 child 上读 `locale`，Cordis 4.1.0 抛 `cannot get property "locale" without inject`，被注入回调的 catch 吞掉，`registerConfigCard()` 从未执行。修复：locale 探测包 try/catch + 每道门 `configDegrade('<缺失服务>')` 显式降级；`npm test` **176/176**；真实宿主 web 客户端（`http://127.0.0.1:56646`，与 Desktop 同一份 `app.asar` + profile）验到真实卡渲染、占位消失、开关写回、页面无异常。GitHub tag `v1.3.7`、Release 1,893,853 B（sha256 `5e6b2497…`）、npm 1.3.7（shasum `2f3aff6b…`）、远端 main `299e07d`、CI run `46007585146` success。发布文档 `docs/RELEASE-1.3.7.md`。
- **1.3.6（已发布，事故修复版）**：删掉 1.3.5 在 `apply()` 顶部对 `ctx?.slots` 的裸读，slot 占位只经 `ctx.inject(['slots'])` 注册；`npm test` **172/172**；tag `v1.3.6`、Release 1,888,259 B、npm 1.3.6（shasum `ef76e04d…`）。修复后 persona 卡片恢复，但设置卡只到「配置正在加载…」占位——由 1.3.7 收尾。`docs/RELEASE-1.3.6.md`。
- **1.3.5（已发布，事故版）**：为让详情页先拿到 slot key，`apply()` 第一条语句裸读 `ctx?.slots`（`src/client.js:5335`，try/catch 之外），宿主抛 `cannot get property "slots" without inject`，在 `enable()` 之前中断 → 客户端半区整体未激活，所有 persona 卡片掉成原始代码块。`npm test` 当时 170/170（未覆盖宿主语义）；tag `v1.3.5`、Release 1,883,603 B、npm 1.3.5（shasum `7c1dca65…`）。`docs/RELEASE-1.3.5.md`。
- **1.3.4（已发布，未完全生效）**：设置卡注册移出 `configForms.whileServed`，与 `sidebarEntry` 解耦；顺带修同卡 React hooks 顺序崩溃。`npm test` **168/168**；tag `v1.3.4`、Release 1,880,757 B、npm 1.3.4（shasum `3e79427b…`）。真实宿主仍无配置区（注册仍挂在 `setupConfigPage` 的 inject 与静默门下），1.3.5–1.3.7 才闭环。`docs/RELEASE-1.3.4.md`。
- **1.3.3（已发布）**：主题=内心OS（💭 尾缀）可读性——字号约 13px、颜色 `--dss-ink-2`（明暗主题均达 WCAG AA，ink-2 为 AAA 档）；`npm test` **165/165**，pack 64 文件 / 1,876,704 B；tag `v1.3.3`、Release 1,876,704 B、npm 1.3.3。
- **1.3.1（已发布）**：建议卡降级 / 抢救路径把 `[ROUTE]` 的 `]` 误判为数组结尾、产出幽灵空建议项；改为扫描器在字符串外判定结尾并加字段名闸。GitHub tag `v1.3.1`、Release 1,869,620 B、npm 1.3.1、市场 PR #19205 已指 v1.3.1。
- **1.3.2（已发布）**：模型偶尔把 ```persona 写成 `<persona>` 标签或裸 JSON，插件改为兜底识别；164/164 pass，GitHub tag `v1.3.2`、Release 1,875,625 B、npm 1.3.2、market 已指 v1.3.2。`CHANGELOG` 新条目中英双语（英文在前，`docs/I18N.md` 第 4 节）。
- 仓库：远端 `main` 现为 `299e07d`（fix: inject locale before reading it in config page (1.3.7)，tree `a31d8c57`，与本地 HEAD `07af34c` 同树异 sha；远端提交经 gh git-data API 重建）；1.3.0 发布提交 `4bd084e2`（release: dsh-structured 1.3.0 (innerOS salvage + i18n)，2026-11-26T16:59:56Z）仍在历史中，tag `v1.3.0`（annotated，远端对象 `842885fe` → commit `4bd084e2`，tagger 2026-11-26T17:00:13Z）；Release 资产 `dsh-structured-1.3.0.tgz`（1,865,727 B / sha256 `b2c20074…`，published 2026-11-26T17:00:28Z）。
- 本机 `main` HEAD `07af34c` 与远端 `main` `299e07d` **同树异 sha**（tree 均为 `a31d8c57…`；远端提交经 gh git-data API 重建）；1.3.0 发布期的配对是 `2d611a1` ↔ `4bd084e2`（tree `a84eb10d…`）。以远端 sha 为准，**不要 force push**；本机 `origin/main` 缓存仍是旧值（未 fetch）。1.2.0 对齐前的开发提交仍在分支 `local-pre-release-20261126`。
- 1.2.2（前一版）：`48468f9`（main 头，fix(ci) 补 pack 基线）+ `26b44ed`（release 1.2.2）+ tag `v1.2.2`（远端对象 `422e99de` → `26b44ed`）+ npm `1.2.2` + Release 资产 1,830,526 B；再前一版 1.2.1 = `51d9964` + tag `v1.2.1` + 1,828,942 B。
- npm：`dsh-structured@1.3.7` 已发布，latest = 1.3.7（64 文件 / 1,893,853 B / unpacked 2,935,689 B / shasum `2f3aff6b…`）；1.3.4–1.3.6 依次 64 / 1,880,757 / 1,883,603 / 1,888,259 B。
- 市场（awesome-dsh-plugin）：活动 PR **#19205 open**（head `feat/dsh-structured-1.3.0-clean`；标题与 diff 已改指 v1.3.7，diff 仅 `data/plugins/feigo313__dsh-structured.yml` 一行 tarball v1.2.2→v1.3.7；PR 正文仍写 v1.3.0 未同步；MERGEABLE，check 仍在上游排队）。上游 listing 的 tarball **仍指 v1.2.2** —— 合并前不算生效。旧 PR **#19152 已 CLOSED**（fork 基线过期）；上一版 #19092 已 MERGED（v1.2.2）。
- 桌面：profile 已装 `1.3.7`（`~/.dsh/profiles/desktop/node_modules/dsh-structured/package.json` = 1.3.7，lock 依赖同为 1.3.7）；1.3.7 的验收走真实宿主 web 客户端（`http://127.0.0.1:56646`，与 Desktop 同一份 `app.asar` + profile `client.js`）：`[data-dsh-structured-config]` 真实卡出现、占位消失、五区块渲染、开关 false→true→false 写回「已保存」、`__dshErrors` 为空。Desktop 进程若仍载旧 bundle，重开 Desktop 即生效。
- 门禁（2026-11-27 1.3.7）：`npm test` **176/176**（1.3.6 172、1.3.5 170、1.3.4 168、1.3.3 165）；`npm pack` 64 文件 / 1,893,853 B / unpacked 2,935,689 B（与 GitHub Release 资产同尺寸）；`desktop-check` / 对比度 80 / 色相 12 / 计算样式 10×10 在 1.3.4 全 PASS，1.3.5–1.3.7 未复跑；`style-gate` 未复跑（最新证据 `artifacts/style-gate/2026-11-26T12-12-56-015Z`，早于 1.3.4 提交）→ 未验证。
- DSML 残片：上游网关问题（非本插件），待上游修复；本仓不改解析器。
- 截图：仍为 1.2.0 实机 `13-settings-1.2.0.png` / `14-color-picker-1.2.0.png`（已脱敏裁切）；`screenshots.json` 共 10 张；1.2.1–1.3.7 未新增截图。
- 下一版：待定；市场 PR #19205 合并与 1.3.7 实机反馈仍是前提。
- 定时任务：原挂 `session-20a027e0` 的 6 个 active 任务已迁到本会话 `session-231e379d`：Issue 追踪轮询 / 每日插件更新检查 / dsh-structured 项目巡检 / H3 生态 / omp 巡检 / DSH 每周健康。
---

## 4. 发布流程（照做，别自创）

> **「push / 推」口径（Boss 2026-11-20 定，硬规则）**：Boss 说「push」= **三端齐发**——① GitHub（main + tag + Release + 资产）② npm publish ③ 插件市场 PR；不是只做 `git push`。缺任何一端都算没发完，必须补到三端一致再回报。

**攒批规矩**（`docs/MAINTENANCE.md` 12.0，自 **1.1.6** 起硬性）：同一版本号满足其一才发——① 修复 ≥3 条 bug；② <3 条但跨过「发现日 D + D+1 整日」无新增，D+2 可发（按自然日，不要求满 48 小时）。纯文档/断言/清理不计条数，同一 bug 返工不重复计数。

**发版链**（每一步都要 Boss 明说同意；consent token `~/.zcode/push-consent` 30 分钟有效）：

```bash
node scripts/build.mjs
npm test && node scripts/desktop-check.mjs && node scripts/theme-contrast.mjs && node scripts/theme-hue-distance.mjs
# 版本号 / CHANGELOG / ACCEPTANCE / pack 基线（test/pack.test.mjs 的 PINNED_*）
git tag -a vX.Y.Z -m "..." && git push origin main && git push origin vX.Y.Z
npm pack --ignore-scripts && npm publish dsh-structured-X.Y.Z.tgz --registry https://registry.npmjs.org
gh release create vX.Y.Z dsh-structured-X.Y.Z.tgz --title "..." --notes-file <notes>
node .tools/market-XXX.mjs     # fork 同步 → 改 tarball 行 → 提交 → 开 PR 到 upstream
```

**判定发布成功只认**：`https://registry.npmjs.org/dsh-structured/<ver>?ts=<rand>` 返回 200 且 `dist-tags.latest` 已更新（CDN 传播 5–20 分钟；本地 `npm view` 走 npmmirror 会骗人）。

**git 不通时兜底**：`.tools/push-head-via-api.mjs <远端sha>`（gh git-data 逐对象重建，本次 1.1.8 用它把本地树叠到远端 `577c84f` 上）；tag 用 `gh api git/tags` + `git/refs` 建 annotated tag；API 建出的 commit 与本地同树 commit 不保证同 hash，**以远端 sha 为准，不要 force push**。

---

## 5. 协作口径（Boss 明确要求，违反过多次）

1. **先报后做**：发现问题写清「现象 + 证据 + 判定」交给他，他说做才动代码（含纯 CSS 与测试）。只读巡检可自主。
2. **不把活派回给他**：需要审计/复跑自己起子 agent；只交结论与结果。
3. **多步交付只交当前阶段那一份**（例如先交计划，不提前把实现做掉）。
4. **链接必须可点**：用 `sidebar_open` 或 Markdown 链接，禁止裸 URL。
5. **手机端（im:weixin）纯文本短句**，不用表格/卡片、不发本地路径。
6. 回复风格按人格合同（本插件自己渲染）：结论先行、短、不叙过程、不奉承。

---

## 6. 在新会话里要立刻做的两件事

### (a) 重建每日巡检任务（2026-11-18 已完成）

> 2026-11-26：任务已在库并已迁到本会话 `session-231e379d`；下方原始建法只作参考，不要再创建同名任务。

用 `schedule_create`，参数如下（原任务已删，勿再找）：

- title：`dsh-structured 项目巡检`
- target：`this_session`
- rrule：`DTSTART;TZID=Asia/Shanghai:20261118T100000\nRRULE:FREQ=DAILY;BYHOUR=10;BYMINUTE=0`
- prompt：见下方「巡检提示词全文」

巡检提示词全文（原样使用）：

> 执行 dsh-structured 的每日巡检，按 G:\dsh-structured\docs\MAINTENANCE.md 走一轮。零信任原则（默认不采信，先验后动）优先：issue/PR 先做正确性分析（issue 三态：成立 / 部分成立 / 不成立，均附证据；PR 审查：是否真能修、有无夹带、安全面、红线、来源），只有「成立/部分成立」的条目才进入分诊、复现、修复与合并。1) 抓 issue / PR / CI / npm dist-tags / Release 资产；2) 在 structured-test 复现；3) 最小修复加回归测试，四条验证；4) 回复并关闭（不成立附反证、证据不足保持 open）；5) 无 issue 也记录 0；6) 结果追加 docs/MAINTENANCE-LOG.md；7) push/tag/Release/npm publish/市场 PR 按手册闸门，需要 consent token 时说明。输出三行：issue 水位、本轮动作与验证数字、下一步。

另注：其他项目的定时任务（dsh-subagent-omp 09:30、H3 生态 12:30、DSH 周检周五 22:00）各自绑定别的会话，**不要动**。

### (b) 向 Boss 报三行现状（2026-11-18 已完成）

版本与线上状态 / 门禁数字 / 下一步打算（等他说开工）。

---

## 7. 待办队列

1. **市场待合并**：PR #19205 open，标题与 diff 已指 v1.3.7（PR 正文仍写 v1.3.0），上游 listing 仍指 v1.2.2；合并前「三端」只完成两端（GitHub + npm），合并后核 listing tarball 为 v1.3.7。
2. **1.3.x 观察**：issue/PR 按零信任处理；攒批规矩见 `docs/MAINTENANCE.md` 12.0。本仓 0 open issue / 0 open PR（历史 3 issue 全 CLOSED、1 PR 已 MERGED）；市场侧 1 个 open PR（#19205）。
3. **桌面**：profile 已是 registry 1.3.7（package.json / lock 一致）；1.3.7 经真实宿主 web 客户端验过设置卡（渲染 / 占位消失 / 开关写回），Desktop 重开后加载 1.3.7 的实机记录可补。
4. **文档**：HANDOFF / `docs/RELEASE-1.3.4.md`–`docs/RELEASE-1.3.7.md` / `docs/MAINTENANCE-LOG.md` 已与 1.3.7 一致；`docs/ACCEPTANCE-1.3.0.md` 仍是最近一份 ACCEPTANCE，1.3.7 验收证据在 `RELEASE-1.3.7.md`。
5. **长期项**（`docs/ROADMAP.md`）：A = 用户头像落本地数据目录；C = persona 抗漂移实测。
6. **已知限制**：信封字符串截断仍会降级；没有任何 persona 块的回复只能靠合同/提醒压概率（1.2.1 起尾部提醒追加风格硬约束与 innerOS 必填）。
7. **发布物可复现**：pack 基线在 `test/pack.test.mjs`（PINNED 64 文件 / 1,893,853 B / unpacked 2,935,689 B，±16 KB 容差）；当前仓库重打包 64 / 1,893,853 / 2,935,689（与发布物一致）。发版前先 `npm pack --json --ignore-scripts` 对一遍。
8. **style-gate**：1.3.4–1.3.7 均未复跑（`artifacts/style-gate/` 最新目录 2026-11-26T12-12-56-015Z，早于 1.3.4 提交）→ 下次发版前补跑留证。
9. **DSML 残片**：上游网关问题，非本插件；等上游修，不在本仓动代码。
---

## 8. 验证命令（缺一不可）

```bash
cd /g/dsh-structured
npm test                                   # 176/176（1.3.7；1.3.6 172、1.3.5 170、1.3.4 168）
node scripts/desktop-check.mjs             # 全 PASS
node scripts/theme-contrast.mjs            # 80/80
node scripts/theme-hue-distance.mjs        # 12/12
node .tools/computed-style-check.mjs       # 10 主题块 × 10 项（含 custom；headless Edge）
node .tools/corpus-persona.mjs             # 真实会话语料回归（近期信封全部出卡）
npm pack --json --ignore-scripts           # 64 文件 / 1,893,853 B（与发布物一致），基线在 test/pack.test.mjs（±16 KB 容差）
```

---

## 9. 踩坑速查（都是实测撞出来的）

- `npm publish` 必须 `--registry https://registry.npmjs.org`；本机默认 npmmirror 会「假成功」。
- `git push` 到 github.com 经常 `Connection reset` / TLS 失败；用 gh git-data 兜底脚本，别 force。
- bash 双引号里的反引号会被 shell 执行（改 CHANGELOG 时踩过两次）→ 改文档写 `.mjs` 脚本，改完回读校验。
- **工作区行尾会漂**：`.gitattributes` 要求 LF，但 2026-11-18 实测 README / `docs/1.0-3-RELEASE-CHECKPOINT.md` / `test/persona-ui.test.mjs` 仍是 CRLF。写文档统一 LF 并回读，否则 `npm pack` 体积随检出状态漂移（1.1.5 发布包比仓库重打包大 78 B 就是这个原因）。
- CSS 特异性：`.dss-table tbody td{background:transparent}`（0,2,2）会盖掉状态色规则（0,2,1），已修但同类问题还会再来——加规则前算特异性。
- 表格列宽改为按内容：`decorate` 逐列量显示宽度（CJK=2 / ASCII=1，含表头，≤12 单位标 `data-dsh-structured-col="narrow"`），尾列在 3 列以上且中间更长时标 `tail="capped"`（≤32%）；**不再按列数写死 26%/18%**。流式半截表跳过测量；设置页预览 `CONFIG_CSS` 与会话皮肤 `CSS` 两处常量要同步。2026-11-18 实测：索引表首列 40px、正文表中间 56.3%、尾列 31.8%。
- `:first-child` 只看元素节点：行内 `**粗体**` 变成 `strong` 后会命中标题规则，已用 `data-dss-inline` 排除。
- 流式信号是**空串属性**（`data-streaming` / `data-chat-running`），不能按 `="true"` 匹配。
- 桌面 profile 由 Electron 独占，不能用 `dsh plugin --profile desktop`；预览只能手工替换 `node_modules/dsh-structured` 或 `pnpm add`，且会被下一次 install 覆盖。
- 宿主侧（system prompt）改动要重开 Desktop 才生效；client 侧热更。
- **Cordis 4.1.0 未 inject 读服务即抛**：`cannot get property "<service>" without inject`。1.3.5 裸读 `ctx.slots` 让整个 client 入口未激活（全部 persona 卡片变原始代码块）；1.3.7 `child.locale` 未 inject 又让真实设置卡被 catch 吞掉。读服务要么在 `inject` 的 child 上，要么 try/catch 降级。
- **单测 fake ctx 会骗人**：直调 `__test.setupConfigPage` / 普通对象 ctx 不模拟 Cordis 代理语义。发布门必须含宿主式加载（真 Cordis 4.1.0 + 发布产物 `lib/client.js`）与真实 web/Desktop 客户端冒烟。
- **DSML 残片是上游网关问题**，不是本插件；遇到不要在本仓改解析器。
- 桌面端禁止要求 Boss 按 F5/刷新。

---

## 10. 文档地图

| 文件 | 内容 |
| --- | --- |
| `docs/MAINTENANCE.md` | 手册：巡检流程、缺陷三态判定、发布门槛（9 节）、攒批规矩（12.0）、待发清单（12.1） |
| `docs/MAINTENANCE-LOG.md` | 逐轮记录（顶部为 1.3.7 / 1.3.6 / 1.3.5 / 1.3.4 发布与事故记录；其下 1.3.0 与 2026-11-27 巡检、1.2.2、1.2.1、1.2.0） |
| `docs/ACCEPTANCE-1.3.0.md` | 1.3.0 验收与 pack 数字（1.3.1–1.3.7 的验收证据见各版 `docs/RELEASE-*.md` 与 `MAINTENANCE-LOG.md`） |
| `docs/RELEASE-1.2.1.md` / `docs/RELEASE-1.2.2.md` / `docs/RELEASE-1.3.0.md` / `docs/RELEASE-1.3.4.md`–`docs/RELEASE-1.3.7.md` | 各版发布记录（tag / CI / 资产 / 三端） |
| `docs/ROADMAP.md` | 1.1/1.2 候选 |
| `docs/PLAN-1.2.0-ENTRIES.md` | 侧边栏入口计划（1.2.2 已实现开关） |
| `CHANGELOG.md` / `README.md` / `README.zh.md` | 对外说明（1.3.0 起 README 英文默认 + README.zh.md，顶部可切换） |
