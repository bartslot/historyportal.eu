/**
 * Thumbnails for every stage25d scene of a lesson, in one go (the editor takes one when a scene is opened; this opens them all).
 *   node scripts/stage25d-stills.mjs <lessonId> [--base http://localhost:8000]
 * Needs the app running and a teacher session (the dev auto-login). Headless Chromium draws the stage with SwiftShader.
 */
import { chromium } from 'playwright'

const [lessonId, ...rest] = process.argv.slice(2)
if (!/^\d+$/.test(lessonId ?? '')) { console.error('usage: node scripts/stage25d-stills.mjs <lessonId> [--base URL]'); process.exit(1) }
const base = rest[rest.indexOf('--base') + 1] || 'http://localhost:8000'
const SETTLE_MS = 6000   // the editor takes the picture 2.5 s after the stage is drawn; leave room for the save

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio', '--autoplay-policy=user-gesture-required'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript(() => {
  // silent: nothing here may make a sound
  HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return Promise.resolve() }
  const AC = window.AudioContext || window.webkitAudioContext
  if (AC) AC.prototype.resume = () => Promise.resolve()
})
await page.goto(`${base}/teacher/lessons/${lessonId}/wizard?step=4`)
await page.waitForSelector('[data-scene-id]')
const ids = await page.$$eval('[data-scene-id]', (els) => els.map((e) => Number(e.dataset.sceneId)))
let drawn = 0
for (const id of ids) {
  await page.click(`[data-thumb][data-scene-id="${id}"]`)
  const isStage = await page.waitForFunction((n) => window.__stage25d?.sceneId === n, id, { timeout: 4000 }).then(() => true, () => false)
  if (!isStage) continue
  await page.waitForTimeout(SETTLE_MS)
  drawn++
  console.log(`scene ${id} drawn`)
}
console.log(`${drawn} stage scenes visited`)
await browser.close()
