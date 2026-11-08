// Paint, the pipette and the clone stamp (Bart, 2026-11-07: "the clone stamp tool and the pipet in the editor - and
// brushes"). Pure functions on typed arrays; the canvas side is in quick-mask.js. One more layer lies over the cuts and
// the clean-up, under the eraser's two masks (erase-brush.js compose):
//   ink  straight RGBA the size of the picture: what was painted or cloned; alpha 0 = nothing there
// so Bring back takes paint back to the original, the eraser takes it away, undo steps over it and Save writes one picture.
// A stroke's coverage is the eraser's (`line` into `cov`, the highest dab per pixel), so a stroke never builds up on itself.

/**
 * Straight colour (r, g, b, alpha a 0..255) laid over pixel i of `under` (straight RGBA), written to `out` at i. Straight
 * alpha mixed by weight, so a soft edge over a clear pixel keeps its own colour: no dark or light halo.
 */
export function over(under, i, r, g, b, a, out) {
    const sa = a / 255, da = under[i + 3] / 255;
    const oa = sa + da * (1 - sa);
    if (oa <= 0) { out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0; return; }
    const keep = (da * (1 - sa)) / oa, lay = sa / oa;
    out[i] = r * lay + under[i] * keep;
    out[i + 1] = g * lay + under[i + 1] * keep;
    out[i + 2] = b * lay + under[i + 2] * keep;
    out[i + 3] = oa * 255;
}

/**
 * A stroke's ink inside `box`, worked out from the ink as it was when the stroke began (`from`) into `to`.
 * `colourAt(p, rgba)` fills rgba with what the stroke lays at pixel p; `cov` × `opacity` is how much of it.
 */
export function applyInk(cov, box, w, from, to, colourAt, opacity = 1) {
    const rgba = [0, 0, 0, 0];
    for (let y = box.y0; y <= box.y1; y++) {
        for (let p = y * w + box.x0, end = y * w + box.x1; p <= end; p++) {
            const i = p * 4;
            const k = (cov[p] / 255) * opacity;
            if (k <= 0) { to[i] = from[i]; to[i + 1] = from[i + 1]; to[i + 2] = from[i + 2]; to[i + 3] = from[i + 3]; continue; }
            colourAt(p, rgba);
            over(from, i, rgba[0], rgba[1], rgba[2], rgba[3] * k, to);
        }
    }
}

/** The paint brush: one colour [r, g, b] everywhere. */
export const solid = ([r, g, b]) => (p, rgba) => { rgba[0] = r; rgba[1] = g; rgba[2] = b; rgba[3] = 255; };

/**
 * The clone stamp: the picture as it was when the stroke began (`pixels`, straight RGBA), `offset` [dx, dy] whole pixels
 * away (where it copies from minus where it paints). Nothing past the picture's edge.
 */
export const cloned = (pixels, w, h, [dx, dy]) => (p, rgba) => {
    const x = (p % w) + dx, y = Math.floor(p / w) + dy;
    if (x < 0 || y < 0 || x >= w || y >= h) { rgba[0] = rgba[1] = rgba[2] = rgba[3] = 0; return; }
    const i = (y * w + x) * 4;
    rgba[0] = pixels[i]; rgba[1] = pixels[i + 1]; rgba[2] = pixels[i + 2]; rgba[3] = pixels[i + 3];
};

/** The pipette: the colour of one pixel, [r, g, b]; null on a clear one (nothing to paint with). */
export function colourAt(pixels, w, h, x, y) {
    if (x < 0 || y < 0 || x >= w || y >= h) return null;
    const i = (y * w + x) * 4;
    return pixels[i + 3] < 8 ? null : [pixels[i], pixels[i + 1], pixels[i + 2]];
}

/** [r, g, b] as #rrggbb (the colour input's value) and back. */
export const toHex = (rgb) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
export const fromHex = (hex) => [1, 3, 5].map((i) => parseInt(String(hex).slice(i, i + 2), 16) || 0);
