import { test, expect, type Page } from '@playwright/test'

/**
 * Every control in the editor is 32 or 44 px tall, measured in the browser (Bart, 2026-11-06: "all interactive parts must be 32 or
 * 44"). CSS reading lies here: a row's flex or a label's padding decides. Picture tiles are content, not controls.
 *
 *   PW_SIZES=<lesson>/<figure scene>/<sprite scene>/<quiz scene> PW_BASE_URL=http://localhost:8034 \
 *     npx playwright test control-heights-stage25d --config=playwright.stage25d.config.ts --workers=1
 */
const [LESSON, FIGURE, SPRITE, QUIZ] = (process.env.PW_SIZES ?? '').split('/')
test.setTimeout(300_000)
test.skip(!QUIZ, 'set PW_SIZES')

const SILENT = `(() => {
  const AC = window.AudioContext || window.webkitAudioContext
  if (AC) {
    window.AudioContext = function () { const c = new AC(); try { c.suspend && c.suspend() } catch (e) {} c.resume = () => Promise.resolve(); return c }
    window.webkitAudioContext = window.AudioContext
  }
  HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return Promise.resolve() }
})()`

const CONTROLS = 'button, a.btn, a[role="button"], summary, select, input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="color"]):not([type="file"]):not([type="hidden"]), [role="tab"], label.tab, label.btn, label.input, .tabs > input.tab'
/** Content, not controls. An input inside a label.input is measured as that label. A stage overlay moves with the picture. */
const EXEMPT = '[data-stage25d-tile], [data-stage25d-picture], [data-stage25d-pose], [data-cell], [data-frame], [data-scene-id], .aspect-video, label.input input, [data-stage25d-selection] *, #lesson-canvas-root *, .pointer-events-none'

const wrong = (page: Page, state: string) => page.evaluate(([controls, exempt, name]) => {
  const out: string[] = []
  for (const el of document.querySelectorAll(controls)) {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    if (!r.width || !r.height || s.visibility === 'hidden' || s.display === 'none' || el.closest('[inert]') || el.matches(exempt)) continue
    const h = Math.round(r.height)
    if (h !== 32 && h !== 44) out.push(`${name}: ${h}px ${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40)}"`)
  }
  return [...new Set(out)]
}, [CONTROLS, EXEMPT, state])

for (const [width, height] of [[1440, 900], [1024, 700]]) {
  test(`all controls are 32 or 44 px at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.addInitScript(SILENT)
    const open = async (scene: string) => {
      await page.goto(`/teacher/lessons/${LESSON}/wizard?step=4&scene=${scene}`, { waitUntil: 'load' })
      await page.waitForTimeout(5_000)
    }
    const found: string[] = []
    await open(FIGURE)
    found.push(...await wrong(page, 'scene'))
    await page.evaluate(() => (window as any).__stage25d.select('layer-0'))
    await page.waitForTimeout(1_200)
    found.push(...await wrong(page, 'figure'))
    for (const name of ['Timeline', 'Assets', 'Script']) {
      await page.getByRole('tab', { name, exact: true }).click().catch(() => {})
      await page.waitForTimeout(800)
      found.push(...await wrong(page, name))
    }
    await open(SPRITE)
    await page.evaluate(() => { const s = (window as any).__stage25d; window.dispatchEvent(new CustomEvent('image-edit:open', { detail: s.editTarget(s.items().find((i: any) => /camp|fire|vuur/i.test(i.label))?.id ?? 'layer-0') })) })
    await page.waitForTimeout(1_500)
    found.push(...await wrong(page, 'picture editor'))
    await open(QUIZ)
    found.push(...await wrong(page, 'quiz'))
    expect([...new Set(found)]).toEqual([])
  })
}
