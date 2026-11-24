// A flat figure's shade at its joints (Bart 11-24: "please fix the joints, the shader paints an edge there. this is for
// all the joint areas"). The kit's shade lies in a band along every outline of every part: on the silhouette that is
// the figure's shadow side, but where an arm lies against the chest or the robe meets the chest the same band runs along
// the cut, and the watercolour glazed it into a darker stripe that showed as soon as the part moved. So, on the shade
// mask as it loads: the shade fades out toward every cut between two parts, and what a part hides under another at rest
// (filled in by the creator from its nearest paint, the band included) takes no shade. Pure: arrays in, the shade's red
// changed in place.
import type { Puppet } from './types'

/** Puppet px from a cut between two parts with no shade at all (the band along an outline is about this wide), and as
 *  many again over which it fades back in. */
export const JOINT_REACH_PX = 14

type Rect = { x0: number; y0: number; x1: number; y1: number; ax0: number; ay0: number; aw: number; ah: number }

/** A part's quad (puppet px) and its uv rect (atlas px). */
function rectOf(quad: [number, number][], uv: readonly number[], W: number, H: number): Rect {
  const [[x0, y0], , [x1, y1]] = quad
  const ax0 = Math.round(uv[0] * W), ay0 = Math.round(uv[1] * H)
  return { x0, y0, x1, y1, ax0, ay0, aw: Math.max(1, Math.round(uv[2] * W) - ax0), ah: Math.max(1, Math.round(uv[3] * H) - ay0) }
}

/**
 * `shade`, `atlas`: RGBA of the shade mask and the atlas, both `aw` x `ah` (the same layout). Changes `shade`'s red.
 */
export function jointShade(shade: Uint8ClampedArray, atlas: Uint8ClampedArray, aw: number, ah: number, puppet: Puppet, reach = JOINT_REACH_PX): void {
  const W = Math.ceil(puppet.width), H = Math.ceil(puppet.height)
  const owner = new Int16Array(W * H).fill(-1)
  const rects = puppet.parts.map((p) => rectOf(p.quad, p.uv, aw, ah))
  // the drawing at rest: which part shows at each puppet px, back to front
  rects.forEach((r, k) => {
    const sx = r.aw / Math.max(1e-6, r.x1 - r.x0), sy = r.ah / Math.max(1e-6, r.y1 - r.y0)
    for (let y = Math.max(0, Math.floor(r.y0)); y < Math.min(H, Math.ceil(r.y1)); y++) {
      const ay = r.ay0 + Math.min(r.ah - 1, Math.max(0, Math.floor((y + 0.5 - r.y0) * sy)))
      for (let x = Math.max(0, Math.floor(r.x0)); x < Math.min(W, Math.ceil(r.x1)); x++) {
        const ax = r.ax0 + Math.min(r.aw - 1, Math.max(0, Math.floor((x + 0.5 - r.x0) * sx)))
        if (atlas[(ay * aw + ax) * 4 + 3] > 127) owner[y * W + x] = k
      }
    }
  })
  // how far each px lies from a cut between two parts (the air is no cut), walking through the paint
  const dist = new Float32Array(W * H).fill(Infinity)
  const queue = new Int32Array(W * H)
  let head = 0, tail = 0
  for (let i = 0; i < W * H; i++) {
    const o = owner[i]
    if (o < 0) continue
    const x = i % W
    const other = (j: number) => owner[j] >= 0 && owner[j] !== o
    if ((x > 0 && other(i - 1)) || (x < W - 1 && other(i + 1)) || (i >= W && other(i - W)) || (i + W < W * H && other(i + W))) {
      dist[i] = 0
      queue[tail++] = i
    }
  }
  while (head < tail) {
    const i = queue[head++]
    const x = i % W, d = dist[i] + 1
    if (d > 2 * reach) continue
    for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
      if (j < 0 || j >= W * H || owner[j] < 0 || dist[j] <= d) continue
      dist[j] = d
      queue[tail++] = j
    }
  }
  const fade = (d: number) => { const t = Math.min(1, Math.max(0, d / reach - 1)); return t * t * (3 - 2 * t) }
  // each part's own tile (and the head's expressions, on the head's place) through the drawing at rest
  const tiles: { k: number; r: Rect }[] = rects.map((r, k) => ({ k, r }))
  const headK = puppet.parts.findIndex((p) => p.bone === 'head')
  if (headK >= 0) for (const uv of Object.values(puppet.faces ?? {})) tiles.push({ k: headK, r: rectOf(puppet.parts[headK].quad, uv, aw, ah) })
  for (const { k, r } of tiles) {
    const sx = (r.x1 - r.x0) / r.aw, sy = (r.y1 - r.y0) / r.ah
    for (let ty = 0; ty < r.ah; ty++) {
      const y = Math.floor(r.y0 + (ty + 0.5) * sy)
      for (let tx = 0; tx < r.aw; tx++) {
        const a = ((r.ay0 + ty) * aw + r.ax0 + tx) * 4
        if (atlas[a + 3] <= 127 || shade[a] === 0) continue
        const x = Math.floor(r.x0 + (tx + 0.5) * sx)
        if (x < 0 || y < 0 || x >= W || y >= H) continue
        const i = y * W + x
        // hidden under another part at rest: no shade (its fill copied the band along the cut); else fade to the cut
        const f = owner[i] !== k ? 0 : dist[i] < 2 * reach ? fade(dist[i]) : 1
        if (f < 1) shade[a] = Math.round(shade[a] * f)
      }
    }
  }
}
