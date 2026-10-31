/**
 * timeline-groups.js — the After Effects model for the Timeline's property rows.
 *
 * Layer > group > property. The groups carry the SAME names the Format panel's sections do
 * (Transform, Appearance, then a kind's own: Tail, Arrow), and the property labels come from ONE
 * lang key each (see animation-timeline.blade.php), so a teacher reads one vocabulary in both
 * places. The registry (properties.js) stays the single list of what can be animated; this module
 * only decides where each of its rows sits, and how its number is SHOWN.
 *
 * Pure on purpose: nothing here touches the DOM or the component, so the grouping and the
 * shown-value arithmetic have their own tests.
 */

import { propertiesFor, propertyFor } from './properties.js'

/** Group ids in the order a layer lists them. Camera has its own two. */
const ORDER = ['transform', 'position', 'view', 'appearance', 'tail', 'arrow']

/** English lang key of each group's heading. The Blade passes the translations. */
export const GROUP_LABEL_KEYS = {
  transform: 'Transform',
  appearance: 'Appearance',
  tail: 'Tail',
  arrow: 'Arrow',
  position: 'Position',
  view: 'Viewing angle',
}

const APPEARANCE = new Set(['blur', 'opacity', 'color', 'colorOpacity', 'tint', 'tint_opacity'])
const CAMERA_VIEW = new Set(['heading', 'tilt'])

/** Which group a property sits in. A registry `group` (a tail, an arrow) wins: it is one shape. */
const groupIdOf = (kind, property) => {
  if (kind === 'camera') return CAMERA_VIEW.has(property.key) ? 'view' : 'position'
  if (property.group) return property.group
  return APPEARANCE.has(property.key) ? 'appearance' : 'transform'
}

/**
 * The groups of an object kind: `[{ id, labelKey, props: [descriptor] }]`, empty ones left out,
 * rows in registry order inside each. A kind the registry does not know has none.
 */
export const groupsFor = (kind) => {
  const byId = new Map()
  for (const property of propertiesFor(kind)) {
    const id = groupIdOf(kind, property)
    if (!byId.has(id)) byId.set(id, { id, labelKey: GROUP_LABEL_KEYS[id] ?? id, props: [] })
    byId.get(id).props.push(property)
  }
  return ORDER.filter((id) => byId.has(id)).map((id) => byId.get(id))
}

/** The open/closed memory key of one group of one object. The object's own key is its target. */
export const sectionKey = (target, groupId) => `${target}#${groupId}`

/** Properties stored as a 0..1 fraction (or a multiplier of 1) that the teacher reads as a percent. */
const AS_PERCENT = new Set(['opacity', 'colorOpacity', 'tint_opacity', 'scale'])

/**
 * How a property's stored number is SHOWN and stepped.
 *
 * `scale` multiplies the stored value for display (0.5 opacity reads 50 %); `step` is one arrow
 * press and the unit of a scrub; `decimals` caps what the field shows so float noise never reaches
 * the screen.
 */
export const displayOf = (kind, key) => {
  if (AS_PERCENT.has(key)) return { scale: 100, unit: '%', step: 1, decimals: 2 }
  const registry = propertyFor(kind, key)
  if (kind === 'camera') return { scale: 1, unit: registry?.unit ?? '', step: key === 'zoom' ? 0.1 : 0.01, decimals: 3 }
  if (kind === 'dio') return { scale: 1, unit: '', step: 1, decimals: 2 }
  if (key === 'root' || key === 'zoom') return { scale: 1, unit: '', step: 0.01, decimals: 2 }
  if (['blur', 'bend', 'shaft', 'head'].includes(key)) return { scale: 1, unit: '', step: 0.1, decimals: 2 }
  return { scale: 1, unit: registry?.unit ?? '', step: 1, decimals: 2 }
}

const round = (n, decimals) => {
  const f = 10 ** decimals
  return Math.round((n + Number.EPSILON) * f) / f
}

/** Stored value → the number the field shows. */
export const toShown = (value, display) => (Number.isFinite(value) ? round(value * display.scale, display.decimals) : 0)

/** The field's number → the stored value. A number that is not finite stays null: nothing to write. */
export const fromShown = (shown, display) => {
  const n = typeof shown === 'string' ? Number(shown.trim().replace(',', '.')) : Number(shown)
  return Number.isFinite(n) && String(shown).trim() !== '' ? round(n / display.scale, 6) : null
}

/** One arrow press from `shown`: a step, ten with Shift, a tenth with Alt. */
export const nudged = (shown, direction, { step = 1, decimals = 2 } = {}, { shift = false, alt = false } = {}) => {
  const multiplier = shift ? 10 : (alt ? 0.1 : 1)
  return round(shown + direction * step * multiplier, Math.max(decimals, 3))
}

/** The distinct moments any of these key lists hold, ascending — a group's summary diamonds. */
export const summaryTimes = (keyLists, same = (a, b) => Math.abs(a - b) < 1e-6) => {
  const times = []
  for (const list of keyLists) {
    for (const key of list ?? []) {
      if (!times.some((t) => same(t, key.time))) times.push(key.time)
    }
  }
  return times.sort((a, b) => a - b)
}
