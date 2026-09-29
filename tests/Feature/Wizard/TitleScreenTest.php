<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Enums\TitlePosition;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/** The title screen as the pinned first item of the editor, and what the player makes of it. */
class TitleScreenTest extends TestCase
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
            'teacher_id' => $this->teacher->id, 'title' => 'The Dike Breaks',
            'topic' => 'X', 'subject' => 'history', 'grade_level' => '9th',
            'image_style' => 'cinematic', 'status' => LessonStatus::Published,
        ]);
        $this->scene = Scene::create([
            'lesson_id' => $this->lesson->id, 'order' => 1, 'kind' => 'narration',
            'script_segment' => 'Once.', 'status' => 'ready',
        ]);
    }

    public function test_the_editor_opens_on_the_title_screen(): void
    {
        Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->assertSet('titleSelected', true)
            ->assertSee('data-title-thumb', false)
            ->assertSeeText('Title position');
    }

    public function test_a_scene_link_opens_that_scene_instead(): void
    {
        Livewire::withQueryParams(['scene' => $this->scene->id])
            ->actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->assertSet('titleSelected', false)
            ->assertSet('selectedSceneId', $this->scene->id);
    }

    public function test_only_a_teachers_click_leaves_the_title(): void
    {
        Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            // The stage's own first payload request is not a click.
            ->call('loadStageScene', $this->scene->id)
            ->assertSet('titleSelected', true)
            ->call('selectScene', $this->scene->id)
            ->assertSet('titleSelected', false)
            ->call('selectTitle')
            ->assertSet('titleSelected', true);
    }

    public function test_position_takes_only_a_preset_and_reloads_the_frame(): void
    {
        $component = Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson]);
        $before = $component->get('titleFrameSrc');

        $component->call('setTitlePosition', 'somewhere-else');
        $this->assertSame(TitlePosition::BottomLeft, $this->lesson->fresh()->title_position);

        $component->call('setTitlePosition', 'center');
        $this->assertSame(TitlePosition::Center, $this->lesson->fresh()->title_position);
        $this->assertNotSame($before, $component->get('titleFrameSrc'));
    }

    public function test_the_player_places_the_title_and_can_hide_the_qr(): void
    {
        $this->get(route('lesson.play', $this->lesson->lesson_code))
            ->assertSee('data-title-position="bottom-left"', false)
            ->assertSee('id="title-qr-canvas"', false);

        $this->lesson->update(['title_position' => TitlePosition::Center, 'show_qr' => false]);

        $this->get(route('lesson.play', $this->lesson->lesson_code))
            ->assertSee('data-title-position="center"', false)
            ->assertDontSee('id="title-qr-canvas"', false);
    }
}
