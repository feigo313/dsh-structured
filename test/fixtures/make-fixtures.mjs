#!/usr/bin/env node
/**
 * 生成 test/fixtures/first-glance.html 与 test/fixtures/persona-glance.html。
 *
 * 夹具 = 宿主输入（markdown DOM / persona 信封）+ 页面加载时真实执行 lib/client.js。
 * 装饰与 CSS 每次打开页面都由真实代码重新跑，所以 CSS / 装饰逻辑一改，门禁读到的
 * computed style 就跟着变；不再维护一份手写的「看起来像」的死 DOM。
 *
 * 本脚本用 linkedom 跑同一份 lib/client.js，把同样的输入喂进真实渲染出口
 * （apply → decorate / renderPersonaMarkdown），逐项断言门禁依赖的元素与标记都在，
 * 打印清单后再写盘。缺任何一项直接抛错并指名，避免写出空壳夹具。
 *
 * 用法：node test/fixtures/make-fixtures.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import vm from 'node:vm'
import { parseHTML } from 'linkedom'

const root = new URL('../../', import.meta.url)
const clientCode = readFileSync(new URL('lib/client.js', root), 'utf8')

const BASE_CSS = [
  'html,body{margin:0;padding:0;background:#f7f8fa;color:#101828}',
  'body{font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei","PingFang SC",sans-serif}',
  '.stage{padding:36px 28px 64px;display:flex;justify-content:center}',
  '.reply{width:760px;max-width:calc(100vw - 56px)}',
  '.meta{font-size:12px;color:#667085;margin:0 0 16px 2px}',
  '.surface{background:transparent;border:0;padding:0}',
  'body[data-ds-dark-theme]{background:#1a1b1e;color:#e6e9ef}',
].join('\n')

// ---------- 输入 1：人格关闭态的普通回复（宿主 markdown 输出） ----------
const FIRST_GLANCE_CONTENT = [
  '        <blockquote>',
  '          <p><strong>这版能上，但先补一次真实用户验证</strong><br>方向、成本、排期都成立；真实用户验证是唯一缺口。</p>',
  '        </blockquote>',
  '        <blockquote>',
  '          <p><strong>结论</strong></p>',
  '          <p><strong>先灰度一周，再放开自动更新。</strong></p>',
  '          <p>回滚脚本没验收前，不加自动更新。</p>',
  '        </blockquote>',
  '        <blockquote>',
  '          <p><strong>建议</strong></p>',
  '          <ol>',
  '            <li>找 5 个真实用户，跑核心路径。</li>',
  '            <li>看他们卡在哪，不听他们说要什么。</li>',
  '            <li>验证过了再排期，没过就停。</li>',
  '          </ol>',
  '        </blockquote>',
  '        <blockquote>',
  '          <p><strong>风险</strong></p>',
  '          <p>用户验证没做，直接推进会把假设当结论。</p>',
  '        </blockquote>',
  '        <blockquote>',
  '          <p><strong>短答</strong></p>',
  '          <p>能上，但别一步到位。</p>',
  '        </blockquote>',
  '        <p><strong>表格结论：</strong> 三条链路，两条已通过，一条待观察。</p>',
  '        <table>',
  '          <thead><tr><th>模块</th><th>状态</th><th>说明</th></tr></thead>',
  '          <tbody>',
  '            <tr><td>注入链路</td><td>✅ 通过</td><td>新会话 system prompt 命中</td></tr>',
  '            <tr><td>表格渲染</td><td>⚠ 观察</td><td>斑马纹与状态列生效</td></tr>',
  '            <tr><td>自动更新</td><td>❌ 阻断</td><td>回滚脚本未验收</td></tr>',
  '          </tbody>',
  '        </table>',
  '        <div class="_fenceSeat_13jw0_146">',
  '          <div class="md-code-block">',
  '            <div class="_bannerWrap_kjs70_24">',
  '              <div class="_header_1mqf1_10" data-code-block-banner>',
  '                <div class="_heading_1mqf1_23"><span class="_language_1mqf1_30">js</span></div>',
  '                <div class="_actions_1mqf1_43"></div>',
  '              </div>',
  '            </div>',
  '            <div class="_content_kjs70_74" data-code-block-content>',
  '              <pre><code><span class="line">const KEY = \'dsh-structured.tone\'</span>',
  '<span class="line">export function loadTone() {</span>',
  '<span class="line">  try {</span>',
  '<span class="line">    const raw = localStorage.getItem(KEY)</span>',
  '<span class="line">    if (!raw) return DEFAULT_TONE</span>',
  '<span class="line">    return parseTone(JSON.parse(raw)) ?? DEFAULT_TONE</span>',
  '<span class="line">  } catch {</span>',
  '<span class="line">    return DEFAULT_TONE // fail-open</span>',
  '<span class="line">  }</span>',
  '<span class="line">}</span></code></pre>',
  '            </div>',
  '          </div>',
  '        </div>',
].join('\n')

// ---------- 输入 2：人格开启态（persona 信封 + 块外短答） ----------
const PERSONA_ENVELOPE = {
  version: 1,
  kind: 'table',
  conclusion: {
    lead: '这句加粗结论应当明显比正文大。',
    body: '解释说明一行，写清依据或边界。',
  },
  suggestions: ['先跑一遍实机。', '再补视觉 gate。'],
  risk: '未验证的部分不能当通过。',
  innerOs: '这条必须过 gate 才算完。',
  table: {
    head: ['项', '状态', '说明'],
    rows: [
      ['身份头', '✅ 通过', '头像与称呼行'],
      ['三卡', '⚠ 观察', '颜色与字体'],
    ],
  },
}

const escapeHtml = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const PERSONA_GLANCE_CONTENT = [
  '        <div class="_fenceSeat_13jw0_146">',
  '          <div class="md-code-block">',
  '            <div class="_bannerWrap_kjs70_24">',
  '              <div class="_header_1mqf1_10" data-code-block-banner>',
  '                <div class="_heading_1mqf1_23"><span class="_language_1mqf1_30">persona</span></div>',
  '                <div class="_actions_1mqf1_43"></div>',
  '              </div>',
  '            </div>',
  '            <div class="_content_kjs70_74" data-code-block-content>',
  '              <pre><code><span class="line">' + escapeHtml(JSON.stringify(PERSONA_ENVELOPE)) + '</span></code></pre>',
  '            </div>',
  '          </div>',
  '        </div>',
  '        <blockquote>',
  '          <p><strong>短答</strong></p>',
  '          <p>这条只回一句：gate 没跑过就不算完。</p>',
  '        </blockquote>',
].join('\n')

const PERSONA_CONFIG = {
  personaEnabled: true,
  personaName: '蓝色大肥鱼',
  personaSignature: '主人，再来一碗白米饭！！~',
  persona: JSON.stringify({
    schema: 'dsh-structured/tone@1',
    prefix: '我最爱💗的主人~！！大肥鱼🐳报告📢！',
    style: '搞怪/傲娇，短句，先给结论。',
    suffix: '哈！本鱼鱼🐳 精准！🚀高效！',
  }),
}

// ---------- 真实渲染出口：linkedom 里跑 lib/client.js ----------
function loadClient(document) {
  let definition = null
  const createElement = document.createElement.bind(document)
  document.createElement = (tag) => {
    if (tag === 'canvas') {
      return { width: 0, height: 0, getContext: () => ({ drawImage() {} }), toDataURL: () => 'data:image/jpeg;base64,AAAA' }
    }
    return createElement(tag)
  }
  const store = new Map()
  const window = {
    __ModuleLoader__: { load(value) { definition = value } },
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
    },
    confirm: () => true,
  }
  const FakeObserver = class { observe() {} disconnect() {} }
  const FakeImage = class { set src(value) { this._src = value; this.onload?.() } get src() { return this._src } }
  const FakeFileReader = class { readAsDataURL() { this.result = 'data:image/png;base64,AAAA'; this.onload?.() } }
  vm.runInNewContext(clientCode, {
    window,
    document,
    TextEncoder,
    FileReader: FakeFileReader,
    Image: FakeImage,
    MutationObserver: FakeObserver,
    requestAnimationFrame: (fn) => { fn(); return 0 },
    cancelAnimationFrame() {},
    setTimeout: () => 0,
    clearTimeout() {},
    console: { info() {}, warn() {}, error() {} },
  }, { filename: 'lib/client.js' })
  if (!definition) throw new Error('lib/client.js 没有通过 window.__ModuleLoader__ 注册模块')
  const plugin = definition.factory()
  plugin.apply({ inject() {}, effect(fn) { const result = fn(); return typeof result === 'function' ? result : () => {} } })
  return plugin
}

function need(document, selector, name) {
  const element = document.querySelector(selector)
  if (!element) throw new Error('渲染结果缺少必需元素：' + name + ' (' + selector + ')')
  return element
}

function renderFirstGlance() {
  const html = '<!doctype html><html><head></head><body><div class="stage"><div class="reply">'
    + '<div class="meta">助手回复</div><div class="surface"><div class="_markdown_fixture markdown">'
    + FIRST_GLANCE_CONTENT
    + '</div></div></div></div></body></html>'
  const { document } = parseHTML(html)
  loadClient(document)
  const code = need(document, '.dss-code', '代码块')
  const table = need(document, '.dss-table', '表格')
  const cards = {
    statement: need(document, '.dss-card-statement', '首段 statement 卡'),
    conclusion: need(document, '.dss-card-conclusion', '结论卡'),
    next: need(document, '.dss-card-next', '建议卡（next）'),
    risk: need(document, '.dss-card-risk', '风险卡'),
    short: need(document, '.dss-card-short', '短答卡'),
  }
  const labels = [...document.querySelectorAll('[data-dsh-card-label]')].map((node) => node.getAttribute('data-dsh-card-label'))
  for (const label of ['结论', '建议', '风险', '短答']) {
    if (!labels.includes(label)) throw new Error('卡片标签缺失：data-dsh-card-label="' + label + '"，实际=' + JSON.stringify(labels))
  }
  const statusCells = [...document.querySelectorAll('[data-dsh-structured-status-cell]')].map((node) => node.getAttribute('data-dsh-structured-status-cell'))
  for (const status of ['success', 'warn', 'error']) {
    if (!statusCells.includes(status)) throw new Error('状态单元格缺失：data-dsh-structured-status-cell="' + status + '"，实际=' + JSON.stringify(statusCells))
  }
  if (!code.querySelector('[data-dsh-structured-copy]')) throw new Error('代码块缺少复制按钮 [data-dsh-structured-copy]')
  if (!code.querySelector('pre')) throw new Error('代码块缺少 pre')
  if (code.getAttribute('data-dsh-structured-lang') !== 'js') throw new Error('代码块语言标记不是 js：' + code.getAttribute('data-dsh-structured-lang'))
  if (!document.querySelector('p[data-dsh-structured-lead="table"]')) throw new Error('表格引导段缺少 data-dsh-structured-lead="table"')
  if (!table.getAttribute('data-dsh-structured-status-table')) throw new Error('表格未标为状态表')
  return { cards: Object.keys(cards), labels, statusCells, columns: table.querySelectorAll('thead th').length }
}

function renderPersonaGlance() {
  // 宿主的真实结构（见 test/persona-ui.test.mjs:433-446）：flowItem[data-chat-flow-kind] > slot > markdown。
  // mountPersonaHead 用 flow.insertBefore(head, slot)，slot 必须是 flow 的直接子级，所以这里不能多包一层。
  const html = '<!doctype html><html><head></head><body><div class="stage"><div class="reply">'
    + '<div class="meta">助手回复 · 人格开启</div>'
    + '<div class="flowItem" data-chat-flow-kind="assistant-step">'
    + '<div data-slot="conversation.chat.node">'
    + '<div class="_markdown_persona markdown">'
    + PERSONA_GLANCE_CONTENT
    + '</div></div></div></div></div></body></html>'
  const { document } = parseHTML(html)
  const plugin = loadClient(document)
  plugin.__test.setPersonaModeConfig(PERSONA_CONFIG)
  plugin.__test.decorate(document)
  need(document, '.dss-persona-head', '人格身份头')
  need(document, '.dss-persona-head .dss-chat-avatar img', '身份头头像')
  need(document, '.dss-persona-head .dss-chat-name', '身份头名字')
  need(document, '.dss-persona-head .dss-chat-meta', '身份头签名')
  need(document, '.dss-persona-prefix', '人格开场前缀')
  need(document, '.dss-persona-suffix', '人格收尾后缀')
  need(document, '.dss-card-conclusion', '人格结论卡')
  need(document, '.dss-card-next', '人格建议卡（next）')
  need(document, '.dss-card-risk', '人格风险卡')
  need(document, '.dss-card-short', '人格短答卡（块外正文）')
  const table = need(document, '.dss-table', '人格表格')
  const count = (selector) => document.querySelectorAll(selector).length
  for (const [selector, expected, name] of [['.dss-persona-head', 1, '身份头'], ['.dss-persona-prefix', 1, '开场前缀'], ['.dss-persona-suffix', 1, '收尾后缀']]) {
    const actual = count(selector)
    if (actual !== expected) throw new Error(name + '数量应为 ' + expected + '，实际=' + actual)
  }
  const labels = [...document.querySelectorAll('[data-dsh-card-label]')].map((node) => node.getAttribute('data-dsh-card-label'))
  for (const label of ['结论', '建议', '风险']) {
    if (!labels.includes(label)) throw new Error('人格卡片标签缺失：' + label + '，实际=' + JSON.stringify(labels))
  }
  const kind = document.querySelector('._markdown_persona').getAttribute('data-dsh-persona-kind')
  if (kind !== 'table') throw new Error('persona kind 应为 table，实际=' + kind)
  return { labels, kind, columns: table.querySelectorAll('thead th').length }
}

function fixtureHtml(options) {
  return [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<title>' + options.title + '</title>',
    '<!-- 由 test/fixtures/make-fixtures.mjs 生成：输入是宿主 DOM，装饰由 lib/client.js 在页面里实时完成。 -->',
    '<style>',
    BASE_CSS,
    '</style>',
    '</head>',
    '<body>',
    '<div class="stage">',
    '  <div class="reply">',
    '    <div class="meta">' + options.title + '</div>',
    '    <div class="surface">',
    options.content,
    '    </div>',
    '  </div>',
    '</div>',
    '<script>',
    '  window.__ModuleLoader__ = { load(definition) { window.__client = definition } }',
    '</script>',
    '<script src="../../lib/client.js"></script>',
    '<script>',
    options.script,
    '</script>',
    '</body>',
    '</html>',
    '',
  ].join('\n')
}

const FIRST_GLANCE_SCRIPT = [
  '  const module = window.__client.factory()',
  '  module.apply({ inject() {}, effect(fn) { return fn() } })',
  '  // 幂等兜底：DOM 就绪后再扫一遍，等价于 MutationObserver 的静默全量重扫。',
  '  module.__test.decorate(document)',
].join('\n')

const PERSONA_GLANCE_SCRIPT = [
  '  const module = window.__client.factory()',
  '  module.__test.setPersonaModeConfig(' + JSON.stringify(PERSONA_CONFIG, null, 2).split('\n').join('\n  ') + ')',
  '  module.apply({ inject() {}, effect(fn) { return fn() } })',
  '  module.__test.decorate(document)',
].join('\n')

const firstReport = renderFirstGlance()
const personaReport = renderPersonaGlance()

writeFileSync(new URL('test/fixtures/first-glance.html', root), fixtureHtml({
  title: '助手回复 · 人格关闭',
  content: '<div class="_markdown_fixture markdown">' + FIRST_GLANCE_CONTENT + '</div>',
  script: FIRST_GLANCE_SCRIPT,
}))
writeFileSync(new URL('test/fixtures/persona-glance.html', root), fixtureHtml({
  title: '助手回复 · 人格开启',
  content: '<div class="flowItem" data-chat-flow-kind="assistant-step"><div data-slot="conversation.chat.node"><div class="_markdown_persona markdown">' + PERSONA_GLANCE_CONTENT + '</div></div></div>',
  script: PERSONA_GLANCE_SCRIPT,
}))
console.log('FIXTURES_GENERATED', JSON.stringify({ first: firstReport, persona: personaReport }))
