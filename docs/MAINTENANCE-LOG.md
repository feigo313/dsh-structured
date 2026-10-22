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
- **流程变更（Boss 指示）**：采用非置信原则——issue 与 PR 一律先做正确性分析再动作；手册新增第 2 节（issue 三态判定、PR 六项审查、信任边界），日巡检提示词已同步。
