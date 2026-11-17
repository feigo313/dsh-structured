# 1.2.0 开发计划：侧边栏入口 + 设置页入口

> 目标（Boss 2026-11-17）：dsh-structured 在**侧边栏**和**设置页**各有一个入口，两处都能进到插件自己的面板/设置；入口展示位置可配置（参考 `@michengai/dsh-archive-manager` 的「两边显示 / 仅侧边栏 / 仅设置」）。

## 一、现状（已核实）

- 目前只有**插件详情页**里的配置区：`src/client.js` 的 `setupConfigPage` 通过 `plugins.bundle.config` slot 注册，Boss 需要先进「插件市场 → dsh-structured 详情」才能看到。
- 侧边栏「更多 (11)」里那些条目（插件市场 / 技能 / 归档会话 / 上下文洞察 / 使用统计 …）都是各插件各自注册的；dsh-structured **不在其中**。
- 设置页左侧（账号与余额 / 通用设置 / … / 侧边卡片 / Codex UI）由 `settings.section` slot 驱动；dsh-structured **不在其中**。

## 二、宿主契约（从 app.asar 与已装插件双向核实）

| slot | 用途 | 注册形状（archive-manager 实测） |
| --- | --- | --- |
| `sidebar.panellist` | 侧边栏「更多」列表项 | `{ name:'sidebar.panellist', id, order, label:()=>string, locale }`，渲染函数只收 `{ size }`（图标尺寸）；配套 `sidebar.panel.icon` 决定图标 |
| `settings.section` | 设置页一个新的分区 | `{ name:'settings.section', id, order, label:()=>string, icon:'archive', locale, inject }`，渲染是整页内容 |
| `settings.section.icon` | 设置项图标（可选，单独注册） | `{ name:'settings.section.icon', id, locale }` |
| `plugins.bundle.config` | 插件详情页配置区（现有） | 已经实现，保留 |

`sidebar.panellist` 只给图标尺寸，**不是导航按钮**——条目点开去哪由插件自己决定（archive-manager 用 `main` slot 挂主面板 + `sidebar.panellist` 挂列表行）。

## 三、方案（三选一，推荐 A）

**A. 双入口 = 设置页分区 + 侧边栏行（推荐）**
- 设置页：注册 `settings.section`（id `dsh-structured`，order 50），内容直接复用现有配置卡（结构化输出 / 语气风格两个 tab 的 React 组件），等于把「插件详情页」的配置搬进设置页。
- 侧边栏：注册 `sidebar.panellist`（id `dsh-structured`，图标沿用插件 icon.svg）。点击行为＝跳转设置页对应分区（若宿主没有跨区跳转 API，则退化为「打开一个轻面板，内嵌同一份配置卡」）。
- 配置项新增 `entryPlacement`：`both`（默认）/ `sidebar` / `settings`，与 archive-manager 语义一致；两处都关掉时回落 `both` 防止无入口。

**B. 只做设置页分区**（最小改动，满足「设置里能进」，侧边栏留给以后）

**C. 只做侧边栏行 + 弹出面板**（面板里放配置卡，设置页不动）

## 四、落地步骤（按 A 拆）

1. **抽配置卡**：把 `setupConfigPage` 里 `StructuredConfigCard` 拆成可复用组件 `StructuredConfigView`，接收 `{ state, setField, mutateFields, readFields }`；插件详情页与设置页共用同一份（避免两套 UI 漂移）。
2. **设置页分区**：`slots.register({name:'settings.section', id:'dsh-structured', order:50, label, icon:'sliders', locale, inject})`；`inject` 提供 `hooks.structuredConfig: form` 与 `setField/mutateFields/readFields`，与现有详情页注入同源。
3. **侧边栏行**：`slots.register({name:'sidebar.panellist', id:'dsh-structured', order, label, locale})`；点击 → 优先跳设置分区，落不到再开轻面板。
4. **入口开关**：`Config` 增加 `entryPlacement`（`both|sidebar|settings`，默认 `both`），设置页/详情页都可改；注册时按值决定注册哪一个，两个都禁用时强制 `both`。
5. **国际化**：`locale/*.json` 补 `entry.title`、`settings.section.title`、`entryPlacement.*` 三项文案（中/英）。
6. **幂等与清理**：注册函数返回 disposer，配置变化时先撤后建（archive-manager 的 `mountSettingsSection/unmountSettingsSection` 是同一模式）；避免重复注册造成两个入口项。
7. **红线**：不碰宿主受控子树，只注册 slot；不新增 require 依赖（slot 由宿主注入）。

## 五、验收标准

- 设置页左侧出现「结构化输出」分区，点进去可改全部字段并保存，与插件详情页写入同一份配置（改一处两处都变）。
- 侧边栏「更多」列表出现 dsh-structured 行，图标与插件一致，点击可用（跳设置或开面板）。
- `entryPlacement` 三个取值分别生效：`settings` 只留设置页、`sidebar` 只留侧边栏、`both` 两处都在；关掉两处时回落 `both`。
- 连续开关 `personaEnabled` / 主题 10 次，入口不重复、不残留（DOM 里 `sidebar.panellist` 行与 `settings.section` 各 1 个）。
- 回归：`npm test` 全绿（新增至少 3 条：双注册、开关生效、幂等）；`desktop-check` 全 PASS；关闭插件后两处入口消失。

## 六、风险与未知

- `sidebar.panellist` 的点击行为契约未在 app.asar 里找到「跳转设置分区」的公开 API；需要 1 次实机实验确认（否则用轻面板兜底）。
- 设置页与插件详情页共用 `configForms` 实例时，`form.set` 的写入是否需要 revision 校验（`mutate`）待实测；archive-manager 用 `inject` 注入同一 form，应当可直接复用。
- 版本线：这是**功能**，按 1.2.0；按 12.0 攒批规矩，需 ≥3 条修复才发版——功能不占「修复」名额，故 1.2.0 需要单独与 Boss 约定发布节奏（建议：功能本身一次发，bug 修复仍按攒批）。

## 七、工作量估算（本机实测口径）

- 抽组件 + 设置页分区：约 1.5 小时（含实测宿主 slot 行为）
- 侧边栏行 + 点击跳转/轻面板：约 1 小时
- 入口开关 + 国际化 + 幂等：约 1 小时
- 回归与文档（CHANGELOG/README/ACCEPTANCE/测试 3 条）：约 1 小时
