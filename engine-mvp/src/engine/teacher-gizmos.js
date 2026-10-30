// Teacher gizmos: the selected object gets two handles and nothing else.
//   turn ring   a thin circle on the floor around it; drag along the ring to turn it in the asset's own
//               turn_step (90° furniture, 45° people; Shift = free)
//   depth knob  a dot above it; drag up = further from the camera, down = nearer. Its real height never
//               changes (a figure is as tall as it is), it only moves in depth, feet on the floor grid.
// Both live on Babylon's utility layer, which draws after the storybook post chain, so the handles stay
// clean white lines instead of being painted over. Wall items (doors, cards) and clouds get no handles.
/* global BABYLON */
'use strict';

(() => {
  const mvp = window.__mvp;
  const scene = mvp.scene;
  const camera = mvp.camera;

  const DEFAULT_TURN_DEG = 90;      // when an object has no asset contract
  const RING_MARGIN = 0.35;         // metres beyond the object's footprint
  const RING_SEGMENTS = 96;
  const RING_GRAB = 0.3;            // metres, the invisible tube that catches the pointer
  const KNOB_SCREEN = 0.022;        // knob diameter as a fraction of the camera distance (constant on screen)
  const KNOB_GAP = 0.35;            // metres between the object's top and the knob
  const DEPTH_GAIN = 2.2;           // a drag over the full canvas height moves this many camera distances
  const NEAREST = 1.5;              // metres; the knob never pushes an object into the camera

  const layer = BABYLON.UtilityLayerRenderer.DefaultUtilityLayer;
  const ui = layer.utilityLayerScene;

  const white = new BABYLON.StandardMaterial('gizmo-white', ui);
  white.disableLighting = true;
  white.emissiveColor = BABYLON.Color3.White();
  const hidden = new BABYLON.StandardMaterial('gizmo-hit', ui);
  hidden.alpha = 0;

  // a hairline: a line mesh stays one pixel wide whatever the object's size or the camera distance
  const circle = Array.from({ length: RING_SEGMENTS + 1 }, (_, i) => {
    const t = i / RING_SEGMENTS * Math.PI * 2;
    return new BABYLON.Vector3(Math.cos(t), 0, Math.sin(t));
  });
  const ring = BABYLON.MeshBuilder.CreateLines('turn-ring', { points: circle }, ui);
  ring.color = BABYLON.Color3.White();
  ring.isPickable = false;
  const ringHit = BABYLON.MeshBuilder.CreateTorus('turn-ring-hit', { diameter: 2, thickness: RING_GRAB, tessellation: 48 }, ui);
  ringHit.material = hidden;
  ring.parent = ringHit;

  const knob = BABYLON.MeshBuilder.CreateSphere('depth-knob', { diameter: 1, segments: 16 }, ui);
  knob.material = white;
  const stem = BABYLON.MeshBuilder.CreateLines('depth-stem', { points: [BABYLON.Vector3.Zero(), BABYLON.Vector3.Up()] }, ui);
  stem.color = BABYLON.Color3.White();
  stem.isPickable = false;

  const handles = [ringHit, ring, knob, stem];
  const show = (on) => handles.forEach((m) => m.setEnabled(on));
  show(false);

  const onFloor = (a) => a && !a.isDisposed() && !a.metadata.opening && !a.metadata.cloud && !a.metadata.decal;
  let target = null;
  let busy = false; // a handle is being dragged: keep the handles where the drag started measuring from

  function footprint(a) {
    const { min, max } = mvp.actorBounds(a);
    return { radius: Math.hypot(max.x - min.x, max.z - min.z) / 2, top: max.y };
  }

  function place(a) {
    const { radius, top } = footprint(a);
    const r = radius + RING_MARGIN;
    ringHit.position.set(a.position.x, 0.03, a.position.z);
    ringHit.scaling.setAll(r);
    const dist = BABYLON.Vector3.Distance(camera.position, a.position);
    const size = dist * KNOB_SCREEN;
    knob.position.set(a.position.x, top + KNOB_GAP + size / 2, a.position.z);
    knob.scaling.setAll(size);
    stem.position.set(a.position.x, top + 0.05, a.position.z);
    stem.scaling.set(1, KNOB_GAP - 0.05, 1);
  }

  scene.onBeforeRenderObservable.add(() => {
    const a = mvp.getSelected();
    const want = onFloor(a) && !mvp.isPlaying() ? a : null;
    if (want !== target && !busy) { target = want; show(!!target); }
    if (target && !busy) place(target);
  });

  // The ring's far half passes BEHIND the object, and the overlay layer is always picked before the
  // scene, so a press on the object's own body turned it instead of moving it. Before every pointer
  // event (registered first, ahead of the overlay), the ring stops catching the pointer wherever the
  // object itself is under it.
  const ownedBy = (m, a) => m && m.metadata && m.metadata.actor === a;
  scene.onPrePointerObservable.add(() => {
    if (busy || !target) { ringHit.isPickable = true; return; }
    const hit = scene.pick(scene.pointerX, scene.pointerY, (m) => ownedBy(m, target));
    ringHit.isPickable = !(hit && hit.hit);
  }, undefined, true);

  // ---- turn ring ----
  let lastEvent = null; // Shift = free turning: the modifier keys of the latest pointer event
  ui.onPrePointerObservable.add((info) => { lastEvent = info.event; });
  const yawOf = (p, c) => Math.atan2(p.z - c.z, p.x - c.x);
  const turn = new BABYLON.PointerDragBehavior({ dragPlaneNormal: BABYLON.Axis.Y });
  turn.moveAttached = false;
  turn.useObjectOrientationForDragging = false;
  ringHit.addBehavior(turn);
  let turnStart = null;
  turn.onDragStartObservable.add((e) => {
    if (!target) return;
    busy = true;
    camera.detachControl();
    const step = (target.metadata.asset?.turn_step ?? DEFAULT_TURN_DEG) * Math.PI / 180;
    turnStart = { angle: yawOf(e.dragPlanePoint, target.position), q: target.rotationQuaternion.clone(), pos: target.position.clone(), step };
  });
  turn.onDragObservable.add((e) => {
    if (!turnStart || !target) return;
    let delta = yawOf(e.dragPlanePoint, target.position) - turnStart.angle;
    if (!(lastEvent && lastEvent.shiftKey)) delta = Math.round(delta / turnStart.step) * turnStart.step;
    // atan2 runs counter-clockwise seen from above; Babylon's +Y rotation runs clockwise, so negate
    target.rotationQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, -delta).multiply(turnStart.q);
    if (target.metadata.footprint) mvp.snapToFootprint(target, turnStart.pos.x, turnStart.pos.z); // a turned footprint may change its cells
  });
  turn.onDragEndObservable.add(() => {
    if (!turnStart) return;
    if (target && !mvp.fits(target)) {         // turned into something: back to how it stood
      mvp.flash(mvp.whyNot(target));
      target.rotationQuaternion = turnStart.q;
      target.position.copyFrom(turnStart.pos);
    } else if (target && mvp.onHandEdit) {
      mvp.onHandEdit(target, { position: turnStart.pos, rotation: turnStart.q }, 'turn');   // for the undo history
    }
    end();
    turnStart = null;
  });

  // ---- depth knob ----
  const depth = new BABYLON.PointerDragBehavior({ dragPlaneNormal: BABYLON.Axis.Z });
  depth.moveAttached = false;
  depth.useObjectOrientationForDragging = false;
  knob.addBehavior(depth);
  let depthStart = null;
  depth.onDragStartObservable.add(() => {
    if (!target) return;
    busy = true;
    camera.detachControl();
    const away = target.position.subtract(camera.position);
    away.y = 0;
    const dist = away.length();
    depthStart = { y: scene.pointerY, pos: target.position.clone(), dir: away.normalize(), dist };
  });
  depth.onDragObservable.add(() => {
    if (!depthStart || !target) return;
    const rise = (depthStart.y - scene.pointerY) / scene.getEngine().getRenderHeight(); // up = further
    const metres = Math.max(NEAREST - depthStart.dist, rise * DEPTH_GAIN * depthStart.dist);
    const p = depthStart.pos.add(depthStart.dir.scale(metres));
    mvp.snapToFootprint(target, p.x, p.z);
    place(target);
  });
  depth.onDragEndObservable.add(() => {
    if (!depthStart) return;
    if (target && !mvp.fits(target)) {         // pushed into something: back to where it stood
      mvp.flash(mvp.whyNot(target));
      target.position.copyFrom(depthStart.pos);
    }
    end();
    depthStart = null;
  });

  function end() {
    busy = false;
    camera.attachControl(scene.getEngine().getInputElement(), true);
    mvp.autoKey();
  }

  // say what a handle does before it is pressed: a hand on the ring, an up/down arrow on the dot
  const canvas = scene.getEngine().getRenderingCanvas();
  ui.onPrePointerObservable.add((info) => {
    if (info.type !== BABYLON.PointerEventTypes.POINTERMOVE || busy) return;
    const hit = ui.pick(scene.pointerX, scene.pointerY, (m) => m === ringHit || m === knob);
    const over = hit && hit.hit ? hit.pickedMesh : null;
    canvas.style.cursor = over === knob ? 'ns-resize' : over === ringHit ? 'grab' : '';
  });

  mvp.gizmos = { ring: ringHit, knob, getTarget: () => target, getBusy: () => (busy ? target : null) };
})();
