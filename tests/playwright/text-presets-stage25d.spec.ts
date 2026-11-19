import { test, expect, type Page } from '@playwright/test'

/**
 * A text layer's motion presets (Motion tab, resources/js/anim/text-presets.js) write ordinary keys on its timeline
 * rows, play once on the stage, come off with one Cmd-Z, survive a reload, and play in the student player. Silent.
 * Saves into its own throwaway copy only (never the editor-walk lesson, whose script deletes by title).
 *
 *   php artisan tinker --execute='require "<scratchpad>/copy-text-presets.php";'   # prints PW_EDITOR_WALK
 *   PW_EDITOR_WALK=<lesson>/<scene>/<scene> PW_LESSON_CODE=<code> PW_BASE_URL=http://127.0.0.1:8023 \
 *     npx playwright test text-presets-stage25d --config=playwright.stage25d.config.ts --workers=1
 */
const [LESSON, SCENE] = (process.env.PW_EDITOR_WALK ?? '').split('/')
const CODE = process.env.PW_LESSON_CODE ?? ''
const TEXT_ID = 'txt_presets'
const TARGET = `text:${TEXT_ID}`
const WORDS = 'Venice in the year 1217, a city built on water'   // 37 letters (typewriter 1.85 s), 10 words (3.333 s)
const LETTERS = 37
test.setTimeout(400_000)
test.use({ viewport: { width: 1280, height: 900 } })
test.describe.configure({ mode: 'serial' })
test.skip(!SCENE, 'set PW_EDITOR_WALK')

// Silent: --mute-audio (config) plus this. media.play still runs (the player's clock is its narration) but muted.
const SILENT = `(() => {
  const AC = window.AudioContext || window.webkitAudioContext
  if (AC) {
    window.AudioContext = function () { const c = new AC(); try { c.suspend && c.suspend() } catch (e) {} c.resume = () => Promise.resolve(); return c }
    window.webkitAudioContext = window.AudioContext
  }
  const play = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return play.call(this).catch(() => {}) }
})()`

type Sample = { letters: number, opacity: number, top: number }

/** Watch the text on the stage every frame for `ms`: its visible letters (not inside a reveal span at opacity 0), opacity, top. */
const watch = (page: Page, ms: number) => page.evaluate(({ ms, id }) => new Promise<Sample[]>((resolve) => {
  const out: Sample[] = []
  const t0 = performance.now()
  const visible = (n: Node): string => [...n.childNodes].map((c) => (c.nodeType === 3 ? (c as Text).data
    : (c as HTMLElement).dataset && 'reveal' in (c as HTMLElement).dataset && Number((c as HTMLElement).style.opacity) === 0 ? '' : visible(c))).join('')
  const tick = () => {
    const node = document.querySelector(`#lesson-text-overlay [data-text-id="${id}"]`) as HTMLElement | null
    if (node) out.push({ letters: visible(node).replace(/\s+/g, '').length, opacity: Number(getComputedStyle(node).opacity), top: node.getBoundingClientRect().top })
    if (performance.now() - t0 < ms) requestAnimationFrame(tick)
    else resolve(out)
  }
  requestAnimationFrame(tick)
}), { ms, id: TEXT_ID })

/** The timeline panel's keys on one of the text's rows, as `[time, value]`. */
const keysOn = (page: Page, property: string) => page.evaluate(({ target, property }) => {
  const panel = (document.querySelector('[data-timeline]') as any)?._x_dataStack?.[0]
  const track = (panel?.tracks ?? []).find((t: any) => t.target === target && t.property === property)
  return (track?.keyframes ?? []).map((k: any) => [k.time, k.value]) as [number, number][]
}, { target: TARGET, property })

const stageReady = (page: Page) => page.waitForFunction(() => document.querySelector('[data-stage25d-ready="1"]') && (window as any).__stage25d?.config, undefined, { timeout: 180_000 })

const openEditor = async (page: Page) => {
  await page.goto(`/teacher/lessons/${LESSON}/wizard?step=4&scene=${SCENE}`, { waitUntil: 'load' })
  await stageReady(page)
  await page.waitForFunction((id) => document.querySelector(`#lesson-text-overlay [data-text-id="${id}"]`), TEXT_ID, { timeout: 60_000 })
  await page.waitForFunction(() => (window as any).__timelineKeying?.textPreset, undefined, { timeout: 60_000 })
}

/** Select the text the way a teacher does (a click on it), open its Motion tab. */
const openMotion = async (page: Page) => {
  await page.locator(`#lesson-text-overlay [data-text-id="${TEXT_ID}"]`).click({ position: { x: 4, y: 4 } })
  await expect(page.locator('[data-text-inspector]')).toBeVisible({ timeout: 20_000 })
  await page.locator(`label:has(input[name="text-tabs-${TEXT_ID}"][value="animate"])`).click()
  await expect(page.locator('[data-text-preset="typewriter"]')).toBeVisible()
}

const pick = async (page: Page, id: string, ms = 2_500) => {
  const saved = page.waitForResponse((r) => r.url().includes('livewire') && r.status() === 200)
  const samples = watch(page, ms)
  await page.locator(`[data-text-preset="${id}"]`).click()
  await saved
  return samples
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(SILENT)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
})

test('a text gets Typewriter, Fade in and Rise as keys it plays, one Cmd-Z takes one back, a reload keeps them', async ({ page }) => {
  // The text layer, through the editor's own save (TextOverlayLayer onChange -> sceneTextsChanged), no keys on it yet.
  await page.goto(`/teacher/lessons/${LESSON}/wizard?step=4&scene=${SCENE}`, { waitUntil: 'load' })
  await stageReady(page)
  await page.evaluate(({ scene, id, text }) => {
    (window as any).Livewire.dispatch('sceneTextsChanged', { sceneId: Number(scene), texts: [{ id, text, x: 10, y: 20, font: 'history', size: 'xl', anchor: 'screen' }] })
  }, { scene: SCENE, id: TEXT_ID, text: WORDS })
  await page.waitForTimeout(2_000)
  await openEditor(page)
  await openMotion(page)
  expect(await keysOn(page, 'reveal')).toEqual([])

  // 1. Typewriter: two keys on the Letters shown row, and on the stage the letters come in one after another
  const typing = await pick(page, 'typewriter', 3_000)
  expect(await keysOn(page, 'reveal')).toEqual([[0, 0], [1.85, 1]])
  const counts = typing.map((s) => s.letters)
  expect(new Set(counts.filter((n) => n > 0 && n < LETTERS)).size, `letters part way: ${counts.join(',')}`).toBeGreaterThan(1)
  const typed = counts.slice(counts.indexOf(0))   // from the moment the preview starts (the text was whole before)
  expect(typed.every((n, i) => i === 0 || n >= typed[i - 1]), `letters only ever come in: ${typed.join(',')}`).toBe(true)
  expect(counts.at(-1), 'every letter at the end').toBe(LETTERS)
  await expect(page.locator(`[data-timeline-diamond="${TARGET}:reveal"]`).first()).toBeAttached()
  await page.screenshot({ path: 'tests/playwright/results-stage25d/text-presets-motion-tab.png' })

  // 2. one Cmd-Z takes the whole preset back, and the text shows in full again
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.())
  await page.keyboard.press('Meta+z')
  await expect.poll(() => keysOn(page, 'reveal'), { timeout: 20_000 }).toEqual([])
  await expect.poll(async () => (await watch(page, 200)).at(-1)?.letters).toBe(LETTERS)

  // 3. Fade in: the opacity row, and the text passes through in-between opacities
  await openMotion(page)
  const fade = await pick(page, 'fade')
  expect(await keysOn(page, 'opacity')).toEqual([[0, 0], [0.6, 1]])
  expect(new Set(fade.filter((s) => s.opacity > 0.03 && s.opacity < 0.97).map((s) => s.opacity.toFixed(2))).size, 'frames part way').toBeGreaterThan(1)
  expect(fade.at(-1)?.opacity).toBe(1)

  // 4. Rise picked right after takes Fade in's place (same start): opacity and y keys, and the text moves up as it comes in
  const rise = await pick(page, 'rise')
  expect(await keysOn(page, 'opacity')).toEqual([[0, 0], [0.8, 1]])
  expect(await keysOn(page, 'y')).toEqual([[0, 24], [0.8, 20]])
  const risen = rise.slice(rise.findIndex((s) => s.opacity < 0.03))   // from the moment the preview starts
  const tops = risen.filter((s) => s.opacity > 0.03).map((s) => Math.round(s.top))
  expect(tops[0], `starts lower: ${tops.join(',')}`).toBeGreaterThan(tops.at(-1)! + 5)
  expect(new Set(tops).size, 'moves through in-between places').toBeGreaterThan(2)

  // 5. a reload: the keys are the scene's
  await openEditor(page)
  expect(await keysOn(page, 'opacity')).toEqual([[0, 0], [0.8, 1]])
  expect(await keysOn(page, 'y')).toEqual([[0, 24], [0.8, 20]])

  // 6. back to Typewriter for the player: at the playhead's start again (0), it replaces Rise there
  await page.evaluate(() => (window as any).__timelineKeying.seekTo('from'))
  await openMotion(page)
  await pick(page, 'typewriter', 1_500)
  expect(await keysOn(page, 'reveal')).toEqual([[0, 0], [1.85, 1]])
  expect(await keysOn(page, 'opacity')).toEqual([])
  await page.waitForTimeout(1_500)   // the save lands
})

test('under reduced motion a preset jumps to its end: the keys, no frames in between', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openEditor(page)
  await page.evaluate(() => (window as any).__timelineKeying.seekTo('from'))
  await openMotion(page)
  const samples = await pick(page, 'words', 2_000)
  expect(await keysOn(page, 'revealWords')).toEqual([[0, 0], [3.333, 1]])
  expect(samples.filter((s) => s.letters > 0 && s.letters < LETTERS)).toEqual([])
  await page.keyboard.press('Meta+z')   // leave the scene as test 1 left it
  await expect.poll(() => keysOn(page, 'revealWords'), { timeout: 20_000 }).toEqual([])
})

test('the student player types the title in', async ({ page }) => {
  test.skip(!CODE, 'set PW_LESSON_CODE')
  await page.goto(`/lesson/${CODE}`, { waitUntil: 'domcontentloaded' })
  const silent = await page.evaluate(() => new AudioContext().state !== 'running')
  expect(silent, 'the AudioContext is suspended').toBe(true)
  const counts: number[] = []
  await page.getByRole('button', { name: /start (de )?(lesson|les)/i }).locator('visible=true').first().dispatchEvent('click', {}, { timeout: 120_000 })
  await page.waitForFunction((id) => document.querySelector(`#lesson-text-overlay [data-text-id="${id}"]`), TEXT_ID, { timeout: 180_000 })
  const end = Date.now() + 8_000
  while (Date.now() < end && counts.at(-1) !== LETTERS) counts.push(...(await watch(page, 400)).map((s) => s.letters))
  expect(new Set(counts.filter((n) => n > 0 && n < LETTERS)).size, `letters part way: ${counts.join(',')}`).toBeGreaterThan(0)
  expect(counts.at(-1)).toBe(LETTERS)
})
