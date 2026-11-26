import { defineConfig } from 'vite'
import { resolve } from 'node:path'

/** Standalone server for the Babylon atmosphere proof page (resources/js/timemap/__babylon__). */
export default defineConfig({
  root: resolve(import.meta.dirname, 'resources/js/timemap/__babylon__'),
  publicDir: resolve(import.meta.dirname, 'public'),
  server: { port: 5197, strictPort: true },
})
