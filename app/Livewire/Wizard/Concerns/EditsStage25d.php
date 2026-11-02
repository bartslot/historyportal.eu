<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Models\Scene;
use App\Services\Stage25d\LayerKeys;
use Livewire\Attributes\On;

/**
 * Saves what a teacher changes on a stage25d scene's layers (config.stage25d.set.layers[i]): a base value
 * set from a field (`stage25d:layer`) and the keys of the timeline (setTimeline). Neither redraws the stage:
 * it already shows the edit (same rule as diorama:move).
 */
trait EditsStage25d
{
    /**
     * A base value of one layer: x, y, scale, rotation or opacity.
     *
     * @param  array<string,mixed>  $patch
     */
    #[On('stage25d:layer')]
    public function saveStage25dLayer(int $index, array $patch, ?int $sceneId = null): void
    {
        $scene = $this->stage25dScene();
        if ($sceneId !== null && $scene?->id !== $sceneId) {
            return;   // a debounced save from a scene the teacher has since left
        }
        $layers = $scene?->config['stage25d']['set']['layers'] ?? null;
        if (! $scene || ! isset($layers[$index])) {
            return;
        }
        $values = LayerKeys::clean($patch);
        if ($values === []) {
            return;
        }
        $layers[$index] = [...$layers[$index], ...$values];
        $this->storeStage25dLayers($scene, $layers);
    }

    /**
     * The timeline's keys for every layer (`layer-3` => keys); an empty list clears a layer's keys.
     *
     * @param  array<string,mixed>  $byLayer
     */
    private function saveStage25dKeys(array $byLayer, float $duration, int $sceneId): void
    {
        $scene = $this->stage25dScene();
        if ($scene?->id !== $sceneId) {
            return;   // the panel's stage belonged to another scene: never write its layers here
        }
        $layers = $scene?->config['stage25d']['set']['layers'] ?? null;
        if (! $scene || ! is_array($layers)) {
            return;
        }
        foreach ($byLayer as $id => $keys) {
            if (preg_match('/^layer-(\d+)$/', (string) $id, $m) !== 1 || ! isset($layers[(int) $m[1]]) || ! is_array($keys)) {
                continue;
            }
            $clean = LayerKeys::sanitize($keys, max($duration, (float) ($scene->config['stage25d']['dur_s'] ?? 0), (float) $scene->duration_seconds));
            if ($clean === []) {
                unset($layers[(int) $m[1]]['keys']);
            } else {
                $layers[(int) $m[1]]['keys'] = $clean;
            }
        }
        $this->storeStage25dLayers($scene, $layers);
    }

    private function stage25dScene(): ?Scene
    {
        $scene = $this->selectedSceneId ? $this->lesson->scenes()->find($this->selectedSceneId) : null;

        return $scene?->isStage25d() ? $scene : null;
    }

    /** @param  array<int,mixed>  $layers */
    private function storeStage25dLayers(Scene $scene, array $layers): void
    {
        $config = $scene->config;
        $config['stage25d']['set']['layers'] = array_values($layers);
        if ($config !== $scene->config) {
            $scene->update(['config' => $config]);
        }
    }
}
