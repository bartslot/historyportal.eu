import { test, expect, type Page } from '@playwright/test'

/**
 * The Motion tab's transition plays on the stage when a teacher picks one: the scene before, then this
 * scene coming in over it (scene/transition-preview.js, the player's own playSceneTransition). Silent.
 * Saves into the throwaway lesson only.
 *
 *   php artisan tinker --execute='require "tests/playwright/editor-walk-lesson.php";'   # prints PW_EDITOR_WALK
 *   PW_EDITOR_WALK=<lesson>/<scene>/<scene> PW_BASE_URL=http://127.0.0.1:8023 \
 *     npx playwright test zz-transition-preview-stage25d --config=playwright.stage25d.config.ts --workers=1
 */
const [LESSON, , SCENE] = (process.env.PW_EDITOR_WALK ?? '').split('/')   // the second scene: it has one before it
test.setTimeout(300_000)
test.use({ viewport: { width: 1280, height: 900 } })
test.skip(!SCENE, 'set PW_EDITOR_WALK')

const SILENT = `(() => {
  const AC = window.AudioContext || window.webkitAudioContext
  if (AC) {
    window.AudioContext = function () { const c = new AC(); try { c.suspend && c.suspend() } catch (e) {} c.resume = () => Promise.resolve(); return c }
    window.webkitAudioContext = window.AudioContext
  }
  HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return Promise.resolve() }
})()`

const motionTab = (page: Page) => page.locator(`label:has(input[name="scene-tabs-${SCENE}"][value="animate"])`).click()

const load = async (page: Page) => {
  await page.goto(`/teacher/lessons/${LESSON}/wizard?step=4&scene=${SCENE}`, { waitUntil: 'load' })
  await page.waitForFunction(() => document.querySelector('[data-stage25d-ready="1"]') && (window as any).__stage25d?.config, undefined, { timeout: 180_000 })
  await motionTab(page)
  await expect(page.locator('[data-scene-transition]')).toBeVisible()
}

type Sample = { t: number, x: number, opacity: number }

/** The distinct opacities seen part way in: a real fade shows several, a cut none. SwiftShader draws a few frames a second, so a few is plenty. */
const between = (samples: Sample[]) => new Set(samples.filter((s) => s.opacity > 0.05 && s.opacity < 0.95).map((s) => s.opacity.toFixed(2))).size

/** Watch the preview's incoming picture every frame for `ms`: where it is across, and how opaque. */
const watch = (page: Page, ms: number) => page.evaluate((ms) => new Promise<Sample[]>((resolve) => {
  const out: Sample[] = []
  const t0 = performance.now()
  const tick = () => {
    const pic = document.querySelector('[data-transition-preview]')?.lastElementChild
    if (pic) {
      const s = getComputedStyle(pic)
      out.push({ t: performance.now() - t0, x: new DOMMatrix(s.transform === 'none' ? undefined : s.transform).m41, opacity: Number(s.opacity) })
    }
    if (performance.now() - t0 < ms) requestAnimationFrame(tick)
    else resolve(out)
  }
  requestAnimationFrame(tick)
}), ms)

const pick = async (page: Page, type: string) => {
  const saved = page.waitForResponse((r) => r.url().includes('livewire') && r.status() === 200)
  const samples = watch(page, 2_500)
  await page.locator('[data-scene-transition]').selectOption(type)
  await saved
  return samples
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(SILENT)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
})

test('picking Slide left plays it on the stage: the new scene travels in from the right, once, then the live stage is back', async ({ page }) => {
  await load(page)
  const samples = await pick(page, 'slide-left')

  const moving = samples.filter((s) => s.x > 1)
  expect(moving.length, 'frames with the picture on its way in').toBeGreaterThan(2)
  const xs = moving.map((s) => s.x)
  expect(new Set(xs.map(Math.round)).size, 'it moves, not one jump').toBeGreaterThan(2)
  expect(xs[0]).toBeGreaterThan(xs[xs.length - 1])   // right to left
  expect(samples.some((s) => s.opacity > 0.05 && s.opacity < 0.95), 'it fades in as it travels').toBe(true)
  await expect(page.locator('[data-transition-preview]'), 'gone afterwards: the live stage shows again').toHaveCount(0)

  await page.reload({ waitUntil: 'load' })
  await page.waitForFunction(() => document.querySelector('[data-stage25d-ready="1"]'), undefined, { timeout: 180_000 })
  await motionTab(page)
  await expect(page.locator('[data-scene-transition]'), 'saved on the scene').toHaveValue('slide-left')
})

test('Crossfade fades without moving; Cut changes in one frame; Preview plays it again', async ({ page }) => {
  await load(page)

  const fade = await pick(page, 'crossfade')
  expect(between(fade), 'frames in between').toBeGreaterThan(1)
  expect(fade.every((s) => Math.abs(s.x) < 1), 'nothing travels').toBe(true)

  const cut = await pick(page, 'cut')
  expect(between(cut), 'no frames in between').toBe(0)

  await page.locator('[data-scene-transition]').selectOption('slide-up')   // and back to a moving one
  await expect(page.locator('[data-transition-preview]')).toHaveCount(0, { timeout: 5_000 })
  const again = watch(page, 2_500)
  await page.locator('[data-scene-transition-preview]').click()
  expect(between(await again), 'Preview shows it again').toBeGreaterThan(1)
})

test('under reduced motion a slide only fades', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await load(page)
  const samples = await pick(page, 'slide-right')
  expect(between(samples)).toBeGreaterThan(1)
  expect(samples.every((s) => Math.abs(s.x) < 1)).toBe(true)
})
