/**
 * arrow-shape: a vector arrow on the stage, as plain geometry. The editor and the player both draw
 * an arrow layer from here (ArtworkOverlay), so the two can never disagree about its shape.
 *
 * An arrow is a start point (the layer's x / y), an end point (end_x / end_y), a bend, a shaft
 * width and a head size. Every value is a share of the stage, the same units as a layer's x / y:
 * positions in % of the stage, and the shaft and head as % of the stage HEIGHT, so an arrow keeps
 * its proportions on any screen. The bend is the sag of the curve as a share of its length
 * (balloon-shape.js does the same for the speech tail): 0 is straight, the sign picks the side.
 *
 * Geometry is worked in "stage units": x in % of the width times the aspect (w / h), y in %, so
 * one unit is the same length in both directions. The SVG viewBox is 100 * aspect by 100 for the
 * same reason.
 */

/** The two looks: a thin ink line with an open chevron, or a thick shaft with a solid head. */
export const ARROW_STYLES = ['block', 'stroke']

/** Where a new arrow starts: horizontal, pointing right, across the middle of the stage. */
export const ARROW_DEFAULTS = {
  x: 30, y: 50, end_x: 70, end_y: 50, bend: 0, shaft: 1.2, head: 5.5, arrow_style: 'stroke',
}

/** The largest bend a teacher can drag to: past this the curve folds back on itself. */
export const MAX_BEND = 0.5

/** The bounds every arrow value is clamped to, on the canvas and on the server alike. */
export const ARROW_LIMITS = {
  end_x: [0, 100],
  end_y: [0, 100],
  bend: [-MAX_BEND, MAX_BEND],
  shaft: [0.2, 6],
  head: [1, 20],
}

/** The arrow properties a keyframe can move (the start point is the layer's own x / y). */
export const ARROW_KEYS = ['end_x', 'end_y', 'bend', 'shaft', 'head']

/**
 * The library arrows that have a vector form. Any other arrow picture (dashed, double, elbow,
 * loop) stays a picture layer, as it always was.
 */
export const ARROW_PRESETS = {
  'arrow-straight': { arrow_style: 'stroke', bend: 0 },
  'arrow-curved': { arrow_style: 'stroke', bend: 0.22 },
  'arrow-block': { arrow_style: 'block', bend: 0 },
}

/** The head's arms open this far from the shaft: 30 degrees each side. */
const HEAD_ARM = Math.PI / 6
/** A block arrow's shaft is this many times as thick as a line arrow's. */
const BLOCK_SHAFT_FACTOR = 2
/**
 * The width handle sits this far beyond the shaft's edge, so it never covers the bend handle on the
 * same spot: a thin arrow has no room for the two dots otherwise. Stage units, like the shaft.
 */
export const SHAFT_HANDLE_GAP = 4

const num = (v, fallback) => (Number.isFinite(v) ? v : fallback)
const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v))

/**
 * The arrow's values with defaults filled in and every bound applied. A layer saved before any of
 * these keys existed reads as the default arrow, and no stored value can leave the bounds.
 */
export function arrowParams (a = {}) {
  return {
    x: num(a.x, ARROW_DEFAULTS.x),
    y: num(a.y, ARROW_DEFAULTS.y),
    end_x: clamp(num(a.end_x, ARROW_DEFAULTS.end_x), ARROW_LIMITS.end_x),
    end_y: clamp(num(a.end_y, ARROW_DEFAULTS.end_y), ARROW_LIMITS.end_y),
    bend: clamp(num(a.bend, ARROW_DEFAULTS.bend), ARROW_LIMITS.bend),
    shaft: clamp(num(a.shaft, ARROW_DEFAULTS.shaft), ARROW_LIMITS.shaft),
    head: clamp(num(a.head, ARROW_DEFAULTS.head), ARROW_LIMITS.head),
    arrow_style: ARROW_STYLES.includes(a.arrow_style) ? a.arrow_style : ARROW_DEFAULTS.arrow_style,
  }
}

/** Half the shaft's drawn width, in stage units: a block shaft is thicker than a line. */
export function halfShaft (p) {
  return p.arrow_style === 'block' ? p.shaft * BLOCK_SHAFT_FACTOR / 2 : p.shaft / 2
}

/**
 * The arrow's geometry in stage units. Every point is [x, y] with x already times the aspect.
 *
 * The curve is a quadratic Bezier from start to end with its control point off the chord's middle.
 * Its midpoint sits `bend * length` off the chord, which is what the bend means. The head is
 * drawn at the end, its tangent taken from the curve, so a bent arrow points where it is going.
 */
export function arrowFrame (a, aspect = 16 / 9) {
  const p = arrowParams(a)
  const start = [p.x * aspect, p.y]
  const end = [p.end_x * aspect, p.end_y]
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const length = Math.hypot(dx, dy) || 1e-6
  const normal = [-dy / length, dx / length]
  const mid = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]
  const sag = p.bend * length
  const control = [mid[0] + normal[0] * 2 * sag, mid[1] + normal[1] * 2 * sag]
  const curveMid = [mid[0] + normal[0] * sag, mid[1] + normal[1] * sag]

  // Tangent at the end runs from the control point to the end point.
  const tx = end[0] - control[0]
  const ty = end[1] - control[1]
  const tl = Math.hypot(tx, ty) || length
  const back = [-tx / tl, -ty / tl]
  const arm = (angle) => {
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    const bx = back[0] * c - back[1] * s
    const by = back[0] * s + back[1] * c
    return [end[0] + bx * p.head, end[1] + by * p.head]
  }

  return {
    p,
    start,
    end,
    control,
    curveMid,
    normal,
    length,
    armA: arm(HEAD_ARM),
    armB: arm(-HEAD_ARM),
    tangent: [-back[0], -back[1]],
  }
}

const f = (n) => Math.round(n * 1000) / 1000
const pt = ([x, y]) => `${f(x)} ${f(y)}`

/**
 * The SVG for one arrow: the shaft and the head as path data, the stroke width of the shaft, and
 * the viewBox. Pure, so the path maths is testable without a DOM.
 *
 * @returns {{ viewBox: string, shaft: string, head: string, width: number, fill: boolean }}
 *   fill: the head is a solid triangle (block) rather than an open chevron (stroke)
 */
export function arrowPaths (a, aspect = 16 / 9) {
  const g = arrowFrame(a, aspect)
  const block = g.p.arrow_style === 'block'
  const shaft = `M ${pt(g.start)} Q ${pt(g.control)} ${pt(g.end)}`
  const head = block
    ? `M ${pt(g.armA)} L ${pt(g.end)} L ${pt(g.armB)} Z`
    : `M ${pt(g.armA)} L ${pt(g.end)} L ${pt(g.armB)}`
  return {
    viewBox: `0 0 ${f(100 * aspect)} 100`,
    shaft,
    head,
    width: block ? g.p.shaft * BLOCK_SHAFT_FACTOR : g.p.shaft,
    fill: block,
  }
}

/**
 * Where the five handles sit, in % of the stage, so the canvas can place them and hit-test them.
 * start / end: the two dots. bend: the middle of the curve. shaft: beside the shaft, its half width
 * and a gap out from the middle. head: the head's back corner on the top arm.
 *
 * @returns {Record<'start'|'end'|'bend'|'shaft'|'head', [number, number]>}
 */
export function arrowHandles (a, aspect = 16 / 9) {
  const g = arrowFrame(a, aspect)
  const toPct = ([x, y]) => [x / aspect, y]
  const side = halfShaft(g.p)
  return {
    start: toPct(g.start),
    end: toPct(g.end),
    bend: toPct(g.curveMid),
    shaft: toPct([g.curveMid[0] + g.normal[0] * (side + SHAFT_HANDLE_GAP), g.curveMid[1] + g.normal[1] * (side + SHAFT_HANDLE_GAP)]),
    head: toPct(g.armA),
  }
}

/**
 * The bend that puts the curve through a point (in %): the signed sag of the point off the chord,
 * as a share of the chord's length, clamped. Dragging the bend handle to a point bends the arrow
 * through it.
 */
export function bendFromPoint (a, [px, py], aspect = 16 / 9) {
  const g = arrowFrame({ ...a, bend: 0 }, aspect)
  const mid = [(g.start[0] + g.end[0]) / 2, (g.start[1] + g.end[1]) / 2]
  const sag = (px * aspect - mid[0]) * g.normal[0] + (py - mid[1]) * g.normal[1]
  return clamp(sag / g.length, ARROW_LIMITS.bend)
}

/** The shaft width that puts the shaft's edge under a point (in %), from the curve's middle. */
export function shaftFromPoint (a, [px, py], aspect = 16 / 9) {
  const g = arrowFrame(a, aspect)
  const edge = (px * aspect - g.curveMid[0]) * g.normal[0] + (py - g.curveMid[1]) * g.normal[1]
  const half = Math.max(0, Math.abs(edge) - SHAFT_HANDLE_GAP)
  const shaft = g.p.arrow_style === 'block' ? half / BLOCK_SHAFT_FACTOR : half * 2
  return clamp(shaft, ARROW_LIMITS.shaft)
}

/** The head length that puts the arm's end under a point (in %): its distance from the tip. */
export function headFromPoint (a, [px, py], aspect = 16 / 9) {
  const g = arrowFrame(a, aspect)
  return clamp(Math.hypot(px * aspect - g.end[0], py - g.end[1]), ARROW_LIMITS.head)
}
