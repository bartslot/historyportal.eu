/**
 * Renders moments of a recorded test session to PNG: replays the rrweb recording in headless
 * Chromium, pauses it at each requested time and screenshots the replayed page.
 *
 *   node scripts/test-session-snapshot.mjs job.json
 *
 * job.json: { startedAtMs, events: [rrweb events], shots: [{ atMs, out }] }  (written by
 * App\Services\TestSessions\TestSessionSnapshots). Prints the paths it wrote as JSON.
 *
 * SILENT: --mute-audio, and every media element and AudioContext is stubbed in the page and in the
 * replay iframe, so nothing can play out loud whatever the recording contains. Pictures and fonts
 * load from the site the session was recorded on, so that site must be reachable.
 */
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const job = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const rrwebJs = readFileSync(resolve(root, 'node_modules/rrweb/dist/rrweb.umd.cjs'), 'utf8')
const rrwebCss = readFileSync(resolve(root, 'node_modules/rrweb/dist/style.css'), 'utf8')
const SETTLE_MS = 1500

// Runs in the page and again inside the replay iframe.
function silence (win) {
  const proto = win.HTMLMediaElement?.prototype
  if (proto && !proto.__hpSilent) {
    proto.play = function () { this.muted = true; return Promise.resolve() }
    proto.__hpSilent = true
  }
  const Silent = class { constructor () { this.state = 'suspended' } resume () { return Promise.resolve() } suspend () { return Promise.resolve() } close () { return Promise.resolve() } createGain () { return { connect () {}, gain: {} } } }
  win.AudioContext = Silent
  win.webkitAudioContext = Silent
}

const events = [...job.events].sort((a, b) => a.timestamp - b.timestamp)
if (!events.length) { console.log('[]'); process.exit(0) }
const meta = events.find((e) => e.type === 4)?.data ?? { width: 1280, height: 800 }

const browser = await chromium.launch({ args: ['--mute-audio', '--autoplay-policy=user-gesture-required'] })
const written = []
try {
  const page = await browser.newPage({ viewport: { width: meta.width, height: meta.height } })
  await page.addInitScript(silence.toString() + '; silence(window)')
  await page.setContent(`<!doctype html><html><head><style>${rrwebCss} html,body{margin:0;background:#0f172a}</style></head><body><div id="root"></div></body></html>`)
  await page.addScriptTag({ content: rrwebJs })
  await page.evaluate(({ events, silenceSrc }) => {
    const silence = new Function('win', `(${silenceSrc})(win)`)
    window.__replayer = new window.rrweb.Replayer(events, {
      root: document.getElementById('root'),
      skipInactive: false,
      showWarning: false,
      mouseTail: false,
      triggerFocus: false,
    })
    window.__silence = () => silence(window.__replayer.iframe.contentWindow)
    window.__silence()
  }, { events, silenceSrc: silence.toString() })

  const first = events[0].timestamp
  const last = events[events.length - 1].timestamp
  for (const shot of job.shots) {
    const offset = Math.min(Math.max(job.startedAtMs + shot.atMs - first, 0), last - first)
    await page.evaluate((ms) => { window.__replayer.pause(ms); window.__silence() }, offset)
    await page.waitForTimeout(SETTLE_MS) // pictures load from the recorded site
    mkdirSync(dirname(shot.out), { recursive: true })
    await page.locator('iframe').first().screenshot({ path: shot.out })
    written.push(shot.out)
  }
} finally {
  await browser.close()
}
console.log(JSON.stringify(written))
