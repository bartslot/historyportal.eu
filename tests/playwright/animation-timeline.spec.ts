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

// Its OWN variables: global-setup presets PW_LESSON_ID to a general lesson, which paired that
// lesson with this map scene and opened the wizard on a quiz. Override with PW_TIMELINE_LESSON_ID
// / PW_TIMELINE_SCENE_ID in a database where 359/4786 do not exist.
const LESSON = Number(process.env.PW_TIMELINE_LESSON_ID ?? 359);
const SCENE = Number(process.env.PW_TIMELINE_SCENE_ID ?? 4786);
const URL = `/teacher/lessons/${LESSON}/wizard?step=4&scene=${SCENE}`;

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  // A missing painting or tile in a local database is data, not this panel: count script errors.
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

/** Walk the pointer in, which is both what a hand does and what establishes hover. */
async function walkTo(page: Page, x: number, y: number, steps = 8) {
  await page.mouse.move(x, y, { steps });
}

async function openTimeline(page: Page) {
  await page.goto(URL);
  // NOT networkidle: the wizard runs a 3s wire:poll, so the network never goes idle and this
  // helper was riding its own timeout. Wait for the thing we actually need instead.
  await page.waitForLoadState('domcontentloaded');
  await page.locator('[data-tab="timeline"]').waitFor({ state: 'visible', timeout: 30000 });
  // The ?scene= deep link is not reliable on its own — the wizard can open on its first scene —
  // so select the scene the way a teacher does, from the rail.
  await page.locator(`[wire\\:click="selectScene(${SCENE})"]`).first().click();
  await page.waitForTimeout(8000);            // the globe needs a beat; a black frame is loading

  const tab = page.locator('[data-tab="timeline"]');
  await expect(tab).toBeVisible({ timeout: 15000 });
  const box = (await tab.boundingBox())!;
  await walkTo(page, box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(600);

  // Start every test from an unanimated scene. The timeline PERSISTS — that is the feature — so
  // without this the tests only pass in the order they happen to run in, which is not passing.
  // The reset calls save(), which is a real Livewire round trip; the round trip morphs the dock and
  // Alpine rebuilds the component. Waiting a fixed 1500ms raced it — every locator captured during
  // the morph resolved to a DETACHED node, and boundingBox() then returned null. Wait for the
  // response, then for the panel to be back.
  const settled = page.waitForResponse(
    r => r.url().includes('livewire/update') && r.status() === 200,
    { timeout: 15000 },
  ).catch(() => null);

  await page.evaluate(() => {
    const c = (document.querySelector('[data-timeline]') as any)._x_dataStack[0];
    c.targets = []; c.tracks = []; c.refreshObjects(); c.seek(0); c.save();
  });

  await settled;
  await expect(page.locator('[data-timeline]')).toBeVisible();
  await page.waitForTimeout(600);
}

test('the Timeline tab opens and rules the scene in seconds of narration', async ({ page }) => {
  const errors = watchConsole(page);
  await openTimeline(page);

  await expect(page.locator('[data-timeline]')).toBeVisible();

  // The ruler reads in MILLISECONDS — Bart overruled seconds, and the Figma transport says ms.
  const firstTick = page.locator('[data-timeline-lanes] span', { hasText: /^\d+$/ }).first();
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
  if (await add.isVisible()) {
    await expect(add).toBeVisible();
    const box = (await add.boundingBox())!;
    await walkTo(page, box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(1200);
  }

  await expect(page.locator('[data-timeline-group="camera"]')).toBeVisible();
  for (const property of ['lng', 'lat', 'zoom', 'heading', 'tilt']) {
    await expect(page.locator(`[data-timeline-key="camera:${property}"]`)).toBeVisible();
  }

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('dragging the playhead scrubs, and the readout names the spoken word', async ({ page }) => {
  const errors = watchConsole(page);
  await openTimeline(page);

  // The RULER scrubs; the tracks below it select keyframes, as in Figma.
  const lanes = page.locator('[data-timeline-ruler]');
  const box = (await lanes.boundingBox())!;
  const y = box.y + 20;

  await walkTo(page, box.x + 10, y);
  await page.mouse.down();
  await walkTo(page, box.x + box.width * 0.4, y, 12);   // walked, not teleported
  await page.mouse.up();
  await page.waitForTimeout(400);

  const ms = Number(await page.locator('[data-timeline-time]').inputValue());
  expect(ms, 'the field reads milliseconds').toBeGreaterThan(1000);

  // Land ON a word rather than hoping one is being spoken: there is real silence between words,
  // and asserting at an arbitrary moment tests the gaps, not the readout.
  const target = await page.evaluate(() => {
    const c = (document.querySelector('[data-timeline]') as any)._x_dataStack[0];
    const span = (c.spans ?? []).find((s: any) => s.start > 0.5 && s.start < c.duration - 0.5);
    if (span) c.seek(span.start + Math.min(0.05, (span.end - span.start) / 2));
    return span?.word ?? null;
  });
  expect(target, 'the narration should have a word inside the timeline').not.toBeNull();
  await page.waitForTimeout(200);
  const word = (await page.locator('[data-timeline-word]').textContent())?.trim() ?? '';
  expect(word, `readout should name the word being spoken`).toBe(target);

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('a keyframe dragged along its lane snaps to a spoken word', async ({ page }) => {
  const errors = watchConsole(page);
  await openTimeline(page);

  // The camera may already be on this scene — adding one PERSISTS, which is the point of it
  // being an object rather than a mode. Add it only when it is not there yet.
  // boundingBox() auto-waits and throws when nothing is there, so ask whether it exists first.
  // isVisible(), NOT count(): "Add camera" is x-show'd, so a hidden one still counts as 1 and
  // boundingBox() then returns null — which is what three of these tests died on.
  const add = page.locator('[data-timeline-add-camera]');
  let box = null;
  if (await add.isVisible()) {
    box = (await add.boundingBox())!;
    await walkTo(page, box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.mouse.up();
    await page.waitForTimeout(1000);
  }
  await expect(page.locator('[data-timeline-group="camera"]')).toBeVisible();

  const diamondButton = page.locator('[data-timeline-key="camera:zoom"]');
  box = (await diamondButton.boundingBox())!;
  await walkTo(page, box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(1000);

  const key = page.locator('[data-timeline-diamond="camera:zoom"]').first();
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

test('pressing play moves the map — the whole point, and it is asserted on the MAP', async ({ page }) => {
  const errors = watchConsole(page);
  await openTimeline(page);

  const add = page.locator('[data-timeline-add-camera]');
  if (await add.isVisible()) {
    const ab = (await add.boundingBox())!;
    await walkTo(page, ab.x + ab.width / 2, ab.y + ab.height / 2);
    await page.mouse.down(); await page.mouse.up();
    await page.waitForTimeout(1500);
  }

  const keyRow = async (property: string) => {
    const kb = (await page.locator(`[data-timeline-key="camera:${property}"]`).boundingBox())!;
    await walkTo(page, kb.x + kb.width / 2, kb.y + kb.height / 2);
    await page.mouse.down(); await page.mouse.up();
    await page.waitForTimeout(1600);
  };

  // With nothing keyed, play must refuse rather than run for 30s and change nothing.
  await expect(page.locator('[data-timeline-play]')).toBeDisabled();

  // Frame one, at the start: the diamonds key where the map is now.
  await keyRow('lng');
  await keyRow('lat');

  // Figma's auto-keyframe flow: move the playhead, then move the OBJECT — the canvas edit records
  // itself. Scrubbed on the ruler.
  const lanes = page.locator('[data-timeline-ruler]');
  const lb = (await lanes.boundingBox())!;
  await walkTo(page, lb.x + 10, lb.y + 20);
  await page.mouse.down();
  await walkTo(page, lb.x + lb.width * 0.6, lb.y + 20, 14);
  await page.mouse.up();
  await page.waitForTimeout(500);

  // Move the map with a REAL mouse drag on the globe, the way a teacher frames a shot.
  // MUST be the maplibre canvas: a map scene stacks the artwork overlay's canvas over it, and
  // canvas.first() grabs that one — the drag then does nothing and the test reads a working
  // feature as broken.
  const canvas = page.locator('canvas.maplibregl-canvas');
  const cb = (await canvas.boundingBox())!;
  await walkTo(page, cb.x + cb.width * 0.6, cb.y + cb.height * 0.5);
  await page.mouse.down();
  await walkTo(page, cb.x + cb.width * 0.3, cb.y + cb.height * 0.45, 16);
  await page.mouse.up();
  await page.waitForTimeout(1600);

  await expect(page.locator('[data-timeline-play]')).toBeEnabled();

  // Rewind and play. The assertion is on the MAP, not on the timeline's own numbers: a playhead
  // that advances while nothing moves is exactly the bug this test exists for.
  await page.evaluate(() => (document.querySelector('[data-timeline]') as any)._x_dataStack[0].seek(0));
  await page.waitForTimeout(300);
  const centreOf = () => page.evaluate(() => {
    const m = (window as any).__lessonMap;
    return [+m.getCenter().lng.toFixed(3), +m.getCenter().lat.toFixed(3)];
  });
  const before = await centreOf();

  const pb = (await page.locator('[data-timeline-play]').boundingBox())!;
  await walkTo(page, pb.x + pb.width / 2, pb.y + pb.height / 2);
  await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(2500);
  const during = await centreOf();
  await page.waitForTimeout(2500);
  const later = await centreOf();

  const moved = (a: number[], b: number[]) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  expect(moved(before, during), `map did not move during playback: ${JSON.stringify({ before, during })}`)
    .toBeGreaterThan(0.05);
  expect(moved(during, later), `map stopped moving mid-playback: ${JSON.stringify({ during, later })}`)
    .toBeGreaterThan(0.05);

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

/**
 * Figma's keyframe gestures (help.figma.com, "Add, select, and delete keyframes"): click selects,
 * Delete removes the selection, double-click JUMPS to the key. Double-click used to delete here,
 * which is the one gesture a Figma user would try first to get to a key.
 */
test('a keyframe is selected by a click, jumped to by a double-click, and removed by Delete', async ({ page }) => {
  const errors = watchConsole(page);
  await openTimeline(page);

  await page.evaluate(() => {
    const c = (document.querySelector('[data-timeline]') as any)._x_dataStack[0];
    c.targets = ['camera']; c.refreshObjects();
    c.tracks = [{ target: 'camera', property: 'zoom', keyframes: [{ time: 0, value: 3 }, { time: 2, value: 5 }] }];
    c.seek(0); c.save();
  });
  await page.waitForTimeout(2000);
  const state = () => page.evaluate(() => {
    const c = (document.querySelector('[data-timeline]') as any)._x_dataStack[0];
    return { time: c.time, selected: [...c.selected], times: c.tracks[0].keyframes.map((k: any) => k.time) };
  });

  const key = page.locator('[data-timeline-diamond="camera:zoom"]').nth(1);
  const kb = (await key.boundingBox())!;
  await walkTo(page, kb.x + kb.width / 2, kb.y + kb.height / 2);
  await page.mouse.down(); await page.mouse.up();
  expect((await state()).selected).toEqual(['camera|zoom|2']);
  await expect(key).toHaveAttribute('aria-selected', 'true');

  await page.mouse.dblclick(kb.x + kb.width / 2, kb.y + kb.height / 2);
  await page.waitForTimeout(300);
  expect((await state()).time, 'double-click jumps the playhead to the key').toBe(2);
  expect((await state()).times, 'and deletes nothing').toEqual([0, 2]);

  await page.keyboard.press('Delete');
  await page.waitForTimeout(800);
  expect((await state()).times).toEqual([0]);

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

/**
 * Easing, as Figma does it: click the stretch between two keys, pick from the Easing menu. The
 * default depends on where the stretch sits (Bart): ease in from the first key, ease out into
 * the last, linear between. Dragging a bar moves the whole animation.
 */
test('clicking between two keys chooses the easing, and dragging the bar moves the animation', async ({ page }) => {
  const errors = watchConsole(page);
  await openTimeline(page);

  await page.evaluate(() => {
    const c = (document.querySelector('[data-timeline]') as any)._x_dataStack[0];
    c.targets = ['camera']; c.refreshObjects();
    c.tracks = [{ target: 'camera', property: 'zoom', keyframes: [{ time: 0, value: 3 }, { time: 2, value: 5 }, { time: 4, value: 6 }] }];
    c.selected = []; c.seek(0); c.save();
  });
  await page.waitForTimeout(2000);
  const state = () => page.evaluate(() => {
    const c = (document.querySelector('[data-timeline]') as any)._x_dataStack[0];
    return {
      segs: c.segmentsOf('camera', 'zoom').map((s: any) => s.easing),
      keys: c.tracks[0].keyframes.map((k: any) => [k.time, k.easing ?? null]),
      zoom: c.zoom,
    };
  });
  expect((await state()).segs).toEqual(['easeInCubic', 'easeOutCubic']);

  const seg = (await page.locator('[data-timeline-segment="camera:zoom:0"]').boundingBox())!;
  await walkTo(page, seg.x + seg.width / 2, seg.y + seg.height / 2);
  await page.mouse.down(); await page.mouse.up();
  await expect(page.locator('[data-timeline-easing-menu]')).toBeVisible();

  const linear = (await page.locator('[data-easing="linear"]').boundingBox())!;
  await walkTo(page, linear.x + 20, linear.y + linear.height / 2);
  await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(500);
  expect((await state()).segs).toEqual(['linear', 'easeOutCubic']);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-timeline-easing-menu]')).toHaveCount(0);

  // Alt: place freely, so the move is exactly the pointer's travel.
  const { zoom } = await state();
  const bar = (await page.locator('[data-timeline-segment="camera:zoom:1"]').boundingBox())!;
  await walkTo(page, bar.x + bar.width / 2, bar.y + bar.height / 2);
  await page.keyboard.down('Alt');
  await page.mouse.down();
  await walkTo(page, bar.x + bar.width / 2 + zoom * 0.5, bar.y + bar.height / 2, 10);
  await page.mouse.up();
  await page.keyboard.up('Alt');
  await page.waitForTimeout(800);
  expect((await state()).keys).toEqual([[0.5, 'linear'], [2.5, null], [4.5, null]]);

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

/** Figma's Custom bezier: the handles move the curve, the scene follows live, Esc puts it back. */
test('the custom bezier editor drives the scene live and saves on release', async ({ page }) => {
  const errors = watchConsole(page);
  await openTimeline(page);
  await page.evaluate(() => {
    const c = (document.querySelector('[data-timeline]') as any)._x_dataStack[0];
    c.targets = ['camera']; c.refreshObjects();
    c.tracks = [{ target: 'camera', property: 'zoom', keyframes: [{ time: 0, value: 3 }, { time: 4, value: 6 }] }];
    c.selected = []; c.seek(2); c.save();
  });
  await page.waitForTimeout(2000);
  const easing = () => page.evaluate(() => (document.querySelector('[data-timeline]') as any)._x_dataStack[0].tracks[0].keyframes[0].easing ?? null);
  const mapZoom = () => page.evaluate(() => (window as any).__lessonMap.getZoom());

  const seg = (await page.locator('[data-timeline-segment="camera:zoom:0"]').boundingBox())!;
  await walkTo(page, seg.x + seg.width * 0.3, seg.y + seg.height / 2);
  await page.mouse.down(); await page.mouse.up();
  const custom = (await page.locator('[data-easing="custom"]').boundingBox())!;
  await walkTo(page, custom.x + 30, custom.y + custom.height / 2);
  await page.mouse.down(); await page.mouse.up();
  await expect(page.locator('[data-timeline-bezier]')).toBeVisible();
  const opened = await easing();
  expect(opened).toMatch(/^cubic-bezier\(/);

  const zoomBefore = await mapZoom();
  const h = (await page.locator('[data-timeline-bezier-handle="0"]').boundingBox())!;
  await walkTo(page, h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await walkTo(page, h.x + h.width / 2 - 40, h.y - 60, 10);
  expect(await easing(), 'the curve changes during the drag').not.toBe(opened);
  expect(Math.abs((await mapZoom()) - zoomBefore), 'and the map follows it live').toBeGreaterThan(0.1);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(await easing(), 'Esc mid-drag puts the curve back').toBe(opened);

  const field = page.locator('[data-timeline-bezier-text]');
  await field.click(); await field.fill('cubic-bezier(0.1, 0.9, 0.2, 1)'); await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  expect(await easing()).toBe('cubic-bezier(0.1, 0.9, 0.2, 1)');

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

/** Canvas → timeline: click a layer, its row lights up and no keys are selected. Row name →
 *  canvas: the layer is selected there. */
test('selecting a layer on the canvas highlights its row, and a row name selects the layer', async ({ page }) => {
  const errors = watchConsole(page);
  await openTimeline(page);
  // The quiz scene carries a text layer and an artwork; the map scene has neither.
  await page.locator(`[wire\\:click="selectScene(${Number(process.env.PW_TIMELINE_LAYER_SCENE_ID ?? 4781)})"]`).first().click();
  await page.waitForTimeout(6000);
  const state = () => page.evaluate(() => {
    const c = (document.querySelector('[data-timeline]') as any)._x_dataStack[0];
    return { active: c.activeTarget, keys: c.selected.length, objects: c.objects.map((o: any) => o.target) };
  });

  const text = page.locator('[data-text-id]').first();
  const tb = (await text.boundingBox())!;
  await walkTo(page, tb.x + tb.width / 2, tb.y + tb.height / 2);
  await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(500);
  const s1 = await state();
  expect(s1.active).toMatch(/^text:/);
  expect(s1.keys, 'a canvas click never selects keys: Delete would take the animation').toBe(0);
  await expect(page.locator(`[data-timeline-active="true"]`)).toHaveCount(1);

  const art = s1.objects.find((o: string) => o.startsWith('art:'))!;
  const row = page.locator(`[data-timeline-group="${art}"]`);
  await row.scrollIntoViewIfNeeded();
  const rb = (await row.boundingBox())!;
  await walkTo(page, rb.x + 40, rb.y + rb.height / 2);
  await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(300);
  expect((await state()).active).toBe(art);
  const onCanvas = await page.evaluate(() => ((window as any).__artOverlay?.() ?? (window as any).__lessonArtworkLayer)?._selectedId);
  expect(onCanvas).toBe(art.replace('art:', 'art_'));

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});
