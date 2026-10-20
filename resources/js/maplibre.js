/**
 * MapLibre, ready to build a map. Import it from here, never from 'maplibre-gl' directly.
 *
 * MapLibre 6 is ESM-only (no default export) and finds its worker next to its own module, which
 * inside a Vite bundle is a file that does not exist: every map stays blank. Vite's `?worker&url`
 * bundles the worker and hands back its URL, and it has to be set before the first Map is made.
 */
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

maplibregl.setWorkerUrl(workerUrl)

export default maplibregl
