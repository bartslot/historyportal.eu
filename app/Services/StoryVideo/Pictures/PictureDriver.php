<?php

declare(strict_types=1);

namespace App\Services\StoryVideo\Pictures;

use App\Models\StoryMediaItem;

/**
 * Who makes a character sheet or a world shot. `chatgpt` (the ChatGPT route: on bart's Mac locally, or through
 * the relay from prod; never paid credits) by default; `elevenlabs` (Nano Banana 2 through the flows API, which
 * needs the ElevenLabs Pro plan). Every driver sends the same History Lines prompt and reference plates, and every
 * result goes through the same style check.
 */
interface PictureDriver
{
    public function name(): string;

    public function start(StoryMediaItem $item): void;
}
