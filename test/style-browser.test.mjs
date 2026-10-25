import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'

// CI runner 通常没有 ego-browser；缺失时跳过，不让环境差异把测试判成失败。
function egoAvailable() {
  try {
    execSync(process.platform === 'win32' ? 'where ego-browser' : 'command -v ego-browser', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

test('0.9.6 style：真实浏览器 computedStyle 与 800px 布局', { timeout: 120_000 }, (t) => {
  if (!egoAvailable()) {
    t.skip('ego-browser 不可用，跳过真实浏览器样式检查')
    return
  }
  const source = readFileSync(new URL('../src/client.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /--ds-card-icon/)
  const probe = fileURLToPath(new URL('./fixtures/style-probe.mjs', import.meta.url))
  const resultPath = fileURLToPath(new URL('../artifacts/audit-0.9.6/style-result.json', import.meta.url))
  const url = pathToFileURL(probe).href
  rmSync(resultPath, { force: true })
  execSync(`ego-browser nodejs -e "await import('${url}')"`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 90_000,
  })
  const { style, narrow } = JSON.parse(readFileSync(resultPath, 'utf8'))
  rmSync(resultPath, { force: true })

  assert.equal(style.titleSize, '24px')
  assert.equal(style.titleWeight, '700')
  assert.equal(style.bodySize, '13.5px')
  assert.equal(style.bodyLine, '21.6px')
  assert.equal(style.dividerHeight, '1px')
  assert.equal(style.dividerBackground, 'rgb(226, 232, 240)')
  assert.equal(style.headerSize, '13px')
  assert.equal(style.headerWeight, '700')
  assert.equal(style.headerHeight, '38px')
  assert.equal(style.bodyCellSize, '12.5px')
  assert.equal(style.statusPillSize, '10px')
  assert.equal(style.leadSize, '13px')
  assert.equal(style.leadStrongSize, '14px')
  assert.equal(style.leadStrongWeight, '700')
  assert.equal(style.leadBorderTop, '0px')
  assert.equal(style.leadBorderRight, '0px')
  assert.equal(style.leadBorderBottom, '0px')
  assert.equal(style.leadBorderLeft, '0px')
  assert.equal(style.nextTitleSize, '16px')
  assert.equal(style.nextTitleWeight, '700')
  assert.equal(style.nextStepSize, '13px')
  assert.equal(style.nextBackground, 'rgba(0, 0, 0, 0)')
  assert.equal(style.nextBorderTop, '1px')
  assert.equal(style.nextBorderRight, '0px')
  assert.equal(style.nextBorderBottom, '0px')
  assert.equal(style.nextBorderLeft, '0px')
  assert.equal(style.triangleColor, 'rgb(194, 65, 12)')
  assert.equal(style.triangleLeftWidth, '9px')
  assert.equal(style.triangleTopWidth, '5px')
  assert.equal(style.triangleBottomWidth, '5px')
  assert.equal(style.darkTriangleColor, 'rgb(251, 146, 60)')
  assert.ok(Math.abs(style.liLeft - style.labelLeft) <= 1, `next label/li delta ${style.liLeft - style.labelLeft}`)
  assert.equal(style.cardIconBefore, 'none')
  assert.equal(narrow.overflow, false)
  assert.ok(narrow.docScrollWidth <= narrow.innerWidth)
})
