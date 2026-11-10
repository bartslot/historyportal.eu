// The two binding contracts (vault topics/autonomous-lessons/plan.md): library.json (S2) and lesson.json (S4/S5).
// Only the fields the stage reads are typed; everything else rides along untouched.

export type LayerKind = 'sky' | 'bg' | 'mid' | 'fg' | 'prop' | 'figure' | 'ground' | 'near_ground' | 'ground_band' | 'decal' | 'cloud'
export type Depth = 'sky' | 'bg' | 'mid' | 'fg' | 'near'
export type MotionKind = 'none' | 'sway' | 'drift' | 'ripple' | 'flicker' | 'breathe'

export interface Asset {
  id: string
  layer: LayerKind
  tags: string[]
  file: string
  /** the teacher's edited copy this asset is drawn from on stage (stage.ts editedAsset): never in the library itself */
  src?: string
  w: number
  h: number
  anchor: [number, number]
  height_m: number
  tileable_x?: boolean
  motion?: MotionKind
  placeholder?: boolean
  qa?: { score?: number }
  /** an animation (sprite.ts): `file` is a sheet of cols x rows frames, w x h is ONE frame */
  /** a figure of separate parts (bones.ts): a layer of this asset draws it */
  puppet?: Puppet
  kind?: 'animation' | 'sheet'
  /** a sprite sheet (scatter.ts): ONE picture cut into cells, each with its own tags and height (rect: uv [u0, v0, du, dv]) */
  cells?: { tags: string[]; height_m: number; rect: [number, number, number, number] }[]
  frames?: number
  cols?: number
  rows?: number
  fps?: number
  /** default true; false stays on the last frame */
  loop?: boolean
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
/** y: metres the picture stands above (or below) its ground point; rotation: degrees, clockwise on screen. */
export interface LayerKey { t: number; x?: number; y?: number; z?: number; scale?: number; opacity?: number; rotation?: number; [bone: `bone:${string}`]: number | undefined }

/** The values a backdrop (a ground band, the sky picture) takes from a layer. */
export type GroundBandProps = Partial<Pick<SceneLayer, 'x' | 'y' | 'z' | 'scale' | 'opacity' | 'motion' | 'keys' | 'src'>>
export interface GroundBand extends GroundBandProps { asset: string; z: number; src?: string }

/** A bone of a picture: where it starts and ends in picture px, and the bone it hangs from. */
export interface Joint { name: string; parent: string | null; from: [number, number]; to: [number, number] }

/** A figure drawn from separate parts on one atlas (painted, cut): its bones and parts, back to front, in the px of its picture frame. */
export interface Puppet {
  atlas: string
  width: number
  height: number
  /** which way the figure looks on screen, read from its feet: 1 right, -1 left. Arms are only limited with this set. */
  facing?: 1 | -1
  bones: { name: string; parent: string | null; from: [number, number] }[]
  /** quad: top-left, top-right, bottom-right, bottom-left; uv: u0, v0, u1, v1 on the atlas */
  parts: { bone: string; quad: [number, number][]; uv: [number, number, number, number] }[]
}

/** A painted map of a picture's body parts. `parts`: back to front, a colour [r, g, b] and its part (bones.ts bodyParts). */
export interface PartMap { src: string; parts: { colour: [number, number, number]; part: string }[] }

export interface SceneLayer {
  need?: string | string[]
  /** the teacher's edited copy of the picture (a URL), drawn instead of the library file */
  src?: string
  asset?: string | null
  depth: Depth
  x?: number
  /** distance from the house camera in metres, anywhere along the ground; unset = the depth band's distance (DEPTH_Z).
   *  The band stays as a name for line weight and haze. */
  z?: number
  /** metres above the ground point (default 0) */
  y?: number
  scale?: number
  /** degrees, clockwise on screen, about the picture's ground point (default 0) */
  rotation?: number
  /** the layer's own opacity before keys (default 1) */
  opacity?: number
  /** a black line inside the picture's edge, in 1080p px (default 0: none) */
  outline?: number
  /** hatching on the picture's shade side and in its ground shadow, 0..1 (default 0: none) */
  etch?: number
  /** the picture's skeleton (bones.ts): with one, it is drawn as a mesh that bends */
  rig?: Joint[]
  /** which body part each pixel is (bones.ts): a flat colour map of the picture, each colour one part, back to front */
  rigMap?: PartMap
  /** a figure of separate parts, drawn instead of the picture (bones.ts) */
  puppet?: Puppet
  /** how far a bone is turned from the painted pose, degrees clockwise on screen (layout.ts bonesAt) */
  [bone: `bone:${string}`]: number | undefined
  motion?: MotionKind | MotionSpec
  keys?: LayerKey[]
  /** share of the plane's height (from the bottom) that fades into the ground: bg strips 0.22 by default */
  feather?: number
  /** contact stain opacity on the ground under mid/fg assets (0 = none) */
  shadow?: number
  /** a ground decal: the picture lies flat on the floor at its depth (a worn path, a darker grass patch, stones),
   *  its height_m along the floor, drawn right after the floor and under everything that stands */
  flat?: boolean
  /** an animation's playback (sprite.ts frameAt): speed scales its fps (0 holds), offset = seconds into it at the start */
  play?: { speed?: number; offset?: number; frames?: number[]; loop?: boolean }
}

export interface CamPose { x: number; y: number; z: number; fov: number }
export type Ease = 'linear' | 'in' | 'out' | 'inOut'
export type CameraMotionKind = 'none' | 'sway' | 'handheld' | 'shake'
export interface CameraMotion { kind: CameraMotionKind; amount?: number; speed?: number }

/** at_s: when this shot starts within the scene (0 for `camera`; the director sets it on `camera_more`). */
export interface CameraMove { move?: string; from: CamPose; to: CamPose; ease?: Ease; dur_s?: number; at_s?: number }

export interface Scene {
  id: string
  beat?: string
  narration?: string
  est_s?: number
  /** ground: a 'ground' asset id or tags, or '#hex' (a paper wash); horizon: metres the far landscape (bg) sits higher,
   *  'auto' or unset = its land line at land_target of the frame (layout.ts autoHorizon, default LAND_TARGET 0.42);
   *  near: an asset id, a wide strip painted from eye height, laid on the floor out to look.nearFar (stage.ts) */
  /** layered ground: painted bands standing on the floor at metres z (2..2000), each drawn over the one behind */
  /** groundBands[i] and skyLayer take a layer's own values too (x, z, scale, opacity, motion, keys; the sky's y lifts it):
   *  the teacher sizes and moves the backdrop like any picture. A band always stands on the floor (stage.ts pose). */
  set: { sky?: string | null; skyLayer?: GroundBandProps; ground?: string; horizon?: number | 'auto'; land_target?: number; near?: string; groundBands?: GroundBand[]; groundSlots?: { asset: string; from_m: number }[]; layers: SceneLayer[] }
  figures?: unknown[]
  camera?: CameraMove | null
  /** further shots of the same scene (director, S5), each with its at_s */
  camera_more?: CameraMove[]
  /** The camera's own life on top of its shots: a boat's sway, a hand holding it, a shake. */
  camera_motion?: CameraMotion
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
