import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
  BUILTIN_STYLE_TEXT,
  Config,
  GENUI_ROUTING_TEXT,
  MAX_SESSION_ENTRIES,
  TAIL_REMINDER_TEXT,
  activeStyle,
  apply,
  detectGenui,
  handleCommand,
  isEnabledFor,
  isSubagentContext,
  loadSessions,
  pruneSessions,
  safeSectionText,
  saveSessions,
  sessionIdOf,
  setEnabledFor,
  stateFile,
  statusText,
  styleFile,
} from '../src/index.js'
import { classify, firstScreenStructured } from '../scripts/measure-prose.mjs'

function isolate() {
  const home = mkdtempSync(join(tmpdir(), 'dsh-structured-test-'))
  const saved = { dir: process.env.DSH_PROFILE_DIR, profile: process.env.DSH_PROFILE }
  process.env.DSH_HOME = home
  delete process.env.DSH_PROFILE_DIR
  delete process.env.DSH_PROFILE
  return {
    home,
    cleanup: () => {
      if (saved.dir === undefined) delete process.env.DSH_PROFILE_DIR
      else process.env.DSH_PROFILE_DIR = saved.dir
      if (saved.profile === undefined) delete process.env.DSH_PROFILE
      else process.env.DSH_PROFILE = saved.profile
      rmSync(home, { recursive: true, force: true })
    },
  }
}

function mainContext(sessionId) {
  return { agent: { id: sessionId, session: { id: sessionId, header: { delegationDepth: 0 } } } }
}

function fakeCtx() {
  const sections = []
  const commands = []
  const warnings = []
  const ctx = {
    logger: { warn: (...args) => warnings.push(args) },
    effect: (fn) => {
      const disposer = fn()
      return typeof disposer === 'function' ? disposer : () => {}
    },
    systemPrompt: {
      section: (section) => {
        sections.push(section)
        return () => {}
      },
      getSectionOrder: () => 9900,
    },
    commands: {
      register: (definition) => {
        commands.push(definition)
        return () => {}
      },
    },
  }
  return { ctx, sections, commands, warnings }
}

test('内置规则覆盖首句结论、组件、清晰度三件事', () => {
  assert.match(BUILTIN_STYLE_TEXT, /首句给结论/)
  assert.match(BUILTIN_STYLE_TEXT, /清单或表格/)
  assert.match(BUILTIN_STYLE_TEXT, /标题即结论/)
  assert.match(BUILTIN_STYLE_TEXT, /表格优先 ≤5 行/)
  assert.match(BUILTIN_STYLE_TEXT, /不设硬性篇幅上限/)
  assert.match(BUILTIN_STYLE_TEXT, /不为了字数删信息/)
  assert.match(BUILTIN_STYLE_TEXT, /过程叙事/)
  assert.match(BUILTIN_STYLE_TEXT, /推断/)
  assert.match(BUILTIN_STYLE_TEXT, /短答不套卡/)
  assert.match(BUILTIN_STYLE_TEXT, /代码\/补丁例外/)
  assert.match(BUILTIN_STYLE_TEXT, /不强制标题卡/)
  assert.match(TAIL_REMINDER_TEXT, /代码\/diff 回复例外/)
  assert.doesNotMatch(BUILTIN_STYLE_TEXT, /500\s*字|≤\s*500|字数上限/)
  assert.match(BUILTIN_STYLE_TEXT, /可复制内容用代码块/)
  assert.match(TAIL_REMINDER_TEXT, /加粗标题/)
  assert.match(TAIL_REMINDER_TEXT, /清晰优先/)
  assert.doesNotMatch(TAIL_REMINDER_TEXT, /500\s*字|≤\s*500|字数上限/)
  assert.match(BUILTIN_STYLE_TEXT, /判断/)
  assert.match(BUILTIN_STYLE_TEXT, /指标/)
  assert.match(BUILTIN_STYLE_TEXT, /风险/)
  assert.match(BUILTIN_STYLE_TEXT, /下一步/)
  assert.match(BUILTIN_STYLE_TEXT, /✅ 完成/)
  assert.match(GENUI_ROUTING_TEXT, /dsh-ui/)
  assert.match(TAIL_REMINDER_TEXT, /即使后文要用组件也一样/)
  assert.match(TAIL_REMINDER_TEXT, /不得用组件充当首卡/)
  assert.match(GENUI_ROUTING_TEXT, /不得用它的 title 充当首卡/)
  assert.match(GENUI_ROUTING_TEXT, /以本节为准/)
})

test('detectGenui：profile 清单不再作为 auto 依据，config 可强制', () => {
  const box = isolate()
  try {
    const profileDir = join(box.home, 'profiles', 'test')
    mkdirSync(profileDir, { recursive: true })
    writeFileSync(
      join(profileDir, 'package.json'),
      JSON.stringify({ dependencies: { '@changfenhuang/dsh-genui': '0.13.0' } }),
      'utf8',
    )
    process.env.DSH_PROFILE = 'test'
    assert.equal(detectGenui({}), false)
    assert.equal(detectGenui({ genui: 'off' }), false)
    assert.equal(detectGenui({ genui: 'on' }), true)
    assert.equal(detectGenui({ genui: 'auto' }), false)
  } finally {
    box.cleanup()
  }
})

test('detectGenui：clientModules 实时图优先', () => {
  const ctx = {
    get: (name) =>
      name === 'clientModules'
        ? { clientPath: (id) => (id === 'genui' ? '/plugins/genui/client.js' : undefined) }
        : undefined,
  }
  assert.equal(detectGenui({}, ctx), true)
  assert.equal(detectGenui({ genui: 'off' }, ctx), false)
})

test('statusText 显示 GenUI 联动状态', () => {
  const box = isolate()
  try {
    const sessions = {}
    assert.match(
      statusText({ sessionId: 'session-a', sessions, defaultEnabled: true, genui: true }).toString(),
      /GenUI 联动：已检测/,
    )
    assert.match(
      statusText({ sessionId: 'session-a', sessions, defaultEnabled: true, genui: false }),
      /GenUI 联动：未检测/,
    )
  } finally {
    box.cleanup()
  }
})

test('Config：visual 默认开启，且可显式关闭', () => {
  const value = (x) => (x && typeof x.get === 'function' ? x.get() : x)
  const defaults = Config({})
  assert.equal(value(defaults.visual), true)
  assert.equal(value(defaults.defaultEnabled), true)
  assert.equal(value(defaults.tailReminder), true)
  assert.equal(value(defaults.includeSubagents), false)
  assert.equal(value(defaults.genui), 'auto')
  assert.equal(value(Config({ visual: false }).visual), false)
  assert.equal(value(Config({ defaultEnabled: false }).defaultEnabled), false)
  assert.match(
    statusText({ sessionId: 'session-a', sessions: {}, defaultEnabled: true, visual: false }),
    /视觉层：已关闭/,
  )
})

test('无状态文件时按默认值开启', () => {
  const box = isolate()
  try {
    assert.deepEqual(loadSessions(), {})
    assert.equal(isEnabledFor({}, true, 'session-a'), true)
    assert.equal(isEnabledFor({}, false, 'session-a'), false)
    assert.equal(isEnabledFor({ 'session-a': { enabled: false, at: 1 } }, true, 'session-a'), false)
  } finally {
    box.cleanup()
  }
})

test('会话开关原子落盘并可重新读取', () => {
  const box = isolate()
  try {
    const sessions = {}
    const result = setEnabledFor(sessions, true, 'session-a', false)
    assert.equal(result.ok, true)
    assert.equal(existsSync(stateFile()), true)
    assert.equal(loadSessions()['session-a'].enabled, false)
    const leftovers = readdirSync(join(box.home, 'dsh-structured')).filter((name) => name.includes('.tmp-'))
    assert.deepEqual(leftovers, [])
  } finally {
    box.cleanup()
  }
})

test('apply：外部修改 state.json 下一轮生效', () => {
  const box = isolate()
  try {
    const { ctx, sections } = fakeCtx()
    apply(ctx, { defaultEnabled: true })
    const context = mainContext('session-live')
    assert.match(sections[0].text(context), /首句给结论/)
    const result = saveSessions({ 'session-live': { enabled: false, at: Date.now() } }, true)
    assert.equal(result.ok, true)
    assert.equal(sections[0].text(context), '')
  } finally {
    box.cleanup()
  }
})

test('状态文件损坏时回落为空会话表而不是抛错', () => {
  const box = isolate()
  try {
    const sessions = {}
    setEnabledFor(sessions, true, 'session-a', false)
    writeFileSync(stateFile(), '{not json', 'utf8')
    assert.deepEqual(loadSessions(), {})
  } finally {
    box.cleanup()
  }
})

test('状态写入失败不抛错，只返回失败', () => {
  const box = isolate()
  try {
    // 把状态文件路径占成目录，mkdir 会失败，从而模拟写盘失败。
    const file = stateFile()
    mkdirSync(file, { recursive: true })
    const result = setEnabledFor({}, true, 'session-a', true)
    assert.equal(result.ok, false)
    assert.ok(result.error)
  } finally {
    box.cleanup()
  }
})

test('会话表有界且优先保留显式翻转', () => {
  const sessions = {}
  for (let i = 0; i < MAX_SESSION_ENTRIES + 10; i++) {
    sessions['session-' + i] = { enabled: i === 0 ? false : true, at: i }
  }
  const pruned = pruneSessions(sessions, true)
  assert.equal(Object.keys(pruned).length, MAX_SESSION_ENTRIES)
  assert.equal(pruned['session-0'].enabled, false)
})

test('style.md 非空时整份覆盖内置文本，空文件回落内置', () => {
  const box = isolate()
  try {
    assert.equal(activeStyle().source, 'built-in')
    mkdirSync(join(box.home, 'dsh-structured'), { recursive: true })
    writeFileSync(styleFile(), '# 我的规则\n只写两行。\n', 'utf8')
    const custom = activeStyle()
    assert.equal(custom.source, 'custom')
    assert.equal(custom.text, '# 我的规则\n只写两行。')
    writeFileSync(styleFile(), '   \n', 'utf8')
    assert.equal(activeStyle().source, 'built-in')
    assert.equal(activeStyle().text, BUILTIN_STYLE_TEXT)
  } finally {
    box.cleanup()
  }
})

test('会话 id 解析覆盖 agent.session.id / agent.id / 缺失', () => {
  assert.equal(sessionIdOf({ agent: { session: { id: 'session-a' } } }), 'session-a')
  assert.equal(sessionIdOf({ agent: { id: 'session-b' } }), 'session-b')
  assert.equal(sessionIdOf({ scope: { id: 'session-c' } }), 'session-c')
  assert.equal(sessionIdOf({}), null)
  assert.equal(sessionIdOf(undefined), null)
})

test('子代理会话识别：origin / delegationDepth；用户 fork 不跳过', () => {
  assert.equal(isSubagentContext({ agent: { session: { header: { origin: 'subagent' } } } }), true)
  assert.equal(isSubagentContext({ agent: { session: { header: { parentSession: 'session-parent' } } } }), false)
  assert.equal(isSubagentContext({ agent: { session: { header: { delegationDepth: 2 } } } }), true)
  assert.equal(isSubagentContext({ agent: { session: { header: { delegationDepth: 0 } } } }), false)
  assert.equal(isSubagentContext({}), false)
})

test('fail-open：section 求值异常时返回空串并回调错误', () => {
  let reported = null
  const text = safeSectionText({
    enabled: true,
    eligible: true,
    styleText: () => {
      throw new Error('boom')
    },
    onError: (error) => {
      reported = error
    },
  })
  assert.equal(text, '')
  assert.match(String(reported), /boom/)
  assert.equal(safeSectionText({ enabled: false, eligible: true, styleText: () => 'x' }), '')
  assert.equal(safeSectionText({ enabled: true, eligible: false, styleText: () => 'x' }), '')
})

test('命令：status / on / off / 未知参数 / 无会话 id', () => {
  const box = isolate()
  try {
    const sessions = {}
    const api = { sessions, defaultEnabled: true }
    const status = handleCommand({ agent: { id: 'session-a' }, rawInput: 'status' }, api)
    assert.equal(status.kind, 'success')
    assert.match(status.text, /已开启（本会话）/)

    const off = handleCommand({ agent: { id: 'session-a' }, rawInput: 'off' }, api)
    assert.equal(off.kind, 'success')
    assert.match(off.text, /已关闭/)
    assert.equal(isEnabledFor(sessions, true, 'session-a'), false)
    assert.equal(loadSessions()['session-a'].enabled, false)

    const on = handleCommand({ agent: { id: 'session-a' }, rawInput: 'on' }, api)
    assert.equal(on.kind, 'success')
    assert.equal(isEnabledFor(sessions, true, 'session-a'), true)

    const bad = handleCommand({ agent: { id: 'session-a' }, rawInput: 'maybe' }, api)
    assert.equal(bad.kind, 'error')
    assert.match(bad.text, /未知参数/)

    const noSession = handleCommand({ rawInput: 'off' }, api)
    assert.equal(noSession.kind, 'error')
  } finally {
    box.cleanup()
  }
})

test('apply：注册主 section 与尾部提醒，按会话开关求值', () => {
  const box = isolate()
  try {
    const { ctx, sections, commands } = fakeCtx()
    apply(ctx, { defaultEnabled: true })
    assert.equal(sections.length, 2)
    assert.equal(sections[0].name, 'dsh-structured:style')
    assert.equal(sections[1].name, 'dsh-structured:reminder')

    const a = mainContext('session-a')
    assert.match(sections[0].text(a), /首句给结论/)
    assert.match(sections[1].text(a), /加粗标题/)

    const off = commands[0].handler({ agent: { id: 'session-a' }, rawInput: 'off' })
    assert.equal(off.kind, 'success')
    assert.equal(sections[0].text(a), '')
    assert.equal(sections[1].text(a), '')

    // 另一个会话不受影响。
    assert.match(sections[0].text(mainContext('session-b')), /首句给结论/)

    // 子代理默认不注入。
    const sub = { agent: { id: 'uuid-sub', session: { id: 'uuid-sub', header: { origin: 'subagent' } } } }
    assert.equal(sections[0].text(sub), '')
  } finally {
    box.cleanup()
  }
})

test('fail-open：上下文 getter 抛错时 section 返回空串而不是打断组装', () => {
  const box = isolate()
  try {
    const { ctx, sections } = fakeCtx()
    apply(ctx, { defaultEnabled: true })
    const evil = {
      get agent() {
        throw new Error('getter boom')
      },
    }
    assert.doesNotThrow(() => sections[0].text(evil))
    assert.equal(sections[0].text(evil), '')
    assert.equal(sections[1].text(evil), '')
  } finally {
    box.cleanup()
  }
})

test('apply：注册失败不抛出，降级为不注入', () => {  const box = isolate()
  try {
    const { ctx } = fakeCtx()
    ctx.systemPrompt.section = () => {
      throw new Error('duplicate section')
    }
    ctx.commands.register = () => {
      throw new Error('duplicate command')
    }
    assert.doesNotThrow(() => apply(ctx, { defaultEnabled: true }))
  } finally {
    box.cleanup()
  }
})

test('apply：展开配置尾部提醒 + 子代理注入', () => {
  const box = isolate()
  try {
    const { ctx, sections } = fakeCtx()
    apply(ctx, { defaultEnabled: false, tailReminder: false, includeSubagents: true })
    assert.equal(sections.length, 1)
    const sub = { agent: { id: 'uuid-sub', session: { id: 'uuid-sub', header: { origin: 'subagent' } } } }
    // defaultEnabled=false 时子代理也不注入；关键是没有因配置组合而抛错。
    assert.equal(sections[0].text(sub), '')
  } finally {
    box.cleanup()
  }
})

test('散文率分类器：表格/清单算结构化，长散文算违规', () => {
  const structured = '结论：先做 A。\n\n| 项 | 取舍 |\n| --- | --- |\n| A | 快 |\n| B | 稳 |'
  assert.equal(classify(structured).structured, true)
  assert.equal(classify(structured).prose, false)

  const list = '先给结论。\n\n- 第一点，带一个数字 42。\n- 第二点，带一个路径 G:\\x。\n- 第三点，带一个结果。'
  assert.equal(classify(list).structured, true)

  const prose =
    '先做 A，因为 A 的路径更短。然后做 B，因为 B 可以回滚。最后做 C，因为 C 能覆盖异常情况。' +
    '这三步按顺序执行，每一步都要留记录，避免后面无法定位问题。整套流程大约需要十分钟，做完之后再做一次检查。' +
    '检查内容包括日志、返回码和残留文件，任何一项不符合预期都要回退到上一步重新执行，直到全部通过为止。'
  assert.equal(classify(prose).substantive, true)
  assert.equal(classify(prose).prose, true)
})

test('散文率分类器：首屏卡片算结构化', () => {
  const card =
    '> **Phase 1 完成，Phase 2 前 4 项已落地**\n' +
    '> 28/28 测试通过，卡片与表格样式已装进 desktop。下一步跑 12 条验收，再做明暗和窄屏回归，最后整理截图并发布。'
  assert.equal(firstScreenStructured(card), true)
  assert.equal(classify(card).structured, true)
  assert.equal(classify(card).prose, false)
})

test('首屏口径：结构出现在 300 字符之后不算首屏结构化', () => {
  const late = '这是一段很长的解释。'.repeat(40) + '\n\n- 第一点\n- 第二点\n'
  assert.equal(firstScreenStructured(late, 300), false)
  assert.equal(firstScreenStructured(late, 2000), true)
  assert.equal(classify(late).structured, false)
  assert.equal(classify(late, { whole: true }).structured, true)
})

test('apply：没有 commands 服务时注入照常工作', () => {
  const box = isolate()
  try {
    const sections = []
    const ctx = {
      logger: { warn: () => {} },
      effect: (fn) => {
        const disposer = fn()
        return typeof disposer === 'function' ? disposer : () => {}
      },
      systemPrompt: {
        section: (section) => {
          sections.push(section)
          return () => {}
        },
        getSectionOrder: () => 9900,
      },
    }
    assert.doesNotThrow(() => apply(ctx, { defaultEnabled: true }))
    assert.equal(sections.length, 2)
    assert.match(sections[0].text(mainContext('session-a')), /首句给结论/)
  } finally {
    box.cleanup()
  }
})

test('apply：getSectionOrder 抛错时回落 9900 且不抛', () => {
  const box = isolate()
  try {
    const { ctx, sections } = fakeCtx()
    ctx.systemPrompt.getSectionOrder = () => {
      throw new Error('unknown order')
    }
    apply(ctx, { defaultEnabled: true })
    assert.equal(sections[0].order, 9900)
    assert.equal(sections[1].order, 10300)
  } finally {
    box.cleanup()
  }
})

test('apply：includeSubagents=true 时子代理也注入', () => {
  const box = isolate()
  try {
    const { ctx, sections } = fakeCtx()
    apply(ctx, { defaultEnabled: true, includeSubagents: true })
    const sub = { agent: { id: 'uuid-sub', session: { id: 'uuid-sub', header: { origin: 'subagent' } } } }
    assert.match(sections[0].text(sub), /首句给结论/)
  } finally {
    box.cleanup()
  }
})

test('apply：genui=on 时注入 dsh-ui 路由，off 时不注入', () => {  const box = isolate()
  try {
    const on = fakeCtx()
    apply(on.ctx, { defaultEnabled: true, genui: 'on' })
    assert.match(on.sections[0].text(mainContext('session-a')), /dsh-ui/)

    const off = fakeCtx()
    apply(off.ctx, { defaultEnabled: true, genui: 'off' })
    assert.doesNotMatch(off.sections[0].text(mainContext('session-a')), /dsh-ui/)
  } finally {
    box.cleanup()
  }
})

test('apply：clientModules 检测到 GenUI 时自动追加 dsh-ui', () => {
  const box = isolate()
  try {
    const { ctx, sections } = fakeCtx()
    ctx.get = (name) =>
      name === 'clientModules'
        ? { clientPath: (id) => (id === 'genui' ? '/plugins/genui/client.js' : undefined) }
        : undefined
    apply(ctx, { defaultEnabled: true, genui: 'auto' })
    assert.match(sections[0].text(mainContext('session-a')), /dsh-ui/)
  } finally {
    box.cleanup()
  }
})

test('client：卡片类型与归属标记存在', () => {
  const client = readFileSync('src/client.js', 'utf8')
  assert.match(client, /data-dsh-structured-card-type/)
  assert.match(client, /CARD_TYPES/)
  assert.doesNotMatch(client, /--ds-card-icon/)
  for (const label of ['判断', '指标', '风险', '下一步', '验收', '重点']) {
    assert.match(client, new RegExp(label))
  }
})

test('client：0.9.6 第一眼样式锚点', () => {
  const client = readFileSync('src/client.js', 'utf8')
  assert.match(client, /blockquote\[\$\{CARD_TYPE_ATTR\}="statement"\][^}]*strong:first-child\{[^}]*font-size:24px/s)
  assert.match(client, /blockquote\[\$\{CARD_TYPE_ATTR\}="next"\][^}]*strong:first-child\{[^}]*font-size:16px/s)
  assert.match(client, /font-size:12\.5px/)
  assert.match(client, /font-size:13\.5px/)
  assert.match(client, /font-size:10px/)
  assert.match(client, /table:not\(\[\$\{SKIP_ATTR\}\]\) thead th\{[^}]*height:38px/s)
  assert.match(client, /table:not\(\[\$\{SKIP_ATTR\}\]\) thead th\{[^}]*font-size:13px/s)
  assert.match(client, /p\[\$\{LEAD_ATTR\}="table"\]\{[^}]*border:0;[^}]*font-size:13px/s)
  assert.match(client, /blockquote\[\$\{CARD_TYPE_ATTR\}="next"\]\{[^}]*border-top:1px solid var\(--ds-border\)/s)
  assert.match(client, /border-left:9px solid #C2410C/)
  assert.match(client, /border-left-color:#FB923C/)
})

test('client：视觉层可由 configForms 的 visual 设置关闭', () => {
  const client = readFileSync('src/client.js', 'utf8')
  assert.match(client, /configForms/)
  assert.match(client, /getSnapshot/)
  assert.match(client, /readValue\(value\.visual\) !== false/)
  assert.match(client, /applyVisual/)
  assert.doesNotMatch(client, /state\.json/)
})

test('构建产物 lib/index.js 与 lib/client.js 均 = banner + src', () => {
  const hostSrc = readFileSync('src/index.js', 'utf8')
  const hostLib = readFileSync('lib/index.js', 'utf8')
  const hostLines = hostLib.split('\n')
  assert.match(hostLines[0], /^\/\/ Generated from src\/index\.js/)
  assert.equal(hostLines.slice(2).join('\n'), hostSrc)

  const clientSrc = readFileSync('src/client.js', 'utf8')
  const clientLib = readFileSync('lib/client.js', 'utf8')
  const clientLines = clientLib.split('\n')
  assert.match(clientLines[0], /^\/\/ Generated from src\/client\.js/)
  assert.equal(clientLines.slice(2).join('\n'), clientSrc)
})

test('仓库边界：不 append 消息、不碰 pre-step / 工具服务、files 含 patch', () => {
  const source = readFileSync('src/index.js', 'utf8')
  // 注释里解释「刻意不做 pre-step」不算违规，只看可执行代码。
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  assert.doesNotMatch(code, /agent\/pre-step/)
  assert.doesNotMatch(code, /messages\s*\.\s*(push|splice|append)/)
  assert.doesNotMatch(code, /ctx\.tools/)
  assert.doesNotMatch(code, /toolRuntime/)
  assert.match(code, /export const inject = \['systemPrompt'\]/)
  assert.doesNotMatch(code, /inject = \[[^\]]*'commands'/)
  assert.match(code, /interpolate: false/)

  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
  assert.ok(pkg.files.includes('cordis.patch.yml'))
  assert.ok(pkg.files.includes('lib'))
  assert.equal(pkg.dsh.client.platform, 'web')
  assert.equal(pkg.exports['./client'], './lib/client.js')
  assert.match(pkg.engines.dsh, /0\.1\.7-rc\.2/)
  assert.equal(pkg.engines.dsh, '>=0.1.7-rc.2 <0.4.0-0')
  assert.equal(pkg.dsh.compatibility.dshReleases['0.2.1-rc.2'], 'compatible')
  assert.equal(pkg.dsh.compatibility.dshReleases['0.2.1-rc.3'], 'compatible')
  assert.equal(pkg.dsh.compatibility.dshReleases['0.3.0-rc.1'], 'compatible')
  assert.ok(existsSync('cordis.patch.yml'))
  assert.ok(existsSync('lib/client.js'))
})
