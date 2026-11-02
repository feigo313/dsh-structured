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
  const document = makeDom()
  vm.runInNewContext(readFileSync('lib/client.js', 'utf8'), {
    window, document, TextEncoder, FileReader: FakeFileReader, Image: FakeImage,
    MutationObserver: class { observe() {} disconnect() {} },
    requestAnimationFrame: (fn) => fn(), cancelAnimationFrame() {}, setTimeout: (fn) => fn(), clearTimeout() {},
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
    previewHtml() { return nodes().find((item) => item.props?.dangerouslySetInnerHTML)?.props.dangerouslySetInnerHTML.__html ?? '' },
    setWindowConfirm(value) { window.confirm = () => value },
  }
}

const baseState = { status: 'ready', writable: true, revision: 0, value: { persona: whale, personaEnabled: false, personaRevision: 0 } }

const personaEnvelope = (payload) => `<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span><div class="_actions_persona"></div></div></div><div data-code-block-content><pre>${JSON.stringify(payload)}</pre></div></div>`

test('v5 语气设置：档案行 + 三字段 + 规则行 + 样式预览，不再有基础/进阶/JSON', () => {
  const harness = makeHarness(baseState, async () => true)
  const text = harness.nodes().map((item) => String(textOf(item.props.children))).join(' ')
  assert.match(text, /语气风格/)
  assert.match(text, /样式预览/)
  assert.match(text, /切换人格/)
  assert.match(text, /开场/)
  assert.match(text, /性格/)
  assert.match(text, /收尾/)
  assert.match(text, /放在最前面 · 可留空/)
  assert.match(text, /代码 \/ diff \/ 报错/)
  assert.doesNotMatch(text, /基础|进阶|JSON 编辑|开头前缀|中间风格|结尾后缀/)
  assert.equal(harness.findButton('保存').props.disabled, true)
  assert.ok(harness.nodeByClass('dss-config'))
  assert.ok(harness.nodeByClass('dss-preview'))
  assert.ok(harness.inputByValue('Boss，'))
  assert.ok(harness.findTextarea('搞怪 / 傲娇怪'))
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
  harness.inputByValue('Boss，').props.onChange({ target: { value: '老板，' } })
  harness.findTextarea('搞怪 / 傲娇怪').props.onChange({ target: { value: '直接 / 克制' } })
  harness.inputByValue('——本鲸鱼娘可不背锅').props.onChange({ target: { value: '——收工' } })
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
  harness.inputByValue('Boss，').props.onChange({ target: { value: '批量前缀' } })
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
  harness.inputByValue('Boss，').props.onChange({ target: { value: '批量失败草稿' } })
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
  harness.inputByValue('Boss，').props.onChange({ target: { value: 'persona 失败草稿' } })
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
  harness.inputByValue('Boss，').props.onChange({ target: { value: 'revision 失败草稿' } })
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
  harness.inputByValue('Boss，').props.onChange({ target: { value: '读回失败草稿' } })
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
  harness.inputByValue('Boss，').props.onChange({ target: { value: '无读回草稿' } })
  await harness.click('保存')
  assert.ok(harness.inputByValue('无读回草稿'))
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).includes('缺少配置读回接口')))
})

test('v5 readonly：档案行/字段/保存/恢复默认全部禁用', () => {
  const harness = makeHarness({ status: 'ready', writable: false, value: { persona: whale, personaEnabled: true } }, async () => true)
  assert.equal(harness.findButton('保存').props.disabled, true)
  assert.equal(harness.findButton('恢复默认').props.disabled, true)
  assert.equal(harness.inputByValue('Boss，').props.disabled, true)
  assert.equal(harness.findTextarea('搞怪 / 傲娇怪').props.disabled, true)
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
  harness.inputByValue('Boss，').props.onChange({ target: { value: '草稿' } })
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
  assert.match(text, /预览为 PersonaMode 合同样本：身份头、卡外前缀、结论 \/ 下一步 \/ 风险、收尾；真实回复与预览同源。/)
  await harness.click('表格')
  let html = harness.previewHtml()
  assert.match(html, /注入链路/)
  assert.match(html, /data-dsh-structured-status-table="1"/)
  assert.match(html, /data-dsh-structured-status-pill="1"/)
  assert.match(html, /dss-status-success/)
  await harness.click('代码')
  html = harness.previewHtml()
  assert.match(html, /tone-loader\.js/)
  assert.match(html, /data-dsh-structured-copy="1"/)
  assert.match(html, /dss-code/)
  await harness.click('普通')
  html = harness.previewHtml()
  assert.match(html, /这版能上/)
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
  for (const sample of ['normal', 'table']) {
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

test('PersonaMode：缺失/非法内容块显式 error，不补卡；code 例外；关闭清理', () => {
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
  assert.equal(missing.markdown.getAttribute('data-dsh-persona-kind'), 'error')
  assert.equal(missing.markdown.getAttribute('data-dsh-persona-error'), '1')
  assert.equal(missing.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 0, 'must not fabricate cards')
  assert.equal(missing.flow.querySelectorAll('[data-dsh-persona-head]').length, 1)
  const invalid = flowFor('<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span></div></div><div data-code-block-content><pre>{bad json}</pre></div></div>')
  assert.equal(invalid.markdown.getAttribute('data-dsh-persona-kind'), 'error')
  assert.equal(invalid.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 0)
  const unknown = flowFor(personaEnvelope({ version: 1, kind: 'normal', conclusion: { lead: 'L' }, suggestions: ['S'], risk: 'R', extra: 1 }))
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
  harness.plugin.__test.setPersonaModeConfig(config)
  const buildFlow = (html) => {
    const flow = harness.document.createElement('div')
    flow.setAttribute('data-chat-flow-kind', 'assistant-step')
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
  const flowFor = (html) => {
    const item = buildFlow(html)
    harness.plugin.__test.decorate(item.flow)
    return item
  }
  const normalContent = { version: 1, kind: 'normal', conclusion: { lead: 'L' }, suggestions: ['S'], risk: 'R' }
  const normal = flowFor(personaEnvelope(normalContent))
  assert.equal(normal.markdown.getAttribute('data-dsh-persona-kind'), 'normal')
  harness.plugin.__test.decorate(normal.flow)
  assert.equal(normal.markdown.getAttribute('data-dsh-persona-kind'), 'normal', 'redecorate must stay normal')
  assert.equal(normal.markdown.querySelectorAll('[data-dsh-structured-card-type]').length, 3)
  assert.doesNotMatch(normal.markdown.textContent, /内容合同错误/)

  const old = buildFlow('<p>旧消息正文</p>')
  harness.plugin.__test.decorate(old.flow, { fresh: false })
  assert.equal(old.markdown.getAttribute('data-dsh-persona-kind'), null, 'old history must not be rewritten')
  assert.equal(old.markdown.getAttribute('data-dsh-persona-error'), null)
  assert.match(old.markdown.textContent, /旧消息正文/)

  const partial = flowFor('<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span></div></div><div data-code-block-content><pre>{"version":1,"kind":"normal",</pre></div></div>')
  assert.equal(partial.markdown.getAttribute('data-dsh-persona-kind'), null, 'partial stream must not error')
  assert.equal(partial.markdown.getAttribute('data-dsh-persona-error'), null)
  assert.equal(partial.markdown.getAttribute('data-dsh-persona-pending'), '1')
  assert.equal(partial.markdown.querySelectorAll('.md-code-block').length, 1, 'partial block must be preserved')

  const loose = harness.document.createElement('div')
  loose.className = '_markdown_preview'
  loose.innerHTML = '<p>no flow</p>'
  harness.document.body.appendChild(loose)
  harness.plugin.__test.decorate(loose)
  assert.equal(loose.getAttribute('data-dsh-persona-kind'), 'error', 'no-flow must be explicit error')
  assert.equal(loose.getAttribute('data-dsh-persona-error'), '1')

  const diff = flowFor('<div class="md-diff"><p>diff text</p></div>')
  assert.equal(diff.markdown.getAttribute('data-dsh-persona-kind'), 'diff')
  assert.equal(diff.markdown.getAttribute('data-dsh-persona-error'), null, 'diff is an exception, not a content error')

  const six = flowFor(personaEnvelope({ ...normalContent, suggestions: ['1', '2', '3', '4', '5', '6'] }))
  assert.equal(six.markdown.getAttribute('data-dsh-persona-kind'), 'error', '6 suggestions must be rejected')
  const rows = Array.from({ length: 21 }, (_, i) => [String(i), 'x'])
  const tooMany = flowFor(personaEnvelope({ version: 1, kind: 'table', conclusion: { lead: 'L' }, suggestions: ['S'], risk: 'R', table: { head: ['A', 'B'], rows } }))
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
