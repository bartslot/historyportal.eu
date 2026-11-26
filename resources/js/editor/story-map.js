/**
 * story-map.js — the lesson as a map of nodes (Bart, 2026-11-24: "I would like our branching story to be managed
 * like this. but in our own style"). Each scene is a card, a scene's Choices layer is a card of its own with one
 * row per choice, and a line runs to wherever the class goes next. Drag a card to move it, drag a dot to rewire.
 *
 * Same data as the Choices layer (scene.config.links, App\Services\Lessons\SceneLinks), read the way the player
 * reads it (scene/scene-links.js routeAfter):
 *   ending                    the lesson ends here: no line out
 *   no links                  a dashed line to the next scene in the list
 *   one link without words    a line straight to that scene (a jump)
 *   otherwise                 a line to the scene's choice card, and from each choice row to its scene
 *
 * Only where the cards sit is new (lesson.story_map, App\Livewire\Wizard\Concerns\EditsStoryMap). A lesson
 * nobody arranged is laid out here: columns by how many steps from the first scene, each card near the scene
 * that leads to it.
 *
 * Scene names and choice labels are teacher- or Twine-written: they reach the page through x-text only.
 */

export const SIZE = Object.freeze({
  sceneW: 248,
  sceneH: 64,
  choiceW: 240,
  choiceHead: 56,   // the CHOICES label and one line of what the narrator asks
  rowH: 32,         // one choice: the controls' 32 px
  choicePad: 8,
  colGap: 64,
  rowGap: 24,
})

const MIN_ZOOM = 0.2
const MAX_ZOOM = 2
const FIT_MARGIN = 48

/** A scene whose links show as buttons; one link without words is a straight jump, not a choice. */
export function hasButtons (scene) {
  const links = Array.isArray(scene?.links) ? scene.links : []
  return links.length > 1 || (links.length === 1 && String(links[0]?.label ?? '') !== '')
}

export function choiceHeight (scene) {
  const n = Array.isArray(scene?.links) ? scene.links.length : 0
  return SIZE.choiceHead + n * SIZE.rowH + SIZE.choicePad
}

/**
 * Every line on the map. `from` is a scene's own dot ('scene'), its choice card's entry ('attach') or a choice
 * row (`index`); `to` is a scene id, or null for a choice whose scene is not picked yet (drawn as a loose end).
 *
 * @returns {Array<{key:string, kind:'next'|'jump'|'attach'|'choice', from:{type:'scene'|'choice', id:number, index?:number}, to:number|null}>}
 */
export function mapEdges (scenes) {
  const list = Array.isArray(scenes) ? scenes : []
  const known = new Set(list.map((s) => s.id))
  const out = []
  list.forEach((s, i) => {
    if (s.ending) return
    const links = Array.isArray(s.links) ? s.links : []
    if (hasButtons(s)) {
      out.push({ key: `a${s.id}`, kind: 'attach', from: { type: 'scene', id: s.id }, to: s.id })
      links.forEach((l, index) => {
        out.push({ key: `c${s.id}-${index}`, kind: 'choice', from: { type: 'choice', id: s.id, index }, to: known.has(l?.to) ? l.to : null })
      })
    } else if (links.length === 1 && known.has(links[0]?.to)) {
      out.push({ key: `j${s.id}`, kind: 'jump', from: { type: 'scene', id: s.id }, to: links[0].to })
    } else if (links.length === 0 && list[i + 1]) {
      out.push({ key: `n${s.id}`, kind: 'next', from: { type: 'scene', id: s.id }, to: list[i + 1].id })
    }
  })
  return out
}

/** Where scene `id` goes when it is over, in the words setSceneNext takes: 'next', 'end' or a scene id. */
export function nextOf (scene) {
  if (scene?.ending) return 'end'
  const links = Array.isArray(scene?.links) ? scene.links : []
  if (links.length === 1 && String(links[0]?.label ?? '') === '' && links[0]?.to != null) return links[0].to
  return 'next'
}

/**
 * A layout for a story nobody arranged: columns by steps from the first scene (a choice card is a step of its
 * own), each card as close as it fits to the cards that lead to it, in lesson order.
 *
 * @returns {{scenes: Object<string, [number, number]>, choices: Object<string, [number, number]>}}
 */
export function autoLayout (scenes) {
  const list = Array.isArray(scenes) ? scenes : []
  const byId = new Map(list.map((s) => [s.id, s]))
  const order = new Map(list.map((s, i) => [s.id, i]))
  // The graph with a choice card as a node of its own: 's12' leads to 'c12', which leads to its scenes.
  const nextNodes = new Map()
  const prevNodes = new Map()
  const link = (a, b) => {
    if (!nextNodes.has(a)) nextNodes.set(a, [])
    if (!prevNodes.has(b)) prevNodes.set(b, [])
    nextNodes.get(a).push(b)
    prevNodes.get(b).push(a)
  }
  for (const e of mapEdges(list)) {
    if (e.kind === 'attach') link(`s${e.from.id}`, `c${e.from.id}`)
    else if (e.to != null) link(e.from.type === 'choice' ? `c${e.from.id}` : `s${e.from.id}`, `s${e.to}`)
  }

  // Steps from the first scene. A scene nothing reaches goes one column past the scene before it in the list.
  const depth = new Map()
  const walk = (start, d0) => {
    const queue = [[start, d0]]
    depth.set(start, d0)
    while (queue.length) {
      const [node, d] = queue.shift()
      for (const n of nextNodes.get(node) ?? []) {
        if (!depth.has(n)) { depth.set(n, d + 1); queue.push([n, d + 1]) }
      }
    }
  }
  if (list[0]) walk(`s${list[0].id}`, 0)
  list.forEach((s, i) => {
    if (!depth.has(`s${s.id}`)) walk(`s${s.id}`, i > 0 ? (depth.get(`s${list[i - 1].id}`) ?? 0) + 1 : 0)
  })
  // Then every line that does not run back pushes its card a column further on, so a card never shares a column
  // with the card it comes from. Lines back (a loop to an earlier scene) are left alone; the passes are capped.
  const first = new Map(depth)
  for (let pass = 0, moved = true; moved && pass < list.length * 2; pass++) {
    moved = false
    for (const [a, outs] of nextNodes) {
      for (const b of outs) {
        if (first.get(b) >= first.get(a) && depth.get(b) <= depth.get(a)) { depth.set(b, depth.get(a) + 1); moved = true }
      }
    }
  }

  const nodeW = (n) => (n[0] === 'c' ? SIZE.choiceW : SIZE.sceneW)
  const nodeH = (n) => (n[0] === 'c' ? choiceHeight(byId.get(Number(n.slice(1)))) : SIZE.sceneH)
  const columns = []
  for (const [node, d] of depth) (columns[d] ??= []).push(node)

  const pos = new Map()
  let x = 0
  columns.forEach((col = []) => {
    // Near what leads here, else in lesson order (a choice card sits with its scene).
    const want = (n) => {
      const ys = (prevNodes.get(n) ?? []).filter((p) => pos.has(p)).map((p) => pos.get(p)[1])
      return ys.length ? Math.min(...ys) : null
    }
    const rank = (n) => order.get(Number(n.slice(1))) ?? 0
    const items = col.map((n) => ({ n, want: want(n), rank: rank(n) }))
      .sort((a, b) => ((a.want ?? Infinity) - (b.want ?? Infinity)) || (a.rank - b.rank))
    let floor = -Infinity
    for (const it of items) {
      const y = Math.max(it.want ?? (floor === -Infinity ? 0 : floor), floor)
      pos.set(it.n, [x, y])
      floor = y + nodeH(it.n) + SIZE.rowGap
    }
    x += Math.max(SIZE.sceneW, ...col.map(nodeW)) + SIZE.colGap
  })

  const out = { scenes: {}, choices: {} }
  for (const [node, p] of pos) {
    const group = node[0] === 'c' ? out.choices : out.scenes
    group[node.slice(1)] = p
  }
  return out
}

/** Two boxes overlap, with a little air around them. */
function overlaps (a, b, air = 8) {
  return a.x < b.x + b.w + air && b.x < a.x + a.w + air && a.y < b.y + b.h + air && b.y < a.y + a.h + air
}

/**
 * The saved layout with a place for every card it does not know yet (a scene added since, a new Choices
 * layer): to the right of what leads to it, moved down until it is clear of the others. Nothing saved: the
 * whole map is laid out.
 */
export function placeAll (scenes, saved) {
  const list = Array.isArray(scenes) ? scenes : []
  const has = (g) => saved && saved[g] && typeof saved[g] === 'object' ? saved[g] : {}
  const savedScenes = has('scenes'), savedChoices = has('choices')
  const anySaved = list.some((s) => savedScenes[s.id])
  if (!anySaved) return autoLayout(list)

  const out = { scenes: {}, choices: {} }
  const boxes = []
  const box = (p, w, h) => ({ x: p[0], y: p[1], w, h })
  const clear = (p, w, h) => {
    const at = [p[0], p[1]]
    while (boxes.some((b) => overlaps(box(at, w, h), b))) at[1] += SIZE.rowGap + 16
    return at
  }
  for (const s of list) {
    if (savedScenes[s.id]) { out.scenes[s.id] = [...savedScenes[s.id]]; boxes.push(box(out.scenes[s.id], SIZE.sceneW, SIZE.sceneH)) }
    if (hasButtons(s) && savedChoices[s.id]) { out.choices[s.id] = [...savedChoices[s.id]]; boxes.push(box(out.choices[s.id], SIZE.choiceW, choiceHeight(s))) }
  }
  const edges = mapEdges(list)
  list.forEach((s, i) => {
    if (!out.scenes[s.id]) {
      const from = edges.find((e) => e.to === s.id && e.kind !== 'attach' && out.scenes[e.from.id])
      const anchor = from
        ? (from.from.type === 'choice' && out.choices[from.from.id] ? [out.choices[from.from.id][0] + SIZE.choiceW, out.choices[from.from.id][1]] : [out.scenes[from.from.id][0] + SIZE.sceneW, out.scenes[from.from.id][1]])
        : (list[i - 1] && out.scenes[list[i - 1].id] ? [out.scenes[list[i - 1].id][0] + SIZE.sceneW, out.scenes[list[i - 1].id][1]] : [0, 0])
      out.scenes[s.id] = clear([anchor[0] + SIZE.colGap, anchor[1]], SIZE.sceneW, SIZE.sceneH)
      boxes.push(box(out.scenes[s.id], SIZE.sceneW, SIZE.sceneH))
    }
  })
  for (const s of list) {
    if (hasButtons(s) && !out.choices[s.id]) {
      const p = out.scenes[s.id]
      out.choices[s.id] = clear([p[0] + SIZE.sceneW + SIZE.colGap, p[1]], SIZE.choiceW, choiceHeight(s))
      boxes.push(box(out.choices[s.id], SIZE.choiceW, choiceHeight(s)))
    }
  }
  return out
}

/** Where a line leaves or arrives, in map pixels. */
export function portPoint (layout, scenesById, end) {
  if (end.type === 'in') {
    const p = layout.scenes[end.id]
    return p ? [p[0], p[1] + SIZE.sceneH / 2] : null
  }
  if (end.type === 'choice-in') {
    const p = layout.choices[end.id]
    return p ? [p[0], p[1] + SIZE.choiceHead / 2] : null
  }
  if (end.type === 'choice') {
    const p = layout.choices[end.id]
    return p ? [p[0] + SIZE.choiceW, p[1] + SIZE.choiceHead + end.index * SIZE.rowH + SIZE.rowH / 2] : null
  }
  const p = layout.scenes[end.id]
  return p ? [p[0] + SIZE.sceneW, p[1] + SIZE.sceneH / 2] : null
}

/** A soft S from one dot to another; a line that runs backwards swings out wider so it never folds on itself. */
export function edgePath (a, b) {
  const [x1, y1] = a, [x2, y2] = b
  const dx = x2 >= x1 ? Math.max(32, (x2 - x1) / 2) : Math.max(80, (x1 - x2) / 3 + 60)
  const r = (n) => Math.round(n * 10) / 10
  return `M${r(x1)} ${r(y1)} C${r(x1 + dx)} ${r(y1)} ${r(x2 - dx)} ${r(y2)} ${r(x2)} ${r(y2)}`
}

/** The two dots of a line, or null when one end has no card yet. A choice with no scene yet ends a little to its right. */
export function edgeEnds (edge, layout) {
  if (edge.kind === 'attach') {
    const a = portPoint(layout, null, { type: 'out', id: edge.from.id })
    const b = portPoint(layout, null, { type: 'choice-in', id: edge.from.id })
    return a && b ? [a, b] : null
  }
  const a = edge.from.type === 'choice'
    ? portPoint(layout, null, { type: 'choice', id: edge.from.id, index: edge.from.index })
    : portPoint(layout, null, { type: 'out', id: edge.from.id })
  if (!a) return null
  if (edge.to == null) return null
  const b = portPoint(layout, null, { type: 'in', id: edge.to })
  return b ? [a, b] : null
}

/** The box around every card, in map pixels. */
export function mapBounds (scenes, layout) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  const add = (p, w, h) => {
    if (!p) return
    x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0] + w); y1 = Math.max(y1, p[1] + h)
  }
  for (const s of scenes ?? []) {
    add(layout.scenes[s.id], SIZE.sceneW, SIZE.sceneH)
    if (hasButtons(s)) add(layout.choices[s.id], SIZE.choiceW, choiceHeight(s))
  }
  return x0 === Infinity ? { x: 0, y: 0, w: SIZE.sceneW, h: SIZE.sceneH } : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/**
 * The view that opens the map: the whole story when it fits at a readable size, else the start of it at a
 * size you can read (full size), so a long lesson opens on its first scenes rather than as a strip of dots.
 */
export function openingView (bounds, vw, vh, firstPoint) {
  const z = Math.min(1, (vw - FIT_MARGIN * 2) / Math.max(1, bounds.w), (vh - FIT_MARGIN * 2) / Math.max(1, bounds.h))
  if (z >= 0.9 || !firstPoint) {
    const zz = clampZoom(Math.max(z, MIN_ZOOM))
    return { z: zz, x: (vw - bounds.w * zz) / 2 - bounds.x * zz, y: (vh - bounds.h * zz) / 2 - bounds.y * zz }
  }
  // Full size, so every word on a card is the 12 px and more the editor promises.
  return { z: 1, x: FIT_MARGIN - firstPoint[0], y: vh / 2 - (firstPoint[1] + SIZE.sceneH / 2) }
}

export function fitAll (bounds, vw, vh) {
  const z = clampZoom(Math.min(1, (vw - FIT_MARGIN * 2) / Math.max(1, bounds.w), (vh - FIT_MARGIN * 2) / Math.max(1, bounds.h)))
  return { z, x: (vw - bounds.w * z) / 2 - bounds.x * z, y: (vh - bounds.h * z) / 2 - bounds.y * z }
}

export function clampZoom (z) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z))
}

/** The view zoomed by `factor`, keeping the map point under (px, py) where it is. */
export function zoomViewAt (view, factor, px, py) {
  const z = clampZoom(view.z * factor)
  const k = z / view.z
  return { z, x: px - (px - view.x) * k, y: py - (py - view.y) * k }
}

/**
 * The Alpine side: x-data="storyMap()" on the map overlay in the scene editor (components/lesson/story-map).
 * Every change goes to the editor's own Livewire methods (EditsSceneLinks, EditsStoryMap), then the map
 * reads itself again, so what it shows is always what is saved.
 */
export function storyMap () {
  return {
    open: false,
    scenes: [],
    layout: { scenes: {}, choices: {} },
    view: { z: 1, x: 0, y: 0 },
    selected: null,          // { type: 'scene'|'choice', id }
    busy: 0,
    failed: false,
    wiring: null,            // { from, path, over }
    undoStack: [],
    _drag: null,
    _ok: true,               // the last Livewire call went through
    _shown: false,           // the layout on screen came from this opening (and is newer than the saved one)
    SIZE,

    get byId () { return new Map(this.scenes.map((s) => [s.id, s])) },
    get sel () { return this.selected ? this.byId.get(this.selected.id) ?? null : null },
    get choiceScenes () { return this.scenes.filter((s) => hasButtons(s)) },
    get saveState () { return this.failed ? 'failed' : (this.busy > 0 ? 'saving' : 'saved') },

    hasButtons,
    choiceHeight,
    nextOf,

    async show () {
      this.open = true
      this._shown = false
      this.selected = null
      this.undoStack = []
      await this.reload()
      this.$nextTick(() => {
        const vp = this.$refs.viewport
        if (!vp) return
        const first = this.scenes[0] ? this.layout.scenes[this.scenes[0].id] : null
        this.view = openingView(mapBounds(this.scenes, this.layout), vp.clientWidth, vp.clientHeight, first)
      })
    },

    close () {
      this.open = false
      this.wiring = null
      this._drag = null
    },

    async reload () {
      const data = await this.call('storyMap')
      if (!data) return
      this.scenes = Array.isArray(data.scenes) ? data.scenes : []
      // What is on screen wins over what was saved (it is newer); only a card that is new gets a place found.
      const known = this.open && this._shown ? this.layout : { scenes: {}, choices: {} }
      const saved = data.layout ?? {}
      this.layout = placeAll(this.scenes, {
        scenes: { ...(saved.scenes ?? {}), ...known.scenes },
        choices: { ...(saved.choices ?? {}), ...known.choices },
      })
      this._shown = true
      if (this.selected && !this.byId.has(this.selected.id)) this.selected = null
      if (this.selected?.type === 'choice' && !hasButtons(this.sel)) this.selected = { type: 'scene', id: this.selected.id }
    },

    /** One Livewire call, counted for the Saved / Saving pill. */
    async call (method, ...args) {
      this.busy++
      try {
        // Plain copies: Alpine's proxies are not data a request can carry.
        const out = await this.$wire.call(method, ...args.map((a) => (a && typeof a === 'object' ? JSON.parse(JSON.stringify(a)) : a)))
        this.failed = false
        this._ok = true
        return out
      } catch (e) {
        this.failed = true
        this._ok = false
        return null
      } finally {
        this.busy--
      }
    },

    /** A change to the story, then the map read again; `undo` puts it back. */
    async change (method, args, undo = null) {
      await this.call(method, ...args)
      const ok = this._ok
      // Only a change that was saved can be undone; a failed one keeps "Not saved" up after the map is read again.
      if (ok && undo) this.undoStack.push(undo)
      await this.reload()
      if (!ok) this.failed = true
    },

    async undo () {
      const step = this.undoStack.pop()
      if (!step) return
      if (step.layout) {
        Object.assign(this.layout.scenes, step.layout.scenes)
        Object.assign(this.layout.choices, step.layout.choices)
        await this.call('saveStoryMapLayout', step.layout)
        return
      }
      for (const [method, args] of step.calls ?? [[step.method, step.args]]) {
        await this.call(method, ...args)
        if (!this._ok) break
      }
      const ok = this._ok
      await this.reload()
      if (!ok) this.failed = true
    },

    // ── What the template draws ─────────────────────────────────────────────────────────────────

    nodeStyle (type, id) {
      const p = (type === 'choice' ? this.layout.choices : this.layout.scenes)[id]
      if (!p) return 'display:none'
      const s = this.byId.get(id)
      const h = type === 'choice' ? choiceHeight(s) : SIZE.sceneH
      const w = type === 'choice' ? SIZE.choiceW : SIZE.sceneW
      return `transform:translate(${p[0]}px,${p[1]}px);width:${w}px;height:${h}px`
    },

    get planeStyle () {
      return `transform:translate(${this.view.x}px,${this.view.y}px) scale(${this.view.z})`
    },

    /** The dot grid moves and scales with the map, so dragging reads as moving the paper. */
    get gridStyle () {
      const g = 24 * this.view.z
      return `background-size:${g}px ${g}px;background-position:${this.view.x}px ${this.view.y}px`
    },

    isSelected (type, id) {
      return this.selected?.type === type && this.selected?.id === id
    },

    /** The lines, as SVG markup (no teacher text in it: labels live in the cards). */
    get edgesMarkup () {
      const sel = this.selected
      let html = ''
      for (const e of mapEdges(this.scenes)) {
        const ends = edgeEnds(e, this.layout)
        if (!ends) continue
        const lit = sel && ((sel.id === e.from.id) || (sel.type === 'scene' && e.to === sel.id && e.kind !== 'attach'))
        const cls = ['story-map-edge', `is-${e.kind}`, lit ? 'is-lit' : ''].join(' ')
        html += `<path class="${cls}" d="${edgePath(ends[0], ends[1])}" />`
      }
      if (this.wiring?.path) html += `<path class="story-map-edge is-wiring" d="${this.wiring.path}" />`
      return `<svg width="1" height="1" style="overflow:visible" aria-hidden="true">${html}</svg>`
    },

    sceneLabel (id) {
      const s = this.byId.get(Number(id))
      return s ? `${s.number}. ${s.name}` : ''
    },

    // ── Pointer: pan, move a card, rewire ──────────────────────────────────────────────────────

    toMap (ev) {
      const r = this.$refs.viewport.getBoundingClientRect()
      return [(ev.clientX - r.left - this.view.x) / this.view.z, (ev.clientY - r.top - this.view.y) / this.view.z]
    },

    panStart (ev) {
      if (ev.button !== 0 && ev.button !== 1) return
      this.selected = null
      this._drag = { kind: 'pan', sx: ev.clientX, sy: ev.clientY, vx: this.view.x, vy: this.view.y }
      ev.currentTarget.setPointerCapture?.(ev.pointerId)
    },

    nodeStart (ev, type, id) {
      if (ev.button !== 0) return
      ev.stopPropagation()
      const group = type === 'choice' ? 'choices' : 'scenes'
      const moving = [[group, id]]
      // A scene takes its choice card along, so the two stay together.
      if (type === 'scene' && this.layout.choices[id] && hasButtons(this.byId.get(id))) moving.push(['choices', id])
      const before = { scenes: {}, choices: {} }
      for (const [g, k] of moving) before[g][k] = [...this.layout[g][k]]
      this._drag = { kind: 'node', type, id, sx: ev.clientX, sy: ev.clientY, moving, before, moved: false }
      this.$refs.viewport.setPointerCapture?.(ev.pointerId)
    },

    portStart (ev, from) {
      if (ev.button !== 0) return
      ev.stopPropagation()
      const start = edgeEndsFrom(from, this.layout)
      if (!start) return
      this.wiring = { from, start, path: edgePath(start, start), over: null }
      this._drag = { kind: 'wire' }
      this.$refs.viewport.setPointerCapture?.(ev.pointerId)
    },

    pointerMove (ev) {
      const d = this._drag
      if (!d) return
      if (d.kind === 'pan') {
        this.view = { ...this.view, x: d.vx + ev.clientX - d.sx, y: d.vy + ev.clientY - d.sy }
      } else if (d.kind === 'node') {
        const dx = (ev.clientX - d.sx) / this.view.z, dy = (ev.clientY - d.sy) / this.view.z
        if (!d.moved && Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) < 3) return
        d.moved = true
        for (const [g, k] of d.moving) this.layout[g][k] = [Math.round(d.before[g][k][0] + dx), Math.round(d.before[g][k][1] + dy)]
      } else if (d.kind === 'wire' && this.wiring) {
        const p = this.toMap(ev)
        this.wiring.over = this.sceneUnder(ev)
        const end = this.wiring.over != null ? portPoint(this.layout, null, { type: 'in', id: this.wiring.over }) : p
        this.wiring.path = edgePath(this.wiring.start, end)
      }
    },

    async pointerUp (ev) {
      const d = this._drag
      this._drag = null
      if (!d) return
      if (d.kind === 'node') {
        if (!d.moved) { this.selected = { type: d.type, id: d.id }; return }
        this.undoStack.push({ layout: d.before })
        // The whole map, not just this card: a map laid out for the teacher is theirs from the first move on, so
        // it opens the same next time instead of being laid out around one saved card.
        await this.call('saveStoryMapLayout', this.layout)
      } else if (d.kind === 'wire') {
        const w = this.wiring
        this.wiring = null
        const to = w?.over
        if (to == null) return
        await this.rewire(w.from, to)
      }
    },

    sceneUnder (ev) {
      const hit = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('[data-map-scene]')
      const id = hit ? Number(hit.dataset.mapScene) : null
      if (id == null) return null
      if (this.wiring?.from.type === 'scene' && this.wiring.from.id === id) return null
      return id
    },

    /** A line dropped on a scene: a choice row's dot rewires that choice; a scene's own dot adds a new choice going there. */
    async rewire (from, to) {
      const scene = this.byId.get(from.id)
      if (!scene) return
      if (from.type === 'choice') {
        const was = scene.links[from.index]?.to ?? null
        if (was === to) return
        await this.change('saveSceneLink', [from.id, from.index, 'to', to], { method: 'saveSceneLink', args: [from.id, from.index, 'to', was] })
      } else {
        // A new option (Bart, 2026-11-26): a choice at the end of this scene that goes to the scene it was dropped on.
        const before = { links: scene.links.map((l) => ({ ...l })), ending: scene.ending === true }
        await this.change('addSceneChoiceTo', [from.id, to], { method: 'restoreSceneLinks', args: [from.id, before.links, before.ending] })
        if (hasButtons(this.byId.get(from.id))) this.selected = { type: 'choice', id: from.id }
      }
    },

    wheel (ev) {
      const r = this.$refs.viewport.getBoundingClientRect()
      if (ev.ctrlKey || ev.metaKey) {
        this.view = zoomViewAt(this.view, Math.exp(-ev.deltaY * 0.01), ev.clientX - r.left, ev.clientY - r.top)
      } else {
        this.view = { ...this.view, x: this.view.x - ev.deltaX, y: this.view.y - ev.deltaY }
      }
    },

    zoomBy (factor) {
      const vp = this.$refs.viewport
      this.view = zoomViewAt(this.view, factor, vp.clientWidth / 2, vp.clientHeight / 2)
    },

    fit () {
      const vp = this.$refs.viewport
      this.view = fitAll(mapBounds(this.scenes, this.layout), vp.clientWidth, vp.clientHeight)
    },

    /** Tidy: lay the whole story out again, and keep it (one step back with undo). */
    async tidy () {
      const before = { scenes: { ...this.layout.scenes }, choices: { ...this.layout.choices } }
      this.layout = autoLayout(this.scenes)
      this.undoStack.push({ layout: before })
      await this.call('saveStoryMapLayout', this.layout)
      this.fit()
    },

    /**
     * Keys while the map is open. Bound on the window in the capture phase, so it runs before the scene editor's own
     * shortcuts (its undo, Delete) and keeps every key away from them: the scene behind the map is not being edited.
     */
    keydown (ev) {
      if (!this.open || window.__isTypingTarget?.(ev.target)) return
      ev.stopPropagation()
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); this.selected ? (this.selected = null) : this.close() }
      else if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'z' && !ev.shiftKey) { ev.preventDefault(); ev.stopPropagation(); this.undo() }
      else if (ev.key === 'Enter' && this.selected) { ev.preventDefault(); this.openScene(this.selected.id) }
    },

    // ── The inspector ──────────────────────────────────────────────────────────────────────────

    async addChoices (id) {
      // Undo puts back where the scene went before: the next scene, a straight jump or the end.
      const was = nextOf(this.byId.get(id))
      await this.change('addChoicesToScene', [id], { calls: [['removeSceneChoices', [id]], ['setSceneNext', [id, was]]] })
      if (hasButtons(this.byId.get(id))) this.selected = { type: 'choice', id }
    },

    async removeChoices (id) {
      await this.change('removeSceneChoices', [id])
      this.selected = { type: 'scene', id }
    },

    async setNext (id, value) {
      const scene = this.byId.get(id)
      const to = value === 'next' || value === 'end' ? value : Number(value)
      await this.change('setSceneNext', [id, to], scene ? { method: 'setSceneNext', args: [id, nextOf(scene)] } : null)
    },

    async setLabel (id, index, value) {
      await this.change('saveSceneLink', [id, index, 'label', value])
    },

    async setTarget (id, index, value) {
      const was = this.byId.get(id)?.links[index]?.to ?? null
      await this.change('saveSceneLink', [id, index, 'to', value === '' ? null : Number(value)], { method: 'saveSceneLink', args: [id, index, 'to', was] })
    },

    async addChoice (id) { await this.change('addSceneLink', [id]) },
    async removeChoice (id, index) { await this.change('removeSceneLink', [id, index]) },
    async setPrompt (id, value) { await this.change('saveChoicesPrompt', [id, value]) },

    /** Back to the editor, on this scene. */
    async openScene (id) {
      this.close()
      await this.$wire.call('selectScene', id)
    },

    /** Play the lesson from this scene, the way the editor's Play does from the selected one. */
    async playFrom (id) {
      this.close()
      await this.$wire.call('selectScene', id)
      window.Livewire?.dispatch('lesson:play')
    },
  }
}

/** Where a line being dragged starts: a scene's own dot or a choice row's. */
function edgeEndsFrom (from, layout) {
  return from.type === 'choice'
    ? portPoint(layout, null, { type: 'choice', id: from.id, index: from.index })
    : portPoint(layout, null, { type: 'out', id: from.id })
}
