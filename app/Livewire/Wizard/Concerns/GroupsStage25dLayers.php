<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Services\Stage25d\LayerGroups;
use App\Services\Stage25d\LayerKeys;

/**
 * Group and ungroup layers of a 2.5D stage scene (Bart 2026-11-25, as in Photoshop): the layer menu's Group makes one
 * group of the layers picked, with its own place, size, turn, fade and keys (its row in the layer list and the
 * timeline, its box on the canvas); Ungroup takes it apart, each layer staying where the group put it. One scene save
 * each, so one Cmd-Z takes it back. The values of a group are saved through saveStage25dLayer (`group` patch).
 */
trait GroupsStage25dLayers
{
    /** @param  list<int>  $indexes  the layers to group (config.stage25d.set.layers) */
    public function groupStage25dLayers(array $indexes): void
    {
        $scene = $this->stage25dScene();
        $set = $scene?->config['stage25d']['set'] ?? null;
        if (! $scene || ! is_array($set['layers'] ?? null)) {
            return;
        }
        $layers = $set['layers'];
        $picked = array_values(array_filter(array_unique(array_map('intval', $indexes)),
            fn (int $i) => is_array($layers[$i] ?? null) && ! $this->isStage25dBackdrop($scene, $layers[$i])));
        if ($picked === []) {
            return;
        }
        $groups = array_values(array_filter((array) ($set['groups'] ?? []), 'is_array'));
        // a layer that is in a group already leaves it where that group put it
        $byId = array_column($groups, null, 'id');
        foreach ($picked as $i) {
            if (is_string($layers[$i]['group'] ?? null) && isset($byId[$layers[$i]['group']])) {
                $layers[$i] = LayerGroups::release($layers[$i], $byId[$layers[$i]['group']]);
            }
        }
        $group = LayerGroups::make(array_map(fn (int $i) => $layers[$i], $picked), $groups);
        foreach ($picked as $i) {
            $layers[$i]['group'] = $group['id'];
        }
        $config = $scene->config;
        $config['stage25d']['set'] = LayerGroups::prune([...$set, 'layers' => $layers, 'groups' => [...$groups, $group]]);
        $this->storeStage25dConfig($scene, $config);
        $this->selectSceneInternal($scene->id);
        $this->dispatch('stage25d:select', id: 'group-'.$group['id']);   // the new group is the selection: its panel opens
        $this->selectInspectorTarget('s25_group-'.$group['id']);
    }

    /** Take a group apart: its layers stand on their own where the group put them, and the group's row goes. */
    public function ungroupStage25d(string $groupId): void
    {
        $scene = $this->stage25dScene();
        $set = $scene?->config['stage25d']['set'] ?? null;
        $group = collect((array) ($set['groups'] ?? []))->first(fn ($g) => is_array($g) && ($g['id'] ?? null) === $groupId);
        if (! $scene || ! is_array($group)) {
            return;
        }
        $set['layers'] = array_map(fn ($l) => is_array($l) && ($l['group'] ?? null) === $groupId ? LayerGroups::release($l, $group) : $l, $set['layers'] ?? []);
        $config = $scene->config;
        $config['stage25d']['set'] = LayerGroups::prune($set);
        $this->storeStage25dConfig($scene, $config);
        $this->activeStage25dLayer = null;
        $this->selectSceneInternal($scene->id);
        $this->dispatch('stage25d:deselect');
    }

    /** Delete a group with every layer in it (Photoshop's Delete on a group). */
    public function removeStage25dGroup(string $groupId): void
    {
        $scene = $this->stage25dScene();
        $set = $scene?->config['stage25d']['set'] ?? null;
        if (! $scene || ! is_array($set['layers'] ?? null)) {
            return;
        }
        $kept = array_values(array_filter($set['layers'], fn ($l) => ! is_array($l) || ($l['group'] ?? null) !== $groupId));
        if (count($kept) === count($set['layers'])) {
            return;
        }
        $config = $scene->config;
        $config['stage25d']['set'] = LayerGroups::prune([...$set, 'layers' => $kept]);
        $this->storeStage25dConfig($scene, $config);
        $this->activeStage25dLayer = null;
        $this->selectSceneInternal($scene->id);
        $this->dispatch('stage25d:deselect');
    }

    /**
     * A group's own values from its panel, the canvas or the timeline: place, size, turn, fade, its name, its keys.
     *
     * @param  array<string,mixed>  $patch  `{id, x?, z?, y?, scale?, rotation?, opacity?, name?, keys?}`
     */
    private function saveStage25dGroup(\App\Models\Scene $scene, array $patch): void
    {
        $groups = array_values(array_filter((array) ($scene->config['stage25d']['set']['groups'] ?? []), 'is_array'));
        $at = array_search($patch['id'] ?? null, array_column($groups, 'id'), true);
        if ($at === false) {
            return;
        }
        $group = [...$groups[$at], ...array_intersect_key(LayerKeys::clean($patch), array_flip(LayerGroups::FIELDS))];
        if (is_string($patch['name'] ?? null)) {
            $name = mb_substr(trim(strip_tags($patch['name'])), 0, 40);
            if ($name === '') {
                unset($group['name']);
            } else {
                $group['name'] = $name;
            }
        }
        if (is_array($patch['keys'] ?? null)) {
            $keys = LayerKeys::sanitize($patch['keys'], max((float) ($scene->config['stage25d']['dur_s'] ?? 0), (float) $scene->duration_seconds));
            if ($keys === []) {
                unset($group['keys']);
            } else {
                $group['keys'] = $keys;
            }
        }
        $groups[$at] = $group;
        $this->storeStage25dSetPart($scene, ['groups'], $groups);
        $this->skipQuietRender();   // the stage shows it already (isQuietCall)
        $this->renderedFingerprint = $this->lessonFingerprint();
    }
}
