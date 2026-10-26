import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const whale = readFileSync('docs/1.0-PERSONA-WHALE.json', 'utf8')

function makeDom() {
  const element = () => ({
    children: [], appendChild() {}, remove() {}, setAttribute() {}, removeAttribute() {},
    querySelectorAll() { return [] }, closest() { return null },
  })
  const styles = new Map()
  const styleElement = () => {
    const style = element(); style.id = ''; style.textContent = ''
    style.remove = () => { if (style.id) styles.delete(style.id) }
    return style
  }
  return {
    body: element(), documentElement: { setAttribute() {}, removeAttribute() {} },
    head: { appendChild(style) { if (style.id) styles.set(style.id, style) } },
    createElement: (tag) => tag === 'style' ? styleElement() : element(),
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

function makeHarness(module, state, setField) {
  const node = (type, props) => ({ type, props: props ?? {} })
  const hooks = []
  let hookIndex = 0
  let tree = null
  let current = null
  const render = () => {
    hookIndex = 0
    tree = current({ state, setField })
    return tree
  }
  const react = {
    useState(initial) {
      const index = hookIndex++
      if (!(index in hooks)) hooks[index] = typeof initial === 'function' ? initial() : initial
      return [hooks[index], (next) => {
        hooks[index] = typeof next === 'function' ? next(hooks[index]) : next
        render()
      }]
    },
  }
  const fakeRequire = (spec) => {
    if (spec === 'react/jsx-runtime') return { jsx: node, jsxs: node }
    if (spec === 'react') return react
    if (spec === '@deepseek-ai/dsh-client-ui-primitives') {
      return {
        Switch: function Switch(props) { return { type: 'Switch', props } },
        SegmentedControl: function SegmentedControl(props) { return { type: 'SegmentedControl', props } },
      }
    }
    throw new Error('unexpected require ' + spec)
  }
  const code = readFileSync('lib/client.js', 'utf8')
  let definition = null
  const window = {
    __ModuleLoader__: { load(value) { definition = value } },
    confirm: () => true,
  }
  vm.runInNewContext(code, {
    window, document: makeDom(), TextEncoder,
    MutationObserver: class { observe() {} disconnect() {} },
    requestAnimationFrame: (fn) => fn(), cancelAnimationFrame() {},
    setTimeout: (fn) => fn(), clearTimeout() {},
    console: { info() {}, warn() {}, error() {} },
  }, { filename: 'src/client.js' })
  const plugin = definition.factory(fakeRequire)
  const form = { set() { return Promise.resolve(true) }, getSnapshot() { return null }, subscribe() { return () => {} } }
  const child = {
    configForms: {
      get() { return form },
      whileServed(_namespaces, register) { register(); return () => {} },
    },
    slots: {
      inject(_name, factory) { factory(); return () => {} },
      register() { return () => {} },
    },
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
    get tree() { return tree },
    nodes, findButton, findTextarea, click,
    inputByValue(value) { return nodes().find((item) => item.type === 'input' && item.props.value === value) },
    setWindowConfirm(value) { window.confirm = () => value },
  }
}

test('PersonaEditor：表单↔JSON 同步与 invalid 只读', async () => {
  const calls = []
  const state = { status: 'ready', writable: true, value: { persona: whale, personaEnabled: false } }
  const harness = makeHarness(null, state, async (field, value) => { calls.push([field, value]) })
  const nameInput = harness.inputByValue('鲸鱼娘·工作模式')
  assert.ok(nameInput)
  nameInput.props.onChange({ target: { value: '测试模板' } })
  await harness.click('JSON')
  const json = harness.findTextarea('"schema"')
  assert.ok(json)
  assert.match(json.props.value, /测试模板/)
  json.props.onChange({ target: { value: '{"schema":"wrong"}' } })
  const formTab = harness.findButton('表单')
  assert.equal(formTab.props.disabled, true)
  const save = harness.findButton('保存')
  assert.equal(save.props.disabled, true)
  const error = harness.nodes().find((item) => item.type === 'p' && String(textOf(item.props.children)).includes('/schema'))
  assert.ok(error)
})

test('PersonaEditor：readonly 下载可用、JSON pane 可打开、保存禁用', async () => {
  const state = { status: 'ready', writable: false, value: { persona: whale, personaEnabled: true } }
  const harness = makeHarness(null, state, async () => true)
  const download = harness.findButton('下载 JSON')
  assert.ok(download)
  assert.equal(download.props.disabled, undefined)
  await harness.click('JSON')
  assert.ok(harness.findTextarea('"schema"'))
  const textarea = harness.findTextarea('"schema"')
  assert.equal(textarea.props.disabled, true)
  const save = harness.findButton('保存')
  assert.equal(save.props.disabled, true)
})

test('PersonaEditor：上传有效待确认、应用导入；无效/超大表单锁定', async () => {
  const state = { status: 'ready', writable: true, value: { persona: whale, personaEnabled: false } }
  const harness = makeHarness(null, state, async () => true)
  await harness.click('JSON')
  const fileInput = harness.nodes().find((item) => item.type === 'input' && item.props.type === 'file')
  assert.ok(fileInput)
  await fileInput.props.onChange({ target: { files: [{ size: 100, text: async () => whale }] } })
  assert.ok(harness.findButton('应用导入'))
  assert.ok(harness.findButton('取消导入'))
  await harness.click('应用导入')
  assert.equal(harness.findButton('应用导入'), undefined)

  await harness.click('JSON')
  const invalidInput = harness.nodes().find((item) => item.type === 'input' && item.props.type === 'file')
  await invalidInput.props.onChange({ target: { files: [{ size: 100, text: async () => '{"schema":"bad"}' }] } })
  assert.equal(harness.findButton('表单').props.disabled, true)
  assert.ok(harness.findButton('恢复最后有效值'))

  const hugeInput = harness.nodes().find((item) => item.type === 'input' && item.props.type === 'file')
  await hugeInput.props.onChange({ target: { files: [{ size: 65537, text: async () => whale }] } })
  assert.equal(harness.findButton('表单').props.disabled, true)
  assert.equal(harness.findButton('保存').props.disabled, true)
})

test('PersonaEditor：saving 禁用、保存失败保留草稿、draftOff', async () => {
  let reject = false
  const state = { status: 'ready', writable: true, value: { persona: whale, personaEnabled: false } }
  const harness = makeHarness(null, state, async () => { if (reject) throw new Error('write failed'); return true })
  const nameInput = harness.inputByValue('鲸鱼娘·工作模式')
  nameInput.props.onChange({ target: { value: '保留草稿' } })
  reject = true
  await harness.click('保存')
  assert.equal(harness.findButton('保存').props.disabled, false)
  const toggle = harness.nodes().find((item) => item.type?.name === 'Switch')
  toggle.props.onChange(false)
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).includes('草稿已关闭')))
  await harness.click('JSON')
  assert.match(harness.findTextarea('"schema"').props.value, /保留草稿/)
})

test('PersonaEditor：saving 中全部禁用、成功保存为 saved', async () => {
  const pending = []
  const state = { status: 'ready', writable: true, value: { persona: whale, personaEnabled: false } }
  const harness = makeHarness(null, state, (field, value) => new Promise((resolve) => pending.push({ field, value, resolve })))
  const nameInput = harness.inputByValue('鲸鱼娘·工作模式')
  nameInput.props.onChange({ target: { value: '保存中模板' } })
  const enabledSwitch = harness.nodes().find((item) => item.type?.name === 'Switch')
  enabledSwitch.props.onChange(true)
  const saveButton = harness.findButton('保存')
  const savingPromise = saveButton.props.onClick()
  assert.equal(harness.findButton('保存').props.disabled, true)
  assert.equal(harness.nodes().find((item) => item.type?.name === 'Switch').props.disabled, true)
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).includes('保存中')))
  const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve() }
  await flush()
  pending.shift()?.resolve(true)
  await flush()
  pending.shift()?.resolve(true)
  await savingPromise
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).includes('已保存并启用')))
})

test('PersonaEditor：dirty 时载入模板先确认，取消不覆盖草稿', async () => {
  const state = { status: 'ready', writable: true, value: { persona: whale, personaEnabled: false } }
  const harness = makeHarness(null, state, async () => true)
  const nameInput = harness.inputByValue('鲸鱼娘·工作模式')
  nameInput.props.onChange({ target: { value: '未保存草稿' } })
  harness.setWindowConfirm(false)
  await harness.click('载入基础模板')
  assert.ok(harness.nodes().some((item) => item.type === 'input' && item.props.value === '未保存草稿'))
  harness.setWindowConfirm(true)
  await harness.click('载入基础模板')
  assert.ok(harness.nodes().some((item) => item.type === 'input' && item.props.value === '鲸鱼娘·工作模式'))
})
