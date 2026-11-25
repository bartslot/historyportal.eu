<?php

declare(strict_types=1);

namespace App\Services\Stage25d;

/**
 * Groups of stage25d layers (`config.stage25d.set.groups`), as in Photoshop: one place, size, turn and fade for all the
 * layers in it, with keys of its own. A layer joins by `group: <id>`. The stage carries a grouped layer the way
 * engine-mvp stage25d/layout.ts inGroup does; this is the same maths, for taking a group apart where it stands.
 *
 * A group is `{id, name?, rest: {x, z}, x?, z?, y?, scale?, rotation?, opacity?, keys?}`: x (0..1 across the view) and
 * z (metres away) are where its middle stands now, rest where it stood when it was made.
 */
final class LayerGroups
{
    /** layout.ts DEPTH_Z: a layer's distance when it has no z of its own. */
    public const DEPTH_Z = ['sky' => 380.0, 'bg' => 70.0, 'mid' => 22.0, 'fg' => 7.0, 'near' => 3.5];

    /** layout.ts HOUSE.fov and ASPECT. */
    private const FOV_DEG = 50.0;

    private const ASPECT = 16 / 9;

    /** layout.ts GROUP_NEAR_M. */
    private const NEAR_M = 0.5;

    /** The values a group's row takes (its panel, its keys): the same as a layer's place, size, turn and fade. */
    public const FIELDS = ['x', 'z', 'y', 'scale', 'rotation', 'opacity'];

    public static function viewWidthAt(float $z): float
    {
        return 2 * $z * tan(deg2rad(self::FOV_DEG) / 2) * self::ASPECT;
    }

    /** @param  array<string,mixed>  $layer */
    public static function distanceOf(array $layer): float
    {
        return isset($layer['z']) && is_numeric($layer['z']) ? (float) $layer['z'] : (self::DEPTH_Z[$layer['depth'] ?? 'mid'] ?? self::DEPTH_Z['mid']);
    }

    /**
     * A new group round these layers: its middle where theirs is (the mean of their places), so nothing moves.
     *
     * @param  list<array<string,mixed>>  $members
     * @param  list<array<string,mixed>>  $groups  the groups there are already, for a fresh id
     * @return array<string,mixed>
     */
    public static function make(array $members, array $groups): array
    {
        $n = 1;
        $ids = array_column($groups, 'id');
        while (in_array('g'.$n, $ids, true)) {
            $n++;
        }
        $x = array_sum(array_map(fn (array $l) => (float) ($l['x'] ?? 0.5), $members)) / max(1, count($members));
        $z = array_sum(array_map(fn (array $l) => self::distanceOf($l), $members)) / max(1, count($members));
        $rest = ['x' => round($x, 4), 'z' => round($z, 3)];

        return ['id' => 'g'.$n, 'rest' => $rest, 'x' => $rest['x'], 'z' => $rest['z']];
    }

    /**
     * One layer's own values carried by its group (layout.ts inGroup), with the group at its own base values.
     *
     * @param  array<string,mixed>  $layer
     * @param  array<string,mixed>  $group
     * @return array<string,float> x, z, y, scale, rotation, opacity
     */
    public static function carry(array $layer, array $group): array
    {
        $rest = $group['rest'] ?? ['x' => 0.5, 'z' => self::DEPTH_Z['mid']];
        $gx = (float) ($group['x'] ?? $rest['x']);
        $gz = (float) ($group['z'] ?? $rest['z']);
        $gs = (float) ($group['scale'] ?? 1.0);
        $a = deg2rad((float) ($group['rotation'] ?? 0.0));
        $cz = self::distanceOf($layer);
        $dx = (((float) ($layer['x'] ?? 0.5) - 0.5) * self::viewWidthAt($cz) - ((float) $rest['x'] - 0.5) * self::viewWidthAt((float) $rest['z'])) * $gs;
        $dy = (float) ($layer['y'] ?? 0.0) * $gs;
        $dz = ($cz - (float) $rest['z']) * $gs;
        $x = ($gx - 0.5) * self::viewWidthAt($gz) + $dx * cos($a) + $dy * sin($a);
        $z = max(self::NEAR_M, $gz + $dz);

        return [
            'x' => $x / self::viewWidthAt($z) + 0.5,
            'z' => $z,
            'y' => (float) ($group['y'] ?? 0.0) - $dx * sin($a) + $dy * cos($a),
            'scale' => (float) ($layer['scale'] ?? 1.0) * $gs,
            'rotation' => (float) ($layer['rotation'] ?? 0.0) + (float) ($group['rotation'] ?? 0.0),
            'opacity' => (float) ($layer['opacity'] ?? 1.0) * (float) ($group['opacity'] ?? 1.0),
        ];
    }

    /** Has the group moved, sized, turned or faded from where it was made? @param  array<string,mixed>  $group */
    public static function moved(array $group): bool
    {
        $rest = $group['rest'] ?? [];

        return abs((float) ($group['x'] ?? $rest['x'] ?? 0.5) - (float) ($rest['x'] ?? 0.5)) > 1e-6
            || abs((float) ($group['z'] ?? $rest['z'] ?? 0) - (float) ($rest['z'] ?? 0)) > 1e-6
            || (float) ($group['y'] ?? 0) !== 0.0 || (float) ($group['scale'] ?? 1) !== 1.0
            || (float) ($group['rotation'] ?? 0) !== 0.0 || (float) ($group['opacity'] ?? 1) !== 1.0;
    }

    /**
     * A layer out of its group, standing where the group put it: its own values and each key's take the group's base
     * place, size, turn and fade. The group's keys do not come along (they moved the group, not the layer).
     *
     * @param  array<string,mixed>  $layer
     * @param  array<string,mixed>  $group
     * @return array<string,mixed>
     */
    public static function release(array $layer, array $group): array
    {
        unset($layer['group']);
        if (! self::moved($group)) {
            return $layer;
        }
        $fields = static fn (array $v, array $only) => array_intersect_key(array_map(fn ($n) => round($n, 4), $v), array_flip($only));
        $own = self::carry($layer, $group);
        // x and z always (a place across the view means something only at its distance); the rest when it has a value
        $neutral = ['y' => 0.0, 'scale' => 1.0, 'rotation' => 0.0, 'opacity' => 1.0];
        $kept = array_values(array_filter(self::FIELDS, fn ($f) => ! isset($neutral[$f]) || array_key_exists($f, $layer) || abs($own[$f] - $neutral[$f]) > 1e-6));
        $out = [...$layer, ...$fields($own, $kept)];
        if (! empty($layer['keys']) && is_array($layer['keys'])) {
            $keys = $layer['keys'];
            $out['keys'] = array_map(function ($key) use ($layer, $group, $fields, $keys) {
                if (! is_array($key)) {
                    return $key;
                }
                $named = array_values(array_intersect(self::FIELDS, array_keys($key)));
                if ($named === []) {
                    return $key;
                }
                // The layer as it stands at this key's time: a field this key doesn't name comes from the layer's other
                // keys there, so a turned group gives an x key its y too (a place is x, y and z together).
                $t = (float) ($key['t'] ?? 0);
                $at = [...$layer];
                foreach (self::FIELDS as $f) {
                    $v = array_key_exists($f, $key) ? $key[$f] : self::keyedAt($keys, $f, $t);
                    if ($v !== null) {
                        $at[$f] = (float) $v;
                    }
                }
                $place = array_intersect($named, ['x', 'z', 'y']) !== [] ? ['x', 'z', 'y'] : [];

                return [...$key, ...$fields(self::carry($at, $group), array_values(array_unique([...$named, ...$place])))];
            }, $keys);
        }

        return $out;
    }

    /**
     * A field's value at time t from the keys that name it: straight between the two round t, held past the ends;
     * null when no key names it.
     *
     * @param  list<mixed>  $keys
     */
    private static function keyedAt(array $keys, string $field, float $t): ?float
    {
        $named = array_values(array_filter($keys, fn ($k) => is_array($k) && isset($k[$field]) && is_numeric($k[$field])));
        if ($named === []) {
            return null;
        }
        usort($named, fn ($a, $b) => (float) ($a['t'] ?? 0) <=> (float) ($b['t'] ?? 0));
        $prev = null;
        foreach ($named as $k) {
            $kt = (float) ($k['t'] ?? 0);
            if ($kt >= $t) {
                if ($prev === null || $kt === (float) ($prev['t'] ?? 0)) {
                    return (float) $k[$field];
                }
                $pt = (float) ($prev['t'] ?? 0);
                $u = ($t - $pt) / ($kt - $pt);

                return (float) $prev[$field] + ((float) $k[$field] - (float) $prev[$field]) * $u;
            }
            $prev = $k;
        }

        return (float) $prev[$field];
    }

    /**
     * The set without groups that no layer belongs to any more.
     *
     * @param  array<string,mixed>  $set  config.stage25d.set
     * @return array<string,mixed>
     */
    public static function prune(array $set): array
    {
        if (empty($set['groups']) || ! is_array($set['groups'])) {
            unset($set['groups']);

            return $set;
        }
        $used = array_filter(array_column(array_filter((array) ($set['layers'] ?? []), 'is_array'), 'group'), 'is_string');
        $set['groups'] = array_values(array_filter($set['groups'], fn ($g) => is_array($g) && in_array($g['id'] ?? null, $used, true)));
        if ($set['groups'] === []) {
            unset($set['groups']);
        }

        return $set;
    }
}
