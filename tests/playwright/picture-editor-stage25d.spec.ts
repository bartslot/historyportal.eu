import { test, expect, type Page } from '@playwright/test'

/**
 * The picture editor's one page: Picture and Frames tabs, one Save, one undo, Show scene beside the work. Real keys and sliders,
 * silent. Everything but the Frames save is discarded; that one is put back by the test.
 *
 *   PW_EDITOR_SPRITE=<lesson>/<scene>/<layer id of a sprite sheet> PW_EDITOR_FIGURE=<lesson>/<scene>/<layer id of a plain figure> \
 *   PW_BASE_URL=http://localhost:8034 npx playwright test picture-editor-stage25d --config=playwright.stage25d.config.ts --workers=1
 */
const parse = (value?: string) => { const [lesson, scene, layer] = (value ?? '').split('/'); return { lesson, scene, layer } }
const SPRITE = parse(process.env.PW_EDITOR_SPRITE)
const FIGURE = parse(process.env.PW_EDITOR_FIGURE)
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

const load = async (page: Page, { lesson, scene }: ReturnType<typeof parse>) => {
  await page.addInitScript(SILENT)
  await page.goto(`/teacher/lessons/${lesson}/wizard?step=4&scene=${scene}`, { waitUntil: 'load' })
  await page.waitForFunction(() => document.querySelector('[data-stage25d-ready="1"]') && (window as any).__stage25d?.config, undefined, { timeout: 180_000 })
}
const open = async (page: Page, target: ReturnType<typeof parse>) => {
  await load(page, target)
  await page.evaluate((id) => { window.dispatchEvent(new CustomEvent('image-edit:open', { detail: (window as any).__stage25d.editTarget(id) })) }, target.layer)
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

test.describe('a plain figure', () => {
  test.skip(!FIGURE.layer, 'set PW_EDITOR_FIGURE')

  test('the button under its picture opens the window: Picture, and no other tabs', async ({ page }) => {
    await load(page, FIGURE)
    await page.evaluate((id) => (window as any).__stage25d.select(id), FIGURE.layer)
    await page.locator('[data-stage25d-edit]:visible').click()
    await page.waitForSelector('[data-cutout]')
    await expect(page.locator('[name="cut-mode"]')).toHaveCount(0)
    await discard(page)
  })

  test('the Motion section: closed at first; open, its previews run; a motion and its sliders keep it open; a click elsewhere closes it', async ({ page }) => {
    await load(page, FIGURE)
    await page.evaluate((id) => (window as any).__stage25d.select(id), FIGURE.layer)
    const section = page.locator('[data-motion-section]:visible').first()
    await section.waitFor()
    const head = section.locator('button').first()
    const running = () => section.evaluate((el) => [...el.querySelectorAll('.motion-preview')].reduce((n, p) => n + p.getAnimations().length, 0))

    await expect(head).toHaveAttribute('aria-expanded', 'false')
    await expect(head.locator('[style*="icons/motion.svg"]')).toBeVisible()
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

  test('every tool has one pointer: the ring alone, or a cursor of its own', async ({ page }) => {
    await open(page, FIGURE)
    await page.waitForFunction(() => !document.querySelector('[data-cut-loading]'), undefined, { timeout: 60_000 })
    const art = (await page.locator('[data-cut-view]').boundingBox())!
    const onPicture = async () => {
      await page.mouse.move(art.x + art.width * 0.5, art.y + art.height * 0.5)
      await page.mouse.move(art.x + art.width * 0.5 + 3, art.y + art.height * 0.5)
    }
    const pointer = () => page.evaluate(([x, y]) => {
      const under = document.elementFromPoint(x, y)!
      return { cursor: getComputedStyle(under).cursor, ring: !(document.querySelector('[data-cut-ring]') as HTMLElement).hidden }
    }, [art.x + art.width * 0.5 + 3, art.y + art.height * 0.5])
    const pick = (name: string) => page.locator(`[data-cut-tool="${name}"]`).click()

    for (const name of ['erase', 'restore', 'brush']) {
      await pick(name)
      await onPicture()
      expect(await pointer(), name).toEqual({ cursor: 'none', ring: true })
    }
    await pick('colour')
    await onPicture()
    expect(await pointer(), 'colour').toEqual({ cursor: 'crosshair', ring: false })
    await pick('move')
    await onPicture()
    expect(await pointer(), 'hand').toEqual({ cursor: 'grab', ring: false })

    await pick('erase')
    await onPicture()
    await page.keyboard.down('Space')
    expect(await pointer(), 'Space held').toEqual({ cursor: 'grab', ring: false })
    await page.keyboard.up('Space')
    expect((await pointer()).cursor, 'Space let go, not moved yet: never none').not.toBe('none')
    await onPicture()
    expect(await pointer(), 'moved again').toEqual({ cursor: 'none', ring: true })
    await discard(page)
  })
})

test.describe('paint, pipette and clone stamp', () => {
  test.skip(!FIGURE.layer, 'set PW_EDITOR_FIGURE')

  /** The picture's pixel under a point on screen. */
  const pixelAt = (page: Page, x: number, y: number) => page.locator('[data-cut-art]').evaluate((c: HTMLCanvasElement, [x, y]) => {
    const r = c.getBoundingClientRect()
    return [...c.getContext('2d')!.getImageData(Math.floor(((x - r.left) * c.width) / r.width), Math.floor(((y - r.top) * c.height) / r.height), 1, 1).data]
  }, [x, y])
  const stroke = async (page: Page, from: number[], to: number[]) => {
    await page.mouse.move(from[0], from[1])
    await page.mouse.down()
    await page.mouse.move(to[0], to[1], { steps: 12 })
    await page.mouse.up()
  }

  test('the pipette picks a colour for the brush, paint undoes, the clone stamp asks for its source and copies it', async ({ page }) => {
    await open(page, FIGURE)
    await page.waitForFunction(() => !document.querySelector('[data-cut-loading]'), undefined, { timeout: 60_000 })
    const art = (await page.locator('[data-cut-art]').boundingBox())!
    const mid = [art.x + art.width * 0.5, art.y + art.height * 0.45]

    await page.keyboard.press('i')
    await page.mouse.click(mid[0], mid[1])
    await expect(page.locator('[name="cut-tool"][value="paint"]')).toBeChecked()
    expect(await page.locator('[data-cut-colour]').inputValue()).not.toBe('#0f172a')

    await page.locator('[data-cut-colour]').evaluate((el: HTMLInputElement) => { el.value = '#ff0000'; el.dispatchEvent(new Event('input', { bubbles: true })) })
    const before = await pixelAt(page, mid[0], mid[1])
    await stroke(page, [mid[0] - 20, mid[1]], [mid[0] + 20, mid[1]])
    const red = await pixelAt(page, mid[0], mid[1])
    expect(red[0]).toBeGreaterThan(200)
    expect(red[1]).toBeLessThan(60)
    await page.locator('[data-cut-undo]').click()
    expect(await pixelAt(page, mid[0], mid[1])).toEqual(before)

    // erased first, then painted: the paint shows (it lies over the eraser), and a new erase takes it away
    await page.keyboard.press('e')
    await stroke(page, [mid[0] - 20, mid[1]], [mid[0] + 20, mid[1]])
    expect((await pixelAt(page, mid[0], mid[1]))[3]).toBe(0)
    await page.keyboard.press('p')
    await stroke(page, [mid[0] - 20, mid[1]], [mid[0] + 20, mid[1]])
    expect((await pixelAt(page, mid[0], mid[1])).slice(0, 2)).toEqual([255, 0])
    await page.keyboard.press('e')
    await stroke(page, [mid[0] - 20, mid[1]], [mid[0] + 20, mid[1]])
    expect((await pixelAt(page, mid[0], mid[1]))[3]).toBe(0)
    for (let i = 0; i < 3; i++) await page.locator('[data-cut-undo]').click()
    expect(await pixelAt(page, mid[0], mid[1])).toEqual(before)

    await page.keyboard.press('k')
    await page.mouse.click(mid[0], mid[1])
    await expect(page.locator('.lp-tip.is-visible')).toContainText(/Alt/)
    expect(await pixelAt(page, mid[0], mid[1]), 'nothing painted without a source').toEqual(before)

    const from = [art.x + art.width * 0.5, art.y + art.height * 0.3]
    const to = [art.x + art.width * 0.5, art.y + art.height * 0.6]
    await page.keyboard.down('Alt')
    await page.mouse.click(from[0], from[1])
    await page.keyboard.up('Alt')
    const want = await pixelAt(page, from[0], from[1])
    await stroke(page, to, [to[0] + 1, to[1]])
    const got = await pixelAt(page, to[0], to[1])
    expect(Math.hypot(got[0] - want[0], got[1] - want[1], got[2] - want[2]), 'the copy matches its source').toBeLessThan(30)
    await discard(page)
  })
})

test.describe('a sheet with something erased', () => {
  test.skip(!SPRITE.layer, 'set PW_EDITOR_SPRITE')

  test('an erase on the Picture tab shows on the Frames tab before Save, and undo takes it away there too', async ({ page }) => {
    await open(page, SPRITE)
    await tab(page, 'picture')
    await page.waitForFunction(() => !document.querySelector('[data-cut-loading]'), undefined, { timeout: 60_000 })
    const art = (await page.locator('[data-cut-view]').boundingBox())!
    await page.mouse.move(art.x + art.width * 0.2, art.y + art.height * 0.5)
    await page.mouse.down()
    for (let i = 1; i < 20; i++) await page.mouse.move(art.x + art.width * (0.2 + i * 0.03), art.y + art.height * 0.5, { steps: 2 })
    await page.mouse.up()

    const sheet = () => page.locator('[data-frame] span').first().evaluate((el) => getComputedStyle(el).backgroundImage)
    await tab(page, 'frames')
    await expect.poll(sheet, { message: 'the tiles show the work, not the file' }).toContain('blob:')

    await tab(page, 'picture')
    await page.locator('[data-cut-undo]').click()
    await tab(page, 'frames')
    await expect.poll(sheet, { message: 'undone: the file again' }).not.toContain('blob:')
    await discard(page)
  })
})
