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
- **下一步**：等市场窗口（2026-10-22 21:33 +08）；下一轮继续看 issue 与 CI。
