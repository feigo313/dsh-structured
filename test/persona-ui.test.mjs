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
    if (result !== false) written[field] = value
    return result
  }
  const readFields = extraProps.readFields ?? (() => ({ status: 'ready', writable: state.writable, value: { ...written } }))
  const render = () => { hookIndex = 0; tree = current({ state, setField: trackedSetField, readFields, ...extraProps }); return tree }
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
  current = api.PersonaEditor
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

test('v5 语气设置：档案行 + 三字段 + 规则行 + 样式预览，不再有基础/进阶/JSON', () => {
  const harness = makeHarness(baseState, async () => true)
  const text = harness.nodes().map((item) => String(textOf(item.props.children))).join(' ')
  assert.match(text, /语气风格/)
  assert.match(text, /样式预览/)
  assert.match(text, /切换人格/)
  assert.match(text, /昵称/)
  assert.match(text, /自称/)
  assert.match(text, /开场/)
  assert.match(text, /性格/)
  assert.match(text, /收尾/)
  assert.match(text, /放在最前面 · 可留空/)
  assert.match(text, /代码 \/ 表格等正文保持中性/)
  assert.doesNotMatch(text, /基础|进阶|JSON 编辑|开头前缀|中间风格|结尾后缀/)
  assert.equal(harness.findButton('保存').props.disabled, true)
  assert.ok(harness.nodeByClass('dss-config'))
  assert.ok(harness.nodeByClass('dss-preview'))
  assert.ok(String(harness.previewHost()?.props?.className ?? '').includes('dss-persona-preview'), 'preview host must mark persona scope')
  assert.ok(harness.inputByValue('我最爱💗的Boss~！！鱼鱼🐳报告📢！'))
  assert.ok(harness.inputByValue('Boss💗'))
  assert.ok(harness.inputByValue('本鱼鱼🐳'))
  assert.ok(harness.findTextarea('搞怪/傲娇'))
  assert.ok(harness.inputByValue('蓝色大肥鱼'))
  assert.ok(harness.inputByValue('主人，再来一碗白米饭！！~'))
  assert.equal(harness.nodes().some((item) => item.type === 'select'), false)
  const avatar = harness.nodes().find((item) => item.type === 'img' && item.props.src?.startsWith('data:image/jpeg;base64,'))
  assert.ok(avatar, 'default whale avatar must be a real image')
  assert.equal(harness.nodes().filter((item) => item.type === 'button' && textOf(item.props.children) === '普通').length, 1)
})

test('v5 编辑三字段/名称/签名 → 保存 persona + enabled + revision + 档案字段', async () => {
  const calls = []
  const harness = makeHarness(baseState, async (field, value) => { calls.push([field, value]) })
  harness.inputByValue('我最爱💗的Boss~！！鱼鱼🐳报告📢！').props.onChange({ target: { value: '老板，' } })
  harness.findTextarea('搞怪/傲娇').props.onChange({ target: { value: '直接 / 克制' } })
  harness.inputByValue('本鱼鱼🐳 精准！🚀高效的完成了任务！🔥快夸我！🌝 ~ 报告完毕！~').props.onChange({ target: { value: '——收工' } })
  harness.inputByValue('蓝色大肥鱼').props.onChange({ target: { value: '新名字' } })
  harness.inputByValue('主人，再来一碗白米饭！！~').props.onChange({ target: { value: '新签名' } })
  assert.equal(harness.findButton('保存').props.disabled, false)
  await harness.click('保存')
  assert.deepEqual(calls.map(([field]) => field), ['persona', 'personaEnabled', 'personaRevision', 'personaName', 'personaSignature', 'personaAvatar'])
  assert.equal(calls[2][1], 1)
  const saved = JSON.parse(calls[0][1])
  assert.equal(saved.schema, 'dsh-structured/tone@1')
  assert.equal(saved.prefix, '老板，')
  assert.equal(saved.style, '直接 / 克制')
  assert.equal(saved.suffix, '——收工')
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
  harness.inputByValue('我最爱💗的Boss~！！鱼鱼🐳报告📢！').props.onChange({ target: { value: '批量前缀' } })
  await harness.click('保存')
  assert.equal(calls.length, 0, 'batch path must not call setField')
  assert.ok(batch)
  assert.equal(JSON.stringify(batch.ops.map((op) => [op.op, op.path[0]])), JSON.stringify([
    ['set', 'persona'], ['set', 'personaEnabled'], ['set', 'personaRevision'],
    ['set', 'personaName'], ['set', 'personaSignature'], ['set', 'personaAvatar'],
  ]))
  assert.match(batch.ops[0].value, /批量前缀/)
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
  harness.inputByValue('我最爱💗的Boss~！！鱼鱼🐳报告📢！').props.onChange({ target: { value: '批量失败草稿' } })
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
  harness.inputByValue('我最爱💗的Boss~！！鱼鱼🐳报告📢！').props.onChange({ target: { value: 'persona 失败草稿' } })
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
  harness.inputByValue('我最爱💗的Boss~！！鱼鱼🐳报告📢！').props.onChange({ target: { value: 'revision 失败草稿' } })
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
  harness.inputByValue('我最爱💗的Boss~！！鱼鱼🐳报告📢！').props.onChange({ target: { value: '读回失败草稿' } })
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
  harness.inputByValue('我最爱💗的Boss~！！鱼鱼🐳报告📢！').props.onChange({ target: { value: '无读回草稿' } })
  await harness.click('保存')
  assert.ok(harness.inputByValue('无读回草稿'))
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).includes('缺少配置读回接口')))
})

test('v5 readonly：档案行/字段/保存/恢复默认全部禁用', () => {
  const harness = makeHarness({ status: 'ready', writable: false, value: { persona: whale, personaEnabled: true } }, async () => true)
  assert.equal(harness.findButton('保存').props.disabled, true)
  assert.equal(harness.findButton('恢复默认').props.disabled, true)
  assert.equal(harness.inputByValue('我最爱💗的Boss~！！鱼鱼🐳报告📢！').props.disabled, true)
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
  assert.ok(harness.previewHtml().includes('data:image/jpeg;base64,AAAA'), 'preview avatar must sync')
  assert.equal(harness.findButton('保存').props.disabled, false)
  await harness.click('保存')
  assert.ok(calls.some(([field, value]) => field === 'personaAvatar' && value === 'data:image/jpeg;base64,AAAA'))
  await harness.click('恢复默认')
  assert.equal(harness.previewHtml().includes('data:image/jpeg;base64,AAAA'), false)
  assert.ok(harness.previewHtml().includes('data:image/jpeg;base64,/9j/'), 'reset must restore the built-in whale avatar')
  const defaultAvatar = harness.nodes().find((item) => item.type === 'img' && String(item.props.src).startsWith('data:image/jpeg;base64,/9j/'))
  assert.ok(defaultAvatar, 'profile avatar must restore the built-in whale avatar')
})

test('v5 tabGuard：dirty 时确认，clean 时放行', () => {
  const guard = {}
  const harness = makeHarness(baseState, async () => true, { tabGuard: guard })
  assert.equal(guard.confirm(), true)
  harness.inputByValue('我最爱💗的Boss~！！鱼鱼🐳报告📢！').props.onChange({ target: { value: '草稿' } })
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

test('v5 emoji：64 格面板，点选插入开场并更新计数器', async () => {
  const harness = makeHarness(baseState, async () => true)
  await harness.click('☺')
  const panel = harness.nodeByClass('dss-emoji-panel')
  assert.ok(panel)
  assert.equal(panel.props.children.length, 64)
  const first = panel.props.children[0]
  await first.props.onClick({ stopPropagation() {} })
  const prefix = harness.nodes().find((item) => item.type === 'input' && item.props.id === 'dss-prefix')
  assert.ok(String(prefix.props.value).includes('🐳'))
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).endsWith(' / 80')))
})

test('v5 预览：三态走公共装饰管线，不再手写卡片/状态签', async () => {
  const harness = makeHarness(baseState, async () => true)
  assert.ok(harness.findButton('普通'))
  const text = harness.nodes().map((item) => String(textOf(item.props.children))).join(' ')
  assert.match(text, /预览为 PersonaMode 合同样本：身份头、卡外前缀、结论 \/ 建议 \/ 风险、收尾；真实回复与预览同源。/)
  await harness.click('表格')
  let html = harness.previewHtml()
  assert.match(html, /注入链路/)
  assert.match(html, /data-dsh-structured-status-table="1"/)
  assert.match(html, /data-dsh-structured-status-pill="1"/)
  assert.match(html, /dss-status-success/)
  await harness.click('短答')
  html = harness.previewHtml()
  assert.match(html, /现在三点/)
  assert.match(html, /data-dsh-persona-kind="short"/)
  assert.match(html, /data-dsh-structured-card-type="short"/)
  await harness.click('代码')
  html = harness.previewHtml()
  assert.match(html, /tone-loader\.js/)
  assert.match(html, /data-dsh-structured-copy="1"/)
  assert.match(html, /dss-code/)
  assert.match(html, /data-dsh-persona-kind="code"/)
  await harness.click('普通')
  html = harness.previewHtml()
  assert.match(html, /能上/)
  assert.match(html, /data-dsh-structured-card-type="conclusion"/)
  assert.match(html, /dss-card-conclusion/)
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
  assert.equal(missing.flow.querySelectorAll('[data-dsh-persona-head]').length, 1)
  harness.flushPersonaErrors()
  assert.equal(missing.markdown.getAttribute('data-dsh-persona-kind'), null)
  assert.equal(missing.markdown.getAttribute('data-dsh-persona-error'), null)

  const invalid = flowFor('<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span></div></div><div data-code-block-content><pre>{bad json}</pre></div></div>')
  assert.equal(invalid.markdown.getAttribute('data-dsh-persona-error'), null, 'incomplete JSON waits for the grace window')
  assert.equal(invalid.markdown.getAttribute('data-dsh-persona-pending'), '1')
  harness.flushPersonaErrors()
  assert.equal(invalid.markdown.getAttribute('data-dsh-persona-kind'), 'error')
  assert.equal(invalid.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 0)

  const unknown = flowFor(personaEnvelope({ version: 1, kind: 'normal', conclusion: { lead: 'L' }, suggestions: ['S'], risk: 'R', extra: 1 }))
  harness.flushPersonaErrors()
  assert.equal(unknown.markdown.getAttribute('data-dsh-persona-kind'), 'error')
  assert.equal(unknown.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 0)

  const code = flowFor('<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">js</span></div></div><div data-code-block-content><pre>const x = 1</pre></div></div>')
  assert.equal(code.markdown.getAttribute('data-dsh-persona-kind'), 'code')
  assert.equal(code.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 0)
  assert.equal(code.flow.querySelectorAll('[data-dsh-persona-head]').length, 1)

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
  assert.equal(six.markdown.getAttribute('data-dsh-persona-kind'), 'error', '6 suggestions must be rejected')
  const rows = Array.from({ length: 21 }, (_, i) => [String(i), 'x'])
  const tooMany = flowFor(personaEnvelope({ version: 1, kind: 'table', conclusion: { lead: 'L' }, suggestions: ['S'], risk: 'R', table: { head: ['A', 'B'], rows } }))
  harness.flushPersonaErrors()
  assert.equal(tooMany.markdown.getAttribute('data-dsh-persona-kind'), 'error', '21 table rows must be rejected')

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
  assert.equal(markdown.querySelector('.dss-persona-prefix').textContent, '新前缀，')
  assert.match(flow.querySelector('[data-dsh-persona-head]').textContent, /新名字/)
  assert.equal(oldMarkdown.getAttribute('data-dsh-persona-kind'), null, 'config change must not decorate old history')

  // 关闭：前后缀节点与文本删除，通用卡保留。
  harness.plugin.__test.setPersonaModeConfig({ personaEnabled: false })
  assert.equal(flow.querySelectorAll('[data-dsh-persona-head]').length, 0)
  assert.equal(markdown.getAttribute('data-dsh-persona-kind'), null)
  assert.equal(markdown.querySelectorAll('.dss-persona-prefix, .dss-persona-suffix').length, 0)
  assert.doesNotMatch(markdown.textContent, /新前缀，|——新尾/)
  assert.equal(markdown.querySelectorAll('blockquote').length, 3, 'generic cards remain after close')
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
  assert.equal(broken.markdown.getAttribute('data-dsh-persona-kind'), 'error')
  assert.match(broken.markdown.textContent, /内容合同错误/)
  assert.match(broken.markdown.textContent, /version/, 'original content must survive the error card')
  assert.equal(broken.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 0, 'error must not fabricate cards')
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
  assert.equal(broken.markdown.getAttribute('data-dsh-persona-kind'), 'error')
  assert.match(broken.markdown.textContent, /内容合同错误/)
  assert.match(broken.markdown.textContent, /version/, 'original content must survive the error card')
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
  assert.equal(stillBroken.markdown.getAttribute('data-dsh-persona-kind'), 'error', 'semantically invalid JSON must stay an error even after brace repair')
  assert.match(stillBroken.markdown.textContent, /内容合同错误/)
  assert.match(stillBroken.markdown.textContent, /version/, 'original content must survive the error card')
  assert.equal(stillBroken.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 0, 'error must not fabricate cards')
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
