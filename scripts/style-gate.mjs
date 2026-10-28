import { execFileSync, spawn } from 'node:child_process'
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

  const meta = {
    checkedAt: startedAt,
    head,
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
    failures.push({
      name: 'ego-browser run',
      actual: run.error?.message ?? `exit ${run.code}`,
      expected: 'exit 0',
    })
  }
  if (!existsSync(resultPath)) {
    failures.push({ name: 'style-result.json', actual: 'missing', expected: 'present' })
  }

  if (existsSync(resultPath)) {
    const raw = readFileSync(resultPath, 'utf8')
    writeFileSync(evidenceResultPath, raw)
    const { style, narrow } = JSON.parse(raw)

    record('titleSize', style.titleSize, '24px')
    record('titleWeight', style.titleWeight, '700')
    record('bodySize', style.bodySize, '13.5px')
    record('bodyLine', style.bodyLine, '21.6px')
    record('dividerHeight', style.dividerHeight, '1px')
    record('dividerBackground', style.dividerBackground, 'rgb(226, 232, 240)')
    record('headerSize', style.headerSize, '13px')
    record('headerWeight', style.headerWeight, '700')
    record('headerHeight', style.headerHeight, '38px')
    record('bodyCellSize', style.bodyCellSize, '12.5px')
    record('statusPillSize', style.statusPillSize, '10px')
    record('leadSize', style.leadSize, '13px')
    record('leadStrongSize', style.leadStrongSize, '14px')
    record('leadStrongWeight', style.leadStrongWeight, '700')
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      record(`leadBorder${side}`, style[`leadBorder${side}`], '0px')
    }
    record('nextTitleSize', style.nextTitleSize, '16px')
    record('nextTitleWeight', style.nextTitleWeight, '700')
    record('nextStepSize', style.nextStepSize, '13px')
    record('nextBackground', style.nextBackground, 'rgba(0, 0, 0, 0)')
    record('nextBorderTop', style.nextBorderTop, '1px')
    for (const side of ['Right', 'Bottom', 'Left']) {
      record(`nextBorder${side}`, style[`nextBorder${side}`], '0px')
    }
    record('triangleColor', style.triangleColor, 'rgb(194, 65, 12)')
    record('triangleLeftWidth', style.triangleLeftWidth, '9px')
    record('triangleTopWidth', style.triangleTopWidth, '5px')
    record('triangleBottomWidth', style.triangleBottomWidth, '5px')
    record('darkTriangleColor', style.darkTriangleColor, 'rgb(251, 146, 60)')
    near('liLeft-labelLeft', style.liLeft - style.labelLeft, 0)
    record('cardIconBefore', style.cardIconBefore, 'none')
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
