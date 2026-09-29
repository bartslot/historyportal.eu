<?php

declare(strict_types=1);

namespace Tests\Feature\Editor;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/** Cmd-Z / Cmd-Shift-Z on a scene (Bart, 2026-09-29: both did nothing). */
class SceneUndoTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    private Scene $scene;

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::create([
            'teacher_id' => $this->teacher->id, 'topic' => 'Florence', 'subject' => 'history', 'grade_level' => '9th',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        $spec = json_decode((string) file_get_contents(base_path('docs/diorama-example.json')), true);
        $this->scene = Scene::create([
            'lesson_id' => $this->lesson->id, 'order' => 1, 'kind' => 'narration', 'year' => '1300', 'location' => 'Florence',
            'script_segment' => 'Script.', 'status' => 'ready', 'config' => ['diorama' => $spec],
        ]);
    }

    private function editor()
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $this->scene->id);
    }

    /** @return array<int, mixed> */
    private function barrelCell(): array
    {
        return collect($this->scene->fresh()->config['diorama']['items'])->firstWhere('id', 'barrel_1')['cell'];
    }

    public function test_undo_takes_a_diorama_move_back_and_redo_puts_it_again(): void
    {
        $before = $this->barrelCell();
        $editor = $this->editor()->call('moveDioramaItem', 'barrel_1', 'quay', [1, 20]);
        $this->assertSame([1, 20], $this->barrelCell());

        $editor->call('undoLastEdit');
        $this->assertSame($before, $this->barrelCell());
        $editor->assertDispatched('scene:load');

        $editor->call('redoLastEdit');
        $this->assertSame([1, 20], $this->barrelCell());
    }

    public function test_two_moves_apart_are_two_steps_and_a_new_edit_ends_the_redo_trail(): void
    {
        $before = $this->barrelCell();
        $editor = $this->editor()->call('moveDioramaItem', 'barrel_1', 'quay', [1, 20]);
        $this->travel(3)->seconds();
        $editor->call('moveDioramaItem', 'barrel_1', 'quay', [2, 20]);

        $editor->call('undoLastEdit');
        $this->assertSame([1, 20], $this->barrelCell());
        $editor->call('undoLastEdit');
        $this->assertSame($before, $this->barrelCell());

        $editor->call('moveDioramaItem', 'barrel_1', 'quay', [3, 20]);
        $editor->call('redoLastEdit');
        $this->assertSame([3, 20], $this->barrelCell(), 'nothing to redo after a new edit');
    }

    public function test_a_deleted_diorama_item_comes_back(): void
    {
        $editor = $this->editor()->call('removeDioramaItem', 'barrel_1');
        $this->assertNull(collect($this->scene->fresh()->config['diorama']['items'])->firstWhere('id', 'barrel_1'));

        $editor->call('undoLastEdit');
        $this->assertNotNull(collect($this->scene->fresh()->config['diorama']['items'])->firstWhere('id', 'barrel_1'));
    }

    public function test_a_save_outside_the_editor_is_not_undoable(): void
    {
        $scene = $this->scene->fresh();
        $scene->update(['config' => ['diorama' => null]]);   // an agent import, a job
        $this->editor()->call('undoLastEdit');
        $this->assertSame(['diorama' => null], $this->scene->fresh()->config);
    }

    public function test_a_route_undo_never_fires_on_a_scene_that_is_not_the_voyage(): void
    {
        $this->lesson->update(['game_config' => ['voyage_undo' => [null], 'voyage_def' => ['legs' => []]]]);
        $this->editor()->call('undoLastEdit');
        $this->assertSame(['legs' => []], $this->lesson->fresh()->game_config['voyage_def']);
    }
}
