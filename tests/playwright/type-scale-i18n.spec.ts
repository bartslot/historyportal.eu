import { test, expect, Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';

/**
 * The small-text scale, checked where it is most likely to break: not in English.
 *
 * Raising the ~9/10/11px bands to one 11px step makes every one of ~340 strings about 10% wider.
 * In English that was measured clean, but English is the SHORTEST interface we ship. Counted over
 * the translation files, French carries the most text (51,190 characters against English's keys,
 * to German's 50,435 and Dutch's 48,800), so a label that fits in English and clips in French is
 * exactly the regression this change could introduce and a screenshot of the English UI would miss.
 * German is checked alongside it for the opposite reason — fewer characters overall, but the
 * longest unbreakable compounds, which is what actually overflows a nowrap label.
 *
 * The scrubber gets its own test because its failure mode is different. Its century labels are
 * absolutely positioned along a ruler and set `whitespace-nowrap`, so they do not clip when they
 * grow — they collide with each other, which reads as a rendering bug rather than a type bug.
 *
 * That worry turned out to be unfounded, and the measurement is written down here because the first
 * version of this file asserted the wrong thing. Labels sit 346.6px apart at 11px, and still 244.5px
 * apart at 32px — the ruler at this zoom is nowhere near dense enough for type size to close that.
 * An "no labels overlap" assertion therefore passes at every size a human would ever set, which
 * makes it a decoration rather than a guard: forced to 20px it stayed green, and only the font-size
 * assertion caught the change. So the gap is asserted against a floor that means "the ruler's
 * density changed", not "the type grew", and the guard that actually moves with this change is the
 * computed size.
 */

const LESSON = process.env.PW_LESSON_ID ?? '3';

/** The auto-login teacher; SetLocale reads the locale off the user record, so that is what we set. */
const DEV_TEACHER = 'teacher@example.com';

function setLocale(locale: string): void {
  execFileSync('php', [
    'artisan', 'tinker', '--execute',
    `App\\Models\\User::where('email','${DEV_TEACHER}')->update(['locale' => '${locale}']);`,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
}

function readLocale(): string {
  const out = execFileSync('php', [
    'artisan', 'tinker', '--execute',
    `echo App\\Models\\User::where('email','${DEV_TEACHER}')->value('locale');`,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

  return (out.trim().split('\n').pop() ?? 'en').trim() || 'en';
}

let original = 'en';

test.beforeAll(() => { original = readLocale(); });
test.afterAll(() => { setLocale(original); });
test.beforeEach(({}, testInfo) => testInfo.setTimeout(180_000));

/**
 * Leaf text nodes in the small-text scale whose content does not fit the box drawn for it.
 *
 * Elements that are MEANT to scroll or ellipsize are excluded: `overflow: auto|scroll` because the
 * bar is the design, and `text-overflow: ellipsis` because a truncated place name is a deliberate
 * choice the type scale did not make. What is left is text that has genuinely run out of room.
 */
async function clipped(page: Page) {
  return page.evaluate(() => {
    const out: { text: string; sw: number; cw: number; sh: number; ch: number; fs: string; cls: string }[] = [];
    document.querySelectorAll<HTMLElement>('*').forEach((el) => {
      if (el.children.length > 0) return;
      const text = (el.textContent ?? '').trim();
      if (!text) return;
      const cs = getComputedStyle(el);
      if (parseFloat(cs.fontSize) > 12.5) return;
      if (cs.overflow === 'auto' || cs.overflow === 'scroll') return;
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return;
      if (cs.textOverflow === 'ellipsis') return;
      const overflowsX = el.scrollWidth - el.clientWidth > 1;
      const overflowsY = el.scrollHeight - el.clientHeight > 1;
      if (!overflowsX && !overflowsY) return;
      out.push({
        text: text.slice(0, 50), sw: el.scrollWidth, cw: el.clientWidth,
        sh: el.scrollHeight, ch: el.clientHeight, fs: cs.fontSize,
        cls: String(el.className).slice(0, 80),
      });
    });
    return out;
  });
}

for (const locale of ['fr', 'de']) {
  test(`the dense surfaces hold their text in ${locale}`, async ({ page }) => {
    setLocale(locale);

    const surfaces: [string, string][] = [
      ['wizard-step3', `/teacher/lessons/${LESSON}/wizard?step=3`],
      ['wizard-step4', `/teacher/lessons/${LESSON}/wizard?step=4`],
      ['dashboard', '/teacher/dashboard'],
    ];

    const all: string[] = [];

    for (const [name, url] of surfaces) {
      await page.goto(url);
      await page.waitForTimeout(name === 'wizard-step4' ? 5000 : 3000);

      // Prove the page really rendered in the locale under test rather than falling back to
      // English — otherwise this whole spec passes by testing English three more times.
      const html = await page.locator('html').getAttribute('lang');
      expect(html, `${name} should render in ${locale}`).toBe(locale);

      // The clipping check only examines elements at or below 12.5px, so if the token itself drifts
      // upward every element leaves its field of view and the assertion below passes vacuously.
      // Measured: forced to 20px, this spec stayed green until this line existed.
      const step = await page.evaluate(() => {
        const probe = document.createElement('span');
        probe.className = 'text-2xs';
        document.body.appendChild(probe);
        const size = getComputedStyle(probe).fontSize;
        probe.remove();

        return size;
      });
      expect(step, `${name}: text-2xs must still be the 11px step`).toBe('11px');

      const hits = await clipped(page);
      hits.forEach((h) => all.push(`${name}: "${h.text}" ${h.sw}/${h.cw}w ${h.sh}/${h.ch}h @${h.fs} [${h.cls}]`));
      await page.screenshot({ path: `/tmp/type-shots/i18n/${locale}-${name}.png` });
    }

    expect(all, `text in the small-text scale that no longer fits in ${locale}`).toEqual([]);
  });
}

/**
 * The clipping detector can actually see a clip.
 *
 * Everything above reports "0 overflowing elements", which is the same output a detector that
 * examines nothing produces. This puts a string that cannot fit into a box that cannot grow, at the
 * size under test, and requires it to be found — so a green run above means the page is clean
 * rather than the query being wrong.
 */
test('the clipping detector reports a clip it is given', async ({ page }) => {
  await page.goto('/teacher/dashboard');
  await page.waitForTimeout(2000);

  expect(await clipped(page), 'the page should start clean').toEqual([]);

  await page.evaluate(() => {
    const box = document.createElement('div');
    box.className = 'text-2xs';
    box.style.cssText = 'width:20px;height:8px;overflow:hidden;white-space:nowrap';
    box.textContent = 'a string far too long for twenty pixels';
    document.body.appendChild(box);
  });

  const found = await clipped(page);
  expect(found.length, 'the planted clip should be reported').toBe(1);
  expect(found[0].fs, 'and it should be measured at the step under test').toBe('11px');
});

test('the scrubber century labels do not collide at 11px', async ({ page }) => {
  setLocale('fr');
  await page.goto('/teacher/timemap');
  // MapLibre under SwiftShader is slow to first paint, and the ruler is built after it.
  await page.waitForSelector('.tm-year-input', { timeout: 90_000 });
  await page.waitForTimeout(4000);

  const report = await page.evaluate(() => {
    const labels = [...document.querySelectorAll<HTMLElement>('.text-scrubber-num')]
      .filter((el) => el.classList.contains('absolute'))
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { text: (el.textContent ?? '').trim(), left: r.left, right: r.right, w: r.width };
      })
      .filter((l) => l.w > 0)
      .sort((a, b) => a.left - b.left);

    let minGap = Infinity;
    for (let i = 1; i < labels.length; i++) {
      minGap = Math.min(minGap, labels[i].left - labels[i - 1].right);
    }

    const size = labels.length
      ? getComputedStyle(document.querySelector('.text-scrubber-num')!).fontSize
      : 'none';

    return { count: labels.length, size, minGap, width: labels[0]?.w ?? 0 };
  });

  console.log(`century labels: ${report.count} at ${report.size}, width ${report.width.toFixed(1)}px, min gap ${report.minGap.toFixed(1)}px`);

  // A ruler with no labels would satisfy a gap assertion trivially. Assert it drew some first.
  expect(report.count, 'the ruler should have drawn century labels').toBeGreaterThan(2);

  // This is the assertion that moves with this change, and the one that caught it when the token
  // was forced to 20px in the RED proof.
  expect(report.size, 'the scrubber year should be on the merged step').toBe('11px');

  // Not a type-size guard — a ruler-density one. 346.6px of clear air at 11px, so this fires only
  // if century ticks are ever packed an order of magnitude tighter, which is worth knowing about.
  expect(report.minGap, 'century labels are crowding on the ruler').toBeGreaterThan(24);
});
