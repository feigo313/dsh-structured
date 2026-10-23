import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { Config, statusText, THEMES } from '../src/index.js'
import { checkThemeContrast } from '../scripts/theme-contrast.mjs'

const value = (field) => (field && typeof field.get === 'function' ? field.get() : field)

test('0.9.0 Config：theme 默认 deepseek，三值可选', () => {
  assert.deepEqual(THEMES, ['deepseek', 'codex', 'anthropic'])
  assert.equal(value(Config({}).theme), 'deepseek')
  assert.equal(value(Config({ theme: 'codex' }).theme), 'codex')
  assert.equal(value(Config({ theme: 'anthropic' }).theme), 'anthropic')
  assert.equal(value(Config({ defaultEnabled: false }).defaultEnabled), false)
})

test('0.9.1 Config：六个字段的默认值与显式值', () => {
  const defaults = Config({})
  assert.equal(value(defaults.theme), 'deepseek')
  assert.equal(value(defaults.visual), true)
  assert.equal(value(defaults.defaultEnabled), true)
  assert.equal(value(defaults.tailReminder), true)
  assert.equal(value(defaults.includeSubagents), false)
  assert.equal(value(defaults.genui), 'auto')
  const custom = Config({
    theme: 'codex',
    visual: false,
    defaultEnabled: false,
    tailReminder: false,
    includeSubagents: true,
    genui: 'on',
  })
  assert.equal(value(custom.theme), 'codex')
  assert.equal(value(custom.visual), false)
  assert.equal(value(custom.defaultEnabled), false)
  assert.equal(value(custom.tailReminder), false)
  assert.equal(value(custom.includeSubagents), true)
  assert.equal(value(custom.genui), 'on')
})

test('0.9.1 Config：六个字段全部 volatile，且带中英 description', () => {
  for (const field of ['theme', 'visual', 'defaultEnabled', 'tailReminder', 'includeSubagents', 'genui']) {
    const meta = Config.dict[field].meta
    assert.ok(meta, `${field} meta`)
    assert.equal(meta.volatile, true, `${field} volatile=true`)
    assert.ok(String(meta.description ?? '').length > 8, `${field} description`)
  }
})

test('0.9.1 client：token 语义色/代码块实际使用', () => {
  const client = readFileSync(new URL('../src/client.js', import.meta.url), 'utf8')
  assert.match(client, /THEMES\.includes\(theme\)/)
  assert.match(client, /body\[data-dsh-structured-theme="codex"\]/)
  assert.match(client, /body\[data-ds-dark-theme\]\[data-dsh-structured-theme="anthropic"\]/)
  assert.match(client, /\.md-code-block\{[^}]*background:var\(--ds-code-bg\)/s)
  assert.match(client, /\.md-code-block pre\{[^}]*color:var\(--ds-code-text\)/s)
  assert.match(client, /var\(--ds-success\)/)
  assert.match(client, /var\(--ds-warn\)/)
  assert.match(client, /var\(--ds-error\)/)
})

test('0.9.0 statusText：显示 theme 与 visual', () => {
  const text = statusText({
    sessionId: 'session-a',
    sessions: {},
    defaultEnabled: true,
    theme: 'anthropic',
    visual: false,
  })
  assert.match(text, /主题：anthropic/)
  assert.match(text, /视觉层：已关闭/)
})

test('0.9.0 client：主题 token/暗色 selector/code token 存在，旧 selector 已删', () => {
  const client = readFileSync(new URL('../src/client.js', import.meta.url), 'utf8')
  assert.match(client, /body\[data-ds-dark-theme\]/)
  assert.match(client, /data-dsh-structured-theme/)
  assert.match(client, /--ds-code-bg/)
  assert.match(client, /--ds-code-text/)
  assert.doesNotMatch(client, /\[data-theme="dark"\]/)
  assert.doesNotMatch(client, /--dsw-alias-state-/)
  assert.match(client, /--ds-accent:#2563EB/)
  for (const theme of ['codex', 'anthropic']) assert.match(client, new RegExp(`data-dsh-structured-theme="${theme}"`))
})

test('0.9.0 对比度：3×2 全组通过', () => {
  const { results, failures } = checkThemeContrast()
  assert.equal(failures.length, 0, JSON.stringify(failures, null, 2))
  assert.equal(results.length, 54)
})
