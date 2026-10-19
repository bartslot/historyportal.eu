import * as THREE from 'three';
import { EASE } from './timeline.js';

// One continuous camera: Catmull-Rom through the key positions (and through the look targets), so the path has
// no corners; each segment's timing is eased by its intent (`settle` stops at the key, `depart`/`arrive` carry
// speed through it). Keys are plain numbers so the dev panel can edit them and copy them out as JSON.
export class CameraPath {
  constructor(keys) {
    this.keys = keys; // [{ t, pos:[x,y,z], look:[x,y,z], ease }]
    this.rebuild();
  }

  rebuild() {
    const v = (a) => new THREE.Vector3(...a);
    this.posCurve = new THREE.CatmullRomCurve3(this.keys.map((k) => v(k.pos)), false, 'centripetal');
    this.lookCurve = new THREE.CatmullRomCurve3(this.keys.map((k) => v(k.look)), false, 'centripetal');
  }

  // curve parameter for time t
  u(t) {
    const k = this.keys;
    const n = k.length - 1;
    if (t <= k[0].t) return 0;
    if (t >= k[n].t) return 1;
    let i = 1;
    while (k[i].t < t) i++;
    const local = (t - k[i - 1].t) / (k[i].t - k[i - 1].t);
    return (i - 1 + (EASE[k[i].ease] ?? EASE.settle)(local)) / n;
  }

  apply(camera, t) {
    const u = this.u(t);
    camera.position.copy(this.posCurve.getPoint(u));
    camera.lookAt(this.lookCurve.getPoint(u));
  }
}
