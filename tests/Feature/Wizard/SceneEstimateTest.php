<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/** A scene the student paces (a map, a gallery, a film) carries a time estimate the teacher may override. */
class SceneEstimateTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    private Scene $map;

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::create([
            'teacher_id' => $this->teacher->id, 'topic' => 'X', 'subject' => 'history',
            'grade_level' => '9th', 'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        Scene::create([
            'lesson_id' => $this->lesson->id, 'order' => 1, 'kind' => 'narration',
            'duration_seconds' => 100, 'status' => 'ready',
        ]);
        $this->map = Scene::create([
            'lesson_id' => $this->lesson->id, 'order' => 2, 'kind' => 'map', 'duration_seconds' => 20,
            'config' => ['playback_mode' => 'interactive'], 'status' => 'ready',
        ]);
    }

    private function editor()
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $this->map->id);
    }

    public function test_the_teacher_sets_an_estimate_in_minutes(): void
    {
        $this->editor()->call('setSceneEstimate', $this->map->id, 3.5);

        $this->assertSame(210, $this->map->fresh()->timelineSeconds()['seconds']);
    }

    public function test_clearing_the_estimate_falls_back_to_the_default(): void
    {
        $this->editor()->call('setSceneEstimate', $this->map->id, 3)->call('setSceneEstimate', $this->map->id, null);

        $this->assertArrayNotHasKey('estimate_seconds', $this->map->fresh()->config ?? []);
        $this->assertSame(60, $this->map->fresh()->timelineSeconds()['seconds']);
    }

    public function test_an_estimate_is_kept_within_an_hour(): void
    {
        $this->editor()->call('setSceneEstimate', $this->map->id, 500);

        $this->assertSame(3600, $this->map->fresh()->config['estimate_seconds']);
    }

    public function test_a_scene_that_plays_itself_out_takes_no_estimate(): void
    {
        $narration = $this->lesson->scenes()->where('kind', 'narration')->first();

        $this->editor()->call('setSceneEstimate', $narration->id, 5);

        $this->assertArrayNotHasKey('estimate_seconds', $narration->fresh()->config ?? []);
    }

    public function test_the_canvas_identity_event_still_reaches_its_own_handler(): void
    {
        $this->editor()->dispatch('sceneIdentityChanged', ['sceneId' => $this->map->id, 'year' => '1642']);

        $this->assertSame('1642', $this->map->fresh()->year);
    }

    public function test_the_lesson_card_shows_the_total(): void
    {
        $this->actingAs($this->teacher)
            ->get(route('teacher.lessons.index'))
            ->assertOk()
            ->assertSee('≈ 3 min');
    }
}
