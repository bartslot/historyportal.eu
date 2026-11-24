<?php

declare(strict_types=1);

namespace App\Services\Stage25d;

/**
 * A scene's time of day (config.stage25d.set.daylight, read by engine-mvp/src/stage25d/daylight.ts): dawn, day, dusk
 * or night, the teacher's own sky colours, which cloud cut-outs and how many, where the sun stands, and snow or rain
 * (weather.ts). What the Sky panel sends is held to exactly that shape; anything else is dropped.
 */
final class Daylight
{
    public const TIMES = ['dawn', 'day', 'dusk', 'night'];

    /** The cloud cut-outs every scene can use (engine-mvp stage25d/clouds.ts BUILT_IN_CLOUDS, public/stage25d/clouds). */
    public const BUILT_IN_CLOUDS = ['cloud-cumulus-large-01', 'cloud-cumulus-small-01', 'cloud-bank-01', 'cloud-cirrus-01', 'cloud-rain-01'];

    private const COLOURS = ['top', 'mid', 'horizon'];

    /** Snow or rain and the range of each slider (engine-mvp stage25d/weather.ts WEATHER_RANGE). */
    public const WEATHER_KINDS = ['snow', 'rain'];

    private const WEATHER_RANGE = ['amount' => [0.0, 1.0], 'wind' => [-1.0, 1.0], 'size' => [0.4, 2.5], 'speed' => [0.25, 2.5]];

    /** More cloud ids than any bundle has: a longer list is not from the panel. */
    private const MAX_CLOUD_IDS = 20;

    /**
     * The patch as the stage reads it; null when it names no time of day.
     *
     * @param  array<string,mixed>  $raw
     * @return array<string,mixed>|null
     */
    public static function clean(array $raw, string $bundle): ?array
    {
        $time = $raw['time'] ?? null;
        if (! in_array($time, self::TIMES, true)) {
            return null;
        }
        $out = ['time' => $time];

        $colours = [];
        foreach (self::COLOURS as $key) {
            $hex = $raw['colours'][$key] ?? null;
            if (is_string($hex) && preg_match('/^#[0-9a-f]{6}$/i', $hex) === 1) {
                $colours[$key] = strtolower($hex);
            }
        }
        if ($colours !== []) {
            $out['colours'] = $colours;
        }

        if (is_array($raw['clouds'] ?? null)) {
            $clouds = [];
            if (self::isNumber($raw['clouds']['amount'] ?? null)) {
                $clouds['amount'] = self::unit($raw['clouds']['amount']);
            }
            if (is_array($raw['clouds']['assets'] ?? null)) {
                $ids = array_values(array_unique(array_filter(
                    array_slice($raw['clouds']['assets'], 0, self::MAX_CLOUD_IDS),
                    fn ($id) => is_string($id) && (in_array($id, self::BUILT_IN_CLOUDS, true) || LibraryBundle::assetLayer($bundle, $id) === 'cloud'),
                )));
                if ($ids !== []) {
                    $clouds['assets'] = $ids;
                }
            }
            if ($clouds !== []) {
                $out['clouds'] = $clouds;
            }
        }

        $sun = $raw['sun'] ?? null;
        if (is_array($sun) && self::isNumber($sun['x'] ?? null) && self::isNumber($sun['height'] ?? null)) {
            $out['sun'] = ['x' => self::unit($sun['x']), 'height' => self::unit($sun['height'])];
        }

        $weather = $raw['weather'] ?? null;
        if (is_array($weather) && in_array($weather['kind'] ?? null, self::WEATHER_KINDS, true)) {
            $out['weather'] = ['kind' => $weather['kind']];
            foreach (self::WEATHER_RANGE as $key => [$min, $max]) {
                if (self::isNumber($weather[$key] ?? null)) {
                    $out['weather'][$key] = round(max($min, min($max, (float) $weather[$key])), 3);
                }
            }
        }

        if (($raw['painted'] ?? false) === true) {
            $out['painted'] = true;
        }

        return $out;
    }

    /**
     * Does the scene paint its own sky (no sky picture needed)?
     *
     * @param  array<string,mixed>  $set  config.stage25d.set
     */
    public static function isOwn(array $set): bool
    {
        return is_array($set['daylight'] ?? null) && empty($set['daylight']['painted']);
    }

    private static function isNumber(mixed $v): bool
    {
        return is_numeric($v) && is_finite((float) $v);
    }

    private static function unit(mixed $v): float
    {
        return round(max(0.0, min(1.0, (float) $v)), 3);
    }
}
