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
 * `crop` in the library file. `anchorPx`: the library anchor in library pixels; `state`: the edit state it opened with;
 * `size`: the library picture's [w, h].
 */
export function trimState ({ crop = [0, 0], anchorPx = [0, 0], state = null, size = null }, box) {
  const at = [crop[0] + box.x, crop[1] + box.y]
  // paint past the library picture's edge is not the library picture any more (Bart 11-19: a figure saved on an axe row
  // sank to its knees): past the bottom it stands on its lowest paint, past a side its foot is its middle
  const wider = !!size && at[0] + box.w > size[0] + 1
  const lower = !!size && at[1] + box.h > size[1] + 1
  return {
    ...(state ?? {}),
    crop: at,
    anchor: [wider ? 0.5 : round((anchorPx[0] - at[0]) / box.w), lower ? 1 : round(Math.min(1, (anchorPx[1] - at[1]) / box.h))],
  }
}

/** The box to crop to, or null: the paint fills the picture (nothing to take off) or there is no paint at all. */
export const cropOf = (box, w, h) => (box && (box.x > 0 || box.y > 0 || box.w < w || box.h < h) ? box : null)
