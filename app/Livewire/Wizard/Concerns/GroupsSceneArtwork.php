<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Models\Scene;
use App\Services\Editor\ArtworkGroups;
use Livewire\Attributes\On;

/**
 * Group the pictures of a flat scene (Bart 2026-11-28, as in Photoshop): the layer menu's Group (Cmd-G) makes one group
 * of the pictures picked, with its own place, size, turn and fade about a pivot (ArtworkGroups, art-groups.js), and
 * keys of its own on the timeline. Ungroup takes it apart, each picture staying where the group put it. One scene save
 * each, so one Cmd-Z takes it back. A picture's own pivot is saved here too.
 */
trait GroupsSceneArtwork
{
    /** The stage shape the editor measured (width / height), held to something sane. */
    private static function stageAspect(mixed $aspect): float
    {
        return is_numeric($aspect) && (float) $aspect > 0 ? max(0.2, min(5.0, (float) $aspect)) : ArtworkGroups::ASPECT;
    }

    /**
     * @param  list<int>  $assetIds  the pictures to group
     * @param  float  $pivotX  the middle of them on the stage, % (the editor measures their boxes)
     */
    public function groupArtworkLayers(array $assetIds, float $pivotX = 50.0, float $pivotY = 50.0, mixed $aspect = null): void
    {
        $scene = $this->groupScene();
        if (! $scene) {
            return;
        }
        $ids = array_values(array_unique(array_map('intval', $assetIds)));
        $made = null;
        $shots = collect($scene->shots ?? [])->map(function (array $shot, int $i) use ($scene, $ids, $pivotX, $pivotY, $aspect, &$made): array {
            if (! $this->editsShot($scene, $i)) {
                return $shot;
            }
            [$shot, $id] = ArtworkGroups::group($shot, $ids, $pivotX, $pivotY, self::stageAspect($aspect));
            $made ??= $id;

            return $shot;
        })->all();
        if ($made === null) {
            return;
        }
        $scene->update(['shots' => $shots]);
        $this->selectSceneInternal($scene->id);
        // The new group is the selection: its box on the canvas, its panel open.
        $this->dispatch('artwork:select-group', id: 'grp_'.$made);
        $this->selectInspectorTarget('grp_'.$made);
    }

    /** Take a group apart: its pictures stand on their own where it put them, and its keys go with it. */
    public function ungroupArtwork(string $groupId, mixed $aspect = null): void
    {
        $scene = $this->groupScene();
        if (! $scene || ! $this->sceneHasGroup($scene, $groupId)) {
            return;
        }
        $shots = collect($scene->shots ?? [])->map(fn (array $shot, int $i): array => $this->editsShot($scene, $i)
            ? ArtworkGroups::ungroup($shot, $groupId, self::stageAspect($aspect)) : $shot)->all();
        $config = ArtworkGroups::dropTracks((array) ($scene->config ?? []), $groupId);
        $scene->update(['shots' => $shots, 'config' => $config]);
        if ($this->selectedScene !== null) {
            $this->selectedScene['config'] = $config;
        }
        $this->activeArtGroupId = null;
        $this->selectSceneInternal($scene->id);
    }

    /** Delete a group with every picture in it (Photoshop's Delete on a group). */
    public function removeArtworkGroup(string $groupId): void
    {
        $scene = $this->groupScene();
        if (! $scene || ! $this->sceneHasGroup($scene, $groupId)) {
            return;
        }
        $shots = collect($scene->shots ?? [])->map(function (array $shot, int $i) use ($scene, $groupId): array {
            if (! $this->editsShot($scene, $i)) {
                return $shot;
            }
            $shot['layers'] = array_values(array_filter((array) ($shot['layers'] ?? []), fn ($l) => ! is_array($l) || ($l['group'] ?? null) !== $groupId));
            if ($shot['layers'] === [] || (count($shot['layers']) === 1 && ($shot['layers'][0]['asset_id'] ?? null) === null)) {
                unset($shot['layers']);
            }

            return ArtworkGroups::prune($shot);
        })->all();
        $config = ArtworkGroups::dropTracks((array) ($scene->config ?? []), $groupId);
        $scene->update(['shots' => $shots, 'config' => $config]);
        if ($this->selectedScene !== null) {
            $this->selectedScene['config'] = $config;
        }
        $this->activeArtGroupId = null;
        $this->selectSceneInternal($scene->id);
    }

    /** One of a group's values from its panel: x, y, scale, rotation, opacity, pivot_x, pivot_y or name. */
    public function updateArtworkGroup(string $groupId, string $field, mixed $value): void
    {
        if (! in_array($field, [...array_keys(ArtworkGroups::LIMITS), 'name'], true)) {
            return;
        }
        $this->saveArtworkGroup($groupId, [$field => $value], quiet: false);
    }

    /**
     * The canvas let go of a group (a drag, a turn, a size, its pivot): its values in one save. Like moveArtworkLayer it
     * does not re-dispatch scene:load: the canvas shows it already.
     *
     * @param  array<string,mixed>  $values
     */
    #[On('artwork:group')]
    public function moveArtworkGroup(string $groupId, array $values): void
    {
        $this->saveArtworkGroup($groupId, array_intersect_key($values, ArtworkGroups::LIMITS), quiet: true);
    }

    /**
     * A picture's pivot moved (the panel's presets): the point and the middle that keeps the picture where it is, in one
     * save. The canvas drag saves through moveArtworkLayer.
     */
    public function setArtworkPivot(int $assetId, float $pivotX, float $pivotY, float $x, float $y): void
    {
        [$min, $max] = ArtworkGroups::PIVOT;
        $this->writeLayerFields($assetId, [
            'pivot_x' => round(max($min, min($max, $pivotX)), 3),
            'pivot_y' => round(max($min, min($max, $pivotY)), 3),
            'x' => round(max(-50.0, min(150.0, $x)), 2),
            'y' => round(max(-50.0, min(150.0, $y)), 2),
        ]);
    }

    /** @param  array<string,mixed>  $patch */
    private function saveArtworkGroup(string $groupId, array $patch, bool $quiet): void
    {
        $scene = $this->groupScene();
        if (! $scene || $patch === [] || ! $this->sceneHasGroup($scene, $groupId)) {
            return;
        }
        $shots = collect($scene->shots ?? [])->map(fn (array $shot, int $i): array => $this->editsShot($scene, $i)
            ? ArtworkGroups::patch($shot, $groupId, $patch) : $shot)->all();
        $scene->update(['shots' => $shots]);   // unchanged values are a clean model: no save
        if ($quiet) {
            unset($this->sceneArtworkLayers);

            return;
        }
        $this->selectSceneInternal($scene->id);
    }

    private function groupScene(): ?Scene
    {
        if (! $this->selectedSceneId) {
            return null;
        }
        $scene = $this->lesson->scenes()->find($this->selectedSceneId);

        return $scene && ! empty($scene->shots) ? $scene : null;
    }

    private function sceneHasGroup(Scene $scene, string $groupId): bool
    {
        foreach ((array) ($scene->shots ?? []) as $i => $shot) {
            if (is_array($shot) && $this->editsShot($scene, (int) $i) && ArtworkGroups::find($shot, $groupId) !== null) {
                return true;
            }
        }

        return false;
    }

    /** The groups of the shot being edited, with the pictures in each (the group panel and the layer list read them). */
    public function artGroupsOfScene(): array
    {
        $scene = $this->groupScene();
        $shot = $scene ? (($scene->shots ?? [])[$this->editedPanel($scene) ?? 0] ?? []) : [];

        return ArtworkGroups::payload(ArtworkGroups::of(is_array($shot) ? $shot : [])) ?? [];
    }
}
