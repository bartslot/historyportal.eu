<?php

declare(strict_types=1);

namespace App\Support;

/**
 * How a layer arrives on a scene, as the editor names them. The movements themselves are in
 * resources/js/scene/animations.js (ENTRANCES), which plays them in the editor and the player; a
 * figure's Animate tab and a speech balloon's inspector both offer this one list.
 */
final class LayerEntrances
{
    /**
     * Appear's speed (Bart, 2026-10-17: "fast / Slow"): a factor on the entrance's own length, so
     * Normal is exactly what plays today, and a pop stays quicker than a fade at every speed.
     */
    public const SPEEDS = ['fast' => 0.5, 'normal' => 1.0, 'slow' => 2.0];

    /** How long an entrance takes at Normal, ms (resources/js/scene/animations.js, BalloonLayer.js). */
    public const LAYER_MS = 600;

    public const BALLOON_POP_MS = 260;

    /** The stored duration's range, ms: the Animate tab's Duration slider. */
    public const MIN_MS = 100;

    public const MAX_MS = 5000;

    /** An entrance's length at Normal speed: a balloon pops in quicker than anything else arrives. */
    public static function naturalMs(?string $anim, string $kind): int
    {
        return $kind === 'balloon' && ($anim ?? 'pop') === 'pop' ? self::BALLOON_POP_MS : self::LAYER_MS;
    }

    /** The speed a stored duration is, or null for one set by hand that is no preset. */
    public static function speedOf(?int $ms, int $natural): ?string
    {
        if ($ms === null) {
            return 'normal';
        }
        foreach (self::SPEEDS as $speed => $factor) {
            if (abs($ms - $natural * $factor) < 1) {
                return $speed;
            }
        }

        return null;
    }

    /** The duration a speed stores: null for Normal, which is the entrance as it plays today. */
    public static function durationFor(string $speed, int $natural): ?int
    {
        $factor = self::SPEEDS[$speed] ?? 1.0;

        return $factor === 1.0 ? null : (int) round($natural * $factor);
    }

    /**
     * A layer's entrance and exit as the stage plays them (ArtworkOverlay.playEntrances): the ONE
     * list the editor's stage and the student player both send. The player sent none of it, so a
     * figure's Appear, delay and speed only ever played in the editor's preview. Absent fields stay
     * null: the layer is simply there, as a layer saved before them always was.
     *
     * @param  array<string, mixed>  $layer
     * @return array<string, mixed>
     */
    public static function payload(array $layer): array
    {
        $text = fn (string $key): ?string => is_string($layer[$key] ?? null) && $layer[$key] !== '' ? $layer[$key] : null;
        $float = fn (string $key): ?float => is_numeric($layer[$key] ?? null) ? (float) $layer[$key] : null;
        $int = fn (string $key): ?int => is_numeric($layer[$key] ?? null) ? (int) $layer[$key] : null;

        return [
            'anim' => array_key_exists((string) $text('anim'), self::labels()) ? $text('anim') : null,
            'anim_delay' => $float('anim_delay'),
            'anim_ease' => $text('anim_ease'),
            'anim_duration' => $int('anim_duration'),
            'anim_out' => $text('anim_out'),
            'anim_out_delay' => $float('anim_out_delay'),
            'anim_out_ease' => $text('anim_out_ease'),
            'anim_out_duration' => $int('anim_out_duration'),
        ];
    }

    /** @return array<string, string> speed => label in the teacher's language */
    public static function speedLabels(): array
    {
        return ['fast' => __('Fast'), 'normal' => __('Normal'), 'slow' => __('Slow')];
    }

    /** @return array<string, string> key => label in the teacher's language */
    public static function labels(): array
    {
        return [
            'none' => __('None'),
            'fade' => __('Fade in'),
            'slide-left' => __('In from left'),
            'slide-right' => __('In from right'),
            'slide-up' => __('In from below'),
            'slide-down' => __('In from above'),
            'zoom' => __('Zoom in'),
            'pop' => __('Pop'),
        ];
    }
}
