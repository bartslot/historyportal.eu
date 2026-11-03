import { test, expect, type Page } from '@playwright/test'

/**
 * A character's poses are one tile in the Assets tab (with its count); dragging that tile onto the stage adds the
 * character standing, and one Cmd+Z takes it off again. Real mouse, real HTML5 drag, silent.
 *
 *   PW_S25D_EDIT_LESSON=<lesson id> PW_S25D_EDIT_SCENE=<scene id> PW_BASE_URL=http://127.0.0.1:8151 \
 *     node <main checkout>/node_modules/@playwright/test/cli.js test series-stage25d --config=playwright.stage25d.config.ts
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

const layerCount = (page: Page) => page.evaluate(() => (window as any).__stage25d?.config?.set?.layers?.length ?? -1)

test('a series tile dragged onto the stage adds the character, and one undo takes it off', async ({ page }) => {
  await page.addInitScript(SILENT)
  await page.goto(`/teacher/lessons/${LESSON}/wizard`, { waitUntil: 'domcontentloaded' })
  await page.locator(`[data-scene-id="${SCENE}"]`).click()
  await page.waitForFunction(() => document.querySelector('[data-stage25d-ready="1"]') && (window as any).__stage25d?.config, undefined, { timeout: 180_000 })
  await page.getByRole('tab', { name: 'Assets' }).click()
  await page.getByRole('button', { name: 'Characters', exact: true }).click()

  const tile = page.locator('[data-stage25d-tile^="series:"]').first()
  await expect(tile.locator('[data-series-count]')).toHaveText(/^\d+$/)
  const before = await layerCount(page)
  await tile.dragTo(page.locator('canvas.stage25d-canvas'), { targetPosition: { x: 140, y: 160 } })

  await expect.poll(() => layerCount(page), { timeout: 60_000 }).toBe(before + 1)
  const added = await page.evaluate(() => (window as any).__stage25d.config.set.layers.at(-1).asset)
  expect(added, 'the series cover: standing, facing right').toMatch(/^fig-.+-stand-01$/)

  await page.waitForTimeout(2_000)   // the add is saved before the undo is asked
  await page.keyboard.press('Meta+z')
  await expect.poll(() => layerCount(page), { timeout: 60_000 }).toBe(before)
})
