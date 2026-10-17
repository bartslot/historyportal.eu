<?php

declare(strict_types=1);

namespace App\Services\Support;

/**
 * The camera of one shot (a comic panel), stored on the shot next to its layers:
 *
 *     shots[i].camera = ['move' => 'push', 'amount' => 1.0, 'duration' => 8.0, 'ease' => 'move', 'delay' => 0.0]
 *     shots[i].entry  = 'fade' | 'cut' | 'slide' | 'reveal' | 'match'
 *
 * The one place the vocabulary, ranges and defaults live on the server: the editor setter, both shot
 * serializers (wizard + player) and the lesson composer read them from here.
 * resources/js/scene/camera.js plays them and carries the same lists and per-move durations;
 * ShotCameraTest holds the two files together.
 */
final class ShotCamera
{
    public const MOVES = ['hold', 'push', 'pull', 'pan-l', 'pan-r', 'tilt-up', 'tilt-down', 'truck-l', 'truck-r', 'shake'];

    /** The keys a stored `camera` may hold. */
    public const KEYS = ['move', 'amount', 'duration', 'ease', 'delay'];

    public const ENTRIES = ['fade', 'cut', 'slide', 'reveal', 'match'];

    /** The easing intents of resources/js/scene/animations.js. */
    public const EASES = ['enter', 'move', 'exit', 'pop', 'linear'];

    public const AMOUNT = [0, 2];

    /** Seconds. */
    public const DURATION = [0.3, 30];

    /** Seconds after the panel appears. */
    public const DELAY = [0, 10];

    /**
     * The defaults a control resets to (the motion-design rules, see camera.js): a camera move is
     * on-screen motion from rest to rest, so `move` easing (power2.inOut); a dolly or pan is slow and
     * shot-long, a shake is a short jolt.
     */
    public const DEFAULTS = ['move' => 'hold', 'amount' => 1.0, 'ease' => 'move', 'delay' => 0.0];

    public const DEFAULT_ENTRY = 'fade';

    /** Seconds each move takes unless a duration is set. Mirrors camera.js MOVE_DURATION_S. */
    public const MOVE_DURATION = [
        'hold' => 0.0, 'push' => 8.0, 'pull' => 8.0, 'pan-l' => 10.0, 'pan-r' => 10.0,
        'tilt-up' => 7.0, 'tilt-down' => 7.0, 'truck-l' => 10.0, 'truck-r' => 10.0, 'shake' => 1.2,
    ];

    /**
     * A stored camera as the renderers receive it, or null for a still camera. Stored data is
     * trusted only as far as these lists and ranges.
     *
     * @return array{move: string, amount: float, duration: float, ease: string, delay: float}|null
     */
    public static function payload(mixed $camera): ?array
    {
        if (! is_array($camera) || ! in_array($camera['move'] ?? null, self::MOVES, true) || $camera['move'] === 'hold') {
            return null;
        }
        $move = (string) $camera['move'];

        return [
            'move' => $move,
            'amount' => self::clamp($camera['amount'] ?? null, self::AMOUNT) ?? self::DEFAULTS['amount'],
            'duration' => self::clamp($camera['duration'] ?? null, self::DURATION) ?? self::MOVE_DURATION[$move],
            'ease' => in_array($camera['ease'] ?? null, self::EASES, true) ? (string) $camera['ease'] : self::DEFAULTS['ease'],
            'delay' => self::clamp($camera['delay'] ?? null, self::DELAY) ?? self::DEFAULTS['delay'],
        ];
    }

    /** A stored entry as the renderers receive it; null is the default fade. */
    public static function entry(mixed $entry): ?string
    {
        return in_array($entry, self::ENTRIES, true) && $entry !== self::DEFAULT_ENTRY ? (string) $entry : null;
    }

    /**
     * One editor field, validated: the clean value, or null when it is not a value this field takes.
     * `entry` is a shot key of its own; the rest live inside `camera`.
     */
    public static function field(string $key, mixed $value): string|float|null
    {
        return match ($key) {
            'move' => in_array($value, self::MOVES, true) ? (string) $value : null,
            'ease' => in_array($value, self::EASES, true) ? (string) $value : null,
            'entry' => in_array($value, self::ENTRIES, true) ? (string) $value : null,
            'amount' => self::clamp($value, self::AMOUNT),
            'duration' => self::clamp($value, self::DURATION),
            'delay' => self::clamp($value, self::DELAY),
            default => null,
        };
    }

    /**
     * A lesson spec's `camera` (and `entry`), checked strictly: a typo in a spec must fail the
     * compose, never play as a still camera.
     *
     * @return array{move: string, amount: float, duration: float, ease: string, delay: float}|null
     */
    public static function fromSpec(mixed $camera, string $where): ?array
    {
        if ($camera === null) {
            return null;
        }
        if (! is_array($camera)) {
            throw new \InvalidArgumentException("{$where}: `camera` must be an array like ['move' => 'push'].");
        }
        $unknown = array_diff(array_keys($camera), self::KEYS);
        if ($unknown !== []) {
            throw new \InvalidArgumentException("{$where}: unknown camera key(s) ".implode(', ', $unknown).'.');
        }
        if (! in_array($camera['move'] ?? null, self::MOVES, true)) {
            throw new \InvalidArgumentException("{$where}: camera move must be one of ".implode(', ', self::MOVES).'.');
        }
        if (isset($camera['ease']) && ! in_array($camera['ease'], self::EASES, true)) {
            throw new \InvalidArgumentException("{$where}: camera ease must be one of ".implode(', ', self::EASES).'.');
        }
        foreach (['amount', 'duration', 'delay'] as $k) {
            if (isset($camera[$k]) && ! is_numeric($camera[$k])) {
                throw new \InvalidArgumentException("{$where}: camera {$k} must be a number.");
            }
        }

        return self::payload($camera);
    }

    public static function entryFromSpec(mixed $entry, string $where): ?string
    {
        if ($entry === null) {
            return null;
        }
        if (! in_array($entry, self::ENTRIES, true)) {
            throw new \InvalidArgumentException("{$where}: entry must be one of ".implode(', ', self::ENTRIES).'.');
        }

        return self::entry($entry);
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
