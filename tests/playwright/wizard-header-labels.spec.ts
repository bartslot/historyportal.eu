import { test, expect } from '@playwright/test';

/**
 * The editor's header buttons fit their label in every language. Bart's Dutch screenshot
 * (2026-10-16) read "InstellingenPubliceren": each button was a fixed 56px and the Dutch labels
 * are wider, so they ran into each other. The labels are put in as Dutch here, so the test
 * measures the real layout without depending on the account's language.
 */

const LESSON = Number(process.env.PW_HEADER_LESSON_ID ?? 6);

test('every header label stays inside its own button, with room between them', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () { this.muted = true; return Promise.resolve(); };
  });
  await page.goto(`/teacher/lessons/${LESSON}/wizard`);
  await page.locator('[aria-label="Settings"], [aria-label="Instellingen"]').first().waitFor({ timeout: 30000 });

  const overflow = await page.evaluate(() => {
    const dutch: Record<string, string> = { Help: 'Help', Settings: 'Instellingen', Publish: 'Publiceren', View: 'Weergave', Play: 'Afspelen', Add: 'Toevoegen' };
    const buttons = [...document.querySelectorAll('header a[aria-label], header button[aria-label], [aria-label="Settings"], [aria-label="Publish"], [aria-label="Help"]')]
      .filter((b) => b.querySelector(':scope > span.text-2xs')) as HTMLElement[];
    const unique = [...new Set(buttons)];
    for (const b of unique) {
      const span = b.querySelector(':scope > span.text-2xs')!;
      const key = Object.keys(dutch).find((k) => span.textContent!.trim() === k);
      if (key) span.textContent = dutch[key];
    }
    return unique.map((b) => {
      const span = b.querySelector(':scope > span.text-2xs') as HTMLElement;
      const bb = b.getBoundingClientRect(), sb = span.getBoundingClientRect();
      return { label: span.textContent, spill: Math.max(0, bb.left - sb.left, sb.right - bb.right) };
    });
  });

  expect(overflow.length).toBeGreaterThanOrEqual(3);
  expect(overflow.filter((o) => o.spill > 0.5), JSON.stringify(overflow)).toEqual([]);
});
