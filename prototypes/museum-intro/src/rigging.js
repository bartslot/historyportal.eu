import * as THREE from 'three';

// The model's rigging is one mesh: masts, yards, every rope, every block. To draw it like the TARGET (honey spars,
// tan ropes thick enough to show their twist, dark blocks, a line between each part) we split it into its parts once
// at load: weld vertices by position, find connected pieces, and classify each by its shape (principal axes):
//   spar = wide in its middle axis (masts, yards, boards), rope = thin both ways, block = small and compact.
// Per vertex this adds aKind (0 spar, 1 rope, 2 block), aPart (a per-piece id for the ink pass) and aAxis (the piece's
// long axis: spar grain and rope twist run along it, stable per piece instead of guessed per pixel). The shaders use
// aKind to push ropes out along their normals (the model's ropes are hair-thin and could only read as wire).
// Radial scaling on the CPU was tried and dropped: deadeyes and rope webs came out as blobs and sheets.

export const KIND = { spar: 0, rope: 1, block: 2 };
// eigenvalues (desc) of a symmetric 3x3 covariance [xx, xy, xz, yy, yz, zz]
function principal(c) {
  const [a, b, cc, d, e, f] = c;
  const p1 = b * b + cc * cc + e * e;
  const q = (a + d + f) / 3;
  const p2 = (a - q) ** 2 + (d - q) ** 2 + (f - q) ** 2 + 2 * p1;
  const p = Math.sqrt(p2 / 6) || 1e-12;
  const B = [(a - q) / p, b / p, cc / p, (d - q) / p, e / p, (f - q) / p];
  const det = B[0] * (B[3] * B[5] - B[4] * B[4]) - B[1] * (B[1] * B[5] - B[4] * B[2]) + B[2] * (B[1] * B[4] - B[3] * B[2]);
  const phi = Math.acos(Math.min(1, Math.max(-1, det / 2))) / 3;
  const l1 = q + 2 * p * Math.cos(phi);
  const l3 = q + 2 * p * Math.cos(phi + (2 * Math.PI) / 3);
  const l2 = 3 * q - l1 - l3;
  return [l1, l2, l3].map((x) => Math.max(x, 0));
}

// unit eigenvector of the largest eigenvalue l1: the longest cross product of two rows of (C - l1 I)
function mainAxis(c, l1) {
  const [a, b, cc, d, e, f] = c;
  const r = [new THREE.Vector3(a - l1, b, cc), new THREE.Vector3(b, d - l1, e), new THREE.Vector3(cc, e, f - l1)];
  const cands = [r[0].clone().cross(r[1]), r[0].clone().cross(r[2]), r[1].clone().cross(r[2])];
  const best = cands.reduce((m, v) => (v.lengthSq() > m.lengthSq() ? v : m));
  return best.lengthSq() > 0 ? best.normalize() : new THREE.Vector3(0, 1, 0);
}

function pieces(geo) {
  const pos = geo.attributes.position;
  const n = pos.count;
  const canon = new Int32Array(n);
  const seen = new Map();
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(pos.getX(i) * 2e4)},${Math.round(pos.getY(i) * 2e4)},${Math.round(pos.getZ(i) * 2e4)}`;
    if (!seen.has(k)) seen.set(k, i);
    canon[i] = seen.get(k);
  }
  const parent = Int32Array.from({ length: n }, (_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) x = parent[x] = parent[parent[x]];
    return x;
  };
  const idx = geo.index.array;
  for (let i = 0; i < idx.length; i += 3) {
    const a = find(canon[idx[i]]);
    parent[find(canon[idx[i + 1]])] = a;
    parent[find(canon[idx[i + 2]])] = a;
  }
  const groups = new Map();
  const ofVertex = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const r = find(canon[i]);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(i);
  }
  const list = [...groups.values()];
  list.forEach((vs, gi) => vs.forEach((i) => (ofVertex[i] = gi)));
  return { list, ofVertex };
}

// Typical tube radius of each piece: along every triangle edge whose normals turn, radius ~ |dp| / |dn|. Its median
// tells a rope (a few cm) from timber, even when the piece is a whole web of shrouds and ratlines.
function tubeRadii(geo, { list, ofVertex }) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, idx = geo.index.array;
  const samples = list.map(() => []);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), na = new THREE.Vector3(), nb = new THREE.Vector3();
  for (let t = 0; t < idx.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const i = idx[t + e], j = idx[t + ((e + 1) % 3)];
      const dn = na.fromBufferAttribute(nor, i).distanceTo(nb.fromBufferAttribute(nor, j));
      if (dn < 0.2) continue;
      samples[ofVertex[i]].push(a.fromBufferAttribute(pos, i).distanceTo(b.fromBufferAttribute(pos, j)) / dn);
    }
  }
  return samples.map((s) => (s.length ? s.sort((x, y) => x - y)[s.length >> 1] : Infinity));
}

// scale: mesh-local -> model units (the classification thresholds are in model units, ~1.2 m each).
// The hull mesh also carries shrouds and ratlines at the chains: there only very thin pieces are rope (its rails and
// balusters are slim too) and nothing is a block.
export function classifyRigging(geo, scale, { ropeR2 = 0.05, blocks = true } = {}) {
  const pos = geo.attributes.position;
  const kind = new Float32Array(pos.count);
  const part = new Float32Array(pos.count);
  const axes = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const counts = { spar: 0, rope: 0, block: 0 };
  const pc = pieces(geo);
  const radii = tubeRadii(geo, pc);
  pc.list.forEach((vs, pi) => {
    const m = new THREE.Vector3();
    for (const i of vs) m.add(v.fromBufferAttribute(pos, i));
    m.divideScalar(vs.length);
    const c = [0, 0, 0, 0, 0, 0];
    for (const i of vs) {
      v.fromBufferAttribute(pos, i).sub(m);
      c[0] += v.x * v.x; c[1] += v.x * v.y; c[2] += v.x * v.z; c[3] += v.y * v.y; c[4] += v.y * v.z; c[5] += v.z * v.z;
    }
    const cov = c.map((x) => x / vs.length);
    const l = principal(cov);
    const axis = mainAxis(cov, l[0]);
    const length = Math.sqrt(l[0]) * 3.46 * scale; // uniform spread -> full length
    // r2 (the middle axis), not r3: a flat board (cross-trees, cap) is thin one way but wide the other, and is wood
    const r2 = Math.sqrt(l[1]) * scale, r3 = Math.sqrt(l[2]) * scale;
    // a shroud + ratline web is wide too, but its tubes are only rope thick: rope
    // ponytail: flat ribbons (no normal ever turns) with many vertices = this model's ratline webs; boxes with split
    // normals are small. A model with flat-shaded big timbers would need a real thickness test here.
    const tube = radii[pi] === Infinity && vs.length > 300 ? 0 : radii[pi] * scale;
    const k = blocks && length < 0.7 && r2 > 0.025 && r3 > 0.012 ? 'block' : r2 > ropeR2 && r3 > 0.02 && tube > 0.03 ? 'spar' : 'rope';
    counts[k]++;
    if (k === 'spar') (counts.dbg ??= []).push([vs.length, +length.toFixed(2), +r2.toFixed(3), +r3.toFixed(3), +tube.toFixed(3)]);
    const id = ((pi * 0.618034) % 1) * 0.9 + 0.05;
    for (const i of vs) {
      kind[i] = KIND[k];
      part[i] = id;
      axes.set([axis.x, axis.y, axis.z], i * 3);
    }
  });
  geo.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
  geo.setAttribute('aPart', new THREE.BufferAttribute(part, 1));
  geo.setAttribute('aAxis', new THREE.BufferAttribute(axes, 3));
  return counts;
}
