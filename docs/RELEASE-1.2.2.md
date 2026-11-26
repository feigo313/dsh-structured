# 1.2.2 发布记录（2026-11-26）

- 主题：侧边栏入口可关闭 / 开启。
- GitHub：tag `v1.2.2`、Release 资产 `dsh-structured-1.2.2.tgz`。
- npm：`dsh-structured@1.2.2`。
- 市场：listing tarball → v1.2.2（沿用 PR #19092 分支）。
- desktop profile：registry `1.2.2`，重启生效。

## 工件

- tarball：61 文件 / 1,830,526 B / sha256 `ce56db4eeaeffb1048058a04d824e09d574c618c79f6fdaf77c9a826d6c4c8e4`
- 门禁：154/154 测试、对比度 80、色相 12、计算样式 10×10、desktop-check 30 PASS。

## 变更

- 设置页行为区新增「侧边栏入口」开关（`sidebarEntry`，默认开启）。
- 关闭即时卸载 `sidebar.panellist` 入口与同名面板；插件板块设置页不受影响；再次打开恢复。
- 宿主不支持订阅时退化为下一次加载生效。