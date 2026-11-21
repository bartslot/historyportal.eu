<?php

declare(strict_types=1);

namespace App\Livewire\Wizard;

use App\Enums\LessonStatus;
use App\Jobs\BuildLessonOutline;
use App\Jobs\GenerateSceneAudio;
use App\Jobs\GenerateSceneImage;
use App\Jobs\GenerateSceneScript;
use App\Models\Lesson;
use App\Models\Scene;
use App\Services\LessonGenerationRecovery;
use App\Services\Lessons\ScriptReview;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Validate;
use Livewire\Component;

class Step2Generate extends Component
{
    private const STALL_THRESHOLDS = [
        LessonStatus::SourceReady->value => 3,
        LessonStatus::FetchingSources->value => 6,
        LessonStatus::Outlining->value => 6,
        LessonStatus::ScenesGenerating->value => 15,
    ];

    public Lesson $lesson;

    /** What the teacher asks the assistant to change in the script (ScriptReview). */
    #[Validate('required|string|min:3|max:2000')]
    public string $changeRequest = '';

    public function mount(Lesson $lesson): void
    {
        abort_unless(auth()->user()?->canManage($lesson), 403);
        $this->lesson = $lesson;

        // Claim this step in the parent's authoritative DB pointer.
        if ((int) $lesson->wizard_step !== 3) {
            $lesson->update(['wizard_step' => 3]);
        }
    }

    #[Computed]
    public function scenes()
    {
        return $this->lesson->scenes()->ordered()->get();
    }

    #[Computed]
    public function canContinue(): bool
    {
        // Something finished generating → there is a lesson to configure.
        if ($this->lesson->scenes()->where('status', 'ready')->exists()) {
            return true;
        }

        // A FAILED generation must not trap the teacher. The failure panel tells them they can
        // "continue and build the lesson yourself", but generation can die before creating a single
        // scene — and then this returned false, so the only offered escape hatch was greyed out and
        // the wizard was a dead end. Let them into the editor to build by hand.
        return $this->lesson->status === LessonStatus::Failed;
    }

    /**
     * Auto-advance only while scenes are still being generated. Once every scene is ready
     * (ScenesReady) or the teacher has moved on to configure/preview/publish, stop — otherwise
     * navigating BACK to step 2 bounces them forward to step 3 again (the reported bug).
     */
    #[Computed]
    public function autoAdvanceActive(): bool
    {
        return ! in_array($this->lesson->status, [
            LessonStatus::ScenesReady,
            LessonStatus::Configuring,
            LessonStatus::Previewable,
            LessonStatus::Ready,
            LessonStatus::Published,
            // Never skate past a failure. canContinue() is deliberately true for a failed lesson so
            // the teacher can choose to build by hand — but that must stay a CHOICE, or the poll
            // would redirect them off the error screen before they ever read what went wrong.
            LessonStatus::Failed,
            // The script waits for the teacher: nothing to advance to until they approve it.
            LessonStatus::ScriptReview,
        ], true);
    }

    /** The teacher is reading the script (ScriptReview). */
    #[Computed]
    public function reviewingScript(): bool
    {
        return $this->lesson->status === LessonStatus::ScriptReview;
    }

    /** The assistant is rewriting the script: poll until its answer lands. */
    #[Computed]
    public function revisingScript(): bool
    {
        return $this->reviewingScript && ScriptReview::isRevising($this->lesson);
    }

    /** @return list<array{role: string, text: string}> */
    #[Computed]
    public function reviewMessages(): array
    {
        return array_values((array) ($this->lesson->script_review['messages'] ?? []));
    }

    /** Re-read the lesson while the assistant works, without the generation auto-advance. */
    public function refreshReview(): void
    {
        $this->lesson->refresh();
        unset($this->scenes, $this->reviewingScript, $this->revisingScript, $this->reviewMessages);
    }

    public function requestScriptChanges(): void
    {
        $this->validate();
        ScriptReview::requestChanges($this->lesson, trim($this->changeRequest));
        $this->changeRequest = '';
        $this->refreshReview();
    }

    public function saveSceneScript(int $sceneId, string $text): void
    {
        ScriptReview::saveScene($this->lesson, $sceneId, mb_substr($text, 0, 6000));
        $this->refreshReview();
    }

    public function approveScript(): void
    {
        ScriptReview::approve($this->lesson);
        $this->refreshReview();
    }

    /**
     * Called on every wire:poll tick.
     * Auto-advance to step 3 the moment the first scene is ready so the teacher
     * doesn't have to wait for ALL scenes to finish before clicking Continue.
     */
    public function checkAndAutoAdvance(): void
    {
        $this->lesson->refresh();

        if (! $this->autoAdvanceActive) {
            return;
        }

        if ($this->canContinue) {
            $this->continueToConfigure();
        }
    }

    #[Computed]
    public function overallProgress(): int
    {
        // Only narration ("script") scenes generate script/image/audio. Map and game scenes have
        // none, so counting them would cap progress below 100% even when every real scene is done.
        // A 3D lesson's story scenes become stage25d once scripted: still generated, their stage is the picture.
        $scenes = $this->scenes->whereIn('kind', ['narration', 'stage25d'])->values();
        if ($scenes->isEmpty()) {
            // No narration scenes at all (e.g. a command-built voyage lesson): nothing generates,
            // so the lesson is "done" as soon as its scenes are ready — never stuck at 0%.
            return $this->scenes->isNotEmpty() && $this->scenes->every(fn ($s) => $s->status === 'ready') ? 100 : 0;
        }

        $total = $scenes->count() * 3;
        $done = 0;
        foreach ($scenes as $s) {
            if ((string) $s->script_segment !== '') {
                $done++;
            }
            if ($s->image_path !== null || $s->kind === 'stage25d') {
                $done++;
            }
            if ($s->audio_path !== null) {
                $done++;
            }
        }

        return (int) floor(($done / max(1, $total)) * 100);
    }

    #[Computed]
    public function isStalled(): bool
    {
        $threshold = self::STALL_THRESHOLDS[$this->lesson->status->value] ?? null;
        if ($threshold === null) {
            return false;
        }

        return $this->latestProgressAt()->lte(now()->subMinutes($threshold));
    }

    #[Computed]
    public function stalledForMinutes(): int
    {
        return max(0, (int) floor($this->latestProgressAt()->diffInSeconds(now()) / 60));
    }

    public function retryAsset(int $sceneId, string $asset): void
    {
        $scene = Scene::where('lesson_id', $this->lesson->id)->findOrFail($sceneId);
        $scene->update(['status' => 'generating', 'error_message' => null]);

        match ($asset) {
            'script' => GenerateSceneScript::dispatch($scene->id),
            'image' => GenerateSceneImage::dispatch($scene->id),
            'audio' => GenerateSceneAudio::dispatch($scene->id),
            default => null,
        };
    }

    public function retryOutline(LessonGenerationRecovery $recovery): void
    {
        $recovery->purgeQueuedJobs($this->lesson);
        $this->lesson->scenes()->forceDelete();   // hard: a soft-deleted row would still hold its (lesson_id, order) slot
        $this->lesson->update([
            'status' => LessonStatus::SourceReady,
            'error_message' => null,
            'outline' => null,
        ]);
        BuildLessonOutline::dispatch($this->lesson->id);
    }

    public function startNewLesson(LessonGenerationRecovery $recovery): void
    {
        if ($this->lesson->status !== LessonStatus::Failed && ! $this->isStalled) {
            return;
        }

        $recovery->abandon($this->lesson);
        session()->flash('success', __('The stalled lesson session was removed. You can start again.'));

        $this->skipRender();
        $this->redirectRoute('teacher.lessons.chat', navigate: true);
    }

    public function continueToConfigure(): void
    {
        $this->lesson->update(['wizard_step' => 4]);
        $this->redirectRoute('teacher.lessons.wizard', ['lesson' => $this->lesson->id, 'step' => 4], navigate: true);
    }

    public function render()
    {
        return view('livewire.wizard.step2-generate');
    }

    private function latestProgressAt(): CarbonInterface
    {
        $latest = $this->lesson->updated_at->copy();
        $sceneUpdatedAt = $this->lesson->scenes()->max('updated_at');

        if ($sceneUpdatedAt !== null) {
            $sceneActivity = Carbon::parse($sceneUpdatedAt);
            if ($sceneActivity->gt($latest)) {
                $latest = $sceneActivity;
            }
        }

        return $latest;
    }
}
