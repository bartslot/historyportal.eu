// Hand-made bend: perfectly straight CGI edges are what give 3D away. Every model is subdivided a little
// and its vertices are pushed by smooth noise: walls lean and sag more the higher they go, faces bulge
// gently, edges get a slow curve. The noise lives in the object's own space, so the bend travels with the
// object. Skinned characters are left alone (their deformation is the skeleton's job).
/* global BABYLON */
'use strict';

(() => {
  const mvp = window.__mvp;
  const slider = document.getElementById('lookBend');
  const BASE = 0.14;             // metres of displacement at bend = 1, before the height factor
  const LEAN_PER_M = 1 / 4;      // lean grows with height: a 4 m wall top moves a full BASE

  // smooth 3D value noise, -1..1
  const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
  const fade = (t) => t * t * (3 - 2 * t);
  function noise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const u = fade(x - xi), v = fade(y - yi), w = fade(z - zi);
    const l = (a, b, t) => a + (b - a) * t;
    const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz);
    return 2 * l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
                 l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w) - 1;
  }

  function prepare(mesh) {
    if (mesh.metadata && mesh.metadata.unbent) return true;
    // skinned bodies bend by bones; leaf cards are corner-expanded in their shader (subdividing breaks them)
    if (mesh.skeleton || mesh.name === 'hitbox' || mesh.name.startsWith('sky') || mesh.name === 'tree-leaves' || mesh.name === 'decal' || !mesh.getTotalVertices()) return false;
    const n = mesh.getTotalVertices();
    const perEdge = n < 600 ? 4 : n < 6000 ? 2 : 0; // enough vertices to curve, never an explosion
    try { if (perEdge) mesh.increaseVertices(perEdge); } catch (err) { console.warn('bend: cannot subdivide', mesh.name, err.message); }
    mesh.metadata = { ...(mesh.metadata || {}), unbent: Float32Array.from(mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)) };
    return true;
  }

  // positions are bent in the actor's own frame, so the shape is part of the object, not of the world
  function bendMesh(mesh, root, amount) {
    const src = mesh.metadata.unbent;
    const out = new Float32Array(src.length);
    mesh.computeWorldMatrix(true);
    root.computeWorldMatrix(true);
    const toActor = mesh.getWorldMatrix().multiply(BABYLON.Matrix.Invert(root.getWorldMatrix()));
    const back = BABYLON.Matrix.Invert(toActor);
    const p = new BABYLON.Vector3();
    for (let i = 0; i < src.length; i += 3) {
      p.set(src[i], src[i + 1], src[i + 2]);
      const a = BABYLON.Vector3.TransformCoordinates(p, toActor);      // actor space, metres-ish
      const s = root.scaling.x || 1;
      const x = a.x * s, y = Math.max(0, a.y * s), z = a.z * s;
      const lean = BASE * amount * y * LEAN_PER_M;
      const bulge = BASE * amount * 0.35;
      const dx = lean * noise(x * 0.15, 0.5, z * 0.15) + bulge * noise(x * 0.6, y * 0.6, z * 0.6 + 11);
      const dz = lean * noise(x * 0.15 + 5, 0.5, z * 0.15) + bulge * noise(x * 0.6 + 7, y * 0.6, z * 0.6);
      const dy = bulge * 0.5 * noise(x * 0.6, y * 0.6 + 3, z * 0.6) * (y / (y + 1)); // the floor line stays put
      const bent = new BABYLON.Vector3(a.x + dx / s, a.y + dy / s, a.z + dz / s);
      const m = BABYLON.Vector3.TransformCoordinates(bent, back);
      out[i] = m.x; out[i + 1] = m.y; out[i + 2] = m.z;
    }
    mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, out, false, false);
    const normals = [];
    BABYLON.VertexData.ComputeNormals(out, mesh.getIndices(), normals);
    mesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals, false, false);
    mesh.refreshBoundingInfo();
  }

  function bendActor(root) {
    if (root.metadata && root.metadata.cloud) return;
    const amount = Number(slider.value);
    root.getChildMeshes().forEach((m) => { if (prepare(m)) bendMesh(m, root, amount); });
  }

  let pending = null;
  slider.oninput = () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => mvp.actors.forEach(bendActor));
  };
  mvp.bendActor = bendActor;
})();
