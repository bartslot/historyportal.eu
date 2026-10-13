/**
 * The harbour race (a power-meter moment with race.enabled): every team, or a pupil against the
 * 1642 fleet, fills its own meter, and the panel's ship sails one lane per team. First out crews the
 * Heemskerck, second the Zeehaen, for the rest of the lesson. History decides what happens; the race
 * only decides who crews which ship and when they leave: afterwards every ship sails.
 *
 * Pure rules here (finish order, roles, the ghost, crew names in text, lane layout); PowerMeter runs
 * the meters and the player moves the ships. The crew is kept per run (sessionStorage), never on
 * the lesson.
 */

export const SHIPS = ['heemskerck', 'zeehaen']

/** A team chip's height in stage %. */
export const CHIP_H = 3.5

/** The hull: the lower share of a ship picture. Masts and sails above it may pass behind a chip. */
export const HULL = 0.4

/** No ship smaller than this (stage %), whatever the number of lanes. */
const MIN_SHIP_H = 8

/** The order teams crossed the line (meter indexes), extended by whoever just filled theirs. */
export function finishOrder (order, fills, goal) {
  const next = [...order]
  fills.forEach((f, i) => { if (f >= goal - 1e-9 && !next.includes(i)) next.push(i) })
  return next
}

/** The race is decided once both ships have a crew (or every team is in, with fewer than two). */
export const raceDecided = (order, teamCount) => order.length >= Math.min(SHIPS.length, teamCount)

/**
 * "End the race" before two teams finished: the finishers in their order, then the rest by how far
 * they got (a tie goes to the lower team number, which is as fair as a coin and easier to explain).
 */
export function finalOrder (order, fills) {
  const rest = fills.map((f, i) => i).filter(i => !order.includes(i)).sort((a, b) => fills[b] - fills[a] || a - b)
  return [...order, ...rest]
}

/** The next team after `from` that has not crossed the line yet (or `from` when none is left). */
export function nextOpen (order, teamCount, from) {
  for (let step = 1; step <= teamCount; step++) {
    const team = (from + step) % teamCount
    if (!order.includes(team)) return team
  }
  return from
}

/** { heemskerck: name, zeehaen: name } from the final order and the team names. */
export function crewFrom (order, names) {
  return Object.fromEntries(SHIPS.map((ship, place) => [ship, names[order[place]] ?? null]).filter(([, n]) => n))
}

/** Where the 1642 fleet is: it sails the whole meter in `seconds`, then waits at the line. */
export function ghostLevel (elapsedSeconds, seconds) {
  return Math.max(0, Math.min(1, elapsedSeconds / Math.max(1, seconds)))
}

const TOKEN = /\{crew:(heemskerck|zeehaen)(?:\|([^}]*))?\}/g

/**
 * Put the crews' names into a line: {crew:heemskerck} / {crew:zeehaen}, with an optional fallback
 * after a bar ({crew:zeehaen|de bemanning}) for a lesson played without a race; without one the
 * fallback is `whenNone`. A name that opens a sentence gets a capital. Plain text in, plain text
 * out: the caller still renders it with textContent.
 */
export function crewText (text, crew = {}, whenNone = '') {
  if (typeof text !== 'string' || !text.includes('{crew:')) return text
  return text.replace(TOKEN, (match, ship, fallback, offset) => {
    const name = crew[ship] || (fallback ?? whenNone) || ''
    const opensSentence = offset === 0 || /[.!?]\s+$/.test(text.slice(0, offset))
    return opensSentence && name ? name[0].toUpperCase() + name.slice(1) : name
  })
}

/**
 * The race lanes: the panel's ship once per team, stacked on the water. The far lanes sit higher and
 * smaller (and behind), the near ones lower and larger; every ship starts at `startX`. Ids are the
 * ship's own id plus `-lane<n>` (it ends up in CSS ids, so no other punctuation), so each lane is a layer of its own (its own foam and speed).
 *
 * @param {object} ship   the layer as the player has it (asset_id, x, y, height, depth...)
 * @param {number} lanes
 * @returns {object[]} layers, far lane first
 */
export function raceLanes (ship, lanes, { startX = 25 } = {}) {
  const n = Math.max(1, lanes)
  const y = Number(ship.y) || 60
  // The band the lanes share grows with their number, and the ships shrink with it: the hull of a
  // nearer (larger) ship must stay below the chip of the lane behind it. Chips are drawn above every
  // ship, so a mast passing behind one never hides it.
  const spread = Math.min(40, 9 * n)
  const step = n === 1 ? Infinity : spread / (n - 1)
  const scaleOf = (i) => 0.7 + 0.45 * (n === 1 ? 0.5 : i / (n - 1))
  // For each lane and the one in front of it: step >= h * (far's half - near's hull above its base) + chip.
  let h = Number(ship.height) || 20
  for (let i = 0; i < n - 1; i++) {
    const reach = scaleOf(i) * 0.5 - scaleOf(i + 1) * (0.5 - HULL)
    if (reach > 0) h = Math.min(h, (step - CHIP_H - 1.5) / reach)
  }
  // ponytail: past 5 teams the water band is too narrow to keep every chip clear; ships stay readable
  // (MIN_SHIP_H) and the chips, drawn above all ships, stay legible. A second row of lanes if it matters.
  h = Math.max(h, MIN_SHIP_H)
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1)            // 0 = farthest, 1 = nearest
    const scale = scaleOf(i)
    return {
      ...ship,
      asset_id: `${ship.asset_id}-lane${i}`,
      x: startX,
      // Mostly above the ship's own line: the near lane must stay clear of the player's deck.
      y: Math.round((y - spread * 0.55 + spread * t) * 10) / 10,
      height: Math.round(h * scale * 10) / 10,
      depth: (Number(ship.depth) || 0.6) * scale,
      anim: 'none',
      anim_out: 'none',
    }
  })
}

/** Where a lane's ship stands, in stage %, for a meter level 0..1. */
export const laneX = (level, startX, finishX) => startX + (finishX - startX) * Math.max(0, Math.min(1, level))

// ── The crew for this run (sessionStorage: this tab, this lesson, gone when it closes) ─────────

const crewKey = (code) => `lp:crew:${code}`

export function readCrew (storage, code) {
  try {
    const crew = JSON.parse(storage?.getItem(crewKey(code)) || '{}')
    return Object.fromEntries(SHIPS.filter(s => typeof crew[s] === 'string' && crew[s].trim()).map(s => [s, crew[s].slice(0, 40)]))
  } catch (_) {
    return {}
  }
}

export function saveCrew (storage, code, crew) {
  try { storage?.setItem(crewKey(code), JSON.stringify(crew)) } catch (_) { /* private mode: the crew lives in memory */ }
}

export function clearCrew (storage, code) {
  try { storage?.removeItem(crewKey(code)) } catch (_) { /* nothing to clear */ }
}

// ── A pupil's best time against the fleet (localStorage) ───────────────────────────────────────

const bestKey = (key) => `lp:race-best:${key}`

export function readBest (storage, key) {
  try {
    const v = Number(storage?.getItem(bestKey(key)))
    return Number.isFinite(v) && v > 0 ? v : null
  } catch (_) {
    return null
  }
}

/** Saves `seconds` when it beats the stored best; returns whether it did. */
export function saveBest (storage, key, seconds) {
  const best = readBest(storage, key)
  if (best !== null && best <= seconds) return false
  try { storage?.setItem(bestKey(key), String(Math.round(seconds * 10) / 10)) } catch (_) { return false }
  return true
}
