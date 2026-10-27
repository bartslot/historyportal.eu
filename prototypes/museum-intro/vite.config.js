import { defineConfig } from 'vite';

// its own package: nothing here touches the Laravel app's Vite build
export default defineConfig({ base: './', build: { chunkSizeWarningLimit: 800 } });
