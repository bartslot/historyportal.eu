<?php

declare(strict_types=1);

namespace App\Services\StoryVideo\Pictures;

use App\Jobs\PrepareStudioItem;
use App\Models\StoryMediaItem;

/**
 * The ElevenLabs web studio (Recraft 4.1 by default), made by hand-off: the picture waits as `queued` until bart's
 * Mac pulls it in a batch (App\Services\StoryVideo\StudioQueue). The same History Lines prompt and plates as the
 * other drivers; the delivered picture goes through the same style check.
 */
final class StudioPictureDriver implements PictureDriver
{
    public const NAME = 'studio';

    public function name(): string
    {
        return self::NAME;
    }

    public function start(StoryMediaItem $item): void
    {
        PrepareStudioItem::dispatch($item->id);
    }
}
