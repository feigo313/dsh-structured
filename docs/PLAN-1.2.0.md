# 1.2.0 开发计划：设置页 GUI + 侧边栏双入口 + 自定义卡片色 + 人格/深度拆分

日期：2026-11-19 · 状态：2026-11-26 开工，先做设置页 GUI；旧稿保留参考，执行以顶部「开工顺序」为准 · Boss 口径：v1.2.0 = 设置页单页、侧边栏双入口、自定义卡片色、人格/深度/多卡拆分

> 说明：这里的「设置页」指**插件详情页里的两个 tab**（结构化输出 / 语气风格）合并成一页；不是新增 DSH 设置页入口。旧文 `PLAN-1.2.0-ENTRIES.md` 只覆盖侧边栏，本文件为 1.2.0 总计划。

## 2026-11-26 开工顺序（Boss 2026-11-25 定）

1. **设置页 GUI 重做（settings-final7）**：单页分区；外观 / 行为 / 人格 / 身份头 / 输出深度 / 自定义卡片色 / 侧边栏入口；保存、预览、校验不丢。
2. **内容合同与人格拆分**：插件总开关开着就始终注入 normal/table/short 多卡合同；人格只控文字风格；身份头独立；人格关 → 身份头关；旧消息不回溯。
3. **关闭人格/身份头仍多卡**：客户端 content-only 渲染；只省略风格、前后缀、头像/名字/签名；卡片结构、编号不变。
4. **讲解卡 + 输出深度三档**：入门 / 普通 / 专业，默认普通、无关闭；只改解释量，不改风格/结构/编号。
5. **自定义卡片色 MVP**：主色/副色/辅色 3 基色 + 自动派生 + 对比度/色相校验；不做任意 token、暗色手调。
6. **侧边栏双入口**：侧边栏面板与插件设置同一 GUI、同一份状态。
7. **测试/截图/文档/CHANGELOG/ACCEPTANCE/门禁**。
8. **1.2.0 三端发布**；不单独发 1.1.11。

## GUI 调整清单（2026-11-26，Boss 逐条）

1. **总开关只放插件标题行右侧**：删除独立的「插件总开关」区块；不写解释说明，开关本身可理解。全页只保留这一个插件总开关。
2. **风格预设归组**：预设块同时控制「说话方式」和「内心OS」，三者放在同一个风格组里；预设改动时两者一起套用。风格只描述说话风格，不混入输出深度或内容深度；「简洁专业」这类带深度词的标签改名（暂定「简洁」），深度由下方独立控制。
3. **输出深度注明出处**：参考 eli5 skill 的受众分层（入门按 5–15 岁 / 非技术受众基准，普通默认，专业面向工程师 / 专家）；在深度区写一句「参考 eli5」让用户知道来源。
4. **颜色选择必须是真拾色器**：不用预设色板；点色块打开饱和度 / 明度面板 + 色相条 + HEX + 吸管，实时预览与对比度 / 色相校验。
5. **设置页保留行为区**：默认开启 / 尾部提醒 / 子代理注入 / GenUI 四个既有字段不能丢；v4 未画，实现补上。

> 2026-11-26 实现口径：尾部提醒改为固定开启（不提供开关）；tailReminder 字段仅兼容保留，行为区保留 新会话默认开启 / 子代理注入 / GenUI 三项。

6. **预览补讲解卡**：预览区增加 explanation 卡；「普通」与代码 general 统一展示为普通。

> 当前旧稿以下内容保留作参考，按 settings-final7 重写后再执行。

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

## 九、1.2.0 服务端落地：内容合同 / 人格拆分（2026-11-26）

服务端 `src/index.js` 已落地「内容合同与人格分开」，客户端只读配置做渲染：

| 配置字段 | 默认 | 语义 |
| --- | --- | --- |
| `personaEnabled` | `true` | 只控说话风格（`compilePersona` 的 wrapper / 前缀 / 称呼 / 自称 / 中间风格 / 后缀 / skipIn）、`TONE_ANCHOR`、身份头；关闭后内容合同照旧注入 |
| `personaHeadEnabled` | `true` | 身份头（头像 / 名字 / 签名）；仅 `personaEnabled=true` 时生效，人格关闭时视为关闭（`personaHeadActive()`） |
| `contentDepth` | `general` | `beginner` / `general` / `expert`；无关闭档，规则始终随内容合同注入 |
| `themeCustom` | `''` | 自定义三色 palette JSON（`dsh-structured/palette@1`）；仅 `theme='custom'` 时由客户端使用 |

SECTION 形状（按 order 升序）：

| order | section | 注入条件 |
| --- | --- | --- |
| 9900 | `dsh-structured:style` 通用 markdown 结构 | 仅内容合同未激活时（本会话关闭 / 子代理 includeSubagents / fail-open 兜底） |
| 10240 | `dsh-structured:contract` 内容合同 | 根会话 + 本会话 structured 开启，与人格无关；`PERSONA_MODE_RULES` + `contentDepthRules`（GenUI 检测到时追加 `CONTRACT_GENUI_RULES`） |
| 10250 | `dsh-structured:tone` 人格风格 | 根会话 + structured 开启 + `personaEnabled=true`；只含 wrapper + tone 数据 + `TONE_ANCHOR` |
| 10275 | `dsh-structured:tone-anchor` | 保留占位，恒空（anchor 已并入 10250） |
| 10300 | `dsh-structured:reminder` | 合同激活时注入只讲信封的 `PERSONA_REMINDER_TEXT`；否则通用 `TAIL_REMINDER_TEXT` |

行为矩阵：

| personaEnabled | personaHeadEnabled | 内容合同 | 说话风格 / 前后缀 | 身份头 | 通用 markdown section |
| --- | --- | --- | --- | --- | --- |
| true | true | 注入 | 注入 | 开 | 空 |
| true | false | 注入 | 注入 | 关 | 空 |
| false | 任意 | 注入 | 不注入 | 关 | 空 |

边界：内容合同与人格都只进根会话（子代理 / 委派 / 聊天 fork 不注入）；`/structured` 只开关本会话，人格开启时不再拦截；tone JSON 非法时只丢风格、合同照常注入（fail-open）；旧消息不回溯。
