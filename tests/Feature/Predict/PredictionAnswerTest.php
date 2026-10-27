<?php

declare(strict_types=1);

namespace Tests\Feature\Predict;

use App\Jobs\GradePredictionAnswer;
use App\Models\Classroom;
use App\Models\ClassroomMember;
use App\Models\PredictionAnswer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

class PredictionAnswerTest extends TestCase
{
    use BuildsPredictLesson, RefreshDatabase;

    private const SESSION = 'run-0123456789abcdef';

    private function answer(string $code, array $data)
    {
        return $this->postJson("/lesson/{$code}/predictions", $data + ['session' => self::SESSION, 'answerer' => 'pupil']);
    }

    public function test_a_pupils_prediction_is_stored_as_a_snapshot_and_never_graded(): void
    {
        Bus::fake();
        $lesson = $this->predictLesson();
        $scene = $this->predictScene($lesson);

        $this->answer($lesson->lesson_code, ['scene_id' => $scene->id, 'phase' => 'predict', 'text' => '<b>More</b> grain'])
            ->assertCreated()->assertJson(['status' => 'saved']);

        $row = PredictionAnswer::sole();
        $this->assertSame('More grain', $row->text);
        $this->assertSame('What happens to the harvest if they let in even more water?', $row->question);
        $this->assertMatchesRegularExpression('/^child_[0-9a-f]{6}$/', $row->child_id);
        $this->assertNotSame(self::SESSION, $row->session_hash);
        Bus::assertNotDispatched(GradePredictionAnswer::class);
    }

    public function test_a_why_is_stored_pending_and_graded_after_the_response(): void
    {
        Bus::fake();
        $lesson = $this->predictLesson();
        $scene = $this->predictScene($lesson);

        $this->answer($lesson->lesson_code, ['scene_id' => $scene->id, 'phase' => 'why', 'text' => 'Salt stayed behind.'])
            ->assertCreated()->assertJson(['status' => 'pending']);

        $this->assertSame('Why did the harvest fall?', PredictionAnswer::sole()->question);
        Bus::assertDispatchedAfterResponse(GradePredictionAnswer::class);
    }

    public function test_a_retry_replaces_the_browsers_own_answer(): void
    {
        Bus::fake();
        $lesson = $this->predictLesson();
        $scene = $this->predictScene($lesson);

        $this->answer($lesson->lesson_code, ['scene_id' => $scene->id, 'phase' => 'predict', 'text' => 'More grain']);
        $this->answer($lesson->lesson_code, ['scene_id' => $scene->id, 'phase' => 'predict', 'text' => 'Less grain']);

        $this->assertSame('Less grain', PredictionAnswer::sole()->text);
    }

    public function test_only_the_teacher_types_the_class_or_a_teams_answer(): void
    {
        Bus::fake();
        $lesson = $this->predictLesson();
        $scene = $this->predictScene($lesson);
        $class = Classroom::create(['teacher_id' => $this->teacher->id, 'name' => 'Groep 7']);
        $lesson->classrooms()->attach($class->id);

        $this->answer($lesson->lesson_code, ['scene_id' => $scene->id, 'phase' => 'predict', 'text' => 'x', 'answerer' => 'class'])
            ->assertForbidden();

        $this->actingAs($this->teacher);
        $this->answer($lesson->lesson_code, [
            'scene_id' => $scene->id, 'phase' => 'why', 'text' => 'The salt.', 'answerer' => 'team', 'label' => 'Team 2',
            'classroom_id' => $class->id,
        ])->assertCreated();

        $row = PredictionAnswer::sole();
        $this->assertSame('team', $row->answerer);
        $this->assertSame('Team 2', $row->label);
        $this->assertSame($class->id, $row->classroom_id);
    }

    public function test_a_pupils_class_code_links_the_roster_member_without_writing_one(): void
    {
        Bus::fake();
        $lesson = $this->predictLesson();
        $scene = $this->predictScene($lesson);
        $class = Classroom::create(['teacher_id' => $this->teacher->id, 'name' => 'Groep 7']);
        $lesson->classrooms()->attach($class->id);
        $member = ClassroomMember::create(['classroom_id' => $class->id, 'display_name' => 'Sanne K.']);

        $this->answer($lesson->lesson_code, [
            'scene_id' => $scene->id, 'phase' => 'predict', 'text' => 'x', 'label' => 'sanne k.', 'class_code' => strtolower($class->join_code),
        ])->assertCreated();
        $this->answer($lesson->lesson_code, [
            'scene_id' => $scene->id, 'phase' => 'why', 'text' => 'x', 'label' => 'Nobody', 'class_code' => $class->join_code,
        ])->assertCreated();

        $this->assertSame($member->id, PredictionAnswer::where('phase', 'predict')->value('classroom_member_id'));
        $this->assertNull(PredictionAnswer::where('phase', 'why')->value('classroom_member_id'));
        $this->assertSame(1, ClassroomMember::count());
    }

    public function test_only_a_predict_scene_of_this_lesson_takes_answers_and_text_is_capped(): void
    {
        $lesson = $this->predictLesson();
        $story = $lesson->scenes()->where('kind', 'narration')->first();

        $this->answer($lesson->lesson_code, ['scene_id' => $story->id, 'phase' => 'predict', 'text' => 'x'])->assertNotFound();
        $this->answer($lesson->lesson_code, ['scene_id' => $this->predictScene($lesson)->id, 'phase' => 'predict', 'text' => str_repeat('a', 201)])
            ->assertUnprocessable();
        $this->answer($lesson->lesson_code, ['scene_id' => $this->predictScene($lesson)->id, 'phase' => 'guess', 'text' => 'x'])
            ->assertUnprocessable();
    }

    public function test_only_the_sending_browser_reads_the_feedback_back(): void
    {
        $lesson = $this->predictLesson();
        $row = PredictionAnswer::create([
            'lesson_id' => $lesson->id, 'scene_id' => $this->predictScene($lesson)->id, 'child_id' => 'child_aaaaaa',
            'session_hash' => PredictionAnswer::hashSession(self::SESSION), 'answerer' => 'pupil', 'phase' => 'why',
            'question' => 'Why?', 'text' => 'Salt.', 'status' => 'graded', 'level' => 2, 'feedback' => 'You named the salt.',
        ]);
        $url = "/lesson/{$lesson->lesson_code}/predictions/{$row->id}";

        $this->getJson($url)->assertNotFound();
        $this->getJson($url.'?session=run-someone-else-000')->assertNotFound();
        $this->getJson($url.'?session='.self::SESSION)
            ->assertOk()->assertExactJson(['id' => $row->id, 'status' => 'graded', 'feedback' => 'You named the salt.']);
    }

    public function test_the_player_never_gets_the_rubric(): void
    {
        $lesson = $this->predictLesson();

        $this->get("/lesson/{$lesson->lesson_code}")
            ->assertOk()
            ->assertSee('Why did the harvest fall?')
            ->assertDontSee('leaves salt in the soil')
            ->assertDontSee('The gods were angry');
    }

    public function test_devices_in_class_is_remembered_per_class_by_the_teacher_only(): void
    {
        $lesson = $this->predictLesson();
        $class = Classroom::create(['teacher_id' => $this->teacher->id, 'name' => 'Groep 7']);
        $lesson->classrooms()->attach($class->id);
        $url = "/lesson/{$lesson->lesson_code}/play-mode";

        $this->actingAs(User::factory()->create())->postJson($url, ['classroom_id' => $class->id, 'mode' => 'solo'])->assertForbidden();
        $this->actingAs($this->teacher)->postJson($url, ['classroom_id' => $class->id, 'mode' => 'phones'])->assertUnprocessable();
        $this->actingAs($this->teacher)->postJson($url, ['classroom_id' => $class->id, 'mode' => 'solo'])->assertNoContent();

        $this->assertSame('solo', $class->fresh()->devices_mode);
        $this->get("/lesson/{$lesson->lesson_code}")->assertSee('"devices_mode":"solo"', false);
    }

    public function test_answers_older_than_one_school_year_are_pruned(): void
    {
        $lesson = $this->predictLesson();
        $make = fn () => PredictionAnswer::create([
            'lesson_id' => $lesson->id, 'scene_id' => $this->predictScene($lesson)->id, 'child_id' => 'child_aaaaaa',
            'session_hash' => 'x', 'answerer' => 'pupil', 'phase' => 'predict', 'question' => 'Q', 'text' => 'T',
        ]);
        $old = $make();
        $old->forceFill(['created_at' => now()->subDays(PredictionAnswer::RETENTION_DAYS + 1)])->save();
        $fresh = $make();

        $this->artisan('model:prune', ['--model' => [PredictionAnswer::class]])->assertSuccessful();

        $this->assertModelMissing($old);
        $this->assertModelExists($fresh);
    }
}
