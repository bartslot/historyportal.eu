/**
 * Ana's boned figure on the real stage (Babylon, headless Chromium): she loads as a bending mesh (smart bones) and
 * each pose renders. Writes a 2.5x crop of her per pose to PW_OUT for the eye: the posing rules and the seams are judged
 * there, at full size, never from a 200.
 *
 *   RIG_DIR=... php artisan tinker --execute='require "tests/playwright/ana-rig-lesson.php";'   # prints ANA_RIG=<lesson>/<scene>/<layer>
 *   ANA_RIG=<lesson>/<scene>/<layer> PW_OUT=/tmp/ana PW_BASE_URL=http://localhost:8061 \
 *     npx playwright test tests/playwright/ana-bones-stage.spec.ts --project=chromium
 *
 * Muted: every AudioContext stays suspended and media plays silently, from before the page's own scripts run.
 */
import { test, expect } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { captureFigure, muted, stageReady } from './stage-capture'

const [LESSON, SCENE, LAYER] = (process.env.ANA_RIG ?? '').split('/')
const OUT = process.env.PW_OUT ?? 'test-results/ana-bones'
test.skip(!LESSON, 'set ANA_RIG')

const POSES: Record<string, Record<string, number>> = {
  rest: {},
  'head turned': { head: -22 },
  'elbow folded': { forearm_n: -90 },
  reach: { upperarm_n: -90, forearm_n: -20, upperarm_f: -40 },
  step: { thigh_n: -18, shin_n: 20, thigh_f: 15, shin_f: 35, foot_f: 10, upperarm_n: 20, upperarm_f: -20, forearm_n: -15, forearm_f: -20 },
  'knee up': { thigh_n: -25, shin_n: 95 },
  // both feet to their limits: an ankle too narrow to bend folded its mesh into a wedge cut in the shin (tester, 11-13)
  toes: { foot_n: 20, foot_f: -30 },
}

test('Ana bends on the stage', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1600, height: 1000 })
  await muted(page)
  await page.goto(`/teacher/lessons/${LESSON}/wizard?step=4&scene=${SCENE}`, { waitUntil: 'load' })
  await stageReady(page)
  const id = `layer-${LAYER}`
  const vertices = await page.evaluate(() => (window as any).BABYLON.Engine.LastCreatedScene.meshes.find((m: any) => m.name === 'layer:fig-ana-stand-01')?.getTotalVertices() ?? 0)
  expect(vertices, 'a figure whose joints bend is a mesh, not 17 quads').toBeGreaterThan(17 * 4)
  mkdirSync(OUT, { recursive: true })
  for (const [name, pose] of Object.entries(POSES)) {
    await page.evaluate(({ id, pose }) => {
      const st = (window as any).__stage25d
      for (const bone of ['head', 'chest', 'braid', 'upperarm_n', 'forearm_n', 'upperarm_f', 'forearm_f', 'thigh_n', 'shin_n', 'foot_n', 'thigh_f', 'shin_f', 'foot_f']) {
        st.setLayerProp(id, `bone:${bone}`, pose[bone] ?? 0)
      }
    }, { id, pose })
    const png = await captureFigure(page, 'layer:fig-ana-stand-01')
    writeFileSync(`${OUT}/${name.replace(/ /g, '-')}.png`, Buffer.from(png.split(',')[1], 'base64'))
  }
})
