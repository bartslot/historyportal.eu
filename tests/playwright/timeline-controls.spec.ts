import { test, expect, Page } from '@playwright/test';

/**
 * The controls the Figma reference carries: auto-key, loop, collapse-all, and the eye.
 *
 * Each is asserted on what it DOES, not on being present. A row of icons that render and change
 * colour is the easiest thing in the world to ship and the least worth having.
 *
 * Driven with a real mouse throughout, against a narration scene's own text layers — the objects
 * a teacher actually animates.
 */

const LESSON = Number(process.env.PW_LESSON_ID ?? 15);
const SCENE = Number(process.env.PW_TEXT_SCENE_ID ?? 192);
const URL = `/teacher/lessons/${LESSON}/wizard?step=4&scene=${SCENE}`;

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

const walkTo = (page: Page, x: number, y: number, steps = 8) => page.mouse.move(x, y, { steps });

async function clickAt(page: Page, locator: ReturnType<Page['locator']>) {
  const box = (await locator.boundingBox())!;
  await walkTo(page, box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
}

async function afterSave(page: Page, action: () => Promise<void>) {
  const settled = page.waitForResponse(
    r => r.url().includes('livewire/update') && r.status() === 200,
    { timeout: 15000 },
  ).catch(() => null);
  await action();
  await settled;
  await page.waitForTimeout(700);
}

/** The first object on the scene and its first property row, discovered from the markup. */
async function firstRow(page: Page) {
  const row = (await page.locator('[data-timeline-key]').first().getAttribute('data-timeline-key'))!;
  const target = row.slice(0, row.lastIndexOf(':'));
  return { row, target };
}

async function openTimeline(page: Page) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(URL);
  await page.waitForLoadState('domcontentloaded');
  await page.locator('[data-tab="timeline"]').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(8000);              // the canvas needs a beat; its overlay mounts late
  await clickAt(page, page.locator('[data-tab="timeline"]'));
  await page.waitForTimeout(1200);

  await afterSave(page, () => page.evaluate(() => {
    const host = document.querySelector('[data-timeline]')!.closest('[wire\\:id]')!;
    (window as any).Livewire.find(host.getAttribute('wire:id'))
      .call('setTimeline', { duration: 8, targets: [], tracks: [] });
  }));

  // The scene's layers ARE the rows, and the overlay mounts on its own schedule.
  await expect(page.locator('[data-timeline-key]').first()).toBeAttached({ timeout: 20000 });
}

const timeMs = async (page: Page) => Number(await page.locator('[data-timeline-time]').inputValue());

test('collapse all folds every group away, and the next press brings them back', async ({ page }) => {
  const errors = watchConsole(page);
  await openTimeline(page);

  const { row } = await firstRow(page);
  const property = page.locator(`label:has([data-timeline-key="${row}"])`);
  await expect(property).toBeVisible();

  await clickAt(page, page.locator('[data-timeline-collapse-all]'));
  await expect(property, 'collapsing hides the property rows').toBeHidden();

  await clickAt(page, page.locator('[data-timeline-collapse-all]'));
  await expect(property, 'and the same button brings them back').toBeVisible();

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('the eye takes the layer off the canvas and puts it back', async ({ page }) => {
  const errors = watchConsole(page);
  await openTimeline(page);

  const { target } = await firstRow(page);
  const id = target.split(':')[1];
  const onCanvas = page.locator(`[data-text-id="${id}"]`).first();
  await expect(onCanvas).toBeVisible();

  await clickAt(page, page.locator(`[data-timeline-eye="${target}"]`));
  await expect(onCanvas, 'the eye hides the layer itself, not just its row').toBeHidden();

  await clickAt(page, page.locator(`[data-timeline-eye="${target}"]`));
  await expect(onCanvas, 'and gives it back').toBeVisible();

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('auto-key off stops recording, and the layer still moves', async ({ page }) => {
  const errors = watchConsole(page);
  await openTimeline(page);
  const { row } = await firstRow(page);

  await afterSave(page, () => clickAt(page, page.locator(`[data-timeline-key="${row}"]`)));
  await expect(page.locator(`[data-timeline-diamond="${row}"]`)).toHaveCount(1);

  await clickAt(page, page.locator('[data-timeline-autokey]'));
  await expect(page.locator('[data-timeline-autokey]')).toHaveAttribute('aria-pressed', 'false');

  const lanes = (await page.locator('[data-timeline-lanes]').boundingBox())!;
  await walkTo(page, lanes.x + 6, lanes.y + 20);
  await page.mouse.down();
  await walkTo(page, lanes.x + lanes.width * 0.5, lanes.y + 20, 12);
  await page.mouse.up();
  await page.waitForTimeout(400);

  const field = page.locator(`label:has([data-timeline-key="${row}"]) [data-timeline-value]`);
  const box = (await field.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { clickCount: 3 });
  await page.keyboard.type('44');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(1200);

  await expect(page.locator(`[data-timeline-diamond="${row}"]`),
    'with recording off, a value change must not add a keyframe').toHaveCount(1);
  await expect(field, 'but the value still took').toHaveValue('44');

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('loop sends the playhead back to the start instead of stopping', async ({ page }) => {
  const errors = watchConsole(page);
  await openTimeline(page);
  const { row } = await firstRow(page);
  const [target, property] = [row.slice(0, row.lastIndexOf(':')), row.slice(row.lastIndexOf(':') + 1)];

  // ARRANGE through Livewire, ACT through the UI. Building the two keyframes by hand first raced
  // the save that follows each one — the lane was right every time it was looked at and empty at
  // the moment the assertion ran. Play needs two keyframes; how they got there is not this test.
  await afterSave(page, () => page.evaluate(([t, p]) => {
    const host = document.querySelector('[data-timeline]')!.closest('[wire\\:id]')!;
    (window as any).Livewire.find(host.getAttribute('wire:id')).call('setTimeline', {
      duration: 8,
      targets: [],
      tracks: [{ target: t, property: p, keyframes: [{ time: 0, value: 20 }, { time: 6, value: 70 }] }],
    });
  }, [target, property]));
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.locator('[data-tab="timeline"]').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(8000);
  await clickAt(page, page.locator('[data-tab="timeline"]'));
  await page.waitForTimeout(1200);
  await expect(page.locator(`[data-timeline-diamond="${row}"]`)).toHaveCount(2);

  // Start near the END, so one lap is a second rather than eight.
  const timeField = page.locator('[data-timeline-time]');
  const tb = (await timeField.boundingBox())!;
  await page.mouse.click(tb.x + tb.width / 2, tb.y + tb.height / 2, { clickCount: 3 });
  await page.keyboard.type('7600');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(500);

  await clickAt(page, page.locator('[data-timeline-loop]'));
  await expect(page.locator('[data-timeline-loop]')).toHaveAttribute('aria-pressed', 'true');

  const play = page.locator('[data-timeline-play]');
  await expect(play, 'two keyframes means play is offered').toBeEnabled();
  await clickAt(page, play);
  await expect(play, 'playback actually started').toHaveAttribute('aria-label', 'Pause');

  // Looping shows itself as the clock going DOWN again, past the end of an 8s timeline.
  const seen: number[] = [];
  for (let i = 0; i < 16; i++) { seen.push(await timeMs(page)); await page.waitForTimeout(100); }
  await clickAt(page, play);

  const wrapped = seen.some((t, i) => i > 0 && t < seen[i - 1] - 50);
  expect(wrapped, `the playhead should have restarted at least once — saw ${seen.join(',')}`).toBe(true);

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});
