/**
 * Fresh-tester checks, part 2: edit/delete a key after Add, undo/redo, reload persistence, loop seams on the saved keys,
 * picker UI rules and the preview's stop rules. Lesson 441 scene 16038, the kit Scribe (layer-7) unless named.
 *
 *   PW_BASE_URL=http://localhost:8062 npx playwright test tests/playwright/animation-presets-edit.spec.ts --project=chromium
 */
import { test, expect, Page } from '@playwright/test'
import { BONES, clearKeys, layerKeys, log, openEditor, pose, seekStage, seekTimeline, selectFigure, stageKeys, watchConsole } from './animation-presets-support'

/** PW_FIG=layer-6 runs these on Ana (round 3's regression pass); the kit Scribe by default. */
const FIG = process.env.PW_FIG ?? 'layer-7'
const T = `s25:${FIG}`

async function addPreset (page: Page, id: string, at = 0, speed?: number) {
  const section = await selectFigure(page, FIG)
  await seekTimeline(page, at)
  await section.locator(`[data-animation-preset="${id}"]`).click()
  if (speed) await section.locator(`[data-animation-speed="${speed}"]`).click()
  const saved = page.waitForResponse((r) => r.url().includes('livewire') && r.request().method() === 'POST', { timeout: 15_000 }).catch(() => null)
  await section.locator('[data-animation-add]').click()
  await saved
  await page.waitForTimeout(800)
  return section
}

const sampleAt = async (page: Page, times: number[]) => {
  const out = []
  for (const t of times) { await seekStage(page, t); out.push(await pose(page, FIG)) }
  return out
}

test('4+6. edit and delete a key after Add; everything survives a reload and plays the same', async ({ page }) => {
  test.setTimeout(240_000)
  const errors = watchConsole(page)
  await openEditor(page)
  await clearKeys(page, FIG)
  await addPreset(page, 'walk', 0)
  const added = await layerKeys(page, FIG)
  const times = [0.1, 0.5, 1.0, 1.37, 2.0, 3.3, 5.05]
  const before = await sampleAt(page, times)
  await page.reload({ waitUntil: 'load' })
  await page.waitForFunction(() => (window as any).__timelineKeying?.layerKeys && (window as any).__stage25d?.items?.().length, null, { timeout: 60_000 })
  await page.waitForTimeout(2500)
  const reloaded = await layerKeys(page, FIG)
  const after = await sampleAt(page, times)
  const smoothAfter = reloaded.filter((k: any) => k.ease === 'smooth').length
  log('reload', { added: added.length, reloaded: reloaded.length, smoothBefore: added.filter((k: any) => k.ease === 'smooth').length, smoothAfter, same: JSON.stringify(added) === JSON.stringify(reloaded), before, after })
  expect.soft(reloaded.length, 'same number of keys after reload').toBe(added.length)
  expect.soft(smoothAfter, 'ease smooth survives the reload').toBe(added.length - 1)
  for (let i = 0; i < times.length; i++) for (const b of BONES) expect.soft(Math.abs((after[i][b] ?? 0) - (before[i][b] ?? 0)), `pose ${b}@${times[i]} same after reload`).toBeLessThan(0.05)

  // loop seams on the saved keys: velocity either side of each cycle boundary (walk, 1 s cycles from 0)
  const seams = await page.evaluate(({ id, bones }) => {
    const st = (window as any).__stage25d
    const at = (t: number) => { st.update(t); const o: Record<string, number> = {}; for (const b of bones) o[b] = st.readLayerProp(id, `bone:${b}`); o.y = st.readLayerProp(id, 'y'); o.x = st.readLayerProp(id, 'x'); return o }
    // velocity either side of each boundary vs the same measure half a cycle later: a seam must be no worse than mid-cycle
    const e = 1e-4, rows: any[] = []
    const jump = (ts: number) => {
      const a = at(ts - 2 * e), b = at(ts - e), c = at(ts + e), d = at(ts + 2 * e)
      let worst = { f: '', dv: 0, vL: 0, vR: 0, pop: 0 }
      for (const f of Object.keys(a)) { const vL = (b[f] - a[f]) / e, vR = (d[f] - c[f]) / e; const dv = Math.abs(vL - vR); if (dv > worst.dv) worst = { f, dv, vL, vR, pop: Math.abs(c[f] - b[f]) } }
      return worst
    }
    for (const ts of [1, 2]) rows.push({ ts, seam: jump(ts), mid: jump(ts + 0.5) })
    return rows
  }, { id: FIG, bones: BONES })
  log('seams-browser-walk', seams)
  for (const s of seams) expect.soft(s.seam.dv, `walk seam at ${s.ts}s: ${s.seam.f} velocity jump`).toBeLessThan(Math.max(5, 3 * s.mid.dv))

  // edit thigh_n at a real key time through the timeline, as the Format panel does (key times depend on the scene's length)
  const ks = await layerKeys(page, FIG)
  const TE = ks[9].t, TD = ks[16].t
  await seekTimeline(page, TE)
  const wasAt = ks[9]
  const edited = await page.evaluate((T) => (window as any).__timelineKeying.edit(T, 'bone:thigh_n', 10, { flush: true }), T)
  const stageGone = await page.evaluate(() => !(window as any).__stage25d)
  await page.waitForFunction(() => (window as any).__stage25d?.items?.().length, null, { timeout: 30_000 })
  await page.waitForTimeout(1500)
  const keyAfterEdit = (await layerKeys(page, FIG)).find((k: any) => Math.abs(k.t - TE) < 1e-6)
  await seekStage(page, TE)
  const shown = await pose(page, FIG)
  // delete the shin_n key at 2.14 s through the timeline's own selection
  const del = await page.evaluate(({ T, TD }) => {
    const c = (document.querySelector('[data-timeline]') as any)._x_dataStack[0]
    const track = c.tracks.find((t: any) => t.target === T && t.property === 'bone:shin_n')
    const k = track.keyframes.find((k: any) => Math.abs(k.time - TD) < 1e-6)
    c.selected = [`${T}|bone:shin_n|${k.time}`]
    c.deleteSelected()
    return { before: track.keyframes.length, after: c.tracks.find((t: any) => t.target === T && t.property === 'bone:shin_n').keyframes.length }
  }, { T, TD })
  await page.waitForTimeout(1500)
  await page.reload({ waitUntil: 'load' })
  await page.waitForFunction(() => (window as any).__timelineKeying?.layerKeys && (window as any).__stage25d?.items?.().length, null, { timeout: 60_000 })
  await page.waitForTimeout(2500)
  const final = await layerKeys(page, FIG)
  const k128 = final.find((k: any) => Math.abs(k.t - TE) < 1e-6)
  const k214 = final.find((k: any) => Math.abs(k.t - TD) < 1e-6)
  const playing = await sampleAt(page, [-0.25, -0.15, -0.05, 0, 0.05, 0.15, 0.25].map((d) => TD + d))
  log('edit-delete', { TE, TD, stageGone, edited, wasAt, keyAfterEdit, shown: shown.thigh_n, del, k128, k214, shinAroundDeleted: playing.map((p) => [p.t, p.shin_n, p.thigh_n]) })
  expect.soft(edited, 'edit took the keyed path').toBe(true)
  expect.soft(k128?.['bone:thigh_n'], 'edited value saved').toBe(10)
  expect.soft(k128?.ease, 'edited key keeps ease smooth').toBe('smooth')
  expect.soft(k214?.['bone:shin_n'], 'deleted shin key gone').toBeUndefined()
  expect.soft(k214?.['bone:thigh_n'], 'other fields at that time stay').toBeDefined()
  expect.soft(new Set(playing.map((p) => p.shin_n)).size, 'shin still moves around the deleted key').toBeGreaterThan(3)
  expect.soft(errors).toEqual([])
})

test('5. Cmd+Z takes back exactly the Add; Cmd+Shift+Z restores it', async ({ page }) => {
  test.setTimeout(180_000)
  const errors = watchConsole(page)
  await openEditor(page)
  await clearKeys(page, FIG)
  await addPreset(page, 'wave', 1)
  const added = await layerKeys(page, FIG)
  const otherBefore = await layerKeys(page, 'layer-6')
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur?.())
  const focus = await page.evaluate(() => document.activeElement?.tagName)
  await page.keyboard.press('Meta+z')
  await page.waitForFunction((id) => (window as any).__timelineKeying.layerKeys(`s25:${id}`).length === 0, FIG, { timeout: 15_000 }).catch(() => null)
  await page.waitForTimeout(1000)
  const undone = await layerKeys(page, FIG)
  const undoneStage = await stageKeys(page, FIG)
  const url1 = page.url()
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur?.())
  await page.keyboard.press('Meta+Shift+z')
  await page.waitForFunction((id) => (window as any).__timelineKeying.layerKeys(`s25:${id}`).length > 0, FIG, { timeout: 15_000 }).catch(() => null)
  await page.waitForTimeout(1000)
  const redone = await layerKeys(page, FIG)
  const otherAfter = await layerKeys(page, 'layer-6')
  log('undo', { added: added.length, focus, undone: undone.length, undoneStage: undoneStage.length, redone: redone.length, redoSame: JSON.stringify(redone) === JSON.stringify(added), url: [url1, page.url()], otherSame: JSON.stringify(otherBefore) === JSON.stringify(otherAfter) })
  expect.soft(undone.length, 'undo removes the Add').toBe(0)
  expect.soft(undoneStage.length, 'stage follows the undo').toBe(0)
  expect.soft(redone, 'redo restores it').toEqual(added)
  expect.soft(page.url()).toContain('/wizard')
  expect.soft(errors).toEqual([])
})

test('9. picker UI rules: sizes, text, no dash/emoji, hint', async ({ page }) => {
  test.setTimeout(120_000)
  await openEditor(page)
  const section = await selectFigure(page, FIG)
  await section.locator('[data-animation-preset="walk"]').click()
  await page.waitForTimeout(300)
  const loopHint = await section.locator('p.text-xs').last().textContent()
  await section.locator('[data-animation-preset="wave"]').click()
  await page.waitForTimeout(300)
  const onceHint = await section.locator('p.text-xs').last().textContent()
  await section.locator('[data-animation-preset="idle"]').click()
  await page.waitForTimeout(300)
  const repeatHint = await section.locator('p.text-xs').last().textContent()
  await section.locator('[data-animation-preset="idle"]').click()
  const m = await section.evaluate((root) => {
    const vis = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
    const h = (sel: string) => [...root.querySelectorAll(sel)].filter(vis).map((e) => Math.round(e.getBoundingClientRect().height * 10) / 10)
    const texts = [...root.querySelectorAll('*')].filter((e) => vis(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))
    const fonts = texts.map((e) => ({ t: e.textContent!.trim().slice(0, 30), px: parseFloat(getComputedStyle(e).fontSize) }))
    const all = (root as HTMLElement).innerText
    return {
      tiles: [...new Set(h('[data-animation-preset]'))], speed: [...new Set(h('[data-animation-speed]'))], add: h('[data-animation-add]'), header: h(':scope > button'),
      small: fonts.filter((f) => f.px < 12), dashes: /[–—]/.test(all), emoji: /\p{Extended_Pictographic}/u.test(all), text: all,
      truncated: [...root.querySelectorAll('[data-animation-preset] .truncate')].filter((e) => (e as HTMLElement).scrollWidth > (e as HTMLElement).clientWidth).map((e) => e.textContent),
    }
  })
  log('ui', { ...m, loopHint, onceHint, repeatHint })
  for (const v of [...m.tiles, ...m.speed, ...m.add]) expect.soft([32, 44], `control height ${v}`).toContain(v)
  expect.soft(m.small, 'text >= 12 px').toEqual([])
  expect.soft(m.dashes).toBe(false)
  expect.soft(m.emoji).toBe(false)
  expect.soft(loopHint?.trim(), 'walk hint').toBe('Walks a few steps, up to the end of the scene')
  expect.soft(onceHint?.trim(), 'wave hint').toBe('Plays once, 2.8 s')
  expect.soft(repeatHint?.trim(), 'idle hint').toBe('Repeats to the end of the scene')
})

test('10. preview stops: section closes, playback starts, layer switch, scrub; speed; Add past the scene end', async ({ page }) => {
  test.setTimeout(240_000)
  const errors = watchConsole(page)
  await openEditor(page)
  await clearKeys(page, FIG)
  await clearKeys(page, 'layer-6')
  const res: Record<string, unknown> = {}
  const running = async () => { const a = await page.evaluate(() => (window as any).__stage25d.time); await page.waitForTimeout(700); const b = await page.evaluate(() => (window as any).__stage25d.time); return a !== b }
  let section = await selectFigure(page, FIG)
  await seekTimeline(page, 0)

  // close the section
  await section.locator('[data-animation-preset="walk"]').click()
  await page.waitForTimeout(400)
  await section.locator('> button').first().click()
  await page.waitForTimeout(400)
  res.closeSection = { stageKeys: (await stageKeys(page, FIG)).length, running: await running() }

  // playback starts
  await section.locator('> button').first().click()
  await section.locator('[data-animation-preset="walk"]').click()
  await page.waitForTimeout(400)
  await page.evaluate(() => (window as any).__timelineKeying.play())
  await page.waitForTimeout(600)
  const pulse = await section.locator('[data-animation-preset="walk"] span').first().evaluate((e) => e.className.includes('animate-pulse'))
  await page.evaluate(() => (window as any).__timelineKeying.pause())
  res.playback = { stageKeys: (await stageKeys(page, FIG)).length, stillPulsing: pulse }
  await seekTimeline(page, 0)

  // scrub the timeline while previewing
  await section.locator('[data-animation-preset="run"]').click()
  await page.waitForTimeout(400)
  await seekTimeline(page, 3)
  await page.waitForTimeout(500)
  res.scrub = { stageTime: await page.evaluate(() => (window as any).__stage25d.time), stageKeys: (await stageKeys(page, FIG)).length, running: await running(),
    pulse: await section.locator('[data-animation-preset="run"] span').first().evaluate((e) => e.className.includes('animate-pulse')).catch(() => 'gone') }
  await section.locator('[data-animation-preset="run"]').click().catch(() => {})
  await seekTimeline(page, 0)

  // switch to the other figure while previewing
  section = await selectFigure(page, FIG)
  await section.locator('[data-animation-preset="dance_hop"]').click()
  await page.waitForTimeout(400)
  await selectFigure(page, 'layer-6')
  await page.waitForTimeout(800)
  res.layerSwitch = { scribeStageKeys: (await stageKeys(page, FIG)).length, running: await running() }
  await page.evaluate(() => (window as any).__timelineKeying.refresh())

  // speed: a once clip at Fast is 1/1.5 as long; a loop at Slow
  await addPreset(page, 'wave', 0, 1.5)
  const fastWave = await layerKeys(page, FIG)
  res.fastWave = { lastT: fastWave.at(-1)?.t, expect: Math.round((2.8 / 1.5) * 1000) / 1000, hint: await page.locator(`[data-stage25d-inspector="${FIG}"] [data-stage25d-animation-section] p.text-xs`).last().textContent() }
  await clearKeys(page, FIG)
  await addPreset(page, 'walk', 0, 0.75)
  const slowWalk = await layerKeys(page, FIG)
  res.slowWalk = { n: slowWalk.length, lastT: slowWalk.at(-1)?.t, firstCycleEnd: slowWalk.find((k: any) => k.t > 0.9 && k.t < 1.6)?.t }
  await clearKeys(page, FIG)
  await addPreset(page, 'run', 2)
  const run = await layerKeys(page, FIG)
  res.run = { n: run.length, t: [run[0]?.t, run.at(-1)?.t], expectEnd: 2 + 3 * 0.64 }
  await clearKeys(page, FIG)

  // a once clip past the scene's end (fall_get_up 3.6 s at 6 s): what is saved?
  const dur = await page.evaluate(() => (window as any).__timelineKeying.duration())
  await addPreset(page, 'fall_get_up', 6)
  const late = await layerKeys(page, FIG)
  await page.reload({ waitUntil: 'load' })
  await page.waitForFunction(() => (window as any).__timelineKeying?.layerKeys && (window as any).__stage25d?.items?.().length, null, { timeout: 60_000 })
  await page.waitForTimeout(2500)
  const lateSaved = await layerKeys(page, FIG)
  res.pastEnd = { dur, durAfter: await page.evaluate(() => (window as any).__timelineKeying.duration()), times: late.map((k: any) => k.t), savedTimes: lateSaved.map((k: any) => k.t) }
  await clearKeys(page, FIG)
  log('stop-rules', res)
  expect.soft((res.closeSection as any).running, 'closing the section stops the preview').toBe(false)
  expect.soft((res.playback as any).stillPulsing, 'playback stops the preview').toBe(false)
  expect.soft((res.layerSwitch as any).running, 'switching figure stops the preview').toBe(false)
  expect.soft((res.fastWave as any).lastT).toBeCloseTo((res.fastWave as any).expect, 2)
  expect.soft((res.scrub as any).running, 'moving the playhead stops the preview').toBe(false)
  expect.soft((res.slowWalk as any).lastT, 'a walk at Slow is 3 cycles of 1.333 s, then a 0.5 s settle').toBeCloseTo(4.5, 2)
  expect.soft(Math.max(...(res.pastEnd as any).savedTimes), 'a preset near the end is cut at the scene end').toBeLessThanOrEqual((res.pastEnd as any).dur + 1e-6)
  expect.soft((res.pastEnd as any).durAfter, 'the timeline keeps its length').toBe((res.pastEnd as any).dur)
  expect.soft(errors).toEqual([])
})

/** The teacher's own x slide and a sad face, then a preset over the middle of it. */
const TEACHER = [{ t: 0, x: 0.3, face: 'sad' }, { t: 8, x: 0.9 }]   // the stage eases between them (inOut)

test('3/4 (round 2). after a clip the face is the teacher\'s again; in-place presets leave x alone', async ({ page }) => {
  test.setTimeout(400_000)
  const errors = watchConsole(page)
  await openEditor(page)
  const rows: any[] = []
  for (const id of ['wave', 'talk', 'clap', 'dance_sway', 'shiver', 'dance_hop', 'cheer', 'jump']) {
    await page.evaluate(({ T, keys }) => (window as any).__timelineKeying.setLayerKeys(T, keys), { T, keys: TEACHER })
    await page.waitForTimeout(800)
    await seekStage(page, 3)
    const ownX3 = await page.evaluate((id) => (window as any).__stage25d.readLayerProp(id, 'x'), FIG)
    await addPreset(page, id, 2)
    const keys = await layerKeys(page, FIG)
    const added = keys.filter((k: any) => k.t >= 2 - 1e-6 && k.t <= 7.9)
    const end = Math.max(...added.map((k: any) => k.t))
    const probe = await page.evaluate(({ id, end }) => {
      const st = (window as any).__stage25d
      const at = (t: number) => { st.update(t); return { t, x: st.readLayerProp(id, 'x'), face: st.layerInfo(id).face } }
      return [at(1), at(2.5), at(3), at(end - 0.05), at(end + 0.05), at(7.5)]
    }, { id: FIG, end })
    rows.push({ id, ownX3, end, xKeys: keys.filter((k: any) => k.x !== undefined).map((k: any) => [k.t, k.x]), faces: keys.filter((k: any) => k.face).map((k: any) => [k.t, k.face]), probe })
    expect.soft(probe[5].face, `${id}: the figure is sad again after the clip`).toBe('sad')
    expect.soft(probe[0].face, `${id}: sad before the clip`).toBe('sad')
    if (id !== 'wave' && id !== 'talk') {
      // round 3: an in-place clip's root move ADDS to the teacher's slide; the slide carries on, off by no more than
      // the clip's own offset, and the teacher's keys at 0 and 8 s stay
      const drift = await page.evaluate(({ id, own, end }) => {
        const st = (window as any).__stage25d
        const ownAt = (t: number) => { const k = Math.min(1, Math.max(0, t / 8)); return 0.3 + 0.6 * (-(Math.cos(Math.PI * k) - 1) / 2) }   // inOut, layout.ts
        let worstIn = 0, worstOut = 0
        for (let t = 0; t <= 8; t += 0.05) { st.update(t); const d = Math.abs(st.readLayerProp(id, 'x') - ownAt(t)); if (t >= 2 && t <= end) worstIn = Math.max(worstIn, d); else worstOut = Math.max(worstOut, d) }
        return { worstIn, worstOut }
      }, { id: FIG, own: TEACHER, end })
      const clipX = keys.filter((k: any) => k.x !== undefined && k.t >= 2 - 1e-6 && k.t <= end + 1e-6).map((k: any) => k.x)
      rows[rows.length - 1].drift = drift
      rows[rows.length - 1].teacherKeysKept = [0, 8].map((t) => keys.some((k: any) => Math.abs(k.t - t) < 1e-6 && k.x !== undefined))
      expect.soft(rows[rows.length - 1].teacherKeysKept, `${id}: the teacher's x keys at 0 and 8 s stay`).toEqual([true, true])
      expect.soft(drift.worstOut, `${id}: outside the clip the figure is on the teacher's slide`).toBeLessThan(1e-3)
      expect.soft(drift.worstIn, `${id}: inside the clip on the teacher's slide (round 4: no x written)`).toBeLessThan(1e-3)
      void clipX
    }
    await clearKeys(page, FIG)
  }
  log('face-x', rows)
  expect.soft(errors).toEqual([])
})

test('R3. walk and run never step back; a stopped loop settles (no kicked-up shin held)', async ({ page }) => {
  test.setTimeout(240_000)
  const errors = watchConsole(page)
  await openEditor(page)
  const res: any = {}
  for (const id of ['walk', 'run', 'carry']) {
    await clearKeys(page, FIG)
    await addPreset(page, id, 0)
    const keys = await layerKeys(page, FIG)
    res[id] = await page.evaluate(({ id, end }) => {
      const st = (window as any).__stage25d
      let prev = -Infinity, peak = -Infinity, back = 0, backT = 0, firstBack: number | null = null
      for (let t = 0; t <= end; t += 0.002) {
        st.update(t); const x = st.readLayerProp(id, 'x')
        if (x < prev - 1e-9) { backT += 0.002; if (firstBack === null) firstBack = Math.round(t * 1000) / 1000 }
        peak = Math.max(peak, x); back = Math.max(back, peak - x); prev = x
      }
      const pose = (t: number) => { st.update(t); return Object.fromEntries(['thigh_n', 'shin_n', 'thigh_f', 'shin_f'].map((b) => [b, Math.round(st.readLayerProp(id, `bone:${b}`) * 10) / 10])) }
      // how fast each leg bone is still turning 10 ms before the settle key (a settle should arrive slowing down)
      const p1 = pose(end - 0.02), p2 = pose(end - 0.01)
      const arrive = Math.max(...Object.keys(p1).map((b) => Math.abs((p2 as any)[b] - (p1 as any)[b]) / 0.01))
      return { end, backSeconds: Math.round(backT * 1000) / 1000, firstBack, deepestBackX: back, viewWidthM: st.layerInfo(id).viewWidth, legShare: st.layerInfo(id).legShare, atEnd: pose(end), after: pose(end + 1), arriveDegPerS: Math.round(arrive) }
    }, { id: FIG, end: keys.at(-1).t })
    res[id].lastCycleKey = keys.at(-2)
    expect.soft(res[id].deepestBackX * res[id].viewWidthM, `${id}: never steps back (m)`).toBeLessThan(0.005)
    expect.soft(Object.values(res[id].after).every((v: any) => Math.abs(v) < 0.5), `${id}: settles to the drawn pose`).toBe(true)
  }
  // adding the same walk twice at the same playhead replaces it: the distance does not double
  await clearKeys(page, FIG)
  await addPreset(page, 'walk', 0)
  const once = (await layerKeys(page, FIG)).filter((k: any) => k.x !== undefined).at(-1)?.x
  await addPreset(page, 'walk', 0)
  const twice = (await layerKeys(page, FIG)).filter((k: any) => k.x !== undefined).at(-1)?.x
  res.readd = { once, twice }
  expect.soft(twice, 'a walk added twice ends where one walk ends').toBeCloseTo(once, 3)
  await clearKeys(page, FIG)
  log('r3-travel', res)
  expect.soft(errors).toEqual([])
})

test('R5. no joint speed jumps at keys on the stage (walk, run, dance_hop, talk)', async ({ page }) => {
  test.setTimeout(240_000)
  const errors = watchConsole(page)
  await openEditor(page)
  const res: any = {}
  for (const id of ['walk', 'run', 'dance_hop', 'talk']) {
    await clearKeys(page, FIG)
    await addPreset(page, id, 0)
    const keys = await layerKeys(page, FIG)
    res[id] = await page.evaluate(({ id, keys, bones }) => {
      const st = (window as any).__stage25d
      const e = 1e-4
      const at = (t: number, b: string) => { st.update(t); return st.readLayerProp(id, `bone:${b}`) }
      let kinks = 0, worst = { dv: 0, b: '', t: 0 }
      for (const k of keys.slice(1, -1)) {
        for (const b of bones) {
          if (k[`bone:${b}`] === undefined) continue
          const vL = (at(k.t - e, b) - at(k.t - 2 * e, b)) / e, vR = (at(k.t + 2 * e, b) - at(k.t + e, b)) / e
          const dv = Math.abs(vL - vR)
          if (dv > 30) kinks++
          if (dv > worst.dv) worst = { dv: Math.round(dv * 100) / 100, b, t: k.t }
        }
      }
      return { keys: keys.length, kinks, worst }
    }, { id: FIG, keys, bones: BONES })
    expect.soft(res[id].kinks, `${id}: speed jumps over 30 deg/s at keys`).toBe(0)
  }
  await clearKeys(page, FIG)
  log('r5-kinks', res)
  expect.soft(errors).toEqual([])
})
