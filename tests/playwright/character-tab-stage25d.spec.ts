import { test, expect, type Page } from '@playwright/test'
import { execSync } from 'node:child_process'
import { readFileSync, mkdirSync } from 'node:fs'

/**
 * The Character tab, walked the way a teacher does: Assets > New character, presets, parts, colours, the face, Random,
 * undo, Save onto the stage, reopen, bones, expressions on the timeline, animation presets, a reload. Real mouse and keys
 * for every teacher action; evaluate only reads state. It saves, so it runs on a throwaway lesson, made fresh each time:
 *
 *   php artisan tinker --execute='require "tests/playwright/character-tab-lesson.php";'      # prints PW_CHARACTER_TAB=<lesson>/<scene>/<animation scene>
 *   PW_CHARACTER_TAB=<lesson>/<scene>/<animation scene> PW_BASE_URL=http://localhost:8051 \
 *     npx playwright test character-tab --config=playwright.stage25d.config.ts --workers=1
 *
 * Screenshots go to tests/playwright/results-stage25d/character-tab (never committed). The characters it saves leave the
 * teacher's shelf again in the last test (scenes keep showing them, Characters::remove).
 */
const [LESSON, SCENE] = (process.env.PW_CHARACTER_TAB ?? process.env.PW_EDITOR_WALK ?? '').split('/')
test.skip(!LESSON, 'set PW_CHARACTER_TAB')
test.setTimeout(300_000)
test.use({ viewport: { width: 1280, height: 900 } })

const SHOTS = 'tests/playwright/results-stage25d/character-tab'
mkdirSync(SHOTS, { recursive: true })

const SILENT = `(() => {
  const AC = window.AudioContext || window.webkitAudioContext
  if (AC) {
    window.AudioContext = function () { const c = new AC(); try { c.suspend && c.suspend() } catch (e) {} c.resume = () => Promise.resolve(); return c }
    window.webkitAudioContext = window.AudioContext
  }
  HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return Promise.resolve() }
})()`

const errors: string[] = []
const failed: string[] = []
test.beforeEach(({ page }) => {
  errors.length = 0
  failed.length = 0
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text().slice(0, 300)}`) })
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`) })
})
test.afterEach(async ({}, info) => {
  if (failed.length) info.annotations.push({ type: 'http-errors', description: [...new Set(failed)].join('\n') })
  expect(errors, 'no script errors').toEqual([])
})

// ── page ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const load = async (page: Page) => {
  await page.addInitScript(SILENT)
  await page.goto(`/teacher/lessons/${LESSON}/wizard?step=4&scene=${SCENE}`, { waitUntil: 'load' })
  await page.waitForFunction(() => document.querySelector('[data-stage25d-ready="1"]') && (window as any).__stage25d?.config, undefined, { timeout: 180_000 })
  await page.waitForTimeout(800)
}
/** The stage's layers as they are now: assets from the scene, keys as live (items(): config.set lags behind live edits). */
const layers = (page: Page) => page.evaluate(() => {
  const s = (window as any).__stage25d
  const items = s.items().filter((r: any) => /^layer-\d+$/.test(r.id))
  return items.map((r: any, i: number) => ({ asset: s.config.set.layers[i]?.asset ?? null, keys: r.keys ?? [] }))
})
const shelf = (page: Page) => page.evaluate(() => (window as any).__stage25d.library().assets.filter((a: any) => a.shelf === 'characters').map((a: any) => ({ id: a.id, thumb: a.thumb, label: a.label })))
const chrLayer = async (page: Page) => (await layers(page)).findLastIndex((l: any) => String(l.asset).startsWith('chr-'))

const P = '[data-slot-panel="character"]'
const V = '[data-slot-view="character"]'
const ART = `${V} [data-chr-art]`

const openNew = async (page: Page) => {
  await page.getByRole('tab', { name: 'Assets', exact: true }).click()
  await page.locator('[data-new-character]').click()
  await page.waitForSelector('[data-cutout]')
  await page.waitForFunction(() => document.querySelector('[data-chr-loading]')?.hasAttribute('hidden'), undefined, { timeout: 60_000 })
  await settle(page)
}

/** A cheap hash of a canvas's pixels. */
const sig = (page: Page, sel = ART) => page.locator(sel).evaluate((c: HTMLCanvasElement) => {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
  let h = 0
  for (let i = 0; i < d.length; i += 12) h = (h * 31 + d[i] * 3 + d[i + 1] * 5 + d[i + 2] * 7) >>> 0
  return h
})
/** Waits until the figure stops redrawing (the drawing is async: kit pictures, recolouring). */
const settle = async (page: Page) => {
  let last = -1
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(150)
    const now = await sig(page)
    if (now === last) return now
    last = now
  }
  return last
}
/** The figure's box on the art canvas, in page px, from what is not paper. */
const figureBounds = async (page: Page) => {
  const box = (await page.locator(ART).boundingBox())!
  const b = await page.locator(ART).evaluate((c: HTMLCanvasElement) => {
    const g = c.getContext('2d')!
    const d = g.getImageData(0, 0, c.width, c.height).data
    const p = [d[(c.width * 10 + c.width - 10) * 4], d[(c.width * 10 + c.width - 10) * 4 + 1], d[(c.width * 10 + c.width - 10) * 4 + 2]]
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1
    for (let y = 0; y < c.height; y += 2) for (let x = 80; x < c.width; x += 2) {
      const o = (y * c.width + x) * 4
      if (Math.abs(d[o] - p[0]) + Math.abs(d[o + 1] - p[1]) + Math.abs(d[o + 2] - p[2]) > 40) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
    }
    return { x0, y0, x1, y1, scale: c.width / c.clientWidth }
  })
  return { x0: box.x + b.x0 / b.scale, y0: box.y + b.y0 / b.scale, x1: box.x + b.x1 / b.scale, y1: box.y + b.y1 / b.scale }
}
const hoverText = (page: Page) => page.locator(`${V} [data-chr-hover]`).evaluate((el) => (el.hidden ? null : el.textContent))
/** Moves the real mouse over a band of the figure until the hover label names `label`. */
const findPart = async (page: Page, label: string, band: [number, number], cols: [number, number] = [0, 1]) => {
  const f = await figureBounds(page)
  const h = f.y1 - f.y0, w = f.x1 - f.x0
  for (let y = f.y0 + h * band[0]; y <= f.y0 + h * band[1]; y += 8) {
    for (let x = f.x0 + w * cols[0]; x <= f.x0 + w * cols[1]; x += 8) {
      await page.mouse.move(Math.round(x), Math.round(y))
      if ((await hoverText(page)) === label) return [Math.round(x), Math.round(y)]
    }
  }
  return null
}
const amberPixels = (page: Page) => page.locator(`${V} [data-chr-edge]`).evaluate((c: HTMLCanvasElement) => {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
  let n = 0
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 100 && d[i] > 200 && d[i + 1] > 120 && d[i + 1] < 190 && d[i + 2] < 60) n++
  return n
})
const panelTitle = (page: Page) => page.locator(`${P} h3`).first().textContent()
const railSelected = (page: Page) => page.locator(`${V} [data-chr-rail][aria-selected="true"]`).getAttribute('data-chr-rail')
const nameValue = (page: Page) => page.locator(`${P} [data-chr-name]`).inputValue()
const pickBody = async (page: Page, label: 'Girl' | 'Woman' | 'Man') => {
  if (!await page.locator(`${P} [data-chr-body]`).first().isVisible()) await page.locator(`${V} [data-chr-rail="who"]`).click()
  await page.locator(`${P} input[data-chr-body][aria-label="${label}"]`).click()
  await settle(page)
}
const rail = async (page: Page, part: string) => { await page.locator(`${V} [data-chr-rail="${part}"]`).click(); await settle(page) }
/** Pixel count painted in each tile/preset canvas of the inspector, waiting for the tiles to draw (they draw one by one). */
const tilePaint = async (page: Page) => {
  const read = () => page.locator(P).evaluate((panel) => [...panel.querySelectorAll('[data-chr-tile] canvas, [data-chr-preset] canvas')].map((c: any) => {
    if (!c.width || !c.height) return 0
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
    let n = 0
    for (let i = 3; i < d.length; i += 16) if (d[i] > 20) n++
    return n
  }))
  let now = await read()
  for (let i = 0; i < 60 && now.some((n) => n === 0); i++) { await page.waitForTimeout(250); now = await read() }
  return now
}
const tileIds = (page: Page, slot: string) => page.locator(`${P} [data-chr-tile][data-chr-slot="${slot}"]`).evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.chrTile ?? ''))
const tile = (page: Page, slot: string, id: string) => page.locator(`${P} [data-chr-tile][data-chr-slot="${slot}"][data-chr-tile="${id}"]`)
const checkedTiles = (page: Page, slot: string) => page.locator(`${P} [data-chr-tile][data-chr-slot="${slot}"][aria-checked="true"]`).evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.chrTile ?? ''))
const shot = async (page: Page, name: string, clip?: { x: number, y: number, width: number, height: number }) => page.screenshot({ path: `${SHOTS}/${name}.png`, ...(clip ? { clip } : {}) })
const undoBtn = (page: Page) => page.locator('[data-cut-undo]')
const redoBtn = (page: Page) => page.locator('[data-cut-redo]')
const leaveDiscard = async (page: Page) => {
  await page.keyboard.press('Escape')
  const ask = page.locator('[data-cut-ask-discard]')
  if (await ask.isVisible()) await ask.click()
  await expect(page.locator('[data-cutout]')).toHaveCount(0)
}
/** Characters this run saved: the last test takes them off the shelf again. */
const CREATED = new Set<string>()
const saveWindow = async (page: Page) => {
  const before = new Set((await shelf(page)).map((a: any) => a.id))
  await page.locator('[data-cut-save]').click()
  await expect(page.locator('[data-cutout]')).toHaveCount(0, { timeout: 60_000 })
  await page.waitForTimeout(1500)
  for (const a of await shelf(page)) if (!before.has(a.id)) CREATED.add(a.id)
}
/** A character on the stage: the one there, else one made and saved now (Weaver). */
const ensureCharacter = async (page: Page) => {
  let i = await chrLayer(page)
  if (i >= 0) return i
  await openNew(page)
  await pickBody(page, 'Woman')
  await saveWindow(page)
  i = await chrLayer(page)
  return i
}
/** A layer's box on screen: the selection frame round it (selected for the measure only, then let go). */
const layerBox = async (page: Page, i: number, keep = false) => {
  const was = await page.evaluate(() => (window as any).__stage25d.selection)
  await page.evaluate((i) => (window as any).__stage25d.select(`layer-${i}`), i)
  await page.waitForTimeout(400)
  const r = await page.locator('[data-stage25d-selection]').evaluate((el) => { const b = el.getBoundingClientRect(); return getComputedStyle(el).display === 'none' ? null : { x: b.x, y: b.y, w: b.width, h: b.height } })
  if (!keep && was !== i) await page.evaluate((w) => (w === null ? (window as any).__stage25d.clearSelection() : (window as any).__stage25d.select(`layer-${w}`)), was)
  return r
}
/** The canvas the stage draws on. */
const stageCanvas = async (page: Page) => (await page.evaluate(() => { const c = (window as any).__stage25d.canvas as HTMLCanvasElement; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } }))
/** Select a layer with the real mouse: a press on its painted middle. */
const selectLayer = async (page: Page, i: number) => {
  const b = await layerBox(page, i)
  if (!b) return false
  await page.evaluate(() => (window as any).__stage25d.clearSelection())
  for (const [fx, fy] of [[0.5, 0.55], [0.5, 0.45], [0.45, 0.65], [0.55, 0.35], [0.5, 0.75]]) {
    await page.mouse.click(Math.round(b.x + b.w * fx), Math.round(b.y + b.h * fy))
    await page.waitForTimeout(600)
    if (await page.evaluate(() => (window as any).__stage25d.selection) === i) return true
  }
  return false
}
/** The bone handles on screen: each sits at its bone's tip. */
const tips = (page: Page) => page.locator('[data-bone-handle]').evaluateAll((els) => Object.fromEntries(els.filter((e) => getComputedStyle(e).display !== 'none')
  .map((e) => { const r = e.getBoundingClientRect(); return [(e as HTMLElement).dataset.boneHandle, [r.x + r.width / 2, r.y + r.height / 2]] })))
const boneValue = (page: Page, i: number, bone: string) => page.evaluate(([i, bone]) => (window as any).__stage25d.readLayerProp(`layer-${i}`, `bone:${bone}`), [i, bone] as const)
const seek = async (page: Page, ms: number) => {
  if (!await page.locator('[data-timeline-time]').isVisible()) await page.getByRole('tab', { name: 'Timeline', exact: true }).click()
  const input = page.locator('[data-timeline-time]')
  await input.click()
  await input.fill(String(ms))
  await input.press('Enter')
  await page.waitForTimeout(500)
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

test('1. Assets > New character opens the window on the Character tab, the person in the middle, presets on the right', async ({ page }) => {
  await load(page)
  await openNew(page)
  await expect(page.locator('[data-cut-title]')).toHaveText('New character')
  // a new person has nothing but the Character mode: no tab strip (one mode)
  await expect(page.locator(V)).toBeVisible()
  await expect(page.locator(P)).toBeVisible()
  expect(await panelTitle(page)).toBe('Who')
  // presets (only the Girl's on Girl)
  expect(await page.locator(`${P} [data-chr-preset]`).count()).toBeGreaterThan(0)
  const paint = await tilePaint(page)
  expect(paint.every((n) => n > 50), `preset tiles painted ${paint}`).toBe(true)
  // the person drawn, near the middle of the view
  const view = (await page.locator(ART).boundingBox())!
  const f = await figureBounds(page)
  const cx = (f.x0 + f.x1) / 2
  expect(f.y1 - f.y0, 'figure tall in the view').toBeGreaterThan(view.height * 0.6)
  expect(Math.abs(cx - (view.x + view.width / 2)), 'figure near the middle').toBeLessThan(view.width * 0.12)
  await shot(page, '01-open')
})

test('2. every preset of every body: the figure changes and the name follows', async ({ page }) => {
  await load(page)
  await openNew(page)
  const kit = await page.evaluate(() => fetch('/character-kits/babylonia-old-babylonian/v1/kit.json').then((r) => r.json()))
  for (const body of ['Girl', 'Woman', 'Man'] as const) {
    await pickBody(page, body)
    const presets = kit.presets.filter((p: any) => p.recipe.body === body.toLowerCase())
    await expect(page.locator(`${P} [data-chr-preset]`)).toHaveCount(presets.length)
    const paint = await tilePaint(page)
    expect.soft(paint.every((n) => n > 50), `${body}: preset tiles painted ${paint}`).toBe(true)
    let before = await settle(page)
    for (const [k, p] of presets.entries()) {
      await page.locator(`${P} [data-chr-preset="${p.id}"]`).click()
      const now = await settle(page)
      expect.soft(await nameValue(page), `${body}/${p.id}: name follows`).toBe(p.label)
      if (k > 0) expect.soft(now, `${body}/${p.id}: the figure changed`).not.toBe(before)
      before = now
      await shot(page, `02-${body}-${p.id}`, (await page.locator(V).boundingBox())!)
    }
  }
  // a name typed by hand stays when a preset is clicked
  await page.locator(`${P} [data-chr-name]`).fill('Ninsun')
  await page.locator(`${P} [data-chr-preset]`).first().click()
  await settle(page)
  expect.soft(await nameValue(page), 'own name kept').toBe('Ninsun')
  await leaveDiscard(page)
})

test('3. point at hair, face, clothes, bare skin: amber edge and label; click opens the part; rail buttons; empty paper goes back', async ({ page }) => {
  await load(page)
  await openNew(page)
  const parts: [string, string, [number, number], [number, number]?][] = [
    ['Hair', 'hair', [0.0, 0.3], [0.0, 0.5]],
    ['Clothes', 'clothes', [0.3, 0.7], [0.35, 0.65]],
    ['Body', 'body', [0.88, 1.0]],
    ['Face', 'face', [0.04, 0.2], [0.4, 0.75]],
  ]
  const edges: Record<string, { n: number, mask: number[] }> = {}
  for (const [label, part, band, cols] of parts) {
    const at = await findPart(page, label, band, cols)
    expect.soft(at, `found ${label} under the mouse`).not.toBeNull()
    if (!at) continue
    await page.waitForTimeout(100)
    expect.soft(await amberPixels(page), `${label}: amber edge drawn`).toBeGreaterThan(200)
    edges[part] = await page.locator(`${V} [data-chr-edge]`).evaluate((c: HTMLCanvasElement) => {
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
      const mask: number[] = []
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 100) mask.push(i / 4)
      return { n: mask.length, mask }
    })
    await shot(page, `03-hover-${part}`, (await page.locator(V).boundingBox())!)
    await page.mouse.click(at[0], at[1])
    await settle(page)
    expect.soft(await panelTitle(page), `${label} opens its panel`).toBe(label)
    expect.soft(await railSelected(page), `${label}: rail follows`).toBe(part)
    if (part === 'face') {
      await expect.soft(page.locator(`${V} [data-chr-whole]`)).toBeVisible()
      await page.locator(`${V} [data-chr-whole]`).click()
      await settle(page)
    }
  }
  // Body edges the bare skin only: not the same outline as Clothes
  if (edges.body && edges.clothes) {
    const clothes = new Set(edges.clothes.mask)
    const shared = edges.body.mask.filter((i) => clothes.has(i)).length / Math.max(1, edges.body.n)
    expect.soft(shared, `Body edge is not the Clothes edge (${(shared * 100).toFixed(0)}% of its pixels shared)`).toBeLessThan(0.8)
  }
  // the mouse leaves the figure: the edge and label go
  const view = (await page.locator(ART).boundingBox())!
  await page.mouse.move(view.x + view.width - 30, view.y + view.height / 2)
  await page.waitForTimeout(100)
  expect.soft(await hoverText(page), 'no label off the figure').toBeNull()
  expect.soft(await amberPixels(page), 'no edge off the figure').toBe(0)
  // rail buttons
  for (const [part, label] of [['body', 'Body'], ['face', 'Face'], ['hair', 'Hair'], ['clothes', 'Clothes'], ['extra', 'Extra'], ['who', 'Who']]) {
    await rail(page, part)
    expect.soft(await panelTitle(page), `rail ${part}`).toBe(label)
    expect.soft(await railSelected(page)).toBe(part)
  }
  // empty paper goes back to Who
  await rail(page, 'clothes')
  await page.mouse.click(view.x + view.width - 30, view.y + view.height / 2)
  await settle(page)
  expect.soft(await panelTitle(page), 'empty paper back to Who').toBe('Who')
  await leaveDiscard(page)
})

test('4. swap every part type: outfit, face, eyes, mouth, hair (none), beard, headwear (nothing), jewellery on/off; tiles show the option', async ({ page }) => {
  await load(page)
  await openNew(page)
  const walk = async (body: string, part: string, slot: string) => {
    await rail(page, part)
    const ids = await tileIds(page, slot)
    expect.soft(ids.length, `${body} ${slot}: tiles`).toBeGreaterThan(0)
    const paint = await tilePaint(page)
    expect.soft(paint.every((n) => n > 30), `${body} ${part}: every tile painted ${paint}`).toBe(true)
    await shot(page, `04-${body}-${part}-${slot}-panel`, (await page.locator(P).boundingBox())!)
    for (const id of ids) {
      const was = await checkedTiles(page, slot)
      const before = await settle(page)
      await tile(page, slot, id).click()
      const after = await settle(page)
      if (slot === 'extra') {
        // jewellery toggles: on, then off again
        expect.soft(after, `${body} jewellery ${id} toggles the figure`).not.toBe(before)
        const on = (await checkedTiles(page, slot)).includes(id)
        await tile(page, slot, id).click()
        const back = await settle(page)
        expect.soft((await checkedTiles(page, slot)).includes(id), `${body} jewellery ${id}: second click flips it`).toBe(!on)
        expect.soft(back, `${body} jewellery ${id}: second click restores`).toBe(before)
        continue
      }
      expect.soft(await checkedTiles(page, slot), `${body} ${slot} ${id || '(none)'} chosen`).toEqual([id])
      if (!was.includes(id)) expect.soft(after, `${body} ${slot} ${id || '(none)'} changed the figure`).not.toBe(before)
    }
  }
  // Girl: outfit, face, mouth, hair (incl. none), headwear (incl. nothing), jewellery
  await walk('girl', 'clothes', 'outfit')
  await walk('girl', 'face', 'face')
  await walk('girl', 'face', 'mouth')
  await walk('girl', 'hair', 'hair')
  await walk('girl', 'extra', 'headwear')
  await walk('girl', 'extra', 'extra')
  // Woman: eyes, mouth, face
  await pickBody(page, 'Woman')
  await walk('woman', 'face', 'face')
  await walk('woman', 'face', 'eyes')
  await walk('woman', 'face', 'mouth')
  await walk('woman', 'clothes', 'outfit')
  await walk('woman', 'extra', 'headwear')
  // Man: beard, hair, eyes, headwear, jewellery
  await pickBody(page, 'Man')
  await walk('man', 'hair', 'hair')
  await walk('man', 'hair', 'beard')
  await walk('man', 'face', 'eyes')
  await walk('man', 'clothes', 'outfit')
  await walk('man', 'extra', 'headwear')
  await walk('man', 'extra', 'extra')
  await leaveDiscard(page)
})

for (const body of ['Girl', 'Woman', 'Man'] as const) {
  test(`5. recolour ${body}: every zone row, skin, hair colour change the figure`, async ({ page }) => {
    test.setTimeout(600_000)
    await load(page)
    await openNew(page)
    const rows = async (part: string) => {
      await rail(page, part)
      return page.locator(`${P} [role="radiogroup"]`).evaluateAll((els) => els.filter((e) => e.querySelector('[data-chr-colour]')).map((e) => e.getAttribute('aria-label')))
    }
    const sweep = async (part: string) => {
      for (const row of await rows(part)) {
        const sw = (k: number) => page.locator(`${P} [role="radiogroup"][aria-label="${row}"] [data-chr-colour]`).nth(k)
        const n = await page.locator(`${P} [role="radiogroup"][aria-label="${row}"] [data-chr-colour]`).count()
        expect.soft(n, `${body} ${row} swatches`).toBeGreaterThanOrEqual(5)
        for (let k = 0; k < n; k++) {
          const on = await sw(k).getAttribute('aria-checked') === 'true'
          const before = await settle(page)
          await sw(k).click()
          const after = await settle(page)
          const id = await sw(k).getAttribute('data-id')
          expect.soft(await page.locator(`${P} [role="radiogroup"][aria-label="${row}"] [data-chr-colour][aria-checked="true"]`).getAttribute('data-id'), `${body} ${row} ${id} checked`).toBe(id)
          if (!on) expect.soft(after, `${body} ${part} ${row} -> ${id}: pixels change`).not.toBe(before)
        }
      }
    }
    if (body !== 'Girl') await pickBody(page, body)
    if (body === 'Woman') await page.locator(`${P} [data-chr-preset="grandmother"]`).click()   // shawl + head cloth zones
    if (body === 'Man') await page.locator(`${P} [data-chr-preset="soldier"]`).click()
    await settle(page)
    await sweep('clothes')
    await sweep('body')
    await sweep('hair')
    await sweep('extra')
    await shot(page, `05-${body}-recoloured`, (await page.locator(V).boundingBox())!)
    await leaveDiscard(page)
  })
}

test('6. face close-up and back; expression chips change the face and are not saved by themselves', async ({ page }) => {
  await load(page)
  await openNew(page)
  const whole = await settle(page)
  const at = await findPart(page, 'Face', [0.04, 0.2], [0.4, 0.75])
  expect(at).not.toBeNull()
  await page.mouse.click(at![0], at![1])
  const close = await settle(page)
  expect(close, 'clicking the face zooms').not.toBe(whole)
  await expect(page.locator(`${V} [data-chr-whole]`)).toBeVisible()
  const f = await figureBounds(page)
  const view = (await page.locator(ART).boundingBox())!
  expect.soft(f.x1 - f.x0, 'the head fills the close view').toBeGreaterThan(view.width * 0.35)
  await shot(page, '06-face-close', view)
  const faces: Record<string, number> = {}
  for (const e of ['Calm', 'Curious', 'Sad', 'Angry', 'Amazed']) {
    await page.locator(`${V} [data-chr-expression]`, { hasText: e }).click()
    faces[e] = await settle(page)
    await expect.soft(page.locator(`${V} [data-chr-expression][aria-checked="true"]`)).toHaveText(e)
    await shot(page, `06-face-${e}`, view)
  }
  expect.soft(new Set(Object.values(faces)).size, `five different faces ${JSON.stringify(faces)}`).toBe(5)
  // not a change of the person: nothing to undo
  await expect.soft(undoBtn(page)).toBeDisabled()
  await page.locator(`${V} [data-chr-whole]`).click()
  await settle(page)
  await expect.soft(page.locator(`${V} [data-chr-whole]`)).toBeHidden()
  // the expression chip stays (Amazed) on the whole figure; back to Calm draws the figure it opened with
  await page.locator(`${V} [data-chr-expression]`, { hasText: 'Calm' }).click()
  expect.soft(await settle(page), 'Calm whole = whole at start').toBe(whole)
  await leaveDiscard(page)
})

test('7. Random and R: a new person of the same body; undo/redo buttons and Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z step back and forth', async ({ page }) => {
  await load(page)
  await openNew(page)
  await pickBody(page, 'Man')
  const s0 = await settle(page)
  await expect(undoBtn(page)).toBeEnabled()   // the body change
  await page.locator(`${V} [data-chr-random]`).click()
  const s1 = await settle(page)
  expect(s1, 'Random changed the person').not.toBe(s0)
  await expect(page.locator(`${P} input[data-chr-body][aria-label="Man"]`)).toBeChecked()
  // R with the keyboard on the window (not in the name field)
  await page.locator(`${V} [data-chr-rail="clothes"]`).click()
  await page.keyboard.press('r')
  const s2 = await settle(page)
  expect(s2, 'R changed the person').not.toBe(s1)
  await shot(page, '07-random', (await page.locator(V).boundingBox())!)
  await undoBtn(page).click()
  expect.soft(await settle(page), 'undo -> after Random').toBe(s1)
  await page.keyboard.press('ControlOrMeta+z')
  expect.soft(await settle(page), 'Cmd+Z -> before Random').toBe(s0)
  await redoBtn(page).click()
  expect.soft(await settle(page), 'redo -> Random').toBe(s1)
  await page.keyboard.press('ControlOrMeta+Shift+z')
  expect.soft(await settle(page), 'Shift+Cmd+Z -> R').toBe(s2)
  await expect.soft(redoBtn(page)).toBeDisabled()
  // a Random of every body stays on that body, many times
  for (const body of ['Girl', 'Woman'] as const) {
    await pickBody(page, body)
    for (let k = 0; k < 5; k++) {
      await page.locator(`${V} [data-chr-random]`).click()
      await settle(page)
      await expect.soft(page.locator(`${P} input[data-chr-body][aria-label="${body}"]`)).toBeChecked()
    }
  }
  await leaveDiscard(page)
})

test('7b. the Name field: a click puts the keyboard in it, typing writes the name, R there is a letter', async ({ page }) => {
  await load(page)
  await openNew(page)
  const s = await settle(page)
  const input = page.locator(`${P} [data-chr-name]`)
  await input.click()
  await page.waitForTimeout(200)
  const active = await page.evaluate(() => { const a = document.activeElement as HTMLElement; return a?.matches('[data-chr-name]') ? 'name field' : `${a?.tagName} ${Object.keys(a?.dataset ?? {}).join(',')}` })
  expect.soft(active, 'focus stays in the Name field after a click').toBe('name field')
  await page.keyboard.press('End')
  await page.keyboard.type(' Ur')
  expect.soft(await input.inputValue(), 'typed text lands in the name').toBe('Girl at the grinding stone Ur')
  expect.soft(await settle(page), 'typing r in the name field keeps the person').toBe(s)
  await leaveDiscard(page)
})

test('8. the face close-up after a body change frames the new body (rig follows the body)', async ({ page }) => {
  await load(page)
  await openNew(page)
  await pickBody(page, 'Man')            // Girl -> Man by the tab: set(), no rig change
  await rail(page, 'face')
  const viaTab = await settle(page)
  await shot(page, '08-man-face-after-tab', (await page.locator(V).boundingBox())!)
  await undoBtn(page).click()            // back to Girl: undo loads the girl's rig
  await settle(page)
  await redoBtn(page).click()            // Man again: redo loads the man's rig
  const viaRedo = await settle(page)
  await shot(page, '08-man-face-after-redo', (await page.locator(V).boundingBox())!)
  expect(viaTab, 'the same person and view draws the same, whichever way it was reached').toBe(viaRedo)
  await leaveDiscard(page)
})

test('14. leaving with unsaved changes asks Save / Discard / Keep editing; Discard leaves nothing behind', async ({ page }) => {
  await load(page)
  const before = { layers: (await layers(page)).length, shelf: (await shelf(page)).length }
  await openNew(page)
  await page.locator(`${V} [data-chr-random]`).click()
  const s = await settle(page)
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-cut-ask]')).toBeVisible()
  await expect(page.locator('[data-cut-ask-save]')).toBeVisible()
  await expect(page.locator('[data-cut-ask-discard]')).toBeVisible()
  await expect(page.locator('[data-cut-ask] [data-cut-ask-stay]').filter({ hasText: 'Keep editing' })).toBeVisible()
  await shot(page, '14-ask')
  await page.locator('[data-cut-ask] [data-cut-ask-stay]').filter({ hasText: 'Keep editing' }).click()
  await expect(page.locator('[data-cut-ask]')).toBeHidden()
  expect(await settle(page), 'keep editing keeps the work').toBe(s)
  // the back arrow asks the same
  await page.locator('[data-cut-back]').click()
  await expect(page.locator('[data-cut-ask]')).toBeVisible()
  await page.locator('[data-cut-ask-discard]').click()
  await expect(page.locator('[data-cutout]')).toHaveCount(0)
  await page.waitForTimeout(1000)
  expect((await layers(page)).length, 'no layer added').toBe(before.layers)
  expect((await shelf(page)).length, 'nothing on My characters').toBe(before.shelf)
  // a fresh window with nothing done: Esc still asks (a new person is always something to save), Discard again
  await openNew(page)
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-cut-ask]')).toBeVisible()
  await page.locator('[data-cut-ask-discard]').click()
  await expect(page.locator('[data-cutout]')).toHaveCount(0)
  await page.reload()
  await page.waitForFunction(() => document.querySelector('[data-stage25d-ready="1"]') && (window as any).__stage25d?.config, undefined, { timeout: 180_000 })
  expect((await layers(page)).length, 'after reload: no layer added').toBe(before.layers)
  expect((await shelf(page)).length, 'after reload: nothing on My characters').toBe(before.shelf)
})

let SAVED: { id: string, recipe: any, name: string } | null = null

test('9. Save: window closes, the person joins the scene (chr-<n>), My characters shows it, the stage paints it standing at a sensible size', async ({ page }) => {
  await load(page)
  const before = { layers: await layers(page), shelf: await shelf(page) }
  await openNew(page)
  await pickBody(page, 'Woman')
  await page.locator(`${P} [data-chr-preset="tavern-keeper"]`).click()
  await settle(page)
  await page.locator(`${P} [data-chr-name]`).fill('Test keeper')
  await rail(page, 'clothes')
  const outfit = (await checkedTiles(page, 'outfit'))[0]
  await shot(page, '09-before-save', (await page.locator(V).boundingBox())!)
  await saveWindow(page)
  const after = await layers(page)
  expect(after.length, 'one layer added').toBe(before.layers.length + 1)
  const added = after.at(-1)!
  expect(added.asset).toMatch(/^chr-\d+$/)
  const sh = await shelf(page)
  expect(sh.length, 'one more on My characters').toBe(before.shelf.length + 1)
  const row = sh.find((a: any) => a.id === added.asset)
  expect(row, 'shelf has the new id').toBeTruthy()
  expect.soft(row.label, 'shelf label is the name').toBe('Test keeper')
  expect.soft(row.thumb, 'shelf has a thumbnail').toBeTruthy()
  const recipe = await page.evaluate((i) => (window as any).__stage25d.editTarget(`layer-${i}`)?.character?.recipe, after.length - 1)
  expect.soft(`outfit/${recipe?.outfit}`).toBe(outfit)
  SAVED = { id: added.asset, recipe, name: 'Test keeper' }
  // the shelf in the Assets tab shows it with a thumbnail picture that loaded
  await page.getByRole('tab', { name: 'Assets', exact: true }).click()
  const kinds = page.locator('[data-stage25d-assets] button.btn-xs', { hasText: 'My characters' })
  if (await kinds.count()) await kinds.first().click()
  const tileEl = page.locator(`[data-stage25d-tile="${added.asset}"]`)
  await expect(tileEl).toBeVisible()
  const img = tileEl.locator('img')
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth), { timeout: 15_000 }).toBeGreaterThan(0)
  expect.soft(await img.getAttribute('src'), 'tile uses the thumb').toContain('-thumb.webp')
  const tb = (await tileEl.boundingBox())!
  await shot(page, '09-shelf', { x: tb.x - 10, y: tb.y - 10, width: tb.width + 20, height: tb.height + 20 })
  // on the stage: a figure-shaped box (tall), not a square atlas, about as tall as the figure beside it
  await page.waitForTimeout(2500)
  const i = after.length - 1
  const box = await layerBox(page, i)
  expect(box, 'the new layer has a box on the stage').not.toBeNull()
  const pieter = await layerBox(page, 0)
  const c = await stageCanvas(page)
  await shot(page, '09-stage', c)
  if (box) {
    const x0 = Math.max(c.x, box.x - 40), y0 = Math.max(c.y, box.y - 30)
    await shot(page, '09-stage-figure', { x: x0, y: y0, width: Math.min(c.x + c.width, box.x + box.w + 40) - x0, height: Math.min(c.y + c.height, box.y + box.h + 30) - y0 })
    expect.soft(box.h / box.w, `standing figure is tall (h/w ${box.h / box.w})`).toBeGreaterThan(1.6)
    expect.soft(box.h, 'readable size').toBeGreaterThan(c.height * 0.15)
    expect.soft(box.h, 'not taller than the view').toBeLessThan(c.height * 1.0)
    if (pieter) expect.soft(box.h / pieter.h, `height next to Pieter (1.7 m) ${box.h / pieter.h}`).toBeGreaterThan(0.4)
    // feet on the ground: the box bottom inside the canvas, below the middle
    expect.soft(box.y + box.h, 'feet on screen').toBeLessThanOrEqual(c.y + c.height + 2)
    expect.soft(box.y + box.h, 'feet below the horizon').toBeGreaterThan(c.y + c.height * 0.45)
  }
  // beside the figure in view, never on top of one: no other figure at the same spot
  const spots = await page.evaluate(() => (window as any).__stage25d.config.set.layers.map((l: any, k: number) => ({ k, x: (window as any).__stage25d.readLayerProp(`layer-${k}`, 'x'), z: (window as any).__stage25d.readLayerProp(`layer-${k}`, 'z') })))
  const me = spots[i]
  const onTop = spots.filter((o: any) => o.k !== i && Math.abs(o.x - me.x) < 0.08 && Math.abs(o.z - me.z) < 0.5)
  expect.soft(onTop, `no figure under the new one (it stands at x ${me.x?.toFixed(2)}, z ${me.z?.toFixed(2)})`).toEqual([])
  // a click on it selects it, the inspector is its own, and Edit picture opens it
  await page.evaluate(() => (window as any).__stage25d.clearSelection())
  await page.waitForTimeout(800)
  expect.soft(await selectLayer(page, i), 'a click on the new figure selects it').toBe(true)
  await page.waitForTimeout(1500)
  expect.soft(await page.locator('[data-stage25d-inspector]').getAttribute('data-stage25d-inspector'), 'the inspector is the new figure').toBe(`layer-${i}`)
  const edit = page.locator(`[data-stage25d-inspector="layer-${i}"] [data-stage25d-edit]`)
  if (await edit.count()) {
    await edit.click()
    await page.waitForSelector('[data-cutout]')
    expect.soft(await page.locator('[data-cut-title]').textContent(), 'Edit picture opens the new figure').toBe('Test keeper')
    await page.keyboard.press('Escape')
    if (await page.locator('[data-cut-ask-discard]').isVisible()) await page.locator('[data-cut-ask-discard]').click()
    await expect(page.locator('[data-cutout]')).toHaveCount(0)
  }
})

test('9b. the face, large: the saved head tiles of every expression, and the tab close-up of every preset', async ({ page }) => {
  await load(page)
  const i = await ensureCharacter(page)
  // the head tile of the atlas the stage draws, at full size, for each expression
  const heads = await page.evaluate(async (i) => {
    const p = (window as any).__stage25d.editTarget(`layer-${i}`).puppet
    const img = new Image(); img.src = p.atlas; await img.decode()
    const head = p.parts.find((x: any) => x.bone === 'head')
    const out: Record<string, string> = {}
    for (const [name, uv] of [['calm', head.uv], ...Object.entries(p.faces ?? {})] as [string, number[]][]) {
      const [u0, v0, u1, v1] = uv
      const w = Math.round((u1 - u0) * img.naturalWidth), h = Math.round((v1 - v0) * img.naturalHeight)
      const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2
      const g = c.getContext('2d')!
      g.fillStyle = '#f6f3ea'; g.fillRect(0, 0, c.width, c.height)
      g.imageSmoothingEnabled = false
      g.drawImage(img, u0 * img.naturalWidth, v0 * img.naturalHeight, w, h, 0, 0, w * 2, h * 2)
      out[name] = c.toDataURL('image/png')
    }
    return out
  }, i)
  const { writeFileSync } = await import('node:fs')
  for (const [name, url] of Object.entries(heads)) writeFileSync(`${SHOTS}/09b-atlas-head-${name}.png`, Buffer.from(url.split(',')[1], 'base64'))
  expect(Object.keys(heads).sort()).toEqual(['amazed', 'angry', 'calm', 'curious', 'sad'])
  // the stage, the head as drawn (selected figure: the frame says where it is)
  const box = await layerBox(page, i)
  if (box) await shot(page, '09b-stage-head', { x: Math.round(box.x), y: Math.round(Math.max(box.y, (await stageCanvas(page)).y)), width: Math.round(box.w), height: Math.round(box.h * 0.3) })
  // every preset's face close-up in the tab
  await openNew(page)
  const kit = await page.evaluate(() => fetch('/character-kits/babylonia-old-babylonian/v1/kit.json').then((r) => r.json()))
  for (const body of ['Girl', 'Woman', 'Man'] as const) {
    await pickBody(page, body)
    for (const p of kit.presets.filter((x: any) => x.recipe.body === body.toLowerCase())) {
      await rail(page, 'who')
      await page.locator(`${P} [data-chr-preset="${p.id}"]`).click()
      await settle(page)
      await rail(page, 'face')
      await shot(page, `09b-tab-face-${p.id}`, (await page.locator(V).boundingBox())!)
      await page.locator(`${V} [data-chr-whole]`).click()
    }
  }
  await leaveDiscard(page)
})

test('9c. the woman\'s Shawl over head takes the Head cloth colour', async ({ page }) => {
  await load(page)
  await openNew(page)
  await pickBody(page, 'Woman')
  await page.locator(`${P} [data-chr-preset="grandmother"]`).click()
  await settle(page)
  await rail(page, 'extra')
  const row = page.locator(`${P} [role="radiogroup"][aria-label="Head cloth"]`)
  await expect(row, 'a Head cloth colour row').toBeVisible()
  /** Pixels of the head band (top fifth of the figure) close to a colour, plain or in shade. */
  const near = async (hex: string) => {
    const f = await figureBounds(page)
    const box = (await page.locator(ART).boundingBox())!
    return page.locator(ART).evaluate((c: HTMLCanvasElement, [hex, x0, y0, x1, y1]) => {
      const [r, g, b] = [1, 3, 5].map((k) => parseInt((hex as string).slice(k, k + 2), 16))
      const k = c.width / c.clientWidth
      const d = c.getContext('2d')!.getImageData(Math.round(x0 as number * k), Math.round(y0 as number * k), Math.round(((x1 as number) - (x0 as number)) * k), Math.round(((y1 as number) - (y0 as number)) * k))
      let n = 0
      for (let i = 0; i < d.data.length; i += 4) for (const s of [1, 0.85, 0.7]) if (Math.hypot(d.data[i] - r * s, d.data[i + 1] - g * s, d.data[i + 2] - b * s) < 22) { n++; break }
      return n
    }, [hex, f.x0 - box.x, f.y0 - box.y, f.x1 - box.x, f.y0 - box.y + (f.y1 - f.y0) * 0.2] as const)
  }
  const out: Record<string, number> = {}
  for (const [id, hex] of [['reed-green', '#7f8650'], ['indigo-blue', '#46607a'], ['madder-red', '#a8463a']]) {
    const before = await near(hex)
    await row.locator(`[data-id="${id}"]`).click()
    await settle(page)
    out[id] = (await near(hex)) - before
    await shot(page, `09c-shawl-${id}`, (await page.locator(V).boundingBox())!)
  }
  test.info().annotations.push({ type: 'shawl', description: JSON.stringify(out) })
  for (const [id, gained] of Object.entries(out)) expect.soft(gained, `the shawl over the head turns ${id} (px gained in the head band)`).toBeGreaterThan(1500)
  await leaveDiscard(page)
})

test('10. reopen by double-click: Character tab with every choice as saved; change the outfit; Save updates the same layer, no duplicate', async ({ page }) => {
  await load(page)
  const i = await ensureCharacter(page)
  const id = (await layers(page))[i].asset
  const saved = await page.evaluate((i) => (window as any).__stage25d.editTarget(`layer-${i}`)?.character?.recipe, i)
  const shelfBefore = await shelf(page)
  const countBefore = (await layers(page)).length
  const savedName = SAVED?.name ?? shelfBefore.find((a: any) => a.id === id)?.label
  const b = (await layerBox(page, i))!
  await page.mouse.dblclick(Math.round(b.x + b.w * 0.5), Math.round(b.y + b.h * 0.6))
  let opened = await page.locator('[data-cutout]').waitFor({ timeout: 10_000 }).then(() => true).catch(() => false)
  expect.soft(opened, 'a double-click on the figure on the stage opens the editor').toBe(true)
  if (!opened) {
    await selectLayer(page, i)
    await page.locator('[data-stage25d-edit]').click()
    await page.waitForSelector('[data-cutout]')
  }
  await page.waitForFunction(() => document.querySelector('[data-chr-loading]')?.hasAttribute('hidden'), undefined, { timeout: 60_000 })
  await settle(page)
  await expect.soft(page.locator('input[name="cut-mode"][value="character"]')).toBeChecked()
  await expect.soft(page.locator(V)).toBeVisible()
  expect.soft(await page.locator('[data-cut-title]').textContent(), 'title is the name').toBe(savedName)
  await expect.soft(undoBtn(page)).toBeDisabled()
  // every choice as saved
  await rail(page, 'who')
  await expect.soft(page.locator(`${P} input[data-chr-body][aria-label="${saved.body[0].toUpperCase()}${saved.body.slice(1)}"]`)).toBeChecked()
  expect.soft(await nameValue(page), 'name field is the saved name').toBe(savedName)
  await rail(page, 'clothes')
  expect.soft(await checkedTiles(page, 'outfit')).toEqual([`outfit/${saved.outfit}`])
  for (const [zone, colour] of Object.entries(saved.zones ?? {})) {
    const row = page.locator(`${P} [role="radiogroup"]`).filter({ has: page.locator(`[data-chr-colour="${zone}"]`) })
    if (await row.count()) expect.soft(await row.locator('[aria-checked="true"]').getAttribute('data-id'), `zone ${zone}`).toBe(colour)
  }
  await rail(page, 'face')
  expect.soft(await checkedTiles(page, 'face')).toEqual([`face/${saved.face}`])
  if ('eyes' in saved) expect.soft(await checkedTiles(page, 'eyes')).toEqual([`eyes/${saved.eyes}`])
  if ('mouth' in saved) expect.soft(await checkedTiles(page, 'mouth')).toEqual([`mouths/${saved.mouth}`])
  expect.soft(await page.locator(`${P} [data-chr-colour="skin"][aria-checked="true"]`).getAttribute('data-id')).toBe(saved.skin)
  await page.locator(`${V} [data-chr-whole]`).click()
  await rail(page, 'hair')
  const hair = saved.parts.filter((p: string) => p.startsWith('hair/'))
  expect.soft((await checkedTiles(page, 'hair')).concat(await checkedTiles(page, 'beard')).filter(Boolean).sort()).toEqual(hair.sort())
  expect.soft(await page.locator(`${P} [data-chr-colour="hair"][aria-checked="true"]`).getAttribute('data-id')).toBe(saved.hair_colour)
  await rail(page, 'extra')
  const hw = saved.parts.filter((p: string) => p.startsWith('headwear/'))
  expect.soft(await checkedTiles(page, 'headwear')).toEqual(hw.length ? hw : [''])
  expect.soft((await checkedTiles(page, 'extra')).sort()).toEqual(saved.parts.filter((p: string) => p.startsWith('extras/')).sort())
  // nothing changed yet: Esc leaves at once
  await page.keyboard.press('Escape')
  await expect.soft(page.locator('[data-cut-ask]')).toBeHidden()
  if (await page.locator('[data-cut-ask]').isVisible()) await page.locator('[data-cut-ask-discard]').click()
  await expect(page.locator('[data-cutout]')).toHaveCount(0)
  // open again with the Edit picture button, change the outfit, Save
  const picked = await selectLayer(page, i)
  await page.waitForTimeout(1500)
  const shown = await page.locator('[data-stage25d-inspector]').getAttribute('data-stage25d-inspector')
  expect.soft(picked && shown === `layer-${i}`, `a click on the figure selects it (selection ${await page.evaluate(() => (window as any).__stage25d.selection)}, inspector ${shown})`).toBe(true)
  if (shown === `layer-${i}`) await page.locator(`[data-stage25d-inspector="layer-${i}"] [data-stage25d-edit]`).click()
  else await page.mouse.dblclick(Math.round(b.x + b.w * 0.5), Math.round(b.y + b.h * 0.6))   // the inspector shows another layer: the double-click still opens the character
  await page.waitForSelector('[data-cutout]')
  await page.waitForFunction(() => document.querySelector('[data-chr-loading]')?.hasAttribute('hidden'), undefined, { timeout: 60_000 })
  await settle(page)
  await rail(page, 'clothes')
  const other = (await tileIds(page, 'outfit')).find((o) => o !== `outfit/${saved.outfit}`)!
  const atlasBefore = await page.evaluate((i) => (window as any).__stage25d.editTarget(`layer-${i}`)?.puppet?.atlas, i)
  await tile(page, 'outfit', other).click()
  await settle(page)
  await saveWindow(page)
  const after = await layers(page)
  expect(after.length, 'no layer added').toBe(countBefore)
  expect(after[i].asset, 'same chr id').toBe(id)
  const sh = await shelf(page)
  expect(sh.length, 'no duplicate shelf entry').toBe(shelfBefore.length)
  expect(sh.filter((a: any) => a.id === id).length).toBe(1)
  expect.soft(sh.find((a: any) => a.id === id)?.label, 'the name survives a reopen + save').toBe(savedName)
  const now = await page.evaluate((i) => (window as any).__stage25d.editTarget(`layer-${i}`)?.character?.recipe, i)
  expect(`outfit/${now.outfit}`, 'new outfit saved').toBe(other)
  const atlasAfter = await page.evaluate((i) => (window as any).__stage25d.editTarget(`layer-${i}`)?.puppet?.atlas, i)
  expect.soft(atlasAfter, 'the stage uses the new atlas').not.toBe(atlasBefore)
  const ok = await page.evaluate((u) => fetch(u).then((r) => r.status), atlasAfter)
  expect.soft(ok, 'new atlas is served').toBe(200)
  const c = await stageCanvas(page)
  await shot(page, '10-stage-after-reopen-save', c)
  if (SAVED) SAVED.recipe = now
})

test('11. bones on the stage: drag elbow, knee, head; knees and elbows never bend backwards, arms never through the body; undo', async ({ page }) => {
  await load(page)
  const i = await ensureCharacter(page)
  expect(await selectLayer(page, i), 'figure selected by a click').toBe(true)
  await page.waitForTimeout(800)
  const handles = await page.locator('[data-bone-handle]').evaluateAll((els) => els.filter((e) => getComputedStyle(e).display !== 'none').map((e) => (e as HTMLElement).dataset.boneHandle))
  expect(handles.length, `bone handles shown ${handles}`).toBeGreaterThan(4)
  expect.soft(handles, 'a hip (thigh) handle to bend the leg at the hip').toEqual(expect.arrayContaining(['thigh_n', 'thigh_f']))
  const c = await stageCanvas(page)
  await shot(page, '11-handles', c)
  // the figure's own rest geometry (its puppet), mapped onto the screen through the handles at rest (least squares)
  const puppet = await page.evaluate((i) => (window as any).__stage25d.editTarget(`layer-${i}`)?.puppet, i)
  const t0 = await tips(page)
  const pairs = puppet.bones.filter((b: any) => b.to && t0[b.name]).map((b: any) => [b.to, t0[b.name]])
  const fit = (k: 0 | 1) => {   // screen[k] = a*x + b*y + c
    let sxx = 0, sxy = 0, syy = 0, sx = 0, sy = 0, n = 0, sxv = 0, syv = 0, sv = 0
    for (const [[x, y], v] of pairs) { sxx += x * x; sxy += x * y; syy += y * y; sx += x; sy += y; n++; sxv += x * v[k]; syv += y * v[k]; sv += v[k] }
    const M = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]], R = [sxv, syv, sv]
    const det = (m: number[][]) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
    const d = det(M)
    return [0, 1, 2].map((c) => det(M.map((row, r) => row.map((v, cc) => (cc === c ? R[r] : v)))) / d)
  }
  const lim = (n: string) => puppet.bones.find((b: any) => b.name === n)?.limit
  test.info().annotations.push({ type: 'limits', description: JSON.stringify(Object.fromEntries(puppet.bones.map((b: any) => [b.name, b.limit ?? null]))) })
  expect.soft(lim('upperarm_n')?.[0], 'near upper arm limit baked at Save').toBe(-110)
  expect.soft(lim('forearm_n')?.[0], 'near forearm limit baked at Save').toBe(-110)
  const fx = fit(0), fy = fit(1)
  const T = ([x, y]: number[]) => [fx[0] * x + fx[1] * y + fx[2], fy[0] * x + fy[1] * y + fy[2]]
  const fromOf = (name: string) => T(puppet.bones.find((b: any) => b.name === name).from)
  const resid = Math.max(...pairs.map(([p, v]: any) => Math.hypot(T(p)[0] - v[0], T(p)[1] - v[1])))
  expect.soft(resid, 'rest handles sit about where the puppet says (fit residual px)').toBeLessThan(25)
  const TOL = Math.max(8, resid)
  const fwd = Math.sign(t0.foot_n[0] - t0.shin_n[0])   // forward from the foot: ankle -> toe
  expect.soft(fwd, 'facing derived from the foot').not.toBe(0)
  const cross = (a: number[], b: number[]) => a[0] * b[1] - a[1] * b[0]
  const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1]]
  const angle = (u: number[], v: number[]) => Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / Math.hypot(...u) / Math.hypot(...v)))) * 180 / Math.PI
  const drag = async (bone: string, dx: number, dy: number) => {
    const r = (await page.locator(`[data-bone-handle="${bone}"]`).boundingBox())!
    const x = r.x + r.width / 2, y = r.y + r.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + dx, y + dy, { steps: 16 })
    await page.mouse.up()
    await page.waitForTimeout(700)
  }
  const report: string[] = [`fwd ${fwd} resid ${resid.toFixed(1)}`]
  const check = async (tag: string) => {
    const t = await tips(page)
    for (const side of ['n', 'f']) {
      if (!t[`shin_${side}`]) continue
      // the thigh has no handle and is not turned here: hip and knee from the puppet, the ankle from its handle
      const knee = t[`thigh_${side}`] ?? fromOf(`shin_${side}`)
      const thigh = sub(knee, fromOf(`thigh_${side}`)), shin = sub(t[`shin_${side}`], knee)
      const bend = angle(thigh, shin), k = cross(thigh, shin) * fwd
      report.push(`${tag} knee_${side}: bend ${bend.toFixed(1)} cross*fwd ${k.toFixed(0)}`)
      // a knee bends with the shin swinging backwards: (thigh x shin) . forward > 0 in screen space (y down)
      if (bend > 8) expect.soft(k, `${tag}: knee_${side} bends backwards (${bend.toFixed(0)} deg)`).toBeGreaterThan(0)
    }
    for (const side of ['n', 'f']) {
      if (!t[`upperarm_${side}`] || !t[`forearm_${side}`]) continue
      const upper = sub(t[`upperarm_${side}`], fromOf(`upperarm_${side}`)), fore = sub(t[`forearm_${side}`], t[`upperarm_${side}`])
      const bend = angle(upper, fore), k = cross(upper, fore) * fwd
      report.push(`${tag} elbow_${side}: bend ${bend.toFixed(1)} cross*fwd ${k.toFixed(0)}`)
      // an elbow bends with the forearm swinging forwards
      if (bend > 8) expect.soft(k, `${tag}: elbow_${side} bends backwards (${bend.toFixed(0)} deg)`).toBeLessThan(0)
    }
    // the near arm (drawn in front) may reach forward across the chest, never up across the face or neck: once its
    // elbow or hand is past the torso axis it stays below the neck. The far arm (drawn behind) stays on its own side.
    if (t.upperarm_n && t.forearm_n) {
      const near = fromOf('upperarm_n'), far = fromOf('upperarm_f')
      const nearSide = Math.sign(near[0] - far[0])
      const axis = (near[0] + far[0]) / 2
      const neckY = fromOf('head')[1]
      for (const [what, p] of [['elbow', t.upperarm_n], ['hand', t.forearm_n]] as const) {
        const past = (axis - p[0]) * nearSide          // > 0: across the torso axis
        const above = neckY - p[1]                      // > 0: higher than the neck
        report.push(`${tag} near ${what}: ${past.toFixed(0)} px past the axis, ${above.toFixed(0)} px above the neck`)
        if (past > TOL) expect.soft(above, `${tag}: near ${what} across the body AND up at the face/neck`).toBeLessThan(TOL)
      }
      for (const [what, p] of [['elbow', t.upperarm_f], ['hand', t.forearm_f]] as const) {
        if (!p) continue
        const into = (p[0] - axis) * nearSide           // > 0: the far arm past the axis, into the torso
        report.push(`${tag} far ${what}: ${into.toFixed(0)} px past the axis`)
        expect.soft(into, `${tag}: far ${what} vanishes into the torso`).toBeLessThan(TOL)
      }
    }
  }
  await check('rest')
  const rest = Object.fromEntries(await Promise.all(['upperarm_n', 'forearm_n', 'shin_n', 'head', 'thigh_n'].map(async (b) => [b, await boneValue(page, i, b)])))
  // elbow: the forearm handle (at the wrist) dragged far both ways round the elbow
  for (const [bone, moves] of [
    ['forearm_n', [[120, -60], [-240, 0], [0, 160]]],
    ['upperarm_n', [[250, 0], [200, -200], [80, -300], [300, -120], [-400, 0]]],
    ['shin_n', [[140, -40], [-280, 0]]],
    ['thigh_n', [[120, 0], [-240, 0]]],
    ['head', [[60, 0], [-120, 0]]],
  ] as [string, number[][]][]) {
    if (!handles.includes(bone)) { report.push(`no handle ${bone}`); continue }
    for (const [dx, dy] of moves) {
      await drag(bone, dx * fwd, dy)
      const v = await boneValue(page, i, bone)
      report.push(`${bone} -> ${v}`)
      await check(`${bone} ${dx},${dy}`)
      await shot(page, `11-${bone}-${dx}-${dy}`, c)
    }
  }
  const moved = await boneValue(page, i, 'head')
  expect.soft(moved, 'head turned by its handle').not.toBe(rest.head)
  // undo steps back the last drag (head)
  await page.waitForTimeout(3000)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur?.())
  await page.keyboard.press('ControlOrMeta+z')
  await page.waitForTimeout(2500)
  const undone = await boneValue(page, i, 'head')
  expect.soft(undone, `undo returns the head (${moved} -> ${undone})`).not.toBe(moved)
  // drag back: the head to rest by its handle
  test.info().annotations.push({ type: 'bones', description: report.join('\n') })
  console.log(report.join('\n'))
})

test('12. expressions on the timeline: Sad at 0, Amazed later; face keys shown; scrub changes the face on the stage', async ({ page }) => {
  await load(page)
  const i = await ensureCharacter(page)
  expect(await selectLayer(page, i)).toBe(true)
  const section = page.locator('[data-stage25d-expression-section]')
  await expect(section).toBeVisible()
  const chips = await section.locator('[data-stage25d-face]').evaluateAll((els) => els.filter((e) => getComputedStyle(e).display !== 'none').map((e) => (e as HTMLElement).dataset.stage25dFace))
  expect(chips).toEqual(['calm', 'curious', 'sad', 'angry', 'amazed'])
  await seek(page, 0)
  await section.locator('[data-stage25d-face="sad"]').click()
  await page.waitForTimeout(1200)
  await seek(page, 2000)
  await section.locator('[data-stage25d-face="amazed"]').click()
  await page.waitForTimeout(1500)
  const keys = await page.evaluate((i) => (window as any).__timelineKeying.layerKeys(`s25:layer-${i}`), i)
  const faceKeys = keys.filter((k: any) => k.face).map((k: any) => [k.t, k.face])
  expect(faceKeys, 'face keys in the timeline').toEqual([[0, 'sad'], [2, 'amazed']])
  // the timeline shows the Face row with two diamonds
  await page.getByRole('tab', { name: 'Timeline', exact: true }).click()
  await page.waitForTimeout(800)
  const toggle = page.locator(`[data-timeline-toggle="s25:layer-${i}"]`)
  if (await toggle.count() && await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click()
  await page.waitForTimeout(600)
  for (const sec of await page.locator(`[data-timeline-section^="s25:layer-${i}#"]`).all()) if (await sec.getAttribute('aria-expanded') === 'false') await sec.click()
  await page.waitForTimeout(400)
  await shot(page, '12-timeline', (await page.locator('[data-timeline-tracks]').boundingBox())!)
  const dup = await page.evaluate((i) => {
    const el = document.querySelector('[data-timeline-tracks]')?.closest('[x-data]') as any
    const data = el && (window as any).Alpine?.$data(el)
    const tracks = (data?.tracks ?? []).filter((t: any) => String(t.target).endsWith(`layer-${i}`))
    return tracks.map((t: any) => `${t.target}/${t.property}`)
  }, i)
  test.info().annotations.push({ type: 'tracks', description: dup.join(', ') })
  expect.soft(dup.length, `no duplicate tracks after keying a face: ${dup.join(', ')}`).toBe(new Set(dup).size)
  expect.soft(dup.every((d: string) => d.startsWith('s25:')), 'every track on s25:<layer>').toBe(true)
  const diamonds = page.locator(`[data-timeline-diamond="s25:layer-${i}:face"]`)
  expect.soft(await diamonds.count(), 'two diamonds on the face row').toBe(2)
  const rows = await page.locator(`[data-timeline-lane="s25:layer-${i}:face"]`).count()
  expect.soft(rows, 'one face row').toBe(1)
  // changing the key at 0 from Sad to Angry takes
  await seek(page, 0)
  await section.locator('[data-stage25d-face="angry"]').click()
  await page.waitForTimeout(1500)
  const keys2 = await page.evaluate((i) => (window as any).__timelineKeying.layerKeys(`s25:layer-${i}`), i)
  expect.soft(keys2.filter((k: any) => k.face).map((k: any) => [k.t, k.face]), 'the key at 0 becomes Angry').toEqual([[0, 'angry'], [2, 'amazed']])
  expect.soft(await page.locator(`[data-timeline-lane="s25:layer-${i}:face"]`).count(), 'still one face row').toBe(1)
  // saved on the layer
  await page.waitForTimeout(2000)
  const saved = (await layers(page))[i].keys.filter((k: any) => k.face).map((k: any) => [k.t, k.face])
  expect.soft(saved, 'face keys saved on the layer').toEqual([[0, 'angry'], [2, 'amazed']])
  // scrub: the face on the stage
  const box = (await layerBox(page, i))!
  const head = { x: Math.round(box.x + box.w * 0.15), y: Math.round(box.y), width: Math.round(box.w * 0.7), height: Math.round(box.h * 0.22) }
  const faceAt = async (ms: number) => {
    await seek(page, ms)
    await page.waitForTimeout(800)
    const info = await page.evaluate((i) => (window as any).__stage25d.layerInfo(`layer-${i}`)?.face, i)
    const png = await page.screenshot({ clip: head })
    await page.screenshot({ path: `${SHOTS}/12-face-${ms}.png`, clip: head })
    return { info, png: png.toString('base64') }
  }
  const a = await faceAt(500), b = await faceAt(1900), c = await faceAt(2500), d = await faceAt(4000)
  expect.soft(a.info).toBe('angry')
  expect.soft(b.info).toBe('angry')
  expect.soft(c.info).toBe('amazed')
  expect.soft(d.info).toBe('amazed')
  expect.soft(a.png === c.png, 'the stage draws a different face after 2 s').toBe(false)
  // undo takes the last face key (Angry back to Sad), the keyboard on the page, not in a field
  await page.waitForTimeout(3000)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur?.())
  await page.keyboard.press('ControlOrMeta+z')
  await page.waitForTimeout(3500)
  const keys3 = await page.evaluate((i) => (window as any).__timelineKeying.layerKeys(`s25:layer-${i}`), i)
  expect.soft(keys3.filter((k: any) => k.face).map((k: any) => [k.t, k.face]), 'undo: Sad again at 0').toEqual([[0, 'sad'], [2, 'amazed']])
  // the timeline's own Expression row: a select that shows the face at the playhead and keys a new one there
  await seek(page, 3000)
  const toggle2 = page.locator(`[data-timeline-toggle="s25:layer-${i}"]`)
  if (await toggle2.getAttribute('aria-expanded') !== 'true') await toggle2.click()
  await page.waitForTimeout(500)
  const picker = page.locator(`[data-timeline-face]`).filter({ has: page.locator('option') }).first()
  const sec = page.locator(`[data-timeline-section="s25:layer-${i}#face"]`)
  if (await sec.count() && !await picker.isVisible()) await sec.click()
  await page.waitForTimeout(400)
  await expect.soft(picker, 'an Expression select on the figure\'s timeline row').toBeVisible()
  if (await picker.isVisible()) {
    expect.soft(await picker.inputValue(), 'the row shows the face at 3 s').toBe('amazed')
    await picker.click()
    await picker.selectOption('curious')
    await page.waitForTimeout(1500)
    const keys4 = await page.evaluate((i) => (window as any).__timelineKeying.layerKeys(`s25:layer-${i}`), i)
    expect.soft(keys4.filter((k: any) => k.face).map((k: any) => [k.t, k.face]), 'picking Curious keys it at 3 s').toEqual([[0, 'sad'], [2, 'amazed'], [3, 'curious']])
    expect.soft(await page.locator(`[data-timeline-diamond="s25:layer-${i}:face"]`).count(), 'three diamonds on the Expression lane').toBe(3)
    await shot(page, '12-timeline-expression', (await page.locator('[data-timeline-tracks]').boundingBox())!)
    await seek(page, 1000)
    expect.soft(await picker.inputValue(), 'scrubbed to 1 s the row shows Sad').toBe('sad')
    expect.soft(await page.evaluate((i) => (window as any).__stage25d.layerInfo(`layer-${i}`)?.face, i), 'the stage face at 1 s').toBe('sad')
    await seek(page, 3500)
    expect.soft(await page.evaluate((i) => (window as any).__stage25d.layerInfo(`layer-${i}`)?.face, i), 'the stage face at 3.5 s').toBe('curious')
    const dup2 = await page.evaluate((i) => {
      const el = document.querySelector('[data-timeline-tracks]')?.closest('[x-data]') as any
      return ((window as any).Alpine?.$data(el)?.tracks ?? []).filter((t: any) => String(t.target).endsWith(`layer-${i}`)).map((t: any) => `${t.target}/${t.property}`)
    }, i)
    expect.soft(dup2.length, `no duplicate tracks after the select: ${dup2.join(', ')}`).toBe(new Set(dup2).size)
  }
})

test('12b. Calm keyed on its own and keys cleared: the stage follows', async ({ page }) => {
  await load(page)
  const i = await ensureCharacter(page)
  expect(await selectLayer(page, i)).toBe(true)
  const section = page.locator('[data-stage25d-expression-section]')
  await seek(page, 1000)
  await section.locator('[data-stage25d-face="calm"]').click()
  await page.waitForTimeout(1200)
  await seek(page, 1200)
  expect.soft(await page.evaluate((i) => (window as any).__stage25d.layerInfo(`layer-${i}`)?.face, i)).toBe('calm')
  await expect.soft(section.locator('[data-stage25d-face="calm"]')).toHaveClass(/btn-neutral/)
})

test('13. animation preset: pick, Add; play moves the bones without errors; undo removes it', async ({ page }) => {
  await load(page)
  const i = await ensureCharacter(page)
  expect(await selectLayer(page, i)).toBe(true)
  const sec = page.locator('[data-stage25d-animation-section]')
  await expect(sec).toBeVisible()
  if (!await sec.locator('[data-animation-preset]').first().isVisible()) await sec.locator('button').first().click()
  await expect(sec.locator('[data-animation-preset]').first()).toBeVisible()
  const ids = await sec.locator('[data-animation-preset]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.animationPreset))
  const pick = ids.find((x) => /walk|wave/i.test(String(x))) ?? ids[0]
  await seek(page, 0)
  const keysBefore = (await layers(page))[i].keys.length
  await sec.locator(`[data-animation-preset="${pick}"]`).click()
  await page.waitForTimeout(1200)
  await sec.locator('[data-animation-add]').click()
  await page.waitForTimeout(2500)
  const keysAfter = (await layers(page))[i].keys
  expect(keysAfter.length, `preset ${pick} adds keys`).toBeGreaterThan(keysBefore)
  expect(keysAfter.some((k: any) => Object.keys(k).some((p) => p.startsWith('bone:'))), 'bone keys').toBe(true)
  test.info().annotations.push({ type: 'preset', description: `${pick}: ${keysBefore} -> ${keysAfter.length} keys` })
  // play: the bones change over time
  const samples: any[] = []
  await page.locator('[data-timeline-play]').click()
  for (let k = 0; k < 5; k++) {
    await page.waitForTimeout(350)
    samples.push(JSON.stringify(await tips(page)) + await page.evaluate((i) => JSON.stringify(['upperarm_n', 'upperarm_f', 'thigh_n', 'thigh_f', 'head', 'chest'].map((b) => (window as any).__stage25d.readLayerProp(`layer-${i}`, `bone:${b}`))), i))
  }
  await page.locator('[data-timeline-play]').click()
  expect.soft(new Set(samples).size, 'the figure moves while it plays').toBeGreaterThan(1)
  await shot(page, '13-preset', await stageCanvas(page))
  // undo removes it
  await page.waitForTimeout(3000)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur?.())
  await page.keyboard.press('ControlOrMeta+z')
  await page.waitForTimeout(2500)
  expect.soft((await layers(page))[i].keys.length, 'undo removes the preset').toBe(keysBefore)
  // add it again for the reload test
  await seek(page, 0)
  await sec.locator(`[data-animation-preset="${pick}"]`).click()
  await page.waitForTimeout(600)
  await sec.locator('[data-animation-add]').click()
  await page.waitForTimeout(2500)
})

test('15. reload: the character, pose, face and preset keys are still there and draw the same', async ({ page }) => {
  await load(page)
  const i = await chrLayer(page)
  expect(i, 'a character on the stage').toBeGreaterThanOrEqual(0)
  const before = (await layers(page))[i]
  await seek(page, 2500)
  const box1 = await layerBox(page, i, true)
  const j1 = await tips(page)
  const c = await stageCanvas(page)
  await shot(page, '15-before-reload', c)
  await page.reload()
  await page.waitForFunction(() => document.querySelector('[data-stage25d-ready="1"]') && (window as any).__stage25d?.config, undefined, { timeout: 180_000 })
  await page.waitForTimeout(1500)
  const after = (await layers(page))[i]
  expect(after.asset).toBe(before.asset)
  expect(after.keys, 'keys survive the reload').toEqual(before.keys)
  await seek(page, 2500)
  const box2 = await layerBox(page, i, true)
  const j2 = await tips(page)
  for (const [name, p] of Object.entries(j1)) expect.soft(Math.hypot((j2[name]?.[0] ?? 1e9) - (p as number[])[0], (j2[name]?.[1] ?? 1e9) - (p as number[])[1]), `joint ${name} at 2.5 s where it was`).toBeLessThan(2)
  expect.soft(Math.abs((box2?.h ?? 0) - (box1?.h ?? 0)), 'same box height').toBeLessThan(2)
  expect.soft(Math.abs((box2?.x ?? 0) - (box1?.x ?? 0)), 'same box x').toBeLessThan(2)
  await shot(page, '15-after-reload', c)
  if (SAVED) expect.soft(await page.evaluate((i) => (window as any).__stage25d.editTarget(`layer-${i}`)?.character?.recipe, i)).toEqual(SAVED.recipe)
})

test('13b. a long robe (Scribe, Naditu): walk and run only shuffle the legs under the hem, no foot in the air', async ({ page }) => {
  test.setTimeout(480_000)
  await load(page)
  for (const [body, preset] of [['Man', 'scribe'], ['Woman', 'naditu']] as const) {
    await openNew(page)
    await pickBody(page, body)
    await page.locator(`${P} [data-chr-preset="${preset}"]`).click()
    await settle(page)
    await saveWindow(page)
    const i = await chrLayer(page)
    const puppet = await page.evaluate((i) => (window as any).__stage25d.editTarget(`layer-${i}`).puppet, i)
    const lim = Object.fromEntries(puppet.bones.map((b: any) => [b.name, b.limit ?? null]))
    expect.soft(lim.shin_n, `${preset}: knee held to a shuffle`).toEqual([0, 8])
    expect.soft(lim.thigh_n, `${preset}: hip held to a shuffle`).toEqual([-6, 6])
    for (const move of ['walk', 'run']) {
      expect(await selectLayer(page, i), `${preset} selected`).toBe(true)
      const sec = page.locator('[data-stage25d-animation-section]')
      if (!await sec.locator('[data-animation-preset]').first().isVisible()) await sec.locator('button').first().click()
      await seek(page, 0)
      const restTips = await tips(page)
      const box = (await layerBox(page, i, true))!
      await sec.locator(`[data-animation-preset="${move}"]`).click()
      await page.waitForTimeout(500)
      await sec.locator('[data-animation-add]').click()
      await page.waitForTimeout(2500)
      // scrub through the move: each toe stays near the floor under the figure as it is now (the move travels, so the
      // measure is the toe's height over the bottom of the figure's own frame, against the same at rest)
      const frameNow = () => page.locator('[data-stage25d-selection]').evaluate((el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height } })
      const restFrame = await frameNow()
      const rise = (t: any, f: { y: number, h: number }, foot: string) => (f.y + f.h - t[foot][1]) / f.h
      const restRise = Object.fromEntries(['foot_n', 'foot_f'].filter((ft) => restTips[ft]).map((ft) => [ft, rise(restTips, restFrame, ft)]))
      let lift = 0, knee = 0
      for (let ms = 0; ms <= 3000; ms += 250) {
        await seek(page, ms)
        const t = await tips(page)
        const f = await frameNow()
        for (const ft of Object.keys(restRise)) if (t[ft]) lift = Math.max(lift, rise(t, f, ft) - restRise[ft])
        // the bend the stage draws: the angle between thigh (hip to knee) and shin (knee to ankle) handles is not readable
        // without a knee handle, so the shin's turn against its own rest direction (ankle about the knee point) stands in
        for (const side of ['n', 'f']) {
          const a = t[`shin_${side}`], r = restTips[`shin_${side}`]
          if (a && r) knee = Math.max(knee, Math.abs(a[0] - r[0] - (f.x - restFrame.x)) / f.h * 100)
        }
        if (ms % 750 === 0) await shot(page, `13b-${preset}-${move}-${ms}`, { x: Math.round(Math.max(0, f.x - 30)), y: Math.round(f.y + f.h * 0.5), width: Math.round(f.w + 60), height: Math.round(f.h * 0.55) })
      }
      test.info().annotations.push({ type: `${preset} ${move}`, description: `foot lift ${(lift * 100).toFixed(1)}% of height, ankle swing ${knee.toFixed(1)}% of height` })
      console.log(`${preset} ${move}: foot lift ${(lift * 100).toFixed(1)}% of height, ankle swing ${knee.toFixed(1)}% of height`)
      // the frame changes with the pose and the move travels, so both numbers carry a few % of noise: the screenshots judge
      expect.soft(lift, `${preset} ${move}: no foot in the air (lift as share of height)`).toBeLessThan(0.08)
      // back to no keys for the next move
      await page.evaluate(() => (document.activeElement as HTMLElement)?.blur?.())
      await page.waitForTimeout(2500)
      await page.keyboard.press('ControlOrMeta+z')
      await page.waitForTimeout(2500)
    }
  }
})

test('16. sizes and words in the Character tab: no text under 12 px, controls 32 or 44, no em dash or emoji', async ({ page }) => {
  await load(page)
  await openNew(page)
  const CONTROLS = 'button, select, input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="color"]):not([type="hidden"]), [role="tab"], label.tab, .tabs > input.tab'
  const EXEMPT = '[data-chr-tile], [data-chr-preset], .pointer-events-none'
  const found: string[] = []
  const words: string[] = []
  for (const part of ['who', 'body', 'face', 'hair', 'clothes', 'extra']) {
    for (const body of ['Girl', 'Man'] as const) {
      await rail(page, 'who')
      await pickBody(page, body)
      await rail(page, part)
      await page.waitForTimeout(300)
      const r = await page.evaluate(([controls, exempt, tag]) => {
        const root = document.querySelector('[data-cutout]')!
        const bad: string[] = []
        for (const el of root.querySelectorAll(controls)) {
          const r = el.getBoundingClientRect()
          const s = getComputedStyle(el)
          if (!r.width || !r.height || s.visibility === 'hidden' || s.display === 'none' || el.closest('[inert]') || el.closest('[hidden]') || el.matches(exempt)) continue
          const h = Math.round(r.height)
          if (h !== 32 && h !== 44) bad.push(`${tag}: ${h}px ${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40)}"`)
        }
        const small: string[] = []
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const el = n.parentElement!
          if (!n.textContent!.trim() || el.closest('[hidden]')) continue
          const s = getComputedStyle(el)
          if (s.display === 'none' || s.visibility === 'hidden' || !el.getBoundingClientRect().width) continue
          if (parseFloat(s.fontSize) < 12) small.push(`${tag}: ${s.fontSize} "${n.textContent!.trim().slice(0, 30)}"`)
        }
        const text = [root.textContent ?? '', ...[...root.querySelectorAll('[aria-label],[data-tooltip],[placeholder]')].flatMap((e) => [e.getAttribute('aria-label'), e.getAttribute('data-tooltip'), e.getAttribute('placeholder')])].join(' ')
        const dash = /[—–]|\p{Extended_Pictographic}/u.exec(text)
        return { bad, small, dash: dash ? `${tag}: "${text.slice(Math.max(0, dash.index - 20), dash.index + 20)}"` : null }
      }, [CONTROLS, EXEMPT, `${body}/${part}`] as const)
      found.push(...r.bad, ...r.small)
      if (r.dash) words.push(r.dash)
    }
  }
  // the hover label
  const at = await findPart(page, 'Clothes', [0.3, 0.7], [0.35, 0.65])
  if (at) {
    const fs = await page.locator(`${V} [data-chr-hover]`).evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    if (fs < 12) found.push(`hover label ${fs}px`)
  }
  expect.soft([...new Set(found)], 'sizes').toEqual([])
  expect.soft([...new Set(words)], 'no em dash or emoji').toEqual([])
  await leaveDiscard(page)
})

test('17. Dutch: every new string is in lang/nl.json, and with the teacher on nl the tab shows Dutch labels', async ({ page }) => {
  const nl = JSON.parse(readFileSync('lang/nl.json', 'utf8'))
  const kit = JSON.parse(readFileSync('public/character-kits/babylonia-old-babylonian/v1/kit.json', 'utf8'))
  const words = ['Character', 'Who', 'Body', 'Face', 'Hair', 'Clothes', 'Extra', 'Random', 'Whole figure', 'Expression', 'Calm', 'Curious', 'Sad', 'Angry', 'Amazed',
    'Name', 'People of this time', 'Skin', 'Eyes', 'Mouth', 'Hair colour', 'Beard', 'Headwear', 'Jewellery', 'None', 'Own eyes', 'Own mouth', 'No hair', 'No beard',
    'Nothing on the head', 'Cloth', 'Shawl', 'Cord', 'Apron', 'Band', 'Trim', 'Girl', 'Woman', 'Man', 'New character', 'My characters', 'Remove from My characters',
    'Removed from My characters.', 'Own character', 'Animation', 'Add at playhead', 'Head cloth',
    ...kit.presets.map((p: any) => p.label), ...kit.bodies.flatMap((b: any) => b.pieces.filter((p: any) => p.slot !== 'expression').map((p: any) => p.label))]
  const missing = [...new Set(words)].filter((w) => !(w in nl))
  expect.soft(missing, 'missing in lang/nl.json').toEqual([])
  // the teacher's language to nl for this test only (local database), back to what it was after
  const tinker = (php: string) => execSync(`php artisan tinker --execute=${JSON.stringify(php)}`, { encoding: 'utf8' }).trim().split('\n').at(-1)
  const was = tinker('echo App\\Models\\User::where("email","teacher@example.com")->value("locale") ?? "en";')
  try {
    tinker('App\\Models\\User::where("email","teacher@example.com")->update(["locale" => "nl"]); echo "ok";')
    await load(page)
    await page.getByRole('tab', { name: 'Assets', exact: true }).click().catch(() => {})
    await page.locator('[data-new-character]').click()
    await page.waitForSelector('[data-cutout]')
    await page.waitForFunction(() => document.querySelector('[data-chr-loading]')?.hasAttribute('hidden'), undefined, { timeout: 60_000 })
    await settle(page)
    const english: string[] = []
    const seen = async (tag: string) => {
      const labels = await page.locator('[data-cutout]').evaluate((root) => [root.querySelector('[data-cut-title]')?.textContent,
        ...[...root.querySelectorAll('h3, [data-chr-expression], [data-chr-rail], [data-chr-random], [data-chr-body], [data-chr-preset], [data-chr-tile], [data-chr-colour], .uppercase')]
          .map((e) => e.getAttribute('aria-label') || e.textContent)].map((s) => (s ?? '').trim()).filter(Boolean))
      for (const l of labels) if (l in nl && nl[l] !== l) english.push(`${tag}: "${l}"`)
    }
    for (const part of ['who', 'body', 'face', 'hair', 'clothes', 'extra']) { await rail(page, part); await seen(part) }
    await shot(page, '17-dutch')
    expect.soft([...new Set(english)], 'English labels on a Dutch page').toEqual([])
    await leaveDiscard(page)
  } finally {
    tinker(`App\\Models\\User::where("email","teacher@example.com")->update(["locale" => "${was || 'en'}"]); echo "ok";`)
  }
})

test('99. clean up: the characters this spec saved leave the shelf (scenes keep showing them)', async ({ page }) => {
  await load(page)
  // what this throwaway lesson's scene shows was made by this spec (character-tab-lesson.php makes the lesson fresh)
  const mine = new Set((await layers(page)).map((l: any) => l.asset).filter((a: string) => /^chr-\d+$/.test(String(a))))
  for (const id of CREATED) mine.add(id)
  await page.getByRole('tab', { name: 'Assets', exact: true }).click()
  const kinds = page.locator('[data-stage25d-assets] button.btn-xs', { hasText: 'My characters' })
  if (await kinds.count()) await kinds.first().click()
  for (const id of mine) {
    const tile = page.locator(`[data-stage25d-tile="${id}"]`)
    if (!await tile.count()) continue
    await tile.hover()
    await tile.locator('xpath=..').locator('button[aria-label="Remove from My characters"]').click()
    await expect(tile).toHaveCount(0, { timeout: 10_000 })
  }
  const left = (await shelf(page)).map((a: any) => a.id).filter((id: string) => mine.has(id))
  expect(left, 'none of this spec\'s characters left on the shelf').toEqual([])
})
