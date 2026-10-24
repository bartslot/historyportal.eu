<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Round 7 root cause: scenes the editor adds and leaves empty (a strategy, debate or predict
 * scene; the three narration scenes of a fresh Decision point) stay `pending` with nothing to
 * generate. Counting them as "being made" held the player's Start forever and dropped the demo.
 */
class SceneAwaitingMediaTest extends TestCase
{
    use RefreshDatabase;

    private function lesson(): Lesson
    {
        $teacher = User::factory()->create();
        $lesson = Lesson::create([
            'teacher_id' => $teacher->id, 'topic' => 'Tasman', 'subject' => 'history', 'language' => 'nl',
            'grade_level' => '9th', 'image_style' => 'cinematic', 'status' => LessonStatus::Published,
        ]);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready', 'script_segment' => 'Begin.']);

        return $lesson;
    }

    /** @return array<int, bool> the awaiting_media flags the player receives */
    private function playerFlags(Lesson $lesson): array
    {
        $html = $this->get(route('lesson.play', ['lessonCode' => $lesson->lesson_code]))->assertOk()->getContent();
        preg_match_all('/\\\\u0022awaiting_media\\\\u0022:(true|false)|"awaiting_media":(true|false)/', $html, $m);

        return array_map(fn ($a, $b) => ($a ?: $b) === 'true', $m[1], $m[2]);
    }

    public function test_a_fresh_decision_point_and_empty_game_scenes_are_not_awaiting_media(): void
    {
        $lesson = $this->lesson();
        $component = Livewire::actingAs($lesson->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson]);
        $component->call('addScene', 'branch');
        foreach (['strategy', 'debate', 'predict'] as $type) {
            $component->call('addScene', 'game', $type);
        }

        $this->assertGreaterThan(0, $lesson->scenes()->where('status', 'pending')->count(), 'precondition: the editor adds pending scenes');
        $this->assertSame(0, $lesson->scenes()->awaitingMedia()->count());
        $this->assertNotContains(true, $this->playerFlags($lesson->fresh()), 'nothing holds Start');
    }

    public function test_a_scene_whose_narration_is_really_being_made_holds_start(): void
    {
        $lesson = $this->lesson();
        Scene::create(['lesson_id' => $lesson->id, 'order' => 2, 'kind' => 'narration', 'status' => 'pending', 'script_segment' => 'Tasman zeilt uit.']);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 3, 'kind' => 'narration', 'status' => 'generating', 'script_segment' => '']);

        $this->assertSame(2, $lesson->scenes()->awaitingMedia()->count());
        $this->assertSame([false, true, true], $this->playerFlags($lesson));
    }
}
