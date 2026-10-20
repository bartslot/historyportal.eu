/**
 * A painted title poster (fit: 'cover': the Comic banner, the Comic cover) held upright, derived
 * from its own assets when the candidate has no portrait.json of its own. Fitting the landscape
 * frame into a phone left the picture in the top half over a flat fill (PM, 2026-10-17, W24VRI).
 * Here the picture (the poster's own, or the teacher's) fills a tall frame of the view's shape,
 * slid so its subject is in the middle, and the title block (letters, ribbons, series line,
 * subtitle) is scaled as one drawing across the width, low on the screen. A single line of
 * letters is set in two rows first, so it can be larger. No new art: every layer is the same file.
 */

export const UPRIGHT = {
  w: 1000,             // the derived frame's width, in its own units
  gutterPx: 16,        // clear each side of the title block, in view px (PHONE_GUTTER_PX)
  blockBottom: 0.8,    // the title block ends here (share of the height), clear of the Start bar
  maxBlockH: 0.45,     // the block never takes more of the height than this
  restackAspect: 2.5,  // a block wider than this many times its height is one line: two rows
  rowGap: 0.12,        // between the two rows, a share of the letters' height
}

const SUBJECT_KINDS = ['figure', 'face', 'subject']

const asBox = (b) => (Array.isArray(b) ? { x: b[0], y: b[1], w: b[2], h: b[3] } : b)
const isFull = (b) => b.x <= 0 && b.y <= 0 && b.x + b.w >= 100 && b.y + b.h >= 100
const union = (bs) => {
  const x = Math.min(...bs.map(b => b.x))
  const y = Math.min(...bs.map(b => b.y))
  return { x, y, w: Math.max(...bs.map(b => b.x + b.w)) - x, h: Math.max(...bs.map(b => b.y + b.h)) - y }
}
const shift = (b, dx, dy) => ({ ...b, x: b.x + dx, y: b.y + dy })
const toPx = (b, f) => ({ x: b.x / 100 * f.w, y: b.y / 100 * f.h, w: b.w / 100 * f.w, h: b.h / 100 * f.h })

/** The subject's middle as a share (0..1) of the picture's width: weighted keep_clear, else the middle. */
function subjectX (entries, toPicture) {
  const subjects = (entries ?? []).filter(k => SUBJECT_KINDS.includes(k.kind))
  if (!subjects.length) return 0.5
  let sum = 0
  let total = 0
  for (const k of subjects) {
    const b = asBox(k.box)
    const w = k.weight ?? 1
    sum += toPicture(b.x + b.w / 2) * w
    total += w
  }
  return total > 0 ? sum / total : 0.5
}

/**
 * One line of dropped letters as two rows, split at the widest gap (between the words), each
 * centred on the line's middle; what stood under the line moves down with the second row.
 * Boxes in px of the landscape frame, keyed; returns new boxes and the two rows, or null.
 */
function restack (boxes, dropIds) {
  const drops = dropIds.map(id => ({ id, b: boxes.get(id) })).sort((p, q) => p.b.x - q.b.x)
  const line = union(drops.map(d => d.b))
  const oneLine = Math.max(...drops.map(d => d.b.y)) < Math.min(...drops.map(d => d.b.y + d.b.h))
  if (drops.length < 4 || !oneLine) return null
  let at = 1
  for (let i = 1; i < drops.length; i++) {
    const gap = drops[i].b.x - (drops[i - 1].b.x + drops[i - 1].b.w)
    if (gap > drops[at].b.x - (drops[at - 1].b.x + drops[at - 1].b.w)) at = i
  }
  const rows = [drops.slice(0, at), drops.slice(at)]
  const cx = line.x + line.w / 2
  const dy = line.h * (1 + UPRIGHT.rowGap)
  const out = new Map(boxes)
  rows.forEach((row, r) => {
    const u = union(row.map(d => d.b))
    for (const d of row) out.set(d.id, shift(d.b, cx - (u.x + u.w / 2), r * dy))
  })
  for (const [key, b] of boxes) {
    if (!dropIds.includes(key) && b.y + b.h / 2 > line.y + line.h) out.set(key, shift(b, 0, dy))
  }
  return { boxes: out, rows: rows.map(row => row.map(d => d.id)) }
}

/**
 * Pure: the upright variant of a painted poster for a view of viewW x viewH.
 *
 * @param {object} poster a parsed candidate (TitlePoster::for) with fit 'cover'
 * @param {Array} [pictureKeepClear] the teacher's picture's own keep_clear (% of that picture)
 */
export function uprightCover (poster, viewW, viewH, pictureKeepClear = null) {
  const f = poster.frame
  const W = UPRIGHT.w
  const H = Math.ceil(W * Math.max(viewH / viewW, 1))
  const pictures = poster.layers.filter(l => isFull(l.box))
  const titled = poster.layers.filter(l => !isFull(l.box))

  // The title block, in px of the landscape frame (restacked when it is one long line).
  let boxes = new Map(titled.map(l => [l.id, toPx(l.box, f)]))
  if (poster.subtitle?.box) boxes.set('\u0000subtitle', toPx(poster.subtitle.box, f))
  const first = union([...boxes.values()])
  const stacked = first.w / first.h > UPRIGHT.restackAspect
    ? restack(boxes, titled.filter(l => l.enter === 'drop').map(l => l.id))
    : null
  if (stacked) boxes = stacked.boxes
  const block = union([...boxes.values()])
  const s = Math.min(W * (1 - 2 * UPRIGHT.gutterPx / viewW) / block.w, H * UPRIGHT.maxBlockH / block.h)
  const left = (W - block.w * s) / 2
  const top = H * UPRIGHT.blockBottom - block.h * s
  const fromBlock = (b) => ({
    x: (left + (b.x - block.x) * s) / W * 100,
    y: (top + (b.y - block.y) * s) / H * 100,
    w: b.w * s / W * 100,
    h: b.h * s / H * 100,
  })

  // The picture: as tall as the frame (its own overhang kept), its own shape, the subject centred.
  const pic = pictures[0]?.box
  const picBox = (b) => {
    const h = b.h
    const w = h / 100 * H * (b.w * f.w) / (b.h * f.h) / W * 100
    const own = pictureKeepClear?.some(k => SUBJECT_KINDS.includes(k.kind))
    const sx = own
      ? subjectX(pictureKeepClear, x => x / 100)
      : subjectX(poster.keep_clear, x => (x - b.x) / b.w)
    const x = Math.min(0, Math.max(100 - w, 50 - sx * w))
    return { x, y: b.y, w, h }
  }
  const upPic = pic ? picBox(pic) : null
  const fromPicture = (b) => ({
    x: upPic.x + (b.x - pic.x) / pic.w * upPic.w,
    y: upPic.y + (b.y - pic.y) / pic.h * upPic.h,
    w: b.w / pic.w * upPic.w,
    h: b.h / pic.h * upPic.h,
  })

  const layers = poster.layers.map(l => (isFull(l.box) ? { ...l, box: picBox(l.box) } : { ...l, box: fromBlock(boxes.get(l.id)) }))
  const lettersClear = stacked
    ? [...stacked.rows.map(ids => union(ids.map(id => boxes.get(id)))),
        ...titled.filter(l => l.enter !== 'drop').map(l => boxes.get(l.id))].map(b => ({ kind: 'letters', box: fromBlock(b), weight: null }))
    : (poster.keep_clear ?? []).filter(k => k.kind === 'letters').map(k => ({ ...k, box: fromBlock(toPx(asBox(k.box), f)) }))
  const pictureClear = upPic
    ? (poster.keep_clear ?? []).filter(k => k.kind !== 'letters').map(k => ({ ...k, box: fromPicture(asBox(k.box)) }))
    : []
  const groups = Object.fromEntries(Object.entries(poster.groups ?? {}).map(([key, g]) => [key, {
    ...g,
    ...(g.box ? { box: fromBlock(toPx(g.box, f)) } : {}),
    ...(g.shadow ? { shadow: { ...g.shadow, x: g.shadow.x * s, y: g.shadow.y * s } } : {}),
  }]))

  return {
    ...poster,
    frame: { w: W, h: H },
    layers,
    groups,
    focus: fromBlock(block),
    keep_clear: [...lettersClear, ...pictureClear],
    background_bottom: null,
    subtitle: poster.subtitle
      ? { ...poster.subtitle, box: fromBlock(boxes.get('\u0000subtitle')), size: poster.subtitle.size / 100 * f.w * s / W * 100 }
      : poster.subtitle,
    upright: true,
  }
}
