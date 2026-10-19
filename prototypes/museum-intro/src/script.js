import * as THREE from 'three';
import { EASE, span, lerp, clamp01 } from './timeline.js';
import { POSES, blendPose, walkPose } from './stickFigure.js';
import { HALL } from './museum.js';

// The intro as data + pure functions of time t. Every beat time lives in BEATS so the dev panel can move them;
// every place in the painting is a painting uv (v up) resolved through the diorama, so retuning the depth keeps
// the figure on the sail and Tasman on the deck.

export const DURATION = 34;

export const BEATS = {
  appear: 3.6, // figure draws itself on the rail
  walkStart: 4.6,
  walkEnd: 10.2,
  lookUp: 10.4,
  crouch: 10.85,
  jump: 11.15,
  dive: 11.85, // touches the painting, ink ripple
  openStart: 12.3,
  openEnd: 15.6,
  fallStart: 17.9,
  land: 18.75,
  hop: 19.7,
  slideStart: 20.15,
  slideEnd: 22.9,
  shoulderHop: 23.5,
  shoulderLand: 24.15,
  notice: 24.6, // Tasman bounces
  balloon: 25.0,
  start: 28.2, // the Start affordance
};

export const PARAMS = {
  depthFinal: 2.6, // diorama depth amount when fully open
  cut: 0.22, // cut triangles whose depth factor jumps more than this (object edges); 0 = rubber sheet
  figureHall: 0.34, // figure height on the rail (m)
  figureWorld: 0.095, // figure height inside the painting
  tasmanH: 0.3,
  tasmanToEye: 0.2, // pulls Tasman a little in front of the deck so the rail does not cut him
  railFrom: 4.9,
  railTo: 10.65,
  stride: 0.19, // metres per step cycle at hall scale
};

// painting uv anchors (checked on a 3840 px crop of the painting)
export const UV = {
  dive: [0.2, 0.42], // the left ship's hull, where the figure jumps in
  sail: [0.236, 0.682], // top yard of the fore topsail (thin: its depth is read from the sail body below)
  sailBody: [0.235, 0.64],
  mastTop: [0.2205, 0.69],
  deck: [0.214, 0.43],
  tasman: [0.203, 0.415], // Tasman's feet
};
export const TASMAN_SHOULDER = [0.24, 0.785]; // in the card's own uv
export const TASMAN_MOUTH = [0.86, 0.87];

export function depthAmount(t) {
  return PARAMS.depthFinal * span(t, BEATS.openStart, BEATS.openEnd, EASE.settle);
}

const v3 = (a) => new THREE.Vector3(...a);
const arc = (a, b, h, e) => a.clone().lerp(b, e).add(new THREE.Vector3(0, Math.sin(Math.PI * e) * h, 0));

// world anchors at the final depth (the figure only enters the painting after it has opened)
export function anchors(dio) {
  const k = PARAMS.depthFinal;
  const at = (uv, opts = {}) => dio.worldAt(uv[0], uv[1], { k, ...opts });
  const dSail = dio.depthAt(...UV.sailBody, 2);
  const dDeck = dio.depthAt(...UV.deck, 4);
  const tasmanFeet = at(UV.tasman, { d: dDeck, toEye: PARAMS.tasmanToEye });
  const card = (cu, cv) => tasmanFeet.clone().add(new THREE.Vector3((cu - 0.5) * PARAMS.tasmanH * (425 / 1400), cv * PARAMS.tasmanH, 0));
  return {
    sail: at(UV.sail, { d: dSail, toEye: 0.05 }),
    mastTop: at(UV.mastTop, { d: dSail, toEye: 0.05 }),
    mastAt: (e) => at([UV.mastTop[0], lerp(UV.mastTop[1], UV.deck[1], e)], { d: lerp(dSail, dDeck, e), toEye: lerp(0.05, PARAMS.tasmanToEye, e) }),
    tasmanFeet,
    shoulder: card(...TASMAN_SHOULDER),
    mouth: card(...TASMAN_MOUTH),
    tasmanChest: card(0.5, 0.72),
    dive: dio.worldAt(...UV.dive, { k: 0 }),
  };
}

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
    const from = A.sail.clone().add(new THREE.Vector3(-0.12, 0.85, 0));
    const pos = from.lerp(A.sail, fall);
    const land = t > B.land ? Math.exp(-(t - B.land) * 7) * Math.sin((t - B.land) * 18) : 0;
    const pose = t < B.land ? POSES.fall : blendPose(POSES.land, POSES.idle, span(t, B.land, B.land + 0.5));
    return { ...idle, pose, pos, scale: P.figureWorld, squash: t < B.land ? 1.1 : 1 - 0.2 * land, spark: t < B.land ? 1 : 0.2 };
  }
  if (t < B.slideStart) {
    const e = span(t, B.hop, B.slideStart, EASE.settle);
    const pos = arc(A.sail, A.mastTop, 0.12, e);
    return { ...idle, pose: blendPose(POSES.jump, POSES.slide, e), pos, scale: P.figureWorld, facing: -1, spark: 0.6 };
  }
  if (t < B.shoulderHop) {
    const e = span(t, B.slideStart, B.slideEnd, EASE.settle);
    const stop = A.mastAt(0.62); // just above Tasman's shoulder
    const pos = A.mastTop.clone().lerp(stop, e);
    return { ...idle, pose: POSES.slide, pos, scale: P.figureWorld, facing: -1, spark: 0.55 };
  }
  if (t < B.shoulderLand) {
    const e = span(t, B.shoulderHop, B.shoulderLand, EASE.settle);
    const pos = arc(A.mastAt(0.62), A.shoulder, 0.1, e);
    return { ...idle, pose: blendPose(POSES.jump, POSES.sit, e), pos, scale: P.figureWorld, anchor: e > 0.5 ? 'hip' : 'feet', facing: -1, spark: 0.8 };
  }
  // sitting on the shoulder: legs dangle, the free hand waves now and then
  const settle = Math.exp(-(t - B.shoulderLand) * 6) * Math.sin((t - B.shoulderLand) * 16);
  const swing = 0.22 * Math.sin(t * 3.1);
  const wave = 0.35 * Math.sin(t * 7) * span(t, B.balloon + 0.3, B.balloon + 0.6) * (1 - span(t, B.balloon + 2.2, B.balloon + 2.6));
  const pose = { ...POSES.sit, hipL: POSES.sit.hipL + swing, hipR: POSES.sit.hipR - swing, shR: POSES.sit.shR + wave };
  return { ...idle, pose, pos: A.shoulder, scale: P.figureWorld, anchor: 'hip', facing: 1, squash: 1 - 0.15 * settle, spark: 0.12 };
}
