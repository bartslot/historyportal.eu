// Draws the four expression decals: History Lines ink, tapered strokes, transparent ground.
// Run: node src/figures/faces.mjs && for f in public/figures/faces/*.svg; do rsvg-convert -w 512 -h 512 "$f" -o "${f%.svg}.png"; done
// Layout (0-100 box, the decal's square): eyes at (30,38) and (70,38), brows above, mouth at (50,80).
import { writeFileSync } from 'node:fs'

const INK = '#2b2420'
// a tapered stroke: two curves from a to b, bowed `bow` and `bow + thick` off the chord: thin ends, full middle
function crescent([ax, ay], [bx, by], bow, thick) {
  const mx = (ax + bx) / 2, my = (ay + by) / 2
  const len = Math.hypot(bx - ax, by - ay) || 1
  const nx = (ay - by) / len, ny = (bx - ax) / len // left normal of a->b (up when a is left of b, y down)
  const c1 = `${mx + nx * bow},${my + ny * bow}`
  const c2 = `${mx + nx * (bow + thick)},${my + ny * (bow + thick)}`
  return `<path d="M${ax},${ay} Q${c1} ${bx},${by} Q${c2} ${ax},${ay} Z" fill="${INK}"/>`
}
const dot = (x, y, rx, ry) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${INK}"/>`
const ring = (x, y, r, w) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${INK}" stroke-width="${w}"/>`
const mirror = (draw) => draw(30, 1) + draw(70, -1) // s = +1 left eye, -1 right eye (inner side = toward 50)

const eyes = (lid = 3.2, py = 0) => mirror((x) => dot(x, 39 + py, 2.4, 3.2) + crescent([x - 6.5, 37.5], [x + 6.5, 37.5], -lid, -1.6))
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
    + `<ellipse cx="50" cy="81" rx="3.2" ry="4.2" fill="none" stroke="${INK}" stroke-width="1.5"/>`,
}
for (const [name, body] of Object.entries(FACES)) {
  writeFileSync(new URL(`../../public/figures/faces/${name}.svg`, import.meta.url),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">${body}</svg>\n`)
}
