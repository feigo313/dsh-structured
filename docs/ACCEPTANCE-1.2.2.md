# dsh-structured 1.2.2 验收记录

状态：**已发布（2026-11-26，三端）**。npm `dsh-structured@1.2.2`（latest）；GitHub main `48468f9` + tag `v1.2.2` + Release 资产；市场 PR awesome-dsh-plugin#19092 已 MERGED。
基线：`26b44ed`（release: dsh-structured 1.2.2）；门禁修正 `48468f9`（pack 基线补 1.2.2 数字）。
上一版：1.2.1（`51d9964` + tag `v1.2.1`）——修复 1.2.0「有卡无风格 / 有开关无 💭」，记录见 `docs/RELEASE-1.2.1.md`。

## 工件

- tarball：61 文件 / 1,830,526 B / unpacked 2,734,302 B；sha256 `ce56db4eeaeffb1048058a04d824e09d574c618c79f6fdaf77c9a826d6c4c8e4`（Release 资产同尺寸；npm registry 的 `dist.fileCount` = 61、`dist.unpackedSize` = 2,734,302、shasum `e2fec550…`）。
- tag：`v1.2.2`（annotated，远端对象 `422e99de81cbba36ce0d3f5276df18db480dc129` → commit `26b44ed6a19dc6f4c3daf7cc3e473207aefa28ad`，tagger 2026-11-26T23:18:48+08:00）。
- 本机同名 tag 对象为 `75bde21f…`（本地重打，同指 `26b44ed`）；跨机核对以远端对象为准。

## 门禁

- `npm test`：154/154（CI run `45849222112` 在 `48468f9` 上通过，2026-11-26T15:27:06Z 起 13 s）。
- `scripts/theme-contrast.mjs`：80 checks PASS。
- `scripts/theme-hue-distance.mjs`：12 checks PASS。
- `.tools/computed-style-check.mjs`：10 主题块 × 10 项 PASS。
- `scripts/desktop-check.mjs`：30 项 PASS（真实宿主 0.2.2-rc.5）。
- pack：61 文件 / 1,830,526 B / unpacked 2,734,302 B（`test/pack.test.mjs` 的 `PINNED_SIZE` / `PINNED_UNPACKED` 已同步为 1,830,526 / 2,734,302，±16 KB 容差）。
- `scripts/style-gate.mjs`：**未在 1.2.2 复跑**——`artifacts/style-gate/` 最新证据目录为 `2026-11-26T11-57-54-668Z`，早于 1.2.2 提交（23:17 +0800）→ 未验证。

## 变更

- 设置页「行为」区新增「侧边栏入口」开关（配置键 `sidebarEntry`，默认开启）。
- 关闭后即时卸载 `sidebar.panellist` 入口与同名面板；插件板块里的设置页不受影响；再次打开即恢复。
- 宿主不支持订阅时，退化为下一次加载生效。
- 新增回归（`test/client-config-page.test.mjs`，+65 行）：`sidebarEntry=false 时不注册侧边栏入口，详情页仍注册`、`sidebarEntry 切换时即时卸载 / 重新注册入口`；`test/structured.test.mjs` 同步 +2 行。
- 测试总数：1.2.1 的 152 → 1.2.2 的 154。

## 发布记录

- GitHub：commit `26b44ed`（2026-11-26 23:17:50 +0800）；tag `v1.2.2`；Release `dsh-structured 1.2.2`（createdAt 2026-11-26T15:19:04Z），资产 `dsh-structured-1.2.2.tgz`。
- CI 返工：发布提交 `26b44ed` 的 run `45847769853` **failure** —— `test/pack.test.mjs` 报 `pack unpackedSize 2734302 must stay within 16384 B of the local baseline 2716890`（差 17,412 B，超 16 KB 容差）；`48468f9` 只改 `test/pack.test.mjs` 两个 pin 值，run `45849222112` success。
- npm：`dsh-structured@1.2.2` 已发布，`dist-tags.latest = 1.2.2`。
- 市场：awesome-dsh-plugin PR **#19092 MERGED**（2026-11-26T16:30:39Z，标题 update tarball to v1.2.2）；listing `data/plugins/feigo313__dsh-structured.yml` 的 `tarball` 已核为 `releases/download/v1.2.2/dsh-structured-1.2.2.tgz`。
- desktop profile：registry `1.2.2`（`package.json` 与 `node_modules/dsh-structured/package.json` 同为 1.2.2）。

## 运行验证（实机）

- Desktop 重启后：5 条自动化回到原会话；风格硬提醒已注入。**人工观察，无日志留存**。

## 遗留 / 未验证

- `style-gate` 未复跑（见上），1.2.2 的 CSS / DOM 改动没有样式门禁证据。
- README 未随 1.2.1 / 1.2.2 更新，仍为 1.2.0 口径。
- 1.2.3 在研：工作区快照（2026-11-27 00:35）有未提交改动（`package.json` 1.2.3、`CHANGELOG.md` 1.2.3 条目、`src/client.js` / `lib/client.js` 修 innerOs 丢失、`test/persona-ui.test.mjs` 回归），未发布，未纳入本版门禁，也未计入 154。
