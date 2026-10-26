import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHART, chartLayers, chartSources, chartImages, chartTunerControls } from '../map-chart.js';

const PUBLIC = resolve(__dirname, '../../../public');
const ids = (layers) => layers.map((l) => l.id);

describe('map-chart: the watercolour sea chart', () => {
    it('stacks sea, depth glaze, land, foothills, then ink coast, ridges and waves', () => {
        const { under, over } = chartLayers();
        expect(ids(under)).toEqual(['bg', 'chart-glaze', 'land', 'chart-land-edge', 'chart-tufts']);
        expect(ids(over)).toEqual(['chart-coast-dash', 'coast-bold', 'chart-ridges', 'chart-waves']);
    });

    it('never stacks ridges and keeps them off the continent view', () => {
        const ridges = chartLayers().over.find((l) => l.id === 'chart-ridges');
        // Bart 2026-10-21: "too much stacked"; 2026-10-20: "they never really work zoomed out".
        expect(ridges.layout['icon-allow-overlap']).toBeUndefined();
        expect(ridges.minzoom).toBeGreaterThanOrEqual(3);
        // the size is capped by each ridge's own distance to the coast
        expect(JSON.stringify(ridges.layout['icon-size'])).toContain('"fit"');
    });

    it('draws the dashed line on the sea side of the coast', () => {
        // The coast rings (scripts/build-chart-data.py) all run counter-clockwise, land on the left, so
        // the sea is on the right and MapLibre offsets a positive line-offset to the right. Natural Earth's
        // own coastline lines run either way, which put the dash inland on most of the world.
        expect(CHART.dashOffset).toBeGreaterThan(0);
        const { under, over } = chartLayers();
        expect(JSON.stringify(chartSources('')['chart-coast-simple'])).toContain('/map-chart/coast.geojson');
        expect(JSON.stringify(under.find((l) => l.id === 'chart-land-edge').paint['line-offset'])).toMatch(/,-\d/);
        expect(over.find((l) => l.id === 'chart-coast-dash').source).toBe('chart-coast-simple');
    });

    it('has no photographed ground, relief or globe source', () => {
        const sources = chartSources('');
        expect(Object.keys(sources).sort()).toEqual(['chart-coast-simple', 'chart-glaze', 'chart-peaks', 'chart-tufts', 'chart-waves']);
        expect(JSON.stringify(sources)).not.toMatch(/gibs|eox|terrarium|raster-dem/);
    });

    it('ships every image and tile set it asks for', () => {
        for (const img of chartImages()) expect(existsSync(`${PUBLIC}${img.url}`), img.url).toBe(true);
        for (const set of ['glaze/0/0/0.webp', 'peaks/3', 'tufts/3', 'waves/0/0/0.pbf']) {
            expect(existsSync(`${PUBLIC}/map-chart/${set}`), set).toBe(true);
        }
    });

    it('tuner controls start at the shipped values and own the live config', () => {
        const cfg = { ...CHART };
        const map = { getLayer: () => null };
        const controls = chartTunerControls(map, cfg);
        for (const c of controls) expect(c.value, c.key).toBe(CHART[c.key]);
        controls.find((c) => c.key === 'waveScale').apply(2);
        expect(cfg.waveScale).toBe(2);
        expect(CHART.waveScale).toBe(1.5); // the defaults are never touched
    });
});
