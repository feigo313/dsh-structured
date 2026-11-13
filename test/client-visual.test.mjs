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

function classElement(extra = {}) {
  const classes = new Set()
  return {
    classes,
    classList: {
      add(...names) { for (const name of names) classes.add(name) },
      remove(...names) { for (const name of names) classes.delete(name) },
      contains(name) { return classes.has(name) },
    },
    ...attrsElement(extra),
  }
}

test('v5 skin：结论/表格/代码注入 dss class，状态表标状态单元格', () => {
  const dom = makeDom()
  const module = loadClient(dom)
  const strong = { tagName: 'STRONG', textContent: '结论' }
  const paragraph = { tagName: 'P', firstElementChild: strong }
  const block = classElement({ children: [paragraph], closest: () => null })
  const root = {
    querySelectorAll(selector) {
      if (selector === 'blockquote') return [block]
      return []
    },
  }
  module.__test.decorate(root)
  assert.equal(block.classes.has('dss-card'), true)
  assert.equal(block.classes.has('dss-card-conclusion'), true)
  assert.equal(block.attrs.get('data-dsh-structured-card-type'), 'conclusion')

  const statusCell = classElement({ textContent: '✅ 完成' })
  const noteCell = classElement({ textContent: '已完成' })
  const row = classElement({ cells: [statusCell, noteCell], closest: () => null })
  const table = classElement({ querySelectorAll: (selector) => selector === 'tbody tr' ? [row] : [] })
  const tableRoot = {
    querySelectorAll(selector) {
      if (selector === '[class*="_markdown_"] table') return [table]
      return []
    },
  }
  module.__test.decorate(tableRoot)
  assert.equal(table.classes.has('dss-table'), true)
  assert.equal(table.attrs.get('data-dsh-structured-status-table'), '1')
  assert.equal(row.attrs.get('data-dsh-structured-row'), 'success')
  assert.equal(statusCell.attrs.get('data-dsh-structured-status-cell'), '1')

  const heading = { textContent: 'js' }
  const banner = { querySelector: () => heading }
  const code = classElement({ querySelector: (selector) => selector === '[data-code-block-banner]' ? banner : null })
  const codeRoot = {
    querySelectorAll(selector) {
      if (selector === '[class*="_markdown_"] .md-code-block') return [code]
      return []
    },
  }
  module.__test.decorate(codeRoot)
  assert.equal(code.classes.has('dss-code'), true)
  assert.equal(code.attrs.get('data-dsh-structured-code'), '1')
})

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
  const diffCopyCode = attrsElement({
    querySelector: () => ({ textContent: 'diff复制' }),
    closest: () => null,
  })
  assert.equal(module.__test.isDiffCode(diffCopyCode), true)
  const root = {
    querySelectorAll(selector) {
      if (selector.includes('.md-code-block')) return [diffCode, jsCode, diffCopyCode]
      return []
    },
  }
  module.__test.decorate(root)
  assert.equal(diffCode.attrs.get('data-dsh-structured-skip'), 'code')
  assert.equal(diffCode.attrs.get('data-dsh-structured-code'), undefined)
  assert.equal(diffCode.attrs.get('data-dsh-structured-lang'), undefined)
  assert.equal(diffCopyCode.attrs.get('data-dsh-structured-skip'), 'code')
  assert.equal(jsCode.attrs.get('data-dsh-structured-code'), '1')
  assert.equal(jsCode.attrs.get('data-dsh-structured-lang'), 'js')
})

test('client：普通状态表仍套插件表格样式并标状态行', () => {
  const dom = makeDom()
  const module = loadClient(dom)
  const row = attrsElement({
    textContent: '✅ 完成',
    cells: [{ textContent: '✅ 完成' }],
    closest: () => null,
  })
  const table = attrsElement({
    closest: () => null,
    querySelectorAll: (selector) => (selector === 'tbody tr' ? [row] : []),
  })
  const root = {
    querySelectorAll(selector) {
      if (selector === '[class*="_markdown_"] table') return [table]
      if (selector === '[class*="_markdown_"] tbody tr') return [row]
      if (selector === '[class*="_markdown_"] table tr') return [row]
      return []
    },
  }
  module.__test.decorate(root)
  assert.equal(table.attrs.get('data-dsh-structured-status-table'), '1')
  assert.equal(table.attrs.get('data-dsh-structured-skip'), undefined)
  assert.equal(row.attrs.get('data-dsh-structured-row'), 'success')
})

test('client：GenUI 区域不写入 skip，保持旧行为', () => {
  const dom = makeDom()
  const module = loadClient(dom)
  const code = attrsElement({
    querySelector: () => ({ textContent: 'js' }),
    closest: (selector) => (selector.includes('genui') ? {} : null),
  })
  const table = attrsElement({
    closest: (selector) => (selector.includes('genui') ? {} : null),
    querySelectorAll: () => [],
  })
  const root = {
    querySelectorAll(selector) {
      if (selector.includes('.md-code-block')) return [code]
      if (selector === '[class*="_markdown_"] table') return [table]
      return []
    },
  }
  module.__test.decorate(root)
  assert.equal(code.attrs.get('data-dsh-structured-skip'), undefined)
  assert.equal(code.attrs.get('data-dsh-structured-code'), undefined)
  assert.equal(table.attrs.get('data-dsh-structured-skip'), undefined)
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

test('client：标题图标使用悬挂缩进，换行行不顶回左边', () => {
  const dom = makeDom()
  loadClient(dom).apply(makeContext(null))
  const css = dom.styles.get('dsh-structured-skin-style')?.textContent ?? ''
  assert.match(css, /h2\[data-dsh-structured-icon\]\{padding-left:42px;text-indent:-30px\}/)
  assert.match(css, /h3\[data-dsh-structured-icon\]\{padding-left:30px;text-indent:-30px\}/)
  assert.match(css, /h2\[data-dsh-structured-icon\]::before,[^{]*\{[^}]*text-indent:0/)
})

test('client：卡片字体与字号跟随宿主 ui-theme 变量', () => {
  const dom = makeDom()
  loadClient(dom).apply(makeContext(null))
  const css = dom.styles.get('dsh-structured-skin-style')?.textContent ?? ''
  assert.ok(css, 'skin style should be injected')
  // 字体栈跟随宿主 text / code 字体
  assert.match(css, /--dss-sans:var\(--dsh-font-family-text,/)
  assert.match(css, /--dss-mono:var\(--dsh-font-family-code,/)
  // 字号跟随宿主会话内容字号 / 代码字号，并保留现有值作回退
  assert.match(css, /--dss-text-size:var\(--dsh-content-font-size,13\.5px\)/)
  assert.match(css, /--dss-code-size:var\(--dsh-code-font-size,12\.5px\)/)
  assert.match(css, /font-size:var\(--dss-text-size\)/)
  assert.match(css, /font:var\(--dss-code-size\)\/1\.7 var\(--dss-mono\)/)
  // 组件皮肤里不再写死 px 字号（回退值在自定义属性里，不是 font-size 声明）
  assert.doesNotMatch(css, /font-size:\d+(\.\d+)?px/)
  assert.doesNotMatch(css, /font:[^;}]*\d+(\.\d+)?px\//)
})

test('client：代码块 banner 不吸顶、标签不重复、fenceSeat 不吞卡片间距', () => {
  const dom = makeDom()
  loadClient(dom).apply(makeContext(null))
  const css = dom.styles.get('dsh-structured-skin-style')?.textContent ?? ''
  assert.ok(css, 'skin style should be injected')
  // 宿主 .bannerWrap 是 position:sticky + 不透明底；我们清掉了底色，长代码块滚动时
  // 代码会从标题后穿过。改成 static，卡片整体化，不依赖底色遮罩。
  assert.match(css, /\[class\*="_bannerWrap"\]\{[^}]*position:static/)
  // 只对含我们自己卡片的 fenceSeat 归零间距，宿主的其它块（genui/diff）保持原样。
  assert.match(css, /\[class\*="_fenceSeat"\]:has\(> \.dss-code\)\{margin:0\}/)
  // 无语言代码块宿主显示 codeLabel「代码块」，再叠「代码 · 」就成了「代码 · 代码块」；
  // 前缀只在有真实语言（LANG_ATTR 存在）时出现。
  assert.match(css, /\[data-code-block-banner\]::before\{[^}]*content:none/)
  assert.match(css, /\[data-dsh-structured-lang\] \[data-code-block-banner\]::before\{[^}]*content:"代码 · "/)
})
