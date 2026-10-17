import { test, expect } from '@playwright/test';

/**
 * The editor's Play (Bart, 2026-10-17: "speel de les doesn't really play the lesson"): the real
 * player, what the class sees, over the editor at the selected scene, playing at once. X and Esc
 * come back to the same scene. The old step 5 (?step=5) opens the editor with the player over it.
 *
 * Muted: no sound in a test session, ever.
 */
const WIZARD_URL = process.env.WIZARD_URL!;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return play.call(this); };
    if (window.AudioContext) AudioContext.prototype.resume = function () { return this.suspend(); };
  });
});

test('Play opens the player at the selected scene; Esc comes back to it', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(WIZARD_URL.replace(/([?&])step=\d+/, '$1step=4'));

  const thumbs = page.locator('[data-scene-id]');
  await expect(thumbs.nth(2)).toBeVisible({ timeout: 30_000 });
  await thumbs.nth(2).click();
  const sceneId = await thumbs.nth(2).getAttribute('data-scene-id');
  await page.locator('[data-play-lesson]').click();

  const frame = page.locator('[data-play-overlay] iframe');
  await expect(frame).toHaveAttribute('src', new RegExp(`scene_id=${sceneId}`), { timeout: 20_000 });
  await expect.poll(async () => page.frameLocator('[data-play-overlay] iframe').locator('[x-data^="lessonGame"]').evaluate((el: any) => el._x_dataStack?.[0]?._sceneIndex), { timeout: 30_000 }).toBe(2);

  await page.keyboard.press('Escape');
  await expect(page.locator('[data-play-overlay] iframe')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('scene')).toBe(sceneId);
});

test('the old Preview step opens the editor with the player over it', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(WIZARD_URL.replace(/([?&])step=\d+/, '$1step=5'));
  await expect(page.locator('[data-play-overlay]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-play-overlay] iframe')).toHaveCount(1);
  await expect(page.locator('[data-scene-id]').first()).toBeAttached();
});
