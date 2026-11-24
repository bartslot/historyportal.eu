// Whether a voyage stop shows the button the class can open (the "Hormuz ▸" pill on the map).
//
// Bart, 2026-11-23: "I have nothing in the stop sometimes, but it keeps showing the button where the
// children can click on. I want this behind a switch." The switch is config.gallery.button. Left unset
// it follows the stop: on once the stop has a story or a picture, off while it has neither, so an empty
// stop never offers the class an empty modal. A title alone is not content: it is only the button's
// label. Mirrored in PHP by App\Support\VoyageStopButton, which sets the editor's switch.

const filled = (s) => typeof s === 'string' && s.trim() !== ''
const hasImage = (list) => Array.isArray(list) && list.some((im) => filled(typeof im === 'string' ? im : im && im.url))

/** The stop has something to open: a story, or a gallery or stop picture. */
export function stopHasContent(gallery, stopImages = []) {
  const g = gallery && typeof gallery === 'object' ? gallery : {}
  return filled(g.story) || hasImage(g.images) || hasImage(stopImages)
}

/** The teacher's switch when set, otherwise whether the stop has content. */
export function stopButtonOn(gallery, stopImages = []) {
  if (gallery && typeof gallery === 'object' && typeof gallery.button === 'boolean') return gallery.button
  return stopHasContent(gallery, stopImages)
}
