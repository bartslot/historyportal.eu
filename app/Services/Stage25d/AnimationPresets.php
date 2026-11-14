<?php

declare(strict_types=1);

namespace App\Services\Stage25d;

use App\Models\SvgAsset;
use App\Services\Editor\Characters;

/**
 * The animation preset library (resources/animations): walk, wave, dance and the rest, one clip each, shared by every
 * rig by bone name. Agents and the composer name a preset on a figure (`animation: 'walk'` or
 * `animation: {id, start?, length?, speed?}`); here it becomes ordinary keys on the figure's layer, exactly as the
 * editor's picker writes them (resources/js/anim/presets.js, held to the same answer by tests/Fixtures/animations/expand.json).
 */
final class AnimationPresets
{
    private const CATALOGUE = 'animations/presets.json';

    private const CLIPS = 'animations/clips';

    /** The house camera's view (engine-mvp stage25d/layout.ts HOUSE.fov, ASPECT): how wide the view is at a distance. */
    private const FOV_DEG = 50.0;

    private const ASPECT = 16 / 9;

    /** A figure the library gives no height (layout.ts figures default to it too). */
    private const FIGURE_M = 1.7;

    private const SPEED = [0.25, 4.0];

    /** A clip that stays in place moves its root less than this (body heights): its x keys are left alone (presets.js MOVE_MIN). */
    private const MOVE_MIN = 0.01;

    /** A walk or a run with no length of its own crosses the shot this many cycles (presets.js TRAVEL_CYCLES). */
    private const TRAVEL_CYCLES = 3;

    /** The face a figure shows when nothing says otherwise (presets.js REST_FACE). */
    private const REST_FACE = 'calm';

    /**
     * The presets in the order the picker and the agents' schema list them: id, English label, group.
     *
     * @return list<array{id:string,label:string,group:string}>
     */
    public static function catalogue(): array
    {
        return once(fn () => json_decode((string) file_get_contents(resource_path(self::CATALOGUE)), true, flags: JSON_THROW_ON_ERROR)['presets']);
    }

    /** @return list<string> */
    public static function ids(): array
    {
        return array_column(self::catalogue(), 'id');
    }

    /** @return array<string,mixed>|null */
    public static function clip(string $id): ?array
    {
        if (! in_array($id, self::ids(), true)) {
            return null;
        }
        $path = resource_path(self::CLIPS."/{$id}.json");

        return is_file($path) ? json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR) : null;
    }

    /**
     * A figure's `animation` as agents may write it, checked: a known preset id, its start and length in seconds
     * (length null: a loop to the end of the scene, a move at its own pace), its speed. Null when it names no preset.
     *
     * @return array{id:string,start:float,length:float|null,speed:float}|null
     */
    public static function spec(mixed $animation): ?array
    {
        $a = is_string($animation) ? ['id' => $animation] : $animation;
        if (! is_array($a) || ! is_string($a['id'] ?? null) || ! in_array($a['id'], self::ids(), true)) {
            return null;
        }
        $num = fn ($v): ?float => is_numeric($v) && is_finite((float) $v) ? (float) $v : null;
        $length = $num($a['length'] ?? null);

        return [
            'id' => $a['id'],
            'start' => max(0.0, $num($a['start'] ?? null) ?? 0.0),
            'length' => $length !== null && $length > 0 ? $length : null,
            'speed' => max(self::SPEED[0], min(self::SPEED[1], $num($a['speed'] ?? null) ?? 1.0)),
        ];
    }

    /**
     * How long the clip runs: a loop fills `length` with whole cycles, a move plays once at its own pace.
     *
     * @param  array<string,mixed>  $clip
     * @return array{0:int,1:float} cycles, seconds per cycle
     */
    public static function span(array $clip, ?float $length, float $speed): array
    {
        $cycle = (float) $clip['duration'] / max(0.1, $speed);
        if (empty($clip['loop'])) {
            return [1, $length ?? $cycle];
        }
        $cycles = max(1, (int) round(($length ?? $cycle) / $cycle));

        return [$cycles, ($length ?? $cycle) / $cycles];
    }

    /**
     * The clip as layer keys from `start` (presets.js expandClip, the same sums).
     *
     * @param  array<string,mixed>  $clip
     * @param  array{start?:float,length?:float|null,speed?:float,bones?:list<string>,facing?:int,x0?:float,y0?:float,xPerHeight?:float,yPerHeight?:float}  $o
     * @return list<array<string,mixed>>
     */
    public static function expand(array $clip, array $o): array
    {
        [$cycles, $cycle] = self::span($clip, $o['length'] ?? null, (float) ($o['speed'] ?? 1.0));
        $keys = (array) $clip['keys'];
        $travel = (float) ($clip['travel'] ?? 0);
        $moves = abs($travel) > 1e-6 || collect($keys)->contains(fn ($k) => abs((float) ($k['dx'] ?? 0)) > self::MOVE_MIN);
        $bobs = collect($keys)->contains(fn ($k) => abs((float) ($k['bob'] ?? 0)) > 1e-6);
        $bones = array_flip($o['bones'] ?? []);
        $facing = ($o['facing'] ?? 1) < 0 ? -1 : 1;
        [$start, $x0, $y0] = [(float) ($o['start'] ?? 0), (float) ($o['x0'] ?? 0.5), (float) ($o['y0'] ?? 0)];
        $out = [];
        $face = null;
        for ($c = 0; $c < $cycles; $c++) {
            foreach ($keys as $i => $k) {
                if ($c > 0 && $i === 0) {
                    continue;   // the seam: a loop's first key is the last one of the cycle before
                }
                $key = ['t' => round($start + ($c + (float) $k['t']) * $cycle, 3), 'ease' => 'smooth'];
                foreach ($k as $field => $deg) {
                    if (str_starts_with((string) $field, 'bone:') && isset($bones[substr((string) $field, 5)])) {
                        $key[$field] = round((float) $deg * $facing, 3);
                    }
                }
                if ($moves) {
                    $key['x'] = round($x0 + $facing * ($c * $travel + (float) ($k['dx'] ?? 0)) * (float) ($o['xPerHeight'] ?? 0), 3);
                }
                if ($bobs) {
                    $key['y'] = round($y0 + (float) ($k['bob'] ?? 0) * (float) ($o['yPerHeight'] ?? 0), 3);
                }
                if (is_string($k['face'] ?? null) && $k['face'] !== '' && $k['face'] !== $face) {
                    $key['face'] = $face = $k['face'];   // a face steps: only where it changes
                }
                $out[] = $key;
            }
        }
        if ($out !== []) {
            unset($out[array_key_last($out)]['ease']);   // from its last pose the figure eases into whatever comes next
        }

        return $out;
    }

    /**
     * The figure's keys with the clip's over them (presets.js applyClip): in the clip's stretch of time the fields it
     * moves are its own; every other field and every key outside that stretch stays.
     *
     * @param  list<array<string,mixed>>  $keys
     * @param  list<array<string,mixed>>  $added
     * @return list<array<string,mixed>>
     */
    public static function apply(array $keys, array $added): array
    {
        if ($added === []) {
            return $keys;
        }
        $fields = array_diff(array_unique(array_merge(...array_map('array_keys', $added))), ['t', 'ease']);
        [$from, $to] = [$added[0]['t'] - 1e-6, $added[array_key_last($added)]['t'] + 1e-6];
        $out = [];
        foreach ($keys as $k) {
            if ($k['t'] < $from || $k['t'] > $to) {
                $out[] = $k;

                continue;
            }
            $rest = array_diff_key($k, array_flip($fields));
            if (array_diff(array_keys($rest), ['t', 'ease']) !== []) {
                $out[] = $rest;
            }
        }
        foreach ($added as $a) {
            $at = collect($out)->search(fn ($k) => abs($k['t'] - $a['t']) < 1e-6);
            if ($at === false) {
                $out[] = $a;
            } else {
                $out[$at] = [...$out[$at], ...$a];
            }
        }
        // a clip's faces are its own: when it ends the figure shows the face it had before it
        if (in_array('face', $fields, true)) {
            $before = collect($keys)->filter(fn ($k) => isset($k['face']) && $k['t'] < $from)->sortBy('t')->last()['face'] ?? self::REST_FACE;
            $last = collect($out)->search(fn ($k) => abs($k['t'] - $added[array_key_last($added)]['t']) < 1e-6);
            $out[$last]['face'] = $before;
        }
        usort($out, fn ($a, $b) => $a['t'] <=> $b['t']);

        return array_values($out);
    }

    /**
     * Every figure layer that names an `animation` gets the preset's keys, and loses the field: what is stored is keys,
     * which the teacher edits like any other. A preset the figure cannot play (no bones, unknown id) is dropped and
     * counted.
     *
     * @param  array<string,mixed>  $stage  config.stage25d (after GroundDistance::fill, so a figure has its z)
     * @return array{0:array<string,mixed>,1:array{animated:int,dropped:int}}
     */
    public static function fill(array $stage, float $duration): array
    {
        $report = ['animated' => 0, 'dropped' => 0];
        $layers = $stage['set']['layers'] ?? null;
        if (! is_array($layers)) {
            return [$stage, $report];
        }
        $assets = collect(LibraryBundle::assets((string) ($stage['bundle'] ?? '')))->keyBy('id');
        foreach ($layers as $i => $layer) {
            if (! is_array($layer) || ! array_key_exists('animation', $layer)) {
                continue;
            }
            unset($layer['animation']);
            $spec = self::spec($layers[$i]['animation']);
            $asset = is_string($layer['asset'] ?? null) ? (array) ($assets->get($layer['asset']) ?? self::character($layer['asset'])) : [];
            $puppet = $layer['puppet'] ?? $asset['puppet'] ?? null;
            $bones = is_array($puppet) ? array_values(array_filter(array_column((array) ($puppet['bones'] ?? []), 'name'), 'is_string')) : [];
            $clip = $spec ? self::clip($spec['id']) : null;
            if ($clip === null || $bones === []) {
                $layers[$i] = $layer;
                $report['dropped']++;

                continue;
            }
            $cycle = (float) $clip['duration'] / $spec['speed'];
            $rest = max($cycle, $duration - $spec['start']);
            $length = $spec['length'] ?? (empty($clip['loop']) ? null : (empty($clip['travel']) ? $rest : min($rest, self::TRAVEL_CYCLES * $cycle)));
            // cut at the scene's end: a key past it would be squeezed onto the last moment
            $added = array_values(array_filter(
                self::expand($clip, [...$spec, 'length' => $length, ...self::sizeOf($layer, $asset, $puppet)]),
                fn ($k) => $k['t'] <= $duration + 1e-6,
            ));
            $layers[$i] = [...$layer, 'keys' => LayerKeys::sanitize(self::apply((array) ($layer['keys'] ?? []), $added), $duration)];
            $report['animated']++;
        }
        $stage['set']['layers'] = $layers;

        return [$stage, $report];
    }

    /** @return array<string,mixed> a teacher's own character ('chr-<id>', the Character tab) as the stage's library row, or nothing */
    private static function character(string $assetId): array
    {
        $id = Characters::idOf($assetId);
        $asset = $id === null ? null : SvgAsset::query()->whereKey($id)->where('source', Characters::SOURCE)->first();

        return $asset ? Characters::stageRow($asset) : [];
    }

    /**
     * What a body height is in the layer's own terms: x is a share of the view's width at its distance, y metres.
     *
     * @param  array<string,mixed>  $layer
     * @param  array<string,mixed>  $asset
     * @param  array<string,mixed>  $puppet
     * @return array{bones:list<string>,facing:int,x0:float,y0:float,xPerHeight:float,yPerHeight:float}
     */
    private static function sizeOf(array $layer, array $asset, array $puppet): array
    {
        $z = (float) ($layer['z'] ?? GroundDistance::DEPTH_Z[$layer['depth'] ?? 'mid'] ?? GroundDistance::DEPTH_Z['mid']);
        $height = (float) ($asset['height_m'] ?? self::FIGURE_M) * (float) ($layer['scale'] ?? 1);
        $wide = 2 * $z * tan(deg2rad(self::FOV_DEG) / 2) * self::ASPECT;

        return [
            'bones' => array_values(array_filter(array_column((array) $puppet['bones'], 'name'), 'is_string')),
            'facing' => ($puppet['facing'] ?? 1) < 0 ? -1 : 1,
            'x0' => (float) ($layer['x'] ?? 0.5),
            'y0' => (float) ($layer['y'] ?? 0),
            'xPerHeight' => $wide > 0 ? $height / $wide : 0.0,
            'yPerHeight' => $height,
        ];
    }
}
