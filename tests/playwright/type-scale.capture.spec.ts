import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';

/**
 * Capture + measure for the small-text scale collapse.
 *
 * Two jobs, deliberately in one spec so they see the same page state:
 *   1. Screenshot the dense surfaces, so a 280-site diff can be looked at rather than trusted.
 *   2. Measure whether the ~10px band's tightest containers still fit at 11px. The decision to
 *      merge 10 and 11 upward is only safe if nothing clips, and "looks fine" is not a measurement.
 *
 * PHASE=before|after picks the output directory.
 */
const PHASE = process.env.PHASE ?? 'before';
const OUT = process.env.SHOT_DIR ?? `/tmp/type-shots/${PHASE}`;
const LESSON = process.env.PW_LESSON_ID ?? '3';

fs.mkdirSync(OUT, { recursive: true });

test.beforeEach(({}, testInfo) => testInfo.setTimeout(180_000));

async function settle(page: Page, ms = 1500) {
  await page.waitForTimeout(ms);
}

/**
 * Every element whose text could clip: it has a bounded box and text inside it.
 * scrollWidth/clientWidth is the honest test — a value that overflows its w-9 readout
 * or a label that overflows its thumb reports here and nowhere else.
 */
async function overflowReport(page: Page) {
  return page.evaluate(() => {
    const out: { sel: string; text: string; sw: number; cw: number; sh: number; ch: number; fs: string }[] = [];
    document.querySelectorAll<HTMLElement>('*').forEach((el) => {
      if (el.children.length > 0) return;              // leaf text nodes only
      const t = (el.textContent ?? '').trim();
      if (!t) return;
      const cs = getComputedStyle(el);
      const fs = parseFloat(cs.fontSize);
      if (fs > 12.5) return;                            // only the small-text scale
      const overflowsX = el.scrollWidth - el.clientWidth > 1;
      const overflowsY = el.scrollHeight - el.clientHeight > 1;
      if (!overflowsX && !overflowsY) return;
      if (cs.overflow === 'auto' || cs.overflow === 'scroll') return;  // meant to scroll
      const path = el.tagName.toLowerCase() + '.' + (el.className || '').toString().slice(0, 90);
      out.push({ sel: path, text: t.slice(0, 45), sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight, fs: cs.fontSize });
    });
    return out;
  });
}

/** Histogram of every font-size actually rendered, so the merge can be proven in the browser. */
async function sizeHistogram(page: Page) {
  return page.evaluate(() => {
    const counts: Record<string, number> = {};
    document.querySelectorAll<HTMLElement>('*').forEach((el) => {
      if (el.children.length > 0) return;
      if (!(el.textContent ?? '').trim()) return;
      const fs = getComputedStyle(el).fontSize;
      if (parseFloat(fs) > 12.5) return;
      counts[fs] = (counts[fs] ?? 0) + 1;
    });
    return counts;
  });
}

async function capture(page: Page, name: string) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  const hist = await sizeHistogram(page);
  const over = await overflowReport(page);
  fs.writeFileSync(`${OUT}/${name}.json`, JSON.stringify({ hist, overflow: over }, null, 2));
  console.log(`\n=== ${name} [${PHASE}] ===`);
  console.log('sizes:', JSON.stringify(hist));
  console.log(`overflowing small-text elements: ${over.length}`);
  over.slice(0, 12).forEach((o) => console.log(`  ${o.fs} ${o.sw}/${o.cw}w ${o.sh}/${o.ch}h  "${o.text}"`));
}

test('wizard configure step — inspector, thumbs, layers', async ({ page }) => {
  await page.goto(`/teacher/lessons/${LESSON}/wizard?step=3`);
  await settle(page, 4000);
  await capture(page, 'wizard-step3-inspector');
});

test('wizard editor step — layers panel and script', async ({ page }) => {
  await page.goto(`/teacher/lessons/${LESSON}/wizard?step=4`);
  await page.waitForFunction(() => (window as any).__lessonTextLayer !== undefined, null, { timeout: 90_000 }).catch(() => {});
  await settle(page, 3000);
  await capture(page, 'wizard-step4-editor');
});

test('teacher dashboard — cards and chips', async ({ page }) => {
  await page.goto('/teacher/dashboard');
  await settle(page, 2500);
  await capture(page, 'teacher-dashboard');
});
