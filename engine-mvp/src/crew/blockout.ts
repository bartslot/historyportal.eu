// The 3D blockout thumbnail: after the set designer's commands are applied and the models have loaded,
// grab the stage as a small JPEG. Any failure (hidden canvas, blank image) means no thumbnail, never an error.
import { SKETCH_MAX, cleanSketch, type Sketch } from './stream'

export const SETTLE_MS = 600
export const THUMB_WIDTH = 960 // sharp enough to open large; shown small in the chat
export const JPEG_QUALITY = 0.7
const BLANK_MEAN = 6 // mean brightness (0-255) below which the stage counts as black/empty

/** True when RGBA pixels are fully transparent or (nearly) black: nothing was drawn. */
export function isBlank(rgba: ArrayLike<number>): boolean {
  let sum = 0, seen = 0
  for (let i = 0; i + 3 < rgba.length; i += 4) { if (rgba[i + 3] > 0) { sum += rgba[i] + rgba[i + 1] + rgba[i + 2]; seen++ } }
  return seen === 0 || sum / (seen * 3) < BLANK_MEAN
}

/** The caption: the designer's own first sentence (it describes the blockout that is really there); the writer's
 * sketch sentence only when the designer said nothing (it describes the imagined final picture, not the blockout). */
export function blockoutCaption(sketch: string | undefined, text: string): string {
  const t = text.trim()
  if (t) return t.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? t
  return (sketch ?? '').trim()
}

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))
const load = (url: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('bad image')); i.src = url })

/** Wait for the models, grab the stage, return a JPEG thumbnail, or null. */
export async function captureBlockout(caption: string): Promise<Sketch | null> {
  try {
    await new Promise((r) => setTimeout(r, SETTLE_MS))
    await frame(); await frame()
    const raw: unknown = (window as any).__mvp.stageImage(THUMB_WIDTH)
    if (typeof raw !== 'string' || !raw.startsWith('data:image/')) return null
    const img = await load(raw)
    const c = document.createElement('canvas')
    c.width = Math.min(THUMB_WIDTH, img.naturalWidth); c.height = Math.round(c.width * img.naturalHeight / img.naturalWidth)
    const g = c.getContext('2d')
    if (!g || !c.width || !c.height) return null
    g.drawImage(img, 0, 0, c.width, c.height)
    if (isBlank(g.getImageData(0, 0, c.width, c.height).data)) return null
    const url = c.toDataURL('image/jpeg', JPEG_QUALITY)
    return url.length <= SKETCH_MAX ? cleanSketch(url, caption) : null
  } catch { return null }
}
