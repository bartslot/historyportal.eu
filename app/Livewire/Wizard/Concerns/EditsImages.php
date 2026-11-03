<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Models\Scene;
use App\Services\Editor\EditedImages;
use Illuminate\Support\Facades\Storage;

/**
 * The image editor's saves: a double-click on a picture opens Filerobot (resources/js/editor/photo-editor.js); Save
 * stores the edited picture as a new file and points the layer at it, Reset points it back. One save is one write,
 * so one Cmd-Z, and the original file is never touched.
 *
 * A picture layer (narration scenes) keeps `original_path` beside its new `path`; a stage25d layer, ground band or
 * the sky keeps the library asset and gets `src`, which the stage draws instead (engine-mvp stage25d/stage.ts).
 */
trait EditsImages
{
    /**
     * @param  array<string,mixed>  $state  the editor's design state (crop, colour, filters, drawings)
     * @return array{ok: bool}
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

        // The file the editor's state is drawn on: the original, unless a quick mask was baked in since (a mask save
        // has no state), so reopening never drops a mask. Null: the original itself.
        $base = fn (array $row, ?string $current): ?string => match (true) {
            $state === null => null,
            isset($row['edit_state']) => $row['edit_base'] ?? null,
            default => $current,
        };

        return ['ok' => $at[0] === 'art'
            ? $this->editArtLayer($scene, $at[1], fn (array $l): array => [
                'path' => $path,
                'original_path' => $l['original_path'] ?? $l['path'] ?? null,
                'edit_state' => $state,
                'edit_base' => $base($l, isset($l['original_path']) ? ($l['path'] ?? null) : null),
            ])
            // the URL without its host, like the disk's own (APP_URL/storage): a scene keeps working on another domain
            : $this->editStageRow($scene, $at[1], fn (array $row): array => [
                'src' => parse_url(Storage::disk('public')->url($path), PHP_URL_PATH),
                'edit_state' => $state,
                'edit_base' => $base($row, $row['src'] ?? null),
            ])];
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
                ? ['path' => $l['original_path'], 'original_path' => null, 'edit_state' => null, 'edit_base' => null]
                : null);

            return;
        }
        $this->editStageRow($scene, $at[1], fn (): array => ['src' => null, 'edit_state' => null, 'edit_base' => null]);
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

    /** @param  callable(array<string,mixed>): array<string,mixed>  $fields  the row's new fields; null removes a key */
    private function editStageRow(Scene $scene, string $row, callable $fields): bool
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
        foreach ($fields($next) as $key => $value) {
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
