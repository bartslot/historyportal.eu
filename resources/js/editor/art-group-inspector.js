/**
 * art-group-inspector.js — the panel of a group of pictures (components/lesson/art-group-inspector), and the pivot
 * presets of a picture's own panel (components/lesson/pivot-presets).
 *
 * Values are read off the overlay on screen at the playhead and written back through it, the way the canvas box and
 * the timeline row write them (scene/art-groups.js). A field on an animated row is keyed by keyed-fields.js before
 * its change gets here, so a change that arrives is a plain value: shown at once, saved on the server.
 */

const overlay = () => window.__artOverlay?.() ?? window.__lessonArtworkLayer

/** The nine pivot presets: corners, edges and the middle, as fractions of the box. */
export const PIVOT_PRESETS = [0, 0.5, 1].flatMap((y) => [0, 0.5, 1].map((x) => [x, y]))

const r = (v, d = 100) => Math.round(v * d) / d

/** A group's panel. `scale` and `opacity` show as percentages, like a picture's. */
export function artGroupInspector (id) {
  return {
    id,
    name: '',
    values: { x: 0, y: 0, scale: 100, rotation: 0, opacity: 100, pivot_x: 50, pivot_y: 50 },
    init () { this.sync() },
    sync () {
      const o = overlay()
      if (!o?.groupData?.(id)) return
      const g = o.groupData(id)
      this.name = g.name || ''
      this.values = { x: r(g.x), y: r(g.y), scale: r(g.scale * 100, 10), rotation: r(g.rotation, 10), opacity: r(g.opacity * 100, 10), pivot_x: r(g.pivot_x), pivot_y: r(g.pivot_y) }
    },
    /** A typed value (percent fields divided back), live on the canvas and saved. */
    set (key, raw, factor = 1) {
      const v = Number(raw) / factor
      if (!Number.isFinite(v)) return
      overlay()?.setGroupProp?.(id, key, v)
      this.$wire?.updateArtworkGroup?.(id, key, v)
      this.sync()
    },
    /** The live half of a field (keyed rows are drawn by the timeline instead). */
    preview (key, raw, factor = 1) {
      const v = Number(raw) / factor
      if (Number.isFinite(v) && !window.__timelineKeying?.animated?.(`grp:${id}`, key)) overlay()?.setGroupProp?.(id, key, v)
    },
    rename (value) {
      overlay()?.setGroupProp?.(id, 'name', value)
      this.$wire?.updateArtworkGroup?.(id, 'name', value)
    },
    /** Put the pivot on a point of the group's box: its pictures stay where they are. */
    pivotTo (fx, fy) {
      const o = overlay()
      const box = o?._groupBox?.(id)
      if (!box) return
      const qx = ((box.l + fx * box.w) / box.hostW) * 100
      const qy = ((box.t + fy * box.h) / box.hostH) * 100
      o.moveGroupPivotTo?.(id, qx, qy)
      this.sync()
    },
  }
}

/** A picture's pivot presets: the nine points of its box, the picture staying put. */
export function pivotPresets (assetId) {
  return {
    presets: PIVOT_PRESETS,
    current: [0.5, 0.5],
    init () { this.sync() },
    sync () {
      const layer = overlay()?.layerData?.(assetId)
      this.current = [layer?.pivot_x ?? 0.5, layer?.pivot_y ?? 0.5]
    },
    isAt (p) { return Math.abs(p[0] - this.current[0]) < 0.01 && Math.abs(p[1] - this.current[1]) < 0.01 },
    pick (p) {
      const saved = overlay()?.setPivotPreset?.(assetId, p[0], p[1])
      if (!saved) return
      this.$wire?.setArtworkPivot?.(assetId, saved.pivot_x, saved.pivot_y, saved.x, saved.y)
      this.sync()
    },
  }
}

export function registerArtGroupInspector () {
  window.artGroupInspector = artGroupInspector
  window.pivotPresets = pivotPresets
}
