/**
 * bones-tab.js — the picture editor's Bones tab: grab a limb and turn it (Bart, 2026-11-06). The figure is drawn from its
 * rigid parts on a canvas; a drag on a part turns that part's bone round its joint, inside what a body can do
 * (stage25d/bones.ts limitBone, always on). With no keys the pose is the layer's own; once it has keys, a change at the
 * playhead is a key there, and the timeline shows those keys as its Bones rows. The stage shows every change at once;
 * Save stores it, and leaving without saving puts back what it opened with.
 */
import { bindPuppet, limitBone } from '@stage25d/stage25d/bones'
import { bonesAt } from '@stage25d/stage25d/layout'
import { createHistory } from './history.js'
import { secondsLabel } from './frames-tab.js'
import { icon, ICONS, slider, syncSlider } from './cutout-markup.js'
import { movableBones, matricesOf, jointAt, partUnder, turnBetween, poseFields, poseTimes, poseKeyAt, withPoseKey, withoutPoseKey } from './puppet-pose.js'

const LABELS = { head: 'Neck', chest: 'Upper body', upperarm_n: 'Near upper arm', forearm_n: 'Near forearm', upperarm_f: 'Far upper arm', forearm_f: 'Far forearm' }
const OPAQUE_ALPHA = 24
const FIT = 0.94           // of the view: room round the figure for a limb that swings out
const HANDLE_REACH_PX = 18 // a press this close to a joint's dot takes that bone
const FREE = 1000          // far past any joint's range: what limitBone gives back is its end
const PIVOT_PX = 10        // this close to the joint a drag has no angle yet

export function mountBones ({ view, strip, panel, t, atlas, puppet, pose: base, keys, duration, time, stage, stageId, saveLayer, onChange = () => {}, onTime = () => {} }) {
  const bent = bindPuppet(puppet)
  const movable = movableBones(puppet)
  const history = createHistory({ base, keys })
  let now = Math.min(time, duration)
  const openedAt = time
  let picked = movable[0] ?? null
  let hover = null
  let image = null
  let alpha = null
  let drag = null
  let frame = 0
  let playing = false
  let raf = 0

  const limit = (name, deg) => limitBone(name, Math.round(deg), puppet.facing)
  // room on the canvas for every limb at its ends, so a raised hand never leaves it
  const reach = (() => {
    const ends = (name) => [limit(name, -FREE), 0, limit(name, FREE)]
    const xs = [0, puppet.width], ys = [0, puppet.height]
    for (const side of ['n', 'f']) {
      for (const upper of ends(`upperarm_${side}`)) {
        for (const fore of ends(`forearm_${side}`)) {
          const v = bent.bend({ [`upperarm_${side}`]: upper, [`forearm_${side}`]: fore })
          for (let i = 0; i < v.length; i += 2) { xs.push(v[i]); ys.push(v[i + 1]) }
        }
      }
    }
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
  })()
  const draft = () => history.now
  const poseNow = () => bonesAt({ ...poseFields(draft().base), keys: draft().keys }, now)
  const turnOf = (name) => poseNow()[name] ?? 0

  view.innerHTML = '<canvas class="block h-full w-full touch-none" data-bn-canvas></canvas>'
  strip.innerHTML = `
    <div class="flex items-center gap-2 rounded-lg border p-2" style="border-color: var(--color-panel-border); background: var(--color-panel);">
      <button type="button" class="btn btn-primary btn-sm btn-square" data-bn-play data-tooltip="${t('Play')}" data-tooltip-key="Space" aria-label="${t('Play')}">${icon(ICONS.play)}</button>
      <div class="relative min-w-0 flex-1">
        <div class="pointer-events-none absolute inset-x-0 -top-1 h-2" data-bn-marks></div>
        <span class="range-panel-knob block" style="--range-t: 0">
          <input type="range" min="0" max="${duration}" step="0.05" value="${now}" class="range range-panel w-full" aria-label="${t('Time in the scene')}" data-bn-time>
        </span>
      </div>
      <span class="w-14 text-right text-xs tabular-nums text-panel-value" data-bn-at></span>
      <button type="button" class="btn btn-sm" data-bn-key></button>
    </div>`
  panel.innerHTML = `
    <div class="flex flex-col gap-1">
      <h3 class="pb-1 text-sm font-semibold text-panel-value">${t('Bones')}</h3>
      ${movable.map((name) => {
        const [min, max] = [limit(name, -FREE), limit(name, FREE)].sort((a, b) => a - b)
        return slider(`bn-${name}`, t(LABELS[name] ?? name), min === -FREE ? -180 : min, max === FREE ? 180 : max, 0, '°')
      }).join('')}
    </div>
    <span class="flex-1"></span>
    <div class="flex flex-col gap-2 border-t pt-3" style="border-color: var(--color-panel-border);">
      <button type="button" class="btn btn-sm" data-bn-reset>${t('Reset pose')}</button>
    </div>`
  const canvas = view.querySelector('[data-bn-canvas]')
  const ctx = canvas.getContext?.('2d') ?? null
  const inputOf = (name) => panel.querySelector(`[data-cut-bn-${name}]`)
  const readoutOf = (name) => panel.querySelector(`[data-cut-bn-${name}-value]`)
  const timeInput = strip.querySelector('[data-bn-time]')

  /** The drawing's place on the canvas: its scale and corner. */
  const placement = () => {
    const { width, height } = canvas.getBoundingClientRect()
    const scale = Math.min(width / (reach.x1 - reach.x0), height / (reach.y1 - reach.y0)) * FIT
    return { width, height, scale, x: (width - (reach.x1 + reach.x0) * scale) / 2, y: (height - (reach.y1 + reach.y0) * scale) / 2 }
  }
  const toDrawing = (e) => {
    const r = canvas.getBoundingClientRect()
    const p = placement()
    return [(e.clientX - r.left - p.x) / p.scale, (e.clientY - r.top - p.y) / p.scale]
  }
  const matrices = () => matricesOf(puppet, bent.bend(poseNow()))

  const paint = () => {
    frame = 0
    const p = placement()
    if (!ctx || !image || !p.width) return
    const dpr = devicePixelRatio
    const w = Math.round(p.width * dpr), h = Math.round(p.height * dpr)
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, w, h)
    const k = p.scale * dpr
    const all = matrices()
    puppet.parts.forEach((part, i) => {
      const [a, b, c, d, e, f] = all[i]
      ctx.setTransform(a * k, b * k, c * k, d * k, e * k + p.x * dpr, f * k + p.y * dpr)
      const [[x0, y0], , [x1, y1]] = part.quad
      const [u0, v0, u1, v1] = part.uv
      ctx.drawImage(image, u0 * image.naturalWidth, v0 * image.naturalHeight, (u1 - u0) * image.naturalWidth, (v1 - v0) * image.naturalHeight, x0, y0, x1 - x0, y1 - y0)
    })
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    for (const name of movable) {
      const at = jointAt(puppet, all, name)
      if (!at) continue
      const on = name === picked || name === hover
      ctx.beginPath()
      ctx.arc((at[0] * p.scale + p.x) * dpr, (at[1] * p.scale + p.y) * dpr, (on ? 7 : 5) * dpr, 0, Math.PI * 2)
      ctx.fillStyle = on ? '#f59e0b' : '#ffffff'
      ctx.fill()
      ctx.lineWidth = 1.5 * dpr
      ctx.strokeStyle = '#0f172a'
      ctx.stroke()
    }
  }
  const repaint = () => { if (!frame) frame = requestAnimationFrame(paint) }

  const renderPanel = () => {
    const pose = poseNow()
    for (const name of movable) {
      const input = inputOf(name)
      input.value = String(Math.round(pose[name] ?? 0))
      syncSlider(input, readoutOf(name))
      input.closest('label').style.color = name === picked ? 'var(--color-primary)' : ''
    }
    panel.querySelector('[data-bn-reset]').disabled = movable.every((name) => !(pose[name] ?? 0))
  }
  const renderStrip = () => {
    timeInput.value = String(now)
    timeInput.parentElement.style.setProperty('--range-t', String(duration > 0 ? now / duration : 0))
    strip.querySelector('[data-bn-at]').textContent = secondsLabel(now)
    const here = poseKeyAt(draft().keys, now) !== null
    strip.querySelector('[data-bn-key]').textContent = t(here ? 'Remove key' : 'Add key')
    strip.querySelector('[data-bn-marks]').innerHTML = poseTimes(draft().keys).map((at) => `
      <span class="absolute top-0 h-2 w-2 -translate-x-1/2 rotate-45" style="left:${duration > 0 ? (at / duration) * 100 : 0}%; background: var(--color-primary);"></span>`).join('')
  }
  const toStage = () => stage.setBones?.(stageId, poseFields(draft().base), draft().keys)
  const render = () => { renderPanel(); renderStrip(); repaint() }
  const changed = () => { render(); toStage(); onChange() }

  /** A bone turned at the playhead: a key when the figure has keys, else the layer's own pose. */
  const withTurn = (name, deg) => {
    const was = draft()
    // the body's say over the whole pose: an upper arm turned may bring the hand against the body
    const pose = bent.safe({ ...poseNow(), [name]: deg })
    if (poseTimes(was.keys).length) return { ...was, keys: withPoseKey(was.keys, now, pose) }
    return { ...was, base: { ...was.base, [name]: pose[name], ...(pose.forearm_n !== undefined ? { forearm_n: pose.forearm_n } : {}) } }
  }
  /** One gesture, one undo: the first step goes on the history, the rest replace it. */
  const turn = (name, deg, first) => {
    const next = withTurn(name, limit(name, deg))
    if (first) history.push(next); else history.replace(next)
    changed()
  }

  const select = (name) => { picked = name; render() }

  const seek = (seconds) => {
    now = Math.max(0, Math.min(duration, seconds))
    render()
    onTime(now - openedAt)
  }

  const stop = () => {
    if (!playing) return
    playing = false
    cancelAnimationFrame(raf)
    const button = strip.querySelector('[data-bn-play]')
    button.innerHTML = icon(ICONS.play)
    button.setAttribute('aria-label', t('Play'))
    button.dataset.tooltip = t('Play')
  }
  const play = () => {
    if (playing) { stop(); return }
    playing = true
    let last = performance.now()
    const button = strip.querySelector('[data-bn-play]')
    button.innerHTML = icon(ICONS.pause)
    button.setAttribute('aria-label', t('Pause'))
    button.dataset.tooltip = t('Pause')
    const tick = (at) => {
      if (!playing) return
      const next = now + (at - last) / 1000
      last = at
      seek(duration > 0 && next >= duration ? 0 : next)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }

  /** The bone under a canvas event: the part painted there, else a joint's dot close by. */
  const boneAt = (e) => {
    const [x, y] = toDrawing(e)
    const all = matrices()
    const opaque = (u, v) => {
      if (!alpha) return true
      const i = (Math.min(alpha.height - 1, Math.floor(v * alpha.height)) * alpha.width + Math.min(alpha.width - 1, Math.floor(u * alpha.width))) * 4 + 3
      return alpha.data[i] > OPAQUE_ALPHA
    }
    const scale = placement().scale
    const dot = movable.find((name) => { const j = jointAt(puppet, all, name); return j && Math.hypot(j[0] - x, j[1] - y) * scale < HANDLE_REACH_PX })
    return dot ?? partUnder(puppet, all, x, y, opaque, movable)
  }
  canvas.addEventListener('pointerdown', (e) => {
    const name = boneAt(e)
    if (!name) return
    e.preventDefault()
    stop()
    canvas.setPointerCapture?.(e.pointerId)
    picked = name
    const at = toDrawing(e)
    drag = { name, from: at, turned: turnOf(name), joint: jointAt(puppet, matrices(), name), moved: false }
    render()
  })
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) {
      const over = boneAt(e)
      if (over !== hover) { hover = over; canvas.style.cursor = over ? 'grab' : ''; repaint() }
      return
    }
    canvas.style.cursor = 'grabbing'
    const at = toDrawing(e)
    const onJoint = (p) => Math.hypot(p[0] - drag.joint[0], p[1] - drag.joint[1]) * placement().scale < PIVOT_PX
    if (onJoint(at)) return   // right on the pivot there is no angle to read
    if (onJoint(drag.from)) { drag.from = at; return }   // pressed on the dot: the turn counts from where the hand left it
    // step by step, held at the joint's end: a hand going round past the limit waits there, it does not jump to the other end
    const deg = limit(drag.name, drag.turned + turnBetween(drag.joint, drag.from, at))
    drag.from = at
    drag.turned = deg
    turn(drag.name, deg, !drag.moved)
    drag.moved = true
    drag.turned = turnOf(drag.name)
  })
  const endDrag = () => { if (drag) { drag = null; canvas.style.cursor = 'grab'; render() } }
  canvas.addEventListener('pointerup', endDrag)
  canvas.addEventListener('pointercancel', endDrag)
  canvas.addEventListener('pointerleave', () => { if (!drag && hover) { hover = null; repaint() } })

  for (const name of movable) {
    const input = inputOf(name)
    let sliding = false
    input.addEventListener('input', () => { picked = name; turn(name, Number(input.value), !sliding); sliding = true })
    input.addEventListener('change', () => { sliding = false })
  }
  timeInput.addEventListener('input', () => { stop(); seek(Number(timeInput.value)) })
  strip.querySelector('[data-bn-play]').addEventListener('click', play)
  strip.querySelector('[data-bn-key]').addEventListener('click', () => {
    const at = poseKeyAt(draft().keys, now)
    history.push({ ...draft(), keys: at !== null ? withoutPoseKey(draft().keys, at) : withPoseKey(draft().keys, now, poseNow()) })
    changed()
  })
  panel.querySelector('[data-bn-reset]').addEventListener('click', () => {
    const rest = Object.fromEntries(movable.map((name) => [name, 0]))
    const here = poseTimes(draft().keys).length > 0
    history.push(here ? { ...draft(), keys: withPoseKey(draft().keys, now, rest) } : { ...draft(), base: rest })
    changed()
  })

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    image = img
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const g = c.getContext('2d', { willReadFrequently: true })
    if (g) {
      g.drawImage(img, 0, 0)
      alpha = g.getImageData(0, 0, c.width, c.height)
    }
    repaint()
  }
  img.src = atlas
  const resized = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(repaint) : null
  resized?.observe(view)
  render()

  return {
    canUndo: () => history.canUndo,
    canRedo: () => history.canRedo,
    undo: () => { if (history.undo()) changed() },
    redo: () => { if (history.redo()) changed() },
    dirty: () => history.dirty,
    save: async () => {
      await saveLayer({ ...poseFields(draft().base), keys: draft().keys })
      window.dispatchEvent(new CustomEvent('stage25d-synced'))   // the timeline takes the keys from the stage again
    },
    discard: () => { if (history.dirty) stage.setBones?.(stageId, poseFields(base), keys) },
    show: repaint,
    hide: stop,
    destroy: () => { stop(); cancelAnimationFrame(frame); resized?.disconnect() },
    key: (e) => {
      if (e.code === 'Space' && !e.target.matches?.('input[type="checkbox"], button')) { if (!e.repeat) play(); return true }
      return false
    },
  }
}
