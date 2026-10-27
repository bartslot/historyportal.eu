// Silent end-to-end check of play.html: intro -> handoff -> the directed lesson on S1's stage with
// LessonSound, then a frame every 10 s of lesson time for a contact sheet. Nothing is heard:
// Chromium --mute-audio, AudioContext kept suspended, media muted.
//   node tools/play-check.mjs [base=http://localhost:5291] [outDir=.] [lesson=eerste-boeren-1] [stepS=10]
import { mkdirSync } from 'node:fs'
import { chromium } from '/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/node_modules/playwright/index.mjs'

const [base = 'http://localhost:5291', out = '.', lessonId = 'eerste-boeren-1', stepArg = '10'] = process.argv.slice(2)
const STEP = Number(stepArg)
mkdirSync(`${out}/frames`, { recursive: true })
const SILENT = () => {
  const AC = window.AudioContext
  window.AudioContext = class extends AC { constructor(...a) { super(...a); super.suspend() } resume() { return Promise.resolve() } }
  const play = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function () { this.muted = true; return play.call(this) }
}

const browser = await chromium.launch({ args: ['--mute-audio', '--use-gl=angle'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
await page.addInitScript(SILENT)
const errors = [], warnings = [], failed = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning') warnings.push(m.text()) })
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('requestfailed', (r) => failed.push(r.url()))
page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`) })

await page.goto(`${base}/play.html?lesson=${lessonId}`)
await page.waitForFunction(() => window.__play, null, { timeout: 60000 })
const info = await page.evaluate(() => ({ id: window.__play.lesson.id, scenes: window.__play.lesson.scenes.length, problems: window.__play.problems, total: window.__play.player.duration(), voices: window.__play.lesson.scenes.filter((s) => s.tts_url).length }))

// intro -> handoff -> the lesson plays
await page.evaluate(() => { window.__msgs = []; addEventListener('message', (e) => window.__msgs.push(e.data?.type)) })
await page.click('#start')
await page.waitForFunction(() => window.__msgs.includes('hp-intro:ready'), null, { timeout: 90000 })
await page.waitForFunction(() => window.__msgs.includes('hp-intro:handoff'), null, { timeout: 60000 })
await page.locator('#wrap').screenshot({ path: `${out}/intro-handoff.png` })
await page.waitForFunction(() => !document.querySelector('#intro-host iframe'), null, { timeout: 15000 })
const t0 = await page.evaluate(() => window.__play.player.clock())
await page.waitForTimeout(12000)
const played = await page.evaluate(() => ({ t: window.__play.player.clock(), scene: window.__play.player.scene(), fps: window.__play.player.fps() }))
await page.locator('#wrap').screenshot({ path: `${out}/playing-12s.png` })
const sound = await page.evaluate(() => {
  const s = window.__play.sound
  const kinds = {}
  for (const l of s.log) kinds[l.ev.kind] = (kinds[l.ev.kind] ?? 0) + 1
  return { state: s.state(), kinds, first: s.log.slice(0, 8).map((l) => `${l.ev.kind}${l.ev.id ? ':' + l.ev.id : ''}${l.ev.t !== undefined ? '@' + l.ev.t : ''}`) }
})

// one card of each kind: seek to a second before its hold point, play into it, take the card, run it
const kinds = await page.evaluate(() => {
  const p = window.__play, seen = new Set(), out = []
  p.lesson.scenes.forEach((s, i) => {
    const it = s.interaction
    if (!it) return
    const kind = it.type === 'power-meter' ? 'meter' : it.format === 'team' ? 'team' : it.type === 'choice' ? (it.format === 'vote' ? 'vote' : 'choose') : it.format === 'open' ? 'discuss' : it.format === 'sort' ? 'sort' : 'answer'
    if (!seen.has(kind)) { seen.add(kind); out.push({ i, id: s.id, kind, hold: it.type === 'power-meter' ? s.dur_s * 0.55 : s.dur_s - 0.15 }) }
  })
  return out
})
const cardRuns = []
for (const k of kinds) {
  await page.evaluate(async ({ i, hold }) => { const p = window.__play; p.player.pause(); await p.player.seek(i, Math.max(0, hold - 1)); p.player.play() }, k)
  await page.waitForSelector('[data-testid=card]', { timeout: 10000 })
  const held = await page.evaluate(() => ({ mode: window.__play.player.scene().mode, t: window.__play.player.scene().t, clock: window.__play.player.clock(), held: window.__play.sound.state().held }))
  await page.locator('#wrap').screenshot({ path: `${out}/card-${k.kind}.png` })
  const card = page.locator('[data-testid=card]')
  if (k.kind === 'meter') { for (const b of await card.locator('.flex-wrap button').all()) await b.click() }
  else if (['answer', 'choose', 'vote'].includes(k.kind)) await card.locator('.grid button').first().click()
  else await card.locator('button.btn-primary').first().click()
  await page.waitForTimeout(400)
  await page.locator('#wrap').screenshot({ path: `${out}/card-${k.kind}-after.png` })
  await card.locator('footer button.btn-primary').click()
  await page.waitForSelector('[data-testid=card]', { state: 'detached', timeout: 5000 })
  await page.waitForTimeout(500)
  const after = await page.evaluate(() => ({ mode: window.__play.player.scene().mode, index: window.__play.player.scene().index, held: window.__play.sound.state().held }))
  cardRuns.push({ ...k, held, after })
}
// the kinds no vault lesson has yet (sort, vote, team): three of the lesson's own interaction scenes are
// given those cards IN MEMORY (the vault is not touched), then played into again (a card plays once per entry)
const extra = await page.evaluate(() => {
  const p = window.__play, ids = p.lesson.scenes.map((s, i) => (s.interaction && s.interaction.type !== 'power-meter' ? i : -1)).filter((i) => i >= 0)
  const make = [
    ['sort', { type: 'quiz', format: 'sort', question: 'Zet de bouw van een hunebed in de goede volgorde.', options: ['Stenen slepen', 'Draagstenen rechtop zetten', 'Deksteen erop', 'Zand eromheen'], correct: [0, 1, 2, 3], explain: 'Eerst de draagstenen, dan pas de deksteen.' }],
    ['vote', { type: 'choice', format: 'vote', prompt: 'Zou jij een hunebed willen bouwen?', options: [{ text: 'Ja, samen lukt het.', outcome: 'Met veel mensen en boomstammen kon het.' }, { text: 'Nee, te zwaar.', outcome: 'Het was ook zwaar werk, maanden lang.' }] }],
    ['team', { type: 'quiz', format: 'team', question: 'Teken in je groepje hoe de deksteen omhoog kwam.', options: [], correct: null, explain: 'Een oprit van zand en rollen van boomstammen.', class_action_s: 90 }],
  ]
  return make.map(([kind, it], k) => { const i = ids[k]; p.lesson.scenes[i].interaction = it; const s = p.lesson.scenes[i]; return { i, id: s.id, kind, hold: s.dur_s - 0.15 } })
})
for (const k of extra) {
  await page.evaluate(async ({ i, hold }) => { const p = window.__play; p.player.pause(); await p.player.seek(i, Math.max(0, hold - 1)); p.player.play() }, k)
  await page.waitForSelector('[data-testid=card]', { timeout: 10000 })
  await page.locator('#wrap').screenshot({ path: `${out}/card-${k.kind}.png` })
  const card = page.locator('[data-testid=card]')
  if (k.kind === 'vote') await card.locator('.grid button').first().click()
  else await card.locator('button.btn-primary').first().click()
  await page.waitForTimeout(400)
  await page.locator('#wrap').screenshot({ path: `${out}/card-${k.kind}-after.png` })
  await card.locator('footer button.btn-primary').click()
  await page.waitForSelector('[data-testid=card]', { state: 'detached', timeout: 5000 })
  cardRuns.push({ ...k, extra: true })
}

const cardLog = await page.evaluate(() => window.__play.cards.log.map((l) => `${l.scene}:${l.what}`))
const soundKinds = await page.evaluate(() => window.__play.sound.log.filter((l) => ['hold', 'release', 'hit'].includes(l.ev.kind)).map((l) => `${l.ev.kind}${l.ev.id ? ':' + l.ev.id : ''}`))

// narration through the real graph, silently: the first 30 s rendered offline (no output device);
// narration on its own bus vs the whole mix, per 1 s
const voice = await page.evaluate(async () => {
  const p = window.__play, SR = 22050, D = 30
  const L = window.__play.sound.constructor
  const off = new OfflineAudioContext(1, SR * D, SR)
  const s = new L(off)
  s.master.disconnect(); s.narration.connect(off.destination) // the narration bus alone
  await s.play(p.lesson, 0)
  const d = (await off.startRendering()).getChannelData(0)
  const db = (a, b) => { let x = 0; for (let i = a * SR; i < b * SR; i++) x += d[i] * d[i]; return +(20 * Math.log10(Math.sqrt(x / ((b - a) * SR)) + 1e-9)).toFixed(1) }
  const voices = s.log.filter((l) => l.ev.kind === 'voice').map((l) => l.ev.url.split('/').pop() + '@' + l.ev.t)
  return { voices, perSecond: Array.from({ length: D }, (_, i) => db(i, i + 1)) }
})

// the story layer: captions on, a scene with a balloon, at the balloon's time
await page.click('#captions')
const storyShot = await page.evaluate(async () => {
  const p = window.__play, i = p.lesson.scenes.findIndex((s) => s.balloons?.length)
  if (i < 0) return null
  const s = p.lesson.scenes[i], b = s.balloons[0]
  p.player.pause(); await p.player.seek(i, b.at_s + 0.3)
  await new Promise((r) => setTimeout(r, 300))
  return { scene: s.id, balloon: document.querySelector('.story-balloon')?.textContent ?? null, caption: document.querySelector('.story-caption')?.textContent ?? null }
})
await page.locator('#wrap').screenshot({ path: `${out}/story-balloon-caption.png` })
await page.click('#captions')

// contact sheet: seek to every STEP s of lesson time, let the scene build, grab the frame
await page.evaluate(() => window.__play.player.pause())
const shots = []
for (let at = 0, k = 0; at < info.total; at += STEP, k++) {
  const where = await page.evaluate(async (time) => {
    const p = window.__play
    let i = 0, start = 0
    while (i < p.lesson.scenes.length - 1 && start + p.lesson.scenes[i].dur_s <= time) { start += p.lesson.scenes[i].dur_s; i++ }
    await p.player.seek(i, time - start)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const s = p.lesson.scenes[i], local = time - start
    const shots = [s.camera, ...(s.camera_more ?? [])].filter(Boolean)
    const c = [...shots].reverse().find((x) => (x.at_s ?? 0) <= local) ?? shots[0]
    return { i, id: s.id, beat: s.beat, move: c?.move, scale: c?.scale, misses: p.player.stage.misses.filter((m) => m.scene === s.id).length }
  }, at)
  await page.locator('#stage').screenshot({ path: `${out}/frames/f${String(k).padStart(3, '0')}.png` })
  shots.push({ at, ...where })
}
console.log(JSON.stringify({ info, voice, t0, played, sound, cardRuns, cardLog, soundKinds, storyShot, shots: shots.length, misses: shots.reduce((a, s) => a + s.misses, 0), sample: shots.slice(0, 6), errors, failed, warnings: warnings.slice(0, 8) }, null, 1))
await browser.close()
