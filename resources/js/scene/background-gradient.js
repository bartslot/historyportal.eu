/**
 * A scene background gradient: { from: '#rrggbb', to: '#rrggbb', angle: degrees }.
 *
 * The angle is CSS's (0 = bottom to top, 90 = left to right, 180 = top to bottom), so the player's
 * CSS and the editor stage's canvas texture draw the same thing. The player uses gradientCss(); the
 * stage paints gradientCanvas() into a THREE.CanvasTexture.
 */

const HEX = /^#[0-9a-f]{6}$/i

/** A usable gradient, or null. Anything malformed is treated as "no gradient". */
export function normalizeGradient(g) {
  if (!g || !HEX.test(g.from ?? '') || !HEX.test(g.to ?? '')) return null
  const angle = ((Number(g.angle) % 360) + 360) % 360
  return { from: g.from, to: g.to, angle: Number.isFinite(angle) ? angle : 180 }
}

export function gradientCss(g) {
  const n = normalizeGradient(g)
  return n ? `linear-gradient(${n.angle}deg, ${n.from}, ${n.to})` : ''
}

/**
 * The gradient line for a w×h box, as CSS defines it: through the centre at `angle`, long enough
 * that its end points' perpendiculars touch the box's corners.
 */
export function gradientLine(angle, w, h) {
  const rad = (angle * Math.PI) / 180
  const dx = Math.sin(rad)
  const dy = -Math.cos(rad)
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2
  const cx = w / 2
  const cy = h / 2
  return { x0: cx - dx * half, y0: cy - dy * half, x1: cx + dx * half, y1: cy + dy * half }
}

export function gradientCanvas(g, w = 1024, h = 576) {
  const n = normalizeGradient(g)
  if (!n) return null
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const { x0, y0, x1, y1 } = gradientLine(n.angle, w, h)
  const fill = ctx.createLinearGradient(x0, y0, x1, y1)
  fill.addColorStop(0, n.from)
  fill.addColorStop(1, n.to)
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, w, h)
  return canvas
}
