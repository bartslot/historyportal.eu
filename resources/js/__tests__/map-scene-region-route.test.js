import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHART, REGION_GREEN, regionLayers, routeLayer } from '../map-chart.js';
import { contentBox, labelsView } from '../map-view.js';

/**
 * A 3D lesson's map scene (lesson.json kind 'map', LessonImporter): a highlighted region (the Fertile
 * Crescent's green belt), a route and the writer's camera, on the one painted chart. MapLibre needs a GL
 * context jsdom lacks, so the layers are tested as data and the wiring against the source.
 */
const PUBLIC = resolve(__dirname, '../../../public');
const MAP = readFileSync(resolve(__dirname, '../lesson-map.js'), 'utf8');
const PLAYER = readFileSync(resolve(__dirname, '../lesson-player.js'), 'utf8');

describe('a highlighted region is a watercolour wash', () => {
    const [wash, edge] = regionLayers('lesson-region');

    it('is a translucent green fill', () => {
        expect(wash.type).toBe('fill');
        expect(wash.paint['fill-color']).toBe(REGION_GREEN);
        expect(wash.paint['fill-opacity']).toBeLessThan(0.4);
        expect(wash.paint['fill-outline-color']).toBeUndefined();
    });

    it('has no hard outline: its only line is blurred as wide as it is', () => {
        expect(edge.type).toBe('line');
        expect(edge.paint['line-blur']).toEqual(edge.paint['line-width']);
        expect(edge.paint['line-opacity']).toBeLessThan(0.5);
    });

    it('sits under the rivers and every name, over the painted land', () => {
        const under = MAP.indexOf("...chart.under");
        const region = MAP.indexOf("...regionLayers('lesson-region')");
        const rivers = MAP.indexOf("id: 'rivers'");
        expect(under).toBeGreaterThan(0);
        expect(region).toBeGreaterThan(under);
        expect(rivers).toBeGreaterThan(region);
    });

    it('only ever loads a polygon from public/map-regions', () => {
        expect(MAP).toContain('const REGION_URL = /^\\/map-regions\\/[a-z0-9-]+\\.geojson$/');
    });
});

describe('the Fertile Crescent polygon', () => {
    const file = resolve(PUBLIC, 'map-regions/fertile-crescent.geojson');
    const ring = () => JSON.parse(readFileSync(file, 'utf8')).features[0].geometry.coordinates[0];
    const inside = ([x, y]) => {
        let c = false;
        const r = ring();
        for (let i = 0; i < r.length - 1; i++) {
            const [[x1, y1], [x2, y2]] = [r[i], r[i + 1]];
            if ((y1 > y) !== (y2 > y) && x < x1 + ((y - y1) * (x2 - x1)) / (y2 - y1)) c = !c;
        }
        return c;
    };

    it('exists, is closed and names its source', () => {
        expect(existsSync(file)).toBe(true);
        const r = ring();
        expect(r[0]).toEqual(r.at(-1));
        expect(JSON.parse(readFileSync(file, 'utf8')).features[0].properties.source).toMatch(/Breasted/);
    });

    it('arcs from the Gulf over Mesopotamia and the Levant to the Nile delta, around the desert', () => {
        for (const [name, p] of Object.entries({ Babylon: [44.42, 32.54], Ur: [46.1, 30.96], Nineveh: [43.15, 36.36], Aleppo: [37.16, 36.2], Jericho: [35.44, 31.87], delta: [31.0, 30.9] })) {
            expect(inside(p), name).toBe(true);
        }
        expect(inside([39.0, 33.5]), 'the Syrian desert is the hollow of the crescent').toBe(false);
        expect(inside([46.7, 24.7]), 'Arabia').toBe(false);
    });
});

describe('a route', () => {
    it('is drawn in the chart\'s own ink, dashed', () => {
        const layer = routeLayer('lesson-route');
        expect(layer.paint['line-color']).toBe(CHART.inkColor);
        expect(layer.paint['line-dasharray']).toBeDefined();
    });

    it('is framed with the pins when the scene sets no camera', () => {
        const route = [[39.0, 34.0], [41.5, 33.6], [44.42, 32.54]];
        expect(contentBox({ route })).toEqual({ minX: 39.0, minY: 32.54, maxX: 44.42, maxY: 34.0 });
        expect(labelsView({ route }, { width: 1280, height: 720 }).center).toEqual([(39.0 + 44.42) / 2, (32.54 + 34.0) / 2]);
        expect(MAP).toContain('labelsView({ annotations, labels: placeLabels, route }');
    });
});

describe('the writer\'s camera', () => {
    it('opens the map there and holds it: no fit, no itinerary', () => {
        expect(MAP).toContain('const opening = fixedCamera || labelsFit || openingView(');
        expect(MAP).toContain("const labelsFitFor = (fit) => (fit === 'labels' && !fixedCamera");
        expect(MAP).toMatch(/if \(fixedCamera\) return null/);
    });
});

describe('the player plays a map scene of a 3D lesson', () => {
    it('hands the map its labels, region, route and camera', () => {
        for (const opt of ['labels: cfg.labels || []', 'region: cfg.region || null', 'route: cfg.route || null', 'camera: cfg.camera || null']) {
            expect(PLAYER).toContain(opt);
        }
    });

    it('lets the story game end a map scene like any other (a question opens its choice)', () => {
        const body = PLAYER.slice(PLAYER.indexOf('_advanceFromMap (index) {'), PLAYER.indexOf('_afterExits (done) {'));
        expect(body).toContain('this._storyGame?.handleSceneEnd(index, _sceneQueue[index])');
        expect(body.indexOf('handleSceneEnd')).toBeLessThan(body.indexOf('_advanceSceneNow'));
    });
});
