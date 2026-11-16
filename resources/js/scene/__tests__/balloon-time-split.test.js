import { describe, it, expect } from 'vitest'
import { BalloonLayer } from '../BalloonLayer.js'
import { editableBalloons, timeBalloons } from '../balloon-edit.js'

/**
 * The playhead reaches every balloon on the editor's stage, a split scene's panels too (Bart 11-16,
 * lesson 126 scene 4621: the panels' balloons stayed at time 0, so one starting later never showed
 * and its eye on the timeline had nothing to hide).
 */
const panel = (lines) => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const layer = new BalloonLayer(host, undefined, editableBalloons(() => {}))
  layer.setLines(lines)
  return layer
}
const shown = (layer) => [...layer.shown.keys()].map((i) => layer.lines[i].id)

describe('the playhead on a split scene', () => {
  it('shows each panel balloon during its own time', () => {
    const left = panel([{ speaker: 'matroos', text: 'Must I climb up there?', start: 0.464, end: 3.254 }])
    const right = panel([{ speaker: 'bootsman', text: 'Only if the mast comes down.', start: 4.3, end: 8.85 }])
    expect(shown(left)).toEqual([])

    timeBalloons(1.5)
    expect(shown(left)).toEqual(['bal_0'])
    expect(shown(right)).toEqual([])

    timeBalloons(5)
    expect(shown(left)).toEqual([])
    expect(shown(right)).toEqual(['bal_0'])
  })

  it('starts a rebuilt panel at the playhead, not at 0', () => {
    timeBalloons(1.5)
    const rebuilt = panel([{ speaker: 'matroos', text: 'Must I climb up there?', start: 0.464, end: 3.254 }])

    expect(shown(rebuilt)).toEqual(['bal_0'])
  })
})
