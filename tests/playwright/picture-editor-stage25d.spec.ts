import { test, expect, type Page } from '@playwright/test'

/**
 * The picture editor's one page: Picture, Frames and Bones tabs, one Save, one undo, Show scene beside the work. Real keys
 * and sliders, silent. Everything but the Frames save is discarded; that one is put back by the test.
 *
 *   PW_EDITOR_SPRITE=<lesson>/<scene>/<layer id of a sprite sheet> PW_EDITOR_PUPPET=<lesson>/<scene>/<layer id of a figure of parts> \
 *   PW_BASE_URL=http://localhost:8034 npx playwright test picture-editor-stage25d --config=playwright.stage25d.config.ts --workers=1
 */
const parse = (value?: string) => { const [lesson, scene, layer] = (value ?? '').split('/'); return { lesson, scene, layer } }
const SPRITE = parse(process.env.PW_EDITOR_SPRITE)
const PUPPET = parse(process.env.PW_EDITOR_PUPPET)
test.setTimeout(300_000)
test.use({ viewport: { width: 1280, height: 900 } })   // the editor's panels need more room than the stage config's small window

const SILENT = `(() => {
  const AC = window.AudioContext || window.webkitAudioContext
  if (AC) {
    window.AudioContext = function () { const c = new AC(); try { c.suspend && c.suspend() } catch (e) {} c.resume = () => Promise.resolve(); return c }
    window.webkitAudioContext = window.AudioContext
  }
  HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return Promise.resolve() }
})()`

const open = async (page: Page, { lesson, scene, layer }: ReturnType<typeof parse>) => {
  await page.addInitScript(SILENT)
  await page.goto(`/teacher/lessons/${lesson}/wizard?step=4&scene=${scene}`, { waitUntil: 'load' })
  await page.waitForFunction(() => document.querySelector('[data-stage25d-ready="1"]') && (window as any).__stage25d?.config, undefined, { timeout: 180_000 })
  await page.evaluate((id) => { window.dispatchEvent(new CustomEvent('image-edit:open', { detail: (window as any).__stage25d.editTarget(id) })) }, layer)
  await page.waitForSelector('[data-cutout]')
}
const tab = (page: Page, name: string) => page.locator(`[name="cut-mode"][value="${name}"]`).check({ force: true })
const discard = async (page: Page) => {
  await page.keyboard.press('Escape')
  const ask = page.locator('[data-cut-ask-discard]')
  if (await ask.isVisible()) await ask.click()
  await expect(page.locator('[data-cutout]')).toHaveCount(0)
}
/** How many pixels of a canvas have paint on them. */
const painted = (page: Page, selector: string) => page.locator(selector).evaluate((c: HTMLCanvasElement) => {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
  let n = 0
  for (let i = 3; i < d.length; i += 4) if (d[i] > 24) n++
  return n
})

test.describe('a sprite sheet', () => {
  test.skip(!SPRITE.layer, 'set PW_EDITOR_SPRITE')

  test('frames: duplicate, undo, redo, Save reaches the stage and comes back after a reload', async ({ page }) => {
    await open(page, SPRITE)
    await tab(page, 'frames')
    const frames = page.locator('[data-frame]')
    const start = await frames.count()
    expect(start).toBeGreaterThan(1)

    await page.keyboard.press('d')
    await expect(frames).toHaveCount(start + 1)
    await page.keyboard.press('Meta+z')
    await expect(frames).toHaveCount(start)
    await page.keyboard.press('Meta+Shift+z')
    await expect(frames).toHaveCount(start + 1)

    const saved = page.waitForResponse((r) => r.url().includes('livewire') && r.status() === 200)
    await page.locator('[data-cut-save]').click()
    await saved
    await expect(page.locator('[data-cutout]')).toHaveCount(0)
    await page.waitForTimeout(1_500)
    const play = () => page.evaluate((id) => (window as any).__stage25d.editTarget(id).frames.play, SPRITE.layer)
    expect((await play()).frames).toHaveLength(start + 1)

    await page.reload({ waitUntil: 'load' })
    await page.waitForFunction(() => document.querySelector('[data-stage25d-ready="1"]') && (window as any).__stage25d?.config, undefined, { timeout: 180_000 })
    expect((await play()).frames, 'saved on the layer').toHaveLength(start + 1)

    // put it back
    await page.evaluate((id) => { window.dispatchEvent(new CustomEvent('image-edit:open', { detail: (window as any).__stage25d.editTarget(id) })) }, SPRITE.layer)
    await page.waitForSelector('[data-cutout]')
    await tab(page, 'frames')
    await page.keyboard.press('Delete')
    await expect(frames).toHaveCount(start)
    await page.locator('[data-cut-save]').click()
    await expect(page.locator('[data-cutout]')).toHaveCount(0)
  })

  test('Show scene copies the stage beside the work, and its button says what it does', async ({ page }) => {
    await open(page, SPRITE)
    const button = page.locator('[data-cut-scene]')
    const pane = page.locator('[data-cut-scene-pane]')
    await expect(pane).toBeHidden()
    await button.click()
    await expect(pane).toBeVisible()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await page.waitForTimeout(1_000)
    expect(await painted(page, '[data-cut-scene-pane] canvas')).toBeGreaterThan(1_000)
    await button.click()
    await expect(pane).toBeHidden()
    await discard(page)
  })
})

test.describe('the Motion section', () => {
  test.skip(!PUPPET.layer, 'set PW_EDITOR_PUPPET')

  test('closed at first; open, its previews run; a motion and its sliders keep it open; a click elsewhere closes it', async ({ page }) => {
    await page.addInitScript(SILENT)
    await page.goto(`/teacher/lessons/${PUPPET.lesson}/wizard?step=4&scene=${PUPPET.scene}`, { waitUntil: 'load' })
    await page.waitForFunction(() => document.querySelector('[data-stage25d-ready="1"]') && (window as any).__stage25d?.config, undefined, { timeout: 180_000 })
    await page.evaluate((id) => (window as any).__stage25d.select(id), PUPPET.layer)
    const section = page.locator('[data-motion-section]:visible').first()
    await section.waitFor()
    const head = section.locator('button').first()
    const running = () => section.evaluate((el) => el.querySelectorAll('.motion-preview') && [...el.querySelectorAll('.motion-preview')].reduce((n, p) => n + p.getAnimations().length, 0))

    await expect(head).toHaveAttribute('aria-expanded', 'false')
    await expect(head.locator('img[src$="icons/motion.svg"]')).toBeVisible()
    expect(await running()).toBe(0)

    await head.click()
    await expect(head).toHaveAttribute('aria-expanded', 'true')
    await expect.poll(running).toBeGreaterThan(0)

    await section.locator('[data-segment="sway"]').click()
    await expect(head).toHaveAttribute('aria-expanded', 'true')
    const amount = section.locator('[data-stage25d-motion="amount"]')
    await expect(amount).toBeVisible()
    await amount.click({ position: { x: 20, y: 4 } })
    await expect(head).toHaveAttribute('aria-expanded', 'true')

    await page.locator('canvas.stage25d-canvas').click({ position: { x: 10, y: 10 } })
    await expect(head.or(page.locator('[data-motion-section]:visible button').first())).toHaveAttribute('aria-expanded', 'false')

    await page.keyboard.press('Meta+z')   // the motion this test chose goes again
    await page.waitForTimeout(800)
  })
})

test.describe('a figure of parts', () => {
  test.skip(!PUPPET.layer, 'set PW_EDITOR_PUPPET')

  const time = async (page: Page, seconds: number) => {
    await page.locator('[data-bn-time]').fill(String(seconds))
    await page.waitForTimeout(100)
  }
  const neck = (page: Page) => page.locator('[data-cut-bn-head]')

  test('a key at rest, a turned key later: the neck moves between them', async ({ page }) => {
    await open(page, PUPPET)
    await tab(page, 'bones')
    const key = page.locator('[data-bn-key]')
    await time(page, 0)
    await key.click()
    await expect(key).not.toHaveText('Add key')
    await time(page, 4)
    await neck(page).fill('20')
    await time(page, 2)
    expect(Number(await neck(page).inputValue())).toBeGreaterThan(0)
    expect(Number(await neck(page).inputValue())).toBeLessThan(20)
    await discard(page)
    const fields = await page.evaluate((id) => (window as any).__stage25d.editTarget(id).bones, PUPPET.layer)
    expect(fields.keys, 'a discard leaves no key behind').toEqual([])
  })

  test('a near forearm stops at the body, and comes back in the same gesture when the upper arm swings away', async ({ page }) => {
    await open(page, PUPPET)
    await tab(page, 'bones')
    const fore = page.locator('[data-cut-bn-forearm_n]')
    const upper = page.locator('[data-cut-bn-upperarm_n]')
    await fore.fill('-140')
    expect(Number(await fore.inputValue()), 'held at the body').toBeGreaterThan(-140)
    await upper.fill('120')
    await fore.fill('-90')
    expect(Number(await fore.inputValue())).toBe(-90)
    await upper.evaluate((el: HTMLInputElement) => {   // one gesture: down against the body and back up
      for (const value of ['0', '120']) { el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })) }
      el.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(Number(await fore.inputValue()), 'back to what the teacher had').toBe(-90)
    await discard(page)
  })

  test('an erase on the Picture tab shows on the Bones tab before Save, and undo takes it away there too', async ({ page }) => {
    await open(page, PUPPET)
    await tab(page, 'bones')
    await expect.poll(() => painted(page, '[data-bn-canvas]'), { timeout: 30_000 }).toBeGreaterThan(1_000)   // the atlas is a big file
    const before = await painted(page, '[data-bn-canvas]')

    await tab(page, 'picture')
    await page.waitForFunction(() => !document.querySelector('[data-cut-loading]'), undefined, { timeout: 60_000 })
    const art = (await page.locator('[data-cut-view]').boundingBox())!
    await page.mouse.move(art.x + art.width * 0.5, art.y + art.height * 0.3)
    await page.mouse.down()
    for (let i = 1; i < 20; i++) await page.mouse.move(art.x + art.width * (0.2 + i * 0.03), art.y + art.height * 0.3, { steps: 2 })
    await page.mouse.up()

    await tab(page, 'bones')
    await expect.poll(() => painted(page, '[data-bn-canvas]'), { message: 'the erase shows', timeout: 20_000 }).toBeLessThan(before * 0.99)

    await tab(page, 'picture')
    await page.locator('[data-cut-undo]').click()
    await tab(page, 'bones')
    await expect.poll(() => painted(page, '[data-bn-canvas]'), { message: 'undone', timeout: 20_000 }).toBeGreaterThan(before * 0.998)
    await discard(page)
  })
})
