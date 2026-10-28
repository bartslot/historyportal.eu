import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAsTeacher } from './support/auth';

/**
 * The small-text floor, measured in the browser (PM decision, 2026-10-28).
 *
 * Any text a teacher reads or clicks in panels, inspectors, toolbars, toggles, helper text, links,
 * menus and dialogs is at least 12px, and text contrast is WCAG AA (4.5:1) against its real
 * background. This spec measures both on the editor: the map scene inspector, the layer panel and
 * the timeline. It does not trust the markup — a size is whatever the browser computed.
 *
 * The stage (#lesson-canvas-root) is excluded: it is the painted art the class sees, where an 8px
 * decorative label is allowed. Everything the teacher clicks or reads around it is measured.
 *
 * The fixture is resolved by tests/playwright/support/global-setup.ts (MAP_WIZARD_URL), so this
 * needs no env var and no opt-in: it runs with the rest of the suite and fails loudly if the local
 * database has no lesson with a map scene.
 */

const MAP_WIZARD_URL = process.env.MAP_WIZARD_URL ?? '';
const MIN_FONT_PX = 12;

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1024x700', width: 1024, height: 700 },
] as const;

/** Visible text nodes outside the painted stage, with the size the browser computed for each. */
async function smallTextOutsideStage(page: Page): Promise<Array<{ text: string; px: number }>> {
  return page.evaluate((minPx) => {
    const stage = document.getElementById('lesson-canvas-root');
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const small: Array<{ text: string; px: number }> = [];

    let node = walker.nextNode();
    while (node) {
      const text = (node.textContent ?? '').trim();
      const el = node.parentElement;
      node = walker.nextNode();
      // data-micro-label marks the decorative 8px labels on stage art and cards (the allowlist in
      // tests/Unit/SmallTextFloorTest.php). Everything else is measured.
      if (!text || !el || (stage && stage.contains(el)) || el.closest('[data-micro-label]')) continue;

      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      const hidden = style.display === 'none' || style.visibility === 'hidden' || box.width === 0 || box.height === 0;
      if (hidden) continue;

      const px = parseFloat(style.fontSize);
      if (px < minPx) small.push({ text: text.slice(0, 60), px });
    }

    return small;
  }, MIN_FONT_PX);
}

test.describe('Small-text floor in the editor', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(`at ${viewport.name}`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test('no teacher-facing text is under 12px', async ({ page }) => {
        await loginAsTeacher(page);
        await page.goto(MAP_WIZARD_URL, { waitUntil: 'networkidle' });
        await expect(page.locator('#lesson-canvas-root')).toBeVisible({ timeout: 20_000 });

        // The map inspector, the layer panel and the timeline are all mounted on this step.
        const small = await smallTextOutsideStage(page);

        expect(small, `text under ${MIN_FONT_PX}px:\n${small.map((s) => `  ${s.px}px  "${s.text}"`).join('\n')}`).toEqual([]);
      });

      test('text contrast meets WCAG AA (4.5:1) on the editor, zero violations', async ({ page }) => {
        await loginAsTeacher(page);
        await page.goto(MAP_WIZARD_URL, { waitUntil: 'networkidle' });
        await expect(page.locator('#lesson-canvas-root')).toBeVisible({ timeout: 20_000 });

        const results = await new AxeBuilder({ page })
          .withRules(['color-contrast'])
          .exclude('#lesson-canvas-root')
          .analyze();

        const summary = results.violations.flatMap((v) =>
          v.nodes.map((n) => `  ${n.target.join(' ')}: ${n.failureSummary ?? v.help}`),
        );
        expect(results.violations, `contrast violations:\n${summary.join('\n')}`).toEqual([]);
      });
    });
  }
});
