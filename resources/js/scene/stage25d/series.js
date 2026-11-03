/**
 * stage25d/series: the pictures of one character are one series ("Dorpeling A", every pose and both facings), the way
 * Unity, Figma and Canva group variants. Read from library.json as it is: a figure picture names its character in a
 * `char:` tag (else its id, fig-<character>-<pose>-01) and its pose and facing in `pose:` and `facing:` tags.
 * Pure, so the Assets tab, the inspector and the tests agree on one definition.
 */
import { characterOf } from './labels.js'

/** The series a picture belongs to (its character), or null for a picture that stands alone. */
export const seriesOf = (asset) => ((asset?.layer === 'figure' || /^fig-/.test(String(asset?.id ?? ''))) ? characterOf(asset) : null)

const tagValue = (asset, prefix) => (asset?.tags ?? []).find((t) => t.startsWith(prefix))?.slice(prefix.length) ?? null

/** A picture's pose and facing: { pose: 'walk', facing: 'left' }. Without tags: the id (fig-x-walk-01-l). */
export function poseOf (asset) {
  const m = /-([a-z]+)-\d+(-l)?$/.exec(String(asset?.id ?? ''))
  return {
    pose: tagValue(asset, 'pose:') ?? m?.[1] ?? null,
    facing: tagValue(asset, 'facing:') ?? (m?.[2] ? 'left' : 'right'),
  }
}

/** The tile a series shows: standing, facing right when it has one, else its first picture. */
export const coverOf = (members) => members.find((a) => poseOf(a).pose === 'stand' && poseOf(a).facing === 'right') ?? members[0]

/**
 * The Assets tab's tiles: a picture that stands alone is its own tile, a series is ONE tile (its cover) with the count
 * of its pictures. Tiles keep the library's order, a series at its first picture.
 * @returns {Array<{ id: string, asset: object, series: string|null, count: number, members: object[] }>}
 */
export function libraryTiles (assets) {
  const bySeries = new Map()
  const tiles = []
  for (const a of assets ?? []) {
    const s = seriesOf(a)
    if (!s) { tiles.push({ id: a.id, asset: a, series: null, count: 1, members: [a] }); continue }
    if (!bySeries.has(s)) { const tile = { id: `series:${s}`, asset: a, series: s, count: 0, members: [] }; bySeries.set(s, tile); tiles.push(tile) }
    const tile = bySeries.get(s)
    tile.members = [...tile.members, a]
    tile.count = tile.members.length
  }
  return tiles.map((t) => (t.series ? { ...t, asset: coverOf(t.members) } : t))
}

/** The pictures of the series `asset` belongs to (just itself when it stands alone). */
export const membersOf = (assets, asset) => {
  const s = seriesOf(asset)
  return s ? (assets ?? []).filter((a) => seriesOf(a) === s) : (asset ? [asset] : [])
}

/** The characters of a library, each with its cover: [{ series, asset }], in library order. */
export const charactersOf = (assets) => libraryTiles(assets).filter((t) => t.series).map((t) => ({ series: t.series, asset: t.asset }))

/**
 * Another character in the same pose and facing as `from` (a quick switch of who stands there); without that pose,
 * standing in the same facing; else the character's cover. null when the library has no such character.
 */
export function sameStanceIn (assets, from, series) {
  const members = (assets ?? []).filter((a) => seriesOf(a) === series)
  if (!members.length) return null
  const want = poseOf(from)
  const match = (pose, facing) => members.find((a) => poseOf(a).pose === pose && poseOf(a).facing === facing)
  return match(want.pose, want.facing) ?? match('stand', want.facing) ?? coverOf(members)
}
