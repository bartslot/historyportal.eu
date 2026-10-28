// Head crops of every painted pose with the painted face parts: neutral, surprised, scared (an open mouth), 100% frames.
// usage: node src/figures/capture_face_poses.mjs [http://localhost:5196] [out dir]   (the dev server must be running)
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT ?? 'playwright')
const base = process.argv[2] ?? 'http://localhost:5196'
const out = process.argv[3] ?? `${homedir()}/BartsMedia/historyportal/topics/autonomous-lessons/faces/poses`
mkdirSync(out, { recursive: true })
const SILENT = () => { const A = window.AudioContext; if (A) window.AudioContext = function (...a) { const c = new A(...a); c.suspend(); return c } }
const browser = await chromium.launch({ args: ['--mute-audio', '--use-angle=metal'] })
const page = await browser.newPage({ viewport: { width: 700, height: 700 } })
await page.addInitScript(SILENT)
await page.goto(`${base}/puppet-lab.html?char=boer-vrouw&pose=stand`)
await page.waitForFunction(() => window.__lab, null, { timeout: 30000 })
await page.waitForTimeout(2500)
await page.evaluate(() => {
  __lab.LIFE.on = 0
  document.getElementById('ui').style.display = 'none'; document.getElementById('msg').style.display = 'none'
  __lab.camera.fov = 0.5; __lab.camera.minZ = 0.05
})
const WALK = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1.05].map((t) => ['walk', t])
const shots = [['stand', 0], ...WALK, ['point', 0], ['carry', 0], ['kneel', 0], ['sit', 0]]
let n = 0
for (const [pose, t] of shots) {
  for (const e of ['neutral', 'surprised', 'scared']) {
    const aim = ([pose, t, e]) => {
      const p = __lab.puppets[0]
      if (e) { __lab.state.pose = pose; __lab.apply(); p.setEmotion(e, 1); for (let i = 0; i < 70; i++) p.advance(1 / 60); if (t) for (let i = 0; i < Math.round(t * 60); i++) p.advance(1 / 60) }
      const m = __lab.scene.getMeshByName('boer-vrouw_face'); m.refreshBoundingInfo(true)
      const c = m.getBoundingInfo().boundingBox.centerWorld, cam = __lab.camera
      cam.position.set(c.x, c.y, -0.8); cam.setTarget(new cam.position.constructor(c.x, c.y, 0))
    }
    await page.evaluate(aim, [pose, t, e])
    await page.evaluate(aim, [pose, t, null])
    await page.waitForTimeout(250)
    await page.locator('canvas').screenshot({ path: `${out}/${String(n).padStart(2, '0')}_${pose}_${t}_${e}.png` })
  }
  n++
}
await browser.close()
console.log('done', n)
