import { test, expect, Page, Locator } from '@playwright/test';
import { execFileSync } from 'node:child_process';

/**
 * The colour picker stays open while the teacher works in it (Bart, 2026-10-30, prod lesson 63,
 * scene 1588, a text layer: "the colorpicker was hiding everytime. i was interacting with it").
 *
 * The picker is the browser's own popup, owned by the `<input type="color">`. The editor morphs its
 * inspector all the time (wire:poll.3s, every keyframe save) and each morph handed that input the
 * server's colour: its `value` attribute, and the swatch and hex beside it, snapped back to the last
 * saved colour in the middle of a drag.
 *
 * Headless Chromium has no native popup to drag in, so the drag is what the popup does to the page:
 * `input` events for 3 s, no `change` until it closes. The pointer presses are real (page.mouse).
 * Each case runs on a throwaway COPY of a dev lesson. Silent: AudioContext and media.play are stubbed.
 *
 *   PW_BASE_URL=http://127.0.0.1:8341 node ../../../node_modules/@playwright/test/cli.js test \
 *     tests/playwright/colour-field-stays-open.spec.ts --project=chromium
 */

const TEXT_PARENT = process.env.PW_COLOUR_TEXT_PARENT ?? '8';
const IMAGE_PARENT = process.env.PW_COLOUR_IMAGE_PARENT ?? '18';
const DRAG_MS = 4500;
const FINAL = '#e63946';
const SERVER_DURING = '#00aa11';

const SILENCE = `
  (() => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) AC.prototype.resume = function () { return Promise.resolve(); };
    HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return Promise.resolve(); };
  })();`;

const php = (args: string[]) => execFileSync('php', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const tinker = (code: string) => php(['artisan', 'tinker', `--execute=${code}`]);

type Fixture = { lesson: number; scene: number };
const copyOf = (parent: string): number =>
  (JSON.parse(php(['artisan', 'lessons:test-copy', parent, '--json']).trim().split('\n').pop() ?? '{}') as { id: number }).id;

function textFixture(extra: string): Fixture {
  const lesson = copyOf(TEXT_PARENT);
  const scene = tinker(`$l=\\App\\Models\\Lesson::findOrFail(${lesson}); $s=$l->scenes()->orderBy('order')->first(); $c=$s->config ?? []; $c['texts']=[['id'=>'txt_fixture','text'=>'18 november 2026','x'=>10,'y'=>12,'font'=>'sans','size'=>'md','bg'=>'none','anchor'=>'screen','color'=>'#ffffff'${extra}]]; $s->config=$c; $s->save(); echo 'SCENE='.$s->id;`).match(/SCENE=(\d+)/)!;
  return { lesson, scene: Number(scene[1]) };
}

function imageFixture(): Fixture {
  const lesson = copyOf(IMAGE_PARENT);
  const scene = tinker(`$l=\\App\\Models\\Lesson::findOrFail(${lesson}); foreach ($l->scenes()->orderBy('order')->get() as $s) { foreach (($s->shots ?? []) as $shot) { foreach (($shot['layers'] ?? []) as $layer) { if (($layer['kind'] ?? '') === 'figure') { echo 'SCENE='.$s->id; return; } } } }`).match(/SCENE=(\d+)/)!;
  return { lesson, scene: Number(scene[1]) };
}

type Case = { name: string; make: () => Fixture; select: (page: Page) => Promise<void>; picker: string; save: (page: Page, color: string) => Promise<unknown[]>; animated?: boolean };

const CASES: Case[] = [
  {
    name: 'text colour, animated (prod: lesson 63)',
    make: () => textFixture(''),
    select: (page) => page.locator('[data-text-id="txt_fixture"]').first().click(),
    picker: '[data-text-inspector] [data-color-field] input[type="color"]',
    save: async (_p, color) => ['updateSceneText', 'txt_fixture', 'color', color],
    animated: true,
  },
  {
    name: 'text colour, plain',
    make: () => textFixture(''),
    select: (page) => page.locator('[data-text-id="txt_fixture"]').first().click(),
    picker: '[data-text-inspector] [data-color-field] input[type="color"]',
    save: async (_p, color) => ['updateSceneText', 'txt_fixture', 'color', color],
  },
  {
    name: 'image tint',
    make: imageFixture,
    select: (page) => page.locator('[data-layer-id^="art_"]').first().click(),
    picker: '[data-color-field] input[type="color"][aria-label]',
    save: async (page, color) => {
      const id = await page.locator('[data-layer-id^="art_"]').first().getAttribute('data-layer-id');
      return ['updateArtworkLayer', Number(id!.replace('art_', '')), 'tint', color];
    },
  },
  {
    name: 'panel colour (bare input)',
    make: () => textFixture(", 'kind'=>'rect', 'w'=>40, 'h'=>30, 'bg'=>'glass', 'opacity'=>0.5, 'side'=>'left'"),
    select: (page) => page.locator('[data-text-id="txt_fixture"]').first().click(),
    picker: 'input[type="color"]:not([aria-label])',
    save: async (_p, color) => ['updateSceneText', 'txt_fixture', 'color', color],
  },
];

/** Made inside each test and deleted after it: the dev DB is shared, a long-lived copy gets swept. */
const made: number[] = [];

test.afterEach(() => {
  for (const id of made.splice(0)) tinker(`App\\Models\\Lesson::find(${id})?->delete(); echo 'ok';`);
});

function fixtureFor(c: Case): Fixture {
  const fx = c.make();
  made.push(fx.lesson);
  if (c.animated) {
    tinker(`$s=\\App\\Models\\Scene::findOrFail(${fx.scene}); $c=$s->config; $c['timeline']=['duration'=>6,'targets'=>[],'tracks'=>[['target'=>'text:txt_fixture','property'=>'color','keyframes'=>[['time'=>0,'value'=>'#ffffff'],['time'=>2,'value'=>'#ff0000']]]]]; $s->config=$c; $s->save();`);
  }
  return fx;
}

/** Everything the page does to the picker's input from the moment the teacher starts dragging. */
async function watch(input: Locator) {
  await input.evaluate((el: HTMLInputElement) => {
    const w = window as any;
    (el as any).__probe = 'original';
    w.__colour = { morphs: 0, mismatches: 0 };
    // A morph strips any attribute the server's markup does not carry, from every node it visits.
    // This one survives only while the open field is skipped.
    (el.closest('[data-color-field]') ?? el).setAttribute('data-morph-marker', '1');
    w.Livewire.hook('morphed', () => w.__colour.morphs++);
  });
}

/**
 * Save a colour through the component, the way a keyframe save or the 3 s poll reaches the inspector.
 * Livewire only sends HTML when the render changed, so an idle poll proves nothing: this makes the
 * server's colour differ, and the morph that follows carries it to every field the page allows.
 */
async function serverSave(page: Page, input: Locator, c: Case, color: string) {
  const [method, ...args] = await c.save(page, color);
  await input.evaluate(async (el, [m, a]) => {
    const id = el.closest('[wire\\:id]')!.getAttribute('wire:id')!;
    await (window as any).Livewire.find(id).call(m, ...(a as unknown[]));
  }, [method, args] as [string, unknown[]]);
}

/** What the popup does while the mouse drags in it: input events, never `change`. */
async function drag(page: Page, input: Locator, c: Case) {
  const started = Date.now();
  let pending: Promise<void> | null = null;
  for (let i = 0; Date.now() - started < DRAG_MS; i++) {
    const v = `#${Math.min(255, 20 + i * 6).toString(16).padStart(2, '0')}39${(255 - i * 3 & 255).toString(16).padStart(2, '0')}`;
    await input.evaluate((el: HTMLInputElement, c) => {
      el.value = c;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, i === 0 ? '#101010' : v);
    await input.evaluate((el: HTMLInputElement) => {
      const swatch = el.closest('[data-color-field]')?.querySelector<HTMLElement>('[data-color-swatch]');
      if (!swatch) return;
      const painted = getComputedStyle(swatch).backgroundColor;
      const probe = Object.assign(document.createElement('i'), { style: `color:${el.value}` });
      document.body.append(probe);
      const want = getComputedStyle(probe).color;
      probe.remove();
      if (painted !== want) (window as any).__colour.mismatches++;
    });
    // A second in, the server renders a different colour into the inspector: the morph the drag must survive.
    if (i === 8) pending = serverSave(page, input, c, SERVER_DURING);
    await page.waitForTimeout(110);
  }
  await pending;
}

for (const c of CASES) {
  test(`${c.name}: the picker stays open while dragged, closes on outside click and Escape`, async ({ page }) => {
    test.setTimeout(600_000);
    const fx = fixtureFor(c);
    await page.addInitScript(SILENCE);
    await page.goto(`/teacher/lessons/${fx.lesson}/wizard?step=4&scene=${fx.scene}`);
    await page.locator('[data-tab="timeline"]').waitFor({ state: 'visible', timeout: 120000 });
    await page.waitForTimeout(4000);
    await c.select(page);
    await page.waitForTimeout(800);

    const input = page.locator(c.picker).first();
    await input.waitFor({ state: 'attached' });
    const box = (await input.boundingBox())!;
    await watch(input);

    // A real press on the swatch opens the picker; from here the page sees only what the popup sends.
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await drag(page, input, c);

    const during = await input.evaluate((el: HTMLInputElement) => ({
      ...(window as any).__colour,
      sameNode: (el as any).__probe === 'original' && el.isConnected,
      untouched: (el.closest('[data-color-field]') ?? el).hasAttribute('data-morph-marker'),
      serverValueApplied: el.getAttribute('value') === '#00aa11',
    }));
    // The drag must have been through at least one re-render, or it proves nothing.
    expect(during.morphs, 'a morph landed during the drag').toBeGreaterThanOrEqual(1);
    expect(during.sameNode, 'the colour input is the same node').toBe(true);
    expect(during.untouched, 'no morph touched the open input').toBe(true);
    expect(during.serverValueApplied, 'the server\'s colour was not pushed into the open picker').toBe(false);
    expect(during.mismatches, 'the swatch and hex followed the drag at every step').toBe(0);

    // Closing the popup is `change`. After it, an explicit press elsewhere or Escape ends the
    // picker's turn, and the very next render visits the field again.
    await input.evaluate((el: HTMLInputElement, v) => {
      el.value = v;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, FINAL);
    const hasWrapper = await input.evaluate((el) => !!el.closest('[data-color-field]'));
    // Escape leaves focus where it was, so only a field with a wrapper can show it was released here;
    // a bare input proves its Escape release in the unit test.
    for (const [n, release] of (hasWrapper ? (['outside click', 'Escape'] as const) : (['outside click'] as const)).entries()) {
      const server = n === 0 ? '#aa0011' : '#1100aa';
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await input.evaluate((el: HTMLInputElement) => {
        el.value = '#123456';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      if (release === 'Escape') {
        // The colour popup swallows Escape itself (the page never sees the key), so the page-level
        // release is shown from the strength box beside it, where Escape does reach the page.
        const strength = page.locator(c.picker).first().locator('xpath=ancestor::*[@data-color-field][1]//input[@type="number"]');
        await strength.click();
        await page.keyboard.type('7');
        await page.keyboard.press('Escape');
      }
      else await page.mouse.click(8, 8);
      await serverSave(page, input, c, server);
      // A focused input keeps its own value through a morph, so a field with a readout is judged by
      // that (the hex the server renders); a bare input has none and was blurred by the click.
      await expect.poll(() => input.evaluate((el) => {
        const hex = el.closest('[data-color-field]')?.querySelector('[data-color-hex]');
        return hex ? '#' + hex.textContent!.toLowerCase() : el.getAttribute('value');
      }), { timeout: 20000, message: `the server's colour reached the field after ${release}` }).toBe(server);
    }
  });
}
