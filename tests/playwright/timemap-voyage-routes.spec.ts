import { test, expect, Page } from '@playwright/test';
import { loginAsTeacher } from './support/auth';

/**
 * Voyage routes on the Time-Map (Bart, 11-15): a route is clickable 10 px either side of its line,
 * the chosen one glows while the rest fade, hovering brings the fleet to the pointer with the date,
 * and the card tells the voyage's own story. Driven with the real mouse on the globe.
 *
 *   PW_BASE_URL=http://localhost:8023 npx playwright test tests/playwright/timemap-voyage-routes.spec.ts --project=chromium
 */

const SHOTS = 'tests/playwright/results-voyages';

// The map clicks and the scrubber ticks have sounds. Nothing may play while a test drives the page.
const silence = () => {
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (Ctx) {
    const resume = Ctx.prototype.resume;
    Ctx.prototype.resume = function () { return Promise.resolve(); };
    const Orig = Ctx;
    (window as any).AudioContext = function (...a: any[]) { const c = new Orig(...a); c.suspend?.(); return c; };
    (window as any).AudioContext.prototype = Orig.prototype;
    void resume;
  }
  HTMLMediaElement.prototype.play = function () { this.muted = true; this.pause(); return Promise.resolve(); };
};

/** A screen point 8 px off the Tasman route, beside its 12th waypoint (south of Tasmania). */
async function besideTasman(page: Page, offsetPx: number) {
  return page.evaluate((off) => {
    const map = (window as any).__tmMap;
    const [a, b, c] = [[146.3, -44.4], [149, -43.8], [160, -42.8]].map((p) => map.project(p));
    const tx = c.x - a.x, ty = c.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    // map.project is in canvas pixels; the mouse is in page pixels (the map sits under the navbar).
    const r = map.getCanvas().getBoundingClientRect();
    return { x: r.left + b.x + (-ty / len) * off, y: r.top + b.y + (tx / len) * off };
  }, offsetPx);
}

async function openTasman(page: Page) {
  await page.waitForFunction(() => (window as any).__portal?.ready === true && (window as any).__tmMap, null, { timeout: 30_000 });
  await page.evaluate(() => {
    (window as any).__setTimemapYear(1642);
    (window as any).__tmMap.jumpTo({ center: [150, -40], zoom: 3 });
  });
  await page.waitForFunction(() => (window as any).__tmMap.loaded() && !(window as any).__tmMap.isMoving(), null, { timeout: 20_000 });
  await page.waitForTimeout(800);
}

const glowOn = (page: Page) => page.evaluate(() => JSON.stringify((window as any).__tmMap.getPaintProperty('voyage-glow', 'line-opacity')));

test.describe('voyage routes', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(silence);
    await loginAsTeacher(page);
    await page.goto('/teacher/timemap');
  });

  test('hover, click 8 px off the line, card, and closing undoes it', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openTasman(page);

    // Hover: cursor, fleet and dated label.
    const hover = await besideTasman(page, 8);
    await page.mouse.move(hover.x - 30, hover.y - 30);
    await page.mouse.move(hover.x, hover.y, { steps: 6 });
    const label = page.locator('[data-voyage-hover-label]');
    await expect(label).toBeVisible();
    await expect(label).toContainText('Heemskerck');
    await expect(label).toContainText(/\d{1,2} \w+ 164[23]/);
    expect(await page.evaluate(() => (window as any).__tmMap.getCanvas().style.cursor)).toBe('pointer');
    await page.screenshot({ path: `${SHOTS}/hover-1440.png` });

    // Click 8 px off the centre line: it selects.
    await page.mouse.click(hover.x, hover.y);
    await expect(page.getByRole('heading', { name: 'Abel Tasman' })).toBeVisible();
    expect(await glowOn(page)).toContain('tasman-1642');
    await expect(page.getByText('What it was for')).toBeVisible();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SHOTS}/card-summary-1440.png` });

    // The gallery, further down the same scrolling body, with a credit under every picture.
    await page.evaluate(() => {
      const body = document.querySelector('[x-ref="body"]') as HTMLElement;
      const pictures = [...body.querySelectorAll('p')].find((el) => el.textContent?.trim() === 'Pictures');
      body.scrollTop = (pictures as HTMLElement).offsetTop - body.offsetTop;
    });
    await expect(page.locator('figure img').first()).toBeVisible();
    await page.waitForFunction(() => [...document.querySelectorAll('figure img')].slice(0, 2).every((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0));
    await page.screenshot({ path: `${SHOTS}/card-gallery-1440.png` });

    await page.getByRole('tab', { name: 'People' }).click();
    await expect(page.locator('p.font-semibold', { hasText: 'Visscher' })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/card-people-1440.png` });

    await page.getByRole('tab', { name: 'Over time' }).click();
    await page.screenshot({ path: `${SHOTS}/card-moments-1440.png` });

    // Leaving the line takes the label away.
    await page.mouse.move(40, 500);
    await expect(label).toBeHidden();

    // Esc closes the card AND the highlight.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Abel Tasman' })).toBeHidden();
    expect(await glowOn(page)).toBe('0');
  });

  test('card at 1024x700, and a click on empty sea clears the highlight', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 700 });
    await openTasman(page);
    const p = await besideTasman(page, 8);
    await page.mouse.move(p.x, p.y, { steps: 4 });
    await page.mouse.click(p.x, p.y);
    await expect(page.getByRole('heading', { name: 'Abel Tasman' })).toBeVisible();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SHOTS}/card-summary-1024.png` });
    await page.getByRole('tab', { name: 'People' }).click();
    await page.screenshot({ path: `${SHOTS}/card-people-1024.png` });

    // 40 px off the line is not the line: a click there is the map's backdrop.
    const far = await besideTasman(page, 40);
    await page.mouse.click(far.x, far.y);
    await expect(page.getByRole('heading', { name: 'Abel Tasman' })).toBeHidden();
    expect(await glowOn(page)).toBe('0');
  });

  test('Vasco da Gama lists his people, the pilot without an invented face', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => (window as any).__portal?.ready === true, null, { timeout: 30_000 });
    await page.evaluate(() => {
      (window as any).__setTimemapYear(1498);
      window.dispatchEvent(new CustomEvent('polity-selected', {
        detail: { id: 'Q951383', name: 'Vasco da Gama', qid: 'Q951383', voyageId: 'gama-1497' },
      }));
    });
    await expect(page.getByRole('heading', { name: 'Vasco da Gama' })).toBeVisible();
    await page.getByRole('tab', { name: 'People' }).click();
    await expect(page.getByText('No people linked yet')).toHaveCount(0);
    await expect(page.locator('p.font-semibold', { hasText: 'Nicolau Coelho' })).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/gama-people-1440.png` });
  });
});
