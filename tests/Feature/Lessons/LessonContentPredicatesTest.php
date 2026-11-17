<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Enums\LessonStatus;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A lesson behaves by what it CONTAINS, never by a type picked up front (Bart 2026-11-17): choices,
 * class meters and a voyage are things any lesson can hold.
 */
class LessonContentPredicatesTest extends TestCase
{
    use RefreshDatabase;

    private function lesson(array $attrs = []): Lesson
    {
        return Lesson::create([
            'teacher_id' => User::factory()->create()->id,
            'topic' => 'The Dutch Revolt', 'subject' => 'history', 'grade_level' => 'Age 12',
            'status' => LessonStatus::ScenesReady,
            ...$attrs,
        ]);
    }

    private function scene(Lesson $lesson, int $order, array $attrs = []): Scene
    {
        return Scene::create(['lesson_id' => $lesson->id, 'order' => $order, 'kind' => 'narration', 'status' => 'ready', ...$attrs]);
    }

    public function test_a_lesson_has_choices_when_a_scene_carries_a_branch_role_whatever_its_game_type(): void
    {
        $lesson = $this->lesson(['game_type' => 'quiz']);
        $this->scene($lesson, 1);
        $this->assertFalse($lesson->hasChoices());

        $this->scene($lesson, 2, ['branch_group' => 1, 'branch_role' => 'question']);
        $this->assertTrue($lesson->fresh()->hasChoices());
        $this->assertTrue($lesson->fresh()->load('scenes')->hasChoices());
    }

    public function test_a_lesson_has_meters_only_when_game_config_lists_some(): void
    {
        $this->assertFalse($this->lesson(['game_type' => 'story_game'])->hasMeters());
        $this->assertFalse($this->lesson(['game_config' => ['meters' => []]])->hasMeters());
        $this->assertTrue($this->lesson(['game_config' => ['meters' => [['key' => 'food', 'label' => 'Food', 'start' => 50]]]])->hasMeters());
    }

    public function test_a_lesson_has_a_voyage_when_it_holds_a_voyage_scene_whatever_its_game_type(): void
    {
        $voyageType = $this->lesson(['game_type' => 'voyage']);
        $this->assertFalse($voyageType->hasVoyage());

        $story = $this->lesson();
        $this->scene($story, 1, ['kind' => 'voyage', 'config' => ['voyage' => 'tasman-1642', 'leg' => 0]]);
        $this->assertTrue($story->hasVoyage());
        $this->assertTrue($story->fresh()->load('scenes')->hasVoyage());
    }

    private function decisionPoint(Lesson $lesson): void
    {
        $this->scene($lesson, 1, ['branch_group' => 1, 'branch_role' => 'question']);
        $this->scene($lesson, 2, ['branch_group' => 1, 'branch_role' => 'option_a']);
        $this->scene($lesson, 3, ['branch_group' => 1, 'branch_role' => 'option_b']);
    }

    /** Choices without meters play both options in a row: there is nothing for an effect to change. */
    public function test_the_publish_gate_asks_for_choice_effects_only_when_the_lesson_has_meters(): void
    {
        $plain = $this->lesson(['game_type' => 'story_game']);
        $this->decisionPoint($plain);
        $this->assertSame([], $plain->incompleteStoryGameGroups());

        $metered = $this->lesson(['game_config' => ['meters' => [['key' => 'food', 'label' => 'Food', 'start' => 50]]]]);
        $this->decisionPoint($metered);
        $this->assertSame([1], $metered->incompleteStoryGameGroups());
    }
}
