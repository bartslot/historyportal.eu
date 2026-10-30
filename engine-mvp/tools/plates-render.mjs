// The three lesson plates (art v3's specs: hunebedden sc13, eerste-boeren-1 sc28, voc sc14) rendered
// through play.html and S1's stage, with and without the set dresser, silently.
//   node tools/plates-render.mjs [base=http://localhost:5294] [outDir=.] [size=1920x1080] [lesson:scene,...]
import { mkdirSync } from 'node:fs'
import { chromium } from '/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/node_modules/playwright/index.mjs'

const [base = 'http://localhost:5294', out = '.', size = '1920x1080', only] = process.argv.slice(2)
const [W, H] = size.split('x').map(Number)
const PLATES = only ? only.split(',').map((p) => p.split(':')) : [['hunebedden', 'sc13'], ['eerste-boeren-1', 'sc28'], ['voc', 'sc14']]
mkdirSync(out, { recursive: true })
const SILENT = () => {
  const AC = window.AudioContext
  window.AudioContext = class extends AC { constructor(...a) { super(...a); super.suspend() } resume() { return Promise.resolve() } }
}
const browser = await chromium.launch({ args: ['--mute-audio', '--use-gl=angle'] })
const report = []
for (const [lesson, scene] of PLATES) {
  for (const dress of ['1', '0']) {
    const page = await browser.newPage({ viewport: { width: W, height: H } })
    await page.addInitScript(SILENT)
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
    await page.goto(`${base}/play.html?lesson=${lesson}&dress=${dress}`)
    await page.waitForFunction(() => window.__play, null, { timeout: 60000 })
    const info = await page.evaluate(async (id) => {
      const p = window.__play
      await p.player.seekToScene(id)
      p.player.pause()
      await new Promise((r) => setTimeout(r, 1500)) // textures in, a few frames of motion
      const s = p.lesson.scenes.find((x) => x.id === id)
      return { dressed: s.set.layers.filter((l) => l.dressed).map((l) => `${l.asset}@${l.depth}:${l.x}x${l.scale}`), misses: p.player.stage.misses.filter((m) => m.scene === id) }
    }, scene)
    await page.evaluate(() => { document.getElementById('start').hidden = true; document.getElementById('captions').hidden = true })
    await page.locator('#stage').screenshot({ path: `${out}/plate_${lesson}-${scene}${dress === '1' ? '' : '_bare'}.png` })
    // and mid-shot, where the camera has moved in: the frame a class sees for most of the scene
    await page.evaluate(async (id) => { const p = window.__play, i = p.lesson.scenes.findIndex((x) => x.id === id); await p.player.seek(i, p.lesson.scenes[i].dur_s / 2); p.player.pause() }, scene)
    await page.waitForTimeout(800)
    await page.locator('#stage').screenshot({ path: `${out}/plate_${lesson}-${scene}${dress === '1' ? '' : '_bare'}_mid.png` })
    report.push({ lesson, scene, dress, ...info, errors })
    await page.close()
  }
}
console.log(JSON.stringify(report, null, 1))
await browser.close()
