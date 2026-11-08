// Quick mask: Keynote's Instant Alpha for an image layer. Press on a colour and drag; the drag
// distance is the tolerance. The selection grows only through CONNECTED pixels of a similar colour,
// and dark ink never joins it, so the drawing's lines act as walls (the white inside a strap loop goes,
// the white of a sleeve on the other side of a line stays). Release cuts it out; Alt+press restores.
//
// Pure functions on RGBA arrays first (tested), the canvas controller at the bottom.

import { line, union, applyStroke, compose, wholeBox } from './erase-brush.js';
import { applyInk, solid, cloned, colourAt } from './paint-brush.js';
import { loadImage } from './load-image.js';

export const INK_LUM = 90;          // darker than this is a line: never selected
const PAPER_SAT = 0.15, PAPER_VALUE = 200;   // white and cream paper: only that is un-blended at a cut's edge
export const EDGE_RING = 2;         // px around a cut that are un-blended from the removed colour
const MAX_TOL = 180;
const START_TOL = 6;
const RED_FILM = new Uint32Array(new Uint8Array([244, 63, 94, 150]).buffer)[0];   // what a press will take, like Instant Alpha
const UNDO_DEPTH = 40;
// ponytail: history shares its arrays, but a colour cut copies the picture: the steps kept shrink for a very big one
const UNDO_BYTES = 6e8;

const lum = (d, i) => (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
const dist = (d, i, c) => Math.hypot(d[i] - c[0], d[i + 1] - c[1], d[i + 2] - c[2]) / Math.sqrt(3);
/** dist(d, i, c) <= tol, without the root: this runs per pixel on every frame of a drag. */
const within = (d, i, c, tol) => {
    const r = d[i] - c[0], g = d[i + 1] - c[1], b = d[i + 2] - c[2];
    return r * r + g * g + b * b <= 3 * tol * tol;
};

/** The press starts at `from`; the further the drag, the wider the match. */
export function toleranceFromDrag(dx, dy, from = START_TOL) {
    return Math.min(MAX_TOL, from + Math.hypot(dx, dy) * 0.6);
}

/** Connected pixels within `tol` of the seed colour (the clicked pixel's, unless told). Already-clear pixels and what is darker than `walls` stop it. */
export function floodSelect(data, w, h, sx, sy, tol, walls = INK_LUM, seed = null, like = null) {
    const mask = new Uint8Array(w * h);
    const s = (sy * w + sx) * 4;
    if (data[s + 3] === 0 || lum(data, s) < walls) return mask;
    seed ??= [data[s], data[s + 1], data[s + 2]];
    const stack = new Int32Array(w * h);
    let top = 0;
    const visit = (q) => {
        const i = q * 4;
        if (mask[q] || data[i + 3] === 0 || lum(data, i) < walls || !within(data, i, seed, tol) || (like && !like(data, i))) return;
        mask[q] = 1;
        stack[top++] = q;
    };
    mask[sy * w + sx] = 1;
    stack[top++] = sy * w + sx;
    while (top) {
        const p = stack[--top], x = p % w;
        if (x > 0) visit(p - 1);
        if (x < w - 1) visit(p + 1);
        if (p >= w) visit(p - w);
        if (p < w * (h - 1)) visit(p + w);
    }
    return mask;
}

/** Every pixel within `tol` of the seed colour, connected or not ("Everywhere"). Clear pixels and what is darker than `walls` never. */
export function colorSelect(data, w, h, sx, sy, tol, walls = INK_LUM, seed = null, like = null) {
    const mask = new Uint8Array(w * h);
    const s = (sy * w + sx) * 4;
    if (data[s + 3] === 0 || lum(data, s) < walls) return mask;
    seed ??= [data[s], data[s + 1], data[s + 2]];
    for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        if (data[i + 3] !== 0 && lum(data, i) >= walls && within(data, i, seed, tol) && (!like || like(data, i))) mask[p] = 1;
    }
    return mask;
}

const SEED_PATCH = 2;      // px round a click that say which colour was meant
const RIM_PASSES = 3;      // px a soft rim goes on past its colour
const RIM_REACH = 2;       // that rim may lie this many tolerances from the spot's colour
const RIM_LOOK = 3;        // px past a rim pixel where the colour beyond it is read
const SPOT_PX = 600;       // up to this size a colour under the click is a spot, not a region
const SPOT_PASSES = 14;    // px a spot goes on through its own hue
const SPOT_LOOK = 8;       // px round a click where the surrounding colour is read
const HUE_NEAR = 12;       // degrees: the same paint, light or dark
const SAT_KEEP = 0.7;      // of the spot's saturation: paler than this is the region beside it, however close its hue
const SAT_AROUND = 0.1;    // the surroundings count from this saturation: a pale shirt has a hue too
const HUE_FAR = 36;        // degrees: other paint, whatever its brightness
const SAT_MIN = 0.3;       // greyer than this has no hue to speak of
const VALUE_MIN = 45;      // darker than this is a line, whatever its hue
const DARK_PAINT_WALL = 0.75;   // pressed on dark paint: a drawn line is what is this much darker than it
const INK_MAX_TOL = 40;    // pressed on the ink itself: however far the drag, the ink and no more
const PAINT_HUE = 70;      // degrees a press on a colour may wander, so white or another colour never joins it
const PAINT_SAT = 0.4;     // of the press's saturation: greyer than this is not that colour any more

const SPOT_SAT = 0.45;     // cream, skin in the light and paper are no coloured spot: they behave as white does
const hueOf = (r, g, b) => (Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180 / Math.PI + 360) % 360;
const hueGap = (a, b) => { const gap = Math.abs(a - b) % 360; return gap > 180 ? 360 - gap : gap; };
const satOf = (r, g, b) => { const hi = Math.max(r, g, b); return hi ? (hi - Math.min(r, g, b)) / hi : 0; };
const isSpotColour = (r, g, b) => satOf(r, g, b) >= SPOT_SAT && Math.max(r, g, b) >= VALUE_MIN;
const isColoured = (d, i) => isSpotColour(d[i], d[i + 1], d[i + 2]);
/** A pixel's hue, or null where it is too grey or too dark to have one. */
const paintHue = (d, i, satMin = SAT_MIN) =>
    (d[i + 3] === 0 || Math.max(d[i], d[i + 1], d[i + 2]) < VALUE_MIN || satOf(d[i], d[i + 1], d[i + 2]) < satMin ? null : hueOf(d[i], d[i + 1], d[i + 2]));

/**
 * The colour a click means. Paint is mottled, so on a coloured spot one pixel can lie far from the spot's own colour: the
 * middle value of what lies round the click and looks like it. White and grey stay the clicked pixel: paper needs no help.
 */
export function wandSeed(data, w, h, x, y, tol) {
    const at = (y * w + x) * 4;
    const own = [data[at], data[at + 1], data[at + 2]];
    if (!isColoured(data, at)) return own;
    const near = [[], [], []];
    for (let yy = Math.max(0, y - SEED_PATCH); yy <= Math.min(h - 1, y + SEED_PATCH); yy++) {
        for (let xx = Math.max(0, x - SEED_PATCH); xx <= Math.min(w - 1, x + SEED_PATCH); xx++) {
            const i = (yy * w + xx) * 4;
            if (data[i + 3] === 0 || dist(data, i, own) > tol * RIM_REACH) continue;
            for (let c = 0; c < 3; c++) near[c].push(data[i + c]);
        }
    }
    return near.map((values) => values.sort((a, b) => a - b)[values.length >> 1]);
}

/** Does this hue stand out against what lies round the click? A darker stain on hair of the same hue does not. */
function standsOut(data, w, h, x, y, hue) {
    const hues = [];
    for (let yy = Math.max(0, y - SPOT_LOOK); yy <= Math.min(h - 1, y + SPOT_LOOK); yy++) {
        for (let xx = Math.max(0, x - SPOT_LOOK); xx <= Math.min(w - 1, x + SPOT_LOOK); xx++) {
            if (Math.max(Math.abs(xx - x), Math.abs(yy - y)) < SPOT_LOOK) continue;
            const around = paintHue(data, (yy * w + xx) * 4, SAT_AROUND);
            if (around !== null) hues.push(around);
        }
    }
    if (!hues.length) return true;
    const same = hues.filter((around) => hueGap(around, hue) <= HUE_FAR / 2).length;
    return same * 2 < hues.length;
}

/**
 * A coloured spot fades into what is around it, and that rim would stay as a halo of its colour. The selection goes on through
 * a pixel that is nearer the spot's colour than the colour beyond it, and a small spot that stands out goes on through its own
 * hue, light or dark. Lines stay walls; the region next to the spot stays, its colour is its own.
 */
function withRim(data, w, h, mask, seed, tol, walls, hue) {
    const out = new Uint8Array(mask);
    // only the pixels on its border can spread: a big region's inside is skipped
    let edge = [], size = 0;
    for (let p = 0; p < w * h; p++) {
        if (!mask[p]) continue;
        size++;
        const x = p % w;
        if ((x > 0 && !mask[p - 1]) || (x < w - 1 && !mask[p + 1]) || (p >= w && !mask[p - w]) || (p < w * (h - 1) && !mask[p + w])) edge.push(p);
    }
    const spot = hue !== null && size <= SPOT_PX;
    const passes = spot ? SPOT_PASSES : RIM_PASSES;
    for (let pass = 0; pass < passes && edge.length; pass++) {
        const next = [];
        for (const p of edge) {
            const x = p % w, y = (p - x) / w;
            for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                const qx = x + dx, qy = y + dy;
                if (qx < 0 || qx >= w || qy < 0 || qy >= h) continue;
                const q = qy * w + qx, i = q * 4;
                if (out[q] || data[i + 3] === 0) continue;
                const own = spot ? paintHue(data, i, Math.max(SAT_MIN, satOf(...seed) * SAT_KEEP)) : null;
                let takes = own !== null && hueGap(own, hue) <= HUE_NEAR;
                if (!takes && pass < RIM_PASSES && lum(data, i) >= walls && dist(data, i, seed) <= tol * RIM_REACH) {
                    const bx = Math.max(0, Math.min(w - 1, qx + dx * RIM_LOOK)), by = Math.max(0, Math.min(h - 1, qy + dy * RIM_LOOK));
                    const beyond = (by * w + bx) * 4;
                    takes = data[beyond + 3] === 0 || dist(data, i, seed) < dist(data, i, [data[beyond], data[beyond + 1], data[beyond + 2]]);
                }
                if (!takes) continue;
                out[q] = 1;
                next.push(q);
            }
        }
        edge = next;
    }
    return out;
}

/** Is this pixel still the colour the press is on? "the same hue" (Bart, 2026-11-08): reach widens a colour, it never turns into another. */
const samePaint = (hue, sat) => (d, i) => {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    return satOf(r, g, b) >= sat * PAINT_SAT && hueGap(hueOf(r, g, b), hue) <= PAINT_HUE;
};

/** What stops a press here: the drawing's lines. A press on dark paint needs a darker line than a light one; a press on the ink itself means the ink, nothing stops it. */
function wallsFor(data, at) {
    const l = lum(data, at);
    if (l >= INK_LUM) return INK_LUM;
    return isColoured(data, at) ? l * DARK_PAINT_WALL : 0;
}

/**
 * Remove a colour with one click (Bart, 2026-11-05: enclosed white holes in one click): what touches the click, or
 * `everywhere` all of it. A press stops at the drawing's lines however far it is dragged (wallsFor). A coloured spot
 * goes whole, with its rim (Bart, 2026-11-06).
 */
export function wandSelect(data, w, h, x, y, tol, everywhere = false) {
    const at = (y * w + x) * 4;
    const walls = wallsFor(data, at);
    const select = everywhere ? colorSelect : floodSelect;
    if (data[at + 3] === 0 || !isColoured(data, at)) return select(data, w, h, x, y, walls === 0 ? Math.min(tol, INK_MAX_TOL) : tol, walls);
    const seed = wandSeed(data, w, h, x, y, tol);
    const hue = hueOf(...seed);
    return withRim(data, w, h, select(data, w, h, x, y, tol, walls, seed, samePaint(hue, satOf(...seed))), seed, tol, walls, standsOut(data, w, h, x, y, hue) ? hue : null);
}

/** Pixels within `ring` px of the selection, not in it. */
function ringAround(mask, w, h, ring) {
    let edge = mask;
    const out = new Uint8Array(w * h);
    for (let r = 0; r < ring; r++) {
        const next = new Uint8Array(w * h);
        for (let p = 0; p < w * h; p++) {
            if (!edge[p]) continue;
            const x = p % w;
            for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
                if (q >= 0 && q < w * h && !mask[q] && !out[q]) { out[q] = 1; next[q] = 1; }
            }
        }
        edge = next;
    }
    return out;
}

/**
 * Cut the selection (returns a new array). The ring around it is anti-aliased the way a real matte is:
 * an edge pixel is part line, part removed colour, so its alpha is how far it is from that colour and
 * its colour is un-blended from it. Lines keep their soft edge without a white halo.
 */
export function cut(data, w, h, mask, seed, tol) {
    const out = new Uint8ClampedArray(data);
    const ring = ringAround(mask, w, h, EDGE_RING);
    const seedHue = isSpotColour(...seed) ? hueOf(...seed) : null;
    const paper = satOf(...seed) < PAPER_SAT && Math.max(...seed) >= PAPER_VALUE;
    for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        if (mask[p]) { out[i + 3] = 0; continue; }
        if (!ring[p] || out[i + 3] === 0) continue;
        // beside a coloured spot, paint of another hue is no part of the spot, however close its brightness
        const own = seedHue === null ? null : paintHue(data, i);
        const a = Math.min(1, Math.max(dist(data, i, seed) / (tol + 90), own === null ? 0 : hueGap(own, seedHue) / HUE_FAR));
        if (a >= 1) continue;
        // paper un-blends cleanly; un-blending from a colour pushes its neighbour to that colour's opposite, or to black
        if (paper && a > 0.02) for (let c = 0; c < 3; c++) out[i + c] = (data[i + c] - (1 - a) * seed[c]) / a;
        out[i + 3] = data[i + 3] * a;
    }
    return out;
}

/** Undo a cut locally: the cut the press is on, and only that one, gets the original pixels back. Null: nothing was cut there. */
export function restore(data, original, w, h, sx, sy) {
    const start = sy * w + sx;
    // fully cut pixels only: the picture's own clear round it, and a line half worn by the cuts on both sides, keep two cuts apart
    const wasCut = (p) => data[p * 4 + 3] === 0 && original[p * 4 + 3] > 0;
    if (data[start * 4 + 3] > 0 || !wasCut(start)) return null;
    const out = new Uint8ClampedArray(data);
    const seen = new Uint8Array(w * h);
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
        const p = stack.pop();
        const x = p % w;
        for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
            if (q < 0 || q >= w * h || seen[q] || !wasCut(q)) continue;
            seen[q] = 1;
            stack.push(q);
        }
    }
    const ring = ringAround(seen, w, h, EDGE_RING);
    for (let p = 0; p < w * h; p++) {
        if (!seen[p] && (!ring[p] || data[p * 4 + 3] === 0)) continue;   // the rim comes back with it, the cut beyond it stays
        for (let c = 0; c < 4; c++) out[p * 4 + c] = original[p * 4 + c];
    }
    return out;
}

export const MAX_FEATHER = 20;   // px of soft edge
export const MAX_SHIFT = 10;     // px the edge moves in (negative) or out (positive)

/** One pass of a min (shrink) or max (grow) filter over a channel, r px along x then along y. */
function spread(a, w, h, r, grow) {
    const pick = grow ? Math.max : Math.min;
    const tmp = new Uint8ClampedArray(a.length);
    const out = new Uint8ClampedArray(a.length);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let v = a[y * w + x];
            for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) v = pick(v, a[y * w + k]);
            tmp[y * w + x] = v;
        }
    }
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let v = tmp[y * w + x];
            for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) v = pick(v, tmp[k * w + x]);
            out[y * w + x] = v;
        }
    }
    return out;
}

/** A box blur of radius r, along x then along y (twice reads as a soft, round falloff). */
function soften(a, w, h, r) {
    const pass = (src, horizontal) => {
        const out = new Uint8ClampedArray(src.length);
        const len = horizontal ? w : h;
        const lines = horizontal ? h : w;
        for (let l = 0; l < lines; l++) {
            const at = (i) => (horizontal ? l * w + i : i * w + l);
            let sum = 0, n = 0;
            for (let i = 0; i <= Math.min(len - 1, r); i++) { sum += src[at(i)]; n++; }
            for (let i = 0; i < len; i++) {
                out[at(i)] = sum / n;
                const add = i + r + 1, drop = i - r;
                if (add < len) { sum += src[at(add)]; n++; }
                if (drop >= 0) { sum -= src[at(drop)]; n--; }
            }
        }
        return out;
    };
    return pass(pass(a, true), false);
}

/**
 * Mask edges (returns a new array): `shift` moves the cut edge in (negative: shrink, eats a fringe left by
 * the background) or out (positive: grow), `feather` softens it over that many px. Only alpha changes, so
 * the colour under a cut stays what it was and growing brings back real pixels.
 */
export function refineEdges(data, w, h, { feather = 0, shift = 0 } = {}, cap = null) {
    const f = Math.max(0, Math.min(MAX_FEATHER, Math.round(feather)));
    const s = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, Math.round(shift)));
    if (!f && !s) return new Uint8ClampedArray(data);
    let alpha = new Uint8ClampedArray(w * h);
    for (let p = 0; p < w * h; p++) alpha[p] = data[p * 4 + 3];
    if (s) alpha = spread(alpha, w, h, Math.abs(s), s > 0);
    if (f) alpha = soften(alpha, w, h, f);
    const out = new Uint8ClampedArray(data);
    // `cap` (the picture before any cut): growing only brings back what the picture really had, never the
    // black under a part that was already clear, which drew a dark halo around a cut-out figure.
    for (let p = 0; p < w * h; p++) out[p * 4 + 3] = cap ? Math.min(alpha[p], cap[p * 4 + 3]) : alpha[p];
    return out;
}

// ---------------------------------------------------------------------------------------------------
// Clean-up (Bart, 2026-11-04, a hunebed with paper showing between its stones and a hard cut along the grass:
// "delete clearly white stuff ... automatically adjusting ... removing the white backgrounds ... and remove white
// spots of edges", "removing the 'hard' edge below by blending transparency"). Three passes, each with one
// strength, applied the moment a picture opens; the teacher only nudges them.

const chroma = (d, i) => Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);

/** Defaults the clean-up opens with: what 99% of the pictures need. */
export const CLEAN_DEFAULTS = { white: 50, fringe: 3, fade: 0 };

/**
 * White holes: patches of plain white paper (very light, no colour) big enough not to be a highlight are made clear,
 * wherever they are: between the stones, under an arm. `strength` 0..100 lowers how white a pixel must be (255 at 0,
 * 225 at 100) and how big a patch must be to go. Returns the mask of what goes (Uint8Array).
 */
export function whiteHoles(data, w, h, strength = CLEAN_DEFAULTS.white) {
    const out = new Uint8Array(w * h);
    if (strength <= 0) return out;
    const s = Math.min(100, strength) / 100;
    const minLum = 252 - 27 * s, maxChroma = 8 + 14 * s;
    const minArea = Math.max(4, Math.round(w * h * 0.0004 * (1 - 0.8 * s)));
    const white = (p) => { const i = p * 4; return data[i + 3] > 0 && lum(data, i) >= minLum && chroma(data, i) <= maxChroma; };
    const seen = new Uint8Array(w * h);
    for (let start = 0; start < w * h; start++) {
        if (seen[start] || !white(start)) continue;
        const region = [start];
        seen[start] = 1;
        for (let r = 0; r < region.length; r++) {
            const p = region[r], x = p % w;
            for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
                if (q < 0 || q >= w * h || seen[q] || !white(q)) continue;
                seen[q] = 1;
                region.push(q);
            }
        }
        if (region.length >= minArea) for (const p of region) out[p] = 1;
    }
    return out;
}

/** Distance in px (4-way steps, up to `max`) from every pixel to the nearest clear one; max+1 = farther. */
function distanceToClear(data, w, h, max) {
    const d = new Uint8Array(w * h).fill(max + 1);
    let edge = [];
    for (let p = 0; p < w * h; p++) if (data[p * 4 + 3] < 16) { d[p] = 0; edge.push(p); }
    for (let step = 1; step <= max && edge.length; step++) {
        const next = [];
        for (const p of edge) {
            const x = p % w;
            for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
                if (q < 0 || q >= w * h || d[q] <= step) continue;
                d[q] = step;
                next.push(q);
            }
        }
        edge = next;
    }
    return d;
}

/** How coloured a light pixel may be and still be white paper: paper is near neutral, a shirt or skin is not. */
const PAPER_MAX_CHROMA = 24;

/**
 * White edges: within `px` of anything clear, a light pixel is part picture, part white paper, so (as cut() does at a
 * matte's edge) its alpha becomes how far it is from white and its colour is un-blended from white. Kills the halo.
 */
export function defringe(data, w, h, px = CLEAN_DEFAULTS.fringe) {
    const out = new Uint8ClampedArray(data);
    if (px <= 0) return out;
    const near = distanceToClear(data, w, h, Math.min(12, Math.round(px)));
    for (let p = 0; p < w * h; p++) {
        if (near[p] === 0 || near[p] > px) continue;
        const i = p * 4;
        if (chroma(data, i) > PAPER_MAX_CHROMA) continue;   // a cream shirt or pale skin at the edge is the picture
        const a = Math.min(1, dist(data, i, [255, 255, 255]) / 120);
        if (a >= 1) continue;
        for (let c = 0; c < 3; c++) out[i + c] = a > 0.02 ? (data[i + c] - (1 - a) * 255) / a : data[i + c];
        out[i + 3] = data[i + 3] * a;
    }
    return out;
}

/**
 * Soft bottom: the picture's lowest edge (column by column, smoothed so it follows the grass, not the pixels) fades
 * to clear over `px` rows, so it melts into what it stands on instead of ending on a hard cut.
 */
export function fadeBottom(data, w, h, px = CLEAN_DEFAULTS.fade) {
    const out = new Uint8ClampedArray(data);
    if (px <= 0) return out;
    const bottom = new Float32Array(w).fill(-1);
    for (let x = 0; x < w; x++) for (let y = h - 1; y >= 0; y--) if (data[(y * w + x) * 4 + 3] > 16) { bottom[x] = y; break; }
    const r = Math.max(1, Math.round(px / 2));
    const smooth = new Float32Array(w);
    for (let x = 0; x < w; x++) {
        let sum = 0, n = 0;
        for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) if (bottom[k] >= 0) { sum += bottom[k]; n++; }
        smooth[x] = n ? sum / n : -1;
    }
    for (let x = 0; x < w; x++) {
        if (smooth[x] < 0) continue;
        for (let y = Math.max(0, Math.floor(smooth[x] - px)); y < h; y++) {
            const t = (smooth[x] - y) / px;                 // 1 at the top of the fade, 0 at the bottom edge
            const k = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
            const i = (y * w + x) * 4 + 3;
            out[i] = out[i] * k;
        }
    }
    return out;
}

/** All three, in order: holes, then the edges they leave, then the bottom. */
export function cleanUp(data, w, h, { white = 0, fringe = 0, fade = 0 } = {}) {
    let out = new Uint8ClampedArray(data);
    const holes = whiteHoles(out, w, h, white);
    if (holes.some(Boolean)) for (let p = 0; p < w * h; p++) if (holes[p]) out[p * 4 + 3] = 0;
    out = defringe(out, w, h, fringe);
    return fadeBottom(out, w, h, fade);
}

// ---------------------------------------------------------------------------------------------------
// Smart brush (Bart, 2026-11-04: "a brush that will find edges ... quickly cut up a scene"). The picture is
// cut into small patches that follow its own edges (SLIC superpixels); a rough stroke takes every patch it
// mostly covers, so the selection lands on the grass's or the tree line's real edge, not on the hand's.

const toLab = (r, g, b) => {
    const lin = (c) => { c /= 255; return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92; };
    const R = lin(r), G = lin(g), B = lin(b);
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const x = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047);
    const y = f(R * 0.2126 + G * 0.7152 + B * 0.0722);
    const z = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};

/**
 * SLIC superpixels: a label per pixel (Int32Array), about `regions` patches, each compact and bounded by
 * colour edges. `compactness` trades shape (high) against hugging the edges (low). Clear pixels get -1.
 */
export function superpixels(data, w, h, { regions = 2400, compactness = 6, iterations = 6 } = {}) {
    const n = w * h;
    const L = new Float32Array(n), A = new Float32Array(n), Bc = new Float32Array(n);
    for (let p = 0; p < n; p++) { const [l, a, b] = toLab(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]); L[p] = l; A[p] = a; Bc[p] = b; }
    const S = Math.max(2, Math.round(Math.sqrt(n / regions)));
    const centres = [];
    for (let y = Math.floor(S / 2); y < h; y += S) for (let x = Math.floor(S / 2); x < w; x += S) {
        const p = y * w + x; centres.push([L[p], A[p], Bc[p], x, y]);
    }
    const label = new Int32Array(n).fill(-1);
    const best = new Float32Array(n);
    const m2 = (compactness / S) ** 2;
    for (let it = 0; it < iterations; it++) {
        best.fill(Infinity);
        centres.forEach(([cl, ca, cb, cx, cy], k) => {
            const x0 = Math.max(0, Math.floor(cx - S)), x1 = Math.min(w - 1, Math.ceil(cx + S));
            const y0 = Math.max(0, Math.floor(cy - S)), y1 = Math.min(h - 1, Math.ceil(cy + S));
            for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
                const p = y * w + x;
                const dc = (L[p] - cl) ** 2 + (A[p] - ca) ** 2 + (Bc[p] - cb) ** 2;
                const d = dc + ((x - cx) ** 2 + (y - cy) ** 2) * m2;
                if (d < best[p]) { best[p] = d; label[p] = k; }
            }
        });
        const sum = centres.map(() => [0, 0, 0, 0, 0, 0]);
        for (let p = 0; p < n; p++) {
            const k = label[p]; if (k < 0) continue;
            const t = sum[k]; t[0] += L[p]; t[1] += A[p]; t[2] += Bc[p]; t[3] += p % w; t[4] += (p - (p % w)) / w; t[5]++;
        }
        sum.forEach((t, k) => { if (t[5]) centres[k] = [t[0] / t[5], t[1] / t[5], t[2] / t[5], t[3] / t[5], t[4] / t[5]]; });
    }
    for (let p = 0; p < n; p++) if (data[p * 4 + 3] === 0) label[p] = -1;
    return label;
}

/** Per patch: how many of its pixels the stroke covers, over its size. */
export function strokeShares(labels, stroke) {
    const hit = new Map(), size = new Map();
    for (let p = 0; p < labels.length; p++) {
        const k = labels[p]; if (k < 0) continue;
        size.set(k, (size.get(k) || 0) + 1);
        if (stroke[p]) hit.set(k, (hit.get(k) || 0) + 1);
    }
    const out = new Map();
    for (const [k, c] of hit) out.set(k, c / size.get(k));
    return out;
}

/**
 * Apply one brush stroke to a selection (returns a new Uint8Array): every patch the stroke covers by at
 * least `minShare` joins it (or, with `remove`, leaves it). A thin stroke along an edge takes only the
 * patches on the side it mostly covers, which is what keeps the cut on the edge.
 */
export function brushSelect(selection, labels, stroke, { remove = false, minShare = 0.5 } = {}) {
    const take = new Set();
    for (const [k, share] of strokeShares(labels, stroke)) if (share >= minShare) take.add(k);
    const out = new Uint8Array(selection);
    for (let p = 0; p < labels.length; p++) {
        if (take.has(labels[p])) out[p] = remove ? 0 : 1;
        else if (stroke[p] && remove) out[p] = 0;   // removing is generous: what the brush touches goes
    }
    return out;
}

/** The smallest box around the opaque pixels, or null when nothing is left. */
export function opaqueBox(data, w, h) {
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * Wire a canvas to an image. Returns { undo, reset, toBlob, destroy, state }.
 * `onChange({tolerance, canUndo})` keeps the dialog's readout in sync.
 */
/** The smart brush works on a copy at most this many px on its long side: fast, and patches stay edge-sized. */
export const BRUSH_WORK_PX = 640;

/**
 * Wire a canvas to an image. Two ways to work, both undoable:
 *   'colour'  press on a colour and drag: that colour is cut out (Instant Alpha, Alt+press brings it back)
 *   'brush'   paint roughly over a part: it is selected up to its own edges (smart brush, Alt paints it away)
 * `onChange({tolerance, canUndo, selected})` keeps the dialog's readout in sync.
 * Returns { undo, reset, setMode, setBrushSize, setEdges, setEverywhere, clearSelection, cutout, toBlob, toDataURL, destroy }.
 */
export async function mountQuickMask(canvas, overlay, url, onChange = () => {}, { surface = canvas, onPick = () => {}, onNeedSource = () => {} } = {}) {
    const img = await loadImage(url);
    const w = img.naturalWidth, h = img.naturalHeight;
    for (const c of [canvas, overlay]) { c.width = w; c.height = h; }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const octx = overlay.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const original = ctx.getImageData(0, 0, w, h).data;
    let current = new Uint8ClampedArray(original);

    // the smart brush's own small copy: its patches and the selection live at this size
    const k = Math.min(1, BRUSH_WORK_PX / Math.max(w, h));
    const ww = Math.max(1, Math.round(w * k)), wh = Math.max(1, Math.round(h * k));
    let labels = null;                       // patches, made on the first brush stroke
    let selection = new Uint8Array(ww * wh); // 1 = part of the cut-out
    const workLabels = () => {
        if (labels) return labels;
        const c = document.createElement('canvas'); c.width = ww; c.height = wh;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0, ww, wh);
        labels = superpixels(g.getImageData(0, 0, ww, wh).data, ww, wh);
        return labels;
    };

    // the eraser's two masks, over whatever the cuts and the clean-up leave (erase-brush.js)
    const whole = wholeBox(w, h);
    let erase = new Uint8ClampedArray(w * h).fill(255);
    let bring = new Uint8ClampedArray(w * h);
    let ink = new Uint8ClampedArray(w * h * 4);        // paint and the clone stamp, under the eraser (paint-brush.js)
    let paintWith = { colour: [15, 23, 42], opacity: 1 };
    let cloneFrom = null;                              // where the clone stamp copies from (Alt-click), picture px
    let cloneOffset = null;                            // that, minus where its first stroke began: kept until a new Alt-click
    let crossAt = null;                                // where the cross shows: the spot the next stroke copies from
    let base = new Uint8ClampedArray(original);       // the cuts + the clean-up + the edge
    const shown = new ImageData(new Uint8ClampedArray(original), w, h);   // what is on the canvas, and what a click reads
    let brush = { size: 12, softness: 0.2 };          // the eraser: diameter in picture pixels, how much of it fades
    let wandTol = START_TOL;                          // how far the colour tool's press reaches before any drag
    let comparing = false;
    let source = original;                            // what Bring back and Before show: the picture before any editing

    const undoDepth = Math.max(4, Math.min(UNDO_DEPTH, Math.floor(UNDO_BYTES / (w * h * 10))));
    const history = [];
    let future = [];
    let drag = null;
    let frame = 0;
    let mode = 'colour';
    let brushPx = 40;                        // brush diameter in screen px
    let erasing = false;                     // the brush takes away from the selection (also: Alt held)
    let edges = { feather: 0, shift: 0 };   // the mask's edge (refineEdges), applied on top of every cut
    let everywhere = false;                  // select the colour everywhere, not only where it touches the press
    let clean = { white: 0, fringe: 0, fade: 0 };   // the clean-up (cleanUp), off until the dialog turns it on

    const selectedAny = () => selection.some(Boolean);
    /** The picture as it stands: the cuts, the clean-up, the edge, then the eraser. */
    const paint = () => {
        base = refineEdges(cleanUp(current, w, h, clean), w, h, edges, original);
        compose(base, source, erase, bring, w, whole, shown.data, ink);
        if (!comparing) ctx.putImageData(shown, 0, 0);
    };
    /** Where the pointer is on the picture, in picture pixels (with fractions, and maybe off the picture). */
    const onImage = (e) => {
        const r = canvas.getBoundingClientRect();
        return [(e.clientX - r.left) * w / r.width, (e.clientY - r.top) * h / r.height];
    };
    const toImage = (e) => onImage(e).map(Math.floor);
    const emit = (tolerance = null) => onChange({ tolerance, canUndo: history.length > 0, canRedo: future.length > 0, selected: selectedAny() });
    const snapshot = () => ({ current, selection, erase, bring, ink });
    const remember = (before) => {
        history.push(before);
        if (history.length > undoDepth) history.shift();
        future = [];
    };
    const push = (next, nextSelection = selection, nextBring = bring, nextInk = ink) => {
        remember(snapshot());
        current = next;
        selection = nextSelection;
        bring = nextBring;
        ink = nextInk;
        paint();
        showSelection();
        emit();
    };
    const backTo = (state) => {
        ({ current, selection, erase, bring, ink } = state);
        paint();
        showSelection();
        emit();
    };

    /** The eraser, Bring back, paint or the clone stamp reaches a new point: only the pixels the stroke just touched are worked out. */
    const strokeTo = (point) => {
        const touched = line(drag.cov, w, h, drag.last, point, brush.size / 2, brush.softness);
        drag.last = point;
        if (drag.clone) showCloneSource(point);
        if (!touched) return;
        drag.box = union(drag.box, touched);
        if (drag.ink) applyInk(drag.cov, touched, w, drag.from.ink, ink, drag.colourAt, drag.opacity);
        else applyStroke(drag.cov, touched, w, drag.from, { erase, bring, ink }, drag.restore);
        compose(base, source, erase, bring, w, touched, shown.data, ink);
        ctx.putImageData(shown, 0, 0, touched.x0, touched.y0, touched.x1 - touched.x0 + 1, touched.y1 - touched.y0 + 1);
    };
    /** The colour tool lets go: that colour goes, on what is on screen now, paint included. */
    const removeColour = (x, y, tol) => {
        const mask = wandSelect(shown.data, w, h, x, y, tol, everywhere);
        if (!mask.some(Boolean)) { showSelection(); emit(); return; }
        const nextBring = new Uint8ClampedArray(bring), nextInk = new Uint8ClampedArray(ink);
        for (let p = 0; p < w * h; p++) if (mask[p]) { nextBring[p] = 0; nextInk[p * 4 + 3] = 0; }
        push(cut(current, w, h, mask, wandSeed(shown.data, w, h, x, y, tol), tol), selection, nextBring, nextInk);
    };

    /** Outside the selection the picture is dimmed; the patches a stroke is taking show amber. */
    const showSelection = (taking = null) => {
        octx.clearRect(0, 0, w, h);
        // the clone stamp's cross shows as long as it has a source: after an undo, back from another tool
        if (mode === 'clone' && cloneFrom && crossAt) drawCross(...crossAt);
        if (!selectedAny() && !taking) return;
        const film = new ImageData(ww, wh);
        for (let p = 0; p < ww * wh; p++) {
            if (taking && taking[p] !== selection[p]) film.data.set(taking[p] ? [245, 158, 11, 150] : [15, 23, 42, 170], p * 4);
            else if (!selection[p]) film.data.set([15, 23, 42, 170], p * 4);
        }
        const c = document.createElement('canvas'); c.width = ww; c.height = wh;
        c.getContext('2d').putImageData(film, 0, 0);
        octx.imageSmoothingEnabled = false;
        octx.drawImage(c, 0, 0, w, h);
    };

    /** A small cross on the film at a point of the picture: where the clone stamp copies from. */
    const drawCross = (x, y) => {
        const s = w / canvas.getBoundingClientRect().width;   // picture px per screen px: the cross stays one size on screen
        const arm = 7 * s;
        for (const [colour, width] of [['#000', 3 * s], ['#fff', 1.5 * s]]) {
            octx.strokeStyle = colour;
            octx.lineWidth = width;
            octx.beginPath();
            octx.moveTo(x - arm, y); octx.lineTo(x + arm, y);
            octx.moveTo(x, y - arm); octx.lineTo(x, y + arm);
            octx.stroke();
        }
    };
    /** While the clone stamp paints, the cross follows where it copies from; after, it stays there. */
    const showCloneSource = (point) => {
        if (point && cloneOffset) crossAt = [point[0] + cloneOffset[0], point[1] + cloneOffset[1]];
        showSelection();
    };

    const preview = () => {
        frame = 0;
        if (!drag) return;
        if (drag.brush) {
            showSelection(brushSelect(selection, workLabels(), drag.stroke, { remove: drag.remove }));
            return;
        }
        const mask = wandSelect(shown.data, w, h, drag.x, drag.y, drag.tol, everywhere);
        drag.tint ??= octx.createImageData(w, h);
        drag.film ??= new Uint32Array(drag.tint.data.buffer);
        for (let p = 0; p < w * h; p++) drag.film[p] = mask[p] ? RED_FILM : 0;
        octx.putImageData(drag.tint, 0, 0);
    };

    /** A round dab of the brush into the stroke, at a point in picture pixels. */
    const dab = (x, y) => {
        const r = canvas.getBoundingClientRect();
        const rad = Math.max(1, (brushPx / 2) * (w / r.width) * k);   // screen px -> work px
        const cx = x * k, cy = y * k;
        for (let yy = Math.max(0, Math.floor(cy - rad)); yy <= Math.min(wh - 1, Math.ceil(cy + rad)); yy++) {
            for (let xx = Math.max(0, Math.floor(cx - rad)); xx <= Math.min(ww - 1, Math.ceil(cx + rad)); xx++) {
                if ((xx - cx) ** 2 + (yy - cy) ** 2 <= rad * rad) drag.stroke[yy * ww + xx] = 1;
            }
        }
    };

    /** A paint or clone stroke begins: the ink as it was, and what the stroke lays. */
    const inkStroke = (point) => {
        const from = { ink };
        ink = new Uint8ClampedArray(ink);
        if (mode === 'paint') return { ink: true, from, colourAt: solid(paintWith.colour), opacity: paintWith.opacity };
        cloneOffset ??= [Math.round(cloneFrom[0] - point[0]), Math.round(cloneFrom[1] - point[1])];
        // it copies the picture as it stands when the stroke begins (paint included), never what this stroke lays
        return { ink: true, clone: true, from, colourAt: cloned(new Uint8ClampedArray(shown.data), w, h, cloneOffset), opacity: paintWith.opacity };
    };

    const down = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        const [x, y] = toImage(e);
        // the pipette and the clone stamp's Alt-click read a pixel: on the picture only
        if (mode === 'pipette') {
            const picked = colourAt(shown.data, w, h, x, y);
            if (picked) onPick(picked);
            return;
        }
        if (mode === 'clone' && e.altKey) {
            if (x < 0 || y < 0 || x >= w || y >= h) return;
            cloneFrom = onImage(e);
            cloneOffset = null;
            crossAt = cloneFrom;
            showSelection();
            return;
        }
        if (mode === 'clone' && !cloneFrom) { onNeedSource(); return; }
        const stroking = ['erase', 'restore', 'paint', 'clone'].includes(mode);
        // the eraser may start beside the picture, to take its edge; the others need a pixel to read
        if (!stroking && (x < 0 || y < 0 || x >= w || y >= h)) return;
        try { surface.setPointerCapture(e.pointerId); } catch { /* synthetic pointers */ }
        if (mode === 'paint' || mode === 'clone') {
            const point = onImage(e);
            drag = { ...inkStroke(point), cov: new Uint8Array(w * h), last: point, box: null };
            strokeTo(point);
            return;
        }
        if (stroking) {
            const from = { erase, bring, ink };
            erase = new Uint8ClampedArray(erase);
            bring = new Uint8ClampedArray(bring);
            ink = new Uint8ClampedArray(ink);   // the stroke takes paint away too
            const point = onImage(e);
            drag = { eraser: true, restore: mode === 'restore', from, cov: new Uint8Array(w * h), last: point, box: null };
            strokeTo(point);
            return;
        }
        if (mode === 'brush') {
            drag = { brush: true, remove: e.altKey || erasing, stroke: new Uint8Array(ww * wh), last: [x, y] };
            workLabels();
            dab(x, y);
            preview();
            return;
        }
        if (e.altKey) {
            const back = restore(current, original, w, h, x, y);
            if (back) push(back);
            return;
        }
        drag = { x, y, sx: e.clientX, sy: e.clientY, tol: wandTol };
        preview();
        emit(Math.round(drag.tol));
    };
    const move = (e) => {
        if (!drag) return;
        if (drag.eraser || drag.ink) { strokeTo(onImage(e)); return; }
        if (drag.brush) {
            const [x, y] = toImage(e);
            const [lx, ly] = drag.last;
            const steps = Math.max(1, Math.ceil(Math.hypot(x - lx, y - ly) / Math.max(1, (brushPx / 4) * (w / canvas.getBoundingClientRect().width))));
            for (let i = 1; i <= steps; i++) dab(lx + ((x - lx) * i) / steps, ly + ((y - ly) * i) / steps);
            drag.last = [x, y];
        } else {
            drag.tol = toleranceFromDrag(e.clientX - drag.sx, e.clientY - drag.sy, wandTol);
            emit(Math.round(drag.tol));
        }
        if (!frame) frame = requestAnimationFrame(preview);
    };
    const up = () => {
        if (!drag) return;
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        const d = drag;
        drag = null;
        if (d.eraser) {
            // a stroke wholly off the picture changed nothing: no step to undo
            if (d.box) { remember({ current, selection, erase: d.from.erase, bring: d.from.bring, ink: d.from.ink }); emit(); }
            else ({ erase, bring, ink } = d.from);
            return;
        }
        if (d.ink) {
            if (d.clone) showCloneSource(d.last);   // the cross stays where the next stroke copies from
            if (d.box) { remember({ current, selection, erase, bring, ink: d.from.ink }); emit(); }
            else ink = d.from.ink;
            return;
        }
        if (d.brush) {
            push(current, brushSelect(selection, workLabels(), d.stroke, { remove: d.remove }));
            return;
        }
        removeColour(d.x, d.y, d.tol);
    };

    /** A press still held comes to nothing: Esc, or another tool. Strokes already on the picture are left to undo. True: there was one. */
    const cancelPress = () => {
        if (!drag || drag.eraser || drag.ink) return false;
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        drag = null;
        showSelection();
        return true;
    };

    /** The browser took the pointer away: a held press comes to nothing, a stroke ends where it got to. */
    const cancelled = () => { if (!cancelPress()) up(); };

    /** The picture as it will be saved: the cuts, the selection (when there is one), the edge; cropped. */
    const cutout = () => {
        const px = compose(cleanUp(current, w, h, clean), source, erase, bring, w, whole, new Uint8ClampedArray(w * h * 4), ink);
        const cap = new Uint8ClampedArray(px);   // growing the edge never brings back what was erased
        if (selectedAny()) {
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                const s = selection[Math.min(wh - 1, Math.floor(y * k)) * ww + Math.min(ww - 1, Math.floor(x * k))];
                if (!s) px[(y * w + x) * 4 + 3] = 0;
            }
        }
        // a selection's blocky work-size edge is softened by at least a pixel or two of feather
        const out = refineEdges(px, w, h, { ...edges, feather: Math.max(edges.feather, selectedAny() ? Math.ceil(1 / k) : 0) }, cap);
        const box = opaqueBox(out, w, h);
        if (!box) return null;
        const c = document.createElement('canvas'); c.width = box.w; c.height = box.h;
        const full = new ImageData(out, w, h);
        const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h;
        tmp.getContext('2d').putImageData(full, 0, 0);
        c.getContext('2d').drawImage(tmp, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
        return { dataUrl: c.toDataURL('image/webp', 0.9), box, width: w, height: h };
    };

    surface.addEventListener('pointerdown', down);
    surface.addEventListener('pointermove', move);
    surface.addEventListener('pointerup', up);
    surface.addEventListener('pointercancel', cancelled);
    emit();

    return {
        size: { w, h },
        undo() { if (!drag && history.length) { future.push(snapshot()); backTo(history.pop()); } },
        redo() { if (!drag && future.length) { history.push(snapshot()); backTo(future.pop()); } },
        /** The eraser: its diameter in picture pixels, and how much of it fades (0..1). */
        setBrush(next) { brush = { ...brush, ...next }; },
        /** How far a press with the colour tool reaches before any drag: a plain click takes this much. */
        setTolerance(tol) { wandTol = Number(tol); },
        /** A picture reopened after a save: Bring back reaches past it to this one. A different size (a crop) cannot line up, so it is left. */
        async setSource(from) {
            const image = await loadImage(from);
            if (image.naturalWidth !== w || image.naturalHeight !== h) return;
            const c = document.createElement('canvas'); c.width = w; c.height = h;
            const g = c.getContext('2d', { willReadFrequently: true });
            g.drawImage(image, 0, 0);
            source = g.getImageData(0, 0, w, h).data;
        },
        /** Held: the picture exactly as it came in, whatever was done to it. */
        setCompare(on) {
            comparing = !!on;
            ctx.putImageData(comparing ? new ImageData(new Uint8ClampedArray(source), w, h) : shown, 0, 0);
        },
        /** Soft edge and shrink/grow, live: the canvas (and so toBlob) shows the refined edge. */
        setEdges(next) { edges = { ...edges, ...next }; paint(); },
        /** On: a press selects that colour all over the picture (every paper bit at once). */
        setEverywhere(on) { everywhere = !!on; },
        /** The clean-up's three strengths (white holes, white edges, soft bottom), live. */
        setClean(next) { clean = { ...clean, ...next }; paint(); },
        /** The whole picture as it is on screen now (the item's new picture), as a data URL. */
        resultDataURL: () => canvas.toDataURL('image/webp', 0.9),
        /** The pixels it opened on and the pixels now: what a save onto a figure's sheet compares (puppet-sheet.js). */
        pixels: () => ({ opened: original, edited: shown.data }),
        cancelPress,
        setMode(next) {
            cancelPress();
            mode = ['brush', 'erase', 'restore', 'paint', 'pipette', 'clone'].includes(next) ? next : 'colour';
            canvas.style.cursor = mode === 'brush' ? 'cell' : 'crosshair';
            showSelection();   // the clone stamp's cross goes with it
        },
        /** The paint brush and the clone stamp: the colour [r, g, b] the brush paints, and how strongly both lay it (0..1). */
        setPaint(next) { paintWith = { ...paintWith, ...next }; },
        /** Where the clone stamp copies from, picture px; null: it has to be chosen again (Alt-click). */
        get cloneSource() { return cloneFrom; },
        /** On: the brush takes away from the selection instead of adding (the Remove button). */
        setErase(on) { erasing = !!on; },
        setBrushSize(px) { brushPx = Math.max(4, Math.min(200, Number(px) || 40)); },
        clearSelection() { if (selectedAny()) push(current, new Uint8Array(ww * wh)); },
        reset() {
            remember(snapshot());
            backTo({ current: new Uint8ClampedArray(original), selection: new Uint8Array(ww * wh), erase: new Uint8ClampedArray(w * h).fill(255), bring: new Uint8ClampedArray(w * h), ink: new Uint8ClampedArray(w * h * 4) });
        },
        cutout,
        // WebP with alpha, like the library itself: a big figure as PNG is several MB and fails an
        // ordinary upload limit (PHP's default is 2 MB). A browser that cannot encode WebP gives PNG.
        toBlob: () => new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.8)),
        toDataURL: () => canvas.toDataURL('image/webp', 0.9),
        destroy() {
            for (const [t, f] of [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', cancelled]]) {
                surface.removeEventListener(t, f);
            }
        },
    };
}
