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

## 发布核验（2026-11-27 复核）

- 远端 `main` = `4bd084e2`（2026-11-26T16:59:56Z，release: dsh-structured 1.3.0 (innerOS salvage + i18n)），tree `a84eb10ded609610d4ba03a6095f1e95a0e097eb`；tag `v1.3.0` 指向它。
- tag：annotated，远端对象 `842885fe86bfa775eaa13290423d7d55a947cb29` → commit `4bd084e2344d29aabc673d7ce44dbbeba495caa9`；tagger 2026-11-26T17:00:13Z。本机无同名 tag（`git rev-parse v1.3.0` unknown revision），只在远端。
- CI：run `45863832667` **success**（head `4bd084e2`，2026-11-26T17:00:00Z → 17:00:14Z，约 14 s），首发即绿、无返工。
- Release：`dsh-structured 1.3.0`，published 2026-11-26T17:00:28Z；资产 `dsh-structured-1.3.0.tgz` 1,865,727 B / digest `sha256:b2c20074…ab0eed2`。
- npm：`dsh-structured@1.3.0`，latest = 1.3.0；`dist.fileCount` 64 / `dist.unpackedSize` 2,844,345 / shasum `bdb5af4a…`。
- 市场：PR **#19152 open**（2026-11-26T17:00:50Z，`dsh-structured: update tarball to v1.3.0`）；上游 listing `data/plugins/feigo313__dsh-structured.yml` 的 `tarball` 仍指 `v1.2.2` —— 合并前不算生效。
- 同树异 sha：本机 HEAD `2d611a1` 与远端 `4bd084e2` 内容相同（tree 均为 `a84eb10d…`），sha 不同源于远端提交经 gh git-data API 逐对象重建；以远端 sha 与 tag 为准，**不要 force push**。
- desktop profile：registry `1.3.0` 已装（`~/.dsh/profiles/desktop/node_modules/dsh-structured`）；未重启 → 下次启动生效，1.3.0 实机未验证。