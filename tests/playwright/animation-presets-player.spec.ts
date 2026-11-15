/**
 * Fresh-tester checks, part 3: the lesson player plays preset keys. Lesson 443 (agent-composed: scribe walks from
 * 0.5 s, Ana waves from 2 s) and lesson 441 after an Add in the editor.
 *
 * Silent: AudioContext.resume is a no-op and media play() is muted (volume 0) before it runs; Chromium also runs with
 * --mute-audio. Unlike stage-capture `muted`, play() still runs (muted), because the stage's clock IS the narration's
 * currentTime: a play() that never plays would freeze the scene at 0 s.
 *
 *   PW_BASE_URL=http://localhost:8062 npx playwright test tests/playwright/animation-presets-player.spec.ts --project=chromium
 */
import { test, expect, Page } from '@playwright/test'
import { stageReady } from './stage-capture'
import { BONES, clearKeys, log, openEditor, seekTimeline, selectFigure, layerKeys, saveWebp, watchConsole } from './animation-presets-support'

async function silent (page: Page) {
  await page.addInitScript(() => {
    const AC = window.AudioContext
    if (AC) AC.prototype.resume = function () { return Promise.resolve() }
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return play.call(this).catch(() => undefined) }
  })
}

async function startPlayer (page: Page, code: string) {
  await page.setViewportSize({ width: 1600, height: 900 })
  await silent(page)
  await page.goto(`/lesson/${code}`, { waitUntil: 'load' })
  await page.getByRole('button', { name: /start lesson|commencer la leçon|start de les|lektion starten|inizia la lezione|empezar la lecci[oó]n/i }).first().click({ timeout: 30_000 })
  await stageReady(page, 60_000)
  // The stage's clock is the narration's currentTime. These throwaway lessons have none that plays (443: no narration,
  // the player goes straight to ENDED; 441: its narration.mp3 answers 403), so when the clock stands still the test
  // drives the player's own stage with a wall clock from 0 s and says so.
  const t0 = await page.evaluate(() => (window as any).__stage25d.time)
  await page.waitForTimeout(1500)
  const t1 = await page.evaluate(() => (window as any).__stage25d.time)
  if (t0 === t1) await page.evaluate(() => { const s = performance.now(); (window as any).__stage25d.play(() => (performance.now() - s) / 1000) })
  return { narrationClock: t0 !== t1 }
}

/** Sample both figures' bones and x/y against the stage clock for `ms`. */
const watch = (page: Page, ids: string[], ms: number) => page.evaluate(async ({ ids, ms, bones }) => {
  const st = (window as any).__stage25d
  const rows: any[] = []
  const t0 = performance.now()
  while (performance.now() - t0 < ms) {
    const r: any = { clock: Math.round(st.time * 100) / 100 }
    for (const id of ids) { r[id] = {}; for (const b of bones) r[id][b] = Math.round(st.readLayerProp(id, `bone:${b}`) * 10) / 10; r[id].x = st.readLayerProp(id, 'x') }
    rows.push(r)
    await new Promise((res) => setTimeout(res, 250))
  }
  return rows
}, { ids, ms, bones: BONES })

test('7a. lesson 443 plays its imported animations (walk from 0.5 s, wave from 2 s)', async ({ page }) => {
  test.setTimeout(120_000)
  const errors = watchConsole(page)
  const clock = await startPlayer(page, 'K1YGTQ')
  const rows = await watch(page, ['layer-6', 'layer-7'], 7000)
  const phase = await page.evaluate(() => ([...document.querySelectorAll('[x-data]')].map((e: any) => e._x_dataStack?.[0]).find((d: any) => d && 'phase' in d) as any)?.phase)
  const meshes = await page.evaluate(() => (window as any).BABYLON.Engine.LastCreatedScene.meshes.map((m: any) => m.name).filter((n: string) => n.startsWith('layer:')))
  log('player-443', { clock, phase, rows, meshes })
  const clocks = rows.map((r) => r.clock)
  expect.soft(Math.max(...clocks), 'the stage clock runs').toBeGreaterThan(2.5)
  const scribeMoves = new Set(rows.filter((r) => r.clock > 0.6 && r.clock < 5.4).map((r) => r['layer-6'].thigh_n)).size
  const anaBefore = new Set(rows.filter((r) => r.clock < 1.9).map((r) => r['layer-7'].upperarm_n)).size
  const anaAfter = new Set(rows.filter((r) => r.clock > 2.1 && r.clock < 4.8).map((r) => r['layer-7'].upperarm_n)).size
  expect.soft(scribeMoves, 'scribe legs move while walking').toBeGreaterThan(2)
  expect.soft(anaBefore, 'Ana still before 2 s').toBeLessThanOrEqual(1)
  expect.soft(anaAfter, 'Ana waves after 2 s').toBeGreaterThan(2)
  expect.soft(errors).toEqual([])
})

test('7b. a preset Added on lesson 441 plays in the player', async ({ page }) => {
  test.setTimeout(180_000)
  const errors = watchConsole(page)
  await openEditor(page)
  await clearKeys(page, 'layer-6')
  const section = await selectFigure(page, 'layer-6')
  await seekTimeline(page, 1)
  await section.locator('[data-animation-preset="cheer"]').click()
  const saved = page.waitForResponse((r) => r.url().includes('livewire') && r.request().method() === 'POST', { timeout: 15_000 }).catch(() => null)
  await section.locator('[data-animation-add]').click()
  await saved
  await page.waitForTimeout(1500)
  const keys = await layerKeys(page, 'layer-6')
  // the editor's WebGL stage starves a second page under SwiftShader (one evaluate took ~4.5 s): leave it first
  await page.goto('about:blank')
  const player = page
  await silent(player)
  await player.goto('/lesson/81H01X', { waitUntil: 'load' })
  await player.getByRole('button', { name: /start lesson|start de les|empezar la lecci[oó]n/i }).first().click({ timeout: 30_000 })
  // the scene as the class sees it: phase, stage clock and Ana's arm, every 250 ms, with the player's own clock
  const live: any[] = []
  const t0 = Date.now()
  while (Date.now() - t0 < 12_000) {
    live.push(await player.evaluate((ms) => {
      const d: any = [...document.querySelectorAll('[x-data]')].map((e: any) => e._x_dataStack?.[0]).find((d: any) => d && 'phase' in d)
      const st = (window as any).__stage25d
      return { ms, phase: d?.phase, clock: st ? Math.round(st.time * 100) / 100 : null, up: st ? Math.round(st.readLayerProp('layer-6', 'bone:upperarm_n') * 10) / 10 : null }
    }, Date.now() - t0))
    await player.waitForTimeout(250)
  }
  // the narration clock never ran here (narration.mp3 403, the player stayed in INTRO): pose the player's own stage by hand
  const posed = await player.evaluate(() => {
    const st = (window as any).__stage25d
    if (!st) return null
    return [0.5, 1.2, 1.5, 1.9, 2.3, 2.8].map((t) => { st.update(t); return { t, up: Math.round(st.readLayerProp('layer-6', 'bone:upperarm_n') * 10) / 10, y: st.readLayerProp('layer-6', 'y') } })
  })
  log('player-441', { keys: keys.length, live, posed })
  const moving = new Set(live.filter((r) => r.clock !== null && r.clock > 1.1 && r.clock < 2.6).map((r) => r.up)).size
  expect.soft(Math.max(...live.map((r) => r.clock ?? 0)), 'the stage clock runs in the player').toBeGreaterThan(2)
  expect.soft(moving, 'Ana cheers in the player after 1 s').toBeGreaterThan(2)
  await openEditor(page)
  await clearKeys(page, 'layer-6')
  expect.soft(errors).toEqual([])
})

test(`7c. lesson ${process.env.PW_PLAYER_CODE ?? 'QIZS4Q'} plays its animations on the real narration clock`, async ({ page }) => {
  test.setTimeout(180_000)
  const errors = watchConsole(page)
  await page.setViewportSize({ width: 1600, height: 900 })
  await silent(page)
  await page.goto(`/lesson/${process.env.PW_PLAYER_CODE ?? 'QIZS4Q'}`, { waitUntil: 'load' })
  await page.getByRole('button', { name: /start lesson|commencer la leçon|start de les|lektion starten|inizia la lezione|empezar la lecci[oó]n/i }).first().click({ timeout: 30_000 })
  const live: any[] = []
  const t0 = Date.now()
  let shot = ''
  let rewound = false
  let firstClock: number | null = null
  while (Date.now() - t0 < 40_000) {
    const r = await page.evaluate(() => {
      const d: any = [...document.querySelectorAll('[x-data]')].map((e: any) => e._x_dataStack?.[0]).find((d: any) => d && 'phase' in d)
      const st = (window as any).__stage25d
      const a = d?._audio
      const bone = (id: string, b: string) => (st ? Math.round(st.readLayerProp(id, `bone:${b}`) * 10) / 10 : null)
      return { phase: d?.phase, audioT: a ? Math.round(a.currentTime * 100) / 100 : null, muted: a ? a.muted || a.volume === 0 : null, clock: st ? Math.round(st.time * 100) / 100 : null,
        scribeThigh: bone('layer-6', 'thigh_n'), scribeX: st ? Math.round(st.readLayerProp('layer-6', 'x') * 1000) / 1000 : null, anaArm: bone('layer-7', 'upperarm_n') }
    })
    live.push({ ms: Date.now() - t0, ...r })
    if (!shot && rewound && r.clock !== null && r.clock > 3 && r.clock < 3.6) shot = saveWebp(`data:image/png;base64,${(await page.screenshot()).toString('base64')}`, `player-${process.env.PW_PLAYER_CODE ?? 'QIZS4Q'}-at-${r.clock}s${process.env.STILL_SUFFIX ?? ''}`)
    // the stage can mount seconds after the narration started (SwiftShader here: ~5.4 s), so the first seconds of the
    // scene go by unseen; once it is up, take the narration back to the start (what a teacher's replay does) and watch
    if (r.clock !== null && !rewound) {
      rewound = true
      firstClock = r.clock
      await page.evaluate(() => { const d: any = [...document.querySelectorAll('[x-data]')].map((e: any) => e._x_dataStack?.[0]).find((d: any) => d && 'phase' in d); d._audio.currentTime = 0; if (d._audio.paused) d._audio.play() })
      await page.waitForTimeout(200)
      continue
    }
    if (r.phase === 'ENDED' || (rewound && (r.clock ?? 0) > 6.5)) break
    await page.waitForTimeout(200)
  }
  log('player-446', { firstClock, mountMs: live.find((r) => r.clock !== null)?.ms ?? null, live, shot })
  const after = live.slice(live.findIndex((r) => r.clock !== null) + 1)
  const during = (a: number, b: number) => after.filter((r) => r.clock !== null && r.clock > a && r.clock < b)
  expect.soft(Math.max(...live.map((r) => r.audioT ?? 0)), 'the narration plays (its clock runs)').toBeGreaterThan(2.5)
  expect.soft(live.every((r) => r.muted !== false), 'silent').toBe(true)
  expect.soft(new Set(during(0.6, 5.4).map((r) => r.scribeThigh)).size, 'scribe walks').toBeGreaterThan(2)
  expect.soft(new Set(during(0, 1.9).map((r) => r.anaArm)).size, 'Ana still before 2 s').toBeLessThanOrEqual(1)
  expect.soft(new Set(during(2.1, 4.8).map((r) => r.anaArm)).size, 'Ana waves after 2 s').toBeGreaterThan(2)
  expect.soft(firstClock ?? 99, 'the stage is up within the first second of narration').toBeLessThan(1)
  expect.soft(errors).toEqual([])
})
