import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

// server.py keeps the two server-side jobs: the lesson crew (/crew, holds the API key) and the MP4 bake.
const API = process.env.STUDIO_API ?? 'http://127.0.0.1:8090'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // the wizard's own pure modules (keyframes, timeline maths, easing): imported, never copied
  // Babylon loads its shaders with dynamic imports; pre-bundled, those chunks fall out of step with
  // the bundle (404s, 'Unable to compile effect', the storybook look gone). Served as plain ESM, they can't.
  optimizeDeps: { exclude: ['@babylonjs/core', '@babylonjs/loaders', '@babylonjs/materials'] },
  resolve: { alias: { '@hp': fileURLToPath(new URL('../resources/js', import.meta.url)) } },
  server: {
    port: 5190,
    strictPort: true,
    // /blockout: the MCP blockout tools reach the open page through server.py (long poll, blockout_link.py)
    // (only the four channel endpoints: public/blockout/*.json are the test shots, served here)
    proxy: { '/crew': API, '/bake': API, '^/blockout/(poll|result|call|status)': { target: API, timeout: 60000, proxyTimeout: 60000 } },
    fs: { allow: ['..', '../../../../resources/css'] },
  },
})
