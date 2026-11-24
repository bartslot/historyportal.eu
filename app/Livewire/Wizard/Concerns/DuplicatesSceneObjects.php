<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Models\Scene;
use Livewire\Attributes\On;

/**
 * Duplicate (Cmd-D, the object-list icon) and paste (Cmd-C → Cmd-V, also into ANOTHER scene of
 * the same lesson) for any object-list item: `art_<id>` layers and `txt_`/`rect_` text objects.
 *
 * Every layer is keyed by `asset_id`, so a copy of an image gets a fresh synthetic id — the same
 * trick embed layers use — and remembers the real asset in `src_asset_id` for its title. The
 * image file itself is shared: a layer carries its own `path`, and no library row is cloned.
 *
 * A copy brings its timeline keys along (config.timeline tracks, re-aimed at the new id), and a
 * paste into another scene lands exactly where it was (Bart, 2026-11-24: "copy and paste in the
 * same position as the previous"). A 2.5D stage layer carries its keys on itself and pastes into
 * another 2.5D scene the same way, keys and all (they sit on the layer, already clean). One scene save, so one Cmd-Z takes the paste back.
 */
trait DuplicatesSceneObjects
{
    /** Nudge (% of the stage) so a copy in the SAME scene doesn't hide exactly under its original. */
    private const DUPLICATE_OFFSET_PCT = 3.0;

    /** A paste is one teacher gesture; anything bigger is not. */
    private const DUPLICATE_MAX_OBJECTS = 50;

    /**
     * @param  array<int, string>  $objectIds  object-list ids, e.g. ['art_12', 'txt_ab3']
     * @param  int|null  $sourceSceneId  scene they were copied from; null = the open scene
     */
    #[On('scene:duplicate-objects')]
    public function duplicateObjects(array $objectIds, ?int $sourceSceneId = null): void
    {
        if (! $this->selectedSceneId) {
            return;
        }

        // Stage25d layers copy inside a stage block: their own scene's (a duplicate) or another 2.5D scene's (a paste).
        $stageLayers = collect($objectIds)->filter(fn ($id) => is_string($id) && preg_match('/^s25_layer-\d+$/', $id) === 1)->values();
        if ($stageLayers->isNotEmpty()) {
            $indexes = $stageLayers->map(fn ($id) => (int) substr($id, 10))->all();
            $sourceSceneId === null || $sourceSceneId === $this->selectedSceneId
                ? $this->duplicateStage25dLayers($indexes)
                : $this->pasteStage25dLayers($indexes, $sourceSceneId);
            $objectIds = collect($objectIds)->reject(fn ($id) => $stageLayers->contains($id))->all();
        }

        $ids = collect($objectIds)
            ->filter(fn ($id) => is_string($id) && $id !== '' && ! str_starts_with($id, '__') && ! str_starts_with($id, 's25_'))   // the ground, sky, camera: never copied
            ->unique()->take(self::DUPLICATE_MAX_OBJECTS)->values();
        if ($ids->isEmpty()) {
            return;
        }

        // Both scenes come through the lesson relation: a paste can never read another lesson.
        $target = $this->lesson->scenes()->find($this->selectedSceneId);
        $source = $sourceSceneId === null || $sourceSceneId === $this->selectedSceneId
            ? $target
            : $this->lesson->scenes()->find($sourceSceneId);
        if (! $target || ! $source) {
            $this->dispatch('toast', message: __('That object no longer exists.'), type: 'warning');

            return;
        }

        $offset = $source->is($target) ? self::DUPLICATE_OFFSET_PCT : 0.0;
        $shots = $target->shots ?? [];
        $config = $target->config ?? [];
        $newIds = [];
        $sourceLayers = array_values($source->shots[0]['layers'] ?? []);
        $sourceTexts = array_values($source->config['texts'] ?? []);

        // Several objects keep their stacking: bottom-most first, so each lands in front of the one before.
        $stackAt = function (string $id) use ($sourceLayers, $sourceTexts): int {
            $list = preg_match('/^art_(\d+)$/', $id, $m) ? $sourceLayers : $sourceTexts;
            foreach ($list as $i => $item) {
                if (is_array($item) && (preg_match('/^art_(\d+)$/', $id, $m) ? ($item['asset_id'] ?? null) === (int) $m[1] : ($item['id'] ?? null) === $id)) {
                    return $i;
                }
            }

            return PHP_INT_MAX;
        };
        $ids = $ids->sortBy($stackAt)->values();

        foreach ($ids as $id) {
            if (preg_match('/^art_(\d+)$/', $id, $m)) {
                $layer = collect($sourceLayers)->firstWhere('asset_id', (int) $m[1]);
                if ($layer) {
                    $copy = $this->copyOfLayer($layer, $offset);
                    $shots = $this->shotsWithLayer($target, $shots, $copy, (int) $m[1]);
                    $newIds[] = 'art_'.$copy['asset_id'];
                    $config = $this->withCopiedTracks($config, $source->config ?? [], ['art', 'arw'], (string) $m[1], (string) $copy['asset_id'], $offset);
                }

                continue;
            }

            $text = collect($sourceTexts)
                ->first(fn ($t) => is_array($t) && ($t['id'] ?? null) === $id);
            if ($text) {
                $copy = $this->copyOfText($text, $offset);
                $config['texts'] = $this->listWithCopyAfter($config['texts'] ?? [], $copy, fn ($t) => is_array($t) && ($t['id'] ?? null) === $id);
                $newIds[] = $copy['id'];
                $config = $this->withCopiedTracks($config, $source->config ?? [], ['text', 'rect'], $id, $copy['id'], $offset);
            }
        }

        if ($newIds === []) {
            $this->dispatch('toast', message: __('That object no longer exists.'), type: 'warning');

            return;
        }

        $target->update(['shots' => $shots, 'config' => $config]);
        $this->selectSceneInternal($target->id);   // re-fires scene:load → canvas + object list repaint
        // The Timeline tab keeps its own copy of the tracks (timeline-panel.js): hand it the ones with the copy's keys,
        // as an undo does, or the keys only showed after a reload.
        $this->dispatch('timeline-restored', timeline: $config['timeline'] ?? [], keepSelection: true);
        $this->dispatch('scene:objects-duplicated', sceneId: $target->id, objectIds: $newIds);
    }

    /**
     * The target config with the source's timeline tracks for one object copied onto its copy: same keys, same easing,
     * aimed at the new id. A duplicate's X and Y keys move by the same nudge as the copy, so its path runs alongside the
     * original's instead of on top of it. A scene with no timeline yet takes the source's length.
     *
     * @param  array<string, mixed>  $config  the target scene's config
     * @param  array<string, mixed>  $sourceConfig
     * @param  list<string>  $kinds  the target kinds the object may be keyed under ('art' or 'arw' for a layer)
     * @return array<string, mixed>
     */
    private function withCopiedTracks(array $config, array $sourceConfig, array $kinds, string $oldId, string $newId, float $offset): array
    {
        $copies = [];
        foreach ((array) ($sourceConfig['timeline']['tracks'] ?? []) as $track) {
            if (! is_array($track) || ! is_string($track['target'] ?? null)) {
                continue;
            }
            [$kind, $id] = array_pad(explode(':', $track['target'], 2), 2, '');
            if ($id !== $oldId || ! in_array($kind, $kinds, true)) {
                continue;
            }
            $track['target'] = $kind.':'.$newId;
            if ($offset !== 0.0 && in_array($track['property'] ?? null, ['x', 'y'], true) && $kind !== 'rect') {
                $shift = fn ($v) => is_numeric($v) ? min(100.0, (float) $v + $offset) : $v;
                $track['keyframes'] = array_map(fn ($k) => is_array($k) ? ['value' => $shift($k['value'] ?? null)] + $k : $k, (array) ($track['keyframes'] ?? []));
                if (array_key_exists('base', $track)) {
                    $track['base'] = $shift($track['base']);
                }
            }
            $copies[] = $track;
        }
        if ($copies === []) {
            return $config;
        }

        $timeline = is_array($config['timeline'] ?? null) ? $config['timeline'] : [
            'duration' => (float) ($sourceConfig['timeline']['duration'] ?? 0),
            'targets' => [],
            'tracks' => [],
        ];
        $timeline['tracks'] = [...array_values((array) ($timeline['tracks'] ?? [])), ...$copies];
        $config['timeline'] = $timeline;

        return $config;
    }

    /**
     * Paste 2.5D stage layers from another 2.5D scene of this lesson: the same place, size, depth and keys. A picture from
     * another period's library would not load on this stage, so it is left out and the teacher is told.
     *
     * @param  list<int>  $indexes
     */
    private function pasteStage25dLayers(array $indexes, int $sourceSceneId): void
    {
        $target = $this->stage25dScene();
        $source = $this->lesson->scenes()->find($sourceSceneId);
        $from = $source?->isStage25d() ? ($source->config['stage25d']['set']['layers'] ?? null) : null;
        $layers = $target?->config['stage25d']['set']['layers'] ?? [];
        if (! $target || ! is_array($from) || ! is_array($layers)) {
            $this->dispatch('toast', message: __('Stage layers paste into a 3D World scene only.'), type: 'warning');

            return;
        }
        $bundle = (string) ($target->config['stage25d']['bundle'] ?? '');
        $handles = array_filter(array_column($layers, 'figure'), 'is_string');
        $first = null;
        $skipped = 0;
        sort($indexes);
        foreach (array_slice(array_unique($indexes), 0, 20) as $i) {
            if (! isset($from[$i]) || ! is_array($from[$i]) || $this->isStage25dBackdrop($source, $from[$i])) {
                continue;   // one backdrop per scene: the world is picked, not pasted
            }
            $copy = $from[$i];
            $sameLibrary = $bundle === (string) ($source->config['stage25d']['bundle'] ?? '');
            if (! $sameLibrary && is_string($copy['asset'] ?? null) && $this->stage25dAssetLayer($bundle, $copy['asset']) === null) {
                $skipped++;

                continue;
            }
            unset($copy['world']);   // the teacher placed this one here: picking another world keeps it
            // A character keeps its speaker handle when this scene doesn't have that character yet.
            if (is_string($copy['figure'] ?? null) && in_array($copy['figure'], $handles, true)) {
                unset($copy['figure']);
            }
            $layers[] = $copy;
            $first ??= count($layers) - 1;
        }
        if ($skipped > 0) {
            $this->dispatch('toast', message: __('A picture from another period\'s library was left out: it does not load on this stage.'), type: 'warning');
        }
        if ($first === null) {
            return;
        }
        $this->storeStage25dLayers($target, $layers);
        $this->selectSceneInternal($target->id);
        $this->dispatch('stage25d:select', index: $first);
    }

    private function copyOfLayer(array $layer, float $offset): array
    {
        $copy = array_merge($layer, [
            'asset_id' => random_int(1_000_000_001, 1_999_999_999),
            // Embeds are synthetic already and have no asset to point back at.
            'src_asset_id' => isset($layer['embed']) ? null : ($layer['src_asset_id'] ?? $layer['asset_id']),
        ]);

        return $this->nudged($copy, $offset);
    }

    private function copyOfText(array $text, float $offset): array
    {
        $prefix = ($text['kind'] ?? null) === 'rect' ? 'rect_' : 'txt_';

        return $this->nudged(array_merge($text, ['id' => uniqid($prefix)]), $offset);
    }

    /** Screen-positioned objects shift by $offset; map-pinned ones stay on their place. */
    private function nudged(array $object, float $offset): array
    {
        if ($offset === 0.0 || ($object['anchor'] ?? null) === 'map') {
            return $object;
        }
        foreach (['x', 'y'] as $axis) {
            if (isset($object[$axis]) && is_numeric($object[$axis])) {
                $object[$axis] = min(100.0, (float) $object[$axis] + $offset);
            }
        }

        return $object;
    }

    /**
     * Put the layer into every shot, just in front of its original when that shot has it (a
     * duplicate), otherwise on top (a paste from another scene). A scene with no shots yet gets
     * one, built the way attachArtwork builds it.
     */
    private function shotsWithLayer(Scene $scene, array $shots, array $layer, int $originalId): array
    {
        if ($shots === []) {
            return [$scene->image_path
                ? ['order' => 0, 'image_path' => $scene->image_path, 'layers' => [
                    ['path' => $scene->image_path, 'kind' => 'cover', 'depth' => 0.4],
                    $layer,
                ]]
                : ['order' => 0, 'layers' => [$layer]]];
        }

        return collect($shots)->map(function (array $shot) use ($layer, $originalId): array {
            $layers = $shot['layers'] ?? [];
            if ($layers === [] && ! empty($shot['image_path']) && empty($shot['bg_path'])) {
                $layers[] = ['path' => $shot['image_path'], 'kind' => 'cover', 'depth' => 0.4];
            }

            return array_merge($shot, [
                'layers' => $this->listWithCopyAfter($layers, $layer, fn ($l) => ($l['asset_id'] ?? null) === $originalId),
            ]);
        })->all();
    }

    /** $list with $copy inserted right after the first item matching $isOriginal, else appended. */
    private function listWithCopyAfter(array $list, array $copy, callable $isOriginal): array
    {
        $list = array_values($list);
        foreach ($list as $i => $item) {
            if ($isOriginal($item)) {
                return [...array_slice($list, 0, $i + 1), $copy, ...array_slice($list, $i + 1)];
            }
        }

        return [...$list, $copy];
    }
}
