import { describe, it, expect } from 'vitest'
import { writeBack } from '../puppet-sheet.js'

// a figure of 4 x 1, two parts that overlap at figure x 1..2. The sheet holds them side by side, the back part first.
const puppet = {
  width: 4, height: 1,
  parts: [
    { quad: [[0, 0], [3, 0], [3, 1], [0, 1]], uv: [0, 0, 0.5, 1] },   // the back: figure 0..2, sheet 0..2
    { quad: [[1, 0], [4, 0], [4, 1], [1, 1]], uv: [0.5, 0, 1, 1] },   // the front: figure 1..3, sheet 3..5
  ],
}
const R = [200, 0, 0, 255], B = [0, 0, 200, 255]
const px = (...cells) => new Uint8ClampedArray(cells.flat())
const sheetOf = () => ({ data: px(R, R, R, B, B, B), width: 6, height: 1 })
const opened = () => px(R, B, B, B)   // the front part over the back one
const cellsOf = (out) => [...Array(6)].map((_, i) => [...out.slice(i * 4, i * 4 + 4)])

describe('a boned figure saved back onto its sheet', () => {
  it('nothing edited: the sheet stays exactly as it was', () => {
    const { pixels, lost } = writeBack(sheetOf(), opened(), opened(), puppet)
    expect([...pixels]).toEqual([...sheetOf().data])
    expect(lost).toBe(0)
  })

  it('paint lands on the part on top there, and the paint hidden under it stays for when an arm moves', () => {
    const edited = opened(); edited.set([0, 200, 0, 255], 1 * 4)
    const cells = cellsOf(writeBack(sheetOf(), opened(), edited, puppet).pixels)
    expect(cells[3], 'the front part').toEqual([0, 200, 0, 255])
    expect(cells[1], 'the back part under it').toEqual(R)
    expect(cells[0]).toEqual(R)
  })

  it('an erase goes through every part there: the paint under it must not show up in the hole', () => {
    const edited = opened(); edited.set([0, 0, 200, 0], 1 * 4)
    const cells = cellsOf(writeBack(sheetOf(), opened(), edited, puppet).pixels)
    expect(cells[3][3], 'the front part').toBe(0)
    expect(cells[1][3], 'the back part').toBe(0)
    expect(cells[2], 'the next pixel of the back part stays').toEqual(R)
  })

  it('half clear: the top part takes it, nothing under it shows through to change the look', () => {
    const edited = opened(); edited.set([0, 0, 200, 128], 2 * 4)
    const cells = cellsOf(writeBack(sheetOf(), opened(), edited, puppet).pixels)
    expect(cells[4]).toEqual([0, 0, 200, 128])
    expect(cells[2][3]).toBe(0)
  })

  it('paint on a spot where the top part is clear goes on the part that shows there', () => {
    const sheet = sheetOf(); sheet.data[3 * 4 + 3] = 0            // the front part is clear at figure x 1
    const was = px(R, R, B, B)
    const edited = new Uint8ClampedArray(was); edited.set([0, 200, 0, 255], 1 * 4)
    const cells = cellsOf(writeBack(sheet, was, edited, puppet).pixels)
    expect(cells[1], 'the back part, the one showing').toEqual([0, 200, 0, 255])
    expect(cells[3][3], 'the clear front stays clear').toBe(0)
  })

  it('paint where no part reaches cannot be kept, and says so', () => {
    const small = { width: 4, height: 1, parts: [{ quad: [[0, 0], [2, 0], [2, 1], [0, 1]], uv: [0, 0, 1, 1] }] }
    const sheet = { data: px(R, R), width: 2, height: 1 }
    const was = px(R, R, [0, 0, 0, 0], [0, 0, 0, 0])
    const edited = new Uint8ClampedArray(was); edited.set([0, 200, 0, 255], 3 * 4)
    const { pixels, lost } = writeBack(sheet, was, edited, small)
    expect([...pixels]).toEqual([...sheet.data])
    expect(lost).toBe(1)
  })

  it('a part drawn at another size on the sheet still finds its own cell', () => {
    const big = { width: 2, height: 1, parts: [{ quad: [[0, 0], [2, 0], [2, 1], [0, 1]], uv: [0, 0, 1, 1] }] }   // sheet is twice as wide
    const sheet = { data: px(R, R, R, R), width: 4, height: 1 }
    const was = px(R, R)
    const edited = px(R, B)
    const cells = [...writeBack(sheet, was, edited, big).pixels]
    expect(cells.slice(12, 16), 'the right half of the cell').toEqual(B)
    expect(cells.slice(0, 4)).toEqual(R)
  })

  it('Bring back into a saved hole: the paint goes back on the part that had it, and what lay hidden under it returns', () => {
    const clear = [0, 0, 0, 0]
    const first = { data: px(R, R, R, [0, 0, 0, 0], [0, 0, 0, 0], B), width: 6, height: 1 }   // the front part never had paint at figure x 1..2
    const sheet = { data: px(R, clear, R, clear, clear, B), width: 6, height: 1 }             // a hole saved at figure x 1
    const was = px(R, clear, R, B)
    const edited = new Uint8ClampedArray(was); edited.set(R, 1 * 4)
    const cells = cellsOf(writeBack(sheet, was, edited, puppet, first).pixels)
    expect(cells[1], 'the back part had it').toEqual(R)
    expect(cells[3][3], 'the front part never did').toBe(0)
  })

  it('a hole two parts deep filled again: the top part takes it and the paint hidden under it comes back', () => {
    const first = sheetOf()
    const sheet = sheetOf(); sheet.data[1 * 4 + 3] = 0; sheet.data[3 * 4 + 3] = 0
    const was = px(R, [0, 0, 0, 0], B, B)
    const edited = new Uint8ClampedArray(was); edited.set(B, 1 * 4)
    const cells = cellsOf(writeBack(sheet, was, edited, puppet, first).pixels)
    expect(cells[3], 'on top').toEqual(B)
    expect(cells[1], 'under it, as it first was').toEqual(R)
  })

  it('says how many pixels landed on the sheet: paint outside every part is none', () => {
    const small = { width: 4, height: 1, parts: [{ quad: [[0, 0], [2, 0], [2, 1], [0, 1]], uv: [0, 0, 1, 1] }] }
    const sheet = { data: px(R, R), width: 2, height: 1 }
    const was = px(R, R, [0, 0, 0, 0], [0, 0, 0, 0])
    const outside = new Uint8ClampedArray(was); outside.set([0, 200, 0, 255], 3 * 4)
    expect(writeBack(sheet, was, outside, small).touched).toBe(0)
    const inside = new Uint8ClampedArray(was); inside.set([0, 200, 0, 255], 0)
    expect(writeBack(sheet, was, inside, small).touched).toBe(1)
  })

  it('leaves the sheet it was given alone', () => {
    const sheet = sheetOf()
    const edited = opened(); edited.set([0, 200, 0, 255], 1 * 4)
    writeBack(sheet, opened(), edited, puppet)
    expect([...sheet.data]).toEqual([...sheetOf().data])
  })
})
