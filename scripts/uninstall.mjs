#!/usr/bin/env node
/**
 * 单命令卸载：先移除 profile 里的插件（package + bundle 行），再删除状态目录。
 * 不碰其他插件；只删 $DSH_HOME/dsh-structured。
 *
 * 用法：
 *   node scripts/uninstall.mjs --profile structured-test
 *   node scripts/uninstall.mjs --profile structured-test --dry-run
 *   node scripts/uninstall.mjs                 # 只清理状态目录
 */

import { existsSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const argv = process.argv.slice(2)
const profileIndex = argv.indexOf('--profile')
const profile = profileIndex >= 0 ? argv[profileIndex + 1] : null
const dryRun = argv.includes('--dry-run')
const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh')
const target = resolve(dshHome, 'dsh-structured')

if (profile) {
  if (dryRun) {
    process.stdout.write('uninstall: 将执行 dsh plugin --profile ' + profile + ' remove dsh-structured（dry-run）\n')
  } else {
    const safeProfile = String(profile).replace(/[^a-zA-Z0-9._-]/g, '')
    const command = 'dsh plugin --profile "' + safeProfile + '" remove dsh-structured'
    const result = spawnSync(command, {
      stdio: 'inherit',
      shell: true,
      env: process.env,
    })
    if (result.error || result.status !== 0) {
      process.stderr.write('uninstall: dsh plugin remove 失败，未删除状态目录\n')
      process.exitCode = result.status || 1
      process.exit()
    }
  }
}

if (basename(target) !== 'dsh-structured') {
  process.stderr.write('uninstall: 拒绝删除非目标目录 ' + target + '\n')
  process.exitCode = 2
} else if (!existsSync(target)) {
  process.stdout.write('uninstall: 状态目录不存在，无需清理：' + target + '\n')
} else if (dryRun) {
  process.stdout.write('uninstall: 将删除 ' + target + '（dry-run，未执行）\n')
} else {
  rmSync(target, { recursive: true, force: true })
  process.stdout.write('uninstall: 已删除 ' + target + '\n')
}
