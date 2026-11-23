<?php

declare(strict_types=1);

namespace App\Services\Support;

use App\Models\Scene;
use App\Services\VideoTranscoder;
use App\Support\MediaUrl;

/**
 * A scene picture that moves: a short muted MP4 loop that plays in place of the still.
 *
 * Stored on the scene as config.bg_loop = {src, poster}: `src` is the video's storage path,
 * `poster` the image_path it belongs to. The still stays the scene's picture everywhere a
 * picture is needed (rail thumbs, posters, covers, the first frame before the video is ready),
 * and the loop only plays while that same picture is still the background. A teacher who picks
 * another picture gets the new picture, never the old picture's motion over it, without every
 * background setter having to remember to clear the loop.
 *
 * An optional `av1` is the same loop as AV1, beside `src` ("x.mp4" → "x.av1.mp4", see
 * VideoTranscoder::encodeLoop). It is about a third smaller, but older Safari cannot play it, so
 * `src` (H.264) stays the loop every browser gets. The URL says an AV1 copy exists with a "#av1"
 * fragment, which a browser ignores and picture-loop.js reads, so every place that passes a loop URL
 * around keeps working unchanged.
 */
final class SceneLoop
{
    public const KEY = 'bg_loop';

    /** The loop's URL for a picture, or null when this picture has no loop. */
    public static function urlFor(?Scene $scene, ?string $picturePath): ?string
    {
        $loop = self::of($scene);
        if ($loop === null || $picturePath === null || $picturePath === '') {
            return null;
        }

        if (! self::samePicture($loop['poster'], $picturePath)) {
            return null;
        }
        $url = MediaUrl::of($loop['src']);

        return $url !== null && isset($loop['av1']) && $loop['av1'] === VideoTranscoder::av1PathFor($loop['src'])
            ? $url.'#av1'
            : $url;
    }

    /** The scene's own picture moves (the flat stage and the inspector ask this). */
    public static function urlForScene(?Scene $scene): ?string
    {
        return self::urlFor($scene, $scene?->image_path);
    }

    /**
     * The stored loop, when it is well formed.
     *
     * @return array{src: string, poster: string, av1?: string}|null
     */
    public static function of(?Scene $scene): ?array
    {
        $loop = ($scene?->config ?? [])[self::KEY] ?? null;
        if (! is_array($loop) || ! is_string($loop['src'] ?? null) || ! is_string($loop['poster'] ?? null)) {
            return null;
        }
        $out = ['src' => $loop['src'], 'poster' => $loop['poster']];
        if (is_string($loop['av1'] ?? null) && $loop['av1'] !== '') {
            $out['av1'] = $loop['av1'];
        }

        return $out;
    }

    /**
     * @param  array<string,mixed>  $config
     * @return array<string,mixed>
     */
    public static function with(array $config, string $src, string $poster, ?string $av1 = null): array
    {
        $loop = ['src' => $src, 'poster' => $poster];
        if ($av1 !== null && $av1 !== '') {
            $loop['av1'] = $av1;
        }

        return [...$config, self::KEY => $loop];
    }

    /**
     * @param  array<string,mixed>  $config
     * @return array<string,mixed>
     */
    public static function without(array $config): array
    {
        unset($config[self::KEY]);

        return $config;
    }

    /** image_path may be stored with or without the leading "/storage/"; compare the file itself. */
    private static function samePicture(string $a, string $b): bool
    {
        $norm = fn (string $p) => ltrim(preg_replace('#^/?storage/#', '', strtok($p, '?')) ?: $p, '/');

        return $norm($a) === $norm($b);
    }
}
