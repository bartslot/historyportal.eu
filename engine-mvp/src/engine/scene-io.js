// A scene as data, and back. What a scene IS in the studio: its objects (catalog entry, world pose,
// what they are attached to), the keyframe tracks, the look and sky settings, the camera and its
// saved shots. Clouds are not stored: they grow again from the cloud settings.
// Saving reads the live engine; loading clears it and rebuilds, mapping old actor ids to new ones
// so the tracks keep pointing at the right things.
/* global BABYLON */
'use strict';
import * as TL from '../timeline/model';
import { ADVANCED } from '../scene-controls';

export const SCENE_VERSION = 2;   // 2: a clay blockout (kit pieces as specs, the shot, the mode); 1 still loads

(() => {
  const mvp = window.__mvp;
  const camera = mvp.camera;
  const SETTINGS = ['lookPreset', 'lookTime', 'cloudAmount', ...ADVANCED.flatMap((g) => g.controls.map((c) => c.id))];
  // blockout pieces are saved as their specs (blockout.serialize), not as catalog actors
  const stored = (a) => !a.isDisposed() && !a.metadata.cloud && !(mvp.blockout && mvp.blockout.isPiece(a));

  function readSettings() {
    const out = {};
    for (const id of SETTINGS) {
      const el = document.getElementById(id);
      if (el) out[id] = el.type === 'checkbox' ? el.checked : el.value;
    }
    return out;
  }

  function writeSettings(values) {
    // the preset first: choosing it rewrites the look sliders, which the saved values then override
    for (const id of SETTINGS) {
      if (!(id in values)) continue;
      const el = document.getElementById(id);
      if (!el) continue;
      if (el.type === 'checkbox') el.checked = !!values[id]; else el.value = values[id];
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function serialize() {
    const list = mvp.actors.filter(stored);
    const index = new Map(list.map((a, i) => [a, i]));
    const actors = list.map((a) => {
      const parent = a.parent && index.has(a.parent) ? index.get(a.parent) : null;
      const p = a.getAbsolutePosition();
      const q = a.absoluteRotationQuaternion || a.rotationQuaternion;
      return {
        id: a.metadata.id,
        item: a.metadata.item ? a.metadata.item.name : a.name,
        image: a.metadata.item && a.metadata.item.image && !String(a.metadata.item.image).startsWith('blob:') ? a.metadata.item.image : null,
        position: [p.x, p.y, p.z], rotation: [q.x, q.y, q.z, q.w], scaling: a.scaling.asArray(),
        parent, hidden: !a.isEnabled(),
        clip: a.metadata.clip || null, schedule: a.metadata.schedule || [], doorKeys: a.metadata.doorKeys || null,
      };
    });
    const st = TL.getState();
    return {
      version: SCENE_VERSION,
      actors,
      town: window.__city ? { seed: window.__city.getSeed() } : null,
      timeline: { tracks: st.tracks, duration: st.duration },
      sky: mvp.getDome()?.metadata?.url ?? null,
      settings: readSettings(),
      camera: { alpha: camera.alpha, beta: camera.beta, radius: camera.radius, target: camera.target.asArray() },
      shots: mvp.shots.list().map((s) => ({ alpha: s.alpha, beta: s.beta, radius: s.radius, target: s.target.asArray(), image: s.image })),
      blockout: mvp.blockout ? mvp.blockout.serialize() : null,
    };
  }

  // keepBlockout: the studio's own scene only (a crew answer's studio commands undone); the blockout stays as it is
  function clear({ keepBlockout = false } = {}) {
    mvp.select(null);
    if (mvp.blockout && !keepBlockout) mvp.blockout.clear();   // first: its pieces share materials deleteActor would dispose
    const piece = (a) => mvp.blockout && mvp.blockout.isPiece(a);
    [...mvp.actors].filter((a) => !a.isDisposed() && !a.metadata.cloud && !a.parent && !piece(a)).forEach((a) => mvp.deleteActor(a));
    [...mvp.actors].filter((a) => !a.isDisposed() && !a.metadata.cloud && !piece(a)).forEach((a) => mvp.deleteActor(a));
    TL.setTracks([], { time: 0, selected: [], hidden: {} });
    mvp.shots.set([]);
  }

  const findItem = (s) => mvp.CATALOG.find((c) => (s.image ? c.image === s.image : c.name === s.item && !c.image));

  /** Replace the scene with `doc`. Items no longer in the catalog are skipped and reported. */
  async function load(doc, { keepBlockout = false } = {}) {
    if (!doc || !(doc.version === 1 || doc.version === SCENE_VERSION)) throw new Error('This scene was saved by another version of the studio');
    clear({ keepBlockout });
    if (doc.settings) writeSettings(doc.settings);
    if (doc.sky) mvp.setSky(doc.sky);
    if (doc.town && window.__city) window.__city.setSeed(doc.town.seed);
    const made = [];
    const missing = [];
    const ids = {};
    for (const s of doc.actors) {
      const item = findItem(s);
      if (!item) { missing.push(s.item); made.push(null); continue; }
      const a = await mvp.addFromCatalog(item, { x: s.position[0], z: s.position[2] });
      a.position.set(...s.position);
      a.rotationQuaternion = new BABYLON.Quaternion(...s.rotation);
      a.scaling.set(...s.scaling);
      a.metadata.clip = s.clip;
      a.metadata.schedule = s.schedule;
      if (s.doorKeys) a.metadata.doorKeys = s.doorKeys;
      if (s.clip) mvp.playClip(a, s.clip);
      ids[TL.targetOfId(s.id)] = TL.targetOf(a);
      made.push(a);
    }
    // attachments last, once every host exists: setParent keeps the world pose
    doc.actors.forEach((s, i) => {
      const a = made[i];
      const host = s.parent !== null ? made[s.parent] : null;
      if (!a || !host) return;
      a.setParent(host);
      if (a.metadata.opening) {
        a.metadata.onWall = true;
        a.metadata.lastValid = { parent: host, position: a.position.clone(), rotation: a.rotationQuaternion.clone() };
      }
      if (a.metadata.decal) a.metadata.onSurface = true;
    });
    const tracks = (doc.timeline?.tracks ?? []).filter((t) => ids[t.target]).map((t) => ({ ...t, target: ids[t.target] }));
    const hidden = {};
    doc.actors.forEach((s, i) => { if (s.hidden && made[i]) { made[i].setEnabled(false); hidden[TL.targetOf(made[i])] = true; } });
    TL.setTracks(tracks, { duration: doc.timeline?.duration ?? TL.DEFAULT_DURATION, time: 0, hidden });
    if (doc.camera) {
      camera.setTarget(BABYLON.Vector3.FromArray(doc.camera.target));
      Object.assign(camera, { alpha: doc.camera.alpha, beta: doc.camera.beta, radius: doc.camera.radius });
    }
    mvp.shots.set(doc.shots ?? []);
    if (doc.blockout && mvp.blockout && !keepBlockout) await mvp.blockout.load(doc.blockout);
    mvp.select(null);
    return { missing };
  }

  mvp.sceneIO = { serialize, load, clear };
})();
