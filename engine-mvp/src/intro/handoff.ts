// The museum intro hands off to the lesson (docs/intro-handoff.md). Pure: the plan and the painting's
// layout from scene 1's set, so the painting the stick figure dives into IS scene 1's first frame.
import { BASE_FOV, DEPTH_Z, EYE_Y } from '../director/camera'
import type { Lesson, Library, Scene } from '../director/types'

/** The stage frame, so the painting's frame and the studio canvas share one shape. */
export const STAGE_ASPECT = 16 / 9
/** BEATS.swapStart in prototypes/museum-intro/src/script.js: the figure is in, the camera holds. */
export const HANDOFF_AT_S = 13.0
export const FADE_IN_S = 0.4 // scene 1 appears inside the painting's rect, under the ink ripple
export const GROW_S = 1.3 // the rect opens to the full screen: we go into the painting
export const GROW_EASE = 'cubic-bezier(0.624, -0.042, 0.376, 1.042)' // easing.js EASE.move
export const INTRO_BED = 'museum-room'

export type PaintingLayer = { src: string; x: number; y: number; w: number; h: number; depth: string }
export type IntroPlan = {
  scene_id: string; aspect: number; handoff_at_s: number; fade_in_s: number; grow_s: number; grow_ease: string
  /** Scene 1's base bed starts this long before the grow, under the museum, as a J-cut. */
  preroll_s: number
  painting: { sky: string | null; layers: PaintingLayer[] }
}

const visibleHeight = (z: number) => 2 * z * Math.tan((BASE_FOV * Math.PI) / 360)

/** Scene 1's layers as rectangles in 0..1 of the painting, far to near, from the rest camera
 *  (eye 1.6 m, level, horizon mid-frame). Layers without a resolved library file are skipped. */
export function paintingLayout(scene: Scene, library: Library | null, baseUrl: string): PaintingLayer[] {
  const files = new Map((library?.assets ?? []).map((a) => [a.id, a]))
  return scene.set.layers
    .map((l) => ({ l, a: l.asset ? files.get(l.asset) : undefined }))
    .filter(({ a }) => a?.file)
    .sort((p, q) => DEPTH_Z[q.l.depth] - DEPTH_Z[p.l.depth])
    .map(({ l, a }) => {
      const z = DEPTH_Z[l.depth]
      const vh = visibleHeight(z)
      const h = l.depth === 'sky' ? 0.6 : ((a!.height_m ?? 3) * (l.scale ?? 1)) / vh
      const w = h * ((a!.w ?? 1) / (a!.h ?? 1)) / STAGE_ASPECT
      const [ax, ay] = a!.anchor ?? [0.5, 1]
      const groundY = l.depth === 'sky' ? 0.6 : 0.5 + EYE_Y / vh // ground under the layer, from the top
      return { src: baseUrl + a!.file, depth: l.depth, x: (l.x ?? 0.5) - w * ax, y: groundY - h * ay, w, h }
    })
}

export function introPlan(lesson: Lesson, library: Library | null, baseUrl = `/library/${lesson.bundle}/`): IntroPlan {
  const first = lesson.scenes[0]
  if (!first) throw new Error('introPlan: the lesson has no scenes')
  return {
    scene_id: first.id, aspect: STAGE_ASPECT,
    handoff_at_s: HANDOFF_AT_S, fade_in_s: FADE_IN_S, grow_s: GROW_S, grow_ease: GROW_EASE,
    preroll_s: 1.2,
    painting: { sky: first.set.sky ?? null, layers: paintingLayout(first, library, baseUrl) },
  }
}
