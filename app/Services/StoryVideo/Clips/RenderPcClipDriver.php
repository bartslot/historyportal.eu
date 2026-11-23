<?php

declare(strict_types=1);

namespace App\Services\StoryVideo\Clips;

use App\Jobs\PrepareRenderPcClip;
use App\Models\StoryMediaItem;

/**
 * MiniMax on the render PC. Nothing is sent to the PC: the clip waits as `queued` until the PC's own worker
 * (tools/render-pc/render_worker.py) asks for it, renders it and sends it back (App\Services\StoryVideo\RenderPcQueue).
 * So a batch never depends on a Mac session, and a PC that is off just leaves clips waiting.
 */
final class RenderPcClipDriver implements ClipDriver
{
    public const NAME = 'render_pc';

    public function name(): string
    {
        return self::NAME;
    }

    public function start(StoryMediaItem $clip): void
    {
        // The staging is written by the script model, which can take a while: do it on the queue, not when the PC asks.
        PrepareRenderPcClip::dispatch($clip->id);
    }
}
