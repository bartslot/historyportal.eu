import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

/**
 * The title screen never lets two of its pieces overlap, at any of the sizes a class meets:
 * the top row, the expect lines, the meta row, Start, the language switch, the badges, the QR
 * plate, and the poster's drawn letters and faces (poster.json keep_clear). Measured from the
 * render, every candidate × every size, teacher and student view.
 *
 * It switches the lesson's title_style, so it runs only against a THROWAWAY copy:
 *   TITLE_LESSON_CODE=POLSH1 PW_BASE_URL=http://127.0.0.1:8080 npx playwright test title-screen-layout --project=chromium --workers=1
 * TITLE_PROOF_DIR=<dir> also saves a screenshot and the measurements of every case there.
 */
const CODE = process.env.TITLE_LESSON_CODE;
const PROOF = process.env.TITLE_PROOF_DIR;
const CANDIDATES = (process.env.TITLE_CANDIDATES ?? 'poster,cover,banner,logo,plain').split(',');
const VIEWS = (process.env.TITLE_VIEWS ?? 'teacher,student').split(',');
// The class screens: laptops, the two common projectors (1024x768, 1280x720), small windows, a phone.
const SIZES: Array<[number, number]> = [[1440, 900], [1280, 800], [1280, 720], [1024, 768], [1024, 600], [960, 600], [800, 560], [375, 812]];
const EXPECT = ['Hoe was het aan boord van een ontdekkingsreis?', 'Wie woonden er al, waar Tasman aankwam?', 'De gevaren en de gevolgen'];

// The tests make no sound: AudioContext stays suspended and every media element plays muted.
const SILENCE = `(() => {
  const AC = window.AudioContext || window.webkitAudioContext
  if (AC) {
    const Stub = function (...a) { const c = new AC(...a); try { c.suspend() } catch (_) {} c.resume = () => Promise.resolve(); return c }
    Stub.prototype = AC.prototype
    window.AudioContext = Stub; window.webkitAudioContext = Stub
  }
  const play = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return play.call(this) }
})()`;

function setLesson (attrs: Record<string, unknown>) {
  const json = JSON.stringify(attrs).replace(/'/g, "\\'");
  execFileSync('php', ['artisan', 'tinker', '--execute',
    `App\\Models\\Lesson::where('lesson_code','${CODE}')->firstOrFail()->update(json_decode('${json}', true));`]);
}

type Box = { name: string; x: number; y: number; w: number; h: number };

/** Every piece of the title screen, the keep_clear boxes, and the pairs that overlap. */
async function measure (page: Page) {
  return page.evaluate(() => {
    const host = document.querySelector('[data-title-screen]') as HTMLElement;
    const o = host.getBoundingClientRect();
    const rel = (r: DOMRect, name: string) => ({ name, x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height });
    const label = (el: Element) => ((el as HTMLElement).dataset.titleExpect ?? (el as HTMLElement).dataset.type ?? el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 28) || el.tagName;
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && r.right > 0 && r.bottom > 0;
    };
    const pieces: Box[] = [];
    const add = (el: Element, name = label(el)) => { if (visible(el)) pieces.push(rel(el.getBoundingClientRect(), name)); };

    document.querySelectorAll('[data-player-chrome="top"] [data-title-avoid]').forEach(el => add(el, 'top row'));
    // The strip itself is a background band; its lines are what may not be covered.
    host.querySelectorAll('[data-title-expect="strip"] li').forEach(el => add(el, `strip: ${label(el)}`));
    host.querySelectorAll('[data-title-avoid]').forEach(el => {
      if ((el as HTMLElement).dataset.titleExpect === 'strip' || el.closest('[data-title-qr]')) return;
      if ((el as HTMLElement).dataset.titleAvoid === 'children') [...el.children].forEach(c => add(c));
      else add(el, el.closest('[data-poster-stage]') ? 'poster subtitle' : label(el));
    });
    const qr = host.querySelector('[data-title-qr]');
    if (qr) add(qr, 'qr');

    const r = (window as any).__titleQr ?? {};
    const keep = (r.keepClear ?? []).filter((k: any) => k.kind === 'face' || k.kind === 'letters')
      .map((k: any) => ({ name: k.kind, ...k.rect }));
    const hit = (a: Box, b: Box) => a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1;
    const overlaps: string[] = [];
    pieces.forEach((a, i) => {
      pieces.slice(i + 1).forEach(b => { if (hit(a, b)) overlaps.push(`${a.name} × ${b.name}`); });
      // The subtitle is lettered on the poster's own ribbon: it may sit on the letters, never on a face.
      keep.forEach((k: Box) => { if (hit(a, k) && !(a.name === 'poster subtitle' && k.name === 'letters')) overlaps.push(`${a.name} × ${k.name}`); });
    });
    const offscreen = pieces.filter(p => p.x < -1 || p.y < -1 || p.x + p.w > o.width + 1 || p.y + p.h > o.height + 1).map(p => p.name);

    return { pieces, keep, overlaps, offscreen, scrollW: document.documentElement.scrollWidth, viewW: innerWidth, qrSpot: (qr as HTMLElement | null)?.dataset.spot ?? null, qrSize: r.size ?? null, fit: r.fit ?? null };
  });
}

test.describe('title screen layout', () => {
  test.skip(!CODE, 'set TITLE_LESSON_CODE to a throwaway lesson copy');
  // One worker: every candidate rewrites the same lesson's title_style.
  test.describe.configure({ mode: 'default' });
  test.afterAll(() => { if (CODE) setLesson({ title_style: null, qr_position: null, show_qr: true }); });

  for (const candidate of CANDIDATES) {
    test(`${candidate}: no piece overlaps another, a face or the letters`, async ({ browser }) => {
      test.setTimeout(900_000);
      setLesson({ title_style: candidate, expect: EXPECT, qr_position: null, show_qr: true });
      const failures: string[] = [];
      for (const view of VIEWS) {
        for (const [w, h] of SIZES) {
          const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
          await ctx.addInitScript(SILENCE);
          const page = await ctx.newPage();
          await page.goto(`/lesson/${CODE}?qr_debug=1${view === 'student' ? '&title_preview=1' : ''}`, { waitUntil: 'load' });
          // Settled: the newest layout run has finished, and nothing started another for 2s
          // (the letters' entrance, the fonts, the QR, the picture each lay the screen out again).
          const settled = () => page.waitForFunction(() => {
            const r = (window as any).__titleQr;
            return r && r.run === r.latest();
          }, null, { timeout: 30_000 });
          const runNow = () => page.evaluate(() => (window as any).__titleQr.run);
          for (let i = 0, before = -1; i < 6; i++) {
            await settled();
            const run = await runNow();
            if (run === before) break;
            before = run;
            await page.waitForTimeout(2000);
          }
          if (PROOF) fs.mkdirSync(PROOF, { recursive: true });
          const log = await page.evaluate(() => (window as any).__titleFitLog ?? []);
          const m = await measure(page);
          const name = `${candidate}-${view}-${w}x${h}`;
          if (PROOF) {
            fs.mkdirSync(PROOF, { recursive: true });
            await page.screenshot({ path: `${PROOF}/${name}-debug.png` });
            await page.evaluate(() => document.querySelector('[data-qr-debug]')?.remove());
            await page.screenshot({ path: `${PROOF}/${name}.png` });
            const file = `${PROOF}/measurements.json`;
            const all = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
            all[name] = { ...m, log };
            fs.writeFileSync(file, JSON.stringify(all, null, 1) + '\n');
          }
          await ctx.close();
          if (m.overlaps.length) failures.push(`${name}: ${m.overlaps.join(', ')}`);
          if (m.offscreen.length) failures.push(`${name}: off screen ${m.offscreen.join(', ')}`);
          if (m.scrollW > m.viewW) failures.push(`${name}: horizontal scroll`);
        }
      }
      expect(failures, failures.join('\n')).toEqual([]);
    });
  }
});
