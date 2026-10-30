import { test, expect, Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * The editor's Spotify shell: black between and around the panels, dark grey panel surfaces, and
 * ONE resize handle for every gap. Each gap shows its 1px line on hover (and while dragging) and
 * nowhere else, and the panel text keeps AA contrast on the panel surface.
 *
 * Every gesture is page.mouse walked in over several moves: hover needs a real pointer.
 */

const LESSON = Number(process.env.PW_SHELL_LESSON_ID ?? 65);
const URL = `/teacher/lessons/${LESSON}/wizard`;
const SHOTS = process.env.PW_SHELL_SHOTS ?? '/private/tmp/claude-501/editor-shell-shots';
const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1024x700', width: 1024, height: 700 },
];
const PANEL_BG = [20, 22, 27];   // --color-panel #14161b (rgb)
const LINE_ON = 'rgb(126, 139, 156)';   // --color-panel-label #7e8b9c
const HANDLES = [
  { key: 'rail', selector: '#rail-resize', cursor: 'col-resize' },
  { key: 'inspector', selector: '#inspector-resize', cursor: 'col-resize' },
  { key: 'dock', selector: '[data-dock-resize]', cursor: 'row-resize' },
];

async function open(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto(URL);
  await page.waitForLoadState('domcontentloaded');
  await page.locator('#rail-resize').waitFor({ state: 'attached', timeout: 30000 });
  await page.locator('[data-dock-resize]').waitFor({ state: 'attached', timeout: 30000 });
  await page.waitForTimeout(1500);
}

async function centre(page: Page, selector: string) {
  const box = (await page.locator(selector).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function lineColour(page: Page, selector: string) {
  return page.locator(`${selector} > .lp-resize-line`).evaluate((el) => getComputedStyle(el).backgroundColor);
}

async function cursorOf(page: Page, selector: string) {
  return page.locator(selector).evaluate((el) => getComputedStyle(el).cursor);
}

/**
 * Text in the four panels that falls below AA (4.5:1) at 12px and up. Colours go through a canvas,
 * so oklch() and oklab() values convert correctly. The background is the nearest opaque ancestor
 * inside the panel (a button or tile has its own), else the panel surface.
 */
async function lowContrastText(page: Page) {
  return page.evaluate((panelRgb) => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
    const toRgba = (colour: string): number[] => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = colour;
      ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data).map((v, i) => (i === 3 ? v / 255 : v));
    };
    const over = (top: number[], below: number[]) =>
      [0, 1, 2].map((i) => top[i] * top[3] + below[i] * (1 - top[3]));
    const luminance = (rgb: number[]) => {
      const [r, g, b] = rgb.map((c) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const backdropOf = (el: Element, panel: Element): number[] => {
      for (let node: Element | null = el; node && node !== panel.parentElement; node = node.parentElement) {
        const bg = toRgba(getComputedStyle(node).backgroundColor);
        if (bg[3] > 0.99) return bg;
        if (bg[3] > 0) return over(bg, panelRgb.concat(1));
      }
      return panelRgb.concat(1);
    };
    const failures: string[] = [];
    for (const surface of Array.from(document.querySelectorAll('.lp-panel-surface'))) {
      const panel = surface.parentElement;
      if (!panel) continue;
      const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (!node.textContent?.trim()) continue;
        const el = node.parentElement!;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        if (parseFloat(style.fontSize) < 12) continue;
        const backdrop = backdropOf(el, panel);
        const fg = toRgba(style.color);
        const textOpacity = parseFloat(style.opacity);
        const ink = over([fg[0], fg[1], fg[2], fg[3] * textOpacity], backdrop);
        const lumA = luminance(ink);
        const lumB = luminance(backdrop);
        const ratio = (Math.max(lumA, lumB) + 0.05) / (Math.min(lumA, lumB) + 0.05);
        if (ratio < 4.5) failures.push(`${ratio.toFixed(2)} ${style.fontSize} "${node.textContent.trim().slice(0, 40)}"`);
      }
    }
    return failures;
  }, PANEL_BG);
}

/** How far a panel host reaches past its surface: half of --editor-gap. Everything in that ring is shell. */
const RING = 4;

/**
 * Every pixel in the RING round each visible panel surface, outside the surface itself, must be
 * pure black. The screenshot is decoded in the page, so the test reads the real rendered pixels, not
 * the computed styles. Sampled every 2px. A channel above 2 counts as a leak.
 */
async function ringLeaks(page: Page) {
  await page.mouse.move(5, 5, { steps: 2 });   // no gap line lit while sampling
  // The object list is hidden by default; show it so its gaps are sampled as well.
  await page.evaluate(() => { (window as any).Alpine.store('view').objects = true; });
  await page.waitForTimeout(400);
  const rects = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.lp-panel-surface'))
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => ({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom })));
  // The top toolbar's band is chrome: its controls may sit over a ring. Its own background is checked
  // separately, in the shell test.
  const toolbarBottom = await page.locator('[data-editor-toolbar]').evaluate((el) => el.getBoundingClientRect().bottom);
  const png = (await page.screenshot({ type: 'png' })).toString('base64');
  return page.evaluate(async ({ png, rects, ring, toolbarBottom }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${png}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
    const scale = img.width / window.innerWidth;
    const leaks: string[] = [];
    let sampled = 0;
    for (const r of rects) {
      const top = Math.max(0, Math.floor(r.y0 - ring));
      const bottom = Math.min(window.innerHeight, Math.ceil(r.y1 + ring));
      const left = Math.max(0, Math.floor(r.x0 - ring));
      const right = Math.min(window.innerWidth, Math.ceil(r.x1 + ring));
      for (let y = Math.max(top, Math.ceil(toolbarBottom)); y < bottom; y += 2) {
        for (let x = left; x < right; x += 2) {
          if (rects.some((q) => x >= q.x0 && x < q.x1 && y >= q.y0 && y < q.y1)) continue;   // a surface
          sampled++;
          const i = (Math.floor(y * scale) * img.width + Math.floor(x * scale)) * 4;
          if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 2 && leaks.length < 10) {
            leaks.push(`(${x},${y}) rgb(${pixels[i]}, ${pixels[i + 1]}, ${pixels[i + 2]})`);
          }
        }
      }
    }
    return { sampled, leaks };
  }, { png, rects, ring: RING, toolbarBottom }).finally(() =>
    page.evaluate(() => { (window as any).Alpine.store('view').objects = false; }));
}

for (const viewport of VIEWPORTS) {
  test.describe(`editor shell at ${viewport.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await open(page, viewport);
    });

    test('the gaps show no line at rest', async ({ page }) => {
      for (const handle of HANDLES) {
        expect(await lineColour(page, handle.selector), handle.key).toBe('rgba(0, 0, 0, 0)');
      }
    });

    test('hovering a gap shows its line and the right cursor', async ({ page }) => {
      mkdirSync(SHOTS, { recursive: true });
      for (const handle of HANDLES) {
        const p = await centre(page, handle.selector);
        await page.mouse.move(p.x, p.y, { steps: 8 });
        await expect.poll(() => lineColour(page, handle.selector), handle.key).toBe(LINE_ON);
        expect(await cursorOf(page, handle.selector), handle.key).toBe(handle.cursor);
        await page.screenshot({ path: `${SHOTS}/${viewport.name}-hover-${handle.key}.png` });
        await page.mouse.move(5, 5, { steps: 4 });
        await expect.poll(() => lineColour(page, handle.selector), handle.key).toBe('rgba(0, 0, 0, 0)');
      }
    });

    test('dragging resizes the panel and keeps the line lit', async ({ page }) => {
      const rail = await centre(page, '#rail-resize');
      const railBefore = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rail-w')));
      await page.mouse.move(rail.x, rail.y, { steps: 6 });
      await page.mouse.down();
      await page.mouse.move(rail.x + 40, rail.y, { steps: 10 });
      await expect.poll(() => lineColour(page, '#rail-resize')).toBe(LINE_ON);
      await page.screenshot({ path: `${SHOTS}/${viewport.name}-dragging-rail.png` });
      await page.mouse.up();
      const railAfter = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rail-w')));
      expect(railAfter - railBefore).toBeGreaterThan(30);

      const insp = await centre(page, '#inspector-resize');
      const inspBefore = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--inspector-w')) || 0);
      await page.mouse.move(insp.x, insp.y, { steps: 6 });
      await page.mouse.down();
      await page.mouse.move(insp.x - 40, insp.y, { steps: 10 });
      await page.mouse.up();
      const inspAfter = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--inspector-w')) || 0);
      expect(inspAfter - inspBefore).toBeGreaterThan(30);

      const dock = await centre(page, '[data-dock-resize]');
      const dockBefore = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--work-bottom'));
      await page.mouse.move(dock.x, dock.y, { steps: 6 });
      await page.mouse.down();
      await page.mouse.move(dock.x, dock.y - 40, { steps: 10 });
      await page.mouse.up();
      const dockAfter = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--work-bottom'));
      expect(parseFloat(dockAfter) - parseFloat(dockBefore)).toBeGreaterThan(30);
    });

    test('panel text keeps AA contrast on the panel surface', async ({ page }) => {
      expect(await lowContrastText(page)).toEqual([]);
    });

    test('everything outside a panel surface is pure black', async ({ page }) => {
      const { sampled, leaks } = await ringLeaks(page);
      expect(sampled, 'the ring was sampled').toBeGreaterThan(1000);
      expect(leaks).toEqual([]);
    });

    test('the shell is black and the panels are inset from it', async ({ page }) => {
      const shell = await page.evaluate(() => getComputedStyle(document.elementFromPoint(2, 400)!).backgroundColor);
      const toolbar = await page.locator('[data-editor-toolbar]').evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(toolbar).toBe('rgb(0, 0, 0)');
      await page.screenshot({ path: `${SHOTS}/${viewport.name}-after-rest.png` });
      expect(shell).toMatch(/rgb\(0, 0, 0\)|rgba\(0, 0, 0, 0\)/);
    });
  });
}
