import GUI from 'lil-gui';
import { WIPE } from './style.js';

// ?dev: scrub the timeline, play/pause, tweak every camera key, the look and the wipe, copy the keys out as JSON.
export function mountDevPanel(api) {
  const { clock, path, PARAMS, BEATS } = api;
  const gui = new GUI({ title: 'Museum intro (dev)', width: 300 });
  const state = { time: 0, playing: clock.playing, speed: 1 };
  const timeCtl = gui.add(state, 'time', 0, clock.duration, 0.01).onChange((t) => {
    clock.playing = false;
    state.playing = false;
    playCtl.updateDisplay();
    clock.seek(t);
  });
  const playCtl = gui.add(state, 'playing').name('play').onChange((p) => {
    if (p && clock.t >= clock.duration) clock.seek(0);
    clock.playing = p;
  });
  gui.add(state, 'speed', 0.1, 2, 0.05).onChange((s) => (clock.speed = s));
  gui.add({ restart: () => { clock.seek(0); clock.playing = state.playing = true; playCtl.updateDisplay(); } }, 'restart');
  api.onFrame = (t) => {
    state.time = t;
    timeCtl.updateDisplay();
  };

  const look = gui.addFolder('Look');
  const wipe = { override: false, amount: 0 };
  look.add(wipe, 'override').name('hold wipe at').onChange((on) => (api.wipeOverride = on ? wipe.amount : null));
  look.add(wipe, 'amount', 0, 1, 0.01).name('wipe amount').onChange((x) => wipe.override && (api.wipeOverride = x));
  look.add(WIPE.uSun.value, 'x', -1, 1, 0.01).name('sun x');
  look.add(WIPE.uSun.value, 'y', 0, 1, 0.01).name('sun y');
  const ship = api.world.ship.pivot;
  look.add(ship.rotation, 'y', -Math.PI, Math.PI, 0.01).name('ship yaw (live only)');
  look.add(PARAMS, 'figureHall', 0.1, 0.6, 0.01).name('figure size (hall)');
  look.add(PARAMS, 'figureWorld', 0.05, 0.5, 0.01).name('figure size (painting)');
  look.close();

  const beats = gui.addFolder('Beats (s)');
  for (const k of Object.keys(BEATS)) beats.add(BEATS, k, 0, clock.duration, 0.05);
  beats.close();

  const cam = gui.addFolder('Camera keys');
  path.keys.forEach((key, i) => {
    const f = cam.addFolder(`#${i} @ ${key.t}s (${key.ease})`);
    f.add(key, 't', 0, clock.duration, 0.05).onChange(() => path.rebuild());
    f.add(key, 'ease', ['settle', 'depart', 'arrive', 'float']).onChange(() => path.rebuild());
    ['x', 'y', 'z'].forEach((axis, a) => {
      f.add(key.pos, a, key.pos[a] - 4, key.pos[a] + 4, 0.01).name(`pos ${axis}`).onChange(() => path.rebuild());
    });
    ['x', 'y', 'z'].forEach((axis, a) => {
      f.add(key.look, a, key.look[a] - 4, key.look[a] + 4, 0.01).name(`look ${axis}`).onChange(() => path.rebuild());
    });
    f.add({ here: () => { clock.playing = false; clock.seek(key.t); } }, 'here').name('jump to key');
    f.close();
  });
  cam.add({ copy: () => navigator.clipboard.writeText(JSON.stringify(path.keys, null, 1)) }, 'copy').name('copy keys as JSON');
  cam.close();
  return gui;
}
