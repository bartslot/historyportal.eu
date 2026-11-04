// Quick mask: Keynote's Instant Alpha for an image layer. Press on a colour and drag; the drag
// distance is the tolerance. The selection grows only through CONNECTED pixels of a similar colour,
// and dark ink never joins it, so the drawing's lines act as walls (the white inside a strap loop goes,
// the white of a sleeve on the other side of a line stays). Release cuts it out; Alt+press restores.
//
// Pure functions on RGBA arrays first (tested), the canvas controller at the bottom.

export const INK_LUM = 90;          // darker than this is a line: never selected
export const EDGE_RING = 2;         // px around a cut that are un-blended from the removed colour
const MAX_TOL = 180;
const UNDO_DEPTH = 12;

const lum = (d, i) => (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
const dist = (d, i, c) => Math.hypot(d[i] - c[0], d[i + 1] - c[1], d[i + 2] - c[2]) / Math.sqrt(3);

export function toleranceFromDrag(dx, dy) {
    return Math.min(MAX_TOL, 6 + Math.hypot(dx, dy) * 0.6);
}

/** Connected pixels within `tol` of the seed colour. Ink and already-clear pixels are walls. */
export function floodSelect(data, w, h, sx, sy, tol) {
    const mask = new Uint8Array(w * h);
    const s = (sy * w + sx) * 4;
    if (data[s + 3] === 0 || lum(data, s) < INK_LUM) return mask;
    const seed = [data[s], data[s + 1], data[s + 2]];
    const stack = [sy * w + sx];
    mask[stack[0]] = 1;
    while (stack.length) {
        const p = stack.pop();
        const x = p % w, y = (p - x) / w;
        for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
            if (q < 0 || mask[q]) continue;
            const i = q * 4;
            if (data[i + 3] === 0 || lum(data, i) < INK_LUM || dist(data, i, seed) > tol) continue;
            mask[q] = 1;
            stack.push(q);
        }
    }
    return mask;
}

/** Every pixel within `tol` of the seed colour, connected or not ("Everywhere"). Ink and clear pixels never. */
export function colorSelect(data, w, h, sx, sy, tol) {
    const mask = new Uint8Array(w * h);
    const s = (sy * w + sx) * 4;
    if (data[s + 3] === 0 || lum(data, s) < INK_LUM) return mask;
    const seed = [data[s], data[s + 1], data[s + 2]];
    for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        if (data[i + 3] !== 0 && lum(data, i) >= INK_LUM && dist(data, i, seed) <= tol) mask[p] = 1;
    }
    return mask;
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
    for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        if (mask[p]) { out[i + 3] = 0; continue; }
        if (!ring[p] || out[i + 3] === 0) continue;
        const a = Math.min(1, dist(data, i, seed) / (tol + 90));
        if (a >= 1) continue;
        for (let c = 0; c < 3; c++) out[i + c] = a > 0.02 ? (data[i + c] - (1 - a) * seed[c]) / a : data[i + c];
        out[i + 3] = data[i + 3] * a;
    }
    return out;
}

/** Undo a cut locally: the clear region connected to the press gets the original pixels back. */
export function restore(data, original, w, h, sx, sy) {
    const out = new Uint8ClampedArray(data);
    const start = sy * w + sx;
    if (data[start * 4 + 3] > 0) return out;
    const seen = new Uint8Array(w * h);
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
        const p = stack.pop();
        const x = p % w;
        for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
            if (q < 0 || q >= w * h || seen[q]) continue;
            seen[q] = 1;
            if (data[q * 4 + 3] < 255) stack.push(q);   // clear + half-clear edge pixels
        }
    }
    const ring = ringAround(seen, w, h, EDGE_RING);
    for (let p = 0; p < w * h; p++) {
        if (!seen[p] && !ring[p]) continue;
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
export function superpixels(data, w, h, { regions = 1200, compactness = 12, iterations = 6 } = {}) {
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
export function brushSelect(selection, labels, stroke, { remove = false, minShare = 0.3 } = {}) {
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
export async function mountQuickMask(canvas, overlay, url, onChange = () => {}) {
    // Reading pixels needs a same-origin image. A /storage URL carries APP_URL's host, which is not
    // always the page's own (a second local server, say), so load it from this origin instead.
    const u = new URL(url, location.href);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = u.origin !== location.origin && u.pathname.startsWith('/storage/') ? location.origin + u.pathname : u.href;
    await img.decode();
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

    const history = [];
    let drag = null;
    let frame = 0;
    let mode = 'colour';
    let brushPx = 40;                        // brush diameter in screen px
    let edges = { feather: 0, shift: 0 };   // the mask's edge (refineEdges), applied on top of every cut
    let everywhere = false;                  // select the colour everywhere, not only where it touches the press
    let clean = { white: 0, fringe: 0, fade: 0 };   // the clean-up (cleanUp), off until the dialog turns it on

    const selectedAny = () => selection.some(Boolean);
    /** The picture as it stands: the cuts, the clean-up, the edge. */
    const result = () => refineEdges(cleanUp(current, w, h, clean), w, h, edges, original);
    const paint = () => ctx.putImageData(new ImageData(result(), w, h), 0, 0);
    const toImage = (e) => {
        const r = canvas.getBoundingClientRect();
        return [Math.floor((e.clientX - r.left) * w / r.width), Math.floor((e.clientY - r.top) * h / r.height)];
    };
    const emit = (tolerance = null) => onChange({ tolerance, canUndo: history.length > 0, selected: selectedAny() });
    const push = (next, nextSelection = selection) => {
        history.push({ current, selection });
        if (history.length > UNDO_DEPTH) history.shift();
        current = next;
        selection = nextSelection;
        paint();
        showSelection();
        emit();
    };

    /** Outside the selection the picture is dimmed; the patches a stroke is taking show amber. */
    const showSelection = (taking = null) => {
        octx.clearRect(0, 0, w, h);
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

    const preview = () => {
        frame = 0;
        if (!drag) return;
        if (drag.brush) {
            showSelection(brushSelect(selection, workLabels(), drag.stroke, { remove: drag.remove }));
            return;
        }
        octx.clearRect(0, 0, w, h);
        drag.mask = (everywhere ? colorSelect : floodSelect)(current, w, h, drag.x, drag.y, drag.tol);
        const tint = octx.createImageData(w, h);
        for (let p = 0; p < w * h; p++) {
            if (!drag.mask[p]) continue;
            tint.data.set([244, 63, 94, 150], p * 4);   // the selection shows as a red film, like Instant Alpha
        }
        octx.putImageData(tint, 0, 0);
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

    const down = (e) => {
        const [x, y] = toImage(e);
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic pointers */ }
        if (mode === 'brush') {
            drag = { brush: true, remove: e.altKey, stroke: new Uint8Array(ww * wh), last: [x, y] };
            workLabels();
            dab(x, y);
            preview();
            return;
        }
        if (e.altKey) { push(restore(current, original, w, h, x, y)); return; }
        const i = (y * w + x) * 4;
        drag = { x, y, sx: e.clientX, sy: e.clientY, tol: toleranceFromDrag(0, 0), seed: [current[i], current[i + 1], current[i + 2]] };
        preview();
        emit(Math.round(drag.tol));
    };
    const move = (e) => {
        if (!drag) return;
        if (drag.brush) {
            const [x, y] = toImage(e);
            const [lx, ly] = drag.last;
            const steps = Math.max(1, Math.ceil(Math.hypot(x - lx, y - ly) / Math.max(1, (brushPx / 4) * (w / canvas.getBoundingClientRect().width))));
            for (let i = 1; i <= steps; i++) dab(lx + ((x - lx) * i) / steps, ly + ((y - ly) * i) / steps);
            drag.last = [x, y];
        } else {
            drag.tol = toleranceFromDrag(e.clientX - drag.sx, e.clientY - drag.sy);
            emit(Math.round(drag.tol));
        }
        if (!frame) frame = requestAnimationFrame(preview);
    };
    const up = () => {
        if (!drag) return;
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        const d = drag;
        drag = null;
        if (d.brush) {
            push(current, brushSelect(selection, workLabels(), d.stroke, { remove: d.remove }));
            return;
        }
        octx.clearRect(0, 0, w, h);
        const mask = (everywhere ? colorSelect : floodSelect)(current, w, h, d.x, d.y, d.tol);
        if (mask.some(Boolean)) push(cut(current, w, h, mask, d.seed, d.tol));
        else { showSelection(); emit(); }
    };

    /** The picture as it will be saved: the cuts, the selection (when there is one), the edge; cropped. */
    const cutout = () => {
        const px = cleanUp(current, w, h, clean);
        if (selectedAny()) {
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                const s = selection[Math.min(wh - 1, Math.floor(y * k)) * ww + Math.min(ww - 1, Math.floor(x * k))];
                if (!s) px[(y * w + x) * 4 + 3] = 0;
            }
        }
        // a selection's blocky work-size edge is softened by at least a pixel or two of feather
        const out = refineEdges(px, w, h, { ...edges, feather: Math.max(edges.feather, selectedAny() ? Math.ceil(1 / k) : 0) }, original);
        const box = opaqueBox(out, w, h);
        if (!box) return null;
        const c = document.createElement('canvas'); c.width = box.w; c.height = box.h;
        const full = new ImageData(out, w, h);
        const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h;
        tmp.getContext('2d').putImageData(full, 0, 0);
        c.getContext('2d').drawImage(tmp, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
        return { dataUrl: c.toDataURL('image/webp', 0.9), box, width: w, height: h };
    };

    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    emit();

    return {
        undo() { if (history.length) { ({ current, selection } = history.pop()); paint(); showSelection(); emit(); } },
        /** Soft edge and shrink/grow, live: the canvas (and so toBlob) shows the refined edge. */
        setEdges(next) { edges = { ...edges, ...next }; paint(); },
        /** On: a press selects that colour all over the picture (every paper bit at once). */
        setEverywhere(on) { everywhere = !!on; },
        /** The clean-up's three strengths (white holes, white edges, soft bottom), live. */
        setClean(next) { clean = { ...clean, ...next }; paint(); },
        /** The whole picture as it is on screen now (the item's new picture), as a data URL. */
        resultDataURL: () => canvas.toDataURL('image/webp', 0.9),
        setMode(next) { mode = next === 'brush' ? 'brush' : 'colour'; canvas.style.cursor = mode === 'brush' ? 'cell' : 'crosshair'; },
        setBrushSize(px) { brushPx = Math.max(4, Math.min(200, Number(px) || 40)); },
        clearSelection() { if (selectedAny()) push(current, new Uint8Array(ww * wh)); },
        reset() { push(new Uint8ClampedArray(original), new Uint8Array(ww * wh)); },
        cutout,
        // WebP with alpha, like the library itself: a big figure as PNG is several MB and fails an
        // ordinary upload limit (PHP's default is 2 MB). A browser that cannot encode WebP gives PNG.
        toBlob: () => new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.8)),
        toDataURL: () => canvas.toDataURL('image/webp', 0.9),
        destroy() {
            for (const [t, f] of [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', up]]) {
                canvas.removeEventListener(t, f);
            }
        },
    };
}
