// The storyboard as data (Figma 2087:1059, memory script-step-storyboard): one frame per SHOT, not per line.
// A shot starts at a line and runs on through the lines after it that are marked `cut: false` ("same shot").
// Its id is the id of the line it starts at, so a shot keeps its directing when lines around it change.
// Letters (A, B, C...) restart in every scene and are the link between a line and its frame.
//
// A shot's data is the START of the 3D pipeline, not a picture: who stands where (blockout specs), the camera
// (preset, subjects, lens, angle) and the assets it needs that the library does not have yet. The clay frame is
// one renderer of that data; real 3D assets are the next one (same specs, `kit.real` swapped in).
// Pure: no editor, no engine, no store.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { KIT } from '../blockout/kit'
import type { Spec } from '../blockout/solve'
import type { Shot as Camera } from '../blockout/camera'

/** A top-level node of the script, reduced to what the storyboard needs (from TipTap JSON or a live PM doc). */
export type ScriptNode = { type: string; attrs?: Record<string, any>; text: string }
export type ShotRef = { id: string; sceneId: string; letter: string; lineIds: string[]; speaker: string | null }
/** An asset a shot needs that the library does not have: picked up later by on-demand 3D asset creation. */
export type NeededAsset = { name: string; type: 'character' | 'prop' | 'set'; period: string | null }
export type ShotData = { camera: Camera; objects: Spec[]; needs: NeededAsset[]; directed?: boolean }

const NARRATOR = /^(narrator|verteller|erzähler|narrateur|narratore)$/i

/** null for the narrator: no speaker, or a speaker literally called Narrator. */
export const speakerOf = (attrs?: Record<string, any>): string | null => {
  const s = typeof attrs?.speaker === 'string' ? attrs.speaker.trim() : ''
  return s && !NARRATOR.test(s) ? s : null
}

/** A, B ... Z, AA, AB ... */
export function letter(i: number): string {
  let s = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

const textOf = (node: any): string => (node.text ?? '') + (node.content ?? []).map(textOf).join('')
export const nodesOfJson = (doc: any): ScriptNode[] => (doc?.content ?? []).map((n: any) => ({ type: n.type, attrs: n.attrs, text: textOf(n) }))

/** Every shot of the lesson, in script order. Empty lines are not lines; the first line of a scene always cuts. */
export function shotsOf(nodes: ScriptNode[]): ShotRef[] {
  const out: ShotRef[] = []
  let sceneId = ''
  let n = 0
  for (const node of nodes) {
    if (node.type === 'sceneHeading') { sceneId = node.attrs?.sceneId ?? ''; n = 0; continue }
    if (node.type !== 'paragraph' || !node.text.trim() || !node.attrs?.id) continue
    const last = out[out.length - 1]
    if (n > 0 && node.attrs.cut === false && last?.sceneId === sceneId) { last.lineIds.push(node.attrs.id); continue }
    out.push({ id: node.attrs.id, sceneId, letter: letter(n++), lineIds: [node.attrs.id], speaker: speakerOf(node.attrs) })
  }
  return out
}

export const shotOfLine = (shots: ShotRef[], lineId: string) => shots.find((s) => s.lineIds.includes(lineId)) ?? null

/** Who is in a scene: its speakers, plus any speaker of the lesson named in its lines (a narrator line about Dante). */
export function castOf(nodes: ScriptNode[], sceneId: string): string[] {
  const all = new Set<string>()
  const mine: string[] = []
  let text = ''
  let here = false
  for (const node of nodes) {
    if (node.type === 'sceneHeading') { here = node.attrs?.sceneId === sceneId; continue }
    const s = speakerOf(node.attrs)
    if (s) all.add(s)
    if (!here) continue
    text += ' ' + node.text
    if (s && !mine.includes(s)) mine.push(s)
  }
  for (const s of all) if (!mine.includes(s) && new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)) mine.push(s)
  return mine
}

/** A stable blockout id for a character name. */
export const idOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'someone'

const PAIR_X = 0.9         // two people talking: this far either side of the centre (metres)
const ROW_GAP = 1.0        // three or more: a shallow curve, this far apart, all turned towards a point in front
const CURVE = 0.15         // how far the ends of the row come forward (metres per gap squared)
const FOCUS_Z = -1.5       // the point they turn to: in front of them, on the camera's side
const WALL_Z = 2.6         // the back wall of the default set

/** The default staging of a scene: its cast standing together, a wall behind them. Same in every shot of the scene
 *  (continuity); only the camera differs per shot until the teacher directs one. */
export function stagingOf(cast: string[]): Spec[] {
  const people = cast.length ? cast : ['someone']
  const ids = people.map(idOf)
  const at = (i: number): [number, number] => {
    if (ids.length === 1) return [0, 0]
    if (ids.length === 2) return [i ? PAIR_X : -PAIR_X, 0]
    const d = i - (ids.length - 1) / 2
    return [d * ROW_GAP, -CURVE * d * d]
  }
  const figures: Spec[] = ids.map((id, i) => ({
    id, kit: 'figure', pose: 'stand', at: at(i),
    face: ids.length === 1 ? 180 : ids.length === 2 ? ids[1 - i] : 'centre',
  }))
  return [
    { id: 'wall', kit: 'wall', at: [0, WALL_Z] },
    ...(ids.length > 2 ? [{ id: 'centre', kit: 'marker', at: [0, FOCUS_Z] as [number, number] }] : []),
    ...figures,
  ]
}

/** The narrator's line gets a WIDE shot of the whole cast (memory: wide shots for the narrator); a spoken line is
 *  framed on its speaker, over the listener's shoulder when someone listens. */
export function cameraOf(ref: Pick<ShotRef, 'speaker'>, cast: string[]): Camera {
  const ids = (cast.length ? cast : ['someone']).map(idOf)
  if (!ref.speaker || !ids.includes(idOf(ref.speaker))) return { shot: 'wide', subjects: ids }
  const who = idOf(ref.speaker)
  const listener = ids.find((id) => id !== who)
  return listener ? { shot: 'over-shoulder', subjects: [listener, who] } : { shot: 'medium', subjects: [who] }
}

/** What the shot needs that the library cannot give yet: every character (the clay figure is a stand-in) and every
 *  set piece without a real asset behind its kit piece. Period: the lesson's, when it has one. */
export function needsOf(objects: Spec[], names: Record<string, string>, period: string | null): NeededAsset[] {
  const out: NeededAsset[] = []
  for (const o of objects) {
    if (o.kit === 'marker') continue
    if (o.kit === 'figure') { out.push({ name: names[o.id] ?? o.id, type: 'character', period }); continue }
    const k = KIT.find((p) => p.id === o.kit)
    if (k && !k.real) out.push({ name: k.name, type: o.kit === 'wall' ? 'set' : 'prop', period })
  }
  return out
}

/** The shot's data: what the teacher directed, or the default for its line and scene. */
export function shotData(ref: ShotRef, nodes: ScriptNode[], stored: Record<string, ShotData> | undefined, period: string | null = null): ShotData {
  const saved = stored?.[ref.id]
  if (saved) return saved
  const cast = castOf(nodes, ref.sceneId)
  const objects = stagingOf(cast)
  return { camera: cameraOf(ref, cast), objects, needs: needsOf(objects, Object.fromEntries(cast.map((c) => [idOf(c), c])), period) }
}
