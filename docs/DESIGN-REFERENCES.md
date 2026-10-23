# 视觉引导参考（单一方向）

## 方向

0.9.0 提供 deepseek/codex/anthropic 三套 token，不做主题市场/自定义 CSS：**Linear 的秩序 + Notion 的卡片 + Stripe 的信息密度 + Vercel AI Elements 的 AI 回复结构**。

## 参考项目

官方入口：[Linear](https://linear.app) · [Notion](https://www.notion.so) · [Stripe Docs](https://docs.stripe.com) · [Vercel AI Elements](https://ai-sdk.dev/elements) · [GitHub Primer](https://primer.style) · [Apple HIG](https://developer.apple.com/design/human-interface-guidelines) · [Material 3](https://m3.material.io) · [IBM Carbon](https://carbondesignsystem.com) · [Attio](https://attio.com) · [Height](https://height.app) · [Raycast](https://raycast.com) · [assistant-ui](https://www.assistant-ui.com) · [prompt-kit](https://www.prompt-kit.com)。

| 参考 | 借什么 | 不借什么 |
| --- | --- | --- |
| **Linear** | 8px 网格、1px 低对比边框、11px 大写字距标签、强调色只给主操作、克制的 hover | 深色单色调、键盘优先的交互密度 |
| **Notion** | callout 结构：图标方块 + 淡色底 + 标题/正文；8–10px 圆角；页面留白 | emoji 当图标、过软的粉彩 |
| **Stripe Docs** | 信息密度、等宽小标签、清晰的表头/正文层级、inline code chip | 营销页渐变、过多品牌色 |
| **Vercel AI Elements** | AI 回复的 `Message / Response / CodeBlock / Tool / Sources / Actions` 组件划分；代码块 header；状态/来源 | 开发者暗色审美、全量组件库 |
| **GitHub Primer** | design token、状态 label、AA 对比度、可访问的语义色 | 开发者工具的密集 chrome |
| **Apple HIG** | Clarity / Deference / Depth：卡片轻 elevation、内容优先、克制装饰 | iOS 专用控件 |
| **Material 3** | tonal surface + state layer：卡片用「表面色 + 强调色 5–10%」而不是重边框 | 重阴影、动态色大面积铺 |
| **IBM Carbon** | 2x grid、数据表规格、行高/对齐 | 企业级高密度 |
| **Attio / Height / Raycast** | 低对比边框 + 高对比文字 + 单一强调色；小圆角；细分隔线 | 复杂命令面板布局 |
| **assistant-ui / prompt-kit** | AI 聊天气泡、Markdown、CodeBlock、Tool 卡片的组件边界 | 整套框架依赖 |

## 从参考里抽出的 6 条规则

1. **一个焦点**：每条回复只有 1 个结论卡 + 最多 1 个行动/风险卡；强调色只出现在这两个焦点和关键数字上。
2. **卡片不是边框盒子**：图标方块（26px，强调色 12% 底）+ 13px 大写标签 + 12px 圆角 + 淡色表面 + 1px 低对比边；禁止灰底灰边的大方块。
3. **状态用 badge，不用整行染色**：状态列 68px，emoji/符号居中；整行 pastel 底是 Excel 感的主要来源，改成只给状态单元格 10–12% 色底。
4. **表格去竖线**：表头 11px 大写、44px 行高、1px 横线、无竖线；表格前一行 lead（表格结论）用 2px 强调左规线。
5. **文字层级**：正文 15.5/1.7；标签 13/700 + letter-spacing；H2 21/700；数字用 tabular-nums；等宽只给标签/数字，不全文等宽。
6. **动效克制**：150–200ms opacity/translate；`prefers-reduced-motion` 关闭；不用弹跳/发光/大面积渐变。

## 反例（当前廉价感来源）

- 结论卡是白底 + 1px 灰边 + 小蓝字，像普通 blockquote；
- 表格整行 pastel 绿/黄，像 Excel 条件格式，且状态列占 30% 宽；
- 表格无「表格结论」lead 样式，只是一行粗体；
- 结论卡、下一步卡外观几乎一样，卡片类型没有视觉差异；
- 强调蓝同时出现在标题条、表头、标签、链接，10% 强调被摊成 50%；
- emoji 直接当状态图标，缺少 badge 容器和统一尺寸。

## 落地映射

| 规则 | CSS/DOM |
| --- | --- |
| 卡片图标方块 | `blockquote[data-card-type] > p:first-child > strong:first-child::before` 22px 方块 |
| 卡片表面 | 1px 强调 16% 边 + 强调 6% 渐变底 + `0 8px 24px -16px` 阴影 + 12px 圆角 |
| 状态 badge | `table[data-dsh-structured-status-table] td:first-child` 68px、居中、10% 语义色底；不再整行染色 |
| 表格 lead | `p[data-dsh-structured-lead="table"]` 2px 强调左规线 + 14px |
| 去竖线 | `border-collapse:separate` + 只有 `border-bottom` |
| 单一强调 | H2 左条保留但变细；表头不用蓝底，用中性 surface |
