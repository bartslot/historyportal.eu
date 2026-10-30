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
  const byHex = {};
  const sun = scene.lights.find((l) => l instanceof BABYLON.DirectionalLight);
  function buildingMaterial(hex) {
    if (byHex[hex]) return byHex[hex];
    const m = new BABYLON.ShaderMaterial('building-' + hex, scene, { vertex: 'building', fragment: 'building' }, {
      attributes: ['position', 'normal'],
      uniforms: ['world', 'viewProjection', 'color', 'sunDir', 'toon', 'holeCount', 'holes'],
    });
    m.setColor3('color', BABYLON.Color3.FromHexString(hex));
    m.backFaceCulling = false; // through an opening you see the inside of the far wall
    materials.push(m);
    byHex[hex] = m;
    return m;
  }

  // ---------- the openings ----------
  const holeMatrices = Array.from({ length: MAX_HOLES }, () => BABYLON.Matrix.Identity()); // reused every frame
  scene.onBeforeRenderObservable.add(() => {
    const doors = mvp.actors.filter((a) => a.metadata.opening);
    let n = 0;
    doors.slice(0, MAX_HOLES).forEach((d) => {
      const o = d.metadata.opening;
      // opening box in the door's own space: centred on the wall plane, standing on the floor
      const local = BABYLON.Matrix.Compose(new BABYLON.Vector3(o.w, o.h, o.depth), BABYLON.Quaternion.Identity(), new BABYLON.Vector3(0, o.h / 2, 0));
      local.multiplyToRef(d.computeWorldMatrix(true), holeMatrices[n]);
      holeMatrices[n].invert();
      n++;
    });
    const toon = document.getElementById('lookOn').checked && document.getElementById('lookToon').checked ? 1 : 0;
    const dir = sun ? sun.direction.normalizeToNew() : new BABYLON.Vector3(-0.4, -1, -0.3).normalize();
    materials.forEach((m) => {
      m.setFloat('holeCount', n);
      m.setMatrices('holes', holeMatrices);
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
  // local frame: x along the wall, y up, z out of the wall (wall plane at z = 0).
  // Leaves hang on hinges (TransformNodes at their outer edge) so they can swing open.
  function hinge(name, x) {
    const h = new BABYLON.TransformNode(name, scene);
    h.position.x = x;
    return h;
  }
  function buildDoor() {
    const W = 1.1, H = 2.2, T = 0.12;
    const h = hinge('hinge', -W / 2);
    const leaf = part('leaf', W, H, 0.06, W / 2, H / 2, -0.08, '#7a5232');
    const handle = part('handle', 0.06, 0.18, 0.08, W - 0.15, 1.05, 0.0, '#2b2b2b');
    leaf.parent = h; handle.parent = h;
    h.metadata = { swing: -1 };                          // opens inwards, into the house
    return [
      part('frame-l', T, H + T, 0.3, -W / 2 - T / 2, (H + T) / 2, 0, '#5a3d24'),
      part('frame-r', T, H + T, 0.3, W / 2 + T / 2, (H + T) / 2, 0, '#5a3d24'),
      part('frame-top', W + 2 * T, T, 0.3, 0, H + T / 2, 0, '#5a3d24'),
      h,
    ];
  }
  function buildGate() {
    const W = 3.2, H = 4.0, LW = W / 2 - 0.05;
    const hl = hinge('hinge-l', -W / 2);
    const hr = hinge('hinge-r', W / 2);
    part('leaf-l', LW, H - 0.4, 0.1, LW / 2, (H - 0.4) / 2, -0.2, '#6b4a2b').parent = hl;
    part('leaf-r', LW, H - 0.4, 0.1, -LW / 2, (H - 0.4) / 2, -0.2, '#6b4a2b').parent = hr;
    hl.metadata = { swing: -1 };
    hr.metadata = { swing: 1 };
    return [
      part('post-l', 0.6, H + 0.6, 1.8, -W / 2 - 0.3, (H + 0.6) / 2, 0, '#9b9488'),
      part('post-r', 0.6, H + 0.6, 1.8, W / 2 + 0.3, (H + 0.6) / 2, 0, '#9b9488'),
      part('lintel', W + 1.2, 0.6, 1.8, 0, H + 0.3, 0, '#9b9488'),
      hl, hr,
    ];
  }

  // opening = what is cut out of the wall; depth = how thick a wall it cuts through (both faces of a thin
  // box wall are inside it, the far side of a house is not)
  const ITEMS = [
    { name: 'Door', build: buildDoor, opening: { w: 1.1, h: 2.2, depth: 0.8 } },
    { name: 'Gate', build: buildGate, opening: { w: 3.2, h: 4.0, depth: 2.4 } },
  ];

  // ---------- a door is part of a wall ----------
  const isWall = (m) => m.material && materials.includes(m.material) && m.isEnabled();
  const hostOf = (mesh) => (mesh.metadata && mesh.metadata.actor) || null;
  const SNAP_RANGE = 30;              // metres: how far the AI animator looks for a wall

  function poseOnWall(actor, point, normal, host) {
    const out = new BABYLON.Vector3(normal.x, 0, normal.z).normalize();
    actor.setParent(null);
    actor.position.set(point.x, 0, point.z);
    actor.rotationQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, Math.atan2(out.x, out.z));
    if (host && host !== actor) actor.setParent(host);   // the door belongs to its wall: moves and dies with it
    actor.metadata.onWall = true;
    actor.metadata.lastValid = { parent: actor.parent, position: actor.position.clone(), rotation: actor.rotationQuaternion.clone() };
    ghost(actor, false);
  }
  function ghost(actor, invalid) {
    actor.getChildMeshes().forEach((m) => { if (m.name !== 'hitbox') m.visibility = invalid ? 0.4 : 1; });
  }

  // while placing or dragging: on a wall it snaps on; anywhere else it follows the cursor, see-through,
  // and cannot be dropped there
  mvp.placeHooks.push((actor) => {
    if (!actor.metadata.opening) return false;
    const pick = scene.pick(scene.pointerX, scene.pointerY, isWall);
    const n = pick && pick.hit ? pick.getNormal(true, true) : null;
    if (n && Math.abs(n.y) < 0.4) { poseOnWall(actor, pick.pickedPoint, n, hostOf(pick.pickedMesh)); return true; }
    const floor = scene.pick(scene.pointerX, scene.pointerY, (m) => m.name === 'ground');
    actor.setParent(null);
    if (floor && floor.hit) actor.position.set(floor.pickedPoint.x, 0, floor.pickedPoint.z);
    actor.metadata.onWall = false;
    ghost(actor, true);
    return true;
  });
  mvp.dropGuards.push((actor) => !actor.metadata.opening || actor.metadata.onWall);
  mvp.onInvalidDrop = (actor) => {
    const v = actor.metadata.lastValid;
    if (!v) return false;                                  // never was on a wall: caller cancels it
    actor.setParent(null);
    actor.position.copyFrom(v.position);
    actor.rotationQuaternion = v.rotation.clone();
    if (v.parent) actor.parent = v.parent;
    actor.metadata.onWall = true;
    ghost(actor, false);
    return true;
  };

  // AI animator: put the door on the nearest wall around (x, z); false when there is none
  mvp.snapToNearestWall = (actor) => {
    const from = actor.getAbsolutePosition().add(new BABYLON.Vector3(0, 1.2, 0));
    let best = null;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const hit = scene.pickWithRay(new BABYLON.Ray(from, new BABYLON.Vector3(Math.cos(a), 0, Math.sin(a)), SNAP_RANGE), isWall);
      if (hit && hit.hit && (!best || hit.distance < best.distance)) best = hit;
    }
    if (!best) return false;
    const n = best.getNormal(true, true);
    if (!n || Math.abs(n.y) > 0.4) return false;
    poseOnWall(actor, best.pickedPoint, n, hostOf(best.pickedMesh));
    return true;
  };

  // ---------- open / closed, on the timeline (so it is in the baked MP4 too) ----------
  const SWING_FRAMES = 18;            // 0.6 s at 30 fps
  const OPEN_ANGLE = 1.75;            // radians, about 100 degrees
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2); // in-out: a door is pushed, then settles
  // a key means "fully open/closed AT this frame"; the swing happens in the SWING_FRAMES before it,
  // so the state you set is exactly what you see at the playhead
  function openAt(actor, frame) {
    const keys = actor.metadata.doorKeys || [];
    let state = 0;
    for (const k of keys) {
      if (frame >= k.frame) { state = k.open; continue; }
      const t = (frame - (k.frame - SWING_FRAMES)) / SWING_FRAMES;
      if (t > 0) state += (k.open - state) * ease(t);
      break;
    }
    return state;
  }
  const PREVIEW_MS = 600; // while editing, a click also plays the swing live
  scene.onBeforeRenderObservable.add(() => {
    const f = mvp.getFrame();
    mvp.actors.forEach((a) => {
      if (!a.metadata.opening) return;
      let o = openAt(a, f);
      const tw = a.metadata.tween;
      if (tw && !mvp.isPlaying()) {
        const k = Math.min(1, (performance.now() - tw.t0) / PREVIEW_MS);
        o = tw.from + (tw.to - tw.from) * ease(k);
        if (k >= 1) a.metadata.tween = null;
      }
      a.getDescendants(false).forEach((n) => { if (n.metadata && n.metadata.swing) n.rotation.y = n.metadata.swing * o * OPEN_ANGLE; });
    });
  });
  function setDoor(actor, open, frame = mvp.getFrame()) {
    if (!actor || !actor.metadata.opening || !actor.metadata.onWall) return false; // only once it is placed
    actor.metadata.tween = { from: openAt(actor, frame), to: open ? 1 : 0, t0: performance.now() };
    const keys = (actor.metadata.doorKeys || []).filter((k) => k.frame !== frame);
    actor.metadata.doorKeys = [...keys, { frame, open: open ? 1 : 0 }].sort((a, b) => a.frame - b.frame);
    return true;
  }
  mvp.setDoor = setDoor;
  // click a placed door (no drag) to open or close it; O does the same for the selected door
  scene.onPointerObservable.add((info) => {
    if (info.type !== BABYLON.PointerEventTypes.POINTERTAP || info.event.button !== 0) return;
    const m = info.pickInfo && info.pickInfo.pickedMesh;
    const a = m && m.metadata && m.metadata.actor;
    if (a && a.metadata.opening && a.metadata.onWall) setDoor(a, openAt(a, mvp.getFrame()) < 0.5);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'o' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const a = mvp.getSelected();
    if (a && a.metadata.opening) setDoor(a, openAt(a, mvp.getFrame()) < 0.5);
  });

  // ---------- catalog (shown in the asset drawer; a door dropped off a wall is refused there) ----------
  ITEMS.forEach((item) => {
    const entry = {
      name: item.name,
      build: item.build,
      snaps_to: 'wall',
      onCreate: (root) => { root.metadata.opening = { ...item.opening }; root.metadata.doorKeys = []; },
    };
    mvp.CATALOG.push(entry);
  });

  window.__door = { buildingMaterial, materials };
  mvp.buildingMaterial = buildingMaterial;
})();
