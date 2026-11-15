/**
 * Fresh-tester checks of the animation preset library in the editor (lesson 441, scene 16038: flat-sheet Ana layer-6,
 * kit Scribe layer-7). Muted (stage-capture muted). Writes findings to tests/playwright/results/animation-presets-tester.jsonl.
 *
 *   PW_BASE_URL=http://localhost:8062 npx playwright test tests/playwright/animation-presets.spec.ts --project=chromium
 */
import { test, expect } from '@playwright/test'
import { captureFigure } from './stage-capture'
import { FIGS as ALL_FIGS, PRESETS, BONES, clearKeys, layerKeys, log, meshOf, openEditor, pose, saveWebp, seekStage, seekTimeline, selectFigure, stageKeys, watchConsole } from './animation-presets-support'


/** PW_FIGS=ana runs on Ana only (a regression pass). */
const FIGS = ALL_FIGS.filter((f) => !process.env.PW_FIGS || process.env.PW_FIGS.split(',').includes(f.name))

test('1a. every preset previews on both figures, stops clean, saves nothing', async ({ page }) => {
  test.setTimeout(600_000)
  const errors = watchConsole(page)
  await openEditor(page)
  for (const fig of FIGS) await clearKeys(page, fig.id)
  let posts = 0
  page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('livewire')) posts++ })
  const results: any[] = []
  for (const fig of FIGS) {
    const section = await selectFigure(page, fig.id)
    await seekTimeline(page, 0)
    const rest = await pose(page, fig.id)
    for (const id of PRESETS) {
      const before = errors.length
      const postsBefore = posts
      const tile = section.locator(`[data-animation-preset="${id}"]`)
      await tile.click()
      await page.waitForTimeout(80)
      const samples = []
      for (let i = 0; i < 8; i++) { samples.push(await pose(page, fig.id)); await page.waitForTimeout(140) }
      const changed = BONES.filter((b) => new Set(samples.map((s) => s[b])).size > 1)
      const tMoves = new Set(samples.map((s) => s.t.toFixed(2))).size
      const previewing = await tile.locator('span').first().evaluate((e) => e.className.includes('animate-pulse'))
      const keysDuring = (await stageKeys(page, fig.id)).length
      await tile.click()   // stop
      await page.waitForTimeout(200)
      const after = await pose(page, fig.id)
      const keysAfter = (await stageKeys(page, fig.id)).length
      const timelineKeysAfter = (await layerKeys(page, fig.id)).length
      const backToRest = BONES.every((b) => Math.abs((after[b] ?? 0) - (rest[b] ?? 0)) < 1e-6) && Math.abs(after.y - rest.y) < 1e-6 && Math.abs(after.x - rest.x) < 1e-6
      const r = { fig: fig.name, id, changed, tMoves, previewing, keysDuring, keysAfter, timelineKeysAfter, backToRest, errors: errors.slice(before), postsDuringPreview: posts - postsBefore, xRange: [Math.min(...samples.map((s) => s.x)), Math.max(...samples.map((s) => s.x))], yRange: [Math.min(...samples.map((s) => s.y)), Math.max(...samples.map((s) => s.y))] }
      results.push(r)
      expect.soft(changed.length, `${fig.name}/${id}: bones change during preview`).toBeGreaterThan(0)
      expect.soft(keysAfter, `${fig.name}/${id}: preview leaves no keys on the stage`).toBe(0)
      expect.soft(backToRest, `${fig.name}/${id}: stop restores the rest pose`).toBe(true)
      expect.soft(r.errors, `${fig.name}/${id}: console`).toEqual([])
    }
  }
  log('preview', results)
  expect.soft(posts, 'previews saved nothing').toBe(0)
})

test('1b. Add writes keys for every preset on both figures; travel goes the way the figure faces', async ({ page }) => {
  test.setTimeout(900_000)
  const errors = watchConsole(page)
  await openEditor(page)
  const results: any[] = []
  for (const fig of FIGS) {
    await clearKeys(page, fig.id)
    const section = await selectFigure(page, fig.id)
    const info = await page.evaluate((id) => { const i = (window as any).__stage25d.layerInfo(id); return { facing: i.facing, heightM: i.heightM, viewWidth: i.viewWidth, bones: i.bones, x: (window as any).__stage25d.readLayerProp(id, 'x') } }, fig.id)
    const dur = await page.evaluate(() => (window as any).__timelineKeying.duration())
    for (const id of PRESETS) {
      await seekTimeline(page, 0)
      await section.locator(`[data-animation-preset="${id}"]`).click()
      const hint = await section.locator('p.text-xs').last().textContent()
      const saved = page.waitForResponse((r) => r.url().includes('livewire') && r.request().method() === 'POST', { timeout: 15_000 }).catch(() => null)
      await section.locator('[data-animation-add]').click()
      await saved
      await page.waitForTimeout(300)
      const keys = await layerKeys(page, fig.id)
      const sk = await stageKeys(page, fig.id)
      const fields = [...new Set(keys.flatMap((k: any) => Object.keys(k)))].sort()
      const eases = [...new Set(keys.map((k: any) => k.ease ?? '-'))]
      const xs = keys.filter((k: any) => k.x !== undefined).map((k: any) => k.x)
      const ys = keys.filter((k: any) => k.y !== undefined).map((k: any) => k.y)
      const faces = [...new Set(keys.map((k: any) => k.face).filter(Boolean))]
      const r = { fig: fig.name, id, hint, n: keys.length, stageN: sk.length, t: [keys[0]?.t, keys.at(-1)?.t], fields, eases, lastEase: keys.at(-1)?.ease ?? null, x: xs.length ? [xs[0], xs.at(-1)] : null, y: ys.length ? [Math.min(...ys), Math.max(...ys)] : null, faces, sameAsStage: JSON.stringify(keys) === JSON.stringify(sk) }
      results.push(r)
      expect.soft(keys.length, `${fig.name}/${id}: Add wrote keys`).toBeGreaterThan(1)
      expect.soft(r.sameAsStage, `${fig.name}/${id}: stage holds the timeline's keys`).toBe(true)
      if (['clap', 'dance_sway', 'shiver', 'dance_hop', 'cheer', 'jump'].includes(id)) expect.soft(xs.length, `${fig.name}/${id}: an in-place preset writes no x`).toBe(0)
      if (['walk', 'run', 'carry'].includes(id)) expect.soft(Math.sign(xs.at(-1) - xs[0]), `${fig.name}/${id}: travels the way it faces`).toBe(info.facing)
      await clearKeys(page, fig.id)
    }
    log('add-info', { fig: fig.name, info, dur })
  }
  log('add', results)
  expect.soft(errors).toEqual([])
})

/** Stills for the eye: Add the preset at 0 and pose the stage at times through it. */
/** STILL_SUFFIX=-v2 names a re-check round's stills apart from the first round's. */
const SUFFIX = process.env.STILL_SUFFIX ?? ''
const STILLS: Record<string, number[]> = {
  walk: [0, 0.14, 0.28, 0.42, 0.5, 0.64, 0.79],
  run: [0, 0.09, 0.18, 0.27, 0.32, 0.41, 0.52],
  sit_down: [0, 0.5, 1.1, 1.65, 2.1, 2.6],
  jump: [0, 0.25, 0.48, 0.68, 0.94, 1.15],
  pick_up: [0, 0.5, 1.12, 1.46, 2.18, 2.8],
  stand_up: [0, 0.4, 0.86, 1.4, 1.8],
  fall_get_up: [0, 0.43, 0.94, 1.44, 1.91, 2.52, 3.1, 3.6],
  dance_hop: [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2],
}

test('2. side-view stills of the leg/arm presets (WebP for the eye)', async ({ page }) => {
  test.setTimeout(900_000)
  await openEditor(page)
  const paths: string[] = []
  for (const fig of FIGS) {
    const mesh = await meshOf(page, fig.id)
    await clearKeys(page, fig.id)
    const section = await selectFigure(page, fig.id)
    await page.evaluate(() => (window as any).__stage25d.clearSelection())   // no selection box over the figure
    await seekStage(page, 0)
    paths.push(saveWebp(await captureFigure(page, mesh!), `${fig.name}-rest${SUFFIX}`))
    for (const [id, times] of Object.entries(STILLS)) {
      await selectFigure(page, fig.id)
      await seekTimeline(page, 0)
      await section.locator(`[data-animation-preset="${id}"]`).click()
      await section.locator('[data-animation-add]').click()
      await page.waitForTimeout(600)
      await page.evaluate(() => (window as any).__stage25d.clearSelection())
      for (const t of times) {
        await seekStage(page, t)
        paths.push(saveWebp(await captureFigure(page, mesh!), `${fig.name}-${id}-${t.toFixed(2)}s${SUFFIX}`))
      }
      await clearKeys(page, fig.id)
    }
  }
  log('stills', paths)
})
