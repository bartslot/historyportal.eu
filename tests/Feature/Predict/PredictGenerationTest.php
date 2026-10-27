<?php

declare(strict_types=1);

namespace Tests\Feature\Predict;

use App\Enums\LessonStatus;
use App\Jobs\BuildLessonOutline;
use App\Models\Lesson;
use App\Models\LessonSource;
use App\Models\Scene;
use App\Models\User;
use App\Services\LessonOutlinePrompt;
use App\Services\LessonScriptPrompt;
use App\Services\OpenAiLlmService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

/** Lesson generation places predict moments at cause-and-effect turns (2-4 per lesson). */
class PredictGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_outline_prompt_asks_for_two_to_four_predict_moments(): void
    {
        $system = LessonOutlinePrompt::system(false);

        $this->assertStringContainsString('PREDICT MOMENTS', $system);
        $this->assertStringContainsString('2-4 narration briefs', $system);
        $this->assertStringContainsString('"key_cause"', $system);
    }

    public function test_a_brief_with_a_predict_object_gets_a_predict_scene_right_after_it(): void
    {
        $lesson = Lesson::create([
            'teacher_id' => User::factory()->create()->id, 'topic' => 'Ur', 'subject' => 'history',
            'grade_level' => '6', 'image_style' => 'painted', 'source_mode' => 'wikipedia',
            'status' => LessonStatus::SourceReady, 'include_game' => false,
        ]);
        LessonSource::create(['lesson_id' => $lesson->id, 'kind' => 'wikipedia', 'extracted_text' => 'Ur irrigated its fields...']);
        $predict = [
            'question' => 'What happens if they let in more water?',
            'outcome' => 'The harvest fell.',
            'debrief' => 'Why did the harvest fall?',
            'rubric' => ['key_cause' => 'Salt stays in the soil.', 'concepts' => ['salt'], 'misconceptions' => ['The gods were angry.']],
        ];
        $this->mock(OpenAiLlmService::class, fn ($mock) => $mock->shouldReceive('json')->once()->andReturn([
            'title' => 'Ur',
            'scene_briefs' => [
                ['kind' => 'narration', 'year' => '-2100', 'location' => 'Ur', 'beat' => 'More water', 'predict' => $predict],
                ['kind' => 'narration', 'year' => '-2000', 'location' => 'Ur', 'beat' => 'The fields turn white', 'predict' => null],
            ],
        ]));
        Bus::fake();

        (new BuildLessonOutline($lesson->id))->handle(app(OpenAiLlmService::class));

        $scenes = Scene::where('lesson_id', $lesson->id)->where('kind', '!=', 'map')->orderBy('order')->get();
        $this->assertSame(['narration', 'game', 'narration'], $scenes->pluck('kind')->all());
        $moment = $scenes[1];
        $this->assertSame('predict', $moment->game_type);
        $this->assertSame('Salt stays in the soil.', $moment->config['predict']['rubric']['key_cause']);
        $this->assertNull($moment->quiz_question_count);
        // Briefs stay aligned with the scenes by position.
        $briefs = $lesson->fresh()->outline['scene_briefs'];
        $this->assertCount(3, $briefs);
        $this->assertSame('predict', $briefs[1]['game_type']);
        $this->assertArrayNotHasKey('predict', $briefs[0]);
        $this->assertNull($lesson->fresh()->game_type);

        $prompt = LessonScriptPrompt::user($lesson->fresh(), $scenes, $briefs, 'source');
        $this->assertStringContainsString('(PREDICT', $prompt);
        $this->assertStringContainsString('What happens if they let in more water?', $prompt);
    }
}
