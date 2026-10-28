import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// 真实浏览器检查不在默认测试里执行。
// 需要时手动运行 test/fixtures/style-probe.mjs；不要把它接回 npm test，
// 也不要在测试进程里自动拉起 ego-browser（会弹前台窗口、干扰用户）。
test('0.9.6 style：源码静态防护（真实浏览器改为手动）', () => {
  const source = readFileSync(new URL('../src/client.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /--ds-card-icon/)
})
