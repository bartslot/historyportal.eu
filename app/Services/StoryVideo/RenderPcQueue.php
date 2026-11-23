<?php

declare(strict_types=1);

namespace App\Services\StoryVideo;

use App\Enums\StoryMediaKind;
use App\Enums\StoryMediaStatus;
use App\Models\StoryMediaItem;
use App\Services\StoryVideo\Clips\RenderPcClipDriver;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * The render PC's side of story to video. The clip items themselves are the job list: a clip queued for the
 * `render_pc` driver waits here until the PC claims it (it turns `generating` and gets a claim id), and the PC
 * finishes it with the file or with the reason it failed. The claim id travels with the finish, so a PC that
 * comes back hours later cannot overwrite a clip that was handed out again in the meantime.
 *
 * A clip the PC claimed and never returned (it was switched off mid-render) goes back in the queue after
 * story_video.render_pc.stale_minutes.
 */
final class RenderPcQueue
{
    private const SEEN_KEY = 'story-video:render-pc:seen';

    private const CLAIM_PREFIX = 'render-pc:';

    /**
     * Hand the oldest waiting clip to the PC, or null when nothing waits.
     *
     * @return array{clip: StoryMediaItem, claim: string, references: list<string>}|null
     */
    public function claim(): ?array
    {
        Cache::put(self::SEEN_KEY, now()->toIso8601String(), now()->addDays(7));
        $this->requeueStale();

        return DB::transaction(function (): ?array {
            $clip = $this->mine()->where('status', StoryMediaStatus::Queued->value)->whereNotNull('prompt')
                ->orderBy('started_at')->orderBy('id')->lockForUpdate()->with('lesson')->first();
            if ($clip === null || $clip->lesson === null) {
                return null;
            }
            $claim = self::CLAIM_PREFIX.Str::random(24);
            $clip->update(['status' => StoryMediaStatus::Generating, 'generation_id' => $claim, 'started_at' => now()]);

            return ['clip' => $clip, 'claim' => $claim, 'references' => StoryVideoRun::for($clip->lesson)->clipReferencePaths($clip)];
        });
    }

    /** Is this the claim the clip was last handed out under? */
    public function holds(StoryMediaItem $clip, string $claim): bool
    {
        return $clip->status === StoryMediaStatus::Generating && is_string($clip->generation_id)
            && str_starts_with($clip->generation_id, self::CLAIM_PREFIX) && hash_equals($clip->generation_id, $claim);
    }

    /** The PC delivers the clip. Stored like any other clip; it then waits for the teacher. */
    public function finish(StoryMediaItem $clip, UploadedFile $video): string
    {
        $dir = "lessons/{$clip->lesson_id}/scenes/{$clip->scene_id}/story-video";
        $path = $video->storeAs($dir, "{$clip->key}-".now()->format('YmdHis').'.mp4', 'public');
        $old = $clip->path;
        StoryVideoRun::for($clip->lesson)->clipFinished($clip, (string) $path);
        if ($old !== null && $old !== $path) {
            Storage::disk('public')->delete($old);
        }

        return (string) $path;
    }

    public function fail(StoryMediaItem $clip, string $why): void
    {
        StoryVideoRun::for($clip->lesson)->clipFailed($clip, 'Render PC: '.$why);
    }

    /** Clips the PC took and never brought back wait again. Returns how many. */
    public function requeueStale(): int
    {
        $minutes = max(5, (int) config('story_video.render_pc.stale_minutes', 90));

        return $this->mine()->where('status', StoryMediaStatus::Generating->value)
            ->where('started_at', '<', now()->subMinutes($minutes))
            ->update(['status' => StoryMediaStatus::Queued->value, 'generation_id' => null]);
    }

    /** When the PC last asked for work, or null when it never did (or not in the last week). */
    public function lastSeen(): ?Carbon
    {
        $seen = Cache::get(self::SEEN_KEY);

        return is_string($seen) ? Carbon::parse($seen) : null;
    }

    /** @return array{waiting: int, rendering: int, last_seen: ?Carbon} */
    public function status(): array
    {
        return [
            'waiting' => $this->mine()->where('status', StoryMediaStatus::Queued->value)->count(),
            'rendering' => $this->mine()->where('status', StoryMediaStatus::Generating->value)->count(),
            'last_seen' => $this->lastSeen(),
        ];
    }

    /**
     * Give waiting clips to another driver (the PC is off and the lesson cannot wait). Only clips that are still
     * waiting move; one the PC is rendering stays with the PC. Returns how many moved.
     */
    public function handOver(string $driver, ?int $lessonId = null): int
    {
        $ids = $this->mine()->where('status', StoryMediaStatus::Queued->value)
            ->when($lessonId, fn (Builder $q, int $id) => $q->where('lesson_id', $id))->orderBy('id')->pluck('id');
        $target = Clips\ClipDrivers::make($driver);
        $model = $target->name() === 'elevenlabs' ? (string) config('story_video.video_model') : $target->name();
        $moved = 0;
        foreach ($ids as $id) {
            // One clip at a time under the same row lock as claim(): a clip the PC took in the meantime stays with the PC.
            $clip = DB::transaction(function () use ($id, $model): ?StoryMediaItem {
                $clip = $this->mine()->whereKey($id)->where('status', StoryMediaStatus::Queued->value)->lockForUpdate()->first();
                $clip?->update(['model' => $model, 'generation_id' => null, 'started_at' => now()]);

                return $clip;
            });
            if ($clip !== null) {
                $target->start($clip);
                $moved++;
            }
        }

        return $moved;
    }

    /** @return Builder<StoryMediaItem> */
    private function mine(): Builder
    {
        return StoryMediaItem::query()->where('kind', StoryMediaKind::Clip->value)->where('model', RenderPcClipDriver::NAME);
    }
}
