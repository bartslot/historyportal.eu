<?php

declare(strict_types=1);

namespace App\Services\StoryVideo\Pictures;

use App\Jobs\GenerateStoryPicture;
use App\Models\StoryMediaItem;

/** The ChatGPT route (App\Services\Imaging\ImageRoute): ChatGPT on bart's Mac, or the relay from prod. */
final class ChatGptPictureDriver implements PictureDriver
{
    public function name(): string
    {
        return 'chatgpt';
    }

    public function start(StoryMediaItem $item): void
    {
        GenerateStoryPicture::dispatch($item->id);
    }
}
