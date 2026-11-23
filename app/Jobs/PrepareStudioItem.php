<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\StoryMediaStatus;
use App\Models\StoryMediaItem;
use App\Services\Llm\Llm;
use App\Services\OpenAiLlmService;
use App\Services\StoryVideo\StoryVideoRun;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

/**
 * Write the prompt of an item the studio will make (a clip's shot plan comes from the script model). Only an item
 * that has its prompt is handed out in a batch (StudioQueue::claim), so pulling a batch never waits on the model.
 */
class PrepareStudioItem implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public int $timeout = 300;

    public function __construct(public readonly int $itemId) {}

    public function handle(#[Llm('script')] OpenAiLlmService $llm): void
    {
        $item = StoryMediaItem::with('lesson')->find($this->itemId);
        if ($item === null || $item->lesson === null || $item->status !== StoryMediaStatus::Queued) {
            return;   // removed, redone or switched to another driver meanwhile
        }
        StoryVideoRun::for($item->lesson)->prompt($item, $llm);
    }

    public function failed(?Throwable $e): void
    {
        $item = StoryMediaItem::with('lesson')->find($this->itemId);
        if ($item !== null && $item->lesson !== null) {
            StoryVideoRun::for($item->lesson)->clipFailed($item, 'The prompt could not be written: '.(string) $e?->getMessage());
        }
    }
}
