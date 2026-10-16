/**
 * Split scene: one scene shown as two to four comic panels, with a white gutter between them and a
 * thin ink line on each panel's inner edges (Bart, 2026-10-16: "instead of horizontal/vertical
 * there are more options ... like 3 rows, 3 columns").
 *
 * Data: scene.config.split = { layout, at: [...] }. `layout` names the arrangement (LAYOUTS),
 * `at` holds one number per divider, each a fraction of the WHOLE stage along its axis (a diagonal
 * holds where its line meets the top and the bottom). The panels are shots[0..n-1], each with its
 * own backdrop, figures, camera and focus. The first version stored { dir: 'h'|'v', at: number }:
 * that still reads, as 'rows2' and 'cols2', so a scene made then renders exactly as it did.
 *
 * Without config.split a scene is Standard (the layered ParallaxScene). The retired view modes
 * (config.slideshow_mode 'parallax' / 'drawing', config.parallax) read as Standard.
 *
 * Pure maths only; SplitStage.js is the DOM. Mirrors App\Services\Support\SceneSplit on the server.
 */

/** Everything is measured at this stage width and scaled with the stage. */
export const REF_WIDTH = 1920
/** White gutter between the panels, px at REF_WIDTH. */
export const GUTTER_REF = 10
/** Never a thinner gutter than this: on a phone the white must still read as a gap. */
export const GUTTER_MIN_PX = 4
/** Ink line on each panel edge, px at REF_WIDTH. */
export const INK_REF = 2
/** Below this stage width side-by-side columns stack, so no panel is too thin to read. */
export const NARROW_PX = 640
/** No panel narrower or shorter than this share of the stage. */
export const MIN_SHARE = 0.2
/** Within this of a divider's default, a dragged divider settles on it. */

const third = 1 / 3
/**
 * Every arrangement, in the order the picker shows them. `panes` is how many panels it has, `at`
 * its dividers' defaults, `ordered` that its dividers run along one axis and may not cross.
 */
export const LAYOUTS = {
  rows2: { panes: 2, at: [0.5] },
  cols2: { panes: 2, at: [0.5] },
  diag: { panes: 2, at: [0.6, 0.4] },
  l1r2: { panes: 3, at: [0.5, 0.5] },
  rows3: { panes: 3, at: [third, 2 * third], ordered: true },
  cols3: { panes: 3, at: [third, 2 * third], ordered: true },
  l2r1: { panes: 3, at: [0.5, 0.5] },
  t1b2: { panes: 3, at: [0.5, 0.5] },
  grid4: { panes: 4, at: [0.5, 0.5] },
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const round3 = (v) => Math.round(v * 1000) / 1000

/** Dividers of an ordered layout keep MIN_SHARE from the edges and from each other. */
function clampAt (layout, at) {
  const def = LAYOUTS[layout]
  const out = def.at.map((d, k) => {
    const n = Number(at?.[k])
    return clamp(Number.isFinite(n) ? n : d, MIN_SHARE, 1 - MIN_SHARE)
  })
  if (def.ordered) {
    out[0] = clamp(out[0], MIN_SHARE, 1 - 2 * MIN_SHARE)
    out[1] = clamp(out[1], out[0] + MIN_SHARE, 1 - MIN_SHARE)
  }

  return out.map(round3)
}

/** config.split as stored → { layout, at } or null (not a split scene). Reads the old { dir, at }. */
export function normalizeSplit (raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const layout = LAYOUTS[raw.layout] ? raw.layout : (raw.dir === 'v' ? 'cols2' : 'rows2')
  const at = Array.isArray(raw.at) ? raw.at : [raw.at]

  return { layout, at: clampAt(layout, at) }
}

/** How many panels a split has (0 when it is no split). */
export function paneCount (split) {
  const s = normalizeSplit(split)
  return s ? LAYOUTS[s.layout].panes : 0
}

/** The scene's view mode: 'split' or 'standard'. Every older mode (parallax, drawing) is standard. */
export function sceneMode (config) {
  return normalizeSplit(config?.split) ? 'split' : 'standard'
}

/** Gutter and ink line in real px for a stage this wide. */
export function splitStrokes (stageW) {
  const k = (Number(stageW) || REF_WIDTH) / REF_WIDTH

  return { gutter: Math.max(GUTTER_MIN_PX, GUTTER_REF * k), ink: Math.max(1, INK_REF * k) }
}

/** Cut [start, start+size) at the absolute coordinate `cut`, leaving a gutter g: two spans. */
const cut = (start, size, at, g) => {
  const a = Math.max(0, at - start - g / 2)
  return [[start, a], [start + a + g, Math.max(0, size - a - g)]]
}
const box = ([x, w], [y, h]) => ({ x, y, w, h })

/**
 * The panels and dividers of a split on a W×H stage. Full bleed on the outer edges (as the
 * reference page), a gutter between panels. Columns stack on a narrow stage.
 *
 * A rectangle panel is {x, y, w, h}. A diagonal panel covers the whole stage and carries `clip`, its
 * polygon. A divider is { k, orient: 'h'|'v'|'d', x, y, w, h } for a straight one (its gutter), or
 * { k, orient: 'd', x0, y0, x1, y1 } for the diagonal (its centre line).
 *
 * @returns {{layout: string, gutter: number, ink: number, panels: object[], dividers: object[]}|null}
 */
export function splitLayout (split, W, H) {
  const s = normalizeSplit(split)
  if (!s || !(W > 0) || !(H > 0)) return null
  let layout = s.layout
  if (W < NARROW_PX && (layout === 'cols2' || layout === 'cols3')) layout = layout === 'cols2' ? 'rows2' : 'rows3'
  const { gutter: g, ink } = splitStrokes(W)
  const [a, b] = s.at
  const X = [0, W]
  const Y = [0, H]
  const hDiv = (k, y, [x, w]) => ({ k, orient: 'h', x, y: y - g / 2, w, h: g })
  const vDiv = (k, x, [y, h]) => ({ k, orient: 'v', x: x - g / 2, y, w: g, h })
  let panels
  let dividers

  switch (layout) {
    case 'rows2': {
      const [t, u] = cut(0, H, a * H, g)
      panels = [box(X, t), box(X, u)]
      dividers = [hDiv(0, a * H, X)]
      break
    }
    case 'cols2': {
      const [l, r] = cut(0, W, a * W, g)
      panels = [box(l, Y), box(r, Y)]
      dividers = [vDiv(0, a * W, Y)]
      break
    }
    case 'rows3': {
      const [t, rest] = cut(0, H, a * H, g)
      const [m, u] = cut(rest[0], rest[1], b * H, g)
      panels = [box(X, t), box(X, m), box(X, u)]
      dividers = [hDiv(0, a * H, X), hDiv(1, b * H, X)]
      break
    }
    case 'cols3': {
      const [l, rest] = cut(0, W, a * W, g)
      const [m, r] = cut(rest[0], rest[1], b * W, g)
      panels = [box(l, Y), box(m, Y), box(r, Y)]
      dividers = [vDiv(0, a * W, Y), vDiv(1, b * W, Y)]
      break
    }
    case 'l1r2': {
      const [l, r] = cut(0, W, a * W, g)
      const [t, u] = cut(0, H, b * H, g)
      panels = [box(l, Y), box(r, t), box(r, u)]
      dividers = [vDiv(0, a * W, Y), hDiv(1, b * H, r)]
      break
    }
    case 'l2r1': {
      const [l, r] = cut(0, W, a * W, g)
      const [t, u] = cut(0, H, b * H, g)
      panels = [box(l, t), box(l, u), box(r, Y)]
      dividers = [vDiv(0, a * W, Y), hDiv(1, b * H, l)]
      break
    }
    case 't1b2': {
      const [t, u] = cut(0, H, a * H, g)
      const [l, r] = cut(0, W, b * W, g)
      panels = [box(X, t), box(l, u), box(r, u)]
      dividers = [hDiv(0, a * H, X), vDiv(1, b * W, u)]
      break
    }
    case 'grid4': {
      const [l, r] = cut(0, W, a * W, g)
      const [t, u] = cut(0, H, b * H, g)
      panels = [box(l, t), box(r, t), box(l, u), box(r, u)]
      dividers = [vDiv(0, a * W, Y), hDiv(1, b * H, X)]
      break
    }
    case 'diag': {
      // The line runs from a·W on the top edge to b·W on the bottom; the gutter is measured across.
      const [ta, bb] = [a * W, b * W]
      const half = g / 2
      panels = [
        { x: 0, y: 0, w: W, h: H, clip: [[0, 0], [ta - half, 0], [bb - half, H], [0, H]] },
        { x: 0, y: 0, w: W, h: H, clip: [[ta + half, 0], [W, 0], [W, H], [bb + half, H]] },
      ]
      dividers = [{ k: 0, orient: 'd', x0: ta, y0: 0, x1: bb, y1: H }]
      break
    }
  }

  return { layout, gutter: g, ink, panels, dividers }
}

/**
 * A divider dragged to the pointer (px, py, in the stage) → the split with that divider moved,
 * clamped, its neighbours respected. A diagonal moves as a whole: dx shifts both of its ends.
 */
export function moveDivider (split, k, px, py, W, H, { dx = 0 } = {}) {
  const s = normalizeSplit(split)
  if (!s || !(W > 0) || !(H > 0)) return s
  const lay = splitLayout(s, W, H)
  const div = lay?.dividers.find(d => d.k === k)
  if (!div) return s
  const at = [...s.at]
  if (div.orient === 'd') {
    const shift = clamp(dx / W, MIN_SHARE - Math.min(at[0], at[1]), 1 - MIN_SHARE - Math.max(at[0], at[1]))
    at[0] += shift
    at[1] += shift
  } else {
    const v = div.orient === 'v' ? px / W : py / H
    const def = LAYOUTS[s.layout].at[k]
    at[k] = Math.abs(v - def) < AT_SNAP ? def : v
  }

  return { layout: s.layout, at: clampAt(s.layout, at) }
}

/** One divider stepped by `step` (the arrow keys), for a diagonal both ends together. */
export function stepDivider (split, k, step) {
  const s = normalizeSplit(split)
  if (!s) return s
  const at = [...s.at]
  if (s.layout === 'diag') { at[0] += step; at[1] += step } else at[k] += step

  return { layout: s.layout, at: clampAt(s.layout, at) }
}

/** A panel's focus point as CSS object-position ('50% 50%' when unset). x/y are 0..100. */
export function focusPosition (focus) {
  const pct = (v) => {
    const n = Number(v)
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 50
  }

  return `${pct(focus?.x)}% ${pct(focus?.y)}%`
}

/** How far a panel's picture zooms in (1 = the plain cover crop). Same range as SceneSplit::ZOOM. */
export const ZOOM_MIN = 1
export const ZOOM_MAX = 4
/** Within this of the middle, a dragged divider settles on it. */
const AT_SNAP = 0.015
/** Wheel delta → zoom factor: one notch (~100) is about 16%. */
const WHEEL_RATE = 0.0015


/** A panel's focus as stored → { x, y, zoom }: x/y 0..100 (50 when unset), zoom 1..4. */
export function normalizeFocus (focus) {
  const pct = (v) => (Number.isFinite(Number(v)) && v !== null ? clamp(Number(v), 0, 100) : 50)
  const z = Number(focus?.zoom)

  return { x: pct(focus?.x), y: pct(focus?.y), zoom: Number.isFinite(z) ? clamp(z, ZOOM_MIN, ZOOM_MAX) : 1 }
}

/**
 * A pane dragged by (dx, dy) px in a w×h box → its new focus. The picture follows the pointer: a
 * drag to the right shows more of its left, so x goes DOWN. A drag across the whole box moves the
 * focus from one edge to the other.
 */
export function panFocus (focus, dx, dy, w, h) {
  const f = { x: 50, y: 50, ...(focus || {}) }
  const round = (v) => Math.round(v * 10) / 10
  const next = { ...f, x: round(clamp(f.x - (w > 0 ? dx / w * 100 : 0), 0, 100)), y: round(clamp(f.y - (h > 0 ? dy / h * 100 : 0), 0, 100)) }

  return next
}

/** The zoom after one wheel event: wheel up (negative delta) zooms in. */
export function wheelZoom (zoom, deltaY) {
  const z = (Number(zoom) || 1) * Math.exp(-(Number(deltaY) || 0) * WHEEL_RATE)

  return Math.round(clamp(z, ZOOM_MIN, ZOOM_MAX) * 1000) / 1000
}

/**
 * Which panel says a line: the one it was put in (line.panel, the editor's), else the one holding
 * its figure; off-frame lines go to the first panel.
 */
export function panelForLine (line, panelLayers) {
  if (Number.isInteger(line?.panel) && line.panel >= 0 && line.panel < panelLayers.length) return line.panel
  const id = line?.figure?.asset_id
  if (id == null) return 0
  const i = panelLayers.findIndex(layers => (layers || []).some(l => l?.asset_id === id))

  return i < 0 ? 0 : i
}
