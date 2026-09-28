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

/**
 * Wire a canvas to an image. Returns { undo, reset, toBlob, destroy, state }.
 * `onChange({tolerance, canUndo})` keeps the dialog's readout in sync.
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
    const history = [];
    let drag = null;
    let frame = 0;

    const paint = () => ctx.putImageData(new ImageData(current, w, h), 0, 0);
    const toImage = (e) => {
        const r = canvas.getBoundingClientRect();
        return [Math.floor((e.clientX - r.left) * w / r.width), Math.floor((e.clientY - r.top) * h / r.height)];
    };
    const emit = (tolerance = null) => onChange({ tolerance, canUndo: history.length > 0 });
    const push = (next) => {
        history.push(current);
        if (history.length > UNDO_DEPTH) history.shift();
        current = next;
        paint();
        emit();
    };

    const preview = () => {
        frame = 0;
        octx.clearRect(0, 0, w, h);
        if (!drag || drag.restore) return;
        drag.mask = floodSelect(current, w, h, drag.x, drag.y, drag.tol);
        const tint = octx.createImageData(w, h);
        for (let p = 0; p < w * h; p++) {
            if (!drag.mask[p]) continue;
            tint.data.set([244, 63, 94, 150], p * 4);   // the selection shows as a red film, like Instant Alpha
        }
        octx.putImageData(tint, 0, 0);
    };

    const down = (e) => {
        const [x, y] = toImage(e);
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        canvas.setPointerCapture(e.pointerId);
        if (e.altKey) { push(restore(current, original, w, h, x, y)); return; }
        const i = (y * w + x) * 4;
        drag = { x, y, sx: e.clientX, sy: e.clientY, tol: toleranceFromDrag(0, 0), seed: [current[i], current[i + 1], current[i + 2]] };
        preview();
        emit(Math.round(drag.tol));
    };
    const move = (e) => {
        if (!drag) return;
        drag.tol = toleranceFromDrag(e.clientX - drag.sx, e.clientY - drag.sy);
        emit(Math.round(drag.tol));
        if (!frame) frame = requestAnimationFrame(preview);
    };
    const up = () => {
        if (!drag) return;
        if (frame) { cancelAnimationFrame(frame); preview(); }
        const { mask, seed, tol } = drag;
        drag = null;
        octx.clearRect(0, 0, w, h);
        if (mask && mask.some(Boolean)) push(cut(current, w, h, mask, seed, tol));
        else emit();
    };

    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);

    return {
        undo() { if (history.length) { current = history.pop(); paint(); emit(); } },
        reset() { push(new Uint8ClampedArray(original)); },
        // WebP with alpha, like the library itself: a big figure as PNG is several MB and fails an
        // ordinary upload limit (PHP's default is 2 MB). A browser that cannot encode WebP gives PNG.
        toBlob: () => new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.8)),
        destroy() {
            for (const [t, f] of [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', up]]) {
                canvas.removeEventListener(t, f);
            }
        },
    };
}
