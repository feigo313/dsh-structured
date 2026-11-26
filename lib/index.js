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
import Schema from '@deepseek-ai/schemastery'

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

/** 把字段标记为 volatile，让 DSH 设置表单可以实时读写。 */
const k = (x) => (typeof x.volatile === 'function' ? x.volatile() : x)

/** volatile 字段在 host 侧是可读信号；普通字段原样返回。 */
const readConfig = (x) => (x && typeof x.get === 'function' ? x.get() : x)

/** 主题白名单：host 与 client 共用同一组值。custom 只给客户端自定义三色（themeCustom）用。 */
export const THEMES = ['dsh', 'deepseek', 'codex', 'anthropic', 'custom']

/** 1.0 语气风格发布默认值；正式是否开启由 Boss 拍板，代码不写死。 */
export const DEFAULT_PERSONA_ENABLED = true
export const DEFAULT_PERSONA_NAME = '蓝色大肥鱼'
export const DEFAULT_PERSONA_SIGNATURE = '主人，再来一碗白米饭！！~'
export const DEFAULT_PERSONA_AVATAR = ''
/** 身份头（头像 / 名字 / 签名）默认开启；只在 personaEnabled=true 时生效。 */
export const DEFAULT_PERSONA_HEAD_ENABLED = true

/**
 * 身份头是否真的显示：人格关闭时身份头视为关闭（1.2.0 语义）。
 * 单独关身份头不影响内容合同，也不影响说话风格。
 * @param {unknown} personaEnabled
 * @param {unknown} personaHeadEnabled
 * @returns {boolean}
 */
export function personaHeadActive(personaEnabled, personaHeadEnabled) {
  return personaEnabled === true && personaHeadEnabled !== false
}

/** 构建脚本替换此常量；源码直接运行时使用中性 FALLBACK，避免未构建就崩溃。 */
const PERSONA_WHALE_JSON = "{\"schema\":\"dsh-structured/tone@1\",\"prefix\":\"我最爱💗的Boss~！！鱼鱼🐳报告📢！\",\"style\":\"搞怪/傲娇，说话干净利落，直接给结论，再补一句犀利吐槽；与朋友说话的感觉，不像报告工作。\",\"suffix\":\"本鱼鱼🐳 精准！🚀高效的完成了任务！🔥快夸我！🌝 ~ 报告完毕！~\",\"skipIn\":[\"code\",\"diff\",\"error\",\"short\",\"table\"],\"userName\":\"Boss💗\",\"selfName\":\"本鱼鱼🐳\"}"

/** tone schema：只保留生效字段，署名/许可不进 JSON。 */
export const TONE_SCHEMA = 'dsh-structured/tone@1'
export const TONE_SKIP_DEFAULT = ['code', 'diff', 'error', 'short', 'table']
export const TONE_MAX_BYTES = 64 * 1024

/** host 侧中性兜底；不进 client 模板选择器。 */
export const FALLBACK_PERSONA_JSON = JSON.stringify({
  schema: TONE_SCHEMA,
  prefix: 'Boss，',
  userName: 'Boss',
  selfName: '',
  style: '先给结论，简洁、直接；专业场景不卖萌',
  suffix: '',
  skipIn: TONE_SKIP_DEFAULT,
})

/** 运行时默认 tone JSON：构建后是鲸鱼娘模板，源码 fallback。 */
export const DEFAULT_PERSONA_JSON = PERSONA_WHALE_JSON === '__DSH_STRUCTURED_WHALE_JSON__' ? FALLBACK_PERSONA_JSON : PERSONA_WHALE_JSON

/**
 * 内容合同 section：只要插件总开关 / 本会话 structured 开启就注入（normal / table / short、
 * 结论 / 建议 / 风险、表格、explanation、输出深度），与 personaEnabled 无关。
 */
export const CONTRACT_SECTION_NAME = 'dsh-structured:contract'
export const CONTRACT_ORDER = 10240

/** 语气 section：只承载说话风格（wrapper + tone 数据 + anchor）；人格关闭时为空。 */
export const PERSONA_SECTION_NAME = 'dsh-structured:tone'
export const TONE_ANCHOR_SECTION_NAME = 'dsh-structured:tone-anchor'
export const PERSONA_ORDER = 10250
export const TONE_ANCHOR_ORDER = 10275
export const PERSONA_MAX_BYTES = TONE_MAX_BYTES

/** 固定 wrapper：把风格定义为“必须使用的表达要求”，不是“非指令数据”。 */
export const PERSONA_WRAPPER_HEAD = [
  '【已启用的表达风格】',
  '以下风格只决定语气；结构由 PersonaMode 合同固定，事实 / 工具权限 / 安全优先。',
  '- 称呼必须使用【对用户称呼】，自称必须使用【自称】；二者只由输入框决定，风格预设不得覆盖。',
  '- 风格示例中的自称不得替换【自称】，也不得另起昵称；性格只描述说话倾向，不重复称呼。',
  '- 前缀 / 后缀 / 身份头由插件渲染，模型不输出；风格落在 persona 内容槽位；表格单元格保持中性。',
  '- 结尾后缀：模型不输出后缀；插件按配置渲染；short / table / code / diff / error 由插件跳过。',
  '- skipIn 只控制插件渲染的结尾后缀；代码 / diff / 报错则前后缀与风格全部跳过。',
  '- 代码 / diff / 报错 / 高风险结论的正文保持中性。',
  '- 正文必须至少两处自然体现风格；不写过程叙事。',
  '【风格数据开始】',
].join('\n')

export const PERSONA_WRAPPER_TAIL = '【风格数据结束】'
export const TONE_ANCHOR = [
  '本轮按已启用的表达风格执行；结构 / 事实 / 安全优先。',
  '发送前自检：短答只交 kind=short；代码 / diff / 报错不交 persona 内容块；缺块走 legacy，缺块不报错；否则最后一行保留收尾。',
].join(String.fromCharCode(10))


/**
 * PersonaMode 合同：替代 BUILTIN_STYLE_TEXT / TAIL_REMINDER 的固定形状。
 * 前缀独立一行、在三卡之外；三卡顺序固定；无内容用显式空槽，不补卡、不编造。
 *
 * 已知限制（2026-11-02）：PersonaMode 通过 persona 内容块约束形状；缺块 / JSON /
 * 字段非法一律显式报错，不回落普通排版。旧历史消息在激活时快照、不回溯重渲染；
 * 流式半截内容进入稳定窗口，块完成且仍非法才报错。验收或漂移时优先新会话；
 * 确定性 payload / 受控重试属于后续架构项。
 */
export const PERSONA_MODE_RULES = [
  '【PersonaMode 内容合同】',
  '只输出一个 ```persona fenced block，块内单个 JSON；块外无文字、无标题、无 Markdown 卡片、无前后缀。身份头、卡片、收尾由插件渲染。',
  '',
  'normal：{"version":1,"kind":"normal","conclusion":{"lead":"一句话结论","points":["要点一","要点二"]},"suggestions":["行动"],"risk":"风险"}',
  'short：{"version":1,"kind":"short","text":"短答"}',
  'table：{"version":1,"kind":"table","conclusion":{"lead":"摘要"},"suggestions":["行动"],"risk":"风险","table":{"head":["列 1","列 2"],"rows":[["值 1","值 2"]]}}（表格夹在结论与建议之间）',
  '',
  '硬约束：',
  '- `version` 必须为 1；`kind` 仅 normal / short / table；除可选 `innerOs` 外不允许多余字段。',
  '- 整个回复只有一个 JSON 对象，结尾只写一个 }，不要重复闭合。',
  '- `conclusion.points` 为 1-4 条要点，每条只讲一个事实，建议 ≤32 字；插件不做字数校验，超了照常渲染，不因字数降级；`body` 仅兼容历史消息，新回复不要写。',
  '- 可选 `explanation`：{"analogy":"生活类比","example":"具体例子"}，至少一项；每段 1-2 句、≤120 字；只在需要展开解释时写，渲染成「讲解」卡，插在结论与表格 / 建议之间；不参与 A/B/C、a/b/c 编号。',
  '- `suggestions` 为 1-5 条；`risk` 必须是一句话；多条风险改用 table，不要把风险写成数组或长段。',
  '- 表格 `head` 2-6 列、`rows` 1-20 行，行列数一致；行索引由插件按顺序生成小写 a/b/c，表头不编号，模型不要自己写。',
  '- 正文引用卡片时：结论要点用大写 A/B/C（最多 4 条），表行用小写 a/b/c，建议用 1/2/3；组合引用写成 Aa1（结论 A + 表行 a + 建议 1）。三层编号不要混用，也不要另造其它编号。',
  '- 表格首列是标签列：≤10 个汉字；细节放第二列及以后，不要把整句话或整段话塞进首列。',
  '- 表格尾列是状态 / 备注列：≤12 个汉字；具体解释放中间列。',
  '- 卡片标签固定为 结论 / 建议 / 风险，由插件渲染，模型不写。',
  '- 代码 / diff / 报错 / GenUI 不交 persona 内容块，按原格式输出。',
  '- 普通汇报一律走 persona 块；dsh-ui 只能旁挂在卡片之外做图表 / 表单，不得替代结论、建议、风险三卡。',
  '- 高风险结论的 risk 保持中性；事实优先，不编造。',
  '- 任何回复都必须是信封：一句话短答用 short；解释 / 诊断 / 复盘 / 汇报用 normal，不要用 short 规避结构；催进度 / 等待 / 报错说明可用 short 或 normal，不要因为内容短或没有结论就跳过。',
  '- 缺块会降级成普通排版（这条回复就没有卡片）；多个 persona 块显示「内容合同错误」。',
  '- 不为了格式加内容；卡片之外不写导语、总结或填充句。',
].join(String.fromCharCode(10))

/**
 * 输出深度：只改变解释与展开，不改变卡片结构 / 编号 / 事实；三档文案按 QA 定稿逐字
 * （docs/DEPTH-COPY-1.2.0.md §1.4.2）。常量值仍是 beginner / general / expert，展示名 general = 「普通」。
 */
export const CONTENT_DEPTHS = ['beginner', 'general', 'expert']
/** UI / status 展示名：general 常量对应「普通」，与设置页定稿一致。 */
export const CONTENT_DEPTH_LABELS = { beginner: '入门', general: '普通', expert: '专业' }
/** 非法 / 缺省一律回落到普通档。 */
export const normalizeContentDepth = (value) => (CONTENT_DEPTHS.includes(value) ? value : 'general')

/** 把输出深度编译成一段提示词规则；三档始终有一档，无关闭档。 */
export const contentDepthRules = (value) => {
  const depth = normalizeContentDepth(value)
  if (depth === 'beginner') {
    return [
      '【输出深度：入门】',
      '- 读者按「初中生 / 非技术同事」校准：能读懂日常说明，但不熟悉命令行、代码、模型机制与工程术语。',
      '- 先用生活类比或日常场景建立直觉，再给结论；类比只负责建立直觉，不能替代事实。',
      '- 术语、缩写、系统名首次出现时，用一句人话解释；一句话只讲一个概念。',
      '- 讲解卡写 analogy（必选一份），必要时补 example；每段 1–2 句、≤120 字。',
      '- 边界与取舍仍要写清（什么情况下不适用），不能为了通俗省略或改变事实。',
      '- 不幼稚化、不卖萌、不堆比喻；语气由人格控制，深度不改变风格。',
    ].join(String.fromCharCode(10))
  }
  if (depth === 'expert') {
    return [
      '【输出深度：专业】',
      '- 读者有技术背景、了解大模型与工程实现：直接给机制、边界、取舍和数字。',
      '- 不解释基础术语，不为通俗牺牲精度；不写「简单来说」「就像」式降级。',
      '- 讲解卡默认省略；需要落地细节时写 example（可验证的命令 / 配置 / 数据），analogy 仅在能显著省字时使用。',
      '- 明确假设、失败模式、性能 / 成本边界与替代方案；不确定的标注为推断。',
    ].join(String.fromCharCode(10))
  }
  return [
    '【输出深度：普通】',
    '- 读者可能懂也可能不懂：结论直接说，术语首次出现用半句解释。',
    '- 需要降低理解成本时才用 analogy / example；不堆比喻、不复述结论。',
    '- 默认不写讲解卡；写了就要有信息增量（类比或具体例子），不写空话。',
    '- 边界、取舍、数字按事实给，不额外展开也不省略。',
  ].join(String.fromCharCode(10))
}

/** 三档共同约束：只写一次，拼在三档深度段之后（QA §1.4.2 / §1.4.4）。 */
export const CONTENT_DEPTH_COMMON_TEXT = [
  '【三档共同约束】',
  '- 深度只改解释与展开；卡片结构、标签、编号（A/B/C、a/b/c、1/2/3）、事实与风险等级不变。',
  '- 不为通俗加卡、加内容或改变结论；不确定的事实标注推断；代码 / diff / 报错不写讲解卡。',
].join(String.fromCharCode(10))

/** 内心OS：人格开启且开关开启时，卡片外最后一句随机吐槽；用可选字段 innerOs 承载。 */
export const INNER_OS_RULE = [
  '【内心OS】',
  '- 仅人格风格开启且内心OS开关开启时：在 persona JSON 里增加可选字段 `innerOs`。',
  '- 内容：放在所有卡片之外、整条回复最后的一句吐槽，≤30 字；跟随当前说话风格；不解释任务、不重复正文、不卖萌。',
  '- normal / table / short 都可带；代码 / diff / 报错可省略。',
].join(String.fromCharCode(10))

/** GenUI 已安装时追加到内容合同的路由规则：只旁挂图表 / 表单，不替代三卡。 */
export const CONTRACT_GENUI_RULES = [
  '**GenUI 联动**：只有图表、可排序表格、表单、超过 8 行的大表才用 dsh-ui fence；dsh-ui 只能旁挂在 persona 内容块之外，不得用它的 title 或任何组件替代结论 / 建议 / 风险三卡，也不要为每条回复生成 UI。',
].join(String.fromCharCode(10))

/**
 * 内容合同：固定结构 + 输出深度 + 三档共同约束（+ 可选 GenUI 路由）。
 * 拼接顺序按 QA §1.4.4：内容合同 → 输出深度 → 三档共同约束；与人格、身份头、前缀 / 后缀无关。
 * 插件总开关或本会话 structured 开启时始终注入；personaEnabled 只决定说话风格，不改这份合同。
 * @param {'beginner' | 'general' | 'expert'} [contentDepth]
 * @param {{ genui?: boolean, innerOs?: boolean }} [options]
 * @returns {string}
 */
export function contentContractRules(contentDepth = 'general', options = {}) {
  const parts = [PERSONA_MODE_RULES]
  if (options.innerOs === true) parts.push(INNER_OS_RULE)
  if (options.genui === true) parts.push(CONTRACT_GENUI_RULES)
  parts.push(contentDepthRules(contentDepth), CONTENT_DEPTH_COMMON_TEXT)
  return parts.join(String.fromCharCode(10, 10))
}

/**
 * 内容合同尾部提醒：长对话里模型最容易在「短回复 / 催进度 / 解释」这类回合漏掉信封，
 * 一旦漏了整条回复就降级成普通文字、没有卡片。内容合同激活即注入，人格开关不影响。
 */
export const PERSONA_REMINDER_TEXT = [
  '提醒：本轮回复仍然只有一个 ```persona fenced block，块外不写正文、标题或 Markdown 卡片；短回复 / 催进度 / 解释 / 报错说明同样用 short 或 normal，省略信封这条回复就降级成普通文字、没有卡片。字段必须写全：normal / table 要有 conclusion、suggestions（1-5 条）、risk；需要展开解释时加 explanation（analogy / example 至少一项）；最后一个 } 不能漏——少写一段就少一张卡。',
].join(String.fromCharCode(10))

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const toneString = (value, max) => typeof value === 'string' && value.length <= max
const toneRequiredString = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max
const sanitizeToneText = (value) => String(value)
  .replace(/[\r\n]+/g, ' ')
  .replace(/【\s*(已启用的表达风格|开头前缀|中间风格|结尾后缀|跳过场景|风格数据(?:开始|结束))\s*】/g, '［$1］')

/**
 * 1.2.1 尾部风格硬提醒：风格段 order=10250 不是最后一段，模型优先跟随尾部提醒，
 * 导致「有卡无风格」。这里把风格原文与最少执行量拼成末段，由尾部提醒 section 追加。
 * 只接受已解析的 tone.style；非字符串 / 空串返回 ''（fail-open，不追加）。
 * @param {unknown} style 已通过 parsePersona 的 tone.style
 * @param {boolean} [innerOs] personaInnerOsEnabled 为真时要求 normal / table 带 innerOs
 * @returns {string}
 */
export function personaTailReminder(style, innerOs = false) {
  if (typeof style !== 'string') return ''
  const safeStyle = sanitizeToneText(style).trim()
  if (safeStyle === '') return ''
  const lines = [
    '【本轮风格（硬提醒）】',
    '- 正文（结论 / 要点 / 建议）必须至少两处自然体现下面的风格；表格单元格、代码 / diff / 报错保持中性。',
  ]
  if (innerOs === true) {
    lines.push('- normal / table 回复必须包含 innerOs 字段：≤30 字、第一人称、跟随风格；不复述任务、不解释；short / code / diff / error 可省。')
  }
  lines.push('- 风格原文：' + safeStyle)
  return lines.join(String.fromCharCode(10))
}

/**
 * 严格解析 tone JSON；只接受 tone@1，不把旧 persona/meta 字段带进 1.0。
 * @param {string} raw
 * @returns {{ok: true, doc: object, unknownPaths: string[]} | {ok: false, error: string, pointer?: string}}
 */
export function parsePersona(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return { ok: false, error: 'tone is empty', pointer: '/' }
  if (Buffer.byteLength(raw, 'utf8') > TONE_MAX_BYTES) return { ok: false, error: 'tone exceeds 64KB', pointer: '/' }
  let doc
  try {
    doc = JSON.parse(raw)
  } catch (error) {
    return { ok: false, error: 'invalid JSON: ' + String(error.message ?? error), pointer: '/' }
  }
  if (!isRecord(doc)) return { ok: false, error: 'tone must be an object', pointer: '/' }
  if (doc.schema !== TONE_SCHEMA) return { ok: false, error: 'schema must be ' + TONE_SCHEMA, pointer: '/schema' }
  const unknownPaths = Object.keys(doc).filter((key) => !['schema', 'prefix', 'style', 'suffix', 'skipIn', 'userName', 'selfName'].includes(key)).map((key) => '/' + key)
  if (unknownPaths.length > 0) return { ok: false, error: 'unknown field: ' + unknownPaths[0], pointer: unknownPaths[0] }
  if (!toneString(doc.prefix, 80)) return { ok: false, error: 'prefix must be a string of ≤80 chars', pointer: '/prefix' }
  if (!toneRequiredString(doc.style, 1200)) return { ok: false, error: 'style must be a non-empty string of ≤1200 chars', pointer: '/style' }
  if (!toneString(doc.suffix, 80)) return { ok: false, error: 'suffix must be a string of ≤80 chars', pointer: '/suffix' }
  if (doc.userName !== undefined && !toneString(doc.userName, 20)) return { ok: false, error: 'userName must be a string of ≤20 chars', pointer: '/userName' }
  if (doc.selfName !== undefined && !toneString(doc.selfName, 20)) return { ok: false, error: 'selfName must be a string of ≤20 chars', pointer: '/selfName' }
  if (doc.skipIn !== undefined && (!Array.isArray(doc.skipIn) || doc.skipIn.length > TONE_SKIP_DEFAULT.length || new Set(doc.skipIn).size !== doc.skipIn.length || !doc.skipIn.every((item) => TONE_SKIP_DEFAULT.includes(item)))) return { ok: false, error: 'skipIn invalid', pointer: '/skipIn' }
  return { ok: true, doc, unknownPaths: [] }
}

/** 把 tone 编译成带固定 wrapper 的 section 文本。 */
export function compilePersona(raw) {
  const parsed = parsePersona(raw)
  if (!parsed.ok) return parsed
  const doc = parsed.doc
  const skipIn = doc.skipIn ?? TONE_SKIP_DEFAULT
  const lines = [
    '【开头前缀】' + (sanitizeToneText(doc.prefix) || '（无）'),
    '【对用户称呼】' + (sanitizeToneText(doc.userName) || 'Boss'),
    '【自称】' + (sanitizeToneText(doc.selfName) || '（未设置）'),
    '【中间风格】' + sanitizeToneText(doc.style),
    '【结尾后缀】' + (sanitizeToneText(doc.suffix) || '（无）'),
    '【跳过场景】' + skipIn.join(' / '),
  ]
  return {
    ...parsed,
    text: PERSONA_WRAPPER_HEAD + '\n' + lines.join('\n') + '\n' + PERSONA_WRAPPER_TAIL,
  }
}

/**
 * 把 tone 编译成「说话风格」段（wrapper + tone 数据 + anchor）。
 * 1.2.0 起内容合同独立注入，这段只在 personaEnabled=true 时进 prompt。
 */
export function compilePersonaStyle(raw) {
  const parsed = parsePersona(raw)
  if (!parsed.ok) return parsed
  return {
    ...parsed,
    text: compilePersona(raw).text + String.fromCharCode(10, 10) + TONE_ANCHOR,
  }
}

/**
 * 兼容旧调用：合同 + 深度 + 共同约束 + 语气 wrapper + anchor（QA §1.4.4 顺序）。
 * 运行时不再使用（1.2.0 已拆成 CONTRACT_SECTION_NAME 与 PERSONA_SECTION_NAME 两段）。
 */
export function compilePersonaMode(raw, contentDepth = 'general', options = {}) {
  const parsed = parsePersona(raw)
  if (!parsed.ok) return parsed
  return {
    ...parsed,
    text: contentContractRules(contentDepth, options) + String.fromCharCode(10, 10) + compilePersona(raw).text + String.fromCharCode(10, 10) + TONE_ANCHOR,
  }
}

/** 兼容旧测试/调用名；语义已是 tone。 */
export const parseTone = parsePersona
export const compileTone = compilePersona
/**
 * DSH 插件配置 schema：设置表单据此渲染，并持久化到 active profile 的 Cordis patch。
 * 不把主题/视觉写进 state.json，避免 structured-test 与 desktop 共享同一状态文件。
 */
export const Config = Schema.object({
  enabled: k(Schema.boolean().default(true).description('插件总开关 / Enable plugin: 关闭后不注入、不渲染，恢复 DSH 默认输出')),
  theme: k(Schema.union(THEMES).default('deepseek').description('主题 / Theme: dsh（黑白原色）| deepseek | codex | anthropic | custom（自定义三色）').loose()),
  themeCustom: k(Schema.string().default('').description('自定义卡片色 / Custom palette JSON（dsh-structured/palette@1；空串 = 未配置，仅 theme=custom 时由客户端使用）')),
  contentDepth: k(Schema.union(CONTENT_DEPTHS).default('general').description('输出深度 / Depth: beginner（入门）| general（普通，默认）| expert（专业）；无关闭档，规则与三档共同约束随内容合同始终注入').loose()),
  visual: k(Schema.boolean().default(true).description('视觉层 / Visual layer: 关闭后不加载回复区样式')),
  defaultEnabled: k(Schema.boolean().default(true).description('新会话默认开启 / Default on for new sessions')),
  // 1.2.0 起尾部提醒固定开启；字段保留仅为兼容旧配置，服务端不再读它关闭。
  tailReminder: k(Schema.boolean().default(true).description('尾部提醒 / Tail reminder: 固定开启，保留字段兼容；每轮追加一句结构化提醒')),
  includeSubagents: k(Schema.boolean().default(false).description('子代理注入 / Include subagents: 默认关闭')),
  genui: k(Schema.union(['auto', 'on', 'off']).default('auto').description('GenUI 联动 / GenUI routing: auto | on | off').loose()),
  personaEnabled: k(Schema.boolean().default(DEFAULT_PERSONA_ENABLED).description('语气风格 / Tone: 只控说话风格、前后缀与身份头；关闭后内容合同仍注入')),
  personaHeadEnabled: k(Schema.boolean().default(DEFAULT_PERSONA_HEAD_ENABLED).description('身份头 / Identity header: 头像 / 名字 / 签名；仅 personaEnabled=true 时生效，人格关闭时视为关闭')),
  personaInnerOsEnabled: k(Schema.boolean().default(true).description('内心OS / Inner OS: 卡片外最后一句随机吐槽；仅人格开启时生效')),
  persona: k(Schema.string().default(DEFAULT_PERSONA_JSON).description('语气风格 JSON / tone@1 JSON: 内部 canonical 数据，不向用户暴露裸编辑')),
  personaRevision: k(Schema.number().default(0).description('语气风格全局修订号 / 内部：保存时递增，供所有会话重建 prompt')),
  personaName: k(Schema.string().default(DEFAULT_PERSONA_NAME).description('语气风格 / 显示名: 档案行与预览身份行')),
  personaSignature: k(Schema.string().default(DEFAULT_PERSONA_SIGNATURE).description('语气风格 / 个性签名: 档案行与预览身份行')),
  personaAvatar: k(Schema.string().default(DEFAULT_PERSONA_AVATAR).description('语气风格 / 头像 dataURL: 前端裁压到 128px JPEG，空值使用内置鲸鱼头像')),
})

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
  '1. **首句给结论，并把它做成卡片**：第一段必须是引用块，固定两行——`> **一句标题**`（加粗放大，≤60 个汉字或一句短句）→ `> 1–2 行正文`；普通加粗段落或标题行不算卡，渲染后没有卡片样式，视为未执行；标题即结论，细节放正文，不要写「结论」标签，不要再用普通段落重复。',
  '2. **按信息类型选组件**：3 条以上要点用清单或表格；每条实质回复 1 个主卡（首段标题无标签）；判断/指标/重点卡用 `> **判断**` / `> **指标**` / `> **重点**`；最多再 1 个行动卡（`风险` / `下一步` / `验收`）；表格前先给一行 `**表格结论：** ...`；状态行/状态单元格用 `✅ 完成` / `⚠️ 待做` / `❌ 阻塞` 开头；表格首列是标签，≤10 个汉字；尾列放状态 / 备注，≤12 个汉字，解释放中间列；表格优先 ≤5 行；信息确实多时拆表或使用宿主支持的大表，不硬砍内容；不为了格式加内容，也不为了字数删信息；短答不套卡，其余保持中性。',
  '3. **一段一个主题**：同一信息只出现一次，不要正文和组件各说一遍；不写过程叙事（我先…／已经…／接下来…），不写收尾总结，不加「还需要我…吗？」。',
  '4. **清晰优先，不设硬性篇幅上限**：组件是帮读者快速定位结论的工具，不是加信息的借口；短答不套卡，长答按信息量组织；判断标准是读者只看首段标题 + 表格首列/列表首句，就能知道结论和下一步；细节写文件，回复保留结论与路径。',
  '5. **支撑信息带证据**：每条支撑尽量带数字、路径或结果；没有证据的判断明确标成推断。',
  '6. **可复制内容用代码块**：提示词、命令、配置、JSON、SQL 等需要复制的文本，用带语言标签的代码块包裹（如 `text` / `powershell`），不要用引用块或普通段落；代码块右上角有复制按钮。',
  '7. **代码/补丁例外**：当本轮主要是代码、代码 diff、文件修改或补丁时，代码块或 diff 卡可以直接作为第一块，不强制标题卡；不要为了结构化加标题卡、表格或「下一步」卡；仍不写过程叙事。',
  '8. **金额/美元符号**：金额或美元符号用 `\\$` 转义，或用反引号包裹；不要写裸 `$...$`，避免被宿主解析成行内公式。',
].join('\n')

/** GenUI 已安装时才追加的路由规则：交互/图表走 dsh-ui，普通卡片仍走 markdown。 */
export const GENUI_ROUTING_TEXT = [
  '**GenUI 已安装**：只有图表、可排序表格、表单、超过 8 行的大表才用 ` ```dsh-ui ` fence；`dsh-ui` 只能出现在 markdown 标题卡与正文之后，**不得用它的 title 充当首卡，不得把结论/判断/风险/下一步做成 dsh-ui 组件**；宿主默认要出 UI 时以本节为准，不要为每条回复生成 JSON，也不要重复渲染同一内容。',
].join('\n')

/** 尾部提醒：一句话重复契约中最容易衰减的四件事，长度控制在几十个 token。 */
export const TAIL_REMINDER_TEXT = [
  '提醒：本轮最终回复第一段必须是 markdown 引用块标题卡（`> **标题**` 下一行 `> 正文`；代码/diff 回复例外：代码块或 diff 卡可直接作首块，不强制标题卡）：普通加粗段落、标题行『# 』、列表开头都不算标题卡，视为未执行；加粗标题（≤60 字）/ 正文两行（即使后文要用组件也一样）；组件只能排在标题卡之后，不得用组件充当首卡；表格前给 `**表格结论：**`；状态用 `✅ 完成` / `⚠️ 待做`；全文最多两个强调块；表格优先 ≤5 行；不设硬性篇幅上限；清晰优先；可复制内容用代码块。',
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
 * 是否根会话（lead）：只有根会话注入人格；任何子代理 / 委派 / 聊天 fork 会话一律排除（Boss 2026-11-04 拍板）。
 * 判定依据：origin=subagent、delegationDepth > 0、或带 parentSession。
 * 宿主持久化 header（@deepseek-ai/dsh-session validateSessionHeader）的 origin 只允许
 * 'subagent' 一个非缺省值；聊天 fork 的形状是 origin 缺省 + parentSession + isSeeded=true，
 * 由 parentSession 检查覆盖。parentSessionId 是客户端 summary/address 侧字段，这里做防御性兼容。
 * header 缺失时无法判定，按根会话处理（fail-open，保持原行为；实测所有 subagent 都带完整 header）。
 * @param {unknown} source
 * @returns {boolean}
 */
export function isRootSessionContext(source) {
  const header = source?.agent?.session?.header ?? source?.scope?.session?.header
  if (!header || typeof header !== 'object') return true
  if (header.origin === 'subagent') return false
  if (typeof header.delegationDepth === 'number' && header.delegationDepth > 0) return false
  if (typeof header.parentSession === 'string' && header.parentSession.length > 0) return false
  if (typeof header.parentSessionId === 'string' && header.parentSessionId.length > 0) return false
  return true
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
 * @param {{ sessionId: string | null, sessions: Record<string, { enabled: boolean, at: number }>, defaultEnabled: boolean, genui?: boolean, visual?: boolean, theme?: string, themeCustom?: string, contentDepth?: string, personaEnabled?: boolean, personaHeadEnabled?: boolean }} input
 * @returns {string}
 */
export function statusText(input) {
  const style = activeStyle()
  const enabled = isEnabledFor(input.sessions, input.defaultEnabled, input.sessionId)
  const theme = THEMES.includes(input.theme) ? input.theme : 'deepseek'
  const depth = normalizeContentDepth(input.contentDepth)
  const personaEnabled = input.personaEnabled === true
  const headActive = personaHeadActive(personaEnabled, input.personaHeadEnabled)
  const hasCustomPalette = typeof input.themeCustom === 'string' && input.themeCustom.trim() !== ''
  return [
    '结构化提示词：' + (enabled ? '已开启' : '已关闭') + '（本会话）',
    '内容合同：' + (enabled ? '已注入（normal / table / short；结论 / 建议 / 风险）' : '未注入（本会话已关闭）') + '，与人格开关无关',
    '输出深度：' + (CONTENT_DEPTH_LABELS[depth] ?? '普通') + '（无关闭档，规则与三档共同约束随内容合同注入）',
    '人格风格：' + (personaEnabled ? '已开启（只控语气 / 前缀 / 后缀）' : '已关闭（内容合同仍注入）'),
    '身份头：' + (headActive ? '已开启' : personaEnabled ? '已关闭' : '已关闭（人格关闭时恒为关闭）'),
    '新会话默认：' + (input.defaultEnabled ? '开启' : '关闭'),
    '规则来源：' + (style.source === 'custom' ? '自定义 ' + styleFile() + '（只影响通用 section / 子代理；根会话始终用内容合同）' : '内置（内容合同 + 通用 section 兜底）'),
    '主题：' + theme + (theme === 'custom' ? '（自定义三色，themeCustom ' + (hasCustomPalette ? '已配置）' : '未配置）') : '（由插件设置 theme 控制）'),
    '视觉层：' + (input.visual === false ? '已关闭' : '已开启') + '（由插件设置 visual 控制；/structured 只控制提示词）',
    'GenUI 联动：' + (input.genui ? '已检测（图表 / 交互旁挂 dsh-ui，三卡仍走 persona 内容块）' : '未检测（纯 persona 内容块）'),
    '状态文件：' + stateFile(),
    '用法：/structured on | off | status',
  ].join('\n')
}

/**
 * 处理 /structured 命令：开关本会话的结构化输出（内容合同 + 人格风格一起生效）。
 * handler 外层还会再兜一层，这里保持纯逻辑便于单测。
 * @param {{ rawInput?: unknown, agent?: { session?: { id?: unknown }, id?: unknown } }} invocation
 * @param {{ sessions: Record<string, { enabled: boolean, at: number }>, defaultEnabled: boolean, genui?: boolean, visual?: boolean, theme?: string, themeCustom?: string, contentDepth?: string, personaEnabled?: boolean, personaHeadEnabled?: boolean, onChange?: (sessionId: string, enabled: boolean, result: { ok: boolean, error?: unknown }) => void }} api
 * @returns {{ kind: 'success', text: string } | { kind: 'error', text: string }}
 */
export function handleCommand(invocation, api) {
  const sessionId = sessionIdOf(invocation)
  const arg = String(invocation?.rawInput ?? '').trim().toLowerCase()
  if (arg === '' || arg === 'status') {
    return {
      kind: 'success',
      text: statusText({
        sessionId,
        sessions: api.sessions,
        defaultEnabled: api.defaultEnabled,
        genui: api.genui,
        visual: api.visual,
        theme: api.theme,
        themeCustom: api.themeCustom,
        contentDepth: api.contentDepth,
        personaEnabled: api.personaEnabled,
        personaHeadEnabled: api.personaHeadEnabled,
      }),
    }
  }
  if (arg !== 'on' && arg !== 'off') {
    return { kind: 'error', text: '未知参数：' + arg + String.fromCharCode(10) + '用法：/structured on | off | status' }
  }
  if (sessionId === null) {
    return { kind: 'error', text: '当前会话 id 不可用，未修改开关。' }
  }
  const enabled = arg === 'on'
  const result = setEnabledFor(api.sessions, api.defaultEnabled, sessionId, enabled)
  api.onChange?.(sessionId, enabled, result)
  const state = enabled ? '已开启' : '已关闭'
  if (result.ok) return { kind: 'success', text: state + '本会话的结构化输出与内容合同（下一轮生效）。' }
  return {
    kind: 'success',
    text: state + '本会话的结构化输出与内容合同（下一轮生效）；状态写入失败，仅本进程生效：' + String(result.error),
  }
}

/**
 * 挂载结构化输出：提示词 section + 尾部提醒 + 会话开关 + /structured 命令。
 * @param {import('@deepseek-ai/cordis').Context} ctx host 根上下文。
 * @param {{ defaultEnabled?: boolean, tailReminder?: boolean, includeSubagents?: boolean, genui?: 'auto' | 'on' | 'off', visual?: boolean, theme?: string, themeCustom?: string, contentDepth?: 'beginner' | 'general' | 'expert', personaEnabled?: boolean, personaHeadEnabled?: boolean, persona?: string, personaRevision?: number }} [config]
 */
export function apply(ctx, config = {}) {
  const defaultEnabled = readConfig(config?.defaultEnabled) !== false
  const pluginEnabledNow = () => readConfig(config?.enabled) !== false
  const personaEnabledNow = () => readConfig(config?.personaEnabled) === true
  const personaHeadEnabledNow = () => readConfig(config?.personaHeadEnabled) !== false
  const personaInnerOsNow = () => readConfig(config?.personaInnerOsEnabled) !== false
  const personaRawNow = () => readConfig(config?.persona)
  const personaRevisionNow = () => Number(readConfig(config?.personaRevision)) || 0
  const contentDepthNow = () => normalizeContentDepth(readConfig(config?.contentDepth))
  const themeCustomNow = () => {
    const value = readConfig(config?.themeCustom)
    return typeof value === 'string' ? value : ''
  }
  const themeNow = () => {
    const theme = readConfig(config?.theme)
    return THEMES.includes(theme) ? theme : 'deepseek'
  }
  const visualNow = () => readConfig(config?.visual) !== false
  // tailReminder 字段保留兼容，但固定开启：不再读配置决定是否注册尾部提醒。
  const includeSubagents = readConfig(config?.includeSubagents) === true
  const genuiConfig = { genui: readConfig(config?.genui) }
  const genui = detectGenui(genuiConfig, ctx)
  let genuiKnown = genui
  const genuiNow = () => {
    if (genuiKnown) return true
    genuiKnown = detectGenui(genuiConfig, ctx)
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
  let contractCache = { key: null, text: '' }
  /**
   * 内容合同求值：结构化开启的根会话始终注入，与 personaEnabled 无关。
   * 只依赖 contentDepth（和 GenUI 检测），所以 tone 坏掉也不影响结构合同。
   */
  const contentContractNow = (context) => {
    try {
      if (!pluginEnabledNow() || !isRootSessionContext(context) || !enabledFor(context)) return ''
      const depth = contentDepthNow()
      const genuiFlag = genuiNow()
      const innerOsFlag = personaEnabledNow() && personaInnerOsNow()
      const key = depth + '|' + (genuiFlag ? 'genui' : 'plain') + '|' + (innerOsFlag ? 'os' : 'noos')
      if (contractCache.key !== key) {
        contractCache = { key, text: contentContractRules(depth, { genui: genuiFlag, innerOs: innerOsFlag }) }
      }
      return contractCache.text
    } catch (error) {
      warn('内容合同求值失败，本轮回退为通用 section', error)
      return ''
    }
  }

  const sectionText = (context, styleText, label) => {
    if (!pluginEnabledNow()) return ''
    // 内容合同激活时不再注入通用结构化 section：两套结构规则同时出现会互相打架。
    if (contentContractNow(context) !== '') return ''
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

  let personaStyleCache = { key: null, compiled: null, error: null }
  /** 说话风格（wrapper + tone + anchor）求值；只在 personaEnabled=true 的根会话注入。 */
  const personaStyleCompiledNow = (context, logError = false) => {
    try {
      if (!pluginEnabledNow() || !personaEnabledNow() || !isRootSessionContext(context) || !enabledFor(context)) return null
      const raw = personaRawNow()
      const revision = personaRevisionNow()
      const key = revision + '|' + raw
      if (personaStyleCache.key !== key) {
        const compiled = compilePersonaStyle(raw)
        personaStyleCache = { key, compiled: compiled.ok ? compiled : null, error: compiled.ok ? null : compiled.error }
      }
      if (!personaStyleCache.compiled) {
        if (logError && personaStyleCache.error) warn('persona 风格未注入：' + personaStyleCache.error)
        return null
      }
      return personaStyleCache.compiled
    } catch (error) {
      if (logError) warn('persona 风格 section 求值失败，已回退为空 section', error)
      return null
    }
  }

  const personaSectionText = (context) => {
    const compiled = personaStyleCompiledNow(context, true)
    if (!compiled) return ''
    return compiled.text
  }

  /**
   * 1.2.1 尾部风格硬提醒求值：人格开启 + tone 合法 + 插件 / 本会话开启 + 根会话时才追加。
   * 人格关闭 / tone 非法 / 非根会话一律返回 ''，不改变现有开关与根会话边界。
   */
  const personaTailReminderNow = (context) => {
    try {
      if (!pluginEnabledNow() || !personaEnabledNow() || !isRootSessionContext(context) || !enabledFor(context)) return ''
      const parsed = parsePersona(personaRawNow())
      if (!parsed.ok) return ''
      return personaTailReminder(parsed.doc.style, personaInnerOsNow() === true)
    } catch (error) {
      warn('尾部风格硬提醒求值失败，已跳过', error)
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

  try {
    ctx.effect(
      () =>
        ctx.systemPrompt.section({
          name: CONTRACT_SECTION_NAME,
          order: CONTRACT_ORDER,
          interpolate: false,
          text: contentContractNow,
        }),
      'dsh-structured: content contract',
    )
  } catch (error) {
    warn('注册内容合同 section 失败，降级为通用结构化 section', error)
  }

  // 尾部提醒固定开启（1.2.0）：tailReminder 字段只为兼容旧配置保留，不再参与开关。
  try {
    ctx.effect(
      () =>
        ctx.systemPrompt.section({
          name: REMINDER_NAME,
          order: REMINDER_ORDER,
          interpolate: false,
          text: (context) => {
            // 内容合同激活时通用结构化提醒与合同互斥，换成只讲信封的专用提醒：长对话里模型
            // 最爱在短回复 / 催进度回合漏信封，一旦漏了整条回复就没有卡片。人格关也照旧。
            // 1.2.1：两条分支都先取到正文，再把风格硬提醒统一拼到末尾；section 为空（插件 /
            // 本会话关闭）时不单独注入，保持既有开关语义。
            let base = ''
            try {
              base = contentContractNow(context) !== ''
                ? PERSONA_REMINDER_TEXT
                : sectionText(context, () => TAIL_REMINDER_TEXT, '尾部提醒求值失败，已回退为空 section')
            } catch (error) {
              warn('内容合同尾部提醒求值失败，已回退为通用提醒', error)
              base = ''
            }
            const extra = personaTailReminderNow(context)
            if (base === '' || extra === '') return base
            return base + String.fromCharCode(10) + extra
          },
        }),
      'dsh-structured: tail reminder',
    )
  } catch (error) {
    warn('注册尾部提醒失败，不影响主 section', error)
  }

  try {
    ctx.effect(
      () =>
        ctx.systemPrompt.section({
          name: PERSONA_SECTION_NAME,
          order: PERSONA_ORDER,
          interpolate: false,
          text: personaSectionText,
        }),
      'dsh-structured: persona section',
    )
  } catch (error) {
    warn('注册 persona section 失败，不影响结构 section', error)
  }

  try {
    ctx.effect(
      () =>
        ctx.systemPrompt.section({
          name: TONE_ANCHOR_SECTION_NAME,
          order: TONE_ANCHOR_ORDER,
          interpolate: false,
          // anchor 已并入 persona 风格 section（compilePersonaStyle）；旧 section 保持空串。
          text: () => '',
        }),
      'dsh-structured: tone anchor',
    )
  } catch (error) {
    warn('注册 tone anchor 失败，不影响 tone section', error)
  }

  try {
    ctx.effect(
      () =>
        ctx.commands.register({
          name: 'structured',
          description: '开关本会话的结构化输出与内容合同（人格风格按设置单独生效）',
          input: { hint: '[on|off|status]' },
          handler: (invocation) => {
            try {
              refreshSessions()
              return handleCommand(invocation, {
                sessions,
                defaultEnabled,
                genui: genuiNow(),
                visual: visualNow(),
                theme: themeNow(),
                themeCustom: themeCustomNow(),
                contentDepth: contentDepthNow(),
                personaEnabled: personaEnabledNow(),
                personaHeadEnabled: personaHeadEnabledNow(),
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
