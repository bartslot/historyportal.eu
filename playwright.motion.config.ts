/**
 * Motion-only Playwright config.
 *
 * The default config's `motion` project is pinned to ken-burns.spec.ts (testMatch), so a new
 * motion spec would otherwise be picked up by the `chromium` project — which launches with
 * SwiftShader, and under SwiftShader compositor-driven transitions do not tick: they snap to
 * their end frame. Every assertion about MOTION would then be measuring the harness.
 *
 * This config runs the motion-quality spec on the real GPU compositor, and nothing else.
 *
 *   npx playwright test --config=playwright.motion.config.ts --project=motion
 */
import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  outputDir: './tests/playwright/results-motion-quality',
  reporter: [['list'], ['html', { outputFolder: 'tests/playwright/report-motion-quality', open: 'never' }]],
  projects: [
    {
      name: 'motion',
      testMatch: /motion-quality\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // No --use-angle=swiftshader here. Only --mute-audio, so a suite that presses play does
        // not narrate out loud on whoever's machine is running it.
        launchOptions: { args: ['--mute-audio'] },
      },
    },
  ],
});
