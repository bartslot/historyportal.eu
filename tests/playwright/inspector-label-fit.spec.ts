import { test, expect, Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Inspector rows must hold their label and their control side by side, or stack the label above.
 * Nothing wraps, nothing overlaps, nothing is clipped by its panel, and no slider or number field
 * shrinks below what it needs.
 *
 * Every check is generic (it does not know which panel it is looking at), so a new row that breaks
 * the rule fails here too. The text layer fixture is a throwaway copy of a dev lesson with one text
 * annotation added, so the run never edits a lesson a teacher owns.
 *
 * Set PW_OLD_LABEL_TOKEN=1 to put the pre-fix 49px label column back on the page: the spec must then
 * FAIL for every kind. That is the proof that the checks can see the bug.
 */

const DEV_EMAIL = 'teacher@example.com';
const LOCALES = (process.env.INSPECTOR_LOCALES ?? 'nl,de,fr').split(',');
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 700 },
];
const OLD_TOKEN = process.env.PW_OLD_LABEL_TOKEN === '1';

/** A slider narrower than this is too short to drag. */
const MIN_SLIDER_PX = 64;
/** A number field narrower than this cannot show three digits ("360") at 12px. */
const MIN_FIELD_PX = 28;

// Fixtures: lessons must belong to the dev auto-login teacher or the wizard answers 404.
const MAP = { lesson: Number(process.env.PW_INSPECTOR_MAP_LESSON ?? 5), scene: Number(process.env.PW_INSPECTOR_MAP_SCENE ?? 640) };
const IMAGE = { lesson: Number(process.env.PW_INSPECTOR_FIGURE_LESSON ?? 18), scene: Number(process.env.PW_INSPECTOR_FIGURE_SCENE ?? 1425) };
const BALLOON = { lesson: Number(process.env.PW_INSPECTOR_BALLOON_LESSON ?? 8), scene: Number(process.env.PW_INSPECTOR_BALLOON_SCENE ?? 663) };
const TEXT_PARENT_LESSON = BALLOON.lesson;

const SILENCE = `
  (() => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) AC.prototype.resume = function () { return Promise.resolve(); };
    HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return Promise.resolve(); };
  })();`;

const OLD_TOKEN_SCRIPT = `
  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.style.setProperty('--settings-panel-label-w', '3.0625rem');
  });`;

function php(args: string[]): string {
  return execFileSync('php', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function setLocale(locale: string) {
  php(['artisan', 'tinker', `--execute=App\\Models\\User::where('email','${DEV_EMAIL}')->update(['locale'=>'${locale}']);`]);
}

/**
 * A throwaway copy of the balloon lesson with one text annotation on its first narration scene. The
 * copy is made by the same command the other specs use, so it lives on the dev teacher's account.
 */
function textFixture(): { lesson: number; scene: number } {
  const copy = JSON.parse(php(['artisan', 'lessons:test-copy', String(TEXT_PARENT_LESSON), '--json']).trim().split('\n').pop() ?? '{}') as { id?: number };
  if (!copy.id) throw new Error('lessons:test-copy returned no lesson id');
  const scene = php([
    'artisan', 'tinker',
    `--execute=$l=\\App\\Models\\Lesson::findOrFail(${copy.id}); $s=$l->scenes()->orderBy('order')->first(); $c=$s->config ?? []; $c['texts']=[['id'=>'txt_fixture','text'=>'Fixture text','x'=>10,'y'=>12,'font'=>'sans','size'=>'md','bg'=>'none','anchor'=>'screen']]; $s->config=$c; $s->save(); echo 'SCENE='.$s->id;`,
  ]).match(/SCENE=(\d+)/);
  if (!scene) throw new Error('could not add the text fixture');

  return { lesson: copy.id, scene: Number(scene[1]) };
}

/**
 * A throwaway copy of the image lesson with its first figure layer turned into an arrow. The arrow
 * inspector is keyed on the layer's kind, so this exercises the real panel without a library arrow.
 */
function arrowFixture(): Scene {
  const copy = JSON.parse(php(['artisan', 'lessons:test-copy', String(IMAGE.lesson), '--json']).trim().split('\n').pop() ?? '{}') as { id?: number };
  if (!copy.id) throw new Error('lessons:test-copy returned no lesson id');
  const scene = php([
    'artisan', 'tinker',
    `--execute=$l=\\App\\Models\\Lesson::findOrFail(${copy.id}); foreach ($l->scenes()->orderBy('order')->get() as $s) { $shots=$s->shots ?? []; $done=false; foreach ($shots as $i=>$shot) { foreach (($shot['layers'] ?? []) as $j=>$layer) { if (($layer['kind'] ?? '') === 'figure') { $shots[$i]['layers'][$j]=array_merge($layer,['kind'=>'arrow','arrow_style'=>'stroke','end_x'=>100,'end_y'=>100,'bend'=>0,'shaft'=>1.2,'head'=>5.5]); $done=true; break 2; } } } if ($done) { $s->shots=$shots; $s->save(); echo 'SCENE='.$s->id.' LAYER=art_'.($shots[$i]['layers'][$j]['asset_id'] ?? ''); break; } }`,
  ]).match(/SCENE=(\d+) LAYER=(\S*)/);
  if (!scene) throw new Error('could not add the arrow fixture');

  return { lesson: copy.id, scene: Number(scene[1]), layer: scene[2] };
}

function tabNames(locale: string): { format: string; animate: string } {
  const dict = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'lang', `${locale}.json`), 'utf8')) as Record<string, string>;

  return { format: dict['Format'], animate: dict['Animate'] };
}

/** Every problem the inspector shows right now, across labels, clipping, sliders and number fields. */
async function inspectorProblems(page: Page): Promise<string[]> {
  return page.evaluate(
    ({ minSlider, minField }) => {
      const isVisible = (el: Element) => {
        const r = el.getBoundingClientRect();

        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      };
      /** The nearest ancestor that clips its children: the card or panel the row sits in. */
      const clipperOf = (el: Element): Element | null => {
        for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
          const ox = getComputedStyle(e).overflowX;
          if (ox === 'hidden' || ox === 'auto' || ox === 'scroll' || ox === 'clip') return e;
        }

        return null;
      };
      const problems: string[] = [];
      const labels = [...document.querySelectorAll<HTMLElement>('.text-panel-label')].filter(isVisible);
      const checkedClippers = new Set<Element>();

      for (const label of labels) {
        const text = label.textContent?.trim() ?? '';
        if (!text) continue;
        const row = label.parentElement;
        if (!row) continue;
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
        // Clipped sibling: anything in the row that sticks out of the card it sits in. A nowrap
        // label can push a trailing Reset button past the edge, where the card hides it.
        const clip = clipperOf(label);
        if (clip && !checkedClippers.has(clip)) {
          checkedClippers.add(clip);
          const cr = clip.getBoundingClientRect();
          for (const el of [...row.querySelectorAll<HTMLElement>('*')].filter(isVisible)) {
            const er = el.getBoundingClientRect();
            if (er.right > cr.right + 1 || er.left < cr.left - 1) {
              problems.push(`"${text}" row: ${el.tagName.toLowerCase()} runs past its card (${Math.round(er.right)} > ${Math.round(cr.right)})`);
              break;
            }
          }
        }
      }

      for (const slider of [...document.querySelectorAll<HTMLInputElement>('input[type="range"]')].filter(isVisible)) {
        const width = slider.getBoundingClientRect().width;
        if (width < minSlider) problems.push(`slider "${slider.getAttribute('aria-label') ?? '?'}" is ${Math.round(width)}px wide (< ${minSlider})`);
      }
      for (const field of [...document.querySelectorAll<HTMLInputElement>('input[type="number"]')].filter(isVisible)) {
        const width = field.getBoundingClientRect().width;
        if (width < minField) problems.push(`number field "${field.getAttribute('aria-label') ?? '?'}" is ${Math.round(width)}px wide (< ${minField})`);
      }

      return problems;
    },
    { minSlider: MIN_SLIDER_PX, minField: MIN_FIELD_PX },
  );
}

/** Click a segmented tab (Format / Animate) by its aria-label; false when this scene has no such tab. */
async function openTab(page: Page, name: string): Promise<boolean> {
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

/** Real pointer clicks on the stage. */
async function clickStage(page: Page, selector: string) {
  await page.locator(selector).first().click();
  await page.waitForTimeout(600);
}

type Scene = { lesson: number; scene: number; layer?: string };

const CASES: { kind: string; open: (page: Page, fixture: Scene) => Promise<void>; scene: (fx: Fixtures) => Scene }[] = [
  { kind: 'map', scene: () => MAP, open: async () => {} },
  // The scene itself (nothing selected): its Power-meter moment row carries a trailing Reset.
  { kind: 'scene', scene: () => BALLOON, open: async () => {} },
  {
    kind: 'image',
    scene: () => IMAGE,
    open: async (page) => {
      await clickStage(page, '[data-layer-id^="art_"]');
      // The water sliders live in a collapsed Advanced group; open it so they are measured too.
      const advanced = page.locator('[data-sit-advanced] > summary').first();
      if ((await advanced.count()) > 0) await advanced.click();
      await page.waitForTimeout(300);
    },
  },
  { kind: 'balloon', scene: () => BALLOON, open: (page) => clickStage(page, '[data-balloon-id="bal_0"] .lp-balloon__bubble') },
  { kind: 'text', scene: (fx) => fx.text, open: (page) => clickStage(page, '[data-text-id="txt_fixture"]') },
  // The layer's own box is the whole stage (pointer-events: none). The arrow takes the pointer through
  // its transparent hit path (pointer-events: stroke), so a real click on that path selects it.
  {
    kind: 'arrow',
    scene: (fx) => fx.arrow,
    open: async (page, fixture) => {
      await page.locator(`[data-layer-id="${fixture.layer}"] path[stroke="transparent"]`).first().click();
      await page.waitForTimeout(600);
    },
  },
];

interface Fixtures {
  text: { lesson: number; scene: number };
  arrow: Scene;
}

/** Throwaway copies, made once per locale run: a text annotation and an arrow layer. */
let fixtures: Fixtures | null = null;

for (const locale of LOCALES) {
  test.describe(`locale ${locale}`, () => {
    test.beforeAll(() => {
      setLocale(locale);
      fixtures ??= { text: textFixture(), arrow: arrowFixture() };
    });
    test.afterAll(() => setLocale('en'));

    for (const viewport of VIEWPORTS) {
      for (const c of CASES) {
        test(`${c.kind} at ${viewport.width}x${viewport.height}: every tab fits its rows`, async ({ page }) => {
          test.setTimeout(150_000);
          await page.setViewportSize(viewport);
          await page.addInitScript(SILENCE);
          if (OLD_TOKEN) await page.addInitScript(OLD_TOKEN_SCRIPT);
          const errors: string[] = [];
          page.on('pageerror', (e) => errors.push(String(e)));

          const fixture = c.scene(fixtures ?? { text: BALLOON, arrow: BALLOON });
          await openScene(page, fixture.lesson, fixture.scene);
          await c.open(page, fixture);

          const names = tabNames(locale);
          const failures: string[] = (await inspectorProblems(page)).map((p) => `[as opened] ${p}`);
          for (const [name, tab] of [
            ['Format', names.format],
            ['Animate', names.animate],
          ] as const) {
            // A scene kind may have only one of the two tabs; check what it actually shows.
            if (!(await openTab(page, tab))) continue;
            for (const p of await inspectorProblems(page)) failures.push(`[${name}] ${p}`);
          }

          expect(failures, failures.join('\n')).toEqual([]);
          expect(errors.filter((e) => !e.includes('ResizeObserver'))).toEqual([]);
        });
      }
    }
  });
}
