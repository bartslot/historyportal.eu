// The clay kit's geometry and the figure's poses, for any Babylon scene: the studio's blockout (blockout.js) and the
// storyboard's clay frames (src/storyboard/clay.ts) build the same pieces and pose the same mannequin.
/* global BABYLON */
'use strict';
import { forward, rightOf } from '../blockout/solve';

// the studio's mannequin (Mixamo rig), served by the studio itself (public/assets/models, git-ignored: 2.9 MB);
// a fresh checkout without it falls back to Babylon's CDN (Gate 3: no CDN round trip on every page open)
export const FIGURE_URLS = ['assets/models/xbot.glb', 'https://assets.babylonjs.com/meshes/Xbot.glb'];
export const RIMS = ['#e0a050', '#5fb3d9', '#9bd16b', '#e07a8a', '#c49be0', '#e8d26a'];   // one rim per character

function boxAt(scene, name, w, h, d, x = 0, y = h / 2, z = 0) {
  const m = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
  m.position.set(x, y, z);
  return m;
}
function cyl(scene, name, dia, h, x = 0, y = h / 2, z = 0) {
  const m = BABYLON.MeshBuilder.CreateCylinder(name, { diameter: dia, height: h, tessellation: 12 }, scene);
  m.position.set(x, y, z);
  return m;
}

/** The meshes of one kit piece (bottom centre at the origin, front +Z); merge them for one source mesh. */
export function buildShape(scene, k) {
  const [w, h, d] = k.size;
  const n = 'kit ' + k.id;
  const box = (...a) => boxAt(scene, ...a);
  switch (k.shape.kind) {
    case 'box': return [box(n, w, h, d)];
    case 'cylinder': return [cyl(scene, n, w, h)];
    case 'rail': {
      const parts = [box(n + ' top', w, 0.12, d, 0, h - 0.06), box(n + ' low', w, 0.08, d * 0.8, 0, 0.35)];
      for (let x = -w / 2 + 0.1; x <= w / 2; x += 1) parts.push(box(n + ' post', 0.12, h, d * 0.8, x));
      return parts;
    }
    case 'table': {
      const parts = [box(n + ' top', w, 0.06, d, 0, h - 0.03)];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(box(n + ' leg', 0.08, h - 0.06, 0.08, sx * (w / 2 - 0.1), (h - 0.06) / 2, sz * (d / 2 - 0.1)));
      return parts;
    }
    case 'cannon': {
      const barrel = cyl(scene, n + ' barrel', 0.3, d, 0, 0.62, 0.1);
      barrel.rotation.x = Math.PI / 2;
      return [box(n + ' carriage', w, 0.45, d * 0.6, 0, 0.225, -0.2), barrel];
    }
    case 'cart': {
      const parts = [box(n + ' bed', w * 0.8, 0.35, d * 0.62, 0, 0.75, -0.2)];
      for (const sx of [-1, 1]) {
        const wheel = cyl(scene, n + ' wheel', 1.0, 0.08, sx * w / 2, 0.5, -0.2);
        wheel.rotation.z = Math.PI / 2;
        parts.push(wheel, box(n + ' shaft', 0.06, 0.06, d * 0.45, sx * w * 0.3, 0.7, d * 0.3));
      }
      return parts;
    }
    default: return [];
  }
}

// ---------- poses: aim the arm bones in the figure's own frame (never trust local offsets; posing rules) ----------
export const bone = (a, name) => a.getChildTransformNodes(false).find((n) => n.name.endsWith(':' + name) || n.name.endsWith(name));

function aim(a, upperName, lowerName, endName, dir, target) {
  const up = bone(a, upperName), low = bone(a, lowerName), end = bone(a, endName);
  if (!up || !low || !end) return;
  // in the parent bone's own space: the mannequin's glTF root is mirrored (negative scale), which breaks
  // world-space quaternion maths; directions through the inverse parent matrix do not care (measured 2026-10-14)
  const turn = (node, child, to) => {
    node.computeWorldMatrix(true);
    child.computeWorldMatrix(true);
    const inv = node.parent.getWorldMatrix().clone().invert();
    const cur = BABYLON.Vector3.TransformNormal(child.getAbsolutePosition().subtract(node.getAbsolutePosition()), inv).normalize();
    const want = BABYLON.Vector3.TransformNormal(to, inv).normalize();
    const d = new BABYLON.Quaternion();
    BABYLON.Quaternion.FromUnitVectorsToRef(cur, want, d);
    node.rotationQuaternion = d.multiply(node.rotationQuaternion);
    node.computeWorldMatrix(true);
  };
  turn(up, low, dir);
  low.computeWorldMatrix(true);
  turn(low, end, target.subtract(low.getAbsolutePosition()));
}

/** Pose a figure that stands in its idle frame, facing `yaw`: 'stand' leaves it, 'point' and 'spyglass' aim its arms.
 *  The spyglass is a clay tube (material `mat`) parented to the figure; returns it, or null. */
export function poseFigure(scene, a, yaw, name, mat, idPrefix) {
  const [fx, fz] = forward(yaw);
  const [rx, rz] = rightOf(yaw);
  const F = new BABYLON.Vector3(fx, 0, fz), R = new BABYLON.Vector3(rx, 0, rz), U = BABYLON.Axis.Y;
  const head = bone(a, 'Head');
  head && head.computeWorldMatrix(true);
  const eye = head ? head.getAbsolutePosition().add(F.scale(0.1)).add(U.scale(0.05)) : a.position.add(U.scale(1.66));
  if (name === 'point') {
    const d = F.scale(0.9).add(U.scale(0.25)).add(R.scale(0.25));
    aim(a, 'RightArm', 'RightForeArm', 'RightHand', d, eye.add(d.normalize().scale(1.2)));
    return null;
  }
  if (name !== 'spyglass') return null;
  // the tube at the right eye; the far hand holds it out front, the near hand under the eyepiece
  const tubeEnd = eye.add(R.scale(0.03)).add(F.scale(0.45));
  aim(a, 'LeftArm', 'LeftForeArm', 'LeftHand', F.scale(0.7).add(R.scale(-0.35)).add(U.scale(-0.1)), tubeEnd);
  aim(a, 'RightArm', 'RightForeArm', 'RightHand', F.scale(0.5).add(R.scale(0.6)).add(U.scale(-0.25)), eye.add(F.scale(0.15)).add(U.scale(-0.04)));
  const tube = BABYLON.MeshBuilder.CreateCylinder(idPrefix + ' spyglass', { diameter: 0.05, height: 0.45, tessellation: 10 }, scene);
  tube.position = eye.add(R.scale(0.03)).add(F.scale(0.225));
  tube.rotationQuaternion = BABYLON.Quaternion.FromUnitVectorsToRef(BABYLON.Axis.Y, F, new BABYLON.Quaternion());
  tube.material = mat;
  tube.setParent(a);
  tube.metadata = { actor: a };
  return tube;
}
