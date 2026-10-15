/**
 * The player's deck never covers a game's own controls (PM 10-15: it hid the cargo game's
 * "Klaar" and the closing question). Every visible button and heading of the team game must sit
 * above the deck's top, at the sizes a class meets.
 *
 * Needs a lesson whose scene TEAM_GAME_SCENE is a team game (the Tasman lading as a hold), e.g.
 *   TEAM_GAME_LESSON_CODE=XXXXXX TEAM_GAME_SCENE=17 npx playwright test team-game-deck-overlap
 * Silent: the config passes --mute-audio; the stub below keeps every AudioContext suspended too.
 */
import { test, expect } from '@playwright/test';

const CODE = process.env.TEAM_GAME_LESSON_CODE;
const SCENE = process.env.TEAM_GAME_SCENE ?? '0';

const SILENT = `(() => {
  const O = window.AudioContext; if (O) O.prototype.resume = function () { return this.suspend() }
  const p = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function () { this.muted = true; return p.call(this) }
})()`;

for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 375, height: 812 }]) {
  test(`the deck covers no team-game control at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.skip(!CODE, 'set TEAM_GAME_LESSON_CODE (and TEAM_GAME_SCENE) to a lesson with a team game');
    await page.setViewportSize(viewport);
    await page.addInitScript(SILENT);
    await page.goto(`/lesson/${CODE}?scene=${SCENE}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => { try { sessionStorage.clear(); } catch (e) { /* none */ } });
    await page.locator('[data-title-rail-item]').first().click();
    await page.waitForSelector('[data-team-scrim]', { timeout: 120_000 });
    await page.waitForTimeout(1500);

    const hits = await page.evaluate(() => {
      const deck = document.querySelector('[data-player-chrome="bottom"]')?.getBoundingClientRect();
      if (!deck) return ['no deck'];
      const scrim = document.querySelector('[data-team-scrim]') as HTMLElement;
      const out: string[] = [];
      // Scroll the game through its whole height: no control may ever end up under the deck.
      for (let y = 0; y <= scrim.scrollHeight; y += Math.max(100, scrim.clientHeight / 2)) {
        scrim.scrollTop = y;
        for (const el of scrim.querySelectorAll('button, h2, h3, h4, [role=alert]')) {
          const r = el.getBoundingClientRect();
          if (r.width && r.height && r.bottom > deck.top + 1 && r.top < deck.bottom && r.right > deck.left && r.left < deck.right
            && r.top < scrim.getBoundingClientRect().bottom) out.push(`${el.tagName} "${(el.textContent || '').trim().slice(0, 30)}"`);
        }
      }
      return [...new Set(out)];
    });
    expect(hits).toEqual([]);
  });
}
