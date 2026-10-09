// Teacher bar: the few things you do to a selected object, right under it (Duplicate · Face camera ·
// Delete), and a strip of saved shots on the stage. A shot is just a camera view; click it to go back.
/* global BABYLON */
'use strict';

(() => {
  const mvp = window.__mvp;
  const scene = mvp.scene;
  const camera = mvp.camera;
  const engine = scene.getEngine();
  const stage = document.getElementById('stage');

  const BAR_GAP_PX = 28;       // below the object's foot point
  const DUPLICATE_OFFSET_M = 2; // to the side, so the copy is not hidden inside the original
  const SHOT_SECONDS = 0.8;
  const THUMB_W = 96;

  // ---------- selection bar ----------
  const bar = document.createElement('div');
  bar.id = 'selbar';
  bar.hidden = true;
  const button = (label, onClick) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = onClick;
    bar.appendChild(b);
    return b;
  };
  const dupBtn = button('Duplicate', duplicate);
  const faceBtn = button('Face camera', faceCamera);
  button('Delete', () => { const a = mvp.getSelected(); if (a) mvp.deleteActor(a); });
  stage.appendChild(bar);

  async function duplicate() {
    const a = mvp.getSelected();
    if (!a || !a.metadata.item) return;
    const yaw = a.rotationQuaternion.toEulerAngles().y * 180 / Math.PI;
    const copy = await mvp.addFromCatalog(a.metadata.item, { x: a.position.x + DUPLICATE_OFFSET_M, z: a.position.z, turn: yaw });
    mvp.select(copy);
    mvp.autoKey();
  }

  function faceCamera() {
    const a = mvp.getSelected();
    if (!a) return;
    a.rotationQuaternion = mvp.yawTowards(a, camera.position.x - a.position.x, camera.position.z - a.position.z);
    mvp.autoKey();
  }

  const onWall = (a) => a.metadata.opening || a.metadata.decal || a.metadata.cloud;
  scene.onAfterRenderObservable.add(() => {
    const a = mvp.getSelected();
    const show = !!a && !a.isDisposed() && !mvp.isPlaying();
    bar.hidden = !show;
    if (!show) return;
    dupBtn.hidden = !a.metadata.item;
    faceBtn.hidden = !!onWall(a);
    const w = engine.getRenderWidth();
    const h = engine.getRenderHeight();
    const p = BABYLON.Vector3.Project(a.getAbsolutePosition(), BABYLON.Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(w, h));
    const k = stage.clientWidth / w;
    const x = Math.min(Math.max(p.x * k, bar.offsetWidth / 2 + 8), stage.clientWidth - bar.offsetWidth / 2 - 8);
    const y = Math.min(p.y * k + BAR_GAP_PX, stage.clientHeight - bar.offsetHeight - 8);
    bar.style.transform = `translate(${x - bar.offsetWidth / 2}px, ${y}px)`;
  });

  // ---------- shots ----------
  const strip = document.createElement('div');
  strip.id = 'shots';
  const add = document.createElement('button');
  add.className = 'add';
  add.textContent = 'Save shot';
  add.onclick = saveShot;
  strip.appendChild(add);
  stage.appendChild(strip);
  const shots = [];

  function saveShot() {
    const canvas = engine.getRenderingCanvas();
    const thumb = document.createElement('canvas');
    thumb.width = THUMB_W;
    thumb.height = Math.round(THUMB_W * canvas.height / canvas.width);
    scene.render(); // the drawing buffer is only guaranteed right after a render
    thumb.getContext('2d').drawImage(canvas, 0, 0, thumb.width, thumb.height);
    const shot = { alpha: camera.alpha, beta: camera.beta, radius: camera.radius, target: camera.target.clone() };
    shots.push(shot);
    const tile = document.createElement('div');
    tile.className = 'shot';
    const img = document.createElement('img');
    img.src = thumb.toDataURL('image/jpeg', 0.8);
    img.alt = 'Shot ' + shots.length;
    img.onclick = () => goToShot(shot);
    const del = document.createElement('button');
    del.textContent = '×';
    del.setAttribute('aria-label', 'Remove shot');
    del.onclick = () => { shots.splice(shots.indexOf(shot), 1); tile.remove(); };
    tile.append(img, del);
    strip.insertBefore(tile, add);
  }

  let tween = null;
  function goToShot(shot) {
    if (tween) scene.onBeforeRenderObservable.remove(tween);
    const from = { alpha: camera.alpha, beta: camera.beta, radius: camera.radius, target: camera.target.clone() };
    // turn the short way round
    let dAlpha = (shot.alpha - from.alpha) % (Math.PI * 2);
    if (dAlpha > Math.PI) dAlpha -= Math.PI * 2;
    if (dAlpha < -Math.PI) dAlpha += Math.PI * 2;
    const t0 = performance.now();
    tween = scene.onBeforeRenderObservable.add(() => {
      const k = Math.min(1, (performance.now() - t0) / (SHOT_SECONDS * 1000));
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; // ease in-out: a camera move, not a cut
      camera.setTarget(BABYLON.Vector3.Lerp(from.target, shot.target, e)); // first: it recomputes alpha/beta
      camera.alpha = from.alpha + dAlpha * e;
      camera.beta = from.beta + (shot.beta - from.beta) * e;
      camera.radius = from.radius + (shot.radius - from.radius) * e;
      if (k >= 1) { scene.onBeforeRenderObservable.remove(tween); tween = null; }
    });
  }

  mvp.shots = { list: () => shots, save: saveShot, goTo: goToShot };
})();
