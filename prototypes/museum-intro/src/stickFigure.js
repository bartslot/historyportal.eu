import * as THREE from 'three';

// The class's magic companion: an ink stick figure drawn on a canvas, re-drawn on "twos" (12 fps) with a small
// boil so it feels hand-drawn. Poses are joint angles (0 = limb hangs down, + = swings to the front), blended
// by code; the walk cycle, anticipation crouch, jump, fall, slide and sit are all procedural.
// Knees only ever bend backwards (shin = thigh - knee, knee >= 0), elbows only forwards (forearm = upper + elbow).

const LIMB = { thigh: 0.24, shin: 0.23, upper: 0.18, fore: 0.17, torso: 0.33, headR: 0.1 };
const PX = 150; // canvas px per figure height
const CANVAS = 320;
const ANCHOR = [160, 210];
const BOIL_FPS = 12;

export const POSES = {
  idle: { lean: 0, hipL: 0.06, kneeL: 0.06, hipR: -0.06, kneeR: 0.05, shL: 0.18, elL: 0.25, shR: -0.15, elR: 0.3, head: 0 },
  lookUp: { lean: -0.12, hipL: 0.06, kneeL: 0.05, hipR: -0.08, kneeR: 0.04, shL: 0.1, elL: 0.2, shR: -0.25, elR: 0.25, head: -0.55 },
  crouch: { lean: 0.35, hipL: 1.05, kneeL: 1.9, hipR: 0.95, kneeR: 1.8, shL: -0.9, elL: 0.2, shR: -1.0, elR: 0.25, head: -0.35 },
  jump: { lean: -0.1, hipL: 0.15, kneeL: 0.2, hipR: -0.25, kneeR: 0.35, shL: 2.7, elL: 0.15, shR: 2.5, elR: 0.2, head: -0.3 },
  fall: { lean: 0.05, hipL: 0.35, kneeL: 0.55, hipR: -0.2, kneeR: 0.7, shL: 2.9, elL: 0.3, shR: -2.7, elR: 0.3, head: 0.15 },
  land: { lean: 0.25, hipL: 0.8, kneeL: 1.4, hipR: 0.7, kneeR: 1.3, shL: 1.2, elL: 0.3, shR: -1.0, elR: 0.3, head: 0.1 },
  slide: { lean: 0.05, hipL: 0.7, kneeL: 1.3, hipR: 0.45, kneeR: 1.1, shL: 2.95, elL: 0.35, shR: 2.75, elR: 0.45, head: 0.25 },
  sit: { lean: -0.05, hipL: 1.5, kneeL: 1.45, hipR: 1.45, kneeR: 1.6, shL: 0.5, elL: 0.6, shR: 2.4, elR: 0.6, head: -0.15 },
};

export function blendPose(a, b, t) {
  const out = {};
  for (const k of Object.keys(a)) out[k] = a[k] + (b[k] - a[k]) * t;
  return out;
}

export function walkPose(phase, amount = 1) {
  const w = phase * Math.PI * 2;
  const swingL = Math.max(0, Math.cos(w));
  const swingR = Math.max(0, Math.cos(w + Math.PI));
  const walk = {
    lean: 0.08,
    hipL: 0.5 * Math.sin(w),
    kneeL: 0.08 + 0.85 * swingL,
    hipR: 0.5 * Math.sin(w + Math.PI),
    kneeR: 0.08 + 0.85 * swingR,
    shL: -0.45 * Math.sin(w),
    elL: 0.35,
    shR: -0.45 * Math.sin(w + Math.PI),
    elR: 0.35,
    head: 0.04 * Math.sin(2 * w),
  };
  return blendPose(POSES.idle, walk, amount);
}

const polar = (o, len, a) => [o[0] + Math.sin(a) * len, o[1] - Math.cos(a) * len];

// joint positions in figure units, y up, hip at (0, 0)
function skeleton(p) {
  const hip = [0, 0];
  const neck = [Math.sin(p.lean) * LIMB.torso, Math.cos(p.lean) * LIMB.torso];
  const head = [neck[0] + Math.sin(p.lean + p.head * 0.5) * 0.12, neck[1] + Math.cos(p.lean + p.head * 0.5) * 0.12];
  const kL = polar(hip, LIMB.thigh, p.hipL);
  const kR = polar(hip, LIMB.thigh, p.hipR);
  const fL = polar(kL, LIMB.shin, p.hipL - p.kneeL);
  const fR = polar(kR, LIMB.shin, p.hipR - p.kneeR);
  const sh = [hip[0] + (neck[0] - hip[0]) * 0.92, hip[1] + (neck[1] - hip[1]) * 0.92];
  const eL = polar(sh, LIMB.upper, p.shL);
  const eR = polar(sh, LIMB.upper, p.shR);
  const hL = polar(eL, LIMB.fore, p.shL + p.elL);
  const hR = polar(eR, LIMB.fore, p.shR + p.elR);
  return { hip, neck, head, kL, kR, fL, fR, sh, eL, eR, hL, hR, headTilt: p.head };
}

function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export class StickFigure {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = CANVAS;
    this.g = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    const size = CANVAS / PX;
    const geo = new THREE.PlaneGeometry(size, size);
    // move the canvas anchor to the object origin
    geo.translate(size / 2 - ANCHOR[0] / PX, ANCHOR[1] / PX - size / 2, 0);
    this.mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, depthTest: false, depthWrite: false }),
    );
    this.mesh.renderOrder = 10;
    this.lastKey = '';
  }

  // state: { pose, anchor: 'feet'|'hip', facing: 1|-1, reveal: 0..1, squash: 1 }
  draw(state, t) {
    const boil = Math.floor(t * BOIL_FPS);
    const key = `${boil}|${JSON.stringify(state)}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    const s = skeleton(state.pose);
    // ground the figure: the lowest foot stands on the anchor (walking stays planted), or the hip sits on it
    const dy = state.anchor === 'hip' ? 0 : -Math.min(s.fL[1], s.fR[1]);
    const sq = state.squash ?? 1;
    const jitter = (i) => (hash(boil * 31 + i) - 0.5) * 0.018;
    const P = ([x, y], i) => [
      ANCHOR[0] + (x * state.facing / Math.sqrt(sq) + jitter(i)) * PX,
      ANCHOR[1] - ((y + dy) * sq + jitter(i + 7)) * PX,
    ];
    const strokes = [
      [s.hip, s.neck],
      [s.hip, s.kL, s.fL],
      [s.hip, s.kR, s.fR],
      [s.sh, s.eL, s.hL],
      [s.sh, s.eR, s.hR],
    ];
    const g = this.g;
    g.clearRect(0, 0, CANVAS, CANVAS);
    g.lineCap = g.lineJoin = 'round';
    const reveal = state.reveal ?? 1;
    // warm magic glow + paper edge first (reads on dark walls and hulls), ink on top
    for (const [color, width, glow] of [['rgba(255,214,140,0.55)', 16, 18], ['rgba(250,240,220,0.95)', 12, 0], ['#17120d', 6.5, 0]]) {
      g.strokeStyle = color;
      g.lineWidth = width;
      g.shadowColor = 'rgba(255,190,90,0.9)';
      g.shadowBlur = glow;
      strokes.forEach((pts, si) => {
        const r = Math.min(1, Math.max(0, reveal * 6 - si)); // draw-on, one stroke after another
        if (r <= 0) return;
        const q = pts.map((p, i) => P(p, si * 5 + i));
        g.beginPath();
        g.moveTo(...q[0]);
        for (let i = 1; i < q.length; i++) {
          const segR = Math.min(1, Math.max(0, r * (q.length - 1) - (i - 1)));
          if (segR <= 0) break;
          const a = q[i - 1];
          const b = [a[0] + (q[i][0] - a[0]) * segR, a[1] + (q[i][1] - a[1]) * segR];
          const bow = (hash(boil + si * 3 + i) - 0.5) * 5; // a hand-drawn line is never ruler straight
          g.quadraticCurveTo((a[0] + b[0]) / 2 + bow, (a[1] + b[1]) / 2 - bow, b[0], b[1]);
        }
        g.stroke();
      });
      if (reveal > 0.85) {
        const h = P(s.head, 40);
        g.beginPath();
        g.ellipse(h[0], h[1], LIMB.headR * PX * (1 + jitter(41)), LIMB.headR * PX * (1 + jitter(42)), state.pose.head * 0.3, 0, Math.PI * 2);
        g.stroke();
      }
    }
    this.texture.needsUpdate = true;
  }
}
