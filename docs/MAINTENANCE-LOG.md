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
