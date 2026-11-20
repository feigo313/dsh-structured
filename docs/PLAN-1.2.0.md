# 1.2.0 开发计划：设置页合并 + 侧边栏入口 + 自定义卡片色彩

日期：2026-11-19 · 状态：计划稿，未开工 · Boss 口径（2026-11-19）：v1.2.0 实现「设置页两页合并成一页、侧边栏、自定义卡片色彩」

> 说明：这里的「设置页」指**插件详情页里的两个 tab**（结构化输出 / 语气风格）合并成一页；不是新增 DSH 设置页入口。旧文 `PLAN-1.2.0-ENTRIES.md` 只覆盖侧边栏，本文件为 1.2.0 总计划。

## 一、范围

| # | 功能 | 产出 | 预估 |
| --- | --- | --- | --- |
| 1 | 自定义卡片色彩 | 主题加 `自定义`，4 基色 + 自动派生 + 对比度/色相校验 + 保存 | 2–2.5 天 |
| 2 | 设置页两 tab 合并一页 | 单页分区：外观（主题+自定义色+视觉层）→ 行为（默认开启/尾部提醒/子代理/GenUI）→ 语气风格；保存/预览/校验不丢 | 0.5–1 天 |
| 3 | 侧边栏入口 + 面板 | `sidebar.panellist` 一行 + `main` 面板复用配置卡；停用即撤 | 0.5 天（含 1 次实机验证） |

合计约 4–5 天（含测试、文档、截图、门禁），不含发布链。

## 二、推荐顺序（依赖决定）

1. **自定义色彩内核**：palette 解析/派生/对比度/色相（纯函数 + 单测），先不动 UI。
2. **配色编辑器**：作为独立 section 组件（`ThemeColors`），接进现有配置卡；此时 tab 还在，先验证注入/保存。
3. **合并设置页**：把 tab 拆成单页分区，`ThemeColors` 与 `PersonaEditor` 同页；补「未保存提示」与滚动布局。
4. **侧边栏**：复用合并后的同一张卡注册 `main` + `sidebar.panellist`；先实机验证「点行选同 key 面板」，不成立就退化为行内主动 `selectPanel`。

## 三、设置页合并细节

- 现状：`StructuredConfigCard`（`src/client.js:3470`）两个 tab（`structured`/`persona`），切换时用 `personaGuard.confirm()` 拦未保存修改。
- 目标：单页从上到下分组——**外观 / 行为 / 语气风格**；标题用小节线，不做嵌套卡。
- 迁移：`CONFIG_FIELDS` 各字段归属分组；`PersonaEditor` 原样放入「语气风格」区；`personaGuard` 从「切 tab」改为「离开页面/关闭面板」时拦截，单页内不再需要。
- 风险：单页变长（尤其语气风格编辑器）→ 分组折叠（默认展开外观，行为/语气可折叠）或锚点导航；不做多层嵌套。
- 测试：`client-config-page` 断言两 tab 消失、三区存在、字段仍可写、`personaGuard` 行为不回归；截图 11 更新。

## 四、自定义卡片色彩（摘 `PLAN-CUSTOM-THEME.md`）

- 4 基色：surface / paper / ink / accent；状态三色锁死语义，只校验色相距离 ≥25°。
- 派生 30 个 `--dss-*`：hover/soft/line/head-bg/zebra/code/shadow；暗色按 luminance 自动推导一套。
- 存储：`Config.themeCustom`（JSON 字符串 ≤4KB，schema `dsh-structured/palette@1`）。
- 应用：`applyTheme('custom')` 运行时注入 `<style id="dsh-structured-custom-theme">`（浅/深两段），切走即删。
- 校验：WCAG ink/surface ≥4.5、accent/paper ≥3；不达标拒绝保存 + 一键修正；坏 JSON 回落灰阶。
- 工作量：MVP 2–2.5 天；暗色单独填写 +0.5 天（P1）。

## 五、侧边栏（摘 `PLAN-1.2.0-ENTRIES.md`）

- slot：`sidebar.panellist`（一行，`id='dsh-structured'`，label「结构化输出」，内联 SVG 图标）+ `main`（`key='dsh-structured'`，内容复用配置卡）。
- 生命周期：与 `configForms` 同生灭；停用/未服务时行与面板一起消失，不留空行。
- 未验证点：宿主「点行选中同 key 面板」只在 archive-manager 代码里见过证据，开工前先实机确认一次。

## 六、文件级改动

| 文件 | 改动 |
| --- | --- |
| `src/index.js` | `THEMES` 加 `custom`；`Config.themeCustom` |
| `src/client.js` | palette 纯函数（解析/派生/对比度/色相）；`ThemeColors` 编辑器；`CONFIG_FIELDS` 分组；单页布局；`applyTheme` 注入/清理；侧边栏两个 slot 注册；图标 |
| `test/` | 新增 `palette.test.mjs`；`client-config-page` 合并后结构；`client-visual` 注入/移除；`structured` 枚举 |
| `scripts/theme-contrast.mjs` | 导出 custom 校验器供测试复用 |
| `docs/` + `assets/screenshots/` | 1.2.0 说明、设置页（单页/自定义色）、侧边栏入口图 |

## 七、风险

- 合并后页面过长/信息密度：分组折叠 + 锚点，不做多层卡。
- `personaGuard` 语义变化：单页不再切 tab，改为离开拦截；补测试。
- 自定义色对比度/暗色推导观感：保存硬校验 + 真机看两套主题；不行再加单独暗色。
- 侧边栏 slot 契约未实机验证：先验证再写，失败有退化方案。
- 版本节奏：1.1.7 尚未发布（npm 仍 1.1.6，desktop 已是本地 1.1.7）；建议先发 1.1.7 清版本，再开 1.2.0 分支。

## 八、验收（草案）

- 设置页只有一个页面，三区齐全；改任意字段保存后详情页/侧边栏面板读到同一份值。
- 自定义色：4 色即时生效、对比度不足被拒、切回预设样式移除、重启保留、坏 JSON 回落灰阶。
- 侧边栏：出现「结构化输出」一行，点击出面板；开关 10 次不重复；停用后行/面板消失。
- 门禁：`npm test` 全绿（新增 palette/合并/侧边栏断言）、`desktop-check` PASS、computed-style 加 custom 夹具、`npm pack` 预算内。
