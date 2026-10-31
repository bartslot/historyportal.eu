import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => ({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js', 'resources/js/argument-map.js', 'resources/js/lesson-player.js', 'resources/js/timemap/index.js', 'resources/js/lesson-map.js', 'resources/js/voyage-tour.js', 'resources/js/gallery-scene.js', 'resources/js/race-device.js'],
            refresh: true,
        }),
        tailwindcss(),
    ],
    resolve: {
        // The 2.5D stage, director and sound live in engine-mvp/src (one source for the lab and the Laravel
        // editor + player). Imported through this alias, never copied.
        alias: { '@stage25d': fileURLToPath(new URL('./engine-mvp/src', import.meta.url)) },
    },
    build: {
        // The hero "launch" animation dynamically imports three.js (~1.7 MB). Vite would emit a
        // <link rel="modulepreload"> for that chunk on every page that loads app.js — including the
        // landing page — pulling 1.7 MB nobody needs until they actually click. Disabling preload
        // keeps the dynamic import working but defers the download to on-demand.
        modulePreload: false,
        rollupOptions: {
            output: {
                // Babylon is its own chunk, reached only through the dynamic import in scene/stage25d/mount.js.
                manualChunks: (id) => {
                    // Vite's shared helpers (the dynamic-import preloader, CJS interop) would otherwise be hoisted
                    // INTO the babylon chunk, which then loads eagerly on every page that preloads anything.
                    if (id.includes('vite/preload-helper') || id.includes('vite/modulepreload-polyfill') || id.includes('commonjsHelpers')) return 'vite-helpers'
                    return id.includes('/node_modules/@babylonjs/') ? 'babylon' : undefined
                },
            },
        },
    },
    server: {
        host: '127.0.0.1',
        port: 5173,
        watch: {
            // This project's own .claude folder (the worktrees live there), anchored to the root: a
            // bare '**/.claude/**' also matched the root itself when Vite runs INSIDE a worktree
            // (.claude/worktrees/<name>/…), so no source edit there ever reached the browser.
            ignored: ['**/storage/framework/views/**', fileURLToPath(new URL('./.claude/**', import.meta.url))],
        },
        proxy: {
            // This tree's own app server (APP_URL): a worktree on another port has no :8000.
            '/fonts': loadEnv(mode, process.cwd(), '').APP_URL || 'http://127.0.0.1:8000',
        },
    },
}));
