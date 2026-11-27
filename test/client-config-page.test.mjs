import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import { parseHTML } from 'linkedom'

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
    cleanups: [],
    configForms: {
      get(id) {
        return id === 'dsh-structured' ? form : undefined
      },
      // 兼容旧宿主形状：1.3.4 起配置页不再依赖这个回调。
      whileServed(namespaces, register) {
        if (served) child.__disposeRegistration = register()
        return () => {}
      },
    },
    slots,
    effect(fn) {
      const cleanup = fn()
      if (typeof cleanup === 'function') child.cleanups.push(cleanup)
      return cleanup
    },
  }
  return child
}

let served = true

function collectRegistration() {
  const injections = []
  const registrations = []
  const disposed = []
  const slots = {
    inject(name, factory) {
      injections.push(name)
      let active = true
      const inner = factory()
      return () => {
        if (!active) return
        active = false
        disposed.push(name)
        if (typeof inner === 'function') inner()
      }
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
    disposed,
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

// 配置卡是「薄壳（读一次快照）+ ready 之后才挂载的 ConfigCardBody」两层：
// 测试里把这一层函数组件展开，等价于 React 真正渲染它。
function renderCard(component, props) {
  const tree = component(props)
  return tree && typeof tree.type === 'function' && tree.type.name === 'ConfigCardBody'
    ? tree.type(tree.props)
    : tree
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

test('config page：apply 在没有 configForms 时也占住 bundle 配置 slot 的 key（1.3.5）', () => {
  const { require: fakeRequire } = fakeRuntime()
  const module = loadClient(makeDom(), fakeRequire)
  const { slots, registrations } = collectRegistration()
  const ctx = {
    slots,
    effect(fn) { return fn() },
    // 模拟最坏宿主：configForms / locale 永不出现，两个注入回调都不执行。
    inject(deps, callback) {
      if (deps.includes('configForms') || deps.includes('locale')) return
      callback({ slots })
    },
  }
  module.apply(ctx)
  const registration = registrations.find((item) => item.options?.name === 'plugins.bundle.config')
  assert.ok(registration, 'fallback must claim plugins.bundle.config without configForms')
  assert.equal(registration.options.key, 'dsh-structured')
  assert.equal(registration.options.inject, undefined)
  assert.equal(registration.component(), '配置正在加载…')
})

test('config page：真实卡片注册前撤掉占位，key 不重复（1.3.5）', () => {
  const { require: fakeRequire } = fakeRuntime()
  const module = loadClient(makeDom(), fakeRequire)
  const { slots, registrations, disposed } = collectRegistration()
  const snapshot = { status: 'ready', writable: true, value: { theme: 'deepseek' } }
  const form = {
    set() { return Promise.resolve(true) },
    getSnapshot() { return snapshot },
    subscribe() { return () => {} },
  }
  const child = {
    configForms: { get: () => form, describe: () => ({ load() {} }) },
    slots,
    effect(fn) { return fn() },
  }
  const ctx = {
    slots,
    effect(fn) { return fn() },
    inject(deps, callback) {
      if (deps.includes('locale')) return
      callback(child)
    },
  }
  module.apply(ctx)
  const cards = registrations.filter((item) => item.options?.name === 'plugins.bundle.config')
  assert.equal(cards.length, 2, 'fallback then real card')
  assert.equal(cards[0].component(), '配置正在加载…')
  assert.equal(cards[cards.length - 1].component.name, 'StructuredConfigCard')
  assert.ok(disposed.includes('plugins.bundle.config'), 'fallback injection must be disposed')
})

test('config page：describe 未服务本命名空间时详情页配置卡仍注册（1.3.4 不再依赖 whileServed）', () => {
  served = false
  const { require: fakeRequire } = fakeRuntime()
  const module = loadClient(makeDom(), fakeRequire)
  const form = { getSnapshot() { return null }, set() { return Promise.resolve(true) }, subscribe() { return () => {} } }
  const { slots, get } = collectRegistration()
  let whileServedCalls = 0
  let describeLoads = 0
  const child = {
    configForms: {
      get() { return form },
      describe() { return { load() { describeLoads += 1 } } },
      // 宿主只有在 settings describe 含本命名空间时才会调用 register；这里模拟「永不服务」。
      whileServed() { whileServedCalls += 1; return () => {} },
    },
    slots,
    effect(fn) { return fn() },
  }
  module.__test.setupConfigPage(child, form)
  assert.equal(whileServedCalls, 0, 'config page must not wait for configForms.whileServed')
  assert.ok(get(), 'bundle config card must register even when describe serves no namespace')
  assert.equal(describeLoads, 1, 'setup kicks describe() once so the card can reach ready')
  served = true
})

test('config page：primitives 或 require 缺失时不注册，但记录具体原因（1.3.7）', () => {
  const module = loadClient(makeDom(), undefined)
  const form = { getSnapshot() { return null }, subscribe() { return () => {} } }
  const { slots, get } = collectRegistration()
  module.__test.setupConfigPage(makeChild(form, slots), form)
  assert.equal(get(), null)
  assert.match(module.__test.configDiagState().reason, /require/, 'degradation reason must not be silent')
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

  const tree = renderCard(component, {
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
  const customFlat = flatten(renderCard(component, { view: 'page', useStructuredConfig: (selector) => selector(snapshot), setField: () => {} }))
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

  const unavailable = renderCard(component, { view: 'page', useStructuredConfig: (selector) => selector({ status: 'unavailable' }) })
  assert.match(String(unavailable.props.children), /暂不可用/)

  const readonly = renderCard(component, {
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

  // 插件卸载 / 配置页停用：slot 与样式一并撤下。
  for (const cleanup of child.cleanups) cleanup()
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
  const tree = renderCard(component, { view: 'page', useStructuredConfig: (selector) => selector(snapshot), setField: () => {} })
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
  const flat = flatten(renderCard(component, { view: 'page', useStructuredConfig: (selector) => selector(snapshot), setField: () => {} }))
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
  const flat = flatten(renderCard(component, { view: 'page', useStructuredConfig: (selector) => selector(snapshot), setField: () => {} }))
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

test('sidebar：sidebarEntry=false 且 describe 未服务时，详情页设置卡仍在且开关可改', () => {
  const { require: fakeRequire } = fakeRuntime()
  const module = loadClient(makeDom(), fakeRequire)
  const calls = []
  const snapshot = { status: 'ready', writable: true, value: { sidebarEntry: false, theme: 'deepseek' } }
  const form = {
    set(field, value) { calls.push([field, value]); return Promise.resolve(true) },
    getSnapshot() { return snapshot },
    subscribe() { return () => {} },
  }
  const injections = []
  const registrations = []
  const slots = {
    inject(name, factory) { injections.push(name); return factory() },
    register(options, component) { registrations.push({ options, component }); return () => {} },
  }
  let describeLoads = 0
  const child = {
    configForms: {
      get() { return form },
      describe() { return { load() { describeLoads += 1 } } },
      // 宿主 describe 还没服务本命名空间：旧实现整条注册都不存在。
      whileServed() { return () => {} },
    },
    slots,
    effect(fn) { return fn() },
  }
  module.__test.setupConfigPage(child, form)

  assert.equal(JSON.stringify(injections), JSON.stringify(['plugins.bundle.config']))
  const card = registrations.find((item) => item.options.name === 'plugins.bundle.config')
  assert.ok(card, 'detail page settings card must exist with sidebarEntry=false')
  assert.equal(card.options.key, 'dsh-structured')
  assert.equal(describeLoads, 1, 'describe() is kicked once so the card can reach ready')
  assert.equal(registrations.some((item) => item.options.name === 'sidebar.panellist'), false)
  assert.equal(registrations.some((item) => item.options.name === 'main'), false)

  // 卡片里「侧边栏入口」开关读到 false，并且能写回 true。
  const flat = flatten(renderCard(card.component, {
    view: 'page',
    useStructuredConfig: (selector) => selector(snapshot),
    setField: (field, value) => form.set(field, value),
  }))
  const toggle = flat.find((element) => element.type?.name === 'Switch' && element.props.label === '侧边栏入口')
  assert.ok(toggle, 'sidebar entry switch must render in the detail page card')
  assert.equal(toggle.props.checked, false)
  toggle.props.onChange(true)
  assert.deepEqual(calls[0], ['sidebarEntry', true])
})

test('sidebar：切换 sidebarEntry 只卸载侧边栏 slot，详情页配置卡不重复注册也不撤销', () => {
  const { require: fakeRequire } = fakeRuntime()
  const module = loadClient(makeDom(), fakeRequire)
  const snapshot = { status: 'ready', writable: true, value: {} }
  const listeners = new Set()
  const form = {
    set() { return Promise.resolve(true) },
    getSnapshot() { return snapshot },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
  }
  const registrations = []
  const removed = []
  const slots = {
    inject(_name, factory) { return factory() },
    register(options) { registrations.push({ options }); return () => removed.push(options.name) },
  }
  module.__test.setupConfigPage(makeChild(form, slots), form)
  const cardCount = () => registrations.filter((item) => item.options.name === 'plugins.bundle.config').length
  const notify = () => { for (const listener of [...listeners]) listener() }

  assert.equal(cardCount(), 1)
  snapshot.value = { sidebarEntry: false }
  notify()
  assert.deepEqual(removed, ['sidebar.panellist', 'main'])
  assert.equal(cardCount(), 1, 'card must survive the sidebar unmount')
  assert.equal(removed.includes('plugins.bundle.config'), false)

  snapshot.value = { sidebarEntry: true }
  notify()
  snapshot.value = {}
  notify()
  assert.equal(cardCount(), 1, 'card must register exactly once across sidebar toggles')
  assert.equal(registrations.filter((item) => item.options.name === 'sidebar.panellist').length, 2)
})

test('config page：form 从 loading 变 ready 时卡片 hooks 数量不增长（不再触发 hooks 顺序崩溃）', () => {
  // 同一组件实例连续渲染两次，后一次的 hooks 不能多于前一次——React 的 hooks 规则。
  const seenHooks = new Map()
  let countHooks = null
  const react = {
    useState(initial) { countHooks?.(); return [typeof initial === 'function' ? initial() : initial, () => {}] },
    useEffect() { countHooks?.() },
  }
  const node = (type, props) => ({ type, props })
  const fakeRequire = (spec) => {
    if (spec === 'react/jsx-runtime') return { jsx: node, jsxs: node }
    if (spec === 'react') return react
    if (spec === '@deepseek-ai/dsh-client-ui-primitives') {
      return {
        Switch: function Switch(props) { return node('Switch', props) },
        SegmentedControl: function SegmentedControl(props) { return node('SegmentedControl', props) },
      }
    }
    throw new Error('unexpected require: ' + spec)
  }
  const module = loadClient(makeDom(), fakeRequire)
  const snapshot = { status: 'loading', writable: true, value: undefined }
  const form = {
    set() { return Promise.resolve(true) },
    getSnapshot() { return snapshot },
    subscribe() { return () => {} },
  }
  const { slots, get } = collectRegistration()
  module.__test.setupConfigPage(makeChild(form, slots), form)
  const { component } = get()

  const renderOnce = (fn, props) => {
    let hooks = 0
    countHooks = () => { hooks += 1 }
    const tree = fn(props)
    countHooks = null
    const before = seenHooks.get(fn)
    if (before !== undefined && hooks > before) {
      throw new Error('Rendered more hooks than during the previous render: ' + hooks + ' > ' + before)
    }
    seenHooks.set(fn, hooks)
    return tree
  }

  const placeholder = renderOnce(component, { view: 'page', useStructuredConfig: (selector) => selector(snapshot), setField: () => {} })
  assert.match(String(placeholder.props.children), /暂不可用/)

  snapshot.status = 'ready'
  snapshot.value = { theme: 'deepseek', contentDepth: 'general' }
  const tree = renderOnce(component, { view: 'page', useStructuredConfig: (selector) => selector(snapshot), setField: () => {} })
  assert.equal(tree.type, module.__test.personaApi().ConfigCardBody)
  const body = renderOnce(tree.type, tree.props)
  assert.match(JSON.stringify(body), /data-dsh-structured-config/)
})

// ---------------------------------------------------------------------------
// 1.3.6 宿主兼容回归：Cordis 4.1.0 的服务代理不允许访问未 inject 的服务属性。
// 1.3.5 在 apply 第一行裸读 ctx.slots，真实宿主抛 "cannot get property \"slots\"
// without inject"，apply 在最前面中断，卡片/视觉层/侧边栏一起消失。
// 这里用 lib/client.js（发布产物）加载，并模拟宿主代理与真实 slot 生命周期。
// ---------------------------------------------------------------------------

function loadShippedClient(dom, fakeRequire) {
  const code = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  let module = null
  const observers = []
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
      constructor(callback) {
        this.callback = callback
        this.observed = false
        observers.push(this)
      }
      observe() {
        this.observed = true
      }
      disconnect() {}
    },
    requestAnimationFrame: (fn) => { fn(); return 0 },
    cancelAnimationFrame() {},
    setTimeout,
    clearTimeout,
    console: { info() {}, warn() {}, error() {} },
    navigator: {},
  }, { filename: 'lib/client.js' })
  assert.ok(module, 'shipped client module should register')
  return { module, observers }
}

/** 模拟 Cordis 4.1.0 的 context 代理：未注入的服务属性一律抛错，slots 触发即算回归。 */
function makeStrictHostCtx() {
  const calls = { slotsReads: 0, injects: [], unservedReads: [] }
  const pending = []
  const base = {
    effect(fn) {
      const dispose = fn()
      return typeof dispose === 'function' ? dispose : () => {}
    },
    inject(deps, callback) {
      calls.injects.push(deps.join(','))
      // 最坏宿主：locale / configForms 永不服务，只有 slots 异步到达。
      if (deps.length === 1 && deps[0] === 'slots') pending.push(callback)
    },
  }
  const ctx = new Proxy(base, {
    get(target, prop, receiver) {
      if (prop === 'slots') {
        calls.slotsReads += 1
        throw new Error('cannot get property "slots" without inject')
      }
      if (Reflect.has(target, prop)) return Reflect.get(target, prop, receiver)
      calls.unservedReads.push(String(prop))
      throw new Error('cannot get property "' + String(prop) + '" without inject')
    },
  })
  return { ctx, calls, pending }
}

function makeSlotService(options = {}) {
  const registrations = []
  const disposals = []
  const slots = {
    inject(name, factory) {
      const dispose = factory()
      return () => {
        disposals.push(name)
        if (typeof dispose === 'function') dispose()
      }
    },
    register(definition, component) {
      if (options.registerThrows) throw new Error('slot declaration rejected')
      registrations.push({ definition, component })
      return () => disposals.push(definition.name)
    },
  }
  return { slots, registrations, disposals }
}

function personaFlow(document, payload) {
  const flow = document.createElement('div')
  flow.setAttribute('data-chat-flow-kind', 'assistant-step')
  const slot = document.createElement('div')
  slot.setAttribute('data-slot', 'conversation.chat.node')
  const markdown = document.createElement('div')
  markdown.className = '_markdown_preview'
  markdown.innerHTML = '<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_persona">persona</span></div></div><div data-code-block-content><pre>' + JSON.stringify(payload) + '</pre></div></div>'
  slot.appendChild(markdown)
  flow.appendChild(slot)
  document.body.appendChild(flow)
  return { flow, markdown }
}

const HOST_PERSONA = JSON.stringify({
  schema: 'dsh-structured/tone@1',
  prefix: 'Boss，',
  style: '搞怪',
  suffix: '——完',
  skipIn: ['code', 'diff', 'error', 'short', 'table'],
})

function assertPersonaDecorated(module, document, flow, markdown) {
  module.__test.setPersonaModeConfig({
    personaEnabled: true,
    persona: HOST_PERSONA,
    personaName: '测试鲸',
    personaSignature: '签名S',
    personaAvatar: '',
  })
  module.__test.decorate(flow)
  assert.equal(markdown.getAttribute('data-dsh-persona-kind'), 'normal')
  const cards = [...markdown.querySelectorAll('[data-dsh-structured-card-type]')]
    .map((element) => element.getAttribute('data-dsh-structured-card-type'))
  assert.deepEqual(cards, ['conclusion', 'next', 'risk'])
}

test('宿主兼容：apply 不裸读 ctx.slots；slots 异步到达才注册占位，卡片正常（1.3.6）', () => {
  const { document } = parseHTML('<!doctype html><html><head></head><body></body></html>')
  const { require: fakeRequire } = fakeRuntime()
  const { module, observers } = loadShippedClient(document, fakeRequire)
  assert.equal(Array.isArray(module.inject) && module.inject.length, 0, '插件仍不把 slots 列为必需服务')

  const { ctx, calls, pending } = makeStrictHostCtx()
  assert.doesNotThrow(() => module.apply(ctx), 'apply must survive the strict host proxy')
  assert.equal(calls.slotsReads, 0, 'apply must never read ctx.slots directly')
  assert.deepEqual(calls.injects.sort(), ['configForms', 'configForms,slots', 'locale', 'slots'])
  assert.equal(pending.length, 1, 'slots wait is registered through ctx.inject')

  // 视觉层/消息装饰必须在 apply 内就绪，不依赖 slots 是否到达。
  assert.ok(document.getElementById('dsh-structured-skin-style'), 'visual layer style injected')
  assert.equal(document.documentElement.getAttribute('data-dsh-structured'), 'active')
  assert.equal(observers.length, 1)
  assert.equal(observers[0].observed, true)

  // slots 还没到达：占位不能抢跑。
  const { slots, registrations } = makeSlotService()
  assert.equal(registrations.length, 0)

  // slots 异步到达后才注册占位，且 key = 包名。
  assert.doesNotThrow(() => pending[0]({ slots }))
  assert.equal(registrations.length, 1)
  assert.equal(registrations[0].definition.name, 'plugins.bundle.config')
  assert.equal(registrations[0].definition.key, 'dsh-structured')
  assert.equal(registrations[0].component(), '配置正在加载…')

  // 消息装饰端到端：persona 信封 -> 三卡 + 身份头。
  const { flow, markdown } = personaFlow(document, {
    version: 1,
    kind: 'normal',
    conclusion: { lead: '能上', body: '先灰度' },
    suggestions: ['跑链路'],
    risk: '回滚未演练',
  })
  assertPersonaDecorated(module, document, flow, markdown)
  assert.equal(flow.querySelectorAll('[data-dsh-persona-head]').length, 1)
})

test('宿主兼容：slots 注册失败只影响设置占位，apply 与卡片装饰不抛（1.3.6）', () => {
  const { document } = parseHTML('<!doctype html><html><head></head><body></body></html>')
  const { require: fakeRequire } = fakeRuntime()
  const { module } = loadShippedClient(document, fakeRequire)
  const { ctx, calls, pending } = makeStrictHostCtx()
  assert.doesNotThrow(() => module.apply(ctx))
  assert.equal(calls.slotsReads, 0)

  const { slots, registrations } = makeSlotService({ registerThrows: true })
  assert.doesNotThrow(() => pending[0]({ slots }), 'placeholder registration failure must be contained')
  assert.equal(registrations.length, 0)

  const { flow, markdown } = personaFlow(document, {
    version: 1,
    kind: 'short',
    text: '现在三点。',
  })
  assertPersonaDecoratedShort(module, document, flow, markdown)
})

function assertPersonaDecoratedShort(module, document, flow, markdown) {
  module.__test.setPersonaModeConfig({
    personaEnabled: true,
    persona: HOST_PERSONA,
    personaName: '测试鲸',
    personaSignature: '签名S',
    personaAvatar: '',
  })
  module.__test.decorate(flow)
  assert.equal(markdown.getAttribute('data-dsh-persona-kind'), 'short')
  const cards = [...markdown.querySelectorAll('[data-dsh-structured-card-type]')]
    .map((element) => element.getAttribute('data-dsh-structured-card-type'))
  assert.deepEqual(cards, ['short'])
}

// ---------------------------------------------------------------------------
// 1.3.7 宿主兼容回归：真实宿主里 setupConfigPage 一进来就读 child.locale，但
// locale 不在 ctx.inject(['configForms','slots']) 的依赖里。Cordis 4.1.0 代理
// 直接抛 "cannot get property \"locale\" without inject"，1.3.6 的异常被 apply
// 的回调 catch 吞掉，真实卡片永远注册不上，详情页只剩占位「配置正在加载…」。
// ---------------------------------------------------------------------------

/** 严格子上下文：未注入的服务属性一律抛错（locale 正是这样被读到的）。 */
function makeStrictChild({ form, slots }) {
  const base = {
    configForms: { get: () => form, describe: () => ({ load() {} }) },
    slots,
    effect(fn) {
      const dispose = fn()
      return typeof dispose === 'function' ? dispose : () => {}
    },
  }
  const reads = []
  const child = new Proxy(base, {
    get(target, prop, receiver) {
      if (prop === 'locale') {
        reads.push('locale')
        throw new Error('cannot get property "locale" without inject')
      }
      if (Reflect.has(target, prop)) return Reflect.get(target, prop, receiver)
      throw new Error('cannot get property "' + String(prop) + '" without inject')
    },
  })
  return { child, reads }
}

test('宿主兼容：child.locale 未 inject 抛错时仍注册真实卡片（1.3.7）', () => {
  const { document } = parseHTML('<!doctype html><html><head></head><body></body></html>')
  const { require: fakeRequire } = fakeRuntime()
  const { module } = loadShippedClient(document, fakeRequire)
  const snapshot = { status: 'ready', writable: true, value: { theme: 'deepseek' } }
  const form = { set() { return Promise.resolve(true) }, getSnapshot() { return snapshot }, subscribe() { return () => {} } }
  const { slots, registrations } = makeSlotService()
  const { child, reads } = makeStrictChild({ form, slots })
  assert.doesNotThrow(() => module.__test.setupConfigPage(child, form))
  const card = registrations.find((item) => item.definition.name === 'plugins.bundle.config')
  assert.ok(card, 'real card must register even though child.locale throws')
  assert.equal(card.component.name, 'StructuredConfigCard')
  assert.deepEqual(reads, ['locale'], 'locale read is attempted but contained')
  const state = module.__test.configDiagState()
  assert.equal(state.cardActive, true)
  assert.equal(state.reason, null, 'no degradation on a healthy host')
})

test('宿主兼容：apply 的 configForms+slots 注入回调不会因 locale 抛错丢掉卡片（1.3.7）', () => {
  const { document } = parseHTML('<!doctype html><html><head></head><body></body></html>')
  const { require: fakeRequire } = fakeRuntime()
  const { module } = loadShippedClient(document, fakeRequire)
  const snapshot = { status: 'loading', writable: true, value: undefined }
  const form = { set() { return Promise.resolve(true) }, getSnapshot() { return snapshot }, subscribe() { return () => {} } }
  const { slots, registrations } = makeSlotService()
  const { child } = makeStrictChild({ form, slots })
  const ctx = {
    effect(fn) { return fn() },
    inject(deps, callback) {
      if (deps.includes('configForms') && deps.includes('slots')) callback(child)
    },
  }
  assert.doesNotThrow(() => module.apply(ctx))
  const card = registrations.find((item) => item.definition.name === 'plugins.bundle.config')
  assert.ok(card, 'card must register from the real inject path without configForms/locale dependencies')
  assert.equal(card.component.name, 'StructuredConfigCard')
  assert.equal(module.__test.configDiagState().reason, null)
})

test('config page：服务缺失时占位文案写出具体原因，不再静默（1.3.7）', () => {
  const { document } = parseHTML('<!doctype html><html><head></head><body></body></html>')
  const { require: fakeRequire } = fakeRuntime()
  const { module } = loadShippedClient(document, fakeRequire)
  const { ctx, pending } = makeStrictHostCtx()
  module.apply(ctx)
  const { slots, registrations } = makeSlotService()
  pending[0]({ slots })
  assert.equal(registrations[0].component(), '配置正在加载…')

  const form = { getSnapshot() { return { status: 'ready', writable: true, value: {} } } }
  const child = { configForms: { get: () => form, describe: () => ({ load() {} }) }, slots, effect(fn) { return fn() } }
  module.__test.setupConfigPage(child, form)
  const state = module.__test.configDiagState()
  assert.match(state.reason, /form\.set/, 'degradation reason must name the missing service')
  const last = registrations[registrations.length - 1]
  assert.match(last.component(), /配置不可用：.*form\.set/, 'placeholder text must explain the missing service')
})

test('config page：表单未就绪时显示具体状态（1.3.7）', () => {
  const { require: fakeRequire } = fakeRuntime()
  const module = loadClient(makeDom(), fakeRequire)
  const snapshot = { status: 'ready', writable: true, value: { theme: 'deepseek' } }
  const form = { set() { return Promise.resolve(true) }, getSnapshot() { return snapshot }, subscribe() { return () => {} } }
  const { slots, get } = collectRegistration()
  module.__test.setupConfigPage(makeChild(form, slots), form)
  const { component } = get()
  const unavailable = renderCard(component, { view: 'page', useStructuredConfig: (selector) => selector({ status: 'unavailable' }) })
  assert.match(String(unavailable.props.children), /暂不可用/)
  assert.match(String(unavailable.props.children), /配置状态：unavailable/)
})

