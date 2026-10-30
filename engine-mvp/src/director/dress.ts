// The set dresser: a scene with a few loose props reads as "dead empty scenes with cutout stickers" (Bart,
// 5/10). It fills the set the way a painter does: CLUSTERS of tufts, shrubs and stones in varied sizes,
// things in front of things, a dressed near band, props in front of a subject's base (grass before a hut
// wall), and life: a small herd grazing, pots and baskets by a door. Pure and deterministic per scene
// (seeded). It only PROPOSES: every layer it adds is marked `dressed: true`; the teacher can see and remove
// each one, and a scene the teacher re-dressed is left as it is. OFF by default: only `dress: true`.
//
// Rules (PM checks 15 + 16):
// - what: an asset's FIRST tag names its kind (an allowlist): plant, stone, cargo, household, animal. A
//   structure or subject tag (chamber, capstone, building...) keeps it out; S2's `dressing` flag wins.
// - where: the scene's HABITAT (interior, deck, quay, wet, dry). Rooms and decks take household and cargo
//   things only; wet plants only by water; cargo on a quay; animals and plants outdoors; household things
//   outdoors only, at the base of a house or hut.
// - clear zones: a prop may stand in front of a subject's lowest OCCLUDE of its height (a figure's legs,
//   never its head), checked on screen at every camera pose of the scene's shots (parallax). An unknown
//   subject (no art yet) is kept clear whole.
// - size: no prop over MAX_SHARE of the frame high, framing at the edge EDGE_SHARE; sizes from height_m
//   through the stage's own view (stage25d/layout.ts); fewer props on a silence.
import { DEPTH_Z, viewWidthAt } from '../stage25d/layout'
import type { CamPose, Depth, LayerRef, Library, LibraryAsset, Scene } from './types'

export const SHIP_SCORE = 7.5
type Kind = 'plant' | 'stone' | 'cargo' | 'household' | 'animal'
/** An asset's kind, from its FIRST tag (the allowlist). */
const KINDS: Record<Kind, string[]> = {
  plant: ['grass', 'tuft', 'shrub', 'heather', 'bramble', 'reeds', 'reed', 'papyrus', 'barley', 'meadow', 'tree', 'palm'],
  stone: ['rock', 'boulder', 'boulders', 'stones', 'stone', 'pebble', 'pebbles', 'log', 'deadwood', 'timber', 'fence'],
  cargo: ['crate', 'crates', 'barrel', 'barrels', 'sacks', 'sack', 'bollard', 'rope', 'cargo', 'cart', 'handcart', 'wheelbarrow'],
  household: ['pot', 'jar', 'jug', 'bowl', 'basket', 'quern', 'bucket', 'chest', 'lantern', 'cloth', 'axe', 'sickle', 'bag', 'stick', 'bread'],
  animal: ['cow', 'calf', 'cattle', 'sheep', 'goat', 'pig', 'gazelle', 'herd'],
}
const kindOf = (a: LibraryAsset): Kind | null => (Object.keys(KINDS) as Kind[]).find((k) => KINDS[k].includes(a.tags[0])) ?? null
/** Tags that make an asset a story subject or a structure. */
const SUBJECT = new Set(['hut', 'house', 'fire', 'hearth', 'hunebed', 'dolmen', 'grave', 'boat', 'ship', 'city', 'temple', 'wall',
  'workshop', 'loom', 'crane', 'warehouse', 'bridge', 'jetty', 'ground', 'sky', 'field', 'chamber', 'capstone', 'rollers', 'monument',
  'megalith', 'building', 'construction', 'ruin', 'statue', 'tomb'])
/** A named layer with one of these tags is a building: household things stand at its base. */
const BUILDING = new Set(['hut', 'house', 'longhouse', 'farmhouse', 'houses'])

/** Habitats. A scene's comes from `set.habitat`, else from the words of its named layers and ground. */
export type Habitat = 'interior' | 'deck' | 'quay' | 'wet' | 'dry'
const HABITAT_WORDS: [Habitat, string[]][] = [
  ['interior', ['room', 'hall', 'interior', 'studio', 'atelier', 'shop', 'museum', 'office', 'cabin', 'kitchen', 'inside', 'gallery']],
  ['deck', ['deck', 'aboard', 'galley']],
  ['quay', ['quay', 'harbour', 'harbor', 'port', 'dock', 'docks', 'wharf', 'jetty', 'kade', 'haven']],
  ['wet', ['water', 'marsh', 'wet', 'river', 'polder', 'canal', 'shore', 'coast', 'sea', 'lake', 'swamp', 'nile', 'delta', 'euphrates', 'reeds']],
]
const OUTDOORS: Habitat[] = ['dry', 'wet']
const WET_PROP = new Set(['reeds', 'reed', 'papyrus', 'marsh', 'water', 'wet'])
const ON_WHEELS = new Set(['cart', 'handcart', 'wheelbarrow'])

const words = (s: string | null | undefined) => (s ?? '').toLowerCase().split(/[^a-z]+/).filter(Boolean)

/** The scene's habitat: `set.habitat`, else the first habitat whose words its named layers or ground carry. */
export function habitatOf(scene: Scene, library: Library | null): Habitat {
  if (scene.set.habitat) return scene.set.habitat as Habitat
  const byId = new Map((library?.assets ?? []).map((a) => [a.id, a]))
  const said = new Set([
    ...words(scene.set.ground),
    ...scene.set.layers.filter((l) => !l.dressed).flatMap((l) => [...words(l.need), ...words(l.asset), ...(l.asset ? byId.get(l.asset)?.tags ?? [] : [])]),
  ])
  return HABITAT_WORDS.find(([, ws]) => ws.some((w) => said.has(w)))?.[0] ?? 'dry'
}

/** Where a prop lives: its own `habitat`, else by kind. */
function propHabitats(a: LibraryAsset, kind: Kind): string[] {
  if (a.habitat) return a.habitat
  if (kind === 'plant') return a.tags.some((t) => WET_PROP.has(t)) ? ['wet'] : OUTDOORS
  if (kind === 'stone' || kind === 'animal') return OUTDOORS
  if (kind === 'cargo') return a.tags.some((t) => ON_WHEELS.has(t)) ? ['quay'] : ['quay', 'deck']
  return ['interior', 'deck'] // household: indoors, and outdoors only at a house's base (see dressing)
}

export type Role = 'clump' | 'herd' | 'mid' | 'floor' | 'low' | 'frame' | 'near'
type RoleSpec = {
  depth: Depth; height: [number, number]; kinds: Kind[]; tags?: string[]
  /** first tags never placed here: a fence is a line, never a tuft at the edge */
  avoid?: string[]
  /** clusters per scene (before density), members per cluster */
  clusters: number; members: [number, number]
  /** where a cluster's anchor goes in the opening view: anywhere, at the edges, at the sides, or across the bottom */
  place: 'any' | 'edge' | 'side' | 'across'
}
/** Heights are shares of the opening view's frame height at the role's depth. */
const ROLES: Record<Role, RoleSpec> = {
  clump: { depth: 'bg', height: [0.08, 0.2], kinds: ['plant'], tags: ['tree', 'palm'], clusters: 2, members: [1, 3], place: 'any' },
  /** a small herd grazing at mid: life in the picture (a breathing sway, see ANIMAL_MOTION) */
  herd: { depth: 'mid', height: [0.03, 0.06], kinds: ['animal'], clusters: 1, members: [2, 4], place: 'any' },
  mid: { depth: 'mid', height: [0.05, 0.14], kinds: ['plant', 'stone', 'cargo', 'household'], clusters: 2, members: [2, 4], place: 'any' },
  /** tufts across the open ground band, between the figures: what makes a floor read as a place */
  floor: { depth: 'mid', height: [0.025, 0.06], kinds: ['plant', 'stone', 'cargo', 'household'], clusters: 2, members: [2, 5], place: 'any' },
  low: { depth: 'fg', height: [0.05, 0.12], kinds: ['plant', 'stone', 'cargo', 'household'], clusters: 2, members: [2, 4], place: 'side', avoid: ['fence'] },
  frame: { depth: 'fg', height: [0.18, 0.3], kinds: ['plant', 'stone', 'cargo'], clusters: 2, members: [1, 3], place: 'edge', avoid: ['fence'] },
  /** the near band (3.5 m): tufts, reeds and stones along the whole bottom edge, partly out of frame */
  near: { depth: 'near', height: [0.1, 0.3], kinds: ['plant', 'stone', 'cargo', 'household'], clusters: 3, members: [2, 4], place: 'across', avoid: ['fence'] },
}
const ROLE_ORDER: Role[] = ['clump', 'herd', 'mid', 'floor', 'low', 'frame', 'near']
const BEAT_DENSITY: Record<string, number> = { hook: 1, setup: 1, cause: 0.9, effect: 0.9, turn: 0.8, climax: 1, recap: 0.7 }
const SILENCE_DENSITY = 0.5
/** No prop taller than this share of the frame; framing at the edge up to EDGE_SHARE. The balloons float in
 *  the top band, so EDGE_SHARE also keeps framing out of it. */
export const MAX_SHARE = 0.2
export const EDGE_SHARE = 0.3
/** A prop may stand in front of this lowest share of a subject's height (grass before a hut wall)... */
export const OCCLUDE = 0.3
/** ...and of a figure: its legs and body, never its head (FIGURE_H metres tall). */
export const BODY_OCCLUDE = 0.45
const FIGURE_H = 1.7
/** The scales a prop may take: outside this it is the wrong asset for the role. */
const SCALE_OK: [number, number] = [0.45, 1.6]
/** Clear zone around a figure (scene x), at its depth and nearer. */
const FIGURE_CLEAR = 0.1
/** A role whose window keeps less than this share of the view gets no props there. */
const MIN_WINDOW = 0.1
/** Animals breathe: a slow, small sway from the feet (S1 has no head or tail loop yet). */
const ANIMAL_MOTION = { kind: 'sway', amount: 0.25, speed: 0.5 }
const ORDER: Depth[] = ['sky', 'bg', 'mid', 'fg', 'near']
const nearer = (a: Depth, than: Depth) => ORDER.indexOf(a) >= ORDER.indexOf(than)

/** mulberry32: a small seeded RNG, so one scene always gets the same dressing. */
export function rng(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353), h = (h << 13) | (h >>> 19)
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Pose = Pick<CamPose, 'x' | 'z' | 'fov'> & { y?: number }
const HOUSE_POSE: Pose = { x: 0, y: 1.6, z: 0, fov: 50 }

/** The view's height in metres at distance d, for a pose's field of view (16:9). */
const viewHeightAt = (d: number, fov?: number) => (viewWidthAt(d, fov) * 9) / 16

/** A layer's footprint across the frame (0..1 of the view at its own depth), from its asset's size. */
export function footprint(layer: Pick<LayerRef, 'x' | 'scale' | 'depth'>, asset: Pick<LibraryAsset, 'height_m' | 'w' | 'h'> | undefined): [number, number] {
  const x = layer.x ?? 0.5
  if (!asset?.height_m || !asset.w || !asset.h) return [x - 0.08, x + 0.08]
  const width = (asset.height_m * (layer.scale ?? 1) * asset.w) / asset.h / viewWidthAt(DEPTH_Z[layer.depth])
  return [x - width / 2, x + width / 2]
}

/** A span (0..1 of the house view at depth z) as seen from a camera pose: 0..1 of that pose's frame. The
 *  stage moves the camera's position only (no aim), so this is the whole projection. */
export function onScreen(span: [number, number], z: number, pose: Pose): [number, number] {
  const house = viewWidthAt(z), view = viewWidthAt(z - pose.z, pose.fov)
  return [0.5 + ((span[0] - 0.5) * house - pose.x) / view, 0.5 + ((span[1] - 0.5) * house - pose.x) / view]
}

/** A height `y` metres above the ground at depth z, as a screen row (0 top .. 1 bottom). */
export const screenRow = (y: number, z: number, pose: Pose): number => 0.5 + ((pose.y ?? 1.6) - y) / viewHeightAt(z - pose.z, pose.fov)

/** The house-view span (0..1 at this depth) a camera pose shows. */
export function windowAt(depth: Depth, pose: Pose): [number, number] {
  const z = DEPTH_Z[depth], house = viewWidthAt(z), half = viewWidthAt(z - pose.z, pose.fov) / 2
  return [(pose.x - half) / house + 0.5, (pose.x + half) / house + 0.5]
}

/** Tallest asset that can still be a prop (a 66 m river strip carrying a `palm` tag is a backdrop). */
const PROP_MAX_M = 25
const BACKDROP_LAYERS = new Set(['bg', 'sky', 'ground'])
function isProp(a: LibraryAsset): boolean {
  if ((a.qa?.score ?? 0) < SHIP_SCORE || a.tileable_x || BACKDROP_LAYERS.has(a.layer) || !((a.height_m ?? 0) > 0) || a.height_m! > PROP_MAX_M) return false
  if (a.dressing !== undefined) return a.dressing
  const kind = kindOf(a)
  return !!kind && (kind === 'household' || kind === 'animal' || !a.tags.some((t) => SUBJECT.has(t)))
}

/** A subject the dresser keeps readable: `span` is its core across the frame (CORE of its width), `whole` its
 *  full width, `line` the height in metres up to which a prop may stand in front of it. */
const BACKDROP_SHARE = 0.6
const CORE = 0.7
const UNKNOWN_HALF = 0.2
type Kept = { depth: Depth; span: [number, number]; whole: [number, number]; line: number; unknown?: boolean }
function kept(l: LayerRef, a: LibraryAsset | undefined): Kept | null {
  if (a && (BACKDROP_LAYERS.has(a.layer) || a.tileable_x)) return null
  if (!a?.height_m || !a.w || !a.h) {
    // art not made yet: its size is a guess, so it is kept clear whole, from the ground up
    const whole: [number, number] = [(l.x ?? 0.5) - UNKNOWN_HALF, (l.x ?? 0.5) + UNKNOWN_HALF]
    return { depth: l.depth, span: whole, whole, line: 0, unknown: true }
  }
  const whole = footprint(l, a)
  const pad = ((whole[1] - whole[0]) * (1 - CORE)) / 2
  return { depth: l.depth, span: [whole[0] + pad, whole[1] - pad], whole, line: OCCLUDE * a.height_m * (l.scale ?? 1) }
}

export type DressOptions = { silent?: boolean; seed?: string; poses?: Pose[] }

/** The props the dresser proposes for one scene (new layers, `dressed: true`). Pure. `poses`: every camera
 *  pose of the scene's shots; the first is the view the scene opens on (its window places the edge props
 *  and its frame height sizes every prop). Without poses: the house view. */
export function dressing(scene: Scene, library: Library | null, opts: DressOptions = {}): LayerRef[] {
  if (!library || scene.dress !== true) return []
  const habitat = habitatOf(scene, library)
  const props = library.assets.filter(isProp).map((a) => ({ a, kind: kindOf(a) }))
  if (!props.length) return []
  const rand = rng(opts.seed ?? `${library.bundle}/${scene.id}`)
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)]
  const between = ([lo, hi]: [number, number]) => lo + rand() * (hi - lo)
  const density = (BEAT_DENSITY[scene.beat] ?? 1) * (opts.silent ? SILENCE_DENSITY : 1)
  const byId = new Map(library.assets.map((a) => [a.id, a]))
  const poses = opts.poses?.length ? opts.poses : [HOUSE_POSE]
  const opening = poses[0]

  const namedLayers = scene.set.layers.filter((l) => !l.dressed)
  const keep: Kept[] = [
    ...namedLayers.flatMap((l) => kept(l, l.asset ? byId.get(l.asset) : undefined) ?? []),
    ...(scene.figures ?? []).map((f): Kept => {
      const span: [number, number] = [(f.x ?? 0.5) - FIGURE_CLEAR, (f.x ?? 0.5) + FIGURE_CLEAR]
      return { depth: f.depth ?? 'mid', span, whole: span, line: BODY_OCCLUDE * FIGURE_H }
    }),
  ]
  const overlaps = (a: [number, number], b: [number, number]) => a[0] < b[1] && b[0] < a[1]
  // a prop at a kept subject's depth or nearer may not rise above the subject's line where the two overlap
  // on screen, at any pose (they drift apart as the camera moves)
  const blocks = (depth: Depth, span: [number, number], top: number, k: Kept) => poses.some((p) => {
    const whole = onScreen(k.whole, DEPTH_Z[k.depth], p)
    if (whole[1] - whole[0] > BACKDROP_SHARE) return false
    if (!overlaps(onScreen(span, DEPTH_Z[depth], p), onScreen(k.span, DEPTH_Z[k.depth], p))) return false
    if (k.unknown) return true // no art yet: nothing stands in front of it, whatever its height
    return screenRow(top, DEPTH_Z[depth], p) < screenRow(k.line, DEPTH_Z[k.depth], p)
  })
  const free = (depth: Depth, span: [number, number], top: number) =>
    keep.every((k) => !nearer(depth, k.depth) || !blocks(depth, span, top, k))

  const out: LayerRef[] = []
  const add = (asset: LibraryAsset, depth: Depth, x: number, scale: number, extra: Partial<LayerRef> = {}): boolean => {
    const layer: LayerRef = { asset: asset.id, need: asset.tags.slice(0, 2).join(' '), depth, x: Math.round(x * 1000) / 1000, scale: Math.round(scale * 100) / 100, dressed: true, ...extra }
    if (!free(depth, footprint(layer, asset), asset.height_m! * layer.scale!)) return false
    out.push(layer)
    return true
  }

  for (const role of ROLE_ORDER) {
    const spec = ROLES[role]
    const { depth, height } = spec
    const edge = spec.place === 'edge' || spec.place === 'across'
    const [lo, hi] = spec.place === 'any' ? [0, 1] : windowAt(depth, opening)
    const w = hi - lo
    if (w < MIN_WINDOW) continue
    const frameH = viewHeightAt(DEPTH_Z[depth] - opening.z, opening.fov)
    const capM = (edge ? EDGE_SHARE : MAX_SHARE) * frameH
    // household things stand by a house's door, not scattered over the field: outdoors they come from the base loop below
    const kinds = spec.kinds.filter((k) => k !== 'household' || !OUTDOORS.includes(habitat))
    const fits = props.filter(({ a, kind }) => kind && kinds.includes(kind) && (!spec.tags || spec.tags.includes(a.tags[0])) && !spec.avoid?.includes(a.tags[0]) && propHabitats(a, kind).includes(habitat))
    // assets whose own size suits the role (scale within SCALE_OK at the middle of its height range)
    const midH = ((height[0] + height[1]) / 2) * frameH
    const suited = fits.filter(({ a }) => midH / a.height_m! >= SCALE_OK[0] && midH / a.height_m! <= SCALE_OK[1])
    const choice = (suited.length ? suited : fits).map(({ a }) => a)
    if (!choice.length) continue
    const clusters = Math.max(spec.clusters > 1 ? 1 : 0, Math.round(spec.clusters * density))
    const used = new Set<string>()
    for (let c = 0; c < clusters; c++) {
      const side = c % 2 === 0 ? -1 : 1
      const u = spec.place === 'edge' ? (side < 0 ? -0.04 + rand() * 0.1 : 0.94 + rand() * 0.1)
        : spec.place === 'side' ? (side < 0 ? 0.04 + rand() * 0.22 : 0.74 + rand() * 0.22)
          : spec.place === 'across' ? (c + rand()) / clusters
            : 0.06 + rand() * 0.88
      const anchor = lo + u * w
      const lead = pick(choice)
      const members = Math.round(between(spec.members))
      const base = between(height) * frameH
      for (let m = 0, tries = 0; m < members && tries < members * 3; tries++) {
        // a painter's clump: mostly the lead asset, a few others; the first is the biggest, the rest smaller
        // a varied clump: prefer assets this scene has not used, and jitter each member's size, so a
        // repeated asset at one depth never lines up on one screen row
        const fresh = choice.filter((a) => !used.has(a.id))
        const asset = fresh.length && rand() < 0.7 ? pick(fresh) : lead
        const target = Math.min(capM, base * (m === 0 ? 1 : 0.4 + rand() * 0.8))
        const scale = Math.round(Math.min(SCALE_OK[1], Math.max(0.3, target / asset.height_m!)) * 100) / 100 // as stored
        if (asset.height_m! * scale > capM + 1e-6) continue
        const spread = Math.max(0.02, (asset.height_m! * scale * (asset.w ?? 1)) / (asset.h ?? 1) / viewWidthAt(DEPTH_Z[depth]) * 1.4)
        const x = anchor + (rand() - 0.5) * spread * Math.min(members, 4) * 1.5
        // an edge or near-band prop stays in the view the scene opens on: out of frame is fine, out of view is not
        if (spec.place !== 'any' && (x < lo || x > hi)) continue
        if (spec.place === 'edge' && (side < 0 ? x > lo + 0.12 * w : x < lo + 0.88 * w)) continue
        const extra = kindOf(asset) === 'animal' ? { motion: ANIMAL_MOTION } : {}
        if (add(asset, depth, x, scale, extra)) { m++; used.add(asset.id) }
      }
    }
  }

  // household things at the base of each house or hut, outdoors: pots and baskets by the door
  if (OUTDOORS.includes(habitat)) {
    const household = props.filter(({ kind }) => kind === 'household').map(({ a }) => a)
    for (const l of namedLayers) {
      const a = l.asset ? byId.get(l.asset) : undefined
      if (!a || !household.length || !a.tags.some((t) => BUILDING.has(t))) continue
      const [x0, x1] = footprint(l, a)
      const n = Math.round(between([2, 4]) * density)
      for (let k = 0, tries = 0; k < n && tries < n * 3; tries++) {
        if (add(pick(household), l.depth, x0 + (0.1 + rand() * 0.8) * (x1 - x0), 0.8 + rand() * 0.4)) k++
      }
    }
  }
  return out
}
