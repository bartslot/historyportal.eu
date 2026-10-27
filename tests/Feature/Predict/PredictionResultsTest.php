<?php

declare(strict_types=1);

namespace Tests\Feature\Predict;

use App\Livewire\Teacher\LessonReport;
use App\Models\Classroom;
use App\Models\Lesson;
use App\Models\PredictionAnswer;
use App\Models\User;
use App\Services\Predict\PredictionResults;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class PredictionResultsTest extends TestCase
{
    use BuildsPredictLesson, RefreshDatabase;

    private function answer(Lesson $lesson, string $session, string $phase, string $text, array $extra = []): PredictionAnswer
    {
        return PredictionAnswer::create($extra + [
            'lesson_id' => $lesson->id, 'scene_id' => $this->predictScene($lesson)->id, 'child_id' => 'child_'.substr(md5($session), 0, 6),
            'session_hash' => PredictionAnswer::hashSession($session), 'answerer' => 'pupil', 'phase' => $phase,
            'question' => $phase === 'why' ? 'Why did the harvest fall?' : 'What happens to the harvest?', 'text' => $text,
            'status' => $phase === 'why' ? 'graded' : 'saved',
        ]);
    }

    public function test_levels_are_counted_with_the_teachers_override_and_predictions_sit_next_to_their_why(): void
    {
        $lesson = $this->predictLesson();
        $this->answer($lesson, 'run-aaaaaaaaaaaaaaaa', 'predict', 'More grain', ['label' => 'Sanne']);
        $this->answer($lesson, 'run-aaaaaaaaaaaaaaaa', 'why', 'Salt', ['label' => 'Sanne', 'level' => 2, 'feedback' => 'You named the salt.']);
        $this->answer($lesson, 'run-bbbbbbbbbbbbbbbb', 'why', 'The gods', ['level' => 0, 'teacher_override' => 1, 'misconception' => 'The gods were angry.']);
        $this->answer($lesson, 'run-cccccccccccccccc', 'why', 'River', ['status' => 'flagged', 'level' => 1]);

        // The live scene changes later: the report keeps what was asked.
        $scene = $this->predictScene($lesson);
        $scene->update(['config' => ['predict' => ['question' => 'Something else']]]);

        [$moment] = (new PredictionResults($lesson))->moments();

        $this->assertSame('What happens to the harvest?', $moment['question']);
        $this->assertSame([0 => 0, 1 => 2, 2 => 1, 3 => 0], $moment['levels']);
        $this->assertSame(1, $moment['ungraded']);
        $sanne = collect($moment['rows'])->firstWhere('name', 'Sanne');
        $this->assertSame('More grain', $sanne['prediction']);
        $this->assertSame('Salt', $sanne['why']);
    }

    public function test_the_teacher_overrides_a_level_on_the_report_and_can_put_the_graders_back(): void
    {
        $lesson = $this->predictLesson();
        $why = $this->answer($lesson, 'run-aaaaaaaaaaaaaaaa', 'why', 'Salt', ['level' => 1]);

        $component = Livewire::actingAs($this->teacher)
            ->test(LessonReport::class, ['lesson' => $lesson])
            ->set('tab', 'predictions')
            ->assertSee('Why did the harvest fall?')
            ->assertSee('Salt')
            ->call('overridePrediction', $why->id, '3');
        $this->assertSame(3, $why->fresh()->teacher_override);

        $component->call('overridePrediction', $why->id, '');
        $this->assertNull($why->fresh()->teacher_override);
    }

    public function test_another_lessons_answer_cannot_be_overridden_and_the_class_filter_applies(): void
    {
        $lesson = $this->predictLesson();
        $other = $this->predictLesson();
        $foreign = $this->answer($other, 'run-aaaaaaaaaaaaaaaa', 'why', 'Salt', ['level' => 1]);
        $class = Classroom::create(['teacher_id' => $this->teacher->id, 'name' => 'Groep 7']);
        $this->answer($lesson, 'run-bbbbbbbbbbbbbbbb', 'why', 'In class', ['level' => 2, 'classroom_id' => $class->id]);
        $this->answer($lesson, 'run-cccccccccccccccc', 'why', 'At home', ['level' => 2]);

        $this->assertCount(1, (new PredictionResults($lesson, $class->id))->moments()[0]['rows']);

        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);
        Livewire::actingAs($this->teacher)->test(LessonReport::class, ['lesson' => $lesson])
            ->call('overridePrediction', $foreign->id, '3');
    }

    public function test_another_teacher_never_sees_the_report(): void
    {
        $lesson = $this->predictLesson();

        $this->actingAs(User::factory()->create())->get("/teacher/lessons/{$lesson->id}/results")->assertForbidden();
    }
}
