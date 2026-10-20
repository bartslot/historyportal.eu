<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Lesson;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * historyportal.eu/W24VRI is the code a teacher writes on the board: it opens the lesson player.
 */
class LessonShortLinkTest extends TestCase
{
    use RefreshDatabase;

    private function lesson(): Lesson
    {
        return Lesson::factory()->create(['teacher_id' => User::factory()->teacher()]);
    }

    public function test_a_lesson_code_redirects_to_its_player(): void
    {
        $lesson = $this->lesson();

        $this->get('/'.$lesson->lesson_code)
            ->assertRedirect(route('lesson.play', ['lessonCode' => $lesson->lesson_code]));
    }

    public function test_a_code_typed_in_lower_case_still_finds_the_lesson(): void
    {
        $lesson = $this->lesson();

        $this->get('/'.strtolower($lesson->lesson_code))
            ->assertRedirect(route('lesson.play', ['lessonCode' => $lesson->lesson_code]));
    }

    public function test_an_unknown_code_is_not_found(): void
    {
        $this->get('/ZZZZZ9')->assertNotFound();
    }

    public function test_a_deleted_lesson_is_not_found(): void
    {
        $lesson = $this->lesson();
        $lesson->delete();

        $this->get('/'.$lesson->lesson_code)->assertNotFound();
    }

    public function test_real_pages_keep_their_own_route(): void
    {
        $this->get('/about')->assertOk();
    }
}
