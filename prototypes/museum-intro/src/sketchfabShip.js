import * as THREE from 'three';
import { classifyRigging, KIND } from './rigging.js';

// The Sketchfab "dutch ship large" (CC BY 4.0, TegnoGenial) has three meshes (hull, rigging, sails), no UVs and no
// per-part materials. To dress it in the v4 per-material ink tiles (world.js SHIP_MATS) we, once at load:
//   1. split every mesh into its pieces and classify them (rigging.js: spar / rope / block),
//   2. sort its triangles into one draw group per material (hull: side, deck, rope; rigging: spar, rope, block),
//   3. give it UVs in model units, the convention of tools/build_ship.py: planar for flat timber and cloth
//      (by the vertex normal's main axis), (along, around) for spars and ropes.
// ponytail: planar UVs per vertex normal stretch where the welded hull turns a corner; fine at this distance.
// A real unwrap (Blender, smart project) is the upgrade if close-ups show it.

const SLOTS = {
  hull: ['wood_hull', 'wood_deck', 'rope'],
  rigging: ['spar', 'rope', 'block'],
  sails: ['sail'],
};

export const meshKind = (materialName) => (materialName.includes('sails') ? 'sails' : materialName.includes('rigging') ? 'rigging' : 'hull');

const DECK_UP = 0.7; // face normal y above this on the hull = deck planks

function triSlot(kind, geo, idx, t) {
  if (kind === 'sails') return 0;
  const k = geo.attributes.aKind.getX(idx[t]);
  if (kind === 'rigging') return k === KIND.spar ? 0 : k === KIND.rope ? 1 : 2;
  if (k === KIND.rope) return 2;
  const p = geo.attributes.position;
  const a = new THREE.Vector3().fromBufferAttribute(p, idx[t]);
  const n = new THREE.Vector3().fromBufferAttribute(p, idx[t + 1]).sub(a)
    .cross(new THREE.Vector3().fromBufferAttribute(p, idx[t + 2]).sub(a)).normalize();
  return Math.abs(n.y) > DECK_UP ? 1 : 0;
}

// reorder the index so each slot's triangles are contiguous, one draw group per slot
function groupBySlot(kind, geo) {
  const idx = geo.index.array;
  const buckets = SLOTS[kind].map(() => []);
  for (let t = 0; t < idx.length; t += 3) buckets[triSlot(kind, geo, idx, t)].push(idx[t], idx[t + 1], idx[t + 2]);
  const out = new (idx.constructor)(idx.length);
  let start = 0;
  geo.clearGroups();
  buckets.forEach((b, i) => {
    out.set(b, start);
    if (b.length) geo.addGroup(start, b.length, i);
    start += b.length;
  });
  geo.setIndex(new THREE.BufferAttribute(out, 1));
}

function modelUvs(kind, geo, s) {
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  const p = new THREE.Vector3(), n = new THREE.Vector3(), ax = new THREE.Vector3();
  const ref = new THREE.Vector3(0.31, 0.53, 0.79);
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).multiplyScalar(s);
    n.fromBufferAttribute(nor, i);
    const k = kind === 'sails' ? -1 : geo.attributes.aKind.getX(i);
    const tube = kind === 'rigging' ? k !== KIND.block : k === KIND.rope;
    if (tube) {
      ax.fromBufferAttribute(geo.attributes.aAxis, i);
      const b = ax.clone().cross(ref).normalize(), c = ax.clone().cross(b);
      const around = Math.atan2(n.dot(c), n.dot(b)) / (2 * Math.PI) + 0.5;
      // spar: grain along, ~2 units round a mast; rope: one lay tile per ~0.4 units, once round
      const rope = k === KIND.rope;
      uv[i * 2] = p.dot(ax) / (rope ? 0.4 : 1);
      uv[i * 2 + 1] = around * (rope ? 1 : 2);
      continue;
    }
    const [x, y, z] = [Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)];
    const [u, v] = y >= x && y >= z ? [p.x, p.z] : z >= x ? [p.x, p.y] : [p.z, p.y]; // planks along the ship (x)
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// ink.js: aPart 0.02..0.47 = solid timber (bold contours), 0.5..0.97 = rigging (thin lines)
function remapParts(geo) {
  const part = geo.attributes.aPart, kind = geo.attributes.aKind;
  for (let i = 0; i < part.count; i++) {
    const id = part.getX(i); // 0.05..0.95
    part.setX(i, kind.getX(i) === KIND.rope ? 0.5 + id * 0.47 : 0.02 + id * 0.45);
  }
}

// prepares one Sketchfab mesh in place; returns the SHIP_MATS names of its draw groups
export function prepareSketchfabMesh(mesh) {
  const kind = meshKind(mesh.material.name);
  const geo = mesh.geometry;
  const s = mesh.scale.x; // mesh-local -> model units (the glTF's two root rotations cancel)
  if (kind !== 'sails') {
    classifyRigging(geo, s, kind === 'hull' ? { ropeR2: 0.018, blocks: false } : {});
    remapParts(geo);
  }
  modelUvs(kind, geo, s);
  groupBySlot(kind, geo);
  return { kind, slots: SLOTS[kind] };
}
