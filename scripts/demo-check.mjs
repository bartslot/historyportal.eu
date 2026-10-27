/**
 * Demo route check: walks Bart's demo on the LIVE site and says what is broken before he demos.
 *
 *   npm run demo:check                      # against https://historyportal.eu
 *   DEMO_BASE_URL=http://localhost:8000 npm run demo:check
 *   DEMO_HEADED=1 npm run demo:check        # watch it (still silent)
 *
 * Writes storage/demo-check/<timestamp>/report.md + a screenshot per failed step. Exit code:
 * 0 all passed, 1 a step failed, 2 SiteGround answered with its bot challenge.
 *
 * SILENT: Chromium runs with --mute-audio, every media element is muted on play() (it still
 * plays, so the player advances on `ended`), and AudioContext.resume() never resumes.
 * Subtitles are switched on through the player's own remembered choice (localStorage lp:captions).
 * READ-ONLY: it never signs in and never writes data, except /try, which gives this browser one
 * guest sandbox (pruned automatically). The guest cookie is kept in storage/demo-check/guest-state.json
 * so later runs reuse that sandbox instead of making a new one.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { collectMediaUrls, findStaleFrames, isSiteGroundChallenge, parseLessonJson, sceneChanges, scenePictureKeys } from './lib/demo-check-analysis.mjs'

const BASE = (process.env.DEMO_BASE_URL ?? 'https://historyportal.eu').replace(/\/$/, '')
const ORIGIN = new URL(BASE).origin
const NL_CODE = 'W24VRI'
const EN_CODE = 'MP1EPN'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
const VIEWPORT = { width: 1440, height: 900 }
const SETTLE_MS = 10_000          // the app animates after load; Bart's rule: wait ~10 s
const SCENE_CHANGES = 5
const SAMPLE_MS = 40
const HEAD_CONCURRENCY = 8

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const stateDir = resolve(root, 'storage/demo-check')
const outDir = resolve(stateDir, new Date().toISOString().replace(/[:.]/g, '-'))
const guestState = resolve(stateDir, 'guest-state.json')
mkdirSync(outDir, { recursive: true })

class Blocked extends Error {}
const results = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── Silence: runs in every frame before any page script ─────────────────────
function silence () {
  // Subtitles on, as a pupil who turned them on once has it (the player's own remembered choice).
  try { localStorage.setItem('lp:captions', '1') } catch (_) { /* storage blocked: captions stay as the lesson sets them */ }
  const proto = window.HTMLMediaElement?.prototype
  if (proto && !proto.__dcSilent) {
    const play = proto.play
    proto.play = function () { this.muted = true; this.volume = 0; return play.call(this) }
    proto.__dcSilent = true
  }
  for (const name of ['AudioContext', 'webkitAudioContext']) {
    const Real = window[name]
    if (!Real || Real.__dcSilent) continue
    const Silent = class extends Real {
      constructor (...a) { super(...a); super.suspend?.().catch(() => {}) }
      resume () { return Promise.resolve() }
    }
    Silent.__dcSilent = true
    window[name] = Silent
  }
}

// ── Per-page error collection ───────────────────────────────────────────────
function watch (page) {
  const log = { console: [], failed: [] }
  page.on('console', (m) => { if (m.type() === 'error') log.console.push(m.text().slice(0, 300)) })
  page.on('pageerror', (e) => log.console.push(`pageerror: ${String(e.message || e).slice(0, 300)}`))
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith(ORIGIN)) log.failed.push(`${r.status()} ${r.url()}`)
  })
  page.on('requestfailed', (r) => {
    const why = r.failure()?.errorText ?? ''
    if (r.url().startsWith(ORIGIN) && !/ERR_ABORTED/.test(why)) log.failed.push(`${why} ${r.url()}`)
  })
  return log
}

const problems = (log) => [
  ...log.console.map((c) => `console error: ${c}`),
  ...log.failed.map((f) => `failed request: ${f}`),
]

async function goto (page, path) {
  const res = await page.goto(BASE + path, { waitUntil: 'load', timeout: 60_000 })
  const status = res?.status() ?? 0
  const body = status === 202 || status === 200 ? await res.text().catch(() => '') : ''
  if (isSiteGroundChallenge(status, body)) throw new Blocked(`blocked by SiteGround challenge (${status} on ${path})`)
  if (status !== 200) throw new Error(`${path} answered ${status}`)
  return res
}

async function step (name, page, fn) {
  const started = Date.now()
  try {
    const notes = (await fn()) ?? []
    results.push({ name, ok: true, notes, ms: Date.now() - started })
  } catch (e) {
    const shot = page ? `${results.length + 1}-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png` : null
    if (shot) await page.screenshot({ path: resolve(outDir, shot) }).catch(() => {})
    results.push({ name, ok: false, blocked: e instanceof Blocked, error: String(e.message || e), notes: e.notes ?? [], shot, ms: Date.now() - started })
  }
}

const fail = (message, notes = []) => Object.assign(new Error(message), { notes })
const until = async (fn, timeoutMs, what) => {
  const end = Date.now() + timeoutMs
  for (;;) {
    const v = await fn().catch(() => null)
    if (v) return v
    if (Date.now() > end) throw new Error(`timed out after ${timeoutMs / 1000}s waiting for ${what}`)
    await sleep(200)
  }
}

async function realClick (page, locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('nothing to click (no bounding box)')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 })
  await page.mouse.down()
  await page.mouse.up()
}

// ── 1. Homepage ─────────────────────────────────────────────────────────────
async function checkHomepage (page, log, path) {
  await goto(page, path)
  await until(() => page.evaluate(() => document.documentElement.classList.contains('hero-revealed')), 45_000, 'the hero intro to finish (html.hero-revealed)')
  await until(() => page.evaluate(() => {
    const item = document.querySelector('[data-portal-play]')?.closest('[data-reveal-item]')
    return item && getComputedStyle(item).opacity === '1'
  }), 15_000, 'the poster to land (opacity 1)')
  const poster = await until(() => page.evaluate(() => {
    const img = document.querySelector('[data-portal-play] img')
    return img?.complete ? { src: img.currentSrc || img.src, w: img.naturalWidth, href: img.closest('a').href } : null
  }), 15_000, 'the poster <img> to load')
  await sleep(1_000)
  const notes = [`poster ${poster.src} -> ${poster.href}`]
  const errs = []
  if (!poster.w) errs.push(`poster image did not decode (naturalWidth 0): ${poster.src}`)
  if (!/\/lesson-titles\/[^/]+\/.*portrait-still/.test(poster.src)) errs.push(`poster is not a lesson-titles/*/portrait-still image: ${poster.src}`)
  errs.push(...problems(log))
  if (errs.length) throw fail(errs[0], errs)
  return notes
}

// ── 2. Poster -> portal -> title screen ─────────────────────────────────────
async function checkPortal (page, log) {
  const before = { console: log.console.length, failed: log.failed.length }
  await realClick(page, page.locator('[data-portal-play]'))
  const state = await until(() => page.evaluate((code) => {
    const frame = document.querySelector('.lesson-portal-frame')
    const doc = frame?.contentDocument
    const ts = doc?.querySelector('[data-title-screen]')
    const start = [...(doc?.querySelectorAll('button') ?? [])].find((b) => /Start de les/i.test(b.textContent) && b.getClientRects().length)
    const s = { entered: document.documentElement.classList.contains('portal-entered'), path: location.pathname, title: !!ts?.getClientRects().length, start: !!start, frame: !!frame }
    return s.entered && s.title && s.start && s.path.endsWith(`/lesson/${code}`) ? s : null
  }, NL_CODE), 20_000, `the portal to open on the /lesson/${NL_CODE} title screen with "Start de les"`).catch(async (e) => {
    const s = await page.evaluate(() => ({ path: location.pathname, entered: document.documentElement.classList.contains('portal-entered'), frame: !!document.querySelector('.lesson-portal-frame') }))
    throw fail(`${e.message}; state ${JSON.stringify(s)}`)
  })
  await sleep(2_000)
  const errs = problems({ console: log.console.slice(before.console), failed: log.failed.slice(before.failed) })
  if (errs.length) throw fail(errs[0], errs)
  return [`portal ${JSON.stringify(state)}`]
}

// ── 3. Playback (in the portal frame, as Bart sees it) ──────────────────────
function installSampler (sampleMs) {
  const el = document.querySelector('[x-data^="lessonGame"]')
  const data = () => window.Alpine?.$data?.(el) ?? el?._x_dataStack?.[0]
  window.__dc = { samples: [], t0: performance.now() }
  window.__dcData = data
  setInterval(() => {
    const d = data()
    if (!d) return
    const bg = document.getElementById('background-layer')
    window.__dc.samples.push({
      t: Math.round(performance.now() - window.__dc.t0),
      idx: d._sceneIndex ?? null,
      phase: d.phase,
      bgOp: bg ? +getComputedStyle(bg).opacity : 0,
      flat: bg ? [...bg.children].map((c) => ({ url: c.style.backgroundImage || null, op: +getComputedStyle(c).opacity })) : [],
      px: [...document.querySelectorAll('.px-scene')].map((r) => +getComputedStyle(r).opacity),
    })
  }, sampleMs)
}

/** What the stage shows right now: a decoded panel, flat picture or canvas. */
async function stagePicture () {
  const visible = (e) => e.getClientRects().length && +getComputedStyle(e).opacity > 0.05
  const px = [...document.querySelectorAll('.px-scene')].filter((r) => +getComputedStyle(r).opacity >= 0.99).pop()
  if (px) {
    const imgs = [...px.querySelectorAll('img')]
    const bad = imgs.filter((i) => !i.complete || !i.naturalWidth).map((i) => i.src)
    return { kind: 'panel', ok: imgs.length > 0 && !bad.length, detail: bad.length ? `undecoded: ${bad.join(', ')}` : `${imgs.length} img` }
  }
  const bg = document.getElementById('background-layer')
  const layer = bg && +getComputedStyle(bg).opacity > 0.05 ? [...bg.children].find((c) => +getComputedStyle(c).opacity > 0.5 && c.style.backgroundImage) : null
  if (layer) {
    const url = layer.style.backgroundImage.replace(/^url\(["']?/, '').replace(/["']?\)$/, '')
    const img = new Image()
    img.src = url
    const ok = await Promise.race([img.decode().then(() => img.naturalWidth > 0, () => false), new Promise((r) => setTimeout(() => r(false), 5000))])
    return { kind: 'flat', ok, detail: url }
  }
  const canvas = [...document.querySelectorAll('#lesson-stage canvas, canvas')].find((c) => visible(c) && c.width > 0)
  if (canvas) return { kind: 'canvas', ok: true, detail: `${canvas.width}x${canvas.height}` }
  return { kind: 'none', ok: false, detail: 'no visible panel, flat picture or canvas' }
}

function playerNow () {
  const d = window.__dcData()
  const cc = document.querySelector('.lp-cc')
  return {
    idx: d._sceneIndex, phase: d.phase,
    audio: d._audio?.src || null, paused: d._audio?.paused ?? null, muted: d._audio?.muted ?? null,
    captionsOn: d.captionsOn, captionText: d.captionText || '', captionShown: !!(cc && cc.getClientRects().length && getComputedStyle(cc).display !== 'none'),
  }
}

async function headOk (request, url) {
  let res = await request.head(url, { timeout: 30_000 }).catch((e) => ({ status: () => `error ${e.message}` }))
  if (typeof res.status() === 'number' && [403, 405, 501].includes(res.status())) {
    res = await request.get(url, { headers: { Range: 'bytes=0-0' }, timeout: 30_000 }).catch((e) => ({ status: () => `error ${e.message}` }))
  }
  const s = res.status()
  return { url, status: s, ok: s === 200 || s === 206 }
}

async function startLesson (page, frame, label) {
  const start = frame.getByRole('button', { name: new RegExp(label, 'i') }).filter({ visible: true }).first()
  await start.waitFor({ timeout: 15_000 })
  await realClick(page, start)
  await until(() => frame.evaluate(() => {
    const el = document.querySelector('[x-data^="lessonGame"]')
    const d = window.Alpine?.$data?.(el) ?? el?._x_dataStack?.[0]
    return d && !['TITLE_SCREEN', 'LOADING'].includes(d.phase) ? d.phase : null
  }), 30_000, 'the lesson to leave the title screen after Start')
}

async function checkPlayback (page, log) {
  const before = { console: log.console.length, failed: log.failed.length }
  const frame = await (await page.$('.lesson-portal-frame'))?.contentFrame()
  if (!frame) throw new Error('no portal frame to play in')
  const lesson = await frame.evaluate(() => window.LESSON)
  await startLesson(page, frame, 'Start de les')
  await frame.evaluate(installSampler, SAMPLE_MS)

  const errs = []
  const notes = []
  let last = (await frame.evaluate(playerNow)).idx
  notes.push(`start at scene index ${last}`)
  for (let n = 1; n <= SCENE_CHANGES; n++) {
    const scene = lesson.scenes[last]
    const waitMs = ((scene?.duration_seconds ?? 15) + 25) * 1000
    const next = await until(() => frame.evaluate((l) => {
      const d = window.__dcData()
      return d._sceneIndex !== l ? d._sceneIndex : null
    }, last), waitMs, `scene change ${n}`)
      .catch(async (e) => {
        const phase = (await frame.evaluate(playerNow).catch(() => ({}))).phase
        errs.push(`${e.message}: stuck on scene ${last + 1} (${scene?.kind}${scene?.game_type ? '/' + scene.game_type : ''}, phase ${phase})`)
        return null
      })
    if (next == null) break
    await sleep(3_000)
    const pic = await frame.evaluate(stagePicture)
    const now = await frame.evaluate(playerNow)
    const target = lesson.scenes[next]
    const line = `change ${n}: scene ${last + 1} -> ${next + 1} (${target?.kind}) picture=${pic.kind}${pic.ok ? '' : ' BROKEN'} audio=${now.audio ? 'yes' : 'none'} cc=${now.captionsOn ? (now.captionShown ? 'shown' : 'MISSING') : 'off'}`
    notes.push(line)
    if (!pic.ok) errs.push(`scene ${next + 1}: ${pic.kind} picture not visible/decoded (${pic.detail})`)
    if (target?.audio_url && !now.audio) errs.push(`scene ${next + 1}: has audio_url but no audio element is playing`)
    if (now.audio) {
      const h = await headOk(page.request, now.audio)
      if (!h.ok) errs.push(`scene ${next + 1}: narration ${h.status} ${now.audio}`)
      if (now.muted === false) errs.push(`scene ${next + 1}: narration is NOT muted (silence stub failed)`)
    }
    if (now.captionsOn && target?.audio_url && !now.captionShown) errs.push(`scene ${next + 1}: subtitles on but no caption on screen (captionText "${now.captionText}")`)
    last = next
  }

  const samples = await frame.evaluate(() => window.__dc.samples)
  writeFileSync(resolve(outDir, 'playback-samples.json'), JSON.stringify(samples))
  const keysOf = (i) => scenePictureKeys(lesson.scenes[i] ?? {})
  for (const ch of sceneChanges(samples)) {
    const around = samples.filter((s) => s.t >= ch.t - 500 && s.t <= ch.t + 2500)
    const stale = findStaleFrames(around, ch.from, ch.to, keysOf)
    if (stale.length) {
      const pic = stale[0].flat.find((l) => l.op > 0.05)?.url
      errs.push(`scene ${ch.from + 1} -> ${ch.to + 1}: stale picture on stage for ~${stale.length * SAMPLE_MS} ms (${pic})`)
    }
  }
  notes.push(`${samples.length} stage samples at ${SAMPLE_MS} ms, ${sceneChanges(samples).length} scene changes seen`)
  errs.push(...problems({ console: log.console.slice(before.console), failed: log.failed.slice(before.failed) }))
  if (errs.length) throw fail(errs[0], [...errs, ...notes])
  return notes
}

async function checkEnglishLesson (page, log) {
  await goto(page, `/lesson/${EN_CODE}`)
  await sleep(SETTLE_MS)
  const title = await page.evaluate(() => !!document.querySelector('[data-title-screen]')?.getClientRects().length)
  if (!title) throw new Error('title screen not visible')
  await startLesson(page, page.mainFrame(), 'Start lesson')
  await page.evaluate(installSampler, SAMPLE_MS)
  await sleep(6_000)
  const pic = await page.evaluate(stagePicture)
  const now = await page.evaluate(playerNow)
  const errs = []
  if (!pic.ok) errs.push(`first scene: ${pic.kind} picture not visible/decoded (${pic.detail})`)
  if (now.audio) {
    const h = await headOk(page.request, now.audio)
    if (!h.ok) errs.push(`narration ${h.status} ${now.audio}`)
  } else errs.push(`no narration playing in phase ${now.phase}`)
  errs.push(...problems(log))
  if (errs.length) throw fail(errs[0], errs)
  return [`scene ${now.idx + 1} picture=${pic.kind} audio=${now.audio}`]
}

// ── 4. Every scene's media ──────────────────────────────────────────────────
async function checkMedia (request, code) {
  const res = await request.get(`${BASE}/lesson/${code}`, { timeout: 60_000 })
  const html = await res.text()
  if (isSiteGroundChallenge(res.status(), html)) throw new Blocked(`blocked by SiteGround challenge (${res.status()})`)
  const lesson = parseLessonJson(html)
  if (!lesson) throw new Error(`no window.LESSON on /lesson/${code} (${res.status()})`)
  const urls = collectMediaUrls(lesson, BASE + '/')
  const out = []
  for (let i = 0; i < urls.length; i += HEAD_CONCURRENCY) {
    out.push(...await Promise.all(urls.slice(i, i + HEAD_CONCURRENCY).map((u) => headOk(request, u))))
  }
  const bad = out.filter((r) => !r.ok)
  const summary = `${lesson.scenes?.length ?? 0} scenes, ${urls.length} media urls, ${bad.length} not 200`
  if (bad.length) throw fail(`${summary}: first ${bad[0].status} ${bad[0].url}`, [summary, ...bad.map((b) => `${b.status} ${b.url}`)])
  return [summary]
}

// ── 5. Editor (guest sandbox) ───────────────────────────────────────────────
async function checkEditor (page, log, context) {
  await goto(page, '/try')
  const url = page.url()
  if (!/\/teacher\/lessons\/\d+\/wizard/.test(url)) throw new Error(`/try landed on ${url}, not the wizard`)
  if (!/[?&]step=4\b/.test(url)) throw new Error(`/try landed on ${url}, not step=4`)
  await context.storageState({ path: guestState })
  await sleep(SETTLE_MS)
  // What Bart shows: the scene rail, the stage, and the script under it (Script tab).
  const scriptTab = page.locator('[role="tab"]', { hasText: /^\s*Script\s*$/ }).first()
  if (await scriptTab.isVisible().catch(() => false)) {
    await realClick(page, scriptTab)
    await sleep(1_000)
  }
  const ui = await page.evaluate(() => {
    const visible = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'
    const stage = [...document.querySelectorAll('#wizard-canvas, [x-ref="stage"], canvas')].find(visible)
    const thumbs = [...document.querySelectorAll('[wire\\:key^="scene-thumb-"]')].filter(visible).length
    const script = [...document.querySelectorAll('[wire\\:key^="script-"]')].find(visible)
    return { stage: !!stage, thumbs, scriptChars: script?.innerText.trim().length ?? 0, scriptTab: !!document.querySelector('[role="tab"][aria-selected="true"]')?.textContent.includes('Script') }
  })
  const errs = []
  if (!ui.stage) errs.push('editor stage (#wizard-canvas / stage / canvas) not visible')
  if (!ui.thumbs) errs.push('no scenes listed in the scene rail')
  if (ui.scriptChars < 20) errs.push(`script panel empty or missing (${ui.scriptChars} chars, Script tab selected: ${ui.scriptTab})`)
  errs.push(...problems(log))
  if (errs.length) throw fail(errs[0], [...errs, JSON.stringify(ui)])
  return [`${url.replace(BASE, '')} ${JSON.stringify(ui)}`]
}

// ── Run ─────────────────────────────────────────────────────────────────────
const browser = await chromium.launch({
  headless: !process.env.DEMO_HEADED,
  args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'],
})
const newPage = async (opts = {}) => {
  const context = await browser.newContext({ viewport: VIEWPORT, userAgent: UA, locale: 'nl-NL', ...opts })
  await context.addInitScript(silence)
  const page = await context.newPage()
  return { context, page, log: watch(page) }
}

try {
  // Bart's demo, in order, in one tab: Dutch homepage -> poster -> portal -> play.
  const nl = await newPage()
  await step('1a homepage /nl: hero plays, poster loads', nl.page, () => checkHomepage(nl.page, nl.log, '/nl'))
  const blocked = results.at(-1).blocked
  if (!blocked) {
    if (results.at(-1).ok) {
      await step(`2 poster click: portal opens /lesson/${NL_CODE} title screen`, nl.page, () => checkPortal(nl.page, nl.log))
      if (results.at(-1).ok) await step(`3a playback ${NL_CODE}: first ${SCENE_CHANGES} scene changes`, nl.page, () => checkPlayback(nl.page, nl.log))
    }
    await nl.context.close()

    const en = await newPage({ locale: 'en-GB' })
    await step('1b homepage / (English): hero plays, poster loads', en.page, () => checkHomepage(en.page, en.log, '/'))
    await en.context.close()

    const enLesson = await newPage({ locale: 'en-GB' })
    await step(`3b lesson ${EN_CODE}: title screen, first scene plays`, enLesson.page, () => checkEnglishLesson(enLesson.page, enLesson.log))
    await enLesson.context.close()

    const media = await newPage()
    for (const code of [NL_CODE, EN_CODE]) await step(`4 media ${code}: every image/audio url answers 200`, null, () => checkMedia(media.context.request, code))
    await media.context.close()

    const guest = await newPage(existsSync(guestState) ? { storageState: guestState } : {})
    await step('5 editor: /try opens the guest wizard at step 4 with scenes', guest.page, () => checkEditor(guest.page, guest.log, guest.context))
    await guest.context.close()
  }
} finally {
  await browser.close()
}

// ── Report ──────────────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.ok)
const isBlocked = results.some((r) => r.blocked)
const lines = results.map((r) => `${r.ok ? 'PASS' : r.blocked ? 'BLOCKED' : 'FAIL'}  ${r.name}${r.ok ? '' : `\n      ${r.error}`}`)
console.log(`demo check ${BASE}\n${lines.join('\n')}\n\n${failed.length ? `${failed.length} of ${results.length} failed` : `all ${results.length} passed`}\nreport: ${resolve(outDir, 'report.md')}`)

const md = [
  `# Demo route check, ${new Date().toISOString()}`, '', `Site: ${BASE}`, '',
  `**${failed.length ? `${failed.length} of ${results.length} FAILED` : `all ${results.length} passed`}**`, '',
  ...results.flatMap((r) => [
    `## ${r.ok ? 'PASS' : r.blocked ? 'BLOCKED' : 'FAIL'}: ${r.name} (${(r.ms / 1000).toFixed(1)} s)`, '',
    ...(r.ok ? [] : [`**${r.error}**`, '']),
    ...r.notes.map((n) => `- ${n}`),
    ...(r.shot ? ['', `![${r.name}](${r.shot})`] : []), '',
  ]),
].join('\n')
writeFileSync(resolve(outDir, 'report.md'), md)
process.exit(isBlocked ? 2 : failed.length ? 1 : 0)
