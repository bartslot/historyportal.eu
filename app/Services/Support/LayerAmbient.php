<?php

declare(strict_types=1);

namespace App\Services\Support;

/**
 * Ambient layer motion: drift (clouds), breeze (trees, banners), bob (boats), flutter (birds), and
 * the web-comic sea: swell (a scrolling sea strip), roll (a ship pitching about its waterline),
 * billow (flags, sails), rain, flash (lightning), spray, flicker (lanterns), rise (smoke), oars.
 *
 * The one place the vocabulary and ranges live on the server. resources/js/scene/ambient.js plays
 * them (its PERIOD_S keys are this list; LayerAmbientTest holds the two together); the editor
 * whitelist, both layer serializers (wizard + player) and the lesson composer read them from here.
 */
final class LayerAmbient
{
    public const MODES = [
        'none', 'drift', 'breeze', 'bob', 'flutter',
        'swell', 'roll', 'billow', 'rain', 'flash', 'spray', 'flicker', 'rise', 'oars',
    ];

    /** Speed multiplier on each mode's base period. */
    public const SPEED = [0.25, 3];

    /** Amplitude multiplier; 0 is still. */
    public const AMOUNT = [0, 2];

    /**
     * The ambient keys of a layer as the renderers receive them. Stored data is trusted only as
     * far as these lists and ranges: anything else plays as "no motion".
     *
     * @param  array<string, mixed>  $layer
     * @return array{ambient: ?string, ambient_speed: ?float, ambient_amount: ?float}
     */
    public static function payload(array $layer): array
    {
        $mode = $layer['ambient'] ?? null;

        return [
            'ambient' => in_array($mode, self::MODES, true) && $mode !== 'none' ? $mode : null,
            'ambient_speed' => self::clamp($layer['ambient_speed'] ?? null, self::SPEED),
            'ambient_amount' => self::clamp($layer['ambient_amount'] ?? null, self::AMOUNT),
        ];
    }

    /** @param array{0: int|float, 1: int|float} $range */
    private static function clamp(mixed $value, array $range): ?float
    {
        if (! is_numeric($value)) {
            return null;
        }

        return max((float) $range[0], min((float) $range[1], (float) $value));
    }
}
