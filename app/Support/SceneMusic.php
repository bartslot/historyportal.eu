<?php

declare(strict_types=1);

namespace App\Support;

/**
 * The one shape a scene's music mix may take, whatever sent it (the editor, a lesson spec, a test).
 *
 * Times are seconds, volumes 0..1. `duck` is how loud the music stays while the narrator speaks.
 * A layer with loop on repeats between loop_start and loop_end (null = the end of the file).
 */
final class SceneMusic
{
    public const MAX_LAYERS = 3;

    public const MAX_SECONDS = 1800.0;

    /** What a freshly added layer starts as. */
    public const LAYER_DEFAULTS = [
        'volume' => 0.6, 'offset' => 0.0, 'loop' => true, 'loop_start' => 0.0, 'loop_end' => null,
        'fade_in' => 2.0, 'fade_out' => 2.0,
    ];

    public const DEFAULTS = ['crossfade' => 2.0, 'duck' => 0.4];

    /**
     * @param  array<string, mixed>  $music
     * @param  list<int>  $knownTrackIds  layers pointing anywhere else are dropped
     * @return array{layers: list<array<string, mixed>>, crossfade: float, duck: float}
     */
    public static function normalize(array $music, array $knownTrackIds): array
    {
        $layers = [];
        foreach (array_values((array) ($music['layers'] ?? [])) as $layer) {
            $id = (int) ($layer['track_id'] ?? 0);
            if (! in_array($id, $knownTrackIds, true) || isset($layers[$id])) {
                continue;   // unknown track, or the same track twice (one voice per track)
            }
            $layer = array_merge(self::LAYER_DEFAULTS, (array) $layer);
            $loopStart = self::seconds($layer['loop_start']);
            $loopEnd = $layer['loop_end'] === null || $layer['loop_end'] === '' ? null : self::seconds($layer['loop_end']);
            $layers[$id] = [
                'track_id' => $id,
                'volume' => self::unit($layer['volume']),
                'offset' => self::seconds($layer['offset']),
                'loop' => filter_var($layer['loop'], FILTER_VALIDATE_BOOL),
                'loop_start' => $loopStart,
                'loop_end' => $loopEnd !== null && $loopEnd > $loopStart ? $loopEnd : null,
                'fade_in' => min(30.0, self::seconds($layer['fade_in'])),
                'fade_out' => min(30.0, self::seconds($layer['fade_out'])),
            ];
            if (count($layers) === self::MAX_LAYERS) {
                break;
            }
        }

        return [
            'layers' => array_values($layers),
            'crossfade' => min(10.0, self::seconds($music['crossfade'] ?? self::DEFAULTS['crossfade'])),
            'duck' => self::unit($music['duck'] ?? self::DEFAULTS['duck']),
        ];
    }

    private static function unit(mixed $v): float
    {
        return round(max(0.0, min(1.0, (float) $v)), 3);
    }

    private static function seconds(mixed $v): float
    {
        return round(max(0.0, min(self::MAX_SECONDS, (float) $v)), 2);
    }
}
