import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js', 'resources/js/argument-map.js', 'resources/js/lesson-player.js', 'resources/js/timemap/index.js', 'resources/js/lesson-map.js', 'resources/js/voyage-tour.js', 'resources/js/gallery-scene.js'],
            refresh: true,
        }),
        tailwindcss(),
    ],
    build: {
        // The hero "launch" animation dynamically imports three.js (~1.7 MB). Vite would emit a
        // <link rel="modulepreload"> for that chunk on every page that loads app.js — including the
        // landing page — pulling 1.7 MB nobody needs until they actually click. Disabling preload
        // keeps the dynamic import working but defers the download to on-demand.
        modulePreload: false,
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
            '/fonts': 'http://127.0.0.1:8000',
        },
    },
});
