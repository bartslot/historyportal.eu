import { test, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { muted, freezable } from './stage-capture'

/**
 * Every ready-made world on the real stage, captured at 1440 px wide with the clock frozen, to look at the terrain
 * (Bart 11-15: "with every layer the terrain is bloated"). Reads only; the lesson is a throwaway one:
 *
 *   php artisan tinker --execute='require "tests/playwright/terrain-worlds-lesson.php";'   # prints PW_TERRAIN_WORLDS=...
 *   PW_TERRAIN_WORLDS=<lesson>/<scene>:<world>,... PW_TERRAIN_TAG=before PW_BASE_URL=http://localhost:8023 \
 *     npx playwright test terrain-worlds --config=playwright.stage25d.config.ts --workers=1
 *
 * An entry <scene>@<lesson>:<name> captures a scene of another lesson. PNGs go to
 * tests/playwright/results-stage25d/terrain-worlds/<tag>/ (never committed), with each scene's terrain
 * numbers (stage meshes: size, distance, texture px per screen px) in <world>.json beside it.
 */
const [LESSON, LIST = ''] = (process.env.PW_TERRAIN_WORLDS ?? '').split('/')
const SCENES = LIST.split(',').filter(Boolean).map((s) => s.split(':') as [string, string])
const TAG = process.env.PW_TERRAIN_TAG ?? 'now'
const OUT = `tests/playwright/results-stage25d/terrain-worlds/${TAG}`
const WIDTH = 1440
test.skip(!LESSON, 'set PW_TERRAIN_WORLDS')
test.setTimeout(240_000)
test.use({ viewport: { width: 1440, height: 900 } })
mkdirSync(OUT, { recursive: true })

const load = async (page: Page, scene: string) => {
  await muted(page)
  await freezable(page)
  const [id, lesson = LESSON] = scene.split('@')   // <scene>@<lesson>: a scene of another lesson (Bart's own 16104@477)
  await page.goto(`/teacher/lessons/${lesson}/wizard?step=4&scene=${id}`, { waitUntil: 'load' })
  await page.waitForFunction(() => document.querySelector('[data-stage25d-ready="1"]') && (window as any).__stage25d?.config, undefined, { timeout: 180_000 })
  // ready flips before a slow build swaps its set in: wait until the drawn meshes stop changing
  await page.waitForFunction(() => {
    const w = window as any
    const n = (w.BABYLON?.Engine?.LastCreatedScene?.meshes ?? []).filter((m: any) => m.isVisible && /^(layer|strewn):/.test(m.name)).length
    const same = n > 1 && n === w.__terrainMeshes
    w.__terrainMeshes = n
    return same
  }, undefined, { timeout: 180_000, polling: 3000 })
  await page.evaluate(() => (window as any).__freeze())
}

/** The canvas re-rendered WIDTH px wide, and every stage mesh's size and how many texture px each screen px shows. */
const capture = (page: Page) => page.evaluate(async (width) => {
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  const B = (window as any).BABYLON
  const sc = B.Engine.LastCreatedScene
  const eng = sc.getEngine()
  const canvas = eng.getRenderingCanvas()
  const was = eng.getHardwareScalingLevel()
  eng.setHardwareScalingLevel(was * (canvas.width / width))
  eng.resize()
  sc.render()
  const url = canvas.toDataURL('image/png')
  const W = canvas.width, H = canvas.height
  const M = sc.getTransformMatrix().m
  const toScreen = (v: any) => {
    const x = v.x * M[0] + v.y * M[4] + v.z * M[8] + M[12], y = v.x * M[1] + v.y * M[5] + v.z * M[9] + M[13], w = v.x * M[3] + v.y * M[7] + v.z * M[11] + M[15]
    return [(x / w + 1) / 2 * W, (1 - y / w) / 2 * H]
  }
  const meshes = sc.meshes.filter((m: any) => m.isVisible && m.isEnabled() && m.material).map((m: any) => {
    m.refreshBoundingInfo()
    const bb = m.getBoundingInfo().boundingBox
    const pts = bb.vectorsWorld.map(toScreen)
    const xs = pts.map((p: number[]) => p[0]), ys = pts.map((p: number[]) => p[1])
    const tex = m.material.getActiveTextures?.()?.[0]
    const size = tex?.getSize?.() ?? null
    const uScale = m.material._uRepeat ?? 1
    const sw = Math.max(...xs) - Math.min(...xs), sh = Math.max(...ys) - Math.min(...ys)
    return {
      name: m.name, slot: m.alphaIndex, z: +m.position.z.toFixed(2), y: +m.position.y.toFixed(2),
      wM: +(bb.maximumWorld.x - bb.minimumWorld.x).toFixed(1), hM: +(bb.maximumWorld.y - bb.minimumWorld.y).toFixed(1),
      screen: [Math.round(Math.min(...xs)), Math.round(Math.min(...ys)), Math.round(sw), Math.round(sh)],
      tex: size ? [size.width, size.height] : null, texName: tex?.name ?? null,
      texPxPerScreenPxY: size && sh ? +(size.height / sh).toFixed(2) : null, uScale,
    }
  })
  eng.setHardwareScalingLevel(was)
  eng.resize()
  return { url, W, H, meshes }
}, WIDTH)

/** Is a capture one flat colour (the set not drawn yet)? */
const blank = (page: Page, url: string) => page.evaluate(async (src) => {
  const img = new Image()
  img.src = src
  await img.decode()
  const c = document.createElement('canvas')
  c.width = 64; c.height = 36
  const g = c.getContext('2d')!
  g.drawImage(img, 0, 0, 64, 36)
  const d = g.getImageData(0, 0, 64, 36).data
  let sum = 0, sq = 0
  for (let i = 0; i < d.length; i += 4) { const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; sum += l; sq += l * l }
  const n = d.length / 4
  return Math.sqrt(sq / n - (sum / n) ** 2) < 15
}, url)

for (const [scene, world] of SCENES) {
  test(`terrain of ${world}`, async ({ page }) => {
    await load(page, scene)
    let shot = await capture(page)
    for (let i = 0; i < 6 && await blank(page, shot.url); i++) {   // a loaded machine can still be swapping the set in
      await page.waitForTimeout(5000)
      shot = await capture(page)
    }
    writeFileSync(`${OUT}/${world}.png`, Buffer.from(shot.url.split(',')[1], 'base64'))
    writeFileSync(`${OUT}/${world}.json`, JSON.stringify({ scene, W: shot.W, H: shot.H, meshes: shot.meshes }, null, 1))
  })
}
