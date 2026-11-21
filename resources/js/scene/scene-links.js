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

/**
 * The choice card: one button per link. Returns a close() that removes it.
 * A button with no text (one of several) reads as the target scene's title so it is never blank.
 */
export function showLinkChoices (host, links, queue, onPick) {
  // The layer fades in over the scene (Bart 2026-11-21: "a layer you can fade in over the text"): the picture
  // stays visible under a soft shade, the buttons rise into place.
  const wrap = el('div', 'absolute inset-0 z-40 flex items-end justify-center p-6 pb-32 bg-linear-to-t from-base-300/80 via-base-300/30 to-transparent opacity-0 transition-opacity duration-700 ease-out motion-reduce:transition-none')
  wrap.dataset.sceneLinks = '1'
  const card = el('div', 'w-full max-w-2xl')
  // Monochrome over a colourful picture (history-portal-ui): the scene is the colour, the card is not.
  card.appendChild(el('p', 'lp-card-label text-center text-white/70 mb-3', t('What do you do?')))
  const row = el('div', links.length > 2 ? 'flex flex-col gap-2' : 'flex flex-col sm:flex-row gap-2')
  let picked = false
  for (const link of links) {
    const text = link.label || queue[link.index]?.chapter_name || t('Continue')
    const btn = el('button',
      'btn h-auto min-h-11 flex-1 justify-start text-left normal-case py-3 px-5 rounded-box ' +
      'bg-base-300/85 backdrop-blur border border-white/15 hover:border-white/60 hover:bg-base-300/95 ' +
      'text-white text-lg font-medium leading-snug shadow-none',
      text)
    btn.type = 'button'
    btn.dataset.sceneLink = String(link.to)
    btn.addEventListener('click', () => {
      if (picked) return   // a double tap picks once
      picked = true
      close()
      onPick(link)
    })
    row.appendChild(btn)
  }
  card.appendChild(row)
  wrap.appendChild(card)
  const before = host.style.pointerEvents
  host.style.pointerEvents = 'auto'
  host.appendChild(wrap)
  requestAnimationFrame(() => { wrap.classList.remove('opacity-0') })
  function close () {
    if (!wrap.parentNode) return
    wrap.remove()
    host.style.pointerEvents = before || 'none'
  }
  return close
}
