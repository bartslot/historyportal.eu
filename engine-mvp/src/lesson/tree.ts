// The scene tree: scenes and groups, groups inside groups. Pure: every edit returns a new tree.
export type SceneNode = { kind: 'scene'; id: string; title: string }
export type GroupNode = { kind: 'group'; id: string; title: string; open: boolean; children: TreeNode[] }
export type TreeNode = SceneNode | GroupNode

export const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`

/** Every scene in reading order (groups flattened): the order the lesson plays in. */
export const scenesInOrder = (tree: TreeNode[]): SceneNode[] =>
  tree.flatMap((n) => (n.kind === 'scene' ? [n] : scenesInOrder(n.children)))

export function find(tree: TreeNode[], id: string): TreeNode | null {
  for (const n of tree) {
    if (n.id === id) return n
    if (n.kind === 'group') { const hit = find(n.children, id); if (hit) return hit }
  }
  return null
}

/** The node's parent group id, or null at the top level. */
export function parentOf(tree: TreeNode[], id: string, parent: string | null = null): string | null | undefined {
  for (const n of tree) {
    if (n.id === id) return parent
    if (n.kind === 'group') { const hit = parentOf(n.children, id, n.id); if (hit !== undefined) return hit }
  }
  return undefined
}

export const map = (tree: TreeNode[], fn: (n: TreeNode) => TreeNode): TreeNode[] =>
  tree.map((n) => fn(n.kind === 'group' ? { ...n, children: map(n.children, fn) } : n))

export const remove = (tree: TreeNode[], id: string): TreeNode[] =>
  tree.filter((n) => n.id !== id).map((n) => (n.kind === 'group' ? { ...n, children: remove(n.children, id) } : n))

/** Insert `node` into group `into` (null = top level) at `index` (default: the end). */
export function insert(tree: TreeNode[], node: TreeNode, into: string | null, index?: number): TreeNode[] {
  const put = (list: TreeNode[]) => { const at = index ?? list.length; return [...list.slice(0, at), node, ...list.slice(at)] }
  if (into === null) return put(tree)
  return map(tree, (n) => (n.kind === 'group' && n.id === into ? { ...n, children: put(n.children) } : n))
}

const contains = (node: TreeNode, id: string): boolean =>
  node.id === id || (node.kind === 'group' && node.children.some((c) => contains(c, id)))

/** Move a node into a group (or the top level) at an index. A group cannot go inside itself. */
export function move(tree: TreeNode[], id: string, into: string | null, index?: number): TreeNode[] {
  const node = find(tree, id)
  if (!node || (into !== null && contains(node, into))) return tree
  return insert(remove(tree, id), node, into, index)
}

export const rename = (tree: TreeNode[], id: string, title: string) => map(tree, (n) => (n.id === id ? { ...n, title } : n))
export const toggleOpen = (tree: TreeNode[], id: string) => map(tree, (n) => (n.kind === 'group' && n.id === id ? { ...n, open: !n.open } : n))

/** Wrap a node in a new group, in its place. */
export function group(tree: TreeNode[], id: string, title: string): { tree: TreeNode[]; groupId: string } {
  const node = find(tree, id)
  if (!node) return { tree, groupId: '' }
  const g: GroupNode = { kind: 'group', id: newId('g'), title, open: true, children: [node] }
  const parent = parentOf(tree, id) ?? null
  const siblings = parent === null ? tree : (find(tree, parent) as GroupNode).children
  return { tree: insert(remove(tree, id), g, parent, siblings.findIndex((n) => n.id === id)), groupId: g.id }
}
