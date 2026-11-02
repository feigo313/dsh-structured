const task = await taskSpace("dsh-structured v5 computed style")
const page = task.page("p1")
const fixture = new URL("./first-glance.html", import.meta.url).href
await page.goto(fixture)
await page.waitForLoadState("load")
await page.waitForTimeout(400)
// Pin a desktop viewport before measuring: the 720px media query changes table font-size.
await page.cdp("Emulation.setDeviceMetricsOverride", { width: 1200, height: 1200, deviceScaleFactor: 1, mobile: false })
await page.waitForTimeout(100)
const style = await page.evaluate(() => {
  const q = (s) => document.querySelector(s)
  const cs = (el, pseudo) => getComputedStyle(el, pseudo)
  const statement = q('blockquote[data-dsh-structured-card-type="statement"]')
  const conclusion = q('blockquote[data-dsh-structured-card-type="conclusion"]')
  const next = q('blockquote[data-dsh-structured-card-type="next"]')
  const risk = q('blockquote[data-dsh-structured-card-type="risk"]')
  const table = q('table')
  const th = table.querySelector('thead th')
  const bodyCell = table.querySelector('tbody tr:nth-child(1) td:nth-child(3)')
  const firstCell = table.querySelector('tbody tr:nth-child(1) td:nth-child(1)')
  const statusCell = table.querySelector('tbody tr:nth-child(1) td:nth-child(2)')
  const statusPill = statusCell.querySelector('.dss-status')
  const code = q('.md-code-block')
  const banner = code.querySelector('[data-code-block-banner]')
  const pre = code.querySelector('pre')
  const title = statement.querySelector('strong')
  const conclusionTitle = conclusion.querySelectorAll('p')[1]?.querySelector('strong')
  const nextTitle = next.querySelector('strong')
  const nextLi = next.querySelector('li')
  return {
    titleSize: cs(title).fontSize,
    titleWeight: cs(title).fontWeight,
    titleFamily: cs(title).fontFamily,
    bodySize: cs(statement.querySelector('p')).fontSize,
    bodyLine: cs(statement.querySelector('p')).lineHeight,
    cardRadius: cs(statement).borderRadius,
    cardLeft: cs(statement).borderLeftWidth,
    cardBackground: cs(statement).backgroundImage,
    conclusionTitleSize: cs(conclusionTitle).fontSize,
    headerSize: cs(th).fontSize,
    headerWeight: cs(th).fontWeight,
    headerColor: cs(th).color,
    headerBackground: cs(th).backgroundColor,
    headerBackgroundImage: cs(th).backgroundImage,
    bodyCellSize: cs(bodyCell).fontSize,
    firstCellWeight: cs(firstCell).fontWeight,
    firstCellSize: cs(firstCell).fontSize,
    statusText: statusPill.textContent,
    statusPillClass: statusPill.className,
    statusPillSize: cs(statusPill).fontSize,
    statusPillBackground: cs(statusPill).backgroundColor,
    statusPillColor: cs(statusPill).color,
    leadSize: cs(q('p[data-dsh-structured-lead="table"]')).fontSize,
    leadStrongSize: cs(q('p[data-dsh-structured-lead="table"] strong')).fontSize,
    leadStrongWeight: cs(q('p[data-dsh-structured-lead="table"] strong')).fontWeight,
    nextTitleSize: cs(nextTitle).fontSize,
    nextTitleColor: cs(nextTitle).color,
    nextStepSize: cs(nextLi).fontSize,
    nextRadius: cs(next).borderRadius,
    nextLeft: cs(next).borderLeftWidth,
    nextBackground: cs(next).backgroundImage,
    riskLeft: cs(risk).borderLeftWidth,
    riskLeftColor: cs(risk).borderLeftColor,
    codeRadius: cs(code).borderRadius,
    codeLeft: cs(code).borderLeftWidth,
    codeBannerColor: cs(banner).color,
    codeBannerSize: cs(banner).fontSize,
    codePreBackground: cs(pre).backgroundColor,
    codePreColor: cs(pre).color,
    codePreSize: cs(pre).fontSize,
    copyButton: Boolean(code.querySelector('[data-dsh-structured-copy]')),
  }
})
const dark = await page.evaluate(() => {
  document.body.setAttribute("data-ds-dark-theme", "")
  const q = (s) => document.querySelector(s)
  const cs = (el) => getComputedStyle(el)
  return {
    cardBackground: cs(q('blockquote[data-dsh-structured-card-type="statement"]')).backgroundImage,
    tableHeadBackground: cs(q('table thead th')).backgroundColor,
    tableHeadBackgroundImage: cs(q('table thead th')).backgroundImage,
    tableHeadColor: cs(q('table thead th')).color,
    codePreBackground: cs(q('.md-code-block pre')).backgroundColor,
    codePreColor: cs(q('.md-code-block pre')).color,
    statusBackground: cs(q('.dss-status')).backgroundColor,
  }
})
await page.evaluate(() => document.body.removeAttribute("data-ds-dark-theme"))
await page.cdp("Emulation.setDeviceMetricsOverride", { width: 800, height: 900, deviceScaleFactor: 1, mobile: false })
await page.waitForTimeout(200)
const narrow = await page.evaluate(() => ({
  innerWidth: window.innerWidth,
  docScrollWidth: document.documentElement.scrollWidth,
  bodyScrollWidth: document.body.scrollWidth,
  overflow: document.documentElement.scrollWidth > window.innerWidth,
}))
const result = { style: { ...style, dark }, narrow }
const fs = await import("node:fs/promises")
const { fileURLToPath } = await import("node:url")
const output = fileURLToPath(new URL("../../artifacts/audit-0.9.6/style-result.json", import.meta.url))
await fs.mkdir(new URL("../../artifacts/audit-0.9.6/", import.meta.url), { recursive: true })
await fs.writeFile(output, JSON.stringify(result))
console.log("STYLE_JSON:" + JSON.stringify(result))
await task.finish({ keep: [] })
