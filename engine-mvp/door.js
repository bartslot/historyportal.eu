// Doors and gates that snap onto walls and punch a hole in them.
// Building surfaces (houses, procedural and OSM towns) use one small toon shader that also knows the
// opening boxes of all doors: wall pixels inside an opening are discarded, so you look through the wall
// exactly where the door is. The opening follows the door every frame (drag it, animate it, it moves).
// Characters and props keep their own materials, so nothing walking through a doorway is ever cut.
/* global BABYLON */
'use strict';

(() => {
  const mvp = window.__mvp;
  const scene = mvp.scene;
  const MAX_HOLES = 16;

  // ---------- building toon material with holes ----------
  BABYLON.Effect.ShadersStore.buildingVertexShader = `
    precision highp float;
    attribute vec3 position;
    attribute vec3 normal;
    uniform mat4 world;
    uniform mat4 viewProjection;
    varying vec3 vPosW;
    varying vec3 vNormalW;
    void main(void) {
      vec4 wp = world * vec4(position, 1.0);
      vPosW = wp.xyz;
      vNormalW = normalize((world * vec4(normal, 0.0)).xyz);
      gl_Position = viewProjection * wp;
    }`;
  BABYLON.Effect.ShadersStore.buildingFragmentShader = `
    precision highp float;
    varying vec3 vPosW;
    varying vec3 vNormalW;
    uniform vec3 color;
    uniform vec3 sunDir;      // direction the light travels
    uniform float toon;       // 1 = banded light, 0 = smooth
    uniform float holeCount;
    uniform mat4 holes[${MAX_HOLES}];   // world -> unit box of each opening
    void main(void) {
      for (int i = 0; i < ${MAX_HOLES}; i++) {
        if (float(i) >= holeCount) break;
        vec3 l = (holes[i] * vec4(vPosW, 1.0)).xyz;
        if (abs(l.x) < 0.5 && abs(l.y) < 0.5 && abs(l.z) < 0.5) discard;
      }
      vec3 n = normalize(vNormalW);
      if (!gl_FrontFacing) n = -n;              // inside faces seen through an opening
      float ndl = max(dot(n, -sunDir), 0.0);
      float lit = toon > 0.5 ? (ndl > 0.55 ? 1.0 : (ndl > 0.15 ? 0.72 : 0.5)) : 0.5 + 0.5 * ndl;
      gl_FragColor = vec4(color * (0.35 + 0.75 * lit), 1.0);
    }`;

  const materials = [];
  const sun = scene.lights.find((l) => l instanceof BABYLON.DirectionalLight);
  function buildingMaterial(hex) {
    const m = new BABYLON.ShaderMaterial('building-' + hex, scene, { vertex: 'building', fragment: 'building' }, {
      attributes: ['position', 'normal'],
      uniforms: ['world', 'viewProjection', 'color', 'sunDir', 'toon', 'holeCount', 'holes'],
    });
    m.setColor3('color', BABYLON.Color3.FromHexString(hex));
    m.backFaceCulling = false; // through an opening you see the inside of the far wall
    materials.push(m);
    return m;
  }

  // ---------- the openings ----------
  const holeArray = new Float32Array(16 * MAX_HOLES);
  const tmp = new BABYLON.Matrix();
  scene.onBeforeRenderObservable.add(() => {
    const doors = mvp.actors.filter((a) => a.metadata.opening);
    let n = 0;
    doors.slice(0, MAX_HOLES).forEach((d) => {
      const o = d.metadata.opening;
      // opening box in the door's own space: centred on the wall plane, standing on the floor
      const local = BABYLON.Matrix.Compose(new BABYLON.Vector3(o.w, o.h, o.depth), BABYLON.Quaternion.Identity(), new BABYLON.Vector3(0, o.h / 2, 0));
      local.multiplyToRef(d.computeWorldMatrix(true), tmp);
      tmp.invert();
      tmp.copyToArray(holeArray, n * 16);
      n++;
    });
    const toon = document.getElementById('lookOn').checked && document.getElementById('lookToon').checked ? 1 : 0;
    const dir = sun ? sun.direction.normalizeToNew() : new BABYLON.Vector3(-0.4, -1, -0.3).normalize();
    materials.forEach((m) => {
      m.setFloat('holeCount', n);
      m.setMatrices('holes', holeArray);
      m.setVector3('sunDir', dir);
      m.setFloat('toon', toon);
    });
  });

  // ---------- door and gate assets (basic shapes) ----------
  function flat(hex) {
    const m = new BABYLON.StandardMaterial('door-' + hex, scene);
    m.diffuseColor = BABYLON.Color3.FromHexString(hex);
    m.specularColor = BABYLON.Color3.Black();
    return m;
  }
  function part(name, w, h, d, x, y, z, hex) {
    const b = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    b.position.set(x, y, z);
    b.material = flat(hex);
    return b;
  }
  // local frame: x along the wall, y up, z out of the wall (wall plane at z = 0)
  function buildDoor() {
    const W = 1.1, H = 2.2, T = 0.12;
    return [
      part('frame-l', T, H + T, 0.3, -W / 2 - T / 2, (H + T) / 2, 0, '#5a3d24'),
      part('frame-r', T, H + T, 0.3, W / 2 + T / 2, (H + T) / 2, 0, '#5a3d24'),
      part('frame-top', W + 2 * T, T, 0.3, 0, H + T / 2, 0, '#5a3d24'),
      part('leaf', W, H, 0.06, 0, H / 2, -0.08, '#7a5232'),
      part('handle', 0.06, 0.18, 0.08, W / 2 - 0.15, 1.05, 0.0, '#2b2b2b'),
    ];
  }
  function buildGate() {
    const W = 3.2, H = 4.0;
    const leafL = part('leaf-l', W / 2 - 0.05, H - 0.4, 0.1, -W / 4, (H - 0.4) / 2, -0.2, '#6b4a2b');
    const leafR = part('leaf-r', W / 2 - 0.05, H - 0.4, 0.1, W / 4, (H - 0.4) / 2, -0.2, '#6b4a2b');
    leafL.rotation.y = 0.5; // gate leaves stand half open
    leafR.rotation.y = -0.5;
    return [
      part('post-l', 0.6, H + 0.6, 1.8, -W / 2 - 0.3, (H + 0.6) / 2, 0, '#9b9488'),
      part('post-r', 0.6, H + 0.6, 1.8, W / 2 + 0.3, (H + 0.6) / 2, 0, '#9b9488'),
      part('lintel', W + 1.2, 0.6, 1.8, 0, H + 0.3, 0, '#9b9488'),
      leafL, leafR,
    ];
  }

  // opening = what is cut out of the wall; depth = how thick a wall it cuts through (both faces of a thin
  // box wall are inside it, the far side of a house is not)
  const ITEMS = [
    { name: 'Door', build: buildDoor, opening: { w: 1.1, h: 2.2, depth: 0.8 } },
    { name: 'Gate', build: buildGate, opening: { w: 3.2, h: 4.0, depth: 2.4 } },
  ];

  // ---------- snapping onto walls while placing / dragging ----------
  const isWall = (m) => m.material && materials.includes(m.material);
  mvp.wallSnap = (actor) => {
    if (!actor.metadata.opening) return false;
    const pick = scene.pick(scene.pointerX, scene.pointerY, (m) => isWall(m) && m.isEnabled());
    if (!pick || !pick.hit) return false;
    const n = pick.getNormal(true, true);
    if (!n || Math.abs(n.y) > 0.4) return false;         // only vertical faces are walls
    const out = new BABYLON.Vector3(n.x, 0, n.z).normalize();
    actor.position.set(pick.pickedPoint.x, 0, pick.pickedPoint.z);
    actor.rotationQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, Math.atan2(out.x, out.z));
    return true;
  };

  ITEMS.forEach((item) => {
    const entry = {
      name: item.name,
      build: item.build,
      onCreate: (root) => { root.metadata.opening = { ...item.opening }; },
    };
    mvp.CATALOG.push(entry);
    const b = document.createElement('button');
    b.textContent = item.name + ' (snaps to walls)';
    b.onclick = () => mvp.addFromCatalog(entry);
    document.getElementById('models').appendChild(b);
  });

  window.__door = { buildingMaterial, materials };
  mvp.buildingMaterial = buildingMaterial;
})();
