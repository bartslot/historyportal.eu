// Per figure scene: the speaker's share of the frame height at the time of the still (and the worst over the scene's shots).
//   node tools/figure-share.mjs <base> [lesson=hunebedden]
import { chromium } from '/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/node_modules/playwright/index.mjs'
const [base, lessonId = 'hunebedden'] = process.argv.slice(2)
const browser = await chromium.launch({ args: ['--mute-audio'] })
const page = await browser.newPage()
await page.goto(`${base}/play.html?lesson=${lessonId}&intro=0`)
await page.waitForFunction(() => window.__play)
const rows = await page.evaluate(async () => {
  const L = await import('/src/stage25d/layout.ts')
  const S = await import('/src/director/speaker.ts')
  return window.__play.lesson.scenes.flatMap((s, i) => {
    const f = S.speakerFigure(s)
    if (!f?.h_m) return []
    const z = L.DEPTH_Z[f.depth]
    const shares = []
    for (let t = 0; t < (s.dur_s ?? 6); t += 0.5) {
      const { cam, t: ct } = L.shotAt(s, t)
      const c = L.cameraAt(cam, ct, L.sceneDuration(s))
      shares.push(f.h_m / (2 * (z - c.z) * Math.tan(c.fov / 2)))
    }
    return [{ scene: i + 1, char: f.char, min: Math.min(...shares), max: Math.max(...shares) }]
  })
})
const f = (n) => n.toFixed(2)
rows.forEach((r) => console.log(String(r.scene).padStart(2), r.char.padEnd(12), f(r.min), f(r.max)))
const mins = rows.map((r) => r.min).sort((a, b) => a - b)
console.log('scenes', rows.length, 'median min share', f(mins[Math.floor(mins.length / 2)]), 'below .25:', rows.filter((r) => r.min < 0.25).length)
await browser.close()
