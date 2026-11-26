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
    attrs: {},
    appendChild() {},
    remove() {},
    setAttribute(name, value) {
      this.attrs[name] = String(value)
    },
    removeAttribute(name) {
      delete this.attrs[name]
    },
    getAttribute(name) {
      return this.attrs[name] ?? null
    },
    querySelectorAll() {
      return []
    },
    closest() {
      return null
    },
  })
  // 可观察的 style 表：createElement('style') 产物按 id 登记，remove 时注销。
  const styles = new Map()
  const styleElement = () => {
    const style = element()
    style.id = ''
    style.textContent = ''
    style.remove = () => {
      if (style.id) styles.delete(style.id)
    }
    return style
  }
  return {
    styles,
    body: element(),
    documentElement: { setAttribute() {}, removeAttribute() {} },
    head: {
      children: [],
      appendChild(style) {
        this.children.push(style)
        if (style.id) styles.set(style.id, style)
      },
    },
    createElement: (tag) => (tag === 'style' ? styleElement() : element()),
    getElementById: (id) => styles.get(id) ?? null,
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
      if (spec === 'react') {
        return {
          useState(value) {
            return [typeof value === 'function' ? value() : value, () => {}]
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
    TextEncoder,
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
  const child = {
    configForms: {
      get(id) {
        return id === 'dsh-structured' ? form : undefined
      },
      whileServed(namespaces, register) {
        // 把 register 返回的组合 disposer 暴露给测试，模拟命名空间停服。
        if (served) child.__disposeRegistration = register()
        return () => {}
      },
    },
    slots,
    effect(fn) {
      return fn()
    },
  }
  return child
}

let served = true

function collectRegistration() {
  const injections = []
  const registrations = []
  const slots = {
    inject(name, factory) {
      injections.push(name)
      return factory()
    },
    register(options, component) {
      registrations.push({ options, component })
      return () => {}
    },
  }
  return {
    slots,
    injections,
    registrations,
    get: () => registrations.find((item) => item.options?.name === 'plugins.bundle.config') ?? null,
  }
}

function textOf(children) {
  if (Array.isArray(children)) return children.map(textOf).join('')
  if (children && typeof children === 'object') return textOf(children.props?.children)
  return children == null ? '' : String(children)
}

function flatten(tree) {
  const flat = []
  const walk = (value) => {
    if (!value || typeof value !== 'object') return
    flat.push(value)
    if (Array.isArray(value.props?.children)) value.props.children.forEach((child) => walk(child))
    else walk(value.props?.children)
  }
  walk(tree)
  return flat
}

test('config page：宿主服务 describe 命名空间时注册 bundle 配置页', () => {
  served = true
  const { require: fakeRequire } = fakeRuntime()
  const module = loadClient(makeDom(), fakeRequire)
  const snapshot = { status: 'ready', writable: true, value: { theme: 'deepseek' } }
  const form = {
    setCalls: [],
    mutateCalls: [],
    set(field, value) {
      this.setCalls.push([field, value])
      return Promise.resolve(true)
    },
    mutate(ops, revision) {
      this.mutateCalls.push([ops, revision])
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
  assert.equal(typeof face.mutateFields, 'function')
  assert.equal(typeof face.readFields, 'function')
  face.mutateFields([{ op: 'set', path: ['x'], value: 1 }], 3)
  assert.deepEqual(form.mutateCalls[0][1], 3)
  assert.equal(face.readFields(), snapshot)
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

test('config page：卡片渲染七字段，switch/segmented 值来自快照', () => {
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

  const flat = flatten(tree)

  // 单页：没有 tab；区块顺序 外观 → 行为 → 人格 → 输出深度 → 预览。
  assert.equal(flat.filter((element) => element.props?.role === 'tablist').length, 0, 'single page must not render tabs')
  const sections = flat.filter((element) => element.props?.['data-dss-section']).map((element) => element.props['data-dss-section'])
  assert.equal(JSON.stringify(sections), JSON.stringify(['appearance', 'behavior', 'persona', 'depth', 'preview']))

  const status = flat.find((element) => element.props?.['data-dss-status'] === '1')
  assert.ok(status, 'status line must stay at the top')
  assert.match(textOf(status.props.children), /插件 已开启 · 人格 已开启 · 身份头 已开 · 深度 普通/)

  const switches = flat.filter((element) => element.type?.name === 'Switch')
  const master = switches.find((element) => element.props.label === '插件总开关')
  assert.ok(master, 'master switch sits in the title row')
  assert.equal(master.props.checked, true)

  // 行为区保留既有字段：defaultEnabled / includeSubagents / GenUI；尾部提醒固定开启，不给开关。
  assert.ok(switches.some((element) => element.props.label === '新会话默认开启'))
  assert.equal(switches.some((element) => element.props.label === '尾部提醒'), false)
  assert.equal(switches.some((element) => element.props.label === '视觉层'), false, 'visual layer switch is gone')
  const includeSubagents = switches.find((element) => element.props.label === '子代理注入')
  assert.equal(includeSubagents.props.checked, false)
  const genui = flat.find((element) => element.props?.id === 'dsh-structured-genui')
  assert.equal(genui.props.value, 'auto')

  // 外观：4 套预设 + 自定义三色。
  const tiles = flat.filter((element) => String(element.props?.id ?? '').startsWith('dss-theme-tile-')).map((element) => element.props.id)
  assert.equal(JSON.stringify(tiles), JSON.stringify(['dss-theme-tile-dsh', 'dss-theme-tile-deepseek', 'dss-theme-tile-codex', 'dss-theme-tile-anthropic', 'dss-theme-tile-custom']))
  assert.equal(flat.find((element) => element.props?.id === 'dss-theme-tile-codex').props['aria-pressed'], 'true')
  for (const key of ['primary', 'secondary', 'tertiary']) {
    const swatch = flat.find((element) => element.props?.id === 'dss-color-' + key)
    assert.ok(swatch, 'custom colors stay visible')
    assert.equal(swatch.props.disabled, true, 'preset theme disables custom colors')
  }
  // 顶部一行只放四套默认主题；自定义单独一行，选中后才显示三色。
  const themeRows = flat.filter((element) => String(element.props?.className ?? '').includes('dss-theme-tiles'))
  assert.equal(themeRows.length, 2)
  const firstRow = Array.isArray(themeRows[0].props.children) ? themeRows[0].props.children : [themeRows[0].props.children]
  assert.equal(
    JSON.stringify(firstRow.map((child) => child.props.id)),
    JSON.stringify(['dss-theme-tile-dsh', 'dss-theme-tile-deepseek', 'dss-theme-tile-codex', 'dss-theme-tile-anthropic']),
  )
  assert.match(String(themeRows[1].props.className), /dss-custom-row/)
  const secondRow = Array.isArray(themeRows[1].props.children) ? themeRows[1].props.children : [themeRows[1].props.children]
  assert.equal(secondRow[0].props.id, 'dss-theme-tile-custom')
  snapshot.value = { ...snapshot.value, theme: 'custom', themeCustom: '' }
  const customFlat = flatten(component({ view: 'page', useStructuredConfig: (selector) => selector(snapshot), setField: () => {} }))
  for (const key of ['primary', 'secondary', 'tertiary']) {
    const swatch = customFlat.find((element) => element.props?.id === 'dss-color-' + key)
    assert.ok(swatch, 'missing color ' + key)
    assert.equal(swatch.props.disabled, false, 'custom theme enables color picker')
  }

  // 输出深度：三档、默认普通、没有关闭。
  const depthIds = flat.filter((element) => String(element.props?.id ?? '').startsWith('dss-depth-')).map((element) => element.props.id)
  assert.equal(JSON.stringify(depthIds), JSON.stringify(['dss-depth-beginner', 'dss-depth-general', 'dss-depth-expert']))
  assert.equal(flat.find((element) => element.props?.id === 'dss-depth-general').props['aria-pressed'], 'true')
  const depthText = textOf(flat.filter((element) => String(element.props?.id ?? '').startsWith('dss-depth-')).map((element) => element.props.children))
  assert.match(depthText, /入门/)
  assert.match(depthText, /普通/)
  assert.match(depthText, /专业/)
  assert.doesNotMatch(depthText, /关闭/)
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
  // 尾部提醒不再是开关：只读页保留总开关 + 行为区三个开关（人格编辑器是函数组件，不在 flatten 的树里）。
  assert.deepEqual(switches.map((element) => element.props.label), ['插件总开关', '新会话默认开启', '子代理注入', '侧边栏入口'])
  assert.equal(switches.some((element) => element.props.label === '尾部提醒'), false)
  for (const element of switches) assert.equal(element.props.disabled, true)
})

test('config page：tone helper 校验、未知字段与 64KB', () => {
  served = true
  const { require: fakeRequire } = fakeRuntime()
  const module = loadClient(makeDom(), fakeRequire)
  const form = {
    set() { return Promise.resolve(true) },
    getSnapshot() { return { status: 'ready', writable: true, value: {} } },
    subscribe() { return () => {} },
  }
  const { slots } = collectRegistration()
  module.__test.setupConfigPage(makeChild(form, slots), form)
  const api = module.__test.personaApi()
  assert.ok(api)
  const whale = readFileSync('docs/1.0-PERSONA-WHALE.json', 'utf8')
  const parsed = api.parseToneJson(whale)
  assert.equal(parsed.ok, true)
  assert.equal(parsed.doc.schema, 'dsh-structured/tone@1')
  assert.equal(api.parseToneJson('{').ok, false)
  assert.equal(api.parseToneJson(whale.replace('"schema"', '"extra": 1, "schema"')).pointer, '/extra')
  assert.equal(api.parseToneJson('x'.repeat(65537)).ok, false)
  assert.equal(api.emptyTone().schema, 'dsh-structured/tone@1')
})

test('config page：主题分段按钮带各主题强调色，随注册注入/撤销移除', () => {
  served = true
  const { require: fakeRequire } = fakeRuntime()
  const dom = makeDom()
  const module = loadClient(dom, fakeRequire)
  const form = {
    set() {
      return Promise.resolve(true)
    },
    getSnapshot() {
      return { status: 'ready', writable: true, value: {} }
    },
    subscribe() {
      return () => {}
    },
  }
  const { slots } = collectRegistration()
  const child = makeChild(form, slots)
  module.__test.setupConfigPage(child, form)

  const style = dom.getElementById('dsh-structured-config-style')
  assert.ok(style, 'config style should be injected with the slot registration')
  // 三套主题的强调色选择器齐全（明暗两态），与视觉层 token 同源。
  for (const token of ['#2563EB', '#10A37F', '#CC785C', '#60A5FA', '#34D399', '#E8A087', '#6B7280', '#D1D5DB']) {
    assert.ok(style.textContent.includes(token), 'missing theme token ' + token)
  }
  assert.match(style.textContent, /#dsh-structured-theme-deepseek\[aria-selected="true"\]/)
  assert.match(style.textContent, /#dsh-structured-theme-codex\[aria-selected="true"\]/)
  assert.match(style.textContent, /#dsh-structured-theme-anthropic\[aria-selected="true"\]/)
  assert.match(style.textContent, /#dsh-structured-theme-dsh\[aria-selected="true"\]/)
  assert.match(style.textContent, /#dsh-structured-theme-dsh::before/)
  assert.match(style.textContent, /body\[data-ds-dark-theme\]/)

  // 命名空间停服：slot 与样式一并撤下。
  child.__disposeRegistration?.()
  assert.equal(dom.getElementById('dsh-structured-config-style'), null)
})

test('config page：tone flags 覆盖 invalid/readonly/saving/download', () => {
  served = true
  const { require: fakeRequire } = fakeRuntime()
  const module = loadClient(makeDom(), fakeRequire)
  const form = {
    set() { return Promise.resolve(true) },
    getSnapshot() { return { status: 'ready', writable: true, value: {} } },
    subscribe() { return () => {} },
  }
  const { slots } = collectRegistration()
  module.__test.setupConfigPage(makeChild(form, slots), form)
  const flags = module.__test.personaApi().personaUiFlags
  const invalid = flags({ status: 'importInvalid' })
  assert.equal(invalid.invalid, true)
  assert.equal(invalid.formLocked, true)
  assert.equal(invalid.canBasic, false)
  assert.equal(invalid.canSave, false)
  assert.equal('canDownload' in invalid, false)
  const tooLarge = flags({ status: 'tooLarge' })
  assert.equal(tooLarge.formLocked, true)
  assert.equal(tooLarge.canSave, false)
  const readonly = flags({ status: 'off', writable: false })
  assert.equal(readonly.formLocked, true)
  assert.equal(readonly.canSave, false)
  assert.equal('canDownload' in readonly, false)
  const saving = flags({ status: 'saving' })
  assert.equal(saving.busy, true)
  assert.equal(saving.formLocked, true)
  assert.equal(saving.canSave, false)
  const clean = flags({ status: 'off' })
  assert.equal(clean.canSave, false)
  assert.equal(clean.canBasic, true)
  assert.equal(flags({ status: 'saved' }).canSave, false)
  assert.equal(flags({ status: 'dirty' }).canSave, true)
  assert.equal(flags({ status: 'draftOff' }).canSave, true)
  assert.equal(flags({ status: 'failed' }).canSave, true)
})

test('config page：人格编辑器嵌在同一页，不再有跨 tab 草稿问题', () => {
  served = true
  const { require: fakeRequire } = fakeRuntime()
  const module = loadClient(makeDom(), fakeRequire)
  const snapshot = { status: 'ready', writable: true, value: { theme: 'deepseek' } }
  const form = {
    set() { return Promise.resolve(true) },
    getSnapshot() { return snapshot },
    subscribe() { return () => {} },
  }
  const { slots, get } = collectRegistration()
  module.__test.setupConfigPage(makeChild(form, slots), form)
  const { component } = get()
  const tree = component({ view: 'page', useStructuredConfig: (selector) => selector(snapshot), setField: () => {} })
  const flat = flatten(tree)
  assert.ok(flat.some((element) => typeof element.type === 'function' && element.type.name === 'PersonaEditor'), 'PersonaEditor must stay mounted on the single page')
  assert.ok(flat.some((element) => element.props?.['data-dss-section'] === 'persona'), 'persona editor lives in its own page section')
})

test('sidebar：注册 panellist 入口 + main 面板 + 详情页，共用同一 configFace', () => {
  served = true
  const { require: fakeRequire } = fakeRuntime()
  const module = loadClient(makeDom(), fakeRequire)
  const calls = []
  const snapshot = { status: 'ready', writable: true, value: {} }
  const form = {
    set(field, value) { calls.push([field, value]); return Promise.resolve(true) },
    mutate() { return Promise.resolve(true) },
    getSnapshot() { return snapshot },
    subscribe() { return () => {} },
  }
  const { slots, injections, registrations } = collectRegistration()
  module.__test.setupConfigPage(makeChild(form, slots), form)
  assert.equal(JSON.stringify(injections), JSON.stringify(['plugins.bundle.config', 'sidebar.panellist', 'main']))

  const entry = registrations.find((item) => item.options.name === 'sidebar.panellist')
  assert.ok(entry, 'sidebar.panellist entry must be registered')
  assert.equal(entry.options.id, 'dsh-structured')
  assert.equal(entry.options.label(), '结构化输出')
  const icon = entry.component({ size: 20 })
  assert.equal(icon.props.width, 20)
  assert.equal(icon.props.height, 20)

  const panel = registrations.find((item) => item.options.name === 'main')
  assert.ok(panel, 'main panel must be registered')
  assert.equal(panel.options.key, 'dsh-structured')
  const face = panel.options.inject()
  assert.equal(face.hooks.structuredConfig, form)
  face.setField('tailReminder', false)
  assert.equal(JSON.stringify(calls[0]), JSON.stringify(['tailReminder', false]))
  assert.equal(typeof face.mutateFields, 'function')
  assert.equal(typeof face.readFields, 'function')

  // 详情页与侧边栏面板读同一份 form 快照。
  const configFace = registrations.find((item) => item.options.name === 'plugins.bundle.config').options.inject()
  assert.equal(configFace.readFields(), face.readFields())
})

test('custom theme：theme=custom + themeCustom 注入明暗两段样式，切回预设即移除', () => {
  served = true
  const { require: fakeRequire } = fakeRuntime()
  const dom = makeDom()
  const module = loadClient(dom, fakeRequire)
  const snapshot = {
    status: 'ready',
    writable: true,
    value: {
      theme: 'custom',
      themeCustom: JSON.stringify({ schema: 'dsh-structured/palette@1', primary: '#2563EB', secondary: '#047857', tertiary: '#B45309' }),
      visual: true,
    },
  }
  const form = { set() { return Promise.resolve(true) }, getSnapshot() { return snapshot }, subscribe() { return () => {} } }
  const slots = { inject(_name, factory) { return factory() }, register() { return () => {} } }
  const child = { configForms: { get() { return form }, whileServed(_namespaces, register) { register(); return () => {} } }, slots, effect(fn) { return fn() } }
  module.apply({
    inject(_services, callback) { callback(child) },
    effect(fn) { return fn() },
  })
  assert.equal(dom.body.attrs['data-dsh-structured-theme'], 'custom')
  const style = dom.getElementById('dsh-structured-custom-theme')
  assert.ok(style, 'custom theme style must be injected')
  assert.match(style.textContent, /data-dsh-structured-theme="custom"/)
  assert.match(style.textContent, /--dss-blue:#2563EB/)
  assert.match(style.textContent, /data-ds-dark-theme/)
  // 讲解卡跟随自定义三色：explain 由主色 / 副色派生，明暗两段都有，不残留预设紫。
  assert.match(style.textContent, /--dss-explain:#156EA1/)
  assert.match(style.textContent, /--dss-explain-text:/)
  assert.match(style.textContent, /--dss-explain-soft:/)
  assert.doesNotMatch(style.textContent, /7c3aed/i)

  snapshot.value = { theme: 'deepseek', themeCustom: '', visual: true }
  module.apply({
    inject(_services, callback) { callback(child) },
    effect(fn) { return fn() },
  })
  assert.equal(dom.body.attrs['data-dsh-structured-theme'], 'deepseek')
  assert.equal(dom.getElementById('dsh-structured-custom-theme'), null, 'custom style must be removed when switching back')
})

test('sidebar：宿主不声明 main slot 时退回详情页，不抛错', () => {
  served = true
  const { require: fakeRequire } = fakeRuntime()
  const module = loadClient(makeDom(), fakeRequire)
  const form = {
    set() { return Promise.resolve(true) },
    getSnapshot() { return { status: 'ready', writable: true, value: {} } },
    subscribe() { return () => {} },
  }
  const registrations = []
  const slots = {
    inject(name, factory) {
      if (name === 'main') throw new Error('slot not declared')
      return factory()
    },
    register(options, component) { registrations.push({ options, component }); return () => {} },
  }
  module.__test.setupConfigPage(makeChild(form, slots), form)
  assert.ok(registrations.some((item) => item.options.name === 'plugins.bundle.config'), 'detail page must stay registered')
  const status = module.__test.personaApi().sidebarRegistration
  assert.equal(JSON.stringify(status.failed), JSON.stringify(['main']))
  assert.equal(status.panel, null)
})

test('sidebar：sidebarEntry=false 时不注册侧边栏入口，详情页仍注册', () => {
  served = true
  const { require: fakeRequire } = fakeRuntime()
  const module = loadClient(makeDom(), fakeRequire)
  const snapshot = { status: 'ready', writable: true, value: { sidebarEntry: false } }
  const form = {
    set() { return Promise.resolve(true) },
    getSnapshot() { return snapshot },
    subscribe() { return () => {} },
  }
  const { slots, injections, registrations } = collectRegistration()
  module.__test.setupConfigPage(makeChild(form, slots), form)
  assert.equal(JSON.stringify(injections), JSON.stringify(['plugins.bundle.config']))
  assert.ok(registrations.some((item) => item.options.name === 'plugins.bundle.config'), 'detail page must stay registered')
  assert.equal(registrations.some((item) => item.options.name === 'sidebar.panellist'), false)
  assert.equal(registrations.some((item) => item.options.name === 'main'), false)
  const status = module.__test.personaApi().sidebarRegistration
  assert.equal(status.entry, null)
  assert.equal(status.panel, null)
})

test('sidebar：sidebarEntry 切换时即时卸载 / 重新注册入口', () => {
  served = true
  const { require: fakeRequire } = fakeRuntime()
  const module = loadClient(makeDom(), fakeRequire)
  const snapshot = { status: 'ready', writable: true, value: {} }
  const listeners = new Set()
  const form = {
    set() { return Promise.resolve(true) },
    getSnapshot() { return snapshot },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  const removed = []
  const registrations = []
  const slots = {
    inject(_name, factory) { return factory() },
    register(options) {
      registrations.push(options)
      return () => removed.push(options.name)
    },
  }
  module.__test.setupConfigPage(makeChild(form, slots), form)
  assert.ok(registrations.some((options) => options.name === 'sidebar.panellist'))
  assert.ok(registrations.some((options) => options.name === 'main'))

  snapshot.value = { sidebarEntry: false }
  for (const listener of [...listeners]) listener()
  assert.equal(JSON.stringify(removed), JSON.stringify(['sidebar.panellist', 'main']))
  assert.equal(module.__test.personaApi().sidebarRegistration.entry, null)
  assert.equal(module.__test.personaApi().sidebarRegistration.panel, null)

  snapshot.value = { sidebarEntry: true }
  for (const listener of [...listeners]) listener()
  assert.equal(registrations.filter((options) => options.name === 'sidebar.panellist').length, 2)
  assert.equal(registrations.filter((options) => options.name === 'main').length, 2)
  assert.equal(JSON.stringify(removed), JSON.stringify(['sidebar.panellist', 'main']))
})

test('i18n：默认 / zh 宿主下设置页保持中文文案', () => {
  served = true
  const { require: fakeRequire } = fakeRuntime()
  const module = loadClient(makeDom(), fakeRequire)
  const snapshot = { status: 'ready', writable: true, value: { theme: 'deepseek', personaEnabled: true } }
  const form = { set() { return Promise.resolve(true) }, getSnapshot() { return snapshot }, subscribe() { return () => {} } }
  const { slots, get } = collectRegistration()
  module.__test.setupConfigPage(makeChild(form, slots), form)
  assert.equal(module.__test.i18n.detectLocale(), 'zh')
  assert.equal(module.__test.i18n.normalizeLocale('zh-CN'), 'zh')
  assert.equal(module.__test.setLocale('zh'), 'zh')
  const { component } = get()
  const flat = flatten(component({ view: 'page', useStructuredConfig: (selector) => selector(snapshot), setField: () => {} }))
  const text = flat.map((element) => textOf(element.props?.children)).join(' ')
  assert.match(text, /结构化输出/)
  assert.match(text, /侧边栏入口/)
  assert.match(text, /输出深度/)
  const persona = module.__test.personaApi().PersonaEditor({ state: snapshot, setField: () => Promise.resolve(true), mutateFields: null, readFields: () => snapshot })
  const personaText = flatten(persona).map((element) => textOf(element.props?.children)).join(' ')
  assert.match(personaText, /内心OS/)
  assert.match(personaText, /风格预设/)
  assert.match(personaText, /保存/)
})

test('i18n：en 宿主下设置页渲染英文，未知语言回退英文', () => {
  served = true
  const { require: fakeRequire } = fakeRuntime()
  const module = loadClient(makeDom(), fakeRequire)
  assert.equal(module.__test.i18n.normalizeLocale('en-US'), 'en')
  assert.equal(module.__test.i18n.normalizeLocale('ja'), 'en')
  assert.equal(module.__test.i18n.normalizeLocale('fr-FR'), 'en')
  assert.equal(module.__test.setLocale('en'), 'en')
  const snapshot = { status: 'ready', writable: true, value: { theme: 'deepseek', personaEnabled: true } }
  const form = { set() { return Promise.resolve(true) }, getSnapshot() { return snapshot }, subscribe() { return () => {} } }
  const { slots, get } = collectRegistration()
  module.__test.setupConfigPage(makeChild(form, slots), form)
  const { component } = get()
  const flat = flatten(component({ view: 'page', useStructuredConfig: (selector) => selector(snapshot), setField: () => {} }))
  const text = flat.map((element) => textOf(element.props?.children)).join(' ')
  assert.match(text, /Structured Output/)
  assert.match(text, /Appearance/)
  assert.match(text, /Sidebar entry/)
  assert.match(text, /Output depth/)
  assert.match(text, /Preview/)
  const switchLabels = flat.filter((element) => element.type?.name === 'Switch').map((element) => element.props.label)
  assert.ok(switchLabels.includes('Plugin master switch'))
  assert.ok(switchLabels.includes('Subagent injection'))
  assert.ok(switchLabels.includes('Sidebar entry'))
  const persona = module.__test.personaApi().PersonaEditor({ state: snapshot, setField: () => Promise.resolve(true), mutateFields: null, readFields: () => snapshot })
  const personaText = flatten(persona).map((element) => textOf(element.props?.children)).join(' ')
  assert.match(personaText, /Inner OS/)
  assert.match(personaText, /Style presets/)
  assert.match(personaText, /Speaking style/)
  assert.match(personaText, /Nickname/)
  assert.match(personaText, /Save/)
  assert.doesNotMatch(personaText, /内心OS|风格预设|保存/)
})

test('i18n：host locale 服务与 <html lang> 可决定语言', () => {
  served = true
  const { require: fakeRequire } = fakeRuntime()
  const dom = makeDom()
  const module = loadClient(dom, fakeRequire)
  const service = { getSnapshot: () => ({ active: 'en-GB' }) }
  module.__test.i18n.setService(service)
  assert.equal(module.__test.i18n.detectLocale(), 'en')
  module.__test.i18n.setService(null)
  module.__test.setLocale(null)
  dom.documentElement.getAttribute = (name) => (name === 'lang' ? 'zh-CN' : null)
  assert.equal(module.__test.i18n.detectLocale(), 'zh')
})
