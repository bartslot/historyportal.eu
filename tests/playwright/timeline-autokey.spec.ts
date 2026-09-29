import { test, expect, Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';

/**
 * Auto-keying — changing a value records it at the playhead.
 *
 * Bart: *"Timeline should register new keyframes upon value change. if the time has moved (not
 * same as previous keyframe)"*.
 *
 * Every gesture is a real mouse and real typing, and every ASSERTION is on rendered DOM — the
 * diamonds in the lane, the time field, the value field. An earlier draft asserted on the Alpine
 * scope through `_x_dataStack[0]`, which is not reliably the live component after a Livewire
 * morph: it read time 0 while the playhead had visibly moved to 3600ms, and sent me hunting a
 * scrub bug that does not exist. What the teacher can see is the only thing worth asserting on.
 *
 * The object under test is a CAMERA on a map scene, because it is the one an author adds by
 * pressing a button — so the rows are there deterministically. A scene's text layers come from the
 * live overlay, and the overlay mounts on its own schedule; the timeline read "Nothing on this
 * scene can be animated yet" on three different scenes while a Title sat on the canvas.
 */

const LESSON = Number(process.env.PW_LESSON_ID ?? 15);

/** The lesson's first map scene, asked of the app rather than hardcoded — global-setup presets
 *  PW_LESSON_ID only, so a scene id written here belongs to whichever database wrote it. */
function mapSceneOf(lesson: number): number {
  const php = `$s = App\\Models\\Lesson::find(${lesson})?->scenes()->whereIn('kind', ['map', 'voyage'])->orderBy('order')->first(); echo json_encode(['id' => $s?->id]);`;
  const out = execFileSync('php', ['artisan', 'tinker', '--execute', php], { encoding: 'utf8' });
  const line = out.trim().split('\n').filter((l) => l.includes('{')).pop() ?? '{}';
  return JSON.parse(line.slice(line.indexOf('{'))).id;
}

const SCENE = Number(process.env.PW_SCENE_ID ?? mapSceneOf(LESSON));
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

/** Wait for the round trip an edit starts — every keyframe edit is a real Livewire save. */
async function afterSave(page: Page, action: () => Promise<void>) {
  const settled = page.waitForResponse(
    r => r.url().includes('livewire/update') && r.status() === 200,
    { timeout: 15000 },
  ).catch(() => null);
  await action();
  await settled;
  await page.waitForTimeout(700);
}

/**
 * Start from an empty timeline, cleared through Livewire — the server is what persists, and
 * reaching into Alpine to do it reaches into the wrong object.
 *
 * The call is fired, not awaited inside evaluate(): returning Livewire's promise made
 * page.evaluate() wait on something that never settled and hung the whole suite.
 */
async function openTimeline(page: Page) {
  await page.goto(URL);
  await page.waitForLoadState('domcontentloaded');
  await page.locator('[data-tab="timeline"]').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(8000);              // the globe needs a beat; a black frame is loading
  await clickAt(page, page.locator('[data-tab="timeline"]'));
  await page.waitForTimeout(800);

  await afterSave(page, () => page.evaluate(() => {
    const host = document.querySelector('[data-timeline]')!.closest('[wire\\:id]')!;
    (window as any).Livewire.find(host.getAttribute('wire:id'))
      .call('setTimeline', { duration: 8, targets: [], tracks: [] });
  }));

  // Reload so the cleared timeline is what the panel actually holds. The component keeps its own
  // tracks across a morph on purpose — between a save and the next server render the CLIENT has
  // the newer copy — which means a reset made behind its back does not reach it until the page
  // is loaded again. Real edits always start in the panel, so this only ever bites a test.
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.locator('[data-tab="timeline"]').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(8000);
  await clickAt(page, page.locator('[data-tab="timeline"]'));
  await page.waitForTimeout(800);

  // A camera is an object the author ADDS, and adding it PERSISTS — so it may already be here.
  // isVisible(), never count(): the button is x-show'd, so a hidden one still counts as 1 and
  // boundingBox() then returns null, which is what broke this on the second run.
  const add = page.locator('[data-timeline-add-camera]');
  if (await add.isVisible().catch(() => false)) {
    await afterSave(page, () => clickAt(page, add));
  }
  await expect(page.locator('[data-timeline-key="camera:zoom"]')).toBeVisible({ timeout: 15000 });
}

const diamonds = (page: Page, row: string) => page.locator(`[data-timeline-diamond="${row}"]`);
const valueField = (page: Page, row: string) =>
  page.locator(`label:has([data-timeline-key="${row}"]) [data-timeline-value]`);
const timeMs = async (page: Page) => Number(await page.locator('[data-timeline-time]').inputValue());

/** Type a number into a row the way a hand does: select what is there, type, commit with Tab. */
async function typeValue(page: Page, row: string, value: number) {
  const box = (await valueField(page, row).boundingBox())!;
  await walkTo(page, box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { clickCount: 3 });
  await page.keyboard.type(String(value));
  await afterSave(page, () => page.keyboard.press('Tab'));
}

/** Drag the playhead across the ruler, walked in rather than teleported. */
async function scrubTo(page: Page, fraction: number) {
  const box = (await page.locator('[data-timeline-lanes]').boundingBox())!;
  const y = box.y + 20;
  await walkTo(page, box.x + 6, y);
  await page.mouse.down();
  await walkTo(page, box.x + box.width * fraction, y, 12);
  await page.mouse.up();
  await page.waitForTimeout(400);
}

test('changing a value records a keyframe at the playhead', async ({ page }) => {
  const errors = watchConsole(page);
  await openTimeline(page);
  const row = 'camera:zoom';

  await expect(diamonds(page, row)).toHaveCount(0);

  // The diamond is what starts an animation; from there the timeline records what you do.
  await afterSave(page, () => clickAt(page, page.locator(`[data-timeline-key="${row}"]`)));
  await expect(diamonds(page, row)).toHaveCount(1);

  await scrubTo(page, 0.55);
  const movedTo = await timeMs(page);
  expect(movedTo, 'the playhead should have moved off the first key').toBeGreaterThan(500);

  await typeValue(page, row, 7);

  await expect(diamonds(page, row), 'a second keyframe should have been recorded').toHaveCount(2);
  expect(await timeMs(page), 'recording must not move the playhead').toBe(movedTo);

  // And it landed where the playhead is, not at 0 and not at the old key.
  const playheadX = (await page.locator('[data-timeline-playhead]').boundingBox())!.x;
  const newest = (await diamonds(page, row).nth(1).boundingBox())!;
  expect(Math.abs(newest.x + newest.width / 2 - playheadX),
    'the new diamond should sit under the playhead').toBeLessThan(9);

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('a property nobody has keyed is only moved, never recorded', async ({ page }) => {
  const errors = watchConsole(page);
  await openTimeline(page);
  const row = 'camera:heading';

  await expect(diamonds(page, row)).toHaveCount(0);

  await scrubTo(page, 0.55);
  await typeValue(page, row, 45);

  await expect(diamonds(page, row),
    'moving an un-animated property must not start an animation').toHaveCount(0);

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('editing on top of a keyframe updates it rather than stacking a second', async ({ page }) => {
  const errors = watchConsole(page);
  await openTimeline(page);
  const row = 'camera:zoom';

  await afterSave(page, () => clickAt(page, page.locator(`[data-timeline-key="${row}"]`)));
  await scrubTo(page, 0.55);
  await typeValue(page, row, 7);
  await expect(diamonds(page, row)).toHaveCount(2);

  // The playhead has NOT moved, so a second edit belongs to the key already there. This is the
  // "not same as previous keyframe" clause: same moment, same keyframe.
  await typeValue(page, row, 9);

  await expect(diamonds(page, row),
    'the playhead has not moved, so nothing new should appear').toHaveCount(2);

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});
