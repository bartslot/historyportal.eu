/**
 * comic-style.js — the lesson map's watercolour chart, offered as a Time-Map style.
 *
 * Bart, 2026-11-26: "I am missing our Comic (watercolour) look that we have built here in the
 * options". The look already exists, whole, in map-chart.js: the painted sea, the depth glaze, the
 * cream land, the ink coast with its offshore dash, the History Lines ridges and tufts. This file
 * does not draw any of it again. It takes chartSources() and chartLayers() as they are and puts them
 * into the Time-Map's style under names of their own, hidden until the Comic style is chosen.
 *
 * WHY RENAMED. The two maps grew up apart and share layer and source names that mean different
 * things: the Time-Map's `coastline` is a plain Natural Earth line, the chart's is its own smoothed
 * rings with an area (`a`) and a `lake` flag on each; both maps have a `land` and a `coast-bold`.
 * Adding the chart's layers under their own ids would either fail or repaint the Time-Map's. So
 * every chart layer gets a `comic-` id and the chart's coastline arrives as `comic-coastline`.
 */

import { CHART, CHART_BASE, GEOJSON_TOLERANCE, chartSources, chartLayers, addChartImages } from '../map-chart.js'

const PREFIX = 'comic-'
const COAST_SOURCE = 'comic-coastline'

/** The chart's layers with Time-Map-safe ids and the renamed coastline, hidden to start with. */
export function comicLayers () {
  const rename = (layer) => ({
    ...layer,
    id: layer.id.startsWith(PREFIX) ? layer.id : PREFIX + layer.id,
    ...(layer.source === 'coastline' ? { source: COAST_SOURCE } : {}),
    layout: { ...(layer.layout || {}), visibility: 'none' },
  })
  const { under, over } = chartLayers(CHART)
  return { under: under.map(rename), over: over.map(rename) }
}

/** Every comic layer id, under first, in draw order. */
export const comicLayerIds = () => {
  const { under, over } = comicLayers()
  return [...under, ...over].map((layer) => layer.id)
}

/**
 * Add the chart to a Time-Map: its sources, its painted images, and its layers, all hidden.
 *
 * `underBefore` is the first layer the sea and land go beneath (the Time-Map's own drawn ground
 * starts there); `overBefore` is where the coast ink and ridges go, under the territories so a
 * border and its fill still read on top of the paint.
 */
export function addComicStyle (map, { origin = '', underBefore, overBefore, isGone = () => false } = {}) {
  for (const [id, source] of Object.entries(chartSources(origin))) {
    if (!map.getSource(id)) map.addSource(id, source)
  }
  if (!map.getSource(COAST_SOURCE)) {
    map.addSource(COAST_SOURCE, { type: 'geojson', data: `${origin}${CHART_BASE}/coast.geojson`, tolerance: GEOJSON_TOLERANCE })
  }
  const { under, over } = comicLayers()
  const before = (id) => (id && map.getLayer(id) ? id : undefined)
  for (const layer of under) if (!map.getLayer(layer.id)) map.addLayer(layer, before(underBefore))
  for (const layer of over) if (!map.getLayer(layer.id)) map.addLayer(layer, before(overBefore))
  // The painted sea, land and glyph atlases. A missing picture costs that element, never the map.
  return addChartImages(map, { origin, isGone })
}

/** Show or hide the whole chart in one go. */
export function setComicVisible (map, on) {
  for (const id of comicLayerIds()) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none')
  }
}

/**
 * The Time-Map style entry: the same colours the lesson map writes on top of the chart (lesson-map
 * GROUND), so a territory, a label and a route look the same on both maps.
 */
export const COMIC_MAP_STYLE = {
  chart: true,
  water: CHART.seaColor,
  land: '#efe3c4',
  fillOpacity: 0.35,
  selected: '#e0a200',
  hover: '#ead7a4',
  shore: { color: CHART.inkColor, width: 0, shadow: 'rgba(0,0,0,0)', shadowWidth: 0, dy: 0 },
  line: { color: '#a08868', width: 0.8, blur: 0.3 },
  text: { color: '#1d1712', halo: '#f6f1e4' },
  voyage: CHART.inkColor,
  paper: 0.12,
  vignette: 'rgba(80,55,30,0.18)',
}
