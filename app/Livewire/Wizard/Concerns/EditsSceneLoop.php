<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Jobs\EncodeSceneLoop;
use App\Services\Support\SceneLoop;
use App\Services\Support\WebpEncoder;
use App\Services\VideoTranscoder;
use App\Support\UploadLimit;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * An MP4 dropped on a scene becomes its moving picture (Bart, 2026-11-21: "make sure our story also
 * accepts mp4"). It plays muted and looping where the still would show, in the editor and in class.
 *
 * The video's first frame becomes the scene's picture, so everything that needs a still (rail,
 * poster, cover, the moment before the video has loaded) has one, and figures keep standing on it.
 * See SceneLoop for how the two stay paired.
 */
trait EditsSceneLoop
{
    /** What we take for a dropped video, before PHP gets a say (UploadLimit takes the smaller). */
    private const LOOP_VIDEO_CEILING_BYTES = 50 * 1024 * 1024;   // Livewire's own temporary-upload cap (config/livewire.php)

    // application/mp4 is what file sniffing reports for some MP4s that carry no audio track.
    private const LOOP_VIDEO_MIMES = 'video/mp4,application/mp4,video/webm,video/quicktime';

    /** Does the open picker take a video? Only for the scene's own picture: background or slide. */
    public function pickerTakesVideo(): bool
    {
        return in_array($this->paintingPickerMode, ['background', 'layer'], true);
    }

    /** The largest video this server takes, for the picker's hint: "50 MB", or less when PHP says so. */
    public function loopVideoLimit(): string
    {
        return UploadLimit::human(self::LOOP_VIDEO_CEILING_BYTES);
    }

    /** Is the file waiting in this upload property a video, not a picture? */
    private function isDroppedVideo(string $property): bool
    {
        $file = $this->{$property};

        if (! is_object($file) || ! method_exists($file, 'getMimeType')) {
            return false;
        }
        $mime = (string) $file->getMimeType();

        return str_starts_with($mime, 'video/') || $mime === 'application/mp4';
    }

    /** Store the dropped video as the selected scene's moving picture, or say why not. */
    private function applyDroppedLoop(string $property): void
    {
        if (! $this->selectedSceneId) {
            $this->reset($property);
            $this->dispatch('toast', message: __('Select a scene first, then drop the video on it.'), type: 'warning');

            return;
        }
        $scene = $this->lesson->scenes()->findOrFail($this->selectedSceneId);
        if (\App\Services\Support\SceneSplit::of($scene->config)) {
            // ponytail: one loop per scene, keyed on the scene picture; per-panel loops when asked for.
            $this->reset($property);
            $this->dispatch('toast', message: __('A moving picture goes on a scene with one picture, not on comic panels.'), type: 'warning');

            return;
        }
        if (! $scene->image_path && $this->showsAPicture($scene)) {
            // A map or voyage draws its own backdrop; a video there would turn it into a slideshow.
            $this->reset($property);
            $this->dispatch('toast', message: __('A moving picture goes on a scene with a picture.'), type: 'warning');

            return;
        }

        try {
            $this->validate([
                $property => 'file|mimetypes:'.self::LOOP_VIDEO_MIMES.'|max:'.UploadLimit::kilobytes(self::LOOP_VIDEO_CEILING_BYTES),
            ]);
        } catch (ValidationException $e) {
            $this->reset($property);
            $this->dispatch('toast', message: $e->validator->errors()->first($property), type: 'error');

            return;
        }

        $mime = (string) $this->{$property}->getMimeType();
        $dir = "lessons/{$this->lesson->id}/uploads";
        $video = $this->{$property}->storeAs($dir, Str::random(40).'.mp4', 'public');
        $this->reset($property);
        if (! $video) {
            $this->dispatch('toast', message: __('The video could not be saved. Try again.'), type: 'error');

            return;
        }

        // The small class files (720p 12 fps H.264 + AV1) are made by a queued job once the scene
        // points at the upload; until then the upload plays as it is.
        $transcoder = VideoTranscoder::make();

        // The first frame is the scene's still. Without ffmpeg the picture already there stays.
        $frame = $transcoder->firstFrame(Storage::disk('public')->path($video));
        if ($frame !== null) {
            $this->applyUploadedBackground(WebpEncoder::put($frame, $dir.'/'.Str::random(40), 'jpg'));
            $scene->refresh();
        }
        // Without a first frame the video is laid on the picture already there, which only makes
        // sense for an MP4 (a browser plays H.264 everywhere; WebM and QuickTime it may not).
        if ($frame === null && $scene->image_path && $mime !== 'video/mp4' && $mime !== 'application/mp4') {
            Storage::disk('public')->delete($video);
            $this->dispatch('toast', message: __('This server cannot read the video. Use an MP4.'), type: 'error');

            return;
        }
        if (! $scene->image_path) {
            Storage::disk('public')->delete($video);
            $this->dispatch('toast', message: __('This server cannot read the video. Add a picture first, then drop the video on it.'), type: 'error');

            return;
        }

        $scene->update(['config' => SceneLoop::with($scene->config ?? [], $video, $scene->image_path)]);
        EncodeSceneLoop::dispatch($scene->id, $video);
        $this->selectSceneInternal($scene->id);
        $this->dispatch('toast', message: __('The picture moves.'), type: 'success');
    }

    /** "Stop moving": the still stays, the loop goes. */
    public function removeBackgroundLoop(): void
    {
        if (! $this->selectedSceneId) {
            return;
        }
        $scene = $this->lesson->scenes()->findOrFail($this->selectedSceneId);
        if (SceneLoop::of($scene) === null) {
            return;
        }
        $scene->update(['config' => SceneLoop::without($scene->config ?? [])]);
        $this->selectSceneInternal($scene->id);
    }
}
