import { describe, it, expect } from 'vitest'
import { layerSizeRow } from '../ui/layer-size-row.js'

describe('layerSizeRow fitted', () => {
  it('shows the height "Fit to this spot" saved for its own layer, and ignores other layers', () => {
    const row = layerSizeRow({ assetId: 7, height: 19, width: 10 })
    row.init()

    row.fitted({ assetId: 8, height: 30 })
    expect(row.h).toBe(19)

    row.fitted({ assetId: 7, height: 20.61 })
    expect(row.h).toBe(20.61)
    expect(row.w).toBeCloseTo(10.85, 2) // the aspect lock scales the width with it
  })
})
