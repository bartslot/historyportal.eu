<?php

declare(strict_types=1);

namespace App\Services\Support;

/**
 * A split scene: one scene shown as two to four comic panels in one of the LAYOUTS (Bart,
 * 2026-10-16: "instead of horizontal/vertical there are more options ... 3 rows, 3 columns").
 *
 *     config.split = ['layout' => 'rows2'|'cols2'|'diag'|..., 'at' => [one fraction per divider]]
 *     shots[0..n-1] = the panels, each with its own backdrop, figures, camera and focus
 *     shots[i].focus = ['x' => 0..100, 'y' => 0..100, 'zoom'? => 1..4]   which part of the picture
 *                      the crop keeps, and how far it is zoomed in (absent = 1, the whole crop)
 *
 * Every `at` is a fraction of the WHOLE stage along its axis; a diagonal's two are where its line
 * meets the top and the bottom edge. The first version stored ['dir' => 'h'|'v', 'at' => 0.5]:
 * that still reads, as rows2 / cols2, and is written back in the new shape on the next save.
 *
 * Without config.split a scene is Standard. The retired view modes (config.slideshow_mode
 * 'parallax'/'drawing' and the old config.parallax flag) read as Standard: nothing reads them.
 * resources/js/scene/split-layout.js carries the same rules for the renderers.
 */
final class SceneSplit
{
    /**
     * Every layout, in the picker's order: how many panels, its dividers' defaults, and whether
     * its dividers run along one axis and may not cross. Mirrors LAYOUTS in split-layout.js.
     */
    public const LAYOUTS = [
        'rows2' => ['panes' => 2, 'at' => [0.5]],
        'cols2' => ['panes' => 2, 'at' => [0.5]],
        'diag' => ['panes' => 2, 'at' => [0.6, 0.4]],
        'l1r2' => ['panes' => 3, 'at' => [0.5, 0.5]],
        'rows3' => ['panes' => 3, 'at' => [1 / 3, 2 / 3], 'ordered' => true],
        'cols3' => ['panes' => 3, 'at' => [1 / 3, 2 / 3], 'ordered' => true],
        'l2r1' => ['panes' => 3, 'at' => [0.5, 0.5]],
        't1b2' => ['panes' => 3, 'at' => [0.5, 0.5]],
        'grid4' => ['panes' => 4, 'at' => [0.5, 0.5]],
    ];

    /** No panel narrower or shorter than this share of the stage. */
    public const MIN_SHARE = 0.2;

    /** How far a panel's picture zooms in: 1 is the plain cover crop. */
    public const ZOOM = [1.0, 4.0];

    /** Config keys of the retired Parallax / Drawing modes: never read, and dropped on export. */
    public const RETIRED_KEYS = ['slideshow_mode', 'parallax'];

    /**
     * Kinds the player draws its own way, returning before it ever reaches SplitStage
     * (lesson-player.js: map, voyage, gallery, video, game = quiz/strategy/debate/team game).
     */
    public const NO_SPLIT_KINDS = ['game', 'map', 'voyage', 'gallery', 'video'];

    public static function allowedFor(?string $kind): bool
    {
        return ! in_array($kind, self::NO_SPLIT_KINDS, true);
    }

    /** @return array{layout: string, at: list<float>}|null */
    public static function normalize(mixed $raw): ?array
    {
        if (! is_array($raw)) {
            return null;
        }
        $layout = isset(self::LAYOUTS[$raw['layout'] ?? null]) ? $raw['layout'] : (($raw['dir'] ?? null) === 'v' ? 'cols2' : 'rows2');
        $def = self::LAYOUTS[$layout];
        $given = is_array($raw['at'] ?? null) ? array_values($raw['at']) : [$raw['at'] ?? null];
        $lo = self::MIN_SHARE;
        $hi = 1 - self::MIN_SHARE;
        $at = [];
        foreach ($def['at'] as $k => $default) {
            $at[$k] = max($lo, min($hi, is_numeric($given[$k] ?? null) ? (float) $given[$k] : $default));
        }
        if (! empty($def['ordered'])) {
            $at[0] = max($lo, min($hi - $lo, $at[0]));
            $at[1] = max($at[0] + $lo, min($hi, $at[1]));
        }

        return ['layout' => $layout, 'at' => array_map(fn (float $v): float => round($v, 3), $at)];
    }

    /** How many panels a split has; 0 for none. */
    public static function panes(mixed $split): int
    {
        $s = self::normalize($split);

        return $s ? self::LAYOUTS[$s['layout']]['panes'] : 0;
    }

    /**
     * The picker's glyph for a layout: the `d` of its dividers inside Figma's 42 x 24 frame
     * (2346:503). Drawn from the same proportions the stage uses, so the picture of a layout is
     * the layout. 'single' is the frame alone.
     */
    public static function glyph(string $layout): string
    {
        return match ($layout) {
            'rows2' => 'M1 12h40',
            'cols2' => 'M21 1v22',
            'diag' => 'M41 1 1 23',
            'l1r2' => 'M21 1v22M21 12h20',
            'rows3' => 'M1 8.33h40M1 15.67h40',
            'cols3' => 'M14.33 1v22M27.67 1v22',
            'l2r1' => 'M21 1v22M1 12h20',
            't1b2' => 'M1 12h40M21 12v11',
            'grid4' => 'M21 1v22M1 12h40',
            default => '',
        };
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

    /** @return array{x: float, y: float, zoom?: float}|null */
    public static function focus(mixed $raw): ?array
    {
        if (! is_array($raw)) {
            return null;
        }
        $pct = fn (mixed $v): float => is_numeric($v) ? max(0.0, min(100.0, (float) $v)) : 50.0;
        $focus = ['x' => $pct($raw['x'] ?? null), 'y' => $pct($raw['y'] ?? null)];
        $zoom = is_numeric($raw['zoom'] ?? null) ? round(max(self::ZOOM[0], min(self::ZOOM[1], (float) $raw['zoom'])), 3) : 1.0;

        return $zoom > 1.0 ? [...$focus, 'zoom' => $zoom] : $focus;
    }
}
