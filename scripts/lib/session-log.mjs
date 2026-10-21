#!/usr/bin/env node
/**
 * DSH v4 会话日志读取器（无依赖）。
 *
 * 物理格式：独立 Zstandard 帧的标准拼接——一个只含 header 行的校验和帧，之后每个 append 批次一个帧。
 * Node 的 zstdDecompressSync 只解第一帧，所以这里先按帧头 + block header 精确算出帧长，再逐帧解压。
 */

import fs from 'node:fs'
import { join } from 'node:path'
import zlib from 'node:zlib'

const ZSTD_MAGIC = 0xfd2fb528

/**
 * 计算 [offset, offset+frameLength) 这一帧的字节长度。
 * @param {Buffer} buf
 * @param {number} offset
 * @returns {number}
 */
export function frameLength(buf, offset) {
  if (buf.readUInt32LE(offset) !== ZSTD_MAGIC) throw new Error('bad zstd magic at ' + offset)
  let p = offset + 4
  const descriptor = buf[p++]
  const contentSizeFlag = descriptor >> 6
  const singleSegment = (descriptor >> 5) & 1
  const checksumFlag = (descriptor >> 2) & 1
  const dictionaryFlag = descriptor & 3
  if (!singleSegment) p += 1 // Window descriptor
  if (dictionaryFlag === 3) p += 4
  else if (dictionaryFlag === 2) p += 2
  else if (dictionaryFlag === 1) p += 1
  if (contentSizeFlag === 0) {
    if (singleSegment) p += 1
  } else if (contentSizeFlag === 1) p += 2
  else if (contentSizeFlag === 2) p += 4
  else p += 8

  for (;;) {
    if (p + 3 > buf.length) throw new Error('truncated zstd block header')
    const header = buf[p] | (buf[p + 1] << 8) | (buf[p + 2] << 16)
    p += 3
    const last = header & 1
    const type = (header >> 1) & 3
    const size = header >>> 3
    if (type === 0 || type === 2) p += size
    else if (type === 1) p += 1
    else throw new Error('reserved zstd block type')
    if (p > buf.length) throw new Error('truncated zstd block body')
    if (last) break
  }
  if (checksumFlag) p += 4
  return p - offset
}

/**
 * 读取一个会话日志，返回全部 JSONL 事件（header 事件 + 持久事件）。
 * @param {string} file
 * @returns {any[]}
 */
export function readSessionLog(file) {
  const buf = fs.readFileSync(file)
  const events = []
  let offset = 0
  while (offset < buf.length) {
    const length = frameLength(buf, offset)
    const text = zlib.zstdDecompressSync(buf.subarray(offset, offset + length)).toString('utf8')
    for (const line of text.split('\n')) {
      if (line.trim() === '') continue
      events.push(JSON.parse(line))
    }
    offset += length
  }
  return events
}

/**
 * 在 sessions 根目录下递归找某个 session id 的日志，取最高版本。
 * @param {string} sessionsRoot
 * @param {string} sessionId
 * @returns {string | null}
 */
export function findSessionLog(sessionsRoot, sessionId) {
  if (!fs.existsSync(sessionsRoot)) return null
  for (const group of fs.readdirSync(sessionsRoot, { withFileTypes: true })) {
    if (!group.isDirectory()) continue
    const dir = join(sessionsRoot, group.name, sessionId)
    if (!fs.existsSync(dir)) continue
    const candidates = fs
      .readdirSync(dir)
      .filter((name) => /^session(?:\.v\d+)?\.jsonl(?:\.zstd)?$/.test(name))
      .sort((a, b) => versionOf(b) - versionOf(a))
    if (candidates.length > 0) return join(dir, candidates[0])
  }
  return null
}

function versionOf(name) {
  const match = /^session(?:\.v(\d+))?\.jsonl(?:\.zstd)?$/.exec(name)
  return match?.[1] === undefined ? 0 : Number(match[1])
}

/**
 * 列出 sessions 根目录下全部会话日志（可选时间窗）。
 * @param {string} sessionsRoot
 * @param {{ sinceDays?: number }} [options]
 * @returns {Array<{ file: string, sessionId: string, group: string, mtimeMs: number }>}
 */
export function listSessionLogs(sessionsRoot, options = {}) {
  if (!fs.existsSync(sessionsRoot)) return []
  const cutoff = options.sinceDays ? Date.now() - options.sinceDays * 86_400_000 : 0
  const out = []
  for (const group of fs.readdirSync(sessionsRoot, { withFileTypes: true })) {
    if (!group.isDirectory()) continue
    const groupDir = join(sessionsRoot, group.name)
    for (const session of fs.readdirSync(groupDir, { withFileTypes: true })) {
      if (!session.isDirectory()) continue
      const dir = join(groupDir, session.name)
      const candidates = fs
        .readdirSync(dir)
        .filter((name) => /^session(?:\.v\d+)?\.jsonl(?:\.zstd)?$/.test(name))
        .sort((a, b) => versionOf(b) - versionOf(a))
      if (candidates.length === 0) continue
      const file = join(dir, candidates[0])
      const mtimeMs = fs.statSync(file).mtimeMs
      if (mtimeMs < cutoff) continue
      out.push({ file, sessionId: session.name, group: group.name, mtimeMs })
    }
  }
  return out.sort((a, b) => a.mtimeMs - b.mtimeMs)
}

/**
 * 逐轮提取「用户可见最终回复」：每轮最后一条含文本、且不含 tool-call 的 assistant 消息。
 * @param {any[]} events
 * @returns {Array<{ turn: number, text: string }>}
 */
export function finalReplies(events) {
  const byTurn = new Map()
  let turn = 0
  for (const event of events) {
    if (event.type === 'turn/start') turn = event.data?.turn ?? turn + 1
    if (event.type !== 'assistant/message') continue
    const message = event.data?.message
    const content = Array.isArray(message?.content) ? message.content : []
    const hasToolCall = content.some((block) =>
      ['tool-call', 'tool-call-delta', 'tool_use', 'toolCalls'].includes(block?.type),
    )
    const text = content
      .filter((block) => block?.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join('')
    if (hasToolCall || text.trim() === '') continue
    byTurn.set(turn, { turn, text })
  }
  return [...byTurn.values()].sort((a, b) => a.turn - b.turn)
}

/**
 * 会话日志里所有 system/message 的文本。
 * @param {any[]} events
 * @returns {string[]}
 */
export function systemTexts(events) {
  return events
    .filter((event) => event.type === 'system/message')
    .map((event) => {
      const content = event.data?.message?.content
      if (!Array.isArray(content)) return ''
      return content
        .filter((block) => block?.type === 'text' && typeof block.text === 'string')
        .map((block) => block.text)
        .join('')
    })
    .filter((text) => text.length > 0)
}
