<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Enums\LessonStatus;
use App\Livewire\LessonWizard;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * "Speel de les" (Bart, 2026-10-17: "speel de les doesn't really play the lesson"): the editor's
 * Play opens the real player, what the class sees, over the editor at the selected scene; X and Esc
 * come back to that scene. The old step-5 preview (a still and an orange button) is gone: ?step=5
 * lands in the editor with the player open.
 */
class PlayOverlayTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create();
    }

    private function lesson(LessonStatus $status = LessonStatus::Configuring): Lesson
    {
        $lesson = Lesson::create([
            'teacher_id' => $this->teacher->id, 'title' => 'Abel Tasman: De reis naar het onbekende',
            'topic' => 'X', 'subject' => 'history', 'grade_level' => '9th', 'language' => 'nl',
            'image_style' => 'cinematic', 'status' => $status,
        ]);
        foreach (range(1, 5) as $i) {
            Scene::create(['lesson_id' => $lesson->id, 'order' => $i, 'kind' => 'narration', 'script_segment' => "Scene {$i}.", 'status' => 'ready']);
        }

        return $lesson;
    }

    public function test_play_opens_the_real_player_over_the_editor_at_the_selected_scene(): void
    {
        $lesson = $this->lesson();
        $fifth = $lesson->scenes()->ordered()->get()[4];
        $component = Livewire::actingAs($this->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson]);
        $html = $component->html();

        $this->assertStringContainsString('data-play-lesson', $html);
        $this->assertStringContainsString('data-play-overlay', $html);
        // The frame's address, as @js writes it (escaped slashes and ampersands).
        $this->assertStringContainsString(str_replace('/', '\\/', route('lesson.play', $lesson->lesson_code)).'?embed=1\\u0026autoplay=1\\u0026scene_id=', $html);

        $component->set('selectedSceneId', $fifth->id)->call('prepareToPlay')->assertNoRedirect();
        $this->assertSame(LessonStatus::Previewable, $lesson->fresh()->status, 'the player serves a previewable lesson');
        $this->assertSame(4, (int) $lesson->fresh()->wizard_step, 'Play is not a step: the editor stays the place to come back to');
    }

    public function test_play_leaves_a_published_lesson_published(): void
    {
        $lesson = $this->lesson(LessonStatus::Published);
        Livewire::actingAs($this->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson])->call('prepareToPlay');

        $this->assertSame(LessonStatus::Published, $lesson->fresh()->status);
    }

    public function test_the_old_preview_step_lands_in_the_editor_with_the_player_open(): void
    {
        $lesson = $this->lesson();
        $third = $lesson->scenes()->ordered()->get()[2];

        $this->actingAs($this->teacher)
            ->get(route('teacher.lessons.wizard', $lesson).'?step=5&scene='.$third->id)
            ->assertOk()
            ->assertSee('data-play-overlay', false)
            ->assertSee('data-play-open="1"', false)
            ->assertSee('wizard.step3-scene-configurator', false)
            ->assertDontSee('wizard.step4-preview', false);
        $this->assertSame(LessonStatus::Previewable, $lesson->fresh()->status);

        Livewire::actingAs($this->teacher)->withQueryParams(['step' => 5])->test(LessonWizard::class, ['lesson' => $lesson])
            ->assertSet('step', 4);
    }

    public function test_the_editor_without_play_has_the_player_closed(): void
    {
        $lesson = $this->lesson();
        $this->actingAs($this->teacher)
            ->get(route('teacher.lessons.wizard', $lesson).'?step=4')
            ->assertOk()
            ->assertSee('data-play-open="0"', false);
    }
}
