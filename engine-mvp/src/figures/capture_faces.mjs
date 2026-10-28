// Proof renders for the living faces: (1) a model sheet (every emotion on one figure, 100% crops of the head),
// (2) a 10 s webm of two figures idling with one emotion change. Silent headless Chromium.
// usage: node src/figures/capture_faces.mjs [http://localhost:5196] [out dir]   (the dev server must be running)
import { mkdirSync, renameSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT ?? 'playwright')
const base = process.argv[2] ?? 'http://localhost:5196'
const out = process.argv[3] ?? `${homedir()}/BartsMedia/historyportal/topics/autonomous-lessons/faces`
mkdirSync(out, { recursive: true })
const SILENT = () => { const A = window.AudioContext; if (A) window.AudioContext = function (...a) { const c = new A(...a); c.suspend(); return c } }
const browser = await chromium.launch({ args: ['--mute-audio', '--use-angle=metal'] })

// 1. the model sheet: life off (a blink never lands in the frame); the camera follows the head through each emotion's
//    lean and tilt; a second pass with the emotes on
{
  const page = await browser.newPage({ viewport: { width: 700, height: 700 } })
  await page.addInitScript(SILENT)
  await page.goto(`${base}/puppet-lab.html?char=boer-vrouw&pose=stand`)
  await page.waitForFunction(() => window.__lab, null, { timeout: 30000 })
  await page.waitForTimeout(2500)
  const names = await page.evaluate(async () => {
    __lab.LIFE.on = 0 // the lab's own LIFE (a dynamic import would be a second module instance)
    document.getElementById('ui').style.display = 'none'; document.getElementById('msg').style.display = 'none'
    __lab.camera.fov = 0.5; __lab.camera.minZ = 0.05
    return __lab.puppets[0].emotions()
  })
  const frame = async (e, tag, dist, y) => {
    await page.evaluate(([e, dist, y]) => {
      const p = __lab.puppets[0]; p.setEmotion(e, 1); p.advance(1); p.advance(0.5)
      const m = __lab.scene.getMeshByName('boer-vrouw_face'); m.refreshBoundingInfo(true)
      const c = m.getBoundingInfo().boundingBox.centerWorld, cam = __lab.camera
      cam.position.set(c.x, y ?? c.y, -dist); cam.setTarget(new cam.position.constructor(c.x, y ?? c.y, 0))
    }, [e, dist, y])
    await page.waitForTimeout(300)
    await page.locator('canvas').screenshot({ path: `${out}/${tag}_${e}.png` })
  }
  for (const e of names) await frame(e, 'head', 0.95)
  for (const e of ['neutral', 'worried', 'angry', 'tired']) await frame(e, 'body', 3.6, 0.85)
  await page.evaluate(() => { __lab.LIFE.emotes = 1 })
  for (const e of ['worried', 'surprised', 'thinking', 'scared', 'proud']) await frame(e, 'emote', 1.5)
  console.log(JSON.stringify(names))
  await page.close()
}

// 2. ten seconds, two figures, idle life + one emotion change at 5 s
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: `${out}/_rec`, size: { width: 1280, height: 720 } } })
  const page = await ctx.newPage()
  await page.addInitScript(SILENT)
  await page.goto(`${base}/puppet-lab.html?char=boer-vrouw,boer-vrouw&pose=stand`)
  await page.waitForFunction(() => window.__lab, null, { timeout: 30000 })
  await page.waitForTimeout(2500)
  await page.evaluate(() => {
    document.getElementById('ui').style.display = 'none'; document.getElementById('msg').style.display = 'none'
    const c = __lab.camera; c.position.set(0, 1.2, -2.2); c.setTarget(new c.position.constructor(0, 1.2, 0)); c.fov = 0.5; c.minZ = 0.05
    __lab.puppets[0].root.position.x = -0.45; __lab.puppets[1].root.position.x = 0.45
  })
  await page.waitForTimeout(5000)
  await page.evaluate(() => __lab.puppets[0].setEmotion('surprised'))
  await page.waitForTimeout(2200)
  await page.evaluate(() => __lab.puppets[0].setEmotion('happy'))
  await page.waitForTimeout(2800)
  const video = page.video()
  await ctx.close()
  const file = await video.path()
  renameSync(file, `${out}/idle_two_figures.webm`)
}
await browser.close()
console.log(readdirSync(out).join(' '))
