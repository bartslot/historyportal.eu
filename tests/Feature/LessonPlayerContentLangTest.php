<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\LessonStatus;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The player chrome speaks the interface locale; the lesson speaks its own language. A screen
 * reader must read Dante's Italian as Italian, even for a visitor whose interface is English.
 */
class LessonPlayerContentLangTest extends TestCase
{
    use RefreshDatabase;

    public function test_lesson_content_carries_the_lesson_language_and_html_keeps_the_ui_locale(): void
    {
        app()->setLocale('en');
        $lesson = Lesson::factory()->create([
            'teacher_id' => User::factory()->teacher(),
            'status' => LessonStatus::Published->value,
            'language' => 'it',
        ]);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready']);

        $html = $this->get(route('lesson.play', ['lessonCode' => $lesson->lesson_code]))
            ->assertOk()
            ->getContent();

        $this->assertMatchesRegularExpression('/<html lang="en"/', $html);
        foreach (['lesson-text-overlay', 'lesson-game-overlay', 'lesson-map-stage'] as $id) {
            $this->assertMatchesRegularExpression("/id=\"{$id}\" lang=\"it\"/", $html, "#{$id} must be lang=it");
        }
        $this->assertMatchesRegularExpression('/x-text="captionText" lang="it"/', $html);
        $this->assertMatchesRegularExpression('/<h1 lang="it"/', $html);
    }
}
