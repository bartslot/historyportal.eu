/**
 * A figure on the real stage, captured larger than the screen draws it: the stage re-renders at `zoom` x and the crop
 * round the figure's mesh comes back as a PNG data URL. Shared by the bone and the watercolour specs.
 */
import type { Page } from '@playwright/test'

/** Every AudioContext stays suspended and media plays silently, from before the page's own scripts run. */
export async function muted(page: Page) {
  await page.addInitScript(() => {
    const AC = window.AudioContext
    if (AC) AC.prototype.resume = function () { return Promise.resolve() }
    HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return Promise.resolve() }
  })
}

/** Wait until the stage is built and has its layers. */
export const stageReady = (page: Page, timeout = 60_000) =>
  page.waitForFunction(() => (window as any).BABYLON?.Engine?.LastCreatedScene?.isReady?.() && (window as any).__stage25d?.items?.().length, null, { timeout })

/** The figure mesh `mesh` at `zoom` x, cropped with a margin; the stage applies changes on its next frame, so two pass first. */
export const captureFigure = (page: Page, mesh: string, zoom = 2.5) => page.evaluate(async ({ mesh, zoom }) => {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  const B = (window as any).BABYLON
  const sc = B.Engine.LastCreatedScene
  const eng = sc.getEngine()
  const canvas = eng.getRenderingCanvas()
  const was = eng.getHardwareScalingLevel()
  eng.setHardwareScalingLevel(was / zoom)
  eng.resize()
  sc.render()
  const url = canvas.toDataURL('image/png')
  const W = canvas.width, H = canvas.height
  const m = sc.meshes.find((x: any) => x.name === mesh)
  const M = sc.getTransformMatrix().m
  const pts = m.getBoundingInfo().boundingBox.vectorsWorld.map((v: any) => {
    const x = v.x * M[0] + v.y * M[4] + v.z * M[8] + M[12], y = v.x * M[1] + v.y * M[5] + v.z * M[9] + M[13], w = v.x * M[3] + v.y * M[7] + v.z * M[11] + M[15]
    return [(x / w + 1) / 2 * W, (1 - y / w) / 2 * H]
  })
  eng.setHardwareScalingLevel(was)
  eng.resize()
  const xs = pts.map((p: number[]) => p[0]), ys = pts.map((p: number[]) => p[1])
  const h = Math.max(...ys) - Math.min(...ys)
  const x0 = Math.max(0, Math.min(...xs) - h * 0.2), y0 = Math.max(0, Math.min(...ys) - h * 0.04)
  const x1 = Math.min(W, Math.max(...xs) + h * 0.2), y1 = Math.min(H, Math.max(...ys) + h * 0.04)
  const img = new Image()
  img.src = url
  await img.decode()
  const c = document.createElement('canvas')
  c.width = x1 - x0; c.height = y1 - y0
  c.getContext('2d')!.drawImage(img, x0, y0, c.width, c.height, 0, 0, c.width, c.height)
  return c.toDataURL('image/png')
}, { mesh, zoom })
