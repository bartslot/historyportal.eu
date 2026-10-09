// Scene Engine MVP: Babylon.js scene with a skybox, a ground plane, low-poly models placed
// Sims-style (pick, drop, drag over the floor), animated by the History Portal timeline (src/timeline/).
/* global BABYLON */
'use strict';
import * as TL from '../timeline/model';
import { CELL_M, contractOf, cellsFor, turnedFootprint, snapCentre, cellsCovered, overlaps } from '../placement/contract';
import { isPlayPauseKey, isTypingTarget } from '@hp/ui/keyboard.js';

const FPS = 30;
const GRID_STEP = CELL_M;       // metres; one grid line per footprint cell, so what you see is what snaps

const SKIES = ['assets/sky/sky1.avif', 'assets/sky/sky2.avif', 'assets/sky/sky3.avif', 'assets/sky/sky4.avif'];

// Every entry follows the asset contract (src/placement/contract.ts): height_m is the real height the
// model is scaled to, footprint the cells it stands on (omitted = measured), turn_step its ring step.
const CATALOG = [
  { name: 'Girl (animated)', url: 'https://assets.babylonjs.com/meshes/HVGirl.glb', height_m: 1.6, footprint: [1, 1], turn_step: 45 },
  { name: 'Mannequin (animated)', url: 'https://assets.babylonjs.com/meshes/Xbot.glb', height_m: 1.8, footprint: [1, 1], turn_step: 45 },
  { name: 'Tree (low poly)', build: buildTree, footprint: [2, 2], turn_step: 45 },
  { name: 'Rock (low poly)', build: buildRock },
  { name: 'House (low poly)', build: buildHouse },
  { name: 'Crate', build: buildCrate },
];

const canvas = document.getElementById('c');
const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0.11, 0.11, 0.12, 1);
// clicks may hit invisible grab boxes (the default pick skips invisible meshes)
const pickable = (m) => m.isPickable && m.isEnabled();
scene.pointerDownPredicate = pickable;
scene.pointerUpPredicate = pickable;

const camera = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2.4, 1.25, 22, new BABYLON.Vector3(0, 2, 0), scene); // near eye level: the backdrop shows
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 0.5;   // close enough to stand inside a house
camera.minZ = 0.05;              // the near clip: at 1 m (default) walls within arm's length vanished and popped back
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
gridMat.gridRatio = GRID_STEP;
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
  dome.metadata = { url };
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
let nextId = 1;

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
  // id: stable handle for the AI animator; clips: the model's own loops; schedule: walk clips on the timeline
  root.metadata = { id: 'a' + nextId++, clips: [], clip: null, playing: null, schedule: [] };
  actors.push(root);
  return root;
}

// World bounds of what is actually DRAWN: skinned meshes are measured with their skeleton applied,
// because some GLBs (the Time-Map horse/camel) carry bone offsets that move the body far from the bind pose.
function actorBounds(root) {
  root.computeWorldMatrix(true);
  let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
  let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
  root.getChildMeshes().forEach((m) => {
    if (m.name === 'hitbox' || !m.getTotalVertices()) return;
    m.computeWorldMatrix(true);
    if (m.skeleton) { m.skeleton.prepare(); m.refreshBoundingInfo({ applySkeleton: true, applyMorph: true }); }
    const bb = m.getBoundingInfo().boundingBox;
    min = BABYLON.Vector3.Minimize(min, bb.minimumWorld);
    max = BABYLON.Vector3.Maximize(max, bb.maximumWorld);
  });
  return { min, max };
}

function fitToHeight(root, height) {
  const first = actorBounds(root);
  const s = height / ((first.max.y - first.min.y) || 1);
  root.scaling.setAll(s);
  const b = actorBounds(root);
  // put the feet on the floor: shift children so the root origin sits at the bottom centre
  const offset = new BABYLON.Vector3((b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2).subtract(root.position);
  root.getChildren().forEach((c) => { c.position.subtractInPlace(offset.scale(1 / s)); });
}

async function addFromCatalog(item, at = null) {
  const asset = contractOf(item); // refuses a malformed entry before anything is built
  let root;
  if (item.build) {
    root = makeActor(item.name, item.build());
  } else {
    const result = await BABYLON.SceneLoader.ImportMeshAsync('', item.url, '', scene);
    root = makeActor(item.name, result.meshes);
    // play ONE of the model's own clips (several at once blend into a broken pose); idle first
    result.animationGroups.forEach((g) => g.stop());
    const groups = result.animationGroups;
    root.metadata.clips = groups;
    const clip = groups.find((g) => /idle/i.test(g.name)) || groups.find((g) => /walk/i.test(g.name)) || groups[0];
    if (clip) { playClip(root, clip.name); clip.goToFrame(clip.from); }
    fitToHeight(root, asset.height_m);
  }
  root.metadata.forward = asset.forward;
  root.metadata.asset = asset;
  root.metadata.item = item; // what Duplicate rebuilds from
  if (item.onCreate) item.onCreate(root);
  if (window.__mvp.bendActor) window.__mvp.bendActor(root); // hand-made bend, before the grab box is measured
  addHitbox(root);
  root.metadata.footprint = asset.snaps_to !== 'floor' ? null : asset.footprint !== undefined ? asset.footprint : measuredFootprint(root);
  if (at) {
    root.position.set(snap(at.x), 0, snap(at.z));
    if (at.turn) root.rotationQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, at.turn * Math.PI / 180);
    select(root);
  } else {
    startPlacing(root);
  }
  return root;
}

// Loop one of the actor's own clips; the others stop (several at once blend into a broken pose).
function playClip(root, name, makeDefault = true) {
  const clips = root.metadata.clips;
  const clip = clips.find((g) => g.name === name) || clips.find((g) => g.name.toLowerCase().includes(String(name).toLowerCase()));
  if (!clip) return false;
  if (makeDefault) root.metadata.clip = clip.name;
  if (root.metadata.playing === clip.name) return true;
  clips.forEach((g) => { if (g !== clip) g.stop(); });
  clip.start(true);
  root.metadata.playing = clip.name;
  return true;
}

// An invisible box around the whole actor, so thin figures are as easy to grab as a crate.
function addHitbox(root) {
  const { min, max } = actorBounds(root);
  const s = root.scaling.x;
  const size = max.subtract(min).scale(1 / s);
  const box = BABYLON.MeshBuilder.CreateBox('hitbox', { width: size.x, height: size.y, depth: size.z }, scene);
  box.parent = root;
  box.position = min.add(max).scale(0.5).subtract(root.position).scale(1 / s);
  box.isVisible = false; // never drawn, not even into the depth buffer the look reads (it drew ink boxes)
  box.metadata = { actor: root };
  box.isPickable = true;
  box.doNotSyncBoundingInfo = true;
}


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
// building surfaces use the hole-aware toon material from door.js (loaded after this file)
const wallMaterial = (hex) => (window.__mvp.buildingMaterial ? window.__mvp.buildingMaterial(hex) : flat(hex));
function buildHouse() {
  const body = BABYLON.MeshBuilder.CreateBox('body', { width: 4, height: 3, depth: 3 }, scene);
  body.position.y = 1.5;
  body.material = wallMaterial('#d9c9a8');
  const roof = BABYLON.MeshBuilder.CreateCylinder('roof', { height: 4.2, diameter: 3.6, tessellation: 3 }, scene);
  roof.rotation.z = Math.PI / 2; // triangular prism: apex up, ridge along the width
  roof.position.y = 3.92; // 2 cm above the wall top: coplanar faces would flicker (z-fighting) seen from inside
  roof.material = wallMaterial('#8c3b2a');
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
// Moving is a drag over the floor; turning and depth are the handles in teacher-gizmos.js. No axis arrows, no modes.
const GRAB_AT_ONCE_M = 12; // objects narrower than this move on the first press; bigger ones (a town) select first
const selLabel = document.getElementById('sel');
const dropAllowed = (a) => window.__mvp.dropGuards.every((guard) => guard(a));
let flashTimer = null;
function flash(text) { // short message in the stage label, then back to the selection
  selLabel.textContent = text;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { selLabel.textContent = selected ? selected.name : ''; }, 1800);
}

function select(actor) {
  selected = actor;
  selLabel.textContent = actor ? actor.name : '';
  TL.setActive(actor ? TL.targetOf(actor) : null);
}


// ---------- Sims-style placing and dragging over the floor ----------
let placing = null;   // actor following the mouse until the click that drops it
let dragging = null;  // actor being dragged over the floor
let dragOffset = BABYLON.Vector3.Zero();
let dragStart = null; // where a dragged object stood, to go back to when it is let go where it does not fit

function isSmall(actor) {
  const { min, max } = actorBounds(actor);
  return Math.max(max.x - min.x, max.z - min.z) < GRAB_AT_ONCE_M;
}
function snap(v) { return Math.round(v / GRID_STEP) * GRID_STEP; }

// ---------- footprints (the asset contract): where a floor object stands, cell by cell ----------
const yawDegOf = (a) => a.rotationQuaternion.toEulerAngles().y * 180 / Math.PI;
// measured at turn 0, right after it is built (an entry may declare it instead)
function measuredFootprint(a) {
  const { min, max } = actorBounds(a);
  return [cellsFor(max.x - min.x), cellsFor(max.z - min.z)];
}
const footprintNow = (a) => (a.metadata.footprint ? turnedFootprint(a.metadata.footprint, yawDegOf(a)) : null);
const cellsOf = (a) => { const fp = footprintNow(a); return fp ? cellsCovered(a.position.x, a.position.z, fp) : null; };
// nothing else stands on any of its cells; things without a footprint (a town, a door, a cloud) always fit
function fits(a) {
  const mine = cellsOf(a);
  if (!mine) return true;
  return !actors.some((o) => o !== a && !o.isDisposed() && o.isEnabled() && o.metadata.footprint && overlaps(mine, cellsOf(o)));
}
// put its centre where its footprint lies exactly on the cells
function snapToFootprint(a, x = a.position.x, z = a.position.z) {
  const [w, d] = footprintNow(a) || [1, 1];
  a.position.x = snapCentre(x, w);
  a.position.z = snapCentre(z, d);
}
function whyNot(a) {
  if (!fits(a)) return 'No room: something already stands there';
  if (a.metadata.opening) return 'A door can only be placed on a wall';
  return 'Cannot be placed here';
}
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
    if (target) moveUnderPointer(target);
    return;
  }
  if (type === BABYLON.PointerEventTypes.POINTERDOWN) {
    if (info.event.button !== 0 || info.event.altKey) return; // right-drag pans, Alt+drag always turns the camera
    if (placing) { // drop it, unless something forbids it here (a door off a wall)
      if (!dropAllowed(placing)) { flash(whyNot(placing)); return; }
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
      if (wasSelected || isSmall(actor)) { // grab and slide over the floor
        const p = floorPoint();
        dragOffset = p ? p.subtract(actor.position) : BABYLON.Vector3.Zero();
        dragOffset.y = 0;
        dragStart = { position: actor.position.clone(), rotation: actor.rotationQuaternion.clone() };
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
    const a = dragging;
    const ok = dropAllowed(a);
    if (!ok) {                                        // no room, or a door off its wall: back to where it stood
      flash(whyNot(a));
      if (!(window.__mvp.onInvalidDrop && window.__mvp.onInvalidDrop(a))) {
        a.position.copyFrom(dragStart.position);
        a.rotationQuaternion = dragStart.rotation.clone();
      }
    }
    dragging = null;
    dragStart = null;
    dragOffset = BABYLON.Vector3.Zero();
    camera.attachControl(canvas, true);
    if (ok) autoKey();
  }
});

// put an object where the pointer is: hooks first (doors snap to walls, clouds slide over the sky),
// otherwise on the floor grid. Shared by click-placing, dragging and the asset drawer.
function moveUnderPointer(target) {
  if (window.__mvp.placeHooks.some((hook) => hook(target))) return;
  const p = floorPoint();
  if (!p) return;
  snapToFootprint(target, p.x - dragOffset.x, p.z - dragOffset.z);
  target.position.y = 0;
}

// [ and ]: one turn step of this asset's own (90° for furniture, 45° for people), refused if it no longer fits
function rotateSelected(dir) {
  if (!selected) return;
  const a = selected;
  const before = { rotation: a.rotationQuaternion.clone(), position: a.position.clone() };
  const step = (a.metadata.asset?.turn_step ?? 90) * Math.PI / 180; // clouds and the like are made without a catalog entry
  a.rotationQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, dir * step).multiply(before.rotation);
  if (a.metadata.footprint) snapToFootprint(a);
  if (!fits(a)) { flash(whyNot(a)); a.rotationQuaternion = before.rotation; a.position.copyFrom(before.position); return; }
  autoKey();
}

function deleteSelected() {
  if (!selected) return;
  const a = selected;
  const target = TL.targetOf(a);              // before dispose: Babylon nulls metadata
  select(null);
  actors.splice(actors.indexOf(a), 1);
  a.dispose(false, true);
  // doors belong to their wall: deleting a house disposed its doors too, drop them from the list
  for (let i = actors.length - 1; i >= 0; i--) if (actors[i].isDisposed()) actors.splice(i, 1);
  TL.removeTarget(target);
}

// ---------- timeline ----------
// The History Portal timeline owns time and keys (src/timeline/model.ts: per-property tracks on the
// wizard's own keyframe modules). These are the engine's old entry points, kept for the AI animator,
// the bake and the doors; they speak frames, the timeline speaks seconds.
const frameNow = () => Math.round(TL.getState().time * FPS);
const turnOf = (q) => q.toEulerAngles().y * 180 / Math.PI;

function autoKey() {
  if (selected) TL.recordCanvasEdit(TL.targetOf(selected));
}

// Transform an actor holds at a frame, from its tracks (or where it stands when it has none).
function stateAt(actor, f) {
  const target = TL.targetOf(actor);
  const t = f / FPS;
  return {
    position: new BABYLON.Vector3(TL.sampleAt(target, 'x', t), 0, TL.sampleAt(target, 'z', t)),
    rotation: BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, TL.sampleAt(target, 'turn', t) * Math.PI / 180),
    scaling: actor.scaling.clone(),
  };
}

// Key what `patch` names at frame f. Size is not animated (resize = depth): a scale patch just applies.
function keyAt(actor, f, patch = {}) {
  const target = TL.targetOf(actor);
  const t = Math.max(0, f) / FPS;
  if (patch.position) { TL.keyAt(target, 'x', t, patch.position.x); TL.keyAt(target, 'z', t, patch.position.z); }
  if (patch.rotation) TL.keyAt(target, 'turn', t, turnOf(patch.rotation));
  if (patch.scaling) actor.scaling.copyFrom(patch.scaling);
}

// Yaw that makes an actor look along (dx, dz); `forward` corrects models that face another way.
function yawTowards(actor, dx, dz) {
  return BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, Math.atan2(dx, dz) + (actor.metadata.forward || 0));
}

const rebuildTimeline = () => TL.applyFrame();
const goTo = (f) => TL.seek(f / FPS);
const togglePlay = () => TL.togglePlay();
const playingNow = () => TL.getState().playing;

scene.onBeforeRenderObservable.add(() => TL.tick());
scene.onBeforeRenderObservable.add(() => {
  const frame = frameNow();
  actors.forEach((a) => {
    if (!a.metadata.clips.length) return;
    const span = a.metadata.schedule.find((w) => frame >= w.start && frame < w.end);
    const want = span ? span.name : a.metadata.clip;
    if (want && want !== a.metadata.playing) playClip(a, want, false);
  });
});


// ---------- keyboard ----------
window.addEventListener('keydown', (e) => {
  if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === '[') rotateSelected(-1);
  else if (k === ']') rotateSelected(1);
  else if (k === 'k' && selected) TL.propertiesOf(TL.targetOf(selected)).forEach((p) => TL.toggleKey(TL.targetOf(selected), p.key));
  else if (isPlayPauseKey(e)) { if (playingNow() || !TL.nothingToPlay()) { e.preventDefault(); togglePlay(); } }
  else if (k === 'delete' || k === 'backspace') {      // selected keyframes first (Figma), else the object
    if (TL.getState().selected.length) TL.deleteSelected(); else deleteSelected();
  }
  else if (k === 'escape' && placing) { const a = placing; placing = null; camera.attachControl(canvas, true); select(a); deleteSelected(); }
});

engine.runRenderLoop(() => scene.render());
window.addEventListener('resize', () => engine.resize());
// panels slide in and out and the stage gives way: follow the canvas's own size, not just the window's
new ResizeObserver(() => engine.resize()).observe(canvas);
window.__mvp = {
  scene, camera, actors, CATALOG, SKIES, FPS,
  goTo, rebuildTimeline, addFromCatalog, setSky, select, playClip, keyAt, stateAt, yawTowards, snap,
  togglePlay, isPlaying: playingNow, getFrame: frameNow, getLength: () => TL.getState().duration,
  setLengthSeconds: (sec) => TL.setDuration(sec),
  keyTimes: (actor) => TL.keyTimesOf(TL.targetOf(actor)),
  getTracks: () => TL.getState().tracks, setTracks: (tracks) => TL.setTracks(tracks),
  getDome: () => dome,
  makeActor, addHitbox, actorBounds,
  fits, whyNot, snapToFootprint, footprintNow, getMoving: () => placing || dragging,
  placeHooks: [], // (actor) => true when it positioned the actor itself (wall snap, sky drag)
  dropGuards: [], // (actor) => false when it may not be dropped where it is (a door off a wall)
  getSelected: () => selected,
  moveUnderPointer, flash, dropAllowed: (a) => dropAllowed(a), autoKey: () => autoKey(),
  getSkyIndex: () => SKIES.indexOf(dome && dome.metadata && dome.metadata.url),
  deleteActor: (a) => { select(a); deleteSelected(); },
};
window.__mvp.dropGuards.push(fits);
