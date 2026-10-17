// The script's schema on top of TipTap's StarterKit: scene headings, lines with stable ids, the
// Subtitle mark, and the highlight on the line the playhead is in.
import { Extension, Mark, Node, mergeAttributes } from '@tiptap/core'
import Paragraph from '@tiptap/extension-paragraph'
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { __ } from '../i18n'
import { shotsOf, type ScriptNode } from '../storyboard/shots'

export const newLineId = () => `l-${Math.random().toString(36).slice(2, 10)}`

/** One heading per scene. Not editable here: scenes are named in the rail and the heading follows. */
export const SceneHeading = Node.create({
  name: 'sceneHeading',
  group: 'block',
  atom: true,
  selectable: false,
  draggable: false,
  addAttributes() {
    return {
      sceneId: { default: null, parseHTML: (el) => el.getAttribute('data-scene-id'), renderHTML: (a) => ({ 'data-scene-id': a.sceneId }) },
      title: { default: '', parseHTML: (el) => el.textContent ?? '', renderHTML: () => ({}) },
    }
  },
  parseHTML: () => [{ tag: 'h2[data-scene-id]' }],
  renderHTML({ node, HTMLAttributes }) {
    return ['h2', mergeAttributes(HTMLAttributes, { class: 'script-scene', contenteditable: 'false' }), node.attrs.title || __('Scene')]
  },
})

/** A line: a paragraph with a stable id, an optional speaker and, once read aloud, its measured length. */
export const Line = Paragraph.extend({
  addAttributes() {
    return {
      id: { default: null, parseHTML: (el) => el.getAttribute('data-line-id'), renderHTML: (a) => (a.id ? { 'data-line-id': a.id } : {}) },
      speaker: { default: null, parseHTML: (el) => el.getAttribute('data-speaker'), renderHTML: (a) => (a.speaker ? { 'data-speaker': a.speaker } : {}) },
      dur: { default: null, parseHTML: (el) => Number(el.getAttribute('data-dur')) || null, renderHTML: (a) => (a.dur ? { 'data-dur': a.dur } : {}) },
      /** false: this line stays on the shot of the line before it (one frame for both, src/storyboard) */
      cut: { default: true, parseHTML: (el) => el.getAttribute('data-cut') !== 'false', renderHTML: (a) => (a.cut === false ? { 'data-cut': 'false' } : {}) },
    }
  },
})

/** Every line keeps a unique id: splitting a line copies its attributes, so the copy gets a new one
 *  (and loses the measured length, which belonged to the whole line). */
export const LineIds = Extension.create({
  name: 'lineIds',
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey('lineIds'),
      appendTransaction: (trs, _old, state) => {
        if (!trs.some((t) => t.docChanged)) return null
        const seen = new Set<string>()
        let tr: Transaction | null = null
        state.doc.descendants((node, pos) => {
          if (node.type.name !== 'paragraph') return
          const id = node.attrs.id
          if (id && !seen.has(id)) { seen.add(id); return }
          const fresh = newLineId()
          seen.add(fresh)
          tr = (tr ?? state.tr).setNodeMarkup(pos, undefined, { ...node.attrs, id: fresh, dur: null, cut: true }) // a new line is a new shot
        })
        return tr
      },
    })]
  },
})

/** Text the class reads on screen while it is spoken. */
export const Subtitle = Mark.create({
  name: 'subtitle',
  parseHTML: () => [{ tag: 'span[data-subtitle]' }],
  renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes, { 'data-subtitle': '', class: 'script-subtitle' }), 0],
  addKeyboardShortcuts() {
    return { 'Mod-Shift-s': () => this.editor.commands.toggleMark(this.name) }
  },
})

/** The line under the playhead, lit. Set with tr.setMeta(activeLineKey, id | null). */
export const activeLineKey = new PluginKey<string | null>('activeLine')
export const ActiveLine = Extension.create({
  name: 'activeLine',
  addProseMirrorPlugins() {
    return [new Plugin<string | null>({
      key: activeLineKey,
      state: {
        init: () => null,
        apply: (tr, value) => (tr.getMeta(activeLineKey) !== undefined ? tr.getMeta(activeLineKey) : value),
      },
      props: {
        decorations(state) {
          const id = activeLineKey.getState(state)
          if (!id) return null
          const decos: Decoration[] = []
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'paragraph' && node.attrs.id === id) decos.push(Decoration.node(pos, pos + node.nodeSize, { class: 'is-speaking' }))
          })
          return DecorationSet.create(state.doc, decos)
        },
      },
    })]
  },
})

/** The storyboard in the margin: the shot letter on the line a shot starts at (A, B... per scene, the same letter as
 *  its frame), and the line the cursor is in marked as the current one (its frame is the selected frame). */
export const shotKey = new PluginKey('shots')
export const ShotLetters = Extension.create({
  name: 'shotLetters',
  addProseMirrorPlugins() {
    return [new Plugin({
      key: shotKey,
      props: {
        decorations(state) {
          const nodes: (ScriptNode & { pos: number; size: number })[] = []
          state.doc.forEach((node, pos) => nodes.push({ type: node.type.name, attrs: node.attrs, text: node.textContent, pos, size: node.nodeSize }))
          const at = new Map(nodes.filter((n) => n.attrs?.id).map((n) => [n.attrs!.id as string, n]))
          const decos: Decoration[] = []
          for (const shot of shotsOf(nodes)) {
            const n = at.get(shot.id)!
            decos.push(Decoration.node(n.pos, n.pos + n.size, { 'data-shot': shot.letter }))
          }
          const $from = state.selection.$from
          if ($from.depth >= 1 && $from.node(1).type.name === 'paragraph') decos.push(Decoration.node($from.before(1), $from.after(1), { class: 'is-current' }))
          return DecorationSet.create(state.doc, decos)
        },
      },
    })]
  },
})
