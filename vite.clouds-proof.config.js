import { defineConfig } from 'vite'
import { resolve } from 'node:path'

/** Standalone server for the volumetric cloud proof page (resources/js/timemap/__clouds__). */
export default defineConfig({
  root: resolve(import.meta.dirname, 'resources/js/timemap/__clouds__'),
  publicDir: resolve(import.meta.dirname, 'public'),
  server: { port: 5197, strictPort: true },
})
