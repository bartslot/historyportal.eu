/**
 * De lading's inventory and run rules (plan: Memory/historyportal/topics/classroom-games/plan.md,
 * §3-§8 and §12). Pure: every operation takes a state and returns a NEW one, never changes its
 * input, and recalculates every total from the catalogue (a price, tag or fixed flag that comes
 * with a request is never trusted). The screens are team-hold.js and team-hold-compare.js.
 *
 *   MISSION -> SELECT_AND_LOAD -> COMPARE -> EXCHANGE -> DEPARTURE_LOCKED
 *
 * A team's cargo (`TeamCargo`): the selected item ids, a revision, whether it is confirmed
 * ("Klaar"), its one exchange (open / kept / swapped), its original and final loads, and whether
 * it is locked. Operations carry an operation id: one already applied is answered with the same
 * state again, so a retried tap never applies twice.
 */

export const PHASES = ['MISSION', 'SELECT_AND_LOAD', 'COMPARE', 'EXCHANGE', 'DEPARTURE_LOCKED']

/** Step times in seconds (plan §2); `minutes` (the game's timer) is the selection step. */
export const STEP_SECONDS = { mission: 20, compare: 60, exchange: 60, sail: 20 }
const STEP_MAX = 600

/** Why an operation was refused; the screens turn these into words. */
export const REFUSED = {
  unknown: 'unknown', fixed: 'fixed', duplicate: 'duplicate', missing: 'missing', budget: 'budget',
  locked: 'locked', unconfirmed: 'unconfirmed', used: 'used', same: 'same',
}

const cost = (item) => Math.max(0, Math.round(Number(item?.cost) || 0))

/** The step timers: whole seconds, 0..600, the defaults for anything missing. */
export function readTimers (raw = {}) {
  const out = {}
  for (const [k, v] of Object.entries(STEP_SECONDS)) {
    const given = raw?.[k]
    const n = Math.round(Number(given))
    out[k] = given !== '' && given !== null && given !== undefined && Number.isFinite(n) ? Math.min(STEP_MAX, Math.max(0, n)) : v
  }
  return out
}

/** The whole preparation in seconds (the chapter estimate): mission + select + compare + exchange + sail. */
export const flowSeconds = (minutes, timers) =>
  timers.mission + Math.max(0, minutes) * 60 + timers.compare + timers.exchange + timers.sail

/**
 * The catalogue a game plays with: fixed items first, then the optional ones, each with a stable
 * id. An item without an id gets one from its place, so an old game still plays.
 */
export function catalogueOf (cfg) {
  const seen = new Set()
  const entry = (it, i, fixed) => {
    let id = typeof it?.id === 'string' && it.id ? it.id : `${fixed ? 'fixed' : 'item'}_${i}`
    while (seen.has(id)) id = `${id}_`
    seen.add(id)
    return { id, index: i, fixed, cost: cost(it), name: it?.name ?? '', image: it?.image ?? '', tags: Array.isArray(it?.tags) ? it.tags : [], why: it?.why ?? '', real: !!it?.real }
  }
  const items = [...(cfg.fixed ?? []).map((f, i) => entry(f, i, true)), ...(cfg.items ?? []).map((it, i) => entry(it, i, false))]
  return {
    version: String(cfg.catalogue_version || 'de-lading-draft-1'),
    budget: Math.max(1, Math.round(Number(cfg.capacity) || 1)),
    items,
    byId: new Map(items.map(it => [it.id, it])),
    fixedIds: items.filter(it => it.fixed).map(it => it.id),
    optional: items.filter(it => !it.fixed),
  }
}

/** Total of a list of ids, from the catalogue's prices (unknown ids count for nothing). */
export const totalOf = (ids, cat) => ids.reduce((s, id) => s + (cat.byId.get(id)?.cost ?? 0), 0)

/** A new team: the fixed cargo aboard, nothing confirmed, the exchange still open. */
export function newTeamCargo (teamId, cat) {
  return {
    teamId, revision: 0, selected: [...cat.fixedIds], confirmed: false,
    original: null, final: null, exchange: { state: 'open', removedId: null, addedId: null },
    locked: false, ops: [],
  }
}

/** Points left in the budget. */
export const pointsLeft = (state, cat) => cat.budget - totalOf(state.selected, cat)

/** The ids of a team's optional cargo, in catalogue order. */
export const optionalOf = (state, cat) => cat.optional.map(it => it.id).filter(id => state.selected.includes(id))

const refuse = (state, reason) => ({ ok: false, reason, state })
const seenOp = (state, opId) => opId && state.ops.includes(opId)
const next = (state, patch, opId) => ({
  ok: true, reason: '',
  state: { ...state, ...patch, revision: state.revision + 1, ops: opId ? [...state.ops.slice(-49), opId] : state.ops },
})

/** Add an optional package. Over budget: "Niet genoeg punten. Haal eerst iets weg." Clears ready. */
export function addItem (state, id, cat, opId = null) {
  if (seenOp(state, opId)) return { ok: true, reason: '', state }
  if (state.locked) return refuse(state, REFUSED.locked)
  const item = cat.byId.get(id)
  if (!item) return refuse(state, REFUSED.unknown)
  if (item.fixed) return refuse(state, REFUSED.fixed)
  if (state.selected.includes(id)) return refuse(state, REFUSED.duplicate)
  if (totalOf(state.selected, cat) + item.cost > cat.budget) return refuse(state, REFUSED.budget)
  return next(state, { selected: [...state.selected, id], confirmed: false }, opId)
}

/** Remove an optional package; fixed cargo never leaves. Clears ready. */
export function removeItem (state, id, cat, opId = null) {
  if (seenOp(state, opId)) return { ok: true, reason: '', state }
  if (state.locked) return refuse(state, REFUSED.locked)
  const item = cat.byId.get(id)
  if (!item) return refuse(state, REFUSED.unknown)
  if (item.fixed) return refuse(state, REFUSED.fixed)
  if (!state.selected.includes(id)) return refuse(state, REFUSED.missing)
  return next(state, { selected: state.selected.filter(x => x !== id), confirmed: false }, opId)
}

/** Add it when it is not aboard, remove it when it is. */
export const toggleCargo = (state, id, cat, opId = null) =>
  (state.selected.includes(id) ? removeItem(state, id, cat, opId) : addItem(state, id, cat, opId))

/** "Klaar": confirm the current load, spent or not (the screen asks first when points are left). */
export function confirmCargo (state, opId = null) {
  if (seenOp(state, opId)) return { ok: true, reason: '', state }
  if (state.locked) return refuse(state, REFUSED.locked)
  return next(state, { confirmed: true }, opId)
}

/** The teacher reopens a team during selection. */
export function reopenCargo (state) {
  if (state.locked) return refuse(state, REFUSED.locked)
  return next(state, { confirmed: false }, null)
}

/**
 * Preview one exchange: exactly one optional package out, one absent optional package in, the
 * new total within the budget. Nothing changes: the screen shows this before the team confirms.
 * @returns {{ok:boolean, reason:string, before:number, after:number}}
 */
export function previewExchange (state, removeId, addId, cat) {
  const before = totalOf(state.selected, cat)
  const fail = (reason) => ({ ok: false, reason, before, after: before })
  if (state.locked) return fail(REFUSED.locked)
  if (!state.confirmed) return fail(REFUSED.unconfirmed)
  if (state.exchange.state !== 'open') return fail(REFUSED.used)
  const out = cat.byId.get(removeId)
  const into = cat.byId.get(addId)
  if (!out || !into) return fail(REFUSED.unknown)
  if (out.fixed || into.fixed) return fail(REFUSED.fixed)
  if (removeId === addId) return fail(REFUSED.same)
  if (!state.selected.includes(removeId)) return fail(REFUSED.missing)
  if (state.selected.includes(addId)) return fail(REFUSED.duplicate)
  const after = before - out.cost + into.cost
  if (after > cat.budget) return { ok: false, reason: REFUSED.budget, before, after }
  return { ok: true, reason: '', before, after }
}

/**
 * What the swap preview may offer: the confirm only when it fits; otherwise how many places
 * must come free first (an over-budget preview never enables "Ruilen").
 * @param {{ok:boolean, reason:string, after:number}} preview  previewExchange() output
 * @returns {{canSwap:boolean, over:number, free:number}}
 */
export function swapGuard (preview, budget) {
  const over = preview.reason === REFUSED.budget ? Math.max(0, preview.after - budget) : 0
  return { canSwap: !!preview.ok, over, free: preview.ok ? Math.max(0, budget - preview.after) : 0 }
}

/** Apply the exchange atomically: out and in together, the allowance used, both loads kept. */
export function exchangeCargo (state, removeId, addId, cat, opId = null) {
  if (seenOp(state, opId)) return { ok: true, reason: '', state }
  const p = previewExchange(state, removeId, addId, cat)
  if (!p.ok) return refuse(state, p.reason)
  const selected = state.selected.map(id => (id === removeId ? addId : id))
  return next(state, {
    selected, original: [...state.selected], final: [...selected],
    exchange: { state: 'swapped', removedId: removeId, addedId: addId },
  }, opId)
}

/** "Houden zo": the phase ends for this team without an exchange. */
export function keepCargo (state, opId = null) {
  if (seenOp(state, opId)) return { ok: true, reason: '', state }
  if (state.locked) return refuse(state, REFUSED.locked)
  if (!state.confirmed) return refuse(state, REFUSED.unconfirmed)
  if (state.exchange.state !== 'open') return refuse(state, REFUSED.used)
  return next(state, { original: [...state.selected], final: [...state.selected], exchange: { state: 'kept', removedId: null, addedId: null } }, opId)
}

/** The teacher's visible reset of a team's exchange: back to its original load, the exchange open. */
export function resetExchange (state) {
  if (state.locked) return refuse(state, REFUSED.locked)
  return next(state, {
    selected: state.original ? [...state.original] : state.selected,
    original: null, final: null, exchange: { state: 'open', removedId: null, addedId: null },
  }, null)
}

/**
 * Departure: lock every team at once (one boundary). A confirmed team gets its versioned
 * snapshot; an unconfirmed one is excluded (never silently marked ready). After this, every
 * operation on a team is refused.
 *
 * @param {{id:string, name:string}[]} teams
 * @returns {{ states: object[], snapshots: object[] }}
 */
export function lockDeparture (states, teams, cat, { runId = 'local', attemptId = 'cargo-1', lockedAt = new Date().toISOString() } = {}) {
  const locked = states.map(s => ({ ...s, locked: true, revision: s.revision + 1 }))
  const snapshots = locked.map((s, i) => ({
    runId, teamId: s.teamId, teamName: teams[i]?.name ?? '', attemptId,
    catalogueVersion: cat.version, revision: s.revision, phase: 'DEPARTURE_LOCKED', lockedAt,
    confirmed: s.confirmed,
    originalItemIds: s.confirmed ? [...(s.original ?? s.selected)] : [],
    finalItemIds: s.confirmed ? [...(s.final ?? s.selected)] : [],
    exchange: { ...s.exchange },
    tags: s.confirmed ? [...new Set(s.selected.flatMap(id => cat.byId.get(id)?.tags ?? []))] : [],
    totalCost: s.confirmed ? totalOf(s.selected, cat) : 0,
  }))
  return { states: locked, snapshots }
}

/**
 * "Wat zou jij nog meenemen?": up to three optional items no CONFIRMED team took, in catalogue
 * order (never from what later scenes will check). Empty = every item is somewhere: the screen
 * asks "Welke keuze valt je op?" instead.
 */
export function missingPrompt (states, cat, n = 3) {
  const taken = new Set(states.filter(s => s.confirmed).flatMap(s => s.selected))
  return cat.optional.map(it => it.id).filter(id => !taken.has(id)).slice(0, n)
}

/** Ids in one of two loads and not the other (the comparison's outline). */
export function differing (a, b) {
  return new Set([...a.filter(id => !b.includes(id)), ...b.filter(id => !a.includes(id))])
}

/** Teams in pages of four, in their own stable order (never sorted by what they spent). */
export function pagesOfFour (count) {
  return Array.from({ length: Math.ceil(count / 4) }, (_, p) => Array.from({ length: Math.min(4, count - p * 4) }, (_, i) => p * 4 + i))
}
