// The two binding contracts (vault topics/autonomous-lessons/plan.md): library.json (S2) and lesson.json (S4/S5).
// Only the fields the stage reads are typed; everything else rides along untouched.

export type LayerKind = 'sky' | 'bg' | 'mid' | 'fg' | 'prop' | 'ground'
export type Depth = 'sky' | 'bg' | 'mid' | 'fg'
export type MotionKind = 'none' | 'sway' | 'drift' | 'ripple' | 'flicker'

export interface Asset {
  id: string
  layer: LayerKind
  tags: string[]
  file: string
  w: number
  h: number
  anchor: [number, number]
  height_m: number
  tileable_x?: boolean
  motion?: MotionKind
  placeholder?: boolean
  qa?: { score?: number }
}

export interface Library {
  version: number
  bundle: string
  style?: string
  /** the bundle's paper colour ('#rrggbb'); the ground falls back to it */
  paper?: string
  assets: Asset[]
}

/** Teacher-editable motion on one layer; a bare kind is the same as { kind }. */
export interface MotionSpec { kind?: MotionKind; amount?: number; speed?: number }

/** A layer keyframe: t seconds into the scene; missing fields hold the layer's own value. */
export interface LayerKey { t: number; x?: number; scale?: number; opacity?: number }

export interface SceneLayer {
  need?: string | string[]
  asset?: string | null
  depth: Depth
  x?: number
  scale?: number
  motion?: MotionKind | MotionSpec
  keys?: LayerKey[]
  /** share of the plane's height (from the bottom) that fades into the ground: bg strips 0.22 by default */
  feather?: number
  /** contact stain opacity on the ground under mid/fg assets (0 = none) */
  shadow?: number
}

export interface CamPose { x: number; y: number; z: number; fov: number }
export type Ease = 'linear' | 'in' | 'out' | 'inOut'
/** at_s: when this shot starts within the scene (0 for `camera`; the director sets it on `camera_more`). */
export interface CameraMove { move?: string; from: CamPose; to: CamPose; ease?: Ease; dur_s?: number; at_s?: number }

export interface Scene {
  id: string
  beat?: string
  narration?: string
  est_s?: number
  /** ground: a 'ground' asset id or tags, or '#hex' (a paper wash); horizon: metres the far landscape (bg) sits higher,
   *  'auto' or unset = its land line at land_target of the frame (layout.ts autoHorizon, default LAND_TARGET 0.42) */
  set: { sky?: string | null; ground?: string; horizon?: number | 'auto'; land_target?: number; layers: SceneLayer[] }
  figures?: unknown[]
  camera?: CameraMove | null
  /** further shots of the same scene (director, S5), each with its at_s */
  camera_more?: CameraMove[]
  /** a class moment at the END of the scene (quiz, power-meter, choice): the stage holds until it is resolved */
  interaction?: { type: string; [k: string]: unknown } | null
  /** a scene in another era's library (overrides lesson.bundle) */
  bundle?: string
  /** the scene's length when the director set it (shots + held narration) */
  dur_s?: number
  [k: string]: unknown
}

export interface Lesson {
  id: string
  lang?: string
  bundle?: string
  /** stage look numbers (look-chain.js names); the teacher can change them */
  look?: Record<string, number | string>
  /** the held frame during an interaction: camera drift in metres and its period (teacher-editable) */
  hold?: { breath_m?: number; breath_s?: number }
  scenes: Scene[]
  [k: string]: unknown
}
