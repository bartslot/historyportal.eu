<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\ClassroomMember;
use App\Models\PredictionAnswer;
use App\Services\Lessons\PredictSpec;
use App\Services\Predict\NamePseudonymizer;
use App\Services\Predict\PredictionGrader;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Grade one typed WHY answer at a predict moment and write its feedback (plan §3), in order:
 *
 *   1. every name becomes a child id (NamePseudonymizer): nothing below sees a name;
 *   2. JEV grades the answer against the moment's rubric (PredictionGrader::grade);
 *   3. when JEV is unsure (confidence < predict.min_confidence) or the moment has no key cause to
 *      grade against: neutral feedback, and the answer is flagged for the teacher;
 *   4. otherwise the small model writes 1-2 kind sentences in the lesson's language, from JEV's level;
 *   5. on any failure: "Saved. Your teacher will look at it." The answer itself is never lost.
 *
 * A prediction is never graded. Dispatched after the response (PredictionAnswerController), so a
 * child waits seconds, not a minute for SiteGround's cron worker; it is a queued job all the same.
 */
class GradePredictionAnswer implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 120;

    public function __construct(public readonly int $answerId) {}

    public function handle(PredictionGrader $grader): void
    {
        $answer = PredictionAnswer::with(['lesson', 'scene'])->find($this->answerId);
        if (! $answer || $answer->phase !== 'why' || $answer->status !== 'pending' || ! $answer->scene) {
            return;
        }
        $lesson = $answer->lesson;
        $language = (string) ($lesson->language ?: 'en');
        $previous = App::getLocale();
        App::setLocale($language);

        try {
            $predict = PredictSpec::normalize((array) (($answer->scene->config ?? [])['predict'] ?? []));
            $names = NamePseudonymizer::make()->replace(
                $answer->text, $this->knownNames($answer), NamePseudonymizer::lessonWords($lesson, $predict), $language,
            );

            if (! PredictSpec::canGrade($predict)) {
                $this->neutral($answer, null);

                return;
            }

            $grade = $grader->grade($predict, $names['text']);
            if ($grade['confidence'] < (float) config('predict.min_confidence', 0.6)) {
                $this->neutral($answer, $grade, $grader->modelName());

                return;
            }

            $feedback = $grader->feedback($predict, $names['text'], $grade, $language);
            $answer->update([
                'status' => 'graded',
                'level' => $grade['level'],
                'concepts' => $grade['concepts'],
                'misconception' => $grade['misconception'],
                'confidence' => $grade['confidence'],
                'feedback' => NamePseudonymizer::restore($feedback, $names['map']),
                'model' => $grader->modelName(),
                'graded_at' => now(),
            ]);
        } catch (Throwable $e) {
            Log::warning("GradePredictionAnswer #{$answer->id}: {$e->getMessage()}");
            $answer->update([
                'status' => 'failed',
                'feedback' => __('Saved. Your teacher will look at it.'),
            ]);
        } finally {
            App::setLocale($previous);
        }
    }

    /** JEV was unsure (or there is nothing to grade against): a neutral line, and the teacher looks. */
    private function neutral(PredictionAnswer $answer, ?array $grade, ?string $model = null): void
    {
        $answer->update([
            'status' => 'flagged',
            'level' => $grade['level'] ?? null,
            'concepts' => $grade['concepts'] ?? null,
            'misconception' => $grade['misconception'] ?? null,
            'confidence' => $grade['confidence'] ?? null,
            'feedback' => __('Good thinking. Your teacher will read your answer too.'),
            'model' => $model,
            'graded_at' => now(),
        ]);
    }

    /** @return list<string> the pupil's own name and the class roster's */
    private function knownNames(PredictionAnswer $answer): array
    {
        $own = $answer->answerer === 'pupil' && $answer->label ? [$answer->label] : [];
        $classrooms = $answer->classroom_id
            ? [$answer->classroom_id]
            : $answer->lesson->classrooms()->pluck('classrooms.id')->all();

        // ponytail: the whole roster of the lesson's classes; per-class rosters are small (30-ish).
        return [...$own, ...ClassroomMember::whereIn('classroom_id', $classrooms)->pluck('display_name')->all()];
    }
}
