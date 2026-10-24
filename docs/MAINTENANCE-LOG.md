# 维护记录 · dsh-structured

每轮巡检追加一条。格式见 [`MAINTENANCE.md`](MAINTENANCE.md)。

## 2026-10-21 · 第 1 轮（上线当日）

- **issue 水位**：0 open / 0 closed（`gh issue list --state all` 与 `gh api .../issues?state=all` 均为空）；PR 0。
- **CI**：`ci` success（run `39609986134`，14s，2026-10-21T13:40:05Z）。
- **npm**：`dsh-structured@0.7.4` 为 latest；tarball 756,986 B，sha1 `a95c0f8a…`，sha256 `dbd2935f…`。
- **GitHub Release**：`v0.7.4`，asset `dsh-structured-0.7.4.tgz` 756,988 B，sha256 `9b53a9fb…`。
- **本地验证**：`npm test` 30/30；`desktop-check` 全 PASS；`npm pack` 34 文件，审计类文档排除生效。
- **远端一致性**：远端 `main` `e2a2416` 与本机 `e67a06b` 内容一致；仅 `docs/RISK-ROLLBACK.md`、`docs/VISUAL-ACCEPTANCE.md` 的 blob 哈希不同，原因是本地 CRLF（`core.autocrlf=true`），`git hash-object --no-filters` 与远端 blob 相同。
- **发现**：Release asset 与 npm tarball 内容仅差 `CHANGELOG.md` —— asset 内是旧稿（截图数量写作"8 张"），npm 内为"4 张"；其余 33 个文件 SHA-256 一致。判 P2：市场条目指向 release asset，提市场前重发该资产（需 Boss 同意）。
- **本轮动作**：新增本手册与日志；`package.json` 的 `files` 增加 `!docs/MAINTENANCE*.md`，打包仍为 34 文件。
- **跟进（同日 22:34）**：用 npm 发布包替换 `v0.7.4` Release asset；GitHub 侧 digest 变为 `sha256:dbd2935f…`、756,986 B，与 npm 包一致。旧资产备份在 `.tools/artifacts/v0.7.4-release-asset-before-fix.tgz`；仓库根的 `dsh-structured-0.7.4.tgz` 同步替换。`docs/RELEASE-NOTES-0.7.4.md` 的校验数字已更正。
- **跟进（同日 22:38）**：`gh release edit` 把 Release 正文同步为更正后的 `docs/RELEASE-NOTES-0.7.4.md`；市场 YAML 增加 `tarball` 指向 `v0.7.4` 资产。市场前置条件已核对：`dsh-plugin` topic 已有、`dsh.bundle` 已声明、`category: session` 与同类插件 `hoyyang/dsh-concise` 一致、仓库年龄门槛 `MIN_AGE_DAYS=1`。
- **定时**：已建本会话调度——每日 10:00（+08）巡检；2026-10-22 21:40（+08）市场提交。
- **观察**：npm 上还留有早期占位版本 `0.0.0-stage`（不是 `latest`，不影响安装）；npm token 已撤销，暂不处理。
- **下一步**：等市场窗口（2026-10-22 21:33 +08）；下一轮继续看 issue 与 CI。

## 2026-10-22 · 第 2 轮

- **issue 水位**：0 open / 0 closed（CLI 与 API 双查）；PR 0。
- **线上复核**：npm `latest` 仍为 0.7.4；Release asset `sha256:dbd2935f…`、756,986 B（与 npm 一致，昨日修复保持）；CI 最近一次 success；市场仓库尚不存在 `feigo313__dsh-structured.yml`，无重复条目。
- **仓库年龄**：12 小时，未满 1 天。
- **本轮动作**：无代码改动，未跑 headless（无 issue 可复现）。
- **下一步**：21:40 市场提交任务；下一轮巡检 2026-10-23 10:00。
- **流程变更（Boss 指示）**：采用零信任原则（默认不采信，先验后动）——issue 与 PR 一律先做正确性分析再动作；手册新增第 2 节（issue 三态判定、PR 六项审查、信任边界），日巡检提示词已同步。

## 2026-10-22 · 市场提交轮（21:40）

- **市场 PR 已存在**：`awesome-dsh-plugin/awesome-dsh-plugin#8680`（2026-10-22T10:23:55Z，18:23 +08），分支 `feigo313:add-dsh-structured-0.8.2`，仅新增 `data/plugins/feigo313__dsh-structured.yml`，未改 README。
- **校验**：`check` success；`Submission gate` failure 只有一条——仓库年龄 0.9 天（<1），gate 文案明确"自动重跑、勿 push/重开"；`regate` cron `19 */6 * * *`，最近一次 12:42Z 仍 <1 天，预计 18:4xZ 转绿。
- **资产**：npm 0.8.2 tarball sha256 `b3241471…` == Release `v0.8.2` asset digest；条目 `tarball` 指向 v0.8.2；本地 YAML 与提交分支内容一致（commit `7caaae3`）。
- **本轮动作**：复核，不重复提交、不 push、不关闭重开；无 push 故不需要 consent token。
- **待办**：等下一次 regate 转绿后确认，跟踪评审评论。

## 2026-10-22 · 0.8.3（标题卡缺失诊断与修复）

- **现象**：`session-7c53ec1e`（jianying 克隆汇报）两轮回复都没有 `> **标题**` 首卡。
- **证据**：该会话 `system/message` 命中注入 1 条（0.8.2 文本 + GenUI 路由），视觉层正常（表格结论 lead 生效）；原始回复首段是普通段落，主卡改用 `dsh-ui`（title=jianying-headless 克隆结果 + keyvalue + callout）。结论：不是市场更新或渲染故障，是模型把 GenUI 当主卡、跳过插件标题卡。
- **修复（0.8.3）**：`GENUI_ROUTING_TEXT` 明确「dsh-ui 只能跟在标题卡与正文之后，不得用 title 充当首卡，不得承载结论/风险/下一步；宿主默认出 UI 时以本节为准」；`TAIL_REMINDER_TEXT` 改为「第一段必须是 markdown 标题卡，组件只能排在标题卡之后、不得充当首卡」；同步测试断言。
- **验证**：`npm test` 36/36；desktop-check 全 PASS；pack 39 文件 / 763816 B / unpacked 964414 B；`structured-test` 已装 0.8.3（lib hash 一致），两轮 headless 首段均为 `> **` 标题卡（`session-2aa045fb`、`session-c1253adf`）。
- **市场**：PR #8680 的 `check` 与 `Submission gate` 均已 pass，`mergeStateStatus=CLEAN`。
- **待决**：0.8.3 未发布；desktop 仍 0.8.2，发布后才生效。

## 2026-10-22 · 0.8.3 发布

- **npm**：`dsh-structured@0.8.3` 已发布（shasum `9fc15c64…`、39 文件、unpacked 964444 B）；官方 registry `latest=0.8.3`。
- **GitHub**：远端 `main` `7e08c3c`（`gh api` git data 快进，内容同本地 `8505bfc`）；Release `v0.8.3` 资产 `dsh-structured-0.8.3.tgz` 763,827 B、sha256 `29a14044…`（与 npm 包字节一致）。
- **市场**：PR #8680 分支条目已更新到 v0.8.3（commit `484cf71`），PR 正文同步 v0.8.3；check/gate 重跑中。
- **网络**：本机 git HTTPS 到 github.com 不通（connect timeout），远端经 `gh api` git data 写入；本地与远端提交号不同，内容一致。

## 2026-10-23 · 第 3 轮

- **issue 水位**：1 open / 0 closed 起步；本轮关闭 #1，收为 0 open / 1 closed；仓库 PR 0。
- **市场**：PR #8680 已 MERGED（2026-10-22T17:43:45Z），entry 收录 v0.8.3 tarball。
- **零信任分析 #1**：机制部分成立——`style.md` 非空整份覆盖内置文本、每轮请求重新求值、`tailReminder` 是独立 section；作者给的 96% / 60% 对比是沙箱实测，本轮未复跑，按"未复现的作者数据"处理。请求选项 1（文档说明）成立且最小；选项 2/3（拆段 / persona.md）会改 `style.md` 语义与注入通道，暂不做。
- **本轮动作**：README 增加「用 style.md 承载人格 / 长期设定」说明（整份覆盖、如何同时保留结构化规则、只当人格用时关 `tailReminder`、全局共用一份）；选项 2/3 不做并在 issue 里说明。
- **其他复核**：npm latest `0.8.3`；Release `v0.8.3` 资产 sha256 `29a14044…` 与 npm 包同字节；CI 已由 `0224afe`（先 `npm install`）修复，最近 run success。
- **待办**：无；下一轮继续盯 issue 与 CI。

## 2026-10-23 · 0.9.1 发布

- **合并/推送**：`Release 0.9.1` merge `c271ad5`（docs 修复 `c2c1c94` 一并合入）；main `a63b91f`（市场条目指向 v0.9.1）；远端 main 已同步。
- **tag/Release**：annotated tag `v0.9.1`（对象 `83a3216` → `c271ad5`）；Release `v0.9.1`，asset `dsh-structured-0.9.1.tgz` 770,432 B / sha256 `5b48c3a0…`。
- **npm**：`dsh-structured@0.9.1` 为 latest，42 文件 / unpacked 997,070 B，shasum `fa8d8703…`（与 Release 资产同字节）；tarball HTTP 200。
- **门禁**：npm test 49/49；desktop-check PASS；theme-contrast PASS 60；pack 42 / 770432 / 997070；grep「不做主题菜单」0；lib 与 src 一致。
- **市场**：PR #8874（entry tarball → v0.9.1），check 运行中。
- **desktop 安装**：`pnpm add dsh-structured@0.9.1` 成功（dependency 0.9.1，installed 0.9.1；已备份 package.json / pnpm-lock）；运行中的 Electron 仍加载 0.8.3，重启后生效。
- **UNVERIFIED**：desktop 实机 6 字段可见/可改、三主题 × 明暗切换、3×2 截图、`data-diff` 可达性——需重启 Desktop 后验证，本轮未重启（重启会终止当前会话）。
- **变更日志**：仓库 CHANGELOG 与 GitHub Release body 均含 0.9.1；市场 schema 无 changelog 字段（entry 只有 url/name/category/tarball/description），市场侧通过条目版本 + Release 页承载。

## 2026-10-24 · 第 4 轮

- **issue 水位**：0 open / 1 closed（#1 已于上轮回复并关闭，无新 issue）；仓库 PR 0。
- **线上复核**：npm `latest=0.9.1`；Release `v0.9.1` 资产 sha256 `5b48c3a0…`、770,432 B 未变；CI 最近 5 次 run 全 success（含截图 docs push `6139142`）。
- **市场**：条目 PR #8874 已 MERGED，listing 版本显示 `v0.9.1`；nightly `build-site` 于 02:37Z 启动（in_progress），完成后 listing 应从 4 张变 6 张（含 09/10 主题对照图）；当前页面仍是构建前缓存。
- **本轮动作**：无代码改动；只做复核与记录。本地 main `6139142` 与 origin 一致。
- **待办**：等 build-site 完成后确认 listing 出现 09/10 两张图。

## 2026-10-24 · 「设置不见」根因与 0.9.2 修复

- **Boss 报告**：插件板块点进 dsh-structured 详情页，看不到皮肤设置。零信任排查：desktop profile 实装 0.9.1（10-23 12:45），Desktop 进程 10-49 重启过（版本不是旧的）；当日会话注入命中 1 条（插件本体正常）；仓库 Config 六字段 meta.volatile 全 true（schema 没问题）；profile/home patch 无重复行。
- **根因（逆向 app.asar 宿主源码）**：`dsh-client-ui-plugin-manager` 的 slot 合同要求插件的配置页由插件自己的浏览器半侧注册进 `plugins.bundle.config`（键=包名）或 `plugins.row.config`（键=包名#行id）slot，宿主**不会**从 Config schema 自动生成表单；`dsh-client-ui-settings-plugin-inventory` 只读展示状态。0.8.2 引入 Config 起、直到 0.9.1，插件从未注册配置页 → 详情页一直没有设置项。与 0.9.1 更新无关，README 的「bundle 详情表单」说法自 0.8.2 起就是未验证的假设（0.9.1 UNVERIFIED 清单里挂着，本轮证实）。
- **修复（0.9.2）**：`src/client.js` 增加 `setupConfigPage`——按官方伴生包模式（`configForms.whileServed(['dsh-structured'])` + `slots.inject('plugins.bundle.config')`）注册六字段配置卡；Switch/SegmentedControl 来自 `@deepseek-ai/dsh-client-ui-primitives`，写入走 `form.set`；`writable=false` 只读；primitives/require 缺失或命名空间未服务时静默不出现；配置页与主题/视觉联动分开挂 child inject，互不影响。host 侧无改动。
- **门禁**：npm test 54/54（新增 test/client-config-page.test.mjs 5 项）；theme-contrast PASS 60；pack 45 文件 / 993,933 B；lib 与 src 一致。
- **desktop 预览安装**：备份 package.json / pnpm-lock.yaml / cordis.patch.yml（*.bak-20261024-114141）后 `pnpm add G:/dsh-structured/dsh-structured-0.9.2.tgz`；dependency 变成 `file:` 路径（开发预览形态），lockfile 对比确认其他包零变动。**UNVERIFIED**：重启 Desktop 后详情页配置区可见/可改、六字段写入 Cordis patch、写入后主题即时切换。
- **待决**：0.9.2 未发布（npm/Release/市场仍是 0.9.1）。发布后需 `pnpm add dsh-structured@0.9.2` 把 desktop 依赖从 file: 换回 registry；本次改动 push/publish 需 Boss 同意（机械闸门）。

## 2026-10-24 · 0.9.2 发布（Boss 批准）

- **推送**：`main 6139142..e6587b6` + annotated tag `v0.9.2` 经 git push 直推成功（本轮 GitHub HTTPS 可用，未走 gh api 兜底）；提交含 0e0c765（配置页 + 文档修复 + eslint flat config）与 e6587b6（市场条目 → v0.9.2）。
- **npm**：`npm publish dsh-structured-0.9.2.tgz`（直接发本地 tgz 保证与 Release 资产同字节）；45 文件，官方 registry 已生效（shasum `8fe0b67a…`），npmmirror 同步有延迟。
- **Release**：`v0.9.2` 资产 `dsh-structured-0.9.2.tgz` 993,933 B，`gh api` digest `sha256:5449d052…` 与本地包逐字节一致；Release body 与仓库 CHANGELOG 同源。
- **市场**：fork 同步 upstream → 分支 `entry-v0.9.2` → 条目 tarball 改 v0.9.2（gh api PUT，commit `a9fd07dc`）→ **PR #9046**。
- **desktop 正规化**：`pnpm add dsh-structured@0.9.2` 被 profile 的供应链策略 `minimumReleaseAge` 拒绝（0.9.2 发布于 03:52Z，未满 ~1h 冷却；依赖仍为 file: 预览，功能与 0.9.2 字节一致）。已挂后台任务在发布满 1h 后自动重试（重试前再备份 package.json / pnpm-lock.yaml）；成功后补记。
- **UNVERIFIED（等 Boss 重启 Desktop）**：详情页配置区可见/可改、六字段写入 Cordis patch、`writable=false` 只读提示、写入后主题即时切换。

## 2026-10-24 · 0.9.2 收尾：desktop 正规化完成

- **desktop**：冷却期满后自动重试 `pnpm add dsh-structured@0.9.2 --registry=https://registry.npmjs.org` 成功——dependency 从 file: 预览换回 registry `0.9.2`，bundle 行完好，node_modules 实装 0.9.2（pnpm 按 registry integrity 校验，与前述 sha256 同源）。重试前已再备份 package.json / pnpm-lock.yaml（*.bak-*）。
- **市场**：PR #9046 的 `check` 与 `Submission gate` 均 SUCCESS，`mergeStateStatus=CLEAN`，等维护者合并（同 0.8.3/0.9.1 流程）。
- **待 Boss**：重启 Desktop 验证详情页配置区（六字段可见/可改、写入落 Cordis patch、主题即时切换）。
- **本条目暂存本地未推送**：push 同意令牌已超 30 分钟有效期，机械闸门要求重新征得同意；Boss 一句话即可补推。

## 2026-10-24 · 0.9.3：主题按钮强调色 + 设置页实机截图

- **实机确认**：Boss 重启后在插件中心 → dsh-structured 详情页看到 0.9.2 配置区（截图六字段齐全），0.9.2 的 UNVERIFIED 项就此闭环。Boss 另提需求：主题三分段按钮（DeepSeek/Codex/Anthropic）各带匹配所代表主题的强调色。
- **实现（0.9.3）**：配置页注入 `dsh-structured-config-style`——三主题选项前 7px 圆点 + 选中态文字着色，明暗自适应（与视觉层 token 同源：#2563EB/#60A5FA、#10A37F/#34D399、#CC785C/#E8A087）；作用域限 `[data-dsh-structured-config]`，随 whileServed 与 slot 同生命周期注入/撤销。新增测试断言注入/撤销与六个色值齐全。
- **截图**：`assets/screenshots/11-config-page.png`（Boss 提供的设置界面实机图）入 screenshots.json + README（第 7 张）。
- **门禁**：npm test 55/55；theme-contrast PASS 60；pack 46 文件 / 1,080,789 B；lib 与 src 一致。
- **desktop 预览**：`pnpm add file:…0.9.3.tgz`（备份 package.json / pnpm-lock）；发布后换回 registry。

## 2026-10-24 · 0.9.3 提交与 desktop 预览

- **推送**：`main 80f7b13..9db4281`（eec67e6 日志收尾 + 9db4281 0.9.3）；首次 push 300s 超时（老网络问题），45s 短超时重试成功，未动用 gh api git-data 兜底。
- **desktop 预览**：`pnpm add file:…0.9.3.tgz` 成功（备份 *.bak-*），实装 0.9.3，config CSS 已随 lib/client.js 分发；依赖暂为 file: 形态，正式发布 0.9.3 后换回 registry。
- **未发布**：npm / Release / 市场仍是 0.9.2（市场 PR #9046 等合并中）。发布 0.9.3 需 Boss 明确同意。
- **待 Boss 重启验证**：主题三分段按钮的强调色圆点与选中文字色（明暗两态）。

## 2026-10-24 · 0.9.3 定稿：实机截图替换

- **Boss 验收**：圆点样式通过（不改竖条）；提供 0.9.3 实机截图（主题三色圆点 + DeepSeek 选中态蓝色强调均可见）替换 `11-config-page.png`（94,880 B），README 第 7 张截图与实际效果一致。
- **指令**：Boss「继续任务」= 走正式发布链（npm / Release / 市场），见下一条记录。

## 2026-10-24 · 0.9.3 发布（Boss 验收后批准）

- **推送**：截图替换 `63bbe9d` + 市场 `de8e348` 上 main；annotated tag `v0.9.3`。git HTTPS 多次超时/重置（Connection reset / connect timeout），短超时重试成功；期间写好 `.tools/push-ghapi.mjs`（gh api git-data 兜底脚本，blob→tree→commit→ref；本地 git/commits 端点需完整 sha）备用未最终启用。
- **npm**：`dsh-structured@0.9.3` 已发布（发本地 tgz）；官方 registry 生效后核验。
- **Release**：`v0.9.3` 资产 1,080,789 B，api digest `sha256:7cb0c845…` 与本地包逐字节一致。
- **市场**：PR #9046（仍 OPEN 未合并）分支 `entry-v0.9.2` 上追加 commit `7693bef` 直接把条目推到 v0.9.3（同 0.8.3 先例：一个 PR 直达最新），并留言说明 supersede；checks 重跑中。
- **desktop**：预览装 file: 0.9.3（Boss 已实机验收圆点效果）；registry 正规化挂后台任务，minimumReleaseAge 冷却期满自动重试，完成后补记。
- **Boss 验收记录**：圆点样式通过（不改竖条）；`11-config-page.png` 换为 Boss 提供的 0.9.3 实机图（三色圆点 + DeepSeek 选中态蓝色强调可见，94,880 B）。

## 2026-10-24 · 0.9.4：DSH 0.3.0-rc.1 兼容声明（Boss：无功能变化、直接做）

- **背景**：DSH desktop 推送 0.3.0-rc.1（nightly feed），本机当前 0.2.1-rc.2（app 与内嵌 dsh runtime 同版本号）。旧 `engines.dsh <0.3.0-0` 会在升级后把插件挡在装配门禁外（semver 预发布序 `0.3.0-rc.1 >= 0.3.0-0`）。
- **改动（无功能变化）**：`engines.dsh` → `>=0.1.7-rc.2 <0.4.0-0`；`dshReleases` 补 `0.2.1-rc.3`（npm 10-23 已发）、`0.3.0-rc.1` 均为 compatible；README 要求/门禁两段与 CHANGELOG 同步；测试断言更新（engines 精确串 + 两个新 release 条目）。
- **口径**：0.2.1-rc.3 / 0.3.0-rc.1 为**声明性兼容**（依赖面 systemPrompt / commands / configForms / plugins.bundle.config 均为宿主稳定服务，未见破坏性变更公告，未逐项实测；实测后更新标注）。
- **门禁**：npm test 55/55；desktop-check 全 PASS；pack 46 文件 / 1,082,575 B。
- **运维**：已停掉上一轮挂的 0.9.3 冷却重试任务（防止把旧声明版本装回 desktop）。

## 2026-10-24 · 0.9.4 发布完成

- **链路**：`main c9b5bb3..145c556`（0fd1e4a 声明 + 145c556 市场）+ tag `v0.9.4`；npm `dsh-structured@0.9.4`；Release 资产 1,082,575 B / sha256 `09272c4e…` 与本地 tgz 字节一致；市场 PR #9046 分支推到 v0.9.4（commit `1e33a33`）+ 留言，checks 重跑中。
- **desktop**：预览装 file: 0.9.4（备份 bak-*；engines 已是 `<0.4.0-0`）；registry 正规化冷却任务已挂（0.9.3 的旧任务已停，避免装回旧声明）。
- **Boss 升级 DSH 0.3.0-rc.1 后**：插件可正常装配；配置页/注入/视觉层是否全量正常待实测，实测结果回写本日志与 README 兼容性标注。

## 2026-10-24 · 0.9.4 desktop 正规化完成

- 冷却期满后台任务自动执行 `pnpm add dsh-structured@0.9.4 --registry=https://registry.npmjs.org` 成功：dependency 从 file: 预览换回 registry `0.9.4`，bundle 行完好，node_modules 实装 0.9.4。重试前已再备份 package.json / pnpm-lock.yaml（*.bak-*）。
- 至此 0.9.4 全链闭环：git / npm / Release / 市场 PR #9046（门禁过、待合并）/ desktop registry 实装。
- 剩余待办不变：Boss 升级 DSH 0.3.0-rc.1 后实测回写；市场合并后确认 listing。
