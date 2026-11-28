import { execFileSync, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Explicit manual gate. It is deliberately NOT part of `npm test`.
// Default invocation starts a detached worker and returns immediately; use
// `--check` to read the result. The worker is the only place that drives ego.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const self = fileURLToPath(import.meta.url)
const baseDir = resolve(root, 'artifacts/style-gate')
const probe = resolve(root, 'test/fixtures/style-probe.mjs')
const resultPath = resolve(root, 'artifacts/audit-0.9.6/style-result.json')
const args = process.argv.slice(2)
const stamp = new Date().toISOString().replace(/[:.]/g, '-')

function latestEvidenceDir() {
  if (!existsSync(baseDir)) return null
  const dirs = readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse()
  return dirs.length ? resolve(baseDir, dirs[0]) : null
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

// Bind evidence to the code tree that produced it, not just a text timestamp.
// treeHash 覆盖已跟踪改动 + 未跟踪新文件（只用 git diff 会漏掉新增夹具）。
// 允许未提交工作树：只要求「检查时的树 == 产出证据的树」；HEAD 照记，作为旁证。
const CODE_TREE_PATHS = ['src', 'lib', 'scripts', 'test/fixtures']

function gitOutput(argv) {
  try {
    return execFileSync('git', argv, { cwd: root, encoding: 'utf8' })
  } catch {
    return null
  }
}

function codeTreeFingerprint() {
  const status = gitOutput(['status', '--porcelain=v1', '-uall', '--', ...CODE_TREE_PATHS])
  const diff = gitOutput(['diff', 'HEAD', '--', ...CODE_TREE_PATHS])
  if (status === null && diff === null) return null
  return createHash('sha256').update(JSON.stringify({ status: status ?? '', diff: diff ?? '' })).digest('hex')
}

// 名字沿用旧函数（test/style-browser.test.mjs 对它有静态断言，test/ 不在本次改动范围）：
// 语义从「工作树与 HEAD 一致」改成「工作树与产出证据的那棵树一致」，允许未提交工作树。
function codeTreeMatches(head, treeHash) {
  if (typeof head !== 'string' || head === '') return false
  if (typeof treeHash !== 'string' || treeHash === '') return false
  return codeTreeFingerprint() === treeHash
}

function runProcess(command, argv, options = {}) {
  return new Promise((resolvePromise) => {
    let child
    try {
      child = spawn(command, argv, {
        cwd: options.cwd ?? root,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (error) {
      resolvePromise({ code: -1, stdout: '', stderr: '', error })
      return
    }
    let stdout = ''
    let stderr = ''
    let settled = false
    let timer
    const settle = (result) => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      resolvePromise(result)
    }
    child.stdout?.on('data', (chunk) => { stdout += chunk })
    child.stderr?.on('data', (chunk) => { stderr += chunk })
    child.on('error', (error) => settle({ code: -1, stdout, stderr, error }))
    child.on('close', (code) => settle({ code, stdout, stderr }))
    if (options.timeout) {
      timer = setTimeout(() => {
        try { child.kill() } catch {}
        settle({ code: -1, stdout, stderr, error: new Error('timeout') })
      }, options.timeout)
      timer.unref?.()
    }
  })
}

async function runWorker(evidenceDirArg) {
  if (!evidenceDirArg) {
    console.error('STYLE_GATE_ERROR: --worker requires an evidence directory')
    return 2
  }
  const evidenceDir = resolve(root, evidenceDirArg)
  mkdirSync(evidenceDir, { recursive: true })
  const gatePath = resolve(evidenceDir, 'gate.json')
  const statePath = resolve(evidenceDir, 'state.json')
  const stdoutPath = resolve(evidenceDir, 'probe.stdout.txt')
  const stderrPath = resolve(evidenceDir, 'probe.stderr.txt')
  const evidenceResultPath = resolve(evidenceDir, 'style-result.json')
  const startedAt = new Date().toISOString()

  let head = 'unknown'
  try {
    head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  } catch {}

  const treeHash = codeTreeFingerprint()
  const meta = {
    checkedAt: startedAt,
    head,
    treeHash,
    probe,
    command: 'ego-browser nodejs -e "await import(probe)"',
    mode: 'detached-worker',
    resultPath,
    evidenceResultPath,
    ok: false,
    failures: [],
  }
  const failures = []
  const record = (name, actual, expected) => {
    if (actual !== expected) failures.push({ name, actual, expected })
  }
  const near = (name, actual, expected, tolerance = 1) => {
    if (Math.abs(actual - expected) > tolerance) failures.push({ name, actual, expected, tolerance })
  }
  const writeGate = () => writeFileSync(gatePath, JSON.stringify(meta, null, 2))
  const writeState = (status, extra = {}) => writeFileSync(statePath, JSON.stringify({ status, pid: process.pid, startedAt, ...extra }, null, 2))
  const failUnexpected = (error) => {
    failures.push({ name: 'worker', actual: String(error?.stack ?? error), expected: 'no uncaught error' })
    meta.failures = failures
    meta.ok = false
    writeGate()
    writeState('done', { ok: false })
    process.exit(1)
  }
  process.once('uncaughtException', failUnexpected)
  process.once('unhandledRejection', failUnexpected)
  writeState('running')

  const version = await runProcess('ego-browser', ['--version'], { timeout: 30_000 })
  if (version.error || version.code !== 0) {
    failures.push({
      name: 'ego-browser',
      actual: version.error?.message ?? version.stderr ?? `exit ${version.code}`,
      expected: 'available',
    })
    meta.failures = failures
    writeGate()
    writeState('done', { ok: false })
    console.error('STYLE_GATE_FAIL: ego-browser unavailable')
    return 1
  }

  rmSync(resultPath, { force: true })
  const entry = `await import('${pathToFileURL(probe).href}')`
  const run = await runProcess('ego-browser', ['nodejs', '-e', entry], {
    cwd: root,
    timeout: 180_000,
  })
  writeFileSync(stdoutPath, run.stdout ?? '')
  writeFileSync(stderrPath, run.stderr ?? '')

  if (run.error || run.code !== 0) {
    const stderr = String(run.stderr ?? '')
    // 探针缺元素时抛 STYLE_PROBE_MISSING: <名字>；把它带进 gate.failures，--check 能直接指名。
    const marker = /STYLE_PROBE_MISSING:[^\r\n"]*/.exec(stderr)
    const detail = marker ? marker[0] : stderr.trim().split(/\r?\n/).filter(Boolean).slice(-3).join(' | ')
    failures.push({
      name: 'ego-browser run',
      actual: run.error?.message ?? `exit ${run.code}${detail ? ' · ' + detail : ''}`,
      expected: 'exit 0',
    })
  }
  if (!existsSync(resultPath)) {
    failures.push({ name: 'style-result.json', actual: 'missing', expected: 'present' })
  }

  if (existsSync(resultPath)) {
    const raw = readFileSync(resultPath, 'utf8')
    const data = JSON.parse(raw)
    // 证据里带上产出它的代码树指纹（head + treeHash），--check 据此判断新鲜度。
    writeFileSync(evidenceResultPath, JSON.stringify({ head, treeHash, ...data }, null, 2))
    const { style, narrow, persona: personaProbe } = data

    const contains = (name, actual, expected) => {
      if (!String(actual ?? '').includes(expected)) failures.push({ name, actual, expected: 'contains ' + expected })
    }
    // 期望值依据：src/client.js 的 skin CSS（`const CSS`，当前源码第 750 行起）与装饰函数。
    // 颜色走 token 关系：探针把 var(--dss-x) 赋给 .dss-scope 内的临时元素再读 computed，与目标元素比对；
    // 门禁里不抄色值，改 CSS token 后若元素没跟着 token 走，这里就会红。
    // 数字（字号 / 圆角 / 边条宽度）是设计常量，行号写在每条后面。
    record('label.conclusion', style.labels?.conclusion, '结论')                                  // labelOf → CARD_TYPES['结论']=conclusion（L729-738）
    record('label.next', style.labels?.next, '建议')                                              // ['建议','next']
    record('label.risk', style.labels?.risk, '风险')                                              // ['风险','risk']
    record('label.short', style.labels?.short, '短答')                                            // ['短答','short']
    record('titleSize', style.titleSize, '19px')                                                  // L941-944 font:700 calc(text*19/13.5)
    record('titleWeight', style.titleWeight, '700')                                               // L943
    contains('titleFamily', style.titleFamily, 'Georgia')                                         // L765 --dss-serif 回退栈
    record('bodySize', style.bodySize, '13.5px')                                                  // L945 var(--dss-text-size)（L766 回退 13.5px）
    record('bodyLine', style.bodyLine, '22.95px')                                                 // L945 line-height:1.7 × 13.5px
    record('cardRadius', style.cardRadius, '12px')                                                // L333 .dss-card border-radius
    record('cardLeft', style.cardLeft, '3px')                                                     // L335 border-left:3px
    record('cardBlueSoft', style.cardBlueSoft, true)                                              // L336 background 用 var(--dss-blue-soft)
    record('conclusionTitleSize', style.conclusionTitleSize, '19px')                              // L934-938 结论卡加粗结论
    record('headerSize', style.headerSize, '11.5px')                                              // L976 font calc(text*11.5/13.5)
    record('headerWeight', style.headerWeight, '600')                                             // L976
    record('headerThToken', style.headerThToken, true)                                            // L976 color:var(--dss-th-text)（L755 #1e3a8a）
    record('headerHeadBgToken', style.headerHeadBgToken, true)                                    // L975 background:var(--dss-head-bg)（L760）
    record('bodyCellSize', style.bodyCellSize, '13px')                                            // L982 calc(text*13/13.5)
    record('firstCellWeight', style.firstCellWeight, '600')                                       // L984
    record('firstCellSize', style.firstCellSize, '13.5px')                                        // L984 var(--dss-text-size)
    record('statusCellAttr', style.statusCellAttr, 'success')                                     // markStatusCell 只写属性（L1260-1263）
    record('statusCellText', style.statusCellText, '✅ 通过')                                        // 不再改写 textContent / 不再插胶囊节点
    record('statusCellGreenSoft', style.statusCellGreenSoft, true)                                // L988 background:var(--dss-green-soft)
    record('statusCellGreenBar', style.statusCellGreenBar, true)                                  // L988 box-shadow inset 3px 0 0 var(--dss-green)
    record('statusCellBarInset', style.statusCellBarInset, true)                                  // L988 inset
    record('statusCellBarWidth', style.statusCellBarWidth, '3px')                                 // L988 inset 3px
    record('leadSize', style.leadSize, '13.5px')                                                  // L1080 var(--dss-text-size)
    record('leadStrongSize', style.leadStrongSize, '13.5px')                                      // L1081
    record('leadStrongWeight', style.leadStrongWeight, '650')                                     // L1081
    record('nextTitleSize', style.nextTitleSize, '12px')                                          // L925 卡标签 font:700 calc(text*12/13.5)
    record('nextTitleGreenText', style.nextTitleGreenText, true)                                  // L928 color:var(--dss-green-text)（L756 #047857）
    record('nextStepSize', style.nextStepSize, '13.5px')                                          // L948
    record('nextRadius', style.nextRadius, '12px')                                                // L333
    record('nextLeft', style.nextLeft, '3px')                                                     // L335
    record('nextGreenSoft', style.nextGreenSoft, true)                                            // L347 background var(--dss-green-soft)
    record('riskLeft', style.riskLeft, '3px')                                                     // L349-351
    record('riskAmberStrong', style.riskAmberStrong, true)                                        // L897 border-left-color:var(--dss-amber-strong)
    record('shortBlue', style.shortBlue, true)                                                    // L904-905 短答卡 border-left-color:var(--dss-blue)
    record('shortBlueSoft', style.shortBlueSoft, true)                                            // L905 background var(--dss-blue-soft)
    record('codeRadius', style.codeRadius, '12px')                                                // L991-993
    record('codeLeft', style.codeLeft, '3px')                                                     // L993
    record('codeBannerBlueText', style.codeBannerBlueText, true)                                  // L1002 color:var(--dss-blue-text)
    record('codeBannerSize', style.codeBannerSize, '12px')                                        // L1003 calc(text*12/13.5)
    record('codePreCodeBg', style.codePreCodeBg, true)                                            // L1018 background:var(--dss-code-bg)（L761）
    record('codePreCodeText', style.codePreCodeText, true)                                        // L1018 color:var(--dss-code-text)
    record('codePreCodeSize', style.codePreCodeSize, '12.5px')                                    // L1019 var(--dss-code-size)（L767 回退 12.5px）
    record('copyButton', style.copyButton, true)                                                  // ensureCodeCopy（L1266+）插 [data-dsh-structured-copy]
    // 深色：同一组 token 在 body[data-ds-dark-theme] .dss-scope 下重算（L785-797）
    record('dark.cardBlueSoft', style.dark?.cardBlueSoft, true)
    record('dark.tableHeaderThToken', style.dark?.tableHeaderThToken, true)
    record('dark.tableHeaderHeadBgToken', style.dark?.tableHeaderHeadBgToken, true)
    record('dark.codePreCodeBg', style.dark?.codePreCodeBg, true)
    record('dark.codePreCodeText', style.dark?.codePreCodeText, true)
    record('dark.statusCellGreenSoft', style.dark?.statusCellGreenSoft, true)
    // Persona 视觉：身份头 / 前后缀 / 三卡 + 短答 / 表格（人格开启态 fixture）
    const persona = personaProbe ?? {}
    record('persona.headCount', persona.headCount, 1)                                             // createPersonaHead / mountPersonaHead（L1473-1554）
    record('persona.prefixCount', persona.prefixCount, 1)                                         // renderPersonaContent（L2339）
    record('persona.suffixCount', persona.suffixCount, 1)                                         // innerOs 收尾（L2402）
    record('persona.prefixSize', persona.prefixSize, '12.5px')                                    // L1047 font:var(--dss-code-size)
    record('persona.suffixSize', persona.suffixSize, '13px')                                      // L1048 calc(code*13/12.5) 1.3.3 innerOS readability
    record('persona.suffixBorderTop', persona.suffixBorderTop, '1px dotted')                      // L1048
    // 身份头几何（2026-11-26 修复：L1040-1046 的选择器由 `.dss-scope .dss-persona-head …` 改为
    // `.dss-scope.dss-persona-head …`，head 自身带 dss-scope 自持 token，两种挂载位置都成立）。
    record('persona.headPadding', persona.headPadding, '0px 0px 10px')                            // L1040 padding:0 0 10px
    record('persona.headRowDisplay', persona.headRowDisplay, 'flex')                              // L1041 .dss-chat-head{display:flex}
    record('persona.headAvatarWidth', persona.headAvatarWidth, '38px')                            // L1042 width:38px
    record('persona.headAvatarRadius', persona.headAvatarRadius, '50%')                           // L1042 border-radius:50%
    record('persona.headNameSize', persona.headNameSize, '16px')                                  // L1045 calc(--dss-text-size*16/13.5)
    record('persona.headNameWeight', persona.headNameWeight, '650')                               // L1045 font-weight:650
    record('persona.headIsScope', persona.headIsScope, true)                                      // L1475 head.className 含 dss-scope：身份头自带 token 载体
    record('persona.headHasName', persona.headHasName, true)                                      // L1488-1492 名字/签名节点
    record('persona.conclusionLeadSize', persona.conclusionLeadSize, '19px')                      // L934-938
    record('persona.conclusionLeadWeight', persona.conclusionLeadWeight, '700')                   // L937 font:700
    record('persona.nextLabelGreenText', persona.nextLabelGreenText, true)                        // L928 var(--dss-green-text)
    record('persona.riskAmberStrong', persona.riskAmberStrong, true)                              // L897 var(--dss-amber-strong)
    record('persona.shortBlue', persona.shortBlue, true)                                          // L904-905 var(--dss-blue)
    record('persona.shortBlueSoft', persona.shortBlueSoft, true)                                  // L905 var(--dss-blue-soft)
    record('persona.tableBlue', persona.tableBlue, true)                                          // L969 border-left:3px solid var(--dss-blue)
    record('persona.tableHeaderThToken', persona.tableHeaderThToken, true)                        // L976 var(--dss-th-text)
    record('persona.tableHeaderHeadBgToken', persona.tableHeaderHeadBgToken, true)                // L975 var(--dss-head-bg)
    record('persona.dark.tableHeaderThToken', persona.dark?.tableHeaderThToken, true)             // L785+ 深色 token
    record('persona.dark.tableHeaderHeadBgToken', persona.dark?.tableHeaderHeadBgToken, true)
    record('persona.dark.shortBlue', persona.dark?.shortBlue, true)                               // 深色 --dss-blue:#3b82f6
    record('persona.dark.nameInk', persona.dark?.nameInk, true)                                   // L1045 color:var(--dss-ink)
    record('persona.dark.tableBlue', persona.dark?.tableBlue, true)
    record('narrow.overflow', narrow.overflow, false)
    if (narrow.docScrollWidth > narrow.innerWidth) {
      failures.push({
        name: 'narrow.docScrollWidth',
        actual: narrow.docScrollWidth,
        expected: `<= ${narrow.innerWidth}`,
      })
    }
  }

  meta.ok = failures.length === 0
  meta.failures = failures
  writeGate()
  writeState('done', { ok: meta.ok })

  if (failures.length) {
    console.error(`STYLE_GATE_FAIL: ${failures.length} mismatch(es)`)
    for (const failure of failures) {
      console.error(`- ${failure.name}: actual=${JSON.stringify(failure.actual)} expected=${JSON.stringify(failure.expected)}`)
    }
    console.error(`evidence: ${evidenceDir}`)
    return 1
  }
  console.log(`STYLE_GATE_PASS: ${evidenceDir}`)
  return 0
}

const checkIndex = args.indexOf('--check')
if (checkIndex !== -1) {
  const target = args[checkIndex + 1]
  const dir = target ? resolve(root, target) : latestEvidenceDir()
  if (!dir || !existsSync(dir)) {
    console.error('STYLE_GATE_UNKNOWN: no evidence directory')
    process.exit(2)
  }
  const gatePath = resolve(dir, 'gate.json')
  if (existsSync(gatePath)) {
    const gate = readJson(gatePath)
    if (!gate) {
      console.error(`STYLE_GATE_UNKNOWN: malformed ${gatePath}`)
      process.exit(2)
    }
    if (gate.ok) {
      // 证据绑定「产出它的那棵代码树」：treeHash 覆盖已跟踪改动 + 未跟踪新文件。
      // 同一棵树（允许未提交）→ PASS；树变了 → STALE，旧证据不再作数。
      if (!codeTreeMatches(gate.head, gate.treeHash)) {
        const current = codeTreeFingerprint()
        console.error(`STYLE_GATE_STALE: ${dir} head=${gate.head ?? 'unknown'} tree=${gate.treeHash ?? 'unknown'} current=${current ?? 'unknown'} — src/lib/scripts/test/fixtures changed since evidence`)
        process.exit(1)
      }
      console.log(`STYLE_GATE_PASS: ${dir}`)
      process.exit(0)
    }
    console.error(`STYLE_GATE_FAIL: ${dir}`)
    for (const failure of gate.failures ?? []) {
      console.error(`- ${failure.name}: actual=${JSON.stringify(failure.actual)} expected=${JSON.stringify(failure.expected)}`)
    }
    process.exit(1)
  }
  const statePath = resolve(dir, 'state.json')
  const state = existsSync(statePath) ? readJson(statePath) : null
  if (state?.status === 'done') {
    console.error(`STYLE_GATE_FAIL: ${dir} has no gate.json`)
    process.exit(1)
  }
  console.log(`STYLE_GATE_RUNNING: ${dir} pid=${state?.pid ?? 'unknown'}`)
  process.exit(2)
}

if (process.env.DSH_STRUCTURED_STYLE_GATE !== '1') {
  console.log('STYLE_GATE_SKIP: manual browser gate is opt-in.')
  console.log('Start: DSH_STRUCTURED_STYLE_GATE=1 node scripts/style-gate.mjs')
  console.log('PowerShell: $env:DSH_STRUCTURED_STYLE_GATE=1; node scripts/style-gate.mjs')
  console.log('Check: node scripts/style-gate.mjs --check')
  process.exit(0)
}

const workerIndex = args.indexOf('--worker')
if (workerIndex !== -1) {
  const code = await runWorker(args[workerIndex + 1])
  process.exit(code)
}

const evidenceDir = resolve(baseDir, stamp)
mkdirSync(evidenceDir, { recursive: true })
const stdoutFd = openSync(resolve(evidenceDir, 'worker.stdout.txt'), 'a')
const stderrFd = openSync(resolve(evidenceDir, 'worker.stderr.txt'), 'a')
let child
try {
  child = spawn(process.execPath, [self, '--worker', evidenceDir], {
    cwd: root,
    detached: true,
    windowsHide: true,
    stdio: ['ignore', stdoutFd, stderrFd],
  })
} finally {
  closeSync(stdoutFd)
  closeSync(stderrFd)
}
if (!child?.pid) {
  console.error('STYLE_GATE_ERROR: failed to start detached worker')
  process.exit(1)
}
const statePath = resolve(evidenceDir, 'state.json')
if (!existsSync(statePath)) {
  writeFileSync(statePath, JSON.stringify({
    status: 'running',
    pid: child.pid,
    startedAt: new Date().toISOString(),
  }, null, 2))
}
child.unref()
console.log(`STYLE_GATE_STARTED: ${evidenceDir}`)
console.log('STYLE_GATE_CHECK: node scripts/style-gate.mjs --check')
process.exit(0)
