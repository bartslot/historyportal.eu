import { describe, it, expect } from 'vitest';
import { floodSelect, cut, restore, toleranceFromDrag, refineEdges, colorSelect, MAX_FEATHER, superpixels, brushSelect, opaqueBox, whiteHoles, defringe, fadeBottom, cleanUp, CLEAN_DEFAULTS } from '../quick-mask.js';

// 7×3: white | ink column | white, with a soft grey pixel next to the ink on the left.
//   W W g K W W W
function drawing() {
    const w = 7, h = 3, d = new Uint8ClampedArray(w * h * 4);
    for (let p = 0; p < w * h; p++) {
        const x = p % w;
        const v = x === 3 ? 20 : x === 2 ? 160 : 255;
        d.set([v, v, v, 255], p * 4);
    }
    return { d, w, h };
}

describe('quick mask', () => {
    it('grows through similar connected pixels and stops at the ink line', () => {
        const { d, w, h } = drawing();
        const m = floodSelect(d, w, h, 0, 1, 20);
        expect([...m].filter(Boolean).length).toBe(6);       // columns 0-1 only
        expect(m[4]).toBe(0);                                 // right of the line untouched
    });

    it('never starts on ink', () => {
        const { d, w, h } = drawing();
        expect(floodSelect(d, w, h, 3, 1, 180).some(Boolean)).toBe(false);
    });

    it('cuts to transparent and un-blends the soft edge instead of leaving a white halo', () => {
        const { d, w, h } = drawing();
        const m = floodSelect(d, w, h, 0, 1, 20);
        const out = cut(d, w, h, m, [255, 255, 255], 20);
        expect(out[3]).toBe(0);
        const g = 2 * 4;                                      // the grey edge pixel
        expect(out[g + 3]).toBeGreaterThan(0);
        expect(out[g + 3]).toBeLessThan(255);
        expect(out[g]).toBeLessThan(160);                     // darker once the white is taken out
        expect(out[3 * 4 + 3]).toBe(255);                     // ink keeps full alpha
    });

    it('restores a cut region from the original', () => {
        const { d, w, h } = drawing();
        const cutOut = cut(d, w, h, floodSelect(d, w, h, 0, 1, 20), [255, 255, 255], 20);
        const back = restore(cutOut, d, w, h, 0, 1);
        expect([...back]).toEqual([...d]);
    });

    it('drag further = higher tolerance, capped', () => {
        expect(toleranceFromDrag(0, 100)).toBeGreaterThan(toleranceFromDrag(0, 10));
        expect(toleranceFromDrag(5000, 0)).toBe(180);
    });
});

describe('quick mask: the edge', () => {
    // a 9x1 strip: four clear pixels, then five opaque red ones
    const strip = () => {
        const d = new Uint8ClampedArray(9 * 4);
        for (let x = 0; x < 9; x++) d.set([200, 0, 0, x < 4 ? 0 : 255], x * 4);
        return d;
    };
    const alpha = (d) => Array.from({ length: d.length / 4 }, (_, p) => d[p * 4 + 3]);

    it('changes nothing at zero', () => {
        expect(alpha(refineEdges(strip(), 9, 1))).toEqual(alpha(strip()));
    });

    it('shrinks and grows the cut edge by whole pixels, keeping the colour under it', () => {
        const shrunk = refineEdges(strip(), 9, 1, { shift: -2 });
        expect(alpha(shrunk)).toEqual([0, 0, 0, 0, 0, 0, 255, 255, 255]);
        const grown = refineEdges(strip(), 9, 1, { shift: 2 });
        expect(alpha(grown)).toEqual([0, 0, 255, 255, 255, 255, 255, 255, 255]);
        expect(grown[2 * 4]).toBe(200);   // real pixels come back, not black
    });

    it('softens the edge into a ramp and leaves the far inside solid', () => {
        const a = alpha(refineEdges(strip(), 9, 1, { feather: 2 }));
        expect(a[0]).toBe(0);
        expect(a[3]).toBeGreaterThan(0);
        expect(a[4]).toBeLessThan(255);
        expect(a[8]).toBe(255);
        for (let x = 1; x < 9; x++) expect(a[x]).toBeGreaterThanOrEqual(a[x - 1]);
    });

    it('holds the controls to their range and never touches the input', () => {
        const d = strip();
        const a = alpha(refineEdges(d, 9, 1, { shift: -99 }));
        expect(a.every((v) => v === 0)).toBe(true);   // shrunk by MAX_SHIFT (10) eats the whole 5 px strip
        expect(alpha(d)[8]).toBe(255);
        expect(MAX_FEATHER).toBe(20);
    });
});

describe('quick mask: everywhere and a capped grow', () => {
    // 5x1: white, ink, white, ink, white: three white bits that do not touch
    const bits = () => {
        const d = new Uint8ClampedArray(5 * 4);
        [255, 0, 255, 0, 255].forEach((v, x) => d.set([v, v, v, 255], x * 4));
        return d;
    };

    it('takes every bit of the colour at once, never the ink', () => {
        expect(Array.from(colorSelect(bits(), 5, 1, 0, 0, 20))).toEqual([1, 0, 1, 0, 1]);
        expect(Array.from(floodSelect(bits(), 5, 1, 0, 0, 20))).toEqual([1, 0, 0, 0, 0]);
    });

    it('grows only into what the picture had, never into its own clear background', () => {
        const before = new Uint8ClampedArray(4 * 4);
        [0, 0, 255, 255].forEach((a, x) => before.set([0, 0, 0, a], x * 4));   // a figure on a clear background
        const grown = refineEdges(before, 4, 1, { shift: 2 }, before);
        expect(Array.from({ length: 4 }, (_, p) => grown[p * 4 + 3])).toEqual([0, 0, 255, 255]);
    });
});

describe('smart brush: patches that follow the edges', () => {
    // 12x6: a dark-green "tree" on the left 5 columns, pale sky on the right
    const scene = () => {
        const w = 12, h = 6, d = new Uint8ClampedArray(w * h * 4);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set(x < 5 ? [30, 90, 40, 255] : [200, 220, 240, 255], (y * w + x) * 4);
        return { d, w, h };
    };

    it('never puts tree and sky in one patch', () => {
        const { d, w, h } = scene();
        const lab = superpixels(d, w, h, { regions: 8 });
        const treeLabels = new Set(), skyLabels = new Set();
        for (let p = 0; p < w * h; p++) (p % w < 5 ? treeLabels : skyLabels).add(lab[p]);
        for (const k of treeLabels) expect(skyLabels.has(k)).toBe(false);
    });

    it('a rough stroke over the tree takes the tree up to its edge, and Alt takes it away again', () => {
        const { d, w, h } = scene();
        const lab = superpixels(d, w, h, { regions: 8 });
        const stroke = new Uint8Array(w * h);
        for (let y = 0; y < h; y++) for (let x = 0; x < 4; x++) stroke[y * w + x] = 1;   // stays just inside the edge
        const sel = brushSelect(new Uint8Array(w * h), lab, stroke);
        for (let p = 0; p < w * h; p++) expect(sel[p]).toBe(p % w < 5 ? 1 : 0);
        const none = brushSelect(sel, lab, stroke, { remove: true });
        expect(Array.from(none).some(Boolean)).toBe(false);
    });

    it('finds the box around what is left', () => {
        const w = 4, h = 3, d = new Uint8ClampedArray(w * h * 4);
        d[(1 * w + 2) * 4 + 3] = 255;
        expect(opaqueBox(d, w, h)).toEqual({ x: 2, y: 1, w: 1, h: 1 });
        expect(opaqueBox(new Uint8ClampedArray(16), 2, 2)).toBeNull();
    });
});

describe('clean-up: white holes, white edges, a soft bottom', () => {
    const px = (w, h, f) => { const d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set(f(x, y), (y * w + x) * 4); return d; };
    const alpha = (d) => Array.from({ length: d.length / 4 }, (_, p) => d[p * 4 + 3]);

    it('takes out a patch of white paper between two stones, not the pale stone', () => {
        // 20x10: pale blue stone left and right, plain white paper in columns 8-11
        const d = px(20, 10, (x) => (x >= 8 && x < 12 ? [252, 252, 252, 255] : [205, 218, 236, 255]));
        const holes = whiteHoles(d, 20, 10, 50);
        for (let p = 0; p < 200; p++) expect(holes[p]).toBe(p % 20 >= 8 && p % 20 < 12 ? 1 : 0);
        expect(whiteHoles(d, 20, 10, 0).some(Boolean)).toBe(false);
    });

    it('leaves a single white speck in the texture alone', () => {
        const d = px(40, 40, (x, y) => (x === 20 && y === 20 ? [255, 255, 255, 255] : [120, 110, 90, 255]));
        expect(whiteHoles(d, 40, 40, 50).some(Boolean)).toBe(false);
    });

    it('fades a whitish fringe next to a clear area and keeps the dark ink solid', () => {
        // 6x1: clear, white-ish fringe, ink, ink, ink, ink
        const d = px(6, 1, (x) => (x === 0 ? [0, 0, 0, 0] : x === 1 ? [240, 240, 240, 255] : [40, 30, 20, 255]));
        const a = alpha(defringe(d, 6, 1, 3));
        expect(a[1]).toBeLessThan(60);
        expect(a.slice(2)).toEqual([255, 255, 255, 255]);
    });

    it('melts the bottom edge into clear over the chosen rows', () => {
        const d = px(4, 20, (x, y) => (y < 15 ? [90, 120, 60, 255] : [0, 0, 0, 0]));   // grass, clear below row 15
        const a = alpha(fadeBottom(d, 4, 20, 6));
        const col = (y) => a[y * 4 + 1];
        expect(col(5)).toBe(255);
        expect(col(14)).toBeLessThan(col(11));
        expect(col(11)).toBeLessThan(255);
        expect(col(14)).toBeLessThan(40);
    });

    it('cleanUp runs all three and never touches its input', () => {
        const d = px(20, 10, (x) => (x >= 8 && x < 12 ? [252, 252, 252, 255] : [205, 218, 236, 255]));
        const out = cleanUp(d, 20, 10, { white: 50, fringe: 2, fade: 0 });
        expect(alpha(out)[10]).toBe(0);
        expect(alpha(d)[10]).toBe(255);
        expect(CLEAN_DEFAULTS.white).toBeGreaterThan(0);
    });
});
