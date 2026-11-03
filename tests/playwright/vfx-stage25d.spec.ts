import { test, expect, type Page } from '@playwright/test'

/**
 * An animation (a sprite sheet, VFX shelf) dragged onto the stage stands there and plays frame by frame on the scene's
 * clock: the same moment shows the same frame, another moment another frame. Its start (Start at) is saved and one
 * Cmd+Z takes it back. Real mouse, real HTML5 drag, silent.
 *
 *   PW_S25D_EDIT_LESSON=<lesson id> PW_S25D_EDIT_SCENE=<scene id> PW_BASE_URL=http://127.0.0.1:8151 \
 *     node <main checkout>/node_modules/@playwright/test/cli.js test vfx-stage25d --config=playwright.stage25d.config.ts
 */
const LESSON = process.env.PW_S25D_EDIT_LESSON
const SCENE = process.env.PW_S25D_EDIT_SCENE
test.setTimeout(300_000)
test.skip(!LESSON || !SCENE, 'set PW_S25D_EDIT_LESSON and PW_S25D_EDIT_SCENE to a lesson and its stage25d scene')

const SILENT = `(() => {
  const AC = window.AudioContext || window.webkitAudioContext
  if (AC) {
    window.AudioContext = function () { const c = new AC(); try { c.suspend && c.suspend() } catch (e) {} c.resume = () => Promise.resolve(); return c }
    window.webkitAudioContext = window.AudioContext
  }
  HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return Promise.resolve() }
})()`

const layers = (page: Page) => page.evaluate(() => (window as any).__stage25d?.config?.set?.layers ?? [])
/** How many pixels of a PNG clip are flame (bright orange to yellow): the fire's size in that frame. */
const flame = (page: Page, png: Buffer) => page.evaluate(async (b64) => {
  const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
  const c = new OffscreenCanvas(img.width, img.height); const g = c.getContext('2d')!
  g.drawImage(img, 0, 0)
  const d = g.getImageData(0, 0, img.width, img.height).data
  let n = 0
  for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] > 90 && d[i + 2] < 140 && d[i] - d[i + 2] > 110) n++
  return n
}, png.toString('base64'))

test('the campfire dragged onto the stage plays on the scene clock, its start is saved and undone', async ({ page }) => {
  await page.addInitScript(SILENT)
  await page.goto(`/teacher/lessons/${LESSON}/wizard`, { waitUntil: 'domcontentloaded' })
  await page.locator(`[data-scene-id="${SCENE}"]`).click()
  await page.waitForFunction(() => document.querySelector('[data-stage25d-ready="1"]') && (window as any).__stage25d?.config, undefined, { timeout: 180_000 })
  await page.getByRole('tab', { name: 'Assets' }).click()
  await page.getByRole('button', { name: 'VFX', exact: true }).click()

  const tile = page.locator('[data-stage25d-tile="campfire-01"]')
  await expect(tile.locator('[data-stage25d-anim]'), 'the tile plays the sheet').toBeVisible()
  const before = (await layers(page)).length
  const canvas = page.locator('canvas.stage25d-canvas')
  const box = (await canvas.boundingBox())!
  const drop = { x: box.width * 0.72, y: box.height * 0.78 }
  await tile.dragTo(canvas, { targetPosition: drop })
  await expect.poll(async () => (await layers(page)).length, { timeout: 60_000 }).toBe(before + 1)
  expect((await layers(page)).at(-1).asset).toBe('campfire-01')
  await page.waitForTimeout(2_000)   // the add is saved

  // the scene clock picks the frame: t 1.5 twice is one frame (the fire at its tallest), t 3.8 another (embers).
  // Only the fire is clipped: the clouds drift and the smoke rises on their own clock.
  await page.mouse.click(box.x + box.width * 0.5, box.y + 8)   // the sky: the fire's selection box goes
  const plane = await page.evaluate(() => { const l = (window as any).__stage25d.config.set.layers.at(-1); return { x: l.x, z: l.z } })
  console.log(`campfire stands at x ${plane.x}, z ${plane.z} m`)
  const clip = { x: box.x + drop.x - 22, y: box.y + drop.y - 40, width: 44, height: 44 }
  const at = async (t: number) => {
    await page.evaluate((s) => (window as any).__stage25d.update(s), t)
    await page.waitForTimeout(2_500)
    return page.screenshot({ clip, path: process.env.PW_VFX_SHOTS ? `${process.env.PW_VFX_SHOTS}/t${t}-${Date.now()}.png` : undefined })
  }
  const a = await at(1.5), b = await at(3.8), c = await at(1.5)
  const [fa, fb, fc] = [await flame(page, a), await flame(page, b), await flame(page, c)]
  console.log(`flame pixels: t 1.5 ${fa}, t 3.8 ${fb}, t 1.5 again ${fc}`)
  expect(Math.abs(fa - fc), 'the same moment, the same frame').toBeLessThanOrEqual(Math.max(3, fa * 0.05))
  expect(fb, 'another moment, another frame: embers, not the tall fire').toBeLessThan(fa * 0.5)

  // picking reads the frame on show: high in the tall flame (t 1.5) is the fire, the same spot over the embers (t 3.8)
  // is not (a click there goes to whatever stands behind)
  const selected = () => page.evaluate(() => (window as any).__stage25d.selection)
  const high = { x: box.x + drop.x, y: box.y + drop.y - 24 }   // in the flame body at t 1.5, above the embers at t 3.8
  await page.evaluate(() => (window as any).__stage25d.update(3.8)); await page.waitForTimeout(1_500)
  await page.mouse.click(high.x, high.y)
  await page.waitForTimeout(500)
  expect(await selected(), 'over the embers: not the fire').not.toBe((await layers(page)).length - 1)
  await page.mouse.click(box.x + box.width * 0.5, box.y + 8)
  await page.evaluate(() => (window as any).__stage25d.update(1.5)); await page.waitForTimeout(1_500)
  await page.mouse.click(high.x, high.y)
  await expect.poll(selected, { timeout: 5_000 }).toBe((await layers(page)).length - 1)

  // Start at: typed, saved on the layer, one undo takes it back
  const i = (await layers(page)).length - 1
  // the fire is selected (above): its panel opens
  const start = page.locator('[data-stage25d-play-field="offset"]')
  await expect(start).toBeVisible({ timeout: 20_000 })
  await start.fill('1.5')
  await start.press('Tab')
  const live = () => page.evaluate((n) => (window as any).__stage25d.layerInfo(`layer-${n}`)?.play?.offset, i)
  await expect.poll(live, { timeout: 20_000 }).toBe(1.5)
  await page.waitForTimeout(2_500)   // the debounced save lands

  const reopen = async () => {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator(`[data-scene-id="${SCENE}"]`).click()
    await page.waitForFunction(() => document.querySelector('[data-stage25d-ready="1"]') && (window as any).__stage25d?.config, undefined, { timeout: 180_000 })
  }
  await reopen()
  expect((await layers(page))[i]?.play?.offset, 'saved on the layer').toBe(1.5)

  await page.keyboard.press('Meta+z')
  await expect.poll(async () => { await page.waitForTimeout(1_000); return live() }, { timeout: 60_000 }).toBe(0)
})
