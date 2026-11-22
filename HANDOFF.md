# 交接：dsh-structured（2026-11-22 更新，1.1.8 已发布）

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
| `test/` | node:test 套件（129 条断言，linkedom 真实 DOM + CSS 契约 + 语料回归辅助） |
| `docs/` | `MAINTENANCE.md`（手册，含 12.0 攒批规矩）、`MAINTENANCE-LOG.md`（逐轮记录）、`ACCEPTANCE-1.0.0.md`（逐版验收）、`ROADMAP.md`、`PLAN-1.2.0-ENTRIES.md`、`CARD-SYSTEM.md` 等 |
| `locale/` | 中英文案 |
| `assets/` | 截图（`screenshots.json` 索引） |
| `.tools/` | **一次性脚本，不进包**（gitignore）：apply-*.mjs、market-*.mjs、push-*.mjs、corpus-persona.mjs、computed-style-check.mjs、theme-preview.mjs 等 |
| `HANDOFF.md` | 本文件（根目录，不进包） |

---

## 3. 当前状态（2026-11-22 22:30 实测 / 1.1.9 已发布，版本 1.1.9）

- 仓库：远端 `main` = `13245f3`（1.1.9 发版提交，GitHub API 推送）；tag `v1.1.9` annotated（对象 `1695efeb` → commit `13245f3`）；CI `45032934658` success。
- 本机 `main` = `854c95c`（1.1.9 发版提交，parent `ea3b8cb`；与远端同树、不同 hash：API 建 commit 与本地 commit 字节编码不一致）；**本地不建 v1.1.9 tag，以远端 tag 为准**；1.1.8 备份分支 `backup/main-pre-1.1.8` = `c8bcc1e`。
- npm：`dsh-structured@1.1.9` 已发布，latest = 1.1.9（shasum `5d56b9d9`；registry 确认）。
- 市场（awesome-dsh-plugin）：PR **#17858 open**（listing tarball 指向 `v1.1.9`；1.1.8 的 #17827 已关闭，标注 superseded）。
- 桌面 profile：仍装 1.1.7（应用运行中，未安装 1.1.8 / 1.1.9；需要时备份后 `pnpm add dsh-structured@1.1.9`）。
- 门禁（2026-11-22 发布复跑）：`npm test` 129/129；`desktop-check` 全 PASS（真实宿主 0.2.2-rc.5）；对比度 80/80；色相 12/12；计算样式 8 主题块 × 10 项全过；`npm pack` 58 文件 / **1,377,795 B** / unpacked 2,098,890 B。
- 截图：01 / 09-theme-light / 09-theme-dark / 10-theme-dark 已改为 1.1.9 渲染示意（真实 CSS + 默认头像，不含会话内容）；06 / 07 / 11 保留为历史实机图，README 折叠展示。
- 定时任务：每日巡检「dsh-structured 项目巡检」已重建（每天 10:00 Asia/Shanghai，target=本会话）。
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

1. **1.2.0 侧边栏入口**（Boss 口径：**只做侧边栏，不做设置页**）——计划见 `docs/PLAN-1.2.0-ENTRIES.md`：注册 `main` 面板 + `sidebar.panellist` 一行「结构化输出」，面板复用现有配置卡；**动手前先实机验证「点行是否真的选中同 key 面板」**（宿主无公开跳转 API，是最大未知）。
2. **1.1.6 已发布**（2026-11-18：npm `dsh-structured@1.1.6` / tag `v1.1.6` / Release 资产 1,495,212 B / 市场 PR #16480）；1.1.7 待发清单为空（12.1 已重新计数）。
3. **截图**：06 / 09-theme-light / 09-theme-dark / 10-theme-dark 已于 2026-11-18 用 1.1.6 实机重拍（本机 GUI，装 1.1.6 后）；01 / 07 / 11 不含表格、不受列宽变更影响，保留 1.0.4 实机图。
4. 已知未修：信封里字符串被截断的那类仍然降级（补引号会造假内容，刻意不修）；没有任何 persona 块的回复只能靠合同/提醒压概率。
5. 长期项（`docs/ROADMAP.md`）：A = 用户头像落本地数据目录（不写进配置）；C = persona 抗漂移实测（12 类提示词产出率 ≥90%）。
6. **发布物可复现**：工作区 CRLF 已于 2026-11-18 归一（README、`docs/1.0-3-RELEASE-CHECKPOINT.md`、`test/persona-ui.test.mjs` → LF）；发版打包前按 12.2 第 4 条先确认工作区 LF。
7. **1.1.7 主题**：`dsh`（黑白原色）已实现并随 main 推送（远程 `7368ae2`）——纯灰阶、映射 DSH 宿主 alias、状态用符号；设置页第一项 `DSH`，DeepSeek 蓝与默认值不动；实机截图已入 issue #6（带图回复后已关闭）。搭车修复 persona 中途闭合残片泄漏（seq 432 原文回归）与无信封中间消息误挂身份头。待办：发布 1.1.7（bump + 截图 09/10/11 + tag/npm/Release/市场）；自定义配色后置。

---

## 8. 验证命令（缺一不可）

```bash
cd /g/dsh-structured
npm test                                   # 127/127（node:test + linkedom）
node scripts/desktop-check.mjs             # 全 PASS
node scripts/theme-contrast.mjs            # 60/60
node scripts/theme-hue-distance.mjs        # 12/12
node .tools/computed-style-check.mjs       # 6 主题块 × 9 项（headless Edge，读 getComputedStyle）
node .tools/corpus-persona.mjs             # 真实会话语料回归（近期信封全部出卡）
npm pack --json --ignore-scripts           # 58 文件，体积基线在 test/pack.test.mjs（±16 KB 容差）
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
- 桌面端禁止要求 Boss 按 F5/刷新。

---

## 10. 文档地图

| 文件 | 内容 |
| --- | --- |
| `docs/MAINTENANCE.md` | 手册：巡检流程、缺陷三态判定、发布门槛（9 节）、攒批规矩（12.0）、待发清单（12.1） |
| `docs/MAINTENANCE-LOG.md` | 逐轮记录（最近：38 巡检、39 1.1.5 破例发布、40 全量审计、41 巡检、42 列宽重做、43 1.1.6 发布） |
| `docs/ACCEPTANCE-1.0.0.md` | 逐版验收记录与 pack 数字 |
| `docs/ROADMAP.md` | 1.1/1.2 候选 |
| `docs/PLAN-1.2.0-ENTRIES.md` | 侧边栏入口计划（待开工） |
| `CHANGELOG.md` / `README.md` | 对外说明（README 已同步 1.1.x 实况） |
