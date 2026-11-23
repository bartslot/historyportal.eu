<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\StoryMediaKind;
use App\Enums\StoryMediaStatus;
use App\Models\StoryMediaItem;
use App\Services\Art\StyleCheck;
use App\Services\StoryVideo\StoryMediaFiles;
use App\Services\StoryVideo\StoryVideoPrompts;
use App\Services\StoryVideo\StoryVideoRun;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

/**
 * Make one character sheet or world shot through the ChatGPT route (App\Services\Imaging\ImageRoute: ChatGPT on
 * bart's Mac, or the relay from prod), never paid image credits (bart, 2026-11-21). Same prompt, same History Lines
 * reference plates and same style check as the ElevenLabs route: an off-style picture is made once more with a
 * correction naming what was off, and the last attempt is kept either way.
 *
 * ImageRoute arrives with PR #4. Until it is merged this job refuses rather than fall back to the paid API.
 */
class GenerateStoryPicture implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    private const ROUTE = 'App\\Services\\Imaging\\ImageRoute';

    public function __construct(public readonly int $itemId) {}

    /** ChatGPT takes minutes per picture; one attempt plus the redos, under the queue's retry_after on prod. */
    public function timeout(): int
    {
        $pictures = 1 + (int) config('story_video.style_redos', 1);

        return class_exists(self::ROUTE) ? (int) \call_user_func([self::ROUTE, 'jobTimeout'], 300, $pictures) : 300;
    }

    public function handle(): void
    {
        $item = StoryMediaItem::with('lesson')->find($this->itemId);
        if ($item === null || ! $item->status->isBusy() || $item->lesson === null || $item->kind->isVideo()) {
            return;
        }
        if (! class_exists(self::ROUTE) || \call_user_func([self::ROUTE, 'usesOpenAi'])) {
            $this->markFailed($item, 'The ChatGPT picture route is not set up here (IMAGE_GENERATION_DRIVER chatgpt_local or chatgpt_relay).');

            return;
        }
        $item->update(['status' => StoryMediaStatus::Generating, 'model' => 'chatgpt']);

        $run = StoryVideoRun::for($item->lesson);
        $prompt = $run->prompt($item);
        $references = $this->references($item->kind);
        $redos = (int) config('story_video.style_redos', 1);
        $correction = '';

        for ($attempt = 0; $attempt <= $redos; $attempt++) {
            $bytes = app(self::ROUTE)->make($prompt.$correction, '1536x1024', false, $references);
            $metrics = StyleCheck::metrics($bytes);
            $problems = StyleCheck::problems($metrics, sheet: $item->kind === StoryMediaKind::CharacterSheet);
            $path = StoryMediaFiles::store($item->refresh(), $bytes, 'image/png');
            $item->update(['path' => $path, 'style' => [...$metrics, 'problems' => $problems], 'attempts' => $attempt]);
            if ($problems === [] || ! $item->status->isBusy()) {
                break;
            }
            $correction = StyleCheck::correction($problems);
        }

        if ($item->refresh()->status->isBusy()) {
            $item->update(['status' => StoryMediaStatus::Ready]);
        }
    }

    public function failed(?Throwable $e): void
    {
        $item = StoryMediaItem::find($this->itemId);
        if ($item !== null && $item->status->isBusy()) {
            $this->markFailed($item, (string) $e?->getMessage());
        }
    }

    /**
     * The History Lines plates, in attach order. ChatGPT edits the first image it is given, so the prompt's
     * "take only the style from the references" carries the rest.
     *
     * @return list<array{bytes: string, name: string}>
     */
    private function references(StoryMediaKind $kind): array
    {
        $out = [];
        foreach ($kind === StoryMediaKind::CharacterSheet ? StoryVideoPrompts::SHEET_ANCHORS : StoryVideoPrompts::IMAGE_ANCHORS as $file) {
            $path = \App\Services\Art\HistoryLineStyle::anchorPath($file);
            if (is_file($path)) {
                $out[] = ['bytes' => (string) file_get_contents($path), 'name' => $file];
            }
        }

        return $out;
    }

    private function markFailed(StoryMediaItem $item, string $why): void
    {
        $item->update(['status' => StoryMediaStatus::Failed, 'generation_id' => null, 'error' => mb_substr($why, 0, 500)]);
    }
}
