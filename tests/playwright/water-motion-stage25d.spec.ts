import { test, expect, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Water on a painted picture (engine-mvp stage25d/water.ts): turn Water on for a harbour picture, paint the water with the
 * real mouse in the Paint the water window, then hold the layer motion at chosen moments and compare stage frames:
 * inside the painted water the pixels move, the city above it stays identical, and the frame at t equals the frame at
 * t + loop. A reload keeps the mask and the values, and the student player plays it too. Silent.
 *
 *   PW_WATER=<lesson>/<scene> PW_WATER_CODE=<lesson code> [PW_WATER_OUT=<folder for the frames>] PW_BASE_URL=http://127.0.0.1:8023 \
 *     npx playwright test water-motion-stage25d --config=playwright.stage25d.config.ts --workers=1
 *
 * The scene's layer 0 is a harbour picture: nl-golden-age bg-city-01 (a city on the waterfront, water in its lower third),
 * lifted (y 20) so its water shows above the floor; its sky's own drift is off (skyLayer motion none), so nothing but the
 * water moves with the motion clock.
 */
const [LESSON, SCENE] = (process.env.PW_WATER ?? '').split('/')
const CODE = process.env.PW_WATER_CODE
// frames for a look afterwards; not under the config's outputDir, which Playwright empties on every run
const OUT = process.env.PW_WATER_OUT ?? join(tmpdir(), 'water-motion-stage25d')
const LAYER = 'layer-0'
test.setTimeout(400_000)
test.use({ viewport: { width: 1280, height: 860 } })
test.skip(!LESSON || !SCENE, 'set PW_WATER=<lesson>/<scene>')

const SILENT = `(() => {
  const AC = window.AudioContext || window.webkitAudioContext
  if (AC) {
    window.AudioContext = function () { const c = new AC(); try { c.suspend && c.suspend() } catch (e) {} c.resume = () => Promise.resolve(); return c }
    window.webkitAudioContext = window.AudioContext
  }
  HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return Promise.resolve() }
})()`

const ready = (page: Page) => page.waitForFunction(() => document.querySelector('[data-stage25d-ready="1"]') && (window as any).__stage25d?.config, undefined, { timeout: 180_000 })
const load = async (page: Page) => {
  await page.addInitScript(SILENT)
  await page.goto(`/teacher/lessons/${LESSON}/wizard?step=4&scene=${SCENE}`, { waitUntil: 'load' })
  await ready(page)
}
const expectSilent = async (page: Page) => {
  const silent = await page.evaluate(() => HTMLMediaElement.prototype.play.toString().includes('muted') && new AudioContext().state !== 'running')
  expect(silent, 'media.play is muted and the AudioContext is suspended').toBe(true)
}

/** The stage canvas at layer-motion time t (held, so nothing else moves), as luminance, plus a PNG of it. */
async function frameAt (page: Page, t: number): Promise<{ w: number; h: number; lum: number[]; png: string }> {
  return page.evaluate(async (t) => {
    const stage = (window as any).__stage25d
    stage.holdMotion(t)
    const tick = () => new Promise((r) => requestAnimationFrame(() => r(null)))
    for (let k = 0; k < 4; k++) await tick()
    await new Promise((r) => setTimeout(r, 150))
    for (let k = 0; k < 2; k++) await tick()
    const src = stage.canvas as HTMLCanvasElement
    const c = document.createElement('canvas')
    c.width = 480; c.height = Math.round(480 * src.height / src.width)
    const g = c.getContext('2d')!
    g.drawImage(src, 0, 0, c.width, c.height)
    const d = g.getImageData(0, 0, c.width, c.height).data
    const lum: number[] = []
    for (let i = 0; i < d.length; i += 4) lum.push(Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]))
    return { w: c.width, h: c.height, lum, png: c.toDataURL('image/png') }
  }, t)
}
/** Wait until the stage draws the same frame twice at one held moment: every picture and mask file is in. */
async function settle (page: Page) {
  let prev = (await frameAt(page, 0.7)).lum
  await expect.poll(async () => {
    await page.waitForTimeout(700)
    const now = (await frameAt(page, 0.7)).lum
    // SwiftShader redraws a glint's soft edge a few levels apart at one held moment (see the less-motion test)
    const same = now.filter((v, i) => Math.abs(v - prev[i]) > 12).length < now.length * 0.0005
    prev = now
    return same
  }, { timeout: 60_000 }).toBe(true)
}
const save = (name: string, png: string) => { mkdirSync(OUT, { recursive: true }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(png.split(',')[1], 'base64')) }

/** Where picture point (u, v) of the layer lands in a frame of width w and height h (px), from its corners on screen. */
async function onFrame (page: Page, u: number, v: number, w: number, h: number): Promise<[number, number]> {
  const c = await page.evaluate((id) => (window as any).__stage25d.layerCorners(id), LAYER)
  expect(c, 'the harbour picture is on stage').toBeTruthy()
  const x = c.tl[0] + u * (c.tr[0] - c.tl[0]) + v * (c.bl[0] - c.tl[0])
  const y = c.tl[1] + u * (c.tr[1] - c.tl[1]) + v * (c.bl[1] - c.tl[1])
  return [Math.round(x * w), Math.round(y * h)]
}

/** How many px of a box (frame px) differ by more than `tol` between two frames. */
const changed = (a: number[], b: number[], w: number, box: [number, number, number, number], tol = 6) => {
  let n = 0, all = 0
  for (let y = Math.max(0, box[1]); y < box[3]; y++) for (let x = Math.max(0, box[0]); x < Math.min(w, box[2]); x++) {
    all++
    if (Math.abs(a[y * w + x] - b[y * w + x]) > tol) n++
  }
  return { n, all }
}

test('Water: paint it with the mouse, it moves only there, loops exactly, survives a reload', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await load(page)
  await expectSilent(page)

  // start from no water at all, so the test owns every value
  await page.evaluate((id) => { const s = (window as any).__stage25d; s.setLayerWater(id, { on: false, amount: 1, speed: 1, glints: 1, loop: 4, mask: undefined }) }, LAYER)
  await page.evaluate((id) => (window as any).__stage25d.select(id), LAYER)
  const section = page.locator('[data-motion-section]:visible').first()
  await section.waitFor()
  await section.locator('button').first().click()
  const toggle = section.locator('[data-stage25d-water-toggle]')
  await toggle.check()
  await expect(section.locator('[data-stage25d-water-field="amount"]')).toBeVisible()
  // a look puts the sliders where it starts: Lively, then back to Anime (the default)
  await section.locator('[data-stage25d-water-look="lively"]').click()
  await expect(section.locator('[data-stage25d-water-field="glints"]')).toHaveValue('1.9')
  await expect(section.locator('[data-stage25d-water-look="lively"]')).toHaveAttribute('aria-checked', 'true')
  await section.locator('[data-stage25d-water-look="anime"]').click()
  await expect(section.locator('[data-stage25d-water-field="amount"]')).toHaveValue('0.9')

  // paint: wipe the guessed mask, then two real mouse strokes across the near water, left half only
  await section.locator('[data-stage25d-water-paint]').click()
  const win = page.locator('[data-stage25d-water-window]')
  await expect(win).toBeVisible()
  await win.locator('[data-stage25d-water-clear]').click()
  const view = win.locator('canvas')
  await expect.poll(() => view.evaluate((c: HTMLCanvasElement) => c.width)).toBeGreaterThan(10)
  await win.locator('input[type="range"]').fill('24')   // a small brush: the boats on the waterline stay dry
  const box = (await view.boundingBox())!
  for (const v of [0.75, 0.8]) {
    await page.mouse.move(box.x + box.width * 0.12, box.y + box.height * v)
    await page.mouse.down()
    for (let k = 1; k <= 16; k++) await page.mouse.move(box.x + box.width * (0.12 + 0.4 * k / 16), box.y + box.height * v, { steps: 2 })
    await page.mouse.up()
  }
  const saved = page.waitForResponse((r) => r.url().includes('livewire') && r.status() === 200)
  await win.locator('[data-stage25d-water-done]').click()
  await saved
  const maskNow = () => page.evaluate((id) => (window as any).__stage25d.layerInfo(id)?.water?.mask ?? null, LAYER)
  await expect.poll(maskNow, { timeout: 20_000 }).toMatch(/\/water\/.+\.(webp|png)$/)
  // settled: the guessed mask's upload (made when Water went on) may answer after the painted one was sent
  let last = await maskNow()
  await expect.poll(async () => { await page.waitForTimeout(1_500); const now = await maskNow(); const same = now === last; last = now; return same }, { timeout: 30_000 }).toBe(true)
  await settle(page)   // the stage draws the saved file
  const water = await page.evaluate((id) => (window as any).__stage25d.layerInfo(id).water, LAYER)
  expect(water.on).toBe(true)
  const loop = water.loop ?? 4

  // frames: no water, water at t, a moment later, and one loop on
  const t0 = 0.7
  const a = await frameAt(page, t0)
  const b = await frameAt(page, t0 + 1.3)
  const c = await frameAt(page, t0 + loop)
  for (const [n, f] of [['t', a], ['t+1.3', b], ['t+loop', c]] as const) save(`frame-${n}`, f.png)
  const { w, h } = a

  // the picture's water starts at about 0.66 of its height; its lowest fifth melts into the floor (the strip's feather)
  const [wx0, wy0] = await onFrame(page, 0.2, 0.73, w, h)
  const [wx1, wy1] = await onFrame(page, 0.45, 0.8, w, h)
  const [cx0, cy0] = await onFrame(page, 0.05, 0.3, w, h)
  const [cx1, cy1] = await onFrame(page, 0.95, 0.6, w, h)
  const [rx0, ry0] = await onFrame(page, 0.7, 0.73, w, h)
  const [rx1, ry1] = await onFrame(page, 0.95, 0.8, w, h)
  const painted = changed(a.lum, b.lum, w, [wx0, wy0, wx1, wy1])
  const city = changed(a.lum, b.lum, w, [cx0, cy0, cx1, cy1], 1)
  const unpainted = changed(a.lum, b.lum, w, [rx0, ry0, rx1, ry1], 1)
  // the whole picture (the editor's ground grid below it comes and goes on its own)
  const [, py1] = await onFrame(page, 0, 0.84, w, h)
  const looped = changed(a.lum, c.lum, w, [0, 0, w, py1], 3)
  console.log(JSON.stringify({ painted, city, unpainted, looped, boxes: { water: [wx0, wy0, wx1, wy1], city: [cx0, cy0, cx1, cy1] } }))
  expect(painted.n, 'the painted water moves').toBeGreaterThan(painted.all * 0.05)
  expect(city.n, 'the city above the water stays identical').toBe(0)   // (tol 1: SwiftShader's odd 1-level speck)
  expect(unpainted.n, 'water that was not painted stays still').toBe(0)
  expect(looped.n, 'the frame at t + loop is the frame at t').toBeLessThan(looped.all * 0.001)

  // a strip of 8 frames over half a second, for the report
  for (let k = 0; k < 8; k++) save(`strip-${k}`, (await frameAt(page, t0 + k / 16)).png)

  // reload: the mask and the values come back from the server
  await page.evaluate(() => (window as any).__stage25d.holdMotion(null))
  await page.reload({ waitUntil: 'load' })
  await ready(page)
  const again = await page.evaluate((id) => (window as any).__stage25d.layerInfo(id).water, LAYER)
  expect(again).toEqual(water)
  await settle(page)   // the saved mask file loads into the stage
  const a2 = await frameAt(page, t0)
  const b2 = await frameAt(page, t0 + 1.3)
  expect(changed(a2.lum, b2.lum, w, [wx0, wy0, wx1, wy1]).n, 'after a reload the painted water still moves').toBeGreaterThan(painted.all * 0.05)
  expect(changed(a2.lum, b2.lum, w, [cx0, cy0, cx1, cy1], 12).n, 'and the city still stays still').toBe(0)
  expect(errors).toEqual([])
})

test('the student player plays the water', async ({ page }) => {
  test.skip(!CODE, 'set PW_WATER_CODE')
  await page.addInitScript(SILENT)
  await page.goto(`/lesson/${CODE}`, { waitUntil: 'domcontentloaded' })
  await expectSilent(page)
  await page.getByRole('button', { name: /start (de )?(lesson|les)/i }).locator('visible=true').first().dispatchEvent('click', {}, { timeout: 120_000 })
  await page.waitForFunction(() => (window as any).__stage25d?.config?.set?.layers?.[0]?.water?.mask, undefined, { timeout: 180_000 })
  await settle(page)
  const a = await frameAt(page, 0.7)
  const b = await frameAt(page, 2.0)
  const c = await frameAt(page, 0.7 + 4)
  save('player-t', a.png)
  const { w, h } = a
  const [wx0, wy0] = await onFrame(page, 0.2, 0.73, w, h)
  const [wx1, wy1] = await onFrame(page, 0.45, 0.8, w, h)
  const [cx0, cy0] = await onFrame(page, 0.05, 0.52, w, h)
  const [cx1, cy1] = await onFrame(page, 0.95, 0.6, w, h)
  expect(changed(a.lum, b.lum, w, [wx0, wy0, wx1, wy1]).n, 'the water moves in the player').toBeGreaterThan(0)
  expect(changed(a.lum, b.lum, w, [cx0, cy0, cx1, cy1], 0).n, 'the city stays still in the player').toBe(0)
  const loop = changed(a.lum, c.lum, w, [cx0, cy0, cx1, wy1], 3)
  expect(loop.n, 'and it loops').toBeLessThan(loop.all * 0.001)
})

test('less motion: the water holds still, its glints stay drawn', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await load(page)
  await expectSilent(page)
  const water = await page.evaluate((id) => (window as any).__stage25d.layerInfo(id).water, LAYER)
  test.skip(!water?.mask, 'run the paint test first: it leaves the painted water on the layer')
  await settle(page)
  const a = await frameAt(page, 0.7)
  const b = await frameAt(page, 2.0)
  const { w, h } = a
  const [wx0, wy0] = await onFrame(page, 0.2, 0.73, w, h)
  const [wx1, wy1] = await onFrame(page, 0.45, 0.8, w, h)
  // SwiftShader redraws a glint's soft lower edge a few levels apart from frame to frame, at one held moment too (8 of
  // 255 at most): below 12 it is that, a ripple moves a thousand px of this box by far more
  const still = changed(a.lum, b.lum, w, [wx0, wy0, wx1, wy1], 12)
  expect(still.n, 'no ripple, no twinkle, the glints held').toBeLessThan(still.all * 0.005)
  await page.evaluate((id) => (window as any).__stage25d.setLayerWater(id, { glints: 0 }), LAYER)
  let none
  try { none = await frameAt(page, 0.7) } finally {
    const saved = page.waitForResponse((r) => r.url().includes('livewire') && r.request().postData()?.includes('stage25d:layer') === true, { timeout: 20_000 })
    await page.evaluate(({ id, g }) => (window as any).__stage25d.setLayerWater(id, { glints: g }), { id: LAYER, g: water.glints ?? 1 })
    await saved   // the layer saves after a short pause: leave the scene as the paint test left it
  }
  expect(changed(a.lum, none.lum, w, [wx0, wy0, wx1, wy1], 3).n, 'the glints are drawn, held on their own frame').toBeGreaterThan(0)
})
