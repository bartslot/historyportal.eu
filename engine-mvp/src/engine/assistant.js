// The stage side of the lesson crew: what a crew member sees of the scene (snapshot) and the typed
// commands they send back (server.py /crew, validated there), run against the scene. Undo and the chat
// itself live in React (src/crew).
/* global BABYLON */
'use strict';

(() => {
  const mvp = window.__mvp;

  const byId = (id) => mvp.actors.find((a) => a.metadata.id === id);
  const sec = (t) => (t == null ? mvp.getFrame() : Math.round(t * mvp.FPS));
  const deg = (r) => Math.round(r * 180 / Math.PI);

  // What the model sees: ids, names, where things stand, their clips and keys. Nothing else.
  function snapshot() {
    return {
      time: +(mvp.getFrame() / mvp.FPS).toFixed(2),
      length: mvp.getLength(),
      sky: mvp.getSkyIndex(),
      catalog: mvp.CATALOG.filter((c) => !c.image).map((c) => c.name), // 3D items only: 240 images would flood the prompt
      objects: mvp.actors.filter((a) => !a.metadata.scenery).map((a) => {
        const st = mvp.stateAt(a, mvp.getFrame());
        const yaw = st.rotation.toEulerAngles().y;
        return {
          id: a.metadata.id,
          name: a.name,
          x: +st.position.x.toFixed(2),
          z: +st.position.z.toFixed(2),
          facing_degrees: deg(yaw),
          clips: a.metadata.clips.map((g) => g.name),
          key_times: mvp.keyTimes(a).map((t) => +t.toFixed(2)),
        };
      }),
    };
  }

  // ---------- the commands ----------
  async function run(commands) {
    const added = [];
    const resolve = (id) => {
      const m = /^new(\d+)$/.exec(id || '');
      return m ? added[Number(m[1]) - 1] : byId(id);
    };
    const done = [];
    for (const c of commands) {
      const a = c.id ? resolve(c.id) : null;
      const needsActor = ['move', 'walk', 'turn', 'face', 'scale', 'clip', 'delete', 'door'].includes(c.cmd);
      if (needsActor && !a) { done.push('skipped ' + c.cmd + ': no object ' + c.id); continue; }
      switch (c.cmd) {
        case 'add': {
          const item = mvp.CATALOG.find((i) => i.name.toLowerCase() === c.model.toLowerCase())
            || mvp.CATALOG.find((i) => i.name.toLowerCase().includes(c.model.toLowerCase()));
          if (!item) { done.push('skipped add: unknown model ' + c.model); break; }
          const a2 = await mvp.addFromCatalog(item, { x: c.x, z: c.z, turn: c.turn });
          if (a2.metadata.opening && !mvp.snapToNearestWall(a2)) {   // a door only exists on a wall
            mvp.deleteActor(a2);
            added.push(null);
            done.push('skipped ' + item.name + ': no wall within 30 m of that spot');
            break;
          }
          added.push(a2);
          done.push('added ' + item.name);
          break;
        }
        case 'move':
          mvp.keyAt(a, sec(c.at), { position: new BABYLON.Vector3(mvp.snap(c.x), 0, mvp.snap(c.z)) });
          done.push('moved ' + a.name);
          break;
        case 'walk': {
          const f0 = sec(c.start);
          const f1 = Math.max(f0 + 1, sec(c.end));
          const from = mvp.stateAt(a, f0).position;
          const to = new BABYLON.Vector3(c.x, 0, c.z);
          const facing = mvp.yawTowards(a, to.x - from.x, to.z - from.z);
          mvp.keyAt(a, f0, { position: from, rotation: facing });
          mvp.keyAt(a, f1, { position: to, rotation: facing });
          const walkClip = a.metadata.clips.find((g) => /walk/i.test(g.name));
          if (walkClip) {
            a.metadata.schedule = [...a.metadata.schedule.filter((w) => w.end <= f0 || w.start >= f1),
              { start: f0, end: f1, name: walkClip.name }];
          }
          done.push(a.name + ' walks ' + c.start + '–' + c.end + ' s');
          break;
        }
        case 'turn': {
          const f = sec(c.at);
          const q = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, -c.degrees * Math.PI / 180);
          mvp.keyAt(a, f, { rotation: q.multiply(mvp.stateAt(a, f).rotation) });
          done.push('turned ' + a.name);
          break;
        }
        case 'face': {
          const t = resolve(c.target);
          if (!t) { done.push('skipped face: no object ' + c.target); break; }
          const f = sec(c.at);
          const p = mvp.stateAt(a, f).position;
          const q = mvp.stateAt(t, f).position;
          mvp.keyAt(a, f, { rotation: mvp.yawTowards(a, q.x - p.x, q.z - p.z) });
          done.push(a.name + ' faces ' + t.name);
          break;
        }
        case 'scale': {
          const f = sec(c.at);
          mvp.keyAt(a, f, { scaling: mvp.stateAt(a, f).scaling.scale(c.factor) });
          done.push('scaled ' + a.name);
          break;
        }
        case 'clip':
          done.push(mvp.playClip(a, c.name) ? a.name + ' plays ' + c.name : 'skipped clip: ' + c.name + ' not on ' + a.name);
          break;
        case 'door':
          done.push(mvp.setDoor(a, c.open > 0.5, sec(c.at)) ? (c.open > 0.5 ? 'opened ' : 'closed ') + a.name : 'skipped door: ' + a.name + ' is not a placed door');
          break;
        case 'delete':
          mvp.deleteActor(a);
          done.push('deleted ' + a.name);
          break;
        case 'length':
          mvp.setLengthSeconds(Math.round(c.seconds));
          done.push('length ' + Math.round(c.seconds) + ' s');
          break;
        case 'sky':
          if (mvp.SKIES[c.index]) { mvp.setSky(mvp.SKIES[c.index]); done.push('sky ' + c.index); }
          break;
        case 'camera': {
          const t = resolve(c.target);
          if (!t) { done.push('skipped camera: no object ' + c.target); break; }
          // follow the object (it may walk away), from a sane default distance and height
          const cam = mvp.camera;
          cam.lockedTarget = t;
          cam.radius = c.distance || 9;
          cam.beta = Math.PI / 2 - (c.height != null ? c.height : 22) * Math.PI / 180;
          if (c.angle != null) cam.alpha = -Math.PI / 2 + c.angle * Math.PI / 180;
          done.push('camera on ' + t.name);
          break;
        }
        case 'play':
          break; // handled after the keys are in
        default:
          done.push('skipped ' + c.cmd);
      }
    }
    mvp.rebuildTimeline();
    mvp.goTo(0);
    if (commands.some((c) => c.cmd === 'play') && !mvp.isPlaying()) mvp.togglePlay();
    return done;
  }

  window.__animator = { snapshot, run };
})();
