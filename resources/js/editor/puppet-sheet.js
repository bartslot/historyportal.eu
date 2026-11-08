/**
 * puppet-sheet.js: a boned figure is kept as loose parts on a sheet (Bart, 2026-11-08: "yes, fix it"). The picture editor
 * shows it whole, at rest, the way the stage draws it, and a save goes back onto the sheet, because that sheet is what the
 * stage bends.
 */
import { loadImage } from '../scene/load-image.js'

const canvasOf = (width, height) => {
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  return c
}

/** A part's place on the figure and on the sheet. */
const cellOf = ({ quad: [[x0, y0], , [x1, y1]], uv: [u0, v0, u1, v1] }, aw, ah) => ({
  x0, y0, x1, y1, ax: u0 * aw, ay: v0 * ah, sx: ((u1 - u0) * aw) / (x1 - x0), sy: ((v1 - v0) * ah) / (y1 - y0),
})

/**
 * The figure at rest from a sheet: parts in the stage's order, the first at the back. `url` is the figure as a picture
 * (blob:, the caller revokes it), `sheet` the sheet's own pixels for writeBack.
 */
export async function figureFromSheet (puppet, sheetUrl) {
  const img = await loadImage(sheetUrl)
  const aw = img.naturalWidth, ah = img.naturalHeight
  const figure = canvasOf(puppet.width, puppet.height)
  const g = figure.getContext('2d')
  for (const part of puppet.parts) {
    const c = cellOf(part, aw, ah)
    g.drawImage(img, c.ax, c.ay, c.sx * (c.x1 - c.x0), c.sy * (c.y1 - c.y0), c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0)
  }
  const whole = canvasOf(aw, ah)
  const sheetG = whole.getContext('2d', { willReadFrequently: true })
  sheetG.drawImage(img, 0, 0)
  const blob = await new Promise((resolve) => figure.toBlob(resolve, 'image/png'))
  return { url: URL.createObjectURL(blob), sheet: { data: sheetG.getImageData(0, 0, aw, ah).data, width: aw, height: ah } }
}

/**
 * The figure's edits written onto a copy of its sheet. Only what changed is touched, so an untouched sheet stays as it was.
 * A change goes on the part showing there and leaves the paint hidden under it, which an arm uncovers when it moves. Where
 * the result is not solid the parts under it are cleared too, or they would show through what was erased.
 * Into a hole every part has lost, paint goes back on the part that first held paint there (`first`: the sheet before any
 * edit). Under anything solid, what a hole had taken from the hidden parts returns.
 * `lost`: edited pixels no part reaches, which a sheet cannot hold. `touched`: pixels that did land on the sheet.
 * ponytail: a part stored larger than it is drawn gets one sheet pixel per figure pixel; every sheet so far is 1:1.
 */
export function writeBack (sheet, opened, edited, puppet, first = sheet) {
  const { data, width: aw, height: ah } = sheet
  const { width: w, height: h } = puppet
  const out = new Uint8ClampedArray(data)
  const cells = puppet.parts.map((part) => cellOf(part, aw, ah)).reverse()   // the top part first
  let lost = 0, touched = 0
  for (let p = 0; p < w * h; p++) {
    const i = p * 4
    if (opened[i] === edited[i] && opened[i + 1] === edited[i + 1] && opened[i + 2] === edited[i + 2] && opened[i + 3] === edited[i + 3]) continue
    const x = p % w, y = (p - x) / w
    const under = cells
      .filter((c) => x >= c.x0 && x < c.x1 && y >= c.y0 && y < c.y1)
      .map((c) => (Math.floor(c.ay + (y - c.y0 + 0.5) * c.sy) * aw + Math.floor(c.ax + (x - c.x0 + 0.5) * c.sx)) * 4)
    if (!under.length) { lost++; continue }
    const showing = under.find((at) => out[at + 3] > 0)
    const part = showing ?? under.find((at) => first.data[at + 3] > 0) ?? under[0]
    out.set(edited.subarray(i, i + 4), part)
    touched++
    if (edited[i + 3] < 255) for (const at of under) { if (at !== part) out[at + 3] = 0 }
    else for (const at of under) { if (at !== part && out[at + 3] === 0) out.set(first.data.subarray(at, at + 4), at) }
  }
  return { pixels: out, lost, touched }
}

/** A sheet's pixels as a picture to save. PNG: what was not edited comes back exactly as it was. */
export function sheetDataUrl (pixels, width, height) {
  const c = canvasOf(width, height)
  c.getContext('2d').putImageData(new ImageData(pixels, width, height), 0, 0)
  return c.toDataURL('image/png')
}
