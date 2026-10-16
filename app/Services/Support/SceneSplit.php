<?php

declare(strict_types=1);

namespace App\Services\Support;

/**
 * A split scene: one scene shown as two comic panels, stacked ('h') or side by side ('v').
 *
 *     config.split = ['dir' => 'h'|'v', 'at' => 0.25..0.75]
 *     shots[0], shots[1] = the two panels, each with its own backdrop, figures, camera and focus
 *     shots[i].focus = ['x' => 0..100, 'y' => 0..100]   which part of the picture the crop keeps
 *
 * Without config.split a scene is Standard. The retired view modes (config.slideshow_mode
 * 'parallax'/'drawing' and the old config.parallax flag) read as Standard: nothing reads them.
 * resources/js/scene/split-layout.js carries the same rules for the renderers.
 */
final class SceneSplit
{
    public const DIRS = ['h', 'v'];

    public const AT = [0.25, 0.75];

    public const AT_DEFAULT = 0.5;

    /** Config keys of the retired Parallax / Drawing modes: never read, and dropped on export. */
    public const RETIRED_KEYS = ['slideshow_mode', 'parallax'];

    /** @return array{dir: string, at: float}|null */
    public static function normalize(mixed $raw): ?array
    {
        if (! is_array($raw)) {
            return null;
        }
        $dir = in_array($raw['dir'] ?? null, self::DIRS, true) ? $raw['dir'] : 'h';
        $at = is_numeric($raw['at'] ?? null) ? (float) $raw['at'] : self::AT_DEFAULT;

        return ['dir' => $dir, 'at' => round(max(self::AT[0], min(self::AT[1], $at)), 3)];
    }

    /** @param  array<string,mixed>|null  $config */
    public static function of(?array $config): ?array
    {
        return self::normalize($config['split'] ?? null);
    }

    /**
     * The scene's view mode: 'split' or 'standard'. Parallax and Drawing are gone; both map here.
     *
     * @param  array<string,mixed>|null  $config
     */
    public static function mode(?array $config): string
    {
        return self::of($config) ? 'split' : 'standard';
    }

    /** @return array{x: float, y: float}|null */
    public static function focus(mixed $raw): ?array
    {
        if (! is_array($raw)) {
            return null;
        }
        $pct = fn (mixed $v): float => is_numeric($v) ? max(0.0, min(100.0, (float) $v)) : 50.0;

        return ['x' => $pct($raw['x'] ?? null), 'y' => $pct($raw['y'] ?? null)];
    }
}
