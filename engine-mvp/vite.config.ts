import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

// server.py keeps the two server-side jobs: the lesson crew (/crew, holds the API key) and the MP4 bake.
const API = process.env.STUDIO_API ?? 'http://127.0.0.1:8090'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // the wizard's own pure modules (keyframes, timeline maths, easing): imported, never copied
  // Babylon pre-bundled, ALL of it named up front (Gate 3, 2026-10-14): unbundled it cost 3,268 module requests per
  // page open (engine up 5.2-5.8 s headless; now 1.4-1.8 s, blockout ready 4.6 s instead of 9-12 s). The old trouble
  // (shader chunks out of step: 404s, 'Unable to compile effect') came from Vite RE-optimizing mid-session when it met
  // an import it had not pre-bundled; with every entry the studio imports listed here it never has to. The look renders
  // the same (compared on ?scene=spyglass&look=Day; no effect errors). A NEW Babylon entry point goes in this list.
  optimizeDeps: { include: ['@babylonjs/core', '@babylonjs/materials', '@babylonjs/loaders/glTF'] },
  resolve: { alias: { '@hp': fileURLToPath(new URL('../resources/js', import.meta.url)) } },
  server: {
    port: 5190,
    strictPort: true,
    // /blockout: the MCP blockout tools reach the open page through server.py (long poll, blockout_link.py)
    // (only the four channel endpoints: public/blockout/*.json are the test shots, served here)
    proxy: { '/crew': API, '/bake': API, '^/blockout/(poll|ack|result|call|status)': { target: API, timeout: 60000, proxyTimeout: 60000 } },
    fs: { allow: ['..', '../../../../resources/css'] },
  },
})
