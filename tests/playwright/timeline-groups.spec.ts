import { test, expect, Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The Timeline's property rows, After Effects style: layer > group > property.
 *
 * Asserts what a teacher needs: every label and value is readable (no clipping, no wrap, 12px
 * text, nothing past the column), a scrub moves the canvas while the mouse is still down, a typed
 * value on an animated property becomes a key at the playhead, and groups twirl and summarise.
 * Muted (AudioContext + media.play stubbed before anything loads) and driven with a real mouse.
 *
 * Set PW_SHOTS=/some/dir to save screenshots there.
 */

const DEV_EMAIL = 'teacher@example.com';
const LOCALES = (process.env.TIMELINE_LOCALES ?? 'nl,de').split(',');
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 700 },
];
const PARENT_LESSON = Number(process.env.PW_TIMELINE_PARENT ?? 63);
const SHOTS = process.env.PW_SHOTS ?? '';
const TEXT = 'txt_fixture';
const TARGET = `text:${TEXT}`;

const SILENCE = `
  (() => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) AC.prototype.resume = function () { return Promise.resolve(); };
    HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return Promise.resolve(); };
  })();`;

const php = (args: string[]) => execFileSync('php', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

function fixture(): { lesson: number; scene: number } {
  const copy = JSON.parse(php(['artisan', 'lessons:test-copy', String(PARENT_LESSON), '--json']).trim().split('\n').pop() ?? '{}') as { id?: number };
  if (!copy.id) throw new Error('lessons:test-copy returned no lesson id');
  const scene = php([
    'artisan', 'tinker',
    `--execute=$l=\\App\\Models\\Lesson::findOrFail(${copy.id}); $s=$l->scenes()->where('kind','narration')->orderBy('order')->first(); $c=$s->config ?? []; $c['texts']=[['id'=>'${TEXT}','text'=>'Fixture text','x'=>10,'y'=>12,'font'=>'sans','size'=>'md','bg'=>'none','anchor'=>'screen']]; $s->config=$c; $s->save(); echo 'SCENE='.$s->id;`,
  ]).match(/SCENE=(\d+)/);
  if (!scene) throw new Error('could not add the text fixture');

  return { lesson: copy.id, scene: Number(scene[1]) };
}

const setLocale = (locale: string) =>
  php(['artisan', 'tinker', `--execute=App\\Models\\User::where('email','${DEV_EMAIL}')->update(['locale'=>'${locale}']);`]);

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

async function openTimeline(page: Page, fx: { lesson: number; scene: number }, ready = `[data-timeline-label="${TARGET}:x"]`) {
  await page.addInitScript(SILENCE);
  await page.goto(`/teacher/lessons/${fx.lesson}/wizard?step=4&scene=${fx.scene}`);
  await page.waitForLoadState('domcontentloaded');
  await page.locator('[data-tab="timeline"]').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(6000);
  await page.locator('[data-tab="timeline"]').click();
  await expect(page.locator(ready).first()).toBeVisible({ timeout: 20000 });
}

/** Wait for the debounced live save to land. */
const settle = (page: Page) => page.waitForTimeout(1200);

const keyCount = (page: Page, property: string) => page.locator(`[data-timeline-diamond="${TARGET}:${property}"]`).count();

async function drag(page: Page, from: { x: number; y: number }, dx: number, onMid?: () => Promise<void>) {
  await page.mouse.move(from.x, from.y, { steps: 6 });
  await page.mouse.down();
  await page.mouse.move(from.x + dx, from.y, { steps: 12 });
  if (onMid) await onMid();
  await page.mouse.up();
}

const centre = async (page: Page, selector: string) => {
  const b = (await page.locator(selector).boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

let fx: { lesson: number; scene: number };
test.beforeAll(() => { fx = fixture(); });
test.afterAll(() => setLocale('en'));

/**
 * Before/after pictures (PW_SHOTS set; PW_SHOT_PREFIX names the build). The dock is pulled up so
 * the whole property list is on screen, and two rows are animated so the diamonds show. Uses only
 * selectors both builds have, so it runs against the old timeline too.
 */
test('screenshots', async ({ page }) => {
  test.skip(!SHOTS, 'set PW_SHOTS to take pictures');
  test.setTimeout(120_000);
  setLocale('nl');
  await page.setViewportSize({ width: 1440, height: 900 });
  await openTimeline(page, fx, `[data-timeline-key="${TARGET}:x"]`);
  const handle = await centre(page, '[data-dock-resize]');
  await drag(page, { x: handle.x, y: handle.y }, 0);
  await page.mouse.move(handle.x, handle.y, { steps: 4 });
  await page.mouse.down();
  await page.mouse.move(handle.x, handle.y - 330, { steps: 14 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  await page.locator(`[data-timeline-key="${TARGET}:x"]`).click();
  await page.locator('[data-timeline-time]').fill('2000');
  await page.locator('[data-timeline-time]').dispatchEvent('change');
  await page.locator(`[data-timeline-key="${TARGET}:opacity"]`).click();
  await settle(page);
  await shot(page, `${process.env.PW_SHOT_PREFIX ?? 'after'}-nl-1440`);
  await page.setViewportSize({ width: 1024, height: 700 });
  await page.waitForTimeout(800);
  await shot(page, `${process.env.PW_SHOT_PREFIX ?? 'after'}-nl-1024`);
});

for (const locale of LOCALES) {
  for (const viewport of VIEWPORTS) {
    test.describe(`${locale} ${viewport.width}x${viewport.height}`, () => {
      test.use({ viewport });
      // Every test starts from a scene nobody has animated.
      test.beforeEach(() => {
        setLocale(locale);
        php(['artisan', 'tinker', `--execute=$s=\\App\\Models\\Scene::findOrFail(${fx.scene}); $c=$s->config ?? []; unset($c['timeline']); $s->config=$c; $s->save();`]);
      });

      test('every label and value is readable: no clipping, no wrap, 12px, inside the column', async ({ page }) => {
        await openTimeline(page, fx);
        await shot(page, `groups-${locale}-${viewport.width}-rest`);

        const problems = await page.evaluate(() => {
          const out: string[] = [];
          const column = document.querySelector<HTMLElement>('[data-timeline-labels]')!.getBoundingClientRect();
          const rows = [...document.querySelectorAll<HTMLElement>('[data-timeline-row]')].filter((r) => r.getBoundingClientRect().height > 0);
          if (rows.length < 5) out.push(`only ${rows.length} property rows are visible`);
          for (const row of rows) {
            const label = row.querySelector<HTMLElement>('[data-timeline-label]')!;
            const name = label.textContent?.trim();
            const lr = label.getBoundingClientRect();
            if (label.scrollWidth > label.clientWidth + 1) out.push(`label "${name}" clips (${label.scrollWidth} > ${label.clientWidth})`);
            if (lr.height > 20) out.push(`label "${name}" wraps (${Math.round(lr.height)}px tall)`);
            if (parseFloat(getComputedStyle(label).fontSize) < 12) out.push(`label "${name}" is under 12px`);
            const value = row.querySelector<HTMLInputElement>('[data-timeline-value]');
            if (value && value.type !== 'color') {
              const vr = value.getBoundingClientRect();
              if (vr.width < 36) out.push(`value of "${name}" is ${Math.round(vr.width)}px wide`);
              if (value.scrollWidth > value.clientWidth + 1) out.push(`value of "${name}" clips its digits`);
              if (parseFloat(getComputedStyle(value).fontSize) < 12) out.push(`value of "${name}" is under 12px`);
              if (!value.value) out.push(`value of "${name}" is empty`);
            }
            for (const el of [...row.querySelectorAll<HTMLElement>('button, input, [data-timeline-label]')]) {
              const r = el.getBoundingClientRect();
              if (r.width && (r.right > column.right + 1 || r.left < column.left - 1)) out.push(`"${name}" row: ${el.tagName.toLowerCase()} runs past the column`);
            }
          }
          for (const head of document.querySelectorAll<HTMLElement>('[data-timeline-section]')) {
            const t = head.querySelector<HTMLElement>('span')!;
            if (t.scrollWidth > t.clientWidth + 1) out.push(`group "${t.textContent}" clips`);
          }
          return out;
        });
        expect(problems, problems.join('\n')).toEqual([]);

        // AA: the label text against the shell, measured from the render.
        const contrast = await page.evaluate(() => {
          // Computed colours come back as oklch() for the theme tokens: let a canvas turn them into rgb.
          const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
          const rgbOf = (c: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3); };
          const lum = (c: string) => {
            const [r, g, b] = rgbOf(c).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          };
          const bgOf = (el: Element) => { for (let e: Element | null = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (rgbOf(c).join() !== '0,0,0' || !/\(0 0 0 \/ 0|, 0\)|transparent/.test(c)) { if (!/\/ 0\)|, 0\)|transparent/.test(c)) return c; } } return 'rgb(0,0,0)'; };
          const ratio = (el: Element) => { const a = lum(getComputedStyle(el).color), b = lum(bgOf(el)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
          const els = [...document.querySelectorAll('[data-timeline-label], input[data-timeline-value]:not([type=color]), [data-timeline-section] span')].filter((e) => e.getBoundingClientRect().height > 0);
          const worst = els.map((e) => ({ r: ratio(e), who: `${e.tagName} "${(e as HTMLInputElement).value ?? e.textContent}" ${getComputedStyle(e).color} on ${bgOf(e)}` })).sort((a, b) => a.r - b.r)[0];
          return worst;
        });
        expect(contrast.r, `lowest contrast: ${contrast.who}`).toBeGreaterThanOrEqual(4.5);
      });

      test('a scrub moves the canvas while the mouse is still down, and saves once', async ({ page }) => {
        await openTimeline(page, fx);
        const canvasLeft = () => page.evaluate((id) => document.querySelector(`[data-text-id="${id}"]`)!.getBoundingClientRect().left, TEXT);
        const before = await canvasLeft();
        const saves: string[] = [];
        page.on('request', (r) => { if (r.url().includes('livewire/update') && /setTimeline/.test(r.postData() ?? '')) saves.push(r.url()); });

        const from = await centre(page, `[data-timeline-label="${TARGET}:x"]`);
        let midLeft = before;
        await drag(page, from, 60, async () => { midLeft = await canvasLeft(); });
        expect(midLeft, 'the text moved before the button was released').toBeGreaterThan(before + 5);
        await settle(page);
        const shown = Number(await page.locator(`[data-timeline-row]:has([data-timeline-label="${TARGET}:x"]) [data-timeline-value]`).inputValue());
        expect(shown).toBeGreaterThan(10);

        // The value itself scrubs too, and a plain click still just focuses it for typing.
        const value = `[data-timeline-row]:has([data-timeline-label="${TARGET}:y"]) [data-timeline-value]`;
        const vc = await centre(page, value);
        const y0 = Number(await page.locator(value).inputValue());
        await drag(page, vc, -30);
        expect(Number(await page.locator(value).inputValue())).toBeLessThan(y0);
        await expect(page.locator(value)).not.toBeFocused();
        await page.mouse.click(vc.x, vc.y);
        await expect(page.locator(value)).toBeFocused();
        await shot(page, `groups-${locale}-${viewport.width}-editing`);
        await page.keyboard.press('Escape');
        expect(saves.length, 'no more than one save per gesture').toBeLessThanOrEqual(3);
      });

      test('typing a value on an animated property keys the playhead; Escape gives the old number back', async ({ page }) => {
        await openTimeline(page, fx);
        const row = `[data-timeline-row]:has([data-timeline-label="${TARGET}:x"])`;
        await page.locator(`[data-timeline-stopwatch="${TARGET}:x"]`).click();
        await settle(page);
        expect(await keyCount(page, 'x')).toBe(1);

        await page.locator('[data-timeline-time]').fill('1500');
        await page.locator('[data-timeline-time]').dispatchEvent('change');
        const field = page.locator(`${row} [data-timeline-value]`);
        await field.locator('..').click();
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.type('47');
        await page.keyboard.press('Enter');
        await settle(page);
        expect(await keyCount(page, 'x'), 'a second key at the playhead').toBe(2);
        expect(Number(await field.inputValue())).toBe(47);

        await field.locator('..').click();
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.type('80');
        await page.keyboard.press('Escape');
        expect(Number(await field.inputValue()), 'Escape reverts').toBe(47);

        // Arrow keys: +1, Shift +10.
        await field.focus();
        await page.keyboard.press('ArrowUp');
        expect(Number(await field.inputValue())).toBe(48);
        await page.keyboard.press('Shift+ArrowDown');
        expect(Number(await field.inputValue())).toBe(38);
        await settle(page);

        // Back at 0 the field shows the value of the first key, not the one typed at 1.5 s.
        await page.locator('[data-timeline-time]').fill('0');
        await page.locator('[data-timeline-time]').dispatchEvent('change');
        await expect(field).not.toHaveValue('38');
      });

      test('the left column resizes with the shared handle and a double-click puts it back', async ({ page }) => {
        await openTimeline(page, fx);
        const column = page.locator('[data-timeline-labels]');
        const start = (await column.boundingBox())!.width;
        expect(start, 'wide enough for label + value + keyframe nav').toBeGreaterThanOrEqual(328);
        const grip = await centre(page, '[data-timeline-col-grip]');
        await drag(page, grip, 60);
        expect((await column.boundingBox())!.width).toBeGreaterThan(start + 50);
        await page.mouse.dblclick(grip.x + 60, grip.y);
        await expect.poll(async () => Math.round((await column.boundingBox())!.width)).toBe(Math.round(start));
      });

      test('groups twirl, remember, summarise keys while closed, and Alt-click opens all', async ({ page }) => {
        await openTimeline(page, fx);
        const transform = `[data-timeline-section="${TARGET}#transform"]`;
        const rowX = page.locator(`[data-timeline-row]:has([data-timeline-label="${TARGET}:x"])`);
        const rowOpacity = page.locator(`[data-timeline-row]:has([data-timeline-label="${TARGET}:opacity"])`);
        await page.locator(`[data-timeline-stopwatch="${TARGET}:x"]`).click();
        await settle(page);
        expect(await keyCount(page, 'x'), 'the stopwatch put a key at 0').toBe(1);

        await page.locator(transform).click();
        await expect(rowX).toBeHidden();
        await expect(rowOpacity, 'the other group stays open').toBeVisible();
        await expect(page.locator(`[data-timeline-summary="${TARGET}#transform"] [data-timeline-summary-diamond]`)).toHaveCount(1);
        await shot(page, `groups-${locale}-${viewport.width}-closed`);

        await page.keyboard.down('Alt');
        await page.locator(transform).click();
        await page.keyboard.up('Alt');
        await expect(rowX, 'Alt-click opens every group').toBeVisible();
        await expect(rowOpacity).toBeVisible();

        await page.keyboard.down('Alt');
        await page.locator(transform).click();
        await page.keyboard.up('Alt');
        await expect(rowX).toBeHidden();
        await expect(rowOpacity, 'and Alt-click on an open one closes all').toBeHidden();
      });
    });
  }
}
