import { test, expect, Page } from '@playwright/test';

// Editor stage (Step 3, Configure): the map block lives INSIDE the 16:9 stage and is hidden
// while the title screen is up. Regression: the map host was position:fixed, escaped the stage
// and painted the map into the black bars beside the title.
// Needs a lesson with a map scene, so it is opt-in: EDITOR_MAP_URL = a wizard URL with
// ?step=4&scene=<mapSceneId>, e.g. http://localhost:8000/teacher/lessons/<id>/wizard?step=4&scene=<id>.
const mapUrl = process.env.EDITOR_MAP_URL;
test.skip(!mapUrl, 'set EDITOR_MAP_URL to a wizard step=4 URL that opens a map scene');

interface HostState {
  display: string;
  children: number;
  matchesStage: boolean;
}

const hostState = (page: Page): Promise<HostState> =>
  page.evaluate(() => {
    const host = document.getElementById('lesson-map-preview')!;
    const stage = document.getElementById('lesson-canvas-root')!.getBoundingClientRect();
    const box = host.getBoundingClientRect();
    return {
      display: getComputedStyle(host).display,
      children: host.children.length,
      matchesStage:
        Math.abs(box.left - stage.left) < 1 && Math.abs(box.top - stage.top) < 1 &&
        Math.abs(box.width - stage.width) < 1 && Math.abs(box.height - stage.height) < 1,
    };
  });

test.describe('Editor stage letterbox', () => {
  test('map fills the 16:9 stage, and is gone once the title screen takes over', async ({ page }) => {
    await page.goto(mapUrl!, { waitUntil: 'networkidle' });

    // On the map scene: the map is mounted and its host is exactly the stage (clipped, not fixed).
    await expect.poll(() => hostState(page), { timeout: 20_000 }).toMatchObject({ display: 'block', matchesStage: true });

    // Select the title screen. The status poll re-sends the map scene for a while: the map must
    // stay down through it.
    await page.locator('[data-title-thumb]').click();
    await expect.poll(() => hostState(page), { timeout: 10_000 }).toMatchObject({ display: 'none', children: 0 });
    await page.waitForTimeout(4_000);
    await expect.poll(() => hostState(page)).toMatchObject({ display: 'none', children: 0 });
  });
});
