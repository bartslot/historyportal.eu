import * as THREE from 'three';
import { EYE } from './world.js';

// Four fixed style-study shots (?shot=1..4): the same frames every round so ChatGPT scores like with like.
// Positions in the ship's model frame (A.local), heights from the deck at Tasman's feet. The world is shown at
// timeline second 30 with the wipe forced to 1 (all History Lines).
export function styleShots(A, path) {
  const L = A.tasmanLocal;
  const deck = (x, dy, z) => A.local(x, L.y + dy, z);
  const end = new THREE.PerspectiveCamera();
  path.apply(end, 30);
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(end.quaternion);
  return {
    // from the painter's side, so the painting's other ships (cut-out cards facing the eye) are seen face on
    1: { name: 'wide_ship', pos: A.local(1, 4, 0).lerp(EYE, 0.55).add(new THREE.Vector3(0, 0.25, 0)), look: A.local(-4, 11, 0) },
    2: { name: 'mid_deck_mast', pos: deck(-8.5, 1.4, 3.2), look: deck(-1, 13, -0.5) },
    3: { name: 'close_rigging_sail', pos: deck(5.2, 3.5, 4.2), look: deck(10, 10, 0) },
    4: { name: 'tasman_close', pos: end.position.clone(), look: end.position.clone().add(fwd) },
  };
}
