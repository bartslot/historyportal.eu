<?php

declare(strict_types=1);

namespace App\Services\Support;

use App\Support\MediaUrl;
use InvalidArgumentException;

/**
 * A layer drawn from a sprite sheet: the sails of a ship that swell with the power meter's wind
 * (Bart 2026-10-18), or any cut-out that loops a few frames.
 *
 * The sheet is a library file beside the layer's picture, `<name>.frames.webp` (ImportIconLibrary
 * copies it next to the stored picture, like a depth map): a grid of `count` cells, `columns` wide,
 * each the size of the picture itself. The layer stores `frames: {path, count, columns}`; how it
 * plays is the teacher's, on two flat keys the editor writes like any other layer setting:
 *
 *   frames_play  'wind' (follows the moment's wind, 0..1: slack to billowing), 'loop' (plays round
 *                at frames_fps; one row only) or 'off' (the picture as it is)
 *   frames_fps   1..24
 *
 * resources/js/scene/layer-frames.js plays it; both serializers (wizard + player) and the composer
 * read the shape from here.
 */
final class LayerFrames
{
    public const PLAYS = ['wind', 'loop', 'off'];

    public const COUNT = [2, 64];

    public const FPS = [1, 24];

    /** The sheet's file beside a stored picture: "a/ship.webp" -> "a/ship.frames.webp". */
    public static function sheetPath(string $picturePath): string
    {
        return preg_replace('/\.[^.\/]+$/', '', $picturePath).'.frames.webp';
    }

    /**
     * A spec's `frames` entry, checked: a count and columns that do not make a grid fail the compose.
     *
     * @return array{count: int, columns: int}
     */
    public static function spec(mixed $raw, string $where): array
    {
        $count = is_array($raw) ? ($raw['count'] ?? null) : null;
        if (! is_int($count) || $count < self::COUNT[0] || $count > self::COUNT[1]) {
            throw new InvalidArgumentException("{$where}: frames.count must be a whole number from 2 to 64.");
        }
        $columns = $raw['columns'] ?? $count;
        if (! is_int($columns) || $columns < 1 || $columns > $count) {
            throw new InvalidArgumentException("{$where}: frames.columns must be a whole number from 1 to frames.count.");
        }

        return ['count' => $count, 'columns' => $columns];
    }

    /**
     * The sheet as the renderers receive it, or null (no sheet, or junk in the stored data).
     *
     * @param  array<string, mixed>  $layer
     * @return array{frames: ?array{url: string, count: int, columns: int, play: string, fps: float}}
     */
    public static function payload(array $layer, int|string|null $version = null): array
    {
        $f = $layer['frames'] ?? null;
        $path = is_array($f) ? ($f['path'] ?? null) : null;
        $count = is_array($f) && is_numeric($f['count'] ?? null) ? (int) $f['count'] : 0;
        if (! is_string($path) || $path === '' || str_contains($path, '..') || $count < self::COUNT[0] || $count > self::COUNT[1]) {
            return ['frames' => null];
        }
        $columns = is_numeric($f['columns'] ?? null) ? max(1, min($count, (int) $f['columns'])) : $count;
        $play = in_array($layer['frames_play'] ?? null, self::PLAYS, true) ? $layer['frames_play'] : 'wind';
        $fps = is_numeric($layer['frames_fps'] ?? null) ? max((float) self::FPS[0], min((float) self::FPS[1], (float) $layer['frames_fps'])) : 8.0;

        return ['frames' => [
            'url' => (string) MediaUrl::versioned($path, $version),
            'count' => $count,
            'columns' => $columns,
            'play' => $play,
            'fps' => $fps,
        ]];
    }
}
