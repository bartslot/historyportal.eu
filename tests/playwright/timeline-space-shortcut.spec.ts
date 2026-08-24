import { test, expect, Page } from '@playwright/test';

/**
 * Space plays and pauses the Timeline tab, the way it does in every editor.
 *
 * Driven with a REAL keyboard — page.keyboard.press('Space'), never a synthetic dispatch into the
 * component's own play(). Calling play() tests play(); the whole question here is whether the key
 * ever reaches it, and under which circumstances it must not.
 *
 * Every case is decided on two things at once: what the transport DID, and whether the keypress was
 * cancelled. The second half is the one that has no visible symptom — a handler that calls
 * preventDefault before deciding whether it will act has silently taken the page's scroll away
 * from everybody in exchange for nothing, and nothing on screen says so.
 *
 * The scene comes from the fixture resolver (tests/playwright/support/global-setup.ts), not from a
 * hardcoded id: ids are a property of one database, and this suite has been renumbered before.
 */

const WIZARD_URL = process.env.TIMELINE_WIZARD_URL
  ?? process.env.VOYAGE_WIZARD_URL
  ?? '/teacher/lessons/339/wizard?step=4&scene=4653';

type Probe = { tag: string; timeField: boolean; defaultPrevented: boolean };

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

async function clickAt(page: Page, x: number, y: number) {
  await walkTo(page, x, y);
  await page.mouse.down();
  await page.mouse.up();
}

/** Read the timeline component's own state. Never used to DRIVE it — only to ask what happened. */
async function state(page: Page) {
  return page.evaluate(() => {
    const c = (document.querySelector('[data-timeline]') as any)?._x_dataStack?.[0];
    return {
      playing: !!c?.playing,
      time: Number(c?.time ?? -1),
      nothingToPlay: !!c?.nothingToPlay,
      tab: (window as any).Alpine?.store('view')?.bottomTab ?? null,
    };
  });
}

/**
 * A second listener on window, in the bubble phase, deliberately registered LAST.
 *
 * This is the only way to see the thing that matters most: whether the timeline cancelled the
 * keypress. `defaultPrevented` read here is a direct read of the decision the handler made.
 *
 * It must be re-armed immediately before every press, with a NEW function each time. Listeners on
 * one target fire in registration order, and Alpine registers a fresh one every time the component
 * is rebuilt — so a probe armed once at page load silently ends up running BEFORE the handler it
 * is meant to be observing, and reports "not cancelled" for a key that was. That misreading cost
 * this spec a false failure before it was caught.
 */
async function armProbe(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    w.__spaceProbe = [];
    if (w.__spaceProbeFn) window.removeEventListener('keydown', w.__spaceProbeFn);
    w.__spaceProbeFn = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const t = e.target as HTMLElement | null;
      w.__spaceProbe.push({
        tag: (t?.tagName ?? '').toLowerCase(),
        timeField: t?.hasAttribute?.('data-timeline-time') === true,
        defaultPrevented: e.defaultPrevented,
      });
    };
    window.addEventListener('keydown', w.__spaceProbeFn);
  });
}

const probe = (page: Page) => page.evaluate(() => (window as any).__spaceProbe as Probe[]);

/** A REAL keypress, with the observer freshly placed behind the app's own handler. */
async function pressSpace(page: Page) {
  await armProbe(page);
  await page.keyboard.press('Space');
}

async function openTimeline(page: Page) {
  // NOT networkidle: the wizard runs a 3-second wire:poll, so the network is never idle and the
  // wait can only ever time out.
  await page.goto(WIZARD_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(9000);           // the map needs a beat; a black frame is loading

  const tab = page.locator('[data-tab="timeline"]');
  await expect(tab).toBeVisible({ timeout: 15000 });
  const box = (await tab.boundingBox())!;
  await clickAt(page, box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(800);

  await expect(page.locator('[data-timeline]')).toBeVisible();

  // Start from an unanimated scene. The timeline PERSISTS — that is the feature — so without this
  // the tests only pass in the order they happen to run in, which is not passing.
  await page.evaluate(() => {
    const c = (document.querySelector('[data-timeline]') as any)._x_dataStack[0];
    c.targets = []; c.tracks = []; c.refreshObjects(); c.seek(0);
  });
  await armProbe(page);
}

/** Arrange a scene that HAS something to play: one camera, keyed at both ends of the ruler. */
async function giveItSomethingToPlay(page: Page, save = false) {
  await page.evaluate((persist) => {
    const c = (document.querySelector('[data-timeline]') as any)._x_dataStack[0];
    c.duration = 8;
    c.targets = ['camera'];
    c.tracks = [{
      target: 'camera',
      property: 'zoom',
      keyframes: [{ time: 0, value: 2 }, { time: 7, value: 5 }],
    }];
    c.refreshObjects();
    c.seek(0);
    if (persist) c.save();
  }, save);
  await page.waitForTimeout(save ? 2000 : 400);
  expect((await state(page)).nothingToPlay, 'the scene should now have something to play').toBe(false);
}

test.describe('Space is the timeline’s play/pause', () => {
  // Each case loads the wizard, waits out the map, and then plays for a few seconds in real time.
  test.describe.configure({ timeout: 150_000 });

  test('a real Space starts playback, the playhead advances, and the page keeps still', async ({ page }) => {
    const errors = watchConsole(page);
    await openTimeline(page);
    await giveItSomethingToPlay(page);

    const scrollBefore = await page.evaluate(() => window.scrollY);
    expect((await state(page)).playing).toBe(false);

    await pressSpace(page);
    await page.waitForTimeout(1200);

    const running = await state(page);
    expect(running.playing, 'Space should have started playback').toBe(true);
    // A playing flag with a frozen playhead is exactly the bug a boolean assertion misses.
    expect(running.time, `the playhead should have advanced, sat at ${running.time}s`).toBeGreaterThan(0.4);

    await page.waitForTimeout(1200);
    const later = await state(page);
    expect(later.time, 'the playhead should still be advancing').toBeGreaterThan(running.time);

    // Space scrolls a page by default. The handler took the key, so it must also have cancelled it.
    const taken = await probe(page);
    expect(taken.at(-1)!.defaultPrevented, 'a handled Space must be cancelled so the page cannot scroll').toBe(true);
    expect(await page.evaluate(() => window.scrollY), 'the page must not have scrolled').toBe(scrollBefore);

    // And again — the same key pauses. Exactly once: a second listener left behind by a Livewire
    // morph would play and immediately pause, landing back on false.
    await pressSpace(page);
    await page.waitForTimeout(600);
    const paused = await state(page);
    expect(paused.playing, 'Space again should have paused').toBe(false);
    expect(paused.time, 'pausing must leave the playhead where it was, not rewind it')
      .toBeGreaterThan(0.4);

    expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
  });

  /**
   * The negative case, and the reason the shortcut needs a guard at all: the panel is nothing but
   * number fields, and a teacher's very next keystroke after clicking one may be a space.
   */
  test('a Space typed into a panel field goes to the field, and nothing plays', async ({ page }) => {
    const errors = watchConsole(page);
    await openTimeline(page);
    await giveItSomethingToPlay(page);

    // Click the Time field with a real mouse, the way a teacher reaches it.
    const field = page.locator('[data-timeline-time]');
    const box = (await field.boundingBox())!;
    await clickAt(page, box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);

    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-timeline-time') !== null))
      .toBe(true);

    const before = await state(page);
    await pressSpace(page);
    await page.waitForTimeout(900);

    const after = await state(page);
    expect(after.playing, 'a Space in a field must never start playback').toBe(false);
    expect(after.time, 'the playhead must not have moved').toBeCloseTo(before.time, 3);

    // The field got the keypress, and nobody cancelled it — so the browser was free to do with it
    // whatever a field does. That is what "the shortcut kept its hands off" means.
    const seen = await probe(page);
    const last = seen.at(-1)!;
    expect(last.timeField, `the keydown should have landed on the Time field, not ${last.tag}`).toBe(true);
    expect(last.defaultPrevented, 'an unhandled Space must NOT be cancelled').toBe(false);

    // And the caret is still in the field: focus was not stolen.
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-timeline-time') !== null))
      .toBe(true);

    expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('with under two keyframes Space does nothing at all — including not eating the key', async ({ page }) => {
    const errors = watchConsole(page);
    await openTimeline(page);

    expect((await state(page)).nothingToPlay, 'the scene was reset, so play must be refused').toBe(true);

    await pressSpace(page);
    await page.waitForTimeout(700);

    const after = await state(page);
    expect(after.playing, 'play is refused, so nothing may start').toBe(false);
    expect(after.time, 'and the playhead stays home').toBeCloseTo(0, 3);

    // Refused is not handled: cancelling the scroll to then do nothing is the worst of both.
    const seen = await probe(page);
    expect(seen.at(-1)!.defaultPrevented, 'a refused Space must not be cancelled either').toBe(false);

    expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('Space belongs to the Timeline tab only, not to the Script tab beside it', async ({ page }) => {
    const errors = watchConsole(page);
    await openTimeline(page);
    await giveItSomethingToPlay(page);

    // The dock keeps all three tabs MOUNTED, so a hidden timeline is still listening. Switch away.
    const scriptTab = page.locator('[role="tab"]', { hasText: /^Script$/ }).first();
    const box = (await scriptTab.boundingBox())!;
    await clickAt(page, box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(700);
    expect((await state(page)).tab).toBe('script');

    await pressSpace(page);
    await page.waitForTimeout(800);

    const after = await state(page);
    expect(after.playing, 'the hidden timeline must not play').toBe(false);
    const seen = await probe(page);
    expect(seen.at(-1)!.defaultPrevented, 'and it must not cancel a key it did not use').toBe(false);

    expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
  });

  /**
   * The recorded trap, and the reason this shortcut is declared in the Blade instead of registered
   * in init(): switching scenes changes the dock's wire:key, so Livewire tears the whole panel down
   * and Alpine builds a brand new component. A window listener added by hand in init() would
   * survive that teardown — Alpine knows nothing about it — and the next one would join it. Two
   * handlers turn one press into play-then-pause, which reads as the key simply not working.
   *
   * Measured on the way in: four switches really do produce five distinct component instances, so
   * a leak here would be four handlers deep by the time the key is pressed.
   */
  test('after the dock is rebuilt four times, one Space is still one toggle', async ({ page }) => {
    const errors = watchConsole(page);
    await openTimeline(page);

    const rail = page.locator('[data-scene-id]');
    expect(await rail.count(), 'this lesson needs a few scenes to switch between').toBeGreaterThan(2);

    // Tag each component instance so the rebuilds can be counted rather than assumed.
    const tag = () => page.evaluate(() => {
      const w = window as any;
      w.__seq ??= 0;
      const c = (document.querySelector('[data-timeline]') as any)?._x_dataStack?.[0];
      if (c && !c.__instance) c.__instance = ++w.__seq;
      return c?.__instance ?? null;
    });

    await tag();
    for (const index of [1, 0, 2, 0]) {
      const box = (await rail.nth(index).boundingBox())!;
      await clickAt(page, box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(3500);
      await tag();
    }
    expect(await tag(), 'four scene switches should have built five components').toBe(5);

    await giveItSomethingToPlay(page);

    await pressSpace(page);
    await page.waitForTimeout(1200);

    const after = await state(page);
    expect(after.playing, 'one press after four rebuilds must leave it PLAYING, not toggled twice').toBe(true);
    expect(after.time, 'and the playhead must be moving').toBeGreaterThan(0.3);

    // One press, one handler. A leaked listener would show up here as a second entry.
    expect((await probe(page)).length, 'the key should have been seen once, not once per rebuild').toBe(1);
    expect((await probe(page))[0].defaultPrevented, 'and the rebuilt handler still cancels the scroll').toBe(true);

    expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('the play button wears the shortcut, in the app’s tooltip convention', async ({ page }) => {
    await openTimeline(page);

    const play = page.locator('[data-timeline-play]');
    await expect(play).toHaveAttribute('data-tooltip-key', /\S/);
    await expect(play).toHaveAttribute('aria-keyshortcuts', 'Space');
    // Never both: `title` alongside data-tooltip is what puts two tooltips on screen at once.
    expect(await play.getAttribute('title'), 'a data-tooltip control must not also carry title').toBeNull();
  });
});
