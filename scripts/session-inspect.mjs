#!/usr/bin/env node
/**
 * 读一个 DSH 会话日志，用来验证 system prompt 注入是否生效。
 *
 * 用法：
 *   node scripts/session-inspect.mjs --session session-xxxx --grep "结构化输出（本会话已启用"
 *   node scripts/session-inspect.mjs --session session-xxxx --grep "结构化输出" --json
 *   node scripts/session-inspect.mjs                 # 默认看最近一个会话
 *
 * 退出码：0 = 正常读取（--grep 的命中数在输出里）；2 = 参数或读取错误。
 */

import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  finalReplies,
  findSessionLog,
  listSessionLogs,
  readSessionLog,
  systemTexts,
} from './lib/session-log.mjs'

function parseArgs(argv) {
  const args = { dir: process.env.DSH_HOME ? join(process.env.DSH_HOME, 'sessions') : join(homedir(), '.dsh', 'sessions') }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--session') args.session = argv[++i]
    else if (arg === '--dir') args.dir = argv[++i]
    else if (arg === '--grep') args.grep = argv[++i]
    else if (arg === '--json') args.json = true
    else if (arg === '--replies') args.replies = true
    else if (arg === '--last-system') args.lastSystem = true
    else if (arg === '--help' || arg === '-h') args.help = true
    else throw new Error('unknown argument: ' + arg)
  }
  return args
}

const HELP = `用法: node scripts/session-inspect.mjs [选项]

  --session <id>  指定会话 id；省略时取最近写入的会话
  --dir <path>    sessions 根目录（默认 $DSH_HOME/sessions）
  --grep <text>   在 system/message 里搜这段文本，输出命中数与位置
  --last-system   只检查最新一条 system/message（用于验证「关掉后下一轮 0 命中」）
  --replies       同时列出每轮最终回复的首行与长度
  --json          输出机器可读 JSON
  -h, --help      显示本帮助
`

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    process.stdout.write(HELP)
    return
  }

  let file
  if (args.session) {
    file = findSessionLog(args.dir, args.session)
    if (!file) throw new Error('找不到会话日志：' + args.session + '（根目录 ' + args.dir + '）')
  } else {
    const latest = listSessionLogs(args.dir).at(-1)
    if (!latest) throw new Error('目录下没有会话日志：' + args.dir)
    file = latest.file
  }

  const events = readSessionLog(file)
  const header = events.find((event) => event.type === 'session') ?? {}
  const sessionId = header.id ?? args.session ?? '(unknown)'
  const systems = systemTexts(events)
  const scopedSystems = args.lastSystem ? systems.slice(-1) : systems
  const hits = args.grep ? scopedSystems.filter((text) => text.includes(args.grep)) : []
  const replies = args.replies ? finalReplies(events) : []

  if (args.json) {
    process.stdout.write(
      JSON.stringify(
        {
          file,
          sessionId,
          events: events.length,
          systemMessages: systems.length,
          systemChars: systems.reduce((sum, text) => sum + text.length, 0),
          scopedToLastSystem: args.lastSystem === true,
          grep: args.grep ?? null,
          hits: hits.length,
          replies: replies.map((reply) => ({
            turn: reply.turn,
            chars: reply.text.length,
            firstLine: reply.text.trim().split('\n')[0].slice(0, 120),
          })),
        },
        null,
        2,
      ) + '\n',
    )
    return
  }

  process.stdout.write('会话：' + sessionId + '\n')
  process.stdout.write('日志：' + file + '\n')
  process.stdout.write('事件：' + events.length + ' 条；system/message：' + systems.length + ' 条，共 ' + systems.reduce((sum, text) => sum + text.length, 0) + ' 字符\n')
  if (args.grep) {
    process.stdout.write('搜索：' + JSON.stringify(args.grep) + ' → 命中 ' + hits.length + ' 条 system/message\n')
    for (const text of hits) {
      const index = text.indexOf(args.grep)
      process.stdout.write('  …' + text.slice(Math.max(0, index - 40), index + args.grep.length + 60).replace(/\n/g, ' ⏎ ') + '…\n')
    }
  }
  if (args.replies) {
    process.stdout.write('最终回复：' + replies.length + ' 轮\n')
    for (const reply of replies) {
      process.stdout.write('  turn ' + reply.turn + ' · ' + reply.text.length + ' 字符 · ' + reply.text.trim().split('\n')[0].slice(0, 80) + '\n')
    }
  }
}

try {
  main()
} catch (error) {
  process.stderr.write('session-inspect: ' + String(error?.message ?? error) + '\n')
  process.exitCode = 2
}
