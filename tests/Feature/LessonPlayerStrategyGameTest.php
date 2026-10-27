<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\LessonStatus;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\StrategyGame;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Opening the player used to pin the first active strategy game ("Cross the Rubicon") on EVERY
 * published lesson, whatever it was about, and a game scene with no questions then showed that
 * card to the class. Only a lesson that actually plays a strategy game gets one matched, and the
 * brief's instructions reach the class as text, never as raw markdown.
 */
class LessonPlayerStrategyGameTest extends TestCase
{
    use RefreshDatabase;

    private function game(): StrategyGame
    {
        return StrategyGame::create([
            'slug' => 'rubicon', 'title' => 'Cross the Rubicon', 'description' => 'Caesar at the river.', 'subject' => 'history',
            'topic_keywords' => ['caesar'], 'grade_min' => 1, 'grade_max' => 12,
            'team_size_min' => 2, 'team_size_max' => 4, 'duration_minutes' => 8,
            'instructions' => "## Your task\n\n**Decide** as a team.", 'is_active' => true,
        ]);
    }

    private function lessonWithGameScene(string $gameType): Lesson
    {
        $lesson = Lesson::factory()->create([
            'teacher_id' => User::factory()->teacher(),
            'status' => LessonStatus::Published->value,
            'topic' => 'Abel Tasman', 'strategy_game_id' => null,
        ]);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready']);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 2, 'kind' => 'game', 'game_type' => $gameType, 'status' => 'ready']);

        return $lesson;
    }

    public function test_a_lesson_without_a_strategy_game_scene_gets_no_strategy_game_on_open(): void
    {
        $this->game();
        $lesson = $this->lessonWithGameScene('quiz');

        $html = $this->get(route('lesson.play', ['lessonCode' => $lesson->lesson_code]))->assertOk()->getContent();

        $this->assertNull($lesson->fresh()->strategy_game_id);
        $this->assertStringNotContainsString('Cross the Rubicon', $html);
    }

    public function test_a_lesson_with_a_strategy_scene_is_matched_and_its_brief_has_no_raw_markdown(): void
    {
        $game = $this->game();
        $lesson = $this->lessonWithGameScene('strategy');

        $html = $this->get(route('lesson.play', ['lessonCode' => $lesson->lesson_code]))->assertOk()->getContent();

        $this->assertSame($game->id, $lesson->fresh()->strategy_game_id);
        $this->assertStringContainsString('Cross the Rubicon', $html);
        $this->assertStringNotContainsString('## Your task', $html);
        $this->assertStringNotContainsString('**Decide**', $html);
    }
}
