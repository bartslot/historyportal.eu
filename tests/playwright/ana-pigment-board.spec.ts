/**
 * The 8 shade pigments of a flat figure on the real stage (plan 11, Bart 11-14: "create 8 options with small to big
 * pigment differences"): flat Ana in two poses at every figurePigment, and with the shader's watercolour and shading off.
 * Writes one PNG per option to PW_OUT; a board is made from them for the eye. Without its shade mask the sliders hide.
 *
 *   RIG_DIR=.../flat-v1/rig-shader RIG_NAME=fig-ana-flat-rig-01 php artisan tinker --execute='require "tests/playwright/ana-rig-lesson.php";'
 *   ANA_RIG=<lesson>/<scene>/<layer> PW_OUT=/tmp/pigments PW_BASE_URL=http://127.0.0.1:8061 npx playwright test tests/playwright/ana-pigment-board.spec.ts --project=chromium
 */
import { test, expect } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { captureFigure, freezable, muted, stageReady } from './stage-capture'

const [LESSON, SCENE, LAYER] = (process.env.ANA_RIG ?? '').split('/')
const OUT = process.env.PW_OUT ?? 'test-results/ana-pigments'
test.skip(!LESSON, 'set ANA_RIG')

const POSES: Record<string, Record<string, number>> = {
  rest: {},
  reach: { upperarm_n: -90, forearm_n: -20, upperarm_f: -15, thigh_n: -15, shin_n: 25 },
}
const BONES = ['head', 'chest', 'braid', 'upperarm_n', 'forearm_n', 'upperarm_f', 'forearm_f', 'thigh_n', 'shin_n', 'foot_n', 'thigh_f', 'shin_f', 'foot_f']

test('the 8 shade pigments of a flat figure', async ({ page }) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 1600, height: 1000 })
  await muted(page)
  await freezable(page)
  await page.goto(`/teacher/lessons/${LESSON}/wizard?step=4&scene=${SCENE}`, { waitUntil: 'load' })
  await stageReady(page, 120_000)
  await page.evaluate(() => (window as any).__freeze())   // still: only the look changes between the captures
  const id = `layer-${LAYER}`
  expect(await page.evaluate(() => (window as any).__stage25d.lookControls().map((c: any) => c.key)), 'a flat figure offers its sliders')
    .toEqual(expect.arrayContaining(['figureWash', 'figureShade', 'figurePigment']))
  mkdirSync(OUT, { recursive: true })
  const look = (k: string, v: number) => page.evaluate(([k, v]) => (window as any).__stage25d.setLook(k, v), [k, v] as const)
  const shoot = async (name: string) => {
    for (const [pose, bones] of Object.entries(POSES)) {
      await page.evaluate(({ id, bones, all }) => { for (const b of all) (window as any).__stage25d.setLayerProp(id, `bone:${b}`, bones[b] ?? 0) }, { id, bones, all: BONES })
      const png = await captureFigure(page, 'layer:fig-ana-stand-01')
      writeFileSync(`${OUT}/${name}-${pose}.png`, Buffer.from(png.split(',')[1], 'base64'))
    }
  }
  await look('figureWash', 0); await look('figureShade', 0)
  await shoot('off')
  await look('figureWash', 1); await look('figureShade', 1)
  for (let p = 1; p <= 8; p++) {
    await look('figurePigment', p)
    await shoot(`pigment-${p}`)
  }
  await look('figurePigment', 2)   // back to the default (Bart's pick)
})

test('a flat figure whose shade mask does not load offers no shading sliders', async ({ page }) => {
  test.setTimeout(180_000)
  await muted(page)
  await page.route('**/*-shade.webp*', (route) => route.fulfill({ status: 404, body: '' }))
  await page.goto(`/teacher/lessons/${LESSON}/wizard?step=4&scene=${SCENE}`, { waitUntil: 'load' })
  await stageReady(page, 120_000)
  const keys: string[] = await page.evaluate(() => (window as any).__stage25d.lookControls().map((c: any) => c.key))
  expect(keys, 'drawn flat without its mask: the sliders would do nothing').not.toContain('figureShade')
  expect(keys).not.toContain('figureWash')
  expect(keys).not.toContain('figurePigment')
})
