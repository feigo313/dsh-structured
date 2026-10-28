import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Explicit manual gate. It is deliberately NOT part of `npm test`:
// the default suite must not launch ego lite or open a foreground window.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const probe = resolve(root, 'test/fixtures/style-probe.mjs')
const resultPath = resolve(root, 'artifacts/audit-0.9.6/style-result.json')
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const evidenceDir = resolve(root, 'artifacts/style-gate', stamp)

if (process.env.DSH_STRUCTURED_STYLE_GATE !== '1') {
  console.log('STYLE_GATE_SKIP: manual browser gate is opt-in.')
  console.log('Run: DSH_STRUCTURED_STYLE_GATE=1 node scripts/style-gate.mjs')
  console.log('PowerShell: $env:DSH_STRUCTURED_STYLE_GATE=1; node scripts/style-gate.mjs')
  process.exit(0)
}

mkdirSync(evidenceDir, { recursive: true })
const gatePath = resolve(evidenceDir, 'gate.json')
const stdoutPath = resolve(evidenceDir, 'probe.stdout.txt')
const stderrPath = resolve(evidenceDir, 'probe.stderr.txt')
const evidenceResultPath = resolve(evidenceDir, 'style-result.json')

let head = 'unknown'
try {
  head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
} catch {}
const meta = {
  checkedAt: new Date().toISOString(),
  head,
  probe,
  command: 'ego-browser nodejs -e "await import(probe)"',
  resultPath,
  evidenceResultPath,
  ok: false,
  failures: [],
}
const writeGate = () => writeFileSync(gatePath, JSON.stringify(meta, null, 2))

const failures = []
const record = (name, actual, expected) => {
  if (actual !== expected) failures.push({ name, actual, expected })
}
const near = (name, actual, expected, tolerance = 1) => {
  if (Math.abs(actual - expected) > tolerance) failures.push({ name, actual, expected, tolerance })
}

const version = spawnSync('ego-browser', ['--version'], {
  encoding: 'utf8',
  windowsHide: true,
  timeout: 30_000,
})
if (version.error || version.status !== 0) {
  failures.push({
    name: 'ego-browser',
    actual: version.error?.message ?? version.stderr ?? `exit ${version.status}`,
    expected: 'available',
  })
  meta.failures = failures
  writeGate()
  console.error('STYLE_GATE_FAIL: ego-browser unavailable')
  process.exit(1)
}

rmSync(resultPath, { force: true })
const entry = `await import('${pathToFileURL(probe).href}')`
const run = spawnSync('ego-browser', ['nodejs', '-e', entry], {
  cwd: root,
  encoding: 'utf8',
  windowsHide: true,
  timeout: 180_000,
  maxBuffer: 16 * 1024 * 1024,
})
writeFileSync(stdoutPath, run.stdout ?? '')
writeFileSync(stderrPath, run.stderr ?? '')

if (run.error || run.status !== 0) {
  failures.push({
    name: 'ego-browser run',
    actual: run.error?.message ?? `exit ${run.status}`,
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

if (failures.length) {
  console.error(`STYLE_GATE_FAIL: ${failures.length} mismatch(es)`)
  for (const failure of failures) {
    console.error(`- ${failure.name}: actual=${JSON.stringify(failure.actual)} expected=${JSON.stringify(failure.expected)}`)
  }
  console.error(`evidence: ${evidenceDir}`)
  process.exit(1)
}

console.log(`STYLE_GATE_PASS: ${evidenceDir}`)
