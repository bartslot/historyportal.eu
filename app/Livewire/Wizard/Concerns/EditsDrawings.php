<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Services\Editor\Drawings;

/**
 * Tekenen: a pen line, a straight line or an arrow drawn over the scene (resources/js/editor/draw-layer.js). The first
 * line of a drawing session becomes a picture layer exactly where it was drawn; every next line until Klaar goes onto
 * that same layer (Bart, 2026-11-24: "it should draw on 1 layer"). The eraser (Gum) rubs out parts of drawing layers.
 * Each line and each rub is one save, so Cmd-Z takes back one at a time.
 */
trait EditsDrawings
{
    /**
     * @param  array<string,mixed>  $stroke  { tool, colour, width, points: [[x%, y%], ...] }
     * @param  int|null  $into  the drawing layer this session draws on (asset id), null for the first line
     * @return array{ok: bool, id?: int}
     */
    public function addDrawing(array $stroke, float $aspect = 16 / 9, ?int $into = null): array
    {
        $clean = Drawings::clean($stroke);
        if ($clean === null || ! $this->selectedSceneId) {
            return ['ok' => false];
        }

        if ($into !== null && $this->redrawDrawings($aspect, function (array $layer) use ($into, $clean, $aspect): ?array {
            if (($layer['asset_id'] ?? null) !== $into) {
                return null;
            }
            $strokes = [...Drawings::placed($layer, $aspect), $clean];

            return Drawings::pointCount($strokes) <= Drawings::MAX_LAYER_POINTS ? $strokes : null;
        })) {
            $this->activeLayerId = $into;

            return ['ok' => true, 'id' => $into];
        }

        $drawn = Drawings::svg($clean, $aspect);
        $asset = Drawings::save(auth()->user(), $clean, $drawn['svg'], __('Drawing'));
        $this->attachArtwork($asset->id, $drawn['x'], $drawn['y']);
        $box = ['x' => round($drawn['x'], 3), 'y' => round($drawn['y'], 3), 'width' => round($drawn['width'], 3), 'height' => round($drawn['height'], 3)];
        // its box exactly: the same request, so one Cmd-Z takes the whole line back (SceneHistory merges them)
        $this->writeLayerFields($asset->id, ['height' => $box['height'], 'width' => $box['width'], 'strokes' => [$clean], 'drawn' => $box], unsetNull: false);
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
    public function eraseDrawing(array $path, float $size = 8, float $aspect = 16 / 9): array
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

        $changed = $this->redrawDrawings($aspect, function (array $layer) use ($points, $radius, $aspect): ?array {
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
     * @param  callable(array<string,mixed>): ?list<array<string,mixed>>  $change
     */
    private function redrawDrawings(float $aspect, callable $change): bool
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
                if (! array_key_exists($id, $done)) {
                    $strokes = $change($layer);
                    $done[$id] = match (true) {
                        $strokes === null => false,
                        $strokes === [] => null,
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
}
