import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import { parsePersona } from '../src/index.js'

const whale = readFileSync('docs/1.0-PERSONA-WHALE.json', 'utf8')

function makeDom() {
  const element = () => ({ children: [], appendChild() {}, remove() {}, setAttribute() {}, removeAttribute() {}, querySelectorAll() { return [] }, closest() { return null } })
  const styles = new Map()
  const style = () => { const item = element(); item.id = ''; item.textContent = ''; item.remove = () => { if (item.id) styles.delete(item.id) }; return item }
  return {
    body: element(), documentElement: { setAttribute() {}, removeAttribute() {} },
    head: { appendChild(item) { if (item.id) styles.set(item.id, item) } },
    createElement: (tag) => tag === 'style' ? style() : element(),
    getElementById: (id) => styles.get(id) ?? null,
    querySelectorAll: () => [],
  }
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

function makeHarness(state, setField, extraProps = {}) {
  const node = (type, props) => ({ type, props: props ?? {} })
  const hooks = []
  let hookIndex = 0
  let tree = null
  let current = null
  const render = () => { hookIndex = 0; tree = current({ state, setField, ...extraProps }); return tree }
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
  const window = { __ModuleLoader__: { load(value) { definition = value } }, confirm: () => true }
  vm.runInNewContext(readFileSync('lib/client.js', 'utf8'), {
    window, document: makeDom(), TextEncoder,
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
  const click = async (label) => { const button = findButton(label); assert.ok(button, 'missing button ' + label); await button.props.onClick?.() }
  return {
    api,
    nodes, findButton, findTextarea, click,
    inputByValue(value) { return nodes().find((item) => item.type === 'input' && item.props.value === value) },
    setWindowConfirm(value) { window.confirm = () => value },
  }
}

test('tone 基础表单：只有前缀/风格/后缀三字段，旧 Persona 字段不出现', () => {
  const harness = makeHarness({ status: 'ready', writable: true, value: { persona: whale, personaEnabled: false } }, async () => true)
  assert.ok(harness.nodes().some((item) => item.type === 'div' && String(textOf(item.props.children)).includes('语气风格')))
  assert.ok(harness.inputByValue('Boss，'))
  assert.ok(harness.findTextarea('轻松 / 略傲娇'))
  assert.ok(harness.inputByValue('——本鲸鱼娘可不背锅'))
  const text = harness.nodes().map((item) => String(textOf(item.props.children))).join(' ')
  for (const removed of ['作者', '许可', '专业场景', '语气禁区', '口头禅', '意象', '禁忌', '署名链']) {
    assert.doesNotMatch(text, new RegExp(removed), 'removed field must not appear: ' + removed)
  }
})

test('tone 基础编辑 → JSON 同步 → 保存 persona 先于 enabled', async () => {
  const calls = []
  const harness = makeHarness({ status: 'ready', writable: true, value: { persona: whale, personaEnabled: false } }, async (field, value) => calls.push([field, value]))
  harness.inputByValue('Boss，').props.onChange({ target: { value: '老板，' } })
  harness.findTextarea('轻松 / 略傲娇').props.onChange({ target: { value: '直接 / 克制' } })
  harness.inputByValue('——本鲸鱼娘可不背锅').props.onChange({ target: { value: '——收工' } })
  await harness.click('保存')
  assert.equal(calls[0][0], 'persona')
  assert.equal(calls[1][0], 'personaEnabled')
  const saved = JSON.parse(calls[0][1])
  assert.equal(saved.schema, 'dsh-structured/tone@1')
  assert.equal(saved.prefix, '老板，')
  assert.equal(saved.style, '直接 / 克制')
  assert.equal(saved.suffix, '——收工')
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).includes('已保存，未启用')))
})

test('tone 进阶：有效 JSON 可保存，invalid JSON 禁用保存并保留文本', async () => {
  const calls = []
  const harness = makeHarness({ status: 'ready', writable: true, value: { persona: whale, personaEnabled: false } }, async (field, value) => calls.push([field, value]))
  await harness.click('进阶')
  const textarea = harness.findTextarea('"schema"')
  assert.ok(textarea)
  textarea.props.onChange({ target: { value: '{"schema":"wrong"}' } })
  assert.equal(harness.findButton('保存').props.disabled, true)
  assert.equal(harness.findButton('基础').props.disabled, true)
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).includes('/schema')))
  assert.equal(harness.findTextarea('"schema"').props.value, '{"schema":"wrong"}')

  const valid = JSON.stringify({ schema: 'dsh-structured/tone@1', prefix: 'Boss / ', style: '冷静 / 直接', suffix: '——完毕', skipIn: ['code', 'diff'] })
  harness.findTextarea('"schema"').props.onChange({ target: { value: valid } })
  assert.equal(harness.findButton('保存').props.disabled, false)
  await harness.click('保存')
  assert.equal(JSON.parse(calls[0][1]).schema, 'dsh-structured/tone@1')
  assert.equal(JSON.parse(calls[0][1]).style, '冷静 / 直接')
})

test('tone 进阶：上传有效/无效/超大，64KB 硬拒', async () => {
  const harness = makeHarness({ status: 'ready', writable: true, value: { persona: whale, personaEnabled: false } }, async () => true)
  await harness.click('进阶')
  const fileInput = () => harness.nodes().find((item) => item.type === 'input' && item.props.type === 'file')
  const a = JSON.stringify({ schema: 'dsh-structured/tone@1', prefix: 'A', style: 'B', suffix: 'C' })
  await fileInput().props.onChange({ target: { files: [{ size: 100, text: async () => a }] } })
  assert.ok(harness.findTextarea('"schema"').props.value.includes('"prefix":"A"'))
  await fileInput().props.onChange({ target: { files: [{ size: 100, text: async () => '{"schema":false}' }] } })
  assert.equal(harness.findButton('保存').props.disabled, true)
  await fileInput().props.onChange({ target: { files: [{ size: 65537, text: async () => whale }] } })
  assert.equal(harness.findButton('保存').props.disabled, true)
  assert.equal(harness.findButton('基础').props.disabled, true)
})

test('tone readonly：基础字段/上传/保存禁用，下载可用', async () => {
  const harness = makeHarness({ status: 'ready', writable: false, value: { persona: whale, personaEnabled: true } }, async () => true)
  assert.equal(harness.inputByValue('Boss，').props.disabled, true)
  assert.equal(harness.findTextarea('轻松 / 略傲娇').props.disabled, true)
  assert.equal(harness.findButton('保存').props.disabled, true)
  assert.equal(harness.findButton('恢复默认').props.disabled, true)
  assert.equal(harness.findButton('下载 JSON').props.disabled, undefined)
  await harness.click('进阶')
  const fileInput = harness.nodes().find((item) => item.type === 'input' && item.props.type === 'file')
  assert.equal(fileInput.props.disabled, true)
  assert.equal(harness.findTextarea('"schema"').props.disabled, true)
})

test('tone dirty：切换模板先确认，取消不覆盖基础草稿', async () => {
  const harness = makeHarness({ status: 'ready', writable: true, value: { persona: whale, personaEnabled: false } }, async () => true)
  harness.inputByValue('Boss，').props.onChange({ target: { value: '未保存前缀' } })
  harness.setWindowConfirm(false)
  harness.nodes().find((item) => item.type === 'select').props.onChange({ target: { value: 'custom' } })
  assert.ok(harness.inputByValue('未保存前缀'))
  harness.setWindowConfirm(true)
  harness.nodes().find((item) => item.type === 'select').props.onChange({ target: { value: 'custom' } })
  assert.equal(harness.inputByValue('Boss，'), undefined)
  assert.ok(harness.inputByValue(''))
})

test('tone tabGuard：dirty 时确认，clean 时放行', () => {
  const guard = {}
  const harness = makeHarness({ status: 'ready', writable: true, value: { persona: whale, personaEnabled: false } }, async () => true, { tabGuard: guard })
  assert.equal(guard.confirm(), true)
  harness.inputByValue('Boss，').props.onChange({ target: { value: '草稿' } })
  harness.setWindowConfirm(false)
  assert.equal(guard.confirm(), false)
  harness.setWindowConfirm(true)
  assert.equal(guard.confirm(), true)
})

test('tone Client/Host parity：同一无害/恶意 JSON 结果一致', () => {
  const harness = makeHarness({ status: 'ready', writable: true, value: { persona: whale, personaEnabled: false } }, async () => true)
  const base = JSON.parse(whale)
  const cases = [
    base,
    { ...base, schema: 'dsh-structured/persona@1' },
    { ...base, extra: 1 },
    { ...base, style: '' },
    { ...base, prefix: 'x'.repeat(81) },
    { ...base, skipIn: ['bogus'] },
  ]
  for (const [index, doc] of cases.entries()) {
    const raw = JSON.stringify(doc)
    const client = harness.api.parseToneJson(raw)
    const host = parsePersona(raw)
    assert.equal(client.ok, host.ok, 'case ' + index)
    if (!client.ok && !host.ok) assert.equal(client.pointer, host.pointer, 'pointer case ' + index)
  }
})
