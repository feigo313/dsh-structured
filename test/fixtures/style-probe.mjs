// 样式门禁探针：ego lite 打开两份夹具读真实 computed style；夹具由 make-fixtures.mjs 生成，
// 页面加载时执行 lib/client.js 的 apply → decorate。取样规则：每处先 need(sel, name)，缺失抛
// STYLE_PROBE_MISSING（不许可选链吞掉）；颜色用 var(--dss-x) 求值做 token 关系；字号/圆角/边条
// 保留字面量，依据行号写在 scripts/style-gate.mjs 注释里。
const task = await taskSpace("dsh-structured style probe (1.2.0)")
const page = task.page("p1")
await page.goto(new URL("./first-glance.html", import.meta.url).href)
await page.waitForLoadState("load")
await page.waitForTimeout(400)
// Pin a desktop viewport before measuring: the 720px media query changes table font-size.
await page.cdp("Emulation.setDeviceMetricsOverride", { width: 1200, height: 1400, deviceScaleFactor: 1, mobile: false })
await page.waitForTimeout(100)

// 探针辅助函数挂在 window 上，后续几次 evaluate 共用同一套「缺失即抛」语义。
await page.evaluate(() => {
  const scope = document.querySelector('.dss-scope')
  if (!scope) throw new Error('STYLE_PROBE_MISSING: markdown 范围 .dss-scope')
  const probeElement = document.createElement('div')
  probeElement.setAttribute('data-dss-probe', '1')
  probeElement.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none'
  scope.appendChild(probeElement)
  window.__dssProbe = {
    need(selector, name) {
      const element = document.querySelector(selector)
      if (!element) throw new Error('STYLE_PROBE_MISSING: ' + name + ' [' + selector + ']')
      return element
    },
    cs(element, pseudo) {
      return getComputedStyle(element, pseudo)
    },
    // 把 var(--token) 当某个 CSS 属性求值：返回 computed 形态，和 getComputedStyle 同口径。
    token(name, property) {
      probeElement.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none'
      probeElement.style[property] = 'var(' + name + ')'
      return getComputedStyle(probeElement)[property]
    },
    cleanup() {
      probeElement.remove()
    },
  }
})

const style = await page.evaluate(() => {
  const { need, cs, token } = window.__dssProbe
  const statement = need('.dss-card-statement', '首段 statement 卡')
  const conclusion = need('.dss-card-conclusion', '结论卡')
  const next = need('.dss-card-next', '建议卡')
  const risk = need('.dss-card-risk', '风险卡')
  const short = need('.dss-card-short', '短答卡')
  const table = need('.dss-table', '表格')
  const th = need('.dss-table thead th', '表头单元格')
  const bodyCell = need('.dss-table tbody tr:nth-child(1) td:nth-child(3)', '表格正文单元格')
  const firstCell = need('.dss-table tbody tr:nth-child(1) td:nth-child(1)', '表格首列单元格')
  const statusCell = need('.dss-table tbody td[data-dsh-structured-status-cell="success"]', '成功态状态单元格')
  need('.dss-table tbody td[data-dsh-structured-status-cell="warn"]', '观察态状态单元格')
  need('.dss-table tbody td[data-dsh-structured-status-cell="error"]', '阻断态状态单元格')
  const code = need('.dss-code', '代码块')
  const banner = need('.dss-code [data-code-block-banner]', '代码块 banner')
  const pre = need('.dss-code pre', '代码块 pre')
  const title = need('.dss-card-statement > p:first-child > strong', '首段卡标题')
  const conclusionTitle = need('.dss-card-conclusion > p:nth-child(2) > strong', '结论卡加粗结论')
  const nextTitle = need('.dss-card-next > p:first-child > strong', '建议卡标签')
  const nextLi = need('.dss-card-next li', '建议卡列表项')
  const lead = need('p[data-dsh-structured-lead="table"]', '表格引导段')
  const leadStrong = need('p[data-dsh-structured-lead="table"] strong', '表格引导段加粗词')
  const labels = {}
  for (const [type, selector] of [['conclusion', '.dss-card-conclusion'], ['next', '.dss-card-next'], ['risk', '.dss-card-risk'], ['short', '.dss-card-short']]) {
    const node = need(selector + ' [data-dsh-card-label]', type + ' 卡标签')
    labels[type] = node.getAttribute('data-dsh-card-label')
  }
  const shadow = cs(statusCell).boxShadow
  return {
    labels,
    titleSize: cs(title).fontSize,
    titleWeight: cs(title).fontWeight,
    titleFamily: cs(title).fontFamily,
    bodySize: cs(need('.dss-card-statement > p', '首段卡正文')).fontSize,
    bodyLine: cs(need('.dss-card-statement > p', '首段卡正文')).lineHeight,
    cardRadius: cs(statement).borderRadius,
    cardLeft: cs(statement).borderLeftWidth,
    cardBlueSoft: cs(statement).backgroundImage.includes(token('--dss-blue-soft', 'backgroundColor')),
    conclusionTitleSize: cs(conclusionTitle).fontSize,
    headerSize: cs(th).fontSize,
    headerWeight: cs(th).fontWeight,
    headerThToken: cs(th).color === token('--dss-th-text', 'color'),
    headerHeadBgToken: cs(th).backgroundImage === token('--dss-head-bg', 'backgroundImage'),
    bodyCellSize: cs(bodyCell).fontSize,
    firstCellWeight: cs(firstCell).fontWeight,
    firstCellSize: cs(firstCell).fontSize,
    statusCellAttr: statusCell.getAttribute('data-dsh-structured-status-cell'),
    statusCellText: (statusCell.textContent || '').trim(),
    statusCellGreenSoft: cs(statusCell).backgroundColor === token('--dss-green-soft', 'backgroundColor'),
    statusCellGreenBar: shadow.includes(token('--dss-green', 'backgroundColor')),
    statusCellBarInset: shadow.includes('inset'),
    statusCellBarWidth: /(?:^|\s)(\d+)px(?:\s|$)/.exec(shadow)?.[1] + 'px',
    leadSize: cs(lead).fontSize,
    leadStrongSize: cs(leadStrong).fontSize,
    leadStrongWeight: cs(leadStrong).fontWeight,
    nextTitleSize: cs(nextTitle).fontSize,
    nextTitleGreenText: cs(nextTitle).color === token('--dss-green-text', 'color'),
    nextStepSize: cs(nextLi).fontSize,
    nextRadius: cs(next).borderRadius,
    nextLeft: cs(next).borderLeftWidth,
    nextGreenSoft: cs(next).backgroundImage.includes(token('--dss-green-soft', 'backgroundColor')),
    riskLeft: cs(risk).borderLeftWidth,
    riskAmberStrong: cs(risk).borderLeftColor === token('--dss-amber-strong', 'borderLeftColor'),
    shortBlue: cs(short).borderLeftColor === token('--dss-blue', 'borderLeftColor'),
    shortBlueSoft: cs(short).backgroundImage.includes(token('--dss-blue-soft', 'backgroundColor')),
    codeRadius: cs(code).borderRadius,
    codeLeft: cs(code).borderLeftWidth,
    codeBannerBlueText: cs(banner).color === token('--dss-blue-text', 'color'),
    codeBannerSize: cs(banner).fontSize,
    codePreCodeBg: cs(pre).backgroundColor === token('--dss-code-bg', 'backgroundColor'),
    codePreCodeText: cs(pre).color === token('--dss-code-text', 'color'),
    codePreCodeSize: cs(pre).fontSize,
    copyButton: Boolean(code.querySelector('[data-dsh-structured-copy]')),
  }
})

const dark = await page.evaluate(() => {
  document.body.setAttribute('data-ds-dark-theme', '')
  const { need, cs, token } = window.__dssProbe
  const card = need('.dss-card-statement', '深色-首段卡')
  const th = need('.dss-table thead th', '深色-表头单元格')
  const pre = need('.dss-code pre', '深色-代码块 pre')
  const statusCell = need('.dss-table tbody td[data-dsh-structured-status-cell="success"]', '深色-成功态状态单元格')
  const out = {
    cardBlueSoft: cs(card).backgroundImage.includes(token('--dss-blue-soft', 'backgroundColor')),
    tableHeaderThToken: cs(th).color === token('--dss-th-text', 'color'),
    tableHeaderHeadBgToken: cs(th).backgroundImage === token('--dss-head-bg', 'backgroundImage'),
    codePreCodeBg: cs(pre).backgroundColor === token('--dss-code-bg', 'backgroundColor'),
    codePreCodeText: cs(pre).color === token('--dss-code-text', 'color'),
    statusCellGreenSoft: cs(statusCell).backgroundColor === token('--dss-green-soft', 'backgroundColor'),
  }
  document.body.removeAttribute('data-ds-dark-theme')
  return out
})

await page.cdp("Emulation.setDeviceMetricsOverride", { width: 800, height: 900, deviceScaleFactor: 1, mobile: false })
await page.waitForTimeout(200)
const narrow = await page.evaluate(() => {
  window.__dssProbe.cleanup()
  return {
    innerWidth: window.innerWidth,
    docScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    overflow: document.documentElement.scrollWidth > window.innerWidth,
  }
})

// Persona 视觉探针：独立页面 + 人格开启态（身份头 / 前后缀 / 三卡 + 短答 / 表格）。
const personaPage = await task.newPage()
await personaPage.goto(new URL("./persona-glance.html", import.meta.url).href)
await personaPage.waitForLoadState("load")
await personaPage.waitForTimeout(600)
await personaPage.cdp("Emulation.setDeviceMetricsOverride", { width: 1200, height: 1600, deviceScaleFactor: 1, mobile: false })
await personaPage.waitForTimeout(150)

await personaPage.evaluate(() => {
  const scope = document.querySelector('.dss-scope')
  if (!scope) throw new Error('STYLE_PROBE_MISSING: persona markdown 范围 .dss-scope')
  const probeElement = document.createElement('div')
  probeElement.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none'
  scope.appendChild(probeElement)
  window.__dssProbe = {
    need(selector, name) {
      const element = document.querySelector(selector)
      if (!element) throw new Error('STYLE_PROBE_MISSING: ' + name + ' [' + selector + ']')
      return element
    },
    cs(element) { return getComputedStyle(element) },
    token(name, property) {
      probeElement.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none'
      probeElement.style[property] = 'var(' + name + ')'
      return getComputedStyle(probeElement)[property]
    },
    cleanup() { probeElement.remove() },
  }
})

const persona = await personaPage.evaluate(() => {
  const { need, cs, token } = window.__dssProbe
  const head = need('.dss-persona-head', '人格身份头')
  const name = need('.dss-persona-head .dss-chat-name', '身份头名字')
  const row = need('.dss-persona-head .dss-chat-head', '身份头行')
  const avatar = need('.dss-persona-head .dss-chat-avatar', '身份头头像')
  need('.dss-persona-head .dss-chat-avatar img', '身份头头像图')
  need('.dss-persona-head .dss-chat-meta', '身份头签名')
  const prefix = need('.dss-persona-prefix', '人格开场前缀')
  const suffix = need('.dss-persona-suffix', '人格收尾后缀')
  const conclusion = need('.dss-card-conclusion', '人格结论卡')
  const conclusionLead = need('.dss-card-conclusion > p:nth-child(2) > strong', '人格结论卡加粗结论')
  const nextTitle = need('.dss-card-next > p:first-child > strong', '人格建议卡标签')
  const risk = need('.dss-card-risk', '人格风险卡')
  const short = need('.dss-card-short', '人格短答卡')
  const table = need('.dss-table', '人格表格')
  const th = need('.dss-table thead th', '人格表头单元格')
  return {
    headCount: document.querySelectorAll('.dss-persona-head').length,
    prefixCount: document.querySelectorAll('.dss-persona-prefix').length,
    suffixCount: document.querySelectorAll('.dss-persona-suffix').length,
    prefixSize: cs(prefix).fontSize,
    suffixSize: cs(suffix).fontSize,
    suffixBorderTop: cs(suffix).borderTopWidth + ' ' + cs(suffix).borderTopStyle,
    headPadding: cs(head).padding,
    headRowDisplay: cs(row).display,
    headAvatarWidth: cs(avatar).width,
    headAvatarRadius: cs(avatar).borderRadius,
    headNameSize: cs(name).fontSize,
    headNameWeight: cs(name).fontWeight,
    headIsScope: head.classList.contains('dss-scope'),
    headHasName: (name.textContent || '').trim().length > 0,
    conclusionLeadSize: cs(conclusionLead).fontSize,
    conclusionLeadWeight: cs(conclusionLead).fontWeight,
    nextLabelGreenText: cs(nextTitle).color === token('--dss-green-text', 'color'),
    riskAmberStrong: cs(risk).borderLeftColor === token('--dss-amber-strong', 'borderLeftColor'),
    shortBlue: cs(short).borderLeftColor === token('--dss-blue', 'borderLeftColor'),
    shortBlueSoft: cs(short).backgroundImage.includes(token('--dss-blue-soft', 'backgroundColor')),
    tableBlue: cs(table).borderLeftColor === token('--dss-blue', 'borderLeftColor'),
    tableHeaderThToken: cs(th).color === token('--dss-th-text', 'color'),
    tableHeaderHeadBgToken: cs(th).backgroundImage === token('--dss-head-bg', 'backgroundImage'),
  }
})

const personaDark = await personaPage.evaluate(() => {
  document.body.setAttribute('data-ds-dark-theme', '')
  const { need, cs, token } = window.__dssProbe
  const th = need('.dss-table thead th', '深色-人格表头单元格')
  const short = need('.dss-card-short', '深色-人格短答卡')
  const name = need('.dss-persona-head .dss-chat-name', '深色-身份头名字')
  const table = need('.dss-table', '深色-人格表格')
  const out = {
    tableHeaderThToken: cs(th).color === token('--dss-th-text', 'color'),
    tableHeaderHeadBgToken: cs(th).backgroundImage === token('--dss-head-bg', 'backgroundImage'),
    shortBlue: cs(short).borderLeftColor === token('--dss-blue', 'borderLeftColor'),
    nameInk: cs(name).color === token('--dss-ink', 'color'),
    tableBlue: cs(table).borderLeftColor === token('--dss-blue', 'borderLeftColor'),
  }
  document.body.removeAttribute('data-ds-dark-theme')
  return out
})

const result = { style: { ...style, dark }, narrow, persona: { ...persona, dark: personaDark } }
const fs = await import("node:fs/promises")
const { fileURLToPath } = await import("node:url")
const output = fileURLToPath(new URL("../../artifacts/audit-0.9.6/style-result.json", import.meta.url))
await fs.mkdir(new URL("../../artifacts/audit-0.9.6/", import.meta.url), { recursive: true })
await fs.writeFile(output, JSON.stringify(result))
console.log("STYLE_JSON:" + JSON.stringify(result))
await task.finish({ keep: [] })
