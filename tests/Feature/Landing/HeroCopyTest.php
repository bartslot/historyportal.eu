<?php

declare(strict_types=1);

namespace Tests\Feature\Landing;

use App\Enums\LessonStatus;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Support\DemoLesson;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The words at the end of the hero animation.
 *
 * The whole landing page is one long build-up: a lesson assembles itself out of a tunnel of
 * pictures, and then it is named. So the payoff line is the lesson's own title, and the line under
 * it is the only place a visitor is told what they just watched. Bart: "title should be lesson
 * name. We need text that sparks imagination and curiosity: our trademark."
 */
class HeroCopyTest extends TestCase
{
    use RefreshDatabase;

    private function playableLesson(string $title): Lesson
    {
        // The hand-picked demo: since round 7 the fallback never takes an arbitrary lesson.
        config(['demo.lesson_title' => $title]);
        $teacher = User::create([
            'name' => 'Owner', 'email' => 'owner@example.com',
            'password' => 'secret-password', 'role' => 'teacher',
        ]);

        $lesson = Lesson::create([
            'teacher_id' => $teacher->id,
            'title' => $title,
            'topic' => $title,
            'subject' => 'history',
            'grade_level' => '7',
            'status' => LessonStatus::Published,
        ]);

        Scene::create([
            'lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration',
            'status' => 'ready', 'script' => 'Once upon a time.', 'audio_path' => 'lessons/1/1.mp3',
        ]);

        DemoLesson::forget();

        return $lesson;
    }

    public function test_the_headline_is_the_lessons_own_name(): void
    {
        $this->playableLesson('The Punic Wars');

        $this->get('/')->assertOk()->assertSee('The Punic Wars', escape: false);
    }

    public function test_the_landing_page_survives_having_no_demo_lesson(): void
    {
        // This is the one that mattered. The headline read $demoLesson->title with no guard, so the
        // moment DemoLesson::resolve() found nothing playable — every lesson unpublished, a lesson
        // mid-rebuild, a fresh install — the FRONT DOOR of the product answered 500 with "Attempt
        // to read property title on null".
        DemoLesson::forget();

        $this->assertNull(DemoLesson::resolve());
        $this->get('/')->assertOk()->assertSee('The lesson they talk about after class.', escape: false);
    }

    public function test_the_lesson_lands_as_its_poster_alone_and_the_poster_plays(): void
    {
        // Bart 2026-10-21: "get rid of the text - the poster is enough. they should just play that
        // poster." No sell line, no Play button: the poster is the play link (hero/portal.js), and
        // the title stays only in the h1 for search engines and screen readers.
        $lesson = $this->playableLesson('The Punic Wars');

        $html = $this->get('/')->assertOk()->getContent();

        $this->assertStringNotContainsString('a game they finish by themselves', $html);
        $this->assertMatchesRegularExpression('#<a\s+href="[^"]*/lesson/'.$lesson->lesson_code.'"[^>]*data-portal-play#s', $html);
        $this->assertSame(1, preg_match_all('#\sdata-portal-play[\s=>]#', $html), 'one way in: the poster');
        $this->assertMatchesRegularExpression('#<h1 class="sr-only">The Punic Wars</h1>#', $html);
    }

    public function test_the_headline_is_not_run_through_the_translator(): void
    {
        // A key that is nothing but a placeholder cannot be translated, and lang:audit reported it
        // as permanently missing in all five languages. A title carrying a colon is the case that
        // proves the placeholder is gone rather than merely satisfied.
        $this->playableLesson('Rome: the republic falls');

        $this->get('/')->assertOk()->assertSee('Rome: the republic falls', escape: false);
    }
}
