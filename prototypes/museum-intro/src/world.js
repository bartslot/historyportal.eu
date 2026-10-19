import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { HALL } from './museum.js';
import { WIPE, WIPE_GLSL, styledMaterial, outlineMaterial, cardMaterial } from './style.js';

// The world inside the painting, built in real 3D. The painting is only the LAYOUT reference: every object is
// placed on the ray from the painter's eye through the spot where Vroom painted it, at the distance where that
// ray meets the sea. Seen from the eye at the crossfade, the 3D world therefore lines up with the canvas.

export const LAYOUT = {
  horizonV: 0.458, // painting v (up) of the horizon; the painter's eye sits at its height
  eyeAboveSea: 1.15, // world units; sets how far behind the frame everything is
  hero: { u: 0.215, waterV: 0.322, topV: 0.871, yaw: 0.62, sink: 0.6, modelTop: 27.5, centerX: 2.15, brace: 0.55 },
  manHeight: 1.48, // model units (the ship is ~34 model units long, a 1640s ship ~40 m)
  cardMinT: 1.25, // painting cut-outs nearer than this would stand in the hall: dropped
};

export const TASMAN_SHOT = [-1.0, 0.98, -2.3]; // closing camera: model units from Tasman's feet, height in men

export const EYE = new THREE.Vector3(HALL.voc.x, HALL.voc.y + (LAYOUT.horizonV - 0.5) * HALL.voc.h, 4.3);
const planePoint = (u, v) => new THREE.Vector3(HALL.voc.x + (u - 0.5) * HALL.voc.w, HALL.voc.y + (v - 0.5) * HALL.voc.h, 0);
export const SEA_Y = EYE.y - LAYOUT.eyeAboveSea;
const ray = (u, v) => planePoint(u, v).sub(EYE);
const tToSea = (u, v) => (SEA_Y - EYE.y) / ray(u, v).y; // ray parameter (1 = the canvas) where it meets the sea
const along = (u, v, t) => EYE.clone().add(ray(u, v).multiplyScalar(t));

function sky(tex) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { ...WIPE, uP: { value: tex.sky_paint }, uL: { value: tex.sky_lines } },
    vertexShader: `varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uP; uniform sampler2D uL; varying vec3 vDir;
      ${WIPE_GLSL}
      void main() {
        vec3 d = normalize(vDir);
        float elev = asin(clamp(d.y, -1.0, 1.0));
        vec2 uv = vec2(atan(d.x, -d.z) / 3.14159 + 0.5, clamp(elev / 0.62, 0.0, 1.0)); // panorama spans 0..35 deg
        vec3 p = texture2D(uP, uv).rgb, l = texture2D(uL, uv).rgb;
        vec2 w = wipeMask(); // clouds: no ink rim, no outline (History Lines rule)
        gl_FragColor = vec4(mix(p, l, w.x), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(90, 48, 24), mat);
  m.renderOrder = -100;
  return m;
}

function sea(tex) {
  const geo = new THREE.PlaneGeometry(320, 320, 220, 220);
  geo.rotateX(-Math.PI / 2);
  const mat = styledMaterial({
    paint: tex.sea_paint,
    lines: tex.sea_lines,
    mode: 'uv',
    scale: 70,
    tintPaint: [2.3, 1.75, 1.7],
    tintLines: [1, 1, 1],
    lit: 0.5,
    extra: `
      float f = smoothstep(6.0, 70.0, length(vPos.xz - cameraPosition.xz));
      cp = mix(cp, vec3(0.6, 0.62, 0.58), f); cl = mix(cl, vec3(0.78, 0.86, 0.92), f);`,
  });
  // gentle swell: a few long sines, normals from their derivatives
  mat.uniforms.uTime = { value: 0 };
  mat.vertexShader = mat.vertexShader
    .replace('varying vec3 vPos;', 'uniform float uTime; varying vec3 vPos;')
    .replace(
      'vec4 wp = modelMatrix * vec4(position, 1.0);',
      `vec4 wp = modelMatrix * vec4(position, 1.0);
        float a = 0.035, k1 = 0.9, k2 = 1.7;
        wp.y += a * sin(wp.x * k1 + uTime * 0.9) + a * 0.6 * sin(wp.z * k2 - uTime * 1.3 + wp.x * 0.4);
        vec3 swN = normalize(vec3(-a * k1 * cos(wp.x * k1 + uTime * 0.9), 1.0, -a * 0.6 * k2 * cos(wp.z * k2 - uTime * 1.3 + wp.x * 0.4)));`,
    )
    .replace('vN = normalize(mat3(modelMatrix) * normal);', 'vN = swN;');
  const m = new THREE.Mesh(geo, mat);
  m.position.set(EYE.x, SEA_Y, -161); // ends just behind the wall: it must never reach into the hall
  return m;
}

async function heroShip(tex) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync('./assets/world/ship.glb');
  const H = LAYOUT.hero;
  const t = tToSea(H.u, H.waterV);
  const heightWorld = (H.topV - H.waterV) * HALL.voc.h * t;
  const scale = heightWorld / H.modelTop;
  const pivot = new THREE.Group();
  pivot.position.copy(along(H.u, H.waterV, t));
  pivot.position.y = SEA_Y;
  pivot.rotation.y = H.yaw;
  pivot.scale.setScalar(scale);
  const model = gltf.scene;
  model.position.set(-H.centerX, -H.sink, 0);
  pivot.add(model);

  const mats = {
    hull: styledMaterial({ paint: tex.hull_paint, lines: tex.hull_lines, scale: 1.6 / scale / 10, tintPaint: [1.5, 1.6, 1.7], lit: 0.75 }),
    sails: styledMaterial({ paint: tex.sail_paint, lines: tex.sail_lines, scale: 0.7 / scale / 10, tintPaint: [0.85, 0.9, 1.0], lit: 0.7, side: THREE.DoubleSide }),
    rigging: styledMaterial({ paint: tex.hull_paint, lines: tex.hull_lines, scale: 4 / scale / 10, tintPaint: [0.7, 0.62, 0.55], tintLines: [0.75, 0.6, 0.45], lit: 0.4 }),
  };
  const outline = outlineMaterial(0.02);
  const parts = {};
  model.traverse((o) => {
    if (!o.isMesh) return;
    const key = o.material.name.includes('sails') ? 'sails' : o.material.name.includes('rigging') ? 'rigging' : 'hull';
    o.material = mats[key];
    if (!parts[key] || o.geometry.attributes.position.count > parts[key].geometry.attributes.position.count) parts[key] = o;
    const ink = new THREE.Mesh(o.geometry, outline);
    ink.renderOrder = 1;
    o.parent.add(ink);
    ink.position.copy(o.position);
    ink.quaternion.copy(o.quaternion);
    ink.scale.copy(o.scale);
  });
  addSetSails(model, mats.sails, outline);
  pivot.updateMatrixWorld(true);
  return { pivot, parts, scale, t, model };
}

// The model's own sails are mostly furled; Vroom's ships sail with full bellied canvas. Courses and topsails on
// the main (x -1) and fore (x 10) masts, in model units, bellied towards the bow (+x), the foot fuller than the head.
export const SAILS = [
  { x: -1, y0: 7.2, y1: 13.2, w0: 8.6, w1: 9.6, belly: 1.6 },
  { x: -1, y0: 14.0, y1: 19.6, w0: 5.6, w1: 7.6, belly: 1.2 },
  { x: 10, y0: 7.0, y1: 12.4, w0: 7.6, w1: 8.4, belly: 1.4 },
  { x: 10, y0: 13.2, y1: 18.0, w0: 4.8, w1: 6.6, belly: 1.0 }, // the fore topsail: the figure lands on its yard
];

function addSetSails(model, mat, outline) {
  for (const s of SAILS) {
    const geo = new THREE.PlaneGeometry(1, 1, 16, 12);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) + 0.5; // across (ship's z)
      const v = p.getY(i) + 0.5; // 1 = head (yard), 0 = foot
      const w = s.w1 + (s.w0 - s.w1) * v;
      const belly = s.belly * Math.sin(Math.PI * u) * (0.35 + 0.65 * Math.sin(Math.PI * (0.15 + 0.85 * (1 - v)) * 0.6 + 0.35));
      p.setXYZ(i, 0.25 + belly, s.y0 + (s.y1 - s.y0) * v, (u - 0.5) * w);
    }
    geo.computeVertexNormals();
    // braced round the mast, like a ship sailing on a quarter wind (also shows the canvas to the painter's eye)
    const yard = new THREE.Group();
    yard.position.x = s.x;
    yard.rotation.y = LAYOUT.hero.brace;
    const ink = new THREE.Mesh(geo, outline);
    ink.renderOrder = 1;
    yard.add(new THREE.Mesh(geo, mat), ink);
    model.add(yard);
  }
}

// first hit straight down at a point given in the ship's own (model) frame
function dropOnto(mesh, ship, lx, lz, fromY = 60) {
  const toWorld = (p) => p.applyMatrix4(ship.pivot.children[0].matrixWorld);
  const from = toWorld(new THREE.Vector3(lx, fromY, lz));
  const side = mesh.material.side;
  mesh.material.side = THREE.DoubleSide; // the model's winding is not reliable
  const hit = new THREE.Raycaster(from, new THREE.Vector3(0, -1, 0)).intersectObject(mesh, false)[0];
  mesh.material.side = side;
  return hit?.point ?? null;
}

function standingCard(paint, lines, height) {
  const img = (lines ?? paint).image;
  const w = (height * img.width) / img.height;
  const geo = new THREE.PlaneGeometry(w, height);
  geo.translate(0, height / 2, 0);
  const m = new THREE.Mesh(geo, cardMaterial(paint, lines));
  m.userData.size = [w, height];
  return m;
}

function paintingCards(tex, cardsJson) {
  const group = new THREE.Group();
  const below = cardsJson.filter((c) => c.water < LAYOUT.horizonV - 0.005);
  for (const c of cardsJson) {
    const uc = (c.u0 + c.u1) / 2;
    let t;
    if (c.water < LAYOUT.horizonV - 0.005) t = tToSea(uc, c.water);
    else {
      if (c.u1 < 0.34) continue; // a flag or yard of the hero ship: the 3D model has its own
      const overlap = (o) => Math.max(0, Math.min(c.u1, o.u1) - Math.max(c.u0, o.u0));
      const parent = below.reduce((best, o) => (overlap(o) > overlap(best ?? o) || !best ? o : best), null);
      if (!parent || overlap(parent) === 0) continue;
      t = tToSea((parent.u0 + parent.u1) / 2, parent.water);
    }
    if (t < LAYOUT.cardMinT) continue;
    const map = tex[c.file];
    const w = (c.u1 - c.u0) * HALL.voc.w * t;
    const h = (c.v1 - c.v0) * HALL.voc.h * t;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cardMaterial(map, null));
    m.position.copy(along(uc, (c.v0 + c.v1) / 2, t));
    m.lookAt(EYE.x, m.position.y, EYE.z);
    m.userData.t = t;
    group.add(m);
  }
  return group;
}

export async function buildWorld(scene, tex, cardsJson) {
  const group = new THREE.Group();
  scene.add(group);
  const skyDome = sky(tex);
  const seaMesh = sea(tex);
  group.add(skyDome, seaMesh);
  const cards = paintingCards(tex, cardsJson);
  group.add(cards);
  const ship = await heroShip(tex);
  group.add(ship.pivot);

  // places on the ship, found by dropping a ray: the top of the fore topsail, the deck under it
  const fore = SAILS[3];
  const toWorld = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(ship.model.matrixWorld);
  const yardPoint = new THREE.Vector3(0.3, fore.y1 + 0.12, 1.1).applyAxisAngle(new THREE.Vector3(0, 1, 0), LAYOUT.hero.brace);
  const landing = toWorld(fore.x + yardPoint.x, yardPoint.y, yardPoint.z); // on the fore topsail's yard, beside the mast
  const local = { x: fore.x };
  const deckAt = (lx, lz) => dropOnto(ship.parts.hull, ship, lx, lz, 12) ?? toWorld(lx, 4.5, lz);
  const man = LAYOUT.manHeight * ship.scale;

  const tasman = standingCard(tex.tasman_paint, tex.tasman_lines, man);
  tasman.position.copy(deckAt(local.x - 1.6, 1.8));
  const crew = [
    [tex.sailor_front, local.x - 3.6, 0.4, 0.97],
    [tex.sailor_threequarter, local.x + 1.6, 2.0, 1.0],
    [tex.pieter_looking_up_mast, local.x - 3.0, 1.2, 0.82],
  ].map(([map, lx, lz, s]) => {
    const c = standingCard(null, map, man * s);
    c.position.copy(deckAt(lx, lz));
    return c;
  });
  group.add(tasman, ...crew);

  // Tasman does not billboard: he faces the closing shot, so points on his card stay on him (and his profile
  // keeps facing the balloon side). TASMAN_SHOT is that camera spot in the ship's frame, relative to his feet.
  const tl = ship.model.worldToLocal(tasman.position.clone());
  const shot = toWorld(tl.x + TASMAN_SHOT[0], tl.y + TASMAN_SHOT[1] * LAYOUT.manHeight, tl.z + TASMAN_SHOT[2]);
  tasman.rotation.y = Math.atan2(shot.x - tasman.position.x, shot.z - tasman.position.z);
  tasman.updateMatrixWorld();
  const shoulder = (cu, cv) => tasman.localToWorld(new THREE.Vector3((cu - 0.5) * tasman.userData.size[0], cv * man, 0.002));
  const anchors = {
    sail: landing,
    mastAt: (e) => landing.clone().lerp(tasman.position.clone().setY(tasman.position.y + man * 0.95), e),
    shoulder: shoulder(0.3, 0.79), // on the coat, just behind the ruff
    mouth: shoulder(0.86, 0.87),
    tasmanChest: shoulder(0.5, 0.7),
    tasmanFeet: tasman.position.clone(),
    local: toWorld, // ship model frame -> world, for camera keys on deck
    tasmanLocal: ship.model.worldToLocal(tasman.position.clone()),
    dive: planePoint(0.2, 0.42).setZ(0.02), // the hero ship on the canvas, where the figure jumps in
    man,
  };

  const faceCamera = crew;
  return {
    group,
    ship,
    anchors,
    update(t, camera) {
      skyDome.position.copy(camera.position);
      seaMesh.material.uniforms.uTime.value = t;
      for (const c of faceCamera) c.rotation.y = Math.atan2(camera.position.x - c.position.x, camera.position.z - c.position.z);
      for (const c of cards.children) c.visible = c.position.distanceTo(camera.position) > 0.5;
    },
  };
}
