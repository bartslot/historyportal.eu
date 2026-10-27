// Frame-exact video of the intro: seek every frame, screenshot it, then ffmpeg to H.264 (no dropped frames, unlike
// a real-time recording). Muted Chromium. Usage:
//   PLAYWRIGHT=<playwright install> node tools/render_video.mjs <url> <out.mp4> <frames_dir> [width] [height] [fps]
// The PNG frames stay in frames_dir (also handy for picking stills).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const [url, out, dir, w = '1280', h = '720', fps = '30'] = process.argv.slice(2);
const require = createRequire(process.env.PLAYWRIGHT ?? import.meta.url);
const { chromium } = require('playwright');
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({ args: ['--mute-audio', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
try {
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    const AC = window.AudioContext;
    if (AC) AC.prototype.resume = () => Promise.resolve();
    HTMLMediaElement.prototype.play = function () { this.muted = true; return Promise.resolve(); };
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__intro, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const duration = await page.evaluate(() => { window.__intro.clock.playing = false; return window.__intro.clock.duration; });
  const n = Math.round(duration * +fps);
  for (let i = 0; i <= n; i++) {
    // seek, then wait two animation frames so the render loop has drawn that time
    await page.evaluate((t) => new Promise((done) => {
      window.__intro.clock.seek(t);
      requestAnimationFrame(() => requestAnimationFrame(done));
    }), i / +fps);
    await page.screenshot({ path: join(dir, `f${String(i).padStart(5, '0')}.png`) });
    if (i % 150 === 0) console.log(`frame ${i}/${n}`);
  }
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', fps, '-i', join(dir, 'f%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', out]);
  console.log(out);
} finally {
  await browser.close();
}
