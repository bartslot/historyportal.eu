// Headless check of the 2.5D stage (stage25d.html): muted, Metal ANGLE (real GPU), 1920x1080.
// The page as shipped on a Retina Mac (deviceScaleFactor 2): the stage caps its own render size.
// Writes frames for parallax (sc01 start/end), sway (two clocks), and logs fps over 5 s of playback.
//   node scripts/stage25d-check.mjs http://localhost:5191/stage25d.html outDir/
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

// Playwright lives in the main checkout's node_modules; a fresh worktree has none of its own
const common = execSync('git rev-parse --path-format=absolute --git-common-dir', { encoding: 'utf8' }).trim()
const local = new URL('../../node_modules/playwright/index.mjs', import.meta.url).pathname
const { chromium } = await import(existsSync(local) ? local : join(dirname(common), 'node_modules/playwright/index.mjs'))

const [url = 'http://localhost:5191/stage25d.html', out = 'stage25d-check/'] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chromium', args: ['--mute-audio', '--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] })
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })
  await page.addInitScript(() => {
    const AC = window.AudioContext
    if (AC) window.AudioContext = class extends AC { constructor(...a) { super(...a); this.suspend() } }
    HTMLMediaElement.prototype.play = function () { this.muted = true; return Promise.resolve() }
  })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`) })
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`) })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  await page.goto(url)
  await page.waitForFunction(() => window.__stage25d, null, { timeout: 30000 })
  // the canvas alone, full viewport (CSS 1920x1080 = 3840x2160 device pixels; the stage renders at most 1920 wide)
  await page.evaluate(() => {
    const c = window.__stage25d.stage.canvas
    Object.assign(c.style, { position: 'fixed', left: '0', top: '0', width: '1920px', height: '1080px', zIndex: 10 })
    document.querySelector('[data-testid=stage-panel]')?.style.setProperty('display', 'none')
    window.__stage25d.stage.fit()
  })
  const info = await page.evaluate(() => ({ gpu: window.__stage25d.stage.engine.getGlInfo().renderer, w: window.__stage25d.stage.engine.getRenderWidth(), h: window.__stage25d.stage.engine.getRenderHeight() }))
  console.log('gpu', info.gpu, `${info.w}x${info.h}`)
  const shot = async (name) => { await page.waitForTimeout(400); await page.locator('canvas').first().screenshot({ path: `${out}${name}.png` }) }
  const seek = (i, t) => page.evaluate(([i, t]) => { window.__stage25d.pause(); return window.__stage25d.seek(i, t) }, [i, t])
  await seek(0, 0); await page.waitForTimeout(1500); await shot('sc01-t0')
  await seek(0, 10); await shot('sc01-t10')
  await seek(1, 0); await page.waitForTimeout(800); await shot('sc02-sway-a')
  await page.waitForTimeout(1300); await shot('sc02-sway-b')
  await seek(2, 1.2); await shot('sc03-t1')
  await page.evaluate(() => { window.__stage25d.seek(0, 0); window.__stage25d.play() })
  const fps = []
  for (let i = 0; i < 5; i++) { await page.waitForTimeout(1000); fps.push(await page.evaluate(() => window.__stage25d.fps())) }
  console.log('fps (1 s windows, 1920x1080):', fps.join(' '))
  // a teacher edit moves the layer at once; undo puts it back
  const undo = await page.evaluate(async () => {
    const p = window.__stage25d
    p.pause(); await p.seek(0, 0)
    const mesh = () => p.stage.scene.meshes.find((m) => m.name === 'layer:hut-farm-01')
    const x0 = mesh().position.x
    p.doc.set(['scenes', 0, 'set', 'layers', 2, 'x'], 0.2, 'Place')
    await new Promise((r) => setTimeout(r, 200))
    const x1 = mesh().position.x
    p.doc.undo()
    await new Promise((r) => setTimeout(r, 200))
    return { x0, x1, xUndo: mesh().position.x }
  })
  console.log('edit + undo (hut x, metres):', JSON.stringify(undo), undo.x1 !== undo.x0 && undo.xUndo === undo.x0 ? 'OK' : 'FAIL')
  const misses = await page.evaluate(() => window.__stage25d.stage.misses)
  console.log('unresolved needs:', JSON.stringify(misses))
  console.log(errors.length ? errors.join('\n') : 'console: no errors or warnings')
} finally {
  await browser.close()
}
