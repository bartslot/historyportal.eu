/**
 * Does the narration run ahead of the stage? Measures, in the lesson player, when the narration starts playing and what
 * its clock (the stage's clock) reads when the scene's stage is ready, and fails when the stage misses more than
 * HOLD_MAX_S of it. Silent: Chromium runs with --mute-audio and every play() is muted before it starts.
 *
 *   PW_PLAYER_CODE=<lesson code> PW_BASE_URL=http://localhost:8062 npx playwright test tests/playwright/player-stage-timing.spec.ts --project=chromium [--headed]
 *
 * The lesson: tests/playwright/anim-composed-lesson.php with NARRATION_MP3 (a stage scene that has narration).
 */
import { test, expect } from '@playwright/test'
import { log } from './animation-presets-support'

test.use({ launchOptions: { args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'] } })

const CODE = process.env.PW_PLAYER_CODE ?? '3LAEPW'
const HOLD_MAX_S = 0.3   // the narration may be this far in when the stage is up (one frame of start-up is not a miss)
const RUNS = Number(process.env.PW_RUNS ?? 3)

for (let run = 1; run <= RUNS; run++) {
  test(`the stage is up before the narration runs on (run ${run})`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.addInitScript(() => {
      const AC = window.AudioContext
      if (AC) AC.prototype.resume = function () { return Promise.resolve() }
      const w = window as any
      w.__timing = { play: null, stage: null, narrAtStage: null }
      const play = HTMLMediaElement.prototype.play
      HTMLMediaElement.prototype.play = function () {
        this.muted = true; this.volume = 0
        if (this.src && /\.mp3|narration|audio/.test(this.src) && !w.__narr) {
          w.__narr = this
          this.addEventListener('playing', () => { w.__timing.play ??= performance.now() }, { once: true })
        }
        return play.call(this).catch(() => undefined)
      }
      const watch = setInterval(() => {
        const st = w.__stage25d, scene = w.BABYLON?.Engine?.LastCreatedScene
        if (st?.items?.().length && scene?.isReady?.()) {
          w.__timing.stage = performance.now()
          w.__timing.narrAtStage = w.__narr ? w.__narr.currentTime : null
          clearInterval(watch)
        }
      }, 10)
    })
    await page.goto(`/lesson/${CODE}`, { waitUntil: 'load' })
    const clicked = performance.now()
    await page.getByRole('button', { name: /start lesson|commencer la leçon|start de les|lektion starten|inizia la lezione|empezar la lecci[oó]n/i }).first().click({ timeout: 30_000 })
    await page.waitForFunction(() => (window as any).__timing.stage !== null, null, { timeout: 60_000 })
    // and then it does start: held for the stage, never blocked
    await page.waitForFunction(() => ((window as any).__narr?.currentTime ?? 0) > 0.2, null, { timeout: 15_000 })
    const t = await page.evaluate(() => (window as any).__timing)
    const result = { run, headed: !!process.env.PW_HEADED, playToStage_s: t.play && t.stage ? (t.stage - t.play) / 1000 : null, narrationAtStage_s: t.narrAtStage }
    log('player-stage-timing', result)
    void clicked
    expect(t.narrAtStage ?? 0, `the narration was ${t.narrAtStage?.toFixed(2)} s in when the stage was up`).toBeLessThanOrEqual(HOLD_MAX_S)
  })
}
