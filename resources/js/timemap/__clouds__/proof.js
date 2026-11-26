/**
 * proof.js — a standalone globe for trying globe cloud layers.
 *
 * The Time-Map's own ground (sea, land, coastline) from public/, with the whole globe stack from
 * map-globe-layers.js on top, so the two atmospheres are compared with everything else identical.
 * `?lng=&lat=&zoom=&pitch=&bearing=&sunLng=&sunLat=` frame the shot.
 * `?v.scale=8&v.coverage=0.45&v.exposure=10&v.stepScale=1.004&v.shadows=0&v.strength=1` set the 3D
 * cloud layer's options (volumetric-clouds.js); `?flat=0` hides the flat deck; `?motion=1` lets the
 * weather move. `window.__fps()` is the frame rate over the last second, `window.__cameraCheck()`
 * compares the 3D clouds' camera against MapLibre's own projection, in pixels.
 * `?imagery=1` swaps the parchment for NASA Blue Marble (needs network to GIBS).
 */
import maplibregl from '../../maplibre.js'
import 'maplibre-gl/dist/maplibre-gl.css'
import { addGlobeLayers } from '../../map-globe-layers.js'
import theme from '../theme.json'

const params = new URLSearchParams(location.search)
const num = (key, fallback) => (params.has(key) ? Number(params.get(key)) : fallback)
const origin = location.origin

const ground = params.get('imagery')
  ? [{ id: 'satellite', type: 'raster', source: 'satellite' }]
  : [
    { id: 'land', type: 'fill', source: 'land', 'source-layer': 'land', paint: { 'fill-color': theme.land } },
    { id: 'coast', type: 'line', source: 'coastline', paint: { 'line-color': '#574631', 'line-width': 0.8 } },
  ]

const map = new maplibregl.Map({
  container: 'map',
  attributionControl: false,
  center: [num('lng', 20), num('lat', 30)],
  zoom: num('zoom', 1.6),
  pitch: num('pitch', 0),
  bearing: num('bearing', 0),
  maxPitch: 85,
  canvasContextAttributes: { preserveDrawingBuffer: true },
  style: {
    version: 8,
    projection: { type: 'globe' },
    glyphs: `${origin}/fonts/{fontstack}/{range}.pbf`,
    sources: {
      land: { type: 'vector', tiles: [`${origin}/land-tiles/{z}/{x}/{y}.pbf`], maxzoom: 4 },
      coastline: { type: 'geojson', data: `${origin}/timemap/coastline.geojson` },
      satellite: {
        type: 'raster',
        tiles: [params.get('imagery') === 'local' ? `${origin}/_proof-tiles/{z}/{x}/{y}.jpeg` : 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'],
        tileSize: 256,
        maxzoom: params.get('imagery') === 'local' ? 3 : 8,
      },
    },
    layers: [
      { id: 'water', type: 'background', paint: { 'background-color': params.get('imagery') ? '#0b1d3a' : theme.water } },
      ...ground,
    ],
  },
})

// A fixed afternoon so captures compare: sun over (sunLng, sunLat).
const sunFor = (lng, lat) => {
  const a = lat * Math.PI / 180
  const b = lng * Math.PI / 180
  return [Math.cos(a) * Math.cos(b), Math.sin(a), Math.cos(a) * Math.sin(b)]
}

map.on('load', () => {
  const globe = addGlobeLayers(map, { reduceMotion: !params.get('motion') })
  const sun = sunFor(num('sunLng', -10), num('sunLat', 10))
  for (const layer of Object.values(globe.layers)) layer.setOptions?.({ sun })
  if (params.get('nobloom')) globe.layers.bloom?.setOptions?.({ strength: 0 })
  if (params.get('flat') === '0') globe.layers.clouds?.setOptions?.({ opacity: 0 })
  const volume = {}
  for (const [key, value] of params) if (key.startsWith('v.')) volume[key.slice(2)] = Number.isNaN(Number(value)) ? value : Number(value)
  if ('shadows' in volume) volume.shadows = !!volume.shadows
  // The proof page can hide the flat deck and still want the 3D clouds, so they do not follow it.
  globe.layers.cloudVolume?.setOptions?.({ ...volume, deckOpacity: null })
  window.__globe = globe
  map.once('idle', () => { setTimeout(() => { document.body.dataset.ready = '1' }, 1500) })
})
window.__map = map

// Frames MapLibre actually drew in the last second.
const stamps = []
map.on('render', () => { const now = performance.now(); stamps.push(now); while (stamps[0] < now - 1000) stamps.shift() })
window.__fps = () => stamps.length

/**
 * Does the 3D clouds' camera agree with MapLibre? Projects ground points near the view centre both
 * ways and returns the worst disagreement in CSS pixels. A fraction of a pixel is a pass.
 */
window.__cameraCheck = () => {
  const camera = window.__globe?.layers.cloudVolume?.debug?.()?.camera
  if (!camera) return null
  const { lng, lat } = map.getCenter()
  const canvas = map.getCanvas()
  let worst = 0
  for (const [dx, dy] of [[0, 0], [2, 0], [-2, 1], [0, -2], [3, 3]]) {
    const a = (lat + dy) * Math.PI / 180
    const b = (lng + dx) * Math.PI / 180
    const R = 6371008.8
    const ecef = [R * Math.cos(a) * Math.cos(b), R * Math.cos(a) * Math.sin(b), R * Math.sin(a), 1]
    const m = camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse).elements
    const clip = [0, 1, 2, 3].map((r) => m[r] * ecef[0] + m[4 + r] * ecef[1] + m[8 + r] * ecef[2] + m[12 + r])
    const x = (clip[0] / clip[3] * 0.5 + 0.5) * canvas.clientWidth
    const y = (1 - (clip[1] / clip[3] * 0.5 + 0.5)) * canvas.clientHeight
    const want = map.project([lng + dx, lat + dy])
    worst = Math.max(worst, Math.hypot(x - want.x, y - want.y))
  }
  return worst
}
