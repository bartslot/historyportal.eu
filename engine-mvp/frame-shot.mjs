// One Studio frame as a PNG, full resolution, post effects included (comic-look frame matching).
// Headless Chromium, muted; waits for the scene, then asks Babylon for a screenshot at the given size, so the
// frame is the camera's own view at that aspect, not a crop of the stage between the panels.
//   node frame-shot.mjs '<studio url>' out.png [1920x1080] [waitSeconds]
import { writeFileSync } from 'node:fs'
import { chromium } from '../node_modules/playwright/index.mjs'

const [url, out, size = '1920x1080', wait = '10'] = process.argv.slice(2)
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
  const data = await page.evaluate(async () => {
    const mvp = window.__mvp
    const engine = mvp.scene.getEngine()
    engine.setHardwareScalingLevel(1)
    engine.resize()
    await new Promise((r) => setTimeout(r, 1500))   // a few frames at the new size
    return BABYLON.Tools.CreateScreenshotAsync(engine, mvp.camera, { precision: 1 })
  })
  writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'))
  console.log(`frame-shot ok ${out} ${width}x${height}${errors.length ? ' page errors: ' + errors.join(' | ') : ''}`)
} finally {
  await browser.close()
}
