<?php

declare(strict_types=1);

namespace App\Services\StoryVideo\Clips;

use App\Models\StoryMediaItem;

/**
 * Who makes a clip for one narration beat. `elevenlabs` (Seedance through the flows API) now; a `render_pc`
 * driver (MiniMax on the render PC, polled through a token-guarded relay) can follow without touching the rest.
 *
 * start() takes a queued clip item and must, sooner or later, end in StoryVideoRun::clipFinished() with the
 * stored file, or StoryVideoRun::clipFailed(). Putting the finished film on the scene is a separate step
 * (SceneFilm::attach), so a driver never writes to a scene.
 */
interface ClipDriver
{
    public function name(): string;

    public function start(StoryMediaItem $clip): void;
}
