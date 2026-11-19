import { test, expect, type Page } from '@playwright/test'

/**
 * Cmd-Z takes back the newest edit first (Bart 11-19: a layer deleted after a scene stayed gone, and Cmd-Z
 * brought the scene back instead). Delete the other scene from the rail, delete a layer with the Delete key,
 * then Cmd-Z twice: the layer first, the scene second. Silent. The throwaway lesson is changed for good.
 *
 *   php artisan tinker --execute='require "tests/playwright/editor-walk-lesson.php";'   # prints PW_EDITOR_WALK
 *   PW_EDITOR_WALK=<lesson>/<scene>/<other scene> PW_BASE_URL=http://127.0.0.1:8023 \
 *     npx playwright test zz-undo-order-stage25d --config=playwright.stage25d.config.ts --workers=1
 */
const [lesson, scene, other] = (process.env.PW_EDITOR_WALK ?? '').split('/')
test.setTimeout(300_000)
test.use({ viewport: { width: 1280, height: 900 } })

const SILENT = `(() => {
  const AC = window.AudioContext || window.webkitAudioContext
  if (AC) {
    window.AudioContext = function () { const c = new AC(); try { c.suspend && c.suspend() } catch (e) {} c.resume = () => Promise.resolve(); return c }
    window.webkitAudioContext = window.AudioContext
  }
  HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return Promise.resolve() }
})()`

const layerCount = (page: Page) => page.evaluate(() => ((window as any).__stage25d?.config?.set?.layers ?? []).length as number)
const sceneInRail = (page: Page) => page.locator(`[data-scene-delete="${other}"]`).count()

test('delete a scene, delete a layer: Cmd-Z restores the layer, a second Cmd-Z the scene', async ({ page }) => {
  test.skip(!other, 'set PW_EDITOR_WALK')
  await page.addInitScript(SILENT)
  await page.goto(`/teacher/lessons/${lesson}/wizard?step=4&scene=${scene}`, { waitUntil: 'load' })
  await page.waitForFunction(() => document.querySelector('[data-stage25d-ready="1"]') && (window as any).__stage25d?.config, undefined, { timeout: 180_000 })

  // 1. the other scene, through its rail menu's Delete (the menu is a popover: the click goes straight to the button)
  expect(await sceneInRail(page)).toBe(1)
  await page.locator(`[data-scene-delete="${other}"]`).dispatchEvent('click')
  await expect.poll(() => sceneInRail(page), { timeout: 20_000 }).toBe(0)

  // 2. the top layer, selected on the stage and deleted with the Delete key
  await page.waitForFunction(() => document.querySelector('[data-stage25d-ready="1"]') && (window as any).__stage25d?.config, undefined, { timeout: 180_000 })
  const before = await layerCount(page)
  expect(before).toBeGreaterThan(1)
  await page.evaluate((n) => { (document.activeElement as HTMLElement | null)?.blur?.(); (window as any).__stage25d.select(`layer-${n - 1}`) }, before)
  await expect.poll(() => page.evaluate(() => (window as any).__stage25d.selection)).toBe(before - 1)
  await page.keyboard.press('Delete')
  await expect.poll(() => layerCount(page), { timeout: 20_000 }).toBe(before - 1)

  // 3. Cmd-Z: the newest edit, the layer, comes back; the scene stays deleted
  await page.keyboard.press('Meta+z')
  await expect.poll(() => layerCount(page), { timeout: 20_000 }).toBe(before)
  await page.waitForTimeout(1_500)
  expect(await sceneInRail(page), 'the scene waits for the second Cmd-Z').toBe(0)

  // 4. Cmd-Z again: now the scene
  await page.keyboard.press('Meta+z')
  await expect.poll(() => sceneInRail(page), { timeout: 20_000 }).toBe(1)
})
