/**
 * A head that turns and nods from the kit pieces it is already drawn with, no new drawings (the Moho warp-mesh idea,
 * Scribe spike 11-19): one depth bump sits behind the face, highest where the features are and down to nothing at the
 * back of the skull, the crown and the chin. A turn moves every head pixel sideways by turn x depth, a nod moves it
 * down by nod x depth, so the eyes, nose and mouth slide across the face while the skull's outline stays where it is.
 * The same bump for every piece of the stack, the outfit too (an outfit paints the bare head under the face piece):
 * the hair on the forehead follows the brows, its outline does not move, nothing comes apart, and below the chin the
 * bump is zero, so only the part of a piece round the head is ever recomputed (regionOf).
 *
 * Kit pieces are drawn in a three-quarter view facing right (kit.json view 'front34'). turn +1 turns the head towards
 * its profile (the features slide to the right), -1 towards the camera; nod +1 looks down, -1 up.
 * Pure: boxes and pixels in, pixels out.
 */

/** Where the bump peaks, as a share of the face piece's box: between the eyes and the mouth of a three-quarter face. */
const CENTRE = [0.7, 0.49]
/** The chin, as a share of the face box's height: below it (the neck) nothing moves. */
const CHIN = 0.85
/** How far past the face's front edge the bump reaches: the nose and lips move a third as far as the eyes, so the
 *  profile line turns with the head (1 would pin it). */
const FRONT_REACH = 1.5
/** At full turn the features slide this share of the face's width; at full nod this share of its height. Both stay
 *  well under the bump's steepest slope, so the warp never folds a pixel over another. */
export const TURN_SHARE = 0.16
export const NOD_SHARE = 0.1

const clamp1 = (v) => Math.max(-1, Math.min(1, Number.isFinite(v) ? v : 0))

/**
 * The depth bump of a head, from its face piece's box [x, y, w, h] in baked canvas px.
 * @returns {{ cx: number, cy: number, back: number, front: number, top: number, bottom: number, ax: number, ay: number }}
 */
export function headField (faceBox) {
  const [x, y, w, h] = faceBox
  const cx = x + w * CENTRE[0], cy = y + h * CENTRE[1]
  return {
    cx, cy,
    back: cx - x,
    front: (x + w - cx) * FRONT_REACH,
    top: cy - y,
    bottom: y + h * CHIN - cy,
    ax: w * TURN_SHARE,
    ay: h * NOD_SHARE,
  }
}

/** The bump's height at a point: 1 at the centre, a smooth (1 - r²)² down to 0 at the ellipse's edge, 0 past it. */
export function depthAt (field, x, y) {
  const dx = x - field.cx, dy = y - field.cy
  const u = dx / (dx < 0 ? field.back : field.front), v = dy / (dy < 0 ? field.top : field.bottom)
  const r2 = u * u + v * v
  return r2 >= 1 ? 0 : (1 - r2) * (1 - r2)
}

/** How far the paint at a point moves for this pose, [dx, dy] in canvas px. */
export function shiftAt (field, x, y, turn, nod) {
  const d = depthAt(field, x, y)
  return [clamp1(turn) * field.ax * d, clamp1(nod) * field.ay * d]
}

/** True when the pose moves nothing (the drawing as it is). */
export const isRest = (pose) => !pose || (Math.abs(clamp1(pose.turn)) < 1e-3 && Math.abs(clamp1(pose.nod)) < 1e-3)

/** The px a warped piece may reach past its box: the most any pixel moves, and one for the sampling. */
export const padOf = (field, pose) => Math.ceil(Math.max(Math.abs(clamp1(pose.turn)) * field.ax, Math.abs(clamp1(pose.nod)) * field.ay)) + 1

/**
 * One picture of a piece, warped. `img`: { width, height, data } RGBA of the piece at its box `box` [x, y, w, h] in
 * canvas px (`k` canvas px per picture px: a piece may be stored smaller or larger than its box). Returns the warped
 * pixels, `pad` picture px larger on every side. `smooth`: blend the four nearest pixels (a painted colour), weighed by
 * their cover so a soft edge keeps its colour; off, the nearest pixel only (key colours, which must never blend).
 */
export function warpPixels (img, box, field, pose, pad, smooth = true) {
  const { width: w, height: h, data } = img
  const W = w + 2 * pad, H = h + 2 * pad
  const out = new Uint8ClampedArray(W * H * 4)
  const kx = box[2] / w, ky = box[3] / h
  const turn = clamp1(pose.turn), nod = clamp1(pose.nod)
  for (let Y = 0; Y < H; Y++) {
    const py = Y - pad
    const cy = box[1] + (py + 0.5) * ky
    for (let X = 0; X < W; X++) {
      const px = X - pad
      const cx = box[0] + (px + 0.5) * kx
      // the paint that lands here came from where this point was before the move (the bump is smooth: its shift at the
      // landing point stands in for its shift at the start, well under a pixel off at these sizes)
      const d = depthAt(field, cx, cy)
      const sx = px + 0.5 - (turn * field.ax * d) / kx - 0.5, sy = py + 0.5 - (nod * field.ay * d) / ky - 0.5
      const o = (Y * W + X) * 4
      if (!smooth) {
        const ix = Math.round(sx), iy = Math.round(sy)
        if (ix < 0 || iy < 0 || ix >= w || iy >= h) continue
        const i = (iy * w + ix) * 4
        out[o] = data[i]; out[o + 1] = data[i + 1]; out[o + 2] = data[i + 2]; out[o + 3] = data[i + 3]
        continue
      }
      const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0
      let r = 0, g = 0, b = 0, a = 0
      for (let j = 0; j < 4; j++) {
        const ix = x0 + (j & 1), iy = y0 + (j >> 1)
        if (ix < 0 || iy < 0 || ix >= w || iy >= h) continue
        const wt = ((j & 1) ? fx : 1 - fx) * ((j >> 1) ? fy : 1 - fy)
        const i = (iy * w + ix) * 4
        const aw = data[i + 3] * wt
        r += data[i] * aw; g += data[i + 1] * aw; b += data[i + 2] * aw; a += aw
      }
      if (a <= 0) continue
      out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; out[o + 3] = a
    }
  }
  return { width: W, height: H, data: out }
}

/** The canvas px [x0, y0, x1, y1] the pose can change: the bump's ellipse and the most anything slides into it. */
export function supportOf (field, pose) {
  const m = padOf(field, pose)
  return [field.cx - field.back - m, field.cy - field.top - m, field.cx + field.front + m, field.cy + field.bottom + m]
}

/**
 * The part of a piece the pose changes, [x, y, w, h] in the piece's picture px (from -pad, the grown frame), or null
 * when the piece lies clear of the head. `size`: the piece picture's [width, height] at its box `box`.
 */
export function regionOf (box, size, field, pose, pad) {
  const [w, h] = size
  const kx = box[2] / w, ky = box[3] / h
  const [sx0, sy0, sx1, sy1] = supportOf(field, pose)
  const x0 = Math.max(-pad, Math.floor((sx0 - box[0]) / kx)), y0 = Math.max(-pad, Math.floor((sy0 - box[1]) / ky))
  const x1 = Math.min(w + pad, Math.ceil((sx1 - box[0]) / kx)), y1 = Math.min(h + pad, Math.ceil((sy1 - box[1]) / ky))
  return x1 > x0 && y1 > y0 ? [x0, y0, x1 - x0, y1 - y0] : null
}

/** A rectangle [x, y, w, h] of an image (transparent where it reaches past the picture), and its box in canvas px. */
export function cropOf (img, box, rect) {
  const { width: w, height: h, data } = img
  const [rx, ry, rw, rh] = rect
  const out = new Uint8ClampedArray(rw * rh * 4)
  const xa = Math.max(0, rx), xb = Math.min(w, rx + rw)
  for (let y = Math.max(0, ry); y < Math.min(h, ry + rh) && xb > xa; y++) out.set(data.subarray((y * w + xa) * 4, (y * w + xb) * 4), ((y - ry) * rw + xa - rx) * 4)
  const kx = box[2] / w, ky = box[3] / h
  return { img: { width: rw, height: rh, data: out }, box: [box[0] + rx * kx, box[1] + ry * ky, rw * kx, rh * ky] }
}

/**
 * A whole piece picture turned: `pad` px larger on every side, the picture as it is outside the region the pose
 * changes, warped inside it. Pure; the raw fill and ink go through here (`smooth` off: key colours never blend).
 */
export function turnPicture (img, box, field, pose, pad, smooth = true) {
  const { width: w, height: h, data } = img
  const W = w + 2 * pad, H = h + 2 * pad
  const out = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < h; y++) out.set(data.subarray(y * w * 4, (y + 1) * w * 4), ((y + pad) * W + pad) * 4)
  const rect = regionOf(box, [w, h], field, pose, pad)
  if (rect) {
    const part = cropOf(img, box, rect)
    const warped = warpPixels(part.img, part.box, field, pose, 0, smooth)
    for (let y = 0; y < rect[3]; y++) out.set(warped.data.subarray(y * rect[2] * 4, (y + 1) * rect[2] * 4), ((rect[1] + pad + y) * W + rect[0] + pad) * 4)
  }
  return { width: W, height: H, data: out }
}

/** A box grown by `pad` picture px on every side, in canvas px. */
export const grownBox = (box, w, h, pad) => {
  const kx = box[2] / w, ky = box[3] / h
  return [box[0] - pad * kx, box[1] - pad * ky, box[2] + 2 * pad * kx, box[3] + 2 * pad * ky]
}

/** A "yes" nod for the play button: two dips, the second smaller, back to where the head was. `t` 0..1, `from` the
 *  pose it starts and ends in. */
export function nodAt (t, from = { turn: 0, nod: 0 }) {
  const u = Math.max(0, Math.min(1, t))
  const dip = Math.sin(Math.PI * 2 * u) ** 2 * (u < 0.5 ? 0.8 : 0.5)
  return { turn: clamp1(from.turn), nod: clamp1(clamp1(from.nod) + dip) }
}
