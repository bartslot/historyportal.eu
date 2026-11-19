/**
 * text-reveal.js: a text layer's `reveal` (share of its letters shown, 0..1) and `revealWords` (share of its words),
 * the keyable properties behind the Typewriter and Word by word presets (anim/text-presets.js). TextOverlayLayer
 * calls applyReveal on every node it draws, in the editor and the player alike, so the two show one thing.
 *
 * Hidden letters keep their place (opacity 0, not removed): the line breaks and the box size stay put while the
 * words come in, the way a typewriter fills a page. The unit at the edge fades with the fraction, so a slow
 * reveal is a soft letter-by-letter (or word-by-word) fade and a fast one reads as typing.
 */

const num = (v) => (v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null)

/** Of `total` units at `share`: how many are fully shown, and how far the next one has faded in (0..1). */
export function revealUnits (share, total) {
  const s = Math.min(1, Math.max(0, share)) * total
  const shown = Math.min(total, Math.floor(s + 1e-9))
  return { shown, partial: shown < total ? s - shown : 0 }
}

const unitOpacity = ({ shown, partial }, index) => (index < shown ? 1 : index === shown ? partial : 0)

/** Whether the item hides any of its words at all (absent or 1 = everything shows). */
export const isRevealing = (item) => (num(item?.reveal) ?? 1) < 1 || (num(item?.revealWords) ?? 1) < 1

/**
 * Hide the letters `item.reveal` / `item.revealWords` leave out of `node`'s words. Both at once: a letter shows
 * as much as the stricter of the two lets it. ComicAmerica's outline copy (data-t) follows the fill.
 */
export function applyReveal (node, item) {
  if (!node || !isRevealing(item)) return
  const texts = []
  const walker = node.ownerDocument.createTreeWalker(node, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) texts.push(walker.currentNode)
  const all = texts.map((t) => t.data).join(' ')
  const letters = revealUnits(num(item.reveal) ?? 1, all.replace(/\s+/g, '').length)
  const words = revealUnits(num(item.revealWords) ?? 1, all.trim().split(/\s+/).filter(Boolean).length)

  let letter = 0
  let word = -1
  let inWord = false
  let shownText = ''
  for (const text of texts) {
    const frag = node.ownerDocument.createDocumentFragment()
    let run = ''
    let runOpacity = 1
    const flush = () => {
      if (!run) return
      if (runOpacity >= 1) frag.append(run)
      else {
        const span = node.ownerDocument.createElement('span')
        span.dataset.reveal = ''
        span.style.opacity = String(Math.round(runOpacity * 1000) / 1000)
        span.textContent = run
        frag.append(span)
      }
      run = ''
    }
    for (const ch of text.data) {
      const space = /\s/.test(ch)
      if (!space && !inWord) word++
      inWord = !space
      const opacity = space ? runOpacity : Math.min(unitOpacity(letters, letter), unitOpacity(words, word))
      if (!space) letter++
      if (opacity !== runOpacity) { flush(); runOpacity = opacity }
      run += ch
      if (opacity >= 0.5) shownText += ch
    }
    inWord = false   // the next text node (a list line, a span) starts a word of its own
    flush()
    text.replaceWith(frag)
  }
  node.querySelectorAll('[data-t]').forEach((outline) => { outline.dataset.t = shownText })
}

/** Put the hidden letters back as plain text: a box being typed in holds no reveal spans. */
export function clearReveal (node) {
  node?.querySelectorAll?.('span[data-reveal]').forEach((span) => span.replaceWith(span.textContent))
  node?.normalize?.()
}
