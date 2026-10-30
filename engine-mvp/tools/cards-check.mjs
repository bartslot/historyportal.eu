// Every interaction card of the vault lessons, measured before and after the class's answer, at several
// screen sizes, silently (cards-lab.html; no sound plays there). The PM's bar: nothing cut mid-line, the
// explanation box never scrolls (only text over 400 characters may, with a fade), the teacher's buttons
// always in view, the card at most 60 % of the frame.
//   node tools/cards-check.mjs [base=http://localhost:5294] [outDir=.] [sizes=1024x768,1280x720,1920x1080,3840x2160]
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from '/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/node_modules/playwright/index.mjs'

const [base = 'http://localhost:5294', out = '.', sizesArg = '1024x768,1280x720,1920x1080,3840x2160'] = process.argv.slice(2)
const NOTE_SCROLL_CHARS = 400

const measure = (page) => page.evaluate((scrollChars) => {
  const card = document.querySelector('[data-testid=card] section'), frame = document.getElementById('wrap')
  const clipped = (el) => {
    const b = el.getBoundingClientRect()
    for (let p = el.parentElement; p && p !== card.parentElement; p = p.parentElement) {
      if (getComputedStyle(p).overflowY === 'visible') continue
      const q = p.getBoundingClientRect()
      if (b.top < q.top - 1 || b.bottom > q.bottom + 1) return true
    }
    return false
  }
  const texts = [...card.querySelectorAll('*')].filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
  const note = card.querySelector('[data-testid=note]')
  const noteLen = note?.textContent.length ?? 0
  const noteOverflows = !!note && note.scrollHeight > note.clientHeight + 1
  return {
    share: +(card.parentElement.getBoundingClientRect().height / frame.getBoundingClientRect().height).toFixed(3),
    clippedText: texts.filter((el) => el !== note && clipped(el)).map((el) => el.textContent.trim().slice(0, 40)),
    noteLen, noteOverflows,
    // overflow only past 400 characters and then WITH the fade; a fade on a note that fits dims text for nothing
    noteOk: noteOverflows ? noteLen > scrollChars && /gradient/.test(getComputedStyle(note).maskImage || getComputedStyle(note).webkitMaskImage || '')
      : !note || !/gradient/.test(getComputedStyle(note).maskImage || getComputedStyle(note).webkitMaskImage || ''),
    noteClipped: !!note && clipped(note),
    footerVisible: [...card.querySelectorAll('footer button')].every((b) => !clipped(b)),
    notePx: note ? parseFloat(getComputedStyle(note).fontSize) : null,
    noteFade: !!note && /gradient/.test(getComputedStyle(note).maskImage || getComputedStyle(note).webkitMaskImage || ''),
  }
}, NOTE_SCROLL_CHARS)

/** What the class does: a WRONG pick on a graded quiz (most kept), the first choice, every meter word,
 *  or the card's own step (sort, discuss, team). */
async function answer(page, f) {
  const card = page.locator('[data-testid=card]')
  const kind = await card.getAttribute('data-kind')
  if (kind === 'meter') {
    // by name: once the meter is full the wrong words leave the card
    const words = await card.locator('[data-testid=options] button').allTextContents()
    for (const w of words) { const b = card.locator('[data-testid=options] button', { hasText: w }); if (await b.count()) await b.first().click({ timeout: 3000 }) }
    return
  }
  if (kind === 'answer') {
    const n = await card.locator('[data-testid=options] button').count()
    const right = Array.isArray(f.correct) ? f.correct : f.correct === null ? [] : [f.correct]
    const wrong = [...Array(n).keys()].find((i) => !right.includes(i)) ?? 0 // the first WRONG option: the most stays kept
    await card.locator('[data-testid=options] button').nth(wrong).click()
    return
  }
  if (kind === 'choose' || kind === 'vote') { await card.locator('[data-testid=options] button').first().click(); return }
  await card.locator('footer button.btn-primary').first().click({ timeout: 3000 })
}

const browser = await chromium.launch({ args: ['--mute-audio'] })
const report = {}
for (const size of sizesArg.split(',')) {
  const [w, h] = size.split('x').map(Number)
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto(`${base}/cards-lab.html`)
  await page.waitForFunction(() => window.__cards)
  const fixtures = await page.evaluate(() => window.__cards.fixtures)
  mkdirSync(`${out}/${size}`, { recursive: true })
  const rows = []
  for (let i = 0; i < fixtures.length; i++) {
    await page.evaluate((k) => window.__cards.show(k), i)
    await page.waitForSelector('[data-testid=card]')
    await page.waitForTimeout(80)
    const before = await measure(page)
    let answerError = null
    try { await answer(page, fixtures[i]) } catch (e) { answerError = `${fixtures[i].id}: ${e.message.split('\n')[0]}` }
    await page.waitForTimeout(150)
    const after = await measure(page)
    const ok = (m) => m.clippedText.length === 0 && m.noteOk && !m.noteClipped && m.footerVisible && m.share <= 0.605
    const pass = ok(before) && ok(after) && !answerError
    const name = fixtures[i].id.replace(/[/+]/g, '_')
    if (!pass || /\+4kept|rembrandt\/sc34|hunebedden\/sc35|synthetic\//.test(fixtures[i].id)) await page.locator('#wrap').screenshot({ path: `${out}/${size}/${pass ? 'ok' : 'FAIL'}-${name}.png` })
    rows.push({ ...fixtures[i], pass, before, after, answerError })
  }
  report[size] = { errors, outsized: rows.find((r) => r.id === 'synthetic/outsized')?.after, longFits: rows.find((r) => r.id === 'synthetic/long-fits')?.after, cards: rows.length, failed: rows.filter((r) => !r.pass).map((r) => ({ id: r.id, answerError: r.answerError, before: r.before, after: r.after })), maxShare: Math.max(...rows.map((r) => r.after.share)), minNotePx: Math.min(...rows.map((r) => r.after.notePx ?? 99)) }
  await page.close()
}
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1))
for (const [size, r] of Object.entries(report)) console.log(`${size}: ${r.cards} cards, ${r.failed.length} failed, max card ${Math.round(r.maxShare * 100)} % of the frame, note >= ${r.minNotePx} px, ${r.errors.length} errors`)
for (const [size, r] of Object.entries(report)) for (const [k, n] of [['outsized', r.outsized], ['long-fits', r.longFits]]) if (n) console.log(`${size} ${k} note: ${n.noteLen} chars, overflows ${n.noteOverflows}, fade ${n.noteFade}, ok ${n.noteOk}`)
await browser.close()
