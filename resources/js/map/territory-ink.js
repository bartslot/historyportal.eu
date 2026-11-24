/**
 * territory-ink.js — the linked territory drawn by hand, laid into the map under its names.
 *
 * Bart, 2026-11-23, on a vector line with hatching over the whole area: "it's too much", "maybe
 * etched in the middle should be faded out and more natural", "like only the edges have it. can we
 * make the lines more drawn?". A map style cannot do either: a line layer has one width and no
 * wobble, and nothing in a style can fade a pattern by distance from a border. A canvas can:
 *
 *  - the BORDER is stroked in short pieces whose width and position breathe with a noise tied to the
 *    ground (lng/lat), so it reads as a pen line and holds still while the map pans;
 *  - the ETCHING is hand-drawn hatch strokes, kept to a band along the inside of the border and
 *    fading towards the middle: the border is stroked wide (three widths, one over the other) INSIDE
 *    a clip to the territory, and the hatching is painted through that mask.
 *
 * The drawing happens on a 2D canvas, but that canvas is not laid over the map: it is handed to the
 * map as a layer of its own, just under the route and every name (Bart, 2026-11-24, on Lesson 129:
 * "the text is over the venice label" -- a canvas on top of the map inked straight through the
 * hand-lettered stop names and the city labels). Inside the map it is drawn in the map's own frame,
 * so it also never trails a pan.
 *
 * The shapes come from the same vector tiles the map draws (querySourceFeatures). A tile hands back
 * its part of the territory cut at the tile's edge, so a cut edge is not a border: a segment that
 * runs along the outside of the tile is filled but never inked.
 */

import { signedField, blendFields, zeroContours, morphProgress } from './territory-morph.js'

/** Smooth value noise on the plane, 0..1: the pen's wobble and pressure, the same everywhere for the same spot. */
const hash = (x, y) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
const smooth = (t) => t * t * (3 - 2 * t)
export const noise2 = (x, y) => {
  const xi = Math.floor(x); const yi = Math.floor(y)
  const xf = smooth(x - xi); const yf = smooth(y - yi)
  const a = hash(xi, yi); const b = hash(xi + 1, yi); const c = hash(xi, yi + 1); const d = hash(xi + 1, yi + 1)
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf
}

/** Tile units (0..extent) of tile z/x/y to [lng, lat]. */
export const tileToLngLat = (px, py, z, x, y, extent) => {
  const n = 2 ** z
  const lng = ((x + px / extent) / n) * 360 - 180
  const my = Math.PI * (1 - (2 * (y + py / extent)) / n)
  const lat = (Math.atan(Math.sinh(my)) * 180) / Math.PI
  return [lng, lat]
}

/**
 * Is a segment a cut the tile made rather than a border? Both ends past the same edge of the tile
 * (they lie in the tile's buffer, where the clipper puts its cut).
 */
export const isTileCut = (a, b, extent) => (a.x <= 0 && b.x <= 0) || (a.x >= extent && b.x >= extent)
  || (a.y <= 0 && b.y <= 0) || (a.y >= extent && b.y >= extent)

/**
 * The part of a segment that lies inside the tile's own square (Liang-Barsky), or null.
 *
 * Neighbouring tiles both carry the border through their shared buffer, so inked as given the line
 * ran twice along every tile seam: darker there, and shimmering as the seams moved under a pan.
 * Cut to the square, each tile inks only its own stretch and the pieces meet end to end.
 */
export const clipToTile = (a, b, extent) => {
  let t0 = 0; let t1 = 1
  const dx = b.x - a.x; const dy = b.y - a.y
  for (const [p, q] of [[-dx, a.x], [dx, extent - a.x], [-dy, a.y], [dy, extent - a.y]]) {
    if (p === 0) { if (q < 0) return null; continue }
    const r = q / p
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r } else { if (r < t0) return null; if (r < t1) t1 = r }
  }
  if (t1 - t0 <= 1e-9) return null
  return [{ x: a.x + t0 * dx, y: a.y + t0 * dy }, { x: a.x + t1 * dx, y: a.y + t1 * dy }]
}

/**
 * The territory's parts in tile units, from the most detailed zoom the map has loaded. Lower zooms
 * kept for the cross-fade overlap the same ground and would ink every border twice.
 */
export const territoryParts = (features) => {
  const withTile = (features || []).filter((f) => f && f._vectorTileFeature && Number.isFinite(f._z))
  if (!withTile.length) return []
  const z = Math.max(...withTile.map((f) => f._z))
  const seen = new Set()
  const parts = []
  for (const f of withTile) {
    if (f._z !== z) continue
    const key = `${f._x}/${f._y}/${f.id}`
    if (seen.has(key)) continue   // one part per tile: querySourceFeatures can return a tile's feature twice
    seen.add(key)
    let rings
    try { rings = f._vectorTileFeature.loadGeometry() } catch (_) { continue }
    parts.push({ rings, x: f._x, y: f._y, z: f._z, extent: f._vectorTileFeature.extent || 4096 })
  }
  return parts
}

/**
 * The etched band, as strokes of the border (css px wide, alpha) laid over one another inside the
 * territory: the hatching is strongest along the line and gone about 15 px in.
 */
const BAND = [[30, 0.3], [18, 0.4], [8, 0.7]]

/** A hatch tile: short pen strokes, each its own length, slant and weight. Drawn once per colour. */
const hatchTile = (color, ratio) => {
  const size = 64 * ratio
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  let seed = 11
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const gap = 5.5 * ratio
  for (let i = -size; i < size * 2; i += gap) {
    // One diagonal line across the tile, broken into dashes as a hand breaks it.
    let t = rnd() * 6 * ratio
    while (t < size * 1.5) {
      const len = (6 + rnd() * 14) * ratio
      const x0 = i + t * 0.7; const y0 = size - t * 0.7
      const wob = (rnd() - 0.5) * 1.2 * ratio
      ctx.globalAlpha = 0.55 + rnd() * 0.45
      ctx.lineWidth = (0.6 + rnd() * 0.7) * ratio
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.quadraticCurveTo(x0 + len * 0.35 + wob, y0 - len * 0.35 - wob, x0 + len * 0.7, y0 - len * 0.7)
      ctx.stroke()
      t += len + (2 + rnd() * 6) * ratio
    }
  }
  return c
}

/**
 * Join the border's runs end to end into chains. Each tile inks only its own stretch, so a border
 * that crosses three tiles is three runs; a dash pattern or a wave started over at every seam, which
 * showed as a kink where two tiles meet. Points are matched on the ground (lng/lat), not the screen.
 * A closed chain starts at its westernmost point, so its pattern holds still while the map pans.
 *
 * @param {Array<Array<[number, number, number, number]>>} runs  [x, y, lng, lat] points
 */
export const joinRuns = (runs) => {
  const key = (q) => `${q[2].toFixed(6)},${q[3].toFixed(6)}`
  const left = runs.filter((r) => r.length >= 2).map((r) => r.slice())
  const byStart = new Map()
  left.forEach((r, i) => { const k = key(r[0]); if (!byStart.has(k)) byStart.set(k, i) })
  const used = new Set()
  const hasPredecessor = new Set()
  left.forEach((r, i) => { const j = byStart.get(key(r[r.length - 1])); if (j !== undefined && j !== i) hasPredecessor.add(j) })
  const chains = []
  const follow = (i) => {
    const chain = left[i].slice(); used.add(i)
    for (;;) {
      const j = byStart.get(key(chain[chain.length - 1]))
      if (j === undefined || used.has(j)) break
      used.add(j); chain.push(...left[j].slice(1))
    }
    return chain
  }
  // Open chains first, from their real beginnings; whatever is left is a closed loop.
  left.forEach((_, i) => { if (!used.has(i) && !hasPredecessor.has(i)) chains.push(follow(i)) })
  left.forEach((_, i) => {
    if (used.has(i)) return
    const loop = follow(i)
    const closed = loop.length > 2 && key(loop[0]) === key(loop[loop.length - 1])
    if (!closed) { chains.push(loop); return }
    const body = loop.slice(0, -1)
    let w = 0
    body.forEach((q, k) => { if (q[2] < body[w][2] || (q[2] === body[w][2] && q[3] < body[w][3])) w = k })
    const turned = body.slice(w).concat(body.slice(0, w))
    turned.push(turned[0])
    chains.push(turned)
  })
  return chains
}

/**
 * Each chain cut to `share` of its own length (0..1), from its start: the border drawing on (the timeline's Draw row).
 * Every chain draws at once, so an empire's main border and its islands close together.
 */
export const trimChains = (chains, share) => {
  if (share >= 1) return chains
  if (share <= 0) return []
  return chains.map((chain) => {
    const lens = [0]
    for (let i = 1; i < chain.length; i++) lens.push(lens[i - 1] + Math.hypot(chain[i][0] - chain[i - 1][0], chain[i][1] - chain[i - 1][1]))
    const stop = lens[lens.length - 1] * share
    const out = [chain[0]]
    for (let i = 1; i < chain.length; i++) {
      if (lens[i] <= stop) { out.push(chain[i]); continue }
      const t = (stop - lens[i - 1]) / ((lens[i] - lens[i - 1]) || 1)
      const a = chain[i - 1]; const b = chain[i]
      out.push(a.map((v, k) => v + (b[k] - v) * t))
      break
    }
    return out
  }).filter((c) => c.length >= 2)
}

/**
 * A chain as a wavy line: resampled every `step` px and pushed off along its normal by a sine of the
 * distance travelled. Screen points [x, y] in, screen points out.
 */
export const waveLine = (pts, { amp, wavelength, step }) => {
  if (pts.length < 2) return pts.slice()
  const even = [pts[0]]
  let carry = 0
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]; const [bx, by] = pts[i]
    const len = Math.hypot(bx - ax, by - ay)
    let t = step - carry
    while (t <= len) { even.push([ax + ((bx - ax) * t) / len, ay + ((by - ay) * t) / len]); t += step }
    carry = len - (t - step)
  }
  even.push(pts[pts.length - 1])
  const out = []
  for (let i = 0; i < even.length; i++) {
    const a = even[Math.max(0, i - 2)]; const b = even[Math.min(even.length - 1, i + 2)]
    const tx = b[0] - a[0]; const ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1
    const off = amp * Math.sin((2 * Math.PI * i * step) / wavelength)
    out.push([even[i][0] - (ty / tl) * off, even[i][1] + (tx / tl) * off])
  }
  return out
}

/** A shape's fingerprint: the same record in the same tiles gives the same key, another year's outline another. */
export const partsKey = (parts) => (parts || []).map((p) => `${p.z}/${p.x}/${p.y}:` + p.rings.map((r) => `${r.length}@${r[0]?.x},${r[0]?.y}`).join(';')).join('|')

/** The layer the ink goes under: the voyage route, else the first name or dot on the map. */
export const inkBeforeId = (layers) => {
  const list = layers || []
  if (list.some((l) => l.id === 'lesson-route')) return 'lesson-route'
  return list.find((l) => l.type === 'symbol' || l.type === 'circle')?.id
}

const VERTEX = 'attribute vec2 a_pos; varying vec2 v_uv;'
  + 'void main() { v_uv = vec2((a_pos.x + 1.0) * 0.5, (1.0 - a_pos.y) * 0.5); gl_Position = vec4(a_pos, 0.0, 1.0); }'
const FRAGMENT = 'precision mediump float; uniform sampler2D u_ink; varying vec2 v_uv;'
  + 'void main() { gl_FragColor = texture2D(u_ink, v_uv); }'

/** A full-screen quad that lays a premultiplied canvas into the map's frame. */
const makeQuad = (gl) => {
  const shader = (type, src) => {
    const sh = gl.createShader(type)
    gl.shaderSource(sh, src); gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || 'territory ink shader')
    return sh
  }
  const program = gl.createProgram()
  gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX))
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'territory ink program')
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const aPos = gl.getAttribLocation(program, 'a_pos')
  const uInk = gl.getUniformLocation(program, 'u_ink')
  return {
    draw (canvas) {
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.STENCIL_TEST); gl.disable(gl.CULL_FACE)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.useProgram(program)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      gl.uniform1i(uInk, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.enableVertexAttribArray(aPos)
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      gl.disableVertexAttribArray(aPos)
    },
    destroy () {
      gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program)
    },
  }
}

/**
 * Put a hand-drawn territory into a MapLibre map, under the route and the names.
 *
 * @param {object} map
 * @param {{ features: () => object[], look: () => object, anim: () => {fill:number,border:number} }} source
 */
export function createTerritoryInk (map, source) {
  const canvas = document.createElement('canvas')   // drawn here, then laid into the map by the layer below
  const mask = document.createElement('canvas')
  const inkLayer = document.createElement('canvas')   // the border, drawn opaque, then laid down at its alpha
  let hatch = null
  let hatchKey = ''
  let drewSomething = false
  // The shape a year change starts from (territory-morph.js), and the parts drawn last.
  const MORPH_MS = 900
  let morph = null
  let lastParts = []
  const grid = document.createElement('canvas')

  /** Old and new areas blended `t` of the way, read back as an area and its border loops. */
  const morphShape = (fromArea, toArea, t, ratio) => {
    const cell = 4 * ratio
    const w = Math.max(2, Math.ceil(canvas.width / cell)); const h = Math.max(2, Math.ceil(canvas.height / cell))
    if (grid.width !== w || grid.height !== h) { grid.width = w; grid.height = h }
    const g = grid.getContext('2d', { willReadFrequently: true })
    const maskOf = (path) => {
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h)
      g.setTransform(1 / cell, 0, 0, 1 / cell, 0, 0); g.fillStyle = '#000'; g.fill(path, 'nonzero')
      const data = g.getImageData(0, 0, w, h).data
      const m = new Uint8Array(w * h)
      for (let i = 0; i < w * h; i++) m[i] = data[i * 4 + 3] > 127 ? 1 : 0
      return m
    }
    const field = blendFields(signedField(maskOf(fromArea), w, h), signedField(maskOf(toArea), w, h), t)
    const area = new Path2D()
    const edges = zeroContours(field, w, h).map((loop) => loop.map(([gx, gy], i) => {
      const x = (gx + 0.5) * cell; const y = (gy + 0.5) * cell
      if (i) area.lineTo(x, y); else area.moveTo(x, y)
      const ll = map.unproject([x / ratio, y / ratio])
      return [x, y, ll.lng, ll.lat]
    }))
    return { area, edges }
  }

  const size = () => {
    const ratio = (map.getPixelRatio ? map.getPixelRatio() : 0) || window.devicePixelRatio || 1
    const w = map.getCanvas().clientWidth; const h = map.getCanvas().clientHeight
    for (const c of [canvas, mask, inkLayer]) {
      if (c.width !== Math.round(w * ratio) || c.height !== Math.round(h * ratio)) { c.width = Math.round(w * ratio); c.height = Math.round(h * ratio) }
    }
    return { ratio, w, h }
  }

  const draw = () => {
    const { ratio } = size()
    const ctx = canvas.getContext('2d')
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drewSomething = false
    const look = source.look()
    const anim = source.anim()
    const parts = territoryParts(source.features())

    // Screen paths: the area (every ring, cuts included) and the border (real edges only).
    const shapeOf = (list) => {
      const area = new Path2D()
      const edges = []   // [[ [x,y,lng,lat], ... ], ...] runs of real border
      for (const p of list) {
        const screen = (pt) => {
          const [lng, lat] = tileToLngLat(pt.x, pt.y, p.z, p.x, p.y, p.extent)
          const s = map.project([lng, lat])
          return [s.x * ratio, s.y * ratio, lng, lat]
        }
        for (const ring of p.rings) {
          if (ring.length < 3) continue
          let run = null
          let last = null   // the end of the run so far, in tile units
          for (let i = 0; i < ring.length; i++) {
            const pt = ring[i]
            const q = screen(pt)
            if (i) area.lineTo(q[0], q[1]); else area.moveTo(q[0], q[1])
            if (!i) continue
            const prev = ring[i - 1]
            const piece = isTileCut(prev, pt, p.extent) ? null : clipToTile(prev, pt, p.extent)
            if (!piece) { run = null; continue }
            const [a, b] = piece
            if (!run || !last || last.x !== a.x || last.y !== a.y) { run = [screen(a)]; edges.push(run) }
            run.push(b.x === pt.x && b.y === pt.y ? q : screen(b))
            last = b
          }
          area.closePath()
        }
      }
      return { area, edges }
    }

    // A year change flows from the last shape into this one (territory-morph.js), unless the switch is off.
    let shape
    // Most year steps keep the same record (a period runs for years): nothing to flow into, so no morph.
    if (morph && partsKey(morph.from) === partsKey(parts)) { morph = null; source.onMorph?.(false) }
    if (morph && look.morph !== false && (morph.from.length || parts.length)) {
      const t = morphProgress(performance.now(), morph.start, MORPH_MS)
      if (t >= 1) { morph = null; source.onMorph?.(false) }
      shape = morph ? morphShape(shapeOf(morph.from).area, shapeOf(parts).area, t, ratio) : shapeOf(parts)
      if (morph) map.triggerRepaint()
    } else {
      if (morph) { morph = null; source.onMorph?.(false) }
      shape = shapeOf(parts)
    }
    lastParts = parts
    const { area, edges } = shape
    if (!edges.length) return

    // While morphing, the wash is painted here (the map's own fill would jump straight to the new year).
    if (morph && look.fill_style === 'wash' && look.fill_strength > 0 && anim.fill > 0) {
      ctx.globalAlpha = look.fill_strength * anim.fill
      ctx.fillStyle = look.fill_color
      ctx.fill(area, 'nonzero')
      ctx.globalAlpha = 1
    }

    const zoom = map.getZoom()
    // The wobble is tied to the ground, scaled so a pen-wide wobble stays pen-wide at every zoom.
    const freq = 2 ** zoom / 6
    const jitter = (q, k) => {
      const nx = noise2(q[2] * freq + k, q[3] * freq) - 0.5
      const ny = noise2(q[2] * freq, q[3] * freq + k + 17) - 0.5
      return [q[0] + nx * 2.4 * ratio, q[1] + ny * 2.4 * ratio]
    }

    // ── Etching: a band inside the border, densest at the line, gone a little way in.
    if (look.fill_style === 'etched' && look.fill_strength > 0 && anim.fill > 0) {
      const mctx = mask.getContext('2d')
      mctx.setTransform(1, 0, 0, 1, 0, 0)
      mctx.globalCompositeOperation = 'source-over'
      mctx.clearRect(0, 0, mask.width, mask.height)
      mctx.save()
      mctx.clip(area, 'nonzero')
      mctx.lineJoin = 'round'; mctx.lineCap = 'round'
      mctx.strokeStyle = '#000'
      // Three widths over one another: the overlap is darkest at the border and thins inward.
      for (const [width, alpha] of BAND) {
        mctx.globalAlpha = alpha
        mctx.lineWidth = width * ratio
        mctx.beginPath()
        for (const run of edges) run.forEach((q, i) => { const [x, y] = jitter(q, 3); if (i) mctx.lineTo(x, y); else mctx.moveTo(x, y) })
        mctx.stroke()
      }
      mctx.restore()
      // Paint the hatching through the mask, anchored to the ground so it moves with the map.
      const key = `${look.fill_color}/${ratio}`
      if (hatchKey !== key) { hatch = hatchTile(look.fill_color, ratio); hatchKey = key }
      const pattern = mctx.createPattern(hatch, 'repeat')
      // Whole device pixels: a pattern laid at a fractional offset is resampled every frame and shimmers.
      const origin = map.project([0, 0])
      if (pattern?.setTransform) pattern.setTransform(new DOMMatrix().translate(Math.round(origin.x * ratio), Math.round(origin.y * ratio)))
      mctx.globalAlpha = 1
      mctx.globalCompositeOperation = 'source-in'
      mctx.fillStyle = pattern
      mctx.fillRect(0, 0, mask.width, mask.height)
      // While the border draws on, its etching comes up with it rather than waiting fully drawn ahead of the pen.
      ctx.globalAlpha = Math.min(1, look.fill_strength * 2.5) * anim.fill * (Number.isFinite(anim.draw) ? anim.draw : 1)
      ctx.drawImage(mask, 0, 0)
      ctx.globalAlpha = 1
      drewSomething = true
    }

    // ── The border, in the style the teacher picked (Bart 11-24: "solid, ink, dashed, wavy").
    // Each is drawn OPAQUE on its own layer and laid down once at its alpha: pieces overlap at every
    // joint, and at partial alpha each overlap showed as a darker bead that crawled along the line.
    if (look.border_width > 0 && anim.border > 0) {
      const ictx = inkLayer.getContext('2d')
      const base = look.border_width * ratio
      const begin = () => {
        ictx.setTransform(1, 0, 0, 1, 0, 0)
        ictx.clearRect(0, 0, inkLayer.width, inkLayer.height)
        ictx.setLineDash([])
        ictx.strokeStyle = look.border_color
        ictx.lineCap = 'round'; ictx.lineJoin = 'round'
      }
      const lay = (alpha) => { ctx.globalAlpha = alpha * anim.border; ctx.drawImage(inkLayer, 0, 0) }
      const style = look.border_style || 'ink'
      // Drawn on: whole chains, so the line travels on across the tile seams as it draws.
      const draw = Number.isFinite(anim.draw) ? anim.draw : 1
      const chains = trimChains(joinRuns(edges), draw)

      if (style === 'ink') {
        // Short pieces, each its own weight, on a line that wanders a hair.
        for (const pass of [0, 1]) {
          begin()
          for (const run of chains) {
            let prev = null
            for (const q of run) {
              const p = jitter(q, pass ? 41 : 0)
              if (prev) {
                const press = 0.65 + 0.7 * noise2(q[2] * freq * 2 + 9, q[3] * freq * 2)
                ictx.lineWidth = Math.max(0.5 * ratio, base * press * (pass ? 0.55 : 1))
                ictx.beginPath(); ictx.moveTo(prev[0], prev[1]); ictx.lineTo(p[0], p[1]); ictx.stroke()
              }
              prev = p
            }
          }
          // The second pass is a lighter, thinner retrace a touch off the first: the double line of a nib.
          lay(pass ? 0.35 : 0.95)
        }
      } else {
        // One even line along whole chains, so a dash or a wave runs on across the tile seams.
        begin()
        ictx.lineWidth = Math.max(0.5 * ratio, base)
        if (style === 'dashed') {
          // Round caps grow each dash by the line's width, so the gap allows for it.
          ictx.setLineDash([Math.max(3, look.border_width * 2.5) * ratio, (Math.max(4, look.border_width * 2.2) + look.border_width) * ratio])
        }
        ictx.beginPath()
        for (const chain of chains) {
          const pts = style === 'wavy'
            ? waveLine(chain, { amp: Math.max(1.6, look.border_width * 1.1) * ratio, wavelength: Math.max(12, look.border_width * 7) * ratio, step: 1.5 * ratio })
            : chain
          pts.forEach((q, i) => { if (i) ictx.lineTo(q[0], q[1]); else ictx.moveTo(q[0], q[1]) })
        }
        ictx.stroke()
        lay(0.95)
      }
      ctx.globalAlpha = 1
      drewSomething = true
    }
  }

  // A layer of the map's own, under the route and every name: drawn in the map's frame, so the ink
  // never trails a pan, and the names are painted after it, on top.
  const LAYER_ID = 'territory-ink'
  let quad = null
  map.addLayer({
    id: LAYER_ID,
    type: 'custom',
    renderingMode: '2d',
    onAdd (_map, gl) { quad = makeQuad(gl) },
    render (gl) {
      // A failed frame of ink must never stop the map painting the rest.
      try { draw() } catch (e) { drewSomething = false; console.warn('territory-ink: frame skipped', e) }
      if (drewSomething && quad) quad.draw(canvas)
    },
    onRemove () { try { quad?.destroy() } catch (_) {} quad = null },
  }, inkBeforeId(map.getStyle()?.layers))

  const redraw = () => map.triggerRepaint()

  return {
    redraw,
    /** The year is about to change: the next frames flow from the shape on screen now into the new one. */
    morphFromHere () {
      if (!lastParts.length && !drewSomething) return
      morph = { from: lastParts, start: performance.now() }
      source.onMorph?.(true)
      map.triggerRepaint()
    },
    /** Did the last frame draw the territory? While it has not (tiles still loading), the map's own line stays. */
    get drawn () { return drewSomething },
    destroy () {
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
    },
  }
}
