import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// 真实浏览器检查不在默认测试里执行。
// 需要时显式运行：DSH_STRUCTURED_STYLE_GATE=1 node scripts/style-gate.mjs
// 它启动 detached worker，终端立即返回；用 node scripts/style-gate.mjs --check 读结果。
// 证据写到 artifacts/style-gate/；不要把它接回 npm test，也不要在测试进程里自动拉起 ego-browser。
test('0.9.6 style：源码静态防护（真实浏览器改为手动 gate）', () => {
  const source = readFileSync(new URL('../src/client.js', import.meta.url), 'utf8')
  const gate = readFileSync(new URL('../scripts/style-gate.mjs', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /--ds-card-icon/)
  assert.match(gate, /DSH_STRUCTURED_STYLE_GATE/)
  assert.match(gate, /detached:\s*true/)
  assert.match(gate, /--check/)
  assert.doesNotMatch(gate, /spawnSync/)
  assert.match(gate, /STYLE_GATE_PASS/)
  assert.match(gate, /STYLE_GATE_STALE/)
  assert.match(gate, /codeTreeMatches/)
})

test('1.2.0 身份头：活 CSS 规则必须自持作用域（.dss-scope.dss-persona-head）', () => {
  const source = readFileSync(new URL('../src/client.js', import.meta.url), 'utf8')
  const start = source.indexOf('const CSS = `')
  assert.ok(start > 0, 'active CSS block must exist')
  const body = source.slice(start + 'const CSS = `'.length)
  const css = body.slice(0, body.indexOf('\n`\n'))
  assert.match(css, /\.dss-scope\.dss-persona-head\{/)
  assert.match(css, /\.dss-scope\.dss-persona-head \.dss-chat-avatar\{/)
  // 回退信号：要求祖先带 dss-scope 的旧写法在真实聊天结构里必然落空。
  assert.doesNotMatch(css, /\.dss-scope \.dss-persona-head[ ,{:]/)
})

test('1.3.3 内心OS：字号与颜色必须可读（ink-2、约 13px）', () => {
  const source = readFileSync(new URL('../src/client.js', import.meta.url), 'utf8')
  // 内心OS 尾缀在设置页预览（CONFIG_CSS）与真实聊天（CSS）各有一份规则，两份都要可读。
  const rules = [...source.matchAll(/\.dss-scope \.dss-persona-suffix\{([^}]*)\}/g)]
  assert.ok(rules.length >= 1, 'persona suffix rule must exist')
  for (const rule of rules) {
    const body = rule[1]
    assert.match(body, /color:var\(--dss-ink-2\)/)
    assert.match(body, /\* 13 \/ 12\.5/)
    assert.doesNotMatch(body, /--dss-ink-3/)
  }
  // 用户实际看到的会话样式来自 const CSS 活样式块：只改设置页预览不算修好。
  const start = source.indexOf('const CSS = `')
  assert.ok(start > 0, 'active CSS block must exist')
  const active = source.slice(start + 'const CSS = `'.length)
  const liveCss = active.slice(0, active.indexOf('\n`\n'))
  assert.match(liveCss, /\.dss-scope \.dss-persona-suffix\{[^}]*color:var\(--dss-ink-2\)/)
  assert.match(liveCss, /\.dss-scope \.dss-persona-suffix\{[^}]*\* 13 \/ 12\.5/)
})

