/**
 * Motion config for the deck/scrim cohesion spec.
 *
 * The stock `motion` project is pinned by testMatch to ken-burns.spec.ts, and
 * playwright.motion.config.ts is pinned to motion-quality.spec.ts, so a new motion spec would
 * otherwise fall through to the `chromium` project — which launches under SwiftShader, where
 * compositor-driven CSS transitions do not tick. They snap to the end frame, so a fade reads as
 * an instant hide and every measurement is of the harness, not the app.
 *
 *   npx playwright test --config=playwright.deck-scrim.config.ts --project=motion
 */
import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  outputDir: './tests/playwright/results-deck-scrim',
  reporter: [['list'], ['html', { outputFolder: 'tests/playwright/report-deck-scrim', open: 'never' }]],
  projects: [
    {
      name: 'motion',
      testMatch: /deck-scrim-cohesion\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: ['--mute-audio'] },
      },
    },
  ],
});
