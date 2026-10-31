import { test, expect, type Page } from '@playwright/test'

/**
 * An imported autonomous lesson (php artisan lessons:import-25d) draws the Babylon 2.5D stage in the editor
 * canvas and in the lesson player: the stage canvas must hold painted pixels, not the flat paper.
 *
 *   PW_S25D_LESSON_ID=<lesson id> PW_S25D_CODE=<lesson code> PW_BASE_URL=http://127.0.0.1:8123 npx playwright test stage25d
 *
 * Silent by rule: AudioContext suspended and media.play muted before any page script runs.
 */
const LESSON_ID = process.env.PW_S25D_LESSON_ID
const CODE = process.env.PW_S25D_CODE
test.setTimeout(300_000)
test.skip(!LESSON_ID || !CODE, 'set PW_S25D_LESSON_ID and PW_S25D_CODE to an imported stage25d lesson')

const SILENT = `(() => {
  const AC = window.AudioContext || window.webkitAudioContext
  if (AC) {
    window.AudioContext = function () { const c = new AC(); try { c.suspend && c.suspend() } catch (e) {} c.resume = () => Promise.resolve(); return c }
    window.webkitAudioContext = window.AudioContext
  }
  HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return Promise.resolve() }
})()`

/** Polls (slowly: a SwiftShader frame takes seconds) until the stage canvas holds a painted picture: its luminance
 *  spread is far above the flat paper and it has dark ink pixels. Written inline: the function is serialised into the page. */
async function stagePixels(page: Page) {
  const handle = await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-stage25d-ready="1"] canvas.stage25d-canvas') as HTMLCanvasElement | null
    if (!canvas || !canvas.width) return false
    const copy = document.createElement('canvas')
    copy.width = 320; copy.height = Math.max(1, Math.round(320 * canvas.height / canvas.width))
    const ctx = copy.getContext('2d')!
    ctx.drawImage(canvas, 0, 0, copy.width, copy.height)
    const d = ctx.getImageData(0, 0, copy.width, copy.height).data
    let sum = 0, sumSq = 0, n = 0
    for (let i = 0; i < d.length; i += 4) { const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; sum += l; sumSq += l * l; n++ }
    const mean = sum / n
    const sd = Math.sqrt(Math.max(0, sumSq / n - mean * mean))
    let dark = 0
    for (let i = 0; i < d.length; i += 4) if (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2] < mean - 40) dark++
    return sd > 12 && dark > 150 ? { sd, dark, w: canvas.width, h: canvas.height } : false
  }, undefined, { timeout: 180_000, polling: 2_000 })
  return handle.jsonValue() as Promise<{ sd: number; dark: number; w: number; h: number }>
}

test('the lesson player draws the stage from the database config', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(SILENT)
  await page.goto(`/lesson/${CODE}`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /start (de )?(lesson|les)/i }).locator('visible=true').first().dispatchEvent('click', {}, { timeout: 120_000 }) // no stability wait: SwiftShader starves rAF
  const px = await stagePixels(page)
  expect(px.sd, 'stage is more than flat paper').toBeGreaterThan(12)
  expect(px.dark, 'painted ink on the stage').toBeGreaterThan(150)
  expect(errors).toEqual([])
})

test('the editor canvas draws the stage for a stage25d scene', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(SILENT)
  await page.goto(`/teacher/lessons/${LESSON_ID}/wizard?step=3`, { waitUntil: 'domcontentloaded' })
  // The first scene tile is the first imported stage scene (the title screen is not one of them).
  await page.waitForSelector('[wire\\:click^="selectScene("]', { state: 'attached', timeout: 180_000 })
  await page.evaluate(() => (document.querySelector('[wire\\:click^="selectScene("]') as HTMLElement).click()) // plain click: no actionability wait under SwiftShader
  const px = await stagePixels(page)
  expect(px.sd, 'stage is more than flat paper').toBeGreaterThan(12)
  expect(px.dark, 'painted ink on the stage').toBeGreaterThan(150)
  // The editor page logs unrelated Alpine/Livewire noise ("$cleanup is not defined"); only the stage's own errors count.
  expect(errors.filter((m) => /stage25d|babylon|BJS|WebGL|shader/i.test(m))).toEqual([])
})
