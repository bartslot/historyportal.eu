// Water's textures on the GPU (water.ts has the maths): the glint sheet, one per scene, and a layer's mask.
import { Constants } from '@babylonjs/core/Engines/constants'
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture'
import { Texture } from '@babylonjs/core/Materials/Textures/texture'
import type { Scene } from '@babylonjs/core/scene'
import { GLINT_FRAMES, GLINT_FRAME_H, GLINT_FRAME_W, drawGlintSheet } from './water'

const sheets = new WeakMap<Scene, Texture>()

/**
 * The glint sheet: GLINT_FRAMES frames in one row, white on transparent. Procedural (water.ts drawGlintSheet) until a
 * painted sheet exists: pass its url (same layout, any size) and that is drawn instead. No mipmaps: a frame's edge
 * never bleeds into the next one.
 */
export function glintSheet(scene: Scene, url?: string): Texture {
  const hit = sheets.get(scene)
  if (hit) return hit
  let tex: Texture
  if (url) {
    tex = new Texture(url, scene, true, false, Texture.BILINEAR_SAMPLINGMODE)
  } else {
    const c = document.createElement('canvas')
    c.width = GLINT_FRAME_W * GLINT_FRAMES; c.height = GLINT_FRAME_H
    const g = c.getContext('2d')!
    drawGlintSheet(g)
    const data = g.getImageData(0, 0, c.width, c.height).data
    tex = new RawTexture(data, c.width, c.height, Constants.TEXTUREFORMAT_RGBA, scene, false, false, Texture.BILINEAR_SAMPLINGMODE)
  }
  tex.wrapU = Texture.CLAMP_ADDRESSMODE
  tex.wrapV = Texture.CLAMP_ADDRESSMODE
  sheets.set(scene, tex)
  return tex
}

/** The mask's longest side, px: soft water edges need no more. */
export const MASK_MAX = 512

/** A layer's water mask: a grey texture the size of the picture's shape, drawn from a saved file or a live brush canvas. */
export interface WaterMask {
  tex: DynamicTexture
  /** the saved file now drawn, or the one being loaded */
  url: string | null
  /** drawn from the brush since the last saved file: the next url is that drawing saved, no reload */
  live: boolean
  draw(source: CanvasImageSource): void
  load(url: string | null): void
  dispose(): void
}

export function makeWaterMask(scene: Scene, picW: number, picH: number): WaterMask {
  const k = MASK_MAX / Math.max(picW, picH, 1)
  const w = Math.max(1, Math.round(picW * k)), h = Math.max(1, Math.round(picH * k))
  const tex = new DynamicTexture('water-mask', { width: w, height: h }, scene, false, Texture.BILINEAR_SAMPLINGMODE)
  tex.wrapV = Texture.CLAMP_ADDRESSMODE
  const g = tex.getContext() as unknown as CanvasRenderingContext2D
  const clear = () => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); tex.update(false) }
  clear()
  let token = 0
  const mask: WaterMask = {
    tex, url: null, live: false,
    draw(source) {
      token++
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h)
      g.drawImage(source, 0, 0, w, h)
      tex.update(false)   // row 0 of the canvas at v 0, as the pictures (layer.ts: v = 0 at the top, no flip)
      mask.live = true
    },
    load(url) {
      mask.url = url
      mask.live = false
      const mine = ++token
      if (!url) { clear(); return }
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        if (mine !== token) return
        g.fillStyle = '#000'; g.fillRect(0, 0, w, h)
        g.drawImage(img, 0, 0, w, h)
        tex.update(false)
      }
      img.src = url
    },
    dispose() { token++; tex.dispose() },
  }
  return mask
}
