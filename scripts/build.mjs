#!/usr/bin/env node
/**
 * 构建 lib/：以 src/ 为唯一源码，生成带标注的运行时入口。
 * 不引入 bundler：host 只依赖 node: 内置模块；client 是模块加载器的纯 JS factory。
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const HOST_BANNER =
  '// Generated from src/index.js by scripts/build.mjs — edit src/, then run `npm run build`.\n' +
  '// dsh-structured host plugin: systemPrompt section + per-session switch + /structured command.\n'
const CLIENT_BANNER =
  '// Generated from src/client.js by scripts/build.mjs — edit src/, then run `npm run build`.\n' +
  '// dsh-structured client module: renders "结论：" blockquotes as cards.\n'

const host = readFileSync('src/index.js', 'utf8')
const client = readFileSync('src/client.js', 'utf8')

mkdirSync('lib', { recursive: true })
writeFileSync('lib/index.js', HOST_BANNER + host, 'utf8')
writeFileSync('lib/client.js', CLIENT_BANNER + client, 'utf8')
process.stdout.write('built lib/index.js (' + host.length + ' bytes) and lib/client.js (' + client.length + ' bytes)\n')
