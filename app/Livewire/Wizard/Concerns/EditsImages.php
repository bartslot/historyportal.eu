<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Models\Scene;
use App\Models\SvgAsset;
use App\Services\Editor\Cutouts;
use App\Services\Editor\EditedImages;
use App\Services\Editor\SceneHistory;
use App\Services\Stage25d\LayerKeys;
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
        $asset = $this->storeCutout($image, $title, $from);
        if ($asset === null) {
            return ['ok' => false];
        }
        $this->dispatch('toast', type: 'success', message: __('Saved in My cut-outs.'));

        return ['ok' => true, 'id' => $asset->id];
    }

    /** @param  array<string,mixed>  $from */
    private function storeCutout(string $image, string $title, array $from): ?SvgAsset
    {
        $asset = Cutouts::save(auth()->user(), $image, $title, $from);
        // the Assets panels follow: the icon panel opens its "My cut-outs" tab, the 3D library takes the new row
        if ($asset !== null) {
            $this->dispatch('cutouts-changed', id: $asset->id, stage: Cutouts::stageRow($asset));
        }

        return $asset;
    }

    /**
     * Make a layer (Bart 11-19: "from 1 image, slightly animate the boats"): the selection saved as the teacher's cut-out
     * (saveCutout's own save), and added to the open stage25d scene as a new layer over the row it was cut from ('sky' or
     * 'layer-3'), at the place the stage worked out (scene/stage25d/cut-layer.js: x, y, z, depth, rotation and its height
     * in metres, which becomes Size here against the cut-out's own metres). `$filled`: that row's picture with the hole
     * painted (Fill behind), a new file the row draws instead; its original stays, so Back to the original still works.
     * One scene write: one Cmd-Z takes it all back.
     *
     * @param  array<string,mixed>  $from
     * @param  array<string,mixed>  $at
     * @return array{ok: bool, id?: int, index?: int, url?: string}
     */
    public function makeCutoutLayer(string $image, string $title, array $from, int $sceneId, string $row, array $at, ?string $filled = null): array
    {
        $scene = $this->stage25dScene();
        $set = $scene?->config['stage25d']['set'] ?? [];
        $source = $row === 'sky' ? (empty($set['sky']) ? null : (array) ($set['skyLayer'] ?? [])) : ($set['layers'][preg_match('/^layer-(\d+)$/', $row, $m) === 1 ? (int) $m[1] : -1] ?? null);
        $height = is_numeric($at['height_m'] ?? null) ? (float) $at['height_m'] : 0.0;
        if ($scene?->id !== $sceneId || ! is_array($source) || $height <= 0) {
            return ['ok' => false];
        }
        $picture = $filled !== null ? EditedImages::store($this->lesson, $filled) : null;
        if ($filled !== null && $picture === null) {
            return ['ok' => false];
        }
        $asset = $this->storeCutout($image, $title, $from);
        if ($asset === null) {
            return ['ok' => false];
        }
        $layers = $set['layers'] ?? [];
        $layers[] = self::layerOverCut('cut-'.$asset->id, $at, $height / ($asset->height_m ?: Cutouts::DEFAULT_HEIGHT_M), $row === 'sky' ? 'sky' : (string) ($source['depth'] ?? 'mid'));
        $config = $scene->config;
        $config['stage25d']['set']['layers'] = array_values($layers);
        if ($picture !== null) {
            $src = parse_url(Storage::disk('public')->url($picture), PHP_URL_PATH);
            // the edit_state stays: the filled copy has the very pixels (and crop) of the picture it was opened on
            $rowPath = $row === 'sky' ? ['stage25d', 'set', 'skyLayer'] : ['stage25d', 'set', 'layers', (int) $m[1]];
            data_set($config, [...$rowPath, 'src'], $src);
            // and keeps what the stage measured on it before: where its land starts (the horizon, 'auto', and the whole
            // set with it) and its line weight (every line of it), so filling one spot changes nothing else on screen
            foreach (['land_top', 'ink_level'] as $key) {
                if (is_numeric($at[$key] ?? null) && $at[$key] >= 0 && $at[$key] <= 1) {
                    data_set($config, [...$rowPath, $key], (float) $at[$key]);
                }
            }
        }
        SceneHistory::startStep();   // its own undo step, whatever came just before
        $this->storeStage25dConfig($scene, $config);
        $this->selectSceneInternal($scene->id);   // the stage builds again: the new layer, the filled picture
        $index = count($layers) - 1;
        $this->selectInspectorTarget('s25_layer-'.$index);
        $this->dispatch('toast', type: 'success', message: __('Made a layer. It is in My cut-outs too.'));

        return ['ok' => true, 'id' => $asset->id, 'index' => $index, ...(isset($src) ? ['url' => $src] : [])];
    }

    /**
     * The new layer's values: the placement held to the ranges every layer has (LayerKeys), Size from the height.
     *
     * @param  array<string,mixed>  $at
     * @return array<string,mixed>
     */
    private static function layerOverCut(string $asset, array $at, float $scale, string $sourceDepth): array
    {
        $depth = in_array($at['depth'] ?? null, ['sky', 'bg', 'mid', 'fg', 'near'], true) ? $at['depth'] : $sourceDepth;
        $values = LayerKeys::clean(['x' => $at['x'] ?? null, 'y' => $at['y'] ?? null, 'z' => $at['z'] ?? null, 'rotation' => $at['rotation'] ?? null, 'scale' => $scale]);
        if (($values['rotation'] ?? null) === 0.0) {
            unset($values['rotation']);
        }

        // drawn as part of the picture it came from: that picture's line weight, no shadow of its own (it has one already)
        $ink = is_numeric($at['ink_level'] ?? null) ? max(0.0, min(1.0, (float) $at['ink_level'])) : null;

        return ['asset' => $asset, 'depth' => $depth, ...$values, 'shadow' => 0, ...($ink !== null ? ['ink_level' => $ink] : [])];
    }

    /** A cut-out off the 3D shelf; scenes that use it keep showing it. */
    #[Renderless]
    public function removeCutout(int $id): void
    {
        if (Cutouts::remove(auth()->user(), $id)) {
            $this->dispatch('cutouts-changed', id: $id, removed: 'cut-'.$id);
            $this->dispatch('toast', type: 'success', message: __('Removed from My cut-outs.'));
        }
    }

    /**
     * @param  array<string,mixed>  $state  the editor's design state (crop, colour, filters, drawings)
     * @return array{ok: bool, url?: string} url: the new file, so the editor can have it in cache before it lifts
     */
    public function saveEditedImage(string $target, string $image, array $state = [], ?int $sceneId = null): array
    {
        return $this->applyEditedImage($this->editedScene($sceneId), $target, $image, $state);
    }

    /**
     * The scene the picture editor opened on (`$sceneId`), not whichever scene is selected by the time it saves: the
     * selection follows the URL, so a Back swipe or a scene click while the editor was open sent a figure's save from
     * the ship onto the axe row of the next scene (Bart 11-19). Without an id (an older page), the selected scene.
     */
    private function editedScene(?int $sceneId): ?Scene
    {
        $id = $sceneId ?? $this->selectedSceneId;

        return $id ? $this->lesson->scenes()->find($id) : null;
    }

    /**
     * @param  array<string,mixed>  $state
     * @return array{ok: bool, url?: string}
     */
    private function applyEditedImage(?Scene $scene, string $target, string $image, array $state = []): array
    {
        $at = EditedImages::target($target);
        // a 2D picture layer is written through the selection (writeLayerFields): another scene's save would land there
        if ($at === null || $scene === null || ($at[0] === 'art' && $scene->id !== (int) $this->selectedSceneId)) {
            return ['ok' => false];
        }
        if (($cut = $this->ownCutoutOfRow($scene, $at)) !== null) {
            return $this->applyEditedCutout($scene, $at[1], $cut, $image);
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
     * The cut-out id of a 3D layer that shows one of this teacher's own cut-outs, or null.
     *
     * @param  array{0: string, 1: string|int}  $at
     */
    private function ownCutoutOfRow(Scene $scene, array $at): ?int
    {
        if ($at[0] === 'art' || ! str_starts_with((string) $at[1], 'layer-')) {
            return null;
        }
        $asset = $scene->config['stage25d']['set']['layers'][(int) substr((string) $at[1], 6)]['asset'] ?? null;

        return is_string($asset) && Cutouts::layerOf($asset, (int) auth()->id()) !== null ? Cutouts::idOf($asset) : null;
    }

    /** @return array{ok: bool, url?: string} the cut-out itself takes the picture; the scene's own copy, if any, goes */
    private function applyEditedCutout(Scene $scene, string $row, int $id, string $image): array
    {
        $asset = Cutouts::replace(auth()->user(), $id, $image);
        if ($asset === null) {
            return ['ok' => false];
        }
        $this->dispatch('cutouts-changed', id: $asset->id, stage: Cutouts::stageRow($asset));
        $this->editStageRow($scene, $row, ['src' => null, 'edit_state' => null, 'original_src' => null]);
        $this->dispatch('toast', type: 'success', message: __('Saved in My cut-outs.'));

        return ['ok' => true, 'url' => parse_url(Storage::disk('public')->url($asset->svg_path), PHP_URL_PATH)];
    }

    /**
     * The picture as it was before any editing, for Bring back on a picture reopened after a save: the file it opens
     * on has lost those pixels. Null: nothing is known (a cut-out's own file), Bring back then goes back to what it opened on.
     */
    #[Renderless]
    public function originalOfEdited(string $target, ?int $sceneId = null): ?string
    {
        $at = EditedImages::target($target);
        $scene = $this->editedScene($sceneId);
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
    public function resetEditedImage(string $target, ?int $sceneId = null): void
    {
        $at = EditedImages::target($target);
        $scene = $this->editedScene($sceneId);
        if ($at === null || $scene === null || ($at[0] === 'art' && $scene->id !== (int) $this->selectedSceneId)) {
            return;   // a 2D layer is written through the selection (applyEditedImage)
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
        if ((int) $this->selectedSceneId === $scene->id) {
            $this->selectSceneInternal($scene->id);   // the stage rebuilds with the other picture
        }

        return true;
    }
}
