/**
 * Side-view stills of presets on chosen figures, large enough to judge (figure >= 400 px tall), WebP q30, plus a check
 * that every part stays on its parent (a foot never floats off its shin).
 *
 *   PW_ANIM_EDITOR=/teacher/lessons/<l>/wizard?step=4&scene=<s> PW_FIGS=layer-7:scribe,layer-8:girl \
 *   PW_PRESETS=dance_hop,walk,run,carry,wave PW_SUFFIX=-before PW_BASE_URL=http://localhost:8062 \
 *     npx playwright test tests/playwright/animation-presets-stills.spec.ts --project=chromium
 *
 * The scene comes from tests/playwright/ana-rig-lesson.php with KIT_CHARACTER=<id>,<id>.
 */
import { expect, test } from '@playwright/test'
import { captureFigure } from './stage-capture'
import { clearKeys, log, meshOf, openEditor, saveWebp, seekStage, seekTimeline, selectFigure } from './animation-presets-support'

const FIGS = (process.env.PW_FIGS ?? 'layer-6:ana,layer-7:scribe').split(',').map((f) => { const [id, name] = f.split(':'); return { id, name } })
const PRESETS = (process.env.PW_PRESETS ?? 'dance_hop,walk,run,carry,wave').split(',')
const SUFFIX = process.env.PW_SUFFIX ?? ''
const SAMPLES = 6        // stills per preset, across one cycle (or the whole move)
const MIN_HEIGHT = 400   // px a figure stands in a still

/** How far (px, puppet frame) each part's joint has drifted from the end of the part it hangs from, at the stage's time. */
const partGaps = (page: import('@playwright/test').Page, id: string) => page.evaluate((id) => (window as any).__stage25d.partGaps?.(id) ?? null, id)

test('stills of presets on the chosen figures, and no part leaves its parent', async ({ page }) => {
  test.setTimeout(1_200_000)
  await openEditor(page)
  const paths: string[] = []
  const gaps: { fig: string, preset: string, t: number, worst: number }[] = []
  for (const fig of FIGS) {
    const mesh = await meshOf(page, fig.id)
    await clearKeys(page, fig.id)
    for (const id of PRESETS) {
      const section = await selectFigure(page, fig.id)
      await seekTimeline(page, 0)
      await section.locator(`[data-animation-preset="${id}"]`).click()
      await section.locator('[data-animation-add]').click()
      await page.waitForTimeout(600)
      await page.evaluate(() => (window as any).__stage25d.clearSelection())
      const end = await page.evaluate((fid) => Math.max(...((window as any).__stage25d.items().find((i: any) => i.id === fid)?.keys ?? [{ t: 1 }]).map((k: any) => k.t)), fig.id)
      const span = Math.min(end, 1.6)
      for (let n = 0; n < SAMPLES; n++) {
        const t = Math.round((span * n / (SAMPLES - 1)) * 100) / 100
        await seekStage(page, t)
        const shot = await captureFigure(page, mesh, 3)
        const size = await page.evaluate(async (src) => { const i = new Image(); i.src = src; await i.decode(); return i.height }, shot)
        expect(size, `${fig.name} ${id} ${t}s stands ${size}px tall`).toBeGreaterThanOrEqual(MIN_HEIGHT)
        paths.push(saveWebp(shot, `${fig.name}-${id}-${t.toFixed(2)}s${SUFFIX}`))
        const g = await partGaps(page, fig.id)
        if (g) gaps.push({ fig: fig.name, preset: id, t, worst: Math.max(0, ...Object.values(g as Record<string, number>)) })
      }
      await clearKeys(page, fig.id)
    }
  }
  log('stills', { paths, gaps })
  for (const g of gaps) expect(g.worst, `${g.fig} ${g.preset} at ${g.t}s: a part left its parent by ${g.worst.toFixed(1)} px`).toBeLessThan(2)
})
