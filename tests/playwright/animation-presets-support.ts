/**
 * Shared helpers for the animation-presets*.spec.ts tester specs (fresh tester, 11-14). Local DB lessons 441 / 443.
 */
import type { Page } from '@playwright/test'
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { muted, stageReady } from './stage-capture'

/** The scene with flat-sheet Ana (layer-6) and a kit character (layer-7): ana-rig-lesson.php with KIT_CHARACTER prints it. */
export const EDITOR_441 = process.env.PW_ANIM_EDITOR ?? '/teacher/lessons/441/wizard?step=4&scene=16038'
export const EDITOR_443 = '/teacher/lessons/443/wizard?step=4&scene=16041'
export const FIGS = [
  { id: 'layer-6', mesh: 'layer:fig-ana-stand-01', name: 'ana' },
  { id: 'layer-7', mesh: null as string | null, name: 'scribe' },
]
export const BONES = ['head', 'chest', 'braid', 'upperarm_n', 'forearm_n', 'upperarm_f', 'forearm_f', 'thigh_n', 'shin_n', 'foot_n', 'thigh_f', 'shin_f', 'foot_f']
export const PRESETS = ['walk']
export const OUT = `${process.env.HOME}/BartsMedia/historyportal/topics/character-bones/animations/tester`
// not under tests/playwright/results: Playwright empties that folder at the start of every run
export const LOG = process.env.PW_TESTER_LOG ?? `${tmpdir()}/animation-presets-tester.jsonl`

export function log (name: string, data: unknown) {
  appendFileSync(LOG, JSON.stringify({ name, data }) + '\n')
}

export function watchConsole (page: Page) {
  const errors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(String(e)))
  return errors
}

export async function openEditor (page: Page, url = EDITOR_441) {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await muted(page)
  await page.goto(url, { waitUntil: 'load' })
  await stageReady(page)
  await page.waitForFunction(() => (window as any).__timelineKeying?.layerKeys, null, { timeout: 30_000 })
  await page.waitForTimeout(1500)
}

/** A figure's mesh name on the stage (named after its asset), once the stage has built it: a figure of parts is
 *  built after its atlas loads, later than the stage's item list (a capture before that read an undefined mesh, PM 11-15). */
export async function meshOf (page: Page, id: string): Promise<string> {
  const name = (ids: string) => page.evaluate((id) => {
    const asset = (window as any).__stage25d?.layerInfo(id)?.asset
    const mesh = (window as any).BABYLON?.Engine?.LastCreatedScene?.meshes.find((m: any) => m.name === `layer:${asset}`)
    return mesh && mesh.getTotalVertices() > 0 ? mesh.name : null
  }, ids)
  await page.waitForFunction((id) => {
    const asset = (window as any).__stage25d?.layerInfo(id)?.asset
    const mesh = (window as any).BABYLON?.Engine?.LastCreatedScene?.meshes.find((m: any) => m.name === `layer:${asset}`)
    return !!mesh && mesh.getTotalVertices() > 0
  }, id, { timeout: 60_000 }).catch(() => {
    throw new Error(`no built mesh for ${id} on this scene: is the throwaway lesson there (tests/playwright/ana-rig-lesson.php, PW_ANIM_EDITOR)?`)
  })
  return (await name(id))!
}

export async function selectFigure (page: Page, id: string) {
  await page.evaluate((id) => (window as any).__stage25d.select(id), id)
  const section = page.locator(`[data-stage25d-inspector="${id}"] [data-stage25d-animation-section]`)
  await section.waitFor({ state: 'visible', timeout: 20_000 })
  const header = section.locator('> button').first()
  if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click()
  await section.locator('[data-animation-preset="walk"]').waitFor({ state: 'visible' })
  return section
}

export const layerKeys = (page: Page, id: string) => page.evaluate((id) => (window as any).__timelineKeying.layerKeys(`s25:${id}`), id)
export const stageKeys = (page: Page, id: string) => page.evaluate((id) => (window as any).__stage25d.items().find((i: any) => i.id === id)?.keys ?? [], id)

/** Clear a figure's keys (one edit, saved) and wait for the save to land. */
export async function clearKeys (page: Page, id: string) {
  const had = (await layerKeys(page, id)).length
  if (!had) return
  const saved = page.waitForResponse((r) => r.url().includes('livewire') && r.request().method() === 'POST', { timeout: 15_000 }).catch(() => null)
  await page.evaluate((id) => (window as any).__timelineKeying.setLayerKeys(`s25:${id}`, []), id)
  await saved
  await page.waitForTimeout(400)
}

/** Every bone's value (raw keyed, readLayerProp) plus x/y, at the stage's current time. */
export const pose = (page: Page, id: string) => page.evaluate(({ id, bones }) => {
  const st = (window as any).__stage25d
  const out: Record<string, number> = { t: st.time }
  for (const b of bones) out[b] = Math.round(st.readLayerProp(id, `bone:${b}`) * 100) / 100
  out.x = st.readLayerProp(id, 'x'); out.y = st.readLayerProp(id, 'y')
  return out
}, { id, bones: BONES })

export const seekStage = (page: Page, t: number) => page.evaluate((t) => (window as any).__stage25d.update(t), t)

/** Timeline playhead (the panel's own seek), so Add and edits land where we say. */
export const seekTimeline = (page: Page, t: number) => page.evaluate((t) => {
  const el = document.querySelector('[data-timeline]') as any
  const c = el?._x_dataStack?.[0]
  if (!c) throw new Error('no timeline component')
  c.pause?.(); c.seek(t)
  return c.time
}, t)

/** Save a PNG data URL as WebP q50 under OUT; returns the path. */
export function saveWebp (dataUrl: string, name: string) {
  mkdirSync(OUT, { recursive: true })
  const png = `${OUT}/${name}.png`
  writeFileSync(png, Buffer.from(dataUrl.split(',')[1], 'base64'))
  const webp = `${OUT}/${name}.webp`
  execFileSync('cwebp', ['-quiet', '-q', '50', png, '-o', webp])
  execFileSync('rm', [png])
  return webp
}
