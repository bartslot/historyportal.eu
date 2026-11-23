<?php

declare(strict_types=1);

namespace App\Services\StoryVideo;

use App\Jobs\EncodeSceneLoop;
use App\Models\Scene;
use App\Services\Support\SceneLoop;
use App\Services\VideoTranscoder;
use Illuminate\Support\Facades\Storage;

/**
 * Put a finished film on a scene: it plays over the scene's picture as its moving picture (config.bg_loop).
 *
 * Writes ONLY image_path (when a poster is given) and config.bg_loop, never the scene's text or layers, so it
 * stays out of the way of a teacher editing the same scene. A film that is not yet a class file goes through
 * EncodeSceneLoop (720p 12 fps H.264 + AV1); pass $encoded with its AV1 copy when it already is one
 * (the render PC sends finished files).
 */
final class SceneFilm
{
    public static function attach(Scene $scene, string $src, ?string $poster = null, ?string $av1 = null, bool $encoded = false): void
    {
        $scene->refresh();   // the latest config, so nothing written meanwhile is lost
        $poster ??= (string) $scene->image_path;
        if ($poster === '') {
            return;   // a moving picture always belongs to a still
        }
        $old = SceneLoop::of($scene);
        $config = SceneLoop::with($scene->config ?? [], $src, $poster, $encoded ? $av1 : null);
        $scene->update(array_filter(['config' => $config, 'image_path' => $poster !== $scene->image_path ? $poster : null]));

        // Only films this pipeline made are removed when replaced; a teacher's own upload is left alone.
        if ($old !== null && $old['src'] !== $src && str_contains($old['src'], '/story-video/')) {
            Storage::disk('public')->delete(array_filter([$old['src'], $old['av1'] ?? null,
                VideoTranscoder::isEncodedLoop($old['src']) ? null : VideoTranscoder::loopPathFor($old['src'])]));
        }
        if (! $encoded) {
            EncodeSceneLoop::dispatch($scene->id, $src);
        }
    }
}
