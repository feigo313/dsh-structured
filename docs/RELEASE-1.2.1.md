# 1.2.1 发布记录（2026-11-26）

- 主题：修复 1.2.0「有卡无风格 / 有开关无 💭」。
- GitHub：main dump 后续提交、tag `v1.2.1`（annotated）、Release 资产 `dsh-structured-1.2.1.tgz`。
- npm：`dsh-structured@1.2.1`。
- 市场：awesome-dsh-plugin listing tarball → v1.2.1（沿用 PR #19092 分支，标题改 1.2.1）。
- desktop profile：registry `1.2.1`，重启生效。

## 工件

- tarball：61 文件 / 1,828,942 B / sha256 `c3fec06807a5de8db264a0da8c802781fbb61c62f2aea9a80ee8517d05156491`
- 门禁：152/152 测试、对比度 80、色相 12、计算样式 10×10、desktop-check 30 PASS、pack 61 文件。

## 变更

- 尾部提醒在 persona 启用且 tone 合法时追加【本轮风格（硬提醒）】：风格原文 + 正文至少两处体现；表格/代码/diff/报错保持中性。
- `personaInnerOsEnabled` 为真时要求 normal / table 必带 `innerOs`（≤30 字、第一人称）；short/code/diff/error 可省。
- 身份头开关行为不变：只控制头像 / 名称 / 签名。

## 验证

- `node --test test/*.test.mjs`：152/152。
- `node scripts/build.mjs`、desktop-check、theme-contrast、theme-hue-distance、computed-style 全过。