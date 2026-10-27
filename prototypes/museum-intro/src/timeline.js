// Timeline math: easing by intent, eased keyframe tracks, a play clock. No three.js in here so `npm test` runs in node.

const cubic = (x1, y1, x2, y2) => (t) => {
  // cubic-bezier(x1,y1,x2,y2) like CSS: solve x(s)=t by Newton, return y(s)
  let s = t;
  for (let i = 0; i < 6; i++) {
    const x = 3 * (1 - s) ** 2 * s * x1 + 3 * (1 - s) * s * s * x2 + s ** 3 - t;
    const dx = 3 * (1 - s) ** 2 * x1 + 6 * (1 - s) * s * (x2 - x1) + 3 * s * s * (1 - x2);
    if (Math.abs(dx) < 1e-6) break;
    s = Math.min(1, Math.max(0, s - x / dx));
  }
  return 3 * (1 - s) ** 2 * s * y1 + 3 * (1 - s) * s * s * y2 + s ** 3;
};

// Named by intent, never "linear" for anything that moves through space.
export const EASE = {
  settle: cubic(0.4, 0, 0.2, 1), // on-screen move, starts and stops calmly (camera between holds)
  depart: cubic(0.45, 0, 0.9, 0.55), // leaves a hold and keeps its speed into the next move
  arrive: cubic(0.1, 0.45, 0.2, 1), // comes in with speed, lands softly
  float: (t) => 0.5 - 0.5 * Math.cos(Math.PI * t), // ambient, sine
  gravity: (t) => t * t, // a fall
  pop: cubic(0.175, 0.885, 0.32, 1.275), // the balloon: small overshoot, content only
};

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const lerp = (a, b, t) => a + (b - a) * t;

// progress of t through [a, b], eased
export const span = (t, a, b, ease = EASE.settle) => ease(clamp01((t - a) / (b - a)));

// A track: [{ t, v, ease }] where `ease` shapes the segment that ENDS at this key. v is a number or number[].
export function sampleTrack(keys, t) {
  if (t <= keys[0].t) return keys[0].v;
  const last = keys[keys.length - 1];
  if (t >= last.t) return last.v;
  let i = 1;
  while (keys[i].t < t) i++;
  const a = keys[i - 1];
  const b = keys[i];
  const e = (EASE[b.ease] ?? EASE.settle)((t - a.t) / (b.t - a.t));
  return Array.isArray(a.v) ? a.v.map((x, k) => lerp(x, b.v[k], e)) : lerp(a.v, b.v, e);
}

export class Clock {
  constructor(duration) {
    this.duration = duration;
    this.t = 0;
    this.playing = true;
    this.speed = 1;
  }

  tick(dt) {
    if (!this.playing) return this.t;
    this.t = Math.min(this.duration, this.t + dt * this.speed);
    return this.t;
  }

  seek(t) {
    this.t = Math.min(this.duration, Math.max(0, t));
  }
}
