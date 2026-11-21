<?php

declare(strict_types=1);

namespace App\Services\Lessons;

use App\Models\Lesson;
use App\Models\Scene;
use Illuminate\Bus\Batch;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Log;

/**
 * Everything that follows a finished script: per-scene pictures and narration, then the quiz, and a
 * story game's print pack. GenerateLessonScript runs it straight away; when the teacher reviews the
 * script first, ScriptReview::approve runs it (through GenerateLessonAssets) once they approve.
 */
class LessonAssetFanOut
{
    /**
     * @param  Collection<int, Scene>|null  $scenes  the narratable scenes; null reads them from the lesson
     */
    public function run(Lesson $lesson, ?Collection $scenes = null): void
    {
        $scenes ??= $lesson->scenes()->where('kind', '!=', 'map')->orderBy('order')->get();

        // Phase 0: snapshot the run now that the scripts the visuals will illustrate exist
        // (code hashes, models, condition, visual policy — see GenerationRunRecorder).
        \App\Services\Support\GenerationRunRecorder::snapshot($lesson->fresh(['scenes']));

        $this->dispatchAssetJobs($lesson, $scenes);

        // Story-game print pack: render now that script_segments exist (event cards quote them).
        // Fire-and-forget — GenerateGamePack::failed() never fails the lesson.
        if ($lesson->hasChoices() && ! empty(($lesson->game_config ?? [])['print_pack'])) {
            \App\Jobs\GenerateGamePack::dispatch($lesson->id);
        }
    }

    /**
     * Fan out per-scene visual + audio jobs, then the quiz. Visuals use the multi-shot
     * grid pipeline when enabled (config lessons.shot_grid); scenes that already carry an
     * image (worldhistory.org hero pre-assignment) skip visual generation entirely.
     *
     * Pack-grounded lessons (story with an asset pack, E3b) assemble narration-scene
     * shots from the pack instead — those scenes dispatch ONLY audio: zero image-gen
     * calls. Non-narration scenes and pack-less lessons keep the live path unchanged.
     *
     * @param  Collection<int, Scene>  $scenes
     */
    private function dispatchAssetJobs(Lesson $lesson, Collection $scenes): void
    {
        $useShots = \App\Services\Support\GridSlicer::parseGrid((string) config('lessons.shot_grid', '3x3')) !== null;

        // Sensitive-topic gate (zero tolerance, WITH a fallback): documentary lessons never
        // route through the people-allowed narrative shot pipeline — they take the single-image
        // path, which prefers real sourced imagery and falls back to a restrained no-people
        // environment. See App\Services\SensitiveTopicPolicy + docs/experiment/phase0-protocol.md.
        $documentary = \App\Services\SensitiveTopicPolicy::isDocumentary($lesson);
        if ($documentary && $useShots) {
            Log::info("LessonAssetFanOut #{$lesson->id}: documentary visual policy — shot grids disabled for this lesson");
            $useShots = false;
        }

        $stagedSceneIds = $this->assignStageScenes($lesson, $scenes);
        $packedSceneIds = $stagedSceneIds->isEmpty() ? $this->assignPackShots($lesson, $scenes) : collect();

        $jobs = [];
        foreach ($scenes as $scene) {
            if ($stagedSceneIds->contains($scene->id)) {
                \App\Services\Support\GenerationRunRecorder::recordPath($lesson->id, $scene->id, 'stage25d');
            } elseif (! $packedSceneIds->contains($scene->id) && $scene->image_path === null) {
                $jobs[] = $useShots ? new \App\Jobs\GenerateSceneShots($scene->id) : new \App\Jobs\GenerateSceneImage($scene->id);
                \App\Services\Support\GenerationRunRecorder::recordPath(
                    $lesson->id,
                    $scene->id,
                    $useShots ? 'ai_grid' : 'single_image',
                );
            } else {
                \App\Services\Support\GenerationRunRecorder::recordPath(
                    $lesson->id,
                    $scene->id,
                    $packedSceneIds->contains($scene->id) ? 'asset_pack' : 'pre_assigned',
                );
            }
            $jobs[] = new \App\Jobs\GenerateSceneAudio($scene->id);
        }

        $lessonId = $lesson->id;
        Bus::batch($jobs)
            ->name("lesson:{$lesson->id}:scenes")
            ->then(function (Batch $batch) use ($lessonId) {
                \App\Services\Support\GenerationRunRecorder::finish($lessonId);
                \App\Jobs\GenerateLessonQuiz::dispatch($lessonId);
            })
            ->dispatch();
    }

    /**
     * A 3D lesson (image_style stage25d): every story scene becomes a stage25d scene built from the era's painted
     * bundle (StageSet::forScene, by the scene's own words: free, no image generation). Its narration and the quiz
     * are generated as for any lesson. No bundle for the era (it changed after the teacher chose 3D): pictures.
     *
     * @param  Collection<int, Scene>  $scenes
     * @return Collection<int, int> ids of the scenes now on the stage
     */
    private function assignStageScenes(Lesson $lesson, Collection $scenes): Collection
    {
        if ($lesson->image_style !== \App\Services\Support\ImageStyleTemplate::STAGE) {
            return collect();
        }
        $bundle = \App\Support\LibraryEra::stageBundleFor($lesson);
        if ($bundle === null) {
            Log::warning("LessonAssetFanOut #{$lesson->id}: 3D chosen but the era has no stage bundle; pictures instead");

            return collect();
        }

        // A retry finds the scenes an earlier attempt already put on the stage: they keep their set, and stay off
        // the image path.
        $story = $scenes->filter(fn (Scene $scene) => in_array($scene->kind, ['narration', 'stage25d'], true))->values();
        foreach ($story as $i => $scene) {
            if ($scene->kind === 'stage25d') {
                continue;
            }
            $words = implode(' ', array_filter([$scene->image_prompt, $scene->location, $scene->script_segment]));
            $scene->update([
                'kind' => 'stage25d',
                'config' => [...((array) $scene->config), 'stage25d' => \App\Services\Stage25d\StageSet::forScene($bundle, 's'.$scene->order, $words, $i)],
            ]);
        }
        Log::info("[stage25d] lesson {$lesson->id}: {$story->count()} scenes built from {$bundle} — 0 image-gen calls");

        return $story->pluck('id');
    }

    /**
     * E3b: when the lesson's story carries an asset pack, visualize narration scenes
     * from the pack (one cheap LLM mapping call, zero image generation).
     *
     * @param  Collection<int, Scene>  $scenes
     * @return Collection<int, int> ids of scenes whose visuals came from the pack
     */
    private function assignPackShots(Lesson $lesson, Collection $scenes): Collection
    {
        if (empty(((array) ($lesson->story?->assets ?? []))['backgrounds'] ?? null)) {
            return collect();
        }

        // Game scenes get a pack background too (hero never assigned there) — their
        // backdrop was the last remaining per-lesson image spend on packed lessons.
        $narration = $scenes->filter(fn (Scene $scene) => in_array($scene->kind, ['narration', 'game'], true))->values();
        if ($narration->isEmpty()) {
            return collect();
        }

        $count = app(\App\Services\StoryPackShots::class)->assign($lesson, $narration);
        if ($count === 0) {
            return collect();
        }

        Log::info("[pack] lesson {$lesson->id}: {$count} scenes visualized from story pack — 0 image-gen calls");

        return $narration->pluck('id');
    }
}
