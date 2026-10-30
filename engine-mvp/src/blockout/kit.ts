// The clay kit (clay-blockout Gate 1): premade grey pieces an AI or a teacher places to block out a shot. Each piece
// is the lowest level of detail of a real LEGO part (comic-look plan), so a later swap is one-for-one by `id`.
//
//   id          stable kit id (scenes refer to it; never the display name)
//   size        [width x, height y, depth z] in metres, at turn 0, front facing +Z
//   footprint   floor cells (CELL_M) it stands on at turn 0; null = takes no floor space (markers, things on top)
//   anchors     named points in the piece's own frame (metres, origin = bottom centre): where others attach
//   shape       how the engine builds the clay proxy (one AssetContainer per piece, instanced)
//   real        the real asset it stands in for (comic-look library id), for the later swap
import { CELL_M, cellsFor, type Footprint } from '../placement/contract'

export type Vec3 = [number, number, number]
export type Shape =
  | { kind: 'box' }
  | { kind: 'cylinder' }
  | { kind: 'rail' }
  | { kind: 'table' }
  | { kind: 'cannon' }
  | { kind: 'cart' }
  | { kind: 'figure' }
  | { kind: 'none' }

export type KitPiece = {
  id: string
  name: string
  size: Vec3
  footprint: Footprint | null
  anchors: Record<string, Vec3>
  shape: Shape
  real: string | null
}

const fp = (w: number, d: number): Footprint => [cellsFor(w), cellsFor(d)]

function piece(id: string, name: string, size: Vec3, shape: Shape, extra: Partial<KitPiece> = {}): KitPiece {
  return {
    id, name, size, shape,
    footprint: fp(size[0], size[2]),
    anchors: { bottom: [0, 0, 0], top: [0, size[1], 0], front: [0, 0, size[2] / 2] },
    real: null,
    ...extra,
  }
}

export const KIT: KitPiece[] = [
  piece('deck', 'Deck (6 x 4 m)', [6, 0.2, 4], { kind: 'box' }, { footprint: null, real: 'heemskerck-deck' }),
  piece('rail', 'Ship rail (4 m)', [4, 1.0, 0.2], { kind: 'rail' }, { real: 'heemskerck-rail' }),
  piece('mast', 'Mast', [0.5, 9, 0.5], { kind: 'cylinder' }, { real: 'heemskerck-mainmast' }),
  piece('wall', 'Wall (4 m)', [4, 2.6, 0.25], { kind: 'box' }, { real: null }),
  piece('barrel', 'Barrel', [0.6, 0.9, 0.6], { kind: 'cylinder' }, { real: 'barrel-voc' }),
  piece('crate', 'Crate', [0.8, 0.7, 0.8], { kind: 'box' }, { real: 'crate-voc' }),
  piece('chest', 'Sea chest', [1.0, 0.55, 0.5], { kind: 'box' }, { real: 'sea-chest' }),
  piece('cannon', 'Cannon on carriage', [0.8, 0.8, 2.0], { kind: 'cannon' }, { real: 'cannon-voc' }),
  piece('table', 'Table', [1.6, 0.78, 0.9], { kind: 'table' }, { real: 'cabin-table' }),
  piece('cart', 'Hand cart', [1.4, 1.1, 2.6], { kind: 'cart' }, { real: 'cart-dutch' }),
  piece('stool', 'Stool', [0.4, 0.45, 0.4], { kind: 'cylinder' }, { real: 'stool' }),
  piece('figure', 'Figure (mannequin)', [0.5, 1.8, 0.3], { kind: 'figure' }, {
    footprint: [1, 1],
    anchors: { bottom: [0, 0, 0], top: [0, 1.8, 0], eye: [0, 1.66, 0.08], hand: [0, 1.1, 0.25], front: [0, 0, 0.15] },
    real: 'archetype-captain',
  }),
  piece('marker', 'Marker (invisible target)', [0, 0, 0], { kind: 'none' }, { footprint: null }),
]

export const POSES = ['stand', 'point', 'spyglass'] as const
export type Pose = (typeof POSES)[number]

export function kitPiece(id: string): KitPiece {
  const k = KIT.find((p) => p.id === id)
  if (!k) throw new Error(`unknown kit piece "${id}" (kit: ${KIT.map((p) => p.id).join(', ')})`)
  return k
}

/** Half extents [x, z] of a piece turned `yawDeg` about the vertical: its footprint on the floor in metres. */
export function halfExtents(k: KitPiece, yawDeg: number, height = k.size[1]): [number, number] {
  const s = k.size[1] ? height / k.size[1] : 1
  const r = (yawDeg * Math.PI) / 180
  const c = Math.abs(Math.cos(r))
  const n = Math.abs(Math.sin(r))
  const w = (k.size[0] * s) / 2
  const d = (k.size[2] * s) / 2
  return [w * c + d * n, w * n + d * c]
}

export { CELL_M }
