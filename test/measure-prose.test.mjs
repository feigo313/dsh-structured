import assert from 'node:assert/strict'
import test from 'node:test'
import { firstScreenStructured } from '../scripts/measure-prose.mjs'

test('代码/diff 优先回复：首屏 fenced code 计为结构化', () => {
  assert.equal(firstScreenStructured('```js\nconst answer = 42\n```\n\n说明。'), true)
  assert.equal(firstScreenStructured('```diff\n- old\n+ new\n```\n\n说明。'), true)
  assert.equal(firstScreenStructured('第一段是普通散文。\n\n第二段也是普通散文。'), false)
})
