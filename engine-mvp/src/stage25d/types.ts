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
  /** a terrain painted from eye height down to the horizon, laid through the house camera (ground-gl slotTile) */
  perspective?: boolean
  /** A far strip's ground line (share of its height, from the top) where the automatic one (ground.ts groundLine)
   *  misses: the foot of its trees, town or hills, where the far ground lies. */
  ground_line?: number
  /** A terrain's own far edge: the id of a low hazy strip the stage stands far out over the terrain's horizon */
  horizon?: string
  motion?: MotionKind
  /** the far, low-detail copy beside `file` (tools/lod_svg.py: a simplified watercolour SVG with an ink outline, its
   *  bottom faded out; same layout, so a sheet's cells still fit): drawn instead of `file` far from the camera (lod.ts) */
  lod?: string
  /** a close-up's blink (blink.ts): a pixel-aligned closed-eye picture beside `file`, and its eyes */
  blink?: { file: string; eyes: BlinkEye[] }
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

/** One eye of a blink, in fractions of the picture (x from the left, y from the TOP): its box, and the y of the closed
 *  lash line at the box's left edge, middle and right edge (a parabola through the three). */
export interface BlinkEye { x0: number; x1: number; y0: number; y1: number; lash: [number, number, number] }

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

/** Water on a picture (water.ts): a looping ripple, glints and twinkles inside the teacher's painted mask (a grey webp,
 *  white = water). `on: false` keeps the values and the mask, so turning it back on restores them. */
export interface WaterSpec { on?: boolean; look?: WaterLook; amount?: number; speed?: number; glints?: number; loop?: number; mask?: string }
/** where a layer's water starts (water.ts WATER_LOOKS): a gentle one, the anime one, a lively one */
export type WaterLook = 'quiet' | 'anime' | 'lively'

/** A layer keyframe: t seconds into the scene; missing fields hold the layer's own value. */
/** y: metres the picture stands above (or below) its ground point; rotation: degrees, clockwise on screen. */
/** ease 'smooth': the run from this key to the next passes through the keys round it (an animation preset's poses,
 *  resources/animations) instead of stopping at each one; absent: eased in and out. face: an expression id, held until the next. */
export interface LayerKey { t: number; x?: number; y?: number; z?: number; scale?: number; opacity?: number; rotation?: number; ease?: 'smooth'; face?: string
  /** which feet stand at this key (an animation preset's): n, f, both or none. The stage keeps a standing foot on its spot between two keys (foot-lock.ts). */
  contact?: 'n' | 'f' | 'both' | 'none'
  [bone: `bone:${string}`]: number | undefined }

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
  /** `to`: where the bone points (the next joint, or the far end of its part); `limit`: how far it turns from the drawing,
   *  [min, max] degrees clockwise on screen for a figure facing right (bones.ts limitBone; rig_parts.py writes them). */
  bones: { name: string; parent: string | null; from: [number, number]; to?: [number, number]; limit?: [number, number];
    /** px either side of the joint across which the parts on both sides bend (smart-bones.ts); absent: rigid parts */
    band?: number
    /** px round the joint that its band reaches across the parts (its cross-section); past it the parts stay rigid */
    reach?: number }[]
  /** quad: top-left, top-right, bottom-right, bottom-left; uv: u0, v0, u1, v1 on the atlas */
  parts: { bone: string; quad: [number, number][]; uv: [number, number, number, number] }[]
  /** 'flat': the atlas is flat colour + ink, with kit_render's shade mask beside it (<atlas>-shade.webp, layer.ts
   *  shadeMask); the stage shader colours the shade and washes it (layer.ts AQUAREL, look.ts aquarelOf).
   *  Absent: the shading and the watercolour are painted into the atlas, drawn as they are. */
  paint?: 'flat'
  /** expressions: for each id (calm, curious, sad, angry, amazed) the head part's uv on the atlas; its layer's keys'
   *  `face` pick one (layout.ts faceAt). Absent or unknown: the head part's own uv. */
  faces?: Record<string, [number, number, number, number]>
}

/** A painted map of a picture's body parts. `parts`: back to front, a colour [r, g, b] and its part (bones.ts bodyParts). */
export interface PartMap { src: string; parts: { colour: [number, number, number]; part: string }[] }

export interface SceneLayer {
  need?: string | string[]
  /** the teacher's edited copy of the picture (a URL), drawn instead of the library file */
  src?: string
  /** the ink level its lines are weighed by (ground.ts inkLevel), instead of its own file's: a part lifted out of a
   *  picture ("Make a layer") keeps that picture's lines */
  ink_level?: number
  /** where its land starts (ground.ts landTop), instead of its own file's: a picture with a part lifted out and the
   *  hole filled keeps the horizon it had (set.horizon 'auto') */
  land_top?: number
  /** that copy's crop to its paint (editor/trim.js): its offset in the library file and its own anchor */
  edit_state?: { crop?: [number, number]; anchor?: [number, number] } | null
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
  water?: WaterSpec
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
  /** the id of the group it belongs to (set.groups): the group's place, size, turn and fade carry it along */
  group?: string
  /** the group itself, resolved for the stage (layout.ts withGroups): never saved */
  _group?: LayerGroup
  /** locked on the editor's canvas: presses go through it (editor only) */
  locked?: number | boolean
}

/** A group of layers, as in Photoshop: one place, size, turn and fade for all of them, with its own keys.
 *  x 0..1 across the view and z metres away are where its middle stands now; rest is where that middle stood when the
 *  group was made, so a group that has not moved changes nothing. Scale and rotation work about its middle. */
export interface LayerGroup {
  id: string
  name?: string
  rest: { x: number; z: number }
  x?: number
  z?: number
  y?: number
  scale?: number
  rotation?: number
  opacity?: number
  keys?: LayerKey[]
}

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night'

/** The scene's sky as a time of day (daylight.ts): a painted gradient with clouds, lit by a sun (a moon at night) whose
 *  place throws every shadow. `painted`: keep drawing set.sky, take only the light from here. Unset = set.sky as before. */
export interface Daylight {
  time: TimeOfDay
  /** '#rrggbb' over the time's own sky colours */
  colours?: { top?: string; mid?: string; horizon?: string }
  /** which cloud cut-outs (asset ids; none = all), and how many of them: 0..1 */
  clouds?: { assets?: string[]; amount?: number }
  /** where the sun stands: x 0..1 across the frame, height 0..1 over the horizon; unset = the time's own */
  sun?: { x: number; height: number }
  painted?: boolean
  /** snow or rain falling through the scene (weather.ts, weather-gl.ts); unset = dry */
  weather?: Weather
}

export type WeatherKind = 'snow' | 'rain'
/** amount 0..1 of the most flakes; wind -1 (blowing left) .. 1 (right); size and speed are factors (weather.ts ranges) */
export interface Weather { kind: WeatherKind; amount?: number; wind?: number; size?: number; speed?: number }

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
  set: { sky?: string | null; skyLayer?: GroundBandProps; daylight?: Daylight; ground?: string; soil?: string; farEdge?: string; horizon?: number | 'auto'; land_target?: number; near?: string; groundBands?: GroundBand[]; groundSlots?: { asset: string; from_m: number; flip?: boolean; repeat?: number }[]; strew?: { plants?: string[]; seed?: number }; groups?: LayerGroup[]; layers: SceneLayer[] }
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
