<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\StoryMediaStatus;
use App\Models\StoryMediaItem;
use App\Services\Art\StyleCheck;
use App\Services\Llm\Llm;
use App\Services\OpenAiLlmService;
use App\Services\StoryVideo\ElevenLabsMedia;
use App\Services\StoryVideo\StoryVideoRun;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Make one story-to-video item through ElevenLabs, without holding a worker while it renders: the first run
 * creates the generation and puts itself back on the queue; each later run polls once and either waits again,
 * stores the result, or marks the item failed. Prod's worker runs every minute from the scheduler, so a wait
 * is a short release, never a sleep.
 *
 * Pictures get the History Lines style check; an off-style one is made again with a correction naming what was
 * off (story_video.style_redos times), and the last attempt is kept either way so the teacher still judges it.
 */
class GenerateStoryMedia implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** Releases count as attempts; the real limit is retryUntil(). */
    public int $tries = 0;

    public int $maxExceptions = 2;

    /** Well under the database queue's retry_after (900 s): a create, a poll or a download. */
    public int $timeout = 300;

    public function __construct(public readonly int $itemId) {}

    public function retryUntil(): \DateTimeInterface
    {
        return now()->addMinutes((int) config('story_video.give_up_after_minutes', 30) + 5);
    }

    public function handle(#[Llm('script')] OpenAiLlmService $llm): void
    {
        $item = StoryMediaItem::with('lesson')->find($this->itemId);
        if ($item === null || ! $item->status->isBusy() || $item->lesson === null) {
            return;   // removed, redone or approved meanwhile
        }
        $media = ElevenLabsMedia::make();
        $kind = $item->kind->isVideo() ? ElevenLabsMedia::VIDEO : ElevenLabsMedia::IMAGE;

        if ($item->started_at !== null && $item->started_at->diffInMinutes(now()) > (int) config('story_video.give_up_after_minutes', 30)) {
            $this->markFailed($item, 'It took too long and was stopped.');

            return;
        }

        if ($item->generation_id === null) {
            $run = StoryVideoRun::for($item->lesson);
            $prompt = $run->prompt($item, $llm);
            $correction = StyleCheck::correction((array) (($item->style ?? [])['problems'] ?? []));
            $id = $media->create($kind, $run->body($item, $prompt.($item->attempts > 0 ? $correction : '')));
            $item->update(['generation_id' => $id, 'status' => StoryMediaStatus::Generating, 'model' => (string) config($item->kind->isVideo() ? 'story_video.video_model' : 'story_video.image_model')]);
            $this->wait($item);

            return;
        }

        $state = $media->poll($kind, $item->generation_id);
        if (in_array($state['status'], ['pending', 'generating'], true)) {
            $this->wait($item);

            return;
        }
        if ($state['status'] !== 'completed' || $state['url'] === null) {
            $this->markFailed($item, $state['error'] ?: 'ElevenLabs could not make it.');

            return;
        }

        $bytes = $media->download($state['url']);
        $path = $this->store($item, $bytes, (string) ($state['mime'] ?? ''));

        if ($item->kind->isVideo()) {
            $item->update(['path' => $path, 'status' => StoryMediaStatus::Ready, 'generation_id' => null]);

            return;
        }

        $metrics = StyleCheck::metrics($bytes);
        $problems = StyleCheck::problems($metrics, sheet: $item->kind === \App\Enums\StoryMediaKind::CharacterSheet);
        $item->update(['path' => $path, 'style' => [...$metrics, 'problems' => $problems], 'generation_id' => null]);

        if ($problems !== [] && $item->attempts < (int) config('story_video.style_redos', 1)) {
            $item->update(['attempts' => $item->attempts + 1, 'status' => StoryMediaStatus::Queued]);
            self::dispatch($item->id);

            return;
        }
        $item->update(['status' => StoryMediaStatus::Ready]);
    }

    public function failed(?Throwable $e): void
    {
        $item = StoryMediaItem::find($this->itemId);
        if ($item !== null && $item->status->isBusy()) {
            $item->update(['status' => StoryMediaStatus::Failed, 'generation_id' => null, 'error' => mb_substr((string) $e?->getMessage(), 0, 500)]);
        }
    }

    private function wait(StoryMediaItem $item): void
    {
        $delay = (int) config($item->kind->isVideo() ? 'story_video.poll_video_seconds' : 'story_video.poll_image_seconds', 10);
        if ($this->job !== null) {
            $this->release($delay);
        } else {
            self::dispatch($item->id)->delay(now()->addSeconds($delay));   // run synchronously (tests, tinker)
        }
    }

    private function markFailed(StoryMediaItem $item, string $why): void
    {
        $item->update(['status' => StoryMediaStatus::Failed, 'generation_id' => null, 'error' => mb_substr($why, 0, 500)]);
    }

    private function store(StoryMediaItem $item, string $bytes, string $mime): string
    {
        $ext = match (true) {
            str_contains($mime, 'mp4') || $item->kind->isVideo() => 'mp4',
            str_contains($mime, 'webp') => 'webp',
            str_contains($mime, 'jpeg') || str_contains($mime, 'jpg') => 'jpg',
            default => 'png',
        };
        $dir = $item->scene_id !== null
            ? "lessons/{$item->lesson_id}/scenes/{$item->scene_id}/story-video"
            : "lessons/{$item->lesson_id}/story-video";
        // A new name per attempt: the old file may still be on screen (or approved elsewhere) while this one lands.
        $path = "{$dir}/{$item->key}-".now()->format('YmdHis').".{$ext}";
        Storage::disk('public')->put($path, $bytes);
        if ($item->path !== null && $item->path !== $path && $item->status !== StoryMediaStatus::Approved) {
            Storage::disk('public')->delete($item->path);
        }

        return $path;
    }
}
