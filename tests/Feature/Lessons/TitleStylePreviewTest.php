<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Support\TitlePoster;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Each title-style tile is a miniature of the whole title screen in that style: the real player,
 * framed in the style asked for, never saved. A title edit changes what the tiles show.
 */
class TitleStylePreviewTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create();
    }

    private function lesson(): Lesson
    {
        $lesson = Lesson::create([
            'teacher_id' => $this->teacher->id, 'title' => 'Abel Tasman: De reis naar het onbekende',
            'topic' => 'X', 'subject' => 'history', 'grade_level' => '9th', 'language' => 'nl',
            'image_style' => 'cinematic', 'status' => LessonStatus::Published, 'translation_group' => 'tasman-standard',
            'title_style' => TitlePoster::PLAIN,
        ]);
        foreach (range(1, 12) as $i) {
            Scene::create(['lesson_id' => $lesson->id, 'order' => $i, 'kind' => 'narration', 'script_segment' => 'Eens.', 'status' => 'ready',
                'image_path' => "https://res.cloudinary.com/demo/image/upload/scene-{$i}.webp"]);
        }

        return $lesson;
    }

    public function test_each_style_tile_frames_the_real_title_screen_in_that_style(): void
    {
        $lesson = $this->lesson();

        $html = Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->html();

        $this->assertGreaterThan(1, count($lesson->titleChoices()));
        foreach ($lesson->titleChoices() as $choice) {
            $this->assertStringContainsString(e($lesson->titlePreviewSrc($choice['key'])), $html);
        }
    }

    public function test_a_style_preview_draws_that_style_without_saving_it(): void
    {
        $lesson = $this->lesson();

        $preview = $lesson->withTitleStyle(TitlePoster::LETTERS);

        $this->assertSame(TitlePoster::LETTERS, $preview->titleStyle());
        $this->assertSame(TitlePoster::PLAIN, $lesson->fresh()->title_style);
    }

    public function test_a_title_edit_changes_what_the_tiles_frame(): void
    {
        $lesson = $this->lesson();
        $before = $lesson->titlePreviewSrc(TitlePoster::LETTERS);

        $lesson->update(['title' => 'Abel Tasman: Een nieuwe titel']);

        $this->assertNotSame($before, $lesson->fresh()->titlePreviewSrc(TitlePoster::LETTERS));
    }
}
