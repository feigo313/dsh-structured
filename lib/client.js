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
 * 重新扫描。v5 皮肤走 --dss-* token，深色跟随宿主 body[data-ds-dark-theme]。
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
    const STATUS_CELL_ATTR = 'data-dsh-structured-status-cell'
    const STATUS_PILL_ATTR = 'data-dsh-structured-status-pill'
    const COPY_ATTR = 'data-dsh-structured-copy'
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
    const PERSONA_WHALE_JSON = "{\"schema\":\"dsh-structured/tone@1\",\"prefix\":\"Boss，\",\"style\":\"搞怪 / 傲娇怪；短句为主，口语化；称呼用户为「主人」；像朋友说话，不像报告。\",\"suffix\":\"——本鲸鱼娘可不背锅\",\"skipIn\":[\"code\",\"diff\",\"error\",\"short\",\"table\"]}"
    const DEFAULT_PROFILE_NAME = '蓝色大肥鱼'
    const DEFAULT_PROFILE_SIGNATURE = '主人，再来一碗白米饭！！~'
    const DEFAULT_AVATAR = 'data:image/jpeg;base64,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'

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
    const V5_TOKENS = `
.dss-scope {
  --dss-page:#f7f8fa;--dss-paper:#ffffff;--dss-paper-2:#f8fafc;
  --dss-ink:#101828;--dss-ink-2:#475467;--dss-ink-3:#667085;
  --dss-line:#e4e7ec;--dss-line-strong:#d0d5dd;
  --dss-blue:#2563eb;--dss-blue-hover:#1d4ed8;--dss-blue-text:#1d4ed8;--dss-th-text:#1d4ed8;--dss-blue-soft:#eff6ff;
  --dss-green:#067647;--dss-green-strong:#059669;--dss-green-text:#047857;--dss-green-soft:#f0faf4;
  --dss-amber:#b54708;--dss-amber-strong:#d97706;--dss-amber-text:#b54708;--dss-amber-soft:#fffbf3;
  --dss-red:#b42318;--dss-red-soft:#fef3f2;
  --dss-head-bg:rgba(219,231,255,.5);--dss-zebra:rgba(255,255,255,.55);
  --dss-code-bg:rgba(255,255,255,.72);--dss-code-border:#dbe7ff;--dss-code-text:#344054;
  --dss-shadow:0 1px 3px rgba(16,24,40,.05);
  --dss-sans:system-ui,-apple-system,"Segoe UI","Microsoft YaHei","PingFang SC",sans-serif;
  --dss-mono:ui-monospace,Consolas,"SFMono-Regular",monospace;
  --dss-serif:Georgia,"Times New Roman","Noto Serif SC","SimSun",serif;
}
body[data-ds-dark-theme] .dss-scope {
  --dss-page:#1a1b1e;--dss-paper:#242629;--dss-paper-2:#2b2e33;
  --dss-ink:#e6e9ef;--dss-ink-2:#b7bdc9;--dss-ink-3:#8a92a0;
  --dss-line:#363a41;--dss-line-strong:#4a4f59;
  --dss-blue:#3b82f6;--dss-blue-hover:#60a5fa;--dss-blue-text:#8ab4ff;--dss-th-text:#93c5fd;--dss-blue-soft:rgba(59,130,246,.16);
  --dss-green:#34d399;--dss-green-strong:#10b981;--dss-green-text:#34d399;--dss-green-soft:rgba(16,185,129,.14);
  --dss-amber:#fbbf24;--dss-amber-strong:#f59e0b;--dss-amber-text:#fbbf24;--dss-amber-soft:rgba(245,158,11,.12);
  --dss-red:#f87171;--dss-red-soft:rgba(248,113,113,.16);
  --dss-head-bg:rgba(59,130,246,.16);--dss-zebra:rgba(255,255,255,.03);
  --dss-code-bg:rgba(0,0,0,.28);--dss-code-border:rgba(96,165,250,.28);--dss-code-text:#c9d2e0;
  --dss-shadow:0 1px 3px rgba(0,0,0,.35);
}
`
    const V5_COMPONENTS = `
.dss-scope .dss-card {
  margin:14px 0;padding:14px 16px;border:1px solid var(--dss-line);
  border-left:3px solid var(--dss-blue);border-radius:12px;
  background:linear-gradient(135deg,#eef4ff,#ffffff 62%);
  box-shadow:var(--dss-shadow);color:var(--dss-ink-2);
}
.dss-scope .dss-card > p:first-child{margin-top:0}
.dss-scope .dss-card > p:last-child{margin-bottom:0}
.dss-scope .dss-card-conclusion,.dss-scope .dss-card-accept{
  border-left-color:var(--dss-blue);
  background:linear-gradient(135deg,#eef4ff,#ffffff 62%);
}
.dss-scope .dss-card-next{
  border-left-color:var(--dss-green-strong);
  background:linear-gradient(180deg,#f0faf4,#ffffff 72%);
}
.dss-scope .dss-card-risk{
  border-left-color:var(--dss-amber-strong);
  background:linear-gradient(180deg,#fffbf3,#ffffff 70%);
}
.dss-scope .dss-card-statement{
  border-left-color:var(--dss-blue);
  background:linear-gradient(135deg,#eef4ff,#ffffff 62%);
}
.dss-scope .dss-card-conclusion > p:first-child > strong:first-child,
.dss-scope .dss-card-accept > p:first-child > strong:first-child,
.dss-scope .dss-card-next > p:first-child > strong:first-child,
.dss-scope .dss-card-risk > p:first-child > strong:first-child{
  display:block;width:100%;margin:0 0 10px;padding:0 0 7px;
  border-bottom:1px solid var(--dss-line);
  font:700 12px/1.5 var(--dss-sans);letter-spacing:.04em;
  color:var(--dss-blue-text);
}
.dss-scope .dss-card-next > p:first-child > strong:first-child{color:var(--dss-green-text)}
.dss-scope .dss-card-risk > p:first-child > strong:first-child{color:var(--dss-amber-text)}
.dss-scope .dss-card-conclusion > p,.dss-scope .dss-card-accept > p,
.dss-scope .dss-card-next > p,.dss-scope .dss-card-risk > p{
  margin:.45em 0;font-size:13.5px;line-height:1.7;color:var(--dss-ink-2);
}
.dss-scope .dss-card-conclusion > p:not(:first-child) > strong:first-child,
.dss-scope .dss-card-accept > p:not(:first-child) > strong:first-child{
  display:block;margin:0 0 6px;padding:0;border:0;
  font:700 19px/1.45 var(--dss-serif);letter-spacing:.01em;color:var(--dss-ink);
}
.dss-scope .dss-card-conclusion > p strong,.dss-scope .dss-card-accept > p strong,
.dss-scope .dss-card-next > p strong,.dss-scope .dss-card-risk > p strong{color:var(--dss-ink);font-weight:700}
.dss-scope .dss-card-statement > p:first-child > strong:first-child{
  display:block;margin:0 0 6px;padding:0;border:0;
  font:700 19px/1.45 var(--dss-serif);letter-spacing:.01em;color:var(--dss-ink);
}
.dss-scope .dss-card-statement > p{font-size:13.5px;line-height:1.7;color:var(--dss-ink-2)}
.dss-scope .dss-card-next ol{padding:0;margin:2px 0 0;list-style:none;counter-reset:dss-step}
.dss-scope .dss-card-next li{
  position:relative;margin:8px 0;padding:2px 0 0 30px;font-size:13.5px;line-height:1.7;
  color:var(--dss-ink-2);counter-increment:dss-step;
}
.dss-scope .dss-card-next li::before{
  content:counter(dss-step,decimal-leading-zero);position:absolute;left:0;top:0;
  display:grid;place-items:center;width:22px;height:22px;border-radius:50%;
  background:#dcf3e7;color:var(--dss-green-text);font:600 11px/1 var(--dss-mono);
}
.dss-scope .dss-card-risk p{color:var(--dss-ink-2)}
.dss-scope .dss-table{
  width:100%;margin:14px 0;border:1px solid var(--dss-line);border-left:3px solid var(--dss-blue);
  border-radius:12px;border-collapse:separate;border-spacing:0;overflow:hidden;
  background:linear-gradient(135deg,#eef4ff,#ffffff 62%);
  box-shadow:var(--dss-shadow);font-size:13px;color:var(--dss-ink-2);
}
.dss-scope .dss-table thead th{
  height:auto;padding:10px 16px!important;background:var(--dss-head-bg)!important;border-bottom:0;
  color:var(--dss-th-text)!important;font:600 11.5px/1.5 var(--dss-sans)!important;letter-spacing:.08em!important;text-align:left;
}
.dss-scope .dss-table th:nth-child(1),.dss-scope .dss-table td:nth-child(1){width:26%}
.dss-scope .dss-table th:nth-child(2),.dss-scope .dss-table td:nth-child(2){width:18%}
.dss-scope .dss-table tbody td{
  padding:11px 16px!important;border-bottom:1px solid var(--dss-line)!important;background:transparent;
  color:var(--dss-ink-2)!important;font-size:13px!important;line-height:1.55!important;vertical-align:middle;
}
.dss-scope .dss-table tbody td:first-child{color:var(--dss-ink)!important;font-weight:600!important;font-size:13.5px!important}
.dss-scope .dss-table tbody tr:nth-child(even){background:var(--dss-zebra)}
.dss-scope .dss-table tbody tr:last-child td{border-bottom:0}
.dss-scope .dss-table td[data-dsh-structured-status-cell]{white-space:nowrap}
.dss-scope .dss-status{
  display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:999px;
  font-size:11px;font-weight:600;line-height:1.5;
}
.dss-scope .dss-status::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.dss-scope .dss-status-success{background:#ecfdf3;color:#067647}
.dss-scope .dss-status-warn{background:#fffaeb;color:#b54708}
.dss-scope .dss-status-error{background:#fef3f2;color:#b42318}
.dss-scope .dss-code{
  margin:14px 0;padding:14px 16px;border:1px solid var(--dss-line);
  border-left:3px solid var(--dss-blue);border-radius:12px;
  background:linear-gradient(135deg,#eef4ff,#ffffff 62%);
  box-shadow:var(--dss-shadow);
}
.dss-scope .dss-code > [class*="_bannerWrap"]{margin:0;padding:0;border:0;background:none}
.dss-scope .dss-code [data-code-block-banner]{
  display:flex;align-items:center;justify-content:space-between;gap:10px;
  margin:0 0 10px;padding:2px 0 7px!important;border:0;border-bottom:1px solid var(--dss-line);
  border-radius:0;background:transparent!important;color:var(--dss-blue-text)!important;
  font:700 12px/1.5 var(--dss-sans)!important;letter-spacing:.04em;text-transform:none;
}
.dss-scope .dss-code [data-code-block-banner]::before{
  content:"代码 · ";flex:none;color:var(--dss-blue-text);
}
.dss-scope .dss-code [data-code-block-banner] > [class*="_heading"]{
  flex:1;min-width:0;justify-content:flex-start;text-align:left;color:inherit;
}
.dss-scope .dss-code [data-code-block-banner] > [class*="_actions"]{margin-left:auto;flex:none}
.dss-scope .dss-code > [data-code-block-content]{padding:0}
.dss-scope .dss-code pre{
  margin:0;padding:12px 14px;border:1px solid var(--dss-code-border);border-radius:8px;
  background:var(--dss-code-bg)!important;color:var(--dss-code-text)!important;
  font:12.5px/1.7 var(--dss-mono)!important;overflow:auto;
}
.dss-scope .dss-copy{
  display:grid;place-items:center;width:24px;height:24px;padding:0;border:0;border-radius:5px;
  background:transparent;color:var(--dss-ink-3);cursor:pointer;
}
.dss-scope .dss-copy:hover{background:var(--dss-paper-2);color:var(--dss-ink)}
.dss-scope .dss-copy-icon{position:relative;display:inline-block;width:13px;height:13px}
.dss-scope .dss-copy-icon::before{content:"";position:absolute;inset:0 3px 3px 0;border:1.5px solid currentColor;border-radius:2px}
.dss-scope .dss-copy-icon::after{content:"";position:absolute;inset:3px 0 0 3px;border:1.5px solid currentColor;border-radius:2px}
.dss-scope .dss-copy-ok{display:none;font:700 12px/1 var(--dss-mono)}
.dss-scope .dss-copy[data-copied="1"] .dss-copy-icon{display:none}
.dss-scope .dss-copy[data-copied="1"] .dss-copy-ok{display:inline;color:var(--dss-green)}
body[data-ds-dark-theme] .dss-scope .dss-card-conclusion,
body[data-ds-dark-theme] .dss-scope .dss-card-accept,
body[data-ds-dark-theme] .dss-scope .dss-card-statement{
  background:linear-gradient(135deg,rgba(37,99,235,.18),rgba(37,99,235,0) 62%),var(--dss-paper);
}
body[data-ds-dark-theme] .dss-scope .dss-card-next{
  background:linear-gradient(180deg,rgba(16,185,129,.14),rgba(16,185,129,0) 72%),var(--dss-paper);
  border-left-color:#10b981;
}
body[data-ds-dark-theme] .dss-scope .dss-card-risk{
  background:linear-gradient(180deg,rgba(245,158,11,.12),rgba(245,158,11,0) 70%),var(--dss-paper);
  border-left-color:#f59e0b;
}
body[data-ds-dark-theme] .dss-scope .dss-table,
body[data-ds-dark-theme] .dss-scope .dss-code{
  background:linear-gradient(135deg,rgba(37,99,235,.18),rgba(37,99,235,0) 62%),var(--dss-paper);
}
body[data-ds-dark-theme] .dss-scope .dss-status-success{background:rgba(52,211,153,.16);color:#4ade80}
body[data-ds-dark-theme] .dss-scope .dss-status-warn{background:rgba(251,191,36,.14);color:#fbbf24}
body[data-ds-dark-theme] .dss-scope .dss-status-error{background:rgba(248,113,113,.16);color:#f87171}
body[data-ds-dark-theme] .dss-scope .dss-copy[data-copied="1"] .dss-copy-ok{color:#34d399}
`
    const CONFIG_CSS = `
.dss-scope {
  --dss-page:#f7f8fa;--dss-paper:#ffffff;--dss-paper-2:#f8fafc;
  --dss-ink:#101828;--dss-ink-2:#475467;--dss-ink-3:#667085;
  --dss-line:#e4e7ec;--dss-line-strong:#d0d5dd;
  --dss-blue:#2563eb;--dss-blue-hover:#1d4ed8;--dss-blue-text:#1d4ed8;--dss-th-text:#1d4ed8;--dss-blue-soft:#eff6ff;
  --dss-green:#067647;--dss-green-strong:#059669;--dss-green-text:#047857;--dss-green-soft:#f0faf4;
  --dss-amber:#b54708;--dss-amber-strong:#d97706;--dss-amber-text:#b54708;--dss-amber-soft:#fffbf3;
  --dss-red:#b42318;--dss-red-soft:#fef3f2;
  --dss-head-bg:rgba(219,231,255,.5);--dss-zebra:rgba(255,255,255,.55);
  --dss-code-bg:rgba(255,255,255,.72);--dss-code-border:#dbe7ff;--dss-code-text:#344054;
  --dss-shadow:0 1px 3px rgba(16,24,40,.05);
  --dss-sans:system-ui,-apple-system,"Segoe UI","Microsoft YaHei","PingFang SC",sans-serif;
  --dss-mono:ui-monospace,Consolas,"SFMono-Regular",monospace;
  --dss-serif:Georgia,"Times New Roman","Noto Serif SC","SimSun",serif;
}
body[data-ds-dark-theme] .dss-scope {
  --dss-page:#1a1b1e;--dss-paper:#242629;--dss-paper-2:#2b2e33;
  --dss-ink:#e6e9ef;--dss-ink-2:#b7bdc9;--dss-ink-3:#8a92a0;
  --dss-line:#363a41;--dss-line-strong:#4a4f59;
  --dss-blue:#3b82f6;--dss-blue-hover:#60a5fa;--dss-blue-text:#8ab4ff;--dss-th-text:#93c5fd;--dss-blue-soft:rgba(59,130,246,.16);
  --dss-green:#34d399;--dss-green-strong:#10b981;--dss-green-text:#34d399;--dss-green-soft:rgba(16,185,129,.14);
  --dss-amber:#fbbf24;--dss-amber-strong:#f59e0b;--dss-amber-text:#fbbf24;--dss-amber-soft:rgba(245,158,11,.12);
  --dss-red:#f87171;--dss-red-soft:rgba(248,113,113,.16);
  --dss-head-bg:rgba(59,130,246,.16);--dss-zebra:rgba(255,255,255,.03);
  --dss-code-bg:rgba(0,0,0,.28);--dss-code-border:rgba(96,165,250,.28);--dss-code-text:#c9d2e0;
  --dss-shadow:0 1px 3px rgba(0,0,0,.35);
}


.dss-scope .dss-card {
  margin:14px 0;padding:14px 16px;border:1px solid var(--dss-line);
  border-left:3px solid var(--dss-blue);border-radius:12px;
  background:linear-gradient(135deg,#eef4ff,#ffffff 62%);
  box-shadow:var(--dss-shadow);color:var(--dss-ink-2);
}
.dss-scope .dss-card > p:first-child{margin-top:0}
.dss-scope .dss-card > p:last-child{margin-bottom:0}
.dss-scope .dss-card-conclusion,.dss-scope .dss-card-accept{
  border-left-color:var(--dss-blue);
  background:linear-gradient(135deg,#eef4ff,#ffffff 62%);
}
.dss-scope .dss-card-next{
  border-left-color:var(--dss-green-strong);
  background:linear-gradient(180deg,#f0faf4,#ffffff 72%);
}
.dss-scope .dss-card-risk{
  border-left-color:var(--dss-amber-strong);
  background:linear-gradient(180deg,#fffbf3,#ffffff 70%);
}
.dss-scope .dss-card-statement{
  border-left-color:var(--dss-blue);
  background:linear-gradient(135deg,#eef4ff,#ffffff 62%);
}
.dss-scope .dss-card-conclusion > p:first-child > strong:first-child,
.dss-scope .dss-card-accept > p:first-child > strong:first-child,
.dss-scope .dss-card-next > p:first-child > strong:first-child,
.dss-scope .dss-card-risk > p:first-child > strong:first-child{
  display:block;width:100%;margin:0 0 10px;padding:0 0 7px;
  border-bottom:1px solid var(--dss-line);
  font:700 12px/1.5 var(--dss-sans);letter-spacing:.04em;
  color:var(--dss-blue-text);
}
.dss-scope .dss-card-next > p:first-child > strong:first-child{color:var(--dss-green-text)}
.dss-scope .dss-card-risk > p:first-child > strong:first-child{color:var(--dss-amber-text)}
.dss-scope .dss-card-conclusion > p,.dss-scope .dss-card-accept > p,
.dss-scope .dss-card-next > p,.dss-scope .dss-card-risk > p{
  margin:.45em 0;font-size:13.5px;line-height:1.7;color:var(--dss-ink-2);
}
.dss-scope .dss-card-conclusion > p:not(:first-child) > strong:first-child,
.dss-scope .dss-card-accept > p:not(:first-child) > strong:first-child{
  display:block;margin:0 0 6px;padding:0;border:0;
  font:700 19px/1.45 var(--dss-serif);letter-spacing:.01em;color:var(--dss-ink);
}
.dss-scope .dss-card-conclusion > p strong,.dss-scope .dss-card-accept > p strong,
.dss-scope .dss-card-next > p strong,.dss-scope .dss-card-risk > p strong{color:var(--dss-ink);font-weight:700}
.dss-scope .dss-card-statement > p:first-child > strong:first-child{
  display:block;margin:0 0 6px;padding:0;border:0;
  font:700 19px/1.45 var(--dss-serif);letter-spacing:.01em;color:var(--dss-ink);
}
.dss-scope .dss-card-statement > p{font-size:13.5px;line-height:1.7;color:var(--dss-ink-2)}
.dss-scope .dss-card-next ol{padding:0;margin:2px 0 0;list-style:none;counter-reset:dss-step}
.dss-scope .dss-card-next li{
  position:relative;margin:8px 0;padding:2px 0 0 30px;font-size:13.5px;line-height:1.7;
  color:var(--dss-ink-2);counter-increment:dss-step;
}
.dss-scope .dss-card-next li::before{
  content:counter(dss-step,decimal-leading-zero);position:absolute;left:0;top:0;
  display:grid;place-items:center;width:22px;height:22px;border-radius:50%;
  background:#dcf3e7;color:var(--dss-green-text);font:600 11px/1 var(--dss-mono);
}
.dss-scope .dss-card-risk p{color:var(--dss-ink-2)}
.dss-scope .dss-table{
  width:100%;margin:14px 0;border:1px solid var(--dss-line);border-left:3px solid var(--dss-blue);
  border-radius:12px;border-collapse:separate;border-spacing:0;overflow:hidden;
  background:linear-gradient(135deg,#eef4ff,#ffffff 62%);
  box-shadow:var(--dss-shadow);font-size:13px;color:var(--dss-ink-2);
}
.dss-scope .dss-table thead th{
  height:auto;padding:10px 16px!important;background:var(--dss-head-bg)!important;border-bottom:0;
  color:var(--dss-th-text)!important;font:600 11.5px/1.5 var(--dss-sans)!important;letter-spacing:.08em!important;text-align:left;
}
.dss-scope .dss-table th:nth-child(1),.dss-scope .dss-table td:nth-child(1){width:26%}
.dss-scope .dss-table th:nth-child(2),.dss-scope .dss-table td:nth-child(2){width:18%}
.dss-scope .dss-table tbody td{
  padding:11px 16px!important;border-bottom:1px solid var(--dss-line)!important;background:transparent;
  color:var(--dss-ink-2)!important;font-size:13px!important;line-height:1.55!important;vertical-align:middle;
}
.dss-scope .dss-table tbody td:first-child{color:var(--dss-ink)!important;font-weight:600!important;font-size:13.5px!important}
.dss-scope .dss-table tbody tr:nth-child(even){background:var(--dss-zebra)}
.dss-scope .dss-table tbody tr:last-child td{border-bottom:0}
.dss-scope .dss-table td[data-dsh-structured-status-cell]{white-space:nowrap}
.dss-scope .dss-status{
  display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:999px;
  font-size:11px;font-weight:600;line-height:1.5;
}
.dss-scope .dss-status::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.dss-scope .dss-status-success{background:#ecfdf3;color:#067647}
.dss-scope .dss-status-warn{background:#fffaeb;color:#b54708}
.dss-scope .dss-status-error{background:#fef3f2;color:#b42318}
.dss-scope .dss-code{
  margin:14px 0;padding:14px 16px;border:1px solid var(--dss-line);
  border-left:3px solid var(--dss-blue);border-radius:12px;
  background:linear-gradient(135deg,#eef4ff,#ffffff 62%);
  box-shadow:var(--dss-shadow);
}
.dss-scope .dss-code > [class*="_bannerWrap"]{margin:0;padding:0;border:0;background:none}
.dss-scope .dss-code [data-code-block-banner]{
  display:flex;align-items:center;justify-content:space-between;gap:10px;
  margin:0 0 10px;padding:2px 0 7px!important;border:0;border-bottom:1px solid var(--dss-line);
  border-radius:0;background:transparent!important;color:var(--dss-blue-text)!important;
  font:700 12px/1.5 var(--dss-sans)!important;letter-spacing:.04em;text-transform:none;
}
.dss-scope .dss-code [data-code-block-banner]::before{
  content:"代码 · ";flex:none;color:var(--dss-blue-text);
}
.dss-scope .dss-code [data-code-block-banner] > [class*="_heading"]{
  flex:1;min-width:0;justify-content:flex-start;text-align:left;color:inherit;
}
.dss-scope .dss-code [data-code-block-banner] > [class*="_actions"]{margin-left:auto;flex:none}
.dss-scope .dss-code > [data-code-block-content]{padding:0}
.dss-scope .dss-code pre{
  margin:0;padding:12px 14px;border:1px solid var(--dss-code-border);border-radius:8px;
  background:var(--dss-code-bg)!important;color:var(--dss-code-text)!important;
  font:12.5px/1.7 var(--dss-mono)!important;overflow:auto;
}
.dss-scope .dss-copy{
  display:grid;place-items:center;width:24px;height:24px;padding:0;border:0;border-radius:5px;
  background:transparent;color:var(--dss-ink-3);cursor:pointer;
}
.dss-scope .dss-copy:hover{background:var(--dss-paper-2);color:var(--dss-ink)}
.dss-scope .dss-copy-icon{position:relative;display:inline-block;width:13px;height:13px}
.dss-scope .dss-copy-icon::before{content:"";position:absolute;inset:0 3px 3px 0;border:1.5px solid currentColor;border-radius:2px}
.dss-scope .dss-copy-icon::after{content:"";position:absolute;inset:3px 0 0 3px;border:1.5px solid currentColor;border-radius:2px}
.dss-scope .dss-copy-ok{display:none;font:700 12px/1 var(--dss-mono)}
.dss-scope .dss-copy[data-copied="1"] .dss-copy-icon{display:none}
.dss-scope .dss-copy[data-copied="1"] .dss-copy-ok{display:inline;color:var(--dss-green)}
body[data-ds-dark-theme] .dss-scope .dss-card-conclusion,
body[data-ds-dark-theme] .dss-scope .dss-card-accept,
body[data-ds-dark-theme] .dss-scope .dss-card-statement{
  background:linear-gradient(135deg,rgba(37,99,235,.18),rgba(37,99,235,0) 62%),var(--dss-paper);
}
body[data-ds-dark-theme] .dss-scope .dss-card-next{
  background:linear-gradient(180deg,rgba(16,185,129,.14),rgba(16,185,129,0) 72%),var(--dss-paper);
  border-left-color:#10b981;
}
body[data-ds-dark-theme] .dss-scope .dss-card-risk{
  background:linear-gradient(180deg,rgba(245,158,11,.12),rgba(245,158,11,0) 70%),var(--dss-paper);
  border-left-color:#f59e0b;
}
body[data-ds-dark-theme] .dss-scope .dss-table,
body[data-ds-dark-theme] .dss-scope .dss-code{
  background:linear-gradient(135deg,rgba(37,99,235,.18),rgba(37,99,235,0) 62%),var(--dss-paper);
}
body[data-ds-dark-theme] .dss-scope .dss-status-success{background:rgba(52,211,153,.16);color:#4ade80}
body[data-ds-dark-theme] .dss-scope .dss-status-warn{background:rgba(251,191,36,.14);color:#fbbf24}
body[data-ds-dark-theme] .dss-scope .dss-status-error{background:rgba(248,113,113,.16);color:#f87171}
body[data-ds-dark-theme] .dss-scope .dss-copy[data-copied="1"] .dss-copy-ok{color:#34d399}

.dss-scope.dss-config{width:100%;max-width:760px;color:var(--dss-ink);font:13px/1.55 var(--dss-sans)}
.dss-config *{box-sizing:border-box}
.dss-hidden{display:none!important}
.dss-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:10px}
.dss-section-title{margin:0;color:var(--dss-ink);font:600 16px/1.4 var(--dss-sans)}
.dss-note{margin:0 0 16px;color:var(--dss-ink-3);font-size:12px;line-height:1.65}
.dss-profile{display:flex;align-items:center;gap:16px;margin:2px 0 18px;padding:0}
.dss-profile-avatar{display:grid;place-items:center;width:88px;height:88px;flex:none;overflow:hidden;border:0;border-radius:50%;background:var(--dss-blue-soft);box-shadow:0 0 0 3px var(--dss-page),0 2px 10px rgba(16,24,40,.12);cursor:pointer;transition:box-shadow .14s}
.dss-profile-avatar:hover{box-shadow:0 0 0 3px var(--dss-page),0 2px 10px rgba(16,24,40,.12),0 0 0 6px rgba(37,99,235,.18)}
.dss-profile-avatar img{width:100%;height:100%;object-fit:cover}
.dss-profile-info{min-width:0;flex:1}
.dss-profile-name{display:block;width:100%;max-width:320px;height:30px;padding:0;border:0;border-bottom:1px solid transparent;border-radius:0;background:transparent;color:var(--dss-ink);font:600 19px/1.3 var(--dss-sans);letter-spacing:-.01em;outline:0}
.dss-profile-name:hover{border-bottom-color:var(--dss-line-strong)}
.dss-profile-name:focus{border-bottom-color:var(--dss-blue)}
.dss-profile-sig{display:block;width:100%;max-width:380px;height:24px;margin-top:2px;padding:0;border:0;border-bottom:1px solid transparent;border-radius:0;background:transparent;color:var(--dss-ink-3);font:12px/1.6 var(--dss-mono);outline:0}
.dss-profile-sig:hover{border-bottom-color:var(--dss-line)}
.dss-profile-sig:focus{border-bottom-color:var(--dss-blue);color:var(--dss-ink-2)}
.dss-source{position:relative;display:flex;align-items:center;gap:6px;min-width:0;flex:none;margin-left:auto}
.dss-source-btn{display:inline-flex;align-items:center;gap:6px;max-width:240px;height:30px;padding:0 10px;border:1px solid #bfd3ff;border-radius:6px;background:var(--dss-blue-soft);color:var(--dss-blue);font-size:12.5px;font-weight:500;cursor:pointer}
.dss-source-btn:hover{border-color:var(--dss-blue);background:#e3edff}
.dss-caret{width:0;height:0;border-left:3px solid transparent;border-right:3px solid transparent;border-top:4px solid var(--dss-ink-3)}
.dss-popover{position:absolute;top:34px;right:0;z-index:30;width:264px;padding:6px;border:1px solid var(--dss-line-strong);border-radius:8px;background:var(--dss-paper);box-shadow:0 12px 32px rgba(16,24,40,.12)}
.dss-template-list{display:grid;gap:2px}
.dss-template-row{position:relative}
.dss-template-option{display:flex;gap:9px;align-items:center;width:100%;min-height:44px;padding:7px 40px 7px 8px;border:0;border-radius:6px;background:transparent;text-align:left;cursor:pointer;color:var(--dss-ink)}
.dss-template-option:hover{background:var(--dss-paper-2)}
.dss-template-option[aria-checked="true"]{background:var(--dss-blue-soft)}
.dss-template-option .mark{display:grid;place-items:center;width:24px;height:24px;flex:none;border-radius:50%;background:var(--dss-paper-2);border:1px solid var(--dss-line);color:var(--dss-ink-2);font-size:11px}
.dss-template-option[aria-checked="true"] .mark{border-color:#bfd3ff;background:var(--dss-paper);color:var(--dss-blue)}
.dss-template-option strong{display:block;font-size:12.5px;font-weight:500}
.dss-template-option em{display:block;margin-top:1px;color:var(--dss-ink-3);font-size:11px;font-style:normal}
.dss-template-del{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:26px;height:26px;padding:0;border:0;border-radius:4px;background:transparent;color:var(--dss-ink-3);font-size:15px;line-height:1;opacity:.5;cursor:pointer}
.dss-template-row:hover .dss-template-del{opacity:1}
.dss-template-del:hover{background:var(--dss-red-soft);color:var(--dss-red)}
.dss-template-empty{padding:10px 8px;color:var(--dss-ink-3);font-size:11.5px}
.dss-template-foot{margin-top:4px;padding:6px 4px 2px;border-top:1px solid var(--dss-line)}
.dss-template-save{display:block;width:100%;padding:8px;border:0;border-radius:6px;background:transparent;color:var(--dss-blue);font-size:12px;text-align:left;cursor:pointer}
.dss-template-save:hover{background:var(--dss-blue-soft)}
.dss-field{margin-bottom:14px}
.dss-field-label{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:6px}
.dss-field-label label{font-size:13px;font-weight:600;color:var(--dss-ink)}
.dss-hint{color:var(--dss-ink-3);font-size:11.5px}
.dss-input,.dss-textarea{display:block;width:100%;padding:7px 10px;border:1px solid var(--dss-line-strong);border-radius:6px;background:var(--dss-paper);color:var(--dss-ink);font:13px/1.6 var(--dss-sans);outline:0;transition:border-color .14s,box-shadow .14s}
.dss-input:focus,.dss-textarea:focus{border-color:var(--dss-blue);box-shadow:0 0 0 3px rgba(37,99,235,.12)}
.dss-textarea{min-height:96px;resize:none}
.dss-control{position:relative}
.dss-control .dss-input{padding-right:38px}
.dss-icon-btn{position:absolute;right:6px;top:50%;transform:translateY(-50%);display:grid;place-items:center;width:26px;height:26px;padding:0;border:1px solid var(--dss-line);border-radius:5px;background:var(--dss-paper-2);color:var(--dss-ink-2);font-size:14px;cursor:pointer}
.dss-icon-btn:hover{border-color:#bfd3ff;background:var(--dss-blue-soft)}
.dss-emoji-panel{display:none;position:absolute;top:calc(100% + 4px);right:0;z-index:20;width:232px;grid-template-columns:repeat(8,1fr);gap:1px;padding:6px;border:1px solid var(--dss-line-strong);border-radius:6px;background:var(--dss-paper);box-shadow:0 12px 28px rgba(16,24,40,.12)}
.dss-emoji-panel.is-open{display:grid}
.dss-emoji-panel button{display:grid;place-items:center;width:24px;height:24px;padding:0;border:0;border-radius:4px;background:transparent;font-size:15px;cursor:pointer}
.dss-emoji-panel button:hover{background:var(--dss-blue-soft)}
.dss-field-meta{display:flex;justify-content:flex-end;margin-top:4px;min-height:14px}
.dss-counter{color:var(--dss-ink-3);font:10.5px/1.4 var(--dss-mono)}
.dss-rules{margin:14px 0 0;color:var(--dss-ink-3);font-size:11.5px;line-height:1.65}
.dss-save{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:4px}
.dss-save-state{color:var(--dss-ink-3);font-size:12px;line-height:1.5}
.dss-save-state.is-error{color:var(--dss-red)}
.dss-save-actions{display:flex;gap:10px}
.dss-btn{height:34px;padding:0 14px;border:1px solid var(--dss-line-strong);border-radius:6px;background:var(--dss-paper);color:var(--dss-ink-2);font-size:12.5px;white-space:nowrap;cursor:pointer}
.dss-btn:hover{background:var(--dss-paper-2)}
.dss-btn:disabled{opacity:.5;cursor:default}
.dss-btn-primary{border-color:var(--dss-blue);background:var(--dss-blue);color:#fff;font-weight:500}
.dss-btn-primary:hover{background:var(--dss-blue-hover)}
.dss-preview{margin-top:30px;border-top:1px solid var(--dss-line)}
.dss-preview-head{display:block}
.dss-preview-title-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-height:40px}
.dss-preview-title{margin:0;color:var(--dss-ink);font:600 16px/1.4 var(--dss-sans)}
.dss-preview-note{color:var(--dss-ink-3);font-size:11.5px;line-height:1.5;font-weight:400}
.dss-preview-tabs-row{display:flex;align-items:center;gap:10px;padding:4px 0 10px}
.dss-preview-tabs{display:flex;gap:2px;padding:2px;border:1px solid var(--dss-line);border-radius:6px;background:var(--dss-paper-2)}
.dss-preview-tab{height:26px;padding:0 10px;border:0;border-radius:4px;background:transparent;color:var(--dss-ink-2);font-size:11.5px;cursor:pointer}
.dss-preview-tab[aria-selected="true"]{background:var(--dss-paper);color:var(--dss-ink);font-weight:500;box-shadow:0 1px 2px rgba(16,24,40,.06)}
.dss-chat-card{padding:14px 4px 6px}
.dss-chat-card.is-off .dss-chat-body{filter:grayscale(.92);opacity:.7}
.dss-chat-head{display:flex;align-items:center;gap:12px;padding:0 0 10px}
.dss-chat-avatar{position:relative;display:grid;place-items:center;width:38px;height:38px;flex:none;overflow:hidden;border-radius:50%;background:var(--dss-blue-soft);box-shadow:0 0 0 3px var(--dss-page),0 2px 10px rgba(16,24,40,.18)}
.dss-chat-avatar img{width:100%;height:100%;object-fit:cover}
.dss-chat-id{min-width:0}
.dss-chat-name{display:block;color:var(--dss-ink);font-size:16px;font-weight:650;line-height:1.3}
.dss-chat-meta{display:block;color:var(--dss-ink-3);font:12px/1.5 var(--dss-mono);overflow-wrap:anywhere}
.dss-chat-body{display:grid;gap:12px;padding:6px 0 0 50px}
.dss-msg-prefix{margin:0;color:var(--dss-ink-3);font:12.5px/1.7 var(--dss-mono)}
.dss-msg-structure{display:grid;gap:12px;min-width:0}
.dss-msg-suffix{margin:0;padding-top:8px;border-top:1px dotted var(--dss-line-strong);color:var(--dss-ink-3);font:12px/1.65 var(--dss-mono);overflow-wrap:anywhere}
.dss-msg-lead{margin:0;color:var(--dss-ink-2);font-size:13.5px;line-height:1.7}
.dss-line-title{display:flex;align-items:center;width:100%;margin:0 0 10px;padding:0 0 7px;border-bottom:1px solid var(--dss-line);font:700 12px/1.5 var(--dss-sans);letter-spacing:.04em;color:var(--dss-blue-text)}
.dss-card-next .dss-line-title{color:var(--dss-green-text)}
.dss-card-risk .dss-line-title{color:var(--dss-amber-text)}
.dss-msg-title{margin:0;color:var(--dss-ink);font:700 19px/1.45 var(--dss-serif);letter-spacing:.01em;overflow-wrap:anywhere}
.dss-msg-sub{margin:6px 0 0;color:var(--dss-ink-2);font-size:13.5px;line-height:1.7;overflow-wrap:anywhere}
.dss-msg-steps{display:grid;gap:8px;margin:2px 0 0;padding:0;list-style:none}
.dss-msg-steps li{display:grid;grid-template-columns:26px minmax(0,1fr);gap:8px;align-items:start}
.dss-msg-num{display:grid;place-items:center;width:22px;height:22px;padding-top:0;border-radius:50%;background:#dcf3e7;color:var(--dss-green-text);font:600 11px/1.6 var(--dss-mono);font-variant-numeric:tabular-nums}
.dss-msg-step,.dss-msg-risk-text{margin:0;color:var(--dss-ink-2);font-size:13.5px;line-height:1.7;overflow-wrap:anywhere}
.dss-pane-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px;padding:2px 0 7px;border-bottom:1px solid var(--dss-line);font:700 12px/1.5 var(--dss-sans);letter-spacing:.04em;color:var(--dss-blue-text)}
.dss-code-body{margin:0;padding:12px 14px;border:1px solid var(--dss-code-border);border-radius:8px;background:var(--dss-code-bg);color:var(--dss-code-text);font:12.5px/1.7 var(--dss-mono);overflow:auto}
body[data-ds-dark-theme] .dss-scope .dss-msg-num{background:rgba(52,211,153,.16);color:#34d399}
body[data-ds-dark-theme] .dss-scope .dss-source-btn{border-color:rgba(96,165,250,.4)}
body[data-ds-dark-theme] .dss-scope .dss-source-btn:hover{background:rgba(59,130,246,.22)}
body[data-ds-dark-theme] .dss-scope .dss-template-option[aria-checked="true"] .mark{border-color:rgba(96,165,250,.4)}
[data-dsh-structured-config] button[id^="dsh-structured-theme-"]{position:relative}
[data-dsh-structured-config] button[id^="dsh-structured-theme-"]::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:7px;vertical-align:baseline;background:var(--dsw-alias-label-tertiary,#9CA3AF)}
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
.dss-scope {
  --dss-page:#f7f8fa;--dss-paper:#ffffff;--dss-paper-2:#f8fafc;
  --dss-ink:#101828;--dss-ink-2:#475467;--dss-ink-3:#667085;
  --dss-line:#e4e7ec;--dss-line-strong:#d0d5dd;
  --dss-blue:#2563eb;--dss-blue-hover:#1d4ed8;--dss-blue-text:#1d4ed8;--dss-th-text:#1d4ed8;--dss-blue-soft:#eff6ff;
  --dss-green:#067647;--dss-green-strong:#059669;--dss-green-text:#047857;--dss-green-soft:#f0faf4;
  --dss-amber:#b54708;--dss-amber-strong:#d97706;--dss-amber-text:#b54708;--dss-amber-soft:#fffbf3;
  --dss-red:#b42318;--dss-red-soft:#fef3f2;
  --dss-head-bg:rgba(219,231,255,.5);--dss-zebra:rgba(255,255,255,.55);
  --dss-code-bg:rgba(255,255,255,.72);--dss-code-border:#dbe7ff;--dss-code-text:#344054;
  --dss-shadow:0 1px 3px rgba(16,24,40,.05);
  --dss-sans:system-ui,-apple-system,"Segoe UI","Microsoft YaHei","PingFang SC",sans-serif;
  --dss-mono:ui-monospace,Consolas,"SFMono-Regular",monospace;
  --dss-serif:Georgia,"Times New Roman","Noto Serif SC","SimSun",serif;
}
body[data-ds-dark-theme] .dss-scope {
  --dss-page:#1a1b1e;--dss-paper:#242629;--dss-paper-2:#2b2e33;
  --dss-ink:#e6e9ef;--dss-ink-2:#b7bdc9;--dss-ink-3:#8a92a0;
  --dss-line:#363a41;--dss-line-strong:#4a4f59;
  --dss-blue:#3b82f6;--dss-blue-hover:#60a5fa;--dss-blue-text:#8ab4ff;--dss-th-text:#93c5fd;--dss-blue-soft:rgba(59,130,246,.16);
  --dss-green:#34d399;--dss-green-strong:#10b981;--dss-green-text:#34d399;--dss-green-soft:rgba(16,185,129,.14);
  --dss-amber:#fbbf24;--dss-amber-strong:#f59e0b;--dss-amber-text:#fbbf24;--dss-amber-soft:rgba(245,158,11,.12);
  --dss-red:#f87171;--dss-red-soft:rgba(248,113,113,.16);
  --dss-head-bg:rgba(59,130,246,.16);--dss-zebra:rgba(255,255,255,.03);
  --dss-code-bg:rgba(0,0,0,.28);--dss-code-border:rgba(96,165,250,.28);--dss-code-text:#c9d2e0;
  --dss-shadow:0 1px 3px rgba(0,0,0,.35);
}


.dss-scope .dss-card {
  margin:14px 0;padding:14px 16px;border:1px solid var(--dss-line);
  border-left:3px solid var(--dss-blue);border-radius:12px;
  background:linear-gradient(135deg,#eef4ff,#ffffff 62%);
  box-shadow:var(--dss-shadow);color:var(--dss-ink-2);
}
.dss-scope .dss-card > p:first-child{margin-top:0}
.dss-scope .dss-card > p:last-child{margin-bottom:0}
.dss-scope .dss-card-conclusion,.dss-scope .dss-card-accept{
  border-left-color:var(--dss-blue);
  background:linear-gradient(135deg,#eef4ff,#ffffff 62%);
}
.dss-scope .dss-card-next{
  border-left-color:var(--dss-green-strong);
  background:linear-gradient(180deg,#f0faf4,#ffffff 72%);
}
.dss-scope .dss-card-risk{
  border-left-color:var(--dss-amber-strong);
  background:linear-gradient(180deg,#fffbf3,#ffffff 70%);
}
.dss-scope .dss-card-statement{
  border-left-color:var(--dss-blue);
  background:linear-gradient(135deg,#eef4ff,#ffffff 62%);
}
.dss-scope .dss-card-conclusion > p:first-child > strong:first-child,
.dss-scope .dss-card-accept > p:first-child > strong:first-child,
.dss-scope .dss-card-next > p:first-child > strong:first-child,
.dss-scope .dss-card-risk > p:first-child > strong:first-child{
  display:block;width:100%;margin:0 0 10px;padding:0 0 7px;
  border-bottom:1px solid var(--dss-line);
  font:700 12px/1.5 var(--dss-sans);letter-spacing:.04em;
  color:var(--dss-blue-text);
}
.dss-scope .dss-card-next > p:first-child > strong:first-child{color:var(--dss-green-text)}
.dss-scope .dss-card-risk > p:first-child > strong:first-child{color:var(--dss-amber-text)}
.dss-scope .dss-card-conclusion > p,.dss-scope .dss-card-accept > p,
.dss-scope .dss-card-next > p,.dss-scope .dss-card-risk > p{
  margin:.45em 0;font-size:13.5px;line-height:1.7;color:var(--dss-ink-2);
}
.dss-scope .dss-card-conclusion > p:not(:first-child) > strong:first-child,
.dss-scope .dss-card-accept > p:not(:first-child) > strong:first-child{
  display:block;margin:0 0 6px;padding:0;border:0;
  font:700 19px/1.45 var(--dss-serif);letter-spacing:.01em;color:var(--dss-ink);
}
.dss-scope .dss-card-conclusion > p strong,.dss-scope .dss-card-accept > p strong,
.dss-scope .dss-card-next > p strong,.dss-scope .dss-card-risk > p strong{color:var(--dss-ink);font-weight:700}
.dss-scope .dss-card-statement > p:first-child > strong:first-child{
  display:block;margin:0 0 6px;padding:0;border:0;
  font:700 19px/1.45 var(--dss-serif);letter-spacing:.01em;color:var(--dss-ink);
}
.dss-scope .dss-card-statement > p{font-size:13.5px;line-height:1.7;color:var(--dss-ink-2)}
.dss-scope .dss-card-next ol{padding:0;margin:2px 0 0;list-style:none;counter-reset:dss-step}
.dss-scope .dss-card-next li{
  position:relative;margin:8px 0;padding:2px 0 0 30px;font-size:13.5px;line-height:1.7;
  color:var(--dss-ink-2);counter-increment:dss-step;
}
.dss-scope .dss-card-next li::before{
  content:counter(dss-step,decimal-leading-zero);position:absolute;left:0;top:0;
  display:grid;place-items:center;width:22px;height:22px;border-radius:50%;
  background:#dcf3e7;color:var(--dss-green-text);font:600 11px/1 var(--dss-mono);
}
.dss-scope .dss-card-risk p{color:var(--dss-ink-2)}
.dss-scope .dss-table{
  width:100%;margin:14px 0;border:1px solid var(--dss-line);border-left:3px solid var(--dss-blue);
  border-radius:12px;border-collapse:separate;border-spacing:0;overflow:hidden;
  background:linear-gradient(135deg,#eef4ff,#ffffff 62%);
  box-shadow:var(--dss-shadow);font-size:13px;color:var(--dss-ink-2);
}
.dss-scope .dss-table thead th{
  height:auto;padding:10px 16px!important;background:var(--dss-head-bg)!important;border-bottom:0;
  color:var(--dss-th-text)!important;font:600 11.5px/1.5 var(--dss-sans)!important;letter-spacing:.08em!important;text-align:left;
}
.dss-scope .dss-table th:nth-child(1),.dss-scope .dss-table td:nth-child(1){width:26%}
.dss-scope .dss-table th:nth-child(2),.dss-scope .dss-table td:nth-child(2){width:18%}
.dss-scope .dss-table tbody td{
  padding:11px 16px!important;border-bottom:1px solid var(--dss-line)!important;background:transparent;
  color:var(--dss-ink-2)!important;font-size:13px!important;line-height:1.55!important;vertical-align:middle;
}
.dss-scope .dss-table tbody td:first-child{color:var(--dss-ink)!important;font-weight:600!important;font-size:13.5px!important}
.dss-scope .dss-table tbody tr:nth-child(even){background:var(--dss-zebra)}
.dss-scope .dss-table tbody tr:last-child td{border-bottom:0}
.dss-scope .dss-table td[data-dsh-structured-status-cell]{white-space:nowrap}
.dss-scope .dss-status{
  display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:999px;
  font-size:11px;font-weight:600;line-height:1.5;
}
.dss-scope .dss-status::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.dss-scope .dss-status-success{background:#ecfdf3;color:#067647}
.dss-scope .dss-status-warn{background:#fffaeb;color:#b54708}
.dss-scope .dss-status-error{background:#fef3f2;color:#b42318}
.dss-scope .dss-code{
  margin:14px 0;padding:14px 16px;border:1px solid var(--dss-line);
  border-left:3px solid var(--dss-blue);border-radius:12px;
  background:linear-gradient(135deg,#eef4ff,#ffffff 62%);
  box-shadow:var(--dss-shadow);
}
.dss-scope .dss-code > [class*="_bannerWrap"]{margin:0;padding:0;border:0;background:none}
.dss-scope .dss-code [data-code-block-banner]{
  display:flex;align-items:center;justify-content:space-between;gap:10px;
  margin:0 0 10px;padding:2px 0 7px!important;border:0;border-bottom:1px solid var(--dss-line);
  border-radius:0;background:transparent!important;color:var(--dss-blue-text)!important;
  font:700 12px/1.5 var(--dss-sans)!important;letter-spacing:.04em;text-transform:none;
}
.dss-scope .dss-code [data-code-block-banner]::before{
  content:"代码 · ";flex:none;color:var(--dss-blue-text);
}
.dss-scope .dss-code [data-code-block-banner] > [class*="_heading"]{
  flex:1;min-width:0;justify-content:flex-start;text-align:left;color:inherit;
}
.dss-scope .dss-code [data-code-block-banner] > [class*="_actions"]{margin-left:auto;flex:none}
.dss-scope .dss-code > [data-code-block-content]{padding:0}
.dss-scope .dss-code pre{
  margin:0;padding:12px 14px;border:1px solid var(--dss-code-border);border-radius:8px;
  background:var(--dss-code-bg)!important;color:var(--dss-code-text)!important;
  font:12.5px/1.7 var(--dss-mono)!important;overflow:auto;
}
.dss-scope .dss-copy{
  display:grid;place-items:center;width:24px;height:24px;padding:0;border:0;border-radius:5px;
  background:transparent;color:var(--dss-ink-3);cursor:pointer;
}
.dss-scope .dss-copy:hover{background:var(--dss-paper-2);color:var(--dss-ink)}
.dss-scope .dss-copy-icon{position:relative;display:inline-block;width:13px;height:13px}
.dss-scope .dss-copy-icon::before{content:"";position:absolute;inset:0 3px 3px 0;border:1.5px solid currentColor;border-radius:2px}
.dss-scope .dss-copy-icon::after{content:"";position:absolute;inset:3px 0 0 3px;border:1.5px solid currentColor;border-radius:2px}
.dss-scope .dss-copy-ok{display:none;font:700 12px/1 var(--dss-mono)}
.dss-scope .dss-copy[data-copied="1"] .dss-copy-icon{display:none}
.dss-scope .dss-copy[data-copied="1"] .dss-copy-ok{display:inline;color:var(--dss-green)}
body[data-ds-dark-theme] .dss-scope .dss-card-conclusion,
body[data-ds-dark-theme] .dss-scope .dss-card-accept,
body[data-ds-dark-theme] .dss-scope .dss-card-statement{
  background:linear-gradient(135deg,rgba(37,99,235,.18),rgba(37,99,235,0) 62%),var(--dss-paper);
}
body[data-ds-dark-theme] .dss-scope .dss-card-next{
  background:linear-gradient(180deg,rgba(16,185,129,.14),rgba(16,185,129,0) 72%),var(--dss-paper);
  border-left-color:#10b981;
}
body[data-ds-dark-theme] .dss-scope .dss-card-risk{
  background:linear-gradient(180deg,rgba(245,158,11,.12),rgba(245,158,11,0) 70%),var(--dss-paper);
  border-left-color:#f59e0b;
}
body[data-ds-dark-theme] .dss-scope .dss-table,
body[data-ds-dark-theme] .dss-scope .dss-code{
  background:linear-gradient(135deg,rgba(37,99,235,.18),rgba(37,99,235,0) 62%),var(--dss-paper);
}
body[data-ds-dark-theme] .dss-scope .dss-status-success{background:rgba(52,211,153,.16);color:#4ade80}
body[data-ds-dark-theme] .dss-scope .dss-status-warn{background:rgba(251,191,36,.14);color:#fbbf24}
body[data-ds-dark-theme] .dss-scope .dss-status-error{background:rgba(248,113,113,.16);color:#f87171}
body[data-ds-dark-theme] .dss-scope .dss-copy[data-copied="1"] .dss-copy-ok{color:#34d399}

[class*="_markdown_"]{font-size:13.5px;line-height:1.7;letter-spacing:.01em;color:var(--dss-ink-2)}
[class*="_markdown_"] p{margin:.7em 0}
[class*="_markdown_"] h1,[class*="_markdown_"] h2,[class*="_markdown_"] h3,
[class*="_markdown_"] h4,[class*="_markdown_"] h5,[class*="_markdown_"] h6{
  color:var(--dss-ink);font-family:var(--dss-serif);line-height:1.32;letter-spacing:-.01em;
}
[class*="_markdown_"] h1{font-size:26px;font-weight:700;margin:32px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--dss-line)}
[class*="_markdown_"] h2{font-size:21px;font-weight:700;margin:28px 0 10px;padding-left:12px;border-left:3px solid var(--dss-blue)}
[class*="_markdown_"] h3{font-size:19px;font-weight:650;margin:22px 0 8px}
[class*="_markdown_"] h2[data-dsh-structured-icon]{padding-left:42px;text-indent:-30px}
[class*="_markdown_"] h3[data-dsh-structured-icon]{padding-left:30px;text-indent:-30px}
[class*="_markdown_"] h4{font-size:15px;font-weight:650;margin:16px 0 6px}
[class*="_markdown_"] h5,[class*="_markdown_"] h6{font-size:13px;font-weight:700;margin:14px 0 6px;color:var(--dss-ink-3);text-transform:uppercase;letter-spacing:.06em}
[class*="_markdown_"] h2[data-dsh-structured-icon]::before,
[class*="_markdown_"] h3[data-dsh-structured-icon]::before{
  content:attr(data-dsh-structured-icon);display:inline-flex;align-items:center;justify-content:center;
  width:22px;height:22px;margin-right:8px;text-indent:0;border-radius:6px;
  background:var(--dss-blue-soft);color:var(--dss-blue-text);font-family:var(--dss-sans);font-size:12px;font-weight:700;vertical-align:2px;
}
[class*="_markdown_"] strong{font-weight:700;color:var(--dss-ink)}
[class*="_markdown_"] a{color:var(--dss-blue-text);text-decoration:none;border-bottom:1px solid rgba(37,99,235,.38)}
[class*="_markdown_"] a:hover{border-bottom-color:var(--dss-blue)}
[class*="_markdown_"] ul,[class*="_markdown_"] ol{padding-left:1.5em;margin:.6em 0}
[class*="_markdown_"] li{margin:.28em 0}
[class*="_markdown_"] li::marker{color:var(--dss-blue-text)}
[class*="_markdown_"] hr{height:1px;border:0;margin:28px 0;background:linear-gradient(90deg,transparent,var(--dss-line),transparent)}
[class*="_markdown_"] blockquote:not(.dss-card){
  margin:14px 0;padding:10px 14px;border-left:3px solid var(--dss-line-strong);
  background:var(--dss-paper-2);border-radius:0 10px 10px 0;color:var(--dss-ink-2);
}
[class*="_markdown_"] p[data-dsh-structured-lead="table"]{border:0;padding:0;margin:12px 0 8px;font-size:13.5px;color:var(--dss-ink-2)}
[class*="_markdown_"] p[data-dsh-structured-lead="table"] strong{font-size:13.5px;font-weight:650;color:var(--dss-ink)}
[class*="_markdown_"] :not(pre)>code{
  background:var(--dss-paper-2);border:1px solid var(--dss-line);border-radius:6px;
  padding:.12em .38em;font-size:.9em;color:var(--dss-blue-text);overflow-wrap:anywhere;
}
[class*="_markdown_"] p[data-dsh-structured-status],[class*="_markdown_"] li[data-dsh-structured-status]{
  border-left:3px solid var(--dss-blue);background:var(--dss-blue-soft);
  border-radius:0 6px 6px 0;padding:4px 10px;margin:.4em 0;
}
[class*="_markdown_"] p[data-dsh-structured-status="success"],[class*="_markdown_"] li[data-dsh-structured-status="success"]{--dss-blue:var(--dss-green);--dss-blue-soft:var(--dss-green-soft)}
[class*="_markdown_"] p[data-dsh-structured-status="warn"],[class*="_markdown_"] li[data-dsh-structured-status="warn"]{--dss-blue:var(--dss-amber);--dss-blue-soft:var(--dss-amber-soft)}
[class*="_markdown_"] p[data-dsh-structured-status="error"],[class*="_markdown_"] li[data-dsh-structured-status="error"]{--dss-blue:var(--dss-red);--dss-blue-soft:var(--dss-red-soft)}
@media (max-width:720px){
  [class*="_markdown_"]{font-size:13px}
  [class*="_markdown_"] h1{font-size:22px}
  [class*="_markdown_"] h2{font-size:18px}
  [class*="_markdown_"] .dss-table{font-size:12px}
  [class*="_markdown_"] .dss-table thead th,[class*="_markdown_"] .dss-table tbody td{padding:8px 10px}
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

    const CARD_CLASSES = {
      conclusion: 'dss-card-conclusion',
      decision: 'dss-card-conclusion',
      metric: 'dss-card-conclusion',
      key: 'dss-card-conclusion',
      next: 'dss-card-next',
      risk: 'dss-card-risk',
      accept: 'dss-card-accept',
      statement: 'dss-card-statement',
    }
    const ALL_CARD_CLASSES = ['dss-card', ...new Set(Object.values(CARD_CLASSES))]

    const classListOf = (element) => (element && element.classList && typeof element.classList.add === 'function' ? element.classList : null)

    const setCardClass = (block, type) => {
      const list = classListOf(block)
      if (!list) return
      for (const name of ALL_CARD_CLASSES) list.remove(name)
      if (type === null) return
      list.add('dss-card')
      const name = CARD_CLASSES[type]
      if (name) list.add(name)
    }

    const toggleClass = (element, name, on) => {
      const list = classListOf(element)
      if (!list) return
      if (on) list.add(name)
      else list.remove(name)
    }

    const markScopes = (root) => {
      const scopes = []
      if (root && typeof root.matches === 'function' && root.matches('[class*="_markdown_"]')) scopes.push(root)
      for (const element of root?.querySelectorAll?.('[class*="_markdown_"]') ?? []) scopes.push(element)
      for (const element of scopes) toggleClass(element, 'dss-scope', true)
    }

    const STATUS_LABELS = { success: '通过', warn: '观察', error: '阻断' }

    const ensureStatusPill = (cell, status) => {
      if (!cell || typeof cell.appendChild !== 'function') return
      let pill = typeof cell.querySelector === 'function' ? cell.querySelector(`[${STATUS_PILL_ATTR}]`) : null
      if (!pill) {
        const doc = cell.ownerDocument ?? (typeof document !== 'undefined' ? document : null)
        if (!doc || typeof doc.createElement !== 'function') return
        pill = doc.createElement('span')
        pill.setAttribute(STATUS_PILL_ATTR, '1')
        cell.textContent = ''
        cell.appendChild(pill)
      }
      pill.className = 'dss-status dss-status-' + status
      pill.textContent = STATUS_LABELS[status] ?? status
    }

    const clearStatusPills = (row) => {
      for (const cell of row?.cells ?? []) {
        cell?.removeAttribute?.(STATUS_CELL_ATTR)
        const pill = typeof cell?.querySelector === 'function' ? cell.querySelector(`[${STATUS_PILL_ATTR}]`) : null
        pill?.remove?.()
      }
    }

    const ensureCodeCopy = (code) => {
      const banner = code?.querySelector?.('[data-code-block-banner]')
      if (!banner || typeof banner.appendChild !== 'function') return
      if (banner.querySelector?.(`[${COPY_ATTR}]`) || banner.querySelector?.('button')) return
      const doc = code.ownerDocument ?? (typeof document !== 'undefined' ? document : null)
      if (!doc || typeof doc.createElement !== 'function') return
      const button = doc.createElement('button')
      button.setAttribute('type', 'button')
      button.setAttribute('class', 'dss-copy')
      button.setAttribute(COPY_ATTR, '1')
      button.setAttribute('aria-label', '复制代码')
      const icon = doc.createElement('span')
      icon.setAttribute('class', 'dss-copy-icon')
      const ok = doc.createElement('span')
      ok.setAttribute('class', 'dss-copy-ok')
      ok.textContent = '✓'
      button.appendChild(icon)
      button.appendChild(ok)
      button.addEventListener?.('click', async () => {
        const pre = code.querySelector?.('pre')
        const text = pre?.textContent ?? code.textContent ?? ''
        try {
          if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
        } catch {
          // 剪贴板被宿主拒绝时保留反馈，不阻断渲染。
        }
        button.setAttribute('data-copied', '1')
        try { setTimeout(() => button.removeAttribute('data-copied'), 1200) } catch {}
      })
      banner.appendChild(button)
    }

    function decorateStructured(root) {
      markScopes(root)
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
          setCardClass(block, null)
          continue
        }
        block.setAttribute(CARD_ATTR, '1')
        block.setAttribute(CARD_TYPE_ATTR, type)
        block.removeAttribute(LEAD_ATTR)
        block.setAttribute(TONE_ATTR, type === 'risk' ? 'warn' : type === 'accept' ? 'success' : 'info')
        setCardClass(block, type)
        if (type !== 'statement') {
          const label = labelOf(block)
          const strong = firstParagraph(block)?.firstElementChild
          if (label && strong?.tagName === 'STRONG') strong.textContent = label
        }
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

      for (const table of root.querySelectorAll('[class*="_markdown_"] table')) {
        if (inGenui(table)) {
          table.removeAttribute(SKIP_ATTR)
          table.removeAttribute(STATUS_TABLE_ATTR)
          toggleClass(table, 'dss-table', false)
          continue
        }
        if (inDiff(table)) {
          table.setAttribute(SKIP_ATTR, 'table')
          table.removeAttribute(STATUS_TABLE_ATTR)
          toggleClass(table, 'dss-table', false)
          continue
        }
        table.removeAttribute(SKIP_ATTR)
        toggleClass(table, 'dss-table', true)
        const rows = [...table.querySelectorAll('tbody tr')]
        let statusTable = rows.length > 0
        for (const row of rows) {
          if (row.closest?.('thead') || row.closest?.(`[${SKIP_ATTR}="table"]`)) {
            row.removeAttribute(ROW_ATTR)
            statusTable = false
            continue
          }
          const cells = row.cells && row.cells.length
            ? [...row.cells]
            : [...(row.querySelectorAll?.('td,th') ?? [])]
          let status = null
          let statusCell = null
          for (const cell of cells) {
            const candidate = statusFor((cell.textContent ?? '').trimStart())
            if (candidate !== null) {
              status = candidate
              statusCell = cell
              break
            }
          }
          if (status === null) {
            const previous = row.getAttribute?.(ROW_ATTR)
            if (previous) {
              status = previous
              statusCell = cells.find((cell) => cell.getAttribute?.(STATUS_CELL_ATTR) === '1') ?? null
            }
          }
          for (const cell of cells) {
            if (cell === statusCell) continue
            cell.removeAttribute?.(STATUS_CELL_ATTR)
            const pill = typeof cell.querySelector === 'function' ? cell.querySelector(`[${STATUS_PILL_ATTR}]`) : null
            pill?.remove?.()
          }
          if (status === null) {
            row.removeAttribute(ROW_ATTR)
            statusTable = false
          } else {
            row.setAttribute(ROW_ATTR, status)
            statusCell?.setAttribute?.(STATUS_CELL_ATTR, '1')
            ensureStatusPill(statusCell, status)
          }
        }
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
          toggleClass(code, 'dss-code', false)
          continue
        }
        if (inDiff(code) || isDiffCode(code)) {
          code.removeAttribute(LANG_ATTR)
          code.removeAttribute(CODE_ATTR)
          code.setAttribute(SKIP_ATTR, 'code')
          toggleClass(code, 'dss-code', false)
          continue
        }
        code.removeAttribute(SKIP_ATTR)
        code.setAttribute(CODE_ATTR, '1')
        toggleClass(code, 'dss-code', true)
        const lang = bannerLanguage(code)
        if (lang.length === 0) code.removeAttribute(LANG_ATTR)
        else code.setAttribute(LANG_ATTR, lang)
        ensureCodeCopy(code)
      }
    }

    // Actual replies and the settings preview both run through this same
    // structural decorator; the preview only differs in its host container.
    function decorate(root) {
      decorateStructured(root)
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

      const byteLength = (text) => new TextEncoder().encode(text).length
      const TONE_SCHEMA = 'dsh-structured/tone@1'
      const TONE_SKIP_DEFAULT = ['code', 'diff', 'error', 'short', 'table']
      const TONE_MAX = 64 * 1024
      const isToneObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
      const toneString = (value, max) => typeof value === 'string' && value.length <= max
      const emptyTone = () => ({ schema: TONE_SCHEMA, prefix: 'Boss，', style: '像朋友说话，口语化；保持简洁。', suffix: '', skipIn: [...TONE_SKIP_DEFAULT] })
      const cloneTone = (doc) => JSON.parse(JSON.stringify(doc))
      const toneJson = (doc) => JSON.stringify(doc, null, 2)
      const parseToneJson = (text) => {
        if (typeof text !== 'string' || text.trim() === '') return { ok: false, error: '空 JSON', pointer: '/' }
        if (byteLength(text) > TONE_MAX) return { ok: false, error: '超过 64KB', pointer: '/' }
        let doc
        try { doc = JSON.parse(text) } catch (error) { return { ok: false, error: 'JSON 解析失败：' + String(error.message ?? error), pointer: '/' } }
        if (!isToneObject(doc)) return { ok: false, error: '顶层必须是对象', pointer: '/' }
        if (doc.schema !== TONE_SCHEMA) return { ok: false, error: 'schema 必须是 ' + TONE_SCHEMA, pointer: '/schema' }
        const unknown = Object.keys(doc).filter((key) => !['schema', 'prefix', 'style', 'suffix', 'skipIn'].includes(key))
        if (unknown.length) return { ok: false, error: '未知字段', pointer: '/' + unknown[0] }
        if (!toneString(doc.prefix, 80)) return { ok: false, error: 'prefix 需为 ≤80 字字符串', pointer: '/prefix' }
        if (!toneString(doc.style, 1200) || doc.style.trim() === '') return { ok: false, error: 'style 必填且 ≤1200 字', pointer: '/style' }
        if (!toneString(doc.suffix, 80)) return { ok: false, error: 'suffix 需为 ≤80 字字符串', pointer: '/suffix' }
        if (doc.skipIn !== undefined && (!Array.isArray(doc.skipIn) || doc.skipIn.length > 5 || new Set(doc.skipIn).size !== doc.skipIn.length || !doc.skipIn.every((item) => TONE_SKIP_DEFAULT.includes(item)))) return { ok: false, error: 'skipIn 无效', pointer: '/skipIn' }
        return { ok: true, doc }
      }
      const isLegacyToneText = (text) => {
        try {
          const doc = JSON.parse(text)
          if (!isToneObject(doc)) return false
          return doc.schema === 'dsh-structured/persona@1' || ['meta', 'identity', 'address', 'tone', 'habits', 'closing', 'examples', 'render'].some((key) => key in doc)
        } catch {
          return false
        }
      }
      const describeInvalidTone = (text, parsed) => {
        if (isLegacyToneText(text)) return '旧格式：只接受 tone@1（schema/prefix/style/suffix/skipIn），文本已保留，请迁移后再保存'
        return parsed.error + ' (' + parsed.pointer + ')'
      }
      const statusLabels = {
        off: '已关闭', saved: '已保存，全局生效（新消息使用）', dirty: '', saving: '保存中',
        savedOff: '已保存，未启用', draftOff: '', failed: '保存失败', importInvalid: 'JSON 无效', tooLarge: '超过 64KB', readonly: '只读',
      }
      const personaUiFlags = ({ status, writable = true, mode = 'basic' }) => {
        const busy = status === 'saving'
        const invalid = status === 'importInvalid' || status === 'tooLarge'
        const readonly = writable === false
        const dirty = ['dirty', 'draftOff', 'failed'].includes(status)
        return {
          busy, invalid, readonly, dirty,
          formLocked: readonly || busy || invalid,
          canSave: !readonly && !busy && !invalid && dirty,
          canBasic: !invalid,
          mode,
        }
      }

      const EMOJIS = ['🐳', '💗', '🐟', '🌊', '😄', '😎', '🥹', '🤔', '✨', '🔥', '🚀', '💡', '📌', '✅', '⚠️', '🎯', '🧠', '🛠️', '📊', '🌎', '🌙', '☕', '🍚', '🐋', '🫧', '💙', '🙌', '👀', '😤', '😭', '🤝', '💬', '😀', '😂', '🤣', '😊', '😍', '🥰', '😉', '🤗', '🤭', '😴', '😮', '😲', '🥳', '🤯', '😇', '🙃', '👍', '👎', '👌', '✌️', '🤞', '👏', '🙏', '💪', '⚡', '🎉', '❤️', '💜', '🍀', '🌈', '📢', '📝']
      const TEMPLATE_KEY = 'dsh-structured.tone.v5.templates'
      const readTemplateState = () => {
        try {
          const storage = typeof window !== 'undefined' ? window.localStorage : null
          const parsed = JSON.parse(storage?.getItem(TEMPLATE_KEY) ?? 'null')
          if (parsed && Array.isArray(parsed.deletedIds) && Array.isArray(parsed.customs)) return parsed
        } catch {}
        return { deletedIds: [], customs: [] }
      }
      const writeTemplateState = (next) => {
        try {
          if (typeof window !== 'undefined') window.localStorage?.setItem(TEMPLATE_KEY, JSON.stringify(next))
        } catch {}
      }
      const defaultTone = () => {
        const parsed = parseToneJson(PERSONA_WHALE_JSON)
        return parsed.ok ? cloneTone(parsed.doc) : emptyTone()
      }
      const DEFAULT_TEMPLATE = { id: 'whale', builtin: true, label: '蓝色大肥鱼', name: DEFAULT_PROFILE_NAME, signature: DEFAULT_PROFILE_SIGNATURE, desc: '默认预设' }
      const templateList = (templateState) => [DEFAULT_TEMPLATE, ...(templateState.customs ?? [])].filter((item) => !(templateState.deletedIds ?? []).includes(item.id))
      const templateDoc = (item) => {
        if (item.builtin) return defaultTone()
        return { ...emptyTone(), ...(item.doc ?? {}), schema: TONE_SCHEMA, skipIn: [...TONE_SKIP_DEFAULT] }
      }
      const PREVIEW_SAMPLES = {
        playful: {
          tableLead: '两条主线，先看验收状态：',
          codeLead: '动态加载这一处，改成这样：',
          normal: {
            lead: '这版能上，但别一步到位。',
            sub: '先灰度一周；回滚脚本没验收前，不加自动更新。',
            steps: ['先拿现网账号跑一条真实链路。', '把失败 / 回滚 / 权限边界写进验收。', '灰度一周，再决定要不要默认开启。'],
            risk: '自动更新会跳过手动确认；回滚没演练，等于没有。',
          },
        },
        direct: {
          tableLead: '两条主线，先看验收状态：',
          codeLead: '动态加载这一处，改成这样：',
          normal: {
            lead: '能上，分两步走。',
            sub: '灰度一周；回滚没验收，不动自动更新。',
            steps: ['跑通一条真实链路。', '验收失败 / 回滚 / 权限边界。', '一周后决定默认开关。'],
            risk: '自动更新跳过确认；回滚未演练。',
          },
        },
        soft: {
          tableLead: '两条主线，先看验收状态：',
          codeLead: '动态加载这一处，改成这样：',
          normal: {
            lead: '可以先上一版，稳一点。',
            sub: '建议先灰度一周；自动更新等回滚验收后再加。',
            steps: ['先用现网账号跑一条链路看看。', '把回滚和权限边界补进验收。', '观察一周，我们再定默认开启。'],
            risk: '自动更新会跳过确认，回滚还没演练过，先别开。',
          },
        },
      }
      const PREVIEW_TABLE = {
        head: ['模块', '状态', '说明'],
        rows: [
          ['注入链路', 'success', '新会话 system prompt 命中'],
          ['表格渲染', 'success', '斑马纹与状态列生效'],
          ['代码皮肤', 'success', '横幅与语言色点正常'],
          ['暗色主题', 'warn', '部分色值对比度待校'],
          ['子代理注入', 'warn', '默认关闭，待拍板'],
          ['自动更新', 'error', '回滚脚本未验收'],
        ],
      }
      const PREVIEW_STATUS_TEXT = { success: '✅ 通过', warn: '⚠ 观察', error: '❌ 阻断' }
      const PREVIEW_CODE = [
        "const KEY = 'dsh-structured.tone'",
        'export function loadTone() {',
        '  try {',
        '    const raw = localStorage.getItem(KEY)',
        '    if (!raw) return DEFAULT_TONE',
        '    const doc = JSON.parse(raw)',
        '    return parseTone(doc) ?? DEFAULT_TONE',
        '  } catch {',
        '    return DEFAULT_TONE // fail-open：读失败不阻断会话',
        '  }',
        '}',
      ]
      const previewVariant = (styleText) => {
        if (styleText.includes('直接')) return PREVIEW_SAMPLES.direct
        if (styleText.includes('温和')) return PREVIEW_SAMPLES.soft
        return PREVIEW_SAMPLES.playful
      }
      const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
      const previewRawHtml = (sample, styleText) => {
        const variant = previewVariant(String(styleText ?? ''))
        if (sample === 'table') {
          return `<p><strong>表格结论：</strong> ${escapeHtml(variant.tableLead)}</p><table><thead><tr>${PREVIEW_TABLE.head.map((head) => `<th>${escapeHtml(head)}</th>`).join('')}</tr></thead><tbody>${PREVIEW_TABLE.rows.map(([module, state, note]) => `<tr><td>${escapeHtml(module)}</td><td>${escapeHtml(PREVIEW_STATUS_TEXT[state])}</td><td>${escapeHtml(note)}</td></tr>`).join('')}</tbody></table>`
        }
        if (sample === 'code') {
          return `<p>${escapeHtml(variant.codeLead)}</p><div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_preview">tone-loader.js</span><div class="_actions_preview"></div></div></div><div data-code-block-content><pre>${escapeHtml(PREVIEW_CODE.join('\n'))}</pre></div></div>`
        }
        return `<blockquote><p><strong>结论</strong></p><p><strong>${escapeHtml(variant.normal.lead)}</strong></p><p>${escapeHtml(variant.normal.sub)}</p></blockquote><blockquote><p><strong>下一步</strong></p><ol>${variant.normal.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol></blockquote><blockquote><p><strong>风险</strong></p><p>${escapeHtml(variant.normal.risk)}</p></blockquote>`
      }
      // The preview is not a second card builder: it builds a sample DOM, then
      // sends it through the exact same structural decorator as real replies.
      const previewHtml = (sample, styleText, docOverride) => {
        const doc = docOverride ?? (typeof document !== 'undefined' ? document : null)
        if (!doc || typeof doc.createElement !== 'function') return ''
        const host = doc.createElement('div')
        host.className = 'dss-scope _markdown_preview'
        host.innerHTML = previewRawHtml(sample, styleText)
        decorateStructured(host)
        return host.innerHTML
      }
      const useEffect = typeof react.useEffect === 'function' ? react.useEffect : () => {}

      const PersonaEditor = ({ state, setField, mutateFields, readFields, tabGuard }) => {
        const initialRaw = String(fieldValue(state.value, { field: 'persona', fallback: PERSONA_WHALE_JSON }) ?? '')
        const initialParsed = parseToneJson(initialRaw)
        const [doc, setDoc] = react.useState(initialParsed.ok ? initialParsed.doc : defaultTone())
        const [enabled, setEnabled] = react.useState(fieldValue(state.value, { field: 'personaEnabled', fallback: false }) === true)
        const [name, setName] = react.useState(String(fieldValue(state.value, { field: 'personaName', fallback: DEFAULT_PROFILE_NAME }) ?? DEFAULT_PROFILE_NAME))
        const [signature, setSignature] = react.useState(String(fieldValue(state.value, { field: 'personaSignature', fallback: DEFAULT_PROFILE_SIGNATURE }) ?? DEFAULT_PROFILE_SIGNATURE))
        const [avatar, setAvatar] = react.useState(String(fieldValue(state.value, { field: 'personaAvatar', fallback: '' }) ?? ''))
        const [templateId, setTemplateId] = react.useState('whale')
        const [templates, setTemplates] = react.useState(readTemplateState)
        const [status, setStatus] = react.useState(initialParsed.ok ? (enabled ? 'saved' : 'off') : 'dirty')
        const [error, setError] = react.useState(initialParsed.ok ? '' : '当前配置不是有效的 tone@1，已载入默认模板；保存会覆盖。')
        const [notice, setNotice] = react.useState('')
        const [open, setOpen] = react.useState(false)
        const [emojiFor, setEmojiFor] = react.useState(null)
        const [sample, setSample] = react.useState('normal')
        const readonly = state.writable === false
        const busy = status === 'saving'
        const formLocked = readonly || busy
        const dirty = ['dirty', 'draftOff', 'failed'].includes(status)
        const canSave = !readonly && !busy && dirty
        const confirmDirty = () => !dirty || typeof window === 'undefined' || typeof window.confirm !== 'function' || window.confirm('有未保存修改，确认丢弃？')
        if (tabGuard) tabGuard.confirm = confirmDirty
        const markDirty = () => {
          setStatus('dirty')
          setError('')
          setNotice('')
        }
        const updateTone = (key, value) => {
          if (formLocked) return
          setDoc((current) => ({ ...current, [key]: value }))
          markDirty()
        }
        const updateProfile = (key, value) => {
          if (formLocked) return
          if (key === 'name') setName(value)
          else if (key === 'signature') setSignature(value)
          markDirty()
        }
        const selectTemplate = (id) => {
          if (formLocked) return
          const item = templateList(templates).find((entry) => entry.id === id)
          if (!item) return
          setDoc(templateDoc(item))
          setName(item.name ?? DEFAULT_PROFILE_NAME)
          setSignature(item.signature ?? DEFAULT_PROFILE_SIGNATURE)
          setTemplateId(item.id)
          setOpen(false)
          markDirty()
        }
        const deleteTemplate = (id) => {
          if (formLocked) return
          const next = id === 'whale'
            ? { ...templates, deletedIds: [...new Set([...(templates.deletedIds ?? []), 'whale'])] }
            : { ...templates, customs: (templates.customs ?? []).filter((item) => item.id !== id) }
          setTemplates(next)
          writeTemplateState(next)
          if (templateId === id) setTemplateId(null)
        }
        const saveAsTemplate = () => {
          if (formLocked) return
          const label = name.trim() || '我的模板'
          const item = {
            id: 'cus-' + Date.now(),
            builtin: false,
            label,
            name,
            signature,
            desc: '自定义 · ' + new Date().toLocaleDateString(),
            doc: { ...doc },
          }
          const next = { ...templates, customs: [...(templates.customs ?? []), item] }
          setTemplates(next)
          writeTemplateState(next)
          setNotice('已另存为模板：' + label)
        }
        const resetDefault = () => {
          if (formLocked) return
          if (!confirmDirty()) return
          setDoc(defaultTone())
          setName(DEFAULT_PROFILE_NAME)
          setSignature(DEFAULT_PROFILE_SIGNATURE)
          setAvatar('')
          setEnabled(false)
          setStatus('draftOff')
          setError('')
          setNotice('已恢复默认模板')
          setTemplateId('whale')
          setTemplates({ deletedIds: [], customs: [] })
          writeTemplateState({ deletedIds: [], customs: [] })
        }
        const handleAvatar = (event) => {
          const file = event.target?.files?.[0]
          if (event.target) event.target.value = ''
          if (!file || formLocked) return
          if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
            setError('头像仅支持 png / jpeg / webp')
            setStatus('failed')
            return
          }
          if (typeof FileReader === 'undefined' || typeof Image === 'undefined' || typeof document === 'undefined') return
          const reader = new FileReader()
          reader.onload = () => {
            const image = new Image()
            image.onload = () => {
              try {
                const canvas = document.createElement('canvas')
                canvas.width = 128
                canvas.height = 128
                const context = canvas.getContext('2d')
                const side = Math.min(image.naturalWidth, image.naturalHeight)
                context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 128, 128)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
                if (dataUrl.length > 64 * 1024) {
                  setError('头像压缩后仍超过 64KB，请换一张更小的图')
                  setStatus('failed')
                  return
                }
                setAvatar(dataUrl)
                markDirty()
                setNotice('头像已更新，保存后生效')
              } catch (avatarError) {
                setError('头像处理失败：' + String(avatarError.message ?? avatarError))
                setStatus('failed')
              }
            }
            image.onerror = () => { setError('头像图片无法读取'); setStatus('failed') }
            image.src = String(reader.result)
          }
          reader.onerror = () => { setError('头像读取失败'); setStatus('failed') }
          reader.readAsDataURL(file)
        }
        const insertEmoji = (field, emoji) => {
          if (formLocked) return
          const current = String(doc[field] ?? '')
          const input = typeof document !== 'undefined' ? document.getElementById('dss-' + field) : null
          const start = input && Number.isInteger(input.selectionStart) ? input.selectionStart : current.length
          const end = input && Number.isInteger(input.selectionEnd) ? input.selectionEnd : start
          updateTone(field, current.slice(0, start) + emoji + current.slice(end))
          setEmojiFor(null)
          try {
            requestAnimationFrame(() => {
              input?.focus?.()
              input?.setSelectionRange?.(start + emoji.length, start + emoji.length)
            })
          } catch {}
        }
        const handlePreviewClick = async (event) => {
          const button = event.target?.closest?.('[data-dsh-structured-copy]')
          if (!button) return
          const code = button.closest?.('.dss-code')
          const text = code?.querySelector?.('pre')?.textContent ?? ''
          try {
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
          } catch {}
          button.setAttribute('data-copied', '1')
          try { setTimeout(() => button.removeAttribute('data-copied'), 1200) } catch {}
        }
        useEffect(() => {
          if (typeof document === 'undefined' || (!open && emojiFor === null)) return
          const onDocumentClick = (event) => {
            const target = event.target
            if (open && !target?.closest?.('.dss-source')) setOpen(false)
            if (emojiFor !== null && !target?.closest?.('.dss-control')) setEmojiFor(null)
          }
          const onDocumentKey = (event) => {
            if (event.key === 'Escape') {
              setOpen(false)
              setEmojiFor(null)
            }
          }
          document.addEventListener('click', onDocumentClick)
          document.addEventListener('keydown', onDocumentKey)
          return () => {
            document.removeEventListener('click', onDocumentClick)
            document.removeEventListener('keydown', onDocumentKey)
          }
        }, [open, emojiFor])
        const save = async () => {
          if (!canSave) return
          const parsed = parseToneJson(JSON.stringify(doc))
          if (!parsed.ok) {
            setStatus('failed')
            setError(describeInvalidTone(JSON.stringify(doc), parsed))
            return
          }
          const nextRaw = JSON.stringify(parsed.doc, null, 2)
          const nextRevision = (Number(fieldValue(state.value, { field: 'personaRevision', fallback: 0 })) || 0) + 1
          const previous = {
            persona: String(fieldValue(state.value, { field: 'persona', fallback: PERSONA_WHALE_JSON }) ?? ''),
            personaEnabled: fieldValue(state.value, { field: 'personaEnabled', fallback: false }) === true,
            personaRevision: Number(fieldValue(state.value, { field: 'personaRevision', fallback: 0 })) || 0,
            personaName: String(fieldValue(state.value, { field: 'personaName', fallback: DEFAULT_PROFILE_NAME }) ?? DEFAULT_PROFILE_NAME),
            personaSignature: String(fieldValue(state.value, { field: 'personaSignature', fallback: DEFAULT_PROFILE_SIGNATURE }) ?? DEFAULT_PROFILE_SIGNATURE),
            personaAvatar: String(fieldValue(state.value, { field: 'personaAvatar', fallback: '' }) ?? ''),
          }
          const writes = [
            ['persona', nextRaw],
            ['personaEnabled', enabled],
            ['personaRevision', nextRevision],
            ['personaName', name],
            ['personaSignature', signature],
            ['personaAvatar', avatar],
          ]
          const finishSaved = () => {
            setDoc(parsed.doc)
            setStatus(enabled ? 'saved' : 'savedOff')
            setError('')
            setNotice('')
          }
          setStatus('saving')
          if (typeof mutateFields === 'function') {
            try {
              const accepted = await mutateFields(writes.map(([field, value]) => ({ op: 'set', path: [field], value })), state.revision)
              if (accepted === false) throw new Error('批量写入被宿主拒绝')
              finishSaved()
            } catch (saveError) {
              setStatus('failed')
              setError('批量写入失败：' + String(saveError.message ?? saveError))
            }
            return
          }
          const written = []
          try {
            for (const [field, value] of writes) {
              const result = await setField(field, value)
              if (result === false) throw new Error(field + ' write rejected')
              written.push([field, previous[field]])
            }
            if (typeof readFields !== 'function') throw new Error('缺少配置读回接口，无法校验保存结果')
            const snapshot = await readFields()
            const current = snapshot && typeof snapshot === 'object' ? snapshot.value : undefined
            const mismatched = []
            if (!current || current.persona !== nextRaw) mismatched.push('persona')
            if (!current || current.personaEnabled !== enabled) mismatched.push('personaEnabled')
            if (!current || current.personaRevision !== nextRevision) mismatched.push('personaRevision')
            if (!current || current.personaName !== name) mismatched.push('personaName')
            if (!current || current.personaSignature !== signature) mismatched.push('personaSignature')
            if (!current || current.personaAvatar !== avatar) mismatched.push('personaAvatar')
            if (mismatched.length) throw new Error('写后读回校验失败：' + mismatched.join(', '))
            finishSaved()
          } catch (saveError) {
            const rollbackErrors = []
            const rollback = async (field, value) => {
              const result = await setField(field, value)
              if (result === false) throw new Error('rejected')
            }
            for (const [field, value] of written.reverse()) {
              try { await rollback(field, value) } catch (rollbackError) { rollbackErrors.push(field + ': ' + String(rollbackError.message ?? rollbackError)) }
            }
            const base = String(saveError.message ?? saveError)
            setStatus('failed')
            setError(rollbackErrors.length ? '回滚失败，profile 可能半保存：' + base + '；' + rollbackErrors.join('；') : base)
          }
        }
        const variant = previewVariant(String(doc.style ?? ''))
        const statusText = error || notice || statusLabels[status] || ''
        const profileAvatar = avatar || DEFAULT_AVATAR
        const previewMarkup = previewHtml(sample, doc.style, typeof document !== 'undefined' ? document : null)
        const profileRows = () => {
          const list = templateList(templates)
          if (list.length === 0) return jsx('div', { className: 'dss-template-empty', children: '模板已全部删除 · 用底部「恢复默认」找回' })
          return jsx('div', {
            className: 'dss-template-list',
            children: list.map((item) => jsxs('div', {
              className: 'dss-template-row',
              children: [
                jsxs('button', {
                  type: 'button',
                  role: 'radio',
                  className: 'dss-template-option',
                  'aria-checked': String(templateId === item.id),
                  onClick: () => selectTemplate(item.id),
                  children: [
                    jsx('span', { className: 'mark', children: String(item.name || '?').charAt(0) }),
                    jsxs('span', { children: [jsx('strong', { children: item.label }), jsx('em', { children: item.desc })] }),
                  ],
                }),
                jsx('button', {
                  type: 'button',
                  className: 'dss-template-del',
                  title: '删除模板',
                  'aria-label': '删除模板',
                  onClick: (event) => { event.stopPropagation(); deleteTemplate(item.id) },
                  children: '×',
                }),
              ],
            })),
          })
        }
        return jsxs('div', {
          className: 'dss-config dss-scope',
          'data-dsh-persona': '1',
          children: [
            jsxs('div', {
              className: 'dss-section-head',
              children: [
                jsx('h2', { className: 'dss-section-title', children: '语气风格' }),
                jsx(ui.Switch, {
                  checked: enabled,
                  disabled: formLocked,
                  label: '启用语气风格',
                  onChange: (next) => {
                    if (formLocked) return
                    setEnabled(next)
                    setStatus(next ? 'dirty' : 'draftOff')
                    setError('')
                    setNotice('')
                  },
                }),
              ],
            }),
            jsx('p', { className: 'dss-note', children: '保存后全局生效（新消息使用）；当前正在生成的回合不回溯。' }),
            jsxs('section', {
              className: 'dss-profile',
              children: [
                jsxs('label', {
                  className: 'dss-profile-avatar',
                  title: '点击更换头像',
                  children: [
                    jsx('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', className: 'dss-hidden', disabled: formLocked, onChange: handleAvatar }),
                    jsx('img', { src: profileAvatar, alt: '头像' }),
                  ],
                }),
                jsxs('div', {
                  className: 'dss-profile-info',
                  children: [
                    jsx('input', { className: 'dss-profile-name', value: name, maxLength: 40, disabled: formLocked, 'aria-label': '显示名', placeholder: '显示名', onChange: (event) => updateProfile('name', event.target.value) }),
                    jsx('input', { className: 'dss-profile-sig', value: signature, maxLength: 60, disabled: formLocked, 'aria-label': '个性签名', placeholder: '个性签名', onChange: (event) => updateProfile('signature', event.target.value) }),
                  ],
                }),
                jsxs('div', {
                  className: 'dss-source',
                  children: [
                    jsxs('button', {
                      type: 'button',
                      className: 'dss-source-btn',
                      'aria-haspopup': 'true',
                      'aria-expanded': String(open),
                      disabled: formLocked,
                      onClick: (event) => { event.stopPropagation(); setOpen(!open) },
                      children: [jsx('span', { children: '切换人格' }), jsx('span', { className: 'dss-caret', 'aria-hidden': 'true' })],
                    }),
                    open ? jsxs('div', {
                      className: 'dss-popover',
                      role: 'radiogroup',
                      'aria-label': '选择起点模板',
                      children: [
                        profileRows(),
                        jsx('div', { className: 'dss-template-foot', children: jsx('button', { type: 'button', className: 'dss-template-save', onClick: saveAsTemplate, children: '＋ 将当前草稿另存为模板' }) }),
                      ],
                    }) : null,
                  ],
                }),
              ],
            }),
            jsxs('div', {
              className: 'dss-field',
              children: [
                jsxs('div', { className: 'dss-field-label', children: [jsx('label', { htmlFor: 'dss-prefix', children: '开场' }), jsx('span', { className: 'dss-hint', children: '放在最前面 · 可留空' })] }),
                jsxs('div', {
                  className: 'dss-control',
                  children: [
                    jsx('input', { id: 'dss-prefix', className: 'dss-input', value: doc.prefix ?? '', maxLength: 80, disabled: formLocked, onChange: (event) => updateTone('prefix', event.target.value) }),
                    jsx('button', { type: 'button', className: 'dss-icon-btn', title: '插入表情', onClick: (event) => { event.stopPropagation(); setEmojiFor(emojiFor === 'prefix' ? null : 'prefix') }, children: '☺' }),
                    emojiFor === 'prefix' ? jsx('div', {
                      className: 'dss-emoji-panel is-open',
                      'aria-label': '选择表情',
                      children: EMOJIS.map((emoji) => jsx('button', { type: 'button', onClick: (event) => { event.stopPropagation(); insertEmoji('prefix', emoji) }, children: emoji })),
                    }) : null,
                  ],
                }),
                jsx('div', { className: 'dss-field-meta', children: jsx('span', { className: 'dss-counter', children: String(doc.prefix ?? '').length + ' / 80' }) }),
              ],
            }),
            jsxs('div', {
              className: 'dss-field',
              children: [
                jsxs('div', { className: 'dss-field-label', children: [jsx('label', { htmlFor: 'dss-style', children: '性格' }), jsx('span', { className: 'dss-hint', children: '角色 / 语气 / 表达习惯' })] }),
                jsx('textarea', { id: 'dss-style', className: 'dss-textarea', value: doc.style ?? '', maxLength: 1200, rows: 4, disabled: formLocked, onChange: (event) => updateTone('style', event.target.value) }),
                jsx('div', { className: 'dss-field-meta', children: jsx('span', { className: 'dss-counter', children: String(doc.style ?? '').length + ' / 1200' }) }),
              ],
            }),
            jsxs('div', {
              className: 'dss-field',
              children: [
                jsxs('div', { className: 'dss-field-label', children: [jsx('label', { htmlFor: 'dss-suffix', children: '收尾' }), jsx('span', { className: 'dss-hint', children: '放在最后 · 不是总结' })] }),
                jsxs('div', {
                  className: 'dss-control',
                  children: [
                    jsx('input', { id: 'dss-suffix', className: 'dss-input', value: doc.suffix ?? '', maxLength: 80, disabled: formLocked, onChange: (event) => updateTone('suffix', event.target.value) }),
                    jsx('button', { type: 'button', className: 'dss-icon-btn', title: '插入表情', onClick: (event) => { event.stopPropagation(); setEmojiFor(emojiFor === 'suffix' ? null : 'suffix') }, children: '☺' }),
                    emojiFor === 'suffix' ? jsx('div', {
                      className: 'dss-emoji-panel is-open',
                      'aria-label': '选择表情',
                      children: EMOJIS.map((emoji) => jsx('button', { type: 'button', onClick: (event) => { event.stopPropagation(); insertEmoji('suffix', emoji) }, children: emoji })),
                    }) : null,
                  ],
                }),
                jsx('div', { className: 'dss-field-meta', children: jsx('span', { className: 'dss-counter', children: String(doc.suffix ?? '').length + ' / 80' }) }),
              ],
            }),
            jsx('p', { className: 'dss-rules', children: '代码 / diff / 报错 / 日志 / 表格 / 正式文档 / 高风险结论的正文固定中性；开场与收尾只在界面展示、复制不带。' }),
            jsxs('div', {
              className: 'dss-save',
              children: [
                jsx('span', { className: 'dss-save-state' + (error ? ' is-error' : ''), children: statusText }),
                jsxs('div', {
                  className: 'dss-save-actions',
                  children: [
                    jsx('button', { type: 'button', className: 'dss-btn', disabled: formLocked, onClick: resetDefault, children: '恢复默认' }),
                    jsx('button', { type: 'button', className: 'dss-btn dss-btn-primary', disabled: !canSave, onClick: save, children: '保存' }),
                  ],
                }),
              ],
            }),
            jsxs('section', {
              className: 'dss-preview',
              children: [
                jsxs('div', {
                  className: 'dss-preview-head',
                  children: [
                    jsxs('div', {
                      className: 'dss-preview-title-row',
                      children: [
                        jsx('h2', { className: 'dss-preview-title', children: '样式预览' }),
                        jsx('span', { className: 'dss-preview-note', children: '预览为样式样本：卡片按内容出现；身份行为示意，真实回复消息头待宿主支持（1.1）' }),
                      ],
                    }),
                    jsx('div', {
                      className: 'dss-preview-tabs-row',
                      children: jsx('div', {
                        className: 'dss-preview-tabs',
                        role: 'tablist',
                        'aria-label': '预览形态',
                        children: ['normal', 'table', 'code'].map((id) => jsx('button', {
                          type: 'button',
                          role: 'tab',
                          className: 'dss-preview-tab',
                          'aria-selected': String(sample === id),
                          onClick: () => setSample(id),
                          children: id === 'normal' ? '普通' : id === 'table' ? '表格' : '代码',
                        })),
                      }),
                    }),
                  ],
                }),
                jsxs('div', {
                  className: 'dss-chat-card' + (enabled ? '' : ' is-off'),
                  onClick: handlePreviewClick,
                  children: [
                    jsxs('div', {
                      className: 'dss-chat-head',
                      children: [
                        jsx('span', { className: 'dss-chat-avatar', children: jsx('img', { src: profileAvatar, alt: '' }) }),
                        jsxs('div', { className: 'dss-chat-id', children: [
                          jsx('strong', { className: 'dss-chat-name', children: name }),
                          jsx('span', { className: 'dss-chat-meta', children: signature }),
                        ] }),
                      ],
                    }),
                    jsxs('div', {
                      className: 'dss-chat-body',
                      children: [
                        enabled && String(doc.prefix ?? '').trim() ? jsx('p', { className: 'dss-msg-prefix', children: doc.prefix }) : null,
                        jsx('div', { className: 'dss-msg-structure', dangerouslySetInnerHTML: { __html: previewMarkup } }),
                        enabled && String(doc.suffix ?? '').trim() ? jsx('p', { className: 'dss-msg-suffix', children: doc.suffix }) : null,
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
      }

      personaTestApi = { parseToneJson, emptyTone, byteLength, statusLabels, personaUiFlags, PersonaEditor, previewRawHtml, previewHtml }

      const StructuredConfigCard = (props) => {
        const [tab, setTab] = react.useState('structured')
        const personaGuard = {}
        if (props.view !== undefined && props.view !== 'page') return null
        const read = props.useStructuredConfig ?? props.structuredConfig
        const state = typeof read === 'function' ? read((snapshot) => snapshot) : null
        if (!state || state.status !== 'ready' || typeof state.value !== 'object' || state.value === null) {
          return jsx('p', { style: noteStyle, children: '插件未加载或配置暂不可用。' })
        }
        const setField = typeof props.setField === 'function' ? props.setField : () => {}
        const mutateFields = typeof props.mutateFields === 'function' ? props.mutateFields : null
        const readFields = typeof props.readFields === 'function' ? props.readFields : null
        const tabs = [
          ['structured', '结构化输出'],
          ['persona', '语气风格'],
        ]
        const switchTab = (next) => {
          if (next === 'structured' && tab === 'persona' && typeof personaGuard.confirm === 'function' && !personaGuard.confirm()) return
          setTab(next)
        }
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
              onClick: () => switchTab(id),
              style: { ...tabButtonStyle, ...(tab === id ? tabActiveStyle : {}) },
              children: label,
            })) }),
            jsx('div', { style: { display: tab === 'structured' ? 'block' : 'none' }, children: jsxs('div', { children: [
              jsx('div', { children: CONFIG_FIELDS.map((spec) => renderRow(state, setField, spec)) }),
              jsx('p', { style: noteStyle, children: '会话级开关请用 /structured on | off（按会话生效，不写入这里）。' }),
            ] }) }),
            jsx('div', { style: { display: tab === 'persona' ? 'block' : 'none' }, children: jsx(PersonaEditor, { state, setField, mutateFields, readFields, tabGuard: personaGuard }) }),
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
                  mutateFields: typeof form.mutate === 'function'
                    ? (ops, revision) => form.mutate(ops, revision)
                    : undefined,
                  readFields: typeof form.getSnapshot === 'function'
                    ? () => form.getSnapshot()
                    : undefined,
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
      __test: { inDiff, isDiffCode, decorate, decorateStructured, setupConfigPage, personaApi: () => personaTestApi },
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
