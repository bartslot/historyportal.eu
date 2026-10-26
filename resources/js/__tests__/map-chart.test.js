import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHART, ISLET_KM2, chartLayers, chartSources, chartImages, chartTunerControls } from '../map-chart.js';

const PUBLIC = resolve(__dirname, '../../../public');
const ids = (layers) => layers.map((l) => l.id);

describe('map-chart: the watercolour sea chart', () => {
    it('stacks sea, depth glaze, land, foothills, then ink coast, ridges and waves', () => {
        const { under, over } = chartLayers();
        expect(ids(under)).toEqual(['bg', 'chart-glaze', 'land', 'chart-lakes', 'chart-land-edge', 'chart-tufts']);
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
        expect(JSON.stringify(under.find((l) => l.id === 'chart-land-edge').paint['line-offset'])).toMatch(/,-\d/);
        expect(over.find((l) => l.id === 'chart-coast-dash').source).toBe('coastline');   // one download, shared with the ink
    });

    it('has no photographed ground, relief or globe source', () => {
        const sources = chartSources('');
        expect(Object.keys(sources).sort()).toEqual(['chart-glaze', 'chart-lakes', 'chart-land', 'chart-peaks', 'chart-tufts', 'chart-waves']);
        expect(JSON.stringify(sources)).not.toMatch(/gibs|eox|terrarium|raster-dem/);
    });

    it('ships every image and tile set it asks for', () => {
        for (const img of chartImages()) expect(existsSync(`${PUBLIC}${img.url}`), img.url).toBe(true);
        for (const set of ['land.geojson', 'lakes.geojson', 'coast.geojson', 'glaze/0/0/0.webp', 'peaks/3', 'tufts/3', 'waves/0/0/0.pbf']) {
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

    it('draws lakes as water and leaves islets out by zoom, the same way for fill and ink', () => {
        // Bart 2026-10-26: "it is missing the IJsselmeer"; "small islands … look like bugs".
        const { under, over } = chartLayers();
        expect(under.find((l) => l.id === 'chart-lakes').paint['fill-pattern']).toBe('chart-sea');
        const land = JSON.stringify(under.find((l) => l.id === 'land').paint['fill-opacity']);
        expect(JSON.stringify(over.find((l) => l.id === 'coast-bold').paint['line-opacity'])).toBe(land);
        expect(land).toContain('"k"');                        // story islands are always kept
        expect(ISLET_KM2.at(-1)[1]).toBe(0);                    // close in, every island is drawn
        for (let i = 1; i < ISLET_KM2.length; i++) expect(ISLET_KM2[i][1]).toBeLessThan(ISLET_KM2[i - 1][1]);
        expect(over.find((l) => l.id === 'chart-coast-dash').filter).toEqual(['!', ['has', 'lake']]);
    });

    it('leaves out the same islands as the baked glaze, so no shallows halo floats on empty sea', () => {
        const py = readFileSync(resolve(__dirname, '../../../scripts/build-chart-data.py'), 'utf8');
        const baked = JSON.parse(py.match(/^ISLET_KM2 = (\[.*\])$/m)[1].replace(/\(/g, '[').replace(/\)/g, ']'));
        expect(baked).toEqual(ISLET_KM2);
    });
});
