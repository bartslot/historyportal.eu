/**
 * stage25d/water-panel: the Water rows of a picture's Motion section and its Paint the water brush
 * (x-data="stage25dWater(layerId)", components/lesson/stage25d-water.blade.php).
 *
 * The painting stays still; the stage draws a looping ripple, glints and twinkles inside a grey mask (engine-mvp
 * stage25d/water.ts). The teacher paints that mask here over the picture; every stroke shows on the stage at once
 * (drawWaterMask) and is saved when the hand lifts: the file first (saveStage25dWaterMask), then its url on the layer,
 * so an undo takes the mask back like any value.
 */
import { guessWaterMask, WATER_LOOK_DEFAULT, WATER_LOOKS } from '@stage25d/stage25d/water'

/** The mask's longest side in px (water-gl.ts MASK_MAX): soft water edges need no more. */
const MASK_MAX = 512
/** The hand lifted: save after this pause, so a few quick strokes are one file. */
const SAVE_PAUSE_MS = 500

export function stage25dWater (id) {
  let mask = null       // the grey mask being painted (white = water), MASK_MAX on its longest side
  let picture = null    // the picture, drawn under the mask in the brush window
  let saveTimer = null
  let saves = 0         // the newest save wins: an older upload answering late never puts its mask back
  let frame = 0
  let wire = null       // the Livewire component, taken at init: the brush window is teleported out of it
  const view = () => document.querySelector(`[data-stage25d-water-canvas="${id}"]`)
  return {
    info: null,
    painting: false,
    erasing: false,
    pressed: false,
    brush: 40,
    busy: false,
    get stage () { return window.__stage25d },
    get water () { return this.info?.water ?? null },
    get on () { return !!this.water && this.water.on !== false },
    get look () { return WATER_LOOKS[this.water?.look] ? this.water.look : WATER_LOOK_DEFAULT },
    /** A slider's value: the teacher's, else where its look starts. */
    value (key) { return this.water?.[key] ?? WATER_LOOKS[this.look][key] },
    sync () { this.info = this.stage?.layerInfo?.(id) ?? null },
    init () { wire = this.$wire; this.sync() },

    set (patch) { this.stage?.setLayerWater?.(id, patch); this.sync() },
    /** A look puts every slider where it starts; each stays the teacher's to move from there. */
    setLook (look) {
      const { amount, speed, glints, loop } = WATER_LOOKS[look]
      this.set({ look, amount, speed, glints, loop })
    },
    /** On: the values it had (a mask kept while it was off comes back); the first time, a guessed mask to start from. */
    async toggle (on) {
      this.set({ on, look: this.look, amount: this.value('amount'), speed: this.value('speed'), glints: this.value('glints'), loop: this.value('loop') })
      if (on && !this.water?.mask) {
        try { await this.prepare() } catch { return }   // no picture to guess from: the brush still paints
        this.guess()
      }
    },

    /** The picture and the mask as it is saved, at the mask's size. */
    async prepare () {
      const [w, h] = this.info?.size ?? [MASK_MAX, MASK_MAX]
      const k = MASK_MAX / Math.max(w, h, 1)
      const size = [Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))]
      picture = await loadImage(this.info?.file)
      mask = document.createElement('canvas')
      mask.width = size[0]; mask.height = size[1]
      const g = mask.getContext('2d', { willReadFrequently: true })
      g.fillStyle = '#000'; g.fillRect(0, 0, size[0], size[1])
      const saved = this.water?.mask ? await loadImage(this.water.mask).catch(() => null) : null
      if (saved) g.drawImage(saved, 0, 0, size[0], size[1])
    },

    async open () {
      this.painting = true
      this.busy = true
      try { await this.prepare() } finally { this.busy = false }
      this.$nextTick(() => this.draw())
    },
    close () {
      this.painting = false
      if (saveTimer) { clearTimeout(saveTimer); this.save() }
    },

    /** A first guess: blue-ish, calm water in the lower part of the picture (water.ts guessWaterMask). */
    guess () {
      if (!mask || !picture) return
      const c = document.createElement('canvas')
      c.width = mask.width; c.height = mask.height
      const g = c.getContext('2d', { willReadFrequently: true })
      g.drawImage(picture, 0, 0, c.width, c.height)
      const grey = guessWaterMask(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height)
      const out = new ImageData(c.width, c.height)
      grey.forEach((v, i) => { out.data[i * 4] = out.data[i * 4 + 1] = out.data[i * 4 + 2] = v; out.data[i * 4 + 3] = 255 })
      mask.getContext('2d').putImageData(out, 0, 0)
      this.changed()
    },
    clear () {
      if (!mask) return
      const g = mask.getContext('2d')
      g.fillStyle = '#000'; g.fillRect(0, 0, mask.width, mask.height)
      this.changed()
    },

    /** One dab of the soft brush at the pointer (white paints water, black takes it away). */
    dab (e) {
      const el = view()
      if (!mask || !el) return
      const r = el.getBoundingClientRect()
      const x = ((e.clientX - r.left) / r.width) * mask.width
      const y = ((e.clientY - r.top) / r.height) * mask.height
      const g = mask.getContext('2d')
      const soft = g.createRadialGradient(x, y, 0, x, y, this.brush / 2)
      const ink = this.erasing ? '0, 0, 0' : '255, 255, 255'
      soft.addColorStop(0, `rgba(${ink}, 1)`)
      soft.addColorStop(0.5, `rgba(${ink}, 0.85)`)
      soft.addColorStop(1, `rgba(${ink}, 0)`)
      g.fillStyle = soft
      g.fillRect(x - this.brush / 2, y - this.brush / 2, this.brush, this.brush)
      this.changed(false)
    },
    press (e) {
      e.currentTarget.setPointerCapture?.(e.pointerId)
      this.pressed = true
      this.dab(e)
    },
    move (e) { if (this.pressed) this.dab(e) },
    lift () {
      if (!this.pressed) return
      this.pressed = false
      this.changed()
    },

    /** Show the mask on the stage at once (once a frame), and save it once the hand rests. */
    changed (save = true) {
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0
          this.draw()
          if (mask) this.stage?.drawWaterMask?.(id, mask)
        })
      }
      if (!save) return
      clearTimeout(saveTimer)
      saveTimer = setTimeout(() => this.save(), SAVE_PAUSE_MS)
    },
    async save () {
      saveTimer = null
      if (!mask || this.stage?.sceneId == null) return
      let image = mask.toDataURL('image/webp', 0.9)
      if (!image.startsWith('data:image/webp')) image = mask.toDataURL('image/png')
      const mine = ++saves
      const res = await wire?.saveStage25dWaterMask(this.stage.sceneId, Number(String(id).replace('layer-', '')), image)
      if (res?.ok && res.url && mine === saves) this.set({ mask: res.url })
    },

    /** The brush window: the picture with the water tinted over it. */
    draw () {
      const el = view()
      if (!el || !picture || !mask) return
      el.width = mask.width; el.height = mask.height
      const g = el.getContext('2d')
      g.drawImage(picture, 0, 0, el.width, el.height)
      const tint = document.createElement('canvas')
      tint.width = mask.width; tint.height = mask.height
      const t = tint.getContext('2d')
      t.fillStyle = getComputedStyle(el).getPropertyValue('--color-primary').trim() || '#38bdf8'
      t.fillRect(0, 0, tint.width, tint.height)
      t.globalCompositeOperation = 'destination-in'
      t.drawImage(greyToAlpha(mask), 0, 0)
      g.globalAlpha = 0.55
      g.drawImage(tint, 0, 0)
      g.globalAlpha = 1
    },
  }
}

/** The grey mask as alpha (white = opaque), for tinting it over the picture. */
function greyToAlpha (grey) {
  const c = document.createElement('canvas')
  c.width = grey.width; c.height = grey.height
  const d = grey.getContext('2d').getImageData(0, 0, c.width, c.height)
  for (let i = 0; i < d.data.length; i += 4) { d.data[i + 3] = d.data[i]; d.data[i] = d.data[i + 1] = d.data[i + 2] = 255 }
  c.getContext('2d').putImageData(d, 0, 0)
  return c
}

function loadImage (url) {
  return new Promise((resolve, reject) => {
    if (!url) { reject(new Error('no picture')); return }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`${url} did not load`))
    img.src = url
  })
}
