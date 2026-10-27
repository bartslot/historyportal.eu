import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The lesson map's ground is the watercolour sea chart (map-chart.js), and nothing else.
 *
 * Bart, 2026-10-24: "1 style of map, map is just map, you can add media". And on 2026-10-26, about
 * prod: cloud shadows over the ocean, a day/night terminator across the Indian Ocean and a hard
 * seam on the Pacific side. All three came from the photographed globe this file used to load
 * (satellite imagery, the globe layers, route-bounded tiles), which is why the guards below are
 * about it NOT coming back: it would still render, and render convincingly.
 *
 * Asserted against the source because the failure is structural (an import or a source reappearing)
 * and instantiating MapLibre needs a GL context jsdom does not have.
 */
const SOURCE = readFileSync(resolve(__dirname, '../lesson-map.js'), 'utf8');

describe('lesson-map: one ground, and it is the chart', () => {
    it('builds its ground from map-chart.js', () => {
        expect(SOURCE).toContain("from './map-chart.js'");
        expect(SOURCE).toContain('...chart.under');
        expect(SOURCE).toContain('...chart.over');
    });

    it('never loads the globe layers: no clouds, no sun, no day and night', () => {
        expect(SOURCE).not.toContain('map-globe-layers');
        expect(SOURCE).not.toContain('applyGlobe');
    });

    it('has no photographed ground, no 3D relief and no tilt', () => {
        expect(SOURCE).not.toMatch(/SATELLITE|satellite-detail|DEM_SOURCE|setTerrain/);
        expect(SOURCE).toMatch(/pitch: 0,/);
    });

    it('offers no style switch', () => {
        // The Earth/Drawn switch, and before it the five-atlas picker, must not come back.
        expect(SOURCE).not.toMatch(/opts\.mapStyle|MAP_STYLES/);
    });
});
