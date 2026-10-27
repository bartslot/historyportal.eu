// library.json -> asset lookup. A layer names an asset id, or `need` tags that resolve to the best tag match.
// Deterministic: most tags matched, then the asset made for that depth, then QA score, then id.
import type { Asset, Library } from './types'

export async function loadLibrary(url: string): Promise<Library & { base: string }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`library ${url}: HTTP ${res.status}`)
  const lib = (await res.json()) as Library
  if (!Array.isArray(lib.assets)) throw new Error(`library ${url}: no assets list`)
  return { ...lib, base: new URL('.', new URL(url, location.href)).href }
}

export const tagsOf = (need: string | string[]): string[] =>
  (Array.isArray(need) ? need : need.split(/[\s,]+/)).map((t) => t.trim().toLowerCase()).filter(Boolean)

/** An id wins outright; otherwise the best tag match, or null when nothing shares a tag. */
export function resolveAsset(lib: Library, ref: { asset?: string | null; need?: string | string[] }, layer?: string): Asset | null {
  if (ref.asset) {
    const byId = lib.assets.find((a) => a.id === ref.asset)
    if (byId) return byId
  }
  // a bare string that is no id is read as tags (set.sky may be either)
  const need = tagsOf(ref.need ?? ref.asset ?? '')
  if (!need.length) return null
  let best: Asset | null = null
  let bestKey: [number, number, number] = [0, 0, 0]
  for (const a of [...lib.assets].sort((p, q) => p.id.localeCompare(q.id))) {
    const hits = need.filter((t) => a.tags.some((g) => g.toLowerCase() === t)).length
    if (!hits) continue
    const key: [number, number, number] = [hits, layer && a.layer === layer ? 1 : 0, a.qa?.score ?? 0]
    if (!best || key[0] > bestKey[0] || (key[0] === bestKey[0] && (key[1] > bestKey[1] || (key[1] === bestKey[1] && key[2] > bestKey[2])))) {
      best = a
      bestKey = key
    }
  }
  return best
}
