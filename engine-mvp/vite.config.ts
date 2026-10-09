import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

// server.py keeps the two server-side jobs: the lesson crew (/crew, holds the API key) and the MP4 bake.
const API = process.env.STUDIO_API ?? 'http://127.0.0.1:8090'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // the wizard's own pure modules (keyframes, timeline maths, easing): imported, never copied
  resolve: { alias: { '@hp': fileURLToPath(new URL('../resources/js', import.meta.url)) } },
  server: {
    port: 5190,
    strictPort: true,
    proxy: { '/crew': API, '/bake': API },
    fs: { allow: ['..', '../../../../resources/css'] },
  },
})
