import { describe, it, expect } from 'vitest';
import { dab, line, union, applyStroke, compose, wholeBox } from '../erase-brush.js';

const masks = (n) => ({ erase: new Uint8ClampedArray(n).fill(255), bring: new Uint8ClampedArray(n) });
const solid = (n, r, g, b, a = 255) => {
    const d = new Uint8ClampedArray(n * 4);
    for (let i = 0; i < n; i++) d.set([r, g, b, a], i * 4);
    return d;
};

describe('eraser: one dab', () => {
    it('a one pixel brush takes exactly the pixel under the pointer', () => {
        const cov = new Uint8Array(25);
        dab(cov, 5, 5, 2.3, 3.8, 0.5);
        expect(cov[3 * 5 + 2]).toBe(255);
        expect([...cov].filter(Boolean)).toHaveLength(1);
    });

    it('a hard brush is solid to its rim, a soft one fades from the middle', () => {
        const hard = new Uint8Array(21 * 21), soft = new Uint8Array(21 * 21);
        dab(hard, 21, 21, 10.5, 10.5, 8, 0);
        dab(soft, 21, 21, 10.5, 10.5, 8, 1);
        const at = (c, dx) => c[10 * 21 + 10 + dx];
        expect(at(hard, 0)).toBe(255);
        expect(at(hard, 6)).toBe(255);
        expect(at(soft, 0)).toBe(255);
        expect(at(soft, 4)).toBeGreaterThan(at(soft, 6));
        expect(at(soft, 6)).toBeLessThan(255);
        expect(at(hard, 9)).toBe(0);
    });

    it('clips at the picture and answers null when wholly outside it', () => {
        const cov = new Uint8Array(100);
        expect(dab(cov, 10, 10, 0, 0, 3)).toEqual({ x0: 0, y0: 0, x1: 3, y1: 3 });
        expect(dab(cov, 10, 10, -50, -50, 3)).toBeNull();
    });
});

describe('eraser: one stroke', () => {
    it('leaves no gap along a fast line and gives the box it touched', () => {
        const cov = new Uint8Array(100 * 10);
        const box = line(cov, 100, 10, [5, 5], [95, 5], 3);
        for (let x = 5; x < 95; x++) expect(cov[5 * 100 + x]).toBe(255);
        expect(box.x0).toBeLessThanOrEqual(2);
        expect(box.x1).toBeGreaterThanOrEqual(98);
    });

    it('going over a spot twice in one stroke does not build up', () => {
        const once = new Uint8Array(21 * 21), twice = new Uint8Array(21 * 21);
        dab(once, 21, 21, 10.5, 10.5, 6, 1);
        dab(twice, 21, 21, 10.5, 10.5, 6, 1);
        dab(twice, 21, 21, 10.5, 10.5, 6, 1);
        expect([...twice]).toEqual([...once]);
    });

    it('erases, and Bring back returns the pixel, also where the clean-up took it', () => {
        const start = masks(4), mid = masks(4), end = masks(4);
        const all = wholeBox(4, 1);
        applyStroke(new Uint8Array([255, 128, 0, 0]), all, 4, start, mid);
        expect([...mid.erase.slice(0, 3)]).toEqual([0, 127, 255]);
        applyStroke(new Uint8Array([255, 0, 0, 255]), all, 4, mid, end, true);
        expect(end.erase[0]).toBe(255);
        expect(end.bring[0]).toBe(255);
        expect(end.bring[3]).toBe(255);
    });

    it('an erase over a brought back pixel clears it again', () => {
        const from = { erase: new Uint8ClampedArray([255]), bring: new Uint8ClampedArray([255]) };
        const to = masks(1);
        applyStroke(new Uint8Array([255]), wholeBox(1, 1), 1, from, to);
        expect(to.erase[0]).toBe(0);
        expect(to.bring[0]).toBe(0);
    });

    it('never writes outside its box', () => {
        const from = masks(9), to = masks(9);
        applyStroke(new Uint8Array(9).fill(255), { x0: 1, y0: 1, x1: 1, y1: 1 }, 3, from, to);
        expect([...to.erase].filter((v) => v === 0)).toHaveLength(1);
    });
});

describe('eraser: the final pixels', () => {
    it('makes erased pixels truly clear and keeps the colour of the rest', () => {
        const base = solid(2, 200, 100, 50);
        const m = { erase: new Uint8ClampedArray([0, 255]), bring: new Uint8ClampedArray(2) };
        const out = compose(base, base, m.erase, m.bring, 2, wholeBox(2, 1), new Uint8ClampedArray(8));
        expect(out[3]).toBe(0);
        expect([...out.slice(4)]).toEqual([200, 100, 50, 255]);
    });

    it('brings a pixel back with the colour of the original, not the black of a clear one', () => {
        const base = solid(1, 0, 0, 0, 0), original = solid(1, 240, 230, 220);
        const out = compose(base, original, new Uint8ClampedArray([255]), new Uint8ClampedArray([255]), 1, wholeBox(1, 1), new Uint8ClampedArray(4));
        expect([...out]).toEqual([240, 230, 220, 255]);
    });

    it('a half soft edge is half clear', () => {
        const base = solid(1, 10, 10, 10);
        const out = compose(base, base, new Uint8ClampedArray([128]), new Uint8ClampedArray(1), 1, wholeBox(1, 1), new Uint8ClampedArray(4));
        expect(out[3]).toBe(128);
    });

    it('union grows a box and ignores nothing', () => {
        expect(union(null, null)).toBeNull();
        expect(union({ x0: 1, y0: 1, x1: 2, y1: 2 }, { x0: 0, y0: 3, x1: 1, y1: 4 })).toEqual({ x0: 0, y0: 1, x1: 2, y1: 4 });
    });
});
