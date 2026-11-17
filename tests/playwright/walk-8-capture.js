/**
 * The walk, looked at the way an animator looks at it (Bart 11-17): per figure the 8 drawings of one cycle and a frame
 * every 0.1 s over two cycles, large, in a still frame. Runs IN the editor page of a real browser (headless SwiftShader
 * reads the stage back blank), imported from the app's Vite server:
 *
 *   const { walkSheets } = await import('http://127.0.0.1:<vite>/tests/playwright/walk-8-capture.js')
 *   await walkSheets({ figs: { 'layer-7': 'man', 'layer-8': 'girl' }, send: 'http://127.0.0.1:8799' })
 *
 * Each frame is POSTed as a PNG data URL to `send` + '/<fig>/<name>.png' (a local receiver writes output/walk-8/), and
 * engine-mvp/tools/walk8_sheets.py lays them into output/walk-8-poses.webp and output/walk-8-steps.webp. Nothing is
 * saved to the lesson: the keys go onto the stage only (stage.setLayerKeys), the other figures hidden.
 */
import { CLIPS, expandClip, loadClips } from '/resources/js/anim/presets.js'

const Z = 7          // metres from the camera: near enough to stand large, far enough that the feet are in the shot
const SIZE = [6400, 3600]   // px: every capture renders the stage at this size (a figure ~900 px tall), whatever the window does
const START = 0.5    // s: the walk starts here; before it the figure stands as drawn
const LEAD = 1.6     // metres left of the camera the walk starts

/** Two frames of the stage's own render loop, run by hand: a hidden tab gets no requestAnimationFrame. */
const frames = async () => {
  const eng = window.BABYLON.Engine.LastCreatedScene.getEngine()
  for (let n = 0; n < 2; n++) eng._activeRenderLoops.forEach((loop) => loop())
}

/** The stage drawn at SIZE: the mesh's box in canvas px and, given `rect` (px), that crop as a PNG data URL. The crop
 *  is copied straight off the WebGL canvas in the same task as the render (no image decode: a hidden tab never
 *  finishes one). */
async function shoot (mesh, rect) {
  await frames()
  const sc = window.BABYLON.Engine.LastCreatedScene, eng = sc.getEngine(), canvas = eng.getRenderingCanvas()
  eng.setSize(...SIZE); sc.render()
  const W = canvas.width, H = canvas.height
  const m = sc.meshes.find((x) => x.name === mesh)
  m.refreshBoundingInfo()
  const M = sc.getTransformMatrix().m
  const pts = m.getBoundingInfo().boundingBox.vectorsWorld.map((v) => {
    const x = v.x * M[0] + v.y * M[4] + v.z * M[8] + M[12], y = v.x * M[1] + v.y * M[5] + v.z * M[9] + M[13], w = v.x * M[3] + v.y * M[7] + v.z * M[11] + M[15]
    return [(x / w + 1) / 2 * W, (1 - y / w) / 2 * H]
  })
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
  const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
  let png = null
  if (rect) {
    const [x0, y0, x1, y1] = rect.map(Math.round)
    const c = document.createElement('canvas'); c.width = x1 - x0; c.height = y1 - y0
    c.getContext('2d').drawImage(canvas, x0, y0, c.width, c.height, 0, 0, c.width, c.height)
    png = c.toDataURL('image/png')
  }
  eng.resize()
  return { box, png }
}

export async function walkSheets ({ figs, send, clip = 'walk', steps = true }) {
  const st = window.__stage25d
  await loadClips()
  const all = st.items().map((i) => i.id)   // every picture and band but the walker goes: nothing in front of the legs
  const post = (path, body) => fetch(`${send}/${path}`, { method: 'POST', body })
  const done = []
  for (const [id, name] of Object.entries(figs)) {
    for (const other of all) st.setHidden(other, other !== id)
    const info = st.layerInfo(id)
    const view = info.viewWidth * Z / (st.readLayerProp(id, 'z') || 5)
    // a layer's x is a share of the view's width at its distance from the world's middle (x 0.5); the camera may stand
    // elsewhere: start LEAD metres left of it, so two cycles stay in the shot
    const x0 = 0.5 + ((st.cameraInfo?.().pose?.x ?? 0) - LEAD) / view
    const keys = expandClip(CLIPS[clip], { start: START, length: 2 * CLIPS[clip].duration, bones: info.bones, facing: info.facing ?? 1,
      limits: info.limits, legShare: info.legShare, x0, y0: 0, xPerHeight: info.heightM / view, yPerHeight: info.heightM })
    const walk = [{ t: 0, x: x0, z: Z }, ...keys.map((k) => ({ ...k, z: Z }))]
    // the editor puts a layer's saved keys back now and then (they are only on the stage here): set them before each shot
    const at = async (t) => {
      const lost = JSON.stringify(st.items().find((i) => i.id === id)?.keys ?? []) !== JSON.stringify(walk)
      for (const o of all) st.setHidden(o, o !== id)
      st.setLayerKeys(id, walk)
      if (lost) { await frames(); await new Promise((r) => setTimeout(r, 400)) }   // the figure is rebuilt off its new keys
      st.update(t); await frames()
    }
    const mesh = `layer:${info.asset}`
    await at(0.2); await new Promise((r) => setTimeout(r, 1500)); await at(0.2)   // the figure settles on its new keys
    const stand = (await shoot(mesh)).box
    await at(START + 2)
    const end = (await shoot(mesh)).box
    const h = stand[3] - stand[1], top = stand[1] - 0.06 * h, bottom = stand[3] + 0.06 * h
    await post(`${name}/frame.json`, JSON.stringify({ sole: stand[3] - top, height: h }))
    for (let i = 0; i < 8; i++) {   // the second cycle: the foot lock has run a whole cycle already
      await at(START + 1 + i / 8)
      const { box } = await shoot(mesh)
      const cx = (box[0] + box[2]) / 2
      await post(`${name}/pose-${i}.png`, (await shoot(mesh, [cx - 0.42 * h, top, cx + 0.42 * h, bottom])).png)
    }
    const rect = [stand[0] - 0.25 * h, top, end[2] + 0.25 * h, bottom]
    for (let n = 0; steps && n <= 20; n++) {
      await at(START + n / 10)
      await post(`${name}/step-${String(n).padStart(2, '0')}.png`, (await shoot(mesh, rect)).png)
    }
    await at(0.2)   // the same stage all through: standing again, it stands where it stood
    const again = (await shoot(mesh)).box
    if (Math.abs(again[3] - stand[3]) > 0.02 * h || Math.abs((again[3] - again[1]) - h) > 0.02 * h) throw new Error(`${name}: the stage changed under the capture (${stand} / ${again}); run it again`)
    done.push(name)
  }
  for (const other of all) st.setHidden(other, false)
  return done
}
