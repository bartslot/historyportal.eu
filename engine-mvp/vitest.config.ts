import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: { alias: { '@hp': fileURLToPath(new URL('../resources/js', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts'] },
})
