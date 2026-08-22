import { test, expect, type Page } from '@playwright/test';
import { EASE } from '../../resources/js/easing.js';

/**
 * Does the app's CSS actually run on the easing vocabulary?
 *
 * This spec started as a refutation. A motion-lane finding said the quiz card entered on
 * cubic-bezier(0.16, 1, 0.3, 1) rather than EASE.enter, and that the cost was drift — "tuning
 * EASE.enter will visibly change every other reveal and leave the quiz card behind". Measuring it
 * found something worse than the finding: NO CSS rule was on EASE.enter, so tuning it changed
 * nothing anywhere. The quiz card was not an outlier, because there was no line for it to be
 * outside of. app.css had twenty-three curves of its own.
 *
 * That is fixed. GSAP is the vocabulary now, easing.js maps the five intents onto it, and the
 * stylesheets say var(--ease-enter) instead of writing curves out. So this spec turns around: it
 * no longer measures how far apart the two halves are, it holds them together, in a real browser,
 * on the bytes actually served.
 *
 * The expected curves are IMPORTED from easing.js rather than restated here. A test that retypes
 * the values it is checking passes whenever both copies are wrong together.
 *
 * Run WITHOUT SwiftShader — under it CSS animations snap to their end frame and never report a
 * curve to the Animation domain at all:
 *
 *   npx playwright test --config=tests/playwright/quiz-card-easing-vocabulary.config.ts
 */

const CODE = process.env.MOTION_LESSON_CODE ?? 'CF0AVG';
const SCENE_QUIZ = 21;                               // "What do you already know?" in CF0AVG
const SHOT = 'tests/playwright/results-quiz-card-easing';

/** Fast start, soft landing — what "enter" means, whatever the exact control points. */
function decelerates(curve: string): boolean {
  const m = curve.match(/cubic-bezier\(([-\d.]+),\s*([-\d.]+),/);
  if (!m) return false;
  return Number(m[2]) > Number(m[1]);
}

/**
 * One spelling for one curve, whichever stylesheet it came out of.
 *
 * Whitespace is not the only difference: the dev server serves the source as written
 * ("cubic-bezier(0.333, 1, 0.667, 1)") while a production build ships it minified
 * ("cubic-bezier(.333,1,.667,1)"). Comparing the strings made every curve in a built bundle look
 * absent, and this survey once reported an app with 53 curves as having none. Compare the numbers.
 */
function normaliseCurve(curve: string): string {
  const nums = curve.slice('cubic-bezier('.length, -1).split(',').map((n) => Number(n.trim()));
  if (nums.length !== 4 || nums.some(Number.isNaN)) return curve.replace(/\s+/g, '');
  return `cubic-bezier(${nums.join(', ')})`;
}

async function recordAnimations(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const started: any[] = [];
  await cdp.send('Animation.enable');
  cdp.on('Animation.animationStarted', ({ animation }) => started.push(animation));

  return async (name: string) => {
    await expect
      .poll(() => started.some((a) => a.name === name), {
        timeout: 10_000,
        message: `no "${name}" animation was ever declared`,
      })
      .toBe(true);
    return started.find((a) => a.name === name);
  };
}

/** The curve a keyframed CSS animation actually reports, with var() already resolved by the engine. */
function keyframeCurves(animation: any): string[] {
  // `source.easing` always reports "linear" for a CSSAnimation; the real curve is per keyframe.
  return (animation.source.keyframesRule?.keyframes ?? []).map((k: any) => normaliseCurve(k.easing));
}

/**
 * Every timing function the shipped stylesheets declare, with the selector that declares it and
 * whether it rides an `animation` or a `transition`. Read from the live document rather than by
 * grepping source, so what is measured is what the browser actually loaded.
 *
 * A timing is now usually `var(--ease-enter)` rather than a curve, which is the whole point, so
 * both forms are captured and told apart by `fromVocabulary`.
 */
type Decl = { selector: string; timing: string; via: 'animation' | 'transition'; fromVocabulary: boolean };

async function readDeclaredTimings(page: Page): Promise<Decl[]> {
  // HARNESS TRAP, hit on the first run of this spec: in dev, Vite serves the stylesheet from
  // port 5173 while the page is on 8000, so every sheet is cross-origin and `sheet.cssRules`
  // throws — the survey silently reported zero curves in a bundle that has 53. So collect the
  // sheet URLs from the page, then fetch the text and parse it. Same bytes the browser loaded.
  const sources = await page.evaluate(() =>
    [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => (l as HTMLLinkElement).href)
      .concat([...document.querySelectorAll('style')].map((s) => 'inline:' + s.textContent)),
  );

  let css = '';
  for (const src of sources) {
    if (src.startsWith('inline:')) { css += src.slice(7) + '\n'; continue; }
    const res = await page.request.get(src);
    if (res.ok()) css += (await res.text()) + '\n';
  }

  const out: Decl[] = [];
  // Walk `<selector> { <body> }` blocks. Nested at-rules (@layer/@media) leave their body as the
  // next block's prefix, which only ever makes the selector label noisier, never the count wrong.
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim().split('\n').pop()!.trim();
    const body = m[2];
    for (const line of body.split(';')) {
      const via = /animation/.test(line) ? 'animation' : /transition/.test(line) ? 'transition' : null;
      if (!via) continue;
      for (const c of line.matchAll(/cubic-bezier\([^)]*\)/g)) {
        out.push({ selector, timing: normaliseCurve(c[0]), via, fromVocabulary: false });
      }
      for (const v of line.matchAll(/var\(--ease-[a-z-]+\)/g)) {
        out.push({ selector, timing: v[0].replace(/\s+/g, ''), via, fromVocabulary: true });
      }
    }
  }
  return out;
}

test.describe('The easing vocabulary reaches the CSS', () => {

  test('a student sees the quiz card rise and fade in, decelerating', async ({ page }) => {
    const awaitAnimation = await recordAnimations(page);

    await page.goto(`/lesson/${CODE}?scene=${SCENE_QUIZ}`);
    await page.getByRole('button', { name: /start lesson/i }).click();

    const card = page.locator('.qz-card');
    await expect(card).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: `${SHOT}/quiz-card-student-view.png` });

    const curves = keyframeCurves(await awaitAnimation('qz-slide-in'));

    expect(curves.length, 'the entrance has no keyframes').toBeGreaterThan(1);
    expect(new Set(curves).size, 'the entrance mixes curves between keyframes').toBe(1);
    expect(
      decelerates(curves[0]),
      `the quiz card arrives on "${curves[0]}", which does not decelerate to rest`,
    ).toBe(true);

    // And specifically: it arrives on the app's `enter`, not on a curve of its own. This is the
    // assertion the whole finding was about, and it used to be false.
    expect(
      curves[0],
      `the quiz card is on "${curves[0]}" — the app enters on "${EASE.enter}"`,
    ).toBe(normaliseCurve(EASE.enter));
  });

  test('tuning an intent moves the app — the CSS is on the vocabulary, not on copies', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    const declared = await readDeclaredTimings(page);
    expect(declared.length, 'no timings were readable from the stylesheet').toBeGreaterThan(10);

    const tally = new Map<string, number>();
    for (const d of declared) tally.set(d.timing, (tally.get(d.timing) ?? 0) + 1);
    console.log(
      '[declared CSS timings]\n' +
      [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `  ${String(n).padStart(3)}  ${c}`).join('\n'),
    );

    // Most of the app's motion now derives its curve from the vocabulary. Retuning --ease-enter
    // repaints all of these at once; before, it repainted nothing.
    const onVocabulary = declared.filter((d) => d.fromVocabulary);
    expect(
      onVocabulary.length,
      'no CSS rule derives its timing from the easing vocabulary',
    ).toBeGreaterThan(10);

    // The only hand-written curves left should be Tailwind arbitrary-value utilities —
    // `.ease-[cubic-bezier(...)]`, control points typed into a class name in a blade. Those are
    // the next thing to collapse, but they are markup, not this stylesheet.
    const bespoke = declared.filter((d) => !d.fromVocabulary && !/\.ease-/.test(d.selector));
    expect(
      bespoke.map((d) => `${d.selector} → ${d.timing}`),
      'a stylesheet rule writes its own curve instead of naming an intent',
    ).toEqual([]);
  });

  test('the site header entrance really runs on that curve in a real browser', async ({ page }) => {
    // Not just declared — observed. The header rise is the closest analogue to the quiz card:
    // an element entering the page, in CSS, with a translate + fade.
    const awaitAnimation = await recordAnimations(page);
    await page.goto('/');

    const curves = keyframeCurves(await awaitAnimation('site-header-rise'));
    await page.screenshot({ path: `${SHOT}/site-header-entrance.png` });

    console.log(`[site header] on ${curves[0]}`);
    expect(
      curves[0],
      `the header entrance is on "${curves[0]}", not the app's enter`,
    ).toBe(normaliseCurve(EASE.enter));
  });
});
