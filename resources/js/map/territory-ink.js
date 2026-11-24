/**
 * territory-ink.js — the linked territory drawn by hand, as a layer of the map under its names.
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
 * The shapes come from the same vector tiles the map draws (querySourceFeatures). A tile hands back
 * its part of the territory cut at the tile's edge, so a cut edge is not a border: a segment that
 * runs along the outside of the tile is filled but never inked.
 */

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

/** A quad over the whole viewport that lays the ink canvas down, premultiplied, at map pixels. */
const VERT = 'attribute vec2 a_pos; varying vec2 v_uv;'
  + 'void main () { v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5); gl_Position = vec4(a_pos, 0.0, 1.0); }'
const FRAG = 'precision mediump float; uniform sampler2D u_ink; varying vec2 v_uv;'
  + 'void main () { gl_FragColor = texture2D(u_ink, v_uv); }'

export const INK_LAYER_ID = 'territory-ink'

/**
 * Put a hand-drawn territory into a MapLibre map, as a layer of its own.
 *
 * It used to be a canvas laid over the whole map, so it covered every name: Bart, 2026-11-24, on
 * the Marco Polo map, "the text is over the venice label". The ink is still drawn on a 2D canvas,
 * but that canvas is now handed to the map as a custom layer, put in the layer order under the
 * city dots and the names (`beforeId`), the same place the map's own territory line had.
 *
 * @param {object} map
 * @param {{ features: () => object[], look: () => object, anim: () => {fill:number,border:number} }} source
 * @param {{ beforeId?: string }} [opts] the layer the ink goes under (the names); on top when unset
 */
export function createTerritoryInk (map, source, { beforeId } = {}) {
  const canvas = document.createElement('canvas')
  const mask = document.createElement('canvas')
  const inkLayer = document.createElement('canvas')   // the border, drawn opaque, then laid down at its alpha
  let hatch = null
  let hatchKey = ''
  let drewSomething = false

  const size = () => {
    const ratio = map.getPixelRatio?.() || window.devicePixelRatio || 1
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
    if (!parts.length) return

    // Screen paths: the area (every ring, cuts included) and the border (real edges only).
    const area = new Path2D()
    const edges = []   // [[ [x,y,lng,lat], ... ], ...] runs of real border
    for (const p of parts) {
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
      ctx.globalAlpha = Math.min(1, look.fill_strength * 2.5) * anim.fill
      ctx.drawImage(mask, 0, 0)
      ctx.globalAlpha = 1
      drewSomething = true
    }

    // ── The border: short pieces, each its own weight, on a line that wanders a hair.
    // Each pass is drawn OPAQUE on its own layer and laid down once at its alpha: the pieces overlap at
    // every joint, and at partial alpha each overlap showed as a darker bead that crawled along the line.
    if (look.border_width > 0 && anim.border > 0) {
      const ictx = inkLayer.getContext('2d')
      const base = look.border_width * ratio
      for (const pass of [0, 1]) {
        ictx.setTransform(1, 0, 0, 1, 0, 0)
        ictx.clearRect(0, 0, inkLayer.width, inkLayer.height)
        ictx.strokeStyle = look.border_color
        ictx.lineCap = 'round'; ictx.lineJoin = 'round'
        for (const run of edges) {
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
        ctx.globalAlpha = (pass ? 0.35 : 0.95) * anim.border
        ctx.drawImage(inkLayer, 0, 0)
      }
      ctx.globalAlpha = 1
      drewSomething = true
    }
  }

  // The map's own layer: drawn in the map's frame (so it never trails a pan) and at its place in the
  // layer order (so the names stay on top). The 2D canvas is uploaded as a texture each frame.
  let gl = null; let program = null; let quad = null; let texture = null; let aPos = -1
  const layer = {
    id: INK_LAYER_ID,
    type: 'custom',
    renderingMode: '2d',
    onAdd (_map, context) {
      gl = context
      const shader = (type, src) => { const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh); return sh }
      program = gl.createProgram()
      gl.attachShader(program, shader(gl.VERTEX_SHADER, VERT))
      gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAG))
      gl.linkProgram(program)
      aPos = gl.getAttribLocation(program, 'a_pos')
      quad = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, quad)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
      texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      // Any size (not a power of two), one canvas pixel to one map pixel.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    },
    render (context) {
      draw()
      if (!drewSomething || !program) return
      const g = context
      g.useProgram(program)
      g.activeTexture(g.TEXTURE0)
      g.bindTexture(g.TEXTURE_2D, texture)
      // The canvas is premultiplied, and so is the map's blending (one, one-minus-src-alpha).
      // MapLibre marks its GL state dirty after a custom layer, so nothing needs putting back.
      g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
      g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, false)
      g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, canvas)
      g.uniform1i(g.getUniformLocation(program, 'u_ink'), 0)
      g.bindBuffer(g.ARRAY_BUFFER, quad)
      g.enableVertexAttribArray(aPos)
      g.vertexAttribPointer(aPos, 2, g.FLOAT, false, 0, 0)
      g.drawArrays(g.TRIANGLE_STRIP, 0, 4)
    },
    onRemove () {
      if (!gl) return
      gl.deleteTexture(texture); gl.deleteBuffer(quad); gl.deleteProgram(program)
      gl = program = quad = texture = null
    },
  }
  map.addLayer(layer, beforeId && map.getLayer(beforeId) ? beforeId : undefined)

  const redraw = () => map.triggerRepaint()

  return {
    redraw,
    /** Did the last frame draw the territory? While it has not (tiles still loading), the map's own line stays. */
    get drawn () { return drewSomething },
    destroy () {
      try { if (map.getLayer(INK_LAYER_ID)) map.removeLayer(INK_LAYER_ID) } catch (_) {}
    },
  }
}
