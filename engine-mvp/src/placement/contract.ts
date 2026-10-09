// The asset contract: what every placeable thing in the studio declares about itself, so the editor
// reads data instead of special-casing assets (Sims build mode: the object knows where it may stand
// and how it turns; the teacher never configures it).
//
//   snaps_to   floor | wall | surface | sky   where it may be put down
//   height_m   its real height in metres (things are never scaled to fit: resize = depth)
//   footprint  [across, deep] in grid cells at turn 0; omitted = measured when it is built;
//              null = takes no floor space (a whole town, a backdrop)
//   turn_step  degrees per step of the ring and of [ and ]; 90 for furniture, 45 for people
//   forward    radians, for models that face another way than +Z
//
// Anchor is always bottom centre (Bart, 2026-09-29), so it is not a field.

export const CELL_M = 0.5
export const SNAPS = ['floor', 'wall', 'surface', 'sky'] as const
export type SnapsTo = (typeof SNAPS)[number]
export type Footprint = [number, number]

export type AssetContract = {
  snaps_to: SnapsTo
  height_m: number | null
  footprint: Footprint | null | undefined
  turn_step: number
  forward: number
}

const DEFAULT_TURN = { floor: 90, wall: 90, surface: 90, sky: 15 } as const

/** Fill the defaults and refuse anything malformed, naming the asset: a bad entry fails at load, not in a lesson. */
export function contractOf(item: Record<string, any>): AssetContract {
  const name = item.name ?? '(unnamed asset)'
  const snaps_to: SnapsTo = item.snaps_to ?? 'floor'
  if (!SNAPS.includes(snaps_to)) throw new Error(`${name}: snaps_to must be one of ${SNAPS.join(', ')}`)
  const height_m = item.height_m ?? item.height ?? null
  if (height_m !== null && !(Number.isFinite(height_m) && height_m > 0)) throw new Error(`${name}: height_m must be a positive number of metres`)
  const footprint = item.footprint
  if (footprint !== undefined && footprint !== null) {
    const ok = Array.isArray(footprint) && footprint.length === 2 && footprint.every((n: unknown) => Number.isInteger(n) && (n as number) > 0)
    if (!ok) throw new Error(`${name}: footprint must be [across, deep] whole cells, or null`)
  }
  const turn_step = item.turn_step ?? DEFAULT_TURN[snaps_to]
  if (!(Number.isFinite(turn_step) && turn_step > 0 && turn_step <= 360)) throw new Error(`${name}: turn_step must be 1-360 degrees`)
  return { snaps_to, height_m, footprint, turn_step, forward: item.forward ?? 0 }
}

/** Cells a measured size covers, never less than one. */
export const cellsFor = (metres: number) => Math.max(1, Math.ceil(metres / CELL_M - 1e-6))

/** The footprint's cells after turning `deg` about its centre: the turned rectangle's bounding cells. */
export function turnedFootprint([w, d]: Footprint, deg: number): Footprint {
  const r = (deg * Math.PI) / 180
  const c = Math.abs(Math.cos(r))
  const s = Math.abs(Math.sin(r))
  return [cellsFor((w * c + d * s) * CELL_M), cellsFor((w * s + d * c) * CELL_M)]
}

/** Snap a centre coordinate so a span of `cells` lies exactly on the grid: odd spans centre in a cell, even on a line. */
export function snapCentre(v: number, cells: number) {
  return cells % 2
    ? Math.floor(v / CELL_M) * CELL_M + CELL_M / 2
    : Math.round(v / CELL_M) * CELL_M
}

/** The grid cells a footprint covers when centred at (x, z), as "i,j" keys. */
export function cellsCovered(x: number, z: number, [w, d]: Footprint): Set<string> {
  const i0 = Math.round((x - (w * CELL_M) / 2) / CELL_M)
  const j0 = Math.round((z - (d * CELL_M) / 2) / CELL_M)
  const out = new Set<string>()
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) out.add(`${i0 + i},${j0 + j}`)
  return out
}

export const overlaps = (a: Set<string>, b: Set<string>) => [...a].some((k) => b.has(k))
