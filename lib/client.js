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
  factory() {
    const CARD_ATTR = 'data-dsh-structured-card'
    const CARD_TYPE_ATTR = 'data-dsh-structured-card-type'
    const ICON_ATTR = 'data-dsh-structured-icon'
    const TONE_ATTR = 'data-dsh-structured-tone'
    const LANG_ATTR = 'data-dsh-structured-lang'
    const STATUS_ATTR = 'data-dsh-structured-status'
    const STATUS_TABLE_ATTR = 'data-dsh-structured-status-table'
    const LEAD_ATTR = 'data-dsh-structured-lead'
    const ROW_ATTR = 'data-dsh-structured-row'
    const ROOT_ATTR = 'data-dsh-structured'
    const STYLE_ID = 'dsh-structured-skin-style'
    const LEGACY_STYLE_ID = 'dsh-structured-card-style'

    const CARD_TYPES = [
      [/^结论|^总结|^答案/, 'conclusion'],
      [/^判断|^决策/, 'decision'],
      [/^指标|^数据/, 'metric'],
      [/^风险|^注意|^警告/, 'risk'],
      [/^下一步|^行动|^待办/, 'next'],
      [/^验收|^通过|^完成/, 'accept'],
      [/^重点|^关键/, 'key'],
    ]
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
    const TONES = [
      [/风险|注意|警告|坑/, 'warn'],
      [/验收|通过|成功/, 'success'],
      [/重点|关键|核心/, 'info'],
      [/下一步|行动|待办/, 'info'],
      [/结论|判断|答案/, 'info'],
    ]

    const CSS = `
[class*="_markdown_"]{
  --ds-accent:#2563eb;
  --ds-text:var(--dsw-alias-label-primary,#111827);
  --ds-muted:var(--dsw-alias-label-secondary,#6b7280);
  --ds-border:var(--dsw-alias-border-l2,rgba(127,127,127,.22));
  --ds-surface:var(--dsw-alias-bg-layer-1,#fff);
  --ds-surface-2:var(--dsw-alias-bg-layer-2,rgba(127,127,127,.06));
  font-size:15px;line-height:1.72;letter-spacing:.01em;
}
[data-theme="dark"] [class*="_markdown_"]{--ds-accent:#60a5fa}
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
  color:var(--ds-accent);font-size:12px;font-weight:700;vertical-align:2px;
}
[class*="_markdown_"] strong{font-weight:700;color:var(--ds-text)}
[class*="_markdown_"] a{color:var(--ds-accent);text-decoration:none;border-bottom:1px solid color-mix(in srgb,var(--ds-accent) 38%,transparent)}
[class*="_markdown_"] a:hover{border-bottom-color:var(--ds-accent)}
[class*="_markdown_"] ul,[class*="_markdown_"] ol{padding-left:1.5em;margin:.6em 0}
[class*="_markdown_"] li{margin:.28em 0}
[class*="_markdown_"] li::marker{color:var(--ds-accent)}
[class*="_markdown_"] hr{height:1px;border:0;margin:28px 0;background:linear-gradient(90deg,transparent,var(--ds-border),transparent)}
[class*="_markdown_"] table{
  width:100%;margin:18px 0;border-collapse:separate;border-spacing:0;
  border:1px solid var(--ds-border);border-radius:12px;overflow:hidden;font-size:13.5px;
  box-shadow:0 1px 2px rgba(0,0,0,.03);
}
[class*="_markdown_"] thead th{
  background:var(--ds-surface-2);
  font-size:11px!important;letter-spacing:.07em!important;color:var(--ds-muted);
  font-weight:700!important;text-align:left;padding:12px 18px!important;
  border-bottom:1px solid var(--ds-border);
}
[class*="_markdown_"] tbody td{
  padding:13px 18px!important;line-height:1.55;vertical-align:middle;border-left:0;border-right:0;
  border-bottom:1px solid color-mix(in srgb,var(--ds-border) 55%,transparent);
  word-break:break-word;
}
[class*="_markdown_"] tbody tr:nth-child(even){background:color-mix(in srgb,var(--ds-surface-2) 45%,transparent)}
[class*="_markdown_"] tbody tr:hover{background:color-mix(in srgb,var(--ds-accent) 5%,transparent)}
[class*="_markdown_"] tbody tr:last-child td{border-bottom:0}
[class*="_markdown_"] table:has(thead th:nth-child(2):last-child) th:first-child,
[class*="_markdown_"] table:has(thead th:nth-child(2):last-child) td:first-child{width:30%}
[class*="_markdown_"] table:not([${STATUS_TABLE_ATTR}]):has(thead th:nth-child(3):last-child) th:first-child,
[class*="_markdown_"] table:not([${STATUS_TABLE_ATTR}]):has(thead th:nth-child(3):last-child) td:first-child{width:24%}
[class*="_markdown_"] table:not([${STATUS_TABLE_ATTR}]):has(thead th:nth-child(3):last-child) th:nth-child(2),
[class*="_markdown_"] table:not([${STATUS_TABLE_ATTR}]):has(thead th:nth-child(3):last-child) td:nth-child(2){width:22%}
[class*="_markdown_"] table[${STATUS_TABLE_ATTR}] th:first-child,
[class*="_markdown_"] table[${STATUS_TABLE_ATTR}] td:first-child{
  width:68px;text-align:center;padding:7px 8px!important;font-size:11px;font-weight:700;
  white-space:nowrap;vertical-align:middle;border-radius:7px;
}
[class*="_markdown_"] table[${STATUS_TABLE_ATTR}] tbody tr[${ROW_ATTR}="success"] td:first-child{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#16a34a) 12%,transparent);color:var(--dsw-alias-state-success-primary,#16a34a)}
[class*="_markdown_"] table[${STATUS_TABLE_ATTR}] tbody tr[${ROW_ATTR}="warn"] td:first-child{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d97706) 12%,transparent);color:var(--dsw-alias-state-warn-primary,#d97706)}
[class*="_markdown_"] table[${STATUS_TABLE_ATTR}] tbody tr[${ROW_ATTR}="error"] td:first-child{background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#dc2626) 12%,transparent);color:var(--dsw-alias-state-error-primary,#dc2626)}
[class*="_markdown_"] p[${LEAD_ATTR}="table"]{
  border-left:2px solid var(--ds-accent);padding-left:10px;margin:10px 0 8px;
  font-size:14px;color:var(--ds-text);
}
[class*="_markdown_"] p[${LEAD_ATTR}="table"] strong{color:var(--ds-accent)}
[class*="_markdown_"] h2+table,[class*="_markdown_"] h2+p,[class*="_markdown_"] h3+table,[class*="_markdown_"] h3+p{margin-top:8px}
[class*="_markdown_"] :not(pre)>code{
  background:var(--ds-surface-2);border:1px solid var(--ds-border);border-radius:6px;
  padding:.12em .38em;font-size:.9em;color:var(--ds-accent);overflow-wrap:anywhere;
}
[class*="_markdown_"] .md-code-block{
  margin:16px 0;border:1px solid var(--ds-border);border-radius:12px;overflow:hidden;
  background:var(--ds-surface-2);box-shadow:0 1px 2px rgba(0,0,0,.04);
}
[class*="_markdown_"] .md-code-block > [class*="_bannerWrap"]{
  margin:0;padding:0;border:0;background:none;
}
[class*="_markdown_"] .md-code-block [data-code-block-banner]{
  display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0;border-radius:0;
  padding:6px 12px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
  color:var(--ds-muted);border-bottom:1px solid var(--ds-border);
  background:linear-gradient(90deg,color-mix(in srgb,var(--ds-code-accent,var(--ds-accent)) 14%,transparent),transparent 72%);
}
[class*="_markdown_"] .md-code-block [data-code-block-banner] > [class*="_heading"]{
  flex:1;min-width:0;justify-content:flex-start;text-align:left;
}
[class*="_markdown_"] .md-code-block [data-code-block-banner] > [class*="_actions"]{
  margin-left:auto;flex:none;
}
[class*="_markdown_"] .md-code-block > [data-code-block-content]{padding:0}
[class*="_markdown_"] .md-code-block [data-code-block-banner]::before{
  content:"";width:8px;height:8px;border-radius:50%;flex:none;
  background:var(--ds-code-accent,var(--ds-accent));
  box-shadow:0 0 0 3px color-mix(in srgb,var(--ds-code-accent,var(--ds-accent)) 18%,transparent);
}
[class*="_markdown_"] .md-code-block pre{margin:0;padding:14px 16px;font-size:13px;line-height:1.65;overflow:auto}
[class*="_markdown_"] .md-code-block[data-dsh-structured-lang="js"]{--ds-code-accent:#eab308}
[class*="_markdown_"] .md-code-block[data-dsh-structured-lang="ts"],
[class*="_markdown_"] .md-code-block[data-dsh-structured-lang="tsx"]{--ds-code-accent:#3b82f6}
[class*="_markdown_"] .md-code-block[data-dsh-structured-lang="py"],
[class*="_markdown_"] .md-code-block[data-dsh-structured-lang="python"]{--ds-code-accent:#22c55e}
[class*="_markdown_"] .md-code-block[data-dsh-structured-lang="bash"],
[class*="_markdown_"] .md-code-block[data-dsh-structured-lang="sh"],
[class*="_markdown_"] .md-code-block[data-dsh-structured-lang="powershell"]{--ds-code-accent:#14b8a6}
[class*="_markdown_"] .md-code-block[data-dsh-structured-lang="json"]{--ds-code-accent:#a855f7}
[class*="_markdown_"] .md-code-block[data-dsh-structured-lang="html"],
[class*="_markdown_"] .md-code-block[data-dsh-structured-lang="css"]{--ds-code-accent:#f97316}
[class*="_markdown_"] .md-code-block[data-dsh-structured-lang="sql"]{--ds-code-accent:#06b6d4}
[class*="_markdown_"] blockquote{
  margin:14px 0;padding:10px 14px;border-left:3px solid var(--ds-accent);
  background:color-mix(in srgb,var(--ds-accent) 6%,transparent);border-radius:0 10px 10px 0;
}
[class*="_markdown_"] blockquote[${LEAD_ATTR}="lead"]{
  position:relative;border-left:4px solid var(--ds-accent);border-radius:12px;
  padding:14px 16px 14px 38px;
  background:linear-gradient(135deg,color-mix(in srgb,var(--ds-accent) 7%,var(--ds-surface)),var(--ds-surface) 62%);
  box-shadow:0 1px 2px rgba(0,0,0,.04),0 12px 32px -24px color-mix(in srgb,var(--ds-accent) 32%,transparent);
}
[class*="_markdown_"] blockquote[${LEAD_ATTR}="lead"]::before{
  content:"◆";position:absolute;left:14px;top:15px;
  color:var(--ds-accent);font-size:13px;line-height:1;
}
[class*="_markdown_"] blockquote[${LEAD_ATTR}="lead"]>p:first-child{
  margin-top:0;font-size:16.5px;line-height:1.6;font-weight:600;color:var(--ds-text);
}
[class*="_markdown_"] blockquote[${TONE_ATTR}="warn"]{--ds-accent:var(--dsw-alias-state-warn-primary,#d97706)}
[class*="_markdown_"] blockquote[${TONE_ATTR}="success"]{--ds-accent:var(--dsw-alias-state-success-primary,#16a34a)}
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
  color:var(--ds-accent);margin-bottom:8px;
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
[class*="_markdown_"] blockquote[${TONE_ATTR}]>p:first-child>strong:first-child{color:var(--ds-accent)}
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
  --ds-accent:var(--dsw-alias-state-warn-primary,#d97706);
  --ds-card-icon:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 4l9 16H3L12 4z' fill='none' stroke='black' stroke-width='1.8' stroke-linejoin='round'/%3E%3Cpath d='M12 10v4M12 17v.5' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round'/%3E%3C/svg%3E");
}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="next"]{
  --ds-card-icon:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M5 12h14M13 6l6 6-6 6' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
[class*="_markdown_"] blockquote[${CARD_TYPE_ATTR}="accept"]{
  --ds-accent:var(--dsw-alias-state-success-primary,#16a34a);
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
[class*="_markdown_"] p[${STATUS_ATTR}="success"],[class*="_markdown_"] li[${STATUS_ATTR}="success"]{--ds-accent:var(--dsw-alias-state-success-primary,#16a34a)}
[class*="_markdown_"] p[${STATUS_ATTR}="warn"],[class*="_markdown_"] li[${STATUS_ATTR}="warn"]{--ds-accent:var(--dsw-alias-state-warn-primary,#d97706)}
[class*="_markdown_"] p[${STATUS_ATTR}="error"],[class*="_markdown_"] li[${STATUS_ATTR}="error"]{--ds-accent:var(--dsw-alias-state-error-primary,#dc2626)}
@media (max-width:720px){
  [class*="_markdown_"]{font-size:14.5px}
  [class*="_markdown_"] h1{font-size:22px}
  [class*="_markdown_"] h2{font-size:18px}
  [class*="_markdown_"] table{font-size:13px}
  [class*="_markdown_"] thead th,[class*="_markdown_"] tbody td{padding:7px 9px}
}
@media (prefers-reduced-motion:reduce){
  [class*="_markdown_"] *{transition:none!important;animation:none!important}
}
`

    function iconFor(text) {
      for (const [pattern, icon] of ICONS) if (pattern.test(text)) return icon
      return null
    }

    function cardTypeFor(text) {
      for (const [pattern, type] of CARD_TYPES) if (pattern.test(text)) return type
      return null
    }

    function inGenui(element) {
      try {
        return Boolean(element.closest?.('[data-genui], [class*="genui-root"]'))
      } catch {
        return false
      }
    }

    function toneFor(text) {
      for (const [pattern, tone] of TONES) if (pattern.test(text)) return tone
      return null
    }

    function statusFor(text) {
      if (/^✅/.test(text)) return 'success'
      if (/^⚠/.test(text)) return 'warn'
      if (/^❌/.test(text)) return 'error'
      return null
    }

    function isFirstBlockquote(block) {
      const markdown = block.closest?.('[class*="_markdown_"]')
      return Boolean(markdown && markdown.querySelector('blockquote') === block)
    }

    function isStatementCard(block) {
      const markdown = block.closest?.('[class*="_markdown_"]')
      if (!markdown || markdown.querySelector('blockquote') !== block) return false
      const paragraphs = [...block.children].filter((element) => element.tagName === 'P')
      if (paragraphs.length < 2) {
        const first = paragraphs[0]
        const strong = first?.firstElementChild
        if (!strong || strong.tagName !== 'STRONG') return false
        const rest = first.textContent.slice(strong.textContent.length).trim()
        return rest.length > 0 || Boolean(first.querySelector('br'))
      }
      const first = paragraphs[0]
      return Boolean(first?.firstElementChild && first.firstElementChild.tagName === 'STRONG')
    }

    function decorate(root) {
      for (const heading of root.querySelectorAll('[class*="_markdown_"] h2, [class*="_markdown_"] h3')) {
        if (inGenui(heading)) continue
        const icon = iconFor((heading.textContent ?? '').trim())
        if (icon === null) heading.removeAttribute(ICON_ATTR)
        else heading.setAttribute(ICON_ATTR, icon)
      }

      for (const block of root.querySelectorAll('blockquote')) {
        if (inGenui(block)) continue
        const text = (block.textContent ?? '').trimStart()
        let type = cardTypeFor(text)
        if (type === null && isStatementCard(block)) type = 'statement'
        if (type === null) {
          block.removeAttribute(CARD_ATTR)
          block.removeAttribute(CARD_TYPE_ATTR)
          if (isFirstBlockquote(block)) block.setAttribute(LEAD_ATTR, 'lead')
          else block.removeAttribute(LEAD_ATTR)
          const tone = toneFor(text)
          if (tone === null) block.removeAttribute(TONE_ATTR)
          else block.setAttribute(TONE_ATTR, tone)
          continue
        }
        block.setAttribute(CARD_ATTR, '1')
        block.setAttribute(CARD_TYPE_ATTR, type)
        block.removeAttribute(LEAD_ATTR)
        block.setAttribute(TONE_ATTR, type === 'risk' ? 'warn' : type === 'accept' ? 'success' : 'info')
      }

      for (const element of root.querySelectorAll('[class*="_markdown_"] p, [class*="_markdown_"] li')) {
        if (inGenui(element) || element.closest('blockquote, table')) {
          element.removeAttribute(STATUS_ATTR)
          continue
        }
        const status = statusFor((element.textContent ?? '').trimStart())
        if (status === null) element.removeAttribute(STATUS_ATTR)
        else element.setAttribute(STATUS_ATTR, status)
      }

      for (const row of root.querySelectorAll('[class*="_markdown_"] table tr')) {
        if (inGenui(row) || row.closest('thead')) {
          row.removeAttribute(ROW_ATTR)
          continue
        }
        const status = statusFor((row.textContent ?? '').trimStart())
        if (status === null) row.removeAttribute(ROW_ATTR)
        else row.setAttribute(ROW_ATTR, status)
      }

      for (const table of root.querySelectorAll('[class*="_markdown_"] table')) {
        if (inGenui(table)) continue
        const rows = [...table.querySelectorAll('tbody tr')]
        const statusTable =
          rows.length > 0 &&
          rows.every((row) => statusFor((row.cells?.[0]?.textContent ?? '').trimStart()) !== null)
        if (statusTable) table.setAttribute(STATUS_TABLE_ATTR, '1')
        else table.removeAttribute(STATUS_TABLE_ATTR)
      }

      for (const paragraph of root.querySelectorAll('[class*="_markdown_"] p')) {
        if (inGenui(paragraph) || paragraph.closest('blockquote, table')) {
          paragraph.removeAttribute(LEAD_ATTR)
          continue
        }
        if (/^表格结论/.test((paragraph.textContent ?? '').trimStart())) paragraph.setAttribute(LEAD_ATTR, 'table')
        else paragraph.removeAttribute(LEAD_ATTR)
      }

      for (const code of root.querySelectorAll('[class*="_markdown_"] .md-code-block')) {
        if (inGenui(code)) continue
        const banner = code.querySelector('[data-code-block-banner]')
        const raw = (banner?.textContent ?? '').trim().split(/\s+/)[0] ?? ''
        const lang = raw.toLowerCase().replace(/[^a-z0-9+#]/g, '')
        if (lang.length === 0) code.removeAttribute(LANG_ATTR)
        else code.setAttribute(LANG_ATTR, lang)
      }
    }

    return {
      inject: [],
      apply(ctx) {
        if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return
        if (document.body === null) return

        document.getElementById(LEGACY_STYLE_ID)?.remove()
        document.getElementById(STYLE_ID)?.remove()
        const style = document.createElement('style')
        style.id = STYLE_ID
        style.textContent = CSS
        document.head.appendChild(style)
        document.documentElement.setAttribute(ROOT_ATTR, 'active')
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

        const dispose = () => {
          if (disposed) return
          disposed = true
          observer.disconnect()
          if (pending !== null) {
            if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(pending)
            else clearTimeout(pending)
          }
          style.remove()
          document.documentElement.removeAttribute(ROOT_ATTR)
          for (const attr of [CARD_ATTR, CARD_TYPE_ATTR, ICON_ATTR, TONE_ATTR, LANG_ATTR, STATUS_ATTR, STATUS_TABLE_ATTR, LEAD_ATTR, ROW_ATTR]) {
            for (const element of document.querySelectorAll('[' + attr + ']')) element.removeAttribute(attr)
          }
          try {
            console.info('[dsh-structured] visual layer disposed')
          } catch {
            // console 不可用时忽略。
          }
        }
        try {
          ctx?.effect?.(() => dispose, 'dsh-structured: visual layer')
        } catch {
          dispose()
        }
        return dispose
      },
    }
  },
})
