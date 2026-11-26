# 1.2.0 发布记录（2026-11-26 已执行）

- GitHub Release：https://github.com/feigo313/dsh-structured/releases/tag/v1.2.0
- main：`aa2a130`（接在 origin/main 之上）；tag：`v1.2.0`
- npm：`dsh-structured@1.2.0`
- 市场：awesome-dsh-plugin#19092（listing tarball → v1.2.0）
- desktop profile：已切回 registry `1.2.0`，重启生效

## 工件

- tarball：`dsh-structured-1.2.0.tgz`（61 文件 / 1,826,792 B / unpacked 2,716,890 B）
- sha256：`8386c3b4628f23c9c87bffad3882e6bfd728e55207c6f8c9098fd4279e5d7119`
- npm shasum：`c00af8c1ed7635f644c2f666176333dc581d1e13`
- 当前 npm latest：1.1.10；GitHub latest：v1.1.10。
- 门禁：150/150、对比度 80、色相 12、计算样式 10×10、style-gate PASS、desktop-check 30 PASS。

## 三端顺序（建议）

1. **Git 对齐**：本地 main 落后 origin 6、领先 42；不要把本地 1.1.x 重复历史直接 merge 后 push。建议从 `origin/main` 建发布分支，按提交 cherry-pick 1.2.0 范围（`5480cf9..HEAD`）或 rebase，逐项解决 docs/PLAN/ACCEPTANCE 冲突；保留本地 release tags 不动。完成后先跑 150 + 四个门禁 + pack。
2. **GitHub**：`git push origin <release-branch>`，合并到 main；`git tag -a v1.2.0`；创建 Release，上传 `dsh-structured-1.2.0.tgz`；记录 sha256。
3. **npm**：`npm publish --access public`；核验 `npm view dsh-structured version` = 1.2.0。
4. **市场**：更新 listing 的 `tarball` 指向 v1.2.0 Release 资产，提交市场 PR；核验 listing 下载到的 tarball 版本 / sha。
5. **本地 profile**：npm 发布后把 `~/.dsh/profiles/desktop/package.json` 的 `dsh-structured` 从 `file:...preview...tgz` 改回 `1.2.0`，再安装；备份已在 `package.json.bak-1.2.0-20261126`。

## 阻塞

- 1.2.0 设置页 / 拾色器截图未补，README 仍用 1.1.10 历史图。
- 本地 profile 依赖是 preview tarball，不是 registry 1.2.0。
- 未获得本次 push / publish 的明确授权。
