<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

class LessonPosterChoiceTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::create([
            'teacher_id' => $this->teacher->id, 'topic' => 'Tasman', 'subject' => 'history', 'grade_level' => '9th',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
    }

    private function scene(int $order, array $attrs): Scene
    {
        return Scene::create(array_merge([
            'lesson_id' => $this->lesson->id, 'order' => $order, 'kind' => 'narration', 'year' => '1642',
            'location' => 'Batavia', 'script_segment' => 'Script.', 'status' => 'ready',
        ], $attrs));
    }

    private function editor()
    {
        return Livewire::actingAs($this->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson]);
    }

    public function test_every_scene_offers_one_picture_including_a_diorama_background(): void
    {
        $this->scene(1, ['image_path' => 'lessons/1/scene1.webp']);
        $this->scene(2, ['config' => ['diorama' => ['plate' => ['base' => '/diorama/quay/', 'image' => 'background.webp']]]]);
        $this->scene(3, ['config' => ['diorama' => ['plate' => ['image' => 'https://res.cloudinary.com/x/lungarno.webp']]]]);
        $this->scene(4, []);   // no picture: not offered
        Storage::disk('public')->put('lessons/1/scene1.webp', 'x');

        $options = $this->lesson->fresh()->scenePosterOptions();

        $this->assertSame(['Scene 1', 'Scene 2', 'Scene 3'], array_column($options, 'label'));
        $this->assertStringEndsWith('lessons/1/scene1.webp', $options[0]['url']);
        $this->assertSame('/diorama/quay/background.webp', $options[1]['url']);
        $this->assertSame('https://res.cloudinary.com/x/lungarno.webp', $options[2]['url']);
    }

    public function test_choosing_a_scene_makes_its_picture_the_poster_and_auto_undoes_it(): void
    {
        $this->scene(1, ['config' => ['diorama' => ['plate' => ['image' => 'https://res.cloudinary.com/x/lungarno.webp']]]]);

        $this->editor()->call('selectPoster', 'https://res.cloudinary.com/x/lungarno.webp');
        $this->assertSame('https://res.cloudinary.com/x/lungarno.webp', $this->lesson->fresh()->posterOverrideUrl());

        $this->editor()->call('resetPoster');
        $this->assertNull($this->lesson->fresh()->poster_image);
    }

    public function test_an_uploaded_image_becomes_the_poster_as_webp(): void
    {
        $this->editor()->set('posterUpload', UploadedFile::fake()->image('harbour.png', 800, 1200));

        $path = $this->lesson->fresh()->poster_image;
        $this->assertStringStartsWith("lessons/{$this->lesson->id}/poster/", $path);
        $this->assertStringEndsWith('.webp', $path);
        Storage::disk('public')->assertExists($path);
    }

    public function test_a_file_that_is_not_an_image_is_refused(): void
    {
        $this->editor()->set('posterUpload', UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf'))
            ->assertHasErrors('posterUpload');

        $this->assertNull($this->lesson->fresh()->poster_image);
    }
}
