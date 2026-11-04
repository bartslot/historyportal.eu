<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Services\Editor\Drawings;

/**
 * Tekenen: a pen line, a straight line or an arrow drawn over the scene (resources/js/editor/draw-layer.js) becomes
 * its own picture layer exactly where it was drawn (Drawings), so it is selected, moved and deleted like any other.
 */
trait EditsDrawings
{
    /**
     * @param  array<string,mixed>  $stroke  { tool, colour, width, points: [[x%, y%], ...] }
     * @return array{ok: bool, id?: int}
     */
    public function addDrawing(array $stroke, float $aspect = 16 / 9): array
    {
        $clean = Drawings::clean($stroke);
        if ($clean === null || ! $this->selectedSceneId) {
            return ['ok' => false];
        }
        $drawn = Drawings::svg($clean, $aspect);
        $asset = Drawings::save(auth()->user(), $clean, $drawn['svg'], match ($clean['tool']) {
            'arrow' => __('Arrow'), 'line' => __('Line'), default => __('Pencil'),
        });
        $this->attachArtwork($asset->id, $drawn['x'], $drawn['y']);
        // its box exactly: the same request, so one Cmd-Z takes the whole line back (SceneHistory merges them)
        $this->writeLayerFields($asset->id, ['height' => round($drawn['height'], 3), 'width' => round($drawn['width'], 3)], unsetNull: false);

        return ['ok' => true, 'id' => $asset->id];
    }
}
