<?php

declare(strict_types=1);

namespace Tests\Feature\Predict;

use App\Jobs\GradePredictionAnswer;
use App\Models\Classroom;
use App\Models\ClassroomMember;
use App\Models\Lesson;
use App\Models\PredictionAnswer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** JEV grades, the small model writes, names never leave; never a real call (both faked). */
class GradePredictionAnswerTest extends TestCase
{
    use BuildsPredictLesson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.jev', ['key' => 'jev-test', 'url' => 'https://jev.test/v1/systemone']);
        config()->set('llm.providers.openai', [
            'label' => 'OpenAI', 'base_url' => 'https://llm.test/v1', 'api_key' => 'sk-test',
            'model' => 'gpt-4o-mini', 'json_format' => 'json_object', 'timeout' => 60,
        ]);
        config()->set('llm.roles.feedback', 'openai');
        config()->set('predict.min_confidence', 0.6);
    }

    private function jev(int $level, float $confidence = 0.9, string $misconception = 'none'): array
    {
        return ['answers' => [
            'level' => ['choice' => (string) $level, 'probabilities' => [(string) $level => $confidence], 'confidence' => $confidence],
            'misconception' => ['choice' => $misconception, 'probabilities' => [], 'confidence' => 0.8],
            'concept_1' => ['choice' => 'yes', 'probabilities' => [], 'confidence' => 0.9],
            'concept_2' => ['choice' => 'no', 'probabilities' => [], 'confidence' => 0.9],
            'concept_3' => ['choice' => 'no', 'probabilities' => [], 'confidence' => 0.9],
        ]];
    }

    private function feedback(string $text): array
    {
        return ['choices' => [['message' => ['content' => json_encode(['feedback' => $text])]]]];
    }

    private function why(Lesson $lesson, string $text, array $extra = []): PredictionAnswer
    {
        return PredictionAnswer::create($extra + [
            'lesson_id' => $lesson->id, 'scene_id' => $this->predictScene($lesson)->id, 'child_id' => 'child_aaaaaa',
            'session_hash' => 'x', 'answerer' => 'pupil', 'phase' => 'why', 'question' => 'Why?', 'text' => $text,
        ]);
    }

    private function grade(PredictionAnswer $answer): PredictionAnswer
    {
        app()->call([new GradePredictionAnswer($answer->id), 'handle']);

        return $answer->fresh();
    }

    public function test_jev_grades_the_model_writes_and_no_name_leaves_the_building(): void
    {
        $lesson = $this->predictLesson();
        $class = Classroom::create(['teacher_id' => $this->teacher->id, 'name' => 'Groep 7']);
        $lesson->classrooms()->attach($class->id);
        ClassroomMember::create(['classroom_id' => $class->id, 'display_name' => 'Daan B.']);
        Http::fake([
            'jev.test/*' => Http::response($this->jev(2)),
            'llm.test/*' => function (Request $request) {
                $user = collect(json_decode($request->body(), true)['messages'])->last()['content'];
                preg_match('/child_[0-9a-f]{6}/', $user, $m);

                return Http::response($this->feedback("You saw the salt, {$m[0]}. What does the water leave behind?"));
            },
        ]);

        $answer = $this->grade($this->why($lesson, 'Daan and my sister Noor think salt stays in the ground.', [
            'label' => 'Sanne', 'classroom_id' => $class->id,
        ]));

        $this->assertSame('graded', $answer->status);
        $this->assertSame(2, $answer->level);
        $this->assertSame(['salt'], $answer->concepts);
        $this->assertNull($answer->misconception);
        $this->assertSame('jev-latest+gpt-4o-mini', $answer->model);
        $this->assertNotNull($answer->graded_at);
        // The child id in the model's text is the child's name again in what the child reads.
        $this->assertMatchesRegularExpression('/^You saw the salt, (Daan|Noor)\. /', $answer->feedback);

        Http::assertSentCount(2);
        Http::assertSent(function (Request $request) {
            $body = $request->body();
            $this->assertStringNotContainsString('Daan', $body);
            $this->assertStringNotContainsString('Noor', $body);
            $this->assertStringContainsString('salt stays in the ground', $body);

            return true;
        });
        Http::assertSent(fn (Request $r) => str_contains($r->url(), 'jev.test')
            && str_contains($r->body(), 'leaves salt in the soil')            // the rubric's key cause
            && str_contains($r->body(), 'The gods were angry.'));              // and its misconception
    }

    public function test_a_misconception_is_recorded(): void
    {
        $lesson = $this->predictLesson();
        Http::fake([
            'jev.test/*' => Http::response($this->jev(0, 0.9, 'm1')),
            'llm.test/*' => Http::response($this->feedback('People then believed the gods were angry, but the cause was in the soil. What was in the water?')),
        ]);

        $answer = $this->grade($this->why($lesson, 'The gods were angry with Ur.'));

        $this->assertSame(0, $answer->level);
        $this->assertSame('The gods were angry.', $answer->misconception);
    }

    public function test_when_jev_is_unsure_the_feedback_is_neutral_and_the_teacher_is_flagged(): void
    {
        $lesson = $this->predictLesson();
        Http::fake(['jev.test/*' => Http::response($this->jev(1, 0.41))]);

        $answer = $this->grade($this->why($lesson, 'Because of the river.'));

        $this->assertSame('flagged', $answer->status);
        $this->assertSame('Good thinking. Your teacher will read your answer too.', $answer->feedback);
        $this->assertSame(0.41, $answer->confidence);
        Http::assertSentCount(1);   // no feedback model call
    }

    public function test_any_failure_keeps_the_answer_and_says_the_teacher_will_look_in_the_lessons_language(): void
    {
        $lesson = $this->predictLesson([], 'nl');
        Http::fake(['jev.test/*' => Http::response(['error' => 'down'], 503)]);

        $answer = $this->grade($this->why($lesson, 'Het zout bleef achter.'));

        $this->assertSame('failed', $answer->status);
        $this->assertSame('Het zout bleef achter.', $answer->text);
        $this->assertSame(__('Saved. Your teacher will look at it.', [], 'nl'), $answer->feedback);
        $this->assertNotSame('Saved. Your teacher will look at it.', $answer->feedback);
    }

    public function test_a_feedback_model_that_writes_nothing_usable_falls_back_after_one_retry(): void
    {
        $lesson = $this->predictLesson();
        Http::fake([
            'jev.test/*' => Http::response($this->jev(2)),
            'llm.test/*' => Http::response(['choices' => [['message' => ['content' => '{"note": "no feedback key"}']]]]),
        ]);

        $answer = $this->grade($this->why($lesson, 'Salt.'));

        $this->assertSame('failed', $answer->status);
        Http::assertSentCount(3);   // JEV once, the model twice
    }

    public function test_a_moment_without_a_key_cause_is_never_sent_to_jev(): void
    {
        $lesson = $this->predictLesson(['rubric' => ['key_cause' => '']]);
        Http::fake();

        $answer = $this->grade($this->why($lesson, 'Salt.'));

        $this->assertSame('flagged', $answer->status);
        Http::assertNothingSent();
    }

    public function test_a_prediction_is_never_graded(): void
    {
        $lesson = $this->predictLesson();
        Http::fake();

        $answer = $this->grade($this->why($lesson, 'More grain', ['phase' => 'predict', 'status' => 'saved']));

        $this->assertSame('saved', $answer->status);
        Http::assertNothingSent();
    }
}
