// Art plates through the REAL stage (look chain, contact stains, ground, feather), 1920x1080, muted, Metal ANGLE.
// A plate spec (art v3 tools/artkit/library/plates/*.json: { bundle, out, set: { sky, ground, horizon, land_target,
// layers: [{ asset, depth, x, scale, src?, height_m? }] } }) becomes a one-scene lesson. A layer with `src` is a
// candidate cut not in library.json yet: it is added to the bundle for this render only (file under library/_work).
// horizon "auto" = stage_plate.py auto_horizon: the first bg strip's land top lands at land_target (0.42) of the frame.
//   node scripts/stage25d-plates.mjs http://localhost:5197 <specsDir> <outDir> [look.json]
// Needs public/library/<bundle> and public/library/_work symlinked to ~/BartsMedia/historyportal/library/.
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

const common = execSync('git rev-parse --path-format=absolute --git-common-dir', { encoding: 'utf8' }).trim()
const local = new URL('../../node_modules/playwright/index.mjs', import.meta.url).pathname
const { chromium } = await import(existsSync(local) ? local : join(dirname(common), 'node_modules/playwright/index.mjs'))

const [url = 'http://localhost:5197', specsDir, out, lookFile] = process.argv.slice(2)
if (!specsDir || !out) throw new Error('usage: stage25d-plates.mjs <devUrl> <specsDir> <outDir> [look.json]')
mkdirSync(out, { recursive: true })
const LIB = new URL('../public/library/', import.meta.url).pathname
const look = lookFile ? JSON.parse(readFileSync(lookFile, 'utf8')) : undefined
const pngSize = (f) => { const b = readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } }

// the bundle as library.json has it, plus this plate's candidate cuts; files resolve from library/_plates-<bundle>/
function plateLibrary(spec) {
  const lib = JSON.parse(readFileSync(join(LIB, spec.bundle, 'library.json'), 'utf8'))
  const assets = lib.assets.map((a) => ({ ...a, file: `../${spec.bundle}/${a.file}` }))
  for (const l of spec.set.layers.filter((l) => l.src)) {
    const { w, h } = pngSize(join(LIB, '_work', l.src))
    const cut = { id: l.asset, layer: l.depth, tags: [], file: `../_work/${l.src}`, w, h, anchor: [0.5, 1], height_m: l.height_m, tileable_x: false, motion: 'none' }
    const i = assets.findIndex((a) => a.id === l.asset)
    if (i >= 0) assets[i] = { ...assets[i], ...cut, tags: assets[i].tags, motion: assets[i].motion }
    else assets.push(cut)
  }
  return { ...lib, bundle: `_plates-${spec.bundle}`, assets }
}

const lessonOf = (name, spec, horizon) => ({
  id: name, lang: 'nl', bundle: `_plates-${spec.bundle}`, ...(look ? { look } : {}),
  scenes: [{
    id: name, beat: 'setup', narration: '', est_s: 30, figures: [], balloons: [], camera: null, sound: null, interaction: null, fact_refs: [],
    set: { sky: spec.set.sky, ground: spec.set.ground, horizon, layers: spec.set.layers.map(({ asset, depth, x, scale }) => ({ asset, depth, x, scale })) },
  }],
})

const browser = await chromium.launch({ channel: 'chromium', args: ['--mute-audio', '--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] })
try {
  for (const f of readdirSync(specsDir).filter((f) => f.endsWith('.json')).sort()) {
    const spec = JSON.parse(readFileSync(join(specsDir, f), 'utf8'))
    const name = basename(f, '.json')
    const lib = plateLibrary(spec)
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
    await page.addInitScript(() => {
      const AC = window.AudioContext
      if (AC) window.AudioContext = class extends AC { constructor(...a) { super(...a); this.suspend() } }
      HTMLMediaElement.prototype.play = function () { this.muted = true; return Promise.resolve() }
    })
    const errors = []
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`) })
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
    page.on('response', (r) => { if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`) })
    await page.route(`**/library/_plates-${spec.bundle}/library.json`, (r) => r.fulfill({ json: lib }))
    // horizon "auto": measured on the strip's own alpha, in the page (it decodes webp), with stage_plate.py's maths
    await page.goto(`${url}/stage25d.html?lesson=lessons/_placeholder.json`)
    let horizon = spec.set.horizon ?? 0
    if (horizon === 'auto') {
      const strip = spec.set.layers.filter((l) => l.depth === 'bg').map((l) => lib.assets.find((a) => a.id === l.asset)).find((a) => a?.layer === 'bg')
      horizon = strip ? await page.evaluate(async ({ file, height_m, target }) => {
        const img = new Image(); img.src = file; await img.decode()
        const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
        const g = c.getContext('2d'); g.drawImage(img, 0, 0)
        const d = g.getImageData(0, 0, c.width, c.height).data
        let top = 0
        for (let y = 0; y < c.height; y++) { let n = 0; for (let x = 0; x < c.width; x++) n += d[(y * c.width + x) * 4 + 3] > 128 ? 1 : 0; if (n / c.width > 0.5) { top = y / c.height; break } }
        const H = 1080, F = (H / 2) / Math.tan((25 * Math.PI) / 180), CY = H / 2 - F * Math.tan((-2 * Math.PI) / 180)
        const want = 1.6 + ((CY - target * H) * 70) / F
        return Math.round((want - height_m * (1 - top)) * 10) / 10
      }, { file: `/library/${spec.bundle}/${strip.file.replace(`../${spec.bundle}/`, '')}`, height_m: strip.height_m, target: spec.set.land_target ?? 0.42 }) : 0
    }
    await page.route(`**/lessons/_plate-${name}.json`, (r) => r.fulfill({ json: lessonOf(name, spec, horizon) }))
    await page.goto(`${url}/stage25d.html?lesson=lessons/_plate-${name}.json`)
    await page.waitForFunction(() => window.__stage25d, null, { timeout: 30000 })
    await page.evaluate(async () => {
      const p = window.__stage25d
      p.pause(); await p.seek(0, 1)
      Object.assign(p.stage.canvas.style, { position: 'fixed', left: '0', top: '0', width: '1920px', height: '1080px', zIndex: 10 })
      p.stage.fit()
    })
    await page.waitForTimeout(2500)
    const info = await page.evaluate(() => ({ w: window.__stage25d.stage.engine.getRenderWidth(), h: window.__stage25d.stage.engine.getRenderHeight(), misses: window.__stage25d.stage.misses }))
    await page.locator('canvas').first().screenshot({ path: join(out, `${name}.png`) })
    console.log(name, `horizon ${horizon}`, `${info.w}x${info.h}`, 'misses', JSON.stringify(info.misses), errors.length ? errors.join(' | ') : 'no errors')
    await page.close()
  }
} finally {
  await browser.close()
}
