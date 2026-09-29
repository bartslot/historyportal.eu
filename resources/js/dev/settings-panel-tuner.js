/**
 * settings-panel-tuner.js — the inspector panel's geometry, as knobs.
 *
 * Every number in the settings panel was measured off a Figma frame, which is a picture of a panel
 * and not the panel: the label column that fits "POSITION" in the file is 49px at 8px type, and
 * this app's smallest type step is 11px. Rather than guess a replacement, rebuild, and squint, the
 * five numbers that decide the panel's shape are CSS custom properties and this registers them.
 *
 * THE CONTROLS READ THE PANEL, they do not restate it. Each knob's starting value is the computed
 * value of its custom property at registration time, so the panel's CSS stays the single source of
 * truth. A control that shipped with a literal here would show 4.5 while the stylesheet said 5 and
 * be wrong from the first frame — a whole session went into fixing exactly that across the globe's
 * controls, and it regressed again afterwards, so it is worth being blunt about.
 *
 * Nothing is saved by moving a slider; see the header of tuner.js.
 */

/** The custom properties this panel is built on, in the order they read down the panel. */
const KNOBS = [
  { key: 'w', prop: '--settings-panel-w', label: 'Panel width', min: 14, max: 30, step: 0.125 },
  { key: 'labelW', prop: '--settings-panel-label-w', label: 'Label column', min: 2.5, max: 8, step: 0.125 },
  { key: 'thumbH', prop: '--settings-panel-thumb-h', label: 'Style card height', min: 2, max: 8, step: 0.125 },
  { key: 'rowH', prop: '--settings-panel-row-h', label: 'Field height', min: 1.5, max: 3, step: 0.0625 },
  { key: 'pad', prop: '--settings-panel-pad', label: 'Side padding', min: 0, max: 2, step: 0.0625 },
]

/**
 * Read a custom property off the document root, in rem.
 *
 * getPropertyValue returns whatever the stylesheet wrote — '19.375rem' — so the unit is stripped
 * rather than assumed. A property that has not resolved yet returns '', and returning null for
 * that is deliberate: registering a knob at 0 because the stylesheet had not arrived would apply
 * 0 the moment a preset loaded and collapse the panel.
 */
export function readRem (prop, root = document.documentElement) {
  const raw = getComputedStyle(root).getPropertyValue(prop).trim()
  if (!raw) return null
  const n = Number.parseFloat(raw)
  if (Number.isNaN(n)) return null
  // px is the other unit anyone would reasonably write here; convert so the knob stays in rem.
  return raw.endsWith('px') ? n / 16 : n
}

/**
 * Alpine factory for the panel: x-data="settingsPanelTuner()".
 *
 * A global factory rather than an Alpine.data registration, matching onboardingTour and
 * easingPreview — the Blade x-data has to call it without depending on alpine:init ordering.
 *
 * init/destroy rather than a one-off call at import: the tuner is a context, so the group appears
 * while an inspector is open and goes when it closes. Livewire morphs the panel in and out, and
 * Alpine re-runs init on the new node, so a group registered at import would outlive its panel.
 */
export function settingsPanelTuner () {
  return {
    _off: null,

    init () {
      const root = document.documentElement
      const controls = KNOBS
        .map(({ key, prop, label, min, max, step }) => {
          const value = readRem(prop, root)
          if (value === null) return null
          return {
            key,
            label: `${label} (rem)`,
            min,
            max,
            step,
            value,
            apply: (v) => root.style.setProperty(prop, `${v}rem`),
          }
        })
        .filter(Boolean)

      if (!controls.length) return
      this._off = window.__tune?.register('Settings panel', controls, { tab: 'Wizard' }) ?? null
    },

    destroy () {
      this._off?.()
      this._off = null
    },
  }
}
