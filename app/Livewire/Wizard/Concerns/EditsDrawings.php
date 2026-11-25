<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Services\Editor\Drawings;

/**
 * Tekenen: a pen line, a straight line or an arrow drawn over the scene (resources/js/editor/draw-layer.js). The first
 * line of a drawing session becomes a picture layer exactly where it was drawn; every next line until Klaar goes onto
 * that same layer (Bart, 2026-11-24: "it should draw on 1 layer"). The eraser (Gum) rubs out parts of drawing layers.
 * Each line and each rub is one save, so Cmd-Z takes back one at a time.
 *
 * On a map a drawing belongs to the map (Bart, 2026-11-24: "should be stuck on the map automatically"): its first line
 * pins the layer to the place under its middle, and `geo` (the map's zoom and the stage's height and width in px
 * when it was drawn: zoom, px, w) lets ArtworkOverlay grow and shrink it exactly with the map, on any screen. The editor sends the
 * map's view with every line and rub (`$map`: zoom, px, and where each pinned layer sits now), because only the
 * browser knows where the map puts a place.
 */
trait EditsDrawings
{
    /**
     * @param  array<string,mixed>  $stroke  { tool, colour, width, points: [[x%, y%], ...] }
     * @param  int|null  $into  the drawing layer this session draws on (asset id), null for the first line
     * @return array{ok: bool, id?: int}
     */
    public function addDrawing(array $stroke, float $aspect = 16 / 9, ?int $into = null, ?array $map = null): array
    {
        $clean = Drawings::clean($stroke);
        if ($clean === null || ! $this->selectedSceneId) {
            return ['ok' => false];
        }
        $view = $this->mapView($map);

        if ($into !== null && $this->redrawDrawings($aspect, $view, function (array $layer) use ($into, $clean, $aspect): ?array {
            if (($layer['asset_id'] ?? null) !== $into) {
                return null;
            }
            $strokes = [...Drawings::placed($layer, $aspect), $clean];

            return Drawings::pointCount($strokes) <= Drawings::MAX_LAYER_POINTS ? $strokes : null;
        })) {
            $this->activeLayerId = $into;

            return ['ok' => true, 'id' => $into];
        }

        // on a map: around the place under the line's middle, pinned there
        $pin = $view['centre'] ?? null;
        $drawn = Drawings::svgMany([$clean], $aspect, $pin ? [$pin['x'], $pin['y']] : null);
        $asset = Drawings::save(auth()->user(), $clean, $drawn['svg'], __('Drawing'));
        $this->attachArtwork($asset->id, $drawn['x'], $drawn['y'], $pin['lng'] ?? null, $pin['lat'] ?? null);
        $box = ['x' => round($drawn['x'], 3), 'y' => round($drawn['y'], 3), 'width' => round($drawn['width'], 3), 'height' => round($drawn['height'], 3)];
        $fields = ['height' => $box['height'], 'width' => $box['width'], 'strokes' => [$clean], 'drawn' => $box];
        if ($pin) {
            $fields += ['x' => $box['x'], 'y' => $box['y'], 'geo' => self::geo($view)];
        }
        // its box exactly: the same request, so one Cmd-Z takes the whole line back (SceneHistory merges them)
        $this->writeLayerFields($asset->id, $fields, unsetNull: false);
        $this->activeLayerId = $asset->id;

        return ['ok' => true, 'id' => $asset->id];
    }

    /**
     * The eraser: rub along `path` (stage %) with a round eraser `size` px wide at a 1000 px tall stage, over every
     * drawing layer of the scene. A layer rubbed out completely goes.
     *
     * @param  list<mixed>  $path
     * @return array{ok: bool}
     */
    public function eraseDrawing(array $path, float $size = 8, float $aspect = 16 / 9, ?array $map = null): array
    {
        $points = [];
        foreach (array_slice($path, 0, 2000) as $p) {
            if (is_array($p) && is_numeric($p[0] ?? null) && is_numeric($p[1] ?? null)) {
                $points[] = [max(-50.0, min(150.0, (float) $p[0])), max(-50.0, min(150.0, (float) $p[1]))];
            }
        }
        if ($points === [] || ! $this->selectedSceneId) {
            return ['ok' => false];
        }
        $radius = max(0.4, min(10.0, $size / 20));

        $changed = $this->redrawDrawings($aspect, $this->mapView($map), function (array $layer) use ($points, $radius, $aspect): ?array {
            $before = Drawings::placed($layer, $aspect);
            $after = Drawings::erase($before, $points, $radius, $aspect);

            return $after === $before ? null : $after;
        });
        if ($changed && $this->activeLayerId !== null && ! collect($this->sceneArtworkLayers())->contains('asset_id', $this->activeLayerId)) {
            $this->activeLayerId = null;   // the selected drawing was rubbed out completely
        }

        return ['ok' => $changed];
    }

    /**
     * Draw the scene's drawing layers again in ONE save: `$change` gets each drawing layer of the panel being edited
     * and gives its new strokes ([] removes the layer) or null to leave it.
     *
     * A drawing pinned to the map is placed where the map shows it now (`$view['pins']`) and drawn again around that
     * same middle, so it stays on its place; its size is measured afresh at this zoom. One the browser did not place
     * is left alone.
     *
     * @param  array{zoom:float, px:float, w:float, pins:array<int, array{x:float, y:float, f:float, fx:float}>}|null  $view
     * @param  callable(array<string,mixed>): ?list<array<string,mixed>>  $change
     */
    private function redrawDrawings(float $aspect, ?array $view, callable $change): bool
    {
        $scene = $this->lesson->scenes()->findOrFail($this->selectedSceneId);
        $shots = $scene->shots ?? [];
        $changed = false;
        $done = [];   // asset id => the redrawn layer, so the same layer on two shots is drawn once
        foreach ($shots as $i => $shot) {
            if (! $this->editsShot($scene, (int) $i)) {
                continue;
            }
            $layers = [];
            foreach ($shot['layers'] ?? [] as $layer) {
                if (! Drawings::isDrawingLayer($layer)) {
                    $layers[] = $layer;

                    continue;
                }
                $id = $layer['asset_id'] ?? null;
                $pinned = ($layer['anchor'] ?? null) === 'map';
                $pin = $pinned ? ($view['pins'][(int) $id] ?? null) : null;
                if ($pinned && $pin === null) {
                    $layers[] = $layer;

                    continue;
                }
                if (! array_key_exists($id, $done)) {
                    // as the map shows it now: its size by the map's factor, across by the factor for the stage's width
                    $now = $pin ? [...$layer, 'x' => $pin['x'], 'y' => $pin['y'], 'scale' => (float) ($layer['scale'] ?? 1.0) * $pin['f'],
                        ...(isset($layer['width']) ? ['width' => (float) $layer['width'] * $pin['fx'] / $pin['f']] : [])] : $layer;
                    $strokes = $change($now);
                    $done[$id] = match (true) {
                        $strokes === null => false,
                        $strokes === [] => null,
                        $pin !== null => [...Drawings::relayer(auth()->user(), $now, $strokes, $aspect, [$pin['x'], $pin['y']]),
                            'x' => $pin['x'], 'y' => $pin['y'], 'geo' => self::geo($view)],
                        default => Drawings::relayer(auth()->user(), $layer, $strokes, $aspect),
                    };
                }
                if ($done[$id] === false) {
                    $layers[] = $layer;

                    continue;
                }
                $changed = true;
                if ($done[$id] !== null) {
                    $layers[] = $done[$id];
                }
            }
            $shots[$i] = array_merge($shot, ['layers' => $layers]);
        }
        if ($changed) {
            $scene->update(['shots' => $shots]);
            $this->selectSceneInternal($scene->id);
        }

        return $changed;
    }

    /**
     * The live map's view as the editor sent it, checked: zoom, the stage's height in px, where each pinned layer sits
     * now (x, y in stage %, f its size factor), and for a new drawing the place under its middle. Null off a map.
     *
     * @param  array<string,mixed>|null  $map
     * @return array{zoom:float, px:float, w:float, pins:array<int, array{x:float, y:float, f:float, fx:float}>, centre?:array{x:float, y:float, lng:float, lat:float}}|null
     */
    private function mapView(?array $map): ?array
    {
        $num = fn ($v): bool => is_numeric($v) && is_finite((float) $v);
        if (! is_array($map) || ! $num($map['zoom'] ?? null) || ! $num($map['px'] ?? null) || ! $num($map['w'] ?? null)) {
            return null;
        }
        $px = round(max(50.0, min(10000.0, (float) $map['px'])), 1);
        $w = round(max(50.0, min(20000.0, (float) $map['w'])), 1);
        $view = ['zoom' => round(max(0.0, min(24.0, (float) $map['zoom'])), 4), 'px' => $px, 'w' => $w, 'pins' => []];
        foreach (array_slice(is_array($map['pins'] ?? null) ? $map['pins'] : [], 0, 200, true) as $id => $p) {
            if (is_numeric($id) && is_array($p) && $num($p['x'] ?? null) && $num($p['y'] ?? null) && $num($p['f'] ?? null) && (float) $p['f'] > 0 && $num($p['fx'] ?? null) && (float) $p['fx'] > 0) {
                $view['pins'][(int) $id] = ['x' => max(-500.0, min(600.0, (float) $p['x'])), 'y' => max(-500.0, min(600.0, (float) $p['y'])), 'f' => max(0.01, min(100.0, (float) $p['f'])),
                    'fx' => max(0.01, min(100.0, (float) $p['fx']))];
            }
        }
        $c = $map['centre'] ?? null;
        if (is_array($c) && $num($c['x'] ?? null) && $num($c['y'] ?? null) && $num($c['lng'] ?? null) && $num($c['lat'] ?? null)) {
            $view['centre'] = ['x' => max(0.0, min(100.0, (float) $c['x'])), 'y' => max(0.0, min(100.0, (float) $c['y'])),
                'lng' => max(-180.0, min(180.0, (float) $c['lng'])), 'lat' => max(-90.0, min(90.0, (float) $c['lat']))];
        }

        return $view;
    }

    /** @param  array{zoom:float, px:float, w:float}  $view */
    private static function geo(array $view): array
    {
        return ['zoom' => $view['zoom'], 'px' => $view['px'], 'w' => $view['w']];
    }
}
