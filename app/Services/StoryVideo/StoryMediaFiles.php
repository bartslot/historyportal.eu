<?php

declare(strict_types=1);

namespace App\Services\StoryVideo;

use App\Models\Scene;
use App\Models\StoryMediaItem;
use Illuminate\Support\Facades\Storage;

/** Where a story-to-video result is stored, whichever driver made it. */
final class StoryMediaFiles
{
    public static function store(StoryMediaItem $item, string $bytes, string $mime): string
    {
        $ext = match (true) {
            str_contains($mime, 'mp4') || $item->kind->isVideo() => 'mp4',
            str_contains($mime, 'webp') => 'webp',
            str_contains($mime, 'jpeg') || str_contains($mime, 'jpg') => 'jpg',
            default => 'png',
        };
        $dir = $item->scene_id !== null
            ? "lessons/{$item->lesson_id}/scenes/{$item->scene_id}/story-video"
            : "lessons/{$item->lesson_id}/story-video";
        // A new name per attempt: the old file may still be on screen (or approved elsewhere) while this one lands.
        $path = "{$dir}/{$item->key}-".now()->format('YmdHis').".{$ext}";
        Storage::disk('public')->put($path, $bytes);
        // The previous attempt goes, unless a scene still shows it (a remade world shot stays the scene's picture
        // until the new one is approved).
        if ($item->path !== null && $item->path !== $path && ! Scene::where('image_path', $item->path)->exists()) {
            Storage::disk('public')->delete($item->path);
        }

        return $path;
    }
}
