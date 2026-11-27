# dsh-structured 1.3.0 验收记录

状态：**已发布（2026-11-27 本机时区）**——GitHub（main + tag + Release）与 npm 已完成；市场活动 PR **#19205 open，待合并**（旧 #19152 已关闭）；本机 desktop profile 已装 1.3.0，Desktop 已于 10:02 重启并加载，1.3.0 实机行为验证未记录。
基线：`4bd084e2`（release: dsh-structured 1.3.0 (innerOS salvage + i18n)，2026-11-26T16:59:56Z；本机同树提交 `2d611a1`，tree `a84eb10d…`，异 sha）。当前远端 main 已前移到 `1c2db756`（tree `39ddbd4f`），本机 HEAD `8124037` 与之同树异 sha。
上一版：1.2.2（`48468f9` + tag `v1.2.2`）——侧边栏入口开关，记录见 [`RELEASE-1.2.2.md`](RELEASE-1.2.2.md)。

## 工件

- tarball：**64 文件 / 1,865,727 B / unpacked 2,844,345 B**；sha256 `b2c2007458566b24ddb118ed14fd5484cc1ea1f6fc723224f6d645645ab0eed2`。
- npm registry：`dist.fileCount` = 64、`dist.unpackedSize` = 2,844,345、shasum `bdb5af4aa080de7ba65bb5e2fae124652029ed37`、`dist-tags.latest = 1.3.0`。
- Release 资产 `dsh-structured-1.3.0.tgz`：1,865,727 B / digest `sha256:b2c20074…ab0eed2`（与 npm tarball 同尺寸同 sha256）。
- tag：`v1.3.0`（annotated，远端对象 `842885fe86bfa775eaa13290423d7d55a947cb29` → commit `4bd084e2344d29aabc673d7ce44dbbeba495caa9`；tagger 2026-11-26T17:00:13Z）。本机无同名 tag（`git rev-parse v1.3.0` = unknown revision），跨机核对以远端为准。
- 本机基线：发布提交 HEAD `2d611a1`，tree `a84eb10ded609610d4ba03a6095f1e95a0e097eb`，与远端 `4bd084e2` 的 tree 完全一致；当前本机 HEAD `8124037`（tree `39ddbd4f86906060f1a46d49ef1a300ba37e24f8`）与远端 main `1c2db756` 同树异 sha。

## 门禁

- `npm test`：**159/159 PASS**（本机 2026-11-27 复跑，exit 0，2.47 s；发布 CI run `45863832667` success @ `4bd084e2`，最新 CI run `45927317040` success @ `1c2db756`）。
- `scripts/theme-contrast.mjs`：80 checks PASS。
- `scripts/theme-hue-distance.mjs`：12 checks PASS。
- `.tools/computed-style-check.mjs`：10 主题块 × 10 项 PASS。
- `scripts/desktop-check.mjs`：全 PASS（真实宿主 0.2.2-rc.5；1.3.0 未逐项记数，1.2.2 为 30 项）。
- pack：发布物 = 64 文件 / 1,865,727 B / unpacked 2,844,345 B；当前仓库 `npm pack --dry-run --json --ignore-scripts` 复跑 = **64 文件 / 1,865,734 B / unpacked 2,844,378 B**（+7 / +33 B 来自 `package.json` 新增排除行 `!docs/ACCEPTANCE-1.3.0.md`，用于把本验收文档排除出发布包；`test/pack.test.mjs` 的 `PINNED_SIZE` / `PINNED_UNPACKED` 仍为 1,865,727 / 2,844,345，差值在 ±16 KB 容差内）。
- `scripts/style-gate.mjs`：**未在 1.3.0 复跑**——`artifacts/style-gate/` 最新证据目录 `2026-11-26T12-12-56-015Z`，早于 1.3.0 提交（2026-11-26T16:59:56Z）→ 未验证。

## 变更

- **修复信封降级 / 抢救路径丢失内心OS（💭）**：normal 信封带合法 `innerOs`（≤30 字），但信封因多余字段 / 内层引号 / 缺闭合走降级或抢救时，重建内容只拼结论 / 建议 / 风险，`innerOs` 被丢掉——三卡照出、卡片下没有 💭。现在宽松还原（`buildLenientPersona`）与抢救（`salvagePersonaText` / `renderPersonaError`）都保留合法 `innerOs`；身份头开关仍只控头像 / 名字 / 签名，内心OS 开关独立生效。
- **README 国际化**：`README.md` 改为英文默认版（176 行增 / 170 删），新增中文版 `README.zh.md`（328 行）与顶部 English / 中文 切换；`docs/I18N.md` 记录语言策略与术语表。
- **设置页跟随宿主 locale**：新增 258 条 zh / en 词典（186 条界面文案 + 72 条预览样例），跟随 DSH 宿主 locale（zh / en，未知语言回退英文），运行时切换即时重渲染；人格专名、命令与代码样例保留原文。
- 回归：1.2.2 的 154 → 1.3.0 的 **159**（+5：3 条 i18n 设置页断言 + 2 条 innerOs 抢救断言）。
- 主要改动文件（相对 1.2.2 基线 `48468f9`）：`src/client.js` / `lib/client.js`（605 行增 / 190 删，innerOs + i18n 主体）、`README.md`（176 增 / 170 删）、`README.zh.md`（新增 328 行）、`docs/I18N.md`（新增）、`test/persona-ui.test.mjs`（+83）、`test/client-config-page.test.mjs`（+72）、`test/pack.test.mjs`（pin 6 行）、`package.json`（版本）、`CHANGELOG.md`。

## 发布记录

- GitHub：commit `4bd084e2`（2026-11-26T16:59:56Z）；tag `v1.3.0`；Release `dsh-structured 1.3.0`（published 2026-11-26T17:00:28Z），资产 `dsh-structured-1.3.0.tgz` 1,865,727 B / sha256 `b2c20074…`。
- CI：发布 run `45863832667` **success**（head `4bd084e2`，2026-11-26T17:00:00Z → 17:00:14Z，约 14 s），首发即绿、无返工；最新 run `45927317040` **success**（head `1c2db756`，2026-11-27T02:16:06Z 起约 11 s）。
- npm：`dsh-structured@1.3.0` 已发布，`dist-tags.latest = 1.3.0`（官方 registry `--registry https://registry.npmjs.org` 复核）。
- 市场：awesome-dsh-plugin 活动 PR **#19205 open**（2026-11-27T02:12:06Z，标题 `dsh-structured: update tarball to v1.3.0`，head `feat/dsh-structured-1.3.0-clean`；MERGEABLE / mergeStateStatus UNSTABLE，check 自 2026-11-27T02:12:13Z IN_PROGRESS；diff 仅 listing 的 tarball v1.2.2→v1.3.0）。旧 PR **#19152 已 CLOSED**（2026-11-27T02:12:17Z，DIRTY / CONFLICTING，fork 基线过期）。上游 `data/plugins/feigo313__dsh-structured.yml` 的 `tarball` **仍指 v1.2.2** —— 合并前不算生效。
- desktop：`~/.dsh/profiles/desktop/node_modules/dsh-structured/package.json` = **1.3.0**（装于 2026-11-27 01:05:19）；Desktop 主进程 PID 16664 启动于 **2026-11-27 10:02:06 +08**，profile `lib/index.js` sha256 `f8fafec0b593d0a5f727b99ebe69840f4f7b36c2ce856da0cc38039b69921e20` 与仓库 `lib/index.js` 一致 → **已重启并加载 1.3.0**；实机行为验证未记录。

## 同树异 sha（为什么本机与远端 sha 不同）

- 1.3.0 发布期：本机 `2d611a1` 与远端 `4bd084e2` 的 tree 相同（`a84eb10ded609610d4ba03a6095f1e95a0e097eb`）；当前：本机 HEAD `8124037` 与远端 main `1c2db756` 的 tree 相同（`39ddbd4f86906060f1a46d49ef1a300ba37e24f8`），提交内容一致，只有 sha 不同。
- 原因：本机 git HTTPS 直连 GitHub 不可达，远端提交由 `.tools/push-head-via-api.mjs` 经 gh git-data API 逐对象重建；重建提交的 committer / 时间与本地不同，sha 天然不同。
- 处置：**以远端 sha 为准**（tag `v1.3.0` 指向发布提交 `4bd084e2`；main 已前移到 `1c2db756`）；不要为了对齐 sha 做 force push。本机 `origin/main` 缓存仍停在 `48468f9`，未 fetch。

## 遗留 / 未验证

- `style-gate` 未复跑（见上），1.3.0 的样式门禁没有新鲜证据。
- 市场 listing 仍指 v1.2.2，PR #19205 待合并（#19152 已关闭）；三端中市场一端未完成。
- 1.3.0 实机行为验证仍无记录：Desktop 虽已于 2026-11-27 10:02 重启并加载 1.3.0（PID 16664，`lib/index.js` sha256 `f8fafec0…` 与仓库一致），但定时任务回原会话、风格硬提醒注入等行为未在 1.3.0 上复核。
- 截图仍为 1.2.0 的 `13-settings-1.2.0.png` / `14-color-picker-1.2.0.png`；1.2.1–1.3.0 未新增截图。
- 本机 `origin/main` 引用为旧值（`48468f9`）；远端状态全部经 gh API 核对，不是本地 ref（本次复核 2026-11-27 10:25 +08）。
