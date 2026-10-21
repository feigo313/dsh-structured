// Generated from src/index.js by scripts/build.mjs — edit src/, then run `npm run build`.
// dsh-structured host plugin: systemPrompt section + per-session switch + /structured command.
/**
 * dsh-structured — 让每条实质回复默认结构化：首句给结论，内容用表格 / 清单 / 步骤排出来。
 *
 * 通道（刻意不做 agent/pre-step、不 append 消息、不碰工具权限与 agent 循环）：
 * 1) systemPrompt.section：text 为函数，每次组装时按「当前会话」的开关求值；关闭返回空串，
 *    渲染层自动丢弃空 section，因此对 prompt 的增删即时生效。
 * 2) 会话级状态：$DSH_HOME/dsh-structured/state.json，tmp + rename 原子写，跨重启保留。
 * 3) host 命令 `/structured on|off|status`：作用于当前会话。
 * 4) 规则覆盖：$DSH_HOME/dsh-structured/style.md 存在且非空时整份替换内置文本（按 mtime+size 缓存）。
 *
 * fail-open 是红线：section 求值、style 读取、状态读写、命令处理中的任何异常都不得让回合失败，
 * 最坏情况只是本轮不注入（返回空串 / 返回错误提示文本）。
 */

import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/** Cordis 插件名。 */
export const name = 'dsh-structured'

/** 必需服务：系统提示词注册表。commands 属于可选能力（见 apply 内的 ctx.inject），
 *  缺失时只降级 /structured 命令，不牺牲注入——注入才是本插件的核心。 */
export const inject = ['systemPrompt']

/** 主 section 名（带插件前缀，避免与其他 section 重名）。 */
export const SECTION_NAME = 'dsh-structured:style'

/** 尾部提醒 section 名：放在 system prompt 末尾，对冲长上下文下的遵循衰减。 */
export const REMINDER_NAME = 'dsh-structured:reminder'

/** 主 section 兜底顺序：与第一方 STRUCTURED_OUTPUT 槽位对齐（本机实测 9900）。 */
const SECTION_ORDER_FALLBACK = 9900

/** 尾部提醒顺序：排在 harness source（10000）、web surface（10100）、persona suffix（10200）之后。 */
const REMINDER_ORDER = 10300

/** 会话条目上限：按最近使用淘汰，防止 state.json 无界增长。 */
export const MAX_SESSION_ENTRIES = 500

/**
 * 内置规则文本：中文，与 `~/.dsh/AGENTS.md` 第 7 节（响应格式）同源，只规定形状、不另立第二套写作规则。
 * 逐条对应：首句结论（结论卡）、组件化正文、禁过程叙事与复述、结构化不等于变长、支撑信息带证据、
 * 以及「全文最多两个强调块」的视觉热点约束。
 */
export const BUILTIN_STYLE_TEXT = [
  '## 结构化输出（本会话已启用，硬约束）',
  '',
  '面向用户的实质回复按下面的形状组织。这是硬约束，不是风格建议。',
  '',
  '1. **首句给结论，并把它做成卡片**：第一段固定两行——`> **一句标题**`（加粗放大，≤60 个汉字或一句短句）→ `> 1–2 行正文`；标题即结论，细节放正文，不要写「结论」标签，不要再用普通段落重复。',
  '2. **按内容选卡，最多两个强调块**：3 条以上要点用清单或表格；每条实质回复 1 个主卡（首段标题无标签）；判断/指标/重点卡用 `> **判断**` / `> **指标**` / `> **重点**`；最多再 1 个行动卡（`风险` / `下一步` / `验收`）；表格前先给一行 `**表格结论：** ...`；状态行/状态单元格用 `✅ 完成` / `⚠️ 待做` / `❌ 阻塞` 开头；表格 ≤5 行，正文 ≤500 字（含表格）；短答不套卡，其余保持中性。',
  '3. **一段一个主题**：同一信息只出现一次，不要正文和组件各说一遍；不写过程叙事（我先…／已经…／接下来…），不写收尾总结，不加「还需要我…吗？」。',
  '4. **结构化不等于变长**：组件是压缩阅读时间的工具，不是加信息的借口；对话汇报正文不超过 500 字，超出的细节写进文件，回复只留结论加文件路径。',
  '5. **支撑信息带证据**：每条支撑尽量带数字、路径或结果；没有证据的判断明确标成推断。',
  '6. **可复制内容用代码块**：提示词、命令、配置、JSON、SQL 等需要复制的文本，用带语言标签的代码块包裹（如 `text` / `powershell`），不要用引用块或普通段落；代码块右上角有复制按钮。',
].join('\n')

/** GenUI 已安装时才追加的路由规则：交互/图表走 dsh-ui，普通卡片仍走 markdown。 */
export const GENUI_ROUTING_TEXT = [
  '**GenUI 已安装**：图表、可排序表格、表单、超过 8 行的大表用 ` ```dsh-ui ` fence；结论/判断/风险/下一步仍用上面的 markdown 卡片，不要为每条回复生成 JSON，也不要重复渲染同一内容。',
].join('\n')

/** 尾部提醒：一句话重复契约中最容易衰减的四件事，长度控制在几十个 token。 */
export const TAIL_REMINDER_TEXT = [
  '提醒：本轮最终回复第一段用无标签标题卡：加粗标题（≤60 字）/ 正文两行；表格前给 `**表格结论：**`；状态用 `✅ 完成` / `⚠️ 待做`；全文最多两个强调块；表格 ≤5 行，正文不超过 500 字；可复制内容用代码块。',
].join('\n')

/** DSH home：优先 DSH_HOME，缺省 ~/.dsh。 */
export function dshHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

/** 插件状态目录：$DSH_HOME/dsh-structured。 */
export function pluginDir() {
  return join(dshHome(), name)
}

/**
 * 检测 dsh-genui 是否已安装（软联动，不硬依赖）。
 * 只信 config 显式 on/off 与 host 的 clientModules 实时图；不读可能被继承污染的 profile env。
 * 任何读取失败都按“未安装”处理，绝不阻断注入。
 * @param {{ genui?: 'auto' | 'on' | 'off' }} [config]
 * @param {import('@deepseek-ai/cordis').Context} [ctx] 可选 host 上下文：查 clientModules 实时图。
 * @returns {boolean}
 */
export function detectGenui(config = {}, ctx) {
  if (config?.genui === 'on') return true
  if (config?.genui === 'off') return false
  try {
    const modules = ctx?.get?.('clientModules')
    if (modules && typeof modules.clientPath === 'function') {
      for (const id of ['genui', '@changfenhuang/dsh-genui', 'dsh-genui']) {
        if (modules.clientPath(id)) return true
      }
    }
    if (modules && typeof modules.graph === 'function') {
      const graph = modules.graph()
      if (Array.isArray(graph?.entries) && graph.entries.some((entry) => String(entry?.id ?? '').includes('genui'))) return true
    }
  } catch {
    // clientModules 不可用（headless/装配早期）：按未安装处理，避免误注入 dsh-ui。
  }
  return false
}

/** 状态文件：$DSH_HOME/dsh-structured/state.json。 */
export function stateFile() {
  return join(pluginDir(), 'state.json')
}

/** 自定义规则文件：$DSH_HOME/dsh-structured/style.md。 */
export function styleFile() {
  return join(pluginDir(), 'style.md')
}

/** style.md 的 mtime+size 缓存：文件未变时不重复读盘。 */
let styleCache = { key: null, text: BUILTIN_STYLE_TEXT, source: 'built-in' }

/**
 * 当前生效的规则正文与来源。任何读取异常都回落到内置文本——fail-open。
 * @returns {{ text: string, source: 'built-in' | 'custom' }}
 */
export function activeStyle() {
  try {
    const stat = statSync(styleFile())
    const key = styleFile() + ':' + stat.mtimeMs + ':' + stat.size
    if (styleCache.key === key && styleCache.text !== null) return styleCache
    const raw = readFileSync(styleFile(), 'utf8').trim()
    styleCache = raw.length > 0
      ? { key, text: raw, source: 'custom' }
      : { key, text: BUILTIN_STYLE_TEXT, source: 'built-in' }
    return styleCache
  } catch {
    styleCache = { key: null, text: BUILTIN_STYLE_TEXT, source: 'built-in' }
    return styleCache
  }
}

/**
 * 从会话条目里读开关；显式记录优先，否则取新会话默认值。
 * @param {Record<string, { enabled: boolean, at: number }>} sessions
 * @param {boolean} defaultEnabled
 * @param {string | null} sessionId
 * @returns {boolean}
 */
export function isEnabledFor(sessions, defaultEnabled, sessionId) {
  if (typeof sessionId !== 'string' || sessionId.length === 0) return defaultEnabled === true
  return sessions[sessionId]?.enabled ?? defaultEnabled === true
}

/**
 * 从模型组装上下文 / 命令调用里提取会话 id。
 * 实测：AssembleContext 带 `agent`（且 `scope` 就是 agent）；CommandInvocation 直接带 `agent`。
 * @param {unknown} source
 * @returns {string | null}
 */
export function sessionIdOf(source) {
  const agent = source?.agent ?? source?.scope
  const raw = agent?.session?.id ?? agent?.id
  return typeof raw === 'string' && raw.length > 0 && raw.length <= 512 ? raw : null
}

/**
 * 是否子代理会话：只认 origin/delegationDepth。
 * 注意：用户聊天 fork 出来的会话也有 parentSession，但不是子代理，不能跳过。
 * @param {unknown} source
 * @returns {boolean}
 */
export function isSubagentContext(source) {
  const header = source?.agent?.session?.header ?? source?.scope?.session?.header
  if (!header || typeof header !== 'object') return false
  if (header.origin === 'subagent') return true
  return typeof header.delegationDepth === 'number' && header.delegationDepth > 0
}

/**
 * section 求值的唯一入口，所有异常在此吞掉并回落为空串——注入链路出错必须放行原请求。
 * @param {{
 *   enabled: boolean,
 *   eligible: boolean,
 *   styleText: () => string,
 *   onError?: (error: unknown) => void,
 * }} options
 * @returns {string}
 */
export function safeSectionText(options) {
  try {
    if (!options.enabled || !options.eligible) return ''
    const text = options.styleText()
    return typeof text === 'string' ? text : ''
  } catch (error) {
    try {
      options.onError?.(error)
    } catch {
      // 日志本身失败也不能影响回合。
    }
    return ''
  }
}

/**
 * 读取状态文件。文件缺失、损坏、字段畸形时一律回落为空会话表（默认值仍由 config 决定）。
 * @returns {Record<string, { enabled: boolean, at: number }>}
 */
export function loadSessions() {
  try {
    const raw = JSON.parse(readFileSync(stateFile(), 'utf8'))
    const sessions = {}
    for (const [sessionId, value] of Object.entries(raw?.sessions ?? {})) {
      if (typeof sessionId !== 'string' || sessionId.length === 0 || sessionId.length > 512) continue
      if (typeof value === 'boolean') {
        sessions[sessionId] = { enabled: value, at: 0 }
        continue
      }
      if (value && typeof value === 'object' && typeof value.enabled === 'boolean') {
        sessions[sessionId] = { enabled: value.enabled === true, at: Number(value.at) || 0 }
      }
    }
    return sessions
  } catch {
    return {}
  }
}

/**
 * 有界化会话表：先保住与默认值不同的显式翻转，再按最近使用补足。
 * @param {Record<string, { enabled: boolean, at: number }>} sessions
 * @param {boolean} defaultEnabled
 * @returns {Record<string, { enabled: boolean, at: number }>}
 */
export function pruneSessions(sessions, defaultEnabled) {
  const entries = Object.entries(sessions ?? {})
  if (entries.length <= MAX_SESSION_ENTRIES) return sessions ?? {}
  const byRecent = (a, b) => (b[1]?.at || 0) - (a[1]?.at || 0)
  const explicit = entries.filter(([, value]) => value?.enabled !== defaultEnabled).sort(byRecent)
  const redundant = entries.filter(([, value]) => value?.enabled === defaultEnabled).sort(byRecent)
  return Object.fromEntries(explicit.concat(redundant).slice(0, MAX_SESSION_ENTRIES))
}

/**
 * 原子写状态：同目录 tmp 文件 + rename 覆盖；失败时清理 tmp 并把错误交回调用方。
 * @param {Record<string, { enabled: boolean, at: number }>} sessions
 * @param {boolean} defaultEnabled
 * @returns {{ ok: true, sessions: Record<string, { enabled: boolean, at: number }> } | { ok: false, sessions: Record<string, { enabled: boolean, at: number }>, error: unknown }}
 */
export function saveSessions(sessions, defaultEnabled) {
  const pruned = pruneSessions(sessions, defaultEnabled)
  const file = stateFile()
  const tmp = file + '.tmp-' + process.pid + '-' + Math.random().toString(36).slice(2)
  try {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(tmp, JSON.stringify({ version: 1, sessions: pruned }, null, 2) + '\n', 'utf8')
    renameSync(tmp, file)
    return { ok: true, sessions: pruned }
  } catch (error) {
    try {
      rmSync(tmp, { force: true })
    } catch {
      // tmp 清理失败不改变结论。
    }
    return { ok: false, sessions, error }
  }
}

/**
 * 写入一个会话开关；持久化失败时仍保留进程内状态（下一轮立即生效），并把失败交回命令层提示。
 * @param {Record<string, { enabled: boolean, at: number }>} sessions
 * @param {boolean} defaultEnabled
 * @param {string} sessionId
 * @param {boolean} enabled
 */
export function setEnabledFor(sessions, defaultEnabled, sessionId, enabled) {
  sessions[sessionId] = { enabled: enabled === true, at: Date.now() }
  return saveSessions(sessions, defaultEnabled)
}

/**
 * 生成 /structured 的状态文本（不含副作用）。
 * @param {{ sessionId: string | null, sessions: Record<string, { enabled: boolean, at: number }>, defaultEnabled: boolean, genui?: boolean }} input
 * @returns {string}
 */
export function statusText(input) {
  const style = activeStyle()
  const enabled = isEnabledFor(input.sessions, input.defaultEnabled, input.sessionId)
  return [
    '结构化提示词：' + (enabled ? '已开启' : '已关闭') + '（本会话）',
    '新会话默认：' + (input.defaultEnabled ? '开启' : '关闭'),
    '规则来源：' + (style.source === 'custom' ? '自定义 ' + styleFile() : '内置（无标签标题卡 + 结构化组件）'),
    '视觉层：始终开启（/structured 只控制提示词注入，视觉样式不随开关关闭）',
    'GenUI 联动：' + (input.genui ? '已检测（图表/交互走 dsh-ui，普通卡片走 fallback）' : '未检测（纯 markdown fallback）'),
    '状态文件：' + stateFile(),
    '用法：/structured on | off | status',
  ].join('\n')
}

/**
 * 处理 /structured 命令。handler 外层还会再兜一层，这里保持纯逻辑便于单测。
 * @param {{ rawInput?: unknown, agent?: { session?: { id?: unknown }, id?: unknown } }} invocation
 * @param {{ sessions: Record<string, { enabled: boolean, at: number }>, defaultEnabled: boolean, onChange?: (sessionId: string, enabled: boolean, result: { ok: boolean, error?: unknown }) => void }} api
 * @returns {{ kind: 'success', text: string } | { kind: 'error', text: string }}
 */
export function handleCommand(invocation, api) {
  const sessionId = sessionIdOf(invocation)
  const arg = String(invocation?.rawInput ?? '').trim().toLowerCase()
  if (arg === '' || arg === 'status') {
    return { kind: 'success', text: statusText({ sessionId, sessions: api.sessions, defaultEnabled: api.defaultEnabled, genui: api.genui }) }
  }
  if (arg !== 'on' && arg !== 'off') {
    return { kind: 'error', text: '未知参数：' + arg + '\n用法：/structured on | off | status' }
  }
  if (sessionId === null) {
    return { kind: 'error', text: '当前会话 id 不可用，未修改开关。' }
  }
  const enabled = arg === 'on'
  const result = setEnabledFor(api.sessions, api.defaultEnabled, sessionId, enabled)
  api.onChange?.(sessionId, enabled, result)
  const state = enabled ? '已开启' : '已关闭'
  if (result.ok) return { kind: 'success', text: state + '本会话的结构化输出（下一轮生效）。' }
  return {
    kind: 'success',
    text: state + '本会话的结构化输出（下一轮生效）；状态写入失败，仅本进程生效：' + String(result.error),
  }
}

/**
 * 挂载结构化输出：提示词 section + 尾部提醒 + 会话开关 + /structured 命令。
 * @param {import('@deepseek-ai/cordis').Context} ctx host 根上下文。
 * @param {{ defaultEnabled?: boolean, tailReminder?: boolean, includeSubagents?: boolean, genui?: 'auto' | 'on' | 'off' }} [config]
 */
export function apply(ctx, config = {}) {
  const defaultEnabled = config?.defaultEnabled !== false
  const tailReminder = config?.tailReminder !== false
  const includeSubagents = config?.includeSubagents === true
  const genui = detectGenui(config, ctx)
  let genuiKnown = genui
  const genuiNow = () => {
    if (genuiKnown) return true
    genuiKnown = detectGenui(config, ctx)
    return genuiKnown
  }
  const builtinStyleText = () => (genuiNow() ? BUILTIN_STYLE_TEXT + '\n\n' + GENUI_ROUTING_TEXT : BUILTIN_STYLE_TEXT)
  let sessions = pruneSessions(loadSessions(), defaultEnabled)
  const stateStampOf = () => {
    try {
      const stat = statSync(stateFile())
      return stat.mtimeMs + ':' + stat.size
    } catch {
      return 'missing'
    }
  }
  let stateStamp = stateStampOf()
  const refreshSessions = () => {
    const next = stateStampOf()
    if (next === stateStamp) return
    stateStamp = next
    try {
      sessions = pruneSessions(loadSessions(), defaultEnabled)
    } catch {
      // 外部状态读取失败时保留内存态，fail-open。
    }
  }
  const logger = ctx.logger ?? {}
  const warn = (message, error) => {
    try {
      logger.warn?.('[dsh-structured] ' + message, error)
    } catch {
      // 日志失败不影响插件行为。
    }
  }

  const sectionOrder = () => {
    try {
      const order = ctx.systemPrompt?.getSectionOrder?.('STRUCTURED_OUTPUT')
      return Number.isFinite(order) ? order : SECTION_ORDER_FALLBACK
    } catch {
      return SECTION_ORDER_FALLBACK
    }
  }

  const eligible = (context) => includeSubagents || !isSubagentContext(context)
  const enabledFor = (context) => {
    refreshSessions()
    return isEnabledFor(sessions, defaultEnabled, sessionIdOf(context))
  }
  const sectionText = (context, styleText, label) => {
    // 外层兜底也是 fail-open 的一部分：enabledFor / eligible 自身抛错时同样不能打断组装。
    try {
      return safeSectionText({
        enabled: enabledFor(context),
        eligible: eligible(context),
        styleText,
        onError: (error) => warn(label, error),
      })
    } catch (error) {
      warn(label + '（外层兜底）', error)
      return ''
    }
  }

  try {
    ctx.effect(
      () =>
        ctx.systemPrompt.section({
          name: SECTION_NAME,
          order: sectionOrder(),
          interpolate: false, // style.md 里的 {{...}} 不得触发严格插值而打断组装。
          text: (context) =>
            sectionText(
              context,
              () => {
                const style = activeStyle()
                return style.source === 'custom' ? style.text : builtinStyleText()
              },
              'section 求值失败，已回退为空 section',
            ),
        }),
      'dsh-structured: prompt section',
    )
  } catch (error) {
    warn('注册 system prompt section 失败，插件降级为不注入', error)
  }

  if (tailReminder) {
    try {
      ctx.effect(
        () =>
          ctx.systemPrompt.section({
            name: REMINDER_NAME,
            order: REMINDER_ORDER,
            interpolate: false,
            text: (context) =>
              sectionText(context, () => TAIL_REMINDER_TEXT, '尾部提醒求值失败，已回退为空 section'),
          }),
        'dsh-structured: tail reminder',
      )
    } catch (error) {
      warn('注册尾部提醒失败，不影响主 section', error)
    }
  }

  try {
    ctx.effect(
      () =>
        ctx.commands.register({
          name: 'structured',
          description: '开关本会话的结构化提示词（视觉样式仍保留）',
          input: { hint: '[on|off|status]' },
          handler: (invocation) => {
            try {
              refreshSessions()
              return handleCommand(invocation, {
                sessions,
                defaultEnabled,
                genui: genuiNow(),
                onChange: (sessionId, enabled, result) => {
                  warn(
                    'session ' + sessionId + ' structured ' + (enabled ? 'on' : 'off') + (result.ok ? '' : '（持久化失败）'),
                    result.ok ? undefined : result.error,
                  )
                },
              })
            } catch (error) {
              warn('/structured 处理失败', error)
              return { kind: 'error', text: '/structured 处理失败：' + String(error) }
            }
          },
        }),
      'dsh-structured: /structured command',
    )
  } catch (error) {
    warn('注册 /structured 命令失败，开关不可用但注入不受影响', error)
  }
}
