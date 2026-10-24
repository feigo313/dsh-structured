import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import { parseHTML } from 'linkedom'

const source = readFileSync('src/client.js', 'utf8')

function boot(html) {
  const { window, document } = parseHTML(`<!doctype html><html><head></head><body>${html}</body></html>`)
  const observers = []
  let definition = null
  class Observer {
    constructor(callback) {
      this.callback = callback
      observers.push(this)
    }
    observe() {}
    disconnect() {}
  }
  const sandbox = {
    window: { __ModuleLoader__: { load(value) { definition = value } } },
    document,
    MutationObserver: Observer,
    requestAnimationFrame: (fn) => { fn(); return 1 },
    cancelAnimationFrame: () => {},
    setTimeout,
    clearTimeout,
    console,
  }
  sandbox.globalThis = sandbox
  vm.runInNewContext(source, sandbox)
  const plugin = definition.factory()
  plugin.apply({
    inject(_services, callback) {
      callback({ configForms: { get: () => null }, effect: (fn) => fn() })
    },
    effect: (fn) => fn(),
  })
  return { document, observers, plugin }
}

const markdown = (id, inner) => `<div class="_markdown_${id}">${inner}</div>`
const riskCard = (id, body = '正文') => `<blockquote id="${id}"><p><strong>风险</strong><br>${body}</p></blockquote>`

test('增量扫描：mutation 只重扫所在 markdown 容器，不触发整页扫描', () => {
  const { document, observers } = boot(
    markdown('a', riskCard('a1')) + markdown('b', riskCard('b1')),
  )
  const a1 = document.getElementById('a1')
  const b1 = document.getElementById('b1')
  assert.equal(a1.getAttribute('data-dsh-structured-card'), '1')
  assert.equal(b1.getAttribute('data-dsh-structured-card'), '1')

  // 人为制造 B 的“陈旧状态”；若发生整页重扫，它会被重新装饰成卡片。
  for (const attr of ['data-dsh-structured-card', 'data-dsh-structured-card-type', 'data-dsh-structured-tone']) {
    b1.removeAttribute(attr)
  }

  const wrapper = document.createElement('blockquote')
  wrapper.id = 'a2'
  wrapper.innerHTML = '<p><strong>下一步</strong><br>新内容</p>'
  document.querySelector('._markdown_a').appendChild(wrapper)
  observers[observers.length - 1].callback([
    { type: 'childList', target: document.querySelector('._markdown_a'), addedNodes: [wrapper] },
  ])

  assert.equal(wrapper.getAttribute('data-dsh-structured-card'), '1', '新增块应被装饰')
  assert.equal(wrapper.getAttribute('data-dsh-structured-card-type'), 'next')
  assert.equal(b1.getAttribute('data-dsh-structured-card'), null, '未变更的容器不应被整页重扫')
})

test('增量扫描：文本变化会重扫所在容器并清掉陈旧属性', () => {
  const { document, observers } = boot(markdown('c', '<blockquote id="c1"><p>普通引用</p></blockquote>'))
  const block = document.getElementById('c1')
  // 人为制造陈旧卡片属性；文本变化后应被清掉。
  block.setAttribute('data-dsh-structured-card', '1')
  block.setAttribute('data-dsh-structured-card-type', 'risk')
  block.setAttribute('data-dsh-structured-tone', 'warn')

  const text = document.createTextNode('，追加')
  block.querySelector('p').appendChild(text)
  observers[observers.length - 1].callback([
    { type: 'characterData', target: text, addedNodes: [] },
  ])

  assert.equal(block.getAttribute('data-dsh-structured-card'), null)
  assert.equal(block.getAttribute('data-dsh-structured-card-type'), null)
  assert.equal(block.getAttribute('data-dsh-structured-tone'), null)
})

test('增量扫描：新增消息容器（body 级）会被装饰', () => {
  const { document, observers } = boot(markdown('d', riskCard('d1')))
  const fresh = document.createElement('div')
  fresh.className = '_markdown_e'
  fresh.innerHTML = riskCard('e1')
  document.body.appendChild(fresh)
  observers[observers.length - 1].callback([
    { type: 'childList', target: document.body, addedNodes: [fresh] },
  ])

  const e1 = document.getElementById('e1')
  assert.equal(e1.getAttribute('data-dsh-structured-card'), '1')
  assert.equal(e1.getAttribute('data-dsh-structured-card-type'), 'risk')
})
