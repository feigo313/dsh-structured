# 宿主升级后 markdown class 改名：影响与排查

## 结论

视觉层全部依赖宿主内部标记（`[class*="_markdown_"]`、`.md-code-block`、`[data-code-block-banner]`）。宿主把这些 token 改名后，插件**不报错、静默降级**：CSS 0 命中、JS 半死、文字半区照常。现有测试与验收都拦不住它，只能靠渲染进程内的探针确认。

## 会发生什么

| 半区 | 依赖 | 改名后 |
| --- | --- | --- |
| CSS（`src/client.js` 内 `CSS` 常量，全部规则） | `[class*="_markdown_"]` | 0 命中：字号层级、表格、代码块、引用卡、状态色、语言色全部回退宿主原生样式 |
| JS 装饰（6 处 `querySelectorAll`，行 276/300/310/320/330/339） | `[class*="_markdown_"] …` | 全部返回空：标题图标、状态属性、状态表、表格结论条、代码语言色都不再加 |
| JS 装饰（1 处，行 283） | 裸 `blockquote` | **仍然生效**：会给引用块加 `data-dsh-structured-card`，但没有任何 CSS 消费它 → 「属性在、样式无」 |
| 文字半区（`ctx.systemPrompt.section`） | 无 DOM 依赖 | 完全不受影响：注入、`/structured status`、开关都正常，模型仍按结构化输出 |

三个后果值得单独记住：

1. **没有错误信号。** `console.info('[dsh-structured] visual layer active')` 照样打印，`<style>` 标签也在 DOM 里；这两条只能证明插件加载了，不能证明选择器命中了。
2. **检测盲区。** 测试只 grep 源码里的标记（`test/structured.test.mjs:470`），验收只看 system prompt 注入；选择器命中失败没有任何断言覆盖。
3. **边界。** `[class*="_markdown_"]` 对 CSS Module 的 hash 后缀（`_markdown_1a2b3` → `_markdown_9x8y7`）免疫，只有 **token 本身**改了（`_markdownBody_`、`_md_`、`_prose_`、`markdown-body`）才断。所以「升级后样式全丢」基本等于 token 改名，不是 hash 变化。

## 怎么排查（3 分钟）

1. Desktop 打开 DevTools（`Ctrl+Shift+I`；被禁用时走窗口菜单的开发者工具）。
2. 在 Console 粘贴探针：

```js
(() => {
  const roots = document.querySelectorAll('[class*="_markdown_"]');
  const n = (s) => document.querySelectorAll(s).length;
  const tokens = new Set();
  for (const el of document.querySelectorAll('[class*="markdown" i], [class*="message" i]')) {
    String(el.className).split(/\s+/).filter((t) => /markdown|md|prose/i.test(t)).forEach((t) => tokens.add(t));
  }
  console.table({
    styleTag: !!document.getElementById('dsh-structured-skin-style'),
    rootFlag: document.documentElement.getAttribute('data-dsh-structured'),
    markdownRoots: roots.length,
    cardAttrs: n('blockquote[data-dsh-structured-card]'),
    headingIcons: n('[data-dsh-structured-icon]'),
    statusAttrs: n('[data-dsh-structured-status]'),
    codeLang: n('[data-dsh-structured-lang]'),
    accentVar: roots[0] ? getComputedStyle(roots[0]).getPropertyValue('--ds-accent').trim() : '(no root)',
  });
  console.log('class tokens:', [...tokens]);
})()
```

3. 按表判定：

| 探针结果 | 判定 | 下一步 |
| --- | --- | --- |
| `styleTag=false` | 插件没加载 | 查 profile bundle 行、`cordis.patch.yml`、安装完整性，与改名无关 |
| `styleTag=true`、`markdownRoots=0`、`cardAttrs>0` | **改名确诊**：JS 半挂、CSS 全挂 | 取新 token 修选择器 |
| `styleTag=true`、`markdownRoots=0`、`cardAttrs=0` | 改名确诊（当前屏没有引用块） | 同上 |
| `markdownRoots>0`、`headingIcons=0` | 选择器没问题，是装饰链路没跑/抛错 | 看 Console 报错、确认 `apply` 执行过 |
| 全部 >0、`accentVar` 为空 | 样式被覆盖或优先级不足 | 查宿主/其他插件的 `!important` |

4. 取新 token（在普通 PowerShell 里跑，不在沙箱内）：

```powershell
rg -a -o --no-filename '_[A-Za-z]*[Mm]arkdown_[A-Za-z0-9_-]{0,12}' "$env:DSH_APP_ASAR" | Sort-Object -Unique
```

5. 定因：把新 token 与 `src/client.js` 里的 `_markdown_` 对照，再看应用版本（关于页 / `navigator.userAgent`）是否刚升级；`package.json` 的 `dsh.compatibility.dshReleases` 目前只声明到 `0.2.1-rc.2`，新版本一律算未验证。

## 修法（推荐，尚未实施）

- **别再把 CSS 挂在宿主类名上。** JS 先用候选选择器 + 结构启发式（同时含 `h1–h6`、`table`、`blockquote`、`pre` 的最近公共容器）定位 markdown 根，打上 `data-dsh-structured-root`，CSS 全部改挂这个属性。宿主改名只影响「找容器」这一处，失败可观测。
- **加启动自检。** 命中 0 → 打一次 `console.warn('[dsh-structured] markdown root not found, selectors drifted')`，并把 `<html>` 的 `data-dsh-structured` 置为 `degraded`，让退化可见。
- 改 `src/client.js` 后必须 `npm run build`：`lib/client.js` = banner + `src/client.js`，有测试校验（`test/structured.test.mjs:480`）。

## 修完回归

1. 探针表：`markdownRoots>0`、`headingIcons>0`、`accentVar` 非空。
2. 四类元素目检：标题层级 + 图标、表格（表头/斑马纹/状态列）、代码块（banner 贴合 + 语言色）、引用卡（结论/风险/验收三色）。
3. 明暗两主题各一遍；窄窗（<720px）不横向溢出。
4. 流式输出 30 秒不冻结（MutationObserver 只在 rAF 后扫一次）。
