<?php

declare(strict_types=1);

namespace App\Services\Stage25d;

/**
 * Layer keys of a stage25d scene: `config.stage25d.set.layers[i].keys`, a list of `{t, x?, y?, scale?, opacity?, rotation?}`
 * that the stage eases itself (engine-mvp stage25d/layout.ts layerAt). The one place that validates them (editor
 * saves) and converts the director's `motion` tracks into them (import, `lessons:keys-25d`).
 */
final class LayerKeys
{
    /** The fields a key may set; the timeline's rows for a layer (resources/js/anim/properties.js `s25`). */
    public const FIELDS = ['x', 'y', 'scale', 'opacity', 'rotation'];

    /** What a field may hold: a typo or a runaway drag never leaves the picture off the planet. */
    private const RANGE = ['x' => [-2.0, 3.0], 'y' => [-50.0, 50.0], 'scale' => [0.01, 20.0], 'opacity' => [0.0, 1.0], 'rotation' => [-3600.0, 3600.0]];

    /**
     * Finite numbers of the known fields, held to their range.
     *
     * @param  array<string,mixed>  $values
     * @return array<string,float>
     */
    public static function clean(array $values): array
    {
        $out = [];
        foreach (self::RANGE as $field => [$min, $max]) {
            if (isset($values[$field]) && is_numeric($values[$field]) && is_finite((float) $values[$field])) {
                $out[$field] = max($min, min($max, (float) $values[$field]));
            }
        }

        return $out;
    }

    /** The depths a teacher can put a picture at, far to near (the sky stays where it is). */
    public const DEPTHS = ['bg', 'mid', 'fg', 'near'];

    public const MOTION_KINDS = ['none', 'sway', 'drift', 'ripple', 'flicker'];

    /** A layer's motion as the stage reads it: a kind and how much, how fast (0..5). Null when the kind is unknown. @return array{kind:string,amount:float,speed:float}|null */
    public static function motion(mixed $m): ?array
    {
        if (! is_array($m) || ! in_array($m['kind'] ?? null, self::MOTION_KINDS, true)) {
            return null;
        }
        $n = fn ($v) => is_numeric($v) && is_finite((float) $v) ? max(0.0, min(5.0, (float) $v)) : 1.0;

        return ['kind' => $m['kind'], 'amount' => $n($m['amount'] ?? 1), 'speed' => $n($m['speed'] ?? 1)];
    }

    /** Below this spread a track does not move anything (a director track of all zeros). */
    private const FLAT = 1e-6;

    /**
     * Editor input for one layer: finite numbers only, sorted by time, one key per moment, times kept inside the scene.
     *
     * @param  array<int,mixed>  $keys
     * @return list<array<string,float>>
     */
    public static function sanitize(array $keys, float $duration): array
    {
        $byTime = [];
        foreach ($keys as $key) {
            if (! is_array($key) || ! isset($key['t']) || ! is_numeric($key['t'])) {
                continue;
            }
            $t = round(max(0.0, min($duration > 0 ? $duration : 3600.0, (float) $key['t'])), 3);
            $clean = self::clean($key);
            if ($clean !== []) {
                $byTime[(string) $t] = [...($byTime[(string) $t] ?? []), ...$clean];
            }
        }
        $out = [];
        foreach ($byTime as $t => $fields) {
            $out[] = ['t' => (float) $t, ...$fields];
        }
        usort($out, fn (array $a, array $b): int => $a['t'] <=> $b['t']);

        return $out;
    }

    /**
     * The director's `motion` tracks (`figure:N`, x|y) as keys on the figure's own layer (the layer with
     * `figure` equal to figures[N].char). Flat tracks are dropped; a field the layer already keys is left alone;
     * converted and flat tracks leave `motion`, so a second run changes nothing.
     *
     * @param  array<string,mixed>  $stage  config.stage25d
     * @return array{0:array<string,mixed>,1:array{converted:int,flat:int,unmatched:int}}
     */
    public static function fromMotion(array $stage): array
    {
        $report = ['converted' => 0, 'flat' => 0, 'unmatched' => 0];
        $tracks = $stage['motion'] ?? null;
        if (! is_array($tracks) || $tracks === []) {
            return [$stage, $report];
        }
        $layers = array_values($stage['set']['layers'] ?? []);
        $figures = array_values($stage['figures'] ?? []);
        $left = [];
        foreach ($tracks as $track) {
            $target = (string) ($track['target'] ?? '');
            $property = (string) ($track['property'] ?? '');
            $values = array_map(fn ($k) => (float) ($k['value'] ?? 0), (array) ($track['keyframes'] ?? []));
            if (preg_match('/^figure:(\d+)$/', $target, $m) !== 1 || ! in_array($property, ['x', 'y'], true)) {
                $left[] = $track;

                continue;
            }
            if ($values === [] || max($values) - min($values) < self::FLAT) {
                $report['flat']++;

                continue;
            }
            $char = $figures[(int) $m[1]]['char'] ?? null;
            $at = $char === null ? null : collect($layers)->search(fn ($l) => ($l['figure'] ?? null) === $char);
            if ($at === null || $at === false) {
                $report['unmatched']++;
                $left[] = $track;

                continue;
            }
            $layers[$at]['keys'] = self::merge($layers[$at]['keys'] ?? [], $property, (array) $track['keyframes']);
            $report['converted']++;
        }
        $stage['set']['layers'] = $layers;
        if ($left === []) {
            unset($stage['motion']);
        } else {
            $stage['motion'] = $left;
        }

        return [$stage, $report];
    }

    /**
     * @param  list<array<string,mixed>>  $keys
     * @param  array<int,mixed>  $frames  director keyframes {time, value}
     * @return list<array<string,float>>
     */
    private static function merge(array $keys, string $field, array $frames): array
    {
        if (collect($keys)->contains(fn ($k) => isset($k[$field]))) {
            return $keys;
        }
        $incoming = array_map(fn ($f) => ['t' => (float) ($f['time'] ?? 0), $field => (float) ($f['value'] ?? 0)], $frames);

        return self::sanitize([...$keys, ...$incoming], 0.0);
    }
}
