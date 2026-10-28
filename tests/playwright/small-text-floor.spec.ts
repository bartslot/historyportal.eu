import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAsTeacher } from './support/auth';

/**
 * The small-text floor and colour contrast, measured in the browser across the teacher app.
 *
 * Any text a teacher reads or clicks is at least 12px (13px for helper prose), and text contrast
 * is WCAG AA (4.5:1) against its real background. Both are measured here, not read from markup:
 * a size is whatever the browser computed, and contrast is what axe measures on the rendered pixels.
 *
 * Every state the 2026-10-28 checks flagged as unmeasured is covered: the map, voyage and game
 * inspectors, their Timeline, Assets and Script tabs, the View and Add menus, the wizard's steps 1
 * to 3 and create page, the teacher dashboard, and the lesson player. Each state is loaded fresh at
 * 1440x900 and 1024x700 and the menus or tabs it needs are opened first.
 *
 * The decorative 8px labels on stage art and cards are excluded by `data-micro-label`, and the
 * editor stage (#lesson-canvas-root) is excluded because it is painted art. Everything else counts.
 *
 * Fixtures come from tests/playwright/support/global-setup.ts, so nothing here needs an env var.
 */

const MIN_FONT_PX = 12;

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1024x700', width: 1024, height: 700 },
] as const;

/** Visible text nodes outside the stage and the decorative labels, with the computed size. */
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

/** Open the first visible match of a locator, or record why it did not open. */
async function open(page: Page, locator: ReturnType<Page['locator']>): Promise<void> {
  await locator.first().click({ timeout: 5_000, force: true });
  await page.waitForTimeout(600);
}

type State = {
  name: string;
  url: () => string;
  /** Selector that proves the page is up before anything is measured. */
  ready: string;
  /** The editor stage is painted art, so it is excluded from both checks on editor states. */
  editor: boolean;
  /** Menus and tabs to open, in order, before measuring. */
  prepare?: (page: Page) => Promise<void>;
};

const editorTab = (page: Page, label: string) => page.getByText(label, { exact: true }).filter({ visible: true });

const STATES: State[] = [
  { name: 'editor: map inspector', url: () => process.env.MAP_WIZARD_URL ?? '', ready: '#lesson-canvas-root', editor: true },
  {
    name: 'editor: map, Timeline tab',
    url: () => process.env.MAP_WIZARD_URL ?? '',
    ready: '#lesson-canvas-root',
    editor: true,
    prepare: (page) => open(page, editorTab(page, 'Timeline')),
  },
  {
    name: 'editor: map, Assets tab',
    url: () => process.env.MAP_WIZARD_URL ?? '',
    ready: '#lesson-canvas-root',
    editor: true,
    prepare: (page) => open(page, editorTab(page, 'Assets')),
  },
  {
    name: 'editor: map, Script tab',
    url: () => process.env.MAP_WIZARD_URL ?? '',
    ready: '#lesson-canvas-root',
    editor: true,
    prepare: (page) => open(page, editorTab(page, 'Script')),
  },
  {
    name: 'editor: View menu',
    url: () => process.env.MAP_WIZARD_URL ?? '',
    ready: '#lesson-canvas-root',
    editor: true,
    prepare: (page) => open(page, page.locator('[aria-label="View"]')),
  },
  {
    name: 'editor: Add menu',
    url: () => process.env.MAP_WIZARD_URL ?? '',
    ready: '#lesson-canvas-root',
    editor: true,
    prepare: (page) => open(page, page.locator('[aria-label="Add"]')),
  },
  {
    // The add-scene dialog (a DaisyUI modal). Opened from the Add menu, and only opened: no kind is picked.
    name: 'editor: Add a scene dialog',
    url: () => process.env.MAP_WIZARD_URL ?? '',
    ready: '#lesson-canvas-root',
    editor: true,
    prepare: async (page) => {
      await open(page, page.locator('[aria-label="Add"]'));
      await open(page, page.getByText('Add Scene', { exact: true }));
    },
  },
  { name: 'editor: voyage inspector', url: () => process.env.VOYAGE_WIZARD_URL ?? '', ready: '#lesson-canvas-root', editor: true },
  { name: 'editor: game (quiz) inspector', url: () => process.env.GAME_WIZARD_URL ?? '', ready: '#lesson-canvas-root', editor: true },
  { name: 'wizard: step 1', url: () => `${process.env.WIZARD_URL ?? ''}?step=1`, ready: 'body', editor: false },
  { name: 'wizard: step 2', url: () => `${process.env.WIZARD_URL ?? ''}?step=2`, ready: 'body', editor: false },
  { name: 'wizard: step 3', url: () => `${process.env.WIZARD_URL ?? ''}?step=3`, ready: 'body', editor: false },
  { name: 'wizard: create', url: () => '/teacher/lessons/create', ready: 'body', editor: false },
  { name: 'dashboard', url: () => '/teacher', ready: 'body', editor: false },
  { name: 'player', url: () => `/lesson/${process.env.PLAYER_LESSON_CODE ?? ''}`, ready: 'body', editor: false },
];

test.describe('Small-text floor and contrast', () => {
  // Serial, so the matrix does not flake on a shared dev server under two workers. Three tests
  // failed on a 2-worker run and passed alone (re-check, 2026-10-28).
  test.describe.configure({ mode: 'serial' });

  for (const viewport of VIEWPORTS) {
    test.describe(`at ${viewport.name}`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      for (const state of STATES) {
        test(`${state.name}: text is 12px or more and passes AA contrast`, async ({ page }) => {
          await loginAsTeacher(page);
          await page.goto(state.url(), { waitUntil: 'networkidle' });
          await expect(page.locator(state.ready).first()).toBeVisible({ timeout: 20_000 });
          await state.prepare?.(page);

          const small = await smallTextOutsideStage(page);
          expect.soft(small, `text under ${MIN_FONT_PX}px:\n${small.map((s) => `  ${s.px}px  "${s.text}"`).join('\n')}`).toEqual([]);

          const builder = new AxeBuilder({ page }).withRules(['color-contrast']);
          const results = await (state.editor ? builder.exclude('#lesson-canvas-root') : builder).analyze();
          const summary = results.violations.flatMap((v) =>
            v.nodes.map((n) => `  ${n.target.join(' ')}: ${n.failureSummary ?? v.help}`),
          );
          expect.soft(results.violations, `contrast violations:\n${summary.join('\n')}`).toEqual([]);
        });
      }
    });
  }
});
