<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Enums\LessonStatus;
use App\Models\Lesson;
use App\Models\QuizQuestion;
use App\Models\Scene;
use App\Models\User;
use App\Services\LessonExporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Bart, 2026-10-17: "create a version number small under the QR code. then we know what version of
 * the lesson is online." One number per lesson, up once per request that changes it.
 */
class LessonVersionTest extends TestCase
{
    use RefreshDatabase;

    private function lesson(array $extra = []): Lesson
    {
        $lesson = Lesson::create($extra + [
            'teacher_id' => User::factory()->create()->id, 'title' => 'Abel Tasman', 'topic' => 'X', 'subject' => 'history',
            'grade_level' => '9th', 'language' => 'nl', 'image_style' => 'cinematic', 'status' => LessonStatus::Published,
        ]);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'script_segment' => 'Eens.', 'status' => 'ready']);
        $this->nextRequest();

        return $lesson->fresh();
    }

    /** What Laravel does between two requests or two queued jobs. */
    private function nextRequest(): void
    {
        $this->app->forgetScopedInstances();
    }

    private function version(Lesson $lesson): int
    {
        return (int) $lesson->fresh()->content_version;
    }

    public function test_an_edit_bumps_the_version_once_per_request(): void
    {
        $lesson = $this->lesson();
        $v = $this->version($lesson);
        $scene = $lesson->scenes()->first();

        $scene->update(['script_segment' => 'Toen.']);
        $scene->update(['config' => ['lines' => [['speaker' => 'tasman', 'text' => 'Land!']]]]);
        $lesson->update(['title' => 'Abel Tasman: De reis']);
        $this->assertSame($v + 1, $this->version($lesson), 'three writes, one request: one version');
        $this->assertNotNull($lesson->fresh()->content_version_at);

        $this->nextRequest();
        QuizQuestion::create(['lesson_id' => $lesson->id, 'question' => 'Waar?', 'options' => ['A', 'B'], 'correct_index' => 0]);
        $this->assertSame($v + 2, $this->version($lesson));

        $this->nextRequest();
        $scene->delete();
        $this->assertSame($v + 3, $this->version($lesson));
    }

    public function test_bookkeeping_is_not_a_new_version(): void
    {
        $lesson = $this->lesson(['status' => LessonStatus::Configuring]);
        $v = $this->version($lesson);
        $lesson->update(['status' => LessonStatus::Published, 'wizard_step' => 4]);
        $lesson->scenes()->first()->update(['status' => 'generating', 'error_message' => null]);
        $this->assertSame($v, $this->version($lesson));
    }

    public function test_the_player_shows_the_version_it_loaded_under_the_qr_and_alone_when_the_qr_is_off(): void
    {
        $lesson = $this->lesson();
        $v = $this->version($lesson);
        $html = $this->get(route('lesson.play', $lesson->lesson_code))->assertOk()->getContent();
        $this->assertStringContainsString('"content_version":'.$v, $html);
        $this->assertMatchesRegularExpression('#data-title-qr.*?data-title-version[^>]*>v'.$v.'<#s', $html);
        $this->assertStringContainsString('data-title-version-alone', $html);

        $lesson->update(['show_qr' => false]);
        $html = $this->get(route('lesson.play', $lesson->lesson_code))->getContent();
        $this->assertStringNotContainsString('data-title-qr ', $html);
        $this->assertMatchesRegularExpression('#data-title-code.*?data-title-version[^>]*>v'.($v + 1).'<#s', $html, 'the QR off: the code takes its place, the version under it (and turning it off is a change too)');
    }

    public function test_export_carries_the_version_and_an_import_never_goes_back(): void
    {
        $lesson = $this->lesson();
        $lesson->forceFill(['content_version' => 37])->saveQuietly();
        $spec = app(LessonExporter::class)->toSpec($lesson->fresh());
        $this->assertSame(37, $spec['content_version']);
    }
}
