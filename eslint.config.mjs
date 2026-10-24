// 机器级 pre-commit 钩子会对暂存的 .js/.mjs 跑 ESLint（ESLint v9+ 需要 flat config）。
// 本仓库的质量门禁是 node:test 套件与 theme-contrast 脚本；这里不额外设规则，
// 只声明忽略项让钩子跑得通，lib/ 是构建产物不进 lint。
export default [
  {
    ignores: ['node_modules/**', 'lib/**', 'out/**', '.tools/**', '.v2c/**', '.ego/**'],
  },
]
