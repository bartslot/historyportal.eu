import * as THREE from 'three';
import { HALL } from './museum.js';
import { BEATS } from './script.js';
import { TASMAN_SHOT } from './world.js';

// Default camera keys. The hall keys are plain numbers; the world keys are built from the world's anchors and
// Tasman's height (`m`), so moving the ship or retuning the layout keeps every shot framed.
const r = (v) => v.toArray().map((x) => +x.toFixed(3));

export function defaultCameraKeys(A, eye) {
  const B = BEATS;
  const v = HALL.voc;
  const m = A.man;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const toward = (p, dist, side = [0, 0, 0]) => p.clone().add(eye.clone().sub(p).setY(0).normalize().multiplyScalar(dist)).add(V(...side).multiplyScalar(m));
  const look = V(v.x, v.y, 0);
  const L = A.tasmanLocal;
  const onDeck = (dx, dyMen, dz) => A.local(L.x + dx, L.y + dyMen * 1.48, L.z + dz); // model units, height in men
  return [
    { t: 0, pos: [-6.2, 1.95, 6.6], look: [-5.0, 2.05, 0], ease: 'settle' },
    { t: 3.2, pos: [-1.2, 1.9, 6.3], look: [0.0, 1.95, 0], ease: 'depart' },
    { t: 7.4, pos: [5.4, 1.8, 5.6], look: [6.8, 1.65, 0], ease: 'depart' },
    { t: 10.6, pos: [9.9, 1.85, 4.6], look: [10.9, 1.85, 0], ease: 'arrive' },
    // the painter's eye: hold still while the canvas crossfades into the 3D world behind it
    { t: 12.7, pos: r(eye), look: r(look), ease: 'settle' },
    { t: 14.5, pos: r(eye.clone().add(V(0, 0, -0.02))), look: r(look), ease: 'settle' },
    { t: 16.7, pos: r(eye.clone().lerp(toward(A.sail, 9 * m, [0, -1, 0]), 0.55)), look: r(A.sail.clone().lerp(look, 0.3)), ease: 'depart' },
    { t: B.land + 0.3, pos: r(toward(A.sail, 7 * m, [0.8, -1.2, 0])), look: r(A.sail.clone().add(V(0, -1.2 * m, 0))), ease: 'arrive' },
    // follow the figure down the mast
    { t: (B.slideStart + B.slideEnd) / 2, pos: r(toward(A.mastAt(0.5), 5.5 * m, [0.8, -0.4, 0])), look: r(A.mastAt(0.55)), ease: 'depart' },
    // on deck, inboard of the shrouds, so no rigging stands between the camera and Tasman
    { t: B.slideEnd + 0.2, pos: r(onDeck(TASMAN_SHOT[0] + 0.4, 1.1, TASMAN_SHOT[2] - 1.1)), look: r(A.tasmanChest.clone().lerp(A.mastAt(1), 0.45)), ease: 'settle' },
    { t: B.balloon + 0.5, pos: r(onDeck(TASMAN_SHOT[0] + 0.2, 1.0, TASMAN_SHOT[2] - 0.15)), look: r(A.shoulder.clone().add(V(0, 0.05 * m, 0))), ease: 'settle' },
    { t: 36, pos: r(onDeck(...TASMAN_SHOT)), look: r(A.shoulder.clone().add(V(0, 0.06 * m, 0))), ease: 'float' },
  ];
}
