// The Script: the whole lesson as one document, a section per scene, a paragraph per spoken line.
// It is linked both ways: the cursor in a scene's section opens that scene; the line under the
// playhead is lit; a line's bar on the timeline jumps here. Writing never makes a sound: Read aloud
// (the browser's own voice) and timeline Play do, and reading aloud measures each line's length.
import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import * as L from '../lesson/store'
import * as TL from '../timeline/model'
import { scenesInOrder } from '../lesson/tree'
import { ActiveLine, activeLineKey, Line, LineIds, SceneHeading, Subtitle } from '../script/extensions'
import { inStep, reconcile } from '../script/narration'
import { fitDurationToNarration, nowSpeaking, placedLines, setVoice } from '../script/player'
import { loadVoices, pickVoice, rememberVoice, speak, speechAvailable, stopSpeaking } from '../script/speech'

const SAVE_DEBOUNCE_MS = 400
const FOLLOW_SCENE_MS = 400

const sceneList = () => scenesInOrder(L.getLesson().lesson.tree).map((s) => ({ id: s.id, title: s.title }))

/** The scene whose section the position is in. */
function sceneAt(editor: Editor, pos: number): string | null {
  let id: string | null = null
  editor.state.doc.forEach((node, offset) => { if (offset <= pos && node.type.name === 'sceneHeading') id = node.attrs.sceneId })
  return id
}

function findLine(editor: Editor, id: string): number | null {
  let at: number | null = null
  editor.state.doc.descendants((node, pos) => { if (at === null && node.type.name === 'paragraph' && node.attrs.id === id) at = pos })
  return at
}

function ToolButton({ label, onClick, pressed, disabled, children }: { label: string; onClick: () => void; pressed?: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} data-tooltip={label} aria-pressed={pressed} disabled={disabled} onClick={onClick}
            onMouseDown={(e) => e.preventDefault() /* keep the editor's selection */}
            className={`grid h-7 min-w-7 shrink-0 cursor-pointer place-items-center rounded px-1.5 text-xs hover:bg-white/5 disabled:opacity-30 ${pressed ? 'bg-white/10 text-panel-value' : 'text-panel-label'}`}>
      {children}
    </button>
  )
}

/** The Script step: the document takes the stage's place (it stays mounted in the other steps, hidden). */
export function ScriptView() {
  const { lesson } = L.useLesson()
  const emitted = useRef<unknown>(null)
  const saveTimer = useRef<number | undefined>(undefined)
  const followTimer = useRef<number | undefined>(undefined)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceUri, setVoiceUri] = useState<string>('')
  const [reading, setReading] = useState(false)
  const stopRef = useRef(false)
  const [, rerender] = useState(0)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ paragraph: false, heading: false, codeBlock: false, code: false, blockquote: false, horizontalRule: false, link: false }),
      Line, LineIds, SceneHeading, Subtitle, ActiveLine,
      Placeholder.configure({ placeholder: 'What is said in this scene' }),
    ],
    content: reconcile(L.getLesson().lesson.script ?? { type: 'doc', content: [] }, sceneList()),
    editorProps: {
      attributes: { class: 'script-doc', 'aria-label': 'Script', spellcheck: 'true' },
      handleClickOn: (_view, _pos, node) => {
        if (node.type.name !== 'sceneHeading') return false
        void L.switchTo(node.attrs.sceneId)
        return true
      },
    },
    onUpdate: ({ editor: ed }) => {
      window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        const json = ed.getJSON()
        emitted.current = json
        L.setScript(json)
        fitDurationToNarration()
      }, SAVE_DEBOUNCE_MS)
    },
    onSelectionUpdate: ({ editor: ed }) => {
      rerender((n) => n + 1)
      // the cursor in another scene's section opens that scene (after a pause, not on every arrow key)
      window.clearTimeout(followTimer.current)
      followTimer.current = window.setTimeout(() => {
        const id = sceneAt(ed, ed.state.selection.from)
        const { current, busy } = L.getLesson()
        if (id && id !== current && !busy) void L.switchTo(id)
      }, FOLLOW_SCENE_MS)
    },
  })

  // the scene tree changed (added, removed, renamed, moved) or another lesson was opened
  useEffect(() => {
    if (!editor) return
    const scenes = sceneList()
    const external = lesson.script !== emitted.current && lesson.script !== null
    const base = external ? lesson.script : editor.getJSON()
    if (external || !inStep(base, scenes)) {
      const next = reconcile(base, scenes)
      editor.commands.setContent(next, { emitUpdate: false })
      emitted.current = next
      L.setScript(next)
    }
  }, [editor, lesson.tree, lesson.script])

  // voices
  useEffect(() => {
    void loadVoices().then((list) => {
      setVoices(list)
      const v = pickVoice(list)
      setVoice(v)
      setVoiceUri(v?.voiceURI ?? '')
    })
  }, [])

  // the line under the playhead is lit (and kept in view while playing)
  useEffect(() => {
    if (!editor) return
    let lit: string | null = null
    return TL.subscribe(() => {
      const id = nowSpeaking().line?.id ?? null
      if (id === lit) return
      lit = id
      editor.view.dispatch(editor.state.tr.setMeta(activeLineKey, id))
      if (id && TL.getState().playing) {
        const pos = findLine(editor, id)
        if (pos !== null) (editor.view.nodeDOM(pos) as HTMLElement | null)?.scrollIntoView({ block: 'nearest' })
      }
    })
  }, [editor])

  // a line's bar on the timeline jumps here
  useEffect(() => {
    if (!editor) return
    const onFocus = (e: Event) => {
      const pos = findLine(editor, (e as CustomEvent<string>).detail)
      if (pos === null) return
      editor.chain().setTextSelection(pos + 1).scrollIntoView().run()
    }
    window.addEventListener('script:focus-line', onFocus)
    return () => window.removeEventListener('script:focus-line', onFocus)
  }, [editor])

  /** Read the current scene aloud from the cursor's line, moving the playhead along and measuring each line. */
  async function readAloud() {
    if (!editor) return
    if (reading) { stopRef.current = true; stopSpeaking(); return }
    stopRef.current = false
    setReading(true)
    TL.pause()
    const cursorLine = editor.state.selection.$from.parent.attrs.id as string | undefined
    const ids = placedLines().map((l) => l.id)
    let from = Math.max(0, cursorLine ? ids.indexOf(cursorLine) : 0)
    try {
      for (; from < ids.length && !stopRef.current; from++) {
        const line = placedLines().find((l) => l.id === ids[from])
        if (!line) continue
        TL.seek(line.start)
        const dur = await speak(line.text, voices.find((v) => v.voiceURI === voiceUri) ?? null)
        if (dur === null || stopRef.current) break
        const pos = findLine(editor, line.id)
        if (pos !== null) editor.view.dispatch(editor.state.tr.setNodeAttribute(pos, 'dur', Math.round(dur * 100) / 100))
      }
    } finally { setReading(false) }
  }

  const line = editor?.state.selection.$from.parent
  const speaker = line?.type.name === 'paragraph' ? (line.attrs.speaker ?? '') : ''
  const speakers = [...new Set<string>((function collect(n: any): string[] { return [n.attrs?.speaker, ...(n.content ?? []).flatMap(collect)].filter(Boolean) })(lesson.script ?? {}))]

  return (
    <section aria-label="Script" hidden={L.stepOf(lesson) !== 'script'} className="absolute inset-0 z-10 flex flex-col bg-base-200">
      <div className="mx-auto flex w-full max-w-3xl shrink-0 flex-wrap items-center gap-1 border-b border-panel-hairline px-4 py-1.5">
        <ToolButton label="Bold" pressed={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()}><b>B</b></ToolButton>
        <ToolButton label="Italic" pressed={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()}><i>I</i></ToolButton>
        <ToolButton label="Subtitle: show this text on screen" pressed={editor?.isActive('subtitle')} onClick={() => editor?.chain().focus().toggleMark('subtitle').run()}>Subtitle</ToolButton>
        <input list="script-speakers" aria-label="Speaker" placeholder="Narrator" value={speaker}
               onChange={(e) => editor?.chain().updateAttributes('paragraph', { speaker: e.target.value.trim() || null }).run()}
               className="h-7 w-24 rounded bg-panel-hairline px-1.5 text-xs text-panel-value focus:outline-none" />
        <datalist id="script-speakers">{speakers.map((s) => <option key={s} value={s} />)}</datalist>
        <span className="ml-auto" />
        <select aria-label="Reading voice" value={voiceUri} disabled={!voices.length}
                onChange={(e) => { const v = voices.find((x) => x.voiceURI === e.target.value) ?? null; setVoiceUri(e.target.value); setVoice(v); if (v) rememberVoice(v) }}
                className="h-7 max-w-36 rounded bg-panel-hairline px-1 text-xs text-panel-value">
          {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
        </select>
        <ToolButton label={reading ? 'Stop reading' : 'Read aloud from the cursor'} pressed={reading} disabled={!speechAvailable()} onClick={() => void readAloud()}>
          {reading ? 'Stop' : 'Read aloud'}
        </ToolButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 py-4"><EditorContent editor={editor} /></div>
      </div>
    </section>
  )
}

/** The caption on the stage: the Subtitle-marked text of the line under the playhead, cue by cue. */
export function StageCaption() {
  const [text, setText] = useState('')
  useEffect(() => TL.subscribe(() => setText(nowSpeaking().caption)), [])
  if (!text) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center px-6" aria-live="polite">
      <p className="max-w-[48rem] rounded-lg px-4 py-2 text-center text-lg leading-snug text-white" style={{ background: 'color-mix(in oklch, var(--color-base-100) 72%, transparent)' }}>{text}</p>
    </div>
  )
}
