// The eraser (Bart, 2026-11-05: "we have no way to erase pixels like that white in the hair"). Pure functions on typed
// arrays, the canvas side is in quick-mask.js. Two masks the size of the picture lie over whatever the clean-up and the
// colour cuts left:
//   erase  255 = keep, 0 = gone; the final alpha is multiplied by it
//   bring  0 = leave, 255 = the original pixel comes back (Bring back also undoes what the clean-up took)
// One stroke collects its coverage in `cov` (the highest dab per pixel, so going over a spot twice in one stroke does
// not build up), and is worked out from the masks as they were when the stroke began.

/** A brush radius small enough to mean "this one pixel". */
const ONE_PIXEL = 1;

/** One round dab into `cov` (Uint8Array w*h). `softness` 0..1 is how much of the radius fades. Returns the box it touched, or null. */
export function dab(cov, w, h, cx, cy, radius, softness = 0) {
    if (radius <= ONE_PIXEL) { cx = Math.floor(cx) + 0.5; cy = Math.floor(cy) + 0.5; }
    const x0 = Math.max(0, Math.floor(cx - radius)), x1 = Math.min(w - 1, Math.ceil(cx + radius));
    const y0 = Math.max(0, Math.floor(cy - radius)), y1 = Math.min(h - 1, Math.ceil(cy + radius));
    if (x0 > x1 || y0 > y1) return null;
    // a hard brush still has a one pixel soft rim, or its edge shows as stairs
    const inner = Math.max(0, Math.min(radius * (1 - softness), radius - 1));
    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
            if (d >= radius) continue;
            const t = d <= inner ? 1 : (radius - d) / (radius - inner);
            const c = Math.round(255 * t * t * (3 - 2 * t));
            const p = y * w + x;
            if (c > cov[p]) cov[p] = c;
        }
    }
    return { x0, y0, x1, y1 };
}

/** Dabs along a line, close enough to read as one smooth stroke. Returns the box it touched, or null. */
export function line(cov, w, h, from, to, radius, softness = 0) {
    const steps = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / Math.max(0.5, radius / 4)));
    let box = null;
    for (let i = 1; i <= steps; i++) {
        box = union(box, dab(cov, w, h, from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps, radius, softness));
    }
    return box;
}

export const union = (a, b) => (!a ? b : !b ? a : {
    x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1),
});

/**
 * Work out the two masks inside `box` from what they were when the stroke began. `restore` false: the stroke makes the
 * pixels clear. True: it brings them back as they were in the original picture.
 */
export function applyStroke(cov, box, w, from, to, restore = false) {
    for (let y = box.y0; y <= box.y1; y++) {
        for (let p = y * w + box.x0, end = y * w + box.x1; p <= end; p++) {
            const k = cov[p] / 255;
            if (restore) {
                to.erase[p] = from.erase[p] + (255 - from.erase[p]) * k;
                to.bring[p] = Math.max(from.bring[p], cov[p]);
            } else {
                to.erase[p] = from.erase[p] * (1 - k);
                to.bring[p] = from.bring[p] * (1 - k);
            }
        }
    }
}

/** The final pixels inside `box`, written into `out`: `base` (cuts + clean-up), with `bring` and `erase` on top. */
export function compose(base, original, erase, bring, w, box, out) {
    for (let y = box.y0; y <= box.y1; y++) {
        for (let p = y * w + box.x0, end = y * w + box.x1; p <= end; p++) {
            const i = p * 4;
            const b = bring[p] / 255;
            const baseA = base[i + 3];
            // a clear pixel's colour means nothing: what comes back has the original's own
            const k = baseA === 0 && b > 0 ? 1 : b;
            for (let c = 0; c < 3; c++) out[i + c] = base[i + c] + (original[i + c] - base[i + c]) * k;
            out[i + 3] = (baseA + (original[i + 3] - baseA) * b) * (erase[p] / 255);
        }
    }
    return out;
}

/** The whole picture as a box. */
export const wholeBox = (w, h) => ({ x0: 0, y0: 0, x1: w - 1, y1: h - 1 });
