import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// server.py keeps the two server-side jobs: the AI animator (/assist, holds the API key) and the MP4 bake.
const API = 'http://127.0.0.1:8090'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5190,
    strictPort: true,
    proxy: { '/assist': API, '/bake': API },
    fs: { allow: ['..', '../../../../resources/css'] },
  },
})
