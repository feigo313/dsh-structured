# 1.3.2 发布记录（2026-11-27）

- 主题：识别字面量 persona 信封（`<persona>` 标签 / 无围栏裸 JSON），修模型不写代码块时整段 JSON 裸露。
- GitHub：tag `v1.3.2`、Release 资产 `dsh-structured-1.3.2.tgz`。
- npm：`dsh-structured@1.3.2`。
- 市场：PR #19205 分支更新到 v1.3.2。
- 工件：64 文件 / 1,875,625 B / sha256 `e165282f8bcbbe630b0021bc7dd92158f4ab7540060d2b85d44843ee162b9ac4`。
- 门禁：164/164、对比度 80、色相 12、计算样式 10×10、desktop-check PASS；pack 基线更新为 1,875,638 / 2,876,049。

## 变更

- `extractPersonaEnvelope` 在无代码块信封时兜底识别 `<persona>` 包装与 `{"version":1,"kind":` 裸 JSON；正常围栏优先，普通 JSON 示例不误判。
- 新增 4 条回归测试；CHANGELOG 1.3.2 中英双语。