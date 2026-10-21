#!/usr/bin/env node
/**
 * 散文率统计：实质回复里「该结构化却写成散文」的比例。
 * 口径固定、可复跑，README 与 docs/METRICS.md 有完整说明。
 *
 * 判定：
 *   实质回复   = 去掉代码块后可见字符 >= 120，且句子数 >= 2
 *   首屏结构化 = 回复前 300 个字符内出现 >=2 行表格 | >=2 个清单项 | >=2 个标题 | >=1 个 dsh-ui 块
 *   散文违规   = 实质回复 && 首屏不结构化 && 句子数 >= 3
 *   散文率     = 散文违规数 / 实质回复数（主口径）
 *
 * 另给整篇口径作对照：整篇任意位置出现结构即算结构化。两个口径都输出，避免只挑好看的数。
 *
 * 用法：
 *   node scripts/measure-prose.mjs --since-days 14 --verbose
 *   node scripts/measure-prose.mjs --sessions session-a,session-b --json
 *   node scripts/measure-prose.mjs --first-screen 500
 *   node scripts/measure-prose.mjs --whole
 */

import { homedir } from 'node:os'
import { join } from 'node:path'
import { finalReplies, readSessionLog, findSessionLog, listSessionLogs } from './lib/session-log.mjs'

const SUBSTANTIVE_CHARS = 120
const MIN_SENTENCES = 2
const PROSE_SENTENCES = 3
const DEFAULT_FIRST_SCREEN = 300

function parseArgs(argv) {
  const args = {
    dir: process.env.DSH_HOME ? join(process.env.DSH_HOME, 'sessions') : join(homedir(), '.dsh', 'sessions'),
    firstScreen: DEFAULT_FIRST_SCREEN,
    whole: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dir') args.dir = argv[++i]
    else if (arg === '--sessions') args.sessions = String(argv[++i] ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    else if (arg === '--since-days') args.sinceDays = Number(argv[++i])
    else if (arg === '--before') args.before = argv[++i]
    else if (arg === '--limit') args.limit = Number(argv[++i])
    else if (arg === '--first-screen') args.firstScreen = Number(argv[++i])
    else if (arg === '--whole') args.whole = true
    else if (arg === '--json') args.json = true
    else if (arg === '--verbose') args.verbose = true
    else if (arg === '--help' || arg === '-h') args.help = true
    else throw new Error('unknown argument: ' + arg)
  }
  if (!Number.isFinite(args.firstScreen) || args.firstScreen < 40) args.firstScreen = DEFAULT_FIRST_SCREEN
  return args
}

const HELP = `用法: node scripts/measure-prose.mjs [选项]

  --dir <path>          sessions 根目录（默认 $DSH_HOME/sessions）
  --sessions <ids>      只统计指定会话，逗号分隔
  --since-days <n>      只统计最近 n 天有写入的会话
  --before <iso>        只统计写入时间早于该时刻的会话（做干净的改前基线）
  --first-screen <n>    首屏口径的字符数（默认 300）
  --whole               改用整篇口径（任意位置有结构即算结构化）
  --limit <n>           最多统计 n 条实质回复
  --json                输出机器可读结果
  --verbose             列出每条违规回复
  -h, --help            显示本帮助
`

/**
 * 解析回复的可见结构信号。
 * @param {string} text
 * @returns {{ chars: number, sentences: number, tableRows: number, listItems: number, headings: number, dshUiBlocks: number, withoutCode: string }}
 */
export function analysisText(text) {
  const dshUiBlocks = (text.match(/```dsh-ui/g) ?? []).length
  const withoutCode = text.replace(/```[\s\S]*?```/g, '\n')
  const lines = withoutCode.split('\n')
  const visible = withoutCode.replace(/\s+/g, '')
  const tableRows = lines.filter((line) => /^\s*\|.*\|\s*$/.test(line)).length
  const listItems = lines.filter((line) => /^\s*(?:[-*+]|\d+[.)])\s+\S/.test(line)).length
  const headings = lines.filter((line) => /^\s*#{1,6}\s+\S/.test(line)).length
  const cardLines = lines.filter(
    (line) =>
      /^\s*>\s*\*\*[^*]+\*\*\s*$/.test(line) ||
      /^\s*>\s*\*\*(?:结论|判断|决策|指标|重点|风险|注意|下一步|行动|验收|通过)\*\*/.test(line),
  ).length
  const sentences = withoutCode
    .split(/[。！？!?;；\n]+|\.\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 6).length
  return { chars: visible.length, sentences, tableRows, listItems, headings, cardLines, dshUiBlocks, withoutCode }
}

/**
 * 首屏是否出现结构。按字符数截断而不是按行数，避免长段落把结构推到屏幕外。
 * dsh-ui 组件块在原文里识别；普通代码块不算结构（先剥掉，避免代码里的 | / - 被误判）。
 * @param {string} text
 * @param {number} limit
 * @returns {boolean}
 */
export function firstScreenStructured(text, limit = DEFAULT_FIRST_SCREEN) {
  const head = text.slice(0, limit)
  if (head.includes('```dsh-ui')) return true
  // 非 dsh-ui 的 fenced block：从开栅栏起整段丢弃（含未闭合到首屏末尾的情况）。
  const cleaned = head.replace(/```(?!dsh-ui)[^\n]*\n[\s\S]*?(?:```|$)/g, '\n')
  const lines = cleaned.split('\n')
  const tableRows = lines.filter((line) => /^\s*\|.*\|\s*$/.test(line)).length
  const listItems = lines.filter((line) => /^\s*(?:[-*+]|\d+[.)])\s+\S/.test(line)).length
  const headings = lines.filter((line) => /^\s*#{1,6}\s+\S/.test(line)).length
  const cardLines = lines.filter(
    (line) =>
      /^\s*>\s*\*\*[^*]+\*\*\s*$/.test(line) ||
      /^\s*>\s*\*\*(?:结论|判断|决策|指标|重点|风险|注意|下一步|行动|验收|通过)\*\*/.test(line),
  ).length
  return cardLines >= 1 || tableRows >= 2 || listItems >= 2 || headings >= 2
}

/**
 * 单条回复的判定。
 * @param {string} text
 * @param {{ firstScreen?: number, whole?: boolean }} [options]
 * @returns {ReturnType<typeof analysisText> & { substantive: boolean, structured: boolean, structuredWhole: boolean, prose: boolean }}
 */
export function classify(text, options = {}) {
  const a = analysisText(text)
  const substantive = a.chars >= SUBSTANTIVE_CHARS && a.sentences >= MIN_SENTENCES
  const structuredWhole = a.tableRows >= 2 || a.listItems >= 2 || a.headings >= 2 || a.cardLines >= 1 || a.dshUiBlocks >= 1
  const structured = options.whole
    ? structuredWhole
    : firstScreenStructured(text, options.firstScreen ?? DEFAULT_FIRST_SCREEN)
  const prose = substantive && !structured && a.sentences >= PROSE_SENTENCES
  return { ...a, substantive, structured, structuredWhole, prose }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    process.stdout.write(HELP)
    return
  }

  let logs
  if (args.sessions) {
    logs = args.sessions.map((id) => {
      const file = findSessionLog(args.dir, id)
      if (!file) throw new Error('找不到会话：' + id)
      return { file, sessionId: id }
    })
  } else {
    logs = listSessionLogs(args.dir, { sinceDays: args.sinceDays })
    if (args.before) {
      const cutoff = Date.parse(args.before)
      if (!Number.isFinite(cutoff)) throw new Error('无法解析 --before：' + args.before)
      logs = logs.filter((log) => log.mtimeMs <= cutoff)
    }
  }

  const rows = []
  for (const log of logs) {
    const events = readSessionLog(log.file)
    for (const reply of finalReplies(events)) {
      const verdict = classify(reply.text, { firstScreen: args.firstScreen, whole: args.whole })
      rows.push({ sessionId: log.sessionId, turn: reply.turn, ...verdict })
    }
  }

  const substantive = rows.filter((row) => row.substantive)
  const selected = args.limit ? substantive.slice(-args.limit) : substantive
  const selectedProse = selected.filter((row) => row.prose)
  const wholeProse = selected.filter((row) => !row.structuredWhole && row.sentences >= PROSE_SENTENCES)
  const rate = (value) => (selected.length === 0 ? 0 : Number(((value / selected.length) * 100).toFixed(1)))

  const summary = {
    dir: args.dir,
    sessions: logs.length,
    replies: rows.length,
    substantive: selected.length,
    structured: selected.filter((row) => row.structured).length,
    prose: selectedProse.length,
    proseRate: rate(selectedProse.length),
    wholeProse: wholeProse.length,
    wholeProseRate: rate(wholeProse.length),
    metric: {
      mode: args.whole ? 'whole' : 'first-screen',
      firstScreenChars: args.whole ? null : args.firstScreen,
      substantiveChars: SUBSTANTIVE_CHARS,
      proseSentences: PROSE_SENTENCES,
    },
    violations: selectedProse.map((row) => ({
      sessionId: row.sessionId,
      turn: row.turn,
      chars: row.chars,
      sentences: row.sentences,
      firstLine: row.withoutCode.trim().split('\n').find((line) => line.trim() !== '')?.slice(0, 120) ?? '',
    })),
  }

  if (args.json) {
    process.stdout.write(JSON.stringify(summary, null, 2) + '\n')
    return
  }

  process.stdout.write(
    'sessions=' + summary.sessions +
      ' replies=' + summary.replies +
      ' substantive=' + summary.substantive +
      ' structured=' + summary.structured +
      ' prose=' + summary.prose +
      ' proseRate=' + summary.proseRate + '%' +
      ' wholeProseRate=' + summary.wholeProseRate + '%' +
      ' mode=' + summary.metric.mode + '\n',
  )
  if (args.verbose && summary.violations.length > 0) {
    process.stdout.write('违规回复：\n')
    for (const row of summary.violations) {
      process.stdout.write('  ' + row.sessionId + ' turn ' + row.turn + ' · ' + row.chars + ' 字符 / ' + row.sentences + ' 句 · ' + row.firstLine + '\n')
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith('measure-prose.mjs')) {
  try {
    main()
  } catch (error) {
    process.stderr.write('measure-prose: ' + String(error?.message ?? error) + '\n')
    process.exitCode = 2
  }
}
