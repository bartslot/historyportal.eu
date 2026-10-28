// Frames of the four puppets in S1's real stage (stage25d.html): every pose in the 3/4, side and front views.
// Silent: Chromium runs with --mute-audio and an init script keeps every AudioContext suspended.
// usage: node src/figures/capture_puppets.mjs [http://localhost:5196] [out dir]   (the dev server must be running)
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT ?? 'playwright')
const base = process.argv[2] ?? 'http://localhost:5196'
const out = process.argv[3] ?? `${homedir()}/BartsMedia/historyportal/topics/autonomous-lessons/puppet-parts/stage`
mkdirSync(out, { recursive: true })

const SILENT = () => {
  const A = window.AudioContext
  if (A) window.AudioContext = function (...a) { const c = new A(...a); c.suspend(); return c }
  HTMLMediaElement.prototype.play = function () { this.muted = true; this.pause(); return Promise.resolve() }
  if (window.speechSynthesis) window.speechSynthesis.speak = () => {}
}
const CAST = [['boer-vrouw', 0.2], ['boer-man', 0.4], ['voc-matroos', 0.6], ['voc-kapitein', 0.8]]

const browser = await chromium.launch({ args: ['--mute-audio', '--use-angle=metal', '--enable-gpu'] })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
await page.addInitScript(SILENT)
await page.goto(`${base}/stage25d.html?lesson=lessons/hunebedden.json&library=library/nl-prehistory/_v1_codex/library.json`)
await page.waitForFunction(() => window.__stage25d?.stage?.scene, null, { timeout: 60000 })
await page.waitForTimeout(6000)
await page.evaluate(async (cast) => {
  const P = window.__stage25d
  P.pause()
  const m = await import('/src/figures/puppet.ts')
  window.__pups = []
  for (const [id, x] of cast) {
    const p = await m.createPuppet(P.stage.scene, id)
    m.placePuppet(p, { x, depth: 'fg', facing: 'right' }, P.stage)
    window.__pups.push(p)
  }
  window.__pm = m
}, CAST)
const canvas = page.locator('canvas').first()
const frames = []
for (const view of ['34', 'side', 'front']) {
  for (const pose of ['stand', 'walk', 'point', 'carry', 'kneel', 'sit']) {
    const verdict = await page.evaluate(async ([view, pose]) => {
      const P = window.__stage25d
      const found = window.__pups.map((p, i) => {
        const v = p.setPose(pose)
        p.setView(view, view !== 'front' && i % 2 === 1) // every other one faces left: the mirrored art
        return v
      })
      for (let i = 0; i < 4; i++) { P.stage.scene.render(); await new Promise((r) => requestAnimationFrame(r)) }
      return found.flat()
    }, [view, pose])
    const file = `${out}/stage_${view}_${pose}.png`
    await canvas.screenshot({ path: file })
    frames.push({ view, pose, file, guards: verdict.length ? verdict : 'ok' })
  }
}
console.log(JSON.stringify(frames, null, 1))
await browser.close()
