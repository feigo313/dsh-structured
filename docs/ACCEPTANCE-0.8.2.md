# 0.8.2 验收记录

- **版本**：0.8.2（未发布；本地提交）
- **范围**：视觉层从“始终开启”改为 profile 级 `visual` 配置；`/structured on|off` 保持只控制提示词。

## 已验证

- `npm test`：**34/34** 通过（新增 `Config` 默认值、`statusText` 视觉状态、client visual 开关用例）。
- `node scripts/desktop-check.mjs`：全部 PASS（新增 `Config` 导出、client 注入 settings、schemastery peer 检查）。
- `lib/index.js` / `lib/client.js` 由 `npm test` 的 pretest 重建，源码与产物一致（测试用例 “lib = banner + src” 通过）。
- client DOM stub 用例：`visual=false` 移除 `<style>` 与 `data-dsh-structured`；`visual=true` 恢复；`configForms` 不可用时默认开启。
- `npm pack --dry-run --json --ignore-scripts`：**37 文件**，tarball 761,865 B。
- `structured-test` 安装 0.8.2：`dsh plugin --profile structured-test add dsh-structured-0.8.2.tgz` 成功；headless 回合 completed；`session-inspect --last-system --grep "结构化输出（本会话已启用"` 命中 1 条（session-82fcca2a…），说明 `Config`/schemastery 在真实 DSH host 可加载。
- `cordis.patch.yml` 含 `visual: true`；`package.json` 含 `@deepseek-ai/schemastery` peer/dev，`dsh.client.inject` 含 `@deepseek-ai/dsh-client-ui-settings`。

## 未验证 / 风险

- **desktop 实机**：尚未把 0.8.2 装进 desktop（项目规则：不碰 desktop），也没有 web 测试 profile；设置页是否能渲染 `visual` 字段、切换后是否立即生效，需要在测试 profile/web 或安装后实测。
- 若当前 DSH 的 bundle 详情页不渲染 `.volatile()` 字段，`visual` 仍可通过 `cordis.patch.yml` + 重开 Desktop 生效；此时设置页只是不可见，不影响默认行为。
- `configForms` 的 `getSnapshot().value.visual` 在真实宿主里应为布尔；client 已兼容 getter 对象，但未实机验证。
