import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

function makeDom() {
  const styles = new Map()
  const attrs = new Map()
  const element = () => ({
    children: [],
    appendChild(child) {
      this.children.push(child)
    },
    remove() {},
    setAttribute(name, value) {
      this[name] = value
    },
    removeAttribute(name) {
      delete this[name]
    },
    querySelectorAll() {
      return []
    },
    closest() {
      return null
    },
    tagName: 'P',
  })
  const document = {
    body: element(),
    documentElement: {
      setAttribute(name, value) {
        attrs.set(name, value)
      },
      removeAttribute(name) {
        attrs.delete(name)
      },
      getAttribute(name) {
        return attrs.get(name)
      },
    },
    head: {
      children: [],
      appendChild(style) {
        this.children.push(style)
        styles.set(style.id, style)
      },
    },
    createElement() {
      const style = element()
      style.textContent = ''
      style.id = ''
      style.remove = () => {
        styles.delete(style.id)
      }
      return style
    },
    getElementById(id) {
      return styles.get(id) ?? null
    },
    querySelectorAll() {
      return []
    },
  }
  return { document, styles, attrs }
}

function loadClient(dom) {
  const code = readFileSync(new URL('../src/client.js', import.meta.url), 'utf8')
  let module = null
  const window = {
    __ModuleLoader__: {
      load(definition) {
        module = definition.factory()
      },
    },
  }
  const context = {
    window,
    document: dom.document,
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    requestAnimationFrame: (fn) => fn(),
    cancelAnimationFrame: () => {},
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    console: { info() {}, warn() {}, error() {} },
  }
  vm.runInNewContext(code, context, { filename: 'src/client.js' })
  assert.ok(module, 'client module should register')
  return module
}

function makeContext(form) {
  return {
    inject(services, callback) {
      callback({
        configForms: {
          get(id) {
            return id === 'dsh-structured' ? form : undefined
          },
        },
        effect(fn) {
          return fn()
        },
      })
    },
    effect(fn) {
      return fn()
    },
  }
}

test('client：visual=false 停用视觉层，visual=true 恢复', () => {
  const dom = makeDom()
  const form = {
    value: { visual: false, theme: 'codex' },
    listeners: new Set(),
    getSnapshot() {
      return { value: this.value }
    },
    subscribe(listener) {
      this.listeners.add(listener)
      return () => this.listeners.delete(listener)
    },
  }
  const module = loadClient(dom)
  const dispose = module.apply(makeContext(form))

  assert.equal(dom.styles.has('dsh-structured-skin-style'), false)
  assert.equal(dom.attrs.has('data-dsh-structured'), false)
  assert.equal(dom.document.body['data-dsh-structured-theme'], undefined)

  form.value = { visual: true, theme: 'codex' }
  for (const listener of form.listeners) listener()
  assert.equal(dom.styles.has('dsh-structured-skin-style'), true)
  assert.equal(dom.attrs.get('data-dsh-structured'), 'active')
  assert.equal(dom.document.body['data-dsh-structured-theme'], 'codex')

  form.value = { visual: true, theme: 'anthropic' }
  for (const listener of form.listeners) listener()
  assert.equal(dom.document.body['data-dsh-structured-theme'], 'anthropic')

  form.value = { visual: true, theme: 'bogus' }
  for (const listener of form.listeners) listener()
  assert.equal(dom.document.body['data-dsh-structured-theme'], 'deepseek')

  form.value = { visual: false, theme: 'anthropic' }
  for (const listener of form.listeners) listener()
  assert.equal(dom.styles.has('dsh-structured-skin-style'), false)
  assert.equal(dom.attrs.has('data-dsh-structured'), false)
  assert.equal(dom.document.body['data-dsh-structured-theme'], undefined)

  dispose()
})

test('client：configForms 不可用时视觉层保持默认开启', () => {
  const dom = makeDom()
  const module = loadClient(dom)
  const ctx = {
    inject(services, callback) {
      // 模拟服务缺失：不调用 callback
    },
    effect(fn) {
      return fn()
    },
  }
  const dispose = module.apply(ctx)
  assert.equal(dom.styles.has('dsh-structured-skin-style'), true)
  assert.equal(dom.attrs.get('data-dsh-structured'), 'active')
  dispose()
})

function attrsElement(extra = {}) {
  const attrs = new Map()
  return {
    attrs,
    setAttribute(name, value) {
      attrs.set(name, value)
    },
    removeAttribute(name) {
      attrs.delete(name)
    },
    getAttribute(name) {
      return attrs.get(name)
    },
    ...extra,
  }
}

test('client：diff 代码块不套插件 chrome，普通代码块才套', () => {
  const dom = makeDom()
  const module = loadClient(dom)
  const diffCode = attrsElement({
    querySelector: () => ({ textContent: 'diff' }),
    closest: () => null,
  })
  const jsCode = attrsElement({
    querySelector: () => ({ textContent: 'js' }),
    closest: () => null,
  })
  const root = {
    querySelectorAll(selector) {
      if (selector.includes('.md-code-block')) return [diffCode, jsCode]
      return []
    },
  }
  module.__test.decorate(root)
  assert.equal(diffCode.attrs.get('data-dsh-structured-skip'), 'code')
  assert.equal(diffCode.attrs.get('data-dsh-structured-code'), undefined)
  assert.equal(diffCode.attrs.get('data-dsh-structured-lang'), undefined)
  assert.equal(jsCode.attrs.get('data-dsh-structured-code'), '1')
  assert.equal(jsCode.attrs.get('data-dsh-structured-lang'), 'js')
})

test('client：diff 表格不套插件表格样式', () => {
  const dom = makeDom()
  const module = loadClient(dom)
  const table = attrsElement({
    closest: (selector) => (selector.includes('[data-diff]') ? {} : null),
    querySelectorAll: () => [],
  })
  const root = {
    querySelectorAll(selector) {
      if (selector === '[class*="_markdown_"] table') return [table]
      return []
    },
  }
  module.__test.decorate(root)
  assert.equal(table.attrs.get('data-dsh-structured-skip'), 'table')
  assert.equal(table.attrs.get('data-dsh-structured-status-table'), undefined)
})
