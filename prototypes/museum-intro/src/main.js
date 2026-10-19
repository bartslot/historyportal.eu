import * as THREE from 'three';
import { Clock, EASE, span } from './timeline.js';
import { CameraPath } from './cameraPath.js';
import { buildMuseum, HALL } from './museum.js';
import { buildSilhouettes } from './silhouettes.js';
import { StickFigure } from './stickFigure.js';
import { Sparkles } from './sparkles.js';
import { Diorama } from './diorama.js';
import { BEATS, DURATION, PARAMS, anchors, depthAmount, figureAt } from './script.js';
import { defaultCameraKeys } from './cameraKeys.js';

const ASSETS = ['vroom', 'vroom_depth', 'vroom_plate', 'vroom_plate_depth', 'milkmaid', 'avercamp', 'swan', 'tasman', ...[1, 2, 3, 4, 5, 6, 7].map((i) => `sil_${i}`)];
const LINES = { nl: 'Ah, daar ben je!', en: 'Ah, there you are!' };
const H_FOV = 56; // horizontal field of view we try to keep; phones get a taller vertical one, clamped
const IN_PAINTING_BG = new THREE.Color(0xc9cdbf);
const HALL_BG = new THREE.Color(0x24211d);

const query = new URLSearchParams(location.search);
const lang = query.get('lang') === 'en' ? 'en' : 'nl';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = HALL_BG.clone();
const camera = new THREE.PerspectiveCamera(40, 1, 0.03, 80);

async function loadTextures() {
  const loader = new THREE.TextureLoader();
  const bar = document.getElementById('load-bar');
  let done = 0;
  // the 7680 px painting only where the GPU takes 8k textures and the screen is big enough to show it
  const hd = renderer.capabilities.maxTextureSize >= 8192 && Math.max(innerWidth, innerHeight) * devicePixelRatio >= 1600;
  const file = (name) => (name === 'vroom' && hd && !query.has('sd') ? 'vroom_hd' : name);
  const entries = await Promise.all(
    ASSETS.map(async (name) => {
      const tex = await loader.loadAsync(`./assets/${file(name)}.webp`);
      tex.colorSpace = name.endsWith('depth') ? THREE.NoColorSpace : THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      bar.style.transform = `scaleX(${++done / ASSETS.length})`;
      return [name, tex];
    }),
  );
  return Object.fromEntries(entries);
}

function buildTasman(tex) {
  const w = PARAMS.tasmanH * (tex.image.width / tex.image.height);
  const geo = new THREE.PlaneGeometry(w, PARAMS.tasmanH);
  geo.translate(0, PARAMS.tasmanH / 2, 0);
  // a warm varnish multiply pulls the clean History Lines colours a little towards Vroom's palette
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.05, color: new THREE.Color(0xe6d6b8), depthWrite: false });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 5;
  return m;
}

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  const v = (2 * Math.atan(Math.tan((H_FOV * Math.PI) / 360) / camera.aspect) * 180) / Math.PI;
  camera.fov = Math.min(72, Math.max(38, v));
  camera.updateProjectionMatrix();
  sparkles.resize(h * Math.min(devicePixelRatio, 2), camera.fov);
}

let sparkles;

async function start() {
  const tex = await loadTextures();
  buildMuseum(scene, tex);
  const v = HALL.voc;
  const eye = new THREE.Vector3(v.x, v.y, 4.3); // the painter's viewpoint the depth is built around
  const frameAt = { center: new THREE.Vector3(v.x, v.y, 0), size: new THREE.Vector2(v.w, v.h), eye };
  // the painting, cut at object edges, over a plate with the ships inpainted away (shows through the cuts)
  const dio = new Diorama({ ...frameAt, map: tex.vroom, depth: tex.vroom_depth, cut: PARAMS.cut });
  const plate = new Diorama({ ...frameAt, map: tex.vroom_plate, depth: tex.vroom_plate_depth, segments: [200, 92], push: 0.06, over: 1.8 });
  plate.mesh.renderOrder = -1;
  scene.add(plate.mesh, dio.mesh);
  const A = anchors(dio);
  const tasman = buildTasman(tex.tasman);
  tasman.position.copy(A.tasmanFeet);
  scene.add(tasman);
  const silhouettes = buildSilhouettes(scene, tex);
  const figure = new StickFigure();
  scene.add(figure.mesh);
  sparkles = new Sparkles();
  scene.add(sparkles.points);
  const path = new CameraPath(defaultCameraKeys(A, eye));
  const clock = new Clock(DURATION);

  const balloon = document.getElementById('balloon');
  balloon.querySelector('span').textContent = LINES[lang];
  const startBtn = document.getElementById('start');
  const ripple = document.getElementById('ripple');
  const fade = document.getElementById('fade');

  resize();
  addEventListener('resize', resize);

  const tmp = new THREE.Vector3();
  const toScreen = (p) => {
    tmp.copy(p).project(camera);
    return [(tmp.x * 0.5 + 0.5) * innerWidth, (-tmp.y * 0.5 + 0.5) * innerHeight];
  };

  function render(t) {
    dio.depthAmount = plate.depthAmount = depthAmount(t);
    plate.mesh.visible = dio.depthAmount > 0.01;
    plate.uniforms.uBright.value = dio.uniforms.uBright.value;
    const inside = span(t, BEATS.openStart + 1.2, BEATS.openEnd + 1.0);
    dio.uniforms.uBright.value = 0.9 + 0.1 * inside;
    scene.background.copy(HALL_BG).lerp(IN_PAINTING_BG, inside);
    path.apply(camera, t);
    silhouettes.update(t, camera);

    // Tasman notices: one small bounce
    const n = t - BEATS.notice;
    tasman.position.y = A.tasmanFeet.y + (n > 0 ? 0.03 * Math.exp(-n * 5) * Math.abs(Math.sin(n * 11)) : 0);
    tasman.visible = t > BEATS.openStart;
    tasman.quaternion.copy(camera.quaternion);

    const f = figureAt(t, A);
    figure.mesh.visible = !!f;
    if (f) {
      figure.draw({ pose: f.pose, anchor: f.anchor, facing: f.facing, reveal: +f.reveal.toFixed(3), squash: +f.squash.toFixed(3) }, t);
      figure.mesh.position.copy(f.pos);
      figure.mesh.scale.setScalar(f.scale);
      figure.mesh.quaternion.copy(camera.quaternion);
    }
    sparkles.update(t, (b) => {
      const s = figureAt(b, A);
      return s && { pos: s.pos.clone().add(new THREE.Vector3(0, s.scale * 0.4, 0)), rate: s.spark ?? 0.2, scale: s.scale };
    });

    // ink ripple where the figure dives into the paint
    const rp = span(t, BEATS.dive - 0.05, BEATS.dive + 0.9, EASE.arrive);
    ripple.style.opacity = rp > 0 && rp < 1 ? String(1 - rp) : '0';
    if (rp > 0 && rp < 1) {
      const [x, y] = toScreen(A.dive);
      ripple.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${0.3 + rp * 1.6})`;
    }

    // speech balloon: silent text, pops with a small overshoot (content, not UI chrome)
    const b = span(t, BEATS.balloon, BEATS.balloon + 0.45, EASE.pop);
    balloon.style.opacity = String(Math.min(1, b * 2));
    const [bx, by] = toScreen(A.mouth);
    balloon.style.transform = `translate(${bx}px, ${by}px) scale(${0.6 + 0.4 * b})`;

    const s = span(t, BEATS.start, BEATS.start + 0.6, EASE.arrive);
    startBtn.style.opacity = String(s);
    startBtn.style.transform = `translate(-50%, ${(1 - s) * 16}px)`;
    startBtn.style.pointerEvents = s > 0.5 ? 'auto' : 'none';

    fade.style.opacity = String(1 - span(t, 0, 1.2, EASE.settle));
    renderer.render(scene, camera);
  }

  startBtn.addEventListener('click', () => {
    startBtn.textContent = lang === 'nl' ? 'Het spel komt nog' : 'The game is coming';
  });

  if (reducedMotion) {
    clock.seek(DURATION); // calm end frame; the dev panel can still play it
    clock.playing = false;
  }

  let last = performance.now();
  const api = { clock, path, dio, render, A, PARAMS, BEATS, rebuildCamera: () => path.rebuild() };
  window.__intro = api; // used by the frame-strip capture and the dev panel
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    render(clock.tick(dt));
    api.onFrame?.(clock.t);
  });
  document.body.classList.add('ready');

  if (query.has('dev')) (await import('./devPanel.js')).mountDevPanel(api);
}

start().catch((err) => {
  console.error(err);
  document.getElementById('error').textContent = 'Could not load the museum. Reload the page to try again.';
});
