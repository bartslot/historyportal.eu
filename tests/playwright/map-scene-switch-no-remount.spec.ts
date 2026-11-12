import { test, expect } from '@playwright/test';

/**
 * Stepping from one MAP scene to the next must keep the live map. Every map scene draws the same
 * chart, and rebuilding it per scene refetched the chart paper, its images and every tile each click
 * (Bart, 2026-11-12: "why does it reload every time?"). The new scene goes onto the same map.
 *
 * Needs a lesson with two map scenes; MAP_WIZARD_URL points at one (global-setup), or set it, e.g.
 * MAP_WIZARD_URL=/teacher/lessons/385/wizard.
 */
const WIZARD_URL = process.env.MAP_WIZARD_URL!;

const selectScene = (page: any, id: number) => page.evaluate((sid: number) => (window as any).Livewire.all()
  .find((x: any) => x.name === 'wizard.step3-scene-configurator').$wire.selectScene(sid), id);

test('switching between map scenes keeps the same map (no re-mount)', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)));

  await page.goto(WIZARD_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!(window as any).Livewire && !!document.getElementById('step3-scenes-data'));

  const mapScenes: number[] = await page.evaluate(() => JSON.parse(document.getElementById('step3-scenes-data')?.textContent || '[]')
    .filter((s: any) => s.kind === 'map').map((s: any) => s.id));
  test.skip(mapScenes.length < 2, 'this lesson has fewer than two map scenes');

  await selectScene(page, mapScenes[0]);
  await page.waitForFunction(() => !!(window as any).__lessonMap?.isStyleLoaded?.(), null, { timeout: 30_000 });
  // Tag the live map: a rebuild would put a fresh, untagged one on window.__lessonMap.
  await page.evaluate(() => { (window as any).__lessonMap.__sceneTag = 'kept'; });

  for (const id of mapScenes.slice(1, 4)) {
    await selectScene(page, id);
    await page.waitForFunction((sid) => new URL(location.href).searchParams.get('scene') === String(sid), id, { timeout: 10_000 })
      .catch(() => { /* the URL sync is cosmetic; the map check below is the assertion */ });
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => (window as any).__lessonMap?.__sceneTag), `scene ${id} kept the same map`).toBe('kept');
  }

  expect(errors, errors.join('\n')).toHaveLength(0);
});
