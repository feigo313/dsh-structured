# 1.3.0 发布记录（2026-11-27）

- 主题：内心OS 抢救修复 + README/设置页国际化。
- GitHub：tag `v1.3.0`、Release 资产 `dsh-structured-1.3.0.tgz`。
- npm：`dsh-structured@1.3.0`。
- 市场：listing tarball → v1.3.0（新 PR）。
- 工件：64 文件 / 1,865,727 B / unpacked 2,844,345 B / sha256 `b2c2007458566b24ddb118ed14fd5484cc1ea1f6fc723224f6d645645ab0eed2`。
- 门禁：159/159、对比度 80、色相 12、计算样式 10×10、desktop-check PASS；style-gate 未复跑（未验证）。

## 变更

- 修复信封降级/抢救路径丢失 `innerOs`：三卡照出但 💭 消失；现在宽松还原与抢救都保留合法 innerOs（≤30 字）。
- README 默认英文 + README.zh.md，顶部 English / 中文 切换；docs/I18N.md 记录语言策略与术语表。
- 设置页跟随 DSH 宿主 locale（zh/en，未知语言回退英文），258 条双语词典；运行时切换即时重渲染。

## 验证

- `node --test test/*.test.mjs` 159/159；build 通过；desktop-check / contrast / hue / computed 全过。