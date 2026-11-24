/**
 * Scene links: a scene can end with choices that jump to any scene of the lesson, the way a Twine passage
 * links to other passages (Bart 2026-11-21, Marianna's Marco Polo story). Stored on the scene as
 * config.links = [{ label, to }] (`to` = a scene id of the same lesson) and config.ending = true.
 *
 * What happens when a scene is over (routeAfter):
 *   ending                       → the lesson ends here
 *   no links                     → the next scene in the list, as always
 *   one link without a label     → straight on to its scene, no stop ("go to")
 *   otherwise                    → the class picks: one button per link
 * A link whose scene is gone (deleted, another lesson) is left out, so a broken link never strands the class.
 *
 * Labels are teacher- or Twine-written = untrusted: rendered with textContent (el), never as markup.
 */
import { el } from './dom.js'
import { t } from '../i18n.js'
import { EASE } from '../easing.js'

/** The links that lead somewhere: a scene id that is in the queue. */
export function sceneLinks (scene, queue) {
  const raw = Array.isArray(scene?.config?.links) ? scene.config.links : []
  return raw
    .map((l) => ({ label: String(l?.label ?? '').trim(), to: Number(l?.to), index: indexOfScene(queue, l?.to) }))
    .filter((l) => l.index >= 0)
}

export function isEnding (scene) {
  return scene?.config?.ending === true
}

export function indexOfScene (queue, id) {
  if (id == null || id === '' || !Array.isArray(queue)) return -1
  return queue.findIndex((s) => s?.id != null && String(s.id) === String(id))
}

/** The lesson uses scene links anywhere (the player then keeps a trail for Back). */
export function hasSceneLinks (lesson) {
  const scenes = Array.isArray(lesson?.scenes) ? lesson.scenes : []
  return scenes.some((s) => isEnding(s) || (Array.isArray(s?.config?.links) && s.config.links.length > 0))
}

/**
 * Where the lesson goes once scene `index` is over.
 * @returns {{kind:'end'}|{kind:'next', index:number}|{kind:'jump', index:number}|{kind:'choose', links:Array}}
 */
export function routeAfter (queue, index) {
  const scene = queue?.[index]
  if (isEnding(scene)) return { kind: 'end' }
  const links = sceneLinks(scene, queue)
  if (links.length === 0) return index + 1 < (queue?.length ?? 0) ? { kind: 'next', index: index + 1 } : { kind: 'end' }
  if (links.length === 1 && links[0].label === '') return { kind: 'jump', index: links[0].index }
  return { kind: 'choose', links }
}

/** How long the picked moment holds before the jump (ms): long enough to see which one the class chose. */
const PICK_HOLD_MS = 420

/**
 * The choice card: one button per link. Returns a close() that removes it.
 * A button with no text (one of several) reads as the target scene's title so it is never blank.
 *
 * Motion (Bart 2026-11-21: "a bit of motion magic"), eased by intent (easing.js), on WAAPI so it runs without rAF:
 *   the shade fades up, the question settles, the buttons rise one after another with a small overshoot;
 *   hover lifts a button; the picked one swells and brightens while the others sink away, then the jump.
 * Reduced motion, or no WAAPI: everything simply appears and a pick jumps at once.
 * Keys 1-6 pick the matching choice, for a teacher at the board with a clicker or keyboard.
 *
 * opts.preview: the editor's picture of the card (choices-preview.js): same look and entrance, but it takes
 * no clicks, no keys and leaves the stage's pointer events alone, so the teacher keeps working under it.
 */
export function showLinkChoices (host, links, queue, onPick, opts = {}) {
  const preview = opts.preview === true
  const motion = typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function'
    && !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  const play = (node, frames, opts) => (motion ? node.animate(frames, { fill: 'both', ...opts }) : null)

  // The layer fades in over the scene (Bart 2026-11-21: "a layer you can fade in over the text"): the picture
  // stays visible under a soft shade, the buttons rise into place.
  const wrap = el('div', 'absolute inset-0 z-40 flex items-end justify-center p-6 pb-32 bg-linear-to-t from-base-300/80 via-base-300/30 to-transparent')
  wrap.dataset.sceneLinks = '1'
  if (preview) { wrap.dataset.sceneLinksPreview = '1'; wrap.style.pointerEvents = 'none' }
  const card = el('div', 'w-full max-w-2xl')
  // Monochrome over a colourful picture (history-portal-ui): the scene is the colour, the card is not.
  const label = el('p', 'lp-card-label text-center text-white/70 mb-3', t('What do you do?'))
  card.appendChild(label)
  const row = el('div', links.length > 2 ? 'flex flex-col gap-2' : 'flex flex-col sm:flex-row gap-2')
  let picked = false
  const buttons = []
  const pick = (link, btn) => {
    if (picked) return   // a double tap, or a key and a tap, picks once
    picked = true
    window.removeEventListener('keydown', onKey)
    if (!motion) { close(); onPick(link); return }
    // The picked moment: this one swells and brightens, the rest sink away, then the card lets go.
    btn.classList.add('border-white/80')
    play(btn, [{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1.02)' }], { duration: 260, easing: EASE.pop })
    buttons.filter((b) => b !== btn).forEach((b) =>
      play(b, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(10px)' }], { duration: 220, easing: EASE.exit }))
    play(label, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: EASE.exit })
    play(wrap, [{ opacity: 1 }, { opacity: 0 }], { duration: 240, delay: PICK_HOLD_MS - 240, easing: EASE.exit })
    // A timer, not an animation's finish, ends it: a background tab or a busy compositor must not strand the class.
    setTimeout(() => { close(); onPick(link) }, PICK_HOLD_MS)
  }
  links.forEach((link, i) => {
    const text = link.label || queue[link.index]?.chapter_name || t('Continue')
    const btn = el('button',
      'btn h-auto min-h-11 flex-1 justify-start text-left normal-case py-3 px-5 rounded-box ' +
      'bg-base-300/85 backdrop-blur border border-white/15 hover:border-white/60 hover:bg-base-300/95 ' +
      'hover:-translate-y-0.5 transition-[transform,border-color,background-color] duration-200 ' +
      'text-white text-lg font-medium leading-snug shadow-none',
      text)
    btn.type = 'button'
    btn.dataset.sceneLink = String(link.to)
    if (!preview) btn.addEventListener('click', () => pick(link, btn))
    buttons.push(btn)
    row.appendChild(btn)
  })
  function onKey (e) {
    const n = Number(e.key)
    if (!Number.isInteger(n) || n < 1 || n > links.length || e.metaKey || e.ctrlKey || e.altKey) return
    if (e.target?.closest?.('input, textarea, [contenteditable]')) return
    e.preventDefault()
    pick(links[n - 1], buttons[n - 1])
  }
  if (!preview) window.addEventListener('keydown', onKey)
  card.appendChild(row)
  wrap.appendChild(card)
  const before = host.style.pointerEvents
  if (!preview) host.style.pointerEvents = 'auto'
  host.appendChild(wrap)

  // Enter: the shade, then the question, then the buttons one after another.
  play(wrap, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, easing: EASE.enter })
  play(label, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 420, delay: 220, easing: EASE.enter })
  buttons.forEach((b, i) => {
    // The rise animates a wrapper-free transform; it is let go after, so the hover lift (a class) can take over.
    const a = play(b, [{ opacity: 0, transform: 'translateY(18px) scale(0.96)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }],
      { duration: 520, delay: 340 + i * 90, easing: EASE.pop })
    if (a) a.onfinish = () => { if (!picked) a.cancel() }
  })

  function close () {
    window.removeEventListener('keydown', onKey)
    if (!wrap.parentNode) return
    wrap.remove()
    if (!preview) host.style.pointerEvents = before || 'none'
  }
  return close
}
