/**
 * map-chart.js — the lesson map's one ground: a hand-painted watercolour sea chart.
 *
 * Bart, 2026-10-18, pointing at a painted chart of Australia, Tasmania and New Zealand: "when do we
 * see better map styles?" / "like this" / "but without the ships". And 2026-10-24: "1 style of map,
 * map is just map, you can add media". So every lesson map and voyage sails on this, and nothing
 * else: no satellite photo, no 3D relief, no sun, no clouds, no day and night.
 *
 * What it is made of, and why (plan + six scored rounds: Memory/historyportal/topics/chart-style):
 *
 *   sea     one calm painted turquoise, never blotched: "please don't trouble the water with all
 *           these splashes of watercolour"
 *   glaze   pale against every coast and deeper with distance from land, the way the reference is
 *           painted (real bathymetry read as hard patches). Raster tiles baked by
 *           scripts/build-chart-data.py: one thin glaze per distance band, the first stronger so the
 *           shallows read as a band with a soft wet edge.
 *   land    painted cream with faint ochre drift, a warm pooled edge just inside the coast
 *   coast   one ink line, and a dashed line a fixed few pixels offshore (constant at every zoom)
 *   ridges  ChatGPT-drawn History Lines ridges: never overlapping, never near the shore (each one's
 *           size is capped by its own distance to the coast), absent zoomed out ("they never really
 *           work zoomed out that much")
 *   tufts   olive foothills around the ranges, never on a ridge
 *   waves   ink strokes on open water, thinned by rank so the density on screen holds
 *   paper   a faint multiplied grain over everything
 *
 * Every number lives in CHART and is owned by the dev tuner (Test tools → Settings → Map → Chart):
 * applyChartPaint is the only writer of these paint properties, and it reads the live config.
 */

/** Painted assets and baked tiles, all under public/map-chart. */
export const CHART_BASE = '/map-chart'
export const RIDGE_GLYPHS = 12
export const TUFT_GLYPHS = 16
export const WAVE_GLYPHS = 4

/** The look. Defaults are what shipped; the tuner edits a copy, never this object. */
export const CHART = Object.freeze({
  seaColor: '#bfe6e2',         // shows only where a texture has not arrived yet
  glazeOpacity: 1,             // multiplier over the baked depth glaze
  landEdgeColor: '#ead0a0',
  landEdgeOpacity: 0.3,
  inkColor: '#4e3a2a',         // the lab's dark sepia, a shade warmer; continent views draw it thin (see coastWidth)
  coastWidth: 1.9,             // px at z5; scales with zoom
  dashOffset: 6,               // px at z5; positive = right of travel = the sea (coast rings run land-on-the-left)
  dashOpacity: 0.9,
  ridgeMinZoom: 3.6,
  ridgeScale: 1.4,             // glyph size at z4 before the distance-to-coast cap
  ridgeWash: 0.8,              // ridge opacity: the ink stays, a touch quieter
  tuftOpacity: 0.55,
  waveOpacity: 0.8,
  waveScale: 1.5,
  seaWash: 0.6,                // painted sea washes over the base sea (Bart 10-26: "lots of watercolour textures")
  seaGrain: 0.14,              // the paint's granulation over the water, at screen scale (the baked glaze is too soft for it)
  shoreBleed: 0.7,            // pigment pooled along the shore, water side
  landWash: 0.85,              // painted land washes over the base land
  paperOpacity: 0.35,          // the paper's grain over everything (0.06 was invisible)
})

// A glyph's half-width is ~45 css px at size 1. At z4 near 40°S that is 337 km; its tapered foothills
// let the box overhang ~1.7x, so the cap is fit / 200 km at z4, and every km figure halves per zoom.
const CAP_KM_Z4 = 200
const DASH_MIN_KM2 = 1200
const kmAt = (km, z) => km * 2 ** (4 - z)

/** Sources the chart needs on top of the lesson map's own land tiles and coastline. */
export function chartSources (origin = '') {
  const raster = (name) => ({ type: 'raster', tiles: [`${origin}${CHART_BASE}/${name}/{z}/{x}/{y}.webp`], tileSize: 256, maxzoom: 4 })
  const tiles = (name) => ({ type: 'vector', tiles: [`${origin}${CHART_BASE}/${name}/{z}/{x}/{y}.pbf`], minzoom: name === 'waves' ? 0 : 3, maxzoom: 5 })
  return {
    // Land, lakes and coast come from ONE set of drawn rings (scripts/build-chart-data.py), so the fill
    // and the ink always agree, and an islet leaves the map whole (fill and outline) as you zoom out.
    'chart-land': { type: 'geojson', data: `${origin}${CHART_BASE}/land.geojson`, tolerance: GEOJSON_TOLERANCE },
    'chart-lakes': { type: 'geojson', data: `${origin}${CHART_BASE}/lakes.geojson`, tolerance: GEOJSON_TOLERANCE },
    // One rectangle over the whole world, to lay a pattern over the water (the land fill covers it).
    'chart-world': { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[-540, -85], [540, -85], [540, 85], [-540, 85], [-540, -85]]] } } },
    'chart-wash-sea': raster('wash-sea'),
    'chart-bleed': raster('bleed'),
    'chart-wash-land': raster('wash-land'),
    'chart-glaze': { type: 'raster', tiles: [`${origin}${CHART_BASE}/glaze/{z}/{x}/{y}.webp`], tileSize: 256, maxzoom: 4 },
    'chart-peaks': tiles('peaks'),
    'chart-tufts': tiles('tufts'),
    'chart-waves': tiles('waves'),
  }
}

/** Size capped by each glyph's distance to the coast, so it never reaches the shore (the approved lab rule). */
const fittedSize = (scale, grow) => ['interpolate', ['exponential', 2], ['zoom'],
  4, ['min', ['*', scale, ['get', 'sz']], ['/', ['get', 'fit'], kmAt(CAP_KM_Z4, 4)]],
  6, ['min', ['*', scale * grow, ['get', 'sz']], ['/', ['get', 'fit'], kmAt(CAP_KM_Z4, 6)]]]

/** Rank r: nothing below z2, a sixth of rank 0 up to z3, a third below z3.5, then one more rank per level. Size 0 = hidden. */
const someOfRank0 = (every) => ['all', ['==', ['get', 'r'], 0], ['==', ['%', ['round', ['*', ['get', 'sz'], 100]], every], 0]]
const waveSize = (scale) => ['step', ['zoom'],
  0,  // none on the world view: there the jittered grid reads as rows
  2, ['case', someOfRank0(6), ['*', scale * 0.7, ['get', 'sz']], 0],
  3, ['case', someOfRank0(3), ['*', scale * 0.75, ['get', 'sz']], 0],
  3.5, ['case', ['<=', ['get', 'r'], 0], ['*', scale, ['get', 'sz']], 0],
  4.5, ['case', ['<=', ['get', 'r'], 1], ['*', scale * 1.07, ['get', 'sz']], 0],
  5.5, ['case', ['<=', ['get', 'r'], 2], ['*', scale * 1.13, ['get', 'sz']], 0],
  6.5, ['*', scale * 1.2, ['get', 'sz']]]

// Thin when zoomed out: at the continent view a full-weight line along every fjord read as spiky.
const coastWidth = (w) => ['interpolate', ['linear'], ['zoom'], 2, w * 0.35, 3.5, w * 0.55, 4.3, w * 0.9, 5, w, 7, w * 1.4]
/**
 * An illustrator draws a few meaningful islands, not every speck (Bart 10-26: "small islands … look like
 * bugs"). A ring shows from the zoom where it is big enough to read; the voyages' landfalls (k=1) always.
 * Returned as a paint value (opacity), since a zoom expression may not sit inside a filter.
 */
// MUST equal ISLET_KM2 in scripts/build-chart-data.py (the glaze tiles bake the same rule).
// The outlines are already simplified and smoothed at build time. MapLibre's own per-tile
// simplification on top (tolerance 1 px at the tile's zoom) re-cut the curves into steps between
// whole zooms: stair-stepped coasts at z3.3-3.8, the editor's default framing (tester 10-26).
export const GEOJSON_TOLERANCE = 0.2

export const ISLET_KM2 = [[0, 20000], [2.5, 3000], [3.5, 800], [4.5, 100], [5.5, 40], [6.5, 0]]
const shownAtZoom = (on = 1) => ['step', ['zoom'],
  ...ISLET_KM2.flatMap(([z, km2], i) => [...(i ? [z] : []), ['case', ['any', ['==', ['get', 'k'], 1], ['>=', ['get', 'a'], km2]], on, 0]])]

const fadeIn = (from, to) => ['interpolate', ['linear'], ['zoom'], from, 0, from + 0.4, to]

/**
 * The chart's layers, bottom to top, split around the land so the lesson map can put rivers,
 * borders and cities between them: `under` sits below everything, `over` goes above the borders.
 * `coastline` is the lesson map's own source (the same drawn rings as chart-land).
 */
export function chartLayers (cfg = CHART) {
  const under = [
    { id: 'bg', type: 'background', paint: { 'background-color': cfg.seaColor, 'background-pattern': 'chart-sea' } },
    // The sea wash under the depth glaze (so the pale shallows stay), the shore bleed over it; both UNDER
    // the land fill, which clips them exactly at the coast.
    { id: 'chart-wash-sea', type: 'raster', source: 'chart-wash-sea', paint: { 'raster-opacity': cfg.seaWash, 'raster-resampling': 'linear', 'raster-fade-duration': 0 } },
    { id: 'chart-glaze', type: 'raster', source: 'chart-glaze', paint: { 'raster-opacity': cfg.glazeOpacity, 'raster-resampling': 'linear', 'raster-fade-duration': 0 } },
    { id: 'chart-sea-grain', type: 'fill', source: 'chart-world', paint: { 'fill-pattern': 'chart-sea-grain', 'fill-opacity': cfg.seaGrain } },
    { id: 'chart-bleed', type: 'raster', source: 'chart-bleed', paint: { 'raster-opacity': cfg.shoreBleed, 'raster-resampling': 'linear', 'raster-fade-duration': 0 } },
    { id: 'land', type: 'fill', source: 'chart-land', paint: { 'fill-pattern': 'chart-land', 'fill-opacity': shownAtZoom() } },
    // The land wash fades out just inside the coast (baked), so its raster edge never shows.
    { id: 'chart-wash-land', type: 'raster', source: 'chart-wash-land', paint: { 'raster-opacity': cfg.landWash, 'raster-resampling': 'linear', 'raster-fade-duration': 0 } },
    // Inland water (the IJsselmeer, Lake Geneva, the Great Lakes) painted as the sea: Natural Earth's
    // land has them filled in, and the chart had drawn the Netherlands without its IJsselmeer.
    { id: 'chart-lakes', type: 'fill', source: 'chart-lakes', paint: { 'fill-pattern': 'chart-sea', 'fill-opacity': shownAtZoom() } },
    { id: 'chart-land-edge', type: 'line', source: 'coastline', layout: { 'line-join': 'round' },
      paint: { 'line-color': cfg.landEdgeColor, 'line-opacity': shownAtZoom(cfg.landEdgeOpacity),
        'line-width': ['interpolate', ['linear'], ['zoom'], 3, 3, 6, 8], 'line-offset': ['interpolate', ['linear'], ['zoom'], 3, -1.5, 6, -4] } },  // inside the land
    { id: 'chart-tufts', type: 'symbol', source: 'chart-tufts', 'source-layer': 'tufts', minzoom: cfg.ridgeMinZoom,
      layout: { 'icon-image': ['concat', 'chart-tuft-', ['to-string', ['get', 'g']]], 'icon-allow-overlap': true, 'icon-size': fittedSize(cfg.ridgeScale * 0.57, 1.75) },
      paint: { 'icon-opacity': fadeIn(cfg.ridgeMinZoom, cfg.tuftOpacity) } },
  ]
  const over = [
    // Offset from the same smoothed coast as the ink (one download), so it follows it without scribble.
    // The offshore dash belongs to the sea coast; a lake shore keeps only its ink line.
    // Not round islets: a dash ring on a speck read as sparkles (Tonga, the Wadden bars).
    { id: 'chart-coast-dash', type: 'line', source: 'coastline', minzoom: 3.5, filter: ['all', ['!', ['has', 'lake']], ['>=', ['get', 'a'], DASH_MIN_KM2]], layout: { 'line-join': 'round' },
      paint: { 'line-color': cfg.inkColor, 'line-opacity': shownAtZoom(cfg.dashOpacity), 'line-width': 1.3, 'line-dasharray': [3, 2.2],
        'line-offset': ['interpolate', ['linear'], ['zoom'], 3.5, cfg.dashOffset * 0.6, 5, cfg.dashOffset] } },
    { id: 'coast-bold', type: 'line', source: 'coastline', layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': cfg.inkColor, 'line-width': coastWidth(cfg.coastWidth), 'line-opacity': shownAtZoom() } },
    // Ridges never overlap: collision keeps them apart, so a range reads as peaks, not a dark mass.
    { id: 'chart-ridges', type: 'symbol', source: 'chart-peaks', 'source-layer': 'peaks', minzoom: cfg.ridgeMinZoom,
      layout: { 'icon-image': ['concat', 'chart-ridge-', ['to-string', ['get', 'g']]], 'icon-anchor': 'bottom', 'icon-padding': 0, 'icon-size': fittedSize(cfg.ridgeScale, 1.3) },
      paint: { 'icon-opacity': fadeIn(cfg.ridgeMinZoom, cfg.ridgeWash) } },
    // 4 in 9 marks, as in the approved lab: the full grid read as a busy sea.
    { id: 'chart-waves', type: 'symbol', source: 'chart-waves', 'source-layer': 'waves', filter: ['<', ['%', ['round', ['*', ['get', 'sz'], 100]], 9], 4],
      layout: { 'icon-image': ['concat', 'chart-wave-', ['to-string', ['get', 'g']]], 'icon-allow-overlap': true, 'icon-size': waveSize(cfg.waveScale) },
      paint: { 'icon-opacity': cfg.waveOpacity } },
  ]
  return { under, over }
}

/** Every image the chart draws, with the pixel ratio it was painted at. */
export function chartImages () {
  const art = (file) => `${CHART_BASE}/art/${file}`
  return [
    { id: 'chart-sea', url: art('sea.webp'), pixelRatio: 1 },
    { id: 'chart-land', url: art('land.webp'), pixelRatio: 1 },
    { id: 'chart-sea-grain', url: art('sea-grain.webp'), pixelRatio: 1 },
    ...Array.from({ length: RIDGE_GLYPHS }, (_, i) => ({ id: `chart-ridge-${i}`, url: art(`ridge-${i}.webp`), pixelRatio: 2 })),
    ...Array.from({ length: TUFT_GLYPHS }, (_, i) => ({ id: `chart-tuft-${i}`, url: art(`tuft-${i}.webp`), pixelRatio: 2 })),
    // The wave strokes are vector; rasterised at 4x so they stay crisp on a projector.
    ...Array.from({ length: WAVE_GLYPHS }, (_, i) => ({ id: `chart-wave-${i}`, url: art(`wave-${i}.svg`), pixelRatio: 4, raster: [180, 36] })),
  ]
}

/** Load the painted images into the map. A missing image costs that element, never the map. */
export function addChartImages (map, { origin = '', isGone = () => false } = {}) {
  const load = ({ id, url, pixelRatio, raster }) => new Promise((resolve) => {
    const img = raster ? new Image(raster[0], raster[1]) : new Image()
    img.onload = () => {
      try { if (!isGone() && !map.hasImage(id)) map.addImage(id, img, { pixelRatio }) } catch (_) { /* map torn down */ }
      resolve()
    }
    img.onerror = () => { console.warn(`[map-chart] missing ${url}`); resolve() }
    img.src = `${origin}${url}`
  })
  return Promise.all(chartImages().map(load))
}

/** The paper grain: one multiplied overlay over the canvas, fixed to the screen (the paper IS the screen). */
export function addChartPaper (el, cfg = CHART) {
  const paper = document.createElement('div')
  paper.className = 'lp-map-paper'
  paper.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:1;mix-blend-mode:multiply;opacity:${cfg.paperOpacity};background:url(${CHART_BASE}/art/paper.webp)`
  el.appendChild(paper)
  return paper
}

/** Re-paint every chart property from the live config. The tuner's only way to touch the map. */
export function applyChartPaint (map, cfg, paper = null) {
  const { under, over } = chartLayers(cfg)
  for (const layer of [...under, ...over]) {
    if (!map.getLayer(layer.id)) continue
    for (const [k, v] of Object.entries(layer.paint || {})) { try { map.setPaintProperty(layer.id, k, v) } catch (_) { /* not ready */ } }
    for (const [k, v] of Object.entries(layer.layout || {})) { try { map.setLayoutProperty(layer.id, k, v) } catch (_) { /* not ready */ } }
  }
  if (paper) paper.style.opacity = String(cfg.paperOpacity)
}

/** Dev tuner controls. Each owns its key in `cfg` and repaints through applyChartPaint. */
export function chartTunerControls (map, cfg, paper = null) {
  const set = (key) => (v) => { cfg[key] = v; applyChartPaint(map, cfg, paper) }
  const range = (key, label, min, max, step) => ({ key, label, min, max, step, value: CHART[key], apply: set(key) })
  const color = (key, label) => ({ key, label, type: 'color', value: CHART[key], apply: set(key) })
  return [
    range('seaWash', 'Sea washes', 0, 1, 0.05),
    range('seaGrain', 'Sea granulation', 0, 1, 0.05),
    range('shoreBleed', 'Shore bleed', 0, 1, 0.05),
    range('landWash', 'Land washes', 0, 1, 0.05),
    range('glazeOpacity', 'Depth glaze', 0, 2, 0.05),
    range('landEdgeOpacity', 'Warm coast edge', 0, 1, 0.05),
    color('landEdgeColor', 'Coast edge colour'),
    color('inkColor', 'Ink'),
    range('coastWidth', 'Coast line width', 0.5, 4, 0.1),
    range('dashOffset', 'Dash offset (px, plus = sea)', -16, 16, 1),
    range('dashOpacity', 'Dash opacity', 0, 1, 0.05),
    range('ridgeScale', 'Ridge size', 0.4, 3, 0.05),
    range('ridgeWash', 'Ridge opacity', 0, 1, 0.05),
    range('tuftOpacity', 'Tuft opacity', 0, 1, 0.05),
    range('waveScale', 'Wave size', 0.5, 3, 0.05),
    range('waveOpacity', 'Wave opacity', 0, 1, 0.05),
    range('paperOpacity', 'Paper grain', 0, 0.5, 0.01),
  ]
}
