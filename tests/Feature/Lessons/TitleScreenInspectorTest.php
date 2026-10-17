<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

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

/**
 * The title screen's Format panel, ordered by what a teacher changes (Bart, 2026-10-17 on W24VRI:
 * "the titelscherm is hard to admin"): the title and subtitle text first, then the style, then the
 * picture as the one in use plus Change and Upload, then position and QR; the rarely used lesson
 * type and "what to expect" folded under Advanced.
 */
class TitleScreenInspectorTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create();
    }

    private function lesson(array $extra = []): Lesson
    {
        $lesson = Lesson::create($extra + [
            'teacher_id' => $this->teacher->id, 'title' => 'Abel Tasman: De reis naar het onbekende',
            'topic' => 'X', 'subject' => 'history', 'grade_level' => '9th', 'language' => 'nl',
            'image_style' => 'cinematic', 'status' => LessonStatus::Published, 'translation_group' => 'tasman-standard',
        ]);
        foreach (range(1, 12) as $i) {
            Scene::create(['lesson_id' => $lesson->id, 'order' => $i, 'kind' => 'narration', 'script_segment' => 'Eens.', 'status' => 'ready',
                'image_path' => "https://res.cloudinary.com/demo/image/upload/scene-{$i}.webp"]);
        }

        return $lesson;
    }

    private function panel(Lesson $lesson): \Livewire\Features\SupportTesting\Testable
    {
        return Livewire::actingAs($this->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson]);
    }

    public function test_the_panel_is_ordered_by_what_a_teacher_changes(): void
    {
        $html = $this->panel($this->lesson(['title_style' => 'banner']))->html();

        $at = fn (string $needle): int|false => strpos($html, $needle);
        $order = ['data-title-field="title"', 'data-title-field="subtitle"', 'data-title-style=', 'data-title-picture', 'role="radiogroup" aria-label="Title position"', 'data-qr-position=', 'data-title-advanced'];
        $positions = array_map($at, $order);
        $this->assertNotContains(false, $positions, 'every section is there: '.json_encode(array_combine($order, $positions)));
        $sorted = $positions;
        sort($sorted);
        $this->assertSame($sorted, $positions, 'in this order: '.implode(' > ', $order));

        // Lesson type and What to expect live inside the Advanced fold, which starts closed.
        $advanced = substr($html, (int) $at('data-title-advanced'));
        $this->assertStringContainsString('data-lesson-types-toggle', $advanced);
        $this->assertStringContainsString('data-title-expect-editor', $advanced);
        $tag = substr($html, (int) strrpos(substr($html, 0, (int) $at('data-title-advanced')), '<div'));
        $this->assertMatchesRegularExpression('#^<div x-data="\{\s*open: false,#', $tag, 'Advanced starts closed');
    }

    public function test_the_title_and_subtitle_fields_hold_the_two_parts_of_the_title(): void
    {
        $html = $this->panel($this->lesson())->html();

        $this->assertMatchesRegularExpression('#data-title-field="title"[^>]*value="Abel Tasman"|value="Abel Tasman"[^>]*data-title-field="title"#', $html);
        $this->assertMatchesRegularExpression('#data-title-field="subtitle"[^>]*value="De reis naar het onbekende"|value="De reis naar het onbekende"[^>]*data-title-field="subtitle"#', $html);
    }

    public function test_editing_the_title_text_saves_this_lesson_only_and_reloads_the_stage(): void
    {
        $lesson = $this->lesson();
        $english = $this->lesson(['language' => 'en', 'title' => 'Abel Tasman: The voyage into the unknown']);
        $component = $this->panel($lesson);
        $before = $component->get('titleFrameSrc');

        $component->call('setTitleText', '  Abel Tasman ', ' De ontdekking van Australië ');
        $this->assertSame('Abel Tasman: De ontdekking van Australië', $lesson->fresh()->title);
        $this->assertNotSame($before, $component->get('titleFrameSrc'));
        $this->assertSame('Abel Tasman: The voyage into the unknown', $english->fresh()->title, 'a translation keeps its own title');

        $component->call('setTitleText', 'Abel Tasman', '');
        $this->assertSame('Abel Tasman', $lesson->fresh()->title, 'no subtitle, no colon');

        $component->call('setTitleText', '   ', 'Iets');
        $this->assertSame('Abel Tasman', $lesson->fresh()->title, 'a title is never emptied');

        $component->call('setTitleText', str_repeat('a', 300), 'b');
        $this->assertSame('Abel Tasman', $lesson->fresh()->title, 'too long is refused, not cut');
    }

    public function test_the_picture_is_the_one_in_use_with_change_and_upload_not_an_open_grid(): void
    {
        $lesson = $this->lesson(['title_style' => 'banner']);
        $html = $this->panel($lesson)->html();
        $section = substr($html, (int) strpos($html, 'data-title-picture'));
        $section = substr($section, 0, (int) strpos($section, 'role="radiogroup" aria-label="Title position"'));

        // The lesson's pictures sit in the shared strip, closed until Change is pressed.
        $this->assertStringContainsString('data-picture-strip', $section);
        $this->assertMatchesRegularExpression('#x-show="changing"[^>]*x-cloak|x-cloak[^>]*x-show="changing"#', $section);
        $this->assertStringContainsString('data-title-picture-change', $section);
        $this->assertStringContainsString('data-title-picture-upload', $section);
        $this->assertSame(12, substr_count($section, 'data-zoom'), 'each of the lesson\'s pictures once, in the strip');
    }

    public function test_the_background_reuse_strip_is_the_same_shared_strip(): void
    {
        $this->assertStringContainsString('<x-lesson.picture-strip', (string) file_get_contents(resource_path('views/components/lesson/skybox-controls.blade.php')));
        $this->assertStringContainsString('<x-lesson.picture-strip', (string) file_get_contents(resource_path('views/components/lesson/title-screen-inspector.blade.php')));
    }

    public function test_an_uploaded_picture_becomes_the_title_picture(): void
    {
        Storage::fake('public');
        $lesson = $this->lesson(['title_style' => 'banner']);
        $component = $this->panel($lesson);
        $before = $component->get('titleFrameSrc');

        $component->set('titleUpload', UploadedFile::fake()->image('ship.jpg', 1600, 900));

        $image = (string) $lesson->fresh()->title_image;
        $this->assertMatchesRegularExpression("#^/storage/lessons/{$lesson->id}/uploads/[^/]+\.webp$#", $image);
        Storage::disk('public')->assertExists(substr($image, strlen('/storage/')));
        $this->assertNotSame($before, $component->get('titleFrameSrc'));
        $this->assertStringContainsString($image, (string) $lesson->fresh()->titlePoster()['layers'][0]['url'], 'the banner draws the upload as its picture');

        $component->set('titleUpload', UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf'))
            ->assertHasErrors('titleUpload');
        $this->assertSame($image, $lesson->fresh()->title_image);
    }

    /** ABEL TASMAN in the same mint to blue in every style (Figma 2353:1311's stops). */
    public function test_the_banner_letters_use_the_poster_gradient(): void
    {
        $files = glob(public_path('lesson-titles/tasman-standard/banner/letter-*.svg'));
        $this->assertCount(10, $files);
        foreach ($files as $file) {
            preg_match_all('#stop-color="(\#[0-9A-Fa-f]{6})"#', (string) file_get_contents($file), $m);
            $this->assertNotEmpty($m[1], basename($file));
            $this->assertSame([], array_values(array_diff(array_map('strtoupper', $m[1]), ['#3EF0B2', '#3E8EF0'])), basename($file));
        }
    }
}
