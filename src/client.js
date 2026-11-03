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
    const PERSONA_HEAD_ATTR = 'data-dsh-persona-head'
    const PERSONA_MODE_ATTR = 'data-dsh-persona-mode'
    const PERSONA_FALLBACK_ATTR = 'data-dsh-persona-fallback'
    const PERSONA_ERROR_ATTR = 'data-dsh-persona-error'
    const PERSONA_PENDING_ATTR = 'data-dsh-persona-pending'
    const PERSONA_KIND_ATTR = 'data-dsh-persona-kind'
    // 插件自己生成的节点都带这个标记：MutationObserver 据此忽略自触发，避免
    // decorate 自己的输出再被当成宿主新消息重扫一遍。
    const GENERATED_ATTR = 'data-dsh-plugin-generated'
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
    const PERSONA_WHALE_JSON = '__DSH_STRUCTURED_WHALE_JSON__'
    const DEFAULT_PROFILE_NAME = '蓝色大肥鱼'
    const DEFAULT_PROFILE_SIGNATURE = '主人，再来一碗白米饭！！~'
    const DEFAULT_AVATAR = 'data:image/jpeg;base64,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'
    let personaModeState = {
      enabled: false,
      name: DEFAULT_PROFILE_NAME,
      signature: DEFAULT_PROFILE_SIGNATURE,
      avatar: '',
      prefix: '',
      suffix: '',
    }
    const personaRenderCache = new WeakMap()
    /** markdown 在 PersonaMode 激活那一刻就已存在：旧历史不回溯、不重写。 */
    const personaLegacyMarkdowns = new WeakSet()
    /** 激活时的最大 data-chat-turn；虚拟列表把旧消息重新挂回 DOM 时据此识别。 */
    let personaTurnWatermark = null
    /** 解析/校验失败先进入待定窗口，块完成且仍非法才显示错误。 */
    const personaPendingErrors = new WeakMap()
    const personaGraceTimers = new Set()
    const PERSONA_GRACE_MS = 500

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
  --dss-blue:#2563eb;--dss-blue-hover:#1d4ed8;--dss-blue-text:#1d4ed8;--dss-th-text:#115e59;--dss-blue-soft:#eff6ff;
  --dss-green:#067647;--dss-green-strong:#059669;--dss-green-text:#047857;--dss-green-soft:#f0faf4;
  --dss-amber:#b54708;--dss-amber-strong:#d97706;--dss-amber-text:#b54708;--dss-amber-soft:#fffbf3;
  --dss-red:#b42318;--dss-red-soft:#fef3f2;
  --dss-head-bg:linear-gradient(90deg,rgba(13,148,136,.18),rgba(13,148,136,.05));--dss-zebra:rgba(255,255,255,.55);
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
  --dss-blue:#3b82f6;--dss-blue-hover:#60a5fa;--dss-blue-text:#8ab4ff;--dss-th-text:#5eead4;--dss-blue-soft:rgba(59,130,246,.16);
  --dss-green:#34d399;--dss-green-strong:#10b981;--dss-green-text:#34d399;--dss-green-soft:rgba(16,185,129,.14);
  --dss-amber:#fbbf24;--dss-amber-strong:#f59e0b;--dss-amber-text:#fbbf24;--dss-amber-soft:rgba(245,158,11,.12);
  --dss-red:#f87171;--dss-red-soft:rgba(248,113,113,.16);
  --dss-head-bg:linear-gradient(90deg,rgba(45,212,191,.24),rgba(45,212,191,.06));--dss-zebra:rgba(255,255,255,.03);
  --dss-code-bg:rgba(0,0,0,.28);--dss-code-border:rgba(96,165,250,.28);--dss-code-text:#c9d2e0;
  --dss-shadow:0 1px 3px rgba(0,0,0,.35);
}
`
    const V5_COMPONENTS = `
.dss-scope .dss-card {
  margin:14px 0;padding:14px 16px;border:1px solid var(--dss-line);
  border-left:3px solid var(--dss-blue);border-radius:12px;
  background:linear-gradient(135deg,#eef4ff,#ffffff 90%);
  box-shadow:var(--dss-shadow);color:var(--dss-ink-2);
}
.dss-scope .dss-card > p:first-child{margin-top:0}
.dss-scope .dss-card > p:last-child{margin-bottom:0}
.dss-scope .dss-card-conclusion,.dss-scope .dss-card-accept{
  border-left-color:var(--dss-blue);
  background:linear-gradient(135deg,#eef4ff,#ffffff 90%);
}
.dss-scope .dss-card-next{
  border-left-color:var(--dss-green-strong);
  background:linear-gradient(180deg,#f0faf4,#ffffff 90%);
}
.dss-scope .dss-card-risk{
  border-left-color:var(--dss-amber-strong);
  background:linear-gradient(180deg,#fffbf3,#ffffff 90%);
}
.dss-scope .dss-card-statement{
  border-left-color:var(--dss-blue);
  background:linear-gradient(135deg,#eef4ff,#ffffff 90%);
}
.dss-scope .dss-card-short{
  border-left-color:#7c3aed;background:linear-gradient(135deg,#f5f3ff,#ffffff 90%);box-shadow:none;
}
.dss-scope .dss-card-short > p:first-child > strong:first-child{
  display:block;width:100%;margin:0 0 8px;padding:0 0 6px;border-bottom:1px solid var(--dss-line);
  font:700 12px/1.5 var(--dss-sans);letter-spacing:.04em;color:#6d28d9;
}
.dss-scope .dss-card-short > p{font-size:13.5px;line-height:1.7;color:var(--dss-ink-2)}
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
  width:100%;margin:14px 0;border:1px solid var(--dss-line);border-left:3px solid #0d9488;
  border-radius:12px;border-collapse:separate;border-spacing:0;overflow:hidden;
  background:linear-gradient(135deg,#ecfeff,#ffffff 62%);
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
  background:linear-gradient(135deg,rgba(37,99,235,.18),rgba(37,99,235,0) 90%),var(--dss-paper);
}
body[data-ds-dark-theme] .dss-scope .dss-card-next{
  background:linear-gradient(180deg,rgba(16,185,129,.14),rgba(16,185,129,0) 90%),var(--dss-paper);
  border-left-color:#10b981;
}
body[data-ds-dark-theme] .dss-scope .dss-card-risk{
  background:linear-gradient(180deg,rgba(245,158,11,.12),rgba(245,158,11,0) 90%),var(--dss-paper);
  border-left-color:#f59e0b;
}
body[data-ds-dark-theme] .dss-scope .dss-card-short{
  border-left-color:#c4b5fd;
  background:linear-gradient(135deg,rgba(196,181,253,.16),rgba(196,181,253,0) 90%),var(--dss-paper);
}
body[data-ds-dark-theme] .dss-scope .dss-card-short > p:first-child > strong:first-child{color:#c4b5fd}
body[data-ds-dark-theme] .dss-scope .dss-table{
  border-left-color:#2dd4bf;
  background:linear-gradient(135deg,rgba(13,148,136,.22),rgba(13,148,136,0) 62%),var(--dss-paper);
}
body[data-ds-dark-theme] .dss-scope .dss-code{
  background:linear-gradient(135deg,rgba(37,99,235,.18),rgba(37,99,235,0) 90%),var(--dss-paper);
}
body[data-ds-dark-theme] .dss-scope .dss-status-success{background:rgba(52,211,153,.16);color:#4ade80}
body[data-ds-dark-theme] .dss-scope .dss-status-warn{background:rgba(251,191,36,.14);color:#fbbf24}
body[data-ds-dark-theme] .dss-scope .dss-status-error{background:rgba(248,113,113,.16);color:#f87171}
body[data-ds-dark-theme] .dss-scope .dss-copy[data-copied="1"] .dss-copy-ok{color:#34d399}
.dss-scope .dss-persona-head{padding:0 0 10px}
.dss-scope .dss-persona-head .dss-chat-head{display:flex;align-items:center;gap:12px;padding:0}
.dss-scope .dss-persona-head .dss-chat-avatar{position:relative;display:grid;place-items:center;width:38px;height:38px;flex:none;overflow:hidden;border-radius:50%;background:var(--dss-blue-soft);box-shadow:0 0 0 3px var(--dss-page),0 2px 10px rgba(16,24,40,.18)}
.dss-scope .dss-persona-head .dss-chat-avatar img{width:100%;height:100%;object-fit:cover}
.dss-scope .dss-persona-head .dss-chat-id{min-width:0}
.dss-scope .dss-persona-head .dss-chat-name{display:block;color:var(--dss-ink);font-size:16px;font-weight:650;line-height:1.3}
.dss-scope .dss-persona-head .dss-chat-meta{display:block;color:var(--dss-ink-3);font:12px/1.5 var(--dss-mono);overflow-wrap:anywhere}
.dss-scope .dss-persona-prefix{margin:0;color:var(--dss-ink-3);font:12.5px/1.7 var(--dss-mono)}
.dss-scope .dss-persona-suffix{margin:0;padding-top:8px;border-top:1px dotted var(--dss-line-strong);color:var(--dss-ink-3);font:12px/1.65 var(--dss-mono);overflow-wrap:anywhere}
`
    const CONFIG_CSS = `
.dss-scope {
  --dss-page:#f7f8fa;--dss-paper:#ffffff;--dss-paper-2:#f8fafc;
  --dss-ink:#101828;--dss-ink-2:#475467;--dss-ink-3:#667085;
  --dss-line:#e4e7ec;--dss-line-strong:#d0d5dd;
  --dss-blue:#2563eb;--dss-blue-hover:#1d4ed8;--dss-blue-text:#1d4ed8;--dss-th-text:#115e59;--dss-blue-soft:#eff6ff;
  --dss-green:#067647;--dss-green-strong:#059669;--dss-green-text:#047857;--dss-green-soft:#f0faf4;
  --dss-amber:#b54708;--dss-amber-strong:#d97706;--dss-amber-text:#b54708;--dss-amber-soft:#fffbf3;
  --dss-red:#b42318;--dss-red-soft:#fef3f2;
  --dss-head-bg:linear-gradient(90deg,rgba(13,148,136,.18),rgba(13,148,136,.05));--dss-zebra:rgba(255,255,255,.55);
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
  --dss-blue:#3b82f6;--dss-blue-hover:#60a5fa;--dss-blue-text:#8ab4ff;--dss-th-text:#5eead4;--dss-blue-soft:rgba(59,130,246,.16);
  --dss-green:#34d399;--dss-green-strong:#10b981;--dss-green-text:#34d399;--dss-green-soft:rgba(16,185,129,.14);
  --dss-amber:#fbbf24;--dss-amber-strong:#f59e0b;--dss-amber-text:#fbbf24;--dss-amber-soft:rgba(245,158,11,.12);
  --dss-red:#f87171;--dss-red-soft:rgba(248,113,113,.16);
  --dss-head-bg:linear-gradient(90deg,rgba(45,212,191,.24),rgba(45,212,191,.06));--dss-zebra:rgba(255,255,255,.03);
  --dss-code-bg:rgba(0,0,0,.28);--dss-code-border:rgba(96,165,250,.28);--dss-code-text:#c9d2e0;
  --dss-shadow:0 1px 3px rgba(0,0,0,.35);
}


.dss-scope .dss-card {
  margin:14px 0;padding:14px 16px;border:1px solid var(--dss-line);
  border-left:3px solid var(--dss-blue);border-radius:12px;
  background:linear-gradient(135deg,#eef4ff,#ffffff 90%);
  box-shadow:var(--dss-shadow);color:var(--dss-ink-2);
}
.dss-scope .dss-card > p:first-child{margin-top:0}
.dss-scope .dss-card > p:last-child{margin-bottom:0}
.dss-scope .dss-card-conclusion,.dss-scope .dss-card-accept{
  border-left-color:var(--dss-blue);
  background:linear-gradient(135deg,#eef4ff,#ffffff 90%);
}
.dss-scope .dss-card-next{
  border-left-color:var(--dss-green-strong);
  background:linear-gradient(180deg,#f0faf4,#ffffff 90%);
}
.dss-scope .dss-card-risk{
  border-left-color:var(--dss-amber-strong);
  background:linear-gradient(180deg,#fffbf3,#ffffff 90%);
}
.dss-scope .dss-card-statement{
  border-left-color:var(--dss-blue);
  background:linear-gradient(135deg,#eef4ff,#ffffff 90%);
}
.dss-scope .dss-card-short{
  border-left-color:#7c3aed;background:linear-gradient(135deg,#f5f3ff,#ffffff 90%);box-shadow:none;
}
.dss-scope .dss-card-short > p:first-child > strong:first-child{
  display:block;width:100%;margin:0 0 8px;padding:0 0 6px;border-bottom:1px solid var(--dss-line);
  font:700 12px/1.5 var(--dss-sans);letter-spacing:.04em;color:#6d28d9;
}
.dss-scope .dss-card-short > p{font-size:13.5px;line-height:1.7;color:var(--dss-ink-2)}
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
  width:100%;margin:14px 0;border:1px solid var(--dss-line);border-left:3px solid #0d9488;
  border-radius:12px;border-collapse:separate;border-spacing:0;overflow:hidden;
  background:linear-gradient(135deg,#ecfeff,#ffffff 62%);
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
  background:linear-gradient(135deg,rgba(37,99,235,.18),rgba(37,99,235,0) 90%),var(--dss-paper);
}
body[data-ds-dark-theme] .dss-scope .dss-card-next{
  background:linear-gradient(180deg,rgba(16,185,129,.14),rgba(16,185,129,0) 90%),var(--dss-paper);
  border-left-color:#10b981;
}
body[data-ds-dark-theme] .dss-scope .dss-card-risk{
  background:linear-gradient(180deg,rgba(245,158,11,.12),rgba(245,158,11,0) 90%),var(--dss-paper);
  border-left-color:#f59e0b;
}
body[data-ds-dark-theme] .dss-scope .dss-card-short{
  border-left-color:#c4b5fd;
  background:linear-gradient(135deg,rgba(196,181,253,.16),rgba(196,181,253,0) 90%),var(--dss-paper);
}
body[data-ds-dark-theme] .dss-scope .dss-card-short > p:first-child > strong:first-child{color:#c4b5fd}
body[data-ds-dark-theme] .dss-scope .dss-table{
  border-left-color:#2dd4bf;
  background:linear-gradient(135deg,rgba(13,148,136,.22),rgba(13,148,136,0) 62%),var(--dss-paper);
}
body[data-ds-dark-theme] .dss-scope .dss-code{
  background:linear-gradient(135deg,rgba(37,99,235,.18),rgba(37,99,235,0) 90%),var(--dss-paper);
}
body[data-ds-dark-theme] .dss-scope .dss-status-success{background:rgba(52,211,153,.16);color:#4ade80}
body[data-ds-dark-theme] .dss-scope .dss-status-warn{background:rgba(251,191,36,.14);color:#fbbf24}
body[data-ds-dark-theme] .dss-scope .dss-status-error{background:rgba(248,113,113,.16);color:#f87171}
body[data-ds-dark-theme] .dss-scope .dss-copy[data-copied="1"] .dss-copy-ok{color:#34d399}
.dss-scope .dss-persona-head{padding:0 0 10px}
.dss-scope .dss-persona-head .dss-chat-head{display:flex;align-items:center;gap:12px;padding:0}
.dss-scope .dss-persona-head .dss-chat-avatar{position:relative;display:grid;place-items:center;width:38px;height:38px;flex:none;overflow:hidden;border-radius:50%;background:var(--dss-blue-soft);box-shadow:0 0 0 3px var(--dss-page),0 2px 10px rgba(16,24,40,.18)}
.dss-scope .dss-persona-head .dss-chat-avatar img{width:100%;height:100%;object-fit:cover}
.dss-scope .dss-persona-head .dss-chat-id{min-width:0}
.dss-scope .dss-persona-head .dss-chat-name{display:block;color:var(--dss-ink);font-size:16px;font-weight:650;line-height:1.3}
.dss-scope .dss-persona-head .dss-chat-meta{display:block;color:var(--dss-ink-3);font:12px/1.5 var(--dss-mono);overflow-wrap:anywhere}
.dss-scope .dss-persona-prefix{margin:0;color:var(--dss-ink-3);font:12.5px/1.7 var(--dss-mono)}
.dss-scope .dss-persona-suffix{margin:0;padding-top:8px;border-top:1px dotted var(--dss-line-strong);color:var(--dss-ink-3);font:12px/1.65 var(--dss-mono);overflow-wrap:anywhere}

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
.dss-field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.dss-field-meta{display:flex;justify-content:flex-end;margin-top:4px;min-height:14px}
.dss-counter{color:var(--dss-ink-3);font:10.5px/1.4 var(--dss-mono)}
.dss-rules{margin:14px 0 0;color:var(--dss-ink-3);font-size:11.5px;line-height:1.65}
.dss-known-limit{margin:8px 0 0;color:var(--dss-ink-3);font-size:11.5px;line-height:1.65}
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
      ['下一步', 'next'], ['建议', 'next'], ['行动', 'next'], ['待办', 'next'],
      ['验收', 'accept'], ['通过', 'accept'], ['完成', 'accept'],
      ['重点', 'key'], ['关键', 'key'], ['短答', 'short'],
    ])
    const ICONS = [
      [/结论|总结|答案|判断/, '◆'],
      [/方案|计划|步骤|流程/, '▸'],
      [/风险|注意|警告|坑/, '⚠'],
      [/验收|检查|核对/, '✓'],
      [/对比|选型|取舍/, '⇄'],
      [/下一步|建议|行动|待办/, '→'],
      [/背景|原因|根因/, '◎'],
      [/指标|数据|结果/, '▦'],
    ]

    const CSS = `
.dss-scope {
  --dss-page:#f7f8fa;--dss-paper:#ffffff;--dss-paper-2:#f8fafc;
  --dss-ink:#101828;--dss-ink-2:#475467;--dss-ink-3:#667085;
  --dss-line:#e4e7ec;--dss-line-strong:#d0d5dd;
  --dss-blue:#2563eb;--dss-blue-hover:#1d4ed8;--dss-blue-text:#1d4ed8;--dss-th-text:#115e59;--dss-blue-soft:#eff6ff;
  --dss-green:#067647;--dss-green-strong:#059669;--dss-green-text:#047857;--dss-green-soft:#f0faf4;
  --dss-amber:#b54708;--dss-amber-strong:#d97706;--dss-amber-text:#b54708;--dss-amber-soft:#fffbf3;
  --dss-red:#b42318;--dss-red-soft:#fef3f2;
  --dss-head-bg:linear-gradient(90deg,rgba(13,148,136,.18),rgba(13,148,136,.05));--dss-zebra:rgba(255,255,255,.55);
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
  --dss-blue:#3b82f6;--dss-blue-hover:#60a5fa;--dss-blue-text:#8ab4ff;--dss-th-text:#5eead4;--dss-blue-soft:rgba(59,130,246,.16);
  --dss-green:#34d399;--dss-green-strong:#10b981;--dss-green-text:#34d399;--dss-green-soft:rgba(16,185,129,.14);
  --dss-amber:#fbbf24;--dss-amber-strong:#f59e0b;--dss-amber-text:#fbbf24;--dss-amber-soft:rgba(245,158,11,.12);
  --dss-red:#f87171;--dss-red-soft:rgba(248,113,113,.16);
  --dss-head-bg:linear-gradient(90deg,rgba(45,212,191,.24),rgba(45,212,191,.06));--dss-zebra:rgba(255,255,255,.03);
  --dss-code-bg:rgba(0,0,0,.28);--dss-code-border:rgba(96,165,250,.28);--dss-code-text:#c9d2e0;
  --dss-shadow:0 1px 3px rgba(0,0,0,.35);
}


.dss-scope .dss-card {
  margin:14px 0;padding:14px 16px;border:1px solid var(--dss-line);
  border-left:3px solid var(--dss-blue);border-radius:12px;
  background:linear-gradient(135deg,#eef4ff,#ffffff 90%);
  box-shadow:var(--dss-shadow);color:var(--dss-ink-2);
}
.dss-scope .dss-card > p:first-child{margin-top:0}
.dss-scope .dss-card > p:last-child{margin-bottom:0}
.dss-scope .dss-card-conclusion,.dss-scope .dss-card-accept{
  border-left-color:var(--dss-blue);
  background:linear-gradient(135deg,#eef4ff,#ffffff 90%);
}
.dss-scope .dss-card-next{
  border-left-color:var(--dss-green-strong);
  background:linear-gradient(180deg,#f0faf4,#ffffff 90%);
}
.dss-scope .dss-card-risk{
  border-left-color:var(--dss-amber-strong);
  background:linear-gradient(180deg,#fffbf3,#ffffff 90%);
}
.dss-scope .dss-card-statement{
  border-left-color:var(--dss-blue);
  background:linear-gradient(135deg,#eef4ff,#ffffff 90%);
}
.dss-scope .dss-card-short{
  border-left-color:#7c3aed;background:linear-gradient(135deg,#f5f3ff,#ffffff 90%);box-shadow:none;
}
.dss-scope .dss-card-short > p:first-child > strong:first-child{
  display:block;width:100%;margin:0 0 8px;padding:0 0 6px;border-bottom:1px solid var(--dss-line);
  font:700 12px/1.5 var(--dss-sans);letter-spacing:.04em;color:#6d28d9;
}
.dss-scope .dss-card-short > p{font-size:13.5px;line-height:1.7;color:var(--dss-ink-2)}
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
  width:100%;margin:14px 0;border:1px solid var(--dss-line);border-left:3px solid #0d9488;
  border-radius:12px;border-collapse:separate;border-spacing:0;overflow:hidden;
  background:linear-gradient(135deg,#ecfeff,#ffffff 62%);
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
  background:linear-gradient(135deg,rgba(37,99,235,.18),rgba(37,99,235,0) 90%),var(--dss-paper);
}
body[data-ds-dark-theme] .dss-scope .dss-card-next{
  background:linear-gradient(180deg,rgba(16,185,129,.14),rgba(16,185,129,0) 90%),var(--dss-paper);
  border-left-color:#10b981;
}
body[data-ds-dark-theme] .dss-scope .dss-card-risk{
  background:linear-gradient(180deg,rgba(245,158,11,.12),rgba(245,158,11,0) 90%),var(--dss-paper);
  border-left-color:#f59e0b;
}
body[data-ds-dark-theme] .dss-scope .dss-card-short{
  border-left-color:#c4b5fd;
  background:linear-gradient(135deg,rgba(196,181,253,.16),rgba(196,181,253,0) 90%),var(--dss-paper);
}
body[data-ds-dark-theme] .dss-scope .dss-card-short > p:first-child > strong:first-child{color:#c4b5fd}
body[data-ds-dark-theme] .dss-scope .dss-table{
  border-left-color:#2dd4bf;
  background:linear-gradient(135deg,rgba(13,148,136,.22),rgba(13,148,136,0) 62%),var(--dss-paper);
}
body[data-ds-dark-theme] .dss-scope .dss-code{
  background:linear-gradient(135deg,rgba(37,99,235,.18),rgba(37,99,235,0) 90%),var(--dss-paper);
}
body[data-ds-dark-theme] .dss-scope .dss-status-success{background:rgba(52,211,153,.16);color:#4ade80}
body[data-ds-dark-theme] .dss-scope .dss-status-warn{background:rgba(251,191,36,.14);color:#fbbf24}
body[data-ds-dark-theme] .dss-scope .dss-status-error{background:rgba(248,113,113,.16);color:#f87171}
body[data-ds-dark-theme] .dss-scope .dss-copy[data-copied="1"] .dss-copy-ok{color:#34d399}
.dss-scope .dss-persona-head{padding:0 0 10px}
.dss-scope .dss-persona-head .dss-chat-head{display:flex;align-items:center;gap:12px;padding:0}
.dss-scope .dss-persona-head .dss-chat-avatar{position:relative;display:grid;place-items:center;width:38px;height:38px;flex:none;overflow:hidden;border-radius:50%;background:var(--dss-blue-soft);box-shadow:0 0 0 3px var(--dss-page),0 2px 10px rgba(16,24,40,.18)}
.dss-scope .dss-persona-head .dss-chat-avatar img{width:100%;height:100%;object-fit:cover}
.dss-scope .dss-persona-head .dss-chat-id{min-width:0}
.dss-scope .dss-persona-head .dss-chat-name{display:block;color:var(--dss-ink);font-size:16px;font-weight:650;line-height:1.3}
.dss-scope .dss-persona-head .dss-chat-meta{display:block;color:var(--dss-ink-3);font:12px/1.5 var(--dss-mono);overflow-wrap:anywhere}
.dss-scope .dss-persona-prefix{margin:0;color:var(--dss-ink-3);font:12.5px/1.7 var(--dss-mono)}
.dss-scope .dss-persona-suffix{margin:0;padding-top:8px;border-top:1px dotted var(--dss-line-strong);color:var(--dss-ink-3);font:12px/1.65 var(--dss-mono);overflow-wrap:anywhere}

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
      short: 'dss-card-short',
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
        pill.setAttribute(GENERATED_ATTR, '1')
        cell.textContent = ''
        cell.appendChild(pill)
      }
      const className = 'dss-status dss-status-' + status
      if (pill.className !== className) pill.className = className
      const label = STATUS_LABELS[status] ?? status
      if (pill.textContent !== label) pill.textContent = label
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
      button.setAttribute(GENERATED_ATTR, '1')
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

    const personaToneFields = (raw) => {
      try {
        const doc = JSON.parse(String(raw ?? ''))
        return {
          prefix: typeof doc?.prefix === 'string' ? doc.prefix : '',
          suffix: typeof doc?.suffix === 'string' ? doc.suffix : '',
        }
      } catch {
        return { prefix: '', suffix: '' }
      }
    }

    const personaHeadConfig = (value = {}) => {
      const tone = personaToneFields(value.persona)
      return {
        enabled: value.personaEnabled === true,
        name: typeof value.personaName === 'string' && value.personaName.trim() ? value.personaName : DEFAULT_PROFILE_NAME,
        signature: typeof value.personaSignature === 'string' ? value.personaSignature : DEFAULT_PROFILE_SIGNATURE,
        avatar: typeof value.personaAvatar === 'string' ? value.personaAvatar : '',
        prefix: tone.prefix,
        suffix: tone.suffix,
      }
    }

    const personaContentSignature = (content, config) => JSON.stringify([content, config.prefix, config.suffix])

    const personaHash = (text) => {
      let hash = 5381
      const value = String(text ?? '')
      for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0
      return (hash >>> 0).toString(36) + ':' + value.length
    }

    const isPluginGenerated = (node) => {
      const element = node?.nodeType === 1 ? node : node?.parentElement
      try {
        return Boolean(element?.closest?.(`[${GENERATED_ATTR}]`))
      } catch {
        return false
      }
    }

    const isPersonaManaged = (markdown) => {
      if (personaRenderCache.has(markdown)) return true
      return Boolean(markdown?.hasAttribute?.(PERSONA_KIND_ATTR) || markdown?.hasAttribute?.(PERSONA_ERROR_ATTR) || markdown?.hasAttribute?.(PERSONA_PENDING_ATTR))
    }

    const clearPersonaPending = (markdown) => {
      const record = personaPendingErrors.get(markdown)
      if (!record) return
      if (record.timer !== null) {
        try { clearTimeout(record.timer) } catch {}
      }
      personaGraceTimers.delete(record.run)
      personaPendingErrors.delete(markdown)
      markdown?.removeAttribute?.(PERSONA_PENDING_ATTR)
    }

    const personaIsStreaming = (markdown) => {
      try {
        // 宿主完成信号：AssistantMarkdown 根节点在流式时带 data-streaming；turn 运行中带 data-chat-running。
        return Boolean(markdown?.closest?.('[data-streaming], [data-chat-running="true"], [aria-busy="true"], [data-state="running"]'))
      } catch {
        return false
      }
    }

    const personaEnvelopeSource = (markdown) => {
      const blocks = [...(markdown?.querySelectorAll?.('.md-code-block') ?? [])]
      if (blocks.length !== 1) return null
      const code = blocks[0]
      const text = code.querySelector?.('pre')?.textContent ?? ''
      if (!(bannerLanguage(code) === 'persona' || looksLikePersonaEnvelope(text))) return null
      return text
    }

    /**
     * 半截 JSON / 半截内容块不能立刻判 error：先保留宿主内容并进入可测试的
     * 稳定窗口；窗口内内容再变化就重试，宿主仍在流式就继续等，稳定且仍非法
     * 才显示「内容合同错误」。
     */
    const schedulePersonaError = (markdown, message, sourceText) => {
      const hash = personaHash(sourceText ?? '')
      const existing = personaPendingErrors.get(markdown)
      if (existing && existing.hash === hash) {
        markdown.setAttribute(PERSONA_PENDING_ATTR, '1')
        return 'pending'
      }
      clearPersonaPending(markdown)
      const run = () => {
        if (run.done) return
        run.done = true
        personaGraceTimers.delete(run)
        personaPendingErrors.delete(markdown)
        markdown?.removeAttribute?.(PERSONA_PENDING_ATTR)
        if (!personaModeState.enabled) return
        if (markdown?.isConnected === false) return
        const current = personaEnvelopeSource(markdown)
        if (current !== null && personaHash(current) !== hash) {
          renderPersonaMarkdown(markdown, personaModeState, undefined, { fresh: true, retry: true })
          return
        }
        if (personaIsStreaming(markdown)) {
          schedulePersonaError(markdown, message, current ?? sourceText)
          return
        }
        if (current === null && String(sourceText ?? '').trim() === '') return
        renderPersonaError(markdown, message)
      }
      let timer = null
      try {
        timer = typeof setTimeout === 'function' ? setTimeout(run, PERSONA_GRACE_MS) : null
      } catch {
        timer = null
      }
      personaGraceTimers.add(run)
      personaPendingErrors.set(markdown, { hash, message, timer, run })
      markdown.setAttribute(PERSONA_PENDING_ATTR, '1')
      return 'pending'
    }

    /** 测试与手动 gate 用：同步执行待定窗口的回调。 */
    const flushPersonaErrors = () => {
      let guard = 0
      while (personaGraceTimers.size > 0 && guard < 20) {
        guard += 1
        for (const run of [...personaGraceTimers]) {
          try { run() } catch {}
        }
      }
    }

    const cleanPersonaMarkdown = (markdown) => {
      clearPersonaPending(markdown)
      personaRenderCache.delete(markdown)
      for (const node of [...(markdown.querySelectorAll?.('.dss-persona-prefix, .dss-persona-suffix') ?? [])]) node.remove()
      for (const attr of [PERSONA_KIND_ATTR, PERSONA_FALLBACK_ATTR, PERSONA_ERROR_ATTR, PERSONA_PENDING_ATTR]) markdown.removeAttribute?.(attr)
      decorateStructured(markdown)
    }

    /** 激活时快照：此前的消息是旧历史，之后任何重扫都不重写它们。 */
    const snapshotPersonaLegacy = () => {
      for (const markdown of document.querySelectorAll?.('[class*="_markdown_"]') ?? []) personaLegacyMarkdowns.add(markdown)
      let watermark = null
      for (const node of document.querySelectorAll?.('[data-chat-turn]') ?? []) {
        const turn = Number(node.getAttribute?.('data-chat-turn'))
        if (Number.isFinite(turn) && (watermark === null || turn > watermark)) watermark = turn
      }
      personaTurnWatermark = watermark
    }

    const isLegacyPersonaMarkdown = (markdown, flow) => {
      if (personaLegacyMarkdowns.has(markdown)) return true
      if (personaTurnWatermark === null) return false
      const turn = Number(flow?.getAttribute?.('data-chat-turn'))
      return Number.isFinite(turn) && turn <= personaTurnWatermark
    }

    const setPersonaModeConfig = (value = {}) => {
      const wasEnabled = personaModeState.enabled
      personaModeState = personaHeadConfig(value)
      if (typeof document === 'undefined') return
      if (personaModeState.enabled) document.body?.setAttribute(PERSONA_MODE_ATTR, '1')
      else document.body?.removeAttribute(PERSONA_MODE_ATTR)
      if (personaModeState.enabled && !wasEnabled) snapshotPersonaLegacy()
      if (!active) return
      // 配置变化只刷新已受管的 persona 渲染与身份头，不对旧历史做全量重扫。
      decorate(document, { managedOnly: true })
    }

    const createPersonaHead = (doc, config) => {
      const head = doc.createElement('div')
      head.className = 'dss-scope dss-persona-head'
      head.setAttribute(PERSONA_HEAD_ATTR, '1')
      head.setAttribute(GENERATED_ATTR, '1')
      const row = doc.createElement('div')
      row.className = 'dss-chat-head'
      const avatar = doc.createElement('span')
      avatar.className = 'dss-chat-avatar'
      const image = doc.createElement('img')
      image.alt = ''
      image.src = config.avatar || DEFAULT_AVATAR
      avatar.appendChild(image)
      const id = doc.createElement('div')
      id.className = 'dss-chat-id'
      const name = doc.createElement('strong')
      name.className = 'dss-chat-name'
      const signature = doc.createElement('span')
      signature.className = 'dss-chat-meta'
      id.appendChild(name)
      id.appendChild(signature)
      row.appendChild(avatar)
      row.appendChild(id)
      head.appendChild(row)
      return head
    }

    const updatePersonaHead = (head, config) => {
      const image = head.querySelector?.('.dss-chat-avatar img')
      const src = config.avatar || DEFAULT_AVATAR
      if (image && image.getAttribute?.('src') !== src) image.src = src
      const name = head.querySelector?.('.dss-chat-name')
      if (name && name.textContent !== config.name) name.textContent = config.name
      const signature = head.querySelector?.('.dss-chat-meta')
      if (signature && signature.textContent !== config.signature) signature.textContent = config.signature
    }

    const findFlowScope = (markdown, flowOverride) => {
      try {
        const userLike = markdown.closest?.('[data-chat-flow-kind="user"], [data-chat-flow-kind="steering"], [data-chat-flow-kind="turn-trigger"]')
        if (userLike) return { userLike: true, assistant: null }
        // reasoning / 工作过程 / 上下文注入 / 压缩摘要都不是最终回复，不套内容合同。
        const groupPart = markdown.closest?.('[data-chat-group-part]')?.getAttribute?.('data-chat-group-part')
        if (groupPart && groupPart !== 'response') return { skip: true, assistant: null }
        if (markdown.closest?.('[data-variant="think"], [data-turn-process-inline], [data-turn-process], [data-step-process], [data-step-process-content], [data-step-process-body], [data-context-injection-body], [data-compaction-disclosure], [data-compaction-icon]')) {
          return { skip: true, assistant: null }
        }
        if (flowOverride !== undefined && flowOverride !== null) return { assistant: flowOverride }
        const flowItem = markdown.closest?.('[data-chat-flow-kind]')
        if (flowItem) {
          const kind = flowItem.getAttribute?.('data-chat-flow-kind')
          if (kind === 'assistant-step' || kind === 'assistant') return { assistant: flowItem }
          // 群组 / 压缩 / 过程 / 输入等其它 flow 不是模型回复。
          return { skip: true, assistant: null }
        }
        const response = markdown.closest?.('[data-chat-group-part="response"]')
        if (response) return { assistant: response }
        const assistant = markdown.closest?.('[class*="assistantContent"]')
        if (assistant) return { assistant }
        const slot = markdown.closest?.('[data-slot="conversation.chat.node"]')
        if (slot?.parentElement) return { assistant: slot.parentElement }
        return { assistant: null }
      } catch {
        return { assistant: flowOverride ?? null }
      }
    }

    const mountPersonaHead = (flow, config) => {
      if (!flow) return null
      let head = flow.querySelector?.(`[${PERSONA_HEAD_ATTR}]`)
      if (!head) {
        head = createPersonaHead(flow.ownerDocument ?? document, config)
        const slot = flow.querySelector?.('[data-slot="conversation.chat.node"]')
        if (slot) flow.insertBefore(head, slot)
        else flow.insertBefore(head, flow.firstChild)
      }
      updatePersonaHead(head, config)
      return head
    }

    const removePersonaHeads = (root) => {
      const inPreview = (element) => Boolean(element?.closest?.('.dss-persona-preview'))
      for (const head of root?.querySelectorAll?.(`[${PERSONA_HEAD_ATTR}]`) ?? []) {
        if (!inPreview(head)) head.remove()
      }
      const markdowns = root?.matches?.('[class*="_markdown_"]')
        ? [root]
        : [...(root?.querySelectorAll?.('[class*="_markdown_"]') ?? [])]
      for (const markdown of markdowns) {
        if (inPreview(markdown)) continue
        clearPersonaPending(markdown)
        personaRenderCache.delete(markdown)
      }
      for (const node of root?.querySelectorAll?.('.dss-persona-prefix, .dss-persona-suffix') ?? []) {
        if (!inPreview(node)) node.remove()
      }
      for (const element of root?.querySelectorAll?.(`[${PERSONA_KIND_ATTR}], [${PERSONA_FALLBACK_ATTR}], [${PERSONA_ERROR_ATTR}], [${PERSONA_PENDING_ATTR}]`) ?? []) {
        if (inPreview(element)) continue
        element.removeAttribute?.(PERSONA_KIND_ATTR)
        element.removeAttribute?.(PERSONA_FALLBACK_ATTR)
        element.removeAttribute?.(PERSONA_ERROR_ATTR)
        element.removeAttribute?.(PERSONA_PENDING_ATTR)
      }
    }

    const personaObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
    const personaText = (value) => typeof value === 'string' && value.trim().length > 0
    const strictKeys = (value, allowed) => Object.keys(value).every((key) => allowed.includes(key))

    const validatePersonaContent = (raw) => {
      if (!personaObject(raw)) return { ok: false, error: 'JSON 必须是对象' }
      if (raw.version !== 1) return { ok: false, error: 'version 必须为 1' }
      if (raw.kind === 'short') {
        if (!strictKeys(raw, ['version', 'kind', 'text'])) return { ok: false, error: 'short 含未定义字段' }
        if (!personaText(raw.text)) return { ok: false, error: 'short.text 必须是非空字符串' }
        return { ok: true, content: { kind: 'short', text: raw.text } }
      }
      if (raw.kind !== 'normal' && raw.kind !== 'table') return { ok: false, error: 'kind 只能是 normal / short / table' }
      const allowed = raw.kind === 'table' ? ['version', 'kind', 'conclusion', 'suggestions', 'risk', 'table'] : ['version', 'kind', 'conclusion', 'suggestions', 'risk']
      if (!strictKeys(raw, allowed)) return { ok: false, error: raw.kind + ' 含未定义字段' }
      const conclusion = raw.conclusion
      if (!personaObject(conclusion) || !strictKeys(conclusion, ['lead', 'body'])) return { ok: false, error: 'conclusion 形状非法' }
      if (!personaText(conclusion.lead)) return { ok: false, error: 'conclusion.lead 必须是非空字符串' }
      if (conclusion.body !== undefined && typeof conclusion.body !== 'string') return { ok: false, error: 'conclusion.body 必须是字符串' }
      if (!Array.isArray(raw.suggestions) || raw.suggestions.length < 1 || raw.suggestions.length > 5 || !raw.suggestions.every(personaText)) return { ok: false, error: 'suggestions 必须是 1-5 条非空字符串' }
      if (!personaText(raw.risk)) return { ok: false, error: 'risk 必须是非空字符串' }
      const content = {
        kind: raw.kind,
        conclusion: { lead: conclusion.lead, ...(conclusion.body === undefined ? {} : { body: conclusion.body }) },
        suggestions: [...raw.suggestions],
        risk: raw.risk,
      }
      if (raw.kind === 'table') {
        const table = raw.table
        if (!personaObject(table) || !strictKeys(table, ['head', 'rows'])) return { ok: false, error: 'table 形状非法' }
        if (!Array.isArray(table.head) || table.head.length < 2 || table.head.length > 6 || !table.head.every(personaText)) return { ok: false, error: 'table.head 必须是 2-6 个非空表头' }
        if (!Array.isArray(table.rows) || table.rows.length < 1 || table.rows.length > 20) return { ok: false, error: 'table.rows 必须是 1-20 行' }
        if (!table.rows.every((row) => Array.isArray(row) && row.length === table.head.length && row.every((cell) => typeof cell === 'string'))) return { ok: false, error: 'table.rows 行列数必须与 head 一致' }
        content.table = { head: [...table.head], rows: table.rows.map((row) => [...row]) }
      }
      return { ok: true, content }
    }

    function looksLikePersonaEnvelope(text) {
      return /^\s*\{/.test(text) && /"version"\s*:\s*1/.test(text) && /"kind"\s*:\s*"(?:normal|short|table)"/.test(text)
    }

    const extractPersonaEnvelope = (markdown) => {
      const blocks = [...(markdown.querySelectorAll?.('.md-code-block') ?? [])]
      const personaBlocks = blocks.filter((code) => bannerLanguage(code) === 'persona' || looksLikePersonaEnvelope(code.querySelector?.('pre')?.textContent ?? ''))
      if (personaBlocks.length === 0) return { kind: 'none' }
      if (personaBlocks.length > 1 || blocks.length > 1) return { ok: false, error: 'persona 内容块必须唯一' }
      const code = personaBlocks[0]
      const meaningful = [...(markdown.children ?? [])].filter((element) => (element.textContent ?? '').trim())
      if (meaningful.length !== 1 || meaningful[0] !== code) return { ok: false, error: 'persona 块外不得有内容' }
      const text = code.querySelector('pre')?.textContent ?? ''
      if (!text.trim()) return { ok: false, error: 'persona 内容块为空' }
      return { ok: true, text }
    }

    const makePersonaElement = (doc, tag, className, text) => {
      const element = doc.createElement(tag)
      element.setAttribute(GENERATED_ATTR, '1')
      if (className) element.className = className
      if (text !== undefined) element.textContent = text
      return element
    }

    const appendPersonaCard = (doc, markdown, label, bodies) => {
      const card = makePersonaElement(doc, 'blockquote')
      const labelParagraph = makePersonaElement(doc, 'p')
      const strong = makePersonaElement(doc, 'strong', '', label)
      labelParagraph.appendChild(strong)
      card.appendChild(labelParagraph)
      for (const body of bodies) card.appendChild(body)
      markdown.appendChild(card)
    }

    const renderPersonaContent = (markdown, content, config, envelopeText = null) => {
      clearPersonaPending(markdown)
      const doc = markdown.ownerDocument ?? document
      while (markdown.firstChild) markdown.removeChild(markdown.firstChild)
      if (config.prefix) markdown.appendChild(makePersonaElement(doc, 'p', 'dss-persona-prefix', config.prefix))
      if (content.kind === 'short') {
        appendPersonaCard(doc, markdown, '短答', [makePersonaElement(doc, 'p', '', content.text)])
      } else {
        const conclusionLead = makePersonaElement(doc, 'p')
        conclusionLead.appendChild(makePersonaElement(doc, 'strong', '', content.conclusion.lead))
        const conclusionBodies = [conclusionLead]
        if (content.conclusion.body) conclusionBodies.push(makePersonaElement(doc, 'p', '', content.conclusion.body))
        appendPersonaCard(doc, markdown, '结论', conclusionBodies)
        if (content.kind === 'table') {
          const table = makePersonaElement(doc, 'table')
          const thead = makePersonaElement(doc, 'thead')
          const headRow = makePersonaElement(doc, 'tr')
          for (const head of content.table.head) headRow.appendChild(makePersonaElement(doc, 'th', '', head))
          thead.appendChild(headRow)
          table.appendChild(thead)
          const tbody = makePersonaElement(doc, 'tbody')
          for (const row of content.table.rows) {
            const tr = makePersonaElement(doc, 'tr')
            for (const cell of row) tr.appendChild(makePersonaElement(doc, 'td', '', cell))
            tbody.appendChild(tr)
          }
          table.appendChild(tbody)
          markdown.appendChild(table)
        }
        const list = makePersonaElement(doc, 'ol')
        for (const suggestion of content.suggestions) list.appendChild(makePersonaElement(doc, 'li', '', suggestion))
        appendPersonaCard(doc, markdown, '建议', [list])
        appendPersonaCard(doc, markdown, '风险', [makePersonaElement(doc, 'p', '', content.risk)])
      }
      if (config.suffix && content.kind === 'normal') markdown.appendChild(makePersonaElement(doc, 'p', 'dss-persona-suffix', config.suffix))
      markdown.removeAttribute?.(PERSONA_ERROR_ATTR)
      markdown.removeAttribute?.(PERSONA_FALLBACK_ATTR)
      markdown.removeAttribute?.(PERSONA_PENDING_ATTR)
      markdown.setAttribute(PERSONA_KIND_ATTR, content.kind)
      decorateStructured(markdown)
      personaRenderCache.set(markdown, {
        content,
        kind: content.kind,
        envelopeText: envelopeText ?? null,
        envelopeHash: envelopeText === null ? null : personaHash(envelopeText),
        signature: personaContentSignature(content, config),
      })
      return content.kind
    }

    const renderPersonaError = (markdown, message) => {
      clearPersonaPending(markdown)
      const doc = markdown.ownerDocument ?? document
      while (markdown.firstChild) markdown.removeChild(markdown.firstChild)
      const card = makePersonaElement(doc, 'blockquote', 'dss-card dss-card-risk')
      card.setAttribute(PERSONA_ERROR_ATTR, '1')
      const label = makePersonaElement(doc, 'p')
      label.appendChild(makePersonaElement(doc, 'strong', '', '内容合同错误'))
      card.appendChild(label)
      card.appendChild(makePersonaElement(doc, 'p', '', message))
      markdown.appendChild(card)
      markdown.setAttribute(PERSONA_KIND_ATTR, 'error')
      markdown.setAttribute(PERSONA_ERROR_ATTR, '1')
      markdown.removeAttribute?.(PERSONA_FALLBACK_ATTR)
      markdown.removeAttribute?.(PERSONA_PENDING_ATTR)
      personaRenderCache.delete(markdown)
      return 'error'
    }

    const dropPersonaHead = (flow) => {
      for (const head of flow?.querySelectorAll?.(`[${PERSONA_HEAD_ATTR}]`) ?? []) head.remove()
    }

    const renderPersonaMarkdown = (markdown, config, flowOverride, options = {}) => {
      if (!config?.enabled && options.force !== true) return null
      const scope = findFlowScope(markdown, flowOverride)
      if (scope.userLike) {
        decorateStructured(markdown)
        return 'user'
      }
      if (scope.skip) {
        decorateStructured(markdown)
        return 'skip'
      }
      const flow = scope.assistant
      if (!flow) {
        // 显式 error：不得把“找不到 assistant 容器”当 legacy 通过。
        return renderPersonaError(markdown, '未找到 assistant 消息容器（PersonaMode 无法定位回复）')
      }
      markdown.removeAttribute?.(PERSONA_FALLBACK_ATTR)
      const diff = inDiff(markdown) || Boolean(markdown.querySelector?.('.md-diff, [data-diff], [class*="diff"]'))
      const errorReply = Boolean(markdown.closest?.('[data-error], [data-status="error"], [data-severity="error"]')) || Boolean(markdown.querySelector?.('[data-error], .md-error'))
      if (diff || errorReply) {
        clearPersonaPending(markdown)
        dropPersonaHead(flow)
        const kind = diff ? 'diff' : 'exception'
        markdown.removeAttribute?.(PERSONA_ERROR_ATTR)
        markdown.removeAttribute?.(PERSONA_PENDING_ATTR)
        markdown.setAttribute(PERSONA_KIND_ATTR, kind)
        decorateStructured(markdown)
        personaRenderCache.delete(markdown)
        return kind
      }
      const genui = inGenui(markdown) || Boolean(markdown.querySelector?.('[data-genui], [class*="genui-root"]'))
      if (genui) {
        clearPersonaPending(markdown)
        dropPersonaHead(flow)
        markdown.removeAttribute?.(PERSONA_ERROR_ATTR)
        markdown.removeAttribute?.(PERSONA_PENDING_ATTR)
        markdown.setAttribute(PERSONA_KIND_ATTR, 'genui')
        decorateStructured(markdown)
        personaRenderCache.delete(markdown)
        return 'genui'
      }
      const envelope = extractPersonaEnvelope(markdown)
      if (envelope.kind === 'none') {
        const cached = personaRenderCache.get(markdown)
        if (cached) {
          // 渲染后的 DOM 已没有 envelope；用原始 envelope 文本/哈希和配置签名做幂等判断。
          clearPersonaPending(markdown)
          mountPersonaHead(flow, config)
          if (markdown.getAttribute(PERSONA_KIND_ATTR) === cached.kind && personaContentSignature(cached.content, config) === cached.signature) return cached.kind
          return renderPersonaContent(markdown, cached.content, config, cached.envelopeText)
        }
        if (markdown.getAttribute(PERSONA_ERROR_ATTR) === '1') return 'error'
        if (markdown.getAttribute(PERSONA_PENDING_ATTR) === '1') return 'pending'
        if (isLegacyPersonaMarkdown(markdown, flow)) {
          dropPersonaHead(flow)
          return 'legacy'
        }
        mountPersonaHead(flow, config)
        if (markdown.querySelector?.('.md-code-block')) {
          clearPersonaPending(markdown)
          markdown.removeAttribute?.(PERSONA_ERROR_ATTR)
          markdown.setAttribute(PERSONA_KIND_ATTR, 'code')
          decorateStructured(markdown)
          return 'code'
        }
        // 普通回复/旧格式没有 persona 块：保留原文，走 legacy 排版；只有块存在但非法才 error。
        markdown.removeAttribute?.(PERSONA_ERROR_ATTR)
        markdown.removeAttribute?.(PERSONA_PENDING_ATTR)
        decorateStructured(markdown)
        return 'legacy'
      }
      if (!envelope.ok) return renderPersonaError(markdown, envelope.error)
      let parsed
      try {
        parsed = JSON.parse(envelope.text)
      } catch (error) {
        return schedulePersonaError(markdown, 'persona JSON 解析失败：' + String(error.message ?? error), envelope.text)
      }
      const validated = validatePersonaContent(parsed)
      if (!validated.ok) return schedulePersonaError(markdown, validated.error, envelope.text)
      mountPersonaHead(flow, config)
      return renderPersonaContent(markdown, validated.content, config, envelope.text)
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
    function decorate(root, options = {}) {
      markScopes(root)
      const managedOnly = options.managedOnly === true
      const markdowns = root?.matches?.('[class*="_markdown_"]')
        ? [root]
        : [...(root?.querySelectorAll?.('[class*="_markdown_"]') ?? [])]
      if (!personaModeState.enabled) {
        removePersonaHeads(root)
        if (managedOnly) {
          // 配置变化/关闭：只清理 persona 受管消息，旧历史保持不变。
          for (const markdown of markdowns) if (isPersonaManaged(markdown)) cleanPersonaMarkdown(markdown)
          return
        }
        decorateStructured(root)
        return
      }
      for (const markdown of markdowns) {
        if (managedOnly && !isPersonaManaged(markdown)) continue
        renderPersonaMarkdown(markdown, personaModeState, undefined, options)
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
        const unknown = Object.keys(doc).filter((key) => !['schema', 'prefix', 'style', 'suffix', 'skipIn', 'userName', 'selfName'].includes(key))
        if (unknown.length) return { ok: false, error: '未知字段', pointer: '/' + unknown[0] }
        if (!toneString(doc.prefix, 80)) return { ok: false, error: 'prefix 需为 ≤80 字字符串', pointer: '/prefix' }
        if (!toneString(doc.style, 1200) || doc.style.trim() === '') return { ok: false, error: 'style 必填且 ≤1200 字', pointer: '/style' }
        if (!toneString(doc.suffix, 80)) return { ok: false, error: 'suffix 需为 ≤80 字字符串', pointer: '/suffix' }
        if (doc.userName !== undefined && !toneString(doc.userName, 20)) return { ok: false, error: 'userName 需为 ≤20 字字符串', pointer: '/userName' }
        if (doc.selfName !== undefined && !toneString(doc.selfName, 20)) return { ok: false, error: 'selfName 需为 ≤20 字字符串', pointer: '/selfName' }
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
      const PREVIEW_SHORT = '现在三点，周报我顺手排好了。'
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
      const previewContent = (sample, styleText) => {
        const variant = previewVariant(String(styleText ?? ''))
        if (sample === 'short') {
          return { version: 1, kind: 'short', text: PREVIEW_SHORT }
        }
        if (sample === 'table') {
          return {
            version: 1,
            kind: 'table',
            conclusion: { lead: variant.tableLead, body: '' },
            suggestions: variant.normal.steps.slice(0, 2),
            risk: variant.normal.risk,
            table: { head: [...PREVIEW_TABLE.head], rows: PREVIEW_TABLE.rows.map(([module, state, note]) => [module, PREVIEW_STATUS_TEXT[state], note]) },
          }
        }
        return {
          version: 1,
          kind: 'normal',
          conclusion: { lead: variant.normal.lead, body: variant.normal.sub },
          suggestions: [...variant.normal.steps],
          risk: variant.normal.risk,
        }
      }
      // Preview and real replies both receive a typed content object and run the
      // same plugin renderer; no model-authored Markdown cards are involved.
      const previewHtml = (sample, styleText, docOverride, personaOverride = {}) => {
        const doc = docOverride ?? (typeof document !== 'undefined' ? document : null)
        if (!doc || typeof doc.createElement !== 'function') return ''
        const persona = {
          enabled: true,
          name: DEFAULT_PROFILE_NAME,
          signature: DEFAULT_PROFILE_SIGNATURE,
          avatar: '',
          prefix: '',
          suffix: '',
          ...personaOverride,
        }
        const host = doc.createElement('div')
        host.className = 'dss-scope dss-persona-preview'
        host.setAttribute('data-chat-flow-kind', 'assistant-step')
        host.setAttribute('data-chat-node-key', 'preview')
        host.setAttribute('data-chat-turn', '0')
        mountPersonaHead(host, persona)
        const body = doc.createElement('div')
        body.className = 'dss-chat-body'
        body.setAttribute('data-slot', 'conversation.chat.node')
        const markdown = doc.createElement('div')
        markdown.className = '_markdown_preview'
        body.appendChild(markdown)
        host.appendChild(body)
        if (sample === 'code') {
          markdown.innerHTML = `<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_preview">tone-loader.js</span><div class="_actions_preview"></div></div></div><div data-code-block-content><pre>${escapeHtml(PREVIEW_CODE.join(String.fromCharCode(10)))}</pre></div></div>`
          // 代码预览走与真实 code 回复相同的例外通道（renderPersonaMarkdown → decorateStructured）。
          renderPersonaMarkdown(markdown, persona, host)
        } else {
          renderPersonaContent(markdown, previewContent(sample, styleText), persona)
        }
        return host.innerHTML
      }
      const useEffect = typeof react.useEffect === 'function' ? react.useEffect : () => {}

      const PersonaEditor = ({ state, setField, mutateFields, readFields, tabGuard }) => {
        const initialRaw = String(fieldValue(state.value, { field: 'persona', fallback: PERSONA_WHALE_JSON }) ?? '')
        const initialParsed = parseToneJson(initialRaw)
        const [doc, setDoc] = react.useState(initialParsed.ok ? initialParsed.doc : defaultTone())
        const [enabled, setEnabled] = react.useState(fieldValue(state.value, { field: 'personaEnabled', fallback: true }) === true)
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
            personaEnabled: fieldValue(state.value, { field: 'personaEnabled', fallback: true }) === true,
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
        const previewMarkup = previewHtml(sample, doc.style, typeof document !== 'undefined' ? document : null, {
          name,
          signature,
          avatar,
          prefix: doc.prefix,
          suffix: doc.suffix,
        })
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
              className: 'dss-field-row',
              children: [
                jsxs('div', {
                  className: 'dss-field',
                  children: [
                    jsxs('div', { className: 'dss-field-label', children: [jsx('label', { htmlFor: 'dss-username', children: '昵称' }), jsx('span', { className: 'dss-hint', children: '怎么称呼你' })] }),
                    jsx('input', { id: 'dss-username', className: 'dss-input', value: doc.userName ?? '', maxLength: 20, disabled: formLocked, onChange: (event) => updateTone('userName', event.target.value) }),
                  ],
                }),
                jsxs('div', {
                  className: 'dss-field',
                  children: [
                    jsxs('div', { className: 'dss-field-label', children: [jsx('label', { htmlFor: 'dss-selfname', children: '自称' }), jsx('span', { className: 'dss-hint', children: '怎么称呼自己' })] }),
                    jsx('input', { id: 'dss-selfname', className: 'dss-input', value: doc.selfName ?? '', maxLength: 20, disabled: formLocked, onChange: (event) => updateTone('selfName', event.target.value) }),
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
                jsxs('div', { className: 'dss-field-label', children: [jsx('label', { htmlFor: 'dss-style', children: '性格' }), jsx('span', { className: 'dss-hint', children: '只写说话倾向，不写称呼' })] }),
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
            jsx('p', { className: 'dss-rules', children: '开场与收尾只在界面展示、复制不带；代码 / 表格等正文保持中性；保存只影响新回复。' }),
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
                        jsx('span', { className: 'dss-preview-note', children: '预览为 PersonaMode 合同样本：身份头、卡外前缀、结论 / 建议 / 风险、收尾；真实回复与预览同源。' }),
                      ],
                    }),
                    jsx('div', {
                      className: 'dss-preview-tabs-row',
                      children: jsx('div', {
                        className: 'dss-preview-tabs',
                        role: 'tablist',
                        'aria-label': '预览形态',
                        children: ['normal', 'table', 'short', 'code'].map((id) => jsx('button', {
                          type: 'button',
                          role: 'tab',
                          className: 'dss-preview-tab',
                          'aria-selected': String(sample === id),
                          onClick: () => setSample(id),
                          children: id === 'normal' ? '普通' : id === 'table' ? '表格' : id === 'short' ? '短答' : '代码',
                        })),
                      }),
                    }),
                  ],
                }),
                jsx('div', {
                  className: 'dss-chat-card' + (enabled ? '' : ' is-off'),
                  onClick: handlePreviewClick,
                  children: jsx('div', { dangerouslySetInnerHTML: { __html: previewMarkup } }),
                }),
              ],
            }),
          ],
        })
      }

      personaTestApi = { parseToneJson, emptyTone, byteLength, statusLabels, personaUiFlags, PersonaEditor, previewContent, previewHtml, renderPersonaContent }

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
      let fullRescan = false

      // 增量扫描：mutation 只重扫它所在的 markdown 容器（或新增子树），
      // 避免长会话里每帧对整页做一次全量 querySelectorAll（O(N²)）。
      const markRoot = (node) => {
        if (!node) return false
        // 插件自己生成的子树不触发重扫：否则 decorate 的输出会被 observer 当成
        // 宿主新消息再处理一遍（自触发 error 的根因）。
        if (isPluginGenerated(node)) return false
        const element = node.nodeType === 1 ? node : node.parentElement
        if (!element) return false
        const markdown = element.closest?.('[class*="_markdown_"]')
        const root = markdown ?? element
        if (pendingRoots === null) pendingRoots = new Set()
        pendingRoots.add(root)
        return true
      }
      const run = () => {
        if (disposed) return
        scheduled = false
        pending = null
        const roots = pendingRoots
        pendingRoots = null
        if (roots === null) {
          if (fullRescan) {
            fullRescan = false
            decorate(document, { fresh: false })
          }
          return
        }
        const list = [...roots]
        for (const root of list) {
          if (root?.isConnected === false) continue
          // 被另一个待扫根包含时跳过，避免重复工作。
          if (list.some((other) => other !== root && other.contains?.(root))) continue
          decorate(root, { fresh: true })
        }
      }
      const schedule = () => {
        if (disposed || scheduled) return
        scheduled = true
        if (typeof requestAnimationFrame === 'function') pending = requestAnimationFrame(run)
        else pending = setTimeout(run, 16)
      }
      const observer = new MutationObserver((records) => {
        let touched = false
        try {
          for (const record of records) {
            if (record.type === 'childList') {
              let added = false
              for (const node of record.addedNodes) added = markRoot(node) || added
              if (!added && record.addedNodes.length === 0) added = markRoot(record.target)
              touched = touched || added
            } else {
              touched = markRoot(record.target) || touched
            }
          }
        } catch {
          // 记录结构异常时退回整页扫描，保证装饰不丢。
          pendingRoots = null
          fullRescan = true
          touched = true
        }
        if (touched) schedule()
      })
      observer.observe(document.body, { childList: true, subtree: true, characterData: true })
      decorate(document, { fresh: false })

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
        document.body?.removeAttribute(PERSONA_MODE_ATTR)
        removePersonaHeads(document)
        for (const attr of [CARD_ATTR, CARD_TYPE_ATTR, ICON_ATTR, TONE_ATTR, LANG_ATTR, CODE_ATTR, SKIP_ATTR, STATUS_ATTR, STATUS_TABLE_ATTR, LEAD_ATTR, ROW_ATTR, PERSONA_KIND_ATTR, PERSONA_FALLBACK_ATTR, PERSONA_ERROR_ATTR, PERSONA_PENDING_ATTR, GENERATED_ATTR]) {
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
      document.body?.removeAttribute(PERSONA_MODE_ATTR)
      removePersonaHeads(document)
      for (const attr of [CARD_ATTR, CARD_TYPE_ATTR, ICON_ATTR, TONE_ATTR, LANG_ATTR, CODE_ATTR, SKIP_ATTR, STATUS_ATTR, STATUS_TABLE_ATTR, LEAD_ATTR, ROW_ATTR, PERSONA_KIND_ATTR, PERSONA_FALLBACK_ATTR, PERSONA_ERROR_ATTR, PERSONA_PENDING_ATTR, GENERATED_ATTR]) {
        for (const element of document.querySelectorAll('[' + attr + ']')) element.removeAttribute(attr)
      }
    }

    const applyVisual = (on) => {
      if (on) enable()
      else disable()
    }

    return {
      inject: [],
      __test: { inDiff, isDiffCode, decorate, decorateStructured, setPersonaModeConfig, setupConfigPage, flushPersonaErrors, personaApi: () => personaTestApi },
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
                  setPersonaModeConfig({
                    personaEnabled: readValue(value.personaEnabled),
                    persona: readValue(value.persona),
                    personaName: readValue(value.personaName),
                    personaSignature: readValue(value.personaSignature),
                    personaAvatar: readValue(value.personaAvatar),
                  })
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
