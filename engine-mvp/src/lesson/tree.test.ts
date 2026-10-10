import { describe, expect, it } from 'vitest'
import { dropOn, group, insert, move, parentOf, remove, rename, scenesInOrder, toggleOpen, type TreeNode } from './tree'

const s = (id: string): TreeNode => ({ kind: 'scene', id, title: id })
const base: TreeNode[] = [s('a'), { kind: 'group', id: 'g', title: 'Act 1', open: true, children: [s('b'), { kind: 'group', id: 'h', title: 'Sub', open: true, children: [s('c')] }] }, s('d')]

describe('scene tree', () => {
  it('plays scenes in reading order, through groups', () => {
    expect(scenesInOrder(base).map((n) => n.id)).toEqual(['a', 'b', 'c', 'd'])
  })
  it('moves a scene into a nested group at an index', () => {
    const t = move(base, 'a', 'h', 0)
    expect(scenesInOrder(t).map((n) => n.id)).toEqual(['b', 'a', 'c', 'd'])
    expect(parentOf(t, 'a')).toBe('h')
  })
  it('will not put a group inside itself', () => {
    expect(move(base, 'g', 'h')).toBe(base)
  })
  it('groups a scene in place', () => {
    const { tree, groupId } = group(base, 'd', 'Ending')
    expect(tree.at(-1)?.id).toBe(groupId)
    expect(parentOf(tree, 'd')).toBe(groupId)
  })
  it('removes, inserts, renames and folds without touching the original', () => {
    expect(scenesInOrder(remove(base, 'h')).map((n) => n.id)).toEqual(['a', 'b', 'd'])
    expect(insert(base, s('e'), 'g').map((n) => n.id)).toEqual(['a', 'g', 'd'])
    expect(rename(base, 'b', 'Market')[1]).not.toBe(base[1])
    expect((toggleOpen(base, 'g')[1] as any).open).toBe(false)
    expect((base[1] as any).open).toBe(true)
  })
  it('drops onto a scene before it, onto a group inside it', () => {
    expect(scenesInOrder(dropOn(base, 'd', 'b')).map((n) => n.id)).toEqual(['a', 'd', 'b', 'c'])
    expect(parentOf(dropOn(base, 'a', 'h'), 'a')).toBe('h')
    expect(dropOn(base, 'b', 'b')).toBe(base)
  })
})
