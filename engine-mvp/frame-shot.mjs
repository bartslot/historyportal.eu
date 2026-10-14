// One Studio frame as a PNG, full resolution, post effects included (comic-look frame matching).
// Headless Chromium, muted; waits for the scene, then asks Babylon for a screenshot at the given size, so the
// frame is the camera's own view at that aspect, not a crop of the stage between the panels.
//   node frame-shot.mjs '<studio url>' out.png [1920x1080] [waitSeconds]
//   node frame-shot.mjs '<studio url with scene=spyglass>' outDir/ [WxH] [wait] --move dx,dy,dz,yaw --frames N
//     a camera move as N frames outDir/f0000.png..., eased in and out, from the shot camera to that offset
//   --readback file.txt   (with ?blockout=<shot>) also writes the blockout's composition readback, read after the resize
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from '../node_modules/playwright/index.mjs'

const argv = process.argv.slice(2)
const flag = (k) => { const i = argv.indexOf(k); return i < 0 ? null : argv.splice(i, 2)[1] }
const move = flag('--move'), frames = Number(flag('--frames') || 0), readbackFile = flag('--readback')
const [url, out, size = '1920x1080', wait = '10'] = argv
if (!url || !out) {
  console.error('usage: node frame-shot.mjs <url> <out.png> [WxH] [waitSeconds]')
  process.exit(2)
}
const [width, height] = size.split('x').map(Number)

const browser = await chromium.launch({ args: ['--mute-audio', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
try {
  const page = await browser.newPage({ viewport: { width, height } })
  // silent: no AudioContext ever runs, media never plays
  await page.addInitScript(() => {
    const AC = window.AudioContext
    if (AC) window.AudioContext = class extends AC { constructor(...a) { super(...a); this.suspend() } }
    HTMLMediaElement.prototype.play = function () { this.muted = true; return Promise.resolve() }
  })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(url)
  await page.waitForTimeout(Number(wait) * 1000)
  // the canvas alone, at the frame's size: the camera renders at that aspect, no stage or panels around it
  await page.addStyleTag({ content: `#c { position: fixed !important; left: 0; top: 0; width: ${width}px !important; height: ${height}px !important; z-index: 9999 }` })
  const shoot = (spec) => page.evaluate(async (spec) => {
    const mvp = window.__mvp
    const engine = mvp.scene.getEngine()
    if (spec !== null) window.__shot.moveCamera(spec)
    engine.setHardwareScalingLevel(1)
    engine.resize()
    await new Promise((r) => setTimeout(r, spec === null ? 1500 : 120))   // a few frames at the new size / pose
    return BABYLON.Tools.CreateScreenshotAsync(engine, mvp.camera, { precision: 1 })
  }, spec)
  const save = (file, data) => writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'))
  if (frames > 0) {
    mkdirSync(out, { recursive: true })
    const to = move.split(',').map(Number)
    await shoot(null)
    for (let i = 0; i < frames; i++) {
      const k = frames === 1 ? 1 : i / (frames - 1)
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2   // ease in-out, like a camera operator
      save(`${out}/f${String(i).padStart(4, '0')}.png`, await shoot(to.map((v) => (v * e).toFixed(4)).join(',')))
    }
    console.log(`frame-shot ok ${frames} frames in ${out}${errors.length ? ' page errors: ' + errors.join(' | ') : ''}`)
  } else {
    save(out, await shoot(null))
    if (readbackFile) {   // a blockout shot (?blockout=...): its composition readback next to the picture
      const text = await page.evaluate(() => window.__mvp.blockout ? window.__mvp.blockout.read().text : null)
      writeFileSync(readbackFile, (text ?? 'no blockout in this page') + '\n')
    }
    console.log(`frame-shot ok ${out} ${width}x${height}${errors.length ? ' page errors: ' + errors.join(' | ') : ''}`)
  }
} finally {
  await browser.close()
}
