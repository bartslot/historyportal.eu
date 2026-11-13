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
  await page.addInitScript(() => {
    const AC = window.AudioContext
    if (AC) AC.prototype.resume = function () { return Promise.resolve() }
    HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return Promise.resolve() }
  })
  await page.goto(`/teacher/lessons/${LESSON}/wizard?step=4&scene=${SCENE}`, { waitUntil: 'load' })
  await page.waitForFunction(() => window.BABYLON?.Engine?.LastCreatedScene?.isReady?.() && window.__stage25d?.items?.().length, null, { timeout: 60_000 })
  const id = `layer-${LAYER}`
  const vertices = await page.evaluate(() => window.BABYLON.Engine.LastCreatedScene.meshes.find((m) => m.name === 'layer:fig-ana-stand-01')?.getTotalVertices() ?? 0)
  expect(vertices, 'a figure whose joints bend is a mesh, not 17 quads').toBeGreaterThan(17 * 4)
  mkdirSync(OUT, { recursive: true })
  for (const [name, pose] of Object.entries(POSES)) {
    const png = await page.evaluate(async ({ id, pose }) => {
      const st = window.__stage25d
      for (const bone of ['head', 'chest', 'braid', 'upperarm_n', 'forearm_n', 'upperarm_f', 'forearm_f', 'thigh_n', 'shin_n', 'foot_n', 'thigh_f', 'shin_f', 'foot_f']) {
        st.setLayerProp(id, `bone:${bone}`, pose[bone] ?? 0)
      }
      // the stage bends a figure on its own next frame, not inside scene.render(): let two frames pass first
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const sc = window.BABYLON.Engine.LastCreatedScene
      const eng = sc.getEngine()
      const canvas = eng.getRenderingCanvas()
      const was = eng.getHardwareScalingLevel()
      eng.setHardwareScalingLevel(was / 2.5)
      eng.resize()
      sc.render()
      const url = canvas.toDataURL('image/png')
      const W = canvas.width, H = canvas.height
      const m = sc.meshes.find((x) => x.name === 'layer:fig-ana-stand-01')
      const M = sc.getTransformMatrix().m
      const pts = m.getBoundingInfo().boundingBox.vectorsWorld.map((v) => {
        const x = v.x * M[0] + v.y * M[4] + v.z * M[8] + M[12], y = v.x * M[1] + v.y * M[5] + v.z * M[9] + M[13], w = v.x * M[3] + v.y * M[7] + v.z * M[11] + M[15]
        return [(x / w + 1) / 2 * W, (1 - y / w) / 2 * H]
      })
      eng.setHardwareScalingLevel(was)
      eng.resize()
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
      const h = Math.max(...ys) - Math.min(...ys)
      const x0 = Math.max(0, Math.min(...xs) - h * 0.2), y0 = Math.max(0, Math.min(...ys) - h * 0.04)
      const x1 = Math.min(W, Math.max(...xs) + h * 0.2), y1 = Math.min(H, Math.max(...ys) + h * 0.04)
      const img = new Image()
      img.src = url
      await img.decode()
      const c = document.createElement('canvas')
      c.width = x1 - x0; c.height = y1 - y0
      c.getContext('2d').drawImage(img, x0, y0, c.width, c.height, 0, 0, c.width, c.height)
      return c.toDataURL('image/png')
    }, { id, pose })
    writeFileSync(`${OUT}/${name.replace(/ /g, '-')}.png`, Buffer.from(png.split(',')[1], 'base64'))
  }
})
