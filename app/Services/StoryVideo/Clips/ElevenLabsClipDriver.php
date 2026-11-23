<?php

declare(strict_types=1);

namespace App\Services\StoryVideo\Clips;

use App\Jobs\GenerateStoryMedia;
use App\Models\StoryMediaItem;

/** Seedance 2 Fast through ElevenLabs' video flow (GenerateStoryMedia creates, polls and stores). */
final class ElevenLabsClipDriver implements ClipDriver
{
    public function name(): string
    {
        return 'elevenlabs';
    }

    public function start(StoryMediaItem $clip): void
    {
        GenerateStoryMedia::dispatch($clip->id);
    }
}
