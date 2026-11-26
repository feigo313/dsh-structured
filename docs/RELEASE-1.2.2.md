# 1.2.2 发布记录（2026-11-26）

- 主题：侧边栏入口可关闭 / 开启。
- GitHub：commit `26b44ed`、tag `v1.2.2`（annotated，远端对象 `422e99de` → `26b44ed`）、Release 资产 `dsh-structured-1.2.2.tgz`（createdAt 2026-11-26T15:19:04Z）。
- npm：`dsh-structured@1.2.2`，latest = 1.2.2（61 文件 / 1,830,526 B / unpacked 2,734,302 B / shasum `e2fec550…`）。
- 市场：PR #19092 **MERGED**（2026-11-26T16:30:39Z，沿用同分支把标题改为 v1.2.2）；listing tarball 已核为 v1.2.2。
- desktop profile：registry `1.2.2`；重启 Desktop 后实机确认 5 条定时任务回原会话、风格硬提醒已注入（人工观察）。

## 工件

- tarball：61 文件 / 1,830,526 B / sha256 `ce56db4eeaeffb1048058a04d824e09d574c618c79f6fdaf77c9a826d6c4c8e4`
- 门禁：154/154 测试、对比度 80、色相 12、计算样式 10×10、desktop-check 30 PASS；pack 61 / 1,830,526 B / unpacked 2,734,302 B。`style-gate` 未在 1.2.2 复跑（未验证）。

## 变更

- 设置页行为区新增「侧边栏入口」开关（`sidebarEntry`，默认开启）。
- 关闭即时卸载 `sidebar.panellist` 入口与同名面板；插件板块设置页不受影响；再次打开恢复。
- 宿主不支持订阅时退化为下一次加载生效。

## 发布核验（2026-11-27 00:30 复核）

- 远端 `main` = `48468f9`（fix(ci): refresh pack baseline for 1.2.2），是 tag 所指向的 `26b44ed` 的**后继提交**，只改 `test/pack.test.mjs` 的 `PINNED_SIZE` / `PINNED_UNPACKED`。
- CI：`26b44ed` 的 run `45847769853` **failure** —— `pack unpackedSize 2734302 must stay within 16384 B of the local baseline 2716890`；`48468f9` 的 run `45849222112` **success**（2026-11-26T15:27:06Z，13 s）。结论：tag 指向的提交自身 CI 红，绿是在其后继提交上取得的；仓库当前状态按 `48468f9` 记。
- tag 对象：远端 `422e99de81cbba36ce0d3f5276df18db480dc129`；本机同名 tag 为 `75bde21f`（本地重打，同指 `26b44ed`），跨机核对以远端为准。