#!/usr/bin/env node
/**
 * 构建 lib/：以 src/ 为唯一源码，生成带标注的运行时入口。
 * 不引入 bundler：host 只依赖 node: 内置模块；client 是模块加载器的纯 JS factory。
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const whale = JSON.parse(readFileSync('docs/1.0-PERSONA-WHALE.json', 'utf8'))
const whaleLiteral = JSON.stringify(JSON.stringify(whale))
const PERSONA_MARKER = "const PERSONA_WHALE_JSON = '__DSH_STRUCTURED_WHALE_JSON__'"
const injectPersona = (source, label) => {
  if (!source.includes(PERSONA_MARKER)) throw new Error(`missing persona marker in ${label}`)
  return source.replace(PERSONA_MARKER, `const PERSONA_WHALE_JSON = ${whaleLiteral}`)
}

const HOST_BANNER =
  '// Generated from src/index.js by scripts/build.mjs — edit src/, then run `npm run build`.\n' +
  '// dsh-structured host plugin: systemPrompt section + per-session switch + /structured command.\n'
const CLIENT_BANNER =
  '// Generated from src/client.js by scripts/build.mjs — edit src/, then run `npm run build`.\n' +
  '// dsh-structured client module: renders "结论：" blockquotes as cards.\n'

const host = injectPersona(readFileSync('src/index.js', 'utf8'), 'src/index.js')
const client = injectPersona(readFileSync('src/client.js', 'utf8'), 'src/client.js')

mkdirSync('lib', { recursive: true })
writeFileSync('lib/index.js', HOST_BANNER + host, 'utf8')
writeFileSync('lib/client.js', CLIENT_BANNER + client, 'utf8')
process.stdout.write('built lib/index.js (' + host.length + ' bytes) and lib/client.js (' + client.length + ' bytes)\n')
