// Silent end-to-end check of director-lab.html: the intro hands off into scene 1, the sound graph is
// scheduled, nothing is heard (Chromium --mute-audio + AudioContext kept suspended + media muted).
//   node tools/director-check.mjs [http://localhost:5291] [outDir]
import { chromium } from '/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/node_modules/playwright/index.mjs'

const base = process.argv[2] ?? 'http://localhost:5291'
const out = process.argv[3] ?? '.'
const SILENT = () => {
  const AC = window.AudioContext
  window.AudioContext = class extends AC { constructor(...a) { super(...a); super.suspend() } resume() { return Promise.resolve() } }
  const play = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function () { this.muted = true; return play.call(this) }
}

const browser = await chromium.launch({ args: ['--mute-audio', '--use-gl=angle'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.addInitScript(SILENT)
const logs = []
page.on('console', (m) => logs.push(`${m.type()}: ${m.text()}`))
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`))
await page.goto(`${base}/director-lab.html`)
await page.waitForFunction(() => window.__lab)
const audit = await page.evaluate(() => window.__lab.problems)

await page.evaluate(() => {
  window.__msgs = []
  addEventListener('message', (e) => window.__msgs.push({ t: performance.now(), type: e.data?.type, rect: e.data?.rect }))
  window.__t0 = performance.now()
  document.getElementById('intro').click()
})
const introT = () => page.evaluate(() => document.querySelector('#intro-host iframe')?.contentWindow.__intro?.clock.t ?? -1)
const shot = (name) => page.locator('#wrap').screenshot({ path: `${out}/${name}.png` })
await page.waitForFunction(() => window.__msgs.some((m) => m.type === 'hp-intro:ready'), null, { timeout: 60000 })
await page.waitForFunction(() => (document.querySelector('#intro-host iframe')?.contentWindow.__intro?.clock.t ?? 0) > 6, null, { timeout: 30000 })
await shot('1-museum-walk')
await page.waitForFunction(() => window.__msgs.some((m) => m.type === 'hp-intro:handoff'), null, { timeout: 30000 })
await shot('2-handoff')
const handoff = await page.evaluate(() => window.__msgs.find((m) => m.type === 'hp-intro:handoff'))
await page.waitForTimeout(1400)
await shot('3-inside-painting')
await page.waitForTimeout(800)
await shot('4-growing')
await page.waitForFunction(() => !document.querySelector('#intro-host iframe'), null, { timeout: 10000 })
await page.waitForTimeout(1500)
await shot('5-scene1')
const state = await page.evaluate(() => ({ sound: window.__lab.sound.state(), log: window.__lab.sound.log.map((l) => l.ev.kind + (l.ev.id ? ':' + l.ev.id : '') + (l.ev.t !== undefined ? '@' + l.ev.t : '')).slice(0, 12), stage: document.getElementById('stage').style.cssText }))
console.log(JSON.stringify({ audit, handoff, introStoppedAt: await introT(), state, logs: logs.slice(0, 10) }, null, 1))
await browser.close()
