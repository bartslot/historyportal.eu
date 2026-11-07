import { test, expect, type Page } from '@playwright/test'

/**
 * Bones on the stage: a selected figure of parts shows a handle on each bone; a drag turns that bone live, at the stage's own
 * frame rate and with no server round trip while it moves, then saves once. The Bones rows show in the timeline. Silent.
 * The turn it makes is put back at the end.
 *
 *   PW_BONES=<lesson>/<scene>/<layer id of a puppet, e.g. layer-1> \
 *   PW_BASE_URL=http://localhost:8034 npx playwright test stage-bones-stage25d --config=playwright.stage25d.config.ts --workers=1
 */
const [LESSON, SCENE, LAYER] = (process.env.PW_BONES ?? '').split('/')
test.setTimeout(240_000)
test.use({ viewport: { width: 1280, height: 900 } })

const SILENT = `(() => {
  const AC = window.AudioContext || window.webkitAudioContext
  if (AC) {
    window.AudioContext = function () { const c = new AC(); try { c.suspend && c.suspend() } catch (e) {} c.resume = () => Promise.resolve(); return c }
    window.webkitAudioContext = window.AudioContext
  }
  HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return Promise.resolve() }
})()`

/** Frames the page draws in `ms`, while `during` runs. */
const framesWhile = (page: Page, ms: number) => page.evaluate((ms) => new Promise<number>((resolve) => {
  let n = 0
  const t0 = performance.now()
  const tick = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(tick); else resolve((n * 1000) / (performance.now() - t0)) }
  requestAnimationFrame(tick)
}), ms)

const head = (page: Page) => page.evaluate((id) => (window as any).__stage25d.readLayerProp(id, 'bone:head'), LAYER)

test('a drag on a bone handle turns the bone live, then saves once', async ({ page }) => {
  test.skip(!LAYER, 'set PW_BONES=<lesson>/<scene>/<layer id>')
  await page.addInitScript(SILENT)
  await page.goto(`/teacher/lessons/${LESSON}/wizard?step=4&scene=${SCENE}`, { waitUntil: 'load' })
  await page.waitForFunction(() => document.querySelector('[data-stage25d-ready="1"]') && (window as any).__stage25d?.config, undefined, { timeout: 180_000 })
  await page.evaluate((id) => (window as any).__stage25d.select(id), LAYER)

  const dot = page.locator('[data-bone-handle="head"]')
  await expect(dot).toBeVisible()
  const size = await dot.boundingBox()
  expect([Math.round(size!.width), Math.round(size!.height)]).toEqual([32, 32])   // the control sizes: 32 to grab
  await expect(page.locator('[data-bone-handle]')).not.toHaveCount(0)

  // the timeline has the figure's Bones rows
  await expect(page.locator('[data-timeline-row]').filter({ hasText: /Neck|Nek/ }).first()).toBeAttached()

  const before = await head(page)
  const idle = await framesWhile(page, 1500)

  // the head's handle sits in the middle of the head, its joint below it at the neck: sweep round a point under the handle
  const c = { x: size!.x + 16, y: size!.y + 16 }
  const j = { x: c.x, y: c.y + 30 }
  const r = Math.hypot(c.x - j.x, c.y - j.y)
  const a0 = Math.atan2(c.y - j.y, c.x - j.x)

  const calls: string[] = []
  // the round trips that save this layer: its value (stage25d:layer) or its keys (setTimeline); the editor's own polls and
  // thumbnail stills are not the drag's
  page.on('request', (q) => {
    const body = q.postData() ?? ''
    if (q.url().includes('/livewire/update') && /stage25d:layer|setTimeline/.test(body)) calls.push(body.match(/"method":"[^"]+"|"name":"[^"]+"/g)?.join(' ') ?? '?')
  })

  await page.mouse.move(c.x, c.y)
  await page.mouse.down()
  const fps = framesWhile(page, 1200)
  for (let k = 1; k <= 40; k++) {   // a 20 degree sweep, clockwise
    const a = a0 + ((20 * Math.PI) / 180) * (k / 40)
    await page.mouse.move(j.x + r * Math.cos(a), j.y + r * Math.sin(a))
    await page.waitForTimeout(25)
  }
  const dragFps = await fps
  const during = calls.length
  await page.mouse.up()
  const turned = await head(page)

  console.log(JSON.stringify({ idleFps: Math.round(idle), dragFps: Math.round(dragFps), roundTripsWhileDragging: calls.slice(0, during), before, turned }))
  expect(during).toBe(0)                                  // nothing goes to the server while the bone moves
  expect(Math.abs(turned - before)).toBeGreaterThan(5)    // it turned
  expect(dragFps).toBeGreaterThan(idle * 0.8)             // the drag costs no frames

  await page.waitForTimeout(1500)
  expect(calls.length).toBeGreaterThanOrEqual(1)          // then it saved
  expect(calls.length).toBeLessThanOrEqual(2)

  // put it back as it was
  await page.evaluate(([id, v]) => (window as any).__stage25d.moveLayer(id, 'bone:head', v), [LAYER, before] as const)
  await page.waitForTimeout(1500)
})
