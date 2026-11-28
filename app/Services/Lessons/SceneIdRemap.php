<?php

declare(strict_types=1);

namespace App\Services\Lessons;

/**
 * The places a lesson names its own scenes by id, moved onto other ids: a copied lesson's new scenes
 * (LessonCopier), or the same lesson on another machine (App\Services\OfflineSync), where every scene has
 * a different id. One list of those places, so a new one is added once.
 *
 * - scene config.links[].to: the scene a choice jumps to (SceneLinks)
 * - lesson story_map: where each scene and its choices sit on the story map, both ways the map runs
 *
 * An id with no counterpart is dropped: a link to it is left for the teacher to pick again (`to` null),
 * a map position is forgotten.
 */
final class SceneIdRemap
{
    /**
     * @param  array<string, mixed>|null  $config
     * @param  array<int, int>  $ids  old scene id => new scene id
     * @return array<string, mixed>|null
     */
    public static function config(?array $config, array $ids): ?array
    {
        $links = ($config ?? [])['links'] ?? null;
        if (! is_array($links) || $links === []) {
            return $config;
        }

        return ['links' => array_map(
            fn ($l) => is_array($l) ? ['to' => $ids[(int) ($l['to'] ?? 0)] ?? null] + $l : $l,
            $links,
        )] + $config;
    }

    /**
     * @param  array<string, mixed>|null  $storyMap
     * @param  array<int, int>  $ids  old scene id => new scene id
     * @return array<string, mixed>|null
     */
    public static function storyMap(?array $storyMap, array $ids): ?array
    {
        if (! is_array($storyMap)) {
            return null;
        }
        $remap = function (array $layout) use ($ids): array {
            $map = [];
            foreach (['scenes', 'choices'] as $group) {
                foreach ((array) ($layout[$group] ?? []) as $id => $point) {
                    if (isset($ids[(int) $id])) {
                        $map[$group][(string) $ids[(int) $id]] = $point;
                    }
                }
            }

            return $map;
        };
        // Both ways the map runs: left to right at the top level, top to bottom under 'tb'.
        $map = $remap($storyMap);
        if (is_array($storyMap['tb'] ?? null) && ($tb = $remap($storyMap['tb'])) !== []) {
            $map['tb'] = $tb;
        }

        return $map === [] ? null : $map;
    }
}
