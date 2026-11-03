import { describe, it, expect } from 'vitest';
import { floodSelect, cut, restore, toleranceFromDrag, refineEdges, MAX_FEATHER } from '../quick-mask.js';

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
