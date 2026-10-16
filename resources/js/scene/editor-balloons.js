/**
 * editor-balloons: the balloons of the scene open in the editor (config.lines, BalloonLayer).
 *
 * A split scene draws them in its panels (SplitStage, given these options); a standard slide
 * draws them in one layer over the stage, mounted here. Both save through `balloon:change`.
 * The object list reads balloonRows() through window.__balloons; the Delete key and the
 * selection bridge read the selection there too.
 */
import { BalloonLayer, withBalloonIds } from './BalloonLayer.js'
import { editableBalloons, editBalloon, selectBalloon, selectedBalloon } from './balloon-edit.js'
import { panelForLine } from './split-layout.js'

/** One finished gesture on a balloon → one save (one undo step). */
export const saveBalloon = (id, patch) => window.Livewire?.dispatch('balloon:change', { id, patch })

export const balloonOptions = () => editableBalloons(saveBalloon)

let current = { lines: [], split: false, panel: 0, panelLayers: [] }

/** The scene on stage now (every scene:load), for the object list. */
export function setBalloonScene ({ lines = [], split = false, panel = 0, panelLayers = [] } = {}) {
  current = { lines: withBalloonIds(lines), split, panel, panelLayers }
  try { window.dispatchEvent(new CustomEvent('scene-objects-changed')) } catch (_) { /* noop */ }
}

/** The object list's balloon rows: every balloon, on a split scene those of the active panel. */
export function balloonRows () {
  return current.lines
    .filter(l => l && l.speaker !== 'narrator' && l.text)
    .filter(l => !current.split || panelForLine(l, current.panelLayers) === current.panel)
    .map(l => ({ id: l.id, text: l.text, kind: l.kind === 'thought' ? 'thought' : 'speech' }))
}

/** A layer's words must not be swapped out under the teacher's cursor; the echo waits a poll. */
export const typingIn = (host) => !!host && host.contains(document.activeElement) && document.activeElement?.isContentEditable

let host = null
let layer = null
let sig = null

/** A standard slide: its balloons over the whole stage. */
export function showStageBalloons (parent, lines) {
  if (!parent) return
  if (!host?.isConnected) {
    host = document.createElement('div')
    host.className = 'wizard-balloon-host'
    // Above the figures and the text overlay (z-7); only the balloons themselves catch the hand.
    host.style.cssText = 'position:absolute;inset:0;overflow:hidden;z-index:8;pointer-events:none;'
    parent.appendChild(host)
    layer?.destroy()
    layer = new BalloonLayer(host, undefined, balloonOptions())
    sig = null
  }
  host.style.display = ''
  const next = JSON.stringify(lines || [])
  if (next === sig || typingIn(host)) return
  sig = next
  layer.setLines(lines || [])
}

export function hideStageBalloons () {
  if (!layer) return
  if (sig !== null) layer.setLines([])
  sig = null
  if (host) host.style.display = 'none'
}

if (typeof window !== 'undefined') {
  window.__balloons = { list: balloonRows, select: selectBalloon, selected: selectedBalloon, edit: editBalloon }
}
