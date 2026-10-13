import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  posterFit, boxInGroup, groupRuns, frameCqw, layerTransform, entrancePlan,
  ENTRANCE_BUDGET_MS, PHONE_GUTTER_PX, mountTitlePoster, coverBackdrop, COVER_FOCUS_Y,
} from '../title-poster.js'

const tasman = JSON.parse(readFileSync(resolve(__dirname, '../../../public/lesson-titles/tasman-standard/poster.json'), 'utf8'))
const cover = JSON.parse(readFileSync(resolve(__dirname, '../../../public/lesson-titles/tasman-standard/cover/poster.json'), 'utf8'))
const close = (a, b, eps = 0.01) => expect(Math.abs(a - b)).toBeLessThan(eps)

describe('posterFit', () => {
  test('a landscape view fits the whole frame, centred (object-fit: contain)', () => {
    const r = posterFit(1440, 900, tasman)
    close(r.height, 900)
    close(r.width, 900 * tasman.frame.w / tasman.frame.h)
    close(r.left, (1440 - r.width) / 2)
    close(r.top, 0)
  })

  test('a portrait phone fills its width with the letters, a 16px gutter each side', () => {
    const r = posterFit(375, 812, tasman)
    const f = tasman.focus
    const lettersLeft = r.left + f.x / 100 * r.width
    const lettersRight = lettersLeft + f.w / 100 * r.width
    close(lettersLeft, PHONE_GUTTER_PX)
    close(lettersRight, 375 - PHONE_GUTTER_PX)
    // centred vertically on the letters
    close(r.top + (f.y + f.h / 2) / 100 * r.height, 812 / 2)
  })

  test('an empty view has no frame', () => {
    expect(posterFit(0, 0, tasman)).toEqual({ left: 0, top: 0, width: 0, height: 0 })
  })
})

describe('boxes and groups', () => {
  test('a frame box becomes a share of its group box', () => {
    expect(boxInGroup({ x: 30, y: 20, w: 10, h: 5 }, { x: 10, y: 10, w: 50, h: 50 })).toEqual({ x: 40, y: 20, w: 20, h: 10 })
    expect(boxInGroup({ x: 1, y: 2, w: 3, h: 4 })).toEqual({ x: 1, y: 2, w: 3, h: 4 })
  })

  test('the Tasman scene layers all sit at the shared mask origin Figma uses', () => {
    // Figma: the ships' mask-position is (-1213.668, -136.035) px from the ships' own corner.
    const ships = tasman.layers.find(l => l.id === 'voc-ships')
    const mask = tasman.groups.scene.box
    close((ships.box.x - mask.x) / 100 * tasman.frame.w, 1213.668, 1)
    close((ships.box.y - mask.y) / 100 * tasman.frame.h, 136.035, 1)
  })

  test('consecutive layers of one group share a wrapper, z-order kept', () => {
    const runs = groupRuns([{ id: 'a' }, { id: 'b', group: 'g' }, { id: 'c', group: 'g' }, { id: 'd' }])
    expect(runs.map(r => [r.group, r.layers.map(l => l.id).join('')])).toEqual([[null, 'a'], ['g', 'bc'], [null, 'd']])
  })

  test('Tasman stacks: ABEL, TASMAN (shadow group), then the masked scene with outlines last', () => {
    expect(groupRuns(tasman.layers).map(r => r.group)).toEqual([null, 'tasman', 'scene'])
    expect(tasman.layers.at(-1).id).toBe('outlines')
  })

  test('frame px become container-width units', () => {
    expect(frameCqw(90, { frame: { w: 9000 } })).toBe('1cqw')
  })

  test('flip goes first, then the rotation', () => {
    expect(layerTransform({ flip: 'x', rotate: 0.88 })).toBe('rotate(0.88deg) scaleX(-1)')
    expect(layerTransform({})).toBe('')
  })
})

describe('entrancePlan', () => {
  test('letters drop in order, the scene follows, all inside the budget', () => {
    const { steps, totalMs } = entrancePlan(tasman.layers)
    const drops = steps.filter(s => s.kind === 'drop')
    expect(drops.map(s => s.id)).toEqual(['a', 'b', 'e', 'l', 's', 't', 'm', 'n', 'a1', 'a2'])
    expect(drops.every((s, i) => i === 0 || s.delay > drops[i - 1].delay)).toBe(true)
    const fades = steps.filter(s => s.kind === 'fade')
    expect(fades.length).toBe(7)
    expect(fades[0].delay).toBeGreaterThan(drops.at(-1).delay)
    expect(totalMs).toBeLessThanOrEqual(ENTRANCE_BUDGET_MS)
  })

  test('nothing to enter is an empty plan', () => {
    expect(entrancePlan([])).toEqual({ steps: [], totalMs: 0 })
  })
})

describe('mountTitlePoster', () => {
  test('builds the groups in order under the subtitle, masked scene and shadowed letters', () => {
    const host = document.createElement('div')
    const stage = document.createElement('div')
    const subtitle = document.createElement('span')
    stage.appendChild(subtitle)
    host.appendChild(stage)
    const poster = {
      ...tasman,
      layers: tasman.layers.map(l => ({ ...l, url: `/x/${l.src}` })),
      groups: { ...tasman.groups, scene: { ...tasman.groups.scene, mask_url: '/x/mask.svg' } },
    }
    const stop = mountTitlePoster(host, stage, poster)
    const groups = stage.querySelectorAll(':scope > .title-poster-group')
    expect(groups.length).toBe(3)
    expect(stage.lastChild).toBe(subtitle)
    expect(groups[1].style.filter).toContain('drop-shadow')
    expect(groups[2].style.maskImage || groups[2].style.webkitMaskImage).toContain('/x/mask.svg')
    expect(stage.querySelector('[data-poster-layer="wave-break"]').style.transform).toBe('rotate(0.88deg) scaleX(-1)')
    stop()
  })
})

describe('the comic cover (fit: cover)', () => {
  const inView = (r, f, viewW, viewH) => {
    const left = r.left + f.x / 100 * r.width
    const top = r.top + f.y / 100 * r.height
    expect(left).toBeGreaterThanOrEqual(0)
    expect(top).toBeGreaterThanOrEqual(0)
    expect(left + f.w / 100 * r.width).toBeLessThanOrEqual(viewW + 0.01)
    expect(top + f.h / 100 * r.height).toBeLessThanOrEqual(viewH + 0.01)
  }

  test('a desktop view is filled edge to edge, no colour bars, the focus in sight', () => {
    const r = posterFit(1440, 900, cover)
    expect(r.left).toBeLessThanOrEqual(0)
    expect(r.top).toBeLessThanOrEqual(0)
    expect(r.left + r.width).toBeGreaterThanOrEqual(1440 - 0.01)
    expect(r.top + r.height).toBeGreaterThanOrEqual(900 - 0.01)
    inView(r, cover.focus, 1440, 900)
  })

  test('a phone keeps Tasman, the spyglass and the title across its width, 16px gutters, no side bars', () => {
    const r = posterFit(375, 812, cover)
    const f = cover.focus
    close(r.left + f.x / 100 * r.width, PHONE_GUTTER_PX, 1)
    close(r.left + (f.x + f.w) / 100 * r.width, 375 - PHONE_GUTTER_PX, 1)
    expect(r.left).toBeLessThanOrEqual(0)
    expect(r.left + r.width).toBeGreaterThanOrEqual(375)
    close(r.top + (f.y + f.h / 2) / 100 * r.height, 812 * COVER_FOCUS_Y, 1)
    inView(r, f, 375, 812)
  })

  test('a tall phone gets sky above and the deck colour below the painting', () => {
    const r = posterFit(375, 812, cover)
    const split = Math.round(r.top + r.height / 2)
    expect(coverBackdrop(cover, r)).toBe(`linear-gradient(to bottom, ${cover.background} ${split}px, ${cover.background_bottom} ${split}px)`)
    expect(coverBackdrop({ ...cover, background_bottom: null }, r)).toBeNull()
  })

  test('the painting is on screen from the first frame; the letters drop, the series line fades', () => {
    const plan = entrancePlan(cover.layers)
    expect(plan.steps.find(s => s.id === 'plate')).toBeUndefined()
    expect(plan.steps.filter(s => s.kind === 'drop').map(s => s.id).join('')).toBe('abelta1sma2n')
    expect(plan.steps.find(s => s.id === 'series').kind).toBe('fade')
    expect(plan.totalMs).toBeLessThanOrEqual(ENTRANCE_BUDGET_MS)
  })
})
