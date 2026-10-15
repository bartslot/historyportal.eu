import { expect, test, type Page } from '@playwright/test';

// "Play lesson" on the homepage hero opens a hole in the PAGE onto the lesson's title screen, and
// the preloaded player underneath becomes the page without a navigation (resources/js/hero/portal.js).
// Driven like a visitor: real mouse / touch / keyboard, muted browser (playwright.config.ts).

const finishedHero = async (page: Page) => {
    await page.goto('/');
    // Not via Skip: it currently scrolls the page down (separate bug), which is not what a visitor sees.
    await page.waitForFunction(() => document.documentElement.classList.contains('hero-revealed'), null, { timeout: 45_000 });
    // The buttons land last in the reveal stagger; until then they cannot be pressed.
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-portal-play]')!.closest('[data-reveal-item]')!).opacity === '1');
    await page.waitForTimeout(1_000);
};

const portalState = (page: Page) => page.evaluate(() => {
    const frame = document.querySelector<HTMLIFrameElement>('.lesson-portal-frame');
    const doc = frame?.contentDocument;

    return {
        entered: document.documentElement.classList.contains('portal-entered'),
        path: location.pathname,
        titleScreen: Boolean(doc?.querySelector('[data-title-screen]')?.getClientRects().length),
        playingMedia: doc ? [...doc.querySelectorAll('audio,video')].filter((m) => !(m as HTMLMediaElement).paused).length : -1,
        focused: doc?.activeElement?.textContent?.trim() ?? '',
    };
});

const expectBackHome = async (page: Page) => {
    await page.goBack();
    await expect.poll(() => page.evaluate(() => location.pathname)).toBe('/');
    const home = await page.evaluate(() => ({
        entered: document.documentElement.classList.contains('portal-entered'),
        revealed: document.documentElement.classList.contains('hero-revealed'),
        mask: document.body.style.maskImage,
        playOpacity: getComputedStyle(document.querySelector('[data-portal-play]')!.closest('[data-reveal-item]')!).opacity,
    }));
    expect(home).toEqual({ entered: false, revealed: true, mask: '', playOpacity: '1' });
};

test.describe('hero portal into the lesson', () => {
    test.setTimeout(120_000);

    test('mouse: the page opens onto the title screen, the frame becomes the lesson, Back returns', async ({ page }) => {
        await finishedHero(page);
        const play = page.locator('[data-portal-play]');
        const href = await play.getAttribute('href');
        const box = (await play.boundingBox())!;

        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 });
        await page.mouse.down();
        await page.mouse.up();

        // Mid-way the landing page is still there, with a hole in it — not a screen on top.
        await expect.poll(() => page.evaluate(() => document.body.style.maskImage), { timeout: 8_000 })
            .toContain('radial-gradient');

        await expect.poll(() => portalState(page), { timeout: 10_000 }).toMatchObject({
            entered: true,
            path: new URL(href!).pathname,
            titleScreen: true,
            playingMedia: 0,
        });

        await expectBackHome(page);
    });

    test('keyboard: Enter on Play lesson enters and focuses Start lesson', async ({ page }) => {
        await finishedHero(page);
        await page.locator('[data-portal-play]').focus();
        await page.keyboard.press('Enter');

        await expect.poll(() => portalState(page), { timeout: 10_000 }).toMatchObject({ entered: true, titleScreen: true });
        expect((await portalState(page)).focused).not.toBe('');

        await expectBackHome(page);
    });

    test('reduced motion: an ordinary link to the lesson, no portal', async ({ browser }) => {
        const context = await browser.newContext({ reducedMotion: 'reduce' });
        const page = await context.newPage();
        await page.goto('/');
        await page.locator('[data-portal-play]').click();
        await page.waitForURL('**/lesson/**');
        expect(await page.locator('.lesson-portal-frame').count()).toBe(0);
        await context.close();
    });
});
