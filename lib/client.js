// Generated from src/client.js by scripts/build.mjs — edit src/, then run `npm run build`.
// dsh-structured client module: renders "结论：" blockquotes as cards.
/**
 * dsh-structured client
 *
 * 两层，都是纯 DOM 增强，不改消息内容、不替换 app root：
 * 1) 对话 markdown 视觉层：标题字号/层级、表格、代码块、引用块、列表、链接的排版与配色。
 * 2) 语义装饰：结论卡片、风险/验收等 callout 色调、标题关键词图标、代码块语言色。
 *
 * 只给宿主已有节点加 class/attribute，不搬 React 节点；markdown 重渲染后由 MutationObserver
 * 重新扫描。主题色全部走 --dsw-alias-*，自动跟随明暗主题。
 */
window.__ModuleLoader__.load({
  id: 'dsh-structured',
  factory(require) {
    const CARD_ATTR = 'data-dsh-structured-card'
    const CARD_TYPE_ATTR = 'data-dsh-structured-card-type'
    const ICON_ATTR = 'data-dsh-structured-icon'
    const TONE_ATTR = 'data-dsh-structured-tone'
    const LANG_ATTR = 'data-dsh-structured-lang'
    const CODE_ATTR = 'data-dsh-structured-code'
    const SKIP_ATTR = 'data-dsh-structured-skip'
    const STATUS_ATTR = 'data-dsh-structured-status'
    const STATUS_TABLE_ATTR = 'data-dsh-structured-status-table'
    const LEAD_ATTR = 'data-dsh-structured-lead'
    const ROW_ATTR = 'data-dsh-structured-row'
    const ROOT_ATTR = 'data-dsh-structured'
    const THEME_ATTR = 'data-dsh-structured-theme'
    const THEMES = ['deepseek', 'codex', 'anthropic']
    const STYLE_ID = 'dsh-structured-skin-style'
    const LEGACY_STYLE_ID = 'dsh-structured-card-style'

    /** 配置页常量：宿主插件详情页的 bundle 配置 slot（键 = 包名）。 */
    const CONFIG_NS = 'dsh-structured'
    const BUNDLE_CONFIG_SLOT = 'plugins.bundle.config'
    let personaTestApi = null
    const PERSONA_WHALE_JSON = "{\"schema\":\"dsh-structured/persona@1\",\"meta\":{\"name\":\"鲸鱼娘·工作模式\",\"version\":\"1.0.0\",\"author\":\"上善无形 → ZipZipPipe\",\"license\":\"CC-BY-NC-SA-4.0\",\"official\":false,\"source\":\"community derivative; not DeepSeek official\",\"attribution\":\"原始角色/二创：上善无形；二创整理：ZipZipPipe；详见 NOTICE-WHALE\"},\"identity\":{\"role\":\"来自深海的鲸鱼少女，聪明但偶尔犯懒，认真时可靠\",\"selfReference\":[\"本鲸鱼娘\"],\"worldview\":\"把用户当长期合作的伙伴，不装权威，也不敷衍\"},\"address\":{\"user\":\"Boss\",\"forbidden\":[\"主人\"]},\"tone\":{\"style\":\"轻松、略傲娇，先给结论再吐槽；专业、代码、风险场景自动收敛\",\"professionalScenes\":[\"工作\",\"代码\",\"风险\"],\"forbidden\":[\"恋爱\",\"性化\",\"越界角色扮演\"]},\"habits\":{\"catchphrases\":[\"本鲸鱼娘\"],\"motifs\":[\"米饭\",\"尾巴\"],\"taboos\":[\"被叫胖\"]},\"closing\":{\"enabled\":true,\"mode\":\"signature\",\"maxChars\":20,\"skipIn\":[\"code\",\"diff\",\"error\",\"short\",\"table\"]},\"examples\":[\"这个方案可以推，但先补验证——本鲸鱼娘可不背锅。\",\"收到，本鲸鱼娘去查。\"],\"render\":{\"intensity\":\"standard\",\"language\":\"follow_user\",\"audience\":\"general\"}}"

    /** 六个配置字段的界面文案；field 与 host Config schema 对齐，fallback 为 schema 默认值。 */
    const CONFIG_FIELDS = [
      { field: 'theme', kind: 'segmented', fallback: 'deepseek', label: '主题 / Theme', hint: '回复区配色，改完立即生效', options: [['deepseek', 'DeepSeek'], ['codex', 'Codex'], ['anthropic', 'Anthropic']] },
      { field: 'visual', kind: 'switch', fallback: true, label: '视觉层 / Visual layer', hint: '关闭后不加载回复区样式（标题卡、表格、代码块皮肤）' },
      { field: 'defaultEnabled', kind: 'switch', fallback: true, label: '新会话默认开启 / Default on', hint: '新会话默认注入结构化提示词' },
      { field: 'tailReminder', kind: 'switch', fallback: true, label: '尾部提醒 / Tail reminder', hint: '在 system prompt 末尾追加一句结构化提醒' },
      { field: 'includeSubagents', kind: 'switch', fallback: false, label: '子代理注入 / Subagents', hint: '子代理会话也注入（其产出不直接面向用户）' },
      { field: 'genui', kind: 'segmented', fallback: 'auto', label: 'GenUI 联动 / GenUI routing', hint: 'auto：检测到 dsh-genui 才追加 dsh-ui 路由规则', options: [['auto', 'auto'], ['on', 'on'], ['off', 'off']] },
    ]

    /**
     * 配置页专用样式：主题分段选择器的三个选项各带自己所代表主题的强调色
     * （圆点标识 + 选中态文字着色，明暗自适应）。色值与视觉层三套 token 同源，
     * 但作用域是设置面板（不在 _markdown_ 容器内），所以单独一份而不是复用 --ds-*。
     */
    const CONFIG_STYLE_ID = 'dsh-structured-config-style'
    const CONFIG_CSS = `
[data-dsh-structured-config] button[id^="dsh-structured-theme-"]{position:relative}
[data-dsh-structured-config] button[id^="dsh-structured-theme-"]::before{
  content:"";display:inline-block;width:7px;height:7px;border-radius:50%;
  margin-right:7px;vertical-align:baseline;background:var(--dsw-alias-label-tertiary,#9CA3AF);
}
[data-dsh-structured-config] button#dsh-structured-theme-deepseek::before{background:#2563EB}
[data-dsh-structured-config] button#dsh-structured-theme-codex::before{background:#10A37F}
[data-dsh-structured-config] button#dsh-structured-theme-anthropic::before{background:#CC785C}
[data-dsh-structured-config] button#dsh-structured-theme-deepseek[aria-selected="true"]{color:#2563EB;font-weight:600}
[data-dsh-structured-config] button#dsh-structured-theme-codex[aria-selected="true"]{color:#0B6B4F;font-weight:600}
[data-dsh-structured-config] button#dsh-structured-theme-anthropic[aria-selected="true"]{color:#A14A2E;font-weight:600}
body[data-ds-dark-theme] [data-dsh-structured-config] button#dsh-structured-theme-deepseek::before{background:#60A5FA}
body[data-ds-dark-theme] [data-dsh-structured-config] button#dsh-structured-theme-codex::before{background:#34D399}
body[data-ds-dark-theme] [data-dsh-structured-config] button#dsh-structured-theme-anthropic::before{background:#E8A087}
body[data-ds-dark-theme] [data-dsh-structured-config] button#dsh-structured-theme-deepseek[aria-selected="true"]{color:#60A5FA}
body[data-ds-dark-theme] [data-dsh-structured-config] button#dsh-structured-theme-codex[aria-selected="true"]{color:#34D399}
body[data-ds-dark-theme] [data-dsh-structured-config] button#dsh-structured-theme-anthropic[aria-selected="true"]{color:#E8A087}
`

    /** 插入配置页样式；返回移除函数。document 不可用时是空操作。 */
    const ensureConfigStyle = () => {
      if (typeof document === 'undefined' || document.head === null) return () => {}
      document.getElementById(CONFIG_STYLE_ID)?.remove()
      const style = document.createElement('style')
      style.id = CONFIG_STYLE_ID
      style.textContent = CONFIG_CSS
      document.head.appendChild(style)
      return () => {
        try {
          style.remove()
        } catch {
          // 移除失败不影响宿主。
        }
      }
    }

    const CARD_TYPES = new Map([
      ['结论', 'conclusion'], ['总结', 'conclusion'], ['答案', 'conclusion'],
      ['判断', 'decision'], ['决策', 'decision'],
      ['指标', 'metric'], ['数据', 'metric'],
      ['风险', 'risk'], ['注意', 'risk'], ['警告', 'risk'],
      ['下一步', 'next'], ['行动', 'next'], ['待办', 'next'],
      ['验收', 'accept'], ['通过', 'accept'], ['完成', 'accept'],
      ['重点', 'key'], ['关键', 'key'],
    ])
    const ICONS = [
      [/结论|总结|答案|判断/, '◆'],
      [/方案|计划|步骤|流程/, '▸'],
      [/风险|注意|警告|坑/, '⚠'],
      [/验收|检查|核对/, '✓'],
      [/对比|选型|取舍/, '⇄'],
      [/下一步|行动|待办/, '→'],
      [/背景|原因|根因/, '◎'],
      [/指标|数据|结果/, '▦'],
    ]

    const CSS = `
[class*="_markdown_"]{
  --ds-surface:#FFFFFF;--ds-surface-2:#F4F7FB;--ds-text:#0F172A;--ds-muted:#5B6B82;
  --ds-border:#E2E8F0;--ds-accent:#2563EB;--ds-accent-text:#2563EB;--ds-success:#166534;--ds-warn:#92400E;--ds-error:#991B1B;
  --ds-code-bg:#F6F8FA;--ds-code-text:#0F172A;
  font-size:15px;line-height:1.72;letter-spacing:.01em;
}
body[data-ds-dark-theme] [class*="_markdown_"]{
  --ds-surface:#111827;--ds-surface-2:#1F2937;--ds-text:#E5E7EB;--ds-muted:#9CA3AF;
  --ds-border:#374151;--ds-accent:#60A5FA;--ds-accent-text:#60A5FA;--ds-success:#4ADE80;--ds-warn:#FBBF24;--ds-error:#F87171;
  --ds-code-bg:#0B1220;--ds-code-text:#E5E7EB;
}
body[data-dsh-structured-theme="codex"] [class*="_markdown_"]{
  --ds-surface:#FFFFFF;--ds-surface-2:#F0F7F4;--ds-text:#0D1117;--ds-muted:#4F625A;
  --ds-border:#CFE3DB;--ds-accent:#10A37F;--ds-accent-text:#0B6B4F;--ds-success:#116329;--ds-warn:#7D4E00;--ds-error:#A40E26;
  --ds-code-bg:#F0F7F4;--ds-code-text:#0D1117;
}
body[data-ds-dark-theme][data-dsh-structured-theme="codex"] [class*="_markdown_"]{
  --ds-surface:#0B1512;--ds-surface-2:#12211B;--ds-text:#E6F2EC;--ds-muted:#9DB2A8;
  --ds-border:#233A31;--ds-accent:#34D399;--ds-accent-text:#6EE7B7;--ds-success:#3FB950;--ds-warn:#D29922;--ds-error:#F85149;
  --ds-code-bg:#07100D;--ds-code-text:#E6F2EC;
}
body[data-dsh-structured-theme="anthropic"] [class*="_markdown_"]{
  --ds-surface:#FAF9F5;--ds-surface-2:#F5F1E8;--ds-text:#141413;--ds-muted:#6B6359;
  --ds-border:#E5E0D5;--ds-accent:#CC785C;--ds-accent-text:#A14A2E;--ds-success:#266B4D;--ds-warn:#806000;--ds-error:#8C1D18;
  --ds-code-bg:#F5F1E8;--ds-code-text:#141413;
}
body[data-ds-dark-theme][data-dsh-structured-theme="anthropic"] [class*="_markdown_"]{
  --ds-surface:#1F1E1D;--ds-surface-2:#2A2825;--ds-text:#F5F1E8;--ds-muted:#A8A29A;
  --ds-border:#3A3733;--ds-accent:#E8A087;--ds-accent-text:#E8A087;--ds-success:#6FBF9A;--ds-warn:#EAB308;--ds-error:#F28B82;
  --ds-code-bg:#171614;--ds-code-text:#F5F1E8;
}
[class*="_markdown_"] p{margin:.72em 0}
[class*="_markdown_"] h1,[class*="_markdown_"] h2,[class*="_markdown_"] h3,
[class*="_markdown_"] h4,[class*="_markdown_"] h5,[class*="_markdown_"] h6{
  color:var(--ds-text);line-height:1.32;letter-spacing:-.01em;
}
[class*="_markdown_"] h1{font-size:26px;font-weight:700;margin:32px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--ds-border)}
[class*="_markdown_"] h2{font-size:21px;font-weight:700;margin:28px 0 10px;padding-left:12px;border-left:3px solid var(--ds-accent)}
[class*="_markdown_"] h3{font-size:17px;font-weight:650;margin:22px 0 8px}
[class*="_markdown_"] h2[${ICON_ATTR}]{padding-left:42px;text-indent:-30px}
[class*="_markdown_"] h3[${ICON_ATTR}]{padding-left:30px;text-indent:-30px}
[class*="_markdown_"] h4{font-size:15px;font-weight:650;margin:16px 0 6px}
[class*="_markdown_"] h5,[class*="_markdown_"] h6{font-size:13px;font-weight:700;margin:14px 0 6px;color:var(--ds-muted);text-transform:uppercase;letter-spacing:.06em}
[class*="_markdown_"] h2[${ICON_ATTR}]::before,
[class*="_markdown_"] h3[${ICON_ATTR}]::before{
  content:attr(${ICON_ATTR});
  display:inline-flex;align-items:center;justify-content:center;
  width:22px;height:22px;margin-right:8px;text-indent:0;border-radius:6px;
  background:color-mix(in srgb,var(--ds-accent) 12%,transparent);
  color:var(--ds-accent-text);font-size:12px;font-weight:700;vertical-align:2px;
}
[class*="_markdown_"] strong{font-weight:700;color:var(--ds-text)}
[class*="_markdown_"] a{color:var(--ds-accent-text);text-decoration:none;border-bottom:1px solid color-mix(in srgb,var(--ds-accent) 38%,transparent)}
[class*="_markdown_"] a:hover{border-bottom-color:var(--ds-accent)}
[class*="_markdown_"] ul,[class*="_markdown_"] ol{padding-left:1.5em;margin:.6em 0}
[class*="_markdown_"] li{margin:.28em 0}
[class*="_markdown_"] li::marker{color:var(--ds-accent-text)}
[class*="_markdown_"] hr{height:1px;border:0;margin:28px 0;background:linear-gradient(90deg,transparent,var(--ds-border),transparent)}
[class*="_markdown_"] table:not([${SKIP_ATTR}]){
  width:100%;margin:16px 0;border-collapse:separate;border-spacing:0;
  border:1px solid var(--ds-border);border-radius:12px;overflow:hidden;font-size:12.5px;
  box-shadow:0 1px 2px rgba(0,0,0,.03);
}
[class*="_markdown_"] table:not([${SKIP_ATTR}]) thead th{
  height:38px;background:var(--ds-surface-2);
  font-size:13px!important;letter-spacing:0!important;
  color:color-mix(in srgb,var(--ds-text) 78%,var(--ds-muted));
  font-weight:700!important;text-align:left;padding:0 18px!important;vertical-align:middle;
  border-bottom:1px solid var(--ds-border);
}
[class*="_markdown_"] table:not([${SKIP_ATTR}]) tbody td{
  padding:12px 18px!important;line-height:1.55;vertical-align:middle;border-left:0;border-right:0;
  border-bottom:1px solid color-mix(in srgb,var(--ds-border) 55%,transparent);
  word-break:break-word;
}
[class*="_markdown_"] table:not([${SKIP_ATTR}]) tbody tr:nth-child(even){background:color-mix(in srgb,var(--ds-surface-2) 45%,transparent)}
[class*="_markdown_"] table:not([${SKIP_ATTR}]) tbody tr:hover{background:color-mix(in srgb,var(--ds-accent) 5%,transparent)}
[class*="_markdown_"] table:not([${SKIP_ATTR}]) tbody tr:last-child td{border-bottom:0}
[class*="_markdown_"] table:not([${SKIP_ATTR}]):has(thead th:nth-child(2):last-child) th:first-child,
[class*="_markdown_"] table:not([${SKIP_ATTR}]):has(thead th:nth-child(2):last-child) td:first-child{width:30%}
[class*="_markdown_"] table:not([${SKIP_ATTR}]):not([${STATUS_TABLE_ATTR}]):has(thead th:nth-child(3):last-child) th:first-child,
[class*="_markdown_"] table:not([${SKIP_ATTR}]):not([${STATUS_TABLE_ATTR}]):has(thead th:nth-child(3):last-child) td:first-child{width:24%}
[class*="_markdown_"] table:not([${SKIP_ATTR}]):not([${STATUS_TABLE_ATTR}]):has(thead th:nth-child(3):last-child) th:nth-child(2),
[class*="_markdown_"] table:not([${SKIP_ATTR}]):not([${STATUS_TABLE_ATTR}]):has(thead th:nth-child(3):last-child) td:nth-child(2){width:22%}
[class*="_markdown_"] table:not([${SKIP_ATTR}])[${STATUS_TABLE_ATTR}] th:first-child,
[class*="_markdown_"] table:not([${SKIP_ATTR}])[${STATUS_TABLE_ATTR}] td:first-child{
  width:68px;text-align:center;padding:4px 8px!important;font-size:10px;font-weight:700;
  white-space:nowrap;vertical-align:middle;border-radius:6px;
}
[class*="_markdown_"] table:not([${SKIP_ATTR}])[${STATUS_TABLE_ATTR}] tbody tr[${ROW_ATTR}="success"] td:first-child{background:color-mix(in srgb,var(--ds-success) 12%,transparent);color:var(--ds-success)}
[class*="_markdown_"] table:not([${SKIP_ATTR}])[${STATUS_TABLE_ATTR}] tbody tr[${ROW_ATTR}="warn"] td:first-child{background:color-mix(in srgb,var(--ds-warn) 12%,transparent);color:var(--ds-warn)}
[class*="_markdown_"] table:not([${SKIP_ATTR}])[${STATUS_TABLE_ATTR}] tbody tr[${ROW_ATTR}="error"] td:first-child{background:color-mix(in srgb,var(--ds-error) 12%,transparent);color:var(--ds-error)}
[class*="_markdown_"] p[${LEAD_ATTR}="table"]{
  border:0;padding:0;margin:12px 0 8px;
  font-size:13px;color:var(--ds-text);
}
[class*="_markdown_"] p[${LEAD_ATTR}="table"] strong{font-size:14px;font-weight:700;color:var(--ds-text)}
[class*="_markdown_"] h2+table,[class*="_markdown_"] h2+p,[class*="_markdown_"] h3+table,[class*="_markdown_"] h3+p{margin-top:8px}
[class*="_markdown_"] :not(pre)>code{
  background:var(--ds-surface-2);border:1px solid var(--ds-border);border-radius:6px;
  padding:.12em .38em;font-size:.9em;color:var(--ds-accent-text);overflow-wrap:anywhere;
}
[class*="_markdown_"] .md-code-block[${CODE_ATTR}="1"]{
  margin:16px 0;border:1px solid var(--ds-border);border-radius:12px;overflow:hidden;
  background:var(--ds-code-bg);box-shadow:0 1px 2px rgba(0,0,0,.04);
}
[class*="_markdown_"] .md-code-block[${CODE_ATTR}="1"] > [class*="_bannerWrap"]{
  margin:0;padding:0;border:0;background:none;
}
[class*="_markdown_"] .md-code-block[${CODE_ATTR}="1"] [data-code-block-banner]{
  display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0;border-radius:0;
  padding:6px 12px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
  color:var(--ds-muted);border-bottom:1px solid var(--ds-border);
  background:linear-gradient(90deg,color-mix(in srgb,var(--ds-code-accent,var(--ds-accent)) 14%,transparent),transparent 72%);
}
[class*="_markdown_"] .md-code-block[${CODE_ATTR}="1"] [data-code-block-banner] > [class*="_heading"]{
  flex:1;min-width:0;justify-content:flex-start;text-align:left;
}
[class*="_markdown_"] .md-code-block[${CODE_ATTR}="1"] [data-code-block-banner] > [class*="_actions"]{
  margin-left:auto;flex:none;
}
[class*="_markdown_"] .md-code-block[${CODE_ATTR}="1"] > [data-code-block-content]{padding:0}
[class*="_markdown_"] .md-code-block[${CODE_ATTR}="1"] [data-code-block-banner]::before{
  content:"";width:8px;height:8px;border-radius:50%;flex:none;
  background:var(--ds-code-accent,var(--ds-accent));
  box-shadow:0 0 0 3px color-mix(in srgb,var(--ds-code-accent,var(--ds-accent)) 18%,transparent);
}
[class*="_markdown_"] .md-code-block[${CODE_ATTR}="1"] pre{margin:0;padding:14px 16px;font-size:13px;line-height:1.65;overflow:auto;color:var(--ds-code-text)}
[class*="_markdown_"] .md-code-block[${CODE_ATTR}="1"][data-dsh-structured-lang="js"]{--ds-code-accent:#eab308}
[class*="_markdown_"] .md-code-block[${CODE_ATTR}="1"][data-dsh-structured-lang="ts"],
[class*="_markdown_"] .md-code-block[${CODE_ATTR}="1"][data-dsh-structured-lang="tsx"]{--ds-code-accent:#3b82f6}
[class*="_markdown_"] .md-code-block[${CODE_ATTR}="1"][data-dsh-structured-lang="py"],
[class*="_markdown_"] .md-code-block[${CODE_ATTR}="1"][data-dsh-structured-lang="python"]{--ds-code-accent:#22c55e}
[class*="_markdown_"] .md-code-block[${CODE_ATTR}="1"][data-dsh-structured-lang="bash"],
[class*="_markdown_"] .md-code-block[${CODE_ATTR}="1"][data-dsh-structured-lang="sh"],
[class*="_markdown_"] .md-code-block[${CODE_ATTR}="1"][data-dsh-structured-lang="powershell"]{--ds-code-accent:#14b8a6}
[class*="_markdown_"] .md-code-block[${CODE_ATTR}="1"][data-dsh-structured-lang="json"]{--ds-code-accent:#a855f7}
[class*="_markdown_"] .md-code-block[${CODE_ATTR}="1"][data-dsh-structured-lang="html"],
[class*="_markdown_"] .md-code-block[${CODE_ATTR}="1"][data-dsh-structured-lang="css"]{--ds-code-accent:#f97316}
[class*="_markdown_"] .md-code-block[${CODE_ATTR}="1"][data-dsh-structured-lang="sql"]{--ds-code-accent:#06b6d4}
[class*="_markdown_"] blockquote{
  margin:14px 0;padding:10px 14px;border-left:3px solid var(--ds-accent);
  background:color-mix(in srgb,var(--ds-accent) 6%,transparent);border-radius:0 10px 10px 0;
}
[class*="_markdown_"] blockquote[${TONE_ATTR}="warn"]{--ds-accent:var(--ds-warn);--ds-accent-text:var(--ds-warn)}
[class*="_markdown_"] blockquote[${TONE_ATTR}="success"]{--ds-accent:var(--ds-success);--ds-accent-text:var(--ds-success)}
[class*="_markdown_"] blockquote[${CARD_ATTR}="1"]{
  border:1px solid color-mix(in srgb,var(--ds-accent) 18%,var(--ds-border));
  border-left:3px solid var(--ds-accent);
  border-radius:12px;padding:18px;
  background:linear-gradient(135deg,color-mix(in srgb,var(--ds-accent) 5%,var(--ds-surface)),var(--ds-surface) 62%);
  box-shadow:0 1px 2px rgba(0,0,0,.04);
}
[class*="_markdown_"] blockquote[${CARD_ATTR}="1"]>p:first-child>strong:first-child{
  display:block;position:static;
  font-size:14px;line-height:1.3;letter-spacing:0;text-transform:none;
  color:var(--ds-accent-text);margin-bottom:6px;
}
[class*="_markdown_"] blockquote[${CARD_ATTR}="1"]>p{font-size:13px;line-height:1.6;font-weight:400;color:var(--ds-text)}
[class*="_markdown_"] blockquote[${CARD_ATTR}="1"]>p strong{font-weight:700;color:var(--ds-text)}
[class*="_markdown_"] blockquote[${TONE_ATTR}]>p:first-child>strong:first-child{color:var(--ds-accent-text)}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="risk"]{--ds-accent:var(--ds-warn);--ds-accent-text:var(--ds-warn)}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="accept"]{--ds-accent:var(--ds-success);--ds-accent-text:var(--ds-success)}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="statement"]>p:first-child>strong:first-child{
  font-size:24px;line-height:1.25;letter-spacing:-.02em;text-transform:none;
  color:var(--ds-text);margin-bottom:0;
}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="statement"]>p:first-child>strong:first-child::after{
  content:"";display:block;height:1px;margin:12px 0;
  background:var(--ds-border);
}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="statement"]>p{font-size:13.5px;line-height:1.6;font-weight:400}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="statement"]>p:first-child{margin-bottom:0}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="next"]{
  background:none;border:0;border-top:1px solid var(--ds-border);border-radius:0;
  box-shadow:none;padding:14px 0 0 14px;margin:18px 0;position:relative;
}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="next"]::before{
  content:"";position:absolute;left:0;top:17px;width:0;height:0;
  border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:9px solid #C2410C;
}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="next"]>p:first-child>strong:first-child{
  font-size:16px;line-height:1.3;color:var(--ds-text);margin-bottom:8px;
}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="next"]>p,
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="next"] li{font-size:13px;line-height:1.6}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="next"] ol,
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="next"] ul{padding-left:0;margin:.4em 0 0;list-style-position:inside}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="next"] li{padding-left:0}
body[data-ds-dark-theme] [class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="next"]::before{border-left-color:#FB923C}
[class*="_markdown_"] blockquote[${CARD_ATTR}="1"]>p:first-child{margin-top:0}
[class*="_markdown_"] blockquote[${CARD_ATTR}="1"]>p:last-child{margin-bottom:0}
[class*="_markdown_"] p[${STATUS_ATTR}],[class*="_markdown_"] li[${STATUS_ATTR}]{
  border-left:3px solid var(--ds-accent);background:color-mix(in srgb,var(--ds-accent) 7%,transparent);
  border-radius:0 6px 6px 0;padding:4px 10px;margin:.4em 0;
}
[class*="_markdown_"] p[${STATUS_ATTR}="success"],[class*="_markdown_"] li[${STATUS_ATTR}="success"]{--ds-accent:var(--ds-success)}
[class*="_markdown_"] p[${STATUS_ATTR}="warn"],[class*="_markdown_"] li[${STATUS_ATTR}="warn"]{--ds-accent:var(--ds-warn)}
[class*="_markdown_"] p[${STATUS_ATTR}="error"],[class*="_markdown_"] li[${STATUS_ATTR}="error"]{--ds-accent:var(--ds-error)}
@media (max-width:720px){
  [class*="_markdown_"]{font-size:14.5px}
  [class*="_markdown_"] h1{font-size:22px}
  [class*="_markdown_"] h2{font-size:18px}
  [class*="_markdown_"] table:not([${SKIP_ATTR}]){font-size:13px}
  [class*="_markdown_"] table:not([${SKIP_ATTR}]) thead th,[class*="_markdown_"] table:not([${SKIP_ATTR}]) tbody td{padding:7px 9px}
}
@media (prefers-reduced-motion:reduce){
  [class*="_markdown_"] *{transition:none!important;animation:none!important}
}
`

    function iconFor(text) {
      for (const [pattern, icon] of ICONS) if (pattern.test(text)) return icon
      return null
    }

    function firstParagraph(block) {
      return [...(block.children ?? [])].find((element) => element.tagName === 'P') ?? null
    }

    function labelOf(block) {
      const first = firstParagraph(block)
      const strong = first?.firstElementChild
      if (!strong || strong.tagName !== 'STRONG') return null
      return (strong.textContent ?? '').replace(/[：:]\s*$/u, '').trim()
    }

    function cardTypeFor(block) {
      const label = labelOf(block)
      return label === null ? null : (CARD_TYPES.get(label) ?? null)
    }

    function isLabelLike(text) {
      return [...CARD_TYPES.keys()].some((label) => text.startsWith(label) && text !== label)
    }

    function inGenui(element) {
      try {
        return Boolean(element.closest?.('[data-genui], [class*="genui-root"]'))
      } catch {
        return false
      }
    }

    function inDiff(element) {
      try {
        return Boolean(element.closest?.('[data-diff], .md-diff, [class*="_diff_"], [class*="diff-view"], [class*="diff-block"], [data-testid*="diff"]'))
      } catch {
        return false
      }
    }

    function bannerLanguage(code) {
      const banner = code.querySelector?.('[data-code-block-banner]')
      const heading = banner?.querySelector?.('[class*="_heading"]')
      const raw = ((heading?.textContent ?? banner?.textContent) ?? '').trim().split(/\s+/)[0] ?? ''
      return raw.toLowerCase().replace(/[^a-z0-9+#]/g, '')
    }

    function isDiffCode(code) {
      const lang = bannerLanguage(code)
      return lang === 'diff' || lang === 'patch'
    }

    function statusFor(text) {
      if (/^✅/.test(text)) return 'success'
      if (/^⚠/.test(text)) return 'warn'
      if (/^❌/.test(text)) return 'error'
      return null
    }

    function isStatementCard(block) {
      if (inDiff(block)) return false
      const markdown = block.closest?.('[class*="_markdown_"]')
      if (!markdown) return false
      const first = [...markdown.querySelectorAll('blockquote')].find((element) => !inGenui(element) && !inDiff(element))
      if (first !== block) return false
      const paragraphs = [...block.children].filter((element) => element.tagName === 'P')
      const firstParagraph = paragraphs[0]
      const strong = firstParagraph?.firstElementChild
      if (!strong || strong.tagName !== 'STRONG') return false
      let previous = strong.previousSibling
      while (previous) {
        if (previous.nodeType === 1) return false
        if (previous.nodeType === 3 && (previous.textContent ?? '').trim() !== '') return false
        previous = previous.previousSibling
      }
      const title = (strong.textContent ?? '').trim()
      if (title.length === 0 || isLabelLike(title)) return false
      let rest = ''
      for (let node = strong.nextSibling; node; node = node.nextSibling) rest += node.textContent ?? ''
      const secondBody = paragraphs.slice(1).some((element) => (element.textContent ?? '').trim().length > 0)
      return rest.trim().length > 0 || secondBody
    }

    function decorate(root) {
      for (const heading of root.querySelectorAll('[class*="_markdown_"] h2, [class*="_markdown_"] h3')) {
        if (inGenui(heading) || inDiff(heading)) continue
        const icon = iconFor((heading.textContent ?? '').trim())
        if (icon === null) heading.removeAttribute(ICON_ATTR)
        else heading.setAttribute(ICON_ATTR, icon)
      }

      for (const block of root.querySelectorAll('blockquote')) {
        if (inGenui(block) || inDiff(block)) continue
        let type = cardTypeFor(block)
        if (type === null && isStatementCard(block)) type = 'statement'
        if (type === null) {
          block.removeAttribute(CARD_ATTR)
          block.removeAttribute(CARD_TYPE_ATTR)
          block.removeAttribute(LEAD_ATTR)
          block.removeAttribute(TONE_ATTR)
          continue
        }
        block.setAttribute(CARD_ATTR, '1')
        block.setAttribute(CARD_TYPE_ATTR, type)
        block.removeAttribute(LEAD_ATTR)
        block.setAttribute(TONE_ATTR, type === 'risk' ? 'warn' : type === 'accept' ? 'success' : 'info')
      }

      for (const element of root.querySelectorAll('[class*="_markdown_"] p, [class*="_markdown_"] li')) {
        if (inGenui(element) || inDiff(element) || element.closest('blockquote, table')) {
          element.removeAttribute(STATUS_ATTR)
          continue
        }
        const status = statusFor((element.textContent ?? '').trimStart())
        if (status === null) element.removeAttribute(STATUS_ATTR)
        else element.setAttribute(STATUS_ATTR, status)
      }

      for (const row of root.querySelectorAll('[class*="_markdown_"] table tr')) {
        if (inGenui(row) || inDiff(row) || row.closest('thead') || row.closest(`[${SKIP_ATTR}="table"]`)) {
          row.removeAttribute(ROW_ATTR)
          continue
        }
        const status = statusFor((row.textContent ?? '').trimStart())
        if (status === null) row.removeAttribute(ROW_ATTR)
        else row.setAttribute(ROW_ATTR, status)
      }

      for (const table of root.querySelectorAll('[class*="_markdown_"] table')) {
        if (inGenui(table)) {
          table.removeAttribute(SKIP_ATTR)
          table.removeAttribute(STATUS_TABLE_ATTR)
          continue
        }
        if (inDiff(table)) {
          table.setAttribute(SKIP_ATTR, 'table')
          table.removeAttribute(STATUS_TABLE_ATTR)
          continue
        }
        table.removeAttribute(SKIP_ATTR)
        const rows = [...table.querySelectorAll('tbody tr')]
        const statusTable =
          rows.length > 0 &&
          rows.every((row) => statusFor((row.cells?.[0]?.textContent ?? '').trimStart()) !== null)
        if (statusTable) table.setAttribute(STATUS_TABLE_ATTR, '1')
        else table.removeAttribute(STATUS_TABLE_ATTR)
      }

      for (const paragraph of root.querySelectorAll('[class*="_markdown_"] p')) {
        if (inGenui(paragraph) || inDiff(paragraph) || paragraph.closest('blockquote, table')) {
          paragraph.removeAttribute(LEAD_ATTR)
          continue
        }
        if (/^表格结论/.test((paragraph.textContent ?? '').trimStart())) paragraph.setAttribute(LEAD_ATTR, 'table')
        else paragraph.removeAttribute(LEAD_ATTR)
      }

      for (const code of root.querySelectorAll('[class*="_markdown_"] .md-code-block')) {
        if (inGenui(code)) {
          code.removeAttribute(LANG_ATTR)
          code.removeAttribute(CODE_ATTR)
          code.removeAttribute(SKIP_ATTR)
          continue
        }
        if (inDiff(code) || isDiffCode(code)) {
          code.removeAttribute(LANG_ATTR)
          code.removeAttribute(CODE_ATTR)
          code.setAttribute(SKIP_ATTR, 'code')
          continue
        }
        code.removeAttribute(SKIP_ATTR)
        code.setAttribute(CODE_ATTR, '1')
        const lang = bannerLanguage(code)
        if (lang.length === 0) code.removeAttribute(LANG_ATTR)
        else code.setAttribute(LANG_ATTR, lang)
      }
    }

    /**
     * 在插件板块的插件详情页注册配置区（plugins.bundle.config，键 = 包名）。
     * 宿主不会从 Config schema 自动生成表单——配置页必须由插件自己的浏览器半侧注册；
     * 宿主 describe 未服务本命名空间（whileServed 不触发）或 primitives 缺失时不出配置页，
     * 且任何失败都不影响视觉层与消息渲染。
     */
    function setupConfigPage(child, form) {
      if (typeof require !== 'function') return
      if (typeof child?.configForms?.whileServed !== 'function') return
      if (typeof child?.slots?.inject !== 'function' || typeof child?.slots?.register !== 'function') return
      if (typeof form?.set !== 'function') return
      let jsx
      let jsxs
      let ui
      let react
      try {
        const runtime = require('react/jsx-runtime')
        jsx = runtime.jsx
        jsxs = runtime.jsxs
        react = require('react')
        ui = require('@deepseek-ai/dsh-client-ui-primitives')
        if (typeof ui?.Switch !== 'function' || typeof ui?.SegmentedControl !== 'function') return
        if (typeof react?.useState !== 'function') return
      } catch {
        // primitives 不可用（非 desktop 表层）：不出配置页。
        return
      }

      const labelStyle = { fontSize: '14px', lineHeight: '20px', color: 'var(--dsw-alias-label-primary, inherit)' }
      const hintStyle = { fontSize: '12.5px', lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary, inherit)', marginTop: '2px' }
      const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '10px 0', borderBottom: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))' }
      const noteStyle = { fontSize: '12.5px', lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary, inherit)', margin: '6px 0 2px' }
      const inputStyle = { width: '100%', boxSizing: 'border-box', border: '0.5px solid var(--dsw-alias-border-l4, rgba(127,127,127,.3))', borderRadius: '7px', background: 'var(--dsw-alias-bg-layer-3, transparent)', color: 'var(--dsw-alias-label-primary, inherit)', padding: '7px 9px', fontSize: '13px', lineHeight: '18px' }
      const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }
      const tabButtonStyle = { border: '0', background: 'transparent', color: 'var(--dsw-alias-label-secondary, inherit)', padding: '7px 2px 8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', borderBottom: '2px solid transparent' }
      const tabActiveStyle = { color: 'var(--dsw-alias-state-business-primary, #2563eb)', borderBottomColor: 'var(--dsw-alias-state-business-primary, #2563eb)' }
      const secondaryButtonStyle = { border: '0.5px solid var(--dsw-alias-border-l4, rgba(127,127,127,.3))', borderRadius: '7px', background: 'var(--dsw-alias-bg-layer-3, transparent)', color: 'var(--dsw-alias-label-primary, inherit)', padding: '6px 10px', fontSize: '12.5px', cursor: 'pointer' }
      const primaryButtonStyle = { border: '0', borderRadius: '7px', background: 'var(--dsw-alias-state-business-primary, #2563eb)', color: '#fff', padding: '6px 12px', fontSize: '12.5px', cursor: 'pointer' }

      const fieldValue = (value, spec) => {
        const raw = value?.[spec.field]
        if (raw && typeof raw.get === 'function') return raw.get()
        return raw === undefined || raw === null ? spec.fallback : raw
      }

      const renderRow = (state, setField, spec) => {
        const writable = state.writable !== false
        const control = spec.kind === 'switch'
          ? jsx(ui.Switch, {
              checked: fieldValue(state.value, spec) === true,
              disabled: !writable,
              label: spec.label,
              onChange: (next) => setField(spec.field, next === true),
            })
          : jsx(ui.SegmentedControl, {
              id: 'dsh-structured-' + spec.field,
              value: String(fieldValue(state.value, spec)),
              options: spec.options.map(([value, text]) => ({ value, label: text })),
              disabled: !writable,
              label: spec.label,
              onChange: (next) => setField(spec.field, next),
            })
        return jsxs('div', {
          style: rowStyle,
          children: [
            jsxs('div', { style: { minWidth: 0 }, children: [
              jsx('div', { style: labelStyle, children: spec.label }),
              jsx('div', { style: hintStyle, children: spec.hint }),
            ] }),
            control,
          ],
        })
      }

      const PERSONA_SCHEMA = 'dsh-structured/persona@1'
      const PERSONA_MAX = 64 * 1024
      const PERSONA_FIELDS = [
        ['meta.name', '模板名', 'text'],
        ['identity.role', '身份', 'textarea'],
        ['identity.selfReference', '自称（、分隔）', 'text'],
        ['identity.worldview', '世界观', 'textarea'],
        ['address.user', '称呼用户', 'text'],
        ['address.forbidden', '禁用称呼（、分隔）', 'text'],
        ['tone.style', '语气', 'textarea'],
        ['tone.professionalScenes', '专业场景（、分隔）', 'text'],
        ['tone.forbidden', '语气禁区（、分隔）', 'text'],
        ['habits.catchphrases', '口头禅（、分隔）', 'text'],
        ['habits.motifs', '意象（、分隔）', 'text'],
        ['habits.taboos', '禁忌（、分隔）', 'text'],
        ['closing.maxChars', '收尾字数上限', 'number'],
        ['closing.skipIn', '收尾跳过场景（、分隔）', 'text'],
        ['examples', '示例（每行一条，1–3 条）', 'textarea'],
        ['meta.author', '作者', 'text'],
        ['meta.license', '许可', 'text'],
        ['meta.source', '来源', 'text'],
        ['meta.attribution', '署名链', 'text'],
      ]

      const cloneDoc = (doc) => JSON.parse(JSON.stringify(doc))
      const emptyPersonaDoc = () => ({
        schema: PERSONA_SCHEMA,
        meta: { name: '自定义模板', author: '', license: '', official: false, source: '', attribution: '' },
        identity: { role: '', selfReference: [], worldview: '' },
        address: { user: 'Boss', forbidden: [] },
        tone: { style: '', professionalScenes: [], forbidden: [] },
        habits: { catchphrases: [], motifs: [], taboos: [] },
        closing: { enabled: false, mode: 'signature', maxChars: 20, skipIn: ['code', 'diff', 'error'] },
        examples: [],
        render: { intensity: 'standard', language: 'follow_user', audience: 'general' },
      })
      const pathParts = (path) => path.split('.')
      const getPath = (doc, path) => pathParts(path).reduce((value, key) => value?.[key], doc)
      const setPath = (doc, path, value) => {
        const next = cloneDoc(doc)
        const parts = pathParts(path)
        let cursor = next
        for (const key of parts.slice(0, -1)) {
          if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {}
          cursor = cursor[key]
        }
        cursor[parts[parts.length - 1]] = value
        return next
      }
      const asText = (value) => Array.isArray(value) ? value.join('、') : value === undefined || value === null ? '' : String(value)
      const fromText = (value) => String(value).split(/[、,]/).map((item) => item.trim()).filter(Boolean)
      const byteLength = (text) => new TextEncoder().encode(text).length
      const personaUnknownPaths = (doc) => {
        const out = []
        const known = {
          '': ['schema', 'meta', 'identity', 'address', 'tone', 'habits', 'closing', 'examples', 'render'],
          meta: ['name', 'version', 'author', 'license', 'official', 'source', 'attribution'],
          identity: ['role', 'selfReference', 'worldview'],
          address: ['user', 'forbidden'],
          tone: ['style', 'professionalScenes', 'forbidden'],
          habits: ['catchphrases', 'motifs', 'taboos'],
          closing: ['enabled', 'mode', 'maxChars', 'skipIn'],
          render: ['intensity', 'language', 'audience'],
        }
        for (const [prefix, keys] of Object.entries(known)) {
          const object = prefix === '' ? doc : doc?.[prefix]
          if (!object || typeof object !== 'object') continue
          for (const key of Object.keys(object)) if (!keys.includes(key)) out.push((prefix ? '/' + prefix : '') + '/' + key)
        }
        return out
      }
      const parsePersonaJson = (text) => {
        if (typeof text !== 'string' || text.trim() === '') return { ok: false, error: '空 JSON', pointer: '/' }
        if (byteLength(text) > PERSONA_MAX) return { ok: false, error: '超过 64KB', pointer: '/' }
        let doc
        try { doc = JSON.parse(text) } catch (error) { return { ok: false, error: 'JSON 解析失败：' + String(error.message ?? error), pointer: '/' } }
        if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return { ok: false, error: '顶层必须是对象', pointer: '/' }
        if (doc.schema !== PERSONA_SCHEMA) return { ok: false, error: 'schema 必须是 ' + PERSONA_SCHEMA, pointer: '/schema' }
        for (const field of ['name', 'author', 'license', 'source', 'attribution']) {
          if (typeof doc.meta?.[field] !== 'string' || doc.meta[field].trim() === '') return { ok: false, error: 'meta.' + field + ' 必填', pointer: '/meta/' + field }
        }
        if (doc.meta?.official !== false) return { ok: false, error: 'meta.official 必须为 false', pointer: '/meta/official' }
        for (const field of ['role']) if (typeof doc.identity?.[field] !== 'string' || doc.identity[field].trim() === '') return { ok: false, error: 'identity.' + field + ' 必填', pointer: '/identity/' + field }
        if (typeof doc.address?.user !== 'string' || doc.address.user.trim() === '') return { ok: false, error: 'address.user 必填', pointer: '/address/user' }
        if (typeof doc.tone?.style !== 'string' || doc.tone.style.trim() === '') return { ok: false, error: 'tone.style 必填', pointer: '/tone/style' }
        if (doc.render?.intensity !== undefined && doc.render.intensity !== 'standard') return { ok: false, error: 'intensity 只支持 standard', pointer: '/render/intensity' }
        if (doc.examples !== undefined && (!Array.isArray(doc.examples) || doc.examples.length < 1 || doc.examples.length > 3)) return { ok: false, error: 'examples 需要 1–3 条', pointer: '/examples' }
        return { ok: true, doc, unknownPaths: personaUnknownPaths(doc) }
      }

      const statusLabels = {
        loading: '加载中', unavailable: '不可用', readonly: '被上层配置覆盖（只读）', clean: '未修改',
        dirty: '有未保存修改', jsonEditing: 'JSON 编辑中', importParsed: '待确认导入', importInvalid: 'JSON 无效',
        saving: '保存中', saved: '已保存并启用', failed: '保存失败', tooLarge: '超过 64KB', draftOff: '草稿已关闭', off: '已关闭',
      }

      const PersonaEditor = ({ state, setField }) => {
        const initialRaw = fieldValue(state.value, { field: 'persona', fallback: PERSONA_WHALE_JSON })
        const initialParsed = parsePersonaJson(initialRaw)
        const [doc, setDoc] = react.useState(initialParsed.ok ? initialParsed.doc : emptyPersonaDoc())
        const [jsonText, setJsonText] = react.useState(initialParsed.ok ? JSON.stringify(initialParsed.doc, null, 2) : String(initialRaw ?? ''))
        const [enabled, setEnabled] = react.useState(fieldValue(state.value, { field: 'personaEnabled', fallback: false }) === true)
        const [template, setTemplate] = react.useState('whale')
        const [status, setStatus] = react.useState(initialParsed.ok ? (enabled ? 'saved' : 'off') : 'importInvalid')
        const [error, setError] = react.useState(initialParsed.ok ? '' : initialParsed.error + ' (' + initialParsed.pointer + ')')
        const [lastValid, setLastValid] = react.useState(initialParsed.ok ? initialParsed.doc : emptyPersonaDoc())
        const [pendingImport, setPendingImport] = react.useState(null)
        const readonly = state.writable === false
        const dirty = ['dirty', 'jsonEditing', 'importParsed', 'failed', 'draftOff'].includes(status)
        const bytes = byteLength(jsonText)
        const warn1200 = JSON.stringify(doc).length > 1200
        const warn4000 = JSON.stringify(doc).length > 4000
        const updateDoc = (next) => {
          setDoc(next)
          setJsonText(JSON.stringify(next, null, 2))
          setStatus('dirty')
          setError('')
        }
        const onField = (path, value) => {
          if (readonly) return
          let next = setPath(doc, path, value)
          if (path === 'closing.enabled') next = setPath(next, 'closing.mode', 'signature')
          updateDoc(next)
        }
        const onJson = (text) => {
          setJsonText(text)
          const parsed = parsePersonaJson(text)
          if (parsed.ok) {
            setDoc(parsed.doc)
            setLastValid(parsed.doc)
            setStatus('jsonEditing')
            setError(parsed.unknownPaths.length ? '未知字段：' + parsed.unknownPaths.join(', ') : '')
          } else {
            setStatus('importInvalid')
            setError(parsed.error + ' (' + parsed.pointer + ')')
          }
        }
        const confirmDirty = () => !dirty || typeof window === 'undefined' || typeof window.confirm !== 'function' || window.confirm('有未保存修改，确认丢弃？')
        const loadWhale = () => {
          if (!confirmDirty()) return
          const parsed = parsePersonaJson(PERSONA_WHALE_JSON)
          if (!parsed.ok) { setStatus('importInvalid'); setError(parsed.error); return }
          setDoc(parsed.doc); setJsonText(JSON.stringify(parsed.doc, null, 2)); setLastValid(parsed.doc); setStatus('dirty'); setError('')
        }
        const resetDefault = () => {
          if (!confirmDirty()) return
          const parsed = parsePersonaJson(PERSONA_WHALE_JSON)
          if (!parsed.ok) return
          setDoc(parsed.doc); setJsonText(JSON.stringify(parsed.doc, null, 2)); setLastValid(parsed.doc); setEnabled(false); setStatus('dirty'); setError('')
        }
        const save = async () => {
          if (readonly || status === 'importInvalid' || status === 'tooLarge') return
          const parsed = parsePersonaJson(jsonText)
          if (!parsed.ok) { setStatus('importInvalid'); setError(parsed.error + ' (' + parsed.pointer + ')'); return }
          if (parsed.unknownPaths.length && typeof window !== 'undefined' && typeof window.confirm === 'function' && !window.confirm('JSON 含未知字段，保存会原样保留：' + parsed.unknownPaths.join(', ') + '。继续？')) return
          setStatus('saving')
          try {
            const enabledResult = await setField('personaEnabled', enabled)
            if (enabledResult === false) throw new Error('personaEnabled write rejected')
            const personaResult = await setField('persona', JSON.stringify(parsed.doc, null, 2))
            if (personaResult === false) throw new Error('persona write rejected')
            setDoc(parsed.doc); setLastValid(parsed.doc); setStatus(enabled ? 'saved' : 'off'); setError('')
          } catch (saveError) {
            setStatus('failed'); setError(String(saveError.message ?? saveError))
          }
        }
        const upload = async (event) => {
          if (readonly) return
          const file = event?.target?.files?.[0]
          if (!file) return
          if (file.size > PERSONA_MAX) { setStatus('tooLarge'); setError('文件超过 64KB'); return }
          if (!confirmDirty()) return
          try {
            const text = await file.text()
            if (byteLength(text) > PERSONA_MAX) { setStatus('tooLarge'); setError('文件超过 64KB'); return }
            const parsed = parsePersonaJson(text)
            if (!parsed.ok) { setStatus('importInvalid'); setError(parsed.error + ' (' + parsed.pointer + ')'); return }
            setPendingImport(parsed.doc)
            setStatus('importParsed')
            setError(parsed.unknownPaths.length ? '未知字段：' + parsed.unknownPaths.join(', ') : '')
          } catch (readError) { setStatus('importInvalid'); setError(String(readError.message ?? readError)) }
        }
        const applyImport = () => {
          if (!pendingImport) return
          setDoc(pendingImport); setJsonText(JSON.stringify(pendingImport, null, 2)); setLastValid(pendingImport); setPendingImport(null); setStatus('dirty')
        }
        const restoreLast = () => { setDoc(lastValid); setJsonText(JSON.stringify(lastValid, null, 2)); setStatus('dirty'); setError('') }
        const formatJson = () => {
          const parsed = parsePersonaJson(jsonText)
          if (parsed.ok) { setDoc(parsed.doc); setJsonText(JSON.stringify(parsed.doc, null, 2)); setStatus('dirty'); setError('') }
          else { setStatus('importInvalid'); setError(parsed.error + ' (' + parsed.pointer + ')') }
        }
        const download = () => {
          try {
            const blob = new Blob([jsonText], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const anchor = document.createElement('a')
            anchor.href = url; anchor.download = 'dsh-structured-persona.json'; anchor.click()
            setTimeout(() => URL.revokeObjectURL(url), 0)
          } catch (downloadError) { setError(String(downloadError.message ?? downloadError)) }
        }
        const row = (path, label, kind) => {
          const value = getPath(doc, path)
          const text = kind === 'textarea' && path === 'examples' ? (value ?? []).join('\n') : asText(value)
          const common = { disabled: readonly, style: inputStyle }
          const control = kind === 'textarea'
            ? jsx('textarea', { ...common, rows: path === 'examples' ? 3 : 2, value: text, onChange: (event) => onField(path, path === 'examples' ? event.target.value.split('\n').filter(Boolean) : event.target.value) })
            : jsx('input', { ...common, type: kind === 'number' ? 'number' : 'text', min: kind === 'number' ? 10 : undefined, max: kind === 'number' ? 40 : undefined, value: text, onChange: (event) => onField(path, kind === 'number' ? Number(event.target.value) : path.endsWith('skipIn') || path.endsWith('forbidden') || path.endsWith('professionalScenes') || path.endsWith('catchphrases') || path.endsWith('motifs') || path.endsWith('taboos') || path.endsWith('selfReference') ? fromText(event.target.value) : event.target.value) })
          return jsxs('label', { style: fieldStyle, children: [jsx('span', { style: labelStyle, children: label }), control] })
        }
        const tabButton = (id, label) => jsx('button', {
          type: 'button', role: 'tab', 'aria-selected': status === id, disabled: readonly,
          onClick: () => { if (status !== id && confirmDirty()) setStatus(id) },
          style: { ...tabButtonStyle, ...(status === id ? tabActiveStyle : {}) }, children: label,
        })
        return jsxs('div', { 'data-dsh-persona': '1', style: { display: 'flex', flexDirection: 'column', gap: '14px' }, children: [
          jsxs('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }, children: [
            jsx('div', { style: labelStyle, children: '启用表达风格' }),
            jsx(ui.Switch, { checked: enabled, disabled: readonly, label: '启用表达风格', onChange: (next) => { setEnabled(next); setStatus(next ? 'dirty' : 'draftOff') } }),
          ] }),
          jsxs('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }, children: [
            jsx('select', { disabled: readonly, value: template, onChange: (event) => setTemplate(event.target.value), style: { ...inputStyle, width: '180px' }, children: [jsx('option', { value: 'whale', children: '鲸鱼娘（示例）' }), jsx('option', { value: 'custom', children: '自定义' })] }),
            jsx('button', { type: 'button', disabled: readonly, onClick: loadWhale, style: secondaryButtonStyle, children: '载入基础模板' }),
            jsx('span', { style: noteStyle, children: '非官方 · 社区二创 · 不打包美术' }),
          ] }),
          jsxs('div', { role: 'tablist', style: { display: 'flex', gap: '6px' }, children: [tabButton('dirty', '表单'), tabButton('jsonEditing', 'JSON')] }),
          status === 'jsonEditing' || (status === 'importInvalid' && jsonText) ? jsxs('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, children: [
            jsx('textarea', { value: jsonText, disabled: readonly, onChange: (event) => onJson(event.target.value), spellCheck: false, style: { ...inputStyle, minHeight: '360px', fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: '12px', whiteSpace: 'pre' } }),
            jsxs('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' }, children: [
              jsx('button', { type: 'button', disabled: readonly, onClick: formatJson, style: secondaryButtonStyle, children: '格式化' }),
              jsx('button', { type: 'button', disabled: readonly, onClick: () => { const parsed = parsePersonaJson(jsonText); if (!parsed.ok) { setStatus('importInvalid'); setError(parsed.error); } else { setStatus('dirty'); setError('') } }, style: secondaryButtonStyle, children: '校验' }),
              jsx('label', { style: { ...secondaryButtonStyle, display: 'inline-block' }, children: ['上传 JSON', jsx('input', { type: 'file', accept: 'application/json,.json', disabled: readonly, onChange: upload, style: { display: 'none' } })] }),
              jsx('button', { type: 'button', onClick: download, style: secondaryButtonStyle, children: '下载' }),
              pendingImport ? jsx('button', { type: 'button', disabled: readonly, onClick: applyImport, style: primaryButtonStyle, children: '应用导入' }) : null,
            ] }),
            error ? jsx('p', { style: { color: 'var(--dsw-alias-state-error-primary, #b91c1c)', fontSize: '12px', margin: 0 }, children: error }) : null,
          ] }) : jsxs('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: '10px 16px' }, children: [
            ...PERSONA_FIELDS.map(([path, label, kind]) => row(path, label, kind)),
            jsxs('label', { style: fieldStyle, children: [
              jsx('span', { style: labelStyle, children: '强度' }),
              jsx('select', { disabled: readonly, value: doc.render?.intensity ?? 'standard', onChange: (event) => onField('render.intensity', event.target.value), style: inputStyle, children: [jsx('option', { value: 'standard', children: 'standard' })] }),
            ] }),
            jsxs('label', { style: fieldStyle, children: [
              jsx('span', { style: labelStyle, children: '语言' }),
              jsx('select', { disabled: readonly, value: doc.render?.language ?? 'follow_user', onChange: (event) => onField('render.language', event.target.value), style: inputStyle, children: [['follow_user', '跟随用户'], ['zh-CN', '中文'], ['en', 'English']].map(([value, text]) => jsx('option', { value, children: text })) }),
            ] }),
            jsxs('label', { style: fieldStyle, children: [
              jsx('span', { style: labelStyle, children: '受众' }),
              jsx('select', { disabled: readonly, value: doc.render?.audience ?? 'general', onChange: (event) => onField('render.audience', event.target.value), style: inputStyle, children: [['general', '通用'], ['developer', '开发者'], ['external', '外部']].map(([value, text]) => jsx('option', { value, children: text })) }),
            ] }),
            jsxs('label', { style: fieldStyle, children: [
              jsx('span', { style: labelStyle, children: '收尾签名' }),
              jsx(ui.Switch, { checked: doc.closing?.enabled === true, disabled: readonly, label: '收尾签名', onChange: (next) => onField('closing.enabled', next) }),
            ] }),
          ] }),
          jsxs('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }, children: [
            jsx('span', { style: { ...noteStyle, color: status === 'importInvalid' || status === 'tooLarge' ? 'var(--dsw-alias-state-error-primary, #b91c1c)' : 'var(--dsw-alias-label-tertiary, inherit)' }, children: (statusLabels[status] ?? status) + (bytes ? ' · ' + bytes + ' B / 64KB' : '') + (warn1200 ? ' · 超过 1200 字符建议' : '') + (warn4000 ? ' · 超过 4000 字符强警告' : '') }),
            jsxs('div', { style: { display: 'flex', gap: '8px' }, children: [
              jsx('button', { type: 'button', disabled: readonly, onClick: resetDefault, style: secondaryButtonStyle, children: '恢复默认' }),
              jsx('button', { type: 'button', disabled: readonly || status === 'importInvalid' || status === 'tooLarge', onClick: save, style: primaryButtonStyle, children: '保存' }),
            ] }),
          ] }),
          jsx('p', { style: noteStyle, children: '保存到当前 profile；不写日志、不上传。示例只作风格参考，不是实时输出。' }),
        ] })
      }


      personaTestApi = { parsePersonaJson, emptyPersonaDoc, setPath, byteLength, statusLabels }

      const StructuredConfigCard = (props) => {
        if (props.view !== undefined && props.view !== 'page') return null
        const read = props.useStructuredConfig ?? props.structuredConfig
        const state = typeof read === 'function' ? read((snapshot) => snapshot) : null
        if (!state || state.status !== 'ready' || typeof state.value !== 'object' || state.value === null) {
          return jsx('p', { style: noteStyle, children: '插件未加载或配置暂不可用。' })
        }
        const setField = typeof props.setField === 'function' ? props.setField : () => {}
        const [tab, setTab] = react.useState('structured')
        const tabs = [
          ['structured', '结构化输出'],
          ['persona', '表达风格（Persona）'],
        ]
        return jsxs('div', {
          'data-dsh-structured-config': '1',
          children: [
            state.writable === false
              ? jsx('p', { style: noteStyle, children: '当前配置被更高层覆盖（home patch / CLI overlay），此处只读。' })
              : null,
            jsx('div', { role: 'tablist', style: { display: 'flex', gap: '18px', borderBottom: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', marginBottom: '12px' }, children: tabs.map(([id, label]) => jsx('button', {
              type: 'button',
              role: 'tab',
              'aria-selected': tab === id,
              onClick: () => setTab(id),
              style: { ...tabButtonStyle, ...(tab === id ? tabActiveStyle : {}) },
              children: label,
            })) }),
            tab === 'structured'
              ? jsxs('div', { children: [
                  jsx('div', { children: CONFIG_FIELDS.map((spec) => renderRow(state, setField, spec)) }),
                  jsx('p', { style: noteStyle, children: '会话级开关请用 /structured on | off（按会话生效，不写入这里）。' }),
                ] })
              : jsx(PersonaEditor, { state, setField }),
          ],
        })
      }

      child.effect?.(
        () =>
          child.configForms.whileServed([CONFIG_NS], () => {
            // 样式与 slot 注册同生命周期：命名空间不被服务时一并撤下。
            const removeStyle = ensureConfigStyle()
            const offSlot = child.slots.inject(BUNDLE_CONFIG_SLOT, () =>
              child.slots.register({
                name: BUNDLE_CONFIG_SLOT,
                key: 'dsh-structured',
                inject: () => ({
                  hooks: { structuredConfig: form },
                  setField: (field, value) => {
                    try {
                      return form.set(field, value)
                    } catch (error) {
                      return Promise.reject(error)
                    }
                  },
                }),
              }, StructuredConfigCard),
            )
            return () => {
              try {
                offSlot?.()
              } catch {
                // slot 撤销失败交由宿主清理。
              }
              removeStyle()
            }
          }),
        'dsh-structured: bundle config page',
      )
    }

    let active = false
    let disposeLayer = null
    let currentTheme = 'deepseek'

    const applyTheme = (theme) => {
      const safe = THEMES.includes(theme) ? theme : 'deepseek'
      currentTheme = safe
      if (typeof document === 'undefined') return
      document.body?.setAttribute(THEME_ATTR, safe)
    }

    const enable = () => {
      if (active) return
      if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return
      if (document.body === null) return
      active = true

      document.getElementById(LEGACY_STYLE_ID)?.remove()
      document.getElementById(STYLE_ID)?.remove()
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = CSS
      document.head.appendChild(style)
      document.documentElement.setAttribute(ROOT_ATTR, 'active')
      document.body.setAttribute(THEME_ATTR, currentTheme)
      try {
        console.info('[dsh-structured] visual layer active')
      } catch {
        // console 不可用时忽略。
      }

      let disposed = false
      let scheduled = false
      let pending = null
      let pendingRoots = null

      // 增量扫描：mutation 只重扫它所在的 markdown 容器（或新增子树），
      // 避免长会话里每帧对整页做一次全量 querySelectorAll（O(N²)）。
      const markRoot = (node) => {
        if (!node) return
        const element = node.nodeType === 1 ? node : node.parentElement
        if (!element) return
        const markdown = element.closest?.('[class*="_markdown_"]')
        const root = markdown ?? element
        if (pendingRoots === null) pendingRoots = new Set()
        pendingRoots.add(root)
      }
      const run = () => {
        if (disposed) return
        scheduled = false
        pending = null
        const roots = pendingRoots
        pendingRoots = null
        if (roots === null) {
          decorate(document)
          return
        }
        const list = [...roots]
        for (const root of list) {
          if (root?.isConnected === false) continue
          // 被另一个待扫根包含时跳过，避免重复工作。
          if (list.some((other) => other !== root && other.contains?.(root))) continue
          decorate(root)
        }
      }
      const schedule = () => {
        if (disposed || scheduled) return
        scheduled = true
        if (typeof requestAnimationFrame === 'function') pending = requestAnimationFrame(run)
        else pending = setTimeout(run, 16)
      }
      const observer = new MutationObserver((records) => {
        try {
          for (const record of records) {
            if (record.type === 'childList') {
              for (const node of record.addedNodes) markRoot(node)
              if (record.addedNodes.length === 0) markRoot(record.target)
            } else {
              markRoot(record.target)
            }
          }
        } catch {
          // 记录结构异常时退回整页扫描，保证装饰不丢。
          pendingRoots = null
        }
        schedule()
      })
      observer.observe(document.body, { childList: true, subtree: true, characterData: true })
      run()

      disposeLayer = () => {
        if (disposed) return
        disposed = true
        active = false
        disposeLayer = null
        observer.disconnect()
        if (pending !== null) {
          if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(pending)
          else clearTimeout(pending)
        }
        style.remove()
        document.documentElement.removeAttribute(ROOT_ATTR)
        document.body?.removeAttribute(THEME_ATTR)
        for (const attr of [CARD_ATTR, CARD_TYPE_ATTR, ICON_ATTR, TONE_ATTR, LANG_ATTR, CODE_ATTR, SKIP_ATTR, STATUS_ATTR, STATUS_TABLE_ATTR, LEAD_ATTR, ROW_ATTR]) {
          for (const element of document.querySelectorAll('[' + attr + ']')) element.removeAttribute(attr)
        }
        try {
          console.info('[dsh-structured] visual layer disposed')
        } catch {
          // console 不可用时忽略。
        }
      }
    }

    const disable = () => {
      const layer = disposeLayer
      disposeLayer = null
      if (typeof layer === 'function') layer()
      if (typeof document === 'undefined') return
      document.getElementById(STYLE_ID)?.remove()
      document.documentElement.removeAttribute(ROOT_ATTR)
      document.body?.removeAttribute(THEME_ATTR)
      for (const attr of [CARD_ATTR, CARD_TYPE_ATTR, ICON_ATTR, TONE_ATTR, LANG_ATTR, CODE_ATTR, SKIP_ATTR, STATUS_ATTR, STATUS_TABLE_ATTR, LEAD_ATTR, ROW_ATTR]) {
        for (const element of document.querySelectorAll('[' + attr + ']')) element.removeAttribute(attr)
      }
    }

    const applyVisual = (on) => {
      if (on) enable()
      else disable()
    }

    return {
      inject: [],
      __test: { inDiff, isDiffCode, decorate, setupConfigPage, personaApi: () => personaTestApi },
      apply(ctx) {
        // 默认主题/视觉先启用；随后由 profile Config 的 theme/visual 覆盖。
        enable()
        try {
          ctx?.inject?.(['configForms'], (child) => {
            try {
              const form = child.configForms?.get('dsh-structured')
              if (!form || typeof form.getSnapshot !== 'function') return
              const readValue = (value) => (value && typeof value.get === 'function' ? value.get() : value)
              const read = () => {
                try {
                  const value = form.getSnapshot()?.value ?? {}
                  applyTheme(readValue(value.theme))
                  applyVisual(readValue(value.visual) !== false)
                } catch {
                  // 读取失败时保持当前状态，不打断回复。
                }
              }
              read()
              if (typeof form.subscribe === 'function') {
                child.effect?.(() => form.subscribe(read), 'dsh-structured: theme/visual preferences')
              }
            } catch {
              // configForms 不可用时保持默认开启。
            }
          })
        } catch {
          // 无 ctx.inject 的宿主保持默认开启。
        }
        try {
          // 插件详情页配置区与视觉层分开注入：配置页失败不影响主题/视觉联动。
          ctx?.inject?.(['configForms', 'slots'], (child) => {
            try {
              const form = child.configForms?.get('dsh-structured')
              if (form) setupConfigPage(child, form)
            } catch {
              // 配置页不可用不影响视觉层与注入。
            }
          })
        } catch {
          // 无 ctx.inject 的宿主没有配置页，视觉层照常。
        }
        try {
          ctx?.effect?.(() => disable, 'dsh-structured: visual layer')
        } catch {
          // 没有 effect 释放器时，视觉层保持到页面卸载。
        }
        return disable
      },
    }
  },
})
