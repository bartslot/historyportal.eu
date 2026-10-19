import * as THREE from 'three';
import { EASE, span, lerp, clamp01 } from './timeline.js';
import { POSES, blendPose, walkPose } from './stickFigure.js';
import { HALL } from './museum.js';

// The intro as data + pure functions of time t. Every beat time lives in BEATS so the dev panel can move them;
// places inside the painting come from the 3D world (world.js anchors), never from hand-typed coordinates.

export const DURATION = 36;

export const BEATS = {
  appear: 3.6, // figure draws itself on the rail
  walkStart: 4.6,
  walkEnd: 10.2,
  lookUp: 10.4,
  crouch: 10.85,
  jump: 11.15,
  dive: 11.85, // touches the painting, ink ripple
  swapStart: 13.0, // camera holds at the painter's eye: painting crossfades to the 3D world
  swapEnd: 14.3,
  fallStart: 18.0,
  land: 18.85, // the ink wipe to History Lines starts here
  wipeEnd: 23.4, // slow enough that the front passes Tasman on screen
  hop: 19.8,
  slideStart: 20.25,
  slideEnd: 23.0,
  shoulderHop: 23.6,
  shoulderLand: 24.25,
  notice: 24.7, // Tasman bounces
  balloon: 25.1,
  start: 28.6, // the Start affordance
};

export const PARAMS = {
  figureHall: 0.42, // figure height on the rail (m)
  figureWorld: 0.08, // set from Tasman's height once the world is built
  railFrom: 4.9,
  railTo: 10.65,
  stride: 0.22, // metres per step cycle at hall scale
};

export const swapAmount = (t) => span(t, BEATS.swapStart, BEATS.swapEnd, EASE.settle);
export const wipeAmount = (t) => span(t, BEATS.land - 0.05, BEATS.wipeEnd, EASE.settle);

const arc = (a, b, h, e) => a.clone().lerp(b, e).add(new THREE.Vector3(0, Math.sin(Math.PI * e) * h, 0));

// where the figure is and what it is doing at time t
export function figureAt(t, A) {
  const B = BEATS;
  const P = PARAMS;
  const rail = (x) => new THREE.Vector3(x, HALL.railY, HALL.railZ);
  const idle = { pose: POSES.idle, anchor: 'feet', facing: 1, squash: 1, reveal: 1 };

  if (t < B.appear) return null;
  if (t < B.walkStart) {
    const r = span(t, B.appear, B.appear + 0.8, EASE.arrive);
    return { ...idle, pos: rail(P.railFrom), scale: P.figureHall, reveal: r, spark: 1 - r * 0.6 };
  }
  if (t < B.walkEnd) {
    // ease in from a stand and out to a stop; the stride follows the distance so feet never skate
    const e = span(t, B.walkStart, B.walkEnd, EASE.settle);
    const x = lerp(P.railFrom, P.railTo, e);
    const speed = Math.min(1, Math.min(t - B.walkStart, B.walkEnd - t) / 0.5);
    return { ...idle, pose: walkPose((x - P.railFrom) / P.stride, speed), pos: rail(x), scale: P.figureHall, spark: 0.25 };
  }
  if (t < B.jump) {
    const look = span(t, B.lookUp, B.lookUp + 0.35);
    const crouch = span(t, B.crouch, B.jump, EASE.settle); // anticipation
    const pose = blendPose(blendPose(POSES.idle, POSES.lookUp, look), POSES.crouch, crouch);
    return { ...idle, pose, pos: rail(P.railTo), scale: P.figureHall, squash: 1 - 0.12 * crouch, spark: 0.1 };
  }
  if (t < B.dive) {
    const e = span(t, B.jump, B.dive, EASE.arrive);
    const pos = arc(rail(P.railTo), A.dive, 0.55, e);
    const pose = blendPose(POSES.jump, POSES.fall, clamp01(e * 1.4 - 0.2));
    // stretch on take-off, shrink into the paint at the end
    return { ...idle, pose, pos, scale: P.figureHall * (1 - 0.75 * span(t, B.dive - 0.25, B.dive)), squash: 1.12 - 0.12 * e, spark: 1 };
  }
  if (t < B.fallStart) return null;
  if (t < B.hop) {
    const fall = span(t, B.fallStart, B.land, EASE.gravity);
    const from = A.sail.clone().add(new THREE.Vector3(-0.3 * A.man, 4 * A.man, 0));
    const pos = from.lerp(A.sail, fall);
    const land = t > B.land ? Math.exp(-(t - B.land) * 7) * Math.sin((t - B.land) * 18) : 0;
    const pose = t < B.land ? POSES.fall : blendPose(POSES.land, POSES.idle, span(t, B.land, B.land + 0.5));
    return { ...idle, pose, pos, scale: P.figureWorld, squash: t < B.land ? 1.1 : 1 - 0.2 * land, spark: t < B.land ? 1 : 0.2 };
  }
  if (t < B.slideStart) {
    const e = span(t, B.hop, B.slideStart, EASE.settle);
    const pos = arc(A.sail, A.mastAt(0.06), 0.4 * A.man, e);
    return { ...idle, pose: blendPose(POSES.jump, POSES.slide, e), pos, scale: P.figureWorld, facing: -1, spark: 0.6 };
  }
  if (t < B.shoulderHop) {
    const e = span(t, B.slideStart, B.slideEnd, EASE.settle);
    const stop = A.mastAt(1); // just above Tasman's shoulder
    const pos = A.mastAt(0.06).clone().lerp(stop, e);
    return { ...idle, pose: POSES.slide, pos, scale: P.figureWorld, facing: -1, spark: 0.55 };
  }
  if (t < B.shoulderLand) {
    const e = span(t, B.shoulderHop, B.shoulderLand, EASE.settle);
    const pos = arc(A.mastAt(1), A.shoulder, 0.35 * A.man, e);
    return { ...idle, pose: blendPose(POSES.jump, POSES.sit, e), pos, scale: P.figureWorld, anchor: e > 0.5 ? 'hip' : 'feet', facing: -1, spark: 0.8 };
  }
  // sitting on the shoulder: legs dangle, the free hand waves now and then
  const settle = Math.exp(-(t - B.shoulderLand) * 6) * Math.sin((t - B.shoulderLand) * 16);
  const swing = 0.22 * Math.sin(t * 3.1);
  const wave = 0.35 * Math.sin(t * 7) * span(t, B.balloon + 0.3, B.balloon + 0.6) * (1 - span(t, B.balloon + 2.2, B.balloon + 2.6));
  const pose = { ...POSES.sit, hipL: POSES.sit.hipL + swing, hipR: POSES.sit.hipR - swing, shR: POSES.sit.shR + wave };
  return { ...idle, pose, pos: A.shoulder, scale: P.figureWorld, anchor: 'hip', facing: 1, squash: 1 - 0.15 * settle, spark: 0.12 };
}
