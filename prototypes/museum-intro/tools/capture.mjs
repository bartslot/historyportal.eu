// Frame strip + real-time video of the intro in a real (muted) Chromium.
// Usage: node tools/capture.mjs <url> <out_dir> [width] [height] [times...|video]
//   times: comma list of seconds, default 10 frames across the timeline
// Playwright is not a dependency of this package; PLAYWRIGHT points at an install (the app repo has one).
import { createRequire } from 'node:module';
import { mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const [url, out, w = '1280', h = '720', mode = ''] = process.argv.slice(2);
const require = createRequire(process.env.PLAYWRIGHT ?? import.meta.url);
const { chromium } = require('playwright');
mkdirSync(out, { recursive: true });

const width = +w;
const height = +h;
const isVideo = mode === 'video';
const browser = await chromium.launch({ args: ['--mute-audio', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: 1,
  ...(isVideo ? { recordVideo: { dir: out, size: { width, height } } } : {}),
});
// silent before anything runs: AudioContext stays suspended, media.play() is muted
await ctx.addInitScript(() => {
  const AC = window.AudioContext;
  if (AC) AC.prototype.resume = () => Promise.resolve();
  HTMLMediaElement.prototype.play = function () { this.muted = true; return Promise.resolve(); };
});
const page = await ctx.newPage();
page.on('console', (m) => m.type() === 'error' && console.error('page:', m.text()));
await page.goto(url);
await page.waitForFunction(() => window.__intro, null, { timeout: 60000 });

if (isVideo) {
  await page.evaluate(() => window.__intro.clock.seek(0));
  const duration = await page.evaluate(() => window.__intro.clock.duration);
  await page.waitForTimeout((duration + 1) * 1000);
  const v = page.video();
  await ctx.close();
  renameSync(await v.path(), join(out, `intro_${width}x${height}.webm`));
} else {
  const times = mode ? mode.split(',').map(Number) : Array.from({ length: 10 }, (_, i) => +(1.5 + i * 3.5).toFixed(2));
  await page.evaluate(() => (window.__intro.clock.playing = false));
  for (const t of times) {
    await page.evaluate((tt) => window.__intro.clock.seek(tt), t);
    await page.waitForTimeout(350);
    const name = `frame_${String(t.toFixed(1)).padStart(4, '0')}s_${width}x${height}.png`;
    await page.screenshot({ path: join(out, name) });
    console.log(name);
  }
  await ctx.close();
}
await browser.close();
