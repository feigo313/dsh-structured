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
  assert.equal(files.includes('test/fixtures/baseline/P04-meeting.md'), false, 'pack should exclude P04 fixture')
  assert.equal(files.includes('test/fixtures/baseline/P07-python.py'), false, 'pack should exclude P07 fixture')
  assert.equal(files.includes('test/fixtures/persona-gate/no-persona.md'), false, 'pack should exclude old gate fixture')
  assert.equal(files.includes('test/fixtures/persona-gate/persona-append.md'), false, 'pack should exclude old gate fixture')
  assert.equal(files.includes('test/fixtures/persona-gate/style-override.md'), false, 'pack should exclude old gate fixture')
  assert.equal(files.length, 58, 'pack file count must match ACCEPTANCE-1.0.0.md')
  // 体积断言带 4 KB 容差：tar 条目的平台元数据（权限位等）让同一内容在
  // Linux CI 与本地 Windows 上相差 ~137 B，精确字节断言跨平台不稳定。
  // 本地基线见 ACCEPTANCE-1.0.0.md；CI 以容差校验。
  const PINNED_SIZE = 2385960
  const PINNED_UNPACKED = 3057134
  const TOLERANCE = 4096
  assert.ok(
    Math.abs(parsed[0].size - PINNED_SIZE) <= TOLERANCE,
    `pack size ${parsed[0].size} must stay within ${TOLERANCE} B of the local baseline ${PINNED_SIZE} (ACCEPTANCE-1.0.0.md)`,
  )
  assert.ok(
    Math.abs(parsed[0].unpackedSize - PINNED_UNPACKED) <= TOLERANCE,
    `pack unpackedSize ${parsed[0].unpackedSize} must stay within ${TOLERANCE} B of the local baseline ${PINNED_UNPACKED} (ACCEPTANCE-1.0.0.md)`,
  )
  for (const name of readdirSync('.')) {
    if (/^dsh-structured-.*\.tgz$/.test(name) && !before.has(name)) rmSync(name, { force: true })
  }
})
