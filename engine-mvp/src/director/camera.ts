// Camera grammar (story-director "Composition", lemo-opuscar DIRECTOR.md camera rules, MIT).
//
// Stage frame, in metres: the camera's rest pose sits at x 0, eye height y 1.6 (house camera hp1),
// z 0, looking down +z. Layers stand at DEPTH_Z. A layer's scene x (0..1 across the frame) maps to
// world x at its own depth via worldX(). fov is vertical, in degrees. A stage that only reads
// {x,y,z,fov} still gets push/pull/truck right; pan/tilt need `target`, rack needs `focus_z`.
import type { Beat, CamPose, Camera, MoveKind, Scene } from './types'
import { round } from './timing'

export const DEPTH_Z = { fg: 4, mid: 12, bg: 40, sky: 200 } as const
export const EYE_Y = 1.6
export const BASE_FOV = 50
/** Metres a plain move keeps in front of the foreground layer. */
export const FG_CLEARANCE = 1.5
const ASPECT = 16 / 9

export const visibleWidth = (z: number, fov = BASE_FOV): number => 2 * z * Math.tan((fov * Math.PI) / 360) * ASPECT
export const worldX = (xFrac: number, z: number): number => (xFrac - 0.5) * visibleWidth(z)

/** What each beat wants the camera to do, best first. 'through' (the native move) is placed apart. */
const BY_BEAT: Record<Beat, MoveKind[]> = {
  hook: ['push', 'truck'],
  setup: ['tilt', 'truck', 'pan'],
  cause: ['push', 'rack', 'pan'],
  effect: ['pull', 'truck', 'pan'],
  turn: ['rack', 'push', 'tilt'],
  climax: ['push', 'rack'],
  recap: ['pull', 'truck'],
}
export const PLAIN_MOVES: MoveKind[] = ['push', 'pull', 'truck', 'pan', 'tilt', 'rack']

/** Ease by intent, never linear (memory ui-standards-visual, easing.js names). */
const EASE: Record<MoveKind, string> = {
  push: 'easeInOutCubic', // reposition: slow in, slow out
  pull: 'easeInOutQuart', // a reveal starts slow so the class feels it open
  truck: 'easeInOutCubic',
  pan: 'easeInOutCubic',
  tilt: 'easeInOutQuad',
  rack: 'easeInOutQuad',
  through: 'easeInOutQuint', // the native move: a held breath, then through the frame
}
/** The hook arrives hard and settles: most of the move is done inside the first 3 s. */
const HOOK_EASE = 'easeOutQuart'

const WHY: Record<MoveKind, string> = {
  push: 'closer to what matters now',
  pull: 'pull back to show what it caused',
  truck: 'travel with the action, screen direction kept',
  pan: 'lead the eye to the subject',
  tilt: 'from the sky down to where we are',
  rack: 'focus moves from foreground to the subject',
  through: 'native move: the camera passes through the frame into the scene',
}

export type Focus = { x: number; y: number; z: number; dir: 1 | -1 }

/** The subject: the first figure, else the first mid layer, else frame centre at mid depth. */
export function focusOf(scene: Scene): Focus {
  const f = scene.figures?.[0]
  if (f) {
    const z = DEPTH_Z[f.depth ?? 'mid']
    return { x: worldX(f.x ?? 0.5, z), y: 1.1, z, dir: f.facing === 'left' ? -1 : 1 }
  }
  const l = scene.set.layers.find((x) => x.depth === 'mid') ?? scene.set.layers[0]
  const z = DEPTH_Z[l?.depth ?? 'mid']
  return { x: worldX(l?.x ?? 0.5, z), y: 1.2, z, dir: 1 }
}

const pose = (x: number, y: number, z: number, fov: number, t: { x: number; y: number; z: number }, focus_z?: number): CamPose => {
  const p: CamPose = { x: round(x), y: round(y), z: round(z), fov: round(fov), target: { x: round(t.x), y: round(t.y), z: round(t.z) } }
  return focus_z === undefined ? p : { ...p, focus_z: round(focus_z) }
}

/** from/to for one move, framed on the focus. `k` scales how far it travels (0.6 calm .. 1.4 strong). */
export function frame(move: MoveKind, f: Focus, k = 1): { from: CamPose; to: CamPose } {
  const look = { x: f.x, y: f.y, z: f.z }
  const x0 = f.x * 0.6 // the camera sits a little inside the subject, so it is off-centre (thirds)
  // only the native move ('through') may pass the foreground plane; every other move stays in front of it
  const push = Math.min(f.z * 0.3 * k, DEPTH_Z.fg - FG_CLEARANCE)
  switch (move) {
    case 'push': return { from: pose(x0, EYE_Y, 0, BASE_FOV, look), to: pose(x0 + (f.x - x0) * 0.3, EYE_Y - 0.1, push, BASE_FOV - 4 * k, look) }
    case 'pull': return { from: pose(x0, EYE_Y - 0.1, push, BASE_FOV - 6 * k, look), to: pose(x0, EYE_Y + 0.2, -push * 0.4, BASE_FOV + 4, look) }
    case 'truck': {
      const d = 1.4 * k * f.dir
      return { from: pose(x0 - d, EYE_Y, 0, BASE_FOV, { ...look, x: f.x - d }), to: pose(x0 + d, EYE_Y, 0, BASE_FOV, { ...look, x: f.x + d * 0.5 }) }
    }
    case 'pan': {
      const off = visibleWidth(f.z) * 0.25 * k * -f.dir
      return { from: pose(x0, EYE_Y, 0, BASE_FOV, { ...look, x: f.x + off }), to: pose(x0, EYE_Y, 0, BASE_FOV, look) }
    }
    case 'tilt': return { from: pose(x0, EYE_Y, 0, BASE_FOV, { ...look, y: 6 * k }), to: pose(x0, EYE_Y, 0, BASE_FOV, look) }
    case 'rack': return { from: pose(x0, EYE_Y, 0, BASE_FOV - 2, look, DEPTH_Z.fg), to: pose(x0, EYE_Y, push * 0.3, BASE_FOV - 4, look, f.z) }
    case 'through': return { from: pose(x0, EYE_Y, -2, BASE_FOV + 4, look, DEPTH_Z.fg), to: pose(f.x * 0.8, EYE_Y - 0.1, DEPTH_Z.fg + 1.5, BASE_FOV - 8, look, f.z) }
  }
}

/** How strong a beat's move is: calm at the setup, strongest at the hook and the peak. */
const STRENGTH: Record<Beat, number> = { hook: 1.3, setup: 0.7, cause: 1, effect: 1, turn: 1.1, climax: 1.4, recap: 0.8 }

export function makeCamera(scene: Scene, move: MoveKind, at: number, dur: number, opts: { hook?: boolean } = {}): Camera {
  const { from, to } = frame(move, focusOf(scene), STRENGTH[scene.beat] ?? 1)
  return {
    move, from, to, at_s: round(at), dur_s: round(dur),
    ease: opts.hook ? HOOK_EASE : EASE[move],
    ...(move === 'through' ? { native: true } : {}),
    why: WHY[move], by: 'director',
  }
}

/** Pick a move per shot: the beat's favourite that differs from the shot before. */
export function pickMove(beat: Beat, prev: MoveKind | null, skip: MoveKind[] = []): MoveKind {
  const pool = BY_BEAT[beat] ?? PLAIN_MOVES
  return pool.find((m) => m !== prev && !skip.includes(m)) ?? PLAIN_MOVES.find((m) => m !== prev && !skip.includes(m)) ?? pool[0]
}

/** Index of the peak beat that gets the one native move: the first climax, else the first turn,
 *  else the scene at 70 % of the lesson. */
export function peakIndex(beats: Beat[]): number {
  const climax = beats.indexOf('climax')
  if (climax >= 0) return climax
  const turn = beats.indexOf('turn')
  if (turn >= 0) return turn
  return Math.min(beats.length - 1, Math.floor(beats.length * 0.7))
}
