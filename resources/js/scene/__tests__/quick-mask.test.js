import { describe, it, expect } from 'vitest';
import { floodSelect, cut, restore, toleranceFromDrag } from '../quick-mask.js';

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
