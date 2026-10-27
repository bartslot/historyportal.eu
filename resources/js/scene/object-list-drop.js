/**
 * A drop in the object list, resolved onto the stage.
 *
 * The list shows ONE stack, but the stage draws two bands: the text objects (titles, backing
 * panels, TextOverlayLayer) and the figures (ArtworkOverlay). Each band restacks freely inside
 * itself; the bands only swap as a whole (ArtworkOverlay.setOnTop). So a drop that mixes rows of
 * both bands has to decide which band ends up in front, and the DRAGGED row decides: dragged from
 * the front band to below a row of the other band, its band goes back; dragged from the back band
 * to above a row of the other band, its band comes forward.
 *
 * (The rule this replaces compared the bands' mean row index. One figure dragged above the title
 * while a second figure stayed below averaged out, and the row snapped back: "I can't change the
 * order", Bart 2026-10-22.)
 *
 * A split scene draws its figures inside the panels, under the text layer, in the editor and the
 * player alike, so there the bands never swap: canSwap false keeps the figures behind and reports
 * a drop that tried as `blocked`, so the list can say so instead of silently snapping back.
 *
 * @param {object} drop
 * @param {string[]} drop.ids  every row id, top to bottom, after the drop
 * @param {(id: string) => ('text'|'art'|null)} drop.kindOf  null for rows in neither band (balloons, diorama)
 * @param {string} drop.movedId  the dragged row
 * @param {boolean} drop.artOnTop  were the figures in front before the drop
 * @param {boolean} [drop.canSwap]
 * @returns {{ textIds: string[], artIds: string[], artOnTop: boolean, blocked: boolean }}
 */
export function resolveDrop({ ids, kindOf, movedId, artOnTop, canSwap = true }) {
  const textIds = ids.filter((id) => kindOf(id) === 'text')
  const artIds = ids.filter((id) => kindOf(id) === 'art')
  const before = canSwap && !!artOnTop
  const moved = kindOf(movedId)
  if (!moved || !textIds.length || !artIds.length) return { textIds, artIds, artOnTop: before, blocked: false }

  const at = ids.indexOf(movedId)
  const others = (moved === 'art' ? textIds : artIds).map((id) => ids.indexOf(id))
  const wasInFront = moved === 'art' ? before : !before
  const isInFront = wasInFront ? !others.some((i) => i < at) : others.some((i) => i > at)
  const after = moved === 'art' ? isInFront : !isInFront
  if (!canSwap) return { textIds, artIds, artOnTop: false, blocked: after !== before }

  return { textIds, artIds, artOnTop: after, blocked: false }
}

/**
 * SortableJS's fallback drag ghost is a cloneNode() of an x-for row, appended to the list. Alpine
 * sees a new element full of directives and initialises it outside the x-for scope: "obj is not
 * defined", once per directive, on every drop (pair test 2026-10-24). While a drag runs the list's
 * own child changes are kept from Alpine; the drop undoes Sortable's move anyway.
 *
 * @param {HTMLElement} list  the Sortable root
 * @param {boolean} dragging
 */
export function shieldListFromAlpine (list, dragging) {
  list._x_ignoreMutationObserver = dragging
}
