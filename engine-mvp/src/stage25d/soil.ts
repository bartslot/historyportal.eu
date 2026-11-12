import type { Asset } from './types'

type RGB = [number, number, number]

/** Ground that is not soil: water, built floors, snow. These keep their painted colour (Bart 11-12: one soil colour
 *  per world, for the earth only). */
const NOT_SOIL = ['water', 'sea', 'ocean', 'river', 'canal', 'lake', 'deck', 'planks', 'interior', 'paving', 'cobbles', 'street', 'quay', 'snow']

/** Is this terrain picture bare earth the world's soil colour applies to? A perspective painting (the sea) never is. */
export const isSoil = (asset: Pick<Asset, 'tags'> & { perspective?: boolean }): boolean =>
  !asset.perspective && !(asset.tags ?? []).some((t) => NOT_SOIL.includes(t))

/** How far one channel may be pushed: a strip painted near black or white is not stretched into noise. */
const LIMIT: [number, number] = [0.25, 3]

/** Per channel, what moves a picture whose average is `own` onto `soil`, keeping its own light and dark. */
export function soilRecolour(own: readonly number[], soil: readonly number[]): RGB {
  return [0, 1, 2].map((i) => Math.min(LIMIT[1], Math.max(LIMIT[0], soil[i] / Math.max(own[i], 0.03)))) as RGB
}

export const NO_RECOLOUR: RGB = [1, 1, 1]
