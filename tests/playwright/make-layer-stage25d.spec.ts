import { test, expect, type Page } from '@playwright/test'

/**
 * Make a layer: a part of a stage picture, selected with the real brush, becomes a layer over its own pixels (no jump),
 * the picture behind filled where it was; one Cmd-Z takes it all back, a reload keeps it. Silent. Run it on a throwaway
 * copy of a lesson (it adds a layer and a cut-out, and undoes the layer):
 *
 *   PW_MAKE_LAYER=<lesson>/<scene>/<layer id of a picture with a subject> PW_MAKE_LAYER_BOX=<x0,y0,x1,y1 of the subject, picture px> \
 *   PW_BASE_URL=http://127.0.0.1:8023 npx playwright test make-layer-stage25d --config=playwright.stage25d.config.ts --workers=1
 */
const [LESSON, SCENE, LAYER] = (process.env.PW_MAKE_LAYER ?? '').split('/')
const SUBJECT = (process.env.PW_MAKE_LAYER_BOX ?? '').split(',').map(Number)
const SHOTS = process.env.PW_MAKE_LAYER_SHOTS ?? 'tests/playwright/results-stage25d'
test.setTimeout(400_000)
test.use({ viewport: { width: 1280, height: 900 } })

const SILENT = `(() => {
  const AC = window.AudioContext || window.webkitAudioContext
  if (AC) {
    window.AudioContext = function () { const c = new AC(); try { c.suspend && c.suspend() } catch (e) {} c.resume = () => Promise.resolve(); return c }
    window.webkitAudioContext = window.AudioContext
  }
  HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return Promise.resolve() }
})()`

type Box = { x: number; y: number; width: number; height: number }
const ready = (page: Page) => page.waitForFunction(() => document.querySelector('[data-stage25d-ready="1"]') && (window as any).__stage25d?.config, undefined, { timeout: 180_000 })
const layerCount = (page: Page) => page.evaluate(() => (window as any).__stage25d.config.set.layers.length as number)
/** The selection frame of a stage row: its box on screen. */
const boxOf = async (page: Page, id: string): Promise<Box> => {
  await page.evaluate((row) => (window as any).__stage25d.select(row), id)
  const frame = page.locator('[data-stage25d-selection]')
  await expect(frame).toBeVisible()
  await page.waitForTimeout(300)
  return (await frame.boundingBox())!
}
/** The stage as drawn, with no selection chrome on it: RGB per pixel of `clip` (page px). */
const stagePixels = async (page: Page, clip: Box, path?: string) => {
  await page.evaluate(() => (window as any).__stage25d.select(null))
  await page.waitForTimeout(800)
  const png = await page.screenshot({ clip, path })
  return page.evaluate(async (b64) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const g = c.getContext('2d')!
    g.drawImage(img, 0, 0)
    return { w: img.width, h: img.height, data: Array.from(g.getImageData(0, 0, img.width, img.height).data) }
  }, png.toString('base64'))
}
type Pixels = Awaited<ReturnType<typeof stagePixels>>
/** Mean absolute RGB difference of two captures inside `r` (px of the capture), `b` looked at `dx, dy` px further on. */
const diff = (a: Pixels, b: Pixels, r = { x: 0, y: 0, w: a.w, h: a.h }, dx = 0, dy = 0) => {
  let sum = 0, n = 0
  for (let y = Math.max(r.y, -dy); y < Math.min(r.y + r.h, a.h - dy); y++) for (let x = Math.max(r.x, -dx); x < Math.min(r.x + r.w, a.w - dx); x++) {
    const i = (y * a.w + x) * 4, j = ((y + dy) * a.w + x + dx) * 4
    for (let c = 0; c < 3; c++) sum += Math.abs(a.data[i + c] - b.data[j + c])
    n += 3
  }
  return sum / n
}
/** The shift of `b` against `a` inside `r` that matches best, within `reach` px: [0, 0] = nothing moved. */
const bestShift = (a: Pixels, b: Pixels, r: { x: number; y: number; w: number; h: number }, reach = 3) => {
  let best = { dx: 0, dy: 0, d: Infinity }
  for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) {
    const d = diff(a, b, r, dx, dy)
    if (d < best.d) best = { dx, dy, d }
  }
  return best
}
const mean = (a: Pixels, r: { x: number; y: number; w: number; h: number }) => {
  const m = [0, 0, 0]
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) for (let c = 0; c < 3; c++) m[c] += a.data[(y * a.w + x) * 4 + c]
  return m.map((v) => v / (r.w * r.h))
}

test('Make a layer lifts the part over its own pixels, fills behind it, one Cmd-Z takes it back, a reload keeps it', async ({ page }) => {
  test.skip(!LAYER || SUBJECT.length !== 4, 'set PW_MAKE_LAYER and PW_MAKE_LAYER_BOX')
  await page.addInitScript(SILENT)
  await page.goto(`/teacher/lessons/${LESSON}/wizard?step=4&scene=${SCENE}`, { waitUntil: 'load' })
  await ready(page)
  const start = await layerCount(page)
  const stage = (await page.locator('canvas.stage25d-canvas').boundingBox())!
  const before = await stagePixels(page, stage, `${SHOTS}/make-layer-before.png`)
  const source = await boxOf(page, LAYER)

  // the picture editor, the brush (S), a real stroke along the subject
  await page.evaluate((id) => { window.dispatchEvent(new CustomEvent('image-edit:open', { detail: (window as any).__stage25d.editTarget(id) })) }, LAYER)
  await page.waitForSelector('[data-cutout]')
  await expect(page.locator('[data-cut-loading]')).toHaveCount(0, { timeout: 60_000 })
  const make = page.locator('[data-cut-layer]')
  await expect(make).toBeVisible()
  await expect(make).toBeDisabled()   // nothing selected yet
  await page.keyboard.press('s')
  const art = (await page.locator('[data-cut-art]').boundingBox())!
  const size = await page.locator('[data-cut-art]').evaluate((c: HTMLCanvasElement) => [c.width, c.height])
  const toScreen = (px: number, py: number) => [art.x + (px / size[0]) * art.width, art.y + (py / size[1]) * art.height] as const
  const [x0, y0, x1, y1] = SUBJECT
  const midY = (y0 + y1) / 2
  await page.mouse.move(...toScreen(x0 + (x1 - x0) * 0.08, midY))
  await page.mouse.down()
  for (let k = 1; k <= 24; k++) await page.mouse.move(...toScreen(x0 + (x1 - x0) * (0.08 + 0.84 * (k / 24)), midY + (k % 2 ? -1 : 1) * (y1 - y0) * 0.15))
  await page.mouse.up()
  await expect(make).toBeEnabled()
  await expect(make).toHaveClass(/btn-primary/)
  await expect(page.locator('[data-cut-save]')).not.toHaveClass(/btn-primary/)
  await expect(page.locator('[data-cut-fill]')).toBeChecked()

  const sent = page.waitForRequest((r) => r.url().includes('livewire') && (r.postData() ?? '').includes('makeCutoutLayer'))
  await make.click()
  const call = JSON.parse((await sent).postData()!).components.flatMap((c: any) => c.calls).find((c: any) => c.method === 'makeCutoutLayer')
  const cutSize = await page.evaluate(async (url) => { const i = new Image(); i.src = url; await i.decode(); return [i.width, i.height] }, call.params[0])
  await expect(page.locator('[data-cutout]')).toHaveCount(0, { timeout: 60_000 })
  await expect.poll(() => layerCount(page), { timeout: 30_000 }).toBe(start + 1)
  const id = `layer-${start}`
  await expect.poll(() => page.evaluate((row) => !!(window as any).__stage25d.editTarget(row), id), { timeout: 30_000 }).toBe(true)
  await page.waitForTimeout(1_500)

  // above its picture, with the cut's share of its picture's box, where the stroke was
  const made = await page.evaluate((row) => (window as any).__stage25d.config.set.layers[Number(row.slice(6))], id)
  expect(made.asset).toMatch(/^cut-\d+$/)
  const box = await boxOf(page, id)
  console.log(`boxes: source ${JSON.stringify(source)}, new ${JSON.stringify(box)}, cut ${cutSize} of ${size}, placed ${JSON.stringify(made)}`)
  // roughly the cut's share of its picture's box (a big plane under a tilted camera is not drawn to one scale: the exact
  // check is below, against where the subject's own pixels were)
  expect(Math.abs(box.width / ((cutSize[0] / size[0]) * source.width) - 1), 'width').toBeLessThan(0.1)
  expect(Math.abs(box.height / ((cutSize[1] / size[1]) * source.height) - 1), 'height').toBeLessThan(0.1)
  const [cx, cy] = [source.x + (((x0 + x1) / 2) / size[0]) * source.width, source.y + (midY / size[1]) * source.height]
  expect(Math.abs(box.x + box.width / 2 - cx), 'over the stroke').toBeLessThan(box.width / 2)
  expect(Math.abs(box.y + box.height / 2 - cy), 'over the stroke').toBeLessThan(box.height / 2 + 4)

  // no jump: the stage looks as it did, around the new layer too
  const after = await stagePixels(page, stage, `${SHOTS}/make-layer-after.png`)
  const inside = { x: Math.max(0, Math.round(box.x - stage.x)), y: Math.max(0, Math.round(box.y - stage.y)), w: Math.round(box.width), h: Math.round(box.height) }
  const cropped = { ...inside, w: Math.min(inside.w, before.w - inside.x), h: Math.min(inside.h, before.h - inside.y) }
  const jump = diff(before, after, cropped)
  const shift = bestShift(before, after, cropped)
  console.log(`no-jump: mean RGB difference inside the new layer's box ${jump.toFixed(2)} (paper grain and WebP), whole stage ${diff(before, after).toFixed(2)} (clouds drift); best match at ${shift.dx},${shift.dy} px`)
  expect([shift.dx, shift.dy], 'the new layer stands on its own pixels: the best match is unshifted').toEqual([0, 0])
  expect(jump).toBeLessThan(10)

  // nudge it aside (shown, not saved): where it stood, the picture behind is filled, not a second copy
  const x = Number(made.x)
  const share = (box.width * 1.3) / stage.width
  await page.evaluate(({ row, to }) => (window as any).__stage25d.moveLayer(row, 'x', to, { hold: true }), { row: id, to: x + share })
  const nudged = await stagePixels(page, stage, `${SHOTS}/make-layer-nudged.png`)
  const ring = { x: Math.max(0, cropped.x - 12), y: Math.max(0, cropped.y - 12), w: Math.min(before.w - Math.max(0, cropped.x - 12), cropped.w + 24), h: Math.min(before.h - Math.max(0, cropped.y - 12), cropped.h + 24) }
  const leftOver = diff(before, nudged, cropped)
  const filledTone = mean(nudged, cropped), roundTone = mean(before, ring)
  console.log(`fill: spot differs from the subject by ${leftOver.toFixed(2)}; tone ${filledTone.map(Math.round)} vs round it ${roundTone.map(Math.round)}`)
  // well above the redraw noise of a layer standing still (on water the fill is water, so the gap is the subject alone)
  expect(leftOver, 'the subject is gone from where it stood').toBeGreaterThan(Math.max(4, 3 * jump))
  // the same on-screen box: what changed when it moved away is exactly where the new layer's box was
  const near = { x: Math.max(0, cropped.x - 20), y: Math.max(0, cropped.y - 20), x1: Math.min(before.w, cropped.x + cropped.w + 20), y1: Math.min(before.h, cropped.y + cropped.h + 20) }
  // a row or column counts when a few of its pixels changed clearly (single specks are the paper grain re-drawn)
  const cols = new Map<number, number>(), rows = new Map<number, number>()
  for (let y = near.y; y < near.y1; y++) for (let px = near.x; px < near.x1; px++) {
    const i = (y * before.w + px) * 4
    if (Math.abs(before.data[i] - nudged.data[i]) + Math.abs(before.data[i + 1] - nudged.data[i + 1]) + Math.abs(before.data[i + 2] - nudged.data[i + 2]) < 90) continue
    cols.set(px, (cols.get(px) ?? 0) + 1); rows.set(y, (rows.get(y) ?? 0) + 1)
  }
  const dense = (m: Map<number, number>) => [...m].filter(([, n]) => n >= 6).map(([k]) => k)
  const moved = { x0: Math.min(...dense(cols)), y0: Math.min(...dense(rows)), x1: Math.max(...dense(cols)) + 1, y1: Math.max(...dense(rows)) + 1 }
  console.log(`subject on screen ${JSON.stringify(moved)} vs the new layer's box ${JSON.stringify({ x0: cropped.x, y0: cropped.y, x1: cropped.x + cropped.w, y1: cropped.y + cropped.h })}`)
  // what moved lies inside the box (on water only the subject itself shows as moved: the fill there is water too)
  expect(moved.x0, 'box left').toBeGreaterThanOrEqual(cropped.x - 6)
  expect(moved.y0, 'box top').toBeGreaterThanOrEqual(cropped.y - 6)
  expect(moved.x1, 'box right').toBeLessThanOrEqual(cropped.x + cropped.w + 6)
  expect(moved.y1, 'box bottom').toBeLessThanOrEqual(cropped.y + cropped.h + 6)
  expect(moved.x1 - moved.x0, 'something moved away').toBeGreaterThan(10)
  for (let c = 0; c < 3; c++) expect(Math.abs(filledTone[c] - roundTone[c]), 'filled with what is round it').toBeLessThan(30)
  await page.evaluate(({ row, to }) => (window as any).__stage25d.moveLayer(row, 'x', to, { hold: true }), { row: id, to: x })

  // a reload keeps it: the layer and the filled copy
  const src = await page.evaluate((row) => (window as any).__stage25d.config.set.layers[Number(row.slice(6))].src, LAYER)
  expect(src).toMatch(/\/edits\//)
  await page.reload({ waitUntil: 'load' })
  await ready(page)
  expect(await layerCount(page)).toBe(start + 1)
  expect(await page.evaluate((row) => (window as any).__stage25d.config.set.layers[Number(row.slice(6))].src, LAYER)).toBe(src)

  // one Cmd-Z: the layer and the fill go together
  await page.locator('canvas.stage25d-canvas').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Meta+z')
  await expect.poll(() => layerCount(page), { timeout: 30_000 }).toBe(start)
  expect(await page.evaluate((row) => (window as any).__stage25d.config.set.layers[Number(row.slice(6))].src ?? null, LAYER)).toBeNull()
  await page.waitForTimeout(1_500)
  const undone = await stagePixels(page, stage, `${SHOTS}/make-layer-undone.png`)
  console.log(`undo: mean RGB difference from before ${diff(before, undone).toFixed(2)}`)
  expect(diff(before, undone, cropped)).toBeLessThan(4)
})
