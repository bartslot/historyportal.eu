<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Models\Scene;
use App\Models\SvgAsset;
use App\Services\Diorama\DioramaSpec;
use App\Services\Diorama\LibraryAssets;
use App\Support\MediaUrl;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Livewire\Attributes\On;

/**
 * Saves a drag on the diorama stage (DioramaStage.js): an item moved to a floor cell. The whole
 * diorama JSON is re-validated before it is stored, so the editor can never save what an agent's
 * import would have been refused for (off the grid, unknown floor, a boat on its own deck).
 */
trait EditsDiorama
{
    /**
     * A drag on the stage. An item with a path moves the WHOLE path (Bart, 2026-09-29), so the
     * stage sends its shifted keys along; a still item sends only its new cell.
     *
     * @param  array<int, mixed>  $cell
     * @param  array<int, mixed>|null  $keys
     */
    #[On('diorama:move')]
    public function moveDioramaItem(string $itemId, string $floor, array $cell, ?array $keys = null): void
    {
        $this->patchDioramaItem($itemId, ['floor' => $floor, 'cell' => array_values($cell), ...($keys !== null ? ['keys' => array_values($keys)] : [])]);
    }

    /**
     * The item's clip on the timeline was moved or stretched: its keys at new times. Validated
     * like any import, so a clip can never put the item off its floor.
     *
     * @param  array<int, mixed>  $keys
     */
    #[On('diorama:keys')]
    public function setDioramaKeys(string $itemId, array $keys): void
    {
        $this->patchDioramaItem($itemId, ['keys' => array_values($keys)]);
    }

    /** @param  array<string, mixed>  $patch */
    private function patchDioramaItem(string $itemId, array $patch): void
    {
        $scene = $this->dioramaScene();
        if (! $scene) {
            return;
        }
        $spec = $scene->config['diorama'];
        $spec['items'] = array_map(
            fn (array $item): array => ($item['id'] ?? null) === $itemId ? [...$item, ...$patch] : $item,
            $spec['items'] ?? [],
        );

        // No scene:load re-dispatch: the stage already shows it (same rule as artwork:move).
        $this->saveDiorama($scene, $spec);
    }

    /**
     * A library picture dropped (or clicked in) from the Icons panel onto a diorama: it becomes an
     * item standing on the floor cell under the drop point, at its real height. Pictures that
     * cannot stand (sky, close-ups, cut-off figures, no height yet) are refused with the reason.
     *
     * @param  array<int, mixed>  $cell
     */
    #[On('diorama:add')]
    public function addDioramaItem(int $assetId, string $floor, array $cell): void
    {
        $scene = $this->dioramaScene();
        $asset = SvgAsset::availableTo((int) auth()->id())->find($assetId);
        if (! $scene || ! $asset) {
            return;
        }
        // A backdrop is not a thing on the floor: it becomes the whole background. The old
        // background's occluders (its wall, its rail) belong to that picture and go with it.
        if ($asset->category === 'backdrops') {
            $spec = $scene->config['diorama'];
            // `base` stays: it is where the scene's own pictures (and their assets.json) live.
            $spec['plate'] = [...($spec['plate'] ?? []), 'image' => MediaUrl::of($asset->src()), 'occluders' => []];
            if ($this->saveDiorama($scene, $spec)) {
                $this->selectSceneInternal($scene->id);
            }

            return;
        }
        if ($reason = LibraryAssets::refusal($asset)) {
            $this->dispatch('toast', message: $reason, type: 'warning');

            return;
        }

        $spec = $scene->config['diorama'];
        $taken = array_column($spec['items'] ?? [], 'id');
        $stem = Str::slug($asset->title, '_') ?: 'item';
        $n = 1;
        while (in_array("{$stem}_{$n}", $taken, true)) {
            $n++;
        }
        $spec['items'] = [...($spec['items'] ?? []), [
            'id' => "{$stem}_{$n}", 'label' => $asset->title, 'asset' => LibraryAssets::PREFIX.$asset->id,
            'asset_version' => 1, 'floor' => $floor, 'cell' => array_values($cell),
        ]];

        if (! $this->saveDiorama($scene, $spec)) {
            return;
        }
        $this->selectSceneInternal($scene->id);   // the stage re-mounts with the new item
    }

    /**
     * Delete a diorama item (object list × or Delete key, id `dio_<itemId>`). A floor it carries
     * goes with it, and so does everything standing on that floor: a boat takes its deck and crew.
     */
    public function removeDioramaItem(string $itemId): void
    {
        $scene = $this->dioramaScene();
        if (! $scene) {
            return;
        }
        $spec = $scene->config['diorama'];
        $gone = [$itemId];
        do {
            $before = count($gone);
            $floorsGone = array_column(array_filter($spec['floors'], fn ($f) => in_array($f['on'] ?? null, $gone, true)), 'id');
            $gone = array_values(array_unique([...$gone, ...array_column(array_filter($spec['items'] ?? [], fn ($i) => in_array($i['floor'], $floorsGone, true)), 'id')]));
        } while (count($gone) > $before);

        $spec['floors'] = array_values(array_filter($spec['floors'], fn ($f) => ! in_array($f['on'] ?? null, $gone, true)));
        $spec['items'] = array_values(array_filter($spec['items'] ?? [], fn ($i) => ! in_array($i['id'], $gone, true)));
        $spec['spots'] = array_values(array_filter($spec['spots'] ?? [], fn ($s) => in_array($s['floor'], array_column($spec['floors'], 'id'), true)));

        if ($this->saveDiorama($scene, $spec)) {
            $this->selectSceneInternal($scene->id);
        }
    }

    private function dioramaScene(): ?Scene
    {
        if (! $this->selectedSceneId) {
            return null;
        }
        $scene = $this->lesson->scenes()->find($this->selectedSceneId);

        return $scene?->isDiorama() ? $scene : null;
    }

    /** Validate the whole spec and store it; refuse with a toast when it is not valid. @param array<string, mixed> $spec */
    private function saveDiorama(Scene $scene, array $spec): bool
    {
        $errors = DioramaSpec::errors($spec);
        if ($errors !== []) {
            Log::warning('diorama edit refused', ['scene' => $scene->id, 'errors' => $errors]);
            $this->dispatch('toast', message: __('That spot is not on the floor. The move was not saved.'), type: 'warning');

            return false;
        }
        $scene->update(['config' => [...$scene->config, 'diorama' => $spec]]);

        return true;
    }
}
