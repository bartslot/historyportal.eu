<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Models\Scene;
use App\Services\Stage25d\LayerKeys;
use App\Services\Stage25d\LibraryBundle;
use App\Services\Stage25d\SceneStill;
use Livewire\Attributes\On;

/**
 * Saves what a teacher changes on a stage25d scene's layers (config.stage25d.set.layers[i]): a base value
 * set from a field (`stage25d:layer`) and the keys of the timeline (setTimeline). Neither redraws the stage:
 * it already shows the edit (same rule as diorama:move).
 */
trait EditsStage25d
{
    /** The stage25d layer whose Format panel is open ('layer-3'), or null. */
    public ?string $activeStage25dLayer = null;

    /**
     * A base value of one layer: x, y, scale, rotation or opacity.
     *
     * @param  array<string,mixed>  $patch
     */
    #[On('stage25d:layer')]
    public function saveStage25dLayer(int $index, array $patch, int $sceneId): void
    {
        $scene = $this->stage25dScene();
        if ($scene?->id !== $sceneId) {
            return;   // a debounced save from a scene the teacher has since left
        }
        $layers = $scene?->config['stage25d']['set']['layers'] ?? null;
        if (! $scene || ! is_array($layers) || (! isset($layers[$index]) && ! is_array($patch['add'] ?? null) && ! isset($patch['sky']))) {
            return;
        }
        $bundle = (string) ($scene->config['stage25d']['bundle'] ?? '');
        if (is_string($patch['sky'] ?? null)) {   // the scene's sky picture
            if (LibraryBundle::assetLayer($bundle, $patch['sky']) === 'sky') {
                $config = $scene->config;
                $config['stage25d']['set']['sky'] = $patch['sky'];
                $scene->update(['config' => $config]);
                $this->selectedScene['config']['stage25d']['set']['sky'] = $patch['sky'];
            }

            return;
        }
        if (is_array($patch['add'] ?? null)) {
            $add = $patch['add'];
            $kind = LibraryBundle::assetLayer($bundle, (string) ($add['asset'] ?? ''));
            if ($kind !== null) {
                $layers[] = ['asset' => $add['asset'], 'depth' => in_array($add['depth'] ?? null, ['sky', 'bg', 'mid', 'fg', 'near'], true) ? $add['depth'] : 'mid', ...LayerKeys::clean($add)];
                $this->storeStage25dLayers($scene, $layers);
            }

            return;
        }
        $values = LayerKeys::clean($patch);
        if (is_string($patch['asset'] ?? null) && LibraryBundle::assetLayer($bundle, $patch['asset']) !== null) {
            $values['asset'] = $patch['asset'];
        }
        if (in_array($patch['depth'] ?? null, LayerKeys::DEPTHS, true) && ($layers[$index]['depth'] ?? null) !== 'sky') {
            $values['depth'] = $patch['depth'];
        }
        if (($motion = LayerKeys::motion($patch['motion'] ?? null)) !== null) {
            $values['motion'] = $motion;
        }
        if ($values === []) {
            return;
        }
        $layers[$index] = [...$layers[$index], ...$values];
        $this->storeStage25dLayers($scene, $layers);
    }

    /** The scene look sliders the panel offers, with the range each may take (engine-mvp stage25d/look.ts LOOK_RANGE). */
    private const LOOK_RANGES = [
        'sheetGrain' => [0, 1], 'groundDetail' => [0, 1], 'sunLight' => [0, 1], 'castShadow' => [0, 1],
        'smoke' => [0, 1], 'birds' => [0, 1], 'cloudDrift' => [0, 1], 'housePitch' => [-6, 12],
    ];

    /** One scene look value (config.stage25d.look.<key>). */
    #[On('stage25d:look')]
    public function saveStage25dLook(string $key, mixed $value, int $sceneId): void
    {
        $scene = $this->stage25dScene();
        if (! $scene || $scene->id !== $sceneId || ! isset(self::LOOK_RANGES[$key]) || ! is_numeric($value) || ! is_finite((float) $value)) {
            return;
        }
        [$min, $max] = self::LOOK_RANGES[$key];
        $config = $scene->config;
        $config['stage25d']['look'][$key] = max($min, min($max, (float) $value));
        $scene->update(['config' => $config]);
        $this->selectedScene['config']['stage25d']['look'][$key] = $config['stage25d']['look'][$key];
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

    /** A rendered frame (data:image/jpeg) for a scene of this lesson: the rail thumbnail and the player's WebGL fallback. */
    public function saveStage25dStill(int $sceneId, string $dataUrl, ?string $hash = null): void
    {
        $scene = $this->lesson->scenes()->find($sceneId);
        if ($scene && SceneStill::store($scene, $dataUrl, $hash) && (int) $this->selectedSceneId === $sceneId) {
            // The snapshot the next save is built from must not put the old picture back.
            $this->selectedScene['image_path'] = $scene->image_path;
        }
    }

    /** Distance of each depth from the camera in metres (engine-mvp stage25d/layout.ts DEPTH_Z). */
    private const DEPTH_Z = ['bg' => 70.0, 'mid' => 22.0, 'fg' => 7.0, 'near' => 3.5];

    private const DEPTH_RANK = ['sky' => 0, 'bg' => 1, 'mid' => 2, 'fg' => 3, 'near' => 4];

    /**
     * The object list's order, front first, as layer indexes. The dragged layer takes the depth of the one now behind it
     * (the one in front when it went to the very back) and keeps its apparent size; inside one depth the array order
     * is the draw order. Keys move with their layers.
     *
     * @param  list<int>  $order
     */
    public function reorderStage25dLayers(array $order, int $moved, int $sceneId, ?float $x = null, ?float $z = null, ?float $scale = null, ?array $keys = null): void
    {
        $scene = $this->stage25dScene();
        $layers = $scene?->config['stage25d']['set']['layers'] ?? null;
        if (! $scene || $scene->id !== $sceneId || ! is_array($layers)) {
            return;
        }
        $order = array_values(array_map('intval', $order));
        $all = array_keys($layers);
        $sorted = $order;
        sort($sorted);
        if ($sorted !== $all || ! in_array($moved, $order, true)) {
            return;   // a stale list (a layer was added or removed since): do nothing
        }
        $at = array_search($moved, $order, true);
        if ($z !== null) {
            // On the ground: standing nearer or farther than its neighbours is a distance; the browser worked it out
            // (and the x and scale that keep its column and its size on screen). Its band follows the distance.
            $layers[$moved] = [...$layers[$moved], ...LayerKeys::clean(['x' => $x, 'z' => $z, 'scale' => $scale]), 'depth' => self::bandOf($z)];
            if ($keys !== null && isset($layers[$moved]['keys'])) {
                // a keyed distance or size wins over the base: the browser moved the keys by the same step
                $layers[$moved]['keys'] = LayerKeys::sanitize($keys, max((float) ($scene->config['stage25d']['dur_s'] ?? 0), (float) $scene->duration_seconds));
            }
        }
        $ref = $order[$at + 1] ?? ($order[$at - 1] ?? null);
        $from = $layers[$moved]['depth'] ?? 'mid';
        $to = $ref !== null ? ($layers[$ref]['depth'] ?? $from) : $from;
        if ($z === null && ! isset($layers[$moved]['z']) && $from !== 'sky' && in_array($to, LayerKeys::DEPTHS, true) && $to !== $from) {
            $layers[$moved]['depth'] = $to;
            // The browser knows where the picture is on screen and sends the x and scale that keep it there; without them, keep its size.
            $layers[$moved] = [...$layers[$moved], ...LayerKeys::clean(['scale' => $scale ?? ($layers[$moved]['scale'] ?? 1.0) * self::DEPTH_Z[$to] / self::DEPTH_Z[$from], 'x' => $x ?? ($layers[$moved]['x'] ?? 0.5)])];
        }
        $back = array_flip(array_reverse($order));   // layer index -> place from the back
        $indexes = $all;
        usort($indexes, fn (int $a, int $b): int => [self::DEPTH_RANK[$layers[$a]['depth'] ?? 'mid'] ?? 2, $back[$a]] <=> [self::DEPTH_RANK[$layers[$b]['depth'] ?? 'mid'] ?? 2, $back[$b]]);
        $this->storeStage25dLayers($scene, array_map(fn (int $i): array => $layers[$i], $indexes));
        $this->selectSceneInternal($scene->id);
        $this->dispatch('stage25d:select', index: (int) array_search($moved, $indexes, true));
    }

    /** The depth band a distance in metres belongs to (engine-mvp stage25d/layout.ts bandOf): line weight and haze. */
    private static function bandOf(float $z): string
    {
        return $z < 4.9 ? 'near' : ($z < 12.4 ? 'fg' : ($z < 39.2 ? 'mid' : 'bg'));
    }

    /** Take a layer off the stage. Its keys go with it (they live on the layer); the stage rebuilds from the saved scene. */
    public function removeStage25dLayer(int $index): void
    {
        $scene = $this->stage25dScene();
        $layers = $scene?->config['stage25d']['set']['layers'] ?? null;
        if (! $scene || ! is_array($layers) || ! isset($layers[$index]) || count($layers) <= 1) {
            return;   // the last layer stays: a stage with nothing on it has no picture to edit
        }
        unset($layers[$index]);
        $this->storeStage25dLayers($scene, $layers);
        $this->activeStage25dLayer = null;
        $this->selectSceneInternal($scene->id);   // the stage rebuilds, the timeline re-reads the layers
    }

    /**
     * Copy layers next to themselves (a little to the right, like an artwork layer's copy); the copies are
     * added at the end and the first one is the one left selected.
     *
     * @param  list<int>  $indexes
     */
    public function duplicateStage25dLayers(array $indexes): void
    {
        $scene = $this->stage25dScene();
        $layers = $scene?->config['stage25d']['set']['layers'] ?? null;
        if (! $scene || ! is_array($layers)) {
            return;
        }
        $first = null;
        foreach (array_slice(array_unique($indexes), 0, 20) as $i) {
            if (! isset($layers[$i])) {
                continue;
            }
            $copy = $layers[$i];
            $copy['x'] = min(3.0, (float) ($copy['x'] ?? 0.5) + 0.05);
            unset($copy['figure']);   // a second drawing of a character is not the character: no speaker handle, no balloon tail
            $layers[] = $copy;
            $first ??= count($layers) - 1;
        }
        if ($first === null) {
            return;
        }
        $this->storeStage25dLayers($scene, $layers);
        $this->selectSceneInternal($scene->id);
        $this->dispatch('stage25d:select', index: $first);
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
            if ((int) $this->selectedSceneId === $scene->id) {
                $this->selectedScene['config']['stage25d'] = $config['stage25d'];   // the panel opens layers the snapshot did not have
            }
        }
    }
}
