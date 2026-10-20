import { test, expect, Page } from '@playwright/test';

/**
 * Bart, 2026-10-16, on a speech balloon's rows in the Timeline tab:
 *
 *   - "because of the reset we cant see the input anymore. The reset should be activated when
 *     double clicked the property" — no Reset text; double-click a property's label resets it,
 *     double-click the layer's name resets every property of it.
 *   - "would be nice to be able to change the size of the panels" — the label column has a grip.
 *   - "changing the slider doesn't result in anything on the slider" — the inspector's opacity
 *     slider, dragged at a keyed moment, shows what it set, and the row agrees.
 *
 * Real mouse throughout. The scene needs one speech balloon (bal:0); override with
 * PW_BALLOON_LESSON_ID / PW_BALLOON_SCENE_ID in a database where 6/55 is not that.
 */

const LESSON = Number(process.env.PW_BALLOON_LESSON_ID ?? 6);
const SCENE = Number(process.env.PW_BALLOON_SCENE_ID ?? 55);
const BAL = 'bal:0';

const timeline = (page: Page) => page.evaluate(() => (document.querySelector('[data-timeline]') as any)._x_dataStack[0]);

async function open(page: Page, tracks: unknown[]) {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () { this.muted = true; return Promise.resolve(); };
  });
  await page.goto(`/teacher/lessons/${LESSON}/wizard?scene=${SCENE}`);
  await page.locator('[data-tab="timeline"]').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.locator('[data-tab="timeline"]').click();
  await page.waitForTimeout(600);
  const settled = page.waitForResponse(r => r.url().includes('livewire/update'), { timeout: 15000 }).catch(() => null);
  await page.evaluate((t) => {
    const c = (document.querySelector('[data-timeline]') as any)._x_dataStack[0];
    c.targets = []; c.tracks = t; c.refreshObjects(); c.seek(0); c.save();
  }, tracks);
  await settled;
  await page.waitForTimeout(800);
}

const keys = (page: Page, property: string) => page.evaluate(
  ([t, p]) => (document.querySelector('[data-timeline]') as any)._x_dataStack[0].keysOf(t, p).length,
  [BAL, property],
);

async function openGroup(page: Page) {
  const open = await page.locator(`[data-timeline-toggle="${BAL}"]`).getAttribute('aria-expanded');
  if (open !== 'true') await page.locator(`[data-timeline-toggle="${BAL}"]`).click();
}

const fade = [{ target: BAL, property: 'opacity', keyframes: [{ time: 0, value: 1 }, { time: 4, value: 0.2 }] }];
const grow = { target: BAL, property: 'scale', keyframes: [{ time: 0, value: 1 }, { time: 4, value: 1.5 }] };

test('no Reset text: double-clicking a property label resets it', async ({ page }) => {
  await open(page, [...fade, grow]);
  await openGroup(page);
  await expect(page.locator('[data-timeline-tracks]').getByText(/^reset/i)).toHaveCount(0);

  const label = page.locator(`[data-timeline-label="${BAL}:opacity"]`);
  await expect(label).toHaveAttribute('data-tooltip', /double-click/i);
  await label.scrollIntoViewIfNeeded();
  const b = (await label.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
  await page.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(800);
  expect(await keys(page, 'opacity')).toBe(0);
  expect(await keys(page, 'scale'), 'only that property').toBe(2);
});

test('double-clicking the layer name resets every property of it', async ({ page }) => {
  await open(page, [...fade, grow]);
  const name = page.locator(`[data-timeline-group="${BAL}"]`);
  const b = (await name.boundingBox())!;
  await page.mouse.move(b.x + 40, b.y + b.height / 2, { steps: 6 });
  await page.mouse.dblclick(b.x + 40, b.y + b.height / 2);
  await page.waitForTimeout(800);
  expect(await keys(page, 'opacity')).toBe(0);
  expect(await keys(page, 'scale')).toBe(0);
});

test('the label column is resized by its grip, and stays that wide after a reload', async ({ page }) => {
  await open(page, fade);
  const column = page.locator('[data-timeline-labels]');
  const before = (await column.boundingBox())!.width;
  const grip = (await page.locator('[data-timeline-col-grip]').boundingBox())!;
  const x = grip.x + grip.width / 2, y = grip.y + grip.height / 2;
  await page.mouse.move(x, y, { steps: 6 });
  await page.mouse.down();
  await page.mouse.move(x + 80, y, { steps: 10 });
  await page.mouse.up();
  const after = (await column.boundingBox())!.width;
  expect(after).toBeGreaterThan(before + 70);

  await page.reload();
  await page.locator('[data-timeline-labels]').waitFor({ state: 'attached', timeout: 30000 });
  await page.waitForTimeout(1500);
  expect(Math.abs((await page.locator('[data-timeline-labels]').boundingBox())!.width - after)).toBeLessThan(2);
  await page.evaluate(() => localStorage.clear());
});

test('the opacity slider, dragged at a keyed moment, shows what it set and the row agrees', async ({ page }) => {
  await open(page, fade);
  await page.locator(`[data-timeline-group="${BAL}"]`).click();      // the balloon's inspector
  await openGroup(page);
  await page.evaluate(() => (document.querySelector('[data-timeline]') as any)._x_dataStack[0].seek(2));
  const slider = page.locator(`input[type=range][data-key-target="${BAL}"][data-key-property="opacity"]`);
  await slider.scrollIntoViewIfNeeded();
  await expect(slider).toHaveValue('0.6');

  const b = (await slider.boundingBox())!;
  const y = b.y + b.height / 2;
  const saved = page.waitForResponse(r => r.url().includes('livewire/update'), { timeout: 15000 }).catch(() => null);
  await page.mouse.move(b.x + b.width * 0.6, y, { steps: 6 });
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.3, y, { steps: 10 });
  await page.mouse.up();
  await saved;
  await page.waitForTimeout(1200);       // the morph after the save is what used to undo it

  const shown = await page.evaluate((t) => {
    const el = document.querySelector(`input[type=range][data-key-target="${t}"][data-key-property="opacity"]`) as HTMLInputElement;
    const knob = el.closest('.range-panel-knob') as HTMLElement;
    const row = [...document.querySelectorAll('input[data-timeline-value]')] as HTMLInputElement[];
    return {
      value: Number(el.value),
      knob: parseFloat(knob.style.getPropertyValue('--range-pct')),
      number: knob.parentElement!.querySelector('[data-key-display]')!.textContent!.trim(),
      rows: row.map(r => r.value),
    };
  }, BAL);
  expect(shown.value).toBeLessThan(0.5);
  expect(shown.knob).toBeCloseTo(shown.value * 100, 0);
  expect(shown.number).toBe(String(Math.round(shown.value * 100)));
  expect(shown.rows).toContain(String(shown.value));
  const key = await page.evaluate((t) => (document.querySelector('[data-timeline]') as any)._x_dataStack[0].keysOf(t, 'opacity').find((k: any) => k.time === 2)?.value, BAL);
  expect(key).toBe(shown.value);
});
