import { test, expect, Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';

/**
 * A balloon's tail animates, in the editor AND in the player (Bart, 2026-10-27: "De staartvorming
 * werkt niet bij het animeren in productie").
 *
 * His sequence, prod scene 1589: key the tail at 0 s, then change its root at a later moment. Keyed
 * row by row each tail row held one key, a row with one key never moves, and the tail stood still.
 * The tail is one shape now: a key on one tail row keys them all.
 *
 * Runs on a throwaway COPY of PW_TAIL_PARENT_LESSON_ID (a lesson with a free speech balloon), never
 * on a teacher's own lesson. The browser is muted (--mute-audio in the chromium project).
 *
 *   PW_BASE_URL=http://localhost:8317 npx playwright test tests/playwright/balloon-tail-keys.spec.ts --project=chromium
 */

const PARENT = process.env.PW_TAIL_PARENT_LESSON_ID ?? '61';

type Fixture = { lesson: number; code: string; scene: number; index: number };
let fx: Fixture;

const php = (code: string) => execFileSync('php', ['artisan', 'tinker', '--execute', code], { encoding: 'utf8' }).trim().split('\n').pop() ?? '';

test.beforeAll(() => {
  const copy = JSON.parse(execFileSync('php', ['artisan', 'lessons:test-copy', PARENT, '--json'], { encoding: 'utf8' }).trim().split('\n').pop()!);
  // The first scene with a free speech balloon (no figure: its tail needs no painted speaker). It
  // shows from 0 s and the scene's timeline starts empty, so the test starts from a known state.
  // No narration: a local copy rarely has the audio file, and Playwright's Chromium cannot play
  // .m4a anyway, so the player's narration clock would sit at 0. Without audio it runs on wall time.
  const out = php(`
    foreach (App\\Models\\Lesson::find(${copy.id})->scenes()->orderBy('order')->get() as $s) {
      $c = $s->config; $lines = $c['lines'] ?? [];
      foreach ($lines as $i => $l) {
        if (($l['speaker'] ?? '') === 'balloon' && ($l['kind'] ?? 'speech') === 'speech' && empty($l['panel'])) {
          $lines[$i]['start'] = 0; $lines[$i]['end'] = null;
          $c['lines'] = $lines; unset($c['timeline']); $s->config = $c; $s->audio_path = null; $s->save();
          echo json_encode(['scene' => $s->id, 'index' => $i]); return;
        }
      }
    }`);
  const found = JSON.parse(out);
  fx = { lesson: copy.id, code: copy.code, scene: found.scene, index: found.index };
  console.log(`[fixture] copy #${fx.lesson} ${fx.code}, scene ${fx.scene}, balloon bal_${fx.index}`);
});

test.afterAll(() => {
  if (fx?.lesson) php(`App\\Models\\Lesson::find(${fx.lesson})?->delete(); echo 'ok';`);
});

const inkOf = (page: Page, id: string) => page.evaluate(
  (id) => document.querySelector(`[data-balloon-id="${id}"] .lp-balloon__tail .ink`)?.getAttribute('d') ?? null, id,
);

test('a tail keyed at 0 s and reshaped at 2 s moves, in the editor and the player', async ({ page }) => {
  test.setTimeout(180_000);
  const id = `bal_${fx.index}`;
  const target = `bal:${fx.index}`;

  // ---- Editor ----
  await page.goto(`/teacher/lessons/${fx.lesson}/wizard?step=4&scene=${fx.scene}`);
  await page.waitForLoadState('domcontentloaded');
  await page.locator(`[data-scene-block="${fx.scene}"] button`).first().click();
  await page.locator('[data-tab="timeline"]').first().click();
  await expect(page.locator('[data-timeline]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(`[data-balloon-id="${id}"] .lp-balloon__tail .ink`)).toHaveAttribute('d', /M /, { timeout: 30_000 });

  const saved = page.waitForResponse((r) => r.url().includes('livewire/update') && r.status() === 200, { timeout: 20_000 });
  const rows = await page.evaluate(({ target }) => {
    const c = (document.querySelector('[data-timeline]') as any)._x_dataStack[0];
    c.seek(0);
    // The teacher's first act: the diamond on Tail X at 0 s.
    c.toggleKey(target, 'tip_x');
    // Then, 2 s on, the tail's root moved round the balloon (the Tail root field).
    c.seek(2);
    const root = c.readValue ? c.readValue(target, 'root') : (window as any).__balloons.value(`bal_${target.slice(4)}`, 'root');
    c.setValue(target, 'root', ((Number(root) || 0) + 0.25) % 1);
    c.save();
    return Object.fromEntries(['tip_x', 'tip_y', 'root', 'bend'].map((p) => [p, c.keysOf(target, p).length]));
  }, { target });
  await saved;
  expect(rows, 'every tail row is keyed at both moments').toEqual({ tip_x: 2, tip_y: 2, root: 2, bend: 2 });

  const seek = (t: number) => page.evaluate((t) => (document.querySelector('[data-timeline]') as any)._x_dataStack[0].seek(t), t);
  await seek(0);
  const editorAt0 = await inkOf(page, id);
  await seek(2);
  const editorAt2 = await inkOf(page, id);
  expect(editorAt0).toBeTruthy();
  expect(editorAt2, 'the editor draws a different tail at 2 s than at 0 s').not.toBe(editorAt0);

  // ---- Player ----
  // What the server stored is what the player gets: two keys on the root.
  const stored = JSON.parse(php(`echo json_encode(collect(App\\Models\\Scene::find(${fx.scene})->config['timeline']['tracks'] ?? [])->where('target', '${target}')->mapWithKeys(fn ($t) => [$t['property'] => count($t['keyframes'])]));`));
  expect(stored.root, 'the saved root track has two keys').toBe(2);

  await page.goto(`/lesson/${fx.code}?scene_id=${fx.scene}`);
  // Sample the tail as the scene plays: it starts as at 0 s and ends as at 2 s.
  const seen = new Set<string>();
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline && seen.size < 3) {
    const play = page.getByRole('button', { name: /play|start|begin|speel|start de les/i }).first();
    if (await play.isVisible().catch(() => false)) await play.click().catch(() => {});
    const d = await inkOf(page, id);
    if (d) seen.add(d);
    await page.waitForTimeout(150);
  }
  expect(seen.size, 'the player draws the tail in more than one shape as the scene plays').toBeGreaterThan(2);
});
