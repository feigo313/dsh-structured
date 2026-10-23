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
  factory() {
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
  --ds-border:#E5E0D5;--ds-accent:#CC785C;--ds-accent-text:#A14A2E;--ds-success:#266B4D;--ds-warn:#92400E;--ds-error:#8C1D18;
  --ds-code-bg:#F5F1E8;--ds-code-text:#141413;
}
body[data-ds-dark-theme][data-dsh-structured-theme="anthropic"] [class*="_markdown_"]{
  --ds-surface:#1F1E1D;--ds-surface-2:#2A2825;--ds-text:#F5F1E8;--ds-muted:#A8A29A;
  --ds-border:#3A3733;--ds-accent:#E8A087;--ds-accent-text:#E8A087;--ds-success:#6FBF9A;--ds-warn:#E0A458;--ds-error:#F28B82;
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
[class*="_markdown_"] h4{font-size:15px;font-weight:650;margin:16px 0 6px}
[class*="_markdown_"] h5,[class*="_markdown_"] h6{font-size:13px;font-weight:700;margin:14px 0 6px;color:var(--ds-muted);text-transform:uppercase;letter-spacing:.06em}
[class*="_markdown_"] h2[${ICON_ATTR}]::before,
[class*="_markdown_"] h3[${ICON_ATTR}]::before{
  content:attr(${ICON_ATTR});
  display:inline-flex;align-items:center;justify-content:center;
  width:22px;height:22px;margin-right:8px;border-radius:6px;
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
  width:100%;margin:18px 0;border-collapse:separate;border-spacing:0;
  border:1px solid var(--ds-border);border-radius:12px;overflow:hidden;font-size:13.5px;
  box-shadow:0 1px 2px rgba(0,0,0,.03);
}
[class*="_markdown_"] table:not([${SKIP_ATTR}]) thead th{
  background:var(--ds-surface-2);
  font-size:11px!important;letter-spacing:.07em!important;color:var(--ds-muted);
  font-weight:700!important;text-align:left;padding:12px 18px!important;
  border-bottom:1px solid var(--ds-border);
}
[class*="_markdown_"] table:not([${SKIP_ATTR}]) tbody td{
  padding:13px 18px!important;line-height:1.55;vertical-align:middle;border-left:0;border-right:0;
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
  width:68px;text-align:center;padding:7px 8px!important;font-size:11px;font-weight:700;
  white-space:nowrap;vertical-align:middle;border-radius:7px;
}
[class*="_markdown_"] table:not([${SKIP_ATTR}])[${STATUS_TABLE_ATTR}] tbody tr[${ROW_ATTR}="success"] td:first-child{background:color-mix(in srgb,var(--ds-success) 12%,transparent);color:var(--ds-success)}
[class*="_markdown_"] table:not([${SKIP_ATTR}])[${STATUS_TABLE_ATTR}] tbody tr[${ROW_ATTR}="warn"] td:first-child{background:color-mix(in srgb,var(--ds-warn) 12%,transparent);color:var(--ds-warn)}
[class*="_markdown_"] table:not([${SKIP_ATTR}])[${STATUS_TABLE_ATTR}] tbody tr[${ROW_ATTR}="error"] td:first-child{background:color-mix(in srgb,var(--ds-error) 12%,transparent);color:var(--ds-error)}
[class*="_markdown_"] p[${LEAD_ATTR}="table"]{
  border-left:2px solid var(--ds-accent);padding-left:10px;margin:10px 0 8px;
  font-size:14px;color:var(--ds-text);
}
[class*="_markdown_"] p[${LEAD_ATTR}="table"] strong{color:var(--ds-accent-text)}
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
  border:1px solid color-mix(in srgb,var(--ds-accent) 16%,var(--ds-border));
  border-left:3px solid var(--ds-accent);
  border-radius:12px;padding:14px 16px 15px;
  background:linear-gradient(135deg,color-mix(in srgb,var(--ds-accent) 6%,var(--ds-surface)),var(--ds-surface) 60%);
  box-shadow:0 1px 2px rgba(0,0,0,.04),0 12px 32px -24px color-mix(in srgb,var(--ds-accent) 32%,transparent);
}
[class*="_markdown_"] blockquote[${CARD_ATTR}="1"]>p:first-child>strong:first-child{
  display:flex;align-items:center;gap:9px;position:relative;
  font-size:13px;line-height:1.1;letter-spacing:.06em;text-transform:uppercase;
  color:var(--ds-accent-text);margin-bottom:8px;
}
[class*="_markdown_"] blockquote[${CARD_ATTR}="1"]>p:first-child>strong:first-child::before{
  content:"";display:inline-flex;flex:none;
  width:26px;height:26px;border-radius:7px;
  background:color-mix(in srgb,var(--ds-accent) 12%,transparent);
}
[class*="_markdown_"] blockquote[${CARD_ATTR}="1"]>p:first-child>strong:first-child::after{
  content:"";position:absolute;left:5.5px;top:5.5px;width:15px;height:15px;
  background-color:var(--ds-accent);
  -webkit-mask:var(--ds-card-icon) center/contain no-repeat;
  mask:var(--ds-card-icon) center/contain no-repeat;
}
[class*="_markdown_"] blockquote[${CARD_ATTR}="1"]>p:nth-child(2)>strong:first-child{
  display:block;font-size:16px;font-weight:700;line-height:1.45;
  letter-spacing:-.01em;color:var(--ds-text);margin-bottom:4px;
}
[class*="_markdown_"] blockquote[${CARD_ATTR}="1"]>p{font-size:15.5px;line-height:1.7;font-weight:450;color:var(--ds-text)}
[class*="_markdown_"] blockquote[${CARD_ATTR}="1"]>p strong{font-weight:700;color:var(--ds-text)}
[class*="_markdown_"] blockquote[${TONE_ATTR}]>p:first-child>strong:first-child{color:var(--ds-accent-text)}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="conclusion"]{
  --ds-card-icon:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 3l9 9-9 9-9-9 9-9z' fill='none' stroke='black' stroke-width='1.8' stroke-linejoin='round'/%3E%3C/svg%3E");
}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="decision"]{
  --ds-card-icon:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M4 7h6l4 10h6M4 17h6l4-10h6' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="metric"]{
  --ds-card-icon:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M5 20V10M12 20V4M19 20v-7' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round'/%3E%3C/svg%3E");
}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="risk"]{
  --ds-accent:var(--ds-warn);--ds-accent-text:var(--ds-warn);
  --ds-card-icon:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 4l9 16H3L12 4z' fill='none' stroke='black' stroke-width='1.8' stroke-linejoin='round'/%3E%3Cpath d='M12 10v4M12 17v.5' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round'/%3E%3C/svg%3E");
}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="next"]{
  --ds-card-icon:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M5 12h14M13 6l6 6-6 6' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="accept"]{
  --ds-accent:var(--ds-success);--ds-accent-text:var(--ds-success);
  --ds-card-icon:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M4 12.5l5 5L20 6.5' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="key"]{
  --ds-card-icon:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 3l2.6 6.2 6.7.5-5.1 4.4 1.6 6.5L12 17.3 6.2 20.6l1.6-6.5L2.7 9.7l6.7-.5L12 3z' fill='none' stroke='black' stroke-width='1.6' stroke-linejoin='round'/%3E%3C/svg%3E");
}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="statement"]{
  --ds-card-icon:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 3l9 9-9 9-9-9 9-9z' fill='none' stroke='black' stroke-width='1.8' stroke-linejoin='round'/%3E%3C/svg%3E");
}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="statement"]>p:first-child>strong:first-child{
  font-size:16px;line-height:1.45;letter-spacing:-.01em;text-transform:none;
  color:var(--ds-text);margin-bottom:4px;
}
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
      const run = () => {
        if (disposed) return
        scheduled = false
        pending = null
        decorate(document)
      }
      const schedule = () => {
        if (disposed || scheduled) return
        scheduled = true
        if (typeof requestAnimationFrame === 'function') pending = requestAnimationFrame(run)
        else pending = setTimeout(run, 16)
      }
      const observer = new MutationObserver(schedule)
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
      __test: { inDiff, isDiffCode, decorate },
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
          ctx?.effect?.(() => disable, 'dsh-structured: visual layer')
        } catch {
          // 没有 effect 释放器时，视觉层保持到页面卸载。
        }
        return disable
      },
    }
  },
})
