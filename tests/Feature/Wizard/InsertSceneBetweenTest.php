<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Features\SupportTesting\Testable;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * The rail's "+" buttons (Bart, 2026-10-26): the new scene lands in that gap, above scene 1, or at the
 * very end from the dashed tile, whatever happens to be selected.
 */
class InsertSceneBetweenTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    /** @var array<int, int> */
    private array $ids;

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create();
        $this->lesson = $this->makeLesson($this->teacher);
        $this->ids = collect([1, 2, 3])->map(fn ($n) => Scene::create([
            'lesson_id' => $this->lesson->id, 'order' => $n, 'kind' => 'narration',
            'script_segment' => "Scene {$n}.", 'image_path' => 'a.png', 'audio_path' => 'a.mp3',
            'status' => 'ready',
        ])->id)->all();
    }

    private function makeLesson(User $teacher): Lesson
    {
        return Lesson::create([
            'teacher_id' => $teacher->id,
            'topic' => 'The Dutch Revolt', 'subject' => 'history', 'grade_level' => 'Age 12',
            'image_style' => 'realistic', 'status' => LessonStatus::ScenesReady,
        ]);
    }

    private function wizard(): Testable
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson]);
    }

    /** @return array<int, string> */
    private function kinds(): array
    {
        return $this->lesson->scenes()->ordered()->pluck('kind')->all();
    }

    public function test_the_plus_between_two_scenes_inserts_in_that_gap(): void
    {
        $this->wizard()
            ->call('openAddSceneAfter', $this->ids[0])
            ->assertSet('addSceneOpen', true)
            ->call('addScene', 'video');

        $this->assertSame(['narration', 'video', 'narration', 'narration'], $this->kinds());
    }

    public function test_the_plus_above_scene_one_inserts_first(): void
    {
        $this->wizard()->call('openAddSceneAfter', 0)->call('addScene', 'video');

        $this->assertSame(['video', 'narration', 'narration', 'narration'], $this->kinds());
    }

    public function test_the_dashed_tile_adds_at_the_end_whatever_is_selected(): void
    {
        $this->wizard()
            ->call('selectScene', $this->ids[0])
            ->call('openAddSceneAfter', $this->ids[2])
            ->call('addScene', 'video');

        $this->assertSame(['narration', 'narration', 'narration', 'video'], $this->kinds());
    }

    public function test_opening_the_picker_from_a_plus_keeps_the_selection(): void
    {
        $this->wizard()
            ->call('selectScene', $this->ids[2])
            ->call('openAddSceneAfter', $this->ids[0])
            ->assertSet('selectedSceneId', $this->ids[2]);
    }

    public function test_a_scene_from_another_lesson_is_ignored(): void
    {
        $other = $this->makeLesson(User::factory()->create());
        $foreign = Scene::create(['lesson_id' => $other->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready']);

        $this->wizard()->call('openAddSceneAfter', $foreign->id)->assertSet('addSceneOpen', false);
    }
}
