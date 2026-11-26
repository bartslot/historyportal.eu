<?php

declare(strict_types=1);

namespace App\Services\StoryVideo;

use App\Models\Scene;
use App\Services\VideoTranscoder;
use Illuminate\Http\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Put a film that was made outside the pipeline on a scene, with nobody uploading it in the editor: from the
 * render PC's API, or from a file on this machine (`php artisan media:attach`). A scene without a picture takes
 * the film's first frame as its picture, because a moving picture always belongs to a still.
 */
final class SceneFilmUpload
{
    /** The stored path, or null when the scene has no picture and none could be taken from the film. */
    public function attach(Scene $scene, UploadedFile|File $film): ?string
    {
        $disk = Storage::disk('public');
        $dir = "lessons/{$scene->lesson_id}/scenes/{$scene->id}/story-video";
        $path = (string) $disk->putFileAs($dir, $film, 'film-'.now()->format('YmdHis').'.mp4');

        $poster = null;
        if (! is_string($scene->image_path) || $scene->image_path === '') {
            $frame = VideoTranscoder::make()->firstFrame($disk->path($path));
            if ($frame === null) {
                $disk->delete($path);

                return null;
            }
            $poster = "{$dir}/film-poster-".now()->format('YmdHis').'.jpg';
            $disk->put($poster, $frame);
        }
        SceneFilm::attach($scene, $path, $poster);

        return $path;
    }
}
