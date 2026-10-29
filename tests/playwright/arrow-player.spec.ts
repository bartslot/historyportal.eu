import { test, expect } from '@playwright/test'

/**
 * A published lesson with a vector arrow, played in the real player: the arrow must be drawn as an
 * SVG path on the stage, the same shape the editor draws from the same data.
 *
 * Needs a published lesson whose scene PLAYER_ARROW_SCENE (a scene index) carries an arrow layer:
 *   PLAYER_ARROW_LESSON_CODE=<code> PLAYER_ARROW_SCENE=0 PW_BASE_URL=http://localhost:8021 npx playwright test arrow-player
 * Without the code the test is skipped, so the suite stays green where no such lesson is seeded.
 */
const LESSON_CODE = process.env.PLAYER_ARROW_LESSON_CODE
const SCENE_INDEX = process.env.PLAYER_ARROW_SCENE ?? '0'

// Silent: the audio stub from the browser rules, before any page script runs.
const SILENT = `(() => {
  const AC = window.AudioContext || window.webkitAudioContext
  if (AC) {
    window.AudioContext = function () { const c = new AC(); try { c.suspend && c.suspend() } catch (e) {} c.resume = () => Promise.resolve(); return c }
    window.webkitAudioContext = window.AudioContext
  }
  HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return Promise.resolve() }
})()`

test.skip(!LESSON_CODE, 'set PLAYER_ARROW_LESSON_CODE to a published lesson with a vector arrow')

test('a vector arrow in a published lesson is drawn as an SVG path in the player', async ({ page }) => {
  const failures: string[] = []
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`))
  await page.addInitScript(SILENT)

  await page.goto(`/lesson/${LESSON_CODE}?scene=${SCENE_INDEX}`, { waitUntil: 'domcontentloaded' })
  // The player opens on its title card; the class presses Start, and the scene then plays from its index.
  await page.getByRole('button', { name: /start lesson/i }).locator('visible=true').first().click({ timeout: 30_000 })

  // The arrow node holds three paths: the hit area, the shaft and the head. The shaft is the second.
  const shaft = page.locator('[data-layer-id^="art_"] svg > path:nth-child(2)')
  await expect(shaft).toHaveAttribute('d', /^M /, { timeout: 30_000 })

  const box = await shaft.boundingBox()
  expect(box, 'the shaft is laid out on the stage').not.toBeNull()
  expect(box!.width, 'the shaft has a width on screen').toBeGreaterThan(20)

  expect(failures.filter((f) => !/WebGL|uniformMatrix4fv/i.test(f))).toEqual([])
})
