import { test, expect, Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Inspector row labels must sit in their own column: one line, never under a control, never clipped.
 *
 * Every label the shared row shells draw (`.text-panel-label` inside panel-row, slider-row, size-row,
 * the text inspector's label column) is measured against its row. The check is generic on purpose:
 * it does not know which panel it is looking at, so a new row that breaks the rule fails here too.
 *
 * The user's locale is read from the account the dev auto-login signs in as, so each locale run
 * writes that one value and the afterAll puts it back to 'en'. The browser runs muted: the page is
 * opened with the AudioContext and media playback stubbed before any script of the app runs.
 */

const DEV_EMAIL = 'teacher@example.com';
const LOCALES = (process.env.INSPECTOR_LOCALES ?? 'nl,de').split(',');
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 700 },
];

// Fixtures from the local catalogue (see tests/playwright/support/global-setup.ts for why these are
// overridable). Map block: scene 640 (lesson 5). Figure layers: scene 1425 (lesson 18). Balloons: 663 (lesson 8).
// Each lesson must belong to the dev auto-login teacher, or the wizard answers 404.
const MAP_SCENE = Number(process.env.PW_INSPECTOR_MAP_SCENE ?? 640);
const MAP_LESSON = Number(process.env.PW_INSPECTOR_MAP_LESSON ?? 5);
const FIGURE_SCENE = Number(process.env.PW_INSPECTOR_FIGURE_SCENE ?? 1425);
const FIGURE_LESSON = Number(process.env.PW_INSPECTOR_FIGURE_LESSON ?? 18);
const BALLOON_SCENE = Number(process.env.PW_INSPECTOR_BALLOON_SCENE ?? 663);
const BALLOON_LESSON = Number(process.env.PW_INSPECTOR_BALLOON_LESSON ?? 8);

const SILENCE = `
  (() => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) AC.prototype.resume = function () { return Promise.resolve(); };
    HTMLMediaElement.prototype.play = function () { this.muted = true; return Promise.resolve(); };
  })();`;

/**
 * The narrowest a number field may get before its value stops fitting: three digits ("360", "100")
 * at 12px. The colour strength field is a fixed w-7 (28px) by design, so this is a floor, not a size.
 */
const MIN_FIELD_PX = 28;

function setLocale(locale: string) {
  execFileSync('php', ['artisan', 'tinker', `--execute=App\\Models\\User::where('email','${DEV_EMAIL}')->update(['locale'=>'${locale}']);`], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
}

function tabNames(locale: string): { format: string; animate: string } {
  const file = path.resolve(process.cwd(), 'lang', `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;

  return { format: dict['Format'], animate: dict['Animate'] };
}

/** Every visible panel label that breaks the rule, with the reason. Empty array = clean. */
async function labelViolations(page: Page): Promise<string[]> {
  return page.evaluate((MIN_FIELD_PX: number) => {
    const isVisible = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    };
    const problems: string[] = [];
    const labels = [...document.querySelectorAll<HTMLElement>('.text-panel-label')].filter(isVisible);
    for (const label of labels) {
      const text = label.textContent?.trim() ?? '';
      if (!text) continue;
      const row = label.parentElement;
      if (!row) continue;
      // The text's own extent, not the box: a label that spills out of a 49px box still paints over
      // its control even though the box itself does not overlap.
      const range = document.createRange();
      range.selectNodeContents(label);
      const tr = range.getBoundingClientRect();
      const lineHeight = parseFloat(getComputedStyle(label).lineHeight) || 16;
      if (label.scrollWidth > label.clientWidth + 1) {
        problems.push(`"${text}" overflows its box (${label.scrollWidth} > ${label.clientWidth})`);
      }
      if (tr.height > lineHeight * 1.5) {
        problems.push(`"${text}" wraps onto ${Math.round(tr.height / lineHeight)} lines`);
      }
      for (const sib of [...row.children]) {
        if (sib === label || !isVisible(sib)) continue;
        const sr = sib.getBoundingClientRect();
        const overlaps = tr.left < sr.right && sr.left < tr.right && tr.top < sr.bottom && sr.top < tr.bottom;
        if (overlaps) problems.push(`"${text}" collides with ${sib.tagName.toLowerCase()} in its row`);
      }
    }

    // A label that fits is no use if the field beside it has shrunk until its value is clipped.
    for (const field of [...document.querySelectorAll<HTMLInputElement>('input[type="number"]')].filter(isVisible)) {
      const width = field.getBoundingClientRect().width;
      if (width < MIN_FIELD_PX) problems.push(`number field "${field.getAttribute('aria-label') ?? '?'}" is ${Math.round(width)}px wide`);
    }

    return problems;
  }, MIN_FIELD_PX);
}

/** Click a segmented tab (Format / Animate) by its visible text inside the inspector. */
async function openTab(page: Page, name: string) {
  // The segmented tabs are radio inputs labelled by aria-label (see ui/segmented.blade.php).
  const tab = page.locator(`input[type="radio"][aria-label="${name}"]:visible`).first();
  if ((await tab.count()) === 0) return false;
  await tab.check({ force: true });
  await page.waitForTimeout(300);

  return true;
}

async function openScene(page: Page, lesson: number, scene: number) {
  await page.goto(`/teacher/lessons/${lesson}/wizard?step=4&scene=${scene}`);
  await page.waitForLoadState('domcontentloaded');
  await page.locator('[data-tab="timeline"]').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(4000);
}

const cases: { kind: string; open: (page: Page) => Promise<void>; lesson: number; scene: number }[] = [
  {
    kind: 'map',
    lesson: MAP_LESSON,
    scene: MAP_SCENE,
    open: async () => {},
  },
  {
    kind: 'image',
    lesson: FIGURE_LESSON,
    scene: FIGURE_SCENE,
    open: async (page) => {
      await page.locator('[data-layer-id^="art_"]').first().click({ force: true });
      await page.waitForTimeout(500);
    },
  },
  {
    kind: 'balloon',
    lesson: BALLOON_LESSON,
    scene: BALLOON_SCENE,
    open: async (page) => {
      await page.locator('[data-balloon-id]').first().click({ force: true });
      await page.waitForTimeout(500);
    },
  },
];

for (const locale of LOCALES) {
  test.describe(`locale ${locale}`, () => {
    test.beforeAll(() => setLocale(locale));
    test.afterAll(() => setLocale('en'));

    for (const viewport of VIEWPORTS) {
      for (const c of cases) {
        test(`${c.kind} at ${viewport.width}x${viewport.height}: every tab's labels fit their row`, async ({ page }) => {
          test.setTimeout(120_000);
          await page.setViewportSize(viewport);
          await page.addInitScript(SILENCE);
          const errors: string[] = [];
          page.on('pageerror', (e) => errors.push(String(e)));

          await openScene(page, c.lesson, c.scene);
          await c.open(page);

          const names = tabNames(locale);
          const failures: string[] = (await labelViolations(page)).map((p) => `[as opened] ${p}`);
          for (const tab of [names.format, names.animate]) {
            // A scene kind may have only one of the two tabs; check what it actually shows.
            if (!(await openTab(page, tab))) continue;
            const problems = await labelViolations(page);
            for (const p of problems) failures.push(`[${tab}] ${p}`);
          }

          expect(failures, failures.join('\n')).toEqual([]);
          expect(errors.filter((e) => !e.includes('ResizeObserver'))).toEqual([]);
        });
      }
    }
  });
}
