import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Clock, EASE, span } from './timeline.js';
import { CameraPath } from './cameraPath.js';
import { buildMuseum } from './museum.js';
import { buildSilhouettes } from './silhouettes.js';
import { StickFigure } from './stickFigure.js';
import { Sparkles } from './sparkles.js';
import { buildWorld, EYE } from './world.js';
import { WIPE } from './style.js';
import { BEATS, DURATION, PARAMS, figureAt, swapAmount, wipeAmount } from './script.js';
import { defaultCameraKeys } from './cameraKeys.js';

const HALL_ASSETS = ['vroom', 'milkmaid', 'avercamp', 'swan', ...['point', 'hat', 'kid', 'old', 'teen'].map((n) => `sil_${n}`)];
const WORLD_ASSETS = ['hull', 'sail', 'sea', 'sky'].flatMap((n) => [`${n}_paint`, `${n}_lines`]).concat(['tasman_paint', 'tasman_lines', 'sailor_front', 'sailor_threequarter', 'pieter_looking_up_mast']);
const LINES = { nl: 'Ah, daar ben je!', en: 'Ah, there you are!' };
const H_FOV = 50; // horizontal field of view we try to keep; phones get a taller vertical one, clamped
const HALL_BG = new THREE.Color(0x24211d);

const query = new URLSearchParams(location.search);
const lang = query.get('lang') === 'en' ? 'en' : 'nl';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = HALL_BG;
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; // the gilt needs something to reflect
const camera = new THREE.PerspectiveCamera(40, 1, 0.02, 200);
let sparkles;

async function loadTextures(cards) {
  const loader = new THREE.TextureLoader();
  const bar = document.getElementById('load-bar');
  // the 7680 px painting only where the GPU takes 8k textures and the screen is big enough to show it
  const hd = renderer.capabilities.maxTextureSize >= 8192 && Math.max(innerWidth, innerHeight) * devicePixelRatio >= 1600 && !query.has('sd');
  const jobs = [
    ...HALL_ASSETS.map((n) => [n, `./assets/${n === 'vroom' && hd ? 'vroom_hd' : n}.webp`]),
    ...WORLD_ASSETS.map((n) => [n, `./assets/world/${n}.webp`]),
    ...cards.map((c) => [c.file, `./assets/cards/${c.file}`]),
  ];
  let done = 0;
  const entries = await Promise.all(
    jobs.map(async ([name, url]) => {
      const tex = await loader.loadAsync(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      bar.style.transform = `scaleX(${++done / jobs.length})`;
      return [name, tex];
    }),
  );
  return Object.fromEntries(entries);
}

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  const v = (2 * Math.atan(Math.tan((H_FOV * Math.PI) / 360) / camera.aspect) * 180) / Math.PI;
  camera.fov = Math.min(70, Math.max(30, v));
  camera.updateProjectionMatrix();
  const px = renderer.getDrawingBufferSize(new THREE.Vector2());
  WIPE.uRes.value.copy(px);
  sparkles.resize(px.y, camera.fov);
}

async function start() {
  const cards = await (await fetch('./assets/cards/cards.json')).json();
  const tex = await loadTextures(cards);
  const { voc, group: hall } = buildMuseum(scene, tex);
  const world = await buildWorld(scene, tex, cards);
  const A = world.anchors;
  PARAMS.figureWorld = A.man * 0.36;
  const silhouettes = buildSilhouettes(scene, tex);
  const figure = new StickFigure();
  scene.add(figure.mesh);
  sparkles = new Sparkles();
  scene.add(sparkles.points);
  const path = new CameraPath(defaultCameraKeys(A, EYE));
  const clock = new Clock(DURATION);

  const balloon = document.getElementById('balloon');
  balloon.querySelector('span').textContent = LINES[lang];
  const startBtn = document.getElementById('start');
  const ripple = document.getElementById('ripple');
  const fade = document.getElementById('fade');

  resize();
  addEventListener('resize', resize);

  const tmp = new THREE.Vector3();
  const landCam = camera.clone();
  const toScreen = (p) => {
    tmp.copy(p).project(camera);
    return [(tmp.x * 0.5 + 0.5) * innerWidth, (-tmp.y * 0.5 + 0.5) * innerHeight];
  };

  function render(t) {
    path.apply(camera, t);
    camera.updateMatrixWorld();

    // the canvas fades out while the camera holds at the painter's eye; the world behind it lines up
    const swap = swapAmount(t);
    voc.material.opacity = 1 - swap;
    voc.visible = swap < 1;
    world.group.visible = t > BEATS.swapStart - 0.3;
    hall.visible = camera.position.z > -0.3; // once through the frame the hall is behind us; its back would show
    world.update(t, camera);
    silhouettes.update(t, camera);

    // painterly -> History Lines: an ink stain spreading from where the figure lands on the sail
    WIPE.uWipe.value = api.wipeOverride ?? wipeAmount(t);
    // the stain starts where the figure lands (seen by the camera AT the landing), then stays put on screen while
    // it spreads and the camera moves on; computed from the path so scrubbing gives the same frame
    landCam.copy(camera);
    path.apply(landCam, BEATS.land);
    landCam.updateMatrixWorld();
    tmp.copy(A.sail).project(landCam);
    WIPE.uWipeOrigin.value.set(tmp.x * 0.5 + 0.5, tmp.y * 0.5 + 0.5);

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
    const [mx, by] = toScreen(A.mouth);
    const bw = balloon.firstElementChild.nextElementSibling.offsetWidth + 14;
    const bx = Math.min(mx, innerWidth - bw - 16); // phones: keep the balloon on screen
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
  const api = { clock, path, world, render, A, PARAMS, BEATS };
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
