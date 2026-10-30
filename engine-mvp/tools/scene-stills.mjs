// A still per scene (seeked, not played), MUTED, 1280x720: the quick look at a set of scenes.
//   node tools/scene-stills.mjs <base> <outDir> [lesson=hunebedden] [scenes=all|figures|1,5,9] [t=3.5]
import { mkdirSync } from 'node:fs'
import { chromium } from '/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/node_modules/playwright/index.mjs'

const [base, out, lessonId = 'hunebedden', which = 'all', tArg = '3.5'] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const SILENT = () => {
  const AC = window.AudioContext
  window.AudioContext = class extends AC { constructor(...a) { super(...a); super.suspend() } resume() { return Promise.resolve() } }
  const play = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function () { this.muted = true; return play.call(this) }
}
const browser = await chromium.launch({ args: ['--mute-audio', '--use-gl=angle'] })
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage()
await page.addInitScript(SILENT)
const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('response', (r) => { if (r.status() >= 400) errors.push(`http ${r.status()} ${r.url()}`) })
await page.goto(`${base}/play.html?lesson=${lessonId}&intro=0`)
await page.waitForFunction(() => window.__play, null, { timeout: 60000 })
await page.click('#start')
await page.waitForFunction(() => window.__play.player.scene().playing, null, { timeout: 30000 })
await page.evaluate(() => window.__play.player.pause())
const scenes = await page.evaluate(() => window.__play.lesson.scenes.map((s) => ({ id: s.id, dur: s.dur_s, figs: (s.figures ?? []).length, balloons: s.balloons ?? [] })))
const picks = which === 'all' ? scenes.map((_, i) => i) : which === 'figures' ? scenes.map((s, i) => (s.figs ? i : -1)).filter((i) => i >= 0) : which.split(',').map((n) => Number(n) - 1)
for (const i of picks) {
  // a still where the first balloon shows (else mid-scene), so the tail and the speaker are in the picture
  const b = scenes[i].balloons.find((x) => x.at_s !== undefined)
  const t = b ? b.at_s + 0.4 : Math.min(Number(tArg), (scenes[i].dur ?? 6) * 0.5)
  await page.evaluate(([i, t]) => window.__play.player.seek(i, t), [i, t])
  await page.waitForTimeout(900)
  await page.locator('#wrap').screenshot({ path: `${out}/${String(i + 1).padStart(2, '0')}-${scenes[i].id}.png` })
}
console.log('stills', picks.length, 'errors', errors.length, errors.slice(0, 5))
await browser.close()
