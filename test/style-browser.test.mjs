import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// 真实浏览器检查不在默认测试里执行。
// 需要时显式运行：DSH_STRUCTURED_STYLE_GATE=1 node scripts/style-gate.mjs
// 它会启动 ego lite、跑 computedStyle + 800px，并把证据写到 artifacts/style-gate/。
// 不要把它接回 npm test，也不要在测试进程里自动拉起 ego-browser。
test('0.9.6 style：源码静态防护（真实浏览器改为手动 gate）', () => {
  const source = readFileSync(new URL('../src/client.js', import.meta.url), 'utf8')
  const gate = readFileSync(new URL('../scripts/style-gate.mjs', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /--ds-card-icon/)
  assert.match(gate, /DSH_STRUCTURED_STYLE_GATE/)
  assert.match(gate, /STYLE_GATE_PASS/)
})
