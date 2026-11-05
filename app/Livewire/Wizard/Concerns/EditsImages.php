<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Models\Scene;
use App\Services\Editor\Cutouts;
use App\Services\Editor\EditedImages;
use App\Services\Stage25d\LibraryBundle;
use Illuminate\Support\Facades\Storage;
use Livewire\Attributes\Renderless;

/**
 * Uitknippen's save (saveCutout: a part of a picture as the teacher's own asset), and the saves of the image editor
 * that came before it (Filerobot, removed 2026-11-04; layers it edited still draw their copy). saveEditedImage: Save
 * stores the edited picture as a new file and points the layer at it, Reset points it back. One save is one write,
 * so one Cmd-Z, and the original file is never touched.
 *
 * A picture layer (narration scenes) keeps `original_path` beside its new `path`; a stage25d layer, ground band or
 * the sky keeps the library asset and gets `src`, which the stage draws instead (engine-mvp stage25d/stage.ts).
 */
trait EditsImages
{
    /**
     * Uitknippen: the quick mask's selection saved as the teacher's own asset (Cutouts). `$from` = what it was cut
     * from (a stage25d `bundle` + `asset`, the cut's `box_h` of the picture's `height` px), for its size in 3D.
     *
     * @param  array<string,mixed>  $from
     * @return array{ok: bool, id?: int}
     */
    #[Renderless] // the picture is untouched, and a render would pull the inspector off the selected layer
    public function saveCutout(string $image, string $title = '', array $from = []): array
    {
        $asset = Cutouts::save(auth()->user(), $image, $title, $from);
        if ($asset === null) {
            return ['ok' => false];
        }
        // the Assets panels follow: the icon panel opens its "My cut-outs" tab, the 3D library takes the new row
        $this->dispatch('cutouts-changed', id: $asset->id, stage: Cutouts::stageRow($asset));
        $this->dispatch('toast', type: 'success', message: __('Saved in My cut-outs.'));

        return ['ok' => true, 'id' => $asset->id];
    }

    /**
     * @param  array<string,mixed>  $state  the editor's design state (crop, colour, filters, drawings)
     * @return array{ok: bool, url?: string} url: the new file, so the editor can have it in cache before it lifts
     */
    public function saveEditedImage(string $target, string $image, array $state = []): array
    {
        $at = EditedImages::target($target);
        $scene = $this->selectedSceneId ? $this->lesson->scenes()->find($this->selectedSceneId) : null;
        if ($at === null || $scene === null) {
            return ['ok' => false];
        }
        $path = EditedImages::store($this->lesson, $image);
        if ($path === null) {
            return ['ok' => false];
        }
        $state = EditedImages::state($state);

        $saved = $at[0] === 'art'
            ? $this->editArtLayer($scene, $at[1], fn (array $l): array => [
                'path' => $path,
                'original_path' => $l['original_path'] ?? $l['path'] ?? null,
                'edit_state' => $state,
            ])
            // the URL without its host, like the disk's own (APP_URL/storage): a scene keeps working on another domain
            : $this->editStageRow($scene, $at[1], ['src' => parse_url(Storage::disk('public')->url($path), PHP_URL_PATH), 'edit_state' => $state]);
        if ($saved) {
            $this->dispatch('toast', type: 'success', message: __('Saved.'));
        }

        return $saved ? ['ok' => true, 'url' => parse_url(Storage::disk('public')->url($path), PHP_URL_PATH)] : ['ok' => false];
    }

    /**
     * The picture as it was before any editing, for Bring back on a picture reopened after a save: the file it opens
     * on has lost those pixels. Null: nothing is known (a cut-out's own file), Bring back then goes back to what it opened on.
     */
    #[Renderless]
    public function originalOfEdited(string $target): ?string
    {
        $at = EditedImages::target($target);
        $scene = $this->selectedSceneId ? $this->lesson->scenes()->find($this->selectedSceneId) : null;
        if ($at === null || $scene === null) {
            return null;
        }
        $path = $at[0] === 'art' ? $this->artOriginalPath($scene, $at[1]) : $this->stageRowOriginalPath($scene, $at[1]);

        return $path === null ? null : parse_url(Storage::disk('public')->url($path), PHP_URL_PATH);
    }

    private function artOriginalPath(Scene $scene, int $assetId): ?string
    {
        foreach ($scene->shots ?? [] as $shot) {
            foreach ($shot['layers'] ?? [] as $layer) {
                if (($layer['asset_id'] ?? null) === $assetId) {
                    return $layer['original_path'] ?? null;
                }
            }
        }

        return null;
    }

    private function stageRowOriginalPath(Scene $scene, string $row): ?string
    {
        $stage = $scene->config['stage25d'] ?? [];
        $set = $stage['set'] ?? [];
        $asset = match (true) {
            $row === 'sky' => $set['sky'] ?? null,
            str_starts_with($row, 'band-') => $set['groundBands'][(int) substr($row, 5)]['asset'] ?? null,
            default => $set['layers'][(int) substr($row, 6)]['asset'] ?? null,
        };

        return is_string($asset) && isset($stage['bundle']) ? LibraryBundle::assetPath($stage['bundle'], $asset) : null;
    }

    /** Back to the picture as it was before the editor touched it. */
    public function resetEditedImage(string $target): void
    {
        $at = EditedImages::target($target);
        $scene = $this->selectedSceneId ? $this->lesson->scenes()->find($this->selectedSceneId) : null;
        if ($at === null || $scene === null) {
            return;
        }
        if ($at[0] === 'art') {
            $this->editArtLayer($scene, $at[1], fn (array $l): ?array => isset($l['original_path'])
                ? ['path' => $l['original_path'], 'original_path' => null, 'edit_state' => null]
                : null);

            return;
        }
        $this->editStageRow($scene, $at[1], ['src' => null, 'edit_state' => null]);
    }

    /** @param  callable(array<string,mixed>): ?array<string,mixed>  $fields  the layer's new fields, null: leave it */
    private function editArtLayer(Scene $scene, int $assetId, callable $fields): bool
    {
        foreach ($scene->shots ?? [] as $shot) {
            foreach ($shot['layers'] ?? [] as $layer) {
                if (($layer['asset_id'] ?? null) === $assetId) {
                    $change = $fields($layer);
                    if ($change === null) {
                        return false;
                    }
                    $this->writeLayerFields($assetId, $change);

                    return true;
                }
            }
        }

        return false;
    }

    /** @param  array<string,mixed>  $fields  null removes a key */
    private function editStageRow(Scene $scene, string $row, array $fields): bool
    {
        if (! $scene->isStage25d()) {
            return false;
        }
        $path = match (true) {
            $row === 'sky' => ['skyLayer'],
            str_starts_with($row, 'band-') => ['groundBands', (int) substr($row, 5)],
            default => ['layers', (int) substr($row, 6)],
        };
        $set = $scene->config['stage25d']['set'] ?? [];
        $current = data_get($set, $path);
        if ($row === 'sky' ? empty($set['sky']) : ! is_array($current)) {
            return false;
        }
        $next = (array) $current;
        foreach ($fields as $key => $value) {
            if ($value === null) {
                unset($next[$key]);
            } else {
                $next[$key] = $value;
            }
        }
        $this->storeStage25dSetPart($scene, $path, $next);
        $this->selectSceneInternal($scene->id);   // the stage rebuilds with the other picture

        return true;
    }
}
