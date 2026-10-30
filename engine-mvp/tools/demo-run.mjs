// Plays a whole vault lesson in the real browser, MUTED, 1280x720: records one MP4-ready webm and takes a still
// of every scene (a few seconds in). Cards are answered the quick way so the lesson keeps moving.
//   node tools/demo-run.mjs [base=http://localhost:5391] [outDir=.] [lesson=hunebedden]
import { mkdirSync, readdirSync, renameSync } from 'node:fs'
import { chromium } from '/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/node_modules/playwright/index.mjs'

const [base = 'http://localhost:5391', out = '.', lessonId = 'hunebedden'] = process.argv.slice(2)
mkdirSync(`${out}/stills`, { recursive: true })
const SILENT = () => {
  const AC = window.AudioContext
  window.AudioContext = class extends AC { constructor(...a) { super(...a); super.suspend() } resume() { return Promise.resolve() } }
  const play = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function () { this.muted = true; return play.call(this) }
}
const browser = await chromium.launch({ args: ['--mute-audio', '--use-gl=angle'] })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: `${out}/video-raw`, size: { width: 1280, height: 720 } } })
const page = await ctx.newPage()
await page.addInitScript(SILENT)
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('response', (r) => { if (r.status() >= 400) errors.push(`http ${r.status()} ${r.url()}`) })
await page.goto(`${base}/play.html?lesson=${lessonId}&intro=0${process.env.DRESS ? '&dress=' + process.env.DRESS : ''}`)
await page.waitForFunction(() => window.__play, null, { timeout: 60000 })
const info = await page.evaluate(() => ({ scenes: window.__play.lesson.scenes.map((s) => ({ id: s.id, dur: s.dur_s })), total: window.__play.player.duration(), problems: window.__play.problems }))
console.log('scenes', info.scenes.length, 'total', info.total, 'problems', JSON.stringify(info.problems).slice(0, 400))
await page.click('#start')
await page.waitForFunction(() => window.__play.player.scene().playing, null, { timeout: 30000 })

const shot = new Set()
const t0 = Date.now()
let idle = 0, last = -1
while (shot.size < info.scenes.length && Date.now() - t0 < 40 * 60 * 1000) {
  const s = await page.evaluate(() => window.__play.player.scene())
  const i = s.index
  const card = await page.$('[data-testid=card]')
  if (card && !shot.has(i)) { // held scene: still of the held picture counts as that scene's frame
    await page.locator('#wrap').screenshot({ path: `${out}/stills/${String(i + 1).padStart(2, '0')}-${info.scenes[i].id}.png` }); shot.add(i)
  }
  if (card) {
    const opts = await card.$$('[data-testid=options] button')
    const kind = opts.length ? 'opts' : 'btn'
    try {
      if (opts.length >= 3 && (await page.$$('[data-testid=options] button')).length) { for (const b of opts) await b.click({ timeout: 1500 }).catch(() => {}) }
      else if (opts.length) await opts[0].click({ timeout: 1500 })
      else await (await card.$('button.btn-primary'))?.click({ timeout: 1500 })
      await page.waitForTimeout(400)
      await (await page.$('[data-testid=card] footer button.btn-primary'))?.click({ timeout: 1500 })
      await page.waitForSelector('[data-testid=card]', { state: 'detached', timeout: 6000 })
    } catch (e) { errors.push(`card ${info.scenes[i].id} ${kind}: ${e.message.split('\n')[0]}`); await page.evaluate(() => window.__play.player.resume?.()) }
    continue
  }
  const want = Math.min(3, (info.scenes[i].dur ?? 6) * 0.5)
  if (!shot.has(i) && s.t >= want) {
    await page.locator('#wrap').screenshot({ path: `${out}/stills/${String(i + 1).padStart(2, '0')}-${info.scenes[i].id}.png` }); shot.add(i)
  }
  if (i === info.scenes.length - 1 && s.t >= (info.scenes[i].dur ?? 6) - 0.5) break
  if (s.index === last && s.t === (idle ? idle : -1)) { /* stalled */ }
  last = i
  await page.waitForTimeout(250)
}
console.log('stills', shot.size, 'elapsed s', (Date.now() - t0) / 1000, 'errors', errors.length)
console.log(errors.slice(0, 20).join('\n'))
await ctx.close(); await browser.close()
const f = readdirSync(`${out}/video-raw`).find((x) => x.endsWith('.webm'))
if (f) renameSync(`${out}/video-raw/${f}`, `${out}/lesson.webm`)
