import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { parseHTML } from 'linkedom'

const clientSource = readFileSync('src/client.js', 'utf8')

function render(html) {
  const { window, document } = parseHTML(`<!doctype html><html><head></head><body>${html}</body></html>`)
  let definition
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(value) {
          definition = value
        },
      },
    },
    document,
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    requestAnimationFrame(fn) {
      fn()
      return 1
    },
    cancelAnimationFrame() {},
    setTimeout,
    clearTimeout,
    console,
  }
  sandbox.globalThis = sandbox
  vm.runInNewContext(clientSource, sandbox)
  assert.ok(definition, 'client module definition captured')
  const plugin = definition.factory()
  plugin.apply({
    inject(_services, callback) {
      callback({ configForms: { get: () => null } })
    },
    effect() {},
  })
  return document
}

function block(document, id) {
  const element = document.querySelector(`#${id}`)
  assert.ok(element, `missing #${id}`)
  return element
}

function assertPlain(document, id) {
  const element = block(document, id)
  assert.equal(element.getAttribute('data-dsh-structured-card'), null, `${id} card`)
  assert.equal(element.getAttribute('data-dsh-structured-card-type'), null, `${id} type`)
  assert.equal(element.getAttribute('data-dsh-structured-tone'), null, `${id} tone`)
  assert.equal(element.getAttribute('data-dsh-structured-lead'), null, `${id} lead`)
}

function assertCard(document, id, type, tone) {
  const element = block(document, id)
  assert.equal(element.getAttribute('data-dsh-structured-card'), '1', `${id} card`)
  assert.equal(element.getAttribute('data-dsh-structured-card-type'), type, `${id} type`)
  assert.equal(element.getAttribute('data-dsh-structured-tone'), tone, `${id} tone`)
  assert.equal(element.getAttribute('data-dsh-structured-lead'), null, `${id} lead`)
}

test('严格卡片：复合标签、普通引用不升级，完整标签才成卡', () => {
  const document = render(`
    <div class="_markdown_q2"><blockquote id="q2"><p><strong>风险提示</strong><br>影响：宿主升级后可能失效。</p></blockquote></div>
    <div class="_markdown_test">
      <blockquote id="q1"><p>风险提示：宿主升级后可能失效。</p></blockquote>
      <blockquote id="q3"><p>结论：这是用户引用的原文。</p></blockquote>
      <blockquote id="q4"><p>这是普通引用，没有加粗标题。</p></blockquote>
      <blockquote id="q9"><p><strong>判断依据</strong><br>不应成卡。</p></blockquote>
    </div>
    <div class="_markdown_q10"><blockquote id="q10"><p>前缀 <strong>标题</strong></p></blockquote></div>
    <div class="_markdown_q11"><blockquote id="q11"><p> <strong>标题</strong></p></blockquote></div>
    <div class="_markdown_q18"><blockquote id="q18"><p>前缀 <strong>标题</strong>尾正文</p></blockquote></div>
    <div class="_markdown_q16"><blockquote id="q16"><p><strong>结论性说明</strong><br>不应成卡。</p></blockquote></div>
    <div class="_markdown_q17"><blockquote id="q17"><p><strong>指标数据</strong><br>不应成卡。</p></blockquote></div>
    <div class="_markdown_test2">
      <blockquote id="q5"><p><strong>Phase 1 完成</strong><br>28/28 通过。</p></blockquote>
      <blockquote id="q5b"><p><strong>Phase 2 完成</strong><br>不应升级为 statement。</p></blockquote>
      <blockquote id="q6"><p><strong>风险</strong><br>影响：宿主升级后可能失效。</p></blockquote>
      <blockquote id="q7"><p><strong>下一步</strong><br>1. 安装测试 profile。</p></blockquote>
      <blockquote id="q8"><p><strong>验收</strong><br>✅ 3/3</p></blockquote>
      <blockquote id="q12"><p><strong>结论</strong><br>结论卡。</p></blockquote>
      <blockquote id="q13"><p><strong>决策</strong><br>决策卡。</p></blockquote>
      <blockquote id="q14"><p><strong>指标</strong><br>指标卡。</p></blockquote>
      <blockquote id="q15"><p><strong>重点</strong><br>重点卡。</p></blockquote>
      <div data-genui="1">
        <blockquote id="gen"><p><strong>风险</strong><br>GenUI 内不处理。</p></blockquote>
      </div>
    </div>
    <div class="_markdown_test5">
      <div data-genui="1">
        <blockquote id="genfirst"><p><strong>风险</strong><br>GenUI 内不处理，也不应阻断真实首块。</p></blockquote>
      </div>
      <blockquote id="real"><p><strong>Phase 9 完成</strong><br>真实首块仍应升级 statement。</p></blockquote>
    </div>
  `)

  // 反例：前缀/复合词、普通引用、strong 前有正文或空白
  assertPlain(document, 'q1')
  assertPlain(document, 'q2')
  assertPlain(document, 'q3')
  assertPlain(document, 'q4')
  assertPlain(document, 'q9')
  assertPlain(document, 'q10')
  assertPlain(document, 'q11')
  assertPlain(document, 'q18')
  assertPlain(document, 'q16')
  assertPlain(document, 'q17')

  // 正例：全部卡型 + 仅第一块可升级 + GenUI 前置不阻断真实首块
  assertCard(document, 'q5', 'statement', 'info')
  assertCard(document, 'q6', 'risk', 'warn')
  assertCard(document, 'q7', 'next', 'info')
  assertCard(document, 'q8', 'accept', 'success')
  assertCard(document, 'q12', 'conclusion', 'info')
  assertCard(document, 'q13', 'decision', 'info')
  assertCard(document, 'q14', 'metric', 'info')
  assertCard(document, 'q15', 'key', 'info')
  assertCard(document, 'real', 'statement', 'info')
  assertPlain(document, 'q5b')

  // GenUI 区域跳过
  assertPlain(document, 'gen')
  assertPlain(document, 'genfirst')
})

test('严格卡片：不再有普通首引用 lead 与文本前缀 tone 逻辑', () => {
  assert.doesNotMatch(clientSource, /isFirstBlockquote/)
  assert.doesNotMatch(clientSource, /toneFor/)
  assert.doesNotMatch(clientSource, /setAttribute\(LEAD_ATTR,\s*'lead'\)/)
  assert.match(clientSource, /CARD_TYPES = new Map/)
  assert.match(clientSource, /isStatementCard/)
})
