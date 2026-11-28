<?php

declare(strict_types=1);

namespace App\Services\Editor;

use App\Services\SceneArrow;

/**
 * Groups of pictures on a flat scene (Bart 2026-11-28: "I want to move a group and animate the group. I also would like
 * to set pivot points."), the flat twin of the 2.5D stage's groups (App\Services\Stage25d\LayerGroups).
 *
 * A group lives on its shot (`shot.groups[]`), a picture layer joins with `group: <id>`. The group is a parent
 * transform over its layers: how far it moved from where it was made (x, y in % of the stage), its size and turn about
 * its pivot (pivot_x, pivot_y in % of the stage), its fade. resources/js/scene/art-groups.js draws it; the maths here
 * is the same, for taking a group apart where it stands.
 *
 *   {id: 'g1', name?, x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, pivot_x, pivot_y}
 *
 * Its keys are timeline tracks on target `grp:<id>` (config.timeline), like any picture's.
 */
final class ArtworkGroups
{
    /** The values a group stores, each with its limits. */
    public const LIMITS = [
        'x' => [-200.0, 200.0],
        'y' => [-200.0, 200.0],
        'scale' => [0.05, 6.0],
        'rotation' => [-180.0, 180.0],
        'opacity' => [0.0, 1.0],
        'pivot_x' => [-100.0, 200.0],
        'pivot_y' => [-100.0, 200.0],
    ];

    /** A layer's own pivot, 0..1 across its box (a little past the edges is allowed: a door hinge just outside). */
    public const PIVOT = [-1.0, 2.0];

    /** The stage shape a group is taken apart at when the editor sends none. */
    public const ASPECT = 16 / 9;

    /** @param  array<string,mixed>  $values  @return array<string,float> the known values, clamped */
    public static function clean(array $values): array
    {
        $out = [];
        foreach (self::LIMITS as $field => [$min, $max]) {
            if (isset($values[$field]) && is_numeric($values[$field]) && is_finite((float) $values[$field])) {
                $out[$field] = round(max($min, min($max, (float) $values[$field])), 4);
            }
        }

        return $out;
    }

    /** A name a teacher typed: plain text, at most 40 characters, null when empty. */
    public static function name(mixed $name): ?string
    {
        $clean = is_string($name) ? mb_substr(trim(strip_tags($name)), 0, 40) : '';

        return $clean === '' ? null : $clean;
    }

    /** @param  array<string,mixed>  $shot  @return list<array<string,mixed>> */
    public static function of(array $shot): array
    {
        return array_values(array_filter((array) ($shot['groups'] ?? []), fn ($g) => is_array($g) && is_string($g['id'] ?? null)));
    }

    /** @param  array<string,mixed>  $shot  @return array<string,mixed>|null */
    public static function find(array $shot, string $id): ?array
    {
        foreach (self::of($shot) as $g) {
            if ($g['id'] === $id) {
                return $g;
            }
        }

        return null;
    }

    /** Can this layer be grouped? A picture, an embed or a drawing; not the shot's cover, not an arrow (drawn in stage units). */
    public static function groupable(mixed $layer): bool
    {
        return is_array($layer) && isset($layer['asset_id']) && ($layer['kind'] ?? null) !== SceneArrow::KIND;
    }

    /**
     * A layer as its group shows it, its own values carried by the group (art-groups.js composeMember), on a stage of
     * `$aspect` (width / height).
     *
     * @param  array<string,mixed>  $layer
     * @param  array<string,mixed>  $group
     * @return array{x: float, y: float, scale: float, rotation: float, opacity: float}
     */
    public static function carry(array $layer, array $group, float $aspect = self::ASPECT): array
    {
        $w = max(0.2, min(5.0, $aspect));
        $px = (float) ($group['pivot_x'] ?? 50);
        $py = (float) ($group['pivot_y'] ?? 50);
        $s = (float) ($group['scale'] ?? 1);
        $a = deg2rad((float) ($group['rotation'] ?? 0));
        $vx = (((float) ($layer['x'] ?? 50)) - $px) / 100 * $w;
        $vy = (((float) ($layer['y'] ?? 58)) - $py) / 100;
        $dx = ($vx * cos($a) - $vy * sin($a)) * $s;
        $dy = ($vx * sin($a) + $vy * cos($a)) * $s;

        return [
            'x' => $px + (float) ($group['x'] ?? 0) + $dx / $w * 100,
            'y' => $py + (float) ($group['y'] ?? 0) + $dy * 100,
            'scale' => (float) ($layer['scale'] ?? 1) * $s,
            'rotation' => (float) ($layer['rotation'] ?? 0) + (float) ($group['rotation'] ?? 0),
            'opacity' => (float) ($layer['opacity'] ?? 1) * (float) ($group['opacity'] ?? 1),
        ];
    }

    /** Has the group moved, grown, turned or faded since it was made? @param  array<string,mixed>  $group */
    public static function moved(array $group): bool
    {
        return abs((float) ($group['x'] ?? 0)) > 1e-6 || abs((float) ($group['y'] ?? 0)) > 1e-6
            || abs((float) ($group['scale'] ?? 1) - 1) > 1e-6 || abs((float) ($group['rotation'] ?? 0)) > 1e-6
            || abs((float) ($group['opacity'] ?? 1) - 1) > 1e-6;
    }

    /**
     * A layer out of its group, standing where the group put it (the group's base values; its keys stay with the group).
     *
     * @param  array<string,mixed>  $layer
     * @param  array<string,mixed>  $group
     * @return array<string,mixed>
     */
    public static function release(array $layer, array $group, float $aspect = self::ASPECT): array
    {
        unset($layer['group']);
        if (! self::moved($group)) {
            return $layer;
        }
        $shown = self::carry($layer, $group, $aspect);
        $layer['x'] = round(max(-50.0, min(150.0, $shown['x'])), 2);
        $layer['y'] = round(max(-50.0, min(150.0, $shown['y'])), 2);
        $layer['scale'] = round(max(0.2, min(6.0, $shown['scale'])), 3);
        $layer['rotation'] = round(fmod(fmod($shown['rotation'] + 180, 360) + 360, 360) - 180, 1);
        if (abs($shown['opacity'] - 1) > 1e-6 || array_key_exists('opacity', $layer)) {
            $layer['opacity'] = round(max(0.05, min(1.0, $shown['opacity'])), 3);
        }

        return $layer;
    }

    /**
     * Group these layers of one shot: a new group with its pivot where the editor measured the middle of them, the
     * layers stacked together where the front-most of them stood (a group is one block in the stack, as in
     * Photoshop). A layer that was in another group leaves it where that group put it.
     *
     * @param  array<string,mixed>  $shot
     * @param  list<int>  $assetIds
     * @return array{0: array<string,mixed>, 1: ?string} the shot, and the new group's id (null: nothing to group)
     */
    public static function group(array $shot, array $assetIds, float $pivotX, float $pivotY, float $aspect = self::ASPECT): array
    {
        $layers = array_values((array) ($shot['layers'] ?? []));
        $picked = [];
        foreach ($layers as $i => $l) {
            if (self::groupable($l) && in_array((int) $l['asset_id'], $assetIds, true)) {
                $picked[] = $i;
            }
        }
        if ($picked === []) {
            return [$shot, null];
        }
        $groups = self::of($shot);
        $byId = array_column($groups, null, 'id');
        $n = 1;
        while (isset($byId['g'.$n])) {
            $n++;
        }
        $id = 'g'.$n;
        $members = [];
        foreach ($picked as $i) {
            $l = $layers[$i];
            if (is_string($l['group'] ?? null) && isset($byId[$l['group']])) {
                $l = self::release($l, $byId[$l['group']], $aspect);
            }
            $l['group'] = $id;
            $members[] = $l;
        }
        // One block in the stack, where the front-most of them stood.
        $top = max($picked);
        $rest = array_values(array_diff_key($layers, array_flip($picked)));
        $at = $top - (count($picked) - 1);
        array_splice($rest, $at, 0, $members);

        $shot['layers'] = $rest;
        $shot['groups'] = [...$groups, ['id' => $id, ...self::clean(['x' => 0, 'y' => 0, 'scale' => 1, 'rotation' => 0, 'opacity' => 1, 'pivot_x' => $pivotX, 'pivot_y' => $pivotY])]];

        return [self::prune($shot), $id];
    }

    /**
     * Take a group apart: every layer stands on its own where the group put it, and the group goes.
     *
     * @param  array<string,mixed>  $shot
     * @return array<string,mixed>
     */
    public static function ungroup(array $shot, string $id, float $aspect = self::ASPECT): array
    {
        $group = self::find($shot, $id);
        if ($group === null) {
            return $shot;
        }
        $shot['layers'] = array_map(fn ($l) => is_array($l) && ($l['group'] ?? null) === $id ? self::release($l, $group, $aspect) : $l, (array) ($shot['layers'] ?? []));

        return self::prune($shot);
    }

    /**
     * The shot without groups no layer belongs to any more, and without memberships of a group that is gone.
     *
     * @param  array<string,mixed>  $shot
     * @return array<string,mixed>
     */
    public static function prune(array $shot): array
    {
        $groups = self::of($shot);
        $ids = array_column($groups, 'id');
        if (isset($shot['layers']) && is_array($shot['layers'])) {
            $shot['layers'] = array_map(function ($l) use ($ids) {
                if (is_array($l) && array_key_exists('group', $l) && ! in_array($l['group'], $ids, true)) {
                    unset($l['group']);
                }

                return $l;
            }, $shot['layers']);
        }
        $used = array_filter(array_column(array_filter((array) ($shot['layers'] ?? []), 'is_array'), 'group'), 'is_string');
        $groups = array_values(array_filter($groups, fn (array $g) => in_array($g['id'], $used, true)));
        if ($groups === []) {
            unset($shot['groups']);
        } else {
            $shot['groups'] = $groups;
        }

        return $shot;
    }

    /**
     * A group's values, from its panel or the canvas.
     *
     * @param  array<string,mixed>  $shot
     * @param  array<string,mixed>  $patch  any of LIMITS, and `name`
     * @return array<string,mixed>
     */
    public static function patch(array $shot, string $id, array $patch): array
    {
        $groups = self::of($shot);
        foreach ($groups as $at => $g) {
            if ($g['id'] !== $id) {
                continue;
            }
            $g = [...$g, ...self::clean($patch)];
            if (array_key_exists('name', $patch)) {
                $name = self::name($patch['name']);
                if ($name === null) {
                    unset($g['name']);
                } else {
                    $g['name'] = $name;
                }
            }
            $groups[$at] = $g;
            $shot['groups'] = $groups;
        }

        return $shot;
    }

    /**
     * A layer's pivot and group, as the editor and the player read them.
     *
     * @param  array<string,mixed>  $layer
     * @return array{pivot_x: ?float, pivot_y: ?float, group: ?string}
     */
    public static function layerPayload(array $layer): array
    {
        $pivot = fn (string $k) => isset($layer[$k]) && is_numeric($layer[$k]) ? max(self::PIVOT[0], min(self::PIVOT[1], (float) $layer[$k])) : null;

        return [
            'pivot_x' => $pivot('pivot_x'),
            'pivot_y' => $pivot('pivot_y'),
            'group' => is_string($layer['group'] ?? null) && ($layer['kind'] ?? null) !== SceneArrow::KIND ? $layer['group'] : null,
        ];
    }

    /**
     * The groups as the editor and the player read them.
     *
     * @return list<array<string,mixed>>|null
     */
    public static function payload(mixed $groups): ?array
    {
        $out = [];
        foreach ((array) $groups as $g) {
            if (! is_array($g) || ! is_string($g['id'] ?? null)) {
                continue;
            }
            $out[] = ['id' => $g['id'], 'name' => self::name($g['name'] ?? null), ...self::clean($g)];
        }

        return $out === [] ? null : $out;
    }

    /**
     * The scene's timeline without a group's tracks (the group is gone: its keys moved nothing left).
     *
     * @param  array<string,mixed>  $config
     * @return array<string,mixed>
     */
    public static function dropTracks(array $config, string $id): array
    {
        $timeline = $config['timeline'] ?? null;
        if (! is_array($timeline)) {
            return $config;
        }
        $target = 'grp:'.$id;
        if (is_array($timeline['tracks'] ?? null)) {
            $timeline['tracks'] = array_values(array_filter($timeline['tracks'], fn ($t) => ! is_array($t) || ($t['target'] ?? null) !== $target));
        }
        if (is_array($timeline['targets'] ?? null)) {
            $timeline['targets'] = array_values(array_filter($timeline['targets'], fn ($t) => $t !== $target));
        }
        $config['timeline'] = $timeline;

        return $config;
    }
}
