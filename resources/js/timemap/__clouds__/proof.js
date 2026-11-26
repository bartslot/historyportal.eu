/**
 * proof.js — a standalone globe for trying globe cloud layers.
 *
 * The Time-Map's own ground (sea, land, coastline) from public/, with the whole globe stack from
 * map-globe-layers.js on top, so the two atmospheres are compared with everything else identical.
 * `?lng=&lat=&zoom=&sunLng=&sunLat=` frame the shot.
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
  const globe = addGlobeLayers(map, { reduceMotion: true })
  const sun = sunFor(num('sunLng', -10), num('sunLat', 10))
  for (const layer of Object.values(globe.layers)) layer.setOptions?.({ sun })
  if (params.get('nobloom')) globe.layers.bloom?.setOptions?.({ strength: 0 })
  window.__globe = globe
  map.once('idle', () => { setTimeout(() => { document.body.dataset.ready = '1' }, 1500) })
})
window.__map = map
