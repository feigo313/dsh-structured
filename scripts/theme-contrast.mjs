#!/usr/bin/env node
/** 3×2 主题 token 对比度门禁：正文/次要文字/强调色/状态色/代码块。 */
import { pathToFileURL } from 'node:url'

export const THEME_TOKENS = {
  deepseek: {
    light: {
      surface: '#FFFFFF', surface2: '#F4F7FB', text: '#0F172A', muted: '#5B6B82',
      border: '#E2E8F0', accent: '#2563EB', accentText: '#2563EB', success: '#166534', warn: '#92400E', error: '#991B1B',
      codeBg: '#F6F8FA', codeText: '#0F172A',
    },
    dark: {
      surface: '#111827', surface2: '#1F2937', text: '#E5E7EB', muted: '#9CA3AF',
      border: '#374151', accent: '#60A5FA', accentText: '#60A5FA', success: '#4ADE80', warn: '#FBBF24', error: '#F87171',
      codeBg: '#0B1220', codeText: '#E5E7EB',
    },
  },
  codex: {
    light: {
      surface: '#FFFFFF', surface2: '#F0F7F4', text: '#0D1117', muted: '#4F625A',
      border: '#CFE3DB', accent: '#10A37F', accentText: '#0B6B4F', success: '#116329', warn: '#7D4E00', error: '#A40E26',
      codeBg: '#F0F7F4', codeText: '#0D1117',
    },
    dark: {
      surface: '#0B1512', surface2: '#12211B', text: '#E6F2EC', muted: '#9DB2A8',
      border: '#233A31', accent: '#34D399', accentText: '#6EE7B7', success: '#3FB950', warn: '#D29922', error: '#F85149',
      codeBg: '#07100D', codeText: '#E6F2EC',
    },
  },
  anthropic: {
    light: {
      surface: '#FAF9F5', surface2: '#F5F1E8', text: '#141413', muted: '#6B6359',
      border: '#E5E0D5', accent: '#CC785C', accentText: '#A14A2E', success: '#266B4D', warn: '#92400E', error: '#8C1D18',
      codeBg: '#F5F1E8', codeText: '#141413',
    },
    dark: {
      surface: '#1F1E1D', surface2: '#2A2825', text: '#F5F1E8', muted: '#A8A29A',
      border: '#3A3733', accent: '#E8A087', accentText: '#E8A087', success: '#6FBF9A', warn: '#E0A458', error: '#F28B82',
      codeBg: '#171614', codeText: '#F5F1E8',
    },
  },
}

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
        ['muted/surface2', token.muted, token.surface2, 4.5],
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
