// The four style-study shots (src/shots.js) as PNGs, in a real muted Chromium.
// Usage: PLAYWRIGHT=<path to a playwright install> node tools/shots.mjs <base url> <out_dir> [prefix] [shots]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [base, out, prefix = 'shot', list = '1,2,3,4'] = process.argv.slice(2);
const require = createRequire(process.env.PLAYWRIGHT ?? import.meta.url);
const { chromium } = require('playwright');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--mute-audio', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
// silent before anything runs: AudioContext stays suspended, media.play() is muted
await ctx.addInitScript(() => {
  const AC = window.AudioContext;
  if (AC) AC.prototype.resume = () => Promise.resolve();
  HTMLMediaElement.prototype.play = function () { this.muted = true; return Promise.resolve(); };
});
const page = await ctx.newPage();
page.on('console', (m) => m.type() === 'error' && console.error('page:', m.text()));
page.on('pageerror', (e) => console.error('pageerror:', e.message));
try {
  for (const n of list.split(',')) {
    await page.goto(`${base}?shot=${n}`);
    await page.waitForFunction(() => window.__intro?.shot, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    const name = await page.evaluate(() => window.__intro.shot.name);
    const file = join(out, `${prefix}${n}_${name}.png`);
    await page.screenshot({ path: file });
    console.log(file);
  }
} finally {
  await browser.close();
}
