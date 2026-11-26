# 1.2.0 发布记录（2026-11-26 已执行）

- GitHub Release：https://github.com/feigo313/dsh-structured/releases/tag/v1.2.0
- main：release 提交 `aa2a130`（接在 origin/main `3deec7f` 之上）；其后 docs 收尾提交仅文档；tag：`v1.2.0`（对象 `3ec7eaef` → commit `aa2a130`）
- npm：`dsh-structured@1.2.0`
- 市场：awesome-dsh-plugin#19092（listing tarball → v1.2.0）
- desktop profile：已切回 registry `1.2.0`，重启生效

## 工件

- tarball：`dsh-structured-1.2.0.tgz`（61 文件 / 1,826,792 B / unpacked 2,716,890 B）
- sha256：`8386c3b4628f23c9c87bffad3882e6bfd728e55207c6f8c9098fd4279e5d7119`
- npm shasum：`c00af8c1ed7635f644c2f666176333dc581d1e13`
- 当前 npm latest：1.2.0；GitHub 最新 Release：v1.2.0。
- 门禁：150/150、对比度 80、色相 12、计算样式 10×10、style-gate PASS、desktop-check 30 PASS。

## 实际执行

1. **Git 对齐**：以 `origin/main` `3deec7f` 为父，用本地 HEAD 树生成单个 squash release 提交 `aa2a130`，经 gh git-data API 逐 blob 上传（blob 字节取 `git cat-file blob`，避开 CRLF）；API 提交比本地多一个结尾换行，按同参数重建对象后采纳 `aa2a130`，远端 main 快进到它。对齐前的本地 1.2.0 历史保留在 `local-pre-release-20261126`。
2. **GitHub**：annotated tag `v1.2.0`（对象 `3ec7eaef` → commit `aa2a130`，tag 消息与远端一致）；Release `v1.2.0` 上传 `dsh-structured-1.2.0.tgz`（1,826,792 B / sha256 `8386c3b4…`）。
3. **npm**：`npm publish --access public --registry https://registry.npmjs.org`；核验 latest = 1.2.0，下载 tarball 的 sha256 与 Release 资产完全一致（61 文件）。
4. **市场**：listing `tarball` 指向 v1.2.0 Release 资产；PR [awesome-dsh-plugin#19092](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/19092) open，等 checks。
5. **本地 profile**：`pnpm add dsh-structured@1.2.0 --registry=https://registry.npmjs.org`；备份 `package.json.bak-1.2.0-final-20261126`；`lib/index.js` / `lib/client.js` 哈希与本地构建一致。

## 收尾状态

- 截图：1.2.0 实机设置页 / 拾色器已补（`13-settings-1.2.0.png` / `14-color-picker-1.2.0.png`，已脱敏裁切），`screenshots.json` 共 10 张。
- 本地 profile：registry `1.2.0`，重启 Desktop 生效。
- 授权：Boss 2026-11-26 明确授权三端推送；市场 PR 待 checks 通过后合并。
- 门禁：150/150、对比度 80、色相 12、计算样式 10×10、style-gate PASS、desktop-check 30 PASS。
