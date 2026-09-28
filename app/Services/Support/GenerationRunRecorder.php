<?php

declare(strict_types=1);

namespace App\Services\Support;

use App\Models\GenerationRun;
use App\Models\Lesson;
use App\Services\SensitiveTopicPolicy;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Best-effort experiment instrumentation (Phase 0). Jobs call activate() with their lesson id;
 * the LLM/image services then attribute calls, tokens and retries to that lesson's open run
 * without every call site having to thread a run object through.
 *
 * DESIGN RULES:
 *  - Instrumentation must NEVER fail or slow a lesson: every public method swallows its own
 *    exceptions. A lost counter is noise; a failed lesson is a bug.
 *  - Queue workers process one job per process at a time, so a per-process static context is
 *    safe. activate() at the top of handle(), and the context simply gets replaced by the
 *    next job.
 *  - One open run per lesson (finished_at NULL). A regeneration after finish() opens a new
 *    row, so conditions never mix inside one row.
 */
final class GenerationRunRecorder
{
    private static ?int $lessonId = null;

    public static function activate(int $lessonId): void
    {
        self::$lessonId = $lessonId;
    }

    public static function deactivate(): void
    {
        self::$lessonId = null;
    }

    /** Increment a counter column on the active lesson's open run. */
    public static function count(string $column, int $amount = 1): void
    {
        if (self::$lessonId === null || $amount === 0) {
            return;
        }

        try {
            self::open(self::$lessonId)?->increment($column, $amount);
        } catch (Throwable $e) {
            Log::debug('[GenerationRunRecorder] count failed: '.$e->getMessage());
        }
    }

    /** Record an OpenAI-style usage payload {prompt_tokens, completion_tokens, prompt_tokens_details.cached_tokens}. */
    public static function addUsage(?array $usage): void
    {
        if (self::$lessonId === null || ! is_array($usage)) {
            return;
        }

        try {
            $run = self::open(self::$lessonId);
            if ($run === null) {
                return;
            }
            $input = (int) ($usage['prompt_tokens'] ?? $usage['input_tokens'] ?? 0);
            $output = (int) ($usage['completion_tokens'] ?? $usage['output_tokens'] ?? 0);
            $cached = (int) ($usage['prompt_tokens_details']['cached_tokens'] ?? $usage['cache_read_input_tokens'] ?? 0);
            if ($input > 0) {
                $run->increment('llm_input_tokens', $input);
            }
            if ($output > 0) {
                $run->increment('llm_output_tokens', $output);
            }
            if ($cached > 0) {
                $run->increment('llm_cached_tokens', $cached);
            }
        } catch (Throwable $e) {
            Log::debug('[GenerationRunRecorder] addUsage failed: '.$e->getMessage());
        }
    }

    /** Record which visual path a scene took (ai_grid | sourced_artwork | asset_pack | pre_assigned | generated_environment | none). */
    public static function recordPath(int $lessonId, int $sceneId, string $path): void
    {
        try {
            $run = self::open($lessonId);
            if ($run === null) {
                return;
            }
            $paths = (array) ($run->generation_paths ?? []);
            $paths[(string) $sceneId] = $path;
            $run->update(['generation_paths' => $paths]);
        } catch (Throwable $e) {
            Log::debug('[GenerationRunRecorder] recordPath failed: '.$e->getMessage());
        }
    }

    /**
     * (Re)write the reproducibility snapshot on the lesson's open run — call once scripts
     * exist (GenerateLessonScript), so script_hash covers the text the visuals illustrate.
     */
    public static function snapshot(Lesson $lesson): void
    {
        try {
            $run = self::open($lesson->id);
            if ($run === null) {
                return;
            }

            $scripts = $lesson->scenes()->orderBy('order')->pluck('script_segment')->implode("\n---\n");

            $run->update([
                'experiment_label' => config('lessons.experiment_label'),
                'git_commit' => self::gitCommit(),
                'snapshot' => [
                    'narrative_shots' => (bool) config('lessons.narrative_shots', false),
                    'shot_grid' => (string) config('lessons.shot_grid', '3x3'),
                    'dynamic_shot_range' => config('lessons.dynamic_shot_range'),
                    'llm_model' => (string) config('services.openai.model', ''),
                    'image_model' => (string) config('services.openai.image_model', ''),
                    'image_size' => (string) config('services.openai.scene_size', config('services.openai.image_size', '')),
                    'image_style' => (string) ($lesson->image_style ?? ''),
                    'visual_policy' => SensitiveTopicPolicy::policyFor($lesson),
                    'ai_generation_enabled' => (bool) config('services.imagery.ai_generation', false),
                    'script_hash' => hash('sha256', $scripts),
                    'outline_hash' => hash('sha256', json_encode($lesson->outline ?? []) ?: ''),
                    'prompt_hashes' => self::promptHashes(),
                ],
            ]);
        } catch (Throwable $e) {
            Log::debug('[GenerationRunRecorder] snapshot failed: '.$e->getMessage());
        }
    }

    /** Close the lesson's open run (wall time = created_at → finished_at). */
    public static function finish(int $lessonId): void
    {
        try {
            GenerationRun::where('lesson_id', $lessonId)
                ->whereNull('finished_at')
                ->update(['finished_at' => now()]);
        } catch (Throwable $e) {
            Log::debug('[GenerationRunRecorder] finish failed: '.$e->getMessage());
        }
    }

    /** The lesson's open run, created on first use. */
    private static function open(int $lessonId): ?GenerationRun
    {
        try {
            return GenerationRun::firstOrCreate(
                ['lesson_id' => $lessonId, 'finished_at' => null],
                ['experiment_label' => config('lessons.experiment_label'), 'git_commit' => self::gitCommit()],
            );
        } catch (Throwable) {
            return null;
        }
    }

    /** Deployed commit: GIT_COMMIT env first (SiteGround has no git), `git rev-parse` locally. */
    private static function gitCommit(): ?string
    {
        $env = (string) env('GIT_COMMIT', '');
        if ($env !== '') {
            return $env;
        }

        try {
            $head = @shell_exec('cd '.escapeshellarg(base_path()).' && git rev-parse HEAD 2>/dev/null');

            return is_string($head) && trim($head) !== '' ? substr(trim($head), 0, 64) : null;
        } catch (Throwable) {
            return null;
        }
    }

    /** Hashes of the prompt-defining source files — cheap, and catches "which prompt version was this?". */
    private static function promptHashes(): array
    {
        $files = [
            'shot_list_prompt' => app_path('Services/ShotListPrompt.php'),
            'image_style_template' => app_path('Services/Support/ImageStyleTemplate.php'),
            'lesson_script_prompt' => app_path('Services/LessonScriptPrompt.php'),
            'lesson_outline_prompt' => app_path('Services/LessonOutlinePrompt.php'),
        ];

        $hashes = [];
        foreach ($files as $key => $path) {
            $hashes[$key] = is_file($path) ? (string) md5_file($path) : null;
        }

        return $hashes;
    }
}
