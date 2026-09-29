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

/** A scene background is one thing at a time: colour, image, gradient or video (quizzes too). */
class SceneBackgroundTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    private Scene $quiz;

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::create([
            'teacher_id' => $this->teacher->id, 'topic' => 'X', 'subject' => 'history',
            'grade_level' => '9th', 'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        $this->quiz = Scene::create([
            'lesson_id' => $this->lesson->id, 'order' => 1, 'kind' => 'game', 'game_type' => 'quiz',
            'image_path' => 'lessons/1/old.jpg', 'status' => 'ready',
            'config' => ['bg_embed' => ['kind' => 'sketchfab', 'src' => 'https://sketchfab.com/x']],
        ]);
    }

    private function editor()
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $this->quiz->id);
    }

    public function test_a_gradient_replaces_the_picture_and_any_embed(): void
    {
        $this->editor()->call('setBackgroundGradient', '#1E3A8A', '#f59e0b', 450);

        $scene = $this->quiz->fresh();
        $this->assertNull($scene->image_path);
        $this->assertArrayNotHasKey('bg_embed', $scene->config);
        $this->assertSame(['from' => '#1e3a8a', 'to' => '#f59e0b', 'angle' => 90], $scene->config['background_gradient']);
        $this->assertSame('#1e3a8a', $scene->background_color, 'the first stop is the matte behind layers');
    }

    public function test_a_colour_clears_a_gradient_and_rejects_non_hex(): void
    {
        $editor = $this->editor()->call('setBackgroundGradient', '#000000', '#ffffff', 180);
        $editor->call('setBackgroundColor', 'red');
        $this->assertArrayHasKey('background_gradient', $this->quiz->fresh()->config, 'garbage changes nothing');

        $editor->call('setBackgroundColor', '#224466');
        $scene = $this->quiz->fresh();
        $this->assertSame('#224466', $scene->background_color);
        $this->assertArrayNotHasKey('background_gradient', $scene->config);
    }

    public function test_a_video_background_is_a_muted_looping_iframe(): void
    {
        $this->editor()->call('setBackgroundVideo', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');

        $embed = $this->quiz->fresh()->config['bg_embed'];
        $this->assertSame('video', $embed['kind']);
        $this->assertStringContainsString('youtube.com/embed/dQw4w9WgXcQ', $embed['src']);
        $this->assertStringContainsString('mute=1', $embed['src']);
        $this->assertStringContainsString('loop=1', $embed['src']);
        $this->assertStringContainsString('playlist=dQw4w9WgXcQ', $embed['src']);
    }

    public function test_a_page_that_is_not_a_video_is_refused(): void
    {
        $this->editor()->call('setBackgroundVideo', 'https://example.com/holiday')
            ->assertDispatched('toast');

        $this->assertSame('sketchfab', $this->quiz->fresh()->config['bg_embed']['kind']);
    }
}
