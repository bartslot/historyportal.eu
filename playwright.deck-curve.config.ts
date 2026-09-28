/**
 * Motion config for deck-exit-curve.spec.ts only — real GPU compositor (no SwiftShader), and its
 * own output dir so a concurrent run cannot share fixtures with the other motion lane.
 *
 *   npx playwright test --config=playwright.deck-curve.config.ts --project=motion
 */
import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  outputDir: './tests/playwright/results-deck-exit-curve',
  reporter: [['list'], ['html', { outputFolder: 'tests/playwright/report-deck-exit-curve', open: 'never' }]],
  projects: [
    {
      name: 'motion',
      testMatch: /deck-exit-curve\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: ['--mute-audio'] },
      },
    },
  ],
});
