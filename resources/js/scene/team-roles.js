/**
 * Team roles that rotate (Bart, 2026-10-15). No names: the children of a team pick numbers 1-4
 * themselves, and a role belongs to a NUMBER. Each team interaction of the run shifts every role
 * on by one: number n holds roles[(n - 1 + index) % roles.length]. In a team of three the
 * leftover role goes to one number as a second role, and which number carries it rotates too.
 * Pure; vitest covers it.
 */

/**
 * Who holds what at interaction `index`.
 * @param {string[]} roles  the game's roles, in order
 * @param {number} size     the team's size (3 or 4; clamped to 1..roles.length)
 * @param {number} index    the interaction's place in the run (0 = the first team moment)
 * @returns {string[][]}    per number (number n at [n - 1]) its roles
 */
export function rolesFor (roles, size, index) {
  const r = roles.length
  if (!r) return []
  const n = Math.max(1, Math.min(r, Math.round(Number(size)) || r))
  const i = ((Math.round(Number(index)) || 0) % r + r) % r
  const out = Array.from({ length: n }, (_, k) => [roles[(k + i) % r]])
  // The roles nobody holds yet, one by one to the next number on, starting where the turn is.
  for (let k = n; k < r; k++) out[(k - n + i) % n].push(roles[(k + i) % r])
  return out
}

/** The number that holds `role`, or null. */
export const numberWith = (assignment, role) => {
  const k = assignment.findIndex(rs => rs.includes(role))
  return k < 0 ? null : k + 1
}

/** "1 Kapitein · 2 Bootsman · 3 Verkenner + Stuurman" */
export const roleLine = (assignment) => assignment.map((rs, k) => `${k + 1} ${rs.join(' + ')}`).join(' · ')

/**
 * Which role a prompt asks, as its place in the game's `roles` list (Tasman: Kapitein,
 * Bootsman, Verkenner, Stuurman). The Kapitein decides when the team is unsure and
 * says "Klaar", "Ruilen" or "Houden zo".
 */
export const PROMPT_ROLE = { ready: 0, fit: 1, risk: 2, why: 3, swap: 0 }

/**
 * Whose turn it is on the pick screen (one prompt at a time, PM 10-15): the Bootsman ("past het
 * nog?") while the team loads; the Kapitein ("zijn jullie klaar?") once something is aboard and
 * the team is near "Klaar": nearly full, nothing else fits, or "Toch klaar?" is asked. Nothing
 * once the team is ready.
 * @param {{loaded:number, load:number, budget:number, cheapest:number, confirming?:boolean, confirmed?:boolean}} s
 *   loaded = optional items aboard; cheapest = the cheapest item still to choose (Infinity: none)
 * @returns {'fit'|'ready'|null}
 */
export function pickPrompt ({ loaded, load, budget, cheapest, confirming = false, confirmed = false }) {
  if (confirmed) return null
  if (confirming) return 'ready'
  const nearDone = load >= budget * 0.9 || budget - load < cheapest
  return loaded > 0 && nearDone ? 'ready' : 'fit'
}

/**
 * Whose turn it is at Laatste kans: the Verkenner ("wat kan er misgaan?") first, the Kapitein
 * ("ruilen of houden zo?") once the team has picked something to swap; nothing once it swapped
 * or kept.
 * @param {{open:boolean, picked:boolean}} s  open = the team may still swap; picked = an item chosen
 * @returns {'risk'|'swap'|null}
 */
export const exchangePrompt = ({ open, picked }) => (!open ? null : picked ? 'swap' : 'risk')
