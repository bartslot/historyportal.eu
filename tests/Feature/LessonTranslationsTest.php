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
 * Sibling lessons linked by `translation_group` (first case: Dante in it/en/nl/de). translations()
 * must only ever surface a sibling a visitor could actually open, and the player shows a language
 * switch to jump between them.
 */
class LessonTranslationsTest extends TestCase
{
    use RefreshDatabase;

    private function playableLesson(array $attributes = []): Lesson
    {
        $lesson = Lesson::factory()->create(array_merge([
            'teacher_id' => User::factory()->teacher(),
            'status' => LessonStatus::Published->value,
        ], $attributes));

        // Same rule the player uses: a lesson with no scenes has nothing to open.
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready']);

        return $lesson->refresh();
    }

    public function test_translations_returns_only_playable_siblings_in_the_same_group(): void
    {
        $italian = $this->playableLesson(['language' => 'it', 'translation_group' => 'dante']);
        $english = $this->playableLesson(['language' => 'en', 'translation_group' => 'dante']);

        // A different group: never a sibling.
        $this->playableLesson(['language' => 'nl', 'translation_group' => 'other-lesson']);

        // Same group, but a draft: not playable, so not a sibling either.
        $this->playableLesson(['language' => 'de', 'translation_group' => 'dante', 'status' => LessonStatus::Draft->value]);

        $translations = $italian->translations();

        $this->assertCount(1, $translations);
        $this->assertTrue($translations->contains('id', $english->id));
    }

    public function test_a_lesson_with_no_group_has_no_translations(): void
    {
        $lesson = $this->playableLesson(['language' => 'en', 'translation_group' => null]);

        $this->assertCount(0, $lesson->translations());
    }

    public function test_the_player_shows_a_language_switch_to_the_sibling(): void
    {
        $italian = $this->playableLesson(['language' => 'it', 'translation_group' => 'dante']);
        $english = $this->playableLesson(['language' => 'en', 'translation_group' => 'dante']);

        $response = $this->get(route('lesson.play', ['lessonCode' => $italian->lesson_code]))
            ->assertOk()
            ->assertSee(route('lesson.play', ['lessonCode' => $english->lesson_code]), false)
            ->assertSee('English');

        // Students watch on phones: the switch must never be hidden below sm, only shrink to a
        // compact flag + code below it (checked against the language-switch container specifically,
        // since other unrelated elements on this page ARE legitimately hidden below sm).
        preg_match('/<div class="dropdown[^"]*"/', $response->getContent(), $switch);
        $this->assertNotEmpty($switch, 'language switch container not found in the page');
        $this->assertStringNotContainsString('hidden', $switch[0]);
    }

    public function test_the_player_shows_no_language_switch_without_a_group(): void
    {
        $lesson = $this->playableLesson(['language' => 'en', 'translation_group' => null]);

        $this->get(route('lesson.play', ['lessonCode' => $lesson->lesson_code]))
            ->assertOk()
            ->assertDontSee(__('Lesson language'));
    }
}
