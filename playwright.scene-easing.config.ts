/**
 * scene-transition-easing.spec.ts only, on the real GPU compositor.
 *
 * The default config's `chromium` project launches with --use-angle=swiftshader, under which
 * compositor-driven transitions snap to their end frame instead of ticking. This spec samples
 * a crossfade's opacity, so it must not run there — and the `motion` project in the base config
 * is pinned to ken-burns.spec.ts.
 *
 *   npx playwright test --config=playwright.scene-easing.config.ts --project=motion
 */
import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  outputDir: './tests/playwright/results-scene-easing',
  reporter: [['list'], ['html', { outputFolder: 'tests/playwright/report-scene-easing', open: 'never' }]],
  workers: 1,          // the three tests edit ONE scene's transition in turn
  // Each test drives the wizard AND the player, and the wizard rail can swallow a click while
  // Livewire re-morphs it, so opening a scene is retried. 60s is not enough headroom for that.
  timeout: 180_000,
  // The wizard rail occasionally swallows the first selection click under load; one retry
  // keeps a harness hiccup from reading as a product failure.
  retries: 1,
  projects: [
    {
      name: 'motion',
      testMatch: /scene-transition-easing\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: ['--mute-audio'] },
      },
    },
  ],
});
