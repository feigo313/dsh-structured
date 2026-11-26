# 1.2.0 发布准备（未执行）

## 工件

- tarball：`dsh-structured-1.2.0.tgz`（59 文件 / 1,613,764 B / unpacked 2,497,009 B）
- sha256：`0b2c7ecfc91fc7e24c969a1ab6701a97943769fd3bc8cc2dfa5dc0653f1167a3`
- npm shasum：`69f068cd5a2bd68e692168600c148fbd0e1a1d3f`
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
