import { test, expect } from '@playwright/test';

/**
 * The editor's header is icons only (the left group joined on the PM's go, same day). Bart's Dutch screenshot (2026-10-16) read
 * "InstellingenPubliceren", and his answer was: "we don't need any text labels. just the icons is
 * enough, and if you hover it can give it in alt a description". So Help, Settings and Publish
 * carry no visible text; each says what it is in data-tooltip (on hover) and aria-label, and
 * Publish is the primary action by its form, a filled pill.
 */

const LESSON = Number(process.env.PW_HEADER_LESSON_ID ?? 6);

test('View, Play, Add, Help, Settings and Publish are icons with a hover description, Publish amber on its icon only', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () { this.muted = true; return Promise.resolve(); };
  });
  await page.goto(`/teacher/lessons/${LESSON}/wizard`);
  const publish = page.locator('[data-tour="publish"]');
  await publish.waitFor({ timeout: 30000 });

  const buttons = await page.evaluate(() => {
    const help = document.querySelector('a[href*="/help"][data-tooltip]') as HTMLElement;
    const pick = (k: string) => document.querySelector(`[data-tour="${k}"]`) as HTMLElement;
    // Publish last: the checks below read it as buttons[5].
    return [pick('view'), pick('play'), pick('add'), help, pick('settings'), pick('publish')].map((b) => b && ({
      text: b.innerText.trim(),
      tooltip: b.dataset.tooltip ?? '',
      label: b.getAttribute('aria-label') ?? '',
      title: b.hasAttribute('title'),
      background: getComputedStyle(b).backgroundColor,
    }));
  });

  expect(buttons.every(Boolean), 'all six buttons are found').toBe(true);
  for (const b of buttons) {
    expect(b.text, `${b.label} shows no text`).toBe('');
    expect(b.tooltip.length, `${b.label} has a hover description`).toBeGreaterThan(0);
    expect(b.label.length).toBeGreaterThan(0);
    expect(b.title, 'data-tooltip, never title').toBe(false);
  }
  // Bart, 2026-10-17: "let's get rid of the amber background". An icon button like its
  // neighbours; amber on the icon's stroke only, so it still reads as the primary action.
  expect(buttons[5].background, 'Publish has no fill').toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  const stroke = await page.evaluate(() => getComputedStyle(document.querySelector('[data-tour="publish"] svg')!).color);
  expect(stroke, 'its icon is amber').toMatch(/oklch\(0\.769 0\.188 70\.08\)|rgb\(245, 158, 11\)/);

  // The tooltip shows on hover, with a real pointer.
  const box = (await publish.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 });
  await page.waitForTimeout(600);
  await expect(page.locator('.lp-tip[role="tooltip"]')).toContainText(buttons[5].tooltip);
});
