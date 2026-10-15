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
