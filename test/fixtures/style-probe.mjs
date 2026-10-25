const task = await taskSpace("dsh-structured 0.9.6 computed style")
const page = task.page("p1")
const fixture = new URL("./first-glance.html", import.meta.url).href
await page.goto(fixture)
await page.waitForLoadState("load")
await page.waitForTimeout(400)
const style = await page.evaluate(() => {
  const q = (s) => document.querySelector(s)
  const cs = (el, pseudo) => getComputedStyle(el, pseudo)
  const statement = q('blockquote[data-dsh-structured-card-type="statement"]')
  const next = q('blockquote[data-dsh-structured-card-type="next"]')
  const table = q('table')
  const th = table.querySelector('thead th')
  const td = table.querySelector('tbody tr:nth-child(1) td:nth-child(3)')
  const lead = q('p[data-dsh-structured-lead="table"]')
  const title = statement.querySelector('strong')
  const nextTitle = next.querySelector('strong')
  const nextLi = next.querySelector('li')
  return {
    titleSize: cs(title).fontSize,
    titleWeight: cs(title).fontWeight,
    bodySize: cs(statement.querySelector('p')).fontSize,
    bodyLine: cs(statement.querySelector('p')).lineHeight,
    dividerHeight: cs(title, '::after').height,
    dividerBackground: cs(title, '::after').backgroundColor,
    headerSize: cs(th).fontSize,
    headerWeight: cs(th).fontWeight,
    headerHeight: cs(th).height,
    bodyCellSize: cs(td).fontSize,
    statusPillSize: cs(table.querySelector('tbody td')).fontSize,
    leadSize: cs(lead).fontSize,
    leadStrongSize: cs(lead.querySelector('strong')).fontSize,
    leadBorder: cs(lead).borderLeftWidth,
    nextTitleSize: cs(nextTitle).fontSize,
    nextTitleWeight: cs(nextTitle).fontWeight,
    nextStepSize: cs(nextLi).fontSize,
    nextBackground: cs(next).backgroundColor,
    nextBorderTop: cs(next).borderTopWidth,
    nextBorderBottom: cs(next).borderBottomWidth,
    triangleColor: cs(next, '::before').borderLeftColor,
    triangleLeftWidth: cs(next, '::before').borderLeftWidth,
    triangleTopWidth: cs(next, '::before').borderTopWidth,
    labelLeft: nextTitle.getBoundingClientRect().left,
    liLeft: nextLi.getBoundingClientRect().left,
    cardIconBefore: cs(statement, '::before').content,
  }
})
await page.cdp("Emulation.setDeviceMetricsOverride", { width: 800, height: 900, deviceScaleFactor: 1, mobile: false })
await page.waitForTimeout(200)
const narrow = await page.evaluate(() => ({
  innerWidth: window.innerWidth,
  docScrollWidth: document.documentElement.scrollWidth,
  bodyScrollWidth: document.body.scrollWidth,
  overflow: document.documentElement.scrollWidth > window.innerWidth,
}))
const result = { style, narrow }
const fs = await import("node:fs/promises")
const { fileURLToPath } = await import("node:url")
const output = fileURLToPath(new URL("../../artifacts/audit-0.9.6/style-result.json", import.meta.url))
await fs.mkdir(new URL("../../artifacts/audit-0.9.6/", import.meta.url), { recursive: true })
await fs.writeFile(output, JSON.stringify(result))
console.log("STYLE_JSON:" + JSON.stringify(result))
await task.finish({ keep: [] })
