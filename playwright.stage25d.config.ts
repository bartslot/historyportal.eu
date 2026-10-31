/**
 * Stage 2.5D Playwright config: the Babylon stage needs WebGL (SwiftShader, headless) and no catalogue fixtures,
 * so it skips the default config's global setup. Muted twice: --mute-audio plus the spec's AudioContext stub.
 *
 *   PW_S25D_LESSON_ID=<id> PW_S25D_CODE=<code> PW_BASE_URL=http://127.0.0.1:8123 \
 *     npx playwright test --config=playwright.stage25d.config.ts
 */
import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  globalSetup: undefined,
  outputDir: './tests/playwright/results-stage25d',
  reporter: [['list']],
  projects: [
    {
      name: 'stage25d',
      testMatch: /stage25d\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Small on purpose: SwiftShader draws the look chain on the CPU, a 1080p frame takes seconds.
        viewport: { width: 800, height: 520 },
        deviceScaleFactor: 1,
        // No video/trace/screenshot capture: recording a SwiftShader canvas stalls the page.
        video: 'off',
        trace: 'off',
        screenshot: 'off',
        launchOptions: { args: ['--mute-audio', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] },
      },
    },
  ],
});
