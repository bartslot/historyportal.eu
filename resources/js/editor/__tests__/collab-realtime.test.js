import { describe, it, expect } from 'vitest'
import { stagePoint } from '../collab-realtime.js'

describe('cursors over the stage (Bart 11-23)', () => {
  const rect = { left: 100, top: 50, width: 800, height: 450 }

  it('sends the pointer as a share of the stage, so every screen size draws it in the same spot', () => {
    expect(stagePoint(500, 275, rect)).toEqual({ x: 0.5, y: 0.5 })
    expect(stagePoint(100, 50, rect)).toEqual({ x: 0, y: 0 })
  })

  it('sends nothing when the pointer is off the stage', () => {
    expect(stagePoint(50, 275, rect)).toBeNull()
    expect(stagePoint(500, 600, rect)).toBeNull()
    expect(stagePoint(500, 275, null)).toBeNull()
  })
})
