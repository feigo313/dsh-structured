# 自定义配色（Custom Theme）研究与实施方案

日期：2026-11-19 · 状态：研究稿，未开工 · 关联：issue #6（灰白/自定义配色）、1.1.7 主题收尾

## 1. 需求

- 用户诉求：内置主题之外能自己调色（issue #6 原话：灰白主题或开放自定义配色）。
- 1.1.7 已交付 `dsh`（黑白原色）预设；自定义配色是下一层能力，需回答「改哪几个色、怎么保证不难看/不瞎眼、存哪、改多少代码」。

## 2. 现状（代码事实）

- 主题枚举：`THEMES = ['dsh','deepseek','codex','anthropic']`（`src/index.js:56`、`src/client.js:44`）；`Config.theme` union 在 `src/index.js:226`。
- 主题生效：只写 `body[data-dsh-structured-theme]`（`applyTheme`，`src/client.js:3557`），颜色全部来自 34 个 `--dss-*` 变量；每套主题两组静态 CSS 块（浅/深），custom 无法预排 → 必须运行时注入。
- 设置页：`CONFIG_FIELDS`（`src/client.js:75`）目前只有 `segmented`/`switch` 两种控件；`renderRow`（2749）负责行渲染；`StructuredConfigCard`（3470）内已有自定义 React 编辑器先例（`PersonaEditor`），加一个配色编辑器不需要宿主新控件。
- 持久化：全部走 `Config` → active profile 的 Cordis patch；`persona` 已是 JSON 字符串字段（`index.js:233`），`personaAvatar` 已是 dataURL 字符串——自定义调色板用 JSON 字符串存 Config 有先例。
- 构建：`scripts/build.mjs` 只把 `src/index.js`/`src/client.js` 透传成 lib，**没有 bundler**；client 无法 import 共享模块，校验/派生逻辑要放在 client 内（host 只做 schema 级校验）。

## 3. 方案对比

| 方案 | 内容 | 工作量 | 风险 | 评价 |
| --- | --- | --- | --- | --- |
| A 单强调色 | 只让用户换 accent，其余沿用 dsh 灰阶 | 0.5–1 天 | 低 | 解决「不喜欢蓝」，但不满足「自定义配色」 |
| B 四基色 + 自动派生（推荐） | 底色/卡面/正文/强调色 4 个输入；其余 30 个变量派生；暗色自动推导 | 2–2.5 天 | 中 | 覆盖 80% 诉求，规则可控，门禁能兜住 |
| C 全量调色 | 8–10 个语义色 × 明暗两套全可调 | 4–5 天 | 高 | 自由度最高，但对比度/色相/维护成本爆炸 |

## 4. 推荐方案 B 细节

### 4.1 用户输入（3 个，Boss 2026-11-19 定）

| 字段 | 覆盖卡片族 | 示例 |
| --- | --- | --- |
| 主色 primary | 结论 / 表格 / 短答 / 代码框（旧版「判断/验收」blockquote 卡若出现也走主色，PersonaMode 不输出） | #4B5563 |
| 副色 secondary | 建议卡 | #047857 |
| 辅色 tertiary | 风险卡 | #B45309 |

基础层（页面底色 / 卡面 / 正文墨色 / 边框）**不开放**，沿用当前主题（默认 DSH 灰阶 / DeepSeek 等）。状态三色（✅⚠❌）**固定语义**，不跟三个卡片色走；实现上需把「建议卡/风险卡」从现有 green/amber 状态变量解耦，新增 `--dss-next-*` / `--dss-risk-*` 两组派生变量。

### 4.2 派生规则（client 内纯函数）

- **强制轻量化**（Boss 硬要求）：用户不调透明度/色度；所有软底由系统按固定低配比生成——卡片/表格/代码渐变 `soft` 叠在 paper 上 **10–14%**，状态格软底 **8–12%**，表头渐变 **10–18%**；饱和度上限 HSL S ≤ 65%（超限自动降），保证任何选色都不会把正文泡在浓色里。
- 文字/标签色：由基色自动压暗（light）/提亮（dark）到 WCAG 对比度达标（正文 ≥4.5、条/大字 ≥3），不达标继续修正；修正后仍不达标则拒绝保存。
- `head-bg`：主色低透明渐变；`zebra`：ink 4% 或 paper 3%；`code-bg/code-border/code-text`：paper 与 ink 的混合；`shadow`：固定低透明黑。
- 暗色：基础层继承宿主明暗；三个卡片色按 luminance 自动提亮 10–15% 生成 dark 变体，软底配比同浅色（透明度强制上限不变）。P1 可加「单独填暗色」开关。

### 4.3 安全校验（保存时）

- 格式：只接受 `#RGB` / `#RRGGBB`；JSON ≤ 4KB；未知字段拒绝。
- 对比度（WCAG）：三个颜色在 paper 上做软底（固定配比）后的文字对比 ≥4.5（正文）/≥3（条与大字号）；不达标 → 自动修正基色明度，仍不达标才拒绝保存。
- 轻量化：透明度/饱和度由系统强制（见 4.2），UI 不提供透明度滑杆；只给 3 个基色取色器。
- 色相：accent 与 success/warn/error 的 hue 距离 ≥25°，不足提示换色（不硬拒，给警告）。
- 兜底：配置坏 JSON/旧版本 → 回落 dsh 灰阶，不白屏。

### 4.4 设置页交互

- 主题行新增 `自定义` 分段项；选中后展开：4 个原生 `<input type=color>` + 十六进制输入框 + 对比度徽标 + 「恢复默认灰阶」+「另存为预设（可选）」。
- 复用现有预览：normal/table/code 三态即时渲染，改色实时更新；切换回内置主题时移除注入样式。

### 4.5 应用与存储

- `applyTheme('custom')`：读取 `Config.themeCustom` → 校验/派生 → 注入 `<style id="dsh-structured-custom-theme">`（浅/深两段变量块）；主题切换/编辑时重建，非 custom 时移除。
- Config 新增：`themeCustom: Schema.string().default('')`，JSON 形如 `{schema:'dsh-structured/palette@1',light:{surface,paper,ink,accent},dark?:{...}}`；写 profile patch，重启保留。

## 5. 改动清单

| 文件 | 改动 |
| --- | --- |
| `src/index.js` | `THEMES` 加 `custom`；`Config.themeCustom`；schema 描述 |
| `src/client.js` | `THEMES`、`CONFIG_FIELDS` 加 `custom`；配色编辑器组件；palette 解析/派生/对比度/色相校验；`applyTheme` 注入与清理 |
| `test/theme.test.mjs` / `client-config-page` / `client-visual` | 枚举、编辑器渲染、注入/移除、坏 JSON 回落 |
| `test/palette.test.mjs`（新） | 派生表、对比度边界、色相边界、灰阶/极端色 |
| `scripts/theme-contrast.mjs` | 增加 custom 校验器（导出纯函数供测试） |
| `docs/` + `assets/screenshots/` | 方案/验收、设置页与三态截图 |

## 6. 工作量

- B MVP：2–2.5 天（含测试、文档、截图、门禁；不含发布链）。
- 加「暗色单独填写」+0.5 天；加「用户预设列表」+1 天；C 全量 4–5 天。

## 7. 风险与缓解

- 对比度翻车：保存时硬校验 + 一键修正；渲染前再兜底一次。
- 暗色推导观感差：先用 luminance 反转 + 提亮 accent，真机看效果；不行就上「单独暗色」。
- 色相撞车：固定状态色 + hue 警告。
- 配置膨胀：JSON ≤4KB；只存 4×2 色，不存派生值。
- 支持成本：文档写清「4 个基色，其余自动派生」，避免用户以为能调全部。

## 8. 排期建议

- 1.1.7：先发现有 4 主题 + persona 修复（已 push，待发版）。
- 1.2.0：自定义配色 + 侧边栏入口一起做（两者都要动设置页/入口，合并一轮发布）。
- 若想更快：1.1.8 只做 B MVP，侧边栏入口后置。

## 9. 验收草案

- 设置页选 `自定义` → 改 4 色，回复区即时变化；切回预设后注入样式移除。
- 低对比组合被拒绝保存并给出修正建议；坏 JSON 回落灰阶不白屏。
- 浅色/深色都能看；重启后配置保留。
- 门禁：schema/派生/对比度/色相/注入/编辑器测试全绿；computed-style 加 custom 夹具；pack 体积在预算内。
