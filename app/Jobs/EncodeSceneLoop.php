<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Scene;
use App\Services\Support\SceneLoop;
use App\Services\VideoTranscoder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

/**
 * Turn a scene's uploaded moving picture into the small class files (VideoTranscoder::encodeLoop):
 * a 720p 12 fps silent H.264 loop and its AV1 copy. Queued, so the upload itself stays quick; the
 * scene plays the upload as it is until this finishes.
 *
 * The scene is only repointed while it still plays the same upload. A teacher who dropped another
 * video or stopped the motion in the meantime keeps their choice, and the files made here for the
 * old upload are removed.
 */
class EncodeSceneLoop implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    /** Below the database queue's retry_after (900 s), so a slow encode is never run twice at once. */
    public int $timeout = 800;

    public function __construct(public readonly int $sceneId, public readonly string $upload) {}

    public function handle(): void
    {
        $scene = Scene::find($this->sceneId);
        $loop = SceneLoop::of($scene);
        if ($scene === null || $loop === null || $loop['src'] !== $this->upload) {
            return;
        }

        $result = VideoTranscoder::make()->encodeLoop($this->upload);
        if (! $result['ok'] || $result['src'] === null) {
            return;   // the upload keeps playing as it is
        }

        $scene->refresh();
        $now = SceneLoop::of($scene);
        $made = array_filter([$result['src'] !== $this->upload ? $result['src'] : null, $result['av1']]);
        if ($now === null || $now['src'] !== $this->upload) {
            Storage::disk('public')->delete($made);

            return;
        }

        $scene->update(['config' => SceneLoop::with($scene->config ?? [], $result['src'], $now['poster'], $result['av1'])]);
        if ($result['src'] !== $this->upload) {
            Storage::disk('public')->delete($this->upload);
        }
    }
}
