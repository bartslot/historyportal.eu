<?php

declare(strict_types=1);

namespace App\Services\Stage25d;

use App\Models\StageWorld;

/**
 * The worlds a 3D scene can stand in: ready-made ones (config/worlds.php) and the ones a teacher saved ('mine:<id>').
 * One place for the picker in the editor (EditsStage25d) and an import that builds its scenes in a world (TwineImporter).
 */
final class StageWorlds
{
    /** The scene look sliders the panel offers, with the range each may take (engine-mvp stage25d/look.ts LOOK_RANGE). */
    public const LOOK_RANGES = [
        'sheetGrain' => [0, 1], 'groundDetail' => [0, 1], 'sunLight' => [0, 1], 'castShadow' => [0, 1], 'edgeSoft' => [0, 1],
        'cloudDrift' => [0, 1], 'housePitch' => [-6, 12],
        'groundWash' => [0, 1], 'groundGrain' => [0.5, 3], 'grass' => [0, 1], 'grassSway' => [0, 1], 'horizonBushes' => [0, 1],
        'worldReveal' => [0, 20], 'worldPaint' => [0, 1],
        'figureWash' => [0, 1], 'figureShade' => [0, 1], 'figurePigment' => [1, 8],
    ];

    /** A world by its picker key, or null when there is none (another teacher's saved world is none). */
    public static function preset(string $key, ?int $userId): ?array
    {
        if (str_starts_with($key, StageWorld::KEY_PREFIX)) {
            $own = $userId === null ? null : StageWorld::where('user_id', $userId)->find((int) substr($key, strlen(StageWorld::KEY_PREFIX)));

            return $own?->preset();
        }
        $preset = config('worlds', [])[$key] ?? null;   // the exact key: a dotted one must not reach inside

        return is_array($preset) ? $preset : null;
    }

    /**
     * The stage standing in a world: the world's sky, terrain, ground strips and look, its pieces marked world: true
     * (the next pick takes them away), and every layer of the scene's own kept in front of them.
     *
     * @param  array<string,mixed>  $stage  config.stage25d
     * @param  array<string,mixed>  $preset  from preset()
     * @return array<string,mixed>
     */
    public static function apply(array $stage, string $key, array $preset): array
    {
        $set = $stage['set'] ?? ['layers' => []];
        $own = array_values(array_filter($set['layers'] ?? [], fn ($l) => empty($l['world'])));
        $parts = $preset['set'];
        unset($stage['world']);   // a splat world (no longer offered) goes too
        $stage['bundle'] = $preset['bundle'];
        $stage['world_id'] = $key;
        unset($set['ground'], $set['groundBands'], $set['skyLayer'], $set['daylight'], $set['soil']);   // the world's sky and soil, not the scene's own
        $set = ['sky' => $parts['sky'] ?? null, 'groundSlots' => $parts['groundSlots']]
            + (is_array($parts['daylight'] ?? null) ? ['daylight' => $parts['daylight']] : [])
            + (is_string($parts['soil'] ?? null) ? ['soil' => $parts['soil']] : [])
            + (empty($parts['groundBands']) ? [] : ['groundBands' => $parts['groundBands']]) + $set;
        $set['layers'] = [...array_map(fn ($l) => $l + ['world' => true], $parts['layers'] ?? []), ...$own];
        // a world may set a look value it needs (calm water strews no foam): only keys the panel offers, in range
        foreach (array_intersect_key((array) ($preset['look'] ?? []), self::LOOK_RANGES) as $look => $value) {
            [$min, $max] = self::LOOK_RANGES[$look];
            $stage['look'][$look] = max($min, min($max, (float) $value));
        }
        $stage['set'] = $set;

        return $stage;
    }
}
