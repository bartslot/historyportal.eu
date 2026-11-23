<?php

declare(strict_types=1);

namespace App\Services\StoryVideo\Pictures;

use App\Jobs\GenerateStoryMedia;
use App\Models\StoryMediaItem;

/** Nano Banana 2 through ElevenLabs' image flow. Needs the Pro plan (Creator answers 402 paid_plan_required). */
final class ElevenLabsPictureDriver implements PictureDriver
{
    public function name(): string
    {
        return 'elevenlabs';
    }

    public function start(StoryMediaItem $item): void
    {
        GenerateStoryMedia::dispatch($item->id);
    }
}
