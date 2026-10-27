// Draws the four expression decals: History Lines ink, tapered strokes, transparent ground.
// Run: node src/figures/faces.mjs && for f in public/figures/faces/*.svg; do rsvg-convert -w 512 -h 512 "$f" -o "${f%.svg}.png"; done
// Layout (0-100 box, the decal's square): eyes at (30,38) and (70,38), brows above, mouth at (50,80).
import { writeFileSync } from 'node:fs'

const INK = '#2b2420'
const W = 1.8 // line weight: the face is ~200 px on screen at most, thinner lines vanish
// a tapered stroke: two curves from a to b, bowed `bow` and `bow + thick` off the chord: thin ends, full middle
function crescent([ax, ay], [bx, by], bow, thick) {
  const mx = (ax + bx) / 2, my = (ay + by) / 2
  const len = Math.hypot(bx - ax, by - ay) || 1
  const nx = (ay - by) / len, ny = (bx - ax) / len // left normal of a->b (up when a is left of b, y down)
  const c1 = `${mx + nx * bow},${my + ny * bow}`
  const c2 = `${mx + nx * (bow + thick * W)},${my + ny * (bow + thick * W)}`
  return `<path d="M${ax},${ay} Q${c1} ${bx},${by} Q${c2} ${ax},${ay} Z" fill="${INK}"/>`
}
const dot = (x, y, rx, ry) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${INK}"/>`
const ring = (x, y, r, w) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${INK}" stroke-width="${w * W}"/>`
const mirror = (draw) => draw(30, 1) + draw(70, -1) // s = +1 left eye, -1 right eye (inner side = toward 50)

const eyes = (lid = 3.2, py = 0) => mirror((x) => dot(x, 39 + py, 3, 3.9) + crescent([x - 6.5, 37.5], [x + 6.5, 37.5], -lid, -1.6))
const FACES = {
  neutral: eyes() + mirror((x, s) => crescent([x - 7 * s, 27], [x + 6 * s, 26], -s * 1.6, -s * 1.4))
    + crescent([43, 80], [57, 80], 0.5, 1.3),
  happy: eyes(3.6) + mirror((x) => crescent([x - 4.5, 44], [x + 4.5, 44], -1.6, -0.8))
    + mirror((x, s) => crescent([x - 7 * s, 25], [x + 6 * s, 23.5], -s * 2.6, -s * 1.4))
    + crescent([41, 77.5], [59, 77.5], 4.2, 1.8),
  worried: eyes(2.6, 0.6) + mirror((x, s) => crescent([x - 7 * s, 28.5], [x + 5 * s, 24], -s * 1.0, -s * 1.4))
    + crescent([44, 81.5], [56, 81.5], -1.6, -1.2),
  surprised: mirror((x) => dot(x, 39, 1.9, 2.4) + ring(x, 38.6, 5.2, 1.1))
    + mirror((x, s) => crescent([x - 7 * s, 23], [x + 6 * s, 21.5], -s * 3.4, -s * 1.3))
    + `<ellipse cx="50" cy="81" rx="3.2" ry="4.2" fill="none" stroke="${INK}" stroke-width="${1.5 * W}"/>`,
  // brows' inner ends up, eyes half down, the mouth turned down
  sad: eyes(2.0, 0.8) + mirror((x, s) => crescent([x - 7 * s, 27], [x + 5 * s, 23.5], s * 0.6, -s * 1.3))
    + crescent([43, 82.5], [57, 82.5], -2.6, -1.3),
  // brows' inner ends DOWN in a hard V, a flat tight mouth
  angry: eyes(2.4, 0.4) + mirror((x, s) => crescent([x - 7 * s, 24.5], [x + 5 * s, 29], s * 0.4, -s * 1.6))
    + crescent([43, 81], [57, 81], 0.2, 1.5),
  // calm high brows, eyes a little narrowed, a closed half-smile
  proud: eyes(2.2, 0.5) + mirror((x, s) => crescent([x - 7 * s, 25.5], [x + 6 * s, 24.5], -s * 1.8, -s * 1.4))
    + crescent([43, 79.5], [56, 78.5], 2.2, 1.3),
  // heavy lids (a lid line low over the pupil), brows flat, a small open mouth
  tired: mirror((x) => dot(x, 40.5, 3, 2.6) + crescent([x - 6.5, 39], [x + 6.5, 39], -1.2, -1.8))
    + mirror((x, s) => crescent([x - 7 * s, 28], [x + 6 * s, 28], -s * 0.6, -s * 1.3))
    + `<ellipse cx="50" cy="81" rx="2.4" ry="1.8" fill="none" stroke="${INK}" stroke-width="${1.3 * W}"/>`,
}
for (const [name, body] of Object.entries(FACES)) {
  writeFileSync(new URL(`../../public/figures/faces/${name}.svg`, import.meta.url),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">${body}</svg>\n`)
}
