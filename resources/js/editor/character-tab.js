/**
 * character-tab.js — the picture editor's Character tab (vault topics/character-creator/character-tab-plan.md): the person
 * large in the middle, point at a part to light it, click it to open its options beside it; every tile shows the option on
 * this person. Presets first, Random inside the period, the kit's twelve colours, a close view of the face, and a check of
 * the expressions. Save paints the person at the rig's size, cuts it into the stage's puppet (character/rig.js) and puts it
 * on "My characters" (EditsCharacters::saveCharacter); every scene that shows it follows.
 *
 * A mode of cutout-dialog.js: { canUndo, canRedo, undo, redo, dirty, save, discard, key, show, hide, destroy, setPicture }.
 */
import { createHistory } from './history.js'
import { icon, ICONS } from './cutout-markup.js'
import { loadKit, kitUrl, layersOf, drawLayers, drawEdge, slotAt, figureBox, rigOf, savePixels, facePixels, webpUrl } from '../character/layers.js'
import { PARTS, PART_SLOTS, SLOT_PART, EXPRESSIONS, bodyOf, piecesIn, wear, colour, randomRecipe, presetRecipe, onBody, cleanRecipe, zonesOf, optionsFor } from '../character/recipe.js'
import { cutPuppet } from '../character/rig.js'

const KIT = 'babylonia-old-babylonian'
const TILE = 88                       // px: three tiles across the inspector
const HEAD_PAD = 0.12                 // of the head box: room round the head in the close view and its tiles

const RAIL = {
  who: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z',
  body: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z',
  face: 'M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z',
  hair: ICONS.brush,
  clothes: 'M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z',
  extra: ICONS.colour,
  random: 'M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3',
}
export const PART_LABELS = { who: 'Who', body: 'Body', face: 'Face', hair: 'Hair', clothes: 'Clothes', extra: 'Extra' }
export const EXPRESSION_LABELS = { calm: 'Calm', curious: 'Curious', sad: 'Sad', angry: 'Angry', amazed: 'Amazed' }
const ZONE_LABELS = { garment: 'Cloth', second: 'Shawl', cord: 'Cord', apron: 'Apron', band: 'Band', 'head-cloth': 'Trim' }
const BODY_LABELS = { girl: 'Girl', woman: 'Woman', man: 'Man' }

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

/**
 * @param {{ view: HTMLElement, panel: HTMLElement, t: (s: string) => string, target: { character: { id: number|null, recipe: object|null }, title?: string },
 *   wire: object, stage?: object, limit: () => number, onChange: () => void, onSaved?: (row: object) => void }} opts
 */
export function mountCharacter ({ view, panel, t, target, wire, stage, limit, onChange, onSaved }) {
  view.style.background = 'var(--color-shell)'
  view.innerHTML = `
    <canvas class="absolute inset-0 block h-full w-full" data-chr-art></canvas>
    <canvas class="pointer-events-none absolute inset-0 block h-full w-full" data-chr-edge></canvas>
    <div class="absolute left-2 top-2 flex flex-col gap-1 rounded-lg p-1" style="background: var(--color-panel);" role="tablist" aria-label="${esc(t('Character'))}">
      ${PARTS.map((p) => `<button type="button" role="tab" class="btn btn-ghost btn-square" data-chr-rail="${p}" data-tooltip="${esc(t(PART_LABELS[p]))}" data-tooltip-placement="right" aria-label="${esc(t(PART_LABELS[p]))}">${icon(RAIL[p])}</button>`).join('')}
      <span class="my-1 border-t" style="border-color: var(--color-panel-border);"></span>
      <button type="button" class="btn btn-ghost btn-square" data-chr-random data-tooltip="${esc(t('Random'))}" data-tooltip-placement="right" aria-label="${esc(t('Random'))}">${icon(RAIL.random)}</button>
    </div>
    <button type="button" class="btn btn-sm btn-square absolute right-2 top-2" data-chr-whole data-tooltip="${esc(t('Whole figure'))}" aria-label="${esc(t('Whole figure'))}" hidden>${icon(ICONS.zoomOut)}</button>
    <div class="absolute inset-x-0 bottom-3 flex justify-center" data-chr-chips>
      <div class="flex gap-1 rounded-full p-1" style="background: var(--color-panel);" role="radiogroup" aria-label="${esc(t('Expression'))}">
        ${EXPRESSIONS.map((e) => `<button type="button" role="radio" class="btn btn-sm rounded-full" data-chr-expression="${e}">${esc(t(EXPRESSION_LABELS[e]))}</button>`).join('')}
      </div>
    </div>
    <span class="pointer-events-none absolute rounded px-2 py-1 text-xs text-panel-value" style="background: var(--color-panel);" data-chr-hover hidden></span>
    <span class="loading loading-spinner loading-md absolute left-1/2 top-1/2" data-chr-loading></span>`
  const $ = (sel) => view.querySelector(sel)
  const art = $('[data-chr-art]'), edge = $('[data-chr-edge]'), hoverTag = $('[data-chr-hover]')

  let kit = null, rig = null, labelsImg = null
  let history = null
  let part = 'who', expression = 'calm', zoom = false, hover = null
  let layers = []
  let frame = null            // { src, dst } of the last drawing, for the pointer
  let drawToken = 0
  let name = target.title || ''
  let destroyed = false
  const isNew = !target.character?.id
  let id = target.character?.id ?? null

  const recipe = () => history.now
  const set = (next) => {
    const bodyChanged = next.body !== history.now.body
    if (!history.push(next)) return
    if (bodyChanged) rigFor(next).then(changed)   // the close view and the head tiles frame this body's head
    else changed()
  }
  const changed = () => { draw(); fillPanel(); onChange() }

  // ── drawing ───────────────────────────────────────────────────────────────────────────────────────────────────────
  const fitRegion = (region, w, h) => {
    const left = 64, bottom = 64, pad = 16
    const aw = w - left - 2 * pad, ah = h - bottom - 2 * pad
    const k = Math.min(aw / region[2], ah / region[3])
    return [left + pad + (aw - region[2] * k) / 2, pad + (ah - region[3] * k) / 2, region[2] * k, region[3] * k]
  }
  const headRegion = () => {
    const [x0, y0, x1, y1] = rig.headBox
    const w = x1 - x0, h = y1 - y0
    return [x0 - w * HEAD_PAD, y0 - h * HEAD_PAD, w * (1 + 2 * HEAD_PAD), h * (1 + HEAD_PAD)]
  }
  const draw = async () => {
    if (!kit || destroyed) return
    const token = ++drawToken
    const next = await layersOf(kit, recipe(), expression)
    if (token !== drawToken || destroyed) return
    layers = next
    const dpr = window.devicePixelRatio || 1
    const w = view.clientWidth, h = view.clientHeight
    for (const c of [art, edge]) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr) }
    const g = art.getContext('2d')
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.fillStyle = kit.paper
    g.fillRect(0, 0, w, h)
    const src = zoom ? headRegion() : figureBox(layers)
    const dst = fitRegion(src, w, h)
    frame = { src, dst, dpr }
    drawLayers(g, layers, src, dst)
    drawHover()
    $('[data-chr-loading]').hidden = true
  }
  const drawHover = () => {
    const g = edge.getContext('2d')
    g.setTransform(1, 0, 0, 1, 0, 0)
    if (!frame || !hover) { g.clearRect(0, 0, edge.width, edge.height); return }
    const d = frame.dst.map((v) => v * frame.dpr)
    const body = hover === 'body'
    // the body is the bare skin below the head (the face and its neck are Face)
    drawEdge(g, layers, body ? ['outfit'] : PART_SLOTS[hover] ?? [], frame.src, d, '#f59e0b', 3 * frame.dpr,
      body ? [kit.kinds.indexOf('skin'), kit.kinds.length] : null, body && labelsImg ? { labels: labelsImg, part: rig.parts.indexOf('head') + 1 } : null)
  }
  /** The part under a point of the view: the slot painted there, bare skin of the outfit being the body. */
  const partAt = (x, y) => {
    if (!frame) return null
    const { src, dst } = frame
    const bx = src[0] + ((x - dst[0]) / dst[2]) * src[2], by = src[1] + ((y - dst[1]) / dst[3]) * src[3]
    const slot = slotAt(layers, bx, by)
    if (!slot) return null
    if (slot === 'outfit') {
      const l = layers.find((x) => x.slot === 'outfit')
      const px = Math.floor(bx - l.box[0]), py = Math.floor(by - l.box[1])
      const r = l.raw.fill.data[(py * l.box[2] + px) * 4]
      if (kit.kinds[Math.max(0, Math.min(kit.kinds.length - 1, Math.round((r - 10) / 18)))] === 'skin') return 'body'
    }
    return SLOT_PART[slot] ?? null
  }

  // ── the inspector ─────────────────────────────────────────────────────────────────────────────────────────────────
  const title = (s) => `<h3 class="pb-1 text-sm font-semibold text-panel-value">${esc(s)}</h3>`
  const label = (s) => `<span class="text-xs font-semibold uppercase tracking-wide text-panel-label">${esc(s)}</span>`
  const swatchRow = (what, list, chosen, rowLabel) => `
    <div class="flex flex-col gap-1">${label(rowLabel)}
      <div class="flex flex-wrap gap-1" role="radiogroup" aria-label="${esc(rowLabel)}">
        ${list.map((s) => `<button type="button" role="radio" aria-checked="${s.id === chosen}" class="h-8 w-8 rounded-full border" data-chr-colour="${esc(what)}" data-id="${esc(s.id)}"
          style="background:${s.hex}; border-color: var(--color-panel-border); ${s.id === chosen ? 'outline: 2px solid var(--color-panel-value); outline-offset: 2px;' : ''}" aria-label="${esc(t(s.id))}" data-tooltip="${esc(t(s.id))}"></button>`).join('')}
      </div>
    </div>`
  /** Tiles of options: ids of pieces (null: none / the face's own). Each tile is drawn on this person. */
  const tiles = (rowLabel, ids, chosen, region, extra = {}) => `
    <div class="flex flex-col gap-1">${rowLabel ? label(rowLabel) : ''}
      <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label="${esc(rowLabel || '')}">
        ${ids.map((pid) => {
          const on = Array.isArray(chosen) ? chosen.includes(pid) : chosen === pid
          const tip = extra.labels?.[pid ?? ''] ?? (pid ? t(bodyOf(kit, recipe()).pieces.find((p) => p.id === pid)?.label ?? pid) : t(extra.none ?? 'None'))
          return `<button type="button" role="radio" aria-checked="${on}" class="relative overflow-hidden rounded-md border" data-chr-tile="${esc(pid ?? '')}" data-chr-slot="${esc(extra.slot ?? '')}" data-region="${region}"
            style="height:${TILE}px; background: ${kit.paper}; border-color: var(--color-panel-border); ${on ? 'outline: 2px solid var(--color-panel-value); outline-offset: 1px;' : ''}" aria-label="${esc(tip)}" data-tooltip="${esc(tip)}">
            <canvas class="block h-full w-full"></canvas></button>`
        }).join('')}
      </div>
    </div>`

  const fillPanel = () => {
    if (!kit) return
    const r = recipe()
    const body = bodyOf(kit, r)
    const parts = r.parts ?? []
    const worn = (slot) => parts.filter((p) => body.pieces.find((x) => x.id === p)?.slot === slot)
    let html = ''
    if (part === 'who') {
      html = `${title(t('Who'))}
        <div class="flex flex-col gap-1"><label for="chr-name" class="text-xs font-semibold uppercase tracking-wide text-panel-label">${esc(t('Name'))}</label><input id="chr-name" type="text" class="input input-sm w-full" maxlength="60" value="${esc(name)}" data-chr-name></div>
        ${bodyTabs(r)}
        <div class="grid grid-cols-2 gap-2" role="radiogroup" aria-label="${esc(t('People of this time'))}">
          ${kit.presets.filter((p) => p.recipe.body === r.body).map((p) => `<button type="button" role="radio" class="relative overflow-hidden rounded-md border" data-chr-preset="${esc(p.id)}"
            style="height:${TILE * 1.6}px; background:${kit.paper}; border-color: var(--color-panel-border);" aria-label="${esc(t(p.label))}" data-tooltip="${esc(t(p.label))}"><canvas class="block h-full w-full"></canvas></button>`).join('')}
        </div>`
    } else if (part === 'body') {
      html = `${title(t('Body'))}${bodyTabs(r)}${swatchRow('skin', kit.skins, r.skin, t('Skin'))}`
    } else if (part === 'face') {
      html = `${title(t('Face'))}
        ${tiles('', piecesIn(body, 'face').map((p) => p.id), `face/${r.face}`, 'head', { slot: 'face' })}
        ${swatchRow('skin', kit.skins, r.skin, t('Skin'))}
        ${piecesIn(body, 'eyes').length ? tiles(t('Eyes'), optionsFor(body, 'eyes'), r.eyes ? `eyes/${r.eyes}` : null, 'head', { slot: 'eyes', none: 'Own eyes' }) : ''}
        ${piecesIn(body, 'mouth').length ? tiles(t('Mouth'), optionsFor(body, 'mouth'), r.mouth ? `mouths/${r.mouth}` : null, 'head', { slot: 'mouth', none: 'Own mouth' }) : ''}`
    } else if (part === 'hair') {
      html = `${title(t('Hair'))}
        ${tiles('', [null, ...piecesIn(body, 'hair').map((p) => p.id)], worn('hair')[0] ?? null, 'head', { slot: 'hair', none: 'No hair' })}
        ${swatchRow('hair', kit.hairColours, r.hair_colour, t('Hair colour'))}
        ${piecesIn(body, 'beard').length ? tiles(t('Beard'), [null, ...piecesIn(body, 'beard').map((p) => p.id)], worn('beard')[0] ?? null, 'head', { slot: 'beard', none: 'No beard' }) : ''}`
    } else if (part === 'clothes') {
      html = `${title(t('Clothes'))}
        ${tiles('', piecesIn(body, 'outfit').map((p) => p.id), `outfit/${r.outfit}`, 'figure', { slot: 'outfit' })}
        ${zonesOf(kit, r, 'outfit').map((z) => swatchRow(z, kit.swatches, r.zones?.[z], t(ZONE_LABELS[z] ?? z))).join('')}`
    } else if (part === 'extra') {
      html = `${title(t('Extra'))}
        ${tiles(t('Headwear'), [null, ...piecesIn(body, 'headwear').map((p) => p.id)], worn('headwear')[0] ?? null, 'head', { slot: 'headwear', none: 'Nothing on the head' })}
        ${piecesIn(body, 'extra').length ? tiles(t('Jewellery'), piecesIn(body, 'extra').map((p) => p.id), worn('extra'), 'head', { slot: 'extra' }) : ''}
        ${zonesOf(kit, r, 'extra').filter((z) => !zonesOf(kit, r, 'outfit').includes(z)).map((z) => swatchRow(z, kit.swatches, r.zones?.[z], t(z === 'head-cloth' ? 'Head cloth' : ZONE_LABELS[z] ?? z))).join('')}`
    }
    panel.innerHTML = html
    for (const b of view.querySelectorAll('[data-chr-rail]')) {
      const on = b.dataset.chrRail === part
      b.setAttribute('aria-selected', String(on))
      b.classList.toggle('btn-neutral', on)
      b.classList.toggle('btn-ghost', !on)
    }
    for (const b of view.querySelectorAll('[data-chr-expression]')) {
      const on = b.dataset.chrExpression === expression
      b.setAttribute('aria-checked', String(on))
      b.classList.toggle('btn-neutral', on)
      b.classList.toggle('btn-ghost', !on)
    }
    $('[data-chr-whole]').hidden = !zoom
    paintTiles()
  }
  const bodyTabs = (r) => `
    <div class="tabs tabs-box tabs-sm" role="radiogroup" aria-label="${esc(t('Body'))}">
      ${kit.bodies.map((b) => `<input type="radio" name="chr-body" value="${esc(b.id)}" class="tab" aria-label="${esc(t(BODY_LABELS[b.id] ?? b.id))}" ${b.id === r.body ? 'checked' : ''} data-chr-body>`).join('')}
    </div>`

  /** Each tile drawn on this person, one after another, so the panel answers at once and the drawing follows. */
  let tileToken = 0
  const paintTiles = async () => {
    const token = ++tileToken
    const r = recipe()
    const jobs = [...panel.querySelectorAll('[data-chr-tile], [data-chr-preset]')]
    for (const el of jobs) {
      if (token !== tileToken || destroyed) return
      const preset = el.dataset.chrPreset
      const pid = el.dataset.chrTile
      const slot = el.dataset.chrSlot
      const look = preset ? presetRecipe(kit, preset) : pid ? wear(kit, slotCleared(r, slot), pid) : slotCleared(r, slot)
      const ls = await layersOf(kit, look, 'calm').catch(() => null)
      if (!ls || token !== tileToken || destroyed) return
      const c = el.querySelector('canvas')
      const dpr = window.devicePixelRatio || 1
      c.width = Math.round(el.clientWidth * dpr); c.height = Math.round(el.clientHeight * dpr)
      const g = c.getContext('2d')
      const region = el.dataset.region === 'head' ? headRegion() : figureBox(ls, 8)
      const k = Math.min(c.width / region[2], c.height / region[3])
      drawLayers(g, ls, region, [(c.width - region[2] * k) / 2, (c.height - region[3] * k) / 2, region[2] * k, region[3] * k])
    }
  }
  /** The recipe with nothing worn in a slot (the "none" tile, and the base for a tile that wears one thing there). */
  const slotCleared = (r, slot) => {
    if (slot === 'eyes') { const { eyes, ...rest } = r; return rest }
    if (slot === 'mouth') { const { mouth, ...rest } = r; return rest }
    if (['hair', 'beard', 'headwear'].includes(slot)) {
      const body = bodyOf(kit, r)
      return { ...r, parts: (r.parts ?? []).filter((p) => body.pieces.find((x) => x.id === p)?.slot !== slot) }
    }
    return r
  }

  // ── what a hand does ──────────────────────────────────────────────────────────────────────────────────────────────
  const openPart = (p) => {
    part = p
    const wantZoom = p === 'face'
    if (wantZoom !== zoom) { zoom = wantZoom; draw() }
    fillPanel()
  }
  const onPanelClick = (e) => {
    const tile = e.target.closest('[data-chr-tile]')
    if (tile) {
      const slot = tile.dataset.chrSlot, pid = tile.dataset.chrTile
      const r = recipe()
      if (!pid) set(slotCleared(r, slot))
      else if (slot === 'extra') set(wear(kit, r, pid))
      else if (['hair', 'beard', 'headwear'].includes(slot) && (r.parts ?? []).includes(pid)) return
      else set(wear(kit, slotCleared(r, slot), pid))
      return
    }
    const preset = e.target.closest('[data-chr-preset]')
    if (preset) {
      const p = kit.presets.find((x) => x.id === preset.dataset.chrPreset)
      if (!name || kit.presets.some((x) => t(x.label) === name)) name = t(p.label)
      set(presetRecipe(kit, p.id))
      return
    }
    const sw = e.target.closest('[data-chr-colour]')
    if (sw) set(colour(recipe(), sw.dataset.chrColour, sw.dataset.id))
  }
  const onPanelChange = (e) => {
    if (e.target.matches('[data-chr-body]')) {
      const next = onBody(kit, e.target.value)
      if (next) { if (!name || kit.presets.some((x) => t(x.label) === name)) name = t(kit.presets.find((p) => p.recipe.body === next.body)?.label ?? ''); set(next) }
    }
  }
  const onPanelInput = (e) => {
    if (e.target.matches('[data-chr-name]')) { name = e.target.value.slice(0, 60); onChange() }
  }
  panel.addEventListener('click', onPanelClick)
  panel.addEventListener('change', onPanelChange)
  panel.addEventListener('input', onPanelInput)

  view.addEventListener('click', (e) => {
    const rail = e.target.closest('[data-chr-rail]')
    if (rail) { openPart(rail.dataset.chrRail); return }
    if (e.target.closest('[data-chr-random]')) { set(randomRecipe(kit, recipe(), Math.random, null)); return }
    if (e.target.closest('[data-chr-whole]')) { zoom = false; draw(); fillPanel(); return }
    const chip = e.target.closest('[data-chr-expression]')
    if (chip) { expression = chip.dataset.chrExpression; draw(); fillPanel(); return }
    if (e.target !== art) return
    const r = art.getBoundingClientRect()
    const p = partAt(e.clientX - r.left, e.clientY - r.top)
    openPart(p ?? (zoom ? 'face' : 'who'))
  })
  art.addEventListener('pointermove', (e) => {
    const r = art.getBoundingClientRect()
    const x = e.clientX - r.left, y = e.clientY - r.top
    const p = partAt(x, y)
    art.style.cursor = p ? 'pointer' : ''
    if (p !== hover) { hover = p; drawHover() }
    hoverTag.hidden = !p
    if (p) {
      hoverTag.textContent = t(PART_LABELS[p])
      hoverTag.style.left = `${Math.min(x + 14, view.clientWidth - 90)}px`
      hoverTag.style.top = `${Math.max(4, y - 30)}px`
    }
  })
  art.addEventListener('pointerleave', () => { hover = null; hoverTag.hidden = true; drawHover() })
  const resize = new ResizeObserver(() => draw())
  resize.observe(view)

  // ── start ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  const ready = (async () => {
    kit = await loadKit(kitUrl(target.character?.recipe?.kit ?? KIT))
    const start = target.character?.recipe ? cleanRecipe(kit, target.character.recipe) : presetRecipe(kit, kit.presets[0].id)
    if (!name) name = t(kit.presets.find((p) => p.recipe.role === start.role)?.label ?? start.role ?? '')
    history = createHistory(start)
    ;({ rig, labels: labelsImg } = await rigOf(kit, start.body))
    openPart(isNew ? 'who' : 'clothes')
    draw()
  })().catch(() => { $('[data-chr-loading]').hidden = true; panel.innerHTML = `<p class="text-sm text-panel-hint">${esc(t('The character kit could not be loaded.'))}</p>` })

  // the body's rig follows the recipe's body
  const rigFor = async (r) => { ({ rig, labels: labelsImg } = await rigOf(kit, r.body)) }

  // ── Save ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  const save = async () => {
    await ready
    const r = recipe()
    await rigFor(r)
    const scale = 1 / rig.scale
    const rest = await savePixels(kit, r, rig, labelsImg, scale)
    const faces = {}
    const [hx0, hy0, hx1, hy1] = rig.headBox.map((v) => Math.round(v * scale))
    const padX = Math.round((hx1 - hx0) * HEAD_PAD), padY = Math.round((hy1 - hy0) * HEAD_PAD)
    const region = [Math.max(0, hx0 - padX), Math.max(0, hy0 - padY), Math.min(rest.width, hx1 + padX) - Math.max(0, hx0 - padX), Math.min(rest.height, hy1 + padY) - Math.max(0, hy0 - padY)]
    for (const e of EXPRESSIONS) {
      if (e === 'calm' || !bodyOf(kit, r).expressions?.[e]) continue
      faces[e] = await facePixels(kit, r, e, rig, region, scale)
    }
    const { atlas, shade, puppet } = cutPuppet({ canvas: { width: rest.width, height: rest.height, scale: 1 }, rest, under: rest.under, faces, rig })
    const max = Math.max(1, limit())
    const atlasUrl = webpUrl(atlas, [0.86, 0.78, 0.7, 0.6], max * 0.6)
    const shadeUrl = webpUrl(shade, [0.8, 0.7, 0.6], max * 0.3)
    if (atlasUrl.length + shadeUrl.length > max) return { ok: false }
    const result = await wire.saveCharacter(id, atlasUrl, shadeUrl, puppet, { ...r, kit: kit.id }, name || t('Character'), await thumbUrl(r))
    if (!result?.ok) return { ok: false }
    id = result.id
    window.dispatchEvent(new CustomEvent('cutouts-changed', { detail: { id: result.id, stage: result.stage } }))
    onSaved?.(result.stage, isNew)
    savedRecipe = JSON.stringify(r)
    savedName = name
    return { ok: true, url: result.stage?.puppet?.atlas }
  }
  let savedRecipe = null, savedName = name
  /** The whole person, small, on nothing: the shelf's tile and the inspector's preview. */
  const thumbUrl = async (r) => {
    const ls = await layersOf(kit, r)
    const box = figureBox(ls, 8)
    const h = 320, w = Math.round((box[2] / box[3]) * h)
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    drawLayers(c.getContext('2d'), ls, box, [0, 0, w, h])
    return c.toDataURL('image/webp', 0.8)
  }

  return {
    canUndo: () => !!history?.canUndo,
    canRedo: () => !!history?.canRedo,
    undo: () => { if (history?.undo()) { rigFor(recipe()).then(changed) } },
    redo: () => { if (history?.redo()) { rigFor(recipe()).then(changed) } },
    // a new person is always something to save; a saved one, once it changed (its name too)
    dirty: () => !!history && (isNew && savedRecipe === null ? true : JSON.stringify(history.now) !== (savedRecipe ?? JSON.stringify(cleanRecipe(kit, target.character?.recipe))) || name !== savedName),
    save,
    discard () {},
    key (e) {
      if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey && !e.target.matches?.('input, textarea, select')) { set(randomRecipe(kit, recipe(), Math.random, null)); return true }
      return false
    },
    show () { draw() },
    hide () {},
    destroy () { destroyed = true; resize.disconnect() },
    setPicture () {},
    /** For tests and the dialog: the recipe on show. */
    get recipe () { return history?.now ?? null },
    ready,
  }
}
