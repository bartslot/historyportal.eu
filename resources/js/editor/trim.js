/**
 * trim.js — a stage picture is cropped to its paint when the picture editor saves it (Bart 11-16: he erased the bottom
 * half of a stone and it floated where its foot had been). The edit state remembers where the crop sits in the library
 * file, so Bring back still lines up, and the picture's own anchor (stage25d sprite.ts editedAsset):
 *   x: the same point of the library picture, so a side crop does not slide it along the ground;
 *   y: the same point too, but never below the new bottom: paint taken off the bottom puts what is left on the ground.
 */

const round = (v) => Math.round(v * 10000) / 10000

/**
 * The edit state after cropping `box` ({ x, y, w, h } in the opened picture's pixels) off a picture that already sat at
 * `crop` in the library file. `anchorPx`: the library anchor in library pixels; `state`: the edit state it opened with.
 */
export function trimState ({ crop = [0, 0], anchorPx = [0, 0], state = null }, box) {
  const at = [crop[0] + box.x, crop[1] + box.y]
  return {
    ...(state ?? {}),
    crop: at,
    anchor: [round((anchorPx[0] - at[0]) / box.w), round(Math.min(1, (anchorPx[1] - at[1]) / box.h))],
  }
}

/** The box to crop to, or null: the paint fills the picture (nothing to take off) or there is no paint at all. */
export const cropOf = (box, w, h) => (box && (box.x > 0 || box.y > 0 || box.w < w || box.h < h) ? box : null)
