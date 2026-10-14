// Clay blockout Gate 3 proof: the teacher round trip, recorded. A real (headless, muted) studio page is the teacher's
// page; the teacher's hand is the real mouse and keyboard; the AI talks through server.py's /blockout/call (what the
// MCP tools post) and, for the reframe, through the crew panel's own answer path (applyAnswer + its Undo).
//   node roundtrip-blockout.mjs <studio url> <server.py url> OUT_DIR
// Writes OUT_DIR/step-NN.png per step, roundtrip.json (positions, history, readbacks), roundtrip.log.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium } from '../node_modules/playwright/index.mjs'

const [studio, server, out] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const shotDoc = JSON.parse(readFileSync(new URL('./public/blockout/tasman-spyglass.json', import.meta.url)))

// a shot file's spec -> the validated place-command shape (as mcp/bench_blockout.py to_command)
function toCommand(s) {
  const c = { id: s.id, kit: s.kit }
  if (s.pose) c.pose = s.pose
  if (s.at) { c.x = s.at[0]; c.z = s.at[s.at.length - 1] }
  const p = s.place || {}
  if (p.between) Object.assign(c, { rel: 'between', of: p.between[0], and: p.between[1] })
  for (const r of ['near', 'behind', 'in_front', 'left_of', 'right_of']) if (p[r]) Object.assign(c, { rel: r, of: p[r] })
  for (const k of ['side', 'gap']) if (k in p) c[k] = p[k]
  if (p.offset) { c.offset_r = p.offset[0]; c.offset_f = p.offset[1] }
  for (const k of ['on', 'turn']) if (k in s) c[k] = s[k]
  if ('face' in s) c.face = String(s.face)
  return c
}
const cam = shotDoc.camera
const frameCmd = { shot: cam.shot, subjects: cam.subjects, lens: cam.lens_mm, horizon: cam.horizon, az: cam.az, align: cam.align }

const log = []
const say = (line) => { log.push(line); console.log(line) }
async function ai(op, args) {
  const r = await fetch(server + '/blockout/call', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op, args }) })
  const j = await r.json()
  if (!j.ok) throw new Error(`AI ${op}: ${j.error}`)
  return j.result
}

const browser = await chromium.launch({ args: ['--mute-audio', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const report = { steps: [] }
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  await page.addInitScript(() => {             // silent: no AudioContext runs, media never plays
    const AC = window.AudioContext
    if (AC) window.AudioContext = class extends AC { constructor(...a) { super(...a); this.suspend() } }
    HTMLMediaElement.prototype.play = function () { this.muted = true; return Promise.resolve() }
  })
  page.on('dialog', (d) => d.dismiss())
  await page.goto(studio)
  await page.waitForFunction(() => window.__mvp && window.__mvp.blockout, null, { timeout: 120000, polling: 250 })
  // the stage alone, full size, on top (the studio starts on the Script step)
  await page.addStyleTag({ content: '#c { position: fixed !important; left: 0; top: 0; width: 1280px !important; height: 720px !important; z-index: 9999 }' })
  await page.evaluate(() => window.__mvp.scene.getEngine().resize())
  // THIS page has reached server.py (the server's own status may still count an earlier page's poll)
  await page.waitForFunction(() => window.__blockoutLinked, null, { timeout: 60000, polling: 250 })
  await page.waitForTimeout(500)

  const state = () => page.evaluate(() => {
    const bo = window.__mvp.blockout
    const p = bo.placed()
    const pick = (id) => p[id] && { x: p[id].x, z: p[id].z, yaw: p[id].yaw }
    const spec = (id) => bo.specs().find((s) => s.id === id)
    return { tasman: pick('tasman'), visscher: pick('visscher'), tasmanPins: spec('tasman')?.pinned ?? null, shot: bo.currentShot(), history: bo.history.list() }
  })
  let n = 0
  async function step(title, extra = {}) {
    n += 1
    const file = `step-${String(n).padStart(2, '0')}.png`
    await page.evaluate(() => window.__mvp.scene.render())
    await page.screenshot({ path: `${out}/${file}`, clip: { x: 0, y: 0, width: 1280, height: 720 } })
    const s = await state()
    report.steps.push({ n, title, file, ...s, ...extra })
    say(`${n}. ${title}\n   tasman ${JSON.stringify(s.tasman)} pins ${JSON.stringify(s.tasmanPins)}\n   history: ${s.history.map((h) => `${h.label} (${h.by})`).join(' | ')}`)
    return s
  }

  // 1. the AI builds the shot (blockout_apply)
  const built = await ai('apply', { objects: shotDoc.objects.map(toCommand), camera: frameCmd, mode: 'clay' })
  await step('AI builds the Tasman shot (blockout_apply)', { readback: built.readback })
  const start = report.steps[0].tasman

  // 2. the teacher drags Tasman with the mouse (pressed on his body, slid down-left)
  const at = await page.evaluate(() => {
    const m = window.__mvp
    const a = m.actors.find((x) => x.metadata.id === 'tasman')
    const b = m.actorBounds(a)
    const c = b.min.add(b.max).scale(0.5)
    const eng = m.scene.getEngine()
    const p = BABYLON.Vector3.Project(c, BABYLON.Matrix.Identity(), m.scene.getTransformMatrix(), m.camera.viewport.toGlobal(eng.getRenderWidth(), eng.getRenderHeight()))
    const k = 1280 / eng.getRenderWidth()
    return { x: p.x * k, y: p.y * k }
  })
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  // away from the rail (to the left on screen, down the deck): a drop onto taken cells is refused by the studio
  for (let i = 1; i <= 10; i++) await page.mouse.move(at.x - 9 * i, at.y + 4 * i, { steps: 2 })
  await page.mouse.up()
  const refused = await page.evaluate(() => document.getElementById('sel')?.textContent ?? null)
  if (refused) say('   studio said: ' + refused)
  const dragged = await step('Teacher drags Tasman (mouse)')

  // 3. the teacher turns him one step with ] (Tasman stays selected after the drag)
  await page.keyboard.press(']')
  const turned = await step('Teacher turns Tasman one step (] key)')

  // 4. the AI asks to place Tasman back at the rail: kept, and said so
  const tried = await ai('command', { commands: [{ cmd: 'place', id: 'tasman', rel: 'near', of: 'rail', side: 'front', gap: 0.3 }] })
  await step('AI asks to re-place Tasman (blockout_command): kept', { readback: tried.readback, done: tried.done })

  // 5. the crew panel's answer reframes the shot (one step in the history), then that answer's own Undo
  const crew = await page.evaluate(async (frame) => {
    const store = await import('/src/crew/store.ts')
    const r = await store.applyAnswer({ commands: [{ cmd: 'frame', ...frame }] })
    window.__crewUndo = r.undo
    return { changes: r.changes, failed: r.failed }
  }, { ...frameCmd, shot: 'medium', az: 70 })
  const reframed = await step('Crew answer reframes (medium, az 70): one history step', { crew })
  await page.evaluate(() => window.__crewUndo.run())
  const undone = await step('Undo on that crew answer: the reframe goes, the teacher\'s edits stay')

  // 6. save / clear / load: the same blockout, pins and shot come back
  const identity = await page.evaluate(async () => {
    const m = window.__mvp
    const camOf = () => { const c = m.camera; return [c.alpha, c.beta, c.radius, ...c.target.asArray(), c.fov].map((v) => +v.toFixed(5)) }
    const before = JSON.stringify({ p: m.blockout.placed(), s: m.blockout.specs(), shot: m.blockout.currentShot(), cam: camOf() })
    const saved = m.sceneIO.serialize()
    m.sceneIO.clear()
    const cleared = Object.keys(m.blockout.placed()).length
    await m.sceneIO.load(saved)
    const after = JSON.stringify({ p: m.blockout.placed(), s: m.blockout.specs(), shot: m.blockout.currentShot(), cam: camOf() })
    return { version: saved.version, cleared, identical: before === after }
  })
  await step('Save, clear, load: identical', { identity })

  // 7. the teacher's own Cmd/Ctrl+Z: his last hand edit (the turn) goes back, Shift redoes it
  const isMac = await page.evaluate(() => /Mac/.test(navigator.platform))
  await page.keyboard.press(isMac ? 'Meta+z' : 'Control+z')
  const afterUndo = await step('Teacher presses Cmd+Z')
  await page.keyboard.press(isMac ? 'Meta+Shift+z' : 'Control+Shift+z')
  const afterRedo = await step('Teacher presses Shift+Cmd+Z')

  const near = (a, b) => a && b && Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.z - b.z) < 1e-6 && Math.abs(a.yaw - b.yaw) < 1e-6
  report.checks = {
    dragMoved: dragged.tasman.x !== start.x || dragged.tasman.z !== start.z,
    turnTurned: turned.tasman.yaw !== dragged.tasman.yaw,
    aiPlaceKeptTeacher: near(report.steps[3].tasman, turned.tasman) && /kept: tasman/.test(tried.readback),
    readbackSaysKept: /tasman: moved, turned by teacher, kept/.test(tried.readback),
    crewReframeIsOneStep: reframed.history.length === turned.history.length + 1 && reframed.shot.shot === 'medium',
    crewUndoRestoresShot: undone.shot.shot === frameCmd.shot,
    crewUndoKeepsTeacherEdits: near(undone.tasman, turned.tasman),
    saveLoadIdentical: identity.identical,
    cmdZUndoesTurn: near(afterUndo.tasman, dragged.tasman),
    shiftCmdZRedoesTurn: near(afterRedo.tasman, turned.tasman),
  }
  say('checks: ' + JSON.stringify(report.checks, null, 1))
} finally {
  writeFileSync(`${out}/roundtrip.json`, JSON.stringify(report, null, 2))
  writeFileSync(`${out}/roundtrip.log`, log.join('\n') + '\n')
  await browser.close()
}
