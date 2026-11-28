# 1.3.8 — 修发布包内 README 版本行，style-gate 纳入发版门

日期：2026-11-28　基线：1.3.7（`299e07d`）　宿主目标：DSH Desktop / Cordis 4.1.0　类型：补丁版（无运行时变更）

## 为什么发这一版

1.3.7 发布后巡检发现两处「发布物与仓库不一致」。都不影响插件运行，但会让用户和维护者读到错的版本信息，也让一道应有作用的门长期失效：

| 缺陷 | 证据 | 影响 |
| --- | --- | --- |
| 已发布 1.3.7 包内 README 版本行滞后 | 从 registry 下载的 `dsh-structured-1.3.7.tgz`：`package/README.md:329` / `README.zh.md:329` 写 **1.3.4**，同包 `package.json` 是 **1.3.7** | 用户看到「本仓库发布 1.3.4」，与装到的 1.3.7 自相矛盾 |
| style-gate 断言漂移 | `scripts/style-gate.mjs:266` 期望 `persona.suffixSize = '12px'`，1.3.3 起实际值是 13px | 手动门必失败 ⇒ 发版门形同失效，跨了 1.3.3–1.3.7 五个版本没人复跑 |

## 根因

1. **README 版本行**：1.3.7 的 npm tarball 于 2026-11-27 21:23 (+08) 打包；`README.md:329` 改成 1.3.7 是随后的文档提交 `c66d821`（21:49）才落盘——打包在改文档之前，包内自然带旧句。逐文件比对：64 个文件里只有这两行落后，其余 62 个与仓库 sha256 全同，代码/资源无差异。
2. **style-gate**：1.3.3（`432d801`）按 `docs/RELEASE-1.3.3.md` 把 `.dss-persona-suffix` 改为 `font:calc(var(--dss-code-size) * 13 / 12.5)`（默认 12.5 → 13px）并把颜色换成 `--dss-ink-2`；静态门 `test/style-browser.test.mjs:34` 同步锁了 `13 / 12.5`，但这条只手动跑的真浏览器门没跟上，且 1.3.3 之后一直未复跑，漂移直到 2026-11-28 巡检才暴露（`persona.suffixSize actual=13px expected=12px`）。

## 修复（无运行时改动）

| 文件 | 改动 |
| --- | --- |
| `package.json` | 版本 `1.3.7` → `1.3.8` |
| `README.md:329` / `README.zh.md:329` | 包版本行 → `1.3.8`（1.3.8 包内自此与 `package.json` 一致） |
| `scripts/style-gate.mjs:266` | 期望 `12px` → `13px`，注释同步 `calc(code*13/12.5)`（commit `3cc0780`，1.3.8 之前已在 `main`） |
| `docs/MAINTENANCE.md` §12.2 | 发版顺序第 1 条加入 `style-gate` 必跑与理由（`DSH_STRUCTURED_STYLE_GATE=1 node scripts/style-gate.mjs --check`） |
| `docs/MAINTENANCE.md` §12.1 | 记录 1.3.8 为纯文档/纯断言补丁版，按 §12.0 不计条数 |
| `CHANGELOG.md` | 1.3.8 中英双语条目（英文在前） |
| `test/pack.test.mjs` | PINNED 基线由 1.3.7 的 1,893,853 / 2,935,689 更新为 1,895,050 / 2,938,343（±16 KB 容差不变） |
| `src/`、`lib/` | **未改**；`node scripts/build.mjs` 重建后与 1.3.7 发布包逐字节相同 |

## 验证

| 项 | 结果 |
| --- | --- |
| `npm test` | **176/176 pass**（fail 0；与 1.3.7 同数） |
| `node scripts/build.mjs` | exit 0；`lib/index.js` 41,972 字符 / `lib/client.js` 305,366 字符（与 1.3.7 相同） |
| `npm pack --json --ignore-scripts` | **64 文件 / 1,895,050 B / unpacked 2,938,343 B**（`dsh-structured-1.3.8.tgz`） |
| 包内版本自洽 | 解包核 `package/README.md:329` = 1.3.8、`package/README.zh.md:329` = 1.3.8、`package/package.json` = 1.3.8 |
| 与已发布 1.3.7 的差异 | 逐文件 diff 仅 4 个文件不同：`CHANGELOG.md`（+2,628 B）、`README.md` / `README.zh.md`（版本行）、`package.json`（版本号）；`src/`、`lib/`、资源、截图全部相同 |
| `style-gate` | 2026-11-28 巡检（修断言后）：`DSH_STRUCTURED_STYLE_GATE=1` + `--check`，真 ego lite 浏览器，**PASS，81 条 record 断言 0 失败**；代码树未再变动（本版只改文档/断言），证据仍绑定同一代码树 |
| 本地 tarball 指纹 | sha256 `455c9b9579e467584f73d2b404bd2cdf81d790f97beb35c82ef41c8710c86d6a`；npm shasum(SHA-1) `2d53f1941330edd9356e9d52595f85364c578017` |

## 风险与边界

- 本版不修任何运行时缺陷：`src/` 与 `lib/` 未动，行为、prompt 合同、配置 schema、渲染与 1.3.7 完全一致；升级风险等同重装 1.3.7。
- 包体积变化来自 `CHANGELOG.md`（npm 会无条件收进 tarball）与版本号，不影响运行。
- `style-gate` 依赖 ego lite 浏览器；无该环境的机器按 §12.2 跳过并在报告里注明，静态门仍随 `npm test` 跑。
- 已发布 1.3.7 不重发、不 unpublish；1.3.8 是改正后才进 registry 的第一个包。

## 变更文件

- `package.json`、`README.md`、`README.zh.md`
- `CHANGELOG.md`、`docs/MAINTENANCE.md`、`docs/RELEASE-1.3.8.md`（本文件）
- `test/pack.test.mjs`（PINNED 基线）
- 前置 commit：`3cc0780`（style-gate 断言）、`259a3a2`（2026-11-28 巡检日志）
