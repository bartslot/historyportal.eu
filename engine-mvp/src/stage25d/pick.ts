type Numbers = ArrayLike<number>

/** Every triangle of a flat mesh under a point in its own space, as [u, v] on the picture. A pick only gives the nearest. */
export function uvsUnder(positions: Numbers, uvs: Numbers, indices: Numbers, x: number, y: number): [number, number][] {
  const out: [number, number][] = []
  for (let t = 0; t + 2 < indices.length; t += 3) {
    const a = indices[t], b = indices[t + 1], c = indices[t + 2]
    const ax = positions[a * 3], ay = positions[a * 3 + 1]
    const bx = positions[b * 3], by = positions[b * 3 + 1]
    const cx = positions[c * 3], cy = positions[c * 3 + 1]
    const area = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if (!area) continue
    const wa = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / area
    const wb = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / area
    const wc = 1 - wa - wb
    if (wa < 0 || wb < 0 || wc < 0) continue
    out.push([wa * uvs[a * 2] + wb * uvs[b * 2] + wc * uvs[c * 2], wa * uvs[a * 2 + 1] + wb * uvs[b * 2 + 1] + wc * uvs[c * 2 + 1]])
  }
  return out
}
