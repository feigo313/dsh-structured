#!/usr/bin/env node
/** 0.9.8：品牌 accent 与语义 status 的 hue 分离检查（阈值 25°）。 */
import { pathToFileURL } from 'node:url'
import { THEME_TOKENS } from './theme-contrast.mjs'

export const HUE_THRESHOLD = 25

function rgb(hex) {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16))
}

export function hue(hex) {
  const [r, g, b] = rgb(hex).map((channel) => channel / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  if (delta === 0) return 0
  let value
  if (max === r) value = ((g - b) / delta) % 6
  else if (max === g) value = (b - r) / delta + 2
  else value = (r - g) / delta + 4
  value *= 60
  return value < 0 ? value + 360 : value
}

export function hueDistance(a, b) {
  const diff = Math.abs(hue(a) - hue(b)) % 360
  return diff > 180 ? 360 - diff : diff
}

export function checkHueSeparation() {
  const results = []
  const failures = []
  for (const [theme, modes] of Object.entries(THEME_TOKENS)) {
    for (const [mode, token] of Object.entries(modes)) {
      for (const status of ['success', 'warn']) {
        const distance = hueDistance(token.accent, token[status])
        const row = { theme, mode, status, distance, threshold: HUE_THRESHOLD }
        results.push(row)
        if (distance < HUE_THRESHOLD) failures.push(row)
      }
    }
  }
  return { results, failures }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { results, failures } = checkHueSeparation()
  for (const row of results) console.log(`${row.theme}/${row.mode} accent-${row.status}: ${row.distance.toFixed(1)}°`)
  if (failures.length > 0) {
    console.error(JSON.stringify(failures, null, 2))
    process.exit(1)
  }
  console.log(`PASS ${results.length} hue checks`)
}
