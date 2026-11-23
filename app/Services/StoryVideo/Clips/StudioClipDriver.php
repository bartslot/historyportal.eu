<?php

declare(strict_types=1);

namespace App\Services\StoryVideo\Clips;

use App\Jobs\PrepareStudioItem;
use App\Models\StoryMediaItem;

/**
 * The ElevenLabs web studio, made by hand-off: the clip waits as `queued` until bart's Mac pulls it in a batch
 * (App\Services\StoryVideo\StudioQueue, tools/studio/studio.py). Only the prompt is written here.
 */
final class StudioClipDriver implements ClipDriver
{
    public const NAME = 'studio';

    public function name(): string
    {
        return self::NAME;
    }

    public function start(StoryMediaItem $clip): void
    {
        PrepareStudioItem::dispatch($clip->id);
    }
}
