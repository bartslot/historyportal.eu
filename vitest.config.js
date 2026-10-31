import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: { alias: { '@stage25d': fileURLToPath(new URL('./engine-mvp/src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['resources/js/**/__tests__/**/*.test.js', 'resources/js/**/*.test.js', 'scripts/**/*.test.mjs'],
  },
})
