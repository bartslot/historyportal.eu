import { test, Page } from '@playwright/test';
import fs from 'node:fs';

/** The two surfaces the small-text scale is most visible on: the information card and the ruler. */
const PHASE = process.env.PHASE ?? 'after';
const OUT = process.env.SHOT_DIR ?? `/tmp/type-shots/${PHASE}`;
fs.mkdirSync(OUT, { recursive: true });

test.beforeEach(({}, testInfo) => testInfo.setTimeout(180_000));

const FIXTURE = {
  osm_id: 'r-shot-1',
  label: 'Roman Republic',
  summary: ('The Roman Republic was a sister republic of the First French Republic that existed '
    + 'from 1798 to 1799, proclaimed on 15 February 1798 after French troops occupied Rome. ').repeat(4),
  wikipedia_url: 'https://en.wikipedia.org/wiki/Roman_Republic_(18th_century)',
  flag_path: null, inception: -500, dissolution: 1799,
  predecessor: 'Roman Kingdom', successor: 'Roman Empire', figures: [],
};

async function sizes(page: Page, root: string) {
  return page.evaluate((sel) => {
    const scope = document.querySelector(sel) ?? document.body;
    const counts: Record<string, number> = {};
    scope.querySelectorAll<HTMLElement>('*').forEach((el) => {
      if (el.children.length || !(el.textContent ?? '').trim()) return;
      const fs = getComputedStyle(el).fontSize;
      if (parseFloat(fs) > 12.5) return;
      counts[fs] = (counts[fs] ?? 0) + 1;
    });
    return counts;
  }, root);
}

test('information card and scrubber', async ({ page }) => {
  await page.goto('/teacher/timemap');
  await page.waitForSelector('.tm-year-input', { timeout: 90_000 });
  await page.waitForTimeout(4000);

  // The ruler, on its own.
  const bar = page.locator('.tm-year-input').locator('xpath=ancestor::*[3]');
  await bar.screenshot({ path: `${OUT}/scrubber.png` }).catch(async () => {
    await page.screenshot({ path: `${OUT}/scrubber.png`, clip: { x: 0, y: 620, width: 1280, height: 100 } });
  });
  console.log('scrubber sizes:', JSON.stringify(await sizes(page, 'body')));

  // Open the card the way the card spec does — a click on a software-rendered globe may land in
  // the sea, and an empty panel is not a screenshot of the information card.
  await page.evaluate((f) => {
    window.dispatchEvent(new CustomEvent('polity-selected', { detail: f }));
  }, FIXTURE);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/timemap-card.png` });
  console.log('card sizes:', JSON.stringify(await sizes(page, 'body')));
});
