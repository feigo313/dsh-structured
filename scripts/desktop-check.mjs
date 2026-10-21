#!/usr/bin/env node
/**
 * Desktop 兼容性预检（只读）。
 *
 * 目标 profile 默认就是 `desktop`。这个脚本在安装前检查：
 *   - 插件只依赖宿主的 systemPrompt 服务（commands 可选），不使用 Electron/headless 专有 API；
 *   - bundle 清单、files、main/exports 能让 desktop 的 boot 层正确装配；
 *   - 默认开启、状态落在 $DSH_HOME，不写死 profile 名或盘符；
 *   - desktop profile 的 bundle 栈里确实有提供 systemPrompt/commands 的 dsh-base。
 *
 * 用法：
 *   node scripts/desktop-check.mjs
 *   node scripts/desktop-check.mjs --entry "C:\...\profiles\desktop\node_modules\dsh-structured"
 */

import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'

const args = process.argv.slice(2)
let entry = process.cwd()
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--entry') entry = resolve(args[++i])
  else if (args[i] === '--help' || args[i] === '-h') {
    process.stdout.write('用法: node scripts/desktop-check.mjs [--entry <插件目录>]\n')
    process.exit(0)
  } else {
    process.stderr.write('desktop-check: 未知参数 ' + args[i] + '\n')
    process.exit(2)
  }
}

const home = process.env.DSH_HOME || join(homedir(), '.dsh')
const profileDir = join(home, 'profiles', 'desktop')
const rows = []
const check = (name, ok, detail = '') => rows.push({ name, ok, detail })

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

// 1. desktop profile 的 bundle 栈
const profileManifestFile = join(profileDir, 'package.json')
let profileManifest = null
try {
  profileManifest = readJson(profileManifestFile)
  const bundles = profileManifest?.dsh?.profile?.bundles ?? []
  check('desktop profile 已初始化', true, profileManifestFile)
  check('desktop bundle 栈含 dsh-base', bundles.includes('@deepseek-ai/dsh-base'), 'dsh-base 提供 systemPrompt / commands')
  check('desktop bundle 栈含 dsh-web-app', bundles.includes('@deepseek-ai/dsh-web-app'), 'desktop 的 Web 表层')
} catch {
  rows.push({ name: 'desktop profile 已初始化', ok: null, detail: '未找到 ' + profileManifestFile + '（先启动一次 Desktop）' })
}

// 2. 插件清单
let pkg = null
try {
  pkg = readJson(join(entry, 'package.json'))
  check('插件 package.json 可读', true, entry)
} catch (error) {
  check('插件 package.json 可读', false, String(error))
  report()
  process.exit(1)
}

const patchRel = pkg?.dsh?.bundle?.patch
check('声明 dsh.bundle.patch', typeof patchRel === 'string', patchRel ?? '缺失')
const patchFile = patchRel && isAbsolute(patchRel) ? patchRel : join(entry, patchRel ?? '')
check('cordis.patch.yml 存在', Boolean(patchRel) && existsSync(patchFile), patchFile)
const files = Array.isArray(pkg.files) ? pkg.files : []
check('files 含 cordis.patch.yml', files.includes('cordis.patch.yml'), 'npm pack 不会漏掉装配清单')
check('files 含 lib / src', files.includes('lib') && files.includes('src'), files.join(', '))
check('main 指向 lib/index.js', pkg.main === 'lib/index.js', pkg.main ?? '缺失')
check('exports . 指向 lib/index.js', pkg.exports?.['.'] === './lib/index.js', String(pkg.exports?.['.'] ?? '缺失'))
check('桌面 client 半区已声明', pkg?.dsh?.client?.platform === 'web', 'dsh.client.platform = web')
check('exports ./client 指向 lib/client.js', pkg.exports?.['./client'] === './lib/client.js', String(pkg.exports?.['./client'] ?? '缺失'))
check('engines.dsh 声明兼容范围', typeof pkg?.engines?.dsh === 'string', pkg?.engines?.dsh ?? '缺失')
check('dsh.compatibility 声明兼容版本', Boolean(pkg?.dsh?.compatibility?.dshReleases), JSON.stringify(pkg?.dsh?.compatibility?.dshReleases ?? {}))

// 3. patch 内容
let patchText = ''
try {
  patchText = readFileSync(patchFile, 'utf8')
} catch {}
check('patch 含 dsh-structured 行', /id:\s*dsh-structured/.test(patchText), '')
check('patch 默认 defaultEnabled: true', /defaultEnabled:\s*true/.test(patchText), '')

// 4. 运行时入口：只允许 node: 内置模块 + 无 profile 分支
const libFile = join(entry, 'lib', 'index.js')
let libText = ''
try {
  libText = readFileSync(libFile, 'utf8')
  check('lib/index.js 存在', true, libFile)
} catch {
  check('lib/index.js 存在', false, libFile)
}
const clientFile = join(entry, 'lib', 'client.js')
let clientText = ''
try {
  clientText = readFileSync(clientFile, 'utf8')
  check('lib/client.js 存在', true, clientFile)
} catch {
  check('lib/client.js 存在', false, clientFile)
}
check('client 模块 id 与包名一致', /id:\s*'dsh-structured'/.test(clientText), '')
check('client 模块是纯 DOM 增强（无 React 强依赖）', !/require\(['"]react['"]\)/.test(clientText), '')
const imports = [...libText.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1])
const nonNodeImports = imports.filter((spec) => !spec.startsWith('node:'))
check('运行时只 import node: 内置模块', nonNodeImports.length === 0, nonNodeImports.join(', ') || 'ok')
check('inject 只硬依赖 systemPrompt', /export const inject = \['systemPrompt'\]/.test(libText), 'commands 缺失时只降级命令')
check('没有 desktop/structured-test 分支', !/['"](?:desktop|structured-test)['"]/.test(libText), '')
check('状态目录走 DSH_HOME', /process\.env\.DSH_HOME/.test(libText), '')
check('没有 Electron 专有 API', !/electron|process\.versions\.electron/.test(libText), '')

// 5. 版本与运行时
const nodeMajor = Number(process.versions.node.split('.')[0])
check('Node >= 22', nodeMajor >= 22, process.versions.node)

function report() {
  for (const row of rows) {
    const tag = row.ok === true ? 'PASS' : row.ok === false ? 'FAIL' : 'WARN'
    process.stdout.write(tag.padEnd(5) + '  ' + row.name + (row.detail ? '  — ' + row.detail : '') + '\n')
  }
  const failed = rows.filter((row) => row.ok === false).length
  process.stdout.write('\n' + (failed === 0 ? 'desktop 兼容性预检通过' : failed + ' 项失败') + '\n')
}

report()
if (rows.some((row) => row.ok === false)) process.exitCode = 1
