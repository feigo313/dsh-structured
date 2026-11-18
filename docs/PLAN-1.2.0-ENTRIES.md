# 1.2.0 开发计划：侧边栏入口（不做设置页）

> Boss 口径（2026-11-17）：「简单点，只做一个侧边栏开关，不需要在设置里做」，形态选定为**一行入口 + 点开打开面板**。本文件只是计划，未动代码。

## 一、现状（已核实）

- 目前唯一入口是**插件详情页**的配置区（`plugins.bundle.config` slot），Boss 要先进「插件市场 → dsh-structured 详情」。
- 侧边栏「更多 (11)」里那些行（插件市场 / 技能 / 归档会话 / 上下文洞察 / 使用统计 …）由各插件自己注册；dsh-structured 不在其中。
- 设置页（`settings.section`）**本次不做**，配置仍可从详情页与新面板进入。

## 二、宿主契约（从 app.asar + 已装 archive-manager 双向核实）

| slot | 用途 | 实测形状 |
| --- | --- | --- |
| `sidebar.panellist` | 侧边栏「更多」里的一行 | `{ name, id, order, label: () => string, locale? }`；渲染函数只收 `{ size }`（图标尺寸） |
| `main` | 面板内容（宿主的「选中面板」容器） | `{ name, key, inject }`；**key 与行的 id 相同**，宿主点行 → 选中同 key 面板 |
| `plugins.bundle.config` | 详情页配置区（现有，保留不动） | `{ name, key:'dsh-structured', inject }` |

行本身不接收点击回调——点击语义由宿主负责（选面板）。archive-manager 里能看到的同类逻辑：`services.panelInfo.getSnapshot().activePanelId === id` 判断当前面板。

## 三、要做的两件事

1. **面板**：注册 `main`（`key: 'dsh-structured'`），内容**复用现有配置卡**（`StructuredConfigCard`：结构化输出 / 语气风格两个 tab），注入面与详情页同源（同一份 `configForms` 实例）。
2. **侧边栏行**：注册 `sidebar.panellist`（`id: 'dsh-structured'`，`order` 排在归档会话之后），`label` 返回「结构化输出」，图标内联 SVG（三横档 + 滑钮，跟随 `currentColor`）。
3. 两者与 `configForms` 服务生命周期绑定：命名空间停服时一并撤销，不留空入口、不重复注册。

## 四、落地步骤

1. 抽注入面：把详情页 effect 里的 `inject()` 提成 `configCardProps()`，两处共用（避免两套写入逻辑漂移）。
2. 加常量：`MAIN_SLOT='main'`、`SIDEBAR_ENTRY_SLOT='sidebar.panellist'`、`ENTRY_ID='dsh-structured'`、`ENTRY_LABEL='结构化输出'`、`ENTRY_ORDER`。
3. `setupConfigPage` 内新增两个 `child.effect(...)`：一个注册 `main` 面板，一个注册 `sidebar.panellist` 行；都用 `child.slots.inject(slot, () => child.slots.register(...))` 形态（与现有详情页注册同款）。
4. 图标组件 `SidebarEntryIcon({ size })`：缺省 16，`aria-hidden="true"`。
5. 测试：把 `collectRegistration()` 的 fake slots 从「只认 plugins.bundle.config」改成按名记录多 slot；新增断言——三处注册齐全、`main.key === 'dsh-structured'`、面板注入面与详情页同一 form、行 `id/order/label` 正确、图标按 `size` 渲染且带 `aria-hidden`。
6. 文档：CHANGELOG（1.2.0 条目）、README「入口」小节、ACCEPTANCE 补一段、`docs/MAINTENANCE.md` 12.1 记录。
7. 内部计划文档不进包：`package.json` 的 `files` 加 `!docs/PLAN-*.md`（`npm pack` 保持 58 文件）。**已完成（4ba7841）**。

## 五、验收标准

- 侧边栏「更多」出现「结构化输出」一行，图标与其它入口同风格，点击后面板显示配置卡。
- 面板里改字段并保存 → 与插件详情页读到同一份值（改一处两处都变）。
- 连续开关 10 次 `personaEnabled`、切主题 3 次，不出现重复入口行、面板不叠加。
- 插件停用/命名空间未服务时，行与面板一起消失，侧边栏无残留空行。
- `npm test` 全绿（新增 ≥4 条断言）、`desktop-check` 全 PASS、`npm pack` 仍 58 文件。

## 六、风险与未知

- **点击行为未实机验证**：宿主是否真的「点行即选中同 key 面板」只在 archive-manager 代码里看到证据，需 1 次实机确认；若不成立，退化为「行点击后由插件自己 `selectPanel(id)` 主动选中」。
- 面板与详情页共用 `configForms` 时是否需要 `mutate` 的 revision 校验：archive-manager 是直接注入同一 form，预计不需要；若宿主强制乐观锁，改走 `mutate` 通道并补测试。
- 版本节奏：这是**功能**，按 12.0 攒批规矩不占「3 条修复」名额；建议功能本身单独发一版（1.2.0），bug 修复继续攒批。

## 七、工作量（本机口径）

抽注入面 + 两个 slot 注册：约 1 小时；图标 + 测试 4 条：约 0.5 小时；文档与 pack 基线：约 0.5 小时。合计约 2 小时，含一次实机验证。
