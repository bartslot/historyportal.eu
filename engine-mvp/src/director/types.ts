// lesson.json as the director reads and writes it (contract 2 in the vault's
// topics/autonomous-lessons/plan.md). The writer (S4) fills story, set and figures; the director fills
// `camera`, `camera_more`, `motion`, `balloons[].at_s/dur_s`, `narration_at_s` and `sound`.
// The director remembers a fingerprint of every field it wrote (`scene.director`); a re-run replaces a
// field only while it still matches, so anything a teacher changed (by any editor) stays.

export type Beat = 'hook' | 'setup' | 'cause' | 'effect' | 'turn' | 'climax' | 'recap'
export type Depth = 'sky' | 'bg' | 'mid' | 'fg'

/** A camera pose in stage metres (see camera.ts for the frame). `target` is the look-at point,
 *  `focus_z` the depth in focus; both optional for a stage that only reads x/y/z/fov. */
export type CamPose = { x: number; y: number; z: number; fov: number; target?: { x: number; y: number; z: number }; focus_z?: number }
export type MoveKind = 'push' | 'pull' | 'truck' | 'pan' | 'tilt' | 'rack' | 'through'
export type Camera = {
  move: MoveKind; from: CamPose; to: CamPose
  /** The stage's ease (in | out | inOut); `curve` the finer easing.js name by intent. */
  ease: string; curve?: string; dur_s: number
  at_s?: number; native?: boolean; why?: string
}

export type Key = { time: number; value: number; easing?: string }
export type Track = { target: string; property: string; keyframes: Key[] }

export type Ambience = { id: string; gain: number }
export type SoundPlan = {
  ambience: Ambience[]
  /** J-cut: this scene's ambience starts this many seconds BEFORE the cut, under the last shot. */
  lead_in_s: number
  /** L-cut: the previous scene's ambience keeps running this long after the cut. */
  tail_s: number
  /** A near-silence: ambience drops, the narrator waits. Times from the scene start. */
  silence: { at_s: number; dur_s: number } | null
  sfx: { id: string; at_s: number; gain?: number }[]
  /** Ambience gain under the narrator, in dB (negative). */
  duck_db: number
}

export type LayerRef = { need?: string; asset?: string | null; depth: Depth; x?: number; scale?: number; motion?: unknown; keys?: unknown[] }
export type Figure = { char: string; pose?: string; x?: number; depth?: Depth; facing?: 'left' | 'right'; expression?: string }
export type Balloon = { char: string; text: string; at_s?: number; dur_s?: number }
export type Interaction = { type: 'quiz' | 'power-meter' | 'choice'; [k: string]: unknown } | null

export type Scene = {
  id: string; beat: Beat; narration: string; est_s?: number
  /** Real TTS timings when the narration is recorded: total length and optional word starts. */
  timings?: { duration_s: number; words?: { word: string; start: number; end: number }[] }
  set: { sky?: string; layers: LayerRef[] }
  figures?: Figure[]; balloons?: Balloon[]
  camera: Camera | null; camera_more?: Camera[]
  motion?: Track[]
  sound: SoundPlan | null
  narration_at_s?: number
  dur_s?: number
  interaction?: Interaction
  fact_refs?: string[]
  [k: string]: unknown
}

export type Lesson = { id: string; lang: string; bundle: string; scenes: Scene[]; [k: string]: unknown }

export type LibraryAsset = {
  id: string; layer: string; tags: string[]; motion?: 'none' | 'sway' | 'drift' | 'ripple' | 'flicker'; height_m?: number
  file?: string; w?: number; h?: number; anchor?: [number, number]; tileable_x?: boolean
}
export type Library = { bundle: string; assets: LibraryAsset[] }
