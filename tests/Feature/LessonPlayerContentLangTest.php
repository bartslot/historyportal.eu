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
 * The player speaks the LESSON's language: an Italian lesson shows Italian buttons, quiz screens,
 * pause and score screens, whatever the visitor's interface language is, because the class in
 * front of it is following an Italian lesson. A lesson in a language the interface doesn't ship
 * keeps the visitor's interface language.
 */
class LessonPlayerContentLangTest extends TestCase
{
    use RefreshDatabase;

    private function playerHtml(string $language): string
    {
        app()->setLocale('en');
        $lesson = Lesson::factory()->create([
            'teacher_id' => User::factory()->teacher(),
            'status' => LessonStatus::Published->value,
            'language' => $language,
        ]);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready']);

        return $this->withHeader('Accept-Language', 'en')
            ->get(route('lesson.play', ['lessonCode' => $lesson->lesson_code]))
            ->assertOk()
            ->getContent();
    }

    public function test_an_italian_lesson_renders_the_whole_player_in_italian(): void
    {
        $html = $this->playerHtml('it');

        $this->assertMatchesRegularExpression('/<html lang="it"/', $html);
        $this->assertStringContainsString('Inizia la lezione', $html);        // title screen (Blade)
        $this->assertStringContainsString('Quiz in pausa', $html);            // pause screen (JS dictionary)
        $this->assertStringContainsString('Entra in classifica', $html);      // score screen leaderboard
        foreach (['lesson-text-overlay', 'lesson-game-overlay', 'lesson-map-stage'] as $id) {
            $this->assertMatchesRegularExpression("/id=\"{$id}\" lang=\"it\"/", $html, "#{$id} must be lang=it");
        }
    }

    public function test_a_lesson_in_an_unshipped_language_keeps_the_visitors_interface_language(): void
    {
        $html = $this->playerHtml('es');

        $this->assertMatchesRegularExpression('/<html lang="en"/', $html);
        $this->assertStringNotContainsString('Entra in classifica', $html);
    }
}
