<?php

declare(strict_types=1);

namespace App\Support;

/**
 * How a map scene draws the territory the teacher linked (scene.config.territory).
 *
 * Bart, 2026-11-23: a black border like a pen drawing, with etching only along the inside of the edge.
 * The same defaults and limits live in resources/js/map/territory-look.js, which draws it; this side
 * only cleans what the inspector saves, so a junk value never reaches the map.
 */
final class TerritoryLook
{
    public const FILL_STYLES = ['none', 'etched', 'wash'];

    /** Bart, 2026-11-24: "border has a couple of settings. it should be solid, ink, dashed, wavy". */
    public const BORDER_STYLES = ['ink', 'solid', 'dashed', 'wavy'];

    public const DEFAULTS = [
        'border_color' => '#1b1712',
        'border_width' => 1.6,
        'border_style' => 'ink',
        'fill_style' => 'etched',
        'fill_color' => '#1b1712',
        'fill_strength' => 0.3,
    ];

    /** A stored look with every field present and in range. */
    public static function from(mixed $stored): array
    {
        $stored = is_array($stored) ? $stored : [];
        $look = self::DEFAULTS;
        foreach (array_keys(self::DEFAULTS) as $key) {
            if (array_key_exists($key, $stored)) {
                $clean = self::clean($key, $stored[$key]);
                if ($clean !== null) {
                    $look[$key] = $clean;
                }
            }
        }

        return $look;
    }

    /** One field, cleaned, or null when the key is unknown or the value unusable. */
    public static function clean(string $key, mixed $value): string|float|null
    {
        return match ($key) {
            'border_color', 'fill_color' => is_string($value) && preg_match('/^#[0-9a-f]{6}$/i', $value) ? strtolower($value) : null,
            'border_width' => is_numeric($value) ? max(0.0, min(12.0, round((float) $value, 2))) : null,
            'fill_strength' => is_numeric($value) ? max(0.0, min(1.0, round((float) $value, 2))) : null,
            'fill_style' => in_array($value, self::FILL_STYLES, true) ? $value : null,
            'border_style' => in_array($value, self::BORDER_STYLES, true) ? $value : null,
            default => null,
        };
    }
}
