// Scene Engine MVP: Babylon.js scene with a skybox, a ground plane, low-poly models placed
// Sims-style (pick, drop, drag over the floor), and a keyframe timeline on Babylon's own animations.
/* global BABYLON */
'use strict';

const FPS = 30;
const GRID_STEP = 0.5;          // metres; placement snaps to this
const ROTATE_STEP = Math.PI / 4; // [ and ] rotate by 45 degrees, like Sims build mode

const SKIES = ['assets/sky/sky1.avif', 'assets/sky/sky2.avif', 'assets/sky/sky3.avif', 'assets/sky/sky4.avif'];

// height = metres the model is scaled to, so everything shares one real-world scale
const CATALOG = [
  { name: 'Horse (walk)', url: 'assets/models/horse-walk.glb', height: 1.6 },
  { name: 'Camel (walk)', url: 'assets/models/camel-walk.glb', height: 2.0 },
  { name: 'Girl (animated)', url: 'https://assets.babylonjs.com/meshes/HVGirl.glb', height: 1.6 },
  { name: 'Mannequin (animated)', url: 'https://assets.babylonjs.com/meshes/Xbot.glb', height: 1.8 },
  { name: 'Tree (low poly)', build: buildTree },
  { name: 'Rock (low poly)', build: buildRock },
  { name: 'House (low poly)', build: buildHouse },
  { name: 'Crate', build: buildCrate },
];

const canvas = document.getElementById('c');
const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0.11, 0.11, 0.12, 1);

const camera = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2.4, Math.PI / 2.8, 18, new BABYLON.Vector3(0, 1, 0), scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 2;
camera.upperRadiusLimit = 80;
camera.upperBetaLimit = Math.PI / 2.05; // never under the floor
camera.wheelDeltaPercentage = 0.01;

const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
hemi.intensity = 0.6;
const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-0.5, -1, -0.4), scene);
sun.position = new BABYLON.Vector3(20, 40, 20);
sun.intensity = 1.6;
const shadows = new BABYLON.ShadowGenerator(2048, sun);
shadows.useBlurExponentialShadowMap = true;
shadows.blurKernel = 16;

// ---------- ground ----------
const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 60, height: 60 }, scene);
ground.receiveShadows = true;
ground.isPickable = true;
const gridMat = new BABYLON.GridMaterial('grid', scene);
gridMat.mainColor = new BABYLON.Color3(0.42, 0.40, 0.33);
gridMat.lineColor = new BABYLON.Color3(0.55, 0.53, 0.45);
gridMat.gridRatio = GRID_STEP * 2;
gridMat.majorUnitFrequency = 5;
gridMat.opacity = 0.98;
const plainMat = new BABYLON.StandardMaterial('plain', scene);
plainMat.diffuseColor = new BABYLON.Color3(0.45, 0.42, 0.34);
plainMat.specularColor = BABYLON.Color3.Black();
ground.material = gridMat;
document.getElementById('grid').onchange = (e) => { ground.material = e.target.checked ? gridMat : plainMat; };

// ---------- skybox ----------
let dome = null;
function setSky(url) {
  if (dome) dome.dispose();
  dome = new BABYLON.PhotoDome('sky', url, { resolution: 64, size: 1000 }, scene);
  dome.mesh.isPickable = false;
  document.querySelectorAll('#skies img').forEach((img) => img.classList.toggle('on', img.dataset.url === url));
}
const skies = document.getElementById('skies');
SKIES.forEach((url) => {
  const img = document.createElement('img');
  img.src = url;
  img.dataset.url = url;
  img.onclick = () => setSky(url);
  skies.appendChild(img);
});
document.getElementById('skyUpload').onchange = (e) => {
  const file = e.target.files[0];
  if (file) setSky(URL.createObjectURL(file));
};
setSky(SKIES[0]);

// ---------- actors ----------
// Every placed object is an "actor": one TransformNode that owns the meshes, so selection,
// gizmos and keyframes always work on the whole object, never on one sub-mesh.
const actors = [];
let selected = null;

function makeActor(name, meshes) {
  const root = new BABYLON.TransformNode(name, scene);
  root.rotationQuaternion = BABYLON.Quaternion.Identity();
  meshes.forEach((m) => { if (!m.parent) m.parent = root; });
  root.getChildMeshes().forEach((m) => {
    m.metadata = { actor: root };
    m.isPickable = true;
    shadows.addShadowCaster(m);
    m.receiveShadows = true;
  });
  root.metadata = { keys: [] };
  actors.push(root);
  return root;
}

function fitToHeight(root, height) {
  root.computeWorldMatrix(true);
  const { min, max } = root.getHierarchyBoundingVectors(true);
  const h = max.y - min.y || 1;
  const s = height / h;
  root.scaling.setAll(s);
  root.computeWorldMatrix(true);
  const b = root.getHierarchyBoundingVectors(true);
  // put the feet on the floor: shift children so the root origin sits at the bottom centre
  const offset = new BABYLON.Vector3((b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2);
  root.getChildren().forEach((c) => { c.position.subtractInPlace(offset.scale(1 / s)); });
}

async function addFromCatalog(item) {
  let root;
  if (item.build) {
    root = makeActor(item.name, item.build());
  } else {
    const result = await BABYLON.SceneLoader.ImportMeshAsync('', item.url, '', scene);
    root = makeActor(item.name, result.meshes);
    fitToHeight(root, item.height);
    result.animationGroups.forEach((g) => { g.start(true); }); // the model's own walk/idle cycle
  }
  startPlacing(root);
}

const modelList = document.getElementById('models');
CATALOG.forEach((item) => {
  const b = document.createElement('button');
  b.textContent = item.name;
  b.onclick = () => addFromCatalog(item).catch((err) => alert('Could not load ' + item.name + ': ' + err.message));
  modelList.appendChild(b);
});

// ---------- low-poly builders ----------
function flat(color) {
  const m = new BABYLON.StandardMaterial('m', scene);
  m.diffuseColor = BABYLON.Color3.FromHexString(color);
  m.specularColor = BABYLON.Color3.Black();
  return m;
}
function buildTree() {
  const trunk = BABYLON.MeshBuilder.CreateCylinder('trunk', { height: 1.2, diameter: 0.3, tessellation: 6 }, scene);
  trunk.position.y = 0.6;
  trunk.material = flat('#6b4a2b');
  const crown = BABYLON.MeshBuilder.CreateCylinder('crown', { height: 2.6, diameterTop: 0, diameterBottom: 2, tessellation: 7 }, scene);
  crown.position.y = 2.4;
  crown.material = flat('#4f7a3a');
  crown.convertToFlatShadedMesh();
  return [trunk, crown];
}
function buildRock() {
  const rock = BABYLON.MeshBuilder.CreateIcoSphere('rock', { radius: 0.6, subdivisions: 1 }, scene);
  rock.scaling = new BABYLON.Vector3(1.3, 0.7, 1);
  rock.position.y = 0.35;
  rock.material = flat('#8a8580');
  rock.convertToFlatShadedMesh();
  return [rock];
}
function buildHouse() {
  const body = BABYLON.MeshBuilder.CreateBox('body', { width: 4, height: 3, depth: 3 }, scene);
  body.position.y = 1.5;
  body.material = flat('#d9c9a8');
  const roof = BABYLON.MeshBuilder.CreateCylinder('roof', { height: 4.2, diameter: 3.6, tessellation: 3 }, scene);
  roof.rotation.z = Math.PI / 2; // triangular prism: apex up, ridge along the width
  roof.position.y = 3.9;
  roof.material = flat('#8c3b2a');
  const door = BABYLON.MeshBuilder.CreateBox('door', { width: 0.9, height: 1.8, depth: 0.05 }, scene);
  door.position = new BABYLON.Vector3(0, 0.9, -1.53);
  door.material = flat('#4a3220');
  return [body, roof, door];
}
function buildCrate() {
  const box = BABYLON.MeshBuilder.CreateBox('crate', { size: 0.8 }, scene);
  box.position.y = 0.4;
  box.material = flat('#9c7448');
  return [box];
}

// ---------- selection + gizmos ----------
const gizmos = new BABYLON.GizmoManager(scene);
gizmos.usePointerToAttachGizmos = false;
gizmos.positionGizmoEnabled = true;
let gizmoMode = 'move';
const selLabel = document.getElementById('sel');

function select(actor) {
  selected = actor;
  gizmos.attachToNode(actor);
  selLabel.textContent = actor ? actor.name : 'Nothing selected';
  drawMarks();
}

function setMode(mode) {
  gizmoMode = mode;
  gizmos.positionGizmoEnabled = mode === 'move';
  gizmos.rotationGizmoEnabled = mode === 'rotate';
  gizmos.scaleGizmoEnabled = mode === 'scale';
  gizmos.attachToNode(selected);
  hookGizmos();
  document.querySelectorAll('#rail button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
}
document.querySelectorAll('#rail button').forEach((b) => { b.onclick = () => setMode(b.dataset.mode); });

const hooked = new WeakSet();
function hookGizmos() {
  const g = gizmos.gizmos;
  [g.positionGizmo, g.rotationGizmo, g.scaleGizmo].forEach((gz) => {
    if (!gz || hooked.has(gz)) return;
    hooked.add(gz);
    gz.onDragEndObservable.add(() => autoKey());
  });
}
hookGizmos();

// ---------- Sims-style placing and dragging over the floor ----------
let placing = null;   // actor following the mouse until the click that drops it
let dragging = null;  // actor being dragged over the floor
let dragOffset = BABYLON.Vector3.Zero();

function snap(v) { return Math.round(v / GRID_STEP) * GRID_STEP; }
function floorPoint() {
  const hit = scene.pick(scene.pointerX, scene.pointerY, (m) => m === ground);
  return hit && hit.hit ? hit.pickedPoint : null;
}
function startPlacing(actor) {
  placing = actor;
  select(actor);
  camera.detachControl();
}

scene.onPointerObservable.add((info) => {
  const type = info.type;
  if (type === BABYLON.PointerEventTypes.POINTERMOVE) {
    const target = placing || dragging;
    if (!target) return;
    const p = floorPoint();
    if (!p) return;
    target.position.x = snap(p.x - dragOffset.x);
    target.position.z = snap(p.z - dragOffset.z);
    target.position.y = 0;
    return;
  }
  if (type === BABYLON.PointerEventTypes.POINTERDOWN) {
    if (info.event.button !== 0) return;
    if (placing) { // drop it
      placing = null;
      camera.attachControl(canvas, true);
      autoKey();
      return;
    }
    const pick = info.pickInfo;
    const actor = pick && pick.hit && pick.pickedMesh && pick.pickedMesh.metadata && pick.pickedMesh.metadata.actor;
    if (actor) {
      // First click only selects; a drag moves an object only once it is selected. Otherwise big objects
      // (a house, a whole town) would swallow every drag and the camera could never turn.
      const wasSelected = actor === selected;
      select(actor);
      if (wasSelected && gizmoMode === 'move') { // grab and slide over the floor
        const p = floorPoint();
        dragOffset = p ? p.subtract(actor.position) : BABYLON.Vector3.Zero();
        dragOffset.y = 0;
        dragging = actor;
        camera.detachControl();
      }
    } else if (pick && pick.pickedMesh === ground) {
      select(null);
      if (camera.lockedTarget) { camera.setTarget(camera.lockedTarget.position.clone()); camera.lockedTarget = null; }
    }
    return;
  }
  if (type === BABYLON.PointerEventTypes.POINTERUP && dragging) {
    dragging = null;
    dragOffset = BABYLON.Vector3.Zero();
    camera.attachControl(canvas, true);
    autoKey();
  }
});

function rotateSelected(dir) {
  if (!selected) return;
  const q = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, dir * ROTATE_STEP);
  selected.rotationQuaternion = q.multiply(selected.rotationQuaternion);
  autoKey();
}

function deleteSelected() {
  if (!selected) return;
  const a = selected;
  select(null);
  actors.splice(actors.indexOf(a), 1);
  a.dispose(false, true);
  rebuildTimeline();
}

// ---------- timeline ----------
// Each actor keeps its own keyframes; one AnimationGroup plays them all on a shared clock.
const scrub = document.getElementById('scrub');
const timeLabel = document.getElementById('time');
const playBtn = document.getElementById('play');
const lenInput = document.getElementById('len');
let lengthFrames = 10 * FPS;
let frame = 0;
let group = null;
let playing = false;

function setLength() {
  lengthFrames = Math.max(1, Number(lenInput.value) || 10) * FPS;
  scrub.max = lengthFrames;
  rebuildTimeline();
}
lenInput.onchange = setLength;

function keyNow(actor) {
  const keys = actor.metadata.keys.filter((k) => k.frame !== frame);
  keys.push({
    frame,
    position: actor.position.clone(),
    rotation: actor.rotationQuaternion.clone(),
    scaling: actor.scaling.clone(),
  });
  keys.sort((a, b) => a.frame - b.frame);
  actor.metadata.keys = keys;
}

function autoKey() {
  if (!selected || !document.getElementById('autokey').checked || playing) return;
  keyNow(selected);
  rebuildTimeline();
}

function animationsFor(actor) {
  const keys = actor.metadata.keys;
  if (keys.length === 0) return [];
  const make = (prop, type, pick) => {
    const anim = new BABYLON.Animation(actor.name + '.' + prop, prop, FPS, type, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
    anim.setKeys(keys.map((k) => ({ frame: k.frame, value: pick(k) })));
    const ease = new BABYLON.CubicEase();
    ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
    anim.setEasingFunction(ease);
    return anim;
  };
  return [
    make('position', BABYLON.Animation.ANIMATIONTYPE_VECTOR3, (k) => k.position),
    make('rotationQuaternion', BABYLON.Animation.ANIMATIONTYPE_QUATERNION, (k) => k.rotation),
    make('scaling', BABYLON.Animation.ANIMATIONTYPE_VECTOR3, (k) => k.scaling),
  ];
}

function rebuildTimeline() {
  if (group) { group.stop(); group.dispose(); }
  group = new BABYLON.AnimationGroup('timeline', scene);
  actors.forEach((actor) => {
    actor.animations = animationsFor(actor); // so the inspector's curve editor sees them
    actor.animations.forEach((anim) => group.addTargetedAnimation(anim, actor));
  });
  if (group.targetedAnimations.length) {
    group.normalize(0, lengthFrames);
    group.start(true, 1, 0, lengthFrames);
    if (!playing) { group.pause(); group.goToFrame(frame); }
  }
  drawMarks();
}

function goTo(f) {
  frame = Math.max(0, Math.min(lengthFrames, Math.round(f)));
  scrub.value = frame;
  timeLabel.textContent = (frame / FPS).toFixed(2) + ' s';
  if (group && group.targetedAnimations.length) group.goToFrame(frame);
}
scrub.oninput = () => { if (playing) togglePlay(); goTo(Number(scrub.value)); };

function togglePlay() {
  if (!group || !group.targetedAnimations.length) return;
  playing = !playing;
  playBtn.textContent = playing ? '❚❚ Pause' : '▶ Play';
  if (playing) { group.play(true); } else { group.pause(); }
}
playBtn.onclick = togglePlay;
scene.onBeforeRenderObservable.add(() => {
  if (!playing || !group) return;
  const a = group.animatables[0];
  if (!a) return;
  frame = Math.round(a.masterFrame) % (lengthFrames + 1);
  scrub.value = frame;
  timeLabel.textContent = (frame / FPS).toFixed(2) + ' s';
});

document.getElementById('key').onclick = () => { if (selected) { keyNow(selected); rebuildTimeline(); } };
document.getElementById('unkey').onclick = () => {
  if (!selected) return;
  selected.metadata.keys = selected.metadata.keys.filter((k) => k.frame !== frame);
  rebuildTimeline();
};

function drawMarks() {
  const marks = document.getElementById('marks');
  marks.innerHTML = '';
  if (!selected) return;
  selected.metadata.keys.forEach((k) => {
    const i = document.createElement('i');
    i.style.left = (k.frame / lengthFrames * 100) + '%';
    marks.appendChild(i);
  });
}

// ---------- engine inspector (Babylon's own panels, incl. the animation curve editor) ----------
document.getElementById('inspector').onclick = () => {
  if (scene.debugLayer.isVisible()) { scene.debugLayer.hide(); return; }
  scene.debugLayer.show({ embedMode: true, overlay: true }).then(() => {
    if (selected) scene.debugLayer.select(selected);
  });
};

// ---------- keyboard ----------
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  const k = e.key.toLowerCase();
  if (k === 'w') setMode('move');
  else if (k === 'e') setMode('rotate');
  else if (k === 'r') setMode('scale');
  else if (k === '[') rotateSelected(-1);
  else if (k === ']') rotateSelected(1);
  else if (k === 'k') document.getElementById('key').click();
  else if (k === ' ') { e.preventDefault(); togglePlay(); }
  else if (k === 'delete' || k === 'backspace') deleteSelected();
  else if (k === 'escape' && placing) { const a = placing; placing = null; camera.attachControl(canvas, true); select(a); deleteSelected(); }
});

engine.runRenderLoop(() => scene.render());
window.addEventListener('resize', () => engine.resize());
window.__mvp = { scene, actors, goTo, rebuildTimeline };
