import { test, expect, type Page } from '@playwright/test'

/**
 * The whole picture editor, walked the way a teacher does: real mouse, real keys, every check on pixels or on what was saved.
 * It saves, so it runs on a throwaway lesson, made fresh each time:
 *
 *   php artisan tinker --execute='require "tests/playwright/editor-walk-lesson.php";'      # prints PW_EDITOR_WALK=<lesson>/<scene>/<animation scene>
 *   PW_EDITOR_WALK=<lesson>/<scene>/<animation scene> PW_BASE_URL=http://localhost:8034 \
 *     npx playwright test picture-editor-walk --config=playwright.stage25d.config.ts --workers=1
 *
 * layer-2 is a test card of 600 x 600 (editor-walk-lesson.php), so every region's colour is known here.
 */
const [LESSON, SCENE, ANIMATION_SCENE] = (process.env.PW_EDITOR_WALK ?? '').split('/')
test.skip(!LESSON, 'set PW_EDITOR_WALK')
test.setTimeout(240_000)
test.use({ viewport: { width: 1280, height: 900 } })

const CARD = 'layer-2', FIGURE = 'layer-0'
const WHITE_OUT = [30, 300], HOLE = [150, 150], LINE = [60, 150], COAT = [340, 150], COAT_FAR = [520, 150], SPOT = [150, 420], GREEN = [430, 430]

const SILENT = `(() => {
  const AC = window.AudioContext || window.webkitAudioContext
  if (AC) {
    window.AudioContext = function () { const c = new AC(); try { c.suspend && c.suspend() } catch (e) {} c.resume = () => Promise.resolve(); return c }
    window.webkitAudioContext = window.AudioContext
  }
  HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return Promise.resolve() }
})()`

const errors: string[] = []
test.beforeEach(({ page }) => {
  errors.length = 0
  page.on('pageerror', (e) => errors.push(e.message))
})
test.afterEach(() => { expect(errors, 'no script errors').toEqual([]) })

const load = async (page: Page, scene = SCENE) => {
  await page.addInitScript(SILENT)
  await page.goto(`/teacher/lessons/${LESSON}/wizard?step=4&scene=${scene}`, { waitUntil: 'load' })
  await page.waitForFunction(() => document.querySelector('[data-stage25d-ready="1"]') && (window as any).__stage25d?.config, undefined, { timeout: 180_000 })
}
const openLayer = async (page: Page, layer: string) => {
  await page.evaluate((id) => { window.dispatchEvent(new CustomEvent('image-edit:open', { detail: (window as any).__stage25d.editTarget(id) })) }, layer)
  await page.waitForSelector('[data-cutout]')
  await page.waitForFunction(() => !document.querySelector('[data-cut-loading]'), undefined, { timeout: 60_000 })
}
const open = async (page: Page, layer = CARD) => { await load(page); await openLayer(page, layer) }

const pixel = (page: Page, [x, y]: number[]) => page.locator('[data-cut-art]').evaluate((c: HTMLCanvasElement, [x, y]) =>
  [...c.getContext('2d')!.getImageData(x, y, 1, 1).data], [x, y])
const alpha = async (page: Page, at: number[]) => (await pixel(page, at))[3]
const near = (a: number[], b: number[], within: number) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) <= within

/** Where a pixel of the picture is on screen, on whole px as a mouse event reports them. */
const screen = async (page: Page, [x, y]: number[]) => {
  const c = await page.locator('[data-cut-art]').evaluate((el: HTMLCanvasElement) => ({ w: el.width, h: el.height }))
  const box = (await page.locator('[data-cut-art]').boundingBox())!
  return [Math.round(box.x + ((x + 0.5) * box.width) / c.w), Math.round(box.y + ((y + 0.5) * box.height) / c.h)]
}
const click = async (page: Page, at: number[]) => { const [x, y] = await screen(page, at); await page.mouse.click(x, y) }
const stroke = async (page: Page, from: number[], to: number[]) => {
  const a = await screen(page, from), b = await screen(page, to)
  await page.mouse.move(a[0], a[1])
  await page.mouse.down()
  await page.mouse.move(b[0], b[1], { steps: 12 })
  await page.mouse.up()
}
const tool = async (page: Page, key: string, name: string) => {
  await page.keyboard.press(key)
  await expect(page.locator(`[name="cut-tool"][value="${name}"]`)).toBeChecked()
}
const undo = (page: Page) => page.locator('[data-cut-undo]').click()
const redo = (page: Page) => page.locator('[data-cut-redo]').click()
const film = async (page: Page) => {
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(null)))))
  return page.locator('[data-cut-film]').evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
    let n = 0
    for (let i = 3; i < d.length; i += 4) if (d[i] > 24) n++
    return n
  })
}
const leaveAndDiscard = async (page: Page) => {
  await page.keyboard.press('Escape')
  const ask = page.locator('[data-cut-ask-discard]')
  if (await ask.isVisible()) await ask.click()
  await expect(page.locator('[data-cutout]')).toHaveCount(0)
}
const setSwatch = (page: Page, hex: string) => page.locator('[data-cut-colour]').evaluate((el: HTMLInputElement, hex) => { el.value = hex; el.dispatchEvent(new Event('input', { bubbles: true })) }, hex)
/** A real click on a slider's rail, `share` of the way along. Returns the value it took. */
const slide = async (page: Page, name: string, share: number) => {
  const input = page.locator(`[data-cut-${name}]`)
  const box = (await input.boundingBox())!
  await page.mouse.click(Math.round(box.x + box.width * share), Math.round(box.y + box.height / 2))
  return Number(await input.inputValue())
}
const savedSrc = (page: Page, layer: number) => page.evaluate((i) => (window as any).__stage25d.config.set.layers[i].src ?? null, layer)
/** A saved file's pixels, read through a canvas of its own. */
const filePixels = (page: Page, src: string, points: number[][]) => page.evaluate(async ([src, points]) => {
  const image = new Image()
  image.src = src as string
  await image.decode()
  const c = document.createElement('canvas'); c.width = image.naturalWidth; c.height = image.naturalHeight
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.drawImage(image, 0, 0)
  return { width: c.width, height: c.height, pixels: (points as number[][]).map(([x, y]) => [...g.getImageData(x, y, 1, 1).data]) }
}, [src, points] as const)

test('Erase takes pixels away, undo and redo step exactly, the size sets how wide', async ({ page }) => {
  await open(page)
  const before = await pixel(page, GREEN)
  expect(before[3]).toBe(255)

  await tool(page, 'e', 'erase')
  await stroke(page, [GREEN[0] - 40, GREEN[1]], [GREEN[0] + 40, GREEN[1]])
  expect(await alpha(page, GREEN), 'erased').toBe(0)
  expect(await alpha(page, [GREEN[0], GREEN[1] + 80]), 'beside the stroke stays').toBe(255)
  await undo(page)
  expect(await pixel(page, GREEN), 'undo').toEqual(before)
  await redo(page)
  expect(await alpha(page, GREEN), 'redo').toBe(0)
  await undo(page)

  const band = async (at: number) => {
    let n = 0
    for (let y = at - 45; y <= at + 45; y++) if (await alpha(page, [GREEN[0], y]) < 128) n++
    return n
  }
  const size = page.locator('[data-cut-esize]')
  await page.keyboard.press('[')
  await page.keyboard.press('[')
  const small = Number(await size.inputValue())
  await stroke(page, [GREEN[0] - 40, GREEN[1]], [GREEN[0] + 40, GREEN[1]])
  const narrow = await band(GREEN[1])
  await undo(page)
  for (let i = 0; i < 6; i++) await page.keyboard.press(']')
  const big = Number(await size.inputValue())
  expect(big).toBeGreaterThan(small)
  await stroke(page, [GREEN[0] - 40, GREEN[1]], [GREEN[0] + 40, GREEN[1]])
  const wide = await band(GREEN[1])
  expect(narrow / small, 'a stroke is about as wide as its size').toBeGreaterThan(0.6)
  expect(narrow / small).toBeLessThan(1.4)
  expect(wide / big).toBeGreaterThan(0.6)
  expect(wide / big).toBeLessThan(1.4)

  // the ring round the pointer is that size on screen
  const art = (await page.locator('[data-cut-art]').boundingBox())!
  const [x, y] = await screen(page, GREEN)
  await page.mouse.move(x + 1, y + 1)
  const ring = (await page.locator('[data-cut-ring]').boundingBox())!
  expect(Math.abs(ring.width - (big * art.width) / 600), 'the ring matches the brush').toBeLessThan(2.5)
  await leaveAndDiscard(page)
})

test('Bring back returns what was erased, only where it goes', async ({ page }) => {
  await open(page)
  const before = await pixel(page, GREEN)
  await tool(page, 'e', 'erase')
  await stroke(page, [GREEN[0] - 60, GREEN[1]], [GREEN[0] + 60, GREEN[1]])
  await tool(page, 'b', 'restore')
  await stroke(page, [GREEN[0] - 60, GREEN[1]], [GREEN[0], GREEN[1]])
  expect(await pixel(page, [GREEN[0] - 30, GREEN[1]]), 'brought back').toEqual(before)
  expect(await alpha(page, [GREEN[0] + 40, GREEN[1]]), 'the rest stays erased').toBe(0)
  await undo(page)
  expect(await alpha(page, [GREEN[0] - 30, GREEN[1]]), 'undo of Bring back').toBe(0)
  await leaveAndDiscard(page)
})

test('Paint lays its colour and opacity, the pipette picks a colour, nothing sticks after undo', async ({ page }) => {
  await open(page)
  const before = await pixel(page, GREEN)
  await tool(page, 'p', 'paint')
  await setSwatch(page, '#ff0000')
  await stroke(page, [GREEN[0] - 40, GREEN[1]], [GREEN[0] + 40, GREEN[1]])
  expect(near(await pixel(page, GREEN), [255, 0, 0], 3), 'full opacity is the colour').toBe(true)
  await undo(page)
  expect(await pixel(page, GREEN)).toEqual(before)

  const opacity = await slide(page, 'opacity', 0.5)
  expect(opacity).toBeGreaterThan(35)
  expect(opacity).toBeLessThan(65)
  await stroke(page, [GREEN[0] - 40, GREEN[1]], [GREEN[0] + 40, GREEN[1]])
  const k = opacity / 100
  expect(near(await pixel(page, GREEN), [255 * k + before[0] * (1 - k), before[1] * (1 - k), before[2] * (1 - k)], 6), 'half opacity mixes').toBe(true)
  await undo(page)

  await tool(page, 'i', 'pipette')
  await click(page, SPOT)
  await expect(page.locator('[name="cut-tool"][value="paint"]'), 'the pipette goes on to Paint').toBeChecked()
  expect(await page.locator('[data-cut-colour]').inputValue()).toBe('#d2281e')

  // a click on a clear pixel picks nothing
  await tool(page, 'e', 'erase')
  await stroke(page, [WHITE_OUT[0] - 10, WHITE_OUT[1]], [WHITE_OUT[0] + 10, WHITE_OUT[1]])
  await tool(page, 'i', 'pipette')
  await click(page, WHITE_OUT)
  expect(await page.locator('[data-cut-colour]').inputValue(), 'clear has no colour').toBe('#d2281e')
  await leaveAndDiscard(page)
})

test('Clone stamp asks for a source, then copies from it', async ({ page }) => {
  await open(page)
  const before = await pixel(page, GREEN)
  await tool(page, 'k', 'clone')
  await click(page, GREEN)
  await expect(page.locator('.lp-tip.is-visible')).toContainText(/Alt/)
  expect(await pixel(page, GREEN), 'nothing without a source').toEqual(before)

  const [sx, sy] = await screen(page, SPOT)
  await page.keyboard.down('Alt')
  await page.mouse.click(sx, sy)
  await page.keyboard.up('Alt')
  expect(await film(page), 'the cross marks the source').toBeGreaterThan(0)
  await stroke(page, GREEN, [GREEN[0] + 2, GREEN[1]])
  expect(near(await pixel(page, GREEN), [210, 40, 30], 8), 'the source colour landed here').toBe(true)
  await undo(page)
  expect(await pixel(page, GREEN)).toEqual(before)
  await leaveAndDiscard(page)
})

test('quick mask on white: stops at the drawn line, drag grows it, let go cuts', async ({ page }) => {
  await open(page)
  await tool(page, 'w', 'colour')
  await expect(page.locator('p[data-cut-for="colour"]')).toBeVisible()

  const [x, y] = await screen(page, HOLE)
  await page.mouse.move(x, y)
  await page.mouse.down()
  const press = await film(page)
  expect(press, 'a press shows the hole').toBeGreaterThan(20000)
  expect(press, 'and only the hole').toBeLessThan(40000)
  await page.mouse.move(x + 60, y, { steps: 6 })
  expect(await film(page), 'the line still holds a modest drag').toBeLessThan(40000)
  expect(await alpha(page, HOLE), 'nothing cut yet').toBe(255)
  await page.mouse.up()
  expect(await alpha(page, HOLE), 'cut').toBe(0)
  expect(await alpha(page, LINE), 'the drawn line stays').toBe(255)
  expect(await alpha(page, WHITE_OUT), 'white outside the line stays').toBe(255)
  expect(await film(page), 'the red has gone').toBe(0)

  await page.keyboard.down('Alt')
  await click(page, HOLE)
  await page.keyboard.up('Alt')
  expect(await alpha(page, HOLE), 'Alt brings it back').toBe(255)

  await page.locator('[data-cut-everywhere]').check()
  await click(page, WHITE_OUT)
  expect(await alpha(page, WHITE_OUT)).toBe(0)
  expect(await alpha(page, HOLE), 'Everywhere takes the white behind the line too').toBe(0)
  expect(await alpha(page, COAT), 'and leaves the coat').toBe(255)
  await leaveAndDiscard(page)
})

test('quick mask on colour: press on a coat, drag widens the match live, back narrows it', async ({ page }) => {
  await open(page)
  await tool(page, 'w', 'colour')
  const [x, y] = await screen(page, COAT)
  await page.mouse.move(x, y)
  await page.mouse.down()
  const press = await film(page)
  expect(press).toBeGreaterThan(0)
  await page.mouse.move(x, y + 100, { steps: 8 })
  const wider = await film(page)
  expect(wider, 'more of the coat').toBeGreaterThan(press)
  await page.mouse.move(x, y + 10, { steps: 8 })
  expect(await film(page), 'back again, less').toBeLessThan(wider)
  await page.mouse.move(x, y + 100, { steps: 8 })
  await film(page)
  await page.mouse.up()
  expect(await alpha(page, COAT), 'the press point goes').toBe(0)
  expect(await alpha(page, WHITE_OUT), 'white is another colour').toBe(255)
  expect(await alpha(page, [316, 150]), 'the drawn line round the coat stays').toBe(255)
  await undo(page)
  expect(await alpha(page, COAT), 'one undo').toBe(255)

  // red spot, one click: whole, no rim of its colour left
  await click(page, SPOT)
  expect(await alpha(page, SPOT)).toBe(0)
  const rim: number[][] = []
  for (let deg = 0; deg < 360; deg += 15) {
    const p = await pixel(page, [Math.round(SPOT[0] + 41 * Math.cos((deg * Math.PI) / 180)), Math.round(SPOT[1] + 41 * Math.sin((deg * Math.PI) / 180))])
    if (p[3] > 60 && p[0] - p[1] > 40) rim.push(p)
  }
  expect(rim, 'no red halo').toEqual([])
  await undo(page)

  // a press beside the picture or on what is clear takes nothing and leaves no step
  await tool(page, 'e', 'erase')
  await stroke(page, [WHITE_OUT[0] - 10, WHITE_OUT[1]], [WHITE_OUT[0] + 10, WHITE_OUT[1]])
  await tool(page, 'w', 'colour')
  const canUndoBefore = await page.locator('[data-cut-undo]').isEnabled()
  await click(page, WHITE_OUT)
  expect(await film(page)).toBe(0)
  expect(await page.locator('[data-cut-undo]').isEnabled()).toBe(canUndoBefore)
  await leaveAndDiscard(page)
})

test('a held press comes to nothing on Esc or another tool; Alt on what was never cut is no step', async ({ page }) => {
  await open(page)
  await tool(page, 'e', 'erase')
  await stroke(page, [GREEN[0] - 20, GREEN[1]], [GREEN[0] + 20, GREEN[1]])   // work done, so a real Esc would ask
  await tool(page, 'w', 'colour')
  const [x, y] = await screen(page, COAT)
  await page.mouse.move(x, y)
  await page.mouse.down()
  expect(await film(page)).toBeGreaterThan(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-cut-ask]'), 'Esc drops the press, it does not leave').toBeHidden()
  expect(await film(page), 'the red goes at once').toBe(0)
  await page.mouse.up()
  expect(await alpha(page, COAT), 'letting go cuts nothing').toBe(255)

  await page.mouse.down()
  expect(await film(page)).toBeGreaterThan(0)
  await page.keyboard.press('b')
  expect(await film(page)).toBe(0)
  await page.mouse.up()
  expect(await alpha(page, COAT), 'nor after another tool').toBe(255)
  await tool(page, 'w', 'colour')

  await undo(page)
  await expect(page.locator('[data-cut-undo]')).toBeDisabled()
  await page.keyboard.down('Alt')
  await click(page, COAT)
  await page.keyboard.up('Alt')
  await expect(page.locator('[data-cut-undo]'), 'nothing was cut there').toBeDisabled()
  await leaveAndDiscard(page)
})

test('dark paint stops at a drawn line however far the drag', async ({ page }) => {
  await open(page)
  await tool(page, 'w', 'colour')
  const [x, y] = await screen(page, SPOT)   // the red is darker than the ink limit
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 400, y, { steps: 10 })
  await film(page)
  await page.mouse.up()
  expect(await alpha(page, SPOT)).toBe(0)
  expect(await alpha(page, LINE), 'the drawn line stays').toBe(255)
  await leaveAndDiscard(page)
})

test('on a real painted figure: dark hair and ink stay inside their lines, Alt keeps two neighbouring cuts apart', async ({ page }) => {
  await open(page, FIGURE)
  await tool(page, 'w', 'colour')
  const solid = await page.locator('[data-cut-art]').evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
    let n = 0
    for (let i = 3; i < d.length; i += 4) if (d[i] > 24) n++
    return n
  })
  const share = async (at: number[], reach: number) => {
    const [x, y] = await screen(page, at)
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + reach, y, { steps: 8 })
    const n = await film(page)
    await page.keyboard.press('Escape')
    await page.mouse.up()
    return n / solid
  }
  expect(await share([48, 45], 400), 'dark hair, dragged all the way').toBeLessThan(0.2)
  expect(await share([110, 439], 400), 'a shoe').toBeLessThan(0.1)
  expect(await share([46, 57], 400), 'the ink of the hair').toBeLessThan(0.05)

  const cutAt = async (at: number[]) => {
    const [x, y] = await screen(page, at)
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 200, y, { steps: 6 })
    await film(page)
    await page.mouse.up()
    expect(await alpha(page, at), `cut at ${at}`).toBe(0)
  }
  await cutAt([22, 130])   // the shirt
  await cutAt([64, 150])   // the vest beside it
  await page.keyboard.down('Alt')
  await click(page, [64, 150])
  await page.keyboard.up('Alt')
  expect(await alpha(page, [64, 150]), 'the vest is back').toBeGreaterThan(200)
  expect(await alpha(page, [22, 130]), 'the shirt stays cut').toBe(0)
  await leaveAndDiscard(page)
})

test('tools in a row: every step undoes and redoes in order, zoom and pan keep the aim', async ({ page }) => {
  await open(page)
  const start = { green: await pixel(page, GREEN), hole: await pixel(page, HOLE), spot: await pixel(page, SPOT) }

  await tool(page, 'e', 'erase')
  await stroke(page, [GREEN[0] - 30, GREEN[1]], [GREEN[0] + 30, GREEN[1]])
  await tool(page, 'p', 'paint')
  await setSwatch(page, '#0000ff')
  await stroke(page, [GREEN[0] - 30, GREEN[1]], [GREEN[0] + 30, GREEN[1]])
  expect(near(await pixel(page, GREEN), [0, 0, 255], 3), 'paint on an erased spot').toBe(true)
  await tool(page, 'w', 'colour')
  await click(page, HOLE)
  await click(page, SPOT)
  await tool(page, 'w', 'colour')
  await click(page, GREEN)
  expect(await alpha(page, GREEN), 'a painted spot goes with the colour tool').toBe(0)

  await undo(page)
  expect(near(await pixel(page, GREEN), [0, 0, 255], 3)).toBe(true)
  await undo(page)
  expect(await pixel(page, SPOT)).toEqual(start.spot)
  await undo(page)
  expect(await pixel(page, HOLE)).toEqual(start.hole)
  await undo(page)
  expect(await alpha(page, GREEN), 'back to erased').toBe(0)
  await undo(page)
  expect(await pixel(page, GREEN)).toEqual(start.green)
  await expect(page.locator('[data-cut-undo]')).toBeDisabled()
  for (let i = 0; i < 5; i++) await redo(page)
  expect(await alpha(page, GREEN), 'redo to the end').toBe(0)
  expect(await alpha(page, SPOT)).toBe(0)
  await expect(page.locator('[data-cut-redo]')).toBeDisabled()
  for (let i = 0; i < 5; i++) await undo(page)

  // zoomed in and panned, a stroke lands where the pointer is
  const view = (await page.locator('[data-cut-view]').boundingBox())!
  const [gx, gy] = await screen(page, GREEN)
  await page.mouse.move(gx, gy)
  await page.mouse.wheel(0, -400)
  await page.waitForTimeout(150)
  await tool(page, 'h', 'move')
  const b1 = (await page.locator('[data-cut-art]').boundingBox())!
  await page.mouse.move(view.x + 200, view.y + 200)
  await page.mouse.down()
  await page.mouse.move(view.x + 150, view.y + 170, { steps: 5 })
  await page.mouse.up()
  const b2 = (await page.locator('[data-cut-art]').boundingBox())!
  expect(Math.abs(b2.x - b1.x - -50), 'the hand moves the picture').toBeLessThan(2)
  await expect(page.locator('[data-cut-undo]'), 'and edits nothing').toBeDisabled()
  await tool(page, 'e', 'erase')
  const [ex, ey] = await screen(page, GREEN)
  expect(ex).toBeGreaterThan(view.x)
  expect(ex).toBeLessThan(view.x + view.width)
  expect(ey).toBeGreaterThan(view.y)
  expect(ey).toBeLessThan(view.y + view.height)
  await page.mouse.move(ex, ey)
  await page.mouse.down()
  await page.mouse.move(ex + 2, ey, { steps: 2 })
  await page.mouse.up()
  expect(await alpha(page, GREEN), 'the zoomed stroke lands under the pointer').toBe(0)
  await page.keyboard.press('0')
  await undo(page)

  // Select a part: the brush picks a region, and it shows
  await tool(page, 's', 'brush')
  await stroke(page, [GREEN[0] - 60, GREEN[1]], [GREEN[0] + 60, GREEN[1]])
  expect(await film(page), 'the rest is dimmed').toBeGreaterThan(0)
  await undo(page)
  expect(await film(page)).toBe(0)
  await leaveAndDiscard(page)
})

test('leaving: no work leaves at once, work asks, stay keeps it, discard drops it', async ({ page }) => {
  await open(page)
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-cutout]'), 'nothing to lose').toHaveCount(0)

  await openLayer(page, CARD)
  await tool(page, 'e', 'erase')
  await stroke(page, [GREEN[0] - 30, GREEN[1]], [GREEN[0] + 30, GREEN[1]])
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-cut-ask]')).toBeVisible()
  await page.locator('[data-cut-ask-stay]').first().click()
  await expect(page.locator('[data-cut-ask]')).toBeHidden()
  expect(await alpha(page, GREEN), 'stay keeps the work').toBe(0)
  await page.keyboard.press('Escape')
  await page.locator('[data-cut-ask-discard]').click()
  await expect(page.locator('[data-cutout]')).toHaveCount(0)

  await openLayer(page, CARD)
  expect(await alpha(page, GREEN), 'discard dropped it').toBe(255)
  await leaveAndDiscard(page)
})

test('Save as asset sends the picture cropped to what is left', async ({ page }) => {
  await open(page)
  await tool(page, 'w', 'colour')
  await page.locator('[data-cut-everywhere]').check()
  await click(page, WHITE_OUT)
  let body = ''
  await page.route('**/livewire*/update', (route) => { body = route.request().postData() ?? ''; route.abort() })
  await page.locator('[data-cut-asset]').click()
  await expect.poll(() => body.includes('saveCutout')).toBe(true)
  await expect(page.locator('[data-cutout]'), 'the editor stays, with the work in it').toHaveCount(1)
  await page.unroute('**/livewire*/update')
  const url = /data:image\/[a-z]+;base64,[A-Za-z0-9+/=\\]+/.exec(body)![0].replaceAll('\\/', '/')
  const size = await page.evaluate(async (u) => { const i = new Image(); i.src = u; await i.decode(); return [i.naturalWidth, i.naturalHeight] }, url)
  expect(size[0], 'cropped').toBeLessThan(600)
  expect(size[1]).toBeLessThan(600)
  expect(size[0], 'but the whole of what is left').toBeGreaterThan(450)
  await leaveAndDiscard(page)
})

test('a double-click on the stage opens the picture under it', async ({ page }) => {
  await load(page)
  const canvas = (await page.locator('#lesson-canvas-root canvas, [data-stage25d-ready] canvas').first().boundingBox())!
  // the card's red spot, at the camera the scene opens on
  await page.mouse.dblclick(Math.round(canvas.x + canvas.width * 0.89), Math.round(canvas.y + canvas.height * 0.28))
  await expect(page.locator('[data-cutout]')).toHaveAttribute('data-cutout', 's25_layer-2', { timeout: 10_000 })
  await page.waitForFunction(() => !document.querySelector('[data-cut-loading]'), undefined, { timeout: 60_000 })
  await leaveAndDiscard(page)
})

test('Space pans without painting, Cmd+Z undoes, the Tolerance slider sets where a press starts', async ({ page }) => {
  await open(page)
  await tool(page, 'e', 'erase')
  const before = (await page.locator('[data-cut-art]').boundingBox())!
  const [x, y] = await screen(page, GREEN)
  await page.mouse.move(x, y)
  await page.keyboard.down('Space')
  await page.mouse.down()
  await page.mouse.move(x - 40, y - 30, { steps: 5 })
  await page.mouse.up()
  await page.keyboard.up('Space')
  const after = (await page.locator('[data-cut-art]').boundingBox())!
  expect(Math.abs(after.x - before.x + 40), 'Space and drag moves the picture').toBeLessThan(2)
  expect(await alpha(page, GREEN), 'and takes nothing away').toBe(255)
  await expect(page.locator('[data-cut-undo]')).toBeDisabled()
  await page.keyboard.press('0')

  await stroke(page, [GREEN[0] - 30, GREEN[1]], [GREEN[0] + 30, GREEN[1]])
  await page.keyboard.press('Meta+z')
  expect(await alpha(page, GREEN), 'Cmd+Z').toBe(255)
  await page.keyboard.press('Meta+Shift+z')
  expect(await alpha(page, GREEN), 'Shift+Cmd+Z').toBe(0)
  await page.keyboard.press('Meta+z')

  await tool(page, 'w', 'colour')
  await slide(page, 'tol', 0.02)
  const pressAt = async () => {
    const [cx, cy] = await screen(page, COAT)
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    const n = await film(page)
    await page.keyboard.press('Meta+z')   // nothing to undo while the button is down
    return n
  }
  const low = await pressAt()
  await page.mouse.up()
  await undo(page)
  await slide(page, 'tol', 0.9)
  const high = await pressAt()
  await page.mouse.up()
  await undo(page)
  expect(high, 'a higher tolerance starts wider').toBeGreaterThan(low)
  await leaveAndDiscard(page)
})

test('a press dragged off the picture and off the panel still follows and still cuts on letting go', async ({ page }) => {
  await open(page)
  await tool(page, 'w', 'colour')
  const [x, y] = await screen(page, COAT)
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(1270, 880, { steps: 10 })
  const far = await film(page)
  expect(far).toBeGreaterThan(0)
  await page.mouse.up()
  expect(await alpha(page, COAT)).toBe(0)
  expect(await film(page)).toBe(0)
  await undo(page)

  // the eraser may run off the picture and come back in one stroke
  await tool(page, 'e', 'erase')
  const a = await screen(page, [5, 300]), b = await screen(page, [0, 300])
  await page.mouse.move(a[0] + 20, a[1])
  await page.mouse.down()
  await page.mouse.move(b[0] - 30, b[1], { steps: 6 })
  await page.mouse.up()
  expect(await alpha(page, [1, 300]), 'the edge of the picture goes').toBe(0)
  await leaveAndDiscard(page)
})

test('a picture straight from the library opens cleaned; the clean-up sliders and Before work on it', async ({ page }) => {
  await open(page, 'layer-3')
  await expect(page.locator('[data-cut-undo]')).toBeDisabled()
  const opaque = () => page.locator('[data-cut-art]').evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
    let n = 0
    for (let i = 3; i < d.length; i += 4) if (d[i] > 128) n++
    return n
  })
  const cleaned = await opaque()
  await slide(page, 'white', 0.02)
  await film(page)   // the sliders apply on the next frame, and a headless frame is slow
  await slide(page, 'fringe', 0.02)
  await film(page)
  const less = await opaque()
  expect(less, 'turning the clean-up down shows more').toBeGreaterThanOrEqual(cleaned)
  const compare = (await page.locator('[data-cut-compare]').boundingBox())!
  await page.mouse.move(compare.x + compare.width / 2, compare.y + compare.height / 2)
  await page.mouse.down()
  const asItCame = await opaque()
  await page.mouse.up()
  expect(asItCame, 'Before shows the picture as it came').toBeGreaterThanOrEqual(less)
  expect(await opaque(), 'letting go goes back').toBe(less)
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-cut-ask]'), 'a moved slider is work to lose').toBeVisible()
  await page.locator('[data-cut-ask-discard]').click()
  await expect(page.locator('[data-cutout]')).toHaveCount(0)
})

test('sizes: every control of every tool is 32 or 44 tall, no text under 12 px, at 1280 and 1024 wide', async ({ page }) => {
  await open(page)
  const audit = () => page.locator('[data-cutout]').evaluate((root) => {
    const out: string[] = []
    const seen = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[hidden]') }
    const name = (el: Element) => `${el.tagName.toLowerCase()} ${el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 24) ?? ''}`
    for (const el of root.querySelectorAll('button, label.tab, input[type="color"], input[type="checkbox"], label:has(input[type="range"]), label:has(input[type="checkbox"])')) {
      if (!seen(el) || el.closest('[data-cut-ask]')) continue
      const h = Math.round(el.getBoundingClientRect().height)
      if (el.matches('input[type="checkbox"]')) continue   // measured as its row
      if (h !== 32 && h !== 44) out.push(`${name(el)}: ${h}px tall`)
    }
    for (const el of root.querySelectorAll('h2, h3, p, span, label, button')) {
      if (!seen(el) || !el.textContent?.trim() || el.children.length) continue
      const size = parseFloat(getComputedStyle(el).fontSize)
      if (size < 12) out.push(`${name(el)}: ${size}px text`)
    }
    const r = root.getBoundingClientRect()
    if (root.scrollWidth > r.width + 1) out.push(`the window scrolls sideways: ${root.scrollWidth} in ${r.width}`)
    return out
  })
  const everyTool = async () => {
    const problems: string[] = []
    for (const [key, name] of [['e', 'erase'], ['b', 'restore'], ['p', 'paint'], ['i', 'pipette'], ['k', 'clone'], ['w', 'colour'], ['s', 'brush'], ['h', 'move']]) {
      await tool(page, key, name)
      problems.push(...(await audit()).map((p) => `${name}: ${p}`))
    }
    return problems
  }
  expect(await everyTool()).toEqual([])
  await page.setViewportSize({ width: 1024, height: 700 })
  await page.waitForTimeout(300)
  expect(await everyTool(), 'at 1024 wide').toEqual([])
  await leaveAndDiscard(page)
})

// ---- a boned figure: layer-1 is Pieter of parts. The editor shows him whole, a save goes onto his sheet.
const BONED = 'layer-1', BONED_INDEX = 1
const SHEET = '/storage/library/tasman-1642/puppets/pieter-rigid.png'
const HOLE_AT = [358, 880]      // chest over hips: two parts deep
const PAINT_AT = [358, 460]     // the vest over the collar: two parts deep, well away from the hole
const puppetOfLayer = (page: Page) => page.evaluate((i) => (window as any).__stage25d.config.set.layers[i].puppet, BONED_INDEX)
/** Where points of the figure are on screen, measured off the two elbow handles (a handle sits at its bone's tip: the elbow, in figure px). */
const figureOnStage = (page: Page, points: number[][]) => page.evaluate(async (points) => {
  ;(window as any).__stage25d.select('layer-1')
  await new Promise((done) => setTimeout(done, 400))
  const centre = (bone: string) => { const r = document.querySelector(`[data-bone-handle="${bone}"]`)!.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2] }
  const near = centre('upperarm_n'), far = centre('upperarm_f')
  ;(window as any).__stage25d.clearSelection()
  const NEAR = [124.06, 785.83], FAR = [557.31, 791.35]
  const scale = (far[0] - near[0]) / (FAR[0] - NEAR[0])
  return points.map(([x, y]) => [Math.round(near[0] + (x - NEAR[0]) * scale), Math.round(near[1] + (y - NEAR[1]) * Math.abs(scale))])
}, points)
const opensAt = async (page: Page, at: number[]) => {
  await page.mouse.dblclick(at[0], at[1])
  // one double-click, never repeated: it may be slow on a software GPU (3.6 s measured), it must not get lost
  const opened = await page.waitForSelector('[data-cutout]', { timeout: 10_000 }).catch(() => null)
  const id = opened ? await opened.getAttribute('data-cutout') : null
  if (id) {
    await page.waitForFunction(() => !document.querySelector('[data-cut-loading]'), undefined, { timeout: 60_000 })
    await leaveAndDiscard(page)
  }
  return id
}

test('a boned figure opens whole, at rest, not cleaned, and leaving or saving without an edit writes nothing', async ({ page }) => {
  await open(page, BONED)
  expect(await page.locator('[data-cut-art]').evaluate((c: HTMLCanvasElement) => [c.width, c.height]), 'the figure, not its sheet').toEqual([724, 2172])
  expect(await page.locator('[data-cut-white]').inputValue(), 'no automatic clean-up').toBe('0')
  expect(await page.locator('[data-cut-fringe]').inputValue()).toBe('0')
  await expect(page.locator('[data-cut-undo]')).toBeDisabled()

  const puppet = await puppetOfLayer(page)
  const differing = await page.locator('[data-cut-art]').evaluate(async (c: HTMLCanvasElement, [sheet, puppet]: any) => {
    const img = new Image(); img.src = sheet; await img.decode()
    const own = document.createElement('canvas'); own.width = c.width; own.height = c.height
    const g = own.getContext('2d', { willReadFrequently: true })!
    for (const { quad: [[x0, y0], , [x1, y1]], uv: [u0, v0, u1, v1] } of puppet.parts) g.drawImage(img, u0 * img.naturalWidth, v0 * img.naturalHeight, (u1 - u0) * img.naturalWidth, (v1 - v0) * img.naturalHeight, x0, y0, x1 - x0, y1 - y0)
    const want = g.getImageData(0, 0, c.width, c.height).data, got = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
    let n = 0
    for (let i = 0; i < got.length; i += 4) if (Math.abs(want[i + 3] - got[i + 3]) > 2 || (want[i + 3] > 8 && Math.hypot(want[i] - got[i], want[i + 1] - got[i + 1], want[i + 2] - got[i + 2]) > 6)) n++
    return n
  }, [SHEET, puppet])
  expect(differing, 'parts in the stage order, as the stage puts them together').toBe(0)

  await page.keyboard.press('Escape')
  await expect(page.locator('[data-cutout]'), 'nothing to lose').toHaveCount(0)
  await openLayer(page, BONED)
  await page.locator('[data-cut-save]').click()
  await expect(page.locator('[data-cutout]')).toHaveCount(0, { timeout: 30_000 })
  await load(page)
  expect(await savedSrc(page, BONED_INDEX), 'Save without an edit writes no sheet').toBeNull()
})

test('a boned figure: edits land on its sheet, bones still bend, erased paint no longer picks, reopen, Bring back, the original', async ({ page }) => {
  await load(page)
  const [belly, face] = await figureOnStage(page, [HOLE_AT, [340, 200]])   // before the save: afterwards nothing waits
  await openLayer(page, BONED)
  const puppet = await puppetOfLayer(page)
  await page.keyboard.press(']')
  for (let i = 0; i < 4; i++) await page.keyboard.press(']')
  await tool(page, 'e', 'erase')
  await stroke(page, [HOLE_AT[0] - 60, HOLE_AT[1]], [HOLE_AT[0] + 60, HOLE_AT[1]])
  expect(await alpha(page, HOLE_AT), 'a hole through the belly').toBe(0)
  await tool(page, 'p', 'paint')
  await setSwatch(page, '#00ff00')
  await stroke(page, [PAINT_AT[0] - 10, PAINT_AT[1]], [PAINT_AT[0] + 10, PAINT_AT[1]])
  expect(near(await pixel(page, PAINT_AT), [0, 255, 0], 3)).toBe(true)
  await page.locator('[data-cut-save]').click()
  await expect(page.locator('[data-cutout]')).toHaveCount(0, { timeout: 30_000 })

  // straight after the save, no reload and no waiting: the first double-clicks are right
  expect(await opensAt(page, belly), 'the erased belly is no figure any more: the sky behind it opens').toBe('s25_sky')
  expect(await opensAt(page, face), 'his face still is').toBe('s25_layer-1')

  await load(page)
  const src = await savedSrc(page, BONED_INDEX)
  expect(src, 'a new sheet').toMatch(/\/storage\/lessons\//)
  const report = await page.evaluate(async ([saved, first, puppet, hole, paint]: any) => {
    const read = async (url: string) => {
      const img = new Image(); img.src = url; await img.decode()
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
      const g = c.getContext('2d', { willReadFrequently: true })!; g.drawImage(img, 0, 0)
      return { w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data }
    }
    const [a, b] = await Promise.all([read(saved), read(first)])
    let changed = 0, opaqueChanged = 0
    for (let i = 0; i < a.d.length; i += 4) {
      if (Math.abs(a.d[i + 3] - b.d[i + 3]) > 2) changed++
      if (a.d[i + 3] === 255 && b.d[i + 3] === 255 && Math.hypot(a.d[i] - b.d[i], a.d[i + 1] - b.d[i + 1], a.d[i + 2] - b.d[i + 2]) > 3) opaqueChanged++
    }
    const cells = ([x, y]: number[]) => puppet.parts
      .filter(({ quad: [[x0, y0], , [x1, y1]] }: any) => x >= x0 && x < x1 && y >= y0 && y < y1)
      .map(({ quad: [[x0, y0]], uv: [u0, v0] }: any) => (Math.floor(v0 * b.h + y - y0 + 0.5) * b.w + Math.floor(u0 * b.w + x - x0 + 0.5)) * 4)
    const at = (d: Uint8ClampedArray, i: number) => [...d.slice(i, i + 4)]
    return {
      size: [a.w, a.h], firstSize: [b.w, b.h], changed, opaqueChanged,
      hole: cells(hole).map((i: number) => at(a.d, i)), paintNow: cells(paint).map((i: number) => at(a.d, i)), paintBefore: cells(paint).map((i: number) => at(b.d, i)),
    }
  }, [src, SHEET, puppet, HOLE_AT, PAINT_AT])
  expect(report.size, 'the sheet keeps its size').toEqual(report.firstSize)
  expect(report.hole.length, 'the hole is two parts deep').toBeGreaterThan(1)
  for (const cell of report.hole) expect(cell[3], 'erased on every part there').toBeLessThan(16)
  expect(report.paintNow.length, 'the paint is two parts deep').toBeGreaterThan(1)
  expect(near(report.paintNow.at(-1)!, [0, 255, 0], 12), 'paint on the part on top').toBe(true)
  expect(report.paintNow[0], 'the paint hidden under it is untouched').toEqual(report.paintBefore[0])
  expect(report.changed, 'the rest of the sheet').toBeLessThan(200000)
  expect(report.opaqueChanged).toBeLessThan(40000)

  // bones bend the edited sheet
  const shot = () => page.locator('[data-stage25d-ready] canvas, #lesson-canvas-root canvas').first().screenshot()
  const still = await shot()
  await page.evaluate(() => { const s = (window as any).__stage25d; s.setLayerProp('layer-1', 'bone:upperarm_n', -50); s.setLayerProp('layer-1', 'bone:head', 15) })
  await page.waitForTimeout(800)
  expect(Buffer.compare(await shot(), still), 'the figure moved').not.toBe(0)
  await page.evaluate(() => { const s = (window as any).__stage25d; s.setLayerProp('layer-1', 'bone:upperarm_n', 0); s.setLayerProp('layer-1', 'bone:head', 0) })

  // the Selection panel shows him whole and edited
  await page.evaluate(() => (window as any).__stage25d.select('layer-1'))
  await page.waitForFunction(() => String((window as any).__stage25d.layerInfo('layer-1').file).startsWith('blob:'), undefined, { timeout: 15_000 })
  const preview = await page.evaluate(async (point) => {
    const url = (window as any).__stage25d.layerInfo('layer-1').file
    const img = new Image(); img.src = url; await img.decode()
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
    const g = c.getContext('2d', { willReadFrequently: true })!; g.drawImage(img, 0, 0)
    return { size: [c.width, c.height], alpha: g.getImageData(point[0], point[1], 1, 1).data[3] }
  }, HOLE_AT)
  expect(preview.size, 'the figure, not the sheet').toEqual([724, 2172])
  expect(preview.alpha, 'with the hole').toBeLessThan(16)
  await page.evaluate(() => (window as any).__stage25d.clearSelection())

  // reopen: the edited figure; Bring back reaches the first sheet
  await openLayer(page, BONED)
  expect(await page.locator('[data-cut-art]').evaluate((c: HTMLCanvasElement) => [c.width, c.height])).toEqual([724, 2172])
  expect(await alpha(page, HOLE_AT), 'the hole is saved').toBeLessThan(16)
  expect(near(await pixel(page, PAINT_AT), [0, 255, 0], 12), 'and the paint').toBe(true)
  await tool(page, 'b', 'restore')
  await stroke(page, [HOLE_AT[0] - 20, HOLE_AT[1]], [HOLE_AT[0] + 20, HOLE_AT[1]])
  expect(await alpha(page, HOLE_AT), 'Bring back reaches past the save').toBeGreaterThan(200)
  await undo(page)

  await expect(page.locator('[data-cut-original]')).toBeVisible()
  await page.locator('[data-cut-original]').click()
  await expect(page.locator('[data-cutout]')).toHaveCount(0, { timeout: 30_000 })
  await load(page)
  expect(await savedSrc(page, BONED_INDEX), 'the sheet goes').toBeNull()
  await openLayer(page, BONED)
  expect(await alpha(page, HOLE_AT), 'whole again').toBe(255)
  await leaveAndDiscard(page)
})

test('a boned figure: work that never reaches the sheet writes none, and paint outside every part is told', async ({ page }) => {
  await open(page, BONED)
  await tool(page, 's', 'brush')
  await stroke(page, [300, 700], [420, 700])
  await page.locator('[data-cut-save]').click()
  await expect(page.locator('[data-cutout]')).toHaveCount(0, { timeout: 30_000 })
  await load(page)
  expect(await savedSrc(page, BONED_INDEX), 'a selection alone').toBeNull()

  await openLayer(page, BONED)
  await tool(page, 'p', 'paint')
  await stroke(page, [690, 100], [700, 100])
  await page.locator('[data-cut-save]').click()
  await expect(page.getByText(/outside the parts/)).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('[data-cutout]')).toHaveCount(0, { timeout: 30_000 })
  await load(page)
  expect(await savedSrc(page, BONED_INDEX), 'paint outside every part').toBeNull()
})

test('a boned figure: Bring back into a saved hole returns the paint to the arm that had it', async ({ page }) => {
  const SHOULDER = [191, 444]      // the vest's rect over the near arm: the vest has no paint here
  await open(page, BONED)
  const puppet = await puppetOfLayer(page)
  const size = page.locator('[data-cut-esize]')
  for (let i = 0; i < 6 && Number(await size.inputValue()) > 26; i++) await page.keyboard.press('[')
  await tool(page, 'e', 'erase')
  await stroke(page, [SHOULDER[0] - 2, SHOULDER[1]], [SHOULDER[0] + 2, SHOULDER[1]])
  expect(await alpha(page, SHOULDER), 'the hole').toBe(0)
  await page.locator('[data-cut-save]').click()
  await expect(page.locator('[data-cutout]')).toHaveCount(0, { timeout: 30_000 })

  await load(page)
  await openLayer(page, BONED)
  await tool(page, 'b', 'restore')   // at once: no waiting for the first sheet
  await stroke(page, [SHOULDER[0] - 4, SHOULDER[1]], [SHOULDER[0] + 4, SHOULDER[1]])
  expect(await alpha(page, SHOULDER), 'back').toBeGreaterThan(200)
  await page.locator('[data-cut-save]').click()
  await expect(page.locator('[data-cutout]')).toHaveCount(0, { timeout: 30_000 })

  await load(page)
  const src = await savedSrc(page, BONED_INDEX)
  const cells = await page.evaluate(async ([saved, puppet, [x, y]]: any) => {
    const img = new Image(); img.src = saved; await img.decode()
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
    const g = c.getContext('2d', { willReadFrequently: true })!; g.drawImage(img, 0, 0)
    const cell = (bone: string) => {
      const { quad: [[x0, y0]], uv: [u0, v0] } = puppet.parts.filter((p: any) => p.bone === bone).at(-1)
      return [...g.getImageData(Math.floor(u0 * c.width + x - x0 + 0.5), Math.floor(v0 * c.height + y - y0 + 0.5), 1, 1).data]
    }
    return { arm: cell('upperarm_n'), vest: cell('chest') }
  }, [src, puppet, SHOULDER])
  expect(cells.arm[3], 'the arm has its sleeve back').toBeGreaterThan(200)
  expect(cells.vest[3], 'the vest gains no paint it never had').toBeLessThan(16)
  await page.locator('[data-stage25d-ready]').first().waitFor()
  await openLayer(page, BONED)
  await page.locator('[data-cut-original]').click()
  await expect(page.locator('[data-cutout]')).toHaveCount(0, { timeout: 30_000 })
})

// ---- an animation: layer-7 of the second scene plays a sheet of 48 frames, its own list on `play.frames`
const FIRE = 'layer-7', FIRE_INDEX = 7, ALL_FIRE = 48
const openFire = async (page: Page) => {
  await load(page, ANIMATION_SCENE)
  await page.evaluate((id) => { window.dispatchEvent(new CustomEvent('image-edit:open', { detail: (window as any).__stage25d.editTarget(id) })) }, FIRE)
  await page.waitForSelector('[data-frame]')
}
const fireTiles = (page: Page) => page.locator('[data-frame]')
const firePlay = (page: Page) => page.evaluate((id) => (window as any).__stage25d.editTarget(id).frames.play ?? null, FIRE)   // the row the stage draws, not the config it was built from
const saveFire = async (page: Page) => {
  await page.locator('[data-cut-save]').click()
  await expect(page.locator('[data-cutout]')).toHaveCount(0, { timeout: 30_000 })
}
const allBut = (...gone: number[]) => Array.from({ length: ALL_FIRE }, (_, n) => n).filter((n) => !gone.includes(n))

test('Frames: deleted frames stay deleted, in the middle and at the end, through Save, reopen and reload', async ({ page }) => {
  await openFire(page)
  await expect(fireTiles(page)).toHaveCount(ALL_FIRE)
  await fireTiles(page).nth(24).click()
  await page.locator('[data-fr-delete]').click()
  await expect(fireTiles(page)).toHaveCount(ALL_FIRE - 1)
  await page.locator('[data-fr-delete]').click()
  await expect(fireTiles(page), 'frames 25 and 26, by hand').toHaveCount(ALL_FIRE - 2)
  // a tile says which frame of the sheet it is: the next frame must not take over the deleted number
  await expect(fireTiles(page).nth(23).locator('span').last()).toHaveText('24')
  await expect(fireTiles(page).nth(24).locator('span').last(), 'the numbers 25 and 26 are gone').toHaveText('27')
  await saveFire(page)
  expect((await firePlay(page))?.frames, 'on the stage straight after Save').toEqual(allBut(24, 25))

  // reopened without a reload
  await page.evaluate((id) => { window.dispatchEvent(new CustomEvent('image-edit:open', { detail: (window as any).__stage25d.editTarget(id) })) }, FIRE)
  await page.waitForSelector('[data-frame]')
  await expect(fireTiles(page), 'still gone after reopening').toHaveCount(ALL_FIRE - 2)
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-cutout]')).toHaveCount(0)

  await openFire(page)
  await expect(fireTiles(page), 'still gone after a reload').toHaveCount(ALL_FIRE - 2)
  expect((await firePlay(page))?.frames, 'and saved').toEqual(allBut(24, 25))

  // the last two, with the keyboard this time
  await fireTiles(page).nth(ALL_FIRE - 3).click()
  await page.keyboard.press('Delete')
  await expect(fireTiles(page)).toHaveCount(ALL_FIRE - 3)
  await fireTiles(page).nth(ALL_FIRE - 4).click()
  await page.keyboard.press('Backspace')
  await expect(fireTiles(page)).toHaveCount(ALL_FIRE - 4)
  await saveFire(page)
  await openFire(page)
  await expect(fireTiles(page), 'the last frames stay gone').toHaveCount(ALL_FIRE - 4)
  expect((await firePlay(page))?.frames).toEqual(allBut(24, 25, 46, 47))
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-cutout]')).toHaveCount(0)
})

test('Frames: duplicates deleted again, and All frames in order, leave the sheet whole', async ({ page }) => {
  await openFire(page)
  await page.locator('[data-fr-all]').click()
  await expect(fireTiles(page)).toHaveCount(ALL_FIRE)
  await saveFire(page)
  await openFire(page)
  await expect(fireTiles(page), 'all frames again').toHaveCount(ALL_FIRE)
  expect((await firePlay(page))?.frames, 'with no list of its own').toBeUndefined()

  // two copies added at the end, then deleted: back to exactly the sheet
  await fireTiles(page).nth(ALL_FIRE - 1).click()
  await page.locator('[data-fr-duplicate]').click()
  await page.locator('[data-fr-duplicate]').click()
  await expect(fireTiles(page)).toHaveCount(ALL_FIRE + 2)
  await saveFire(page)
  await openFire(page)
  await expect(fireTiles(page)).toHaveCount(ALL_FIRE + 2)
  await fireTiles(page).nth(ALL_FIRE + 1).click()
  await page.locator('[data-fr-delete]').click()
  await fireTiles(page).nth(ALL_FIRE).click()
  await page.locator('[data-fr-delete]').click()
  await expect(fireTiles(page)).toHaveCount(ALL_FIRE)
  await saveFire(page)
  expect((await firePlay(page))?.frames, 'straight after Save').toBeUndefined()
  await openFire(page)
  await expect(fireTiles(page), 'the copies stay deleted').toHaveCount(ALL_FIRE)
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-cutout]')).toHaveCount(0)
})

test('Save with nothing done leaves the layer as it was', async ({ page }) => {
  await open(page)
  const src = await savedSrc(page, 2)
  await page.locator('[data-cut-save]').click()
  await expect(page.locator('[data-cutout]')).toHaveCount(0, { timeout: 30_000 })
  await load(page)
  expect(await savedSrc(page, 2)).toBe(src)
})

test('Save writes the pixels; after a reload the editor opens on them and goes on', async ({ page }) => {
  await open(page)
  const original = await savedSrc(page, 2)
  await tool(page, 'e', 'erase')
  await stroke(page, [GREEN[0] - 30, GREEN[1]], [GREEN[0] + 30, GREEN[1]])
  await tool(page, 'p', 'paint')
  await setSwatch(page, '#ff00ff')
  await stroke(page, [WHITE_OUT[0] - 10, WHITE_OUT[1]], [WHITE_OUT[0] + 10, WHITE_OUT[1]])
  await tool(page, 'w', 'colour')
  await click(page, HOLE)

  await page.locator('[data-cut-save]').click()
  await expect(page.locator('[data-cutout]')).toHaveCount(0, { timeout: 30_000 })

  await load(page)
  const src = await savedSrc(page, 2)
  expect(src, 'a new file').not.toBe(original)
  const file = await filePixels(page, src, [GREEN, WHITE_OUT, HOLE, LINE, SPOT])
  expect([file.width, file.height]).toEqual([600, 600])
  expect(file.pixels[0][3], 'erased in the file').toBeLessThan(16)
  expect(near(file.pixels[1], [255, 0, 255], 24), 'painted in the file').toBe(true)
  expect(file.pixels[2][3], 'cut in the file').toBeLessThan(16)
  expect(file.pixels[3][3], 'the line is kept').toBeGreaterThan(240)
  expect(near(file.pixels[4], [210, 40, 30], 24), 'the rest as it was').toBe(true)

  await openLayer(page, CARD)
  expect(await alpha(page, GREEN), 'reopened on the saved picture').toBeLessThan(16)
  await expect(page.locator('[data-cut-undo]'), 'a new session of work').toBeDisabled()
  await tool(page, 'p', 'paint')
  await setSwatch(page, '#00ff00')
  await stroke(page, [GREEN[0] - 30, GREEN[1]], [GREEN[0] + 30, GREEN[1]])
  expect(near(await pixel(page, GREEN), [0, 255, 0], 3), 'and goes on').toBe(true)
  await leaveAndDiscard(page)
})

test('a real figure: Save, reopen, Bring back reaches what was erased before the save; Back to the original', async ({ page }) => {
  await open(page, FIGURE)
  const size = await page.locator('[data-cut-art]').evaluate((c: HTMLCanvasElement) => [c.width, c.height])
  const spot = await page.locator('[data-cut-art]').evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
    const solid = (x: number, y: number) => d[(y * c.width + x) * 4 + 3] === 255
    for (let y = Math.floor(c.height * 0.3); y < c.height - 40; y += 7) for (let x = 40; x < c.width - 40; x += 7) {
      if ([[0, 0], [-30, 0], [30, 0], [0, -30], [0, 30]].every(([a, b]) => solid(x + a, y + b))) return [x, y]
    }
    return null
  })
  expect(spot, 'a solid part of the figure').not.toBeNull()
  const before = await pixel(page, spot!)
  await tool(page, 'e', 'erase')
  await stroke(page, [spot![0] - 10, spot![1]], [spot![0] + 10, spot![1]])
  expect(await alpha(page, spot!)).toBe(0)
  await page.locator('[data-cut-save]').click()
  await expect(page.locator('[data-cutout]')).toHaveCount(0, { timeout: 30_000 })

  await load(page)
  await openLayer(page, FIGURE)
  expect(await page.locator('[data-cut-art]').evaluate((c: HTMLCanvasElement) => [c.width, c.height]), 'same size').toEqual(size)
  expect(await alpha(page, spot!), 'the erase was saved').toBeLessThan(16)
  await page.waitForTimeout(800)   // the picture from before any editing arrives after the first paint
  await tool(page, 'b', 'restore')
  await stroke(page, [spot![0] - 10, spot![1]], [spot![0] + 10, spot![1]])
  const back = await pixel(page, spot!)
  expect(back[3], 'Bring back reaches past the save').toBeGreaterThan(200)
  await undo(page)

  await expect(page.locator('[data-cut-original]')).toBeVisible()
  await page.locator('[data-cut-original]').click()
  await expect(page.locator('[data-cutout]')).toHaveCount(0, { timeout: 30_000 })
  await load(page)
  expect(await savedSrc(page, 0), 'the saved copy is gone from the layer').toBeNull()
  await openLayer(page, FIGURE)
  const restored = await alpha(page, spot!)
  expect(restored, 'the figure is whole again').toBeGreaterThan(200)
  expect(before[3]).toBe(255)
  await leaveAndDiscard(page)
})
