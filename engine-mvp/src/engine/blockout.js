// Clay blockout in the studio (clay-blockout Gate 1): a shot as data, solved, shown in clay, read back as text.
//   mvp.blockout.apply(doc)      a whole blockout: { objects: [spec...], camera?: { shot, subjects, lens_mm?, horizon? } }
//   mvp.blockout.place(id, spec) one piece added or re-placed among the others (they stay where they are)
//   mvp.blockout.pose(id, name)  stand | point | spyglass
//   mvp.blockout.frame(shot)     a camera preset on its subjects
//   mvp.blockout.read()          the readback { text, ... } for the current camera
//   mvp.blockout.mode(m)         'clay' | 'silhouette' | 'off'   (one feature, two palettes; no shadows, no post)
//   mvp.blockout.undo() / redo() and Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z: per op, the AI's and the teacher's hand edits
// URL: ?blockout=<name>[&mode=clay|silhouette] loads public/blockout/<name>.json (the Gate 1 test shots).
// Pieces are ordinary studio actors (select, drag, save), built from the kit: clay pieces are instances of one
// source mesh per kit id; the figure is the mannequin from an AssetContainer, posed by aiming its arm bones.
/* global BABYLON */
'use strict';
import { kitPiece } from '../blockout/kit';
import { solve, forward, rightOf } from '../blockout/solve';
import { frame as frameCam } from '../blockout/camera';
import { readback } from '../blockout/readback';
import { History, changeOp } from '../blockout/history';
import { isTypingTarget } from '@hp/ui/keyboard.js';

const FIGURE_URL = 'https://assets.babylonjs.com/meshes/Xbot.glb';   // the studio's mannequin (Mixamo rig)
const CLAY = [0.78, 0.76, 0.72];
const SLATE = [0.36, 0.40, 0.45];          // the storyboard frame: a mid slate, black silhouettes (memory 10-11)
const RIMS = ['#e0a050', '#5fb3d9', '#9bd16b', '#e07a8a', '#c49be0', '#e8d26a'];   // one rim per character
const CLAY_BASE = 0.55;                    // clay = an unlit base + a little light for the form (a matcap's job)
const CLAY_LIT = 0.45;
const SET_INK = 0.45;                      // silhouette set pieces: this share of the slate
const SOURCE_PARK_Y = -1000;               // instanced source meshes wait out of sight

(() => {
  const mvp = window.__mvp;
  const scene = mvp.scene;
  const history = new History();
  const specs = new Map();       // id -> spec (what was asked)
  const placedOf = new Map();    // id -> solver result (where it is)
  const actorOf = new Map();     // id -> actor root
  const sources = new Map();     // kit id -> source mesh (instanced)
  let figureContainer = null;
  let shot = null;
  let lastProblems = [];
  let currentMode = 'off';
  let rim = 0;

  const clayMat = new BABYLON.StandardMaterial('blockout clay', scene);
  clayMat.diffuseColor = BABYLON.Color3.FromArray(CLAY.map((v) => v * CLAY_LIT));
  clayMat.emissiveColor = BABYLON.Color3.FromArray(CLAY.map((v) => v * CLAY_BASE));   // never black on the shade side
  clayMat.specularColor = BABYLON.Color3.Black();
  const inkMat = new BABYLON.StandardMaterial('blockout silhouette', scene);
  inkMat.disableLighting = true;
  inkMat.emissiveColor = BABYLON.Color3.Black();
  inkMat.diffuseColor = BABYLON.Color3.Black();
  const setInkMat = new BABYLON.StandardMaterial('blockout silhouette set', scene);   // the set: darker than the
  setInkMat.disableLighting = true;                                                    // frame, lighter than people
  setInkMat.emissiveColor = BABYLON.Color3.FromArray(SLATE.map((v) => v * SET_INK));

  // ---------- the kit ----------
  function boxAt(name, w, h, d, x = 0, y = h / 2, z = 0) {
    const m = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    m.position.set(x, y, z);
    return m;
  }
  function cyl(name, dia, h, x = 0, y = h / 2, z = 0) {
    const m = BABYLON.MeshBuilder.CreateCylinder(name, { diameter: dia, height: h, tessellation: 12 }, scene);
    m.position.set(x, y, z);
    return m;
  }
  function buildShape(k) {
    const [w, h, d] = k.size;
    const n = 'kit ' + k.id;
    switch (k.shape.kind) {
      case 'box': return [boxAt(n, w, h, d)];
      case 'cylinder': return [cyl(n, w, h)];
      case 'rail': {
        const parts = [boxAt(n + ' top', w, 0.12, d, 0, h - 0.06), boxAt(n + ' low', w, 0.08, d * 0.8, 0, 0.35)];
        for (let x = -w / 2 + 0.1; x <= w / 2; x += 1) parts.push(boxAt(n + ' post', 0.12, h, d * 0.8, x));
        return parts;
      }
      case 'table': {
        const parts = [boxAt(n + ' top', w, 0.06, d, 0, h - 0.03)];
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(boxAt(n + ' leg', 0.08, h - 0.06, 0.08, sx * (w / 2 - 0.1), (h - 0.06) / 2, sz * (d / 2 - 0.1)));
        return parts;
      }
      case 'cannon': {
        const barrel = cyl(n + ' barrel', 0.3, d, 0, 0.62, 0.1);
        barrel.rotation.x = Math.PI / 2;
        return [boxAt(n + ' carriage', w, 0.45, d * 0.6, 0, 0.225, -0.2), barrel];
      }
      case 'cart': {
        const parts = [boxAt(n + ' bed', w * 0.8, 0.35, d * 0.62, 0, 0.75, -0.2)];
        for (const sx of [-1, 1]) {
          const wheel = cyl(n + ' wheel', 1.0, 0.08, sx * w / 2, 0.5, -0.2);
          wheel.rotation.z = Math.PI / 2;
          parts.push(wheel, boxAt(n + ' shaft', 0.06, 0.06, d * 0.45, sx * w * 0.3, 0.7, d * 0.3));
        }
        return parts;
      }
      default: return [];
    }
  }
  function source(k) {
    if (sources.has(k.id)) return sources.get(k.id);
    const parts = buildShape(k);
    const m = parts.length > 1 ? BABYLON.Mesh.MergeMeshes(parts, true, true) : parts[0];
    if (m) {
      m.name = 'kit ' + k.id;
      m.material = currentMode === 'silhouette' ? setInkMat : clayMat;
      m.bakeCurrentTransformIntoVertices();   // geometry with its bottom centre at the origin
      m.isPickable = false;
      m.position.y = SOURCE_PARK_Y;            // the source itself waits out of sight; its instances are the pieces
    }
    sources.set(k.id, m);
    return m;
  }
  async function preload(kitIds) {
    if (kitIds.includes('figure') && !figureContainer) {
      figureContainer = await BABYLON.SceneLoader.LoadAssetContainerAsync('', FIGURE_URL, scene);
    }
  }

  function spawn(id, kitId) {
    const k = kitPiece(kitId);
    let meshes = [];
    let groups = [];
    if (k.shape.kind === 'figure') {
      const inst = figureContainer.instantiateModelsToScene((n) => `${id} ${n}`, false);
      meshes = inst.rootNodes;
      groups = inst.animationGroups;
    } else if (k.shape.kind !== 'none') {
      const src = source(k);
      const inst = src.createInstance(id);
      inst.position.setAll(0);                 // createInstance copies the parked source's position: back to the actor's origin
      meshes = [inst];
    }
    const root = mvp.makeActor(id, meshes);
    root.metadata.id = id;
    root.metadata.kit = kitId;
    root.metadata.clips = groups;
    if (groups.length) {
      groups.forEach((g) => g.stop());
      const idle = groups.find((g) => /idle/i.test(g.name)) || groups[0];
      idle.start(false, 1, idle.from, idle.from);
      idle.goToFrame(idle.from);
      idle.pause();
      fitFigure(root, k.size[1]);
      root.metadata.rim = RIMS[rim++ % RIMS.length];
    }
    if (groups.length) mvp.addHitbox(root);   // thin figures get a grab box; clay pieces are picked as themselves
    root.metadata.footprint = k.footprint;
    root.metadata.asset = { snaps_to: 'floor', footprint: k.footprint, turn_step: 45, forward: 0 };
    actorOf.set(id, root);
    if (currentMode !== 'off') paint(root);
    return root;
  }

  function fitFigure(root, height) {
    const b = mvp.actorBounds(root);
    const s = height / ((b.max.y - b.min.y) || 1);
    root.scaling.setAll(s);
  }

  function remove(id) {
    const a = actorOf.get(id);
    if (a && !a.isDisposed()) {
      // deleteActor disposes materials too: the clay, the silhouette ink and the mannequin's own materials are
      // shared by every piece, so let go of them first (losing the clay turned the whole scene black)
      // an InstancedMesh answers with its SOURCE's material, so dispose instances ourselves, materials kept
      a.getChildMeshes().forEach((m) => {
        saved.mats.delete(m);
        if (m instanceof BABYLON.InstancedMesh) m.dispose(false, false); else m.material = null;
      });
      mvp.deleteActor(a);
    }
    actorOf.delete(id);
  }

  function setTransform(a, p) {
    a.position.set(p.x, p.y, p.z);
    a.rotationQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, (p.yaw * Math.PI) / 180);
    if (p.kit === 'figure') fitFigure(a, p.height);
  }

  // ---------- poses: aim the arm bones in the figure's own frame (never trust local offsets; posing rules) ----------
  const bone = (a, name) => a.getChildTransformNodes(false).find((n) => n.name.endsWith(':' + name) || n.name.endsWith(name));
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
  function pose(id, name) {
    const a = actorOf.get(id);
    if (!a || a.metadata.kit !== 'figure') return false;
    a.getChildMeshes().filter((m) => m.name.startsWith(id + ' spyglass')).forEach((m) => m.dispose());
    const idle = a.metadata.clips.find((g) => /idle/i.test(g.name)) || a.metadata.clips[0];
    if (idle) { idle.goToFrame(idle.from); idle.pause(); }
    a.computeWorldMatrix(true);
    const p = placedOf.get(id);
    const yaw = p ? p.yaw : 0;
    const [fx, fz] = forward(yaw);
    const [rx, rz] = rightOf(yaw);
    const F = new BABYLON.Vector3(fx, 0, fz), R = new BABYLON.Vector3(rx, 0, rz), U = BABYLON.Axis.Y;
    const head = bone(a, 'Head');
    head && head.computeWorldMatrix(true);
    const eye = head ? head.getAbsolutePosition().add(F.scale(0.1)).add(U.scale(0.05)) : a.position.add(U.scale(1.66));
    if (name === 'point') {
      const d = F.scale(0.9).add(U.scale(0.25)).add(R.scale(0.25));
      aim(a, 'RightArm', 'RightForeArm', 'RightHand', d, eye.add(d.normalize().scale(1.2)));
    } else if (name === 'spyglass') {
      // the tube at the right eye; the far hand holds it out front, the near hand under the eyepiece
      const tubeEnd = eye.add(R.scale(0.03)).add(F.scale(0.45));
      aim(a, 'LeftArm', 'LeftForeArm', 'LeftHand', F.scale(0.7).add(R.scale(-0.35)).add(U.scale(-0.1)), tubeEnd);
      aim(a, 'RightArm', 'RightForeArm', 'RightHand', F.scale(0.5).add(R.scale(0.6)).add(U.scale(-0.25)), eye.add(F.scale(0.15)).add(U.scale(-0.04)));
      const tube = BABYLON.MeshBuilder.CreateCylinder(id + ' spyglass', { diameter: 0.05, height: 0.45, tessellation: 10 }, scene);
      tube.position = eye.add(R.scale(0.03)).add(F.scale(0.225));
      tube.rotationQuaternion = BABYLON.Quaternion.FromUnitVectorsToRef(BABYLON.Axis.Y, F, new BABYLON.Quaternion());
      tube.material = clayMat;
      tube.setParent(a);
      tube.metadata = { actor: a };
      if (currentMode !== 'off') paint(a);
    }
    a.metadata.pose = name;
    return true;
  }

  // ---------- state: one piece = its spec + where it stands ----------
  const stateOf = (id) => (specs.has(id) ? { spec: structuredClone(specs.get(id)), placed: placedOf.has(id) ? { ...placedOf.get(id) } : null } : undefined);
  function setState(id, st) {
    if (!st) { specs.delete(id); placedOf.delete(id); remove(id); return; }
    specs.set(id, structuredClone(st.spec));
    if (!st.placed) { placedOf.delete(id); remove(id); return; }
    placedOf.set(id, { ...st.placed });
    let a = actorOf.get(id);
    if (!a || a.isDisposed() || a.metadata.kit !== st.placed.kit) { remove(id); a = spawn(id, st.placed.kit); }
    setTransform(a, st.placed);
    if (st.spec.pose) pose(id, st.spec.pose);
  }
  function snapshot(ids) {
    const out = {};
    ids.forEach((id) => { const s = stateOf(id); if (s) out[id] = s; });
    return out;
  }
  function record(label, by, ids, change) {
    const before = snapshot(ids);
    change();
    history.push(changeOp(label, by, before, snapshot(ids), setState));
  }

  // ---------- apply / place / frame ----------
  async function apply(doc, by = 'ai') {
    const objects = doc.objects || [];
    await preload(objects.map((o) => o.kit));
    const ids = [...new Set([...specs.keys(), ...objects.map((o) => o.id)])];
    record('apply blockout', by, ids, () => {
      [...specs.keys()].forEach((id) => setState(id, undefined));
      const solved = solve(objects);
      lastProblems = solved.problems;
      objects.forEach((o) => specs.set(o.id, structuredClone(o)));
      for (const o of objects) setState(o.id, { spec: o, placed: solved.placed[o.id] || null });
    });
    if (doc.camera) frame(doc.camera);
    return read();
  }

  function fixedExcept(id) {
    const out = {};
    placedOf.forEach((p, k) => { if (k !== id) out[k] = p; });
    return out;
  }

  /** One piece added or re-placed; every other piece stays exactly where it is (a teacher's edits included). */
  async function place(spec, by = 'ai') {
    await preload([spec.kit || (specs.get(spec.id) || {}).kit]);
    const merged = { ...(specs.get(spec.id) || {}), ...spec };
    if (spec.place) delete merged.at;
    if (spec.at) delete merged.place;
    record(`place ${spec.id}`, by, [spec.id], () => {
      const solved = solve([merged], fixedExcept(spec.id));
      lastProblems = solved.problems;
      specs.set(spec.id, merged);
      setState(spec.id, { spec: merged, placed: solved.placed[spec.id] || null });
    });
    return read();
  }

  function setPose(id, name, by = 'ai') {
    if (!specs.has(id)) return false;
    record(`pose ${id} ${name}`, by, [id], () => {
      const s = { ...specs.get(id), pose: name };
      specs.set(id, s);
      setState(id, { spec: s, placed: placedOf.get(id) || null });
    });
    return true;
  }

  function subjectsOf(ids) {
    return ids.map((id) => actorOf.get(id)).filter(Boolean).map((a) => {
      const b = mvp.actorBounds(a);
      return { id: a.metadata.id, box: { min: b.min.asArray(), max: b.max.asArray() }, yaw: (placedOf.get(a.metadata.id) || { yaw: 0 }).yaw };
    });
  }

  function frame(s) {
    const cam = mvp.camera;
    const aspect = scene.getEngine().getAspectRatio(cam);
    const c = frameCam(s, subjectsOf(s.subjects), aspect);
    cam.lockedTarget = null;
    cam.upperBetaLimit = Math.PI * 0.98;     // a blockout camera may look up at the horizon (the studio forbids it)
    cam.lowerRadiusLimit = 0.05;
    cam.upperRadiusLimit = 1000;
    cam.setTarget(BABYLON.Vector3.FromArray(c.target));
    cam.setPosition(BABYLON.Vector3.FromArray(c.position));
    cam.fov = c.fovY;
    shot = { ...s };
    return c;
  }

  function currentCam() {
    const cam = mvp.camera;
    cam.computeWorldMatrix(true);
    return {
      position: cam.position.asArray(),
      target: cam.getTarget().asArray(),
      fovY: cam.fov,
      aspect: scene.getEngine().getAspectRatio(cam),
    };
  }

  const PART_BONES = { head: 'Head', 'left hand': 'LeftHand', 'right hand': 'RightHand', 'left foot': 'LeftFoot', 'right foot': 'RightFoot' };
  function partsOf(a) {
    const out = {};
    for (const [part, name] of Object.entries(PART_BONES)) {
      const b = bone(a, name);
      if (!b) continue;
      b.computeWorldMatrix(true);
      out[part] = b.getAbsolutePosition().asArray();
    }
    return out;
  }

  function read() {
    const subjects = new Set(shot ? shot.subjects : []);
    const items = [...actorOf.entries()].filter(([, a]) => !a.isDisposed()).map(([id, a]) => {
      const p = placedOf.get(id);
      const kit = a.metadata.kit;
      let box;
      if (kit === 'marker') box = { min: [p.x, p.y, p.z], max: [p.x, p.y, p.z] };
      else { const b = mvp.actorBounds(a); box = { min: b.min.asArray(), max: b.max.asArray() }; }
      const parts = kit === 'figure' ? partsOf(a) : undefined;
      return { id, kit, box, yaw: p ? p.yaw : 0, floorY: p ? p.y : 0, subject: subjects.has(id), figure: kit === 'figure', parts };
    });
    const r = readback(currentCam(), items, lastProblems, shot ? shot.shot : undefined);
    window.__blockoutReadback = r.text;
    return r;
  }

  // ---------- clay / silhouette (one feature, two palettes) ----------
  const saved = { mats: new Map(), look: null, shadow: null, clear: null, ground: null, sky: null, hidden: [] };
  const sun = () => scene.lights.find((l) => l instanceof BABYLON.DirectionalLight);
  const ground = () => scene.getMeshByName('ground');
  function paint(a) {
    // clouds are hidden in these modes and rebuilt (disposed with their materials) when the settings load
    if (a.metadata && a.metadata.cloud) return;
    a.getChildMeshes().forEach((m) => {
      if (m.name === 'hitbox' || m instanceof BABYLON.InstancedMesh) return;
      if (!saved.mats.has(m)) saved.mats.set(m, m.material);
      m.material = currentMode === 'silhouette' ? inkMat : clayMat;
      const isFigure = a.metadata.kit === 'figure' || (a.metadata.clips && a.metadata.clips.length);
      m.renderOutline = currentMode === 'silhouette' && !!isFigure;
      if (m.renderOutline) { m.outlineColor = BABYLON.Color3.FromHexString(a.metadata.rim || '#ffffff'); m.outlineWidth = 0.012; }
    });
  }
  function mode(m) {
    const look = document.getElementById('lookOn');
    if (m !== 'off' && currentMode === 'off') {
      saved.look = look ? look.checked : null;
      saved.shadow = sun() ? sun().shadowEnabled : null;
      saved.clear = scene.clearColor.clone();
      saved.ground = ground() ? ground().material : null;
      saved.sky = mvp.getDome() ? mvp.getDome().mesh.isEnabled() : null;
    }
    currentMode = m;
    if (m === 'off') {
      saved.mats.forEach((mat, mesh) => { if (!mesh.isDisposed()) { mesh.material = mat; mesh.renderOutline = false; } });
      saved.mats.clear();
      if (look && saved.look !== null) { look.checked = saved.look; look.dispatchEvent(new Event('change', { bubbles: true })); }
      if (sun() && saved.shadow !== null) sun().shadowEnabled = saved.shadow;
      if (saved.clear) scene.clearColor = saved.clear;
      if (ground() && saved.ground) ground().material = saved.ground;
      if (mvp.getDome() && saved.sky !== null) mvp.getDome().mesh.setEnabled(saved.sky);
      saved.hidden.forEach((h) => { if (!h.isDisposed()) h.setEnabled(true); });
      saved.hidden = [];
      return m;
    }
    if (look && look.checked) { look.checked = false; look.dispatchEvent(new Event('change', { bubbles: true })); }
    // only the pieces, the floor and the horizon: backdrop rings, plates, clouds and sky go dark
    const rootOf = (m) => { for (let n = m; n; n = n.parent) { if (mvp.actors.includes(n)) return n; if (n.metadata && n.metadata.actor) return n.metadata.actor; } return null; };
    const inActor = (m) => { const r = rootOf(m); return !!r && !(r.metadata && r.metadata.cloud); };
    scene.meshes.forEach((m) => {
      if (m === ground() || [...sources.values()].includes(m) || !m.isEnabled() || inActor(m)) return;
      m.setEnabled(false);
      saved.hidden.push(m);
    });
    if (sun()) sun().shadowEnabled = false;
    if (mvp.getDome()) mvp.getDome().mesh.setEnabled(false);
    const bg = m === 'silhouette' ? SLATE : [0.93, 0.92, 0.89];
    scene.clearColor = new BABYLON.Color4(bg[0], bg[1], bg[2], 1);
    const g = ground();
    if (g) {
      const gm = new BABYLON.StandardMaterial('blockout floor', scene);
      gm.disableLighting = true;
      gm.emissiveColor = m === 'silhouette' ? BABYLON.Color3.FromArray(SLATE.map((v) => v * 0.8)) : BABYLON.Color3.FromArray(CLAY.map((v) => v * 1.12));
      g.material = gm;
    }
    mvp.actors.filter((a) => !a.isDisposed()).forEach(paint);
    sources.forEach((s) => { if (s) s.material = m === 'silhouette' ? setInkMat : clayMat; });
    return m;
  }

  // ---------- the teacher's hand: a drag is one op; a blockout piece moved by hand is pinned there ----------
  mvp.onDrop = (a, from) => {
    const id = a.metadata.id;
    if (!specs.has(id) || !from) return;
    const before = snapshot([id]);
    const p = { ...placedOf.get(id), x: a.position.x, z: a.position.z, yaw: Math.round(((a.rotationQuaternion.toEulerAngles().y * 180) / Math.PI) * 1000) / 1000 };
    const spec = { ...specs.get(id), at: [p.x, p.z] };
    delete spec.place;
    delete spec.face;
    spec.turn = p.yaw;
    specs.set(id, spec);
    placedOf.set(id, p);
    history.push(changeOp(`move ${id}`, 'teacher', before, snapshot([id]), setState));
  };

  window.addEventListener('keydown', (e) => {
    if (isTypingTarget(e.target) || !(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z' || !history.canUndo() && !history.canRedo()) return;
    e.preventDefault();
    if (e.shiftKey) history.redo(); else history.undo();
  });

  // ---------- save / load (scene-io v2) ----------
  function serialize() {
    return { mode: currentMode, shot, objects: [...specs.keys()].map((id) => ({ ...stateOf(id) })) };
  }
  async function load(data) {
    if (!data) return;
    await preload(data.objects.map((o) => o.spec.kit));
    data.objects.forEach((o) => setState(o.spec.id, o));
    if (data.shot) frame(data.shot);
    if (data.mode) mode(data.mode);
  }

  function clear() {
    [...actorOf.keys()].forEach(remove);
    specs.clear();
    placedOf.clear();
    shot = null;
    lastProblems = [];
  }

  mvp.blockout = {
    clear, isPiece: (a) => !!a && actorOf.get(a.metadata && a.metadata.id) === a,
    apply, place, pose: setPose, frame: (s) => { frame(s); return read(); }, read, mode, history,
    reframe: () => { if (shot) frame(shot); return read(); },   // the same preset at the canvas's current aspect
    undo: () => history.undo(), redo: () => history.redo(), serialize, load,
    specs: () => [...specs.values()].map((s) => structuredClone(s)),
    placed: () => Object.fromEntries(placedOf),
  };

  // ---------- the Gate 1 test shots ----------
  const params = new URLSearchParams(location.search);
  const name = params.get('blockout');
  if (name) {
    scene.executeWhenReady(async () => {
      try {
        const doc = await (await fetch(`blockout/${name}.json`)).json();
        mode(params.get('mode') || 'clay');
        const t0 = performance.now();
        const r = await apply(doc);
        console.log(`[blockout] ${name} applied in ${Math.round(performance.now() - t0)} ms\n${r.text}`);
        window.__blockoutReady = true;
      } catch (e) {
        console.error('[blockout] ' + name + ': ' + e.message);
        window.__blockoutError = e.message;
      }
    });
  }
})();
