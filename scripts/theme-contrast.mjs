#!/usr/bin/env node
/** 3×2 主题 token 对比度门禁：正文/次要文字/强调色/状态色/代码块。 */
import { pathToFileURL } from 'node:url'

// v5 统一为一套软面卡片皮肤：三主题保留为界面兼容值，token 同源。
// muted 正文主要落在 paper 上；paper2 只做容器，容器内文字使用 ink-2。
const V5_LIGHT = {
  surface: '#FFFFFF', surface2: '#F8FAFC', text: '#101828', muted: '#667085',
  border: '#E4E7EC', accent: '#2563EB', accentText: '#1D4ED8', success: '#067647', warn: '#B54708', error: '#B42318',
  codeBg: '#FFFFFF', codeText: '#344054',
}
const V5_DARK = {
  surface: '#242629', surface2: '#2B2E33', text: '#E6E9EF', muted: '#8A92A0',
  border: '#363A41', accent: '#3B82F6', accentText: '#8AB4FF', success: '#34D399', warn: '#FBBF24', error: '#F87171',
  codeBg: '#000000', codeText: '#C9D2E0',
}
export const THEME_TOKENS = Object.fromEntries(
  ['deepseek', 'codex', 'anthropic'].map((theme) => [theme, { light: { ...V5_LIGHT }, dark: { ...V5_DARK } }]),
)

const hex = (value) => {
  const raw = value.replace('#', '')
  return [0, 2, 4].map((offset) => parseInt(raw.slice(offset, offset + 2), 16))
}

const luminance = (rgb) => {
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(foreground, background) {
  const a = luminance(hex(foreground))
  const b = luminance(hex(background))
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

export function blend(foreground, background, alpha) {
  const fg = hex(foreground)
  const bg = hex(background)
  return '#' + fg.map((channel, index) => Math.round(channel * alpha + bg[index] * (1 - alpha)).toString(16).padStart(2, '0')).join('')
}

export function checkThemeContrast() {
  const failures = []
  const results = []
  for (const [theme, modes] of Object.entries(THEME_TOKENS)) {
    for (const [mode, token] of Object.entries(modes)) {
      const pairs = [
        ['text/surface', token.text, token.surface, 4.5],
        ['text/surface2', token.text, token.surface2, 4.5],
        ['muted/surface', token.muted, token.surface, 4.5],
        ['accentText/surface2', token.accentText, token.surface2, 4.5],
        ['accentText/card6%', token.accentText, blend(token.accent, token.surface, 0.06), 4.5],
        ['success/12%', token.success, blend(token.success, token.surface, 0.12), 4.5],
        ['warn/12%', token.warn, blend(token.warn, token.surface, 0.12), 4.5],
        ['error/12%', token.error, blend(token.error, token.surface, 0.12), 4.5],
        ['codeText/codeBg', token.codeText, token.codeBg, 4.5],
        ['accent/surface', token.accent, token.surface, 3],
      ]
      for (const [name, fg, bg, minimum] of pairs) {
        const ratio = contrastRatio(fg, bg)
        results.push({ theme, mode, pair: name, ratio, minimum })
        if (ratio < minimum) failures.push({ theme, mode, pair: name, ratio, minimum })
      }
    }
  }
  return { results, failures }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { results, failures } = checkThemeContrast()
  for (const row of results) console.log(`${row.theme}/${row.mode} ${row.pair}: ${row.ratio.toFixed(2)}`)
  if (failures.length > 0) {
    console.error(JSON.stringify(failures, null, 2))
    process.exit(1)
  }
  console.log(`PASS ${results.length} checks`)
}
