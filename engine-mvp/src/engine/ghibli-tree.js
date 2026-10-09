// Ghibli trees (after Lightning Boy Studio's "Ghibli Trees in 3D"): the crown is a few smooth blobs
// covered in leaf cards. The trick is NORMAL TRANSFER: every card is lit with the normal of its blob, not
// its own flat face, so the crown shades as soft round masses through a toon ramp, while the cards'
// painted, scalloped edges give the hand-made outline. All cards of a tree are one mesh (one draw call);
// each card is 4 vertices sharing its centre and is turned to face the camera in the vertex shader.
/* global BABYLON */
'use strict';

(() => {
  const mvp = window.__mvp;
  const scene = mvp.scene;

  BABYLON.Effect.ShadersStore.leafCardVertexShader = `
    precision highp float;
    attribute vec3 position;   // card centre (all 4 corners share it)
    attribute vec3 normal;     // the BLOB's normal at this card: the transferred normal
    attribute vec2 uv;         // corner -1..1
    attribute vec2 uv2;        // size (m), rotation
    uniform mat4 world;
    uniform mat4 view;
    uniform mat4 viewProjection;
    varying vec3 vN;
    varying vec2 vCorner;
    varying float vSeed;
    void main(void) {
      vec3 c = (world * vec4(position, 1.0)).xyz;
      vec3 right = vec3(view[0][0], view[1][0], view[2][0]);
      vec3 up = vec3(view[0][1], view[1][1], view[2][1]);
      float s = sin(uv2.y), co = cos(uv2.y);
      vec2 r = vec2(uv.x * co - uv.y * s, uv.x * s + uv.y * co);
      vec3 p = c + (right * r.x + up * r.y) * uv2.x;
      vN = normalize((world * vec4(normal, 0.0)).xyz);
      vCorner = uv;
      vSeed = fract(position.x * 12.9898 + position.y * 78.233 + position.z * 37.719);
      gl_Position = viewProjection * vec4(p, 1.0);
    }`;

  BABYLON.Effect.ShadersStore.leafCardFragmentShader = `
    precision highp float;
    varying vec3 vN;
    varying vec2 vCorner;
    varying float vSeed;
    uniform vec3 toSun;
    uniform vec3 toCam;
    uniform float lightK;      // time of day
    uniform vec3 hiC;
    uniform vec3 midC;
    uniform vec3 shC;
    uniform vec3 deepC;
    void main(void) {
      // a painted leaf clump: a scalloped blob with a ragged edge
      float a = atan(vCorner.y, vCorner.x);
      float r = length(vCorner);
      float edge = 0.78 + 0.11 * sin(a * 7.0 + vSeed * 40.0) + 0.06 * sin(a * 13.0 + vSeed * 90.0);
      if (r > edge) discard;
      // toon ramp over the transferred (blob) normal
      float ndl = dot(normalize(vN), normalize(toSun)) + (vSeed - 0.5) * 0.12;
      vec3 col = ndl > 0.45 ? hiC : ndl > 0.1 ? mix(midC, hiC, smoothstep(0.37, 0.45, ndl))
               : ndl > -0.25 ? mix(shC, midC, smoothstep(0.02, 0.1, ndl)) : mix(deepC, shC, smoothstep(-0.33, -0.25, ndl));
      // backlit rim: the crown edge glows where the sun is behind it
      float rim = pow(1.0 - max(dot(normalize(vN), normalize(toCam)), 0.0), 3.0) * max(0.0, -dot(normalize(toCam), normalize(toSun)) + 0.3);
      col += rim * 0.25 * vec3(0.9, 1.0, 0.6);
      // each clump slightly darker at its lower inner edge: overlapping clumps read as layers
      col *= 0.9 + 0.1 * smoothstep(-0.8, 0.6, vCorner.y);
      gl_FragColor = vec4(col * lightK, 1.0);
    }`;

  const PALETTES = {
    round: { hi: '#a8cf6a', mid: '#6f9f45', sh: '#3f6e36', deep: '#264a2c' },
    tall: { hi: '#8fbf63', mid: '#5c8e44', sh: '#355f35', deep: '#1f3d2a' },
  };
  const materials = [];

  function leafMaterial(pal) {
    const m = new BABYLON.ShaderMaterial('tree-leaves', scene, { vertex: 'leafCard', fragment: 'leafCard' }, {
      attributes: ['position', 'normal', 'uv', 'uv2'],
      uniforms: ['world', 'view', 'viewProjection', 'toSun', 'toCam', 'lightK', 'hiC', 'midC', 'shC', 'deepC'],
    });
    m.setColor3('hiC', BABYLON.Color3.FromHexString(pal.hi));
    m.setColor3('midC', BABYLON.Color3.FromHexString(pal.mid));
    m.setColor3('shC', BABYLON.Color3.FromHexString(pal.sh));
    m.setColor3('deepC', BABYLON.Color3.FromHexString(pal.deep));
    m.backFaceCulling = false;
    materials.push(m);
    return m;
  }

  // crown blobs (centre, radius) for a tree of the given height
  function crownBlobs(kind, rand, H) {
    const blobs = [];
    if (kind === 'tall') {
      for (let i = 0; i < 5; i++) {
        const k = i / 4;
        blobs.push([(rand() - 0.5) * 0.6, H * (0.38 + 0.55 * k), (rand() - 0.5) * 0.6, H * (0.2 - 0.09 * k) * (0.85 + rand() * 0.3)]);
      }
    } else {
      blobs.push([0, H * 0.68, 0, H * 0.3]);
      const n = 5 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand() * 0.5;
        const up = rand();
        blobs.push([Math.cos(a) * H * 0.26, H * (0.55 + 0.3 * up), Math.sin(a) * H * 0.26, H * (0.17 + rand() * 0.08)]);
      }
    }
    return blobs;
  }

  function buildLeafMesh(blobs, rand, H) {
    const pos = [], nrm = [], uv = [], uv2 = [], idx = [];
    let v = 0;
    blobs.forEach(([bx, by, bz, br]) => {
      const cards = Math.round(40 + br * 30);
      for (let i = 0; i < cards; i++) {
        // spread over the blob surface (Fibonacci-ish), a little inside it
        const y = 1 - 2 * (i + 0.5) / cards;
        const rr = Math.sqrt(1 - y * y);
        const th = i * 2.39996 + rand() * 0.4;
        const n = [Math.cos(th) * rr, y, Math.sin(th) * rr];
        if (n[1] < -0.55 && rand() < 0.7) continue;          // fewer cards under the crown
        const d = br * (0.82 + rand() * 0.18);
        const c = [bx + n[0] * d, by + n[1] * d, bz + n[2] * d];
        const size = br * (0.32 + rand() * 0.18) + H * 0.02;
        const rot = rand() * Math.PI * 2;
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([cx, cy]) => {
          pos.push(...c); nrm.push(...n); uv.push(cx, cy); uv2.push(size, rot);
        });
        idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
        v += 4;
      }
    });
    const mesh = new BABYLON.Mesh('tree-leaves', scene);
    const vd = new BABYLON.VertexData();
    vd.positions = pos; vd.normals = nrm; vd.uvs = uv; vd.uvs2 = uv2; vd.indices = idx;
    vd.applyToMesh(mesh);
    mesh.alwaysSelectAsActiveMesh = true; // corners are pushed out in the shader; the CPU box only sees centres
    return mesh;
  }

  function buildTrunk(kind, rand, H, blobs) {
    const bark = mvp.buildingMaterial('#5a4330');
    const parts = [];
    const trunkH = H * (kind === 'tall' ? 0.75 : 0.6);
    const trunk = BABYLON.MeshBuilder.CreateCylinder('trunk', { height: trunkH, diameterTop: H * 0.035, diameterBottom: H * 0.08, tessellation: 8 }, scene);
    trunk.position.y = trunkH / 2;
    trunk.material = bark;
    parts.push(trunk);
    // a few branches reaching into the outer blobs
    blobs.slice(1, 4).forEach(([bx, by, bz]) => {
      const from = new BABYLON.Vector3(0, trunkH * (0.6 + rand() * 0.25), 0);
      const to = new BABYLON.Vector3(bx * 0.75, by * 0.92, bz * 0.75);
      const len = BABYLON.Vector3.Distance(from, to);
      const br = BABYLON.MeshBuilder.CreateCylinder('tree-branch', { height: len, diameterTop: H * 0.012, diameterBottom: H * 0.03, tessellation: 6 }, scene);
      br.position = from.add(to).scale(0.5);
      const dir = to.subtract(from).normalize();
      br.rotationQuaternion = BABYLON.Quaternion.FromUnitVectorsToRef(BABYLON.Axis.Y, dir, new BABYLON.Quaternion());
      br.material = bark;
      parts.push(br);
    });
    return parts;
  }

  function buildTree(kind) {
    const rand = Math.random;
    const H = kind === 'tall' ? 9 + rand() * 4 : 6 + rand() * 3;
    const blobs = crownBlobs(kind, rand, H);
    const leaves = buildLeafMesh(blobs, rand, H);
    leaves.material = leafMaterial(PALETTES[kind]);
    return [...buildTrunk(kind, rand, H, blobs), leaves];
  }

  // per frame: the real sun, the camera direction for the rim, and the time-of-day light level
  const sun = scene.lights.find((l) => l instanceof BABYLON.DirectionalLight);
  scene.onBeforeRenderObservable.add(() => {
    if (!materials.length) return;
    const toSun = sun ? sun.direction.scale(-1).normalize() : new BABYLON.Vector3(0.4, 1, 0.3).normalize();
    const cam = scene.activeCamera;
    const toCam = cam.position.subtract(cam.getTarget()).normalize();
    const k = sun ? Math.min(1.15, 0.45 + sun.intensity * 0.4) : 1;
    materials.forEach((m) => { m.setVector3('toSun', toSun); m.setVector3('toCam', toCam); m.setFloat('lightK', k); });
  });

  // keep leaf cards out of the depth pass (their quads would get outlined), and the branches inside the
  // crown too (otherwise the ink pass outlines them straight through the leaves); colour edges still ink
  scene.onBeforeRenderObservable.add(() => {
    const g = scene.geometryBufferRenderer;
    if (g && g.renderList) g.renderList = g.renderList.filter((m) => m.name !== 'tree-leaves' && m.name !== 'tree-branch');
  });

  [['Tree (Ghibli, round)', 'round'], ['Tree (Ghibli, tall)', 'tall']].forEach(([name, kind]) => {
    const item = { name, build: () => buildTree(kind) };
    mvp.CATALOG.push(item);
    const b = document.createElement('button');
    b.textContent = name;
    b.onclick = () => mvp.addFromCatalog(item);
    document.getElementById('models').appendChild(b);
  });
})();
