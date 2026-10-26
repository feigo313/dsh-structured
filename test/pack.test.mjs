import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { readdirSync, rmSync } from 'node:fs'
import test from 'node:test'

test('pack：鲸鱼娘 JSON/许可/署名随包，1.0 草稿不随包', () => {
  const before = new Set(readdirSync('.').filter((name) => /^dsh-structured-.*\.tgz$/.test(name)))
  const output = execSync('npm pack --json --ignore-scripts', { encoding: 'utf8', timeout: 120_000 })
  const parsed = JSON.parse(output)
  const files = parsed.flatMap((entry) => entry.files.map((file) => file.path.replaceAll('\\', '/')))
  for (const required of ['docs/1.0-PERSONA-WHALE.json', 'LICENSE-WHALE', 'NOTICE-WHALE']) {
    assert.ok(files.includes(required), `pack missing ${required}`)
  }
  for (const draft of ['docs/1.0-FINAL-PLAN.md', 'docs/1.0-PERSONA-SPEC.md', 'docs/1.0-IMPLEMENTATION-PLAN.md']) {
    assert.equal(files.includes(draft), false, `pack unexpectedly includes ${draft}`)
  }
  assert.equal(files.includes('test/fixtures/baseline/P07-python.py'), false, 'pack should exclude P07 fixture')
  assert.equal(files.length, 62, 'pack file count must match ACCEPTANCE-1.0.0.md')
  assert.ok(parsed[0].size > 0)
  for (const name of readdirSync('.')) {
    if (/^dsh-structured-.*\.tgz$/.test(name) && !before.has(name)) rmSync(name, { force: true })
  }
})
