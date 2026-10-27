// Silent end-to-end check of play.html: intro -> handoff -> the directed lesson on S1's stage with
// LessonSound, then a frame every 10 s of lesson time for a contact sheet. Nothing is heard:
// Chromium --mute-audio, AudioContext kept suspended, media muted.
//   node tools/play-check.mjs [base=http://localhost:5291] [outDir=.] [lesson=eerste-boeren-1] [stepS=10]
import { mkdirSync } from 'node:fs'
import { chromium } from '/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/node_modules/playwright/index.mjs'

const [base = 'http://localhost:5291', out = '.', lessonId = 'eerste-boeren-1', stepArg = '10'] = process.argv.slice(2)
const STEP = Number(stepArg)
mkdirSync(`${out}/frames`, { recursive: true })
const SILENT = () => {
  const AC = window.AudioContext
  window.AudioContext = class extends AC { constructor(...a) { super(...a); super.suspend() } resume() { return Promise.resolve() } }
  const play = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function () { this.muted = true; return play.call(this) }
}

const browser = await chromium.launch({ args: ['--mute-audio', '--use-gl=angle'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
await page.addInitScript(SILENT)
const errors = [], warnings = [], failed = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning') warnings.push(m.text()) })
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('requestfailed', (r) => failed.push(r.url()))
page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`) })

await page.goto(`${base}/play.html?lesson=${lessonId}`)
await page.waitForFunction(() => window.__play, null, { timeout: 60000 })
const info = await page.evaluate(() => ({ id: window.__play.lesson.id, scenes: window.__play.lesson.scenes.length, problems: window.__play.problems, total: window.__play.starts.at(-1) + window.__play.lesson.scenes.at(-1).dur_s }))

// intro -> handoff -> the lesson plays
await page.evaluate(() => { window.__msgs = []; addEventListener('message', (e) => window.__msgs.push(e.data?.type)) })
await page.click('#start')
await page.waitForFunction(() => window.__msgs.includes('hp-intro:ready'), null, { timeout: 90000 })
await page.waitForFunction(() => window.__msgs.includes('hp-intro:handoff'), null, { timeout: 60000 })
await page.locator('#wrap').screenshot({ path: `${out}/intro-handoff.png` })
await page.waitForFunction(() => !document.querySelector('#intro-host iframe'), null, { timeout: 15000 })
const t0 = await page.evaluate(() => window.__play.lessonTime())
await page.waitForTimeout(12000)
const played = await page.evaluate(() => ({ t: window.__play.lessonTime(), scene: window.__play.player.scene(), fps: window.__play.player.fps() }))
await page.locator('#wrap').screenshot({ path: `${out}/playing-12s.png` })
const sound = await page.evaluate(() => {
  const s = window.__play.sound
  const kinds = {}
  for (const l of s.log) kinds[l.ev.kind] = (kinds[l.ev.kind] ?? 0) + 1
  return { state: s.state(), kinds, first: s.log.slice(0, 8).map((l) => `${l.ev.kind}${l.ev.id ? ':' + l.ev.id : ''}${l.ev.t !== undefined ? '@' + l.ev.t : ''}`) }
})

// contact sheet: seek to every STEP s of lesson time, let the scene build, grab the frame
await page.evaluate(() => window.__play.player.pause())
const shots = []
for (let at = 0, k = 0; at < info.total; at += STEP, k++) {
  const where = await page.evaluate(async (time) => {
    const p = window.__play, i = Math.max(0, p.starts.filter((s) => s <= time).length - 1)
    await p.player.seek(i, time - p.starts[i])
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const s = p.lesson.scenes[i], local = time - p.starts[i]
    const shots = [s.camera, ...(s.camera_more ?? [])].filter(Boolean)
    const c = [...shots].reverse().find((x) => (x.at_s ?? 0) <= local) ?? shots[0]
    return { i, id: s.id, beat: s.beat, move: c?.move, scale: c?.scale, misses: p.player.stage.misses.filter((m) => m.scene === s.id).length }
  }, at)
  await page.locator('#stage').screenshot({ path: `${out}/frames/f${String(k).padStart(3, '0')}.png` })
  shots.push({ at, ...where })
}
console.log(JSON.stringify({ info, t0, played, sound, shots: shots.length, misses: shots.reduce((a, s) => a + s.misses, 0), sample: shots.slice(0, 6), errors, failed, warnings: warnings.slice(0, 8) }, null, 1))
await browser.close()
