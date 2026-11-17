import { describe, it, expect } from 'vitest'
import { BalloonLayer, balloonSide, layoutBalloon, mouthGap } from '../BalloonLayer.js'
import { lineCues } from '../captions.js'

/**
 * Speech balloons. The rule worth pinning is Bart's: the tail tip stops 55 px from the mouth at
 * 1920 wide (he asked for 50-60), and the balloon never leaves the frame.
 */
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

describe('layoutBalloon', () => {
  it('stops the tail 55 px short of the mouth on a 1920 stage', () => {
    const mouth = [460, 430]
    const { tail } = layoutBalloon(mouth, { w: 420, h: 120 }, { w: 1920, h: 1080 })
    expect(dist(tail.tip, mouth)).toBeCloseTo(55, 5)
  })

  it('keeps a readable gap on a phone instead of shrinking it to nothing', () => {
    const mouth = [90, 300]
    const { tail } = layoutBalloon(mouth, { w: 180, h: 80 }, { w: 375, h: 667 })
    expect(dist(tail.tip, mouth)).toBeCloseTo(14, 6)
    expect(mouthGap(375)).toBe(14)
  })

  it('puts the balloon above the mouth and inside the frame, even for a mouth at the edge', () => {
    const host = { w: 1920, h: 1080 }
    const box = { w: 500, h: 140 }
    const { left, top } = layoutBalloon([1900, 200], box, host)
    expect(left).toBeGreaterThanOrEqual(0)
    expect(left + box.w).toBeLessThanOrEqual(host.w)
    expect(top).toBeGreaterThanOrEqual(0)
  })

  it('keeps the balloon on screen when a portrait crop hides the speaker', () => {
    // A 1493 px plate shown through an 800 px window starting at x = 346.
    const view = { x0: 346, y0: 0, x1: 1146, y1: 804 }
    const { left, tail } = layoutBalloon([1300, 375], { w: 300, h: 100 }, { w: 1493, h: 804 }, view)
    expect(left).toBeGreaterThanOrEqual(view.x0)
    expect(left + 300).toBeLessThanOrEqual(view.x1)
    expect(Math.hypot(tail.tip[0] - 1300, tail.tip[1] - 375)).toBeGreaterThanOrEqual(mouthGap(1493) - 1e-9)
  })

  it('moves a new balloon off one already on screen', () => {
    const host = { w: 1920, h: 1080 }
    const box = { w: 400, h: 100 }
    const first = { left: 760, top: 48, w: 400, h: 100 }
    const { left, top } = layoutBalloon(null, box, host, undefined, [first])
    const apart = left >= first.left + first.w || left + box.w <= first.left || top >= first.top + first.h
    expect(apart).toBe(true)
  })

  it('never pushes a speaker\'s balloon across the frame, away from its mouth', () => {
    const host = { w: 1920, h: 1080 }
    const box = { w: 420, h: 110 }
    const mouth = [460, 470]
    const alone = layoutBalloon(mouth, box, host)
    // Something already sits exactly where this balloon wants to go.
    const blocker = { left: alone.left, top: alone.top, w: 700, h: box.h }
    const moved = layoutBalloon(mouth, box, host, undefined, [blocker])
    expect(moved.left + box.w / 2).toBeLessThan(host.w / 2)
    expect(moved.top).toBeGreaterThanOrEqual(blocker.top + blocker.h)
  })

  it('brings the tail in at an angle from the side the face looks to, never straight down', () => {
    const host = { w: 1920, h: 1080 }
    for (const [mouth, facing] of [[[460, 470], 1], [[460, 470], -1], [[1400, 470], 1], [[1400, 470], -1]]) {
      const { side, room } = balloonSide(mouth, facing, host, { x0: 0, y0: 0, x1: 1920, y1: 1080 })
      // The player narrows the bubble to the room on that side.
      const box = { w: Math.min(420, room), h: 110 }
      const { tail } = layoutBalloon(mouth, box, host, undefined, [], side)
      const [bx, by] = tail.base
      expect(side).toBe(facing)
      // In front of the face: the tail's base is on the facing side of the mouth ...
      expect(Math.sign(bx - mouth[0])).toBe(facing)
      // ... and it leans at least 25 degrees off vertical.
      expect(Math.atan2(Math.abs(bx - mouth[0]), Math.abs(mouth[1] - by)) * 180 / Math.PI).toBeGreaterThan(25)
    }
  })

  it('keeps the balloon on the face\'s side unless not even a narrow one fits there', () => {
    const view = { x0: 0, y0: 0, x1: 1920, y1: 1080 }
    expect(balloonSide([1500, 400], 1, { w: 1920, h: 1080 }, view).side).toBe(1)
    expect(balloonSide([1800, 400], 1, { w: 1920, h: 1080 }, view).side).toBe(-1)
  })

  it('gives an off-frame speaker a balloon with no tail', () => {
    expect(layoutBalloon(null, { w: 400, h: 100 }, { w: 1920, h: 1080 }).tail).toBeNull()
  })
})

describe('BalloonLayer mouth', () => {
  it('puts the mouth on the figure as it is drawn now, at its current scale', () => {
    const host = document.createElement('div')
    // A figure drawn 200 x 400 px at (100, 50); its mouth is at 50 % across, 25 % down its picture.
    const layer = new BalloonLayer(host, () => ({ left: 100, top: 50, width: 200, height: 400 }))
    expect(layer._mouth({ figure: { asset_id: 7, mouth: [0.5, 0.25] } })).toEqual([200, 150])
  })

  it('treats a speaker whose figure is not on stage as off-frame', () => {
    const layer = new BalloonLayer(document.createElement('div'), () => null)
    expect(layer._mouth({ figure: { asset_id: 7, mouth: [0.5, 0.25] } })).toBeNull()
    expect(layer._mouth({ figure: null })).toBeNull()
  })
})

describe('lineCues', () => {
  it('captions only the narrator, at the line\'s own place on the track', () => {
    const cues = lineCues([
      { speaker: 'beatrice', text: 'Buon giorno.', start: 0, end: 5 },
      { speaker: 'narrator', text: 'Nella Vita nuova, Dante racconta il saluto.', start: 2.5, end: 6 },
    ])
    expect(cues).toEqual([{ text: 'Nella Vita nuova, Dante racconta il saluto.', start: 2.5, end: 6 }])
  })
})

describe('BalloonLayer: balloons added in the editor', () => {
  const balloon = { speaker: 'balloon', text: 'Moet ik daarboven klimmen?', start: 0, end: null, figure: null, at: [0.5, 0.2] }

  it('stays up to the scene\'s end when it has no end', () => {
    const layer = new BalloonLayer(document.createElement('div'), () => null)
    layer.setLines([balloon])
    layer.update(9999)
    expect(layer.shown.size).toBe(1)
  })

  it('names each balloon by its place in the scene\'s lines, narrator lines counted', () => {
    const layer = new BalloonLayer(document.createElement('div'), () => null)
    layer.setLines([{ speaker: 'narrator', text: 'Tasman waits.', start: 0, end: 3 }, balloon])
    expect(layer.lines.map(l => l.id)).toEqual(['bal_1'])
  })

  it('keeps a balloon the timeline eye switched off hidden through every relayout, and shows it again', () => {
    // Sweep 11-16: the eye set visibility from outside and the next layout wiped it.
    const layer = new BalloonLayer(document.createElement('div'), () => null)
    layer.setLines([balloon])
    const el = layer.shown.get(0)
    layer.setHidden('bal_0', true)
    layer._relayout()
    expect(el.style.visibility).toBe('hidden')
    layer.setHidden('bal_0', false)
    expect(el.style.visibility).toBe('')
  })

  it('draws a thought as a cloud, with no speech tail', () => {
    const host = document.createElement('div')
    const layer = new BalloonLayer(host, () => null)
    layer.setLines([{ ...balloon, kind: 'thought', tail: { tip: [0.5, 0.9] } }])
    const el = host.querySelector('.lp-balloon')
    expect(el.dataset.kind).toBe('thought')
    expect(el.querySelector('.lp-balloon__cloud path').getAttribute('d')).toMatch(/^M /)
    expect(el.querySelector('.lp-balloon__tail .ink').getAttribute('d')).toBe('')
  })

  it('draws a sound word as ComicAmerica letters alone: no cloud, no tail, plain balloons untouched', () => {
    const host = document.createElement('div')
    const layer = new BalloonLayer(host, () => null)
    layer.setLines([
      { ...balloon, kind: 'sound', text: 'Land!', tail: { tip: [0.5, 0.9] } },
      { ...balloon, text: 'Gewoon praten' },
    ])
    const [sound, speech] = host.querySelectorAll('.lp-balloon')
    expect(sound.dataset.kind).toBe('sound')
    const letters = sound.querySelector('.lp-balloon__bubble > .lp-comic-america')
    expect(letters.dataset.t).toBe('Land!')
    expect(letters.textContent).toBe('Land!')
    expect(sound.querySelector('.lp-balloon__cloud path').getAttribute('d')).toBe('')
    expect(sound.querySelector('.lp-balloon__tail .ink').getAttribute('d')).toBe('')

    layer.patchLine('bal_0', { text: 'Boem' })
    expect(sound.querySelector('.lp-comic-america').dataset.t).toBe('Boem')

    expect(speech.dataset.kind).toBe('speech')
    expect(speech.querySelector('.lp-comic-america')).toBeNull()
    expect(speech.querySelector('.lp-balloon__bubble').textContent).toBe('Gewoon praten')
  })

  it('in the editor a balloon shows during its own time, and stays while it is selected', () => {
    const layer = new BalloonLayer(document.createElement('div'), () => null, { editable: true })
    layer.setLines([{ ...balloon, id: 'bal_0', start: 5, end: 6 }])
    layer.update(0)
    expect(layer.shown.size).toBe(0)
    layer.update(5.5)
    expect(layer.shown.size).toBe(1)
    layer.markSelected('bal_0')
    layer.update(9)
    expect(layer.shown.size).toBe(1)
    layer.markSelected(null)
    layer.update(9)
    expect(layer.shown.size).toBe(0)
  })

  it('a selected balloon outside its time is only its selection outline, so the stage agrees with its bar (Bart 11-16)', () => {
    const layer = new BalloonLayer(document.createElement('div'), () => null, { editable: true })
    layer.setLines([{ ...balloon, id: 'bal_0', start: 1.15, end: 2.95 }])
    layer.markSelected('bal_0')
    layer.update(0)
    const el = layer.shown.get(0)
    // data-ghost: app.css hides the balloon and keeps the selection outline where it sits
    expect(el.hasAttribute('data-ghost')).toBe(true)

    layer.update(2)   // inside its bar: the class sees it, so it is drawn in full
    expect(el.hasAttribute('data-ghost')).toBe(false)
  })
})

describe('patchLine', () => {
  it('draws new words on the balloon that is showing', () => {
    const layer = new BalloonLayer(document.createElement('div'), () => null)
    const bubble = { textContent: 'old' }
    const el = { querySelector: () => bubble }
    layer.lines = [{ id: 'bal_0', text: 'old' }]
    layer.shown.set(0, el)
    layer._place = vi.fn()

    layer.patchLine('bal_0', { text: 'new' })

    expect(bubble.textContent).toBe('new')
    expect(layer._place).toHaveBeenCalledWith(el, expect.objectContaining({ text: 'new' }))
  })
})

describe('a balloon whose speaker moves', () => {
  it('moves with its speaker: bubble and tail tip shift by how far the figure moved (Bart 11-16)', () => {
    const host = document.createElement('div')
    Object.defineProperty(host, 'clientWidth', { value: 1000 })
    Object.defineProperty(host, 'clientHeight', { value: 500 })
    let shift = [0, 0]
    const layer = new BalloonLayer(host, () => null, { figureShift: () => shift })
    const line = { id: 'bal_0', speaker: 'visscher', text: 'x', figure: { asset_id: 111, mouth: [0.5, 0.1] }, at: [0.5, 0.2], tail: { tip: [0.88, 0.48] } }
    layer.setLines([line])

    expect(layer._fromMouth(layer.lines[0], [0.88, 0.48], null)).toEqual([0.88, 0.48])
    shift = [100, -20]
    expect(layer._fromMouth(layer.lines[0], [0.88, 0.48], null).map((v) => +v.toFixed(3))).toEqual([0.98, 0.44])
    // a tip dragged while he stands there is saved at his saved spot, so it does not jump on reload
    expect(layer.storedPoint('bal_0', [0.98, 0.44]).map((v) => +v.toFixed(3))).toEqual([0.88, 0.48])
  })
})

