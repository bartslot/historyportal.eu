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

        $ids = collect($objectIds)
            ->filter(fn ($id) => is_string($id) && $id !== '' && ! str_starts_with($id, '__'))
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

        foreach ($ids as $id) {
            if (preg_match('/^art_(\d+)$/', $id, $m)) {
                $layer = collect($source->shots[0]['layers'] ?? [])->firstWhere('asset_id', (int) $m[1]);
                if ($layer) {
                    $copy = $this->copyOfLayer($layer, $offset);
                    $shots = $this->shotsWithLayer($target, $shots, $copy, (int) $m[1]);
                    $newIds[] = 'art_'.$copy['asset_id'];
                }

                continue;
            }

            $text = collect($source->config['texts'] ?? [])
                ->first(fn ($t) => is_array($t) && ($t['id'] ?? null) === $id);
            if ($text) {
                $copy = $this->copyOfText($text, $offset);
                $config['texts'] = $this->listWithCopyAfter($config['texts'] ?? [], $copy, fn ($t) => is_array($t) && ($t['id'] ?? null) === $id);
                $newIds[] = $copy['id'];
            }
        }

        if ($newIds === []) {
            $this->dispatch('toast', message: __('That object no longer exists.'), type: 'warning');

            return;
        }

        $target->update(['shots' => $shots, 'config' => $config]);
        $this->selectSceneInternal($target->id);   // re-fires scene:load → canvas + object list repaint
        $this->dispatch('scene:objects-duplicated', sceneId: $target->id, objectIds: $newIds);
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
