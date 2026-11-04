<?php

declare(strict_types=1);

namespace App\Services\Stage25d;

use App\Models\Scene;
use Illuminate\Support\Facades\Storage;

/**
 * The picture of a stage25d scene's first frame: the editor rail's thumbnail and the player's fallback
 * when WebGL fails. The browser renders it (only a browser has the stage) and posts it here; the file
 * name carries a hash of the scene's stage block, so a changed scene is known to need a new one.
 */
final class SceneStill
{
    /** A 480 px wide JPEG is ~30 KB; refuse anything bigger than this. */
    private const MAX_BYTES = 300_000;

    /** As many as a teacher can undo back through, more or less (SceneHistory). */
    private const KEEP = 20;

    public static function hash(Scene $scene): string
    {
        return substr(sha1((string) json_encode($scene->config['stage25d'] ?? [])), 0, 8);
    }

    public static function isFresh(Scene $scene): bool
    {
        // The file too: an undo restores the old image_path of a picture that was replaced since.
        return filled($scene->image_path)
            && str_contains($scene->image_path, '/still-'.self::hash($scene).'.jpg')
            && Storage::disk('public')->exists($scene->image_path);
    }

    /**
     * Store a posted `data:image/jpeg;base64,...` as the scene's still. $expectHash: the hash the browser was
     * given with the scene's config; when the scene changed since, the picture is stale and is dropped.
     */
    public static function store(Scene $scene, string $dataUrl, ?string $expectHash = null): bool
    {
        if (! $scene->isStage25d() || ($expectHash !== null && $expectHash !== self::hash($scene))) {
            return false;
        }
        if (preg_match('#^data:image/jpeg;base64,([A-Za-z0-9+/=]+)$#', $dataUrl, $m) !== 1) {
            return false;
        }
        $bytes = base64_decode($m[1], true);
        if ($bytes === false || strlen($bytes) > self::MAX_BYTES || ! str_starts_with($bytes, "\xFF\xD8")) {
            return false;
        }
        $dir = "lessons/{$scene->lesson_id}/scenes/{$scene->id}";
        $path = "{$dir}/still-".self::hash($scene).'.jpg';
        $disk = Storage::disk('public');
        $disk->put($path, $bytes);
        self::prune($dir);
        // Quietly: a thumbnail is not a teacher's edit, so it is no undo step and bumps nothing.
        $scene->image_path = $path;
        $scene->saveQuietly();

        return true;
    }

    /** Only the newest stills stay. Not just the last one: an undo points the scene back at the picture before it. */
    private static function prune(string $dir): void
    {
        $disk = Storage::disk('public');
        collect($disk->files($dir))
            ->filter(fn (string $file) => str_contains($file, '/still-'))
            ->sortByDesc(fn (string $file) => $disk->lastModified($file))
            ->slice(self::KEEP)
            ->each(fn (string $file) => $disk->delete($file));
    }
}
