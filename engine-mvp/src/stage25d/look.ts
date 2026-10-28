// The stage's own look on top of the shared post chain: what makes separately painted layers read as ONE picture.
// The shared chain's paper and granulation sit on world positions from the depth buffer, which painted planes are
// kept out of, so on a plane they are almost nothing. Here instead:
//   sheet: one paper sheet under the whole frame (tooth + granulation in screen space, a light warm wash in big soft
//          patches), the way a book page is one piece of paper whatever was painted where;
//   line by depth: far layers draw their ink lighter, thinner and into the sky's haze (aerial perspective), so a
//          line-weight mismatch between layers reads as distance, not as a cut-out.
// Every value is a key of lesson.look (teacher-editable, undoable, a slider in the panel).
import { Matrix, Vector3 } from '@babylonjs/core'
import { fovRad, HOUSE, HOUSE_PITCH_DEG } from './layout'
import type { Depth } from './types'

export const DEPTHS: Depth[] = ['sky', 'bg', 'mid', 'fg', 'near']
const cap = (d: Depth) => d[0].toUpperCase() + d.slice(1)
export const lineKeys = (d: Depth) => ({ fade: `lineFade${cap(d)}`, thin: `lineThin${cap(d)}`, haze: `haze${cap(d)}` })

/** Defaults: tuned on art v3's plates against the Verbree pass-2 refs. thin is in screen px (1080p).
 *  Bart's rule (everything drawn, never blur): far ink keeps at least INK_FLOOR of the near contrast (lineContrast),
 *  and near outlines are never thinned: thinning starts at mid. */
export const STAGE_SHEET: Record<string, number> = {
  sheetPaper: 1, sheetGrain: 0.7, sheetWash: 0.12, sheetPatches: 0.5, lineBrown: 0.6, groundDetail: 0.45,
  groundVary: 0.6, groundMix: 0.7, groundScale: 2.5, nearFar: 16, housePitch: HOUSE_PITCH_DEG, lineInk: 0.3, lineNorm: 0.8,
  lineFadeSky: 0.3, lineThinSky: 0, hazeSky: 0,
  lineFadeBg: 0.3, lineThinBg: 0.5, hazeBg: 0.12,
  lineFadeMid: 0.15, lineThinMid: 0.3, hazeMid: 0.04,
  lineFadeFg: 0, lineThinFg: 0, hazeFg: 0,
  lineFadeNear: 0, lineThinNear: 0, hazeNear: 0,
}
export const INK_FLOOR = 0.65
/** The warm raw-sienna wash the whole picture is painted over (sheet.ts even part, PAPER_GLSL patches). */
export const WASH_COLOUR: [number, number, number] = [0.93, 0.86, 0.74]
export interface Paper { paper: number; grain: number; patches: number; wash: number; washColour: [number, number, number] }
export const paperOf = (look: Record<string, unknown>): Paper =>
  ({ paper: num(look, 'sheetPaper'), grain: num(look, 'sheetGrain'), patches: num(look, 'sheetPatches'), wash: num(look, 'sheetWash'), washColour: WASH_COLOUR })
/** Share of the art's own line contrast a depth keeps (lineFade takes a line 75 % of the way to the haze, haze takes
 *  the whole layer that way): (1 - 0.75 fade)(1 - haze). */
export const lineContrast = (l: { fade: number; haze: number }) => (1 - 0.75 * l.fade) * (1 - l.haze)

/** Slider ranges for the panel (same order as STAGE_SHEET). */
const RANGES: Record<string, [number, number, number]> = {
  groundScale: [0.5, 5, 0.1], nearFar: [4, 40, 0.5], housePitch: [-6, 12, 0.5], lineInk: [0.05, 0.6, 0.01],
}
export const LOOK_RANGE: Record<string, [number, number, number]> = Object.fromEntries(Object.keys(STAGE_SHEET).map((k) => [
  k, RANGES[k] ?? (k.startsWith('lineThin') ? [0, 2, 0.05] : [0, 1, 0.01]),
]))
export const lookNum = (look: Record<string, unknown>, k: string) => num(look, k)

const num = (look: Record<string, unknown>, k: string) => { const v = Number(look[k] ?? STAGE_SHEET[k]); return Number.isFinite(v) ? v : STAGE_SHEET[k] }

/** A depth's line values from the lesson's look (defaults where unset). */
export interface Line { fade: number; thin: number; haze: number; brown: number; ink: number; norm: number }
export function lineOf(look: Record<string, unknown>, d: Depth): Line {
  const k = lineKeys(d)
  return { fade: num(look, k.fade), thin: num(look, k.thin), haze: num(look, k.haze), brown: num(look, 'lineBrown'), ink: num(look, 'lineInk'), norm: num(look, 'lineNorm') }
}

/** How much an ink pixel's colour is scaled so this layer's lines reach the shared ink value (lineInk): a layer drawn
 *  darker than the rest gets lighter lines, a fainter one darker, by `norm` (0 = as painted). Clamped 0.5..2.5. */
export const inkScale = (layerInk: number, target: number, norm: number) =>
  1 + norm * (Math.min(2.5, Math.max(0.5, target / Math.max(layerInk, 0.02))) - 1)

/** Screen px per metre at distance zRel in front of the camera (vertical fov in radians, as the camera holds it). */
export const pxPerMetre = (renderH: number, zRel: number, fov: number) =>
  renderH / (2 * Math.max(zRel, 0.01) * Math.tan(fov / 2))

/** A plane's texture uv per screen px (u counts its repeats), at 1080p-equivalent px so thin means the same at any
 *  render size: thin 1 = one line pixel of a 1080p frame. */
export const pxUV = (wM: number, hM: number, uRepeat: number, ppm: number, renderH: number) => {
  const k = ppm * (1080 / renderH)
  return [uRepeat / Math.max(wM * k, 1e-3), 1 / Math.max(hM * k, 1e-3)] as const
}

/** The near band's projection: the house camera (eye 1.6 m, fov 50, pitched `pitchDeg` down) as a view-projection,
 *  and where on screen (ndc y) the floor `nearFar` metres out is: the band's far edge. */
export function houseProjection(pitchDeg: number, aspect: number, nearFar: number): { vp: Matrix; top: number } {
  const eye = new Vector3(HOUSE.x, HOUSE.y, HOUSE.z)
  const turn = Matrix.RotationX((pitchDeg * Math.PI) / 180)
  const view = Matrix.LookAtLH(eye, eye.add(Vector3.TransformNormal(new Vector3(0, 0, 1), turn)), Vector3.TransformNormal(Vector3.Up(), turn))
  const vp = view.multiply(Matrix.PerspectiveFovLH(fovRad(HOUSE.fov), aspect, 0.1, 2000))
  return { vp, top: Vector3.TransformCoordinates(new Vector3(0, 0, nearFar), vp).y }
}

