import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tourPackFor } from '../voyage-tour.js';

// Bart 2026-11-21: "Venetië is in dutch, while the lesson is in english."
describe('tourPackFor', () => {
    const packs = {
        './timemap/x-tour.json': { default: { title: 'De reis' } },
        './timemap/x-tour.en.json': { default: { title: 'The voyage' } },
    };

    it('picks the lesson language, by its first two letters', () => {
        expect(tourPackFor('x', 'en', packs).title).toBe('The voyage');
        expect(tourPackFor('x', 'en-GB', packs).title).toBe('The voyage');
    });

    it('falls back to the voyage\'s own pack, and to nothing', () => {
        expect(tourPackFor('x', 'nl', packs).title).toBe('De reis');
        expect(tourPackFor('x', null, packs).title).toBe('De reis');
        expect(tourPackFor('y', 'en', packs)).toEqual({});
    });

    it('ships Marco Polo in English, stop for stop with the Dutch pack', () => {
        const dir = resolve(__dirname, '../timemap');
        const nl = JSON.parse(readFileSync(`${dir}/marco-polo-1271-tour.json`, 'utf8'));
        const en = JSON.parse(readFileSync(`${dir}/marco-polo-1271-tour.en.json`, 'utf8'));
        expect(en.legs.map((l) => l.arrive)).toEqual(nl.legs.map((l) => l.arrive));
        expect(en.legs.at(-1).stop.place).toBe('Venice');
        expect(JSON.stringify(en)).not.toMatch(/Venetië|Akko|Jeruzalem/);
    });
});
