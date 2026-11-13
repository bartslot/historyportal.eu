import { describe, expect, it } from 'vitest'
import { bindPuppet, limitBone } from './bones'
import { bendOf, elbowIsRight, forwardOf, kneeInFront, kneeIsRight } from './pose-guard'
import type { Puppet } from './types'

describe('the posing rules on joint positions', () => {
  it('reads forward from the foot', () => {
    expect(forwardOf([10, 100], [30, 104])).toBe(1)
    expect(forwardOf([10, 100], [-5, 104])).toBe(-1)
  })

  it('a knee bends back, away from the toes, for either facing', () => {
    // hanging thigh, shin swung to the left: back for a figure facing right, wrong for one facing left
    expect(kneeIsRight([0, 0], [0, 50], [-30, 90], 1)).toBe(true)
    expect(kneeIsRight([0, 0], [0, 50], [-30, 90], -1)).toBe(false)
    expect(kneeIsRight([0, 0], [0, 50], [30, 90], -1)).toBe(true)
    expect(kneeIsRight([0, 0], [0, 50], [1, 100], 1)).toBe(true)   // straight: nothing to guard
  })

  it('an elbow folds the other way round from a knee', () => {
    expect(elbowIsRight([0, 0], [0, 50], [30, 70], 1)).toBe(true)
    expect(elbowIsRight([0, 0], [0, 50], [-30, 70], 1)).toBe(false)
  })

  it('a raised thigh puts the knee in front of the hip; a hanging one is not asked', () => {
    expect(kneeInFront([0, 0], [40, 10], 1)).toBe(true)
    expect(kneeInFront([0, 0], [-40, 10], 1)).toBe(false)
    expect(kneeInFront([0, 0], [-5, 50], 1)).toBe(true)
  })

  it('bends are clockwise positive on screen', () => {
    expect(bendOf([0, 0], [0, 50], [-30, 90])).toBeGreaterThan(0)
  })
})

/** A leg: hip, knee, ankle on a line down from (50, 20), a foot pointing the way it faces. */
const leg = (facing: 1 | -1, shinLimit?: [number, number]): Puppet => {
  const q = (x0: number, y0: number, x1: number, y1: number): [number, number][] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
  const uv: [number, number, number, number] = [0, 0, 1, 1]
  return {
    atlas: 'a.png', width: 100, height: 200, facing,
    bones: [
      { name: 'hips', parent: null, from: [50, 20] },
      { name: 'thigh_n', parent: 'hips', from: [50, 20], to: [50, 90] },
      { name: 'shin_n', parent: 'thigh_n', from: [50, 90], to: [50, 160], limit: shinLimit },
      { name: 'foot_n', parent: 'shin_n', from: [50, 160], to: [50 + 30 * facing, 170] },
    ],
    parts: [
      { bone: 'foot_n', quad: q(facing > 0 ? 45 : 15, 160, facing > 0 ? 85 : 55, 172), uv },
      { bone: 'shin_n', quad: q(45, 90, 55, 160), uv },
      { bone: 'thigh_n', quad: q(45, 20, 55, 90), uv },
    ],
  }
}
/** The ankle's x in a pose: the shin's lower left corner, plus half its width. */
const ankleX = (v: number[]) => (v[8 + 6] + v[8 + 4]) / 2

describe('a boned leg never bends its knee backwards', () => {
  for (const facing of [1, -1] as const) {
    it(`facing ${facing}: every knee turn from -180 to 180 leaves the foot behind the knee or under it`, () => {
      const bent = bindPuppet(leg(facing))
      for (let deg = -180; deg <= 180; deg += 15) {
        const v = bent.bend({ shin_n: deg })
        expect((ankleX(v) - 50) * facing).toBeLessThanOrEqual(0.5)
      }
    })
  }

  it('a rig whose own limit would let the knee bend forward is mirrored by the guard', () => {
    const bent = bindPuppet(leg(1, [-120, 0]))   // a limit written the wrong way round
    const v = bent.bend({ shin_n: -60 })
    expect(ankleX(v)).toBeLessThan(50)            // the foot went back, not forward
  })

  it('a puppet limit holds a bone, by facing', () => {
    expect(limitBone('shin_n', 150, 1, [0, 120])).toBe(120)
    expect(limitBone('shin_n', -150, -1, [0, 120])).toBe(-120)
    expect(limitBone('shin_n', -40, 1, [0, 120])).toBe(0)
  })
})

describe('handles on a boned leg', () => {
  it('a foot is grabbed at its toes, apart from the knee at the ankle', () => {
    const joints = bindPuppet(leg(1)).joints()
    const shin = joints.find((j) => j.name === 'shin_n')!, foot = joints.find((j) => j.name === 'foot_n')!
    expect(shin.tip[0]).toBeCloseTo(50, 5); expect(shin.tip[1]).toBeCloseTo(160, 5)
    expect(foot.tip[0]).toBeCloseTo(80, 0)
  })
})
