// Shared easing system — one source of truth. Pick by INTENT (EASE.* / CURVE.*), not by raw curve.
//
// GSAP IS THE VOCABULARY. The app animates with GSAP, so the five intents below are defined as
// GSAP ease names and everything else here is derived from them. This file used to define the
// curves itself, in Penner's names, while GSAP ran a seventeen-string vocabulary of its own across
// sixty-nine call sites that never touched this module — two systems, neither aware of the other,
// and a third set of twenty-three curves hand-written into app.css. Bart's call was that GSAP
// wins, so:
//
//  • GSAP_EASE.* — the intent → the GSAP ease name. THIS is the source. Pass it to gsap.to().
//  • EASE.*      — the same five curves as cubic-bezier(), for CSS transitions and WAAPI, neither
//                  of which can call GSAP. Fitted to GSAP's real output, not to Penner's
//                  approximations of it, which are up to 0.18 adrift (power4.inOut) and were 0.03
//                  adrift on the curves this app actually uses.
//  • CURVE.*     — the same five as t→t functions, for manual requestAnimationFrame loops.
//  • EASING.*    — the older, curve-named t→t set. Every entry is exactly a GSAP power ease (the
//                  names are Penner's, the maths is identical to machine precision); the comment on
//                  each says which. Prefer CURVE.* in new code: it names the intent.
//
// resources/js/__tests__/easing-css-parity.test.js holds all of this to GSAP — it evaluates each
// bezier and each function against gsap.parseEase() itself, so none of these can drift from what
// GSAP would actually do without the build going red.
//
// Convention (see the feedback-easing-conventions memory):
//   enter/reveal (open, fade-in, appear, a follower settling)  → decelerate in  (power2.out)
//   exit (close, fade-out)                                     → accelerate away (power2.in)
//   move/reposition/camera                                     → power2.inOut
//   draw-on (pen/coastline sweep)                              → accelerate: slow build, then away
//   pop (badge/pin/thumbnail appear)                           → back-ease overshoot
//   ...and nothing is ever linear.

/** The intent → the GSAP ease. The source of truth; everything below is this, in another form. */
export const GSAP_EASE = {
  enter: 'power2.out',
  exit: 'power2.in',
  move: 'power2.inOut',
  drawOn: 'power2.in',
  pop: 'back.out(1.7)',
};

/**
 * Constant rate. NOT one of the intents, and deliberately not in GSAP_EASE.
 *
 * "Nothing is ever linear" is a rule about MOTION, and a few things in the app are not motion: a
 * typewriter tweening a character index at a fixed characters-per-second, a caret blinking on and
 * off. Easing those changes the rate itself, which is the one thing they are specified by — an
 * eased typewriter types at a varying speed and an eased blink reads as a glow. Named so those
 * sites can say they meant it, and so anything still holding a bare 'none' is a real finding.
 */
export const CONSTANT_RATE = 'none';

// cubic-bezier() forms of GSAP_EASE, for .animate() and CSS transition-timing-function.
//
// Three of these are EXACT, not approximations. Setting the control points' x to 1/3 and 2/3 makes
// x(t) = t, which leaves y(t) a plain cubic in t — and GSAP's power2 eases and back.out are cubic
// polynomials, so they land on it perfectly. Rounded to three decimals here they are 2e-4 from
// GSAP. power2.inOut is piecewise and has no exact cubic form, so it is a least-squares fit, 2.6e-3
// at its worst point. app.css mirrors these five as --ease-*; the parity test holds all ten values
// to gsap.parseEase() at 0.004, which is tighter than any wrong curve could sneak through.
export const EASE = {
  enter: 'cubic-bezier(0.333, 1, 0.667, 1)',            // power2.out    — reveal / open / settle
  exit: 'cubic-bezier(0.333, 0, 0.667, 0)',             // power2.in     — close / fade-out
  move: 'cubic-bezier(0.624, -0.042, 0.376, 1.042)',    // power2.inOut  — reposition / camera
  drawOn: 'cubic-bezier(0.333, 0, 0.667, 0)',           // power2.in     — pen / coastline sweep
  pop: 'cubic-bezier(0.333, 1.567, 0.667, 1)',          // back.out(1.7) — appear with overshoot
};

// t → t forms of GSAP_EASE, for requestAnimationFrame loops that step a value by hand.
export const CURVE = {
  enter: (t) => 1 - Math.pow(1 - t, 3),
  exit: (t) => t * t * t,
  move: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  drawOn: (t) => t * t * t,
  // back.out(1.7) expanded: 1 + 2.7(t-1)³ + 1.7(t-1)², which multiplies out to this cubic.
  pop: (t) => t * (4.7 + t * (t * 2.7 - 6.4)),
};

// The curve-named set. Each is exactly the GSAP ease named beside it — same maths, older name.
export const EASING = {
  linear: (t) => t,                                                    // GSAP 'none'
  easeInQuad: (t) => t * t,                                            // power1.in
  easeOutQuad: (t) => t * (2 - t),                                     // power1.out
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),  // power1.inOut
  easeInCubic: (t) => t * t * t,                                       // power2.in
  easeOutCubic: (t) => (--t) * t * t + 1,                              // power2.out
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1), // power2.inOut
  easeInQuart: (t) => t * t * t * t,                                   // power3.in
  easeOutQuart: (t) => 1 - (--t) * t * t * t,                          // power3.out
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t), // power3.inOut
  easeInQuint: (t) => t * t * t * t * t,                               // power4.in
  easeOutQuint: (t) => 1 + (--t) * t * t * t * t,                      // power4.out
  easeInOutQuint: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t), // power4.inOut
  // Figma's "back" presets: overshoot by GSAP's default 1.7.
  easeInBack: (t) => t * t * (2.7 * t - 1.7),                                           // back.in(1.7)
  easeOutBack: (t) => 1 + (t - 1) * (t - 1) * (2.7 * (t - 1) + 1.7),                    // back.out(1.7)
  easeInOutBack: (t) => (t < 0.5                                                        // back.inOut(1.7)
    ? (2 * t) * (2 * t) * (2.7 * 2 * t - 1.7) / 2
    : 1 - (2 - 2 * t) * (2 - 2 * t) * (2.7 * (2 - 2 * t) - 1.7) / 2),
};

// ── Custom Bézier (Figma's "Custom bezier"). Stored as the CSS string, so the editor, the saved
//    value and anything CSS draws are one value. ──────────────────────────────────────────────

const BEZIER_RE = /^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/

/** `cubic-bezier(x1, y1, x2, y2)` → [x1, y1, x2, y2], or null. x is clamped to 0..1, as CSS requires. */
export const parseBezier = (value) => {
  const m = BEZIER_RE.exec(String(value ?? '').trim())
  if (!m) return null
  const [x1, y1, x2, y2] = m.slice(1).map(Number)
  const clamp01 = (v) => Math.min(1, Math.max(0, v))
  return [clamp01(x1), y1, clamp01(x2), y2]
}

const round3 = (v) => Math.round(v * 1000) / 1000

export const formatBezier = ([x1, y1, x2, y2]) =>
  `cubic-bezier(${round3(x1)}, ${round3(y1)}, ${round3(x2)}, ${round3(y2)})`

/**
 * progress → value for a CSS cubic-bezier. Newton on x (fast, converges for ordinary curves),
 * falling back to bisection when the slope is flat, then y at that parameter.
 */
export const cubicBezier = (x1, y1, x2, y2) => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  const X = (t) => ((ax * t + bx) * t + cx) * t
  const Y = (t) => ((ay * t + by) * t + cy) * t
  const dX = (t) => (3 * ax * t + 2 * bx) * t + cx

  const solve = (x) => {
    let t = x
    for (let i = 0; i < 8; i++) {
      const e = X(t) - x
      if (Math.abs(e) < 1e-7) return t
      const d = dX(t)
      if (Math.abs(d) < 1e-6) break
      t -= e / d
    }
    let lo = 0, hi = 1
    t = x
    for (let i = 0; i < 40; i++) {
      const v = X(t)
      if (Math.abs(v - x) < 1e-7) return t
      if (v < x) lo = t; else hi = t
      t = (lo + hi) / 2
    }
    return t
  }

  return (u) => (u <= 0 ? 0 : u >= 1 ? 1 : Y(solve(u)))
}
