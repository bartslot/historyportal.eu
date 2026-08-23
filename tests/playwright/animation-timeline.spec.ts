import { test, expect, Page } from '@playwright/test';

/**
 * The Timeline tab, driven with a REAL mouse.
 *
 * Every gesture here is page.mouse walked in over several moves, never a synthetic dispatch into
 * the app's own handlers: a teleported pointer never establishes hover, and calling the handler
 * tests the handler rather than the control.
 *
 * Scene 4786 (lesson 359) is a map scene with 474 characters of stored narration alignment, so the
 * word marks and the snapping have real data under them.
 */

const LESSON = 359;
const SCENE = 4786;
const URL = `/teacher/lessons/${LESSON}/wizard?step=4&scene=${SCENE}`;

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

/** Walk the pointer in, which is both what a hand does and what establishes hover. */
async function walkTo(page: Page, x: number, y: number, steps = 8) {
  await page.mouse.move(x, y, { steps });
}

async function openTimeline(page: Page) {
  await page.goto(URL);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(8000);            // the globe needs a beat; a black frame is loading

  const tab = page.locator('[data-tab="timeline"]');
  await expect(tab).toBeVisible({ timeout: 15000 });
  const box = (await tab.boundingBox())!;
  await walkTo(page, box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(600);
}

test('the Timeline tab opens and rules the scene in seconds of narration', async ({ page }) => {
  const errors = watchConsole(page);
  await openTimeline(page);

  await expect(page.locator('[data-timeline]')).toBeVisible();

  // The ruler is in seconds, not milliseconds — the narration is the clock.
  const firstTick = page.locator('[data-timeline-lanes] span', { hasText: /^\d+(\.\d+)?s$/ }).first();
  await expect(firstTick).toBeVisible();

  // Word marks come from the stored alignment; a scene with 474 characters has plenty.
  const marks = page.locator('[data-timeline-lanes] span[title]');
  expect(await marks.count()).toBeGreaterThan(20);

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('a camera is added to the map, and gets the five rows a pose has', async ({ page }) => {
  const errors = watchConsole(page);
  await openTimeline(page);

  // Adding a camera PERSISTS — it is an object the scene has, not a mode the panel is in — so a
  // second run finds it already there. That is the behaviour, not a stale fixture.
  const add = page.locator('[data-timeline-add-camera]');
  if (await add.count()) {
    const box = (await add.boundingBox())!;
    await walkTo(page, box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(1200);
  }

  await expect(page.locator('[data-timeline-group="camera"]')).toBeVisible();
  for (const property of ['lng', 'lat', 'altitude', 'heading', 'tilt']) {
    await expect(page.locator(`[data-timeline-key="camera:${property}"]`)).toBeVisible();
  }

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('dragging the playhead scrubs, and the readout names the spoken word', async ({ page }) => {
  const errors = watchConsole(page);
  await openTimeline(page);

  const lanes = page.locator('[data-timeline-lanes]');
  const box = (await lanes.boundingBox())!;
  const y = box.y + 20;

  await walkTo(page, box.x + 10, y);
  await page.mouse.down();
  await walkTo(page, box.x + box.width * 0.4, y, 12);   // walked, not teleported
  await page.mouse.up();
  await page.waitForTimeout(400);

  const time = Number(await page.locator('[data-timeline-time]').inputValue());
  expect(time).toBeGreaterThan(1);

  // At 40% through a 30-second narration something is being said.
  const word = (await page.locator('[data-timeline-word]').textContent())?.trim() ?? '';
  expect(word.length, `expected a spoken word at ${time}s, got "${word}"`).toBeGreaterThan(0);

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('a keyframe dragged along its lane snaps to a spoken word', async ({ page }) => {
  const errors = watchConsole(page);
  await openTimeline(page);

  // The camera may already be on this scene — adding one PERSISTS, which is the point of it
  // being an object rather than a mode. Add it only when it is not there yet.
  // boundingBox() auto-waits and throws when nothing is there, so ask whether it exists first.
  const add = page.locator('[data-timeline-add-camera]');
  let box = null;
  if (await add.count()) {
    box = (await add.boundingBox())!;
    await walkTo(page, box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.mouse.up();
    await page.waitForTimeout(1000);
  }
  await expect(page.locator('[data-timeline-group="camera"]')).toBeVisible();

  const diamondButton = page.locator('[data-timeline-key="camera:altitude"]');
  box = (await diamondButton.boundingBox())!;
  await walkTo(page, box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(1000);

  const key = page.locator('[data-timeline-diamond="camera:altitude"]').first();
  await expect(key).toBeVisible();

  // Drag it a long way down the lane with a real mouse.
  box = (await key.boundingBox())!;
  await walkTo(page, box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await walkTo(page, box.x + 260, box.y + box.height / 2, 14);
  await page.mouse.up();
  await page.waitForTimeout(1200);

  // Where it landed must be a WORD START from the stored alignment, not an arbitrary number.
  const landed = await page.evaluate(() => {
    const el = document.querySelector('[data-timeline]') as any;
    const c = el?._x_dataStack?.[0];
    return { time: c?.tracks?.[0]?.keyframes?.[0]?.time, starts: (c?.spans ?? []).map((s: any) => s.start) };
  });

  expect(landed.time, 'the keyframe should have moved').toBeGreaterThan(0.5);
  expect(landed.starts, 'it should have landed on a word start').toContain(landed.time);

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});
