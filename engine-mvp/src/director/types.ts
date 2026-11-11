// lesson.json as the director reads and writes it (contract 2 in the vault's
// topics/autonomous-lessons/plan.md). The writer (S4) fills story, set and figures; the director fills
// `camera`, `camera_more`, `motion`, `balloons[].at_s/dur_s`, `narration_at_s` and `sound`.
// The director remembers a fingerprint of every field it wrote (`scene.director`); a re-run replaces a
// field only while it still matches, so anything a teacher changed (by any editor) stays.

export type Beat = 'hook' | 'setup' | 'cause' | 'effect' | 'turn' | 'climax' | 'recap'
/** `near`: S1's plane at 3.5 m, in front of fg (tufts, reeds, stones at the bottom of the frame). */
export type Depth = 'sky' | 'bg' | 'mid' | 'fg' | 'near'

/** A camera pose in stage metres (see camera.ts for the frame). `target` is the look-at point,
 *  `focus_z` the depth in focus; both optional for a stage that only reads x/y/z/fov. */
export type CamPose = { x: number; y: number; z: number; fov: number; roll?: number; target?: { x: number; y: number; z: number }; focus_z?: number }
export type MoveKind = 'push' | 'pull' | 'truck' | 'pan' | 'tilt' | 'rack' | 'through'
export type Camera = {
  move: MoveKind; from: CamPose; to: CamPose
  /** The stage's ease (in | out | inOut); `curve` the finer easing.js name by intent. */
  ease: string; curve?: string; dur_s: number
  /** wide | medium | close: how much the shot shows */
  scale?: 'wide' | 'medium' | 'close'
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

/** `dressed`: proposed by the set dresser (director/dress.ts), the teacher may remove it. */
export type LayerRef = { need?: string; asset?: string | null; depth: Depth; x?: number; scale?: number; motion?: unknown; keys?: unknown[]; dressed?: boolean; shadow?: number
  /** the char this layer draws (director/figures.ts): a figure from `figures[]`, rebuilt on every run */
  figure?: string }
export type Figure = { char: string; pose?: string; x?: number; depth?: Depth; facing?: 'left' | 'right'; expression?: string; scale?: number
  /** set by the director (figures.ts): the figure's drawn height in metres, scale included */
  h_m?: number }
export type Balloon = { char: string; text: string; at_s?: number; dur_s?: number }
export type Interaction = { type: 'quiz' | 'power-meter' | 'choice'; [k: string]: unknown } | null
/** A branching story (writer contract, validate.py check_branches): a question scene, 1-3 option_a shots, 1-3
 *  option_b shots, then a normal scene where both rejoin. The director passes it through untouched; the
 *  importer makes it the player's branch_group / branch_role / branch_choice_label / config.branch_effects. */
export type BranchEffects = { deltas: Record<string, number>; consequence_line?: string; historical_note?: string }
export type Branch =
  | { group: number; role: 'question'; labels: { a: string; b: string } }
  | { group: number; role: 'option_a' | 'option_b'; effects?: BranchEffects }
export type Game = { meters: { key: string; label: string; icon?: string; start: number }[]; fail_threshold?: number }

export type Scene = {
  id: string; beat: Beat; narration: string; est_s?: number
  /** Real TTS timings when the narration is recorded: total length and optional word starts. */
  timings?: { duration_s: number; words?: { word: string; start: number; end: number }[] }
  /** habitat: interior | deck | quay | wet | dry, for the set dresser (else read from the layers) */
  set: { sky?: string; ground?: string; habitat?: string; groundBands?: { asset: string; z: number }[]; layers: LayerRef[] }
  figures?: Figure[]; balloons?: Balloon[]
  camera: Camera | null; camera_more?: Camera[]
  motion?: Track[]
  sound: SoundPlan | null
  narration_at_s?: number
  dur_s?: number
  interaction?: Interaction
  branch?: Branch
  /** a scene in another era's library and sound (overrides lesson.bundle) */
  bundle?: string
  /** true: the set dresser proposes props for this scene (off by default, PM check 15) */
  dress?: boolean
  /** false: the director adds no ground bands to this scene (director/bands.ts) */
  bands?: boolean
  fact_refs?: string[]
  [k: string]: unknown
}

export type Lesson = { id: string; lang: string; bundle: string; scenes: Scene[]; needed_assets?: { tags: string; layer: string; why: string }[]; game?: Game; [k: string]: unknown }

export type LibraryAsset = {
  id: string; layer: string; tags: string[]; motion?: 'none' | 'sway' | 'drift' | 'ripple' | 'flicker'; height_m?: number
  file?: string; w?: number; h?: number; anchor?: [number, number]; tileable_x?: boolean; qa?: { score?: number }
  /** S2's call: true = always dressing, false = never; habitat = where it lives (dry, wet, quay, ...) */
  dressing?: boolean; habitat?: string[]
}
export type Library = { bundle: string; assets: LibraryAsset[] }
