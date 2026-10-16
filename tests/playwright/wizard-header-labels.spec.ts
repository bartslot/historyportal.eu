import { test, expect } from '@playwright/test';

/**
 * The editor's top-right header is icons only. Bart's Dutch screenshot (2026-10-16) read
 * "InstellingenPubliceren", and his answer was: "we don't need any text labels. just the icons is
 * enough, and if you hover it can give it in alt a description". So Help, Settings and Publish
 * carry no visible text; each says what it is in data-tooltip (on hover) and aria-label, and
 * Publish is the primary action by its form, a filled pill.
 */

const LESSON = Number(process.env.PW_HEADER_LESSON_ID ?? 6);

test('Help, Settings and Publish are icons with a hover description, Publish a filled pill', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () { this.muted = true; return Promise.resolve(); };
  });
  await page.goto(`/teacher/lessons/${LESSON}/wizard`);
  const publish = page.locator('[data-tour="publish"]');
  await publish.waitFor({ timeout: 30000 });

  const buttons = await page.evaluate(() => {
    const help = document.querySelector('a[href*="/help"][data-tooltip]') as HTMLElement;
    const settings = document.querySelector('[data-tour="settings"]') as HTMLElement;
    const publish = document.querySelector('[data-tour="publish"]') as HTMLElement;
    return [help, settings, publish].map((b) => b && ({
      text: b.innerText.trim(),
      tooltip: b.dataset.tooltip ?? '',
      label: b.getAttribute('aria-label') ?? '',
      title: b.hasAttribute('title'),
      background: getComputedStyle(b).backgroundColor,
    }));
  });

  expect(buttons.every(Boolean), 'all three buttons are found').toBe(true);
  for (const b of buttons) {
    expect(b.text, `${b.label} shows no text`).toBe('');
    expect(b.tooltip.length, `${b.label} has a hover description`).toBeGreaterThan(0);
    expect(b.label.length).toBeGreaterThan(0);
    expect(b.title, 'data-tooltip, never title').toBe(false);
  }
  expect(buttons[2].background, 'Publish is filled').not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);

  // The tooltip shows on hover, with a real pointer.
  const box = (await publish.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 });
  await page.waitForTimeout(600);
  await expect(page.locator('.lp-tip[role="tooltip"]')).toContainText(buttons[2].tooltip);
});
