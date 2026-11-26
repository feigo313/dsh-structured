import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import { parseHTML } from 'linkedom'
import { parsePersona } from '../src/index.js'

const whale = readFileSync('docs/1.0-PERSONA-WHALE.json', 'utf8')

function makeDom() {
  const { document } = parseHTML('<!doctype html><html><head></head><body></body></html>')
  const createElement = document.createElement.bind(document)
  document.createElement = (tag) => {
    if (tag === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage() {} }),
        toDataURL: () => 'data:image/jpeg;base64,AAAA',
      }
    }
    return createElement(tag)
  }
  return document
}

function textOf(children) {
  if (Array.isArray(children)) return children.map(textOf).join('')
  if (children && typeof children === 'object') return textOf(children.props?.children)
  return children == null ? '' : String(children)
}

function allNodes(tree) {
  const out = []
  const visit = (node) => {
    if (!node) return
    if (Array.isArray(node)) { for (const item of node) visit(item); return }
    if (typeof node !== 'object') return
    out.push(node)
    visit(node.props?.children)
  }
  visit(tree)
  return out
}

function storage() {
  const map = new Map()
  return {
    getItem: (key) => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
    dump: () => Object.fromEntries(map),
  }
}

function makeHarness(state, setField, extraProps = {}) {
  const node = (type, props) => ({ type, props: props ?? {} })
  const hooks = []
  let hookIndex = 0
  let tree = null
  let current = null
  const written = { ...(state.value ?? {}) }
  const trackedSetField = async (field, value) => {
    const result = await setField(field, value)
    if (result !== false) {
      written[field] = value
      // 模拟宿主订阅：写成功后快照变化并触发重渲染。
      render()
    }
    return result
  }
  const readFields = extraProps.readFields ?? (() => ({ status: 'ready', writable: state.writable, value: { ...written } }))
  const renderProps = { ...extraProps }
  delete renderProps.renderCard
  const render = () => {
    hookIndex = 0
    // readFields 放在展开前：extraProps.readFields === undefined 显式覆盖成「缺少读回接口」。
    tree = current({ state, setField: trackedSetField, readFields, useStructuredConfig: (selector) => selector(readFields()), ...renderProps })
    return tree
  }
  const react = {
    useState(initial) {
      const index = hookIndex++
      if (!(index in hooks)) hooks[index] = typeof initial === 'function' ? initial() : initial
      return [hooks[index], (next) => { hooks[index] = typeof next === 'function' ? next(hooks[index]) : next; render() }]
    },
  }
  const fakeRequire = (spec) => {
    if (spec === 'react/jsx-runtime') return { jsx: node, jsxs: node }
    if (spec === 'react') return react
    if (spec === '@deepseek-ai/dsh-client-ui-primitives') {
      return { Switch: function Switch(props) { return { type: 'Switch', props } }, SegmentedControl: function SegmentedControl(props) { return { type: 'SegmentedControl', props } } }
    }
    throw new Error('unexpected require ' + spec)
  }
  let definition = null
  const window = { __ModuleLoader__: { load(value) { definition = value } }, confirm: () => true, localStorage: storage() }
  class FakeFileReader {
    readAsDataURL() {
      this.result = 'data:image/png;base64,AAAA'
      this.onload?.()
    }
  }
  class FakeImage {
    set src(value) {
      this._src = value
      this.naturalWidth = 200
      this.naturalHeight = 100
      this.onload?.()
    }
    get src() { return this._src }
  }
  const mutationObservers = []
  class FakeMutationObserver {
    constructor(callback) {
      this.callback = callback
      this.records = []
      mutationObservers.push(this)
    }
    observe(target) { this.target = target }
    disconnect() { this.disconnected = true }
    emit(records) { if (!this.disconnected) this.callback(records) }
  }
  const document = makeDom()
  vm.runInNewContext(readFileSync('lib/client.js', 'utf8'), {
    window, document, TextEncoder, FileReader: FakeFileReader, Image: FakeImage,
    MutationObserver: FakeMutationObserver,
    requestAnimationFrame: (fn) => { fn(); return 0 }, cancelAnimationFrame() {}, setTimeout: () => 0, clearTimeout() {},
    console: { info() {}, warn() {}, error() {} },
  }, { filename: 'lib/client.js' })
  const plugin = definition.factory(fakeRequire)
  const form = { set() { return Promise.resolve(true) }, getSnapshot() { return null }, subscribe() { return () => {} } }
  const child = {
    configForms: { get() { return form }, whileServed(_ns, register) { register(); return () => {} } },
    slots: { inject(_name, factory) { factory(); return () => {} }, register() { return () => {} } },
    effect(fn) { return fn() },
  }
  plugin.__test.setupConfigPage(child, form)
  const api = plugin.__test.personaApi()
  current = extraProps.renderCard ? api.StructuredConfigCard : api.PersonaEditor
  render()
  const nodes = () => allNodes(tree)
  const findButton = (label) => nodes().find((item) => item.type === 'button' && textOf(item.props.children) === label)
  const findTextarea = (needle = '') => nodes().find((item) => item.type === 'textarea' && String(item.props.value ?? '').includes(needle))
  const click = async (label) => {
    const button = findButton(label)
    assert.ok(button, 'missing button ' + label)
    await button.props.onClick?.({ stopPropagation() {} })
  }
  return {
    api, plugin, document, window, nodes, findButton, findTextarea, click,
    inputByValue(value) { return nodes().find((item) => item.type === 'input' && item.props.value === value) },
    nodeByClass(name) { return nodes().find((item) => String(item.props?.className ?? '').split(/\s+/).includes(name)) },
    previewHost() { return nodes().find((item) => item.props?.dangerouslySetInnerHTML) ?? null },
    previewHtml() { return this.previewHost()?.props.dangerouslySetInnerHTML.__html ?? '' },
    setWindowConfirm(value) { window.confirm = () => value },
    flushPersonaErrors() { plugin.__test.flushPersonaErrors() },
    applyPlugin() {
      plugin.apply({
        inject(_services, callback) {
          callback({
            configForms: { get() { return null } },
            slots: { inject() { return () => {} }, register() { return () => {} } },
          })
        },
        effect(fn) {
          const result = fn()
          return typeof result === 'function' ? result : () => {}
        },
      })
    },
    mutationObserver() { return mutationObservers[mutationObservers.length - 1] },
  }
}

const baseState = { status: 'ready', writable: true, revision: 0, value: { persona: whale, personaEnabled: false, personaRevision: 0 } }

const personaEnvelope = (payload) => `<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span><div class="_actions_persona"></div></div></div><div data-code-block-content><pre>${JSON.stringify(payload)}</pre></div></div>`
const personaEnvelopePlain = (payload) => `<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_plain">代码块</span></div></div><div data-code-block-content><pre>${JSON.stringify(payload)}</pre></div></div>`
// 0.2.2-rc.2 起 host 给带语言的 fence 包一层 .fenceSeat（MarkdownDelegate renderCode），persona 块不再是 markdown 直接子级。
// banner 形状也按 rc.2 真实 DOM：Rp header（_heading_ 容器 + _language_ span，persona 不是 shiki 语言 → 显示 codeLabel「代码块」），
// 内容在 pre>code>span.line 里 —— 检测必须靠内容（looksLikePersonaEnvelope），不能靠 banner 语言词。
const personaEnvelopeSeated = (payload) => `<div class="_fenceSeat_13jw0_146"><div class="md-code-block"><div class="_bannerWrap_kjs70_24"><div class="_header_1mqf1_10" data-code-block-banner><div class="_heading_1mqf1_23"><span class="_language_1mqf1_30">代码块</span></div><div class="_actions_1mqf1_43"></div></div></div><div class="_content_kjs70_74" data-code-block-content><pre class="_plain_kjs70_103"><code><span class="line">${JSON.stringify(payload)}</span></code></pre></div></div></div><p>块外正文</p>`

test('1.2.0 人格：身份头子开关 + 风格预设组（说话方式 + 内心OS）+ 简洁改名', () => {
  const harness = makeHarness(baseState, async () => true)
  const text = harness.nodes().map((item) => String(textOf(item.props.children))).join(' ')
  assert.match(text, /身份头 · 只控制头像 \/ 名字 \/ 签名；人格关闭时自动关闭/)
  assert.match(text, /风格预设/)
  assert.match(text, /说话方式/)
  assert.match(text, /内心OS/)
  assert.match(text, /预设同时套用下方「说话方式」与「内心OS」；风格只描述说话方式，不含深度。/)
  assert.match(text, /预设只改语气；称呼\/自称始终以输入框为准。/)
  assert.match(text, /切换人格/)
  assert.match(text, /昵称/)
  assert.match(text, /自称/)
  assert.match(text, /性格/)
  assert.match(text, /代码 \/ 表格等正文保持中性/)
  assert.doesNotMatch(text, /开场|收尾|放在最前面|放在最后/)
  assert.doesNotMatch(text, /基础|进阶|JSON 编辑|开头前缀|中间风格|结尾后缀|简洁专业|样式预览/)
  assert.equal(harness.findButton('保存').props.disabled, true)
  assert.ok(harness.nodeByClass('dss-config'))
  // 身份头子开关：人格关（baseState personaEnabled=false）时禁用。
  const headSwitch = harness.nodes().find((item) => item.type?.name === 'Switch' && item.props.label === '身份头')
  assert.ok(headSwitch, 'identity head switch must exist')
  assert.equal(headSwitch.props.disabled, true)
  // 风格预设 10 个 chip，含「简洁」且没有「简洁专业」。
  const chips = harness.nodes().filter((item) => item.type === 'button' && String(item.props.className ?? '').includes('dss-chip-btn'))
  assert.equal(chips.length, 10)
  assert.ok(chips.some((item) => textOf(item.props.children) === '简洁'))
  assert.equal(chips.some((item) => textOf(item.props.children) === '简洁专业'), false)
  // 预设组同时包住说话方式与内心OS。
  const group = harness.nodeByClass('dss-group')
  assert.ok(group)
  const groupText = String(textOf(group.props.children))
  assert.ok(groupText.includes('说话方式'))
  assert.ok(groupText.includes('内心OS'))
  assert.ok(harness.inputByValue('Boss💗'))
  assert.ok(harness.inputByValue('本鱼鱼🐳'))
  assert.ok(harness.findTextarea('搞怪/傲娇'))
  assert.ok(harness.inputByValue('蓝色大肥鱼'))
  assert.ok(harness.inputByValue('主人，再来一碗白米饭！！~'))
  assert.equal(harness.nodes().some((item) => item.type === 'select'), false)
  const avatar = harness.nodes().find((item) => item.type === 'img' && item.props.src?.startsWith('data:image/jpeg;base64,'))
  assert.ok(avatar, 'default whale avatar must be a real image')
})

test('v5 编辑三字段/名称/签名 → 保存 persona + enabled + revision + 档案字段', async () => {
  const calls = []
  const harness = makeHarness(baseState, async (field, value) => { calls.push([field, value]) })
  harness.findTextarea('搞怪/傲娇').props.onChange({ target: { value: '直接 / 克制' } })
  harness.inputByValue('蓝色大肥鱼').props.onChange({ target: { value: '新名字' } })
  harness.inputByValue('主人，再来一碗白米饭！！~').props.onChange({ target: { value: '新签名' } })
  assert.equal(harness.findButton('保存').props.disabled, false)
  await harness.click('保存')
  assert.deepEqual(calls.map(([field]) => field), ['persona', 'personaEnabled', 'personaRevision', 'personaName', 'personaSignature', 'personaAvatar'])
  assert.equal(calls[2][1], 1)
  const saved = JSON.parse(calls[0][1])
  assert.equal(saved.schema, 'dsh-structured/tone@1')
  assert.equal(saved.style, '直接 / 克制')
  assert.equal(calls[3][1], '新名字')
  assert.equal(calls[4][1], '新签名')
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).includes('已保存，未启用')))
  assert.equal(harness.findButton('保存').props.disabled, true)
})

test('v5 批量保存：payload 六字段一次提交，revision 从快照读取', async () => {
  const calls = []
  let batch = null
  const harness = makeHarness(
    { status: 'ready', writable: true, revision: 9, value: { persona: whale, personaEnabled: false, personaRevision: 3 } },
    async (field, value) => { calls.push([field, value]); return true },
    { mutateFields: async (ops, revision) => { batch = { ops, revision }; return true } },
  )
  harness.findTextarea('搞怪/傲娇').props.onChange({ target: { value: '批量风格' } })
  await harness.click('保存')
  assert.equal(calls.length, 0, 'batch path must not call setField')
  assert.ok(batch)
  assert.equal(JSON.stringify(batch.ops.map((op) => [op.op, op.path[0]])), JSON.stringify([
    ['set', 'persona'], ['set', 'personaEnabled'], ['set', 'personaRevision'],
    ['set', 'personaName'], ['set', 'personaSignature'], ['set', 'personaAvatar'],
  ]))
  assert.match(batch.ops[0].value, /批量风格/)
  assert.equal(batch.ops[2].value, 4)
  assert.equal(batch.revision, 9)
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).includes('已保存，未启用')))
})

test('v5 批量保存被拒绝：保留草稿并允许重试', async () => {
  let batchCalls = 0
  const harness = makeHarness(
    { status: 'ready', writable: true, revision: 2, value: { persona: whale, personaEnabled: false } },
    async () => { throw new Error('setField must not run') },
    { mutateFields: async () => { batchCalls += 1; return false } },
  )
  harness.inputByValue('蓝色大肥鱼').props.onChange({ target: { value: '批量失败草稿' } })
  await harness.click('保存')
  assert.equal(batchCalls, 1)
  assert.ok(harness.inputByValue('批量失败草稿'))
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).includes('批量写入失败')))
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).includes('批量写入被宿主拒绝')))
  assert.equal(harness.findButton('保存').props.disabled, false)
})

test('v5 回滚：persona 失败不继续写后续字段', async () => {
  const calls = []
  const harness = makeHarness(baseState, async (field, value) => {
    calls.push([field, value])
    if (field === 'persona') throw new Error('persona failed')
    return true
  })
  harness.inputByValue('蓝色大肥鱼').props.onChange({ target: { value: 'persona 失败草稿' } })
  await harness.click('保存')
  assert.deepEqual(calls.map(([field]) => field), ['persona'])
  assert.ok(harness.inputByValue('persona 失败草稿'))
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).includes('persona failed')))
})

test('v5 回滚：revision 失败回滚 enabled/persona', async () => {
  const calls = []
  const harness = makeHarness(baseState, async (field, value) => {
    calls.push([field, value])
    if (field === 'personaRevision') throw new Error('revision failed')
    return true
  })
  harness.inputByValue('蓝色大肥鱼').props.onChange({ target: { value: 'revision 失败草稿' } })
  await harness.click('保存')
  assert.deepEqual(calls.map(([field]) => field), ['persona', 'personaEnabled', 'personaRevision', 'personaEnabled', 'persona'])
  assert.equal(calls[3][1], false)
  assert.equal(calls[4][1], whale)
  assert.ok(harness.inputByValue('revision 失败草稿'))
})

test('v5 回滚：写后读回不一致触发六字段回滚', async () => {
  const calls = []
  const harness = makeHarness(
    baseState,
    async (field, value) => { calls.push([field, value]); return true },
    { readFields: () => ({ status: 'ready', writable: true, value: { persona: 'not-the-doc', personaEnabled: true, personaRevision: 99, personaName: 'x', personaSignature: 'y', personaAvatar: 'z' } }) },
  )
  harness.inputByValue('蓝色大肥鱼').props.onChange({ target: { value: '读回失败草稿' } })
  await harness.click('保存')
  assert.ok(harness.inputByValue('读回失败草稿'))
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).includes('写后读回校验失败')))
  assert.deepEqual(calls.map(([field]) => field), [
    'persona', 'personaEnabled', 'personaRevision', 'personaName', 'personaSignature', 'personaAvatar',
    'personaAvatar', 'personaSignature', 'personaName', 'personaRevision', 'personaEnabled', 'persona',
  ])
})

test('v5 缺少读回接口：不宣布保存成功', async () => {
  const harness = makeHarness(baseState, async () => true, { readFields: undefined })
  harness.inputByValue('蓝色大肥鱼').props.onChange({ target: { value: '无读回草稿' } })
  await harness.click('保存')
  assert.ok(harness.inputByValue('无读回草稿'))
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).includes('缺少配置读回接口')))
})

test('v5 readonly：档案行/字段/保存/恢复默认全部禁用', () => {
  const harness = makeHarness({ status: 'ready', writable: false, value: { persona: whale, personaEnabled: true } }, async () => true)
  assert.equal(harness.findButton('保存').props.disabled, true)
  assert.equal(harness.findButton('恢复默认').props.disabled, true)
  assert.equal(harness.nodes().find((item) => item.props.id === 'dss-username').props.disabled, true)
  assert.equal(harness.findTextarea('搞怪/傲娇').props.disabled, true)
  assert.equal(harness.nodes().some((item) => item.type === 'input' && item.props.type === 'file'), true)
  const file = harness.nodes().find((item) => item.type === 'input' && item.props.type === 'file')
  assert.equal(file.props.disabled, true)
})

test('v5 头像：上传后裁压到 128px JPEG，保存 personaAvatar；恢复默认清空', async () => {
  const calls = []
  const harness = makeHarness(baseState, async (field, value) => { calls.push([field, value]) })
  const fileInput = harness.nodes().find((item) => item.type === 'input' && item.props.type === 'file')
  assert.ok(fileInput)
  fileInput.props.onChange({ target: { files: [{ type: 'image/png' }], value: '' } })
  assert.ok(harness.nodes().some((item) => item.type === 'img' && item.props.src === 'data:image/jpeg;base64,AAAA'), 'profile avatar must sync')
  assert.equal(harness.findButton('保存').props.disabled, false)
  await harness.click('保存')
  assert.ok(calls.some(([field, value]) => field === 'personaAvatar' && value === 'data:image/jpeg;base64,AAAA'))
  await harness.click('恢复默认')
  assert.equal(harness.nodes().some((item) => item.type === 'img' && item.props.src === 'data:image/jpeg;base64,AAAA'), false)
  const defaultAvatar = harness.nodes().find((item) => item.type === 'img' && String(item.props.src).startsWith('data:image/jpeg;base64,/9j/'))
  assert.ok(defaultAvatar, 'profile avatar must restore the built-in whale avatar')
})

test('v5 tabGuard：dirty 时确认，clean 时放行', () => {
  const guard = {}
  const harness = makeHarness(baseState, async () => true, { tabGuard: guard })
  assert.equal(guard.confirm(), true)
  harness.findTextarea('搞怪/傲娇').props.onChange({ target: { value: '草稿' } })
  harness.setWindowConfirm(false)
  assert.equal(guard.confirm(), false)
  harness.setWindowConfirm(true)
  assert.equal(guard.confirm(), true)
})

test('v5 模板：默认鲸鱼可删空后提示恢复默认；另存模板不自动选中', async () => {
  const harness = makeHarness(baseState, async () => true)
  await harness.click('切换人格')
  assert.ok(harness.findButton('×'))
  await harness.click('×')
  const text = harness.nodes().map((item) => String(textOf(item.props.children))).join(' ')
  assert.match(text, /模板已全部删除 · 用底部「恢复默认」找回/)
  await harness.click('＋ 将当前草稿另存为模板')
  const saved = JSON.parse(harness.window.localStorage.getItem('dsh-structured.tone.v5.templates'))
  assert.equal(saved.customs.length, 1)
  assert.equal(saved.customs[0].name, '蓝色大肥鱼')
  assert.equal(saved.customs[0].signature, '主人，再来一碗白米饭！！~')
  assert.equal(harness.findButton('保存').props.disabled, true, 'save-as-template must not select the new template')
})

test('1.2.0 预览：结论 / 讲解 / 建议 / 风险 / 短答 / 表格 / 代码走同一渲染管线', () => {
  const harness = makeHarness(baseState, async () => true)
  const api = harness.api
  assert.equal(JSON.stringify(api.previewCards), JSON.stringify(['conclusion', 'explain', 'suggestion', 'risk', 'short', 'table', 'code']))
  const conclusion = api.previewCardMarkup('conclusion')
  assert.match(conclusion, /能上，分两步走/)
  assert.match(conclusion, /data-dsh-structured-card-type="conclusion"/)
  const explain = api.previewCardMarkup('explain')
  assert.match(explain, /讲解/)
  assert.match(explain, /dss-card-explain/)
  assert.match(explain, /像试水温/)
  const risk = api.previewCardMarkup('risk')
  assert.match(risk, /自动更新跳过确认/)
  assert.match(risk, /dss-card-risk/)
  const short = api.previewCardMarkup('short')
  assert.match(short, /收到，灰阶主题已按宿主配色对齐。/)
  assert.match(short, /data-dsh-structured-card-type="short"/)
  const table = api.previewCardMarkup('table')
  assert.match(table, /检查项/)
  assert.match(table, /data-dsh-structured-status-table="1"/)
  // 状态只写属性、不再往 React 管理的单元格里塞胶囊节点（issue #5 的崩溃源）。
  assert.match(table, /data-dsh-structured-status-cell="success"/)
  const code = api.previewCardMarkup('code')
  assert.match(code, /tone-loader\.js/)
  assert.match(code, /dss-code/)
  assert.doesNotMatch(conclusion + explain + risk + short + table + code, /data-dsh-structured-status-pill/)

  // 整页渲染：七格预览一次看全，标题逐字。
  const page = makeHarness({ status: 'ready', writable: true, value: { theme: 'deepseek', contentDepth: 'general', personaEnabled: true } }, async () => true, { renderCard: true })
  const cells = page.nodes().filter((item) => String(item.props.className ?? '').split(/\s+/).includes('dss-preview-cell'))
  assert.equal(cells.length, 7)
  const titles = cells.map((item) => String(textOf(item.props.children?.[0]?.props?.children ?? item.props.children)))
  assert.equal(JSON.stringify(titles), JSON.stringify(['结论', '讲解', '建议', '风险', '短答', '表格', '代码']))
})

test('PersonaMode：预览与真实同源（内容对象 → 同一 renderer）', () => {
  const harness = makeHarness(baseState, async () => true)
  const persona = { prefix: 'Boss，', suffix: '——完' }
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', ...persona, style: '搞怪', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })
  const flowFor = (html) => {
    const flow = harness.document.createElement('div')
    flow.setAttribute('data-chat-flow-kind', 'assistant-step')
    flow.setAttribute('data-chat-node-key', 'same-' + Math.random())
    const slot = harness.document.createElement('div')
    slot.setAttribute('data-slot', 'conversation.chat.node')
    const markdown = harness.document.createElement('div')
    markdown.className = '_markdown_preview'
    markdown.innerHTML = html
    slot.appendChild(markdown)
    flow.appendChild(slot)
    harness.document.body.appendChild(flow)
    harness.plugin.__test.decorate(flow)
    return { flow, markdown }
  }
  const hooks = (root) => ({
    cards: [...root.querySelectorAll('[data-dsh-structured-card]')].map((el) => [el.className, el.getAttribute('data-dsh-structured-card-type')]),
    pills: [...root.querySelectorAll('[data-dsh-structured-status-pill]')].map((el) => el.className),
    statusTables: root.querySelectorAll('[data-dsh-structured-status-table]').length,
    copies: root.querySelectorAll('[data-dsh-structured-copy]').length,
    code: root.querySelectorAll('[data-dsh-structured-code]').length,
  })
  for (const sample of ['normal', 'table', 'short']) {
    const content = harness.api.previewContent(sample, '搞怪')
    const raw = flowFor(personaEnvelope(content))
    const previewHost = harness.document.createElement('div')
    previewHost.innerHTML = harness.api.previewHtml(sample, '搞怪', harness.document, persona)
    assert.deepEqual(hooks(previewHost), hooks(raw.flow), 'hooks must match for ' + sample)
    assert.equal(raw.flow.querySelectorAll('[data-dsh-persona-head]').length, 1)
    assert.equal(previewHost.querySelectorAll('[data-dsh-persona-head]').length, 1)
  }
  const codeBlock = '<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">js</span><div class="_actions_persona"></div></div></div><div data-code-block-content><pre>const x = 1</pre></div></div>'
  const rawCode = flowFor(codeBlock)
  const previewCode = harness.document.createElement('div')
  previewCode.innerHTML = harness.api.previewHtml('code', '搞怪', harness.document, persona)
  assert.deepEqual(hooks(previewCode), hooks(rawCode.flow), 'hooks must match for code')
})

test('PersonaMode：normal/table/short 由内容块固定渲染；无 Persona Markdown 结构', () => {
  const harness = makeHarness(baseState, async () => true)
  const persona = { prefix: 'Boss，', suffix: '——完' }
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', ...persona, style: '搞怪', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: '审计鲸鱼', personaSignature: '签名', personaAvatar: '' })
  const flowFor = (html) => {
    const flow = harness.document.createElement('div')
    flow.setAttribute('data-chat-flow-kind', 'assistant-step')
    flow.setAttribute('data-chat-node-key', 'content-' + Math.random())
    const slot = harness.document.createElement('div')
    slot.setAttribute('data-slot', 'conversation.chat.node')
    const markdown = harness.document.createElement('div')
    markdown.className = '_markdown_preview'
    markdown.innerHTML = html
    slot.appendChild(markdown)
    flow.appendChild(slot)
    harness.document.body.appendChild(flow)
    harness.plugin.__test.decorate(flow)
    return { flow, markdown }
  }
  const normal = flowFor(personaEnvelope({ version: 1, kind: 'normal', conclusion: { lead: '能上', body: '先灰度' }, suggestions: ['跑链路', '收回滚'], risk: '回滚未演练' }))
  assert.equal(normal.markdown.getAttribute('data-dsh-persona-kind'), 'normal')
  assert.equal(normal.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3)
  assert.equal(normal.markdown.querySelectorAll('.md-code-block').length, 0, 'envelope must be consumed')
  assert.ok(normal.markdown.querySelector('.dss-persona-prefix'))
  assert.ok(normal.markdown.querySelector('.dss-persona-suffix'))
  assert.match(normal.flow.textContent, /审计鲸鱼/)
  assert.match(normal.markdown.textContent, /结论能上/)
  assert.match(normal.markdown.textContent, /建议/)
  assert.doesNotMatch(normal.markdown.textContent, /下一步/)
  const nextCard = [...normal.markdown.querySelectorAll('[data-dsh-structured-card-type="next"]')]
  assert.equal(nextCard.length, 1)
  assert.match(nextCard[0].textContent, /建议/)

  const table = flowFor(personaEnvelope({ version: 1, kind: 'table', conclusion: { lead: '验收表', body: '' }, suggestions: ['补测'], risk: '无已知风险', table: { head: ['项', '状态'], rows: [['A', '通过'], ['B', '阻断']] } }))
  assert.equal(table.markdown.getAttribute('data-dsh-persona-kind'), 'table')
  assert.equal(table.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3)
  assert.equal(table.markdown.querySelectorAll('table').length, 1)
  assert.equal(table.markdown.querySelector('.dss-persona-suffix'), null, 'table has no suffix')

  const short = flowFor(personaEnvelope({ version: 1, kind: 'short', text: '现在三点。' }))
  assert.equal(short.markdown.getAttribute('data-dsh-persona-kind'), 'short')
  assert.equal(short.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 1)
  assert.equal(short.markdown.querySelector('[data-dsh-structured-card-type]').getAttribute('data-dsh-structured-card-type'), 'short')
  assert.ok(short.markdown.querySelector('.dss-persona-prefix'))
  assert.equal(short.markdown.querySelector('.dss-persona-suffix'), null, 'short has no suffix')
})

test('PersonaMode：conclusion.points 渲染字母要点；body 仅作历史兼容', () => {
  const harness = makeHarness(baseState, async () => true)
  const persona = { prefix: '', suffix: '' }
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', ...persona, style: '搞怪', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })
  const flowFor = (html) => {
    const flow = harness.document.createElement('div')
    flow.setAttribute('data-chat-flow-kind', 'assistant-step')
    flow.setAttribute('data-chat-node-key', 'points-' + Math.random())
    const slot = harness.document.createElement('div')
    slot.setAttribute('data-slot', 'conversation.chat.node')
    const markdown = harness.document.createElement('div')
    markdown.className = '_markdown_preview'
    markdown.innerHTML = html
    slot.appendChild(markdown)
    flow.appendChild(slot)
    harness.document.body.appendChild(flow)
    harness.plugin.__test.decorate(flow)
    return { flow, markdown }
  }
  const points = flowFor(personaEnvelope({ version: 1, kind: 'normal', conclusion: { lead: '能上', points: ['先灰度一周。', '回滚先验收。'] }, suggestions: ['跑一条真实链路'], risk: '回滚未演练' }))
  const list = points.markdown.querySelector('.dss-card-conclusion ol.dss-points')
  assert.ok(list, 'points must render as an ordered list')
  assert.deepEqual([...list.querySelectorAll('li')].map((li) => li.textContent), ['先灰度一周。', '回滚先验收。'])
  const api = harness.plugin.__test.cardCopyApi()
  assert.equal(api.personaCardPlainText(points.markdown.querySelector('.dss-card-conclusion')), '能上\nA. 先灰度一周。\nB. 回滚先验收。')

  const longPoint = '这是一条明显超过三十二个字的结论要点，用来证明插件没有字数硬限，不会被判不合规。'
  const longPoints = flowFor(personaEnvelope({ version: 1, kind: 'normal', conclusion: { lead: '能上', points: [longPoint] }, suggestions: ['跑一条真实链路'], risk: '回滚未演练' }))
  assert.equal(longPoints.markdown.getAttribute('data-dsh-persona-kind'), 'normal')
  assert.equal(longPoints.markdown.querySelector('.dss-card-conclusion ol.dss-points li').textContent, longPoint)

  const legacy = flowFor(personaEnvelope({ version: 1, kind: 'normal', conclusion: { lead: '旧格式', body: '先灰度' }, suggestions: ['S'], risk: 'R' }))
  assert.equal(legacy.markdown.querySelectorAll('ol.dss-points').length, 0)
  assert.match(legacy.markdown.textContent, /先灰度/)
})

test('PersonaMode：explanation 渲染为「讲解」卡，插在结论与表格之间且不参与编号', () => {
  const harness = makeHarness(baseState, async () => true)
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', prefix: '', suffix: '', style: '搞怪', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })
  const flowFor = (html) => {
    const flow = harness.document.createElement('div')
    flow.setAttribute('data-chat-flow-kind', 'assistant-step')
    flow.setAttribute('data-chat-node-key', 'explain-' + Math.random())
    const slot = harness.document.createElement('div')
    slot.setAttribute('data-slot', 'conversation.chat.node')
    const markdown = harness.document.createElement('div')
    markdown.className = '_markdown_preview'
    markdown.innerHTML = html
    slot.appendChild(markdown)
    flow.appendChild(slot)
    harness.document.body.appendChild(flow)
    harness.plugin.__test.decorate(flow)
    return { flow, markdown }
  }
  const withExplanation = flowFor(personaEnvelope({
    version: 1,
    kind: 'table',
    conclusion: { lead: '能上，先灰度', points: ['先小范围验证。'] },
    explanation: { analogy: '像试水温：先用手背试，再决定要不要下水。', example: '先拿一个现网账号跑灰度。' },
    suggestions: ['跑通一条真实链路'],
    risk: '回滚未演练',
    table: { head: ['模块', '状态'], rows: [['注入链路', '✅ 通过']] },
  }))
  const cards = [...withExplanation.markdown.querySelectorAll('blockquote')]
  assert.equal(cards.length, 4, '结论 / 讲解 / 建议 / 风险')
  assert.ok(cards[1].classList.contains('dss-card-explain'), 'explanation must render as explain card')
  assert.equal(cards[1].querySelector('p > strong').textContent, '讲解')
  assert.deepEqual([...cards[1].querySelectorAll('p')].map((p) => p.textContent), [
    '讲解',
    '类比：像试水温：先用手背试，再决定要不要下水。',
    '举例：先拿一个现网账号跑灰度。',
  ])
  assert.equal(cards[1].querySelectorAll('ol').length, 0, '讲解卡不参与 A/B/C 编号')
  assert.equal(cards[1].querySelector('[data-dsh-card-copy]').getAttribute('data-dsh-card-copy'), '讲解')
  const api = harness.plugin.__test.cardCopyApi()
  assert.equal(api.personaCardPlainText(cards[1]), '类比：像试水温：先用手背试，再决定要不要下水。\n举例：先拿一个现网账号跑灰度。')
  const order = [...withExplanation.markdown.children].map((node) => {
    if (node.matches?.('blockquote')) return (node.querySelector('p > strong')?.textContent ?? '').trim()
    if (node.matches?.('.dss-table-wrap')) return 'table'
    return ''
  }).filter(Boolean)
  assert.deepEqual(order.slice(0, 4), ['结论', '讲解', 'table', '建议'])

  const without = flowFor(personaEnvelope({ version: 1, kind: 'normal', conclusion: { lead: '能上' }, suggestions: ['跑链路'], risk: '回滚未演练' }))
  assert.equal(without.markdown.querySelectorAll('.dss-card-explain').length, 0, '没有 explanation 就不出讲解卡')
})

test('PersonaMode：表行小写索引与结论大写要点分层，TSV 复制带索引', () => {
  const harness = makeHarness(baseState, async () => true)
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', prefix: '', style: '搞怪', suffix: '', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })
  const flow = harness.document.createElement('div')
  flow.setAttribute('data-chat-flow-kind', 'assistant-step')
  flow.setAttribute('data-chat-node-key', 'layers-' + Math.random())
  const slot = harness.document.createElement('div')
  slot.setAttribute('data-slot', 'conversation.chat.node')
  const markdown = harness.document.createElement('div')
  markdown.className = '_markdown_preview'
  markdown.innerHTML = personaEnvelope({
    version: 1,
    kind: 'table',
    conclusion: { lead: '能上，先灰度', points: ['先灰度一周。', '回滚先验收。'] },
    suggestions: ['跑通一条真实链路'],
    risk: '自动更新跳过确认',
    table: { head: ['模块', '状态'], rows: [['注入链路', '✅ 通过'], ['代码皮肤', '❌ 阻断']] },
  })
  slot.appendChild(markdown)
  flow.appendChild(slot)
  harness.document.body.appendChild(flow)
  harness.plugin.__test.decorate(flow)

  assert.equal(markdown.querySelectorAll('ol.dss-points li').length, 2)
  const rows = [...markdown.querySelectorAll('.dss-table tbody tr')]
  assert.deepEqual(rows.map((tr) => tr.querySelector('td')?.getAttribute('data-dss-row-index')), ['a', 'b'])
  assert.equal(rows[0].querySelector('td').textContent, '注入链路', '索引不能污染单元格文本')
  assert.equal(markdown.querySelector('.dss-table thead [data-dss-row-index]'), null, '表头不编号')
  const api = harness.plugin.__test.cardCopyApi()
  assert.equal(api.personaTableTsv(markdown.querySelector('table')), '模块\t状态\na 注入链路\t✅ 通过\nb 代码皮肤\t❌ 阻断')
  assert.match(api.personaReplyPlainText(markdown), /a 注入链路/)
})

test('PersonaMode：rc.2 fenceSeat 包裹的 persona 块照样出卡，不残留原始 JSON', () => {
  const harness = makeHarness(baseState, async () => true)
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', prefix: 'Boss，', style: '搞怪', suffix: '——完', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })
  const flow = harness.document.createElement('div')
  flow.setAttribute('data-chat-flow-kind', 'assistant-step')
  flow.setAttribute('data-chat-node-key', 'seated-' + Math.random())
  const slot = harness.document.createElement('div')
  slot.setAttribute('data-slot', 'conversation.chat.node')
  const markdown = harness.document.createElement('div')
  markdown.className = '_markdown_preview'
  markdown.innerHTML = personaEnvelopeSeated({ version: 1, kind: 'normal', conclusion: { lead: '包裹层修复', body: '' }, suggestions: ['重启验证'], risk: '无' })
  slot.appendChild(markdown)
  flow.appendChild(slot)
  harness.document.body.appendChild(flow)
  harness.plugin.__test.decorate(flow)
  assert.equal(markdown.getAttribute('data-dsh-persona-kind'), 'normal', 'seated envelope must render as cards')
  assert.equal(markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3, 'three cards must render')
  assert.equal(markdown.querySelectorAll('.md-code-block').length, 0, 'seated envelope must be consumed')
  assert.equal(markdown.querySelectorAll('[class*="_fenceSeat"]').length, 0, 'empty fence seat must not remain')
  assert.doesNotMatch(markdown.textContent, /"version":1/, 'raw JSON must not be shown')
  assert.match(markdown.textContent, /包裹层修复/, 'lead must render')
  assert.match(markdown.textContent, /块外正文/, 'outside prose must survive')
})

test('PersonaMode：裸 JSON 信封（不包围栏）按合同还原为卡片', () => {
  const harness = makeHarness(baseState, async () => true)
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', prefix: 'Boss，', style: '搞怪', suffix: '——完', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })
  const flow = harness.document.createElement('div')
  flow.setAttribute('data-chat-flow-kind', 'assistant-step')
  flow.setAttribute('data-chat-node-key', 'bare-' + Math.random())
  const slot = harness.document.createElement('div')
  slot.setAttribute('data-slot', 'conversation.chat.node')
  const markdown = harness.document.createElement('div')
  markdown.className = '_markdown_preview'
  const payload = { version: 1, kind: 'normal', conclusion: { lead: '结论', body: '正文' }, suggestions: ['建议'], risk: '风险' }
  markdown.innerHTML = '<p>' + JSON.stringify(payload) + '</p>'
  slot.appendChild(markdown)
  flow.appendChild(slot)
  harness.document.body.appendChild(flow)
  harness.plugin.__test.decorate(flow)
  assert.equal(markdown.getAttribute('data-dsh-persona-kind'), 'normal', 'bare envelope must render as cards')
  assert.equal(markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3, 'three cards must render')
  assert.doesNotMatch(markdown.textContent, /\"version\"/, 'raw JSON must not be shown')
  assert.match(markdown.textContent, /结论/, 'lead must render')
  assert.match(markdown.textContent, /风险/, 'risk must render')
})
test('PersonaMode：缺块 legacy、非法块 error，不补卡、不回落；code 例外；关闭清理', () => {
  const harness = makeHarness(baseState, async () => true)
  const persona = { prefix: 'Boss，', suffix: '——完' }
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', ...persona, style: '搞怪', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  const config = { personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' }
  harness.plugin.__test.setPersonaModeConfig(config)
  const flowFor = (html) => {
    const flow = harness.document.createElement('div')
    flow.setAttribute('data-chat-flow-kind', 'assistant-step')
    flow.setAttribute('data-chat-node-key', 'err-' + Math.random())
    const slot = harness.document.createElement('div')
    slot.setAttribute('data-slot', 'conversation.chat.node')
    const markdown = harness.document.createElement('div')
    markdown.className = '_markdown_preview'
    markdown.innerHTML = html
    slot.appendChild(markdown)
    flow.appendChild(slot)
    harness.document.body.appendChild(flow)
    harness.plugin.__test.decorate(flow)
    return { flow, markdown }
  }
  const missing = flowFor('<p>Boss，</p><p>现在几点了，顺便把周报整理一下。</p>')
  // 缺块不是错误：普通回复保留原文并走 legacy，只有块存在但非法才 error。
  assert.equal(missing.markdown.getAttribute('data-dsh-persona-kind'), null)
  assert.equal(missing.markdown.getAttribute('data-dsh-persona-error'), null)
  assert.equal(missing.markdown.getAttribute('data-dsh-persona-pending'), null)
  assert.match(missing.markdown.textContent, /现在几点了/, 'legacy content must be preserved')
  assert.equal(missing.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 0, 'must not fabricate cards')
  assert.equal(missing.flow.querySelectorAll('[data-dsh-persona-head]').length, 0, 'no envelope → no identity header')
  harness.flushPersonaErrors()
  assert.equal(missing.markdown.getAttribute('data-dsh-persona-kind'), null)
  assert.equal(missing.markdown.getAttribute('data-dsh-persona-error'), null)

  const invalid = flowFor('<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span></div></div><div data-code-block-content><pre>{bad json}</pre></div></div>')
  assert.equal(invalid.markdown.getAttribute('data-dsh-persona-error'), null, 'incomplete JSON waits for the grace window')
  assert.equal(invalid.markdown.getAttribute('data-dsh-persona-pending'), '1')
  harness.flushPersonaErrors()
  assert.equal(invalid.markdown.getAttribute('data-dsh-persona-kind'), 'legacy')
  assert.equal(invalid.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 0)

  const unknown = flowFor(personaEnvelope({ version: 1, kind: 'normal', conclusion: { lead: 'L' }, suggestions: ['S'], risk: 'R', extra: 1 }))
  harness.flushPersonaErrors()
  // 多一个未定义字段不再整条降级：内容完整就照常出卡，且不得把原始 JSON 摊给用户。
  assert.equal(unknown.markdown.getAttribute('data-dsh-persona-kind'), 'normal')
  assert.equal(unknown.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3)
  assert.match(unknown.markdown.textContent, /L/)
  assert.match(unknown.markdown.textContent, /S/)
  assert.match(unknown.markdown.textContent, /R/)
  assert.doesNotMatch(unknown.markdown.textContent, /"version"/)

  const code = flowFor('<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">js</span></div></div><div data-code-block-content><pre>const x = 1</pre></div></div>')
  assert.equal(code.markdown.getAttribute('data-dsh-persona-kind'), 'code')
  assert.equal(code.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 0)
  assert.equal(code.flow.querySelectorAll('[data-dsh-persona-head]').length, 0, 'code without envelope → no identity header')

  const normal = flowFor(personaEnvelope({ version: 1, kind: 'normal', conclusion: { lead: 'L' }, suggestions: ['S'], risk: 'R' }))
  assert.ok(normal.markdown.querySelector('.dss-persona-prefix'))
  assert.ok(normal.markdown.querySelector('.dss-persona-suffix'))
  harness.plugin.__test.setPersonaModeConfig({ ...config, personaEnabled: false })
  harness.plugin.__test.decorate(normal.flow)
  harness.plugin.__test.decorate(missing.flow)
  for (const item of [normal, missing]) {
    assert.equal(item.flow.querySelectorAll('[data-dsh-persona-head]').length, 0)
    assert.equal(item.markdown.getAttribute('data-dsh-persona-kind'), null)
    assert.equal(item.markdown.getAttribute('data-dsh-persona-error'), null)
    assert.equal(item.markdown.querySelectorAll('.dss-persona-prefix, .dss-persona-suffix').length, 0)
  }

  const freshDisabled = flowFor(personaEnvelope({ version: 1, kind: 'normal', conclusion: { lead: '关闭后仍出卡', points: ['要点'] }, suggestions: ['S'], risk: 'R' }))
  assert.equal(freshDisabled.flow.querySelectorAll('[data-dsh-persona-head]').length, 0)
  assert.equal(freshDisabled.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3)
  assert.equal(freshDisabled.markdown.querySelectorAll('.dss-persona-prefix, .dss-persona-suffix').length, 0)
  assert.doesNotMatch(freshDisabled.markdown.textContent, /"version"/)

  const freshShort = flowFor(personaEnvelope({ version: 1, kind: 'short', text: '关闭后短答也出卡。' }))
  assert.equal(freshShort.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 1)
  assert.equal(freshShort.markdown.querySelector('[data-dsh-structured-card-type]').getAttribute('data-dsh-structured-card-type'), 'short')
  assert.equal(freshShort.flow.querySelectorAll('[data-dsh-persona-head]').length, 0)
  assert.doesNotMatch(freshShort.markdown.textContent, /"version"/)
})

test('PersonaMode：幂等、旧历史、流式、no-flow、diff、关闭文本', () => {
  const harness = makeHarness(baseState, async () => true)
  const persona = { prefix: 'Boss，', suffix: '——完' }
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', ...persona, style: '搞怪', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  const config = { personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' }
  const buildFlow = (html, kind = 'assistant-step') => {
    const flow = harness.document.createElement('div')
    flow.setAttribute('data-chat-flow-kind', kind)
    flow.setAttribute('data-chat-node-key', 'runtime-' + Math.random())
    const slot = harness.document.createElement('div')
    slot.setAttribute('data-slot', 'conversation.chat.node')
    const markdown = harness.document.createElement('div')
    markdown.className = '_markdown_preview'
    markdown.innerHTML = html
    slot.appendChild(markdown)
    flow.appendChild(slot)
    harness.document.body.appendChild(flow)
    return { flow, markdown }
  }
  const flowFor = (html, kind) => {
    const item = buildFlow(html, kind)
    harness.plugin.__test.decorate(item.flow)
    return item
  }
  // 旧历史：在 PersonaMode 激活前就已存在；激活后不回溯重写。
  const old = buildFlow('<p>旧消息正文</p>')
  harness.plugin.__test.setPersonaModeConfig(config)
  const normalContent = { version: 1, kind: 'normal', conclusion: { lead: 'L' }, suggestions: ['S'], risk: 'R' }

  harness.plugin.__test.decorate(old.flow, { fresh: false })
  assert.equal(old.markdown.getAttribute('data-dsh-persona-kind'), null, 'old history must not be rewritten')
  assert.equal(old.markdown.getAttribute('data-dsh-persona-error'), null)
  assert.equal(old.markdown.getAttribute('data-dsh-persona-pending'), null)
  assert.match(old.markdown.textContent, /旧消息正文/)
  // 配置变化不应全量重扫旧历史。
  harness.plugin.__test.setPersonaModeConfig({ ...config, personaName: '改个名字' })
  assert.equal(old.markdown.getAttribute('data-dsh-persona-kind'), null)
  assert.equal(old.markdown.getAttribute('data-dsh-persona-error'), null)
  harness.plugin.__test.setPersonaModeConfig(config)

  const normal = flowFor(personaEnvelope(normalContent))
  assert.equal(normal.markdown.getAttribute('data-dsh-persona-kind'), 'normal')
  harness.plugin.__test.decorate(normal.flow)
  harness.plugin.__test.decorate(normal.markdown)
  assert.equal(normal.markdown.getAttribute('data-dsh-persona-kind'), 'normal', 'redecorate must stay normal')
  assert.equal(normal.markdown.getAttribute('data-dsh-persona-error'), null)
  assert.equal(normal.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3)
  assert.doesNotMatch(normal.markdown.textContent, /内容合同错误/)

  const real = harness.document.createElement('div')
  real.className = 'flowItem'
  const assistant = harness.document.createElement('div')
  assistant.className = 'assistantContent'
  const realSlot = harness.document.createElement('div')
  realSlot.setAttribute('data-slot', 'conversation.chat.node')
  const realMarkdown = harness.document.createElement('div')
  realMarkdown.className = '_markdown_'
  realMarkdown.innerHTML = personaEnvelopePlain(normalContent)
  realSlot.appendChild(realMarkdown)
  assistant.appendChild(realSlot)
  real.appendChild(assistant)
  harness.document.body.appendChild(real)
  harness.plugin.__test.decorate(real)
  assert.equal(realMarkdown.getAttribute('data-dsh-persona-kind'), 'normal', 'real assistantContent class must render')
  assert.equal(real.querySelectorAll('[data-dsh-persona-head]').length, 1)

  const slotOnly = harness.document.createElement('div')
  slotOnly.className = 'flowItem'
  const slot = harness.document.createElement('div')
  slot.setAttribute('data-slot', 'conversation.chat.node')
  const slotMarkdown = harness.document.createElement('div')
  slotMarkdown.className = '_markdown_'
  slotMarkdown.innerHTML = personaEnvelope(normalContent)
  slot.appendChild(slotMarkdown)
  slotOnly.appendChild(slot)
  harness.document.body.appendChild(slotOnly)
  harness.plugin.__test.decorate(slotOnly)
  assert.equal(slotMarkdown.getAttribute('data-dsh-persona-kind'), 'normal', 'slot parent fallback must render')
  assert.equal(slotOnly.querySelectorAll('[data-dsh-persona-head]').length, 1)

  // 流式半截：先保留内容，不立刻 error；块完成后恢复 normal。
  const partial = flowFor('<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span></div></div><div data-code-block-content><pre>{"version":1,"kind":"normal",</pre></div></div>')
  assert.equal(partial.markdown.getAttribute('data-dsh-persona-kind'), null, 'partial stream must not error')
  assert.equal(partial.markdown.getAttribute('data-dsh-persona-error'), null)
  assert.equal(partial.markdown.getAttribute('data-dsh-persona-pending'), '1')
  assert.equal(partial.markdown.querySelectorAll('.md-code-block').length, 1, 'partial block must be preserved')
  // 以 `}` 结尾但字段不全的半截 payload 也不能立即 error。
  const halfClosed = flowFor('<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span></div></div><div data-code-block-content><pre>{"version":1,"kind":"normal","conclusion":{"lead":"L"}}</pre></div></div>')
  assert.equal(halfClosed.markdown.getAttribute('data-dsh-persona-kind'), null)
  assert.equal(halfClosed.markdown.getAttribute('data-dsh-persona-error'), null)
  assert.equal(halfClosed.markdown.getAttribute('data-dsh-persona-pending'), '1')
  partial.markdown.innerHTML = personaEnvelope(normalContent)
  harness.plugin.__test.decorate(partial.flow)
  assert.equal(partial.markdown.getAttribute('data-dsh-persona-kind'), 'normal', 'completed stream must render')
  assert.equal(partial.markdown.getAttribute('data-dsh-persona-pending'), null)

  // 不在会话容器里的 markdown（插件设置页 / 市场详情页 / 文档预览）不是模型回复：
  // 不套内容合同、不弹错误卡、不挂身份头，原文完整保留。
  const loose = harness.document.createElement('div')
  loose.className = '_markdown_preview'
  loose.innerHTML = '<p>no flow</p>'
  harness.document.body.appendChild(loose)
  harness.plugin.__test.decorate(loose)
  assert.equal(loose.getAttribute('data-dsh-persona-kind'), null, 'non-chat markdown must not be judged by the content contract')
  assert.equal(loose.getAttribute('data-dsh-persona-error'), null, 'non-chat markdown must never show a contract error card')
  assert.doesNotMatch(loose.textContent, /内容合同错误|未找到 assistant 消息容器/)
  assert.match(loose.textContent, /no flow/, 'non-chat content must be preserved')

  // 回归：插件设置页把项目 README 渲染成 markdown（含标题、徽章、代码块、引用块），
  // 之前会被当成 assistant 回复并弹出「内容合同错误 / 未找到 assistant 消息容器」。
  const settingsPanel = harness.document.createElement('div')
  settingsPanel.setAttribute('data-slot', 'settings.detail')
  const readme = harness.document.createElement('div')
  readme.className = '_markdown_preview'
  readme.innerHTML = '<h2>DSH Archive Manager</h2><p>归档、恢复、收藏和永久删除会话。</p><blockquote><p>社区维护的插件</p></blockquote><pre>npm i @nichengsi/dsh-archive-manager</pre>'
  settingsPanel.appendChild(readme)
  harness.document.body.appendChild(settingsPanel)
  harness.plugin.__test.decorate(settingsPanel)
  assert.equal(readme.getAttribute('data-dsh-persona-error'), null, 'plugin settings page must stay free of contract errors')
  assert.equal(settingsPanel.querySelectorAll('[data-dsh-persona-head]').length, 0, 'no identity header outside chat')
  assert.match(readme.textContent, /DSH Archive Manager/, 'README content must survive')
  // 用户消息不是 assistant 回复，不套内容合同。
  const userFlow = flowFor('<p>用户消息</p>', 'user')
  assert.equal(userFlow.markdown.getAttribute('data-dsh-persona-kind'), null)
  assert.equal(userFlow.markdown.getAttribute('data-dsh-persona-error'), null)
  assert.match(userFlow.markdown.textContent, /用户消息/)
  assert.equal(userFlow.flow.querySelectorAll('[data-dsh-persona-head]').length, 0)

  const diff = flowFor('<div class="md-diff"><p>diff text</p></div>')
  assert.equal(diff.markdown.getAttribute('data-dsh-persona-kind'), 'diff')
  assert.equal(diff.markdown.getAttribute('data-dsh-persona-error'), null, 'diff is an exception, not a content error')
  assert.equal(diff.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 0)
  const errorReply = flowFor('<div data-error="1"><p>error text</p></div>')
  assert.equal(errorReply.markdown.getAttribute('data-dsh-persona-kind'), 'exception')
  assert.equal(errorReply.markdown.getAttribute('data-dsh-persona-error'), null)
  assert.equal(errorReply.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 0)

  const six = flowFor(personaEnvelope({ ...normalContent, suggestions: ['1', '2', '3', '4', '5', '6'] }))
  assert.equal(six.markdown.getAttribute('data-dsh-persona-error'), null, '6 suggestions enter the grace window first')
  harness.flushPersonaErrors()
  // 超合同上限的建议不再整条降级：全部保留展示，不能丢第 6 条。
  assert.equal(six.markdown.getAttribute('data-dsh-persona-kind'), 'normal', '6 suggestions still render cards')
  assert.match(six.markdown.textContent, /6/, 'the 6th suggestion must survive')
  const rows = Array.from({ length: 21 }, (_, i) => [String(i), 'x'])
  const tooMany = flowFor(personaEnvelope({ version: 1, kind: 'table', conclusion: { lead: 'L' }, suggestions: ['S'], risk: 'R', table: { head: ['A', 'B'], rows } }))
  harness.flushPersonaErrors()
  assert.equal(tooMany.markdown.getAttribute('data-dsh-persona-kind'), 'table', '21 table rows still render a table')
  assert.match(tooMany.markdown.textContent, /20/, 'the last row must survive')

  const close = flowFor(personaEnvelope(normalContent))
  assert.match(close.markdown.textContent, /Boss，/)
  assert.match(close.markdown.textContent, /——完/)
  harness.plugin.__test.setPersonaModeConfig({ ...config, personaEnabled: false })
  harness.plugin.__test.decorate(close.flow)
  assert.equal(close.flow.querySelectorAll('[data-dsh-persona-head]').length, 0)
  assert.equal(close.markdown.getAttribute('data-dsh-persona-kind'), null)
  assert.equal(close.markdown.querySelectorAll('.dss-persona-prefix, .dss-persona-suffix').length, 0)
  assert.doesNotMatch(close.markdown.textContent, /Boss，|——完/, 'close must remove visible prefix/suffix text')
  assert.equal(close.markdown.querySelectorAll('blockquote').length, 3, 'generic cards remain')
})

test('PersonaMode：MutationObserver 忽略插件自生成子树，重复 decorate 不产生自触发 error', () => {
  const harness = makeHarness(baseState, async () => true)
  const persona = { prefix: 'Boss，', suffix: '——完' }
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', ...persona, style: '搞怪', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.applyPlugin()
  // 激活前就存在的旧消息：配置订阅/变化都不应重写。
  const oldFlow = harness.document.createElement('div')
  oldFlow.setAttribute('data-chat-flow-kind', 'assistant-step')
  const oldSlot = harness.document.createElement('div')
  oldSlot.setAttribute('data-slot', 'conversation.chat.node')
  const oldMarkdown = harness.document.createElement('div')
  oldMarkdown.className = '_markdown_'
  oldMarkdown.innerHTML = '<p>旧历史正文</p>'
  oldSlot.appendChild(oldMarkdown)
  oldFlow.appendChild(oldSlot)
  harness.document.body.appendChild(oldFlow)
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })
  assert.equal(oldMarkdown.getAttribute('data-dsh-persona-kind'), null, 'old history stays untouched on activation')
  assert.equal(oldMarkdown.getAttribute('data-dsh-persona-error'), null)
  assert.equal(oldFlow.querySelectorAll('[data-dsh-persona-head]').length, 0, 'old history must not get an identity header')
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: '改名', personaSignature: 'S2', personaAvatar: '' })
  assert.equal(oldMarkdown.getAttribute('data-dsh-persona-kind'), null, 'config change must not rescan old history')
  assert.equal(oldMarkdown.getAttribute('data-dsh-persona-error'), null)
  assert.match(oldMarkdown.textContent, /旧历史正文/)
  assert.equal(oldFlow.querySelectorAll('[data-dsh-persona-head]').length, 0, 'config change must not add a header to old history')
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })
  const observer = harness.mutationObserver()
  assert.ok(observer, 'visual layer must install a MutationObserver')
  const flow = harness.document.createElement('div')
  flow.setAttribute('data-chat-flow-kind', 'assistant-step')
  const slot = harness.document.createElement('div')
  slot.setAttribute('data-slot', 'conversation.chat.node')
  const markdown = harness.document.createElement('div')
  markdown.className = '_markdown_'
  markdown.innerHTML = personaEnvelope({ version: 1, kind: 'normal', conclusion: { lead: 'L' }, suggestions: ['S'], risk: 'R' })
  slot.appendChild(markdown)
  flow.appendChild(slot)
  harness.document.body.appendChild(flow)
  observer.emit([{ type: 'childList', target: harness.document.body, addedNodes: [flow], removedNodes: [] }])
  assert.equal(markdown.getAttribute('data-dsh-persona-kind'), 'normal')
  // 插件渲染产生的 mutation（全部为插件生成节点）必须被忽略。
  const generated = [...markdown.childNodes].filter((node) => node.nodeType === 1)
  observer.emit([{ type: 'childList', target: markdown, addedNodes: generated, removedNodes: [] }])
  observer.emit([{ type: 'characterData', target: generated[0]?.firstChild ?? markdown }])
  assert.equal(markdown.getAttribute('data-dsh-persona-kind'), 'normal', 'plugin-generated mutations must not re-error')
  assert.equal(markdown.getAttribute('data-dsh-persona-error'), null)
  assert.doesNotMatch(markdown.textContent, /内容合同错误/)
  assert.equal(markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3)

  // 配置变化：只刷新已受管渲染与身份头，不动旧历史。
  const nextTone = JSON.stringify({ schema: 'dsh-structured/tone@1', prefix: '新前缀，', style: '搞怪', suffix: '——新尾', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: nextTone, personaName: '新名字', personaSignature: '新签名', personaAvatar: '' })
  assert.equal(markdown.getAttribute('data-dsh-persona-kind'), 'normal', 'config change must keep the rendered message')
  assert.equal(markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3, 'config change must not duplicate cards')
  assert.equal(markdown.querySelectorAll('.dss-persona-prefix').length, 1, 'prefix must not duplicate on config change')
  assert.equal(markdown.querySelector('.dss-persona-prefix').textContent, 'Boss，', 'old message keeps its original prefix')
  assert.match(flow.querySelector('[data-dsh-persona-head]').textContent, /N/, 'old message keeps its original head')
  assert.equal(oldMarkdown.getAttribute('data-dsh-persona-kind'), null, 'config change must not decorate old history')

  // 关闭：旧消息不回溯；新消息才按关闭态渲染。
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: false })
  assert.equal(flow.querySelectorAll('[data-dsh-persona-head]').length, 1, 'old head stays')
  assert.equal(markdown.getAttribute('data-dsh-persona-kind'), 'normal', 'old render stays')
  assert.equal(markdown.querySelectorAll('.dss-persona-prefix, .dss-persona-suffix').length, 2, 'old prefix/suffix stay')
  assert.match(markdown.textContent, /Boss，/)
  assert.equal(markdown.querySelectorAll('blockquote').length, 3, 'old cards remain')
})

test('PersonaMode：reasoning / step-process / compaction 不套内容合同', () => {
  const harness = makeHarness(baseState, async () => true)
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', prefix: 'Boss，', style: '搞怪', suffix: '——完', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })
  const mount = (html, kind, decorateFlow) => {
    const flow = harness.document.createElement('div')
    flow.setAttribute('data-chat-flow-kind', kind)
    const slot = harness.document.createElement('div')
    slot.setAttribute('data-slot', 'conversation.chat.node')
    const body = decorateFlow ?? slot
    const markdown = harness.document.createElement('div')
    markdown.className = '_markdown_'
    markdown.innerHTML = html
    body.appendChild(markdown)
    if (body !== slot) slot.appendChild(body)
    flow.appendChild(slot)
    harness.document.body.appendChild(flow)
    harness.plugin.__test.decorate(flow)
    return markdown
  }
  const reasoningWrap = harness.document.createElement('div')
  reasoningWrap.setAttribute('data-variant', 'think')
  const reasoning = mount('<p>推理过程没有内容块</p>', 'assistant-step', reasoningWrap)
  assert.equal(reasoning.getAttribute('data-dsh-persona-kind'), null)
  assert.equal(reasoning.getAttribute('data-dsh-persona-error'), null)
  assert.equal(reasoning.getAttribute('data-dsh-persona-pending'), null)
  assert.match(reasoning.textContent, /推理过程/)

  const stepWrap = harness.document.createElement('div')
  stepWrap.setAttribute('data-step-process', '')
  const stepMarkdown = mount('<p>工具输出正文</p>', 'assistant-step', stepWrap)
  assert.equal(stepMarkdown.getAttribute('data-dsh-persona-kind'), null)
  assert.equal(stepMarkdown.getAttribute('data-dsh-persona-error'), null)
  assert.match(stepMarkdown.textContent, /工具输出正文/)

  const compaction = mount('<p>压缩摘要</p>', 'compaction')
  assert.equal(compaction.getAttribute('data-dsh-persona-kind'), null)
  assert.equal(compaction.getAttribute('data-dsh-persona-error'), null)
  assert.match(compaction.textContent, /压缩摘要/)
})

test('PersonaMode：不可见字符不判死、错误卡保留原文', () => {
  const harness = makeHarness(baseState, async () => true)
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', prefix: 'Boss，', style: '搞怪', suffix: '——完', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })
  const flowFor = (html) => {
    const flow = harness.document.createElement('div')
    flow.setAttribute('data-chat-flow-kind', 'assistant-step')
    flow.setAttribute('data-chat-node-key', 'inv-' + Math.random())
    const slot = harness.document.createElement('div')
    slot.setAttribute('data-slot', 'conversation.chat.node')
    const markdown = harness.document.createElement('div')
    markdown.className = '_markdown_preview'
    markdown.innerHTML = html
    slot.appendChild(markdown)
    flow.appendChild(slot)
    harness.document.body.appendChild(flow)
    harness.plugin.__test.decorate(flow)
    return { flow, markdown }
  }
  const payload = { version: 1, kind: 'normal', conclusion: { lead: 'L' }, suggestions: ['S'], risk: 'R' }
  const clean = JSON.stringify(payload)
  const rawBlock = (text) => `<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span></div></div><div data-code-block-content><pre>${text}</pre></div></div>`
  // 尾部/内部插入不可见字符：JSON 本身合法，不应判死。
  for (const invisible of ['​', ' ', '﻿']) {
    const dirty = clean.slice(0, -1) + invisible + '}'
    const item = flowFor(rawBlock(dirty))
    assert.equal(item.markdown.getAttribute('data-dsh-persona-kind'), 'normal', 'invisible char must not break persona render: ' + invisible)
    assert.equal(item.markdown.getAttribute('data-dsh-persona-error'), null)
    assert.equal(item.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3)
  }
  // 真非法 JSON：显示错误卡，但原始内容保留，不被抹掉。
  const broken = flowFor(rawBlock('{"version":1,"kind":"normal",'))
  harness.flushPersonaErrors()
  assert.equal(broken.markdown.getAttribute('data-dsh-persona-kind'), 'legacy')
  assert.doesNotMatch(broken.markdown.textContent, /内容合同错误/)
  assert.doesNotMatch(broken.markdown.textContent, /"version"/, 'raw JSON must not be shown')
  assert.match(broken.markdown.textContent, /未按合同|格式/, 'quiet notice must appear instead of raw JSON')
  assert.equal(broken.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 0, 'legacy must not fabricate cards')
})

const personaBlock = (text, lang = 'persona') =>
  `<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_${lang}">${lang}</span></div></div><div data-code-block-content><pre>${text}</pre></div></div>`

const personaNormalPayload = JSON.stringify({
  version: 1,
  kind: 'normal',
  conclusion: { lead: '结论L' },
  suggestions: ['建议S'],
  risk: '风险R',
})

test('PersonaMode：块外正文保留、其它代码块不误报、不可见字符全覆盖', () => {
  const harness = makeHarness(baseState, async () => true)
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', prefix: 'Boss，', style: '搞怪', suffix: '——完', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })
  const flowFor = (html) => {
    const flow = harness.document.createElement('div')
    flow.setAttribute('data-chat-flow-kind', 'assistant-step')
    flow.setAttribute('data-chat-node-key', 'edge-' + Math.random())
    const slot = harness.document.createElement('div')
    slot.setAttribute('data-slot', 'conversation.chat.node')
    const markdown = harness.document.createElement('div')
    markdown.className = '_markdown_preview'
    markdown.innerHTML = html
    slot.appendChild(markdown)
    flow.appendChild(slot)
    harness.document.body.appendChild(flow)
    harness.plugin.__test.decorate(flow)
    return { flow, markdown }
  }

  // A. 模型在 persona 块外还有自然正文：正文不能被静默删除。
  const withOutside = flowFor('<p>说明一下：先看结论。</p>' + personaBlock(personaNormalPayload))
  assert.equal(withOutside.markdown.getAttribute('data-dsh-persona-kind'), 'normal')
  assert.match(withOutside.markdown.textContent, /说明一下：先看结论。/, 'outside prose must survive persona rendering')
  assert.equal(withOutside.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3)
  // 块外正文必须留在原位置：信封前的开场白在卡片上方，信封后的补充在卡片下方（实机 137/680 条有块外正文）。
  const beforeText = withOutside.markdown.firstElementChild?.textContent ?? ''
  assert.match(beforeText, /说明一下：先看结论。/, '前置正文要留在卡片上方')
  const bothSides = flowFor('<p>开场白</p>' + personaBlock(personaNormalPayload) + '<p>补充说明</p>')
  const kids = [...bothSides.markdown.children]
  const cardIndex = kids.findIndex((node) => node.getAttribute?.('data-dsh-structured-card-type'))
  const leadIndex = kids.findIndex((node) => (node.textContent ?? '').includes('开场白'))
  const tailIndex = kids.findIndex((node) => (node.textContent ?? '').includes('补充说明'))
  assert.ok(leadIndex >= 0 && tailIndex >= 0 && cardIndex >= 0, '三部分都要在')
  assert.ok(leadIndex < cardIndex, '开场白必须在卡片之前')
  assert.ok(tailIndex > cardIndex, '补充说明必须在卡片之后')

  // B. persona 块 + 另一个普通代码块：不是合同冲突。
  const withOtherCode = flowFor(personaBlock(personaNormalPayload) + personaBlock('const x = 1', 'js'))
  assert.equal(withOtherCode.markdown.getAttribute('data-dsh-persona-kind'), 'normal')
  assert.equal(withOtherCode.markdown.getAttribute('data-dsh-persona-error'), null)
  assert.equal(withOtherCode.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3)

  // C. 各种不可见字符都不能击穿解析。
  for (const [name, ch] of [
    ['ZWSP U+200B', '\u200b'],
    ['ZWNJ U+200C', '\u200c'],
    ['ZWJ U+200D', '\u200d'],
    ['LRM U+200E', '\u200e'],
    ['RLM U+200F', '\u200f'],
    ['BOM U+FEFF', '\ufeff'],
    ['MONGOLIAN U+180E', '\u180e'],
    ['NBSP U+00A0', '\u00a0'],
    ['FIGURE SP U+2007', '\u2007'],
    ['NNBSP U+202F', '\u202f'],
    ['LINE SEP U+2028', '\u2028'],
    ['PARA SEP U+2029', '\u2029'],
    ['NEL U+0085', '\u0085'],
    ['VT U+000B', '\u000b'],
    ['FF U+000C', '\u000c'],
  ]) {
    const dirty = personaNormalPayload.slice(0, -1) + ch + '}'
    const item = flowFor(personaBlock(dirty))
    assert.equal(item.markdown.getAttribute('data-dsh-persona-kind'), 'normal', 'invisible char must not break persona render: ' + name)
    assert.equal(item.markdown.getAttribute('data-dsh-persona-error'), null, 'no error for ' + name)
    assert.equal(item.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3, 'cards must render for ' + name)
  }

  // D. 真非法 JSON：仍然显式 error，且原文保留。
  const broken = flowFor(personaBlock('{"version":1,"kind":"normal",'))
  harness.flushPersonaErrors()
  assert.equal(broken.markdown.getAttribute('data-dsh-persona-kind'), 'legacy')
  assert.doesNotMatch(broken.markdown.textContent, /内容合同错误/)
  assert.doesNotMatch(broken.markdown.textContent, /"version"/, 'raw JSON must not be shown')
  assert.match(broken.markdown.textContent, /未按合同|格式/, 'quiet notice must appear instead of raw JSON')
})

test('PersonaMode：字段内裸写 ASCII 双引号不截断、按完整信封渲染', () => {
  const harness = makeHarness(baseState, async () => true)
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', prefix: 'Boss，', style: '搞怪', suffix: '——完', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })
  const flowFor = (html) => {
    const flow = harness.document.createElement('div')
    flow.setAttribute('data-chat-flow-kind', 'assistant-step')
    flow.setAttribute('data-chat-node-key', 'quote-' + Math.random())
    const slot = harness.document.createElement('div')
    slot.setAttribute('data-slot', 'conversation.chat.node')
    const markdown = harness.document.createElement('div')
    markdown.className = '_markdown_preview'
    markdown.innerHTML = html
    slot.appendChild(markdown)
    flow.appendChild(slot)
    harness.document.body.appendChild(flow)
    harness.plugin.__test.decorate(flow)
    return { flow, markdown }
  }
  // 实机原样：模型在中文里直接写 ASCII 双引号，JSON 断在内层引号上，旧版抢救出半句话。
  const raw = '{"version":1,"kind":"normal","conclusion":{"lead":"是好事，但这份"低"不是系统的功劳——是样本太小的结果。","body":"三周只新增 80 条，重复本来就长不出来。"},"suggestions":["等写入量上来再看","把体检写成脚本"],"risk":"这段时间记忆在"进得少、出得多"，别误判成突然变脏。"}'
  const item = flowFor(`<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span></div></div><div data-code-block-content><pre>${raw}</pre></div></div>`)
  assert.equal(item.markdown.getAttribute('data-dsh-persona-kind'), 'normal')
  assert.equal(item.markdown.getAttribute('data-dsh-persona-error'), null)
  assert.equal(item.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3)
  const text = item.markdown.textContent
  assert.match(text, /不是系统的功劳——是样本太小的结果。/, 'lead must be complete, not cut at the inner quote')
  assert.match(text, /三周只新增 80 条/, 'body must be complete')
  assert.match(text, /进得少、出得多/, 'risk must be complete')
  assert.doesNotMatch(text, /"version"/, 'raw JSON must never leak into the reply')
})

test('PersonaMode：值内花括号 / 裸换行 / 抢救路径都不吞内容', () => {
  const harness = makeHarness(baseState, async () => true)
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', prefix: 'Boss，', style: '搞怪', suffix: '——完', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })
  const flowFor = (raw) => {
    const flow = harness.document.createElement('div')
    flow.setAttribute('data-chat-flow-kind', 'assistant-step')
    flow.setAttribute('data-chat-node-key', 'edge-' + Math.random())
    const slot = harness.document.createElement('div')
    slot.setAttribute('data-slot', 'conversation.chat.node')
    const markdown = harness.document.createElement('div')
    markdown.className = '_markdown_preview'
    markdown.innerHTML = `<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span></div></div><div data-code-block-content><pre>${raw}</pre></div></div>`
    slot.appendChild(markdown)
    flow.appendChild(slot)
    harness.document.body.appendChild(flow)
    harness.plugin.__test.decorate(flow)
    harness.plugin.__test.flushPersonaErrors()
    return markdown
  }

  // A. 值里出现 {"a":1} 这种片段：内层引号后面跟着冒号，不能被误判成键的收尾引号。
  const braceRaw = '{"version":1,"kind":"normal","conclusion":{"lead":"写 {"a":1} 这种片段"},"suggestions":["s"],"risk":"r"}'
  const brace = flowFor(braceRaw)
  assert.equal(brace.getAttribute('data-dsh-persona-kind'), 'normal')
  assert.match(brace.textContent, /写 \{"a":1\} 这种片段/, 'value containing braces must render whole')

  // B. 字符串里裸写换行（模型的 table 单元格常见）：转义后 table 必须完整渲染两行。
  const tableRaw = '{"version":1,"kind":"table","conclusion":{"lead":"L"},"suggestions":["s"],"risk":"r","table":{"head":["A","B"],"rows":[["第一行\n第二行","x"]]}}'
  const table = flowFor(tableRaw)
  assert.equal(table.getAttribute('data-dsh-persona-kind'), 'table')
  assert.equal(table.querySelectorAll('table').length, 1)
  assert.match(table.textContent, /第一行/)
  assert.match(table.textContent, /第二行/)

  // C. 落难（抢救）路径同样不能被裸引号截断：version 非法走降级，字段仍要完整。
  const salvageRaw = '{"version":"1","kind":"normal","conclusion":{"lead":"结论"},"suggestions":["等写入量上来再看"],"risk":"这段时间记忆在"进得少、出得多"，别误判成突然变脏。"}'
  const salvage = flowFor(salvageRaw)
  assert.match(salvage.textContent, /进得少、出得多/)
  assert.match(salvage.textContent, /别误判成突然变脏/)
})

test('PersonaMode：table 字段不合合同也出卡出表，不再摊原始 JSON', () => {
  const harness = makeHarness(baseState, async () => true)
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', prefix: 'Boss，', style: '搞怪', suffix: '——完', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })
  const flow = harness.document.createElement('div')
  flow.setAttribute('data-chat-flow-kind', 'assistant-step')
  flow.setAttribute('data-chat-node-key', 'idem-1')
  const slot = harness.document.createElement('div')
  slot.setAttribute('data-slot', 'conversation.chat.node')
  const markdown = harness.document.createElement('div')
  markdown.className = '_markdown_preview'
  // 实机 session：kind=table，但模型把 rows 写成了 "状态" 且摊平成一维数组。
  const raw = '{"version":1,"kind":"table","conclusion":{"lead":"1.0.11 已发布"},"body":"门禁前全绿","suggestions":["重启一次 Desktop"],"risk":"仅提示去重","table":{"head":["项","实测"],"状态":["tag","v1.0.11","✅","npm","latest 1.0.11","✅"]}}'
  markdown.innerHTML = `<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span></div></div><div data-code-block-content><pre>${raw}</pre></div></div>`
  slot.appendChild(markdown)
  flow.appendChild(slot)
  harness.document.body.appendChild(flow)
  const firstHtml = (() => {
    harness.plugin.__test.decorate(flow)
    harness.plugin.__test.flushPersonaErrors()
    return markdown.innerHTML
  })()
  const kind = markdown.getAttribute('data-dsh-persona-kind')
  assert.equal(kind, 'table', '不合合同的 table 字段也要尽量还原成表格')
  assert.equal(markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3, '三卡必须出现')
  assert.equal(markdown.querySelectorAll('table').length, 1, '摊平的数组要还原成表格')
  assert.match(markdown.textContent, /v1\.0\.11/, '表格数据不能丢')
  assert.doesNotMatch(markdown.textContent, /"version":1/, '原始 JSON 不许摊给用户')
  for (let i = 0; i < 9; i += 1) {
    harness.plugin.__test.decorate(flow)
    harness.plugin.__test.flushPersonaErrors()
  }
  assert.equal(markdown.innerHTML, firstHtml, '重复渲染后 DOM 必须稳定')
})

test('PersonaMode：所有降级路径重复渲染后 DOM 必须稳定（幂等门禁）', () => {
  const harness = makeHarness(baseState, async () => true)
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', prefix: 'Boss，', style: '搞怪', suffix: '——完', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })
  const build = (html) => {
    const flow = harness.document.createElement('div')
    flow.setAttribute('data-chat-flow-kind', 'assistant-step')
    flow.setAttribute('data-chat-node-key', 'idem-' + Math.random())
    const slot = harness.document.createElement('div')
    slot.setAttribute('data-slot', 'conversation.chat.node')
    const markdown = harness.document.createElement('div')
    markdown.className = '_markdown_preview'
    markdown.innerHTML = html
    slot.appendChild(markdown)
    flow.appendChild(slot)
    harness.document.body.appendChild(flow)
    return { flow, markdown }
  }
  const block = (raw) => `<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span></div></div><div data-code-block-content><pre>${raw}</pre></div></div>`
  const normal = '{"version":1,"kind":"normal","conclusion":{"lead":"结论"},"suggestions":["s"],"risk":"r"}'
  const tableBroken = '{"version":1,"kind":"table","conclusion":{"lead":"L"},"suggestions":["s"],"risk":"R","table":{"head":["项","实测"],"状态":["tag","x"]}}'
  const cases = [
    ['normal', block(normal)],
    ['合同字段非法但含 table', block(tableBroken)],
    ['两个 persona 块', block(normal) + block(normal)],
    ['一块两个对象', block(normal + '\n' + normal)],
    ['截断', block('{"version":1,"kind":"normal","conclusion":{"lead":"半句')],
    ['裸引号', block('{"version":1,"kind":"normal","conclusion":{"lead":"他说"好",然后走了"},"suggestions":["s"],"risk":"r"}')],
    ['块外正文 + 代码块', '<p>说明</p>' + block(normal)],
  ]
  for (const [name, html] of cases) {
    const { flow, markdown } = build(html)
    // 渲染器在实机上会跑多遍（流式 + MutationObserver）：任意多遍后的 DOM 必须与第一遍一致。
    harness.plugin.__test.decorate(flow)
    harness.plugin.__test.flushPersonaErrors()
    const first = markdown.innerHTML
    for (let i = 0; i < 3; i += 1) {
      harness.plugin.__test.decorate(flow)
      harness.plugin.__test.flushPersonaErrors()
    }
    const later = markdown.innerHTML
    assert.equal(later.length, first.length, `重复渲染后 DOM 长度必须稳定：${name}`)
    assert.equal(later, first, `重复渲染必须幂等：${name}`)
  }
})

test('PersonaMode：内层引号后紧跟 ASCII 标点、超量建议、冲突块都不丢内容', () => {
  const harness = makeHarness(baseState, async () => true)
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', prefix: 'Boss，', style: '搞怪', suffix: '——完', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })
  const flowFor = (raw) => {
    const flow = harness.document.createElement('div')
    flow.setAttribute('data-chat-flow-kind', 'assistant-step')
    flow.setAttribute('data-chat-node-key', 'edge2-' + Math.random())
    const slot = harness.document.createElement('div')
    slot.setAttribute('data-slot', 'conversation.chat.node')
    const markdown = harness.document.createElement('div')
    markdown.className = '_markdown_preview'
    markdown.innerHTML = `<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span></div></div><div data-code-block-content><pre>${raw}</pre></div></div>`
    slot.appendChild(markdown)
    flow.appendChild(slot)
    harness.document.body.appendChild(flow)
    harness.plugin.__test.decorate(flow)
    harness.plugin.__test.flushPersonaErrors()
    return markdown
  }

  // A. 值里引号后紧跟 ASCII 逗号（1.0.10 第一版会在这里截断成「他说"好」）。
  const prose = flowFor('{"version":1,"kind":"normal","conclusion":{"lead":"他说"好",然后走了"},"suggestions":["s1"],"risk":"r"}')
  assert.match(prose.textContent, /他说"好",然后走了/, 'quote followed by comma must stay content')

  // B. table 单元格里的 ["X","Y"] 不能被拆成两个格子，也不能把整张表丢掉。
  const bracketTable = flowFor('{"version":1,"kind":"table","conclusion":{"lead":"L"},"suggestions":["s"],"risk":"r","table":{"head":["A","B"],"rows":[["见 ["X","Y"] 列表","y"]]}}')
  assert.equal(bracketTable.getAttribute('data-dsh-persona-kind'), 'table', 'table must still render')
  const cells = [...bracketTable.querySelectorAll('td')].map((cell) => cell.textContent)
  assert.deepEqual(cells, ['见 ["X","Y"] 列表', 'y'], 'cell content must stay intact')

  // C. suggestions 超过合同上限 5 条时降级展示，但一条都不许丢。
  const many = flowFor('{"version":1,"kind":"normal","conclusion":{"lead":"L"},"suggestions":["s1","s2","s3","s4","s5","s6","s7","s8"],"risk":"r"}')
  for (const item of ['s1', 's5', 's6', 's8']) {
    assert.match(many.textContent, new RegExp(item), 'suggestion ' + item + ' must survive')
  }

  // D. 逗号分隔的两个顶层对象 = 合同冲突：第一个出卡，第二个按正文展开，不展示原始 JSON、不丢内容。
  const twoObjects = flowFor('{"version":1,"kind":"normal","conclusion":{"lead":"第一"},"suggestions":["a"],"risk":"r"},{"version":1,"kind":"normal","conclusion":{"lead":"第二"},"suggestions":["b"],"risk":"r"}')
  assert.equal(twoObjects.getAttribute('data-dsh-persona-kind'), 'normal', 'first object must render as cards')
  assert.match(twoObjects.textContent, /第一/, 'first object must survive')
  assert.match(twoObjects.textContent, /第二/, 'second object must survive')
  assert.equal(twoObjects.querySelectorAll('.md-code-block').length, 0, 'raw JSON must never be shown')
  assert.match(twoObjects.textContent, /多个 persona 内容块/, 'conflict must be explained in one short note')
})

test('PersonaMode：尾部多余 } 不判死、按正常信封渲染', () => {
  const harness = makeHarness(baseState, async () => true)
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', prefix: 'Boss，', style: '搞怪', suffix: '——完', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })
  const flowFor = (html) => {
    const flow = harness.document.createElement('div')
    flow.setAttribute('data-chat-flow-kind', 'assistant-step')
    flow.setAttribute('data-chat-node-key', 'tail-' + Math.random())
    const slot = harness.document.createElement('div')
    slot.setAttribute('data-slot', 'conversation.chat.node')
    const markdown = harness.document.createElement('div')
    markdown.className = '_markdown_preview'
    markdown.innerHTML = html
    slot.appendChild(markdown)
    flow.appendChild(slot)
    harness.document.body.appendChild(flow)
    harness.plugin.__test.decorate(flow)
    return { flow, markdown }
  }
  const payload = { version: 1, kind: 'normal', conclusion: { lead: '结论' }, suggestions: ['建议'], risk: '风险' }
  const clean = JSON.stringify(payload)
  // 实机症状（session-839e98db / session-d4c1）：合法 JSON 后面多出 1-3 个 }，
  // JSON.parse 报 Unexpected non-whitespace character after JSON at position N。
  for (const extraBraces of ['}', '}}', '}}}']) {
    const dirty = clean + extraBraces
    const item = flowFor(`<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span></div></div><div data-code-block-content><pre>${dirty}</pre></div></div>`)
    assert.equal(item.markdown.getAttribute('data-dsh-persona-kind'), 'normal', 'trailing brace must not break persona render: +' + extraBraces.length)
    assert.equal(item.markdown.getAttribute('data-dsh-persona-error'), null, 'no error for +' + extraBraces.length)
    assert.equal(item.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3, 'cards must render for +' + extraBraces.length)
    assert.match(item.markdown.textContent, /结论/, 'envelope content must render for +' + extraBraces.length)
  }
  // 截断容错不得吞掉真错误：截断后仍过不了 validate 的块必须保持 error 路径。
  const stillBroken = flowFor(`<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span></div></div><div data-code-block-content><pre>{"version":2,"kind":"normal"}}</pre></div></div>`)
  harness.flushPersonaErrors()
  assert.equal(stillBroken.markdown.getAttribute('data-dsh-persona-kind'), 'legacy', 'semantically invalid JSON must degrade to legacy after repair')
  assert.doesNotMatch(stillBroken.markdown.textContent, /内容合同错误/)
  assert.doesNotMatch(stillBroken.markdown.textContent, /"version"/, 'raw JSON must not be shown')
  assert.match(stillBroken.markdown.textContent, /未按合同|格式/, 'quiet notice must appear instead of raw JSON')
  assert.equal(stillBroken.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 0, 'legacy must not fabricate cards')
  // 中途闭合（实机 session-f78c turn 196/200）：conclusion 提前闭合、body 落到根上，
  // body 后面那个 } 把根对象提前关掉，table / suggestions / risk 变成尾随内容。
  // 修复要同时做两件事：删掉错位的 } + 把根级 body 挪回 conclusion.body。
  const midCloseTable = '{"version":1,"kind":"table","conclusion":{"lead":"结论"},"body":"正文"},"table":{"head":["项","值"],"rows":[["a","b"]]},"suggestions":["建议"],"risk":"风险"}'
  const repairedTable = flowFor(`<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span></div></div><div data-code-block-content><pre>${midCloseTable}</pre></div></div>`)
  assert.equal(repairedTable.markdown.getAttribute('data-dsh-persona-kind'), 'table', 'mid-close brace must be repaired')
  assert.equal(repairedTable.markdown.getAttribute('data-dsh-persona-error'), null, 'no error card for mid-close brace')
  assert.equal(repairedTable.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3, 'cards must render after mid-close repair')
  assert.match(repairedTable.markdown.textContent, /正文/, 'root-level body must be moved into conclusion')
  const midCloseNormal = '{"version":1,"kind":"normal","conclusion":{"lead":"结论"},"body":"正文"},"suggestions":["建议"],"risk":"风险"}'
  const repairedNormal = flowFor(`<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span></div></div><div data-code-block-content><pre>${midCloseNormal}</pre></div></div>`)
  assert.equal(repairedNormal.markdown.getAttribute('data-dsh-persona-kind'), 'normal', 'mid-close brace must be repaired for normal kind')
  assert.equal(repairedNormal.markdown.getAttribute('data-dsh-persona-error'), null, 'no error card for mid-close normal')
  // 实机 video session（session-412b）：suggestions 数组提前闭合，后续项目写成 "删除：…"，
  // 解析报 Expected ':' after property name。修复不成立时必须降级成普通段落，不能露出原始 JSON。
  const brokenSuggestions = '{"version":1,"kind":"normal","conclusion":{"lead":"Boss，清完了"},"body":"删的都是过程产物","suggestions":["保留：成片"],"删除：帧目录","risk":"帧目录已全删"}'
  const salvaged = flowFor(`<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span></div></div><div data-code-block-content><pre>${brokenSuggestions}</pre></div></div>`)
  harness.flushPersonaErrors()
  assert.equal(salvaged.markdown.getAttribute('data-dsh-persona-kind'), 'normal', 'broken suggestions must still render readable cards')
  assert.equal(salvaged.markdown.querySelectorAll('.md-code-block').length, 0, 'raw JSON block must be removed')
  assert.doesNotMatch(salvaged.markdown.textContent, /"version"/, 'raw JSON must not be shown')
  assert.match(salvaged.markdown.textContent, /Boss，清完了/, 'lead must be salvaged')
  assert.match(salvaged.markdown.textContent, /删的都是过程产物/, 'body must be salvaged')
  assert.match(salvaged.markdown.textContent, /保留：成片/, 'suggestions must be salvaged')
  assert.equal(salvaged.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3, 'salvaged content must render three cards')
  assert.match(salvaged.markdown.textContent, /帧目录已全删/, 'risk must be salvaged')
})

test('PersonaMode：实机 seq432 中途闭合信封不把 JSON 残片渲染进卡片', () => {
  const harness = makeHarness(baseState, async () => true)
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', prefix: 'Boss，', style: '搞怪', suffix: '——完', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })
  const flowFor = (html) => {
    const flow = harness.document.createElement('div')
    flow.setAttribute('data-chat-flow-kind', 'assistant-step')
    flow.setAttribute('data-chat-node-key', 'seq432-' + Math.random())
    const slot = harness.document.createElement('div')
    slot.setAttribute('data-slot', 'conversation.chat.node')
    const markdown = harness.document.createElement('div')
    markdown.className = '_markdown_preview'
    markdown.innerHTML = html
    slot.appendChild(markdown)
    flow.appendChild(slot)
    harness.document.body.appendChild(flow)
    harness.plugin.__test.decorate(flow)
    return markdown
  }
  // 实机原文（session-3f71fe87 seq 432）：body 落在根上、根对象提前闭合，suggestions/risk 成为尾随内容。
  const raw = '{"version":1,"kind":"normal","conclusion":{"lead":"系统缓存这两项也是可删的零风险货，删了系统自己重建，不牵任何程序。"},"body":"INetCache 310.8 MB 全在 IE 子目录：303 个文件里 246 个 .gif、16 个 .cab、14 个 .json，是 WinINet 的下载缓存（老 IE/WPS 一类的组件拉过的东西），不是程序本体。删了下次用到会重新拉，不影响已装软件。\\nCrashDumps 30.3 MB 是 6 个崩溃转储：ASMx4242 固件工具 2 个（11-08）、pwsh 4 个（11-01）。除了拿 WinDbg 分析那两个崩溃，它们没有任何用途；不分析就是纯垃圾。"},"suggestions":["要清一起清：系统缓存 341 MB + 安装残留 1,308 MB + 剪映碎片 1,450 MB，合计 3,099 MB，一条命令搞定","CrashDumps 唯一留的意义是排查 11-01 那几次 pwsh 崩溃，你没这个需求就一起删"],"risk":"无功能影响；删除后失去历史崩溃现场，需要时得重现问题才能再抓。"}'
  const markdown = flowFor('<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span></div></div><div data-code-block-content><pre>' + raw + '</pre></div></div>')
  harness.flushPersonaErrors()
  assert.equal(markdown.getAttribute('data-dsh-persona-kind'), 'normal', 'mid-close body envelope must render as cards')
  assert.doesNotMatch(markdown.textContent, /"version"|"body"|"suggestions"|"risk"|\],"body":"/, 'raw JSON fragments must not leak into rendered text')
  assert.match(markdown.textContent, /系统缓存这两项/, 'lead must render')
  assert.match(markdown.textContent, /INetCache 310\.8 MB/, 'body must render')
  assert.match(markdown.textContent, /一条命令搞定/, 'suggestions must render')
  assert.equal(markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3, 'three cards must render')
})

test('PersonaMode：段落开头的行内 **粗体** 不套卡片标题样式', () => {
  const harness = makeHarness(baseState, async () => true)
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', prefix: '', style: '搞怪', suffix: '', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })
  const flow = harness.document.createElement('div')
  flow.setAttribute('data-chat-flow-kind', 'assistant-step')
  flow.setAttribute('data-chat-node-key', 'inline-heading')
  const slot = harness.document.createElement('div')
  slot.setAttribute('data-slot', 'conversation.chat.node')
  const markdown = harness.document.createElement('div')
  markdown.className = '_markdown_preview'
  // 真实形状：body 以 **粗体** 开头（模型极常这么写）。
  markdown.innerHTML = '<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span></div></div><div data-code-block-content><pre>'
    + '{"version":1,"kind":"normal","conclusion":{"lead":"结论","body":"**粗体开头** 后面还有正文"},"suggestions":["**第一条**"],"risk":"**风险开头** 说明"}'
    + '</pre></div></div>'
  slot.appendChild(markdown)
  flow.appendChild(slot)
  harness.document.body.appendChild(flow)
  harness.plugin.__test.decorate(flow)
  harness.flushPersonaErrors()

  const cards = [...markdown.querySelectorAll('[data-dsh-structured-card-type]')]
  assert.equal(cards.length, 3, '三张卡')
  const inlineStrongs = [...markdown.querySelectorAll('strong[data-dss-inline]')]
  assert.ok(inlineStrongs.length >= 3, '行内粗体必须打 data-dss-inline 标记')
  assert.ok(inlineStrongs.some((s) => s.textContent === '粗体开头'), 'body 开头的粗体是行内标记')
  assert.ok(inlineStrongs.some((s) => s.textContent === '第一条'), '建议里的粗体是行内标记')
  assert.ok(inlineStrongs.some((s) => s.textContent === '风险开头'), '风险开头的粗体是行内标记')
  // 卡标签（结论 / 建议 / 风险）与 lead 不能被打成行内标记，否则会丢标题样式。
  const label = cards[0].querySelector('p > strong')
  assert.equal(label?.textContent, '结论', '第一段是卡标签')
  assert.equal(label?.getAttribute('data-dss-inline'), null, '卡标签不带行内标记')
})

test('PersonaMode：table.rows 漏键（多行裸数组 / 落单 ] / 短行）也要出表格卡', () => {
  const harness = makeHarness(baseState, async () => true)
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', prefix: 'Boss，', style: '搞怪', suffix: '——完', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })
  const flowFor = (json) => {
    const flow = harness.document.createElement('div')
    flow.setAttribute('data-chat-flow-kind', 'assistant-step')
    flow.setAttribute('data-chat-node-key', 'rows-' + Math.random())
    const slot = harness.document.createElement('div')
    slot.setAttribute('data-slot', 'conversation.chat.node')
    const markdown = harness.document.createElement('div')
    markdown.className = '_markdown_preview'
    markdown.innerHTML = '<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span></div></div><div data-code-block-content><pre>'
      + json.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      + '</pre></div></div>'
    slot.appendChild(markdown)
    flow.appendChild(slot)
    harness.document.body.appendChild(flow)
    harness.plugin.__test.decorate(flow)
    harness.flushPersonaErrors()
    return markdown
  }
  const head = '{"version":1,"kind":"table","conclusion":{"lead":"看表"},"table":{"head":["项","证据","处置"]'
  const tail = '},"suggestions":["继续"],"risk":"无"}'

  // A. 实机形状（session-3b2f63dc turn 19）：head 后直接跟多行裸数组，结尾多一个 ]。
  const multiRow = head + ',[ "崩溃","exit 0xC0000409","无堆栈"],[ "人为","卸载后仍加载","已修"]]' + tail
  const a = flowFor(multiRow)
  assert.equal(a.getAttribute('data-dsh-persona-kind'), 'table', '漏键多行表格必须出卡')
  assert.equal(a.querySelectorAll('[data-dsh-structured-card-type]').length, 3, '三卡都在')
  assert.equal(a.querySelectorAll('tbody tr').length, 2, '两行都要还原')
  assert.doesNotMatch(a.textContent, /"version"/, '不能露出原始 JSON')

  // B. 单行裸数组、没有落单 ]。
  const singleRow = '{"version":1,"kind":"table","conclusion":{"lead":"看表"},"table":{"head":["项","值"],["a","b"]' + tail
  const b = flowFor(singleRow)
  assert.equal(b.getAttribute('data-dsh-persona-kind'), 'table', '漏键单行表格必须出卡')
  assert.equal(b.querySelectorAll('tbody tr').length, 1)

  // C. 短行（某行少写一列）：补空格子，不丢内容。
  const ragged = '{"version":1,"kind":"table","conclusion":{"lead":"看表"},"table":{"head":["项","数据","判定"],["正常","3.26GB","稳定"],["当前","8 进程 / 3.26GB"]]' + tail
  const c = flowFor(ragged)
  assert.equal(c.getAttribute('data-dsh-persona-kind'), 'table', '短行也要出卡')
  const widths = [...c.querySelectorAll('tbody tr')].map((tr) => tr.children.length)
  assert.deepEqual(widths, [3, 3], '短行补到与表头同宽')

  // D. 反例：普通 json 代码块（无 persona 语言、无信封形状）必须原样保留。
  const plain = '{"apiVersion":"v1","kind":"ConfigMap","data":{"a":"b"}}'
  const flow = harness.document.createElement('div')
  flow.setAttribute('data-chat-flow-kind', 'assistant-step')
  flow.setAttribute('data-chat-node-key', 'plain-' + Math.random())
  const slot = harness.document.createElement('div')
  slot.setAttribute('data-slot', 'conversation.chat.node')
  const markdown = harness.document.createElement('div')
  markdown.className = '_markdown_preview'
  markdown.innerHTML = '<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_json">json</span></div></div><div data-code-block-content><pre>'
    + plain.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    + '</pre></div></div>'
  slot.appendChild(markdown)
  flow.appendChild(slot)
  harness.document.body.appendChild(flow)
  harness.plugin.__test.decorate(flow)
  assert.equal(markdown.getAttribute('data-dsh-persona-kind'), 'code', '普通 json 走代码通道，不按信封渲染')
  assert.equal(markdown.querySelectorAll('.md-code-block').length, 1, '原代码块保留')
  assert.equal(markdown.querySelectorAll('table').length, 0, '不能凭空生成表格')
})

test('PersonaMode：信封写短了（少一层 }、缺 suggestions/risk）仍要出卡', () => {
  const harness = makeHarness(baseState, async () => true)
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', prefix: 'Boss，', style: '搞怪', suffix: '——完', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })
  const flowFor = (html) => {
    const flow = harness.document.createElement('div')
    flow.setAttribute('data-chat-flow-kind', 'assistant-step')
    flow.setAttribute('data-chat-node-key', 'short-envelope-' + Math.random())
    const slot = harness.document.createElement('div')
    slot.setAttribute('data-slot', 'conversation.chat.node')
    const markdown = harness.document.createElement('div')
    markdown.className = '_markdown_preview'
    markdown.innerHTML = html
    slot.appendChild(markdown)
    flow.appendChild(slot)
    harness.document.body.appendChild(flow)
    harness.plugin.__test.decorate(flow)
    return { flow, markdown }
  }
  const wrap = (json) => `<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span></div></div><div data-code-block-content><pre>${json}</pre></div></div>`

  // 实机症状（session-87d46d52 turn 110 / 111，两张截图里的回复）：模型只写到 conclusion，
  // suggestions / risk 整段没写，最后的 } 是 conclusion 的闭合，根对象没闭合。
  const truncated = '{"version":1,"kind":"normal","conclusion":{"lead":"已照办：六个源文件逐字复制","body":"「菱形」我按语音同音读成「另行」"}}'.slice(0, -1)
  const item = flowFor(wrap(truncated))
  harness.flushPersonaErrors()
  assert.equal(item.markdown.getAttribute('data-dsh-persona-kind'), 'normal', '缺字段的短信封必须照样出卡')
  assert.equal(item.markdown.getAttribute('data-dsh-persona-error'), null, '不应报错')
  assert.equal(item.markdown.querySelectorAll('.md-code-block').length, 0, '原始 JSON 不能露出来')
  assert.doesNotMatch(item.markdown.textContent, /"version"/, '原始 JSON 不能露出来')
  assert.match(item.markdown.textContent, /已照办：六个源文件逐字复制/, 'lead 进结论卡')
  assert.match(item.markdown.textContent, /另行/, 'body 保留')
  assert.equal(item.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 1, '只出结论卡，不补空卡')

  // 完整信封仍然出三张卡。
  const full = flowFor(wrap('{"version":1,"kind":"normal","conclusion":{"lead":"结论"},"suggestions":["建议"],"risk":"风险"}'))
  harness.flushPersonaErrors()
  assert.equal(full.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3, '完整信封三张卡')

  // 表格单元格里的 **粗体** 与 `代码` 也要变节点（模型常这么写，此前会露出星号）。
  const tableEnvelope = flowFor(wrap('{"version":1,"kind":"table","conclusion":{"lead":"看表"},"suggestions":["继续"],"risk":"无","table":{"head":["模块","说明"],"rows":[["**注入**","走 `hook` 链路"]]}}'))
  harness.flushPersonaErrors()
  const cells = [...tableEnvelope.markdown.querySelectorAll('td')]
  assert.equal(cells.length, 2, '表格单元格数量')
  assert.ok(cells[0].querySelector('strong'), '表体单元格的 **粗体** 要变 strong')
  assert.ok(cells[1].querySelector('code'), '表体单元格的 `代码` 要变 code')
  assert.doesNotMatch(cells[0].textContent, /\*\*/, '单元格不再露出星号')
  assert.doesNotMatch(cells[1].textContent, /`/, '单元格不再露出反引号')
  assert.equal(cells[0].textContent, '注入', '文本内容保持纯文本')

  // 流式期间不抢先出卡：半截信封补括号后能解析，但宿主还在流式（data-streaming），
  // 此刻渲染会随 token 反复重排卡片；等完成信号消失后再出。
  const mkFlow = (json) => {
    const flow = harness.document.createElement('div')
    flow.setAttribute('data-chat-flow-kind', 'assistant-step')
    flow.setAttribute('data-chat-node-key', 'streaming-' + Math.random())
    const slot = harness.document.createElement('div')
    slot.setAttribute('data-slot', 'conversation.chat.node')
    const markdown = harness.document.createElement('div')
    markdown.className = '_markdown_preview'
    markdown.innerHTML = wrap(json)
    slot.appendChild(markdown)
    flow.appendChild(slot)
    harness.document.body.appendChild(flow)
    return { flow, markdown }
  }
  const streaming = mkFlow('{"version":1,"kind":"normal","conclusion":{"lead":"写到一半"')
  // 宿主写的是空串属性（data-streaming / data-chat-running），不是 ='true'。
  streaming.flow.setAttribute('data-streaming', '')
  harness.plugin.__test.decorate(streaming.flow)
  assert.notEqual(streaming.markdown.getAttribute('data-dsh-persona-kind'), 'normal', '流式中不抢先渲染卡片')
  streaming.flow.removeAttribute('data-streaming')
  harness.plugin.__test.decorate(streaming.flow)
  harness.flushPersonaErrors()
  assert.equal(streaming.markdown.getAttribute('data-dsh-persona-kind'), 'normal', '流式结束后照常出卡')
  assert.match(streaming.markdown.textContent, /写到一半/, '结论内容保留')
})

test('PersonaMode：写坏的 persona 头部不摊成代码块（kind:text 实机）', () => {
  const harness = makeHarness(baseState, async () => true)
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', prefix: 'Boss，', style: '搞怪', suffix: '——完', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })
  const flowFor = (html) => {
    const flow = harness.document.createElement('div')
    flow.setAttribute('data-chat-flow-kind', 'assistant-step')
    flow.setAttribute('data-chat-node-key', 'broken-' + Math.random())
    const slot = harness.document.createElement('div')
    slot.setAttribute('data-slot', 'conversation.chat.node')
    const markdown = harness.document.createElement('div')
    markdown.className = '_markdown_preview'
    markdown.innerHTML = html
    slot.appendChild(markdown)
    flow.appendChild(slot)
    harness.document.body.appendChild(flow)
    harness.plugin.__test.decorate(flow)
    return { flow, markdown }
  }
  const fence = (lang, body) => `<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span>${lang}</span></div></div><div data-code-block-content><pre>${body}</pre></div></div>`

  // 2026-11-16 实机截图：无语言 fence 里只有 {"version":1,"kind":"text"}。
  // 严格检测不认 kind，于是整条回复以一个「代码块」把 JSON 摊给用户。
  const broken = flowFor(fence('代码块', '{"version":1,"kind":"text"}'))
  harness.flushPersonaErrors()
  assert.equal(broken.markdown.querySelectorAll('.md-code-block').length, 0, '写坏的头部不能再当成代码块展示')
  assert.doesNotMatch(broken.markdown.textContent, /"version"/, '原始 JSON 不能摊出来')
  assert.match(broken.markdown.textContent, /kind「text」不在合同内/, '要给出能看懂的原因')
  assert.equal(broken.markdown.getAttribute('data-dsh-persona-kind'), 'legacy')

  // 普通 JSON 代码块（带合同外的键）不能被误判成信封。
  const k8s = flowFor(fence('json', '{"version":1,"kind":"Deployment","spec":{"replicas":2}}'))
  harness.flushPersonaErrors()
  assert.equal(k8s.markdown.querySelectorAll('.md-code-block').length, 1, '普通 JSON 代码块必须原样保留')
  assert.equal(k8s.markdown.getAttribute('data-dsh-persona-kind'), 'code', '走代码通道')

  // 完整信封仍然出三张卡。
  const full = flowFor(fence('persona', '{"version":1,"kind":"normal","conclusion":{"lead":"结论"},"suggestions":["建议"],"risk":"风险"}'))
  harness.flushPersonaErrors()
  assert.equal(full.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3, '完整信封三张卡')
})

test('v5 emptyTone 兜底只写语言风格，不写结构要求', () => {
  const harness = makeHarness(baseState, async () => true)
  const tone = harness.api.emptyTone()
  assert.equal(tone.style, '像朋友说话，口语化；保持简洁。')
  assert.doesNotMatch(tone.style, /先给结论|结构|表格|代码/)
})

test('v5 Client/Host parity：同一无害/恶意 JSON 结果一致', () => {
  const harness = makeHarness(baseState, async () => true)
  const base = JSON.parse(whale)
  const cases = [
    base,
    { ...base, schema: 'dsh-structured/persona@1' },
    { ...base, extra: 1 },
    { ...base, style: '' },
    { ...base, prefix: 'x'.repeat(81) },
    { ...base, skipIn: ['bogus'] },
    { ...base, skipIn: ['code', 'code'] },
  ]
  for (const [index, doc] of cases.entries()) {
    const raw = JSON.stringify(doc)
    const client = harness.api.parseToneJson(raw)
    const host = parsePersona(raw)
    assert.equal(client.ok, host.ok, 'case ' + index)
    if (!client.ok && !host.ok) assert.equal(client.pointer, host.pointer, 'pointer case ' + index)
  }
})

test('React 安全：状态表格只写属性，不改宿主受控子树（issue #5）', () => {
  const harness = makeHarness(baseState, async () => true)
  const flow = harness.document.createElement('div')
  flow.setAttribute('data-chat-flow-kind', 'assistant-step')
  flow.setAttribute('data-chat-node-key', 'react-safe-' + Math.random())
  const slot = harness.document.createElement('div')
  slot.setAttribute('data-slot', 'conversation.chat.node')
  const markdown = harness.document.createElement('div')
  markdown.className = '_markdown_preview'
  markdown.innerHTML = '<table><tbody><tr><td>✅ 完成：已更新</td><td>6 条</td></tr><tr><td>⚠ 待做</td><td>2 条</td></tr></tbody></table>'
  slot.appendChild(markdown)
  flow.appendChild(slot)
  harness.document.body.appendChild(flow)

  const cells = [...markdown.querySelectorAll('td')]
  const before = cells.map((cell) => ({ text: cell.textContent, nodes: cell.childNodes.length }))
  harness.plugin.__test.decorate(flow)

  // React 用真实节点身份做 reconcile：清空/替换/新增子节点都会让下一次更新抛 NotFoundError。
  cells.forEach((cell, index) => {
    assert.equal(cell.textContent, before[index].text, 'cell text must survive (React owns it)')
    assert.equal(cell.childNodes.length, before[index].nodes, 'no plugin node may be injected into a cell')
  })
  assert.equal(cells[0].getAttribute('data-dsh-structured-status-cell'), 'success')
  assert.equal(cells[0].closest('tr').getAttribute('data-dsh-structured-row'), 'success')
  assert.equal(markdown.querySelectorAll('[data-dsh-structured-status-pill]').length, 0, 'no pill node')
  assert.equal(cells[2].getAttribute('data-dsh-structured-status-cell'), 'warn')
})

test('React 安全：卡片标题 strong 不被替换文本，只写属性（issue #5 同类）', () => {
  const harness = makeHarness(baseState, async () => true)
  const flow = harness.document.createElement('div')
  flow.setAttribute('data-chat-flow-kind', 'assistant-step')
  flow.setAttribute('data-chat-node-key', 'react-safe-quote-' + Math.random())
  const slot = harness.document.createElement('div')
  slot.setAttribute('data-slot', 'conversation.chat.node')
  const markdown = harness.document.createElement('div')
  markdown.className = '_markdown_preview'
  markdown.innerHTML = '<blockquote><p><strong>结论</strong>：能上，先灰度。</p></blockquote>'
  slot.appendChild(markdown)
  flow.appendChild(slot)
  harness.document.body.appendChild(flow)

  const strong = markdown.querySelector('strong')
  const firstText = strong.firstChild
  harness.plugin.__test.decorate(flow)

  assert.equal(strong.textContent, '结论', 'strong text must not be rewritten')
  // 节点身份不变才说明没被 `textContent = ...` 整体替换（React 持有原节点引用）。
  assert.equal(strong.firstChild, firstText, 'strong text node identity must be preserved')
  assert.equal(strong.getAttribute('data-dsh-card-label'), '结论')
})

test('卡片级复制：五档按钮齐备、净内容、连续渲染幂等（v1.1）', () => {
  const harness = makeHarness(baseState, async () => true)
  const persona = { prefix: 'Boss，', suffix: '——完' }
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', ...persona, style: '搞怪', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: true, persona: tone, personaName: 'N', personaSignature: 'S', personaAvatar: '' })

  const flow = harness.document.createElement('div')
  flow.setAttribute('data-chat-flow-kind', 'assistant-step')
  flow.setAttribute('data-chat-node-key', 'copy-' + Math.random())
  const slot = harness.document.createElement('div')
  slot.setAttribute('data-slot', 'conversation.chat.node')
  const markdown = harness.document.createElement('div')
  markdown.className = '_markdown_preview'
  markdown.innerHTML = personaEnvelope({
    version: 1,
    kind: 'table',
    conclusion: { lead: '能上，先灰度', body: '回滚脚本先验收' },
    suggestions: ['跑通一条真实链路', '把回滚写进验收'],
    risk: '自动更新跳过确认',
    table: { head: ['模块', '状态'], rows: [['注入链路', '✅ 通过'], ['代码皮肤', '❌ 阻断']] },
  })
  slot.appendChild(markdown)
  flow.appendChild(slot)
  harness.document.body.appendChild(flow)
  harness.plugin.__test.decorate(flow)

  const cardButtons = [...markdown.querySelectorAll('[data-dsh-card-copy]')]
  assert.equal(cardButtons.length, 3, '结论 / 建议 / 风险各一个复制按钮')
  assert.deepEqual(cardButtons.map((b) => b.getAttribute('data-dsh-card-copy')), ['结论', '建议', '风险'])
  for (const button of cardButtons) {
    assert.equal(button.getAttribute('aria-label'), '复制' + button.getAttribute('data-dsh-card-copy'))
    assert.equal(button.tagName, 'BUTTON', '必须是真实 button（键盘可达）')
  }
  assert.equal(markdown.querySelectorAll('[data-dsh-table-copy]').length, 1, '表格复制按钮')
  assert.equal(markdown.querySelectorAll('[data-dsh-reply-copy]').length, 1, '整条回复复制按钮')

  // 幂等：流式 + MutationObserver 会反复进 decorate，按钮数不能涨。
  for (let i = 0; i < 10; i += 1) harness.plugin.__test.decorate(flow)
  assert.equal(markdown.querySelectorAll('[data-dsh-card-copy]').length, 3, '连续 decorate 10 次按钮数不变')
  assert.equal(markdown.querySelectorAll('[data-dsh-table-copy]').length, 1)
  assert.equal(markdown.querySelectorAll('[data-dsh-reply-copy]').length, 1)

  // 净内容：卡片文本不带标签，也不带开场 / 收尾签名。
  const api = harness.plugin.__test.cardCopyApi()
  const cards = [...markdown.querySelectorAll('blockquote')]
  const conclusionText = api.personaCardPlainText(cards[0])
  assert.equal(conclusionText, '能上，先灰度\n回滚脚本先验收')
  const suggestionText = api.personaCardPlainText(cards[1])
  assert.equal(suggestionText, '1. 跑通一条真实链路\n2. 把回滚写进验收')
  const riskText = api.personaCardPlainText(cards[2])
  assert.equal(riskText, '自动更新跳过确认')
  assert.doesNotMatch(conclusionText + suggestionText + riskText, /结论|建议|风险|Boss，|——完/)

  // 表格：TSV 制表符分列。
  const table = markdown.querySelector('table')
  assert.equal(api.personaTableTsv(table), '模块\t状态\na 注入链路\t✅ 通过\nb 代码皮肤\t❌ 阻断')

  // 整条回复：卡片 + 表格，仍不含标签与前后缀。
  const reply = api.personaReplyPlainText(markdown)
  assert.match(reply, /能上，先灰度/)
  assert.match(reply, /模块\t状态/)
  assert.doesNotMatch(reply, /结论|建议|风险|Boss，|——完/)
})

// ── 1.2.0 设置页（单页）：总开关 / 状态行 / 行为区 / 拾色器 / 深度 / 身份头 ──

const cardState = (extra = {}) => ({
  status: 'ready',
  writable: true,
  revision: 0,
  value: {
    theme: 'deepseek',
    contentDepth: 'general',
    defaultEnabled: true,
    tailReminder: true,
    includeSubagents: false,
    genui: 'auto',
    personaEnabled: true,
    personaHeadEnabled: true,
    persona: whale,
    personaRevision: 0,
    ...extra,
  },
})

test('1.2.0 设置页：标题行插件总开关 + 顶部状态行 + 行为区保留四字段', async () => {
  const calls = []
  const harness = makeHarness(cardState(), async (field, value) => { calls.push([field, value]); return true }, { renderCard: true })
  const status = harness.nodes().find((item) => item.props?.['data-dss-status'] === '1')
  assert.ok(status, 'status line must stay at the top')
  assert.match(textOf(status.props.children), /插件 已开启 · 人格 已开启 · 身份头 已开 · 深度 普通/)
  const master = harness.nodes().find((item) => item.type?.name === 'Switch' && item.props.label === '插件总开关')
  assert.ok(master, 'master switch sits in the title row')
  assert.equal(master.props.checked, true)
  master.props.onChange(false)
  assert.deepEqual(calls, [['defaultEnabled', false]])
  await new Promise((resolve) => setImmediate(resolve))
  const statusOff = harness.nodes().find((item) => item.props?.['data-dss-status'] === '1')
  assert.match(textOf(statusOff.props.children), /插件 已关闭/)

  // 行为区：defaultEnabled / includeSubagents / GenUI；尾部提醒固定开启，不给开关。
  assert.equal(harness.nodes().some((item) => item.type?.name === 'Switch' && item.props.label === '尾部提醒'), false)
  assert.ok(harness.nodes().some((item) => item.type?.name === 'Switch' && item.props.label === '子代理注入'))
  assert.ok(harness.nodes().some((item) => item.props?.id === 'dsh-structured-genui'))
})

test('1.2.0 外观：HSV 拾色器（SV 面板 / 色相条 / HEX / 吸管）实时预览并写 themeCustom', () => {
  const calls = []
  const harness = makeHarness(cardState({ theme: 'custom' }), async (field, value) => { calls.push([field, value]); return true }, { renderCard: true })
  const swatch = () => harness.nodes().find((item) => item.props.id === 'dss-color-primary')
  assert.ok(swatch(), 'primary swatch must exist')
  assert.doesNotMatch(String(swatch().props.className), /preset/, 'no preset swatches')
  swatch().props.onClick()

  const sv = harness.nodes().find((item) => item.props?.['data-dss-sv'] === 'primary')
  assert.ok(sv, 'saturation/value panel must exist')
  const hue = harness.nodes().find((item) => item.props?.['data-dss-hue'] === 'primary')
  assert.ok(hue, 'hue bar must exist')
  const hexInput = harness.nodes().find((item) => item.props.id === 'dss-hex-primary')
  assert.ok(hexInput, 'HEX input must exist')
  const eyedropper = harness.nodes().find((item) => item.type === 'button' && textOf(item.props.children) === '吸管')
  assert.ok(eyedropper, 'eyedropper button must exist')
  assert.equal(eyedropper.props.disabled, true, 'no EyeDropper in this host → disabled, not fake')
  assert.match(String(eyedropper.props.title), /不支持吸管/)

  const rect = { left: 0, top: 0, width: 200, height: 100 }
  sv.props.onPointerDown({ clientX: 100, clientY: 25, currentTarget: { getBoundingClientRect: () => rect } })
  const live = harness.nodes().find((item) => item.props.id === 'dss-color-primary')
  const liveHex = String(live.props['aria-label']).split(' ')[1]
  assert.notEqual(liveHex, '#4B5563', 'dragging must preview live')
  assert.equal(calls.length, 0, 'live preview must not write config')

  const sv2 = harness.nodes().find((item) => item.props?.['data-dss-sv'] === 'primary')
  sv2.props.onPointerUp({ clientX: 100, clientY: 25, currentTarget: { getBoundingClientRect: () => rect } })
  assert.ok(calls.some(([field]) => field === 'themeCustom'), 'release commits themeCustom')
  const palette = JSON.parse(calls.find(([field]) => field === 'themeCustom')[1])
  assert.equal(palette.schema, 'dsh-structured/palette@1')
  assert.ok(harness.api.palette.contrastRatio(palette.primary, '#ffffff') >= 3, 'contrast auto-fixed to ≥3')

  // 色相条：改色相（提交）。
  const before = palette.primary
  const hue2 = harness.nodes().find((item) => item.props?.['data-dss-hue'] === 'primary')
  hue2.props.onPointerUp({ clientX: 190, clientY: 6, currentTarget: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 12 }) } })
  const afterHue = JSON.parse(calls.filter(([field]) => field === 'themeCustom').at(-1)[1]).primary
  assert.notEqual(afterHue, before, 'hue bar must change the color')

  // HEX 输入：回车 / 失焦提交。
  harness.nodes().find((item) => item.props.id === 'dss-hex-primary').props.onChange({ target: { value: '#2563EB' } })
  harness.nodes().find((item) => item.props.id === 'dss-hex-primary').props.onBlur()
  const afterHex = JSON.parse(calls.filter(([field]) => field === 'themeCustom').at(-1)[1]).primary
  assert.notEqual(afterHex, afterHue, 'HEX input must commit a new color')
  assert.ok(harness.api.palette.contrastRatio(afterHex, '#ffffff') >= 3)

  // 自定义主题只注入 --dss-* 强调色，明暗两段都在。
  const css = harness.api.palette.customThemeCss(harness.api.palette.paletteFromRaw(calls.filter(([field]) => field === 'themeCustom').at(-1)[1]).palette)
  assert.match(css, /data-dsh-structured-theme="custom"/)
  assert.match(css, /--dss-blue:/)
  assert.match(css, /data-ds-dark-theme/)
  assert.ok(css.includes(afterHex))
})

// 1.2.0 修复：预设只改语气，不得覆盖昵称 / 自称；「中二」不再出现「本座」。
test('1.2.0 风格预设：只改说话方式，昵称 / 自称以输入框为准，中二无「本座」', async () => {
  const calls = []
  const harness = makeHarness(baseState, async (field, value) => { calls.push([field, value]) })
  assert.doesNotMatch(JSON.stringify(harness.api.STYLE_PRESETS), /本座/, 'no preset field may mention 本座')

  const chuuni = harness.nodes().find((item) => item.type === 'button' && String(item.props.className ?? '').includes('dss-chip-btn') && textOf(item.props.children) === '中二')
  assert.ok(chuuni, '中二 preset chip must exist')
  chuuni.props.onClick()

  // 昵称 / 自称输入框保持原值（preset 只写 style）。
  assert.ok(harness.inputByValue('Boss💗'), 'nickname must not be overwritten by preset')
  assert.ok(harness.inputByValue('本鱼鱼🐳'), 'self-name must not be overwritten by preset')

  await harness.click('保存')
  const saved = JSON.parse(calls.find(([field]) => field === 'persona')[1])
  assert.equal(saved.userName, 'Boss💗')
  assert.equal(saved.selfName, '本鱼鱼🐳')
  assert.match(saved.style, /中二/)
  assert.doesNotMatch(JSON.stringify(saved), /本座/)
})

test('1.2.0 拾色器：确认提交当前颜色并关闭，取消丢弃草稿', () => {
  const calls = []
  const harness = makeHarness(cardState({ theme: 'custom' }), async (field, value) => { calls.push([field, value]); return true }, { renderCard: true })
  const openPrimary = () => harness.nodes().find((item) => item.props.id === 'dss-color-primary').props.onClick()
  const svOpen = () => harness.nodes().some((item) => item.props?.['data-dss-sv'] === 'primary')

  openPrimary()
  assert.ok(svOpen(), 'clicking swatch opens the picker')
  harness.nodes().find((item) => item.props.id === 'dss-hex-primary').props.onChange({ target: { value: '#2563EB' } })
  assert.equal(calls.length, 0, 'typing HEX only previews')

  const confirm = harness.nodes().find((item) => item.type === 'button' && textOf(item.props.children) === '确认')
  assert.ok(confirm, 'explicit confirm button must exist')
  confirm.props.onClick()
  const written = calls.find(([field]) => field === 'themeCustom')
  assert.ok(written, 'confirm commits themeCustom')
  assert.notEqual(JSON.parse(written[1]).primary, '#2563EB', 'commit applies saturation / contrast fix')
  assert.equal(svOpen(), false, 'confirm closes the picker')

  openPrimary()
  harness.nodes().find((item) => item.props.id === 'dss-hex-primary').props.onChange({ target: { value: '#2563EB' } })
  const before = calls.length
  const cancel = harness.nodes().find((item) => item.type === 'button' && textOf(item.props.children) === '取消')
  assert.ok(cancel, 'cancel button available')
  cancel.props.onClick()
  assert.equal(calls.length, before, 'cancel must not write config')
  assert.equal(svOpen(), false, 'cancel closes the picker')
})

test('1.2.0 讲解卡跟随自定义三色：主/副混合、明暗都可读', () => {
  const harness = makeHarness(baseState, async () => true)
  const palette = { primary: '#2563EB', secondary: '#047857', tertiary: '#B45309' }
  const [light, dark] = harness.api.palette.customThemeCss(palette).split('\n')
  const token = (block, name) => (block.match(new RegExp('--' + name + ':([^;]+);')) ?? [])[1]
  const parse = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16))
  const mix = (a, b, ratio) => '#' + parse(a).map((value, index) => Math.round(value + (parse(b)[index] - value) * ratio).toString(16).padStart(2, '0')).join('').toUpperCase()
  const { contrastRatio } = harness.api.palette

  const lightExplain = token(light, 'dss-explain')
  assert.equal(lightExplain, mix('#2563EB', '#047857', 0.5), 'explain = primary / secondary midpoint')
  assert.notEqual(lightExplain, '#7c3aed', 'explain must not fall back to the preset purple')
  const lightText = token(light, 'dss-explain-text')
  assert.ok(contrastRatio(lightExplain, '#ffffff') >= 4.5, 'light explain is readable')
  assert.ok(contrastRatio(lightText, '#ffffff') >= 4.5, 'light explain text is readable')

  assert.ok(dark, 'dark segment must exist')
  const darkExplain = token(dark, 'dss-explain')
  const darkText = token(dark, 'dss-explain-text')
  assert.notEqual(darkExplain, lightExplain, 'dark explain is derived separately')
  assert.ok(contrastRatio(darkExplain, '#242629') >= 4.5, 'dark explain is readable')
  assert.ok(contrastRatio(darkText, '#242629') >= 4.5, 'dark explain text is readable')

  const shifted = harness.api.palette.customThemeCss({ ...palette, primary: '#B42318' }).split('\n')[0]
  assert.notEqual(token(shifted, 'dss-explain'), lightExplain, 'explain follows the custom palette')
})

test('1.2.0 输出深度：三档、默认普通、只写 contentDepth', () => {
  const calls = []
  const harness = makeHarness(cardState(), async (field, value) => { calls.push([field, value]); return true }, { renderCard: true })
  const text = harness.nodes().map((item) => String(textOf(item.props.children))).join(' ')
  assert.match(text, /只改变解释量，不改卡片结构、编号与事实；分层参考 eli5 skill。/)
  assert.match(text, /三档始终有一档，不提供关闭；默认普通/)
  assert.match(text, /Explain Like I'm 5/)
  assert.match(text, /入门不等于幼稚化/)
  const general = harness.nodes().find((item) => item.props.id === 'dss-depth-general')
  assert.equal(general.props['aria-pressed'], 'true')
  const expert = harness.nodes().find((item) => item.props.id === 'dss-depth-expert')
  expert.props.onClick()
  assert.deepEqual(calls, [['contentDepth', 'expert']])
  assert.equal(harness.nodes().some((item) => item.type === 'button' && textOf(item.props.children) === '关闭'), false)
})

test('1.2.0 人格：身份头开关写 personaHeadEnabled，人格关时自动关闭并禁用', async () => {
  const calls = []
  const state = { status: 'ready', writable: true, revision: 3, value: { persona: whale, personaEnabled: true, personaHeadEnabled: true, personaRevision: 1 } }
  const harness = makeHarness(state, async (field, value) => { calls.push([field, value]); return true })
  const head = harness.nodes().find((item) => item.type?.name === 'Switch' && item.props.label === '身份头')
  assert.ok(head)
  assert.equal(head.props.checked, true)
  assert.equal(head.props.disabled, false)
  head.props.onChange(false)
  await harness.click('保存')
  assert.ok(calls.some(([field, value]) => field === 'personaHeadEnabled' && value === false), 'head switch must persist')
  assert.equal(harness.findButton('保存').props.disabled, true)

  const personaSwitch = harness.nodes().find((item) => item.type?.name === 'Switch' && item.props.label === '人格总开关')
  personaSwitch.props.onChange(false)
  const headOff = harness.nodes().find((item) => item.type?.name === 'Switch' && item.props.label === '身份头')
  assert.equal(headOff.props.checked, false, 'persona off → head off')
  assert.equal(headOff.props.disabled, true, 'persona off → head switch disabled')
  await harness.click('保存')
  assert.ok(calls.some(([field, value]) => field === 'personaEnabled' && value === false))
  assert.ok(calls.some(([field, value]) => field === 'personaHeadEnabled' && value === false))
})

test('PersonaMode：身份头关仍出卡，只去掉头像 / 名字 / 签名', () => {
  const harness = makeHarness(baseState, async () => true)
  const persona = { prefix: 'Boss，', suffix: '——完' }
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', ...persona, style: '搞怪', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  const config = { personaEnabled: true, personaHeadEnabled: true, persona: tone, personaName: '鲸鱼', personaSignature: 'S', personaAvatar: '' }
  harness.plugin.__test.setPersonaModeConfig(config)
  const flowFor = (html) => {
    const flow = harness.document.createElement('div')
    flow.setAttribute('data-chat-flow-kind', 'assistant-step')
    flow.setAttribute('data-chat-node-key', 'head-' + Math.random())
    const slot = harness.document.createElement('div')
    slot.setAttribute('data-slot', 'conversation.chat.node')
    const markdown = harness.document.createElement('div')
    markdown.className = '_markdown_preview'
    markdown.innerHTML = html
    slot.appendChild(markdown)
    flow.appendChild(slot)
    harness.document.body.appendChild(flow)
    harness.plugin.__test.decorate(flow)
    return { flow, markdown }
  }
  const content = { version: 1, kind: 'normal', conclusion: { lead: '能上' }, suggestions: ['跑链路'], risk: '回滚未演练' }
  const on = flowFor(personaEnvelope(content))
  assert.equal(on.flow.querySelectorAll('[data-dsh-persona-head]').length, 1)
  assert.equal(on.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3)
  assert.ok(on.markdown.querySelector('.dss-persona-prefix'))

  harness.plugin.__test.setPersonaModeConfig({ ...config, personaHeadEnabled: false })
  harness.plugin.__test.decorate(on.flow)
  assert.equal(on.flow.querySelectorAll('[data-dsh-persona-head]').length, 0, 'head removed when switch is off')
  assert.equal(on.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3, 'cards stay')
  assert.ok(on.markdown.querySelector('.dss-persona-prefix'), 'persona style still on: prefix stays')

  const fresh = flowFor(personaEnvelope(content))
  assert.equal(fresh.flow.querySelectorAll('[data-dsh-persona-head]').length, 0, 'no head on new messages')
  assert.equal(fresh.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3, 'new messages still render cards')
})

test('1.2.3 PersonaMode：身份头关闭时 normal 回复仍渲染内心OS 💭 尾缀', () => {
  const harness = makeHarness(baseState, async () => true)
  const persona = { prefix: 'Boss，', suffix: '——完' }
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', ...persona, style: '搞怪', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  // 身份头关闭，但内心OS 子开关保持开启。
  harness.plugin.__test.setPersonaModeConfig({
    personaEnabled: true,
    personaHeadEnabled: false,
    personaInnerOsEnabled: true,
    persona: tone,
    personaName: '鲸鱼',
    personaSignature: 'S',
    personaAvatar: '',
  })
  const flow = harness.document.createElement('div')
  flow.setAttribute('data-chat-flow-kind', 'assistant-step')
  flow.setAttribute('data-chat-node-key', 'inneros-headoff')
  const slot = harness.document.createElement('div')
  slot.setAttribute('data-slot', 'conversation.chat.node')
  const markdown = harness.document.createElement('div')
  markdown.className = '_markdown_preview'
  markdown.innerHTML = personaEnvelope({
    version: 1,
    kind: 'normal',
    conclusion: { lead: '能上', body: '先灰度一周' },
    suggestions: ['跑通一条真实链路'],
    risk: '回滚未演练',
    innerOs: '这次别再拖到明天。',
  })
  slot.appendChild(markdown)
  flow.appendChild(slot)
  harness.document.body.appendChild(flow)
  harness.plugin.__test.decorate(flow)

  assert.equal(flow.querySelectorAll('[data-dsh-persona-head]').length, 0, 'head stays hidden')
  assert.equal(markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3, 'three cards still render')
  const suffix = markdown.querySelector('.dss-persona-suffix')
  assert.ok(suffix, 'innerOs suffix must render when head is off')
  assert.match(suffix.textContent, /^💭 /)
})

test('1.2.3 PersonaMode：信封降级抢救时保留 💭 内心OS（身份头关闭）', () => {
  const harness = makeHarness(baseState, async () => true)
  const tone = JSON.stringify({ schema: 'dsh-structured/tone@1', prefix: '', suffix: '', style: '搞怪', skipIn: ['code', 'diff', 'error', 'short', 'table'] })
  harness.plugin.__test.setPersonaModeConfig({
    personaEnabled: true,
    personaHeadEnabled: false,
    personaInnerOsEnabled: true,
    persona: tone,
    personaName: '鲸鱼',
    personaSignature: 'S',
    personaAvatar: '',
  })
  const flow = harness.document.createElement('div')
  flow.setAttribute('data-chat-flow-kind', 'assistant-step')
  flow.setAttribute('data-chat-node-key', 'inneros-salvage')
  const slot = harness.document.createElement('div')
  slot.setAttribute('data-slot', 'conversation.chat.node')
  const markdown = harness.document.createElement('div')
  markdown.className = '_markdown_preview'
  // 模型多写一个未定义字段 → 严格合同拒绝、走降级抢救；innerOs 本身合法。
  markdown.innerHTML = personaEnvelope({
    version: 1,
    kind: 'normal',
    conclusion: { lead: '能上', body: '先灰度一周' },
    suggestions: ['跑通一条真实链路'],
    risk: '回滚未演练',
    innerOs: '这次别再拖到明天。',
    mood: '谨慎',
  })
  slot.appendChild(markdown)
  flow.appendChild(slot)
  harness.document.body.appendChild(flow)
  harness.plugin.__test.decorate(flow)
  harness.flushPersonaErrors()

  assert.equal(markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3, 'salvage still renders three cards')
  assert.equal(flow.querySelectorAll('[data-dsh-persona-head]').length, 0, 'head hidden')
  const suffix = markdown.querySelector('.dss-persona-suffix')
  assert.ok(suffix, 'salvage path must keep innerOs suffix')
  assert.match(suffix.textContent, /^💭 这次别再拖到明天。$/)
})
