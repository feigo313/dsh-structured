import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { Config, statusText, THEMES } from '../src/index.js'
import { checkThemeContrast, THEME_TOKENS } from '../scripts/theme-contrast.mjs'
import { checkHueSeparation } from '../scripts/theme-hue-distance.mjs'

const value = (field) => (field && typeof field.get === 'function' ? field.get() : field)

test('1.0 Config：theme 默认 deepseek，三值可选；v5 档案字段有默认值', () => {
  assert.deepEqual(THEMES, ['deepseek', 'codex', 'anthropic'])
  assert.equal(value(Config({}).theme), 'deepseek')
  assert.equal(value(Config({ theme: 'codex' }).theme), 'codex')
  assert.equal(value(Config({ theme: 'anthropic' }).theme), 'anthropic')
  assert.equal(value(Config({ defaultEnabled: false }).defaultEnabled), false)
  assert.equal(value(Config({}).personaName), '蓝色大肥鱼')
  assert.equal(value(Config({}).personaSignature), '主人，再来一碗白米饭！！~')
  assert.equal(value(Config({}).personaAvatar), '')
})

test('0.9.8 accent/status hue 分离：12 项通过（v5 统一蓝）', () => {
  const { results, failures } = checkHueSeparation()
  assert.equal(failures.length, 0, JSON.stringify(failures, null, 2))
  assert.equal(results.length, 12)
})

test('0.9.8 Config：六个基础字段的默认值与显式值', () => {
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

test('0.9.1 Config：六个基础字段全部 volatile，且带中英 description', () => {
  for (const field of ['theme', 'visual', 'defaultEnabled', 'tailReminder', 'includeSubagents', 'genui']) {
    const meta = Config.dict[field].meta
    assert.ok(meta, `${field} meta`)
    assert.equal(meta.volatile, true, `${field} volatile=true`)
    assert.ok(String(meta.description ?? '').length > 8, `${field} description`)
  }
  for (const field of ['personaName', 'personaSignature', 'personaAvatar']) {
    assert.ok(Config.dict[field].meta, `${field} meta`)
    assert.ok(String(Config.dict[field].meta.description ?? '').length > 8, `${field} description`)
  }
})

test('v5 client：单一强调色、卡片/表格/代码 class 与深色 scope 实际存在', () => {
  const client = readFileSync(new URL('../src/client.js', import.meta.url), 'utf8')
  assert.match(client, /--dss-blue:#2563eb/)
  assert.match(client, /--dss-green:#067647/)
  assert.match(client, /--dss-amber:#b54708/)
  assert.match(client, /--dss-code-bg/)
  assert.match(client, /--dss-code-text/)
  assert.match(client, /body\[data-ds-dark-theme\] \.dss-scope/)
  assert.match(client, /\.dss-scope \.dss-card/)
  assert.match(client, /\.dss-scope \.dss-table/)
  assert.match(client, /\.dss-scope \.dss-code/)
  assert.match(client, /\.dss-scope \.dss-status-success/)
  assert.match(client, /data-dsh-structured-theme/)
  assert.doesNotMatch(client, /--ds-code-bg/)
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

test('v5 token：三主题统一为软面卡片 token，深色可读性达标', () => {
  assert.equal(THEME_TOKENS.deepseek.light.accent, '#2563EB')
  assert.equal(THEME_TOKENS.deepseek.light.accentText, '#1D4ED8')
  assert.equal(THEME_TOKENS.deepseek.light.surface2, '#F8FAFC')
  assert.equal(THEME_TOKENS.deepseek.dark.surface, '#242629')
  assert.equal(THEME_TOKENS.deepseek.dark.surface2, '#2B2E33')
  assert.equal(THEME_TOKENS.deepseek.dark.accent, '#3B82F6')
  assert.equal(THEME_TOKENS.deepseek.dark.accentText, '#8AB4FF')
  assert.equal(THEME_TOKENS.codex.light.accent, '#2563EB')
  assert.equal(THEME_TOKENS.codex.dark.surface, '#242629')
  assert.equal(THEME_TOKENS.anthropic.light.surface2, '#F8FAFC')
  assert.equal(THEME_TOKENS.anthropic.dark.muted, '#8A92A0')
  const client = readFileSync(new URL('../src/client.js', import.meta.url), 'utf8')
  assert.match(client, /--dss-blue:#2563eb/)
  assert.match(client, /--dss-green:#067647/)
  assert.match(client, /--dss-amber:#b54708/)
  assert.match(client, /--dss-ink-3:#8a92a0/)
  assert.match(client, /--dss-th-text:#93c5fd/)
  assert.match(client, /color:var\(--dss-th-text\)!important/)
})

test('0.9.0 对比度：3×2 全组 60 项通过', () => {
  const { results, failures } = checkThemeContrast()
  assert.equal(failures.length, 0, JSON.stringify(failures, null, 2))
  assert.equal(results.length, 60)
})
