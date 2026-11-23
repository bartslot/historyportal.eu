<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\StoryMediaKind;
use App\Enums\StoryMediaStatus;
use App\Models\Scene;
use App\Models\StoryMediaItem;
use App\Services\StoryVideo\SceneFilm;
use App\Services\VideoTranscoder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Every clip of a scene is approved: join them, each cut to its narration beat (a short clip holds its last frame),
 * into the scene's film, and let it play over the scene's picture (the approved world shot). EncodeSceneLoop then
 * makes the 720p 12 fps H.264 and AV1 files, exactly as for an uploaded video.
 */
class AssembleSceneFilm implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    /** Below the database queue's retry_after (900 s). */
    public int $timeout = 800;

    public function __construct(public readonly int $sceneId) {}

    public function handle(): void
    {
        $scene = Scene::find($this->sceneId);
        if ($scene === null || ! is_string($scene->image_path) || $scene->image_path === '') {
            return;
        }
        $clips = StoryMediaItem::where('scene_id', $scene->id)->where('kind', StoryMediaKind::Clip->value)->orderBy('position')->get();
        if ($clips->isEmpty() || $clips->contains(fn (StoryMediaItem $c) => $c->status !== StoryMediaStatus::Approved || $c->path === null)) {
            return;   // a clip was redone after the last approval
        }

        $parts = $clips->map(fn (StoryMediaItem $c) => ['path' => (string) $c->path, 'seconds' => self::beatSeconds($c, $clips->all(), $scene)])->all();
        $out = "lessons/{$scene->lesson_id}/scenes/{$scene->id}/story-video/film-".now()->format('YmdHis').'.mp4';
        $result = VideoTranscoder::make()->assemble(array_values($parts), $out);
        if (! $result['ok'] || $result['path'] === null) {
            return;
        }

        SceneFilm::attach($scene, $result['path']);
    }

    /**
     * How long a clip stays on screen: until the next beat starts (so the film follows the narration exactly), the
     * last one until the narration ends. Without timings, its planned length.
     *
     * @param  list<StoryMediaItem>  $clips
     */
    public static function beatSeconds(StoryMediaItem $clip, array $clips, Scene $scene): float
    {
        $input = $clip->input ?? [];
        $index = array_search($clip, $clips, true);
        $next = $index === false ? null : ($clips[$index + 1] ?? null);
        $start = (float) ($input['start'] ?? 0);
        $end = $next !== null ? (float) (($next->input ?? [])['start'] ?? 0) : (float) ($scene->duration_seconds ?? 0);

        return $end > $start ? $end - $start : (float) ($input['seconds'] ?? 5);
    }
}
