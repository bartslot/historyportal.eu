import * as THREE from 'three';
import { HALL } from './museum.js';
import { BEATS } from './script.js';

// Default camera keys. Inside the painting they are placed ON THE PAINTER'S VIEW RAY of their subject (the
// direction from the subject back to the eye), so the depth-displaced painting barely tears.
const r = (v) => v.toArray().map((x) => +x.toFixed(3));

export function defaultCameraKeys(A, eye) {
  const B = BEATS;
  const v = HALL.voc;
  const towardEye = (p, dist, side = [0, 0, 0]) => p.clone().add(eye.clone().sub(p).normalize().multiplyScalar(dist)).add(new THREE.Vector3(...side));
  const sailLook = A.sail.clone().add(new THREE.Vector3(0, -0.15, 0));
  return [
    { t: 0, pos: [-5.2, 1.62, 6.4], look: [-4.2, 1.7, 0], ease: 'settle' },
    { t: 3.2, pos: [-0.6, 1.58, 6.1], look: [0.6, 1.6, 0], ease: 'depart' },
    { t: 7.4, pos: [5.6, 1.5, 5.3], look: [7.0, 1.35, 0], ease: 'depart' },
    { t: 10.6, pos: [9.9, 1.55, 4.2], look: [10.9, 1.5, 0], ease: 'arrive' },
    { t: 12.4, pos: [v.x - 0.15, v.y - 0.05, 4.3], look: [v.x - 0.1, v.y, 0], ease: 'settle' },
    { t: 15.4, pos: r(eye.clone().lerp(sailLook, 0.5)), look: r(sailLook), ease: 'depart' },
    { t: B.land + 0.3, pos: r(towardEye(sailLook, 1.7, [0.06, 0.03, 0])), look: r(sailLook), ease: 'arrive' },
    // follow the mast down with the sliding figure
    { t: (B.slideStart + B.slideEnd) / 2, pos: r(towardEye(A.mastAt(0.3), 1.45, [0.06, 0.02, 0])), look: r(A.mastAt(0.36)), ease: 'depart' },
    { t: B.slideEnd + 0.2, pos: r(towardEye(A.tasmanChest, 1.15, [0.06, 0.03, 0])), look: r(A.tasmanChest.clone().lerp(A.mastAt(0.62), 0.55)), ease: 'settle' },
    { t: B.balloon + 0.5, pos: r(towardEye(A.shoulder, 0.9, [0.08, 0.0, 0])), look: r(A.shoulder.clone().add(new THREE.Vector3(0.07, -0.01, 0))), ease: 'settle' },
    { t: 34, pos: r(towardEye(A.shoulder, 0.84, [0.11, 0.02, 0])), look: r(A.shoulder.clone().add(new THREE.Vector3(0.07, 0.0, 0))), ease: 'float' },
  ];
}
