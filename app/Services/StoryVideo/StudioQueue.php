<?php

declare(strict_types=1);

namespace App\Services\StoryVideo;

use App\Enums\StoryMediaKind;
use App\Enums\StoryMediaStatus;
use App\Models\StoryMediaItem;
use App\Services\StoryVideo\Clips\StudioClipDriver;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * The ElevenLabs web studio's side of story to video (bart, 2026-11-23). Clips only: pictures come from ChatGPT
 * (bart, 2026-11-23, after the Recraft test was not History Lines). Clips queued for the `studio` driver wait here; bart's Mac claims them in small batches (tools/studio/studio.py pull), Claude makes each one in the studio in
 * bart's own Chrome, and the Mac sends the downloads back (studio.py push). Every item of a batch carries the batch's
 * claim, so a push hours later cannot overwrite an item that was handed out again or redone in the meantime.
 *
 * The run is open by design: it uses the studio's normal upload and download, one job at a time, and stops at the
 * first captcha or warning. Nothing here or in studio.py may hide the automation from ElevenLabs.
 */
final class StudioQueue
{
    private const CLAIM_PREFIX = 'studio:';

    /**
     * Claim up to $max waiting clips (oldest first) under one batch claim.
     *
     * @return array{claim: string, items: list<StoryMediaItem>}|null null when nothing waits
     */
    public function claim(int $max): ?array
    {
        $this->requeueStale();
        $max = max(1, min($max, (int) config('story_video.studio.max_batch', 10)));

        return DB::transaction(function () use ($max): ?array {
            $items = $this->mine()->where('status', StoryMediaStatus::Queued->value)->whereNotNull('prompt')
                ->orderBy('started_at')->orderBy('id')->limit($max)->lockForUpdate()->with('lesson')->get()
                ->filter(fn (StoryMediaItem $i) => $i->lesson !== null)->values();
            if ($items->isEmpty()) {
                return null;
            }
            $claim = self::CLAIM_PREFIX.Str::random(24);
            foreach ($items as $item) {
                $item->update(['status' => StoryMediaStatus::Generating, 'generation_id' => $claim, 'started_at' => now()]);
            }

            return ['claim' => $claim, 'items' => $items->all()];
        });
    }

    /** Is this the batch claim the item was last handed out under? */
    public function holds(StoryMediaItem $item, string $claim): bool
    {
        return $item->status === StoryMediaStatus::Generating && is_string($item->generation_id)
            && str_starts_with($item->generation_id, self::CLAIM_PREFIX) && hash_equals($item->generation_id, $claim);
    }

    /**
     * What to set in the studio for this item, in the words of its picker.
     *
     * @return array{model: string, aspect_ratio: string, resolution: string, seconds: int, audio: bool}
     */
    public function settings(StoryMediaItem $item): array
    {
        return [
            'model' => (string) config('story_video.studio.video_model'),
            'aspect_ratio' => '16:9',
            'resolution' => (string) config('story_video.video_resolution', '720p'),
            'seconds' => max((int) config('story_video.clip_min_seconds', 4), min((int) config('story_video.clip_max_seconds', 15), (int) (($item->input ?? [])['seconds'] ?? 5))),
            'audio' => false,   // narration and sound come from the lesson
        ];
    }

    /**
     * The reference pictures to attach, in the prompt's order: the scene's approved world shot, then the approved
     * sheets of the people in the beat.
     *
     * @return list<array{name: string, disk: string|null, path: string}> disk null = a file under resources/
     */
    public function references(StoryMediaItem $item): array
    {
        $paths = $item->lesson ? StoryVideoRun::for($item->lesson)->clipReferencePaths($item) : [];

        return array_map(fn (string $p) => ['name' => basename($p), 'disk' => 'public', 'path' => $p], $paths);
    }

    /** The Mac delivers what the studio made: stored like any clip, then it waits for the teacher. */
    public function finish(StoryMediaItem $item, UploadedFile $file): string
    {
        $mime = (string) ($file->getMimeType() ?: $file->getClientMimeType());
        $path = StoryMediaFiles::store($item, (string) $file->get(), $mime);
        StoryVideoRun::for($item->lesson)->clipFinished($item, $path);

        return $path;
    }

    public function fail(StoryMediaItem $item, string $why): void
    {
        StoryVideoRun::for($item->lesson)->clipFailed($item, 'Studio: '.$why);
    }

    /** Hand a whole batch back unmade (the run stopped). Returns how many items wait again. */
    public function release(string $claim): int
    {
        if (! str_starts_with($claim, self::CLAIM_PREFIX)) {
            return 0;
        }

        return $this->mine()->where('status', StoryMediaStatus::Generating->value)->where('generation_id', $claim)
            ->update(['status' => StoryMediaStatus::Queued->value, 'generation_id' => null]);
    }

    /** Batches the Mac took and never brought back wait again. Returns how many items. */
    public function requeueStale(): int
    {
        $minutes = max(30, (int) config('story_video.studio.stale_minutes', 720));

        return $this->mine()->where('status', StoryMediaStatus::Generating->value)
            ->where('started_at', '<', now()->subMinutes($minutes))
            ->update(['status' => StoryMediaStatus::Queued->value, 'generation_id' => null]);
    }

    /** @return array{waiting: int, in_batch: int} */
    public function status(): array
    {
        return [
            'waiting' => $this->mine()->where('status', StoryMediaStatus::Queued->value)->count(),
            'in_batch' => $this->mine()->where('status', StoryMediaStatus::Generating->value)->count(),
        ];
    }

    /** One reference file's bytes, for the API. */
    public function referenceBytes(array $ref): ?string
    {
        if ($ref['disk'] === null) {
            return is_file($ref['path']) ? (string) file_get_contents($ref['path']) : null;
        }
        $disk = Storage::disk($ref['disk']);

        return $disk->exists($ref['path']) ? (string) $disk->get($ref['path']) : null;
    }

    /** @return Builder<StoryMediaItem> */
    private function mine(): Builder
    {
        return StoryMediaItem::query()->where('model', StudioClipDriver::NAME)->where('kind', StoryMediaKind::Clip->value);
    }
}
