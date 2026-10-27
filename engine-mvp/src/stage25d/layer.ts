// One painted layer: an unlit, alpha-blended plane in metres, anchored at its ground point, with its motion in the
// vertex/fragment shader. Textures are uploaded PREMULTIPLIED (rgb * a, done here on the CPU), so filtering and
// mipmaps never mix the colour of transparent pixels into the edge: no light or dark halos at any size.
import {
  Constants, Effect, Mesh, RawTexture, ShaderMaterial, Texture, VertexData,
  type Scene,
} from '@babylonjs/core'
import type { Asset, MotionSpec } from './types'
import { MOTION_CODE } from './layout'

Effect.ShadersStore.stageLayerVertexShader = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  uniform float time, kind, amount, speed, phase, height, width;
  varying vec2 vUV;
  varying float vH;
  void main(void) {
    vec3 p = position;
    float h = clamp(p.y / max(height, 0.001), 0.0, 1.0);   // 0 at the ground point, 1 at the top
    if (kind == 1.0) {          // sway: bends from the base, top moves most, two beats so it never ticks like a metronome
      float s = sin(time * speed * 1.1 + phase) + 0.35 * sin(time * speed * 2.7 + phase * 1.7);
      p.x += amount * 0.035 * height * h * h * s;
      p.y -= amount * 0.004 * height * h * h * s * s;      // a bent stem is a touch shorter
    } else if (kind == 2.0) {   // drift: a slow sideways travel (clouds), long period so a shot never sees it turn
      p.x += amount * 0.12 * width * sin(time * speed * 0.035 + phase);
    } else if (kind == 4.0) {   // flicker: the flame stretches and settles
      p.y *= 1.0 + amount * 0.05 * h * (sin(time * speed * 9.0 + phase) * 0.6 + sin(time * speed * 23.0) * 0.4);
    }
    vUV = uv;
    vH = h;
    gl_Position = worldViewProjection * vec4(p, 1.0);
  }`

Effect.ShadersStore.stageLayerFragmentShader = `
  precision highp float;
  varying vec2 vUV;
  varying float vH;
  uniform sampler2D tex;
  uniform float time, kind, amount, speed, phase, opacity, uRepeat;
  void main(void) {
    vec2 uv = vec2(vUV.x * uRepeat, vUV.y);
    if (kind == 3.0) {          // ripple: the water surface wobbles, more toward the bottom (nearer)
      float k = amount * (0.3 + 0.7 * (1.0 - vH));
      uv.x += k * 0.004 * sin(uv.y * 70.0 + time * speed * 2.2 + phase);
      uv.y += k * 0.002 * sin(uv.x * 45.0 / uRepeat + time * speed * 1.6);
    }
    vec4 c = texture2D(tex, uv);                       // premultiplied
    if (kind == 4.0) c.rgb *= 1.0 + amount * 0.12 * (sin(time * speed * 13.0 + phase) * 0.5 + sin(time * speed * 31.0) * 0.5);
    gl_FragColor = c * opacity;
  }`

const textures = new Map<string, Promise<RawTexture>>()

/** The image as a premultiplied RGBA texture with mipmaps (cached per url and scene). */
export function loadPremultiplied(url: string, scene: Scene): Promise<RawTexture> {
  const hit = textures.get(url)
  if (hit) return hit
  const p = new Promise<RawTexture>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onerror = () => reject(new Error(`layer image ${url} did not load`))
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth; c.height = img.naturalHeight
      const g = c.getContext('2d', { willReadFrequently: true })!
      g.drawImage(img, 0, 0)
      const data = g.getImageData(0, 0, c.width, c.height).data
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3] / 255
        data[i] = Math.round(data[i] * a); data[i + 1] = Math.round(data[i + 1] * a); data[i + 2] = Math.round(data[i + 2] * a)
      }
      // row 0 = the image's top; sampled with v = 0 at the top, so no flip anywhere
      const tex = new RawTexture(data, c.width, c.height, Constants.TEXTUREFORMAT_RGBA, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE)
      tex.anisotropicFilteringLevel = 8
      tex.wrapV = Texture.CLAMP_ADDRESSMODE
      resolve(tex)
    }
    img.src = url
  })
  textures.set(url, p)
  p.catch(() => textures.delete(url))
  return p
}

const ROWS = 24 // enough rows for a smooth sway bend

/** A plane w x h metres whose local origin is the asset's anchor (its ground point). */
function anchoredPlane(name: string, asset: Asset, w: number, h: number, scene: Scene): Mesh {
  const [ax, ay] = asset.anchor ?? [0.5, 1]
  const positions: number[] = [], uvs: number[] = [], indices: number[] = []
  for (let r = 0; r <= ROWS; r++) {
    const v = r / ROWS                                       // image v: 0 top .. 1 bottom
    for (const u of [0, 1]) {
      positions.push((u - ax) * w, (ay - v) * h, 0)
      uvs.push(u, v)
    }
    if (r < ROWS) { const i = r * 2; indices.push(i, i + 2, i + 1, i + 1, i + 2, i + 3) }
  }
  const mesh = new Mesh(name, scene)
  Object.assign(new VertexData(), { positions, uvs, indices }).applyToMesh(mesh)
  return mesh
}

export interface LayerHandle {
  mesh: Mesh
  material: ShaderMaterial
  /** live values: read every frame, so a teacher's edit shows at once */
  setMotion(m: Required<MotionSpec>): void
  setOpacity(o: number): void
}

let seed = 0

export function makeLayer(asset: Asset, tex: RawTexture, w: number, h: number, uRepeat: number, scene: Scene): LayerHandle {
  const mesh = anchoredPlane(`layer:${asset.id}`, asset, w, h, scene)
  const mat = new ShaderMaterial(`layer:${asset.id}`, scene, 'stageLayer', {
    attributes: ['position', 'uv'],
    uniforms: ['worldViewProjection', 'time', 'kind', 'amount', 'speed', 'phase', 'height', 'width', 'opacity', 'uRepeat'],
    samplers: ['tex'],
    needAlphaBlending: true,
  })
  tex.wrapU = uRepeat !== 1 ? Texture.WRAP_ADDRESSMODE : Texture.CLAMP_ADDRESSMODE
  mat.setTexture('tex', tex)
  mat.alphaMode = Constants.ALPHA_PREMULTIPLIED
  mat.disableDepthWrite = true          // planes never hide each other by depth: draw order (alphaIndex) does that
  mat.backFaceCulling = false
  const phase = (seed++ * 2.39996) % (Math.PI * 2) // golden-angle phases: neighbours never sway in step
  const top = asset.anchor?.[1] ?? 1
  mat.setFloat('phase', phase).setFloat('height', h * top).setFloat('width', w).setFloat('uRepeat', uRepeat).setFloat('opacity', 1)
  mat.setFloat('kind', 0).setFloat('amount', 1).setFloat('speed', 1).setFloat('time', 0)
  mesh.material = mat
  mesh.metadata = { noGBuffer: true, painted: true } // the look draws no ink on its edges: the art has its own
  mesh.isPickable = false
  return {
    mesh, material: mat,
    setMotion: (m) => { mat.setFloat('kind', MOTION_CODE[m.kind] ?? 0).setFloat('amount', m.amount).setFloat('speed', m.speed) },
    setOpacity: (o) => { mat.setFloat('opacity', o); mesh.isVisible = o > 0.001 },
  }
}
