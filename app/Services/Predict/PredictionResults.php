<?php

declare(strict_types=1);

namespace App\Services\Predict;

use App\Models\Lesson;
use App\Models\PredictionAnswer;
use Carbon\CarbonInterface;

/**
 * Teacher Results for predict moments: per moment the level distribution of the WHY answers and
 * every answerer's prediction next to their why, feedback and level (override wins). Read from the
 * answer SNAPSHOTS only (question and text as answered), never from the live scene, so editing a
 * moment later never rewrites a past report. Same filters as LessonResults.
 */
final class PredictionResults
{
    public function __construct(
        private readonly Lesson $lesson,
        private readonly ?int $classroomId = null,
        private readonly ?CarbonInterface $from = null,
    ) {}

    /**
     * @return list<array{scene_id: int, question: string, debrief: string, levels: array<int,int>, ungraded: int,
     *                    rows: list<array<string,mixed>>}>
     */
    public function moments(): array
    {
        $answers = PredictionAnswer::with(['member', 'scene'])
            ->where('lesson_id', $this->lesson->id)
            ->when($this->classroomId, fn ($q) => $q->where('classroom_id', $this->classroomId))
            ->when($this->from, fn ($q) => $q->where('created_at', '>=', $this->from))
            ->orderBy('id')
            ->get();

        return $answers->groupBy('scene_id')->map(function ($group, int $sceneId) {
            $whys = $group->where('phase', 'why');
            $levels = array_fill_keys(PredictionAnswer::LEVELS, 0);
            foreach ($whys as $why) {
                $level = $why->effectiveLevel();
                if ($level !== null) {
                    $levels[$level]++;
                }
            }
            $rows = $group->groupBy(fn (PredictionAnswer $a) => $a->session_hash.'|'.$a->answerer.'|'.$a->label)
                ->map(function ($mine) {
                    $predict = $mine->firstWhere('phase', 'predict');
                    $why = $mine->firstWhere('phase', 'why');
                    $any = $why ?? $predict;

                    return [
                        'name' => $any->member?->display_name ?? $any->label ?? $any->child_id,
                        'prediction' => $predict?->text,
                        'why_id' => $why?->id,
                        'why' => $why?->text,
                        'status' => $why?->status,
                        'level' => $why?->level,
                        'override' => $why?->teacher_override,
                        'misconception' => $why?->misconception,
                        'feedback' => $why?->feedback,
                    ];
                })->values()->all();

            return [
                'scene_id' => $sceneId,
                'order' => (int) ($group->first()->scene?->order ?? 0),
                'question' => (string) ($group->firstWhere('phase', 'predict')?->question ?? ''),
                'debrief' => (string) ($whys->first()?->question ?? ''),
                'levels' => $levels,
                // Pending, unsure (flagged) or failed: the ones the teacher should read.
                'ungraded' => $whys->filter(fn ($w) => $w->effectiveLevel() === null || ($w->status === 'flagged' && $w->teacher_override === null))->count(),
                'rows' => $rows,
            ];
        })->sortBy('order')->values()->all();
    }
}
