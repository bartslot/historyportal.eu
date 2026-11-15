import { describe, expect, it } from 'vitest'
import { bindPuppet, limitBone } from './bones'
import { armClearOfFace, armOnItsSide, bendOf, elbowIsRight, forwardOf, kneeInFront, kneeIsRight } from './pose-guard'
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
  it('a thigh with no paint of its own (under a robe) still has a handle, grabbed at the knee', () => {
    const robed = { ...leg(1), parts: leg(1).parts.filter((p) => p.bone !== 'thigh_n') }
    const thigh = bindPuppet(robed).joints().find((j) => j.name === 'thigh_n')!
    expect(thigh.at).toEqual([50, 20])
    expect(thigh.tip[1]).toBeCloseTo(90, 5)
  })
})

describe('an arm drawn in front never crosses the face', () => {
  const waist: [number, number] = [100, 200], neck: [number, number] = [100, 100], near: [number, number] = [70, 110]
  it('across the chest below the neck is fine; across and up at the face is not; up on its own side is fine', () => {
    expect(armClearOfFace(waist, neck, near, [130, 150])).toBe(true)
    expect(armClearOfFace(waist, neck, near, [130, 80])).toBe(false)
    expect(armClearOfFace(waist, neck, near, [50, 40])).toBe(true)
  })
})

describe('an arm never passes through the body', () => {
  // torso axis waist (100, 200) -> neck (100, 100); near shoulder at x 70 (left), far shoulder at x 130 (right)
  const waist: [number, number] = [100, 200], neck: [number, number] = [100, 100], near: [number, number] = [70, 110], far: [number, number] = [130, 110]
  it('a near hand in front of the chest is fine, one beyond the far shoulder has gone through', () => {
    expect(armOnItsSide(waist, neck, near, far, [60, 250])).toBe(true)       // hanging at its own side
    expect(armOnItsSide(waist, neck, near, far, [125, 150])).toBe(true)      // across the chest, short of the far shoulder
    expect(armOnItsSide(waist, neck, near, far, [160, 120])).toBe(false)     // out past the far side
  })
  it('the far arm the same way round, whatever the facing', () => {
    expect(armOnItsSide(waist, neck, far, near, [140, 250])).toBe(true)
    expect(armOnItsSide(waist, neck, far, near, [40, 120])).toBe(false)
  })
  it('shoulders not either side of the axis: no rule', () => {
    expect(armOnItsSide(waist, neck, [70, 110], [80, 110], [400, 0])).toBe(true)
  })
})

describe('a boned arm swung across the body stops at its edge', () => {
  const quad = (x0: number, y0: number, x1: number, y1: number): [number, number][] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
  const puppet: Puppet = {
    atlas: 'a.png', width: 300, height: 400, facing: 1,
    bones: [
      { name: 'hips', parent: null, from: [150, 300] }, { name: 'chest', parent: 'hips', from: [150, 260], to: [150, 120] },
      { name: 'head', parent: 'chest', from: [150, 120], to: [150, 40] },
      { name: 'upperarm_n', parent: 'chest', from: [110, 130], to: [105, 210], limit: [-180, 180] }, { name: 'forearm_n', parent: 'upperarm_n', from: [105, 210], to: [100, 290] },
      { name: 'upperarm_f', parent: 'chest', from: [190, 130], to: [195, 210] }, { name: 'forearm_f', parent: 'upperarm_f', from: [195, 210], to: [200, 290] },
    ],
    parts: [{ bone: 'chest', quad: quad(115, 120, 185, 260), uv: [0, 0, 0.5, 0.5] }, { bone: 'upperarm_n', quad: quad(95, 130, 115, 210), uv: [0.5, 0, 0.6, 0.5] },
      { bone: 'forearm_n', quad: quad(90, 210, 110, 290), uv: [0.6, 0, 0.7, 0.5] }, { bone: 'upperarm_f', quad: quad(185, 130, 205, 210), uv: [0.7, 0, 0.8, 0.5] },
      { bone: 'forearm_f', quad: quad(190, 210, 210, 290), uv: [0.8, 0, 0.9, 0.5] }, { bone: 'head', quad: quad(120, 40, 180, 120), uv: [0, 0.5, 0.5, 1] }],
  }
  it('an arm drawn in front, raised across the face, is taken back until its hand is below the neck', () => {
    const bent = bindPuppet(puppet)
    const hand = (deg: number) => { bent.bend({ upperarm_n: deg }); return Object.fromEntries(bent.joints().map((x) => [x.name, x])).forearm_n.tip as [number, number] }
    // unguarded, -150 (counter-clockwise) carries the hand up over the head to the far side: the guard stops it lower
    expect(armClearOfFace([150, 260], [150, 120], [110, 130], hand(-150))).toBe(true)
    expect(hand(-150)[0]).toBeGreaterThan(hand(-10)[0])                // it did reach across, it was only kept off the face
  })
  it('an arm drawn behind the chest stays on its own side', () => {
    const behind = { ...puppet, parts: [puppet.parts[1], puppet.parts[2], puppet.parts[0], ...puppet.parts.slice(3)] }   // near arm first: behind
    const bent = bindPuppet(behind)
    bent.bend({ upperarm_n: -150 })
    const tip = Object.fromEntries(bent.joints().map((x) => [x.name, x])).forearm_n.tip as [number, number]
    expect(armOnItsSide([150, 260], [150, 120], [110, 130], [190, 130], tip)).toBe(true)
  })
  it('a hanging arm and a small swing are left alone', () => {
    const bent = bindPuppet(puppet)
    const at = (deg: number) => { bent.bend({ upperarm_n: deg }); return Object.fromEntries(bent.joints().map((x) => [x.name, x])).forearm_n.tip }
    const unguarded = (deg: number) => { const r = (deg * Math.PI) / 180, [x, y] = [100 - 110, 290 - 130]; return [110 + x * Math.cos(r) - y * Math.sin(r), 130 + x * Math.sin(r) + y * Math.cos(r)] }
    expect(at(-20)[0]).toBeCloseTo(unguarded(-20)[0], 0)
  })
})
