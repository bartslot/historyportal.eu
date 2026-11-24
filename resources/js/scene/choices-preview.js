/**
 * The Choices layer on the editor's stage (Bart 2026-11-24: "I added choices, but it's not showing").
 * In the lesson the choices fade in when the scene is over (scene-links.js); while editing they show
 * whenever the Choices layer is the selection (its row in the object list or on the timeline), so the
 * teacher sees what the class will see. A picture only: the buttons take no clicks and no number keys.
 *
 * Fed by the stage's scene payload (window.__objScene.links, set on scene:load) and kept current by
 * EditsSceneLinks' `scene-choices` event, which carries the links after every edit.
 */
import { showLinkChoices } from './scene-links.js'

export const CHOICES_ID = '__choices__'

let close = null
let showing = false

function hostEl () {
  return document.getElementById('lesson-choices-preview')
}

/** The links as the card takes them; a button without words reads as the scene it goes to. */
function cardLinks (links, targetName) {
  const list = (Array.isArray(links) ? links : []).filter((l) => l && l.to != null && l.to !== '')
  return {
    links: list.map((l, i) => ({ label: String(l.label ?? '').trim(), to: Number(l.to), index: i })),
    queue: list.map((l) => ({ chapter_name: targetName(l.to) })),
  }
}

/** The name the Choices panel gives a target scene ("2. Destination"), so a blank button is never blank. */
function inspectorTargetName (id) {
  const opt = [...document.querySelectorAll('[data-scene-links-inspector] select option')].find((o) => o.value !== '' && o.value === String(id))
  return opt ? opt.textContent.replace(/^\s*→\s*/, '').trim() : ''
}

export function hideChoicesPreview () {
  close?.()
  close = null
}

export function renderChoicesPreview (links, { host = hostEl(), targetName = inspectorTargetName } = {}) {
  hideChoicesPreview()
  if (!host) return
  const card = cardLinks(links, targetName)
  if (card.links.length === 0) return
  close = showLinkChoices(host, card.links, card.queue, () => {}, { preview: true })
}

let shown = null   // what the card on the stage shows now, so the same words are not played in again

function refresh () {
  if (!showing) { hideChoicesPreview(); shown = null; return }
  const links = window.__objScene?.links
  const key = JSON.stringify([links, (Array.isArray(links) ? links : []).map((l) => inspectorTargetName(l?.to))])
  if (close && key === shown) return
  shown = key
  renderChoicesPreview(links)
}

if (typeof window !== 'undefined' && !window.__choicesPreviewMounted) {
  window.__choicesPreviewMounted = true
  // Whatever is selected on the stage decides: the Choices layer shows its card, anything else hides it.
  window.addEventListener('scene-object-selected', (e) => {
    showing = e.detail?.id === CHOICES_ID
    refresh()
  })
  // Another scene on the stage starts with nothing selected. The same scene loaded again (the editor's poll
  // re-fires it) keeps the card, with whatever its links are now.
  let sceneId = null
  window.addEventListener('objscene-changed', () => {
    const id = window.__objScene?.sceneId ?? null
    if (id !== sceneId) showing = false
    sceneId = id
    refresh()
  })
  // An edit in the Choices panel: the card shows the new words at once.
  window.addEventListener('scene-choices', (e) => {
    const scene = window.__objScene
    if (!scene || (e.detail?.sceneId ?? null) !== scene.sceneId) return
    scene.links = Array.isArray(e.detail?.links) ? e.detail.links : []
    scene.choices = !!e.detail?.has
    if (!e.detail?.has) showing = false
    // The panel re-renders its target names in the same update: read them after it has.
    requestAnimationFrame(refresh)
    setTimeout(refresh, 120)
  })
}
