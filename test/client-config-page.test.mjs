import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

// 插件板块详情页配置区：宿主不会从 Config schema 自动生成表单，
// 配置页必须由插件 client 注册进 plugins.bundle.config（键 = 包名）。
// 本文件验证：注册条件、slot 键、注入面、卡片渲染与字段控件。

function makeDom() {
  const element = () => ({
    children: [],
    appendChild() {},
    remove() {},
    setAttribute() {},
    removeAttribute() {},
    querySelectorAll() {
      return []
    },
    closest() {
      return null
    },
  })
  return {
    body: element(),
    documentElement: { setAttribute() {}, removeAttribute() {} },
    head: { children: [], appendChild() {} },
    createElement: () => element(),
    getElementById: () => null,
    querySelectorAll: () => [],
  }
}

function fakeRuntime() {
  const node = (type, props) => ({ type, props })
  return {
    require(spec) {
      if (spec === 'react/jsx-runtime') {
        return { jsx: (type, props) => node(type, props), jsxs: (type, props) => node(type, props) }
      }
      if (spec === '@deepseek-ai/dsh-client-ui-primitives') {
        return {
          Switch: function Switch(props) {
            return { type: Switch, props }
          },
          SegmentedControl: function SegmentedControl(props) {
            return { type: SegmentedControl, props }
          },
        }
      }
      throw new Error('unexpected require: ' + spec)
    },
    node,
  }
}

function loadClient(dom, fakeRequire) {
  const code = readFileSync(new URL('../src/client.js', import.meta.url), 'utf8')
  let module = null
  const window = {
    __ModuleLoader__: {
      load(definition) {
        module = definition.factory(fakeRequire)
      },
    },
  }
  vm.runInNewContext(code, {
    window,
    document: dom,
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    requestAnimationFrame: (fn) => fn(),
    cancelAnimationFrame() {},
    setTimeout: (fn) => fn(),
    clearTimeout() {},
    console: { info() {}, warn() {}, error() {} },
  }, { filename: 'src/client.js' })
  assert.ok(module, 'client module should register')
  return module
}

function makeChild(form, slots) {
  return {
    configForms: {
      get(id) {
        return id === 'dsh-structured' ? form : undefined
      },
      whileServed(namespaces, register) {
        if (served) register()
        return () => {}
      },
    },
    slots,
    effect(fn) {
      return fn()
    },
  }
}

let served = true

function collectRegistration() {
  let registered = null
  const slots = {
    inject(name, factory) {
      assert.equal(name, 'plugins.bundle.config')
      factory()
    },
    register(options, component) {
      registered = { options, component }
      return () => {}
    },
  }
  return { slots, get: () => registered }
}

test('config page：宿主服务 describe 命名空间时注册 bundle 配置页', () => {
  served = true
  const { require: fakeRequire } = fakeRuntime()
  const module = loadClient(makeDom(), fakeRequire)
  const snapshot = { status: 'ready', writable: true, value: { theme: 'deepseek' } }
  const form = {
    setCalls: [],
    set(field, value) {
      this.setCalls.push([field, value])
      return Promise.resolve(true)
    },
    getSnapshot() {
      return snapshot
    },
    subscribe() {
      return () => {}
    },
  }
  const { slots, get } = collectRegistration()
  module.__test.setupConfigPage(makeChild(form, slots), form)

  const registration = get()
  assert.ok(registration, 'should register into plugins.bundle.config')
  assert.equal(registration.options.name, 'plugins.bundle.config')
  assert.equal(registration.options.key, 'dsh-structured')

  const face = registration.options.inject()
  assert.equal(face.hooks.structuredConfig, form)
  assert.equal(typeof face.setField, 'function')
  face.setField('visual', false)
  assert.deepEqual(form.setCalls[0], ['visual', false])
})

test('config page：describe 未服务命名空间时不注册', () => {
  served = false
  const { require: fakeRequire } = fakeRuntime()
  const module = loadClient(makeDom(), fakeRequire)
  const form = { getSnapshot() { return null }, subscribe() { return () => {} } }
  const { slots, get } = collectRegistration()
  module.__test.setupConfigPage(makeChild(form, slots), form)
  assert.equal(get(), null)
  served = true
})

test('config page：primitives 或 require 缺失时静默跳过', () => {
  const module = loadClient(makeDom(), undefined)
  const form = { getSnapshot() { return null }, subscribe() { return () => {} } }
  const { slots, get } = collectRegistration()
  module.__test.setupConfigPage(makeChild(form, slots), form)
  assert.equal(get(), null)
})

test('config page：卡片渲染六字段，switch/segmented 值来自快照', () => {
  served = true
  const { require: fakeRequire, node } = fakeRuntime()
  const module = loadClient(makeDom(), fakeRequire)
  const snapshot = {
    status: 'ready',
    writable: true,
    value: {
      theme: 'codex',
      visual: false,
      defaultEnabled: true,
      tailReminder: true,
      includeSubagents: false,
      genui: 'auto',
    },
  }
  const form = {
    set() {
      return Promise.resolve(true)
    },
    getSnapshot() {
      return snapshot
    },
    subscribe() {
      return () => {}
    },
  }
  const { slots, get } = collectRegistration()
  module.__test.setupConfigPage(makeChild(form, slots), form)
  const { component } = get()

  const tree = component({
    view: 'page',
    useStructuredConfig: (selector) => selector(snapshot),
    setField: () => {},
  })
  assert.equal(tree.props['data-dsh-structured-config'], '1')

  const flat = []
  const walk = (value) => {
    if (!value || typeof value !== 'object') return
    flat.push(value)
    if (Array.isArray(value.props?.children)) value.props.children.forEach((child) => walk(child))
    else walk(value.props?.children)
  }
  walk(tree)

  const switches = flat.filter((element) => element.type?.name === 'Switch')
  const segmented = flat.filter((element) => element.type?.name === 'SegmentedControl')
  assert.equal(switches.length, 4)
  assert.equal(segmented.length, 2)

  const visual = switches.find((element) => element.props.label.includes('视觉层'))
  assert.equal(visual.props.checked, false)
  const includeSubagents = switches.find((element) => element.props.label.includes('子代理'))
  assert.equal(includeSubagents.props.checked, false)
  const theme = segmented.find((element) => element.props.id === 'dsh-structured-theme')
  assert.equal(theme.props.value, 'codex')
  // 卡片在 vm 沙箱里构建：数组跨 realm，序列化后比较。
  assert.equal(JSON.stringify(theme.props.options.map((option) => option.value)), JSON.stringify(['deepseek', 'codex', 'anthropic']))
  const genui = segmented.find((element) => element.props.id === 'dsh-structured-genui')
  assert.equal(genui.props.value, 'auto')
})

test('config page：插件未就绪与只读态的降级渲染', () => {
  served = true
  const { require: fakeRequire } = fakeRuntime()
  const module = loadClient(makeDom(), fakeRequire)
  const form = {
    set() {
      return Promise.resolve(true)
    },
    getSnapshot() {
      return null
    },
    subscribe() {
      return () => {}
    },
  }
  const { slots, get } = collectRegistration()
  module.__test.setupConfigPage(makeChild(form, slots), form)
  const { component } = get()

  const unavailable = component({ view: 'page', useStructuredConfig: (selector) => selector({ status: 'unavailable' }) })
  assert.match(String(unavailable.props.children), /暂不可用/)

  const readonly = component({
    view: 'page',
    useStructuredConfig: (selector) => selector({ status: 'ready', writable: false, value: { theme: 'deepseek' } }),
    setField: () => {},
  })
  const flat = []
  const walk = (value) => {
    if (!value || typeof value !== 'object') return
    flat.push(value)
    if (Array.isArray(value.props?.children)) value.props.children.forEach((child) => walk(child))
    else walk(value.props?.children)
  }
  walk(readonly)
  const switches = flat.filter((element) => element.type?.name === 'Switch')
  assert.equal(switches.length, 4)
  for (const element of switches) assert.equal(element.props.disabled, true)
})
