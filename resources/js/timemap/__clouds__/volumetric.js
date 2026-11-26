/**
 * volumetric.js — what Takram's volumetric clouds (@takram/three-clouds) look like at globe scale.
 *
 * A first look before any MapLibre plumbing: a Blue Marble planet in plain three.js with the cloud
 * effect over it, tone mapped. No physical sky or aerial perspective — Bart keeps our own haze.
 * URL: ?lng=&lat=&alt=(km above ground)&tilt=(deg from straight down)&sunLng=&sunLat=&coverage=
 *      &quality=low|medium|high
 */
import {
  EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode,
} from 'postprocessing'
import {
  Data3DTexture, HalfFloatType, LinearFilter, LinearMipMapLinearFilter, Mesh, MeshBasicMaterial,
  NoColorSpace, NoToneMapping, PerspectiveCamera, RedFormat, RepeatWrapping, Scene, SphereGeometry,
  SRGBColorSpace, TextureLoader, Vector3, WebGLRenderer, Matrix4,
} from 'three'
import { PrecomputedTexturesLoader } from '@takram/three-atmosphere'
import { CLOUD_SHAPE_DETAIL_TEXTURE_SIZE, CLOUD_SHAPE_TEXTURE_SIZE, CloudsEffect } from '@takram/three-clouds'
import { DataTextureLoader, Ellipsoid, Geodetic, parseUint8Array, radians, STBNLoader } from '@takram/three-geospatial'

const params = new URLSearchParams(location.search)
const num = (key, fallback) => (params.has(key) ? Number(params.get(key)) : fallback)
const ASSETS = '/_proof-assets'
const ready = { weather: false, shape: false, detail: false, turbulence: false, stbn: false, earth: false }
const markReady = (key) => { ready[key] = true; if (Object.values(ready).every(Boolean)) setTimeout(() => { document.body.dataset.ready = '1' }, 2500) }

const renderer = new WebGLRenderer({ depth: true, logarithmicDepthBuffer: false, preserveDrawingBuffer: true })
renderer.setPixelRatio(1)
renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = NoToneMapping
renderer.toneMappingExposure = num('exposure', 10)
document.body.appendChild(renderer.domElement)

// ── The planet: WGS84 sphere-ish (three's sphere scaled to the ellipsoid), Blue Marble on it ──
const scene = new Scene()
const R = Ellipsoid.WGS84.radii
const earthMaterial = new MeshBasicMaterial({ color: 0xffffff })
const earth = new Mesh(new SphereGeometry(1, 256, 128), earthMaterial)
// three's sphere: +Y is the pole; ECEF wants +Z. Rotate, then scale to the ellipsoid.
earth.rotation.x = Math.PI / 2
earth.scale.set(R.x, R.z, R.y)
if (!params.get('noearth')) scene.add(earth)
new TextureLoader().load(`${ASSETS}/earth-blue-marble.jpg`, (texture) => {
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  earthMaterial.map = texture
  // Radiance in, as the composer expects: the ground is dim next to sunlit cloud.
  earthMaterial.color.setScalar(num('ground', 0.08))
  earthMaterial.needsUpdate = true
  markReady('earth')
})

// ── Camera, from a geodetic point looking back at the planet ──
const lng = num('lng', 15), lat = num('lat', 35), alt = num('alt', 8000) * 1000, tilt = num('tilt', 0)
const camera = new PerspectiveCamera(num('fov', 40), innerWidth / innerHeight, 100, 1e8)
const ground = new Geodetic(radians(lng), radians(lat), 0).toECEF()
const up = Ellipsoid.WGS84.getSurfaceNormal(ground)
const enu = Ellipsoid.WGS84.getEastNorthUpFrame(ground)
const north = new Vector3().setFromMatrixColumn(enu, 1)
// Tilted: step back south and look north at the target, like the map's pitch.
const t = radians(tilt)
camera.position.copy(ground).addScaledVector(up, alt * Math.cos(t)).addScaledVector(north, -alt * Math.sin(t))
camera.up.copy(north)
camera.lookAt(ground)
camera.updateMatrixWorld()

// ── Clouds ──
const clouds = new CloudsEffect(camera)
// Takram's default is to draw NOTHING itself and hand the clouds to AerialPerspectiveEffect as an
// overlay (skipRendering = true). We have no AerialPerspective — our own haze stays — so the
// effect has to composite its own buffer.
clouds.skipRendering = false
// Feature switches off the URL, to find what a renderer chokes on: ?haze=0&shafts=0&temporal=0
for (const [key, prop] of [['haze', 'haze'], ['shafts', 'lightShafts'], ['temporal', 'temporalUpscale'], ['detail', 'shapeDetail'], ['turb', 'turbulence']]) {
  if (params.has(key)) clouds[prop] = params.get(key) !== '0'
}
if (params.has('maxRay')) clouds.clouds.maxRayDistance = num('maxRay', 2e5)
clouds.qualityPreset = params.get('quality') ?? 'high'
clouds.coverage = num('coverage', 0.35)
clouds.localWeatherRepeat.setScalar(num('repeat', 100))
const sun = (() => {
  const a = radians(num('sunLat', 15)), b = radians(num('sunLng', -20))
  return new Vector3(Math.cos(a) * Math.cos(b), Math.cos(a) * Math.sin(b), Math.sin(a))
})()
clouds.sunDirection.copy(sun)

const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType, multisampling: 0 })
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new EffectPass(camera, clouds))
composer.addPass(new EffectPass(camera, new ToneMappingEffect({ mode: ToneMappingMode.AGX })))

Object.assign(clouds, new PrecomputedTexturesLoader({ format: 'binary' }).setType(renderer).load(`${ASSETS}/atmosphere`))

const repeatTexture = (texture) => {
  texture.minFilter = LinearMipMapLinearFilter; texture.magFilter = LinearFilter
  texture.wrapS = texture.wrapT = RepeatWrapping; texture.colorSpace = NoColorSpace; texture.needsUpdate = true
  return texture
}
const volume = (texture) => {
  texture.format = RedFormat; texture.minFilter = texture.magFilter = LinearFilter
  texture.wrapS = texture.wrapT = texture.wrapR = RepeatWrapping; texture.colorSpace = NoColorSpace; texture.needsUpdate = true
  return texture
}
new TextureLoader().load(`${ASSETS}/clouds/local_weather.png`, (x) => { clouds.localWeatherTexture = repeatTexture(x); markReady('weather') })
new TextureLoader().load(`${ASSETS}/clouds/turbulence.png`, (x) => { clouds.turbulenceTexture = repeatTexture(x); markReady('turbulence') })
new DataTextureLoader(Data3DTexture, parseUint8Array, { width: CLOUD_SHAPE_TEXTURE_SIZE, height: CLOUD_SHAPE_TEXTURE_SIZE, depth: CLOUD_SHAPE_TEXTURE_SIZE })
  .load(`${ASSETS}/clouds/shape.bin`, (x) => { clouds.shapeTexture = volume(x); markReady('shape') })
new DataTextureLoader(Data3DTexture, parseUint8Array, { width: CLOUD_SHAPE_DETAIL_TEXTURE_SIZE, height: CLOUD_SHAPE_DETAIL_TEXTURE_SIZE, depth: CLOUD_SHAPE_DETAIL_TEXTURE_SIZE })
  .load(`${ASSETS}/clouds/shape_detail.bin`, (x) => { clouds.shapeDetailTexture = volume(x); markReady('detail') })
new STBNLoader().load(`${ASSETS}/core/stbn.bin`, (x) => { clouds.stbnTexture = x; markReady('stbn') })

let frames = 0, last = performance.now()
const fps = document.getElementById('fps')
renderer.setAnimationLoop(() => {
  composer.render()
  frames++
  const now = performance.now()
  if (now - last > 1000) { fps.textContent = `${Math.round(frames * 1000 / (now - last))} fps`; frames = 0; last = now }
})
window.__clouds = clouds
window.__renderer = renderer
