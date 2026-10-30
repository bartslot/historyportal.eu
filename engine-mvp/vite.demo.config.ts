// Static build of play.html for the prod demo: node_modules/.bin/vite build -c vite.demo.config.ts
// Served at https://historyportal.eu/storage/studio-demo/ (all runtime URLs in play.html are relative).
import { mergeConfig } from 'vite'
import base from './vite.config'

export default mergeConfig(base, {
  base: '/storage/studio-demo/',
  build: { outDir: process.env.DEMO_OUT ?? 'dist-demo', emptyOutDir: true, rollupOptions: { input: { play: 'play.html' } } },
})
