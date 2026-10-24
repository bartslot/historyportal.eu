<?php

declare(strict_types=1);

namespace Tests\Feature\Landing;

use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Support\DemoLesson;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The landing page must never offer a visitor a lesson in the wrong language.
 *
 * On production the demo picker was keyed by country with "the newest playable lesson" underneath.
 * Neither Tasman edition had been deployed, so every country fell through that fallback and Dutch
 * teachers were handed "The Silk Road" — in English. The picker could not have known better:
 * lessons carried no language at all until this change.
 *
 * The rule is now: your own language, or English. Never a third one.
 */
class DemoLessonLanguageTest extends TestCase
{
    use RefreshDatabase;

    private function lesson(string $title, string $language): Lesson
    {
        $lesson = Lesson::create([
            'teacher_id' => User::factory()->create()->id,
            'title' => $title,
            'topic' => $title,
            'subject' => 'history',
            'language' => $language,
            'grade_level' => '7',
            'status' => 'published',
            'lesson_code' => strtoupper(substr(md5($title.$language), 0, 6)),
        ]);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready']);

        return $lesson;
    }

    /** The three editions config/demo.php names, so the configured path is the one under test. */
    private function seedCanon(): void
    {
        $this->lesson('Abel Tasman: De reis naar het onbekende', 'nl');
        $this->lesson('Abel Tasman: the voyage into the unknown', 'en');
        $this->lesson("La Révolution française et l'ascension de Napoléon", 'fr');
    }

    private function visit(array $headers = []): ?Lesson
    {
        DemoLesson::forget();
        $request = \Illuminate\Http\Request::create('/', 'GET', [], [], [], []);
        foreach ($headers as $k => $v) {
            $request->headers->set($k, $v);
        }

        return DemoLesson::resolve($request);
    }

    public function test_a_dutch_browser_gets_the_dutch_lesson(): void
    {
        $this->seedCanon();

        $lesson = $this->visit(['Accept-Language' => 'nl-NL,nl;q=0.9,en;q=0.8']);

        $this->assertSame('Abel Tasman: De reis naar het onbekende', $lesson?->title);
        $this->assertSame('nl', $lesson?->language);
    }

    /**
     * Bart 2026-10-20, "on prod we don't have a real poster for Abel Tasman": every visitor who
     * presses Configure gets a private copy with the same title and language. The pick was
     * ->first() on the title alone, so a guest's copy (no translation_group, so no Figma poster)
     * became the homepage demo.
     */
    public function test_a_guests_private_copy_never_becomes_the_demo(): void
    {
        $this->seedCanon();
        $original = Lesson::where('language', 'nl')->first();
        $guest = User::factory()->create(['is_guest_demo' => true]);
        $copy = app(\App\Services\LessonCopier::class)->copy($original, $guest, ['status' => 'configuring']);

        $this->assertSame($original->id, $this->visit(['Accept-Language' => 'nl-NL,nl;q=0.9'])?->id);

        // Row order is not guaranteed, so prove it without the original: the copy still never wins.
        $original->delete();
        $this->assertNotSame($copy->id, $this->visit(['Accept-Language' => 'nl-NL,nl;q=0.9'])?->id);
    }

    public function test_a_teacher_in_the_netherlands_gets_dutch_even_with_an_english_laptop(): void
    {
        // The signal that matters is where they teach, not how their OS shipped.
        $this->seedCanon();

        $lesson = $this->visit(['Accept-Language' => 'en-US,en;q=0.9', 'CF-IPCountry' => 'NL']);

        $this->assertSame('nl', $lesson?->language, 'a Dutch teacher was handed an English lesson');
    }

    public function test_a_french_browser_anywhere_in_the_world_gets_the_french_lesson(): void
    {
        $this->seedCanon();

        $lesson = $this->visit(['Accept-Language' => 'fr-CA,fr;q=0.9', 'CF-IPCountry' => 'CA']);

        $this->assertSame('fr', $lesson?->language);
    }

    public function test_a_visitor_in_france_gets_the_french_lesson_whatever_their_browser_says(): void
    {
        $this->seedCanon();

        $lesson = $this->visit(['Accept-Language' => 'en-GB,en;q=0.9', 'CF-IPCountry' => 'FR']);

        $this->assertSame("La Révolution française et l'ascension de Napoléon", $lesson?->title);
    }

    public function test_the_rest_of_the_world_gets_english_tasman(): void
    {
        $this->seedCanon();

        $lesson = $this->visit(['Accept-Language' => 'pt-BR,pt;q=0.9', 'CF-IPCountry' => 'BR']);

        $this->assertSame('Abel Tasman: the voyage into the unknown', $lesson?->title);
        $this->assertSame('en', $lesson?->language);
    }

    public function test_a_language_with_no_lesson_falls_back_to_english_not_to_another_language(): void
    {
        // German has no lesson. The Dutch one must not stand in for it just because it exists.
        $this->seedCanon();

        $lesson = $this->visit(['Accept-Language' => 'de-DE,de;q=0.9', 'CF-IPCountry' => 'DE']);

        $this->assertSame('en', $lesson?->language, 'a German visitor was given a non-English foreign lesson');
    }

    public function test_a_dutch_visitor_is_never_handed_an_unrelated_english_lesson(): void
    {
        // Exactly production's shape: plenty of English lessons, no Dutch one, and one of the
        // English ones is the newest — which is how The Silk Road won.
        $this->lesson('Abel Tasman: the voyage into the unknown', 'en');
        $this->lesson('The Silk Road', 'en');

        $lesson = $this->visit(['Accept-Language' => 'nl-NL,nl;q=0.9', 'CF-IPCountry' => 'NL']);

        $this->assertNotSame('The Silk Road', $lesson?->title, 'the newest-lesson fallback is back');
        $this->assertSame('Abel Tasman: the voyage into the unknown', $lesson?->title);
    }

    public function test_a_title_match_in_the_wrong_language_is_not_accepted(): void
    {
        // Someone renames the English lesson to the Dutch title. The column is the source of truth,
        // so this must NOT satisfy a Dutch visitor.
        $this->lesson('De reis van Abel Tasman', 'en');
        $this->lesson('Abel Tasman: the voyage into the unknown', 'en');

        $lesson = $this->visit(['Accept-Language' => 'nl-NL,nl;q=0.9']);

        $this->assertSame('en', $lesson?->language);
        $this->assertSame('Abel Tasman: the voyage into the unknown', $lesson?->title);
    }

    public function test_the_goal_line_describes_the_lesson_that_actually_won(): void
    {
        // Nothing on screen may promise a lesson the visitor is not about to get.
        $this->lesson('Abel Tasman: the voyage into the unknown', 'en');

        DemoLesson::forget();
        $request = \Illuminate\Http\Request::create('/', 'GET');
        $request->headers->set('Accept-Language', 'nl-NL,nl;q=0.9');

        $this->assertSame(
            config('demo.goals')['Abel Tasman: the voyage into the unknown'],
            DemoLesson::goal($request),
            'the hero typed a Dutch goal over an English lesson',
        );
    }

    public function test_the_page_language_beats_the_browser(): void
    {
        // 2026-10-13: Bart, signed in with Dutch as his language on an English browser, got a Dutch
        // page with an English lesson in the hero. The hero read the browser; the page read his account.
        $this->seedCanon();
        app()->setLocale('nl');

        $lesson = $this->visit(['Accept-Language' => 'en-GB,en;q=0.9']);

        $this->assertSame('nl', $lesson?->language);
    }

    public function test_the_learning_goal_is_a_curriculum_topic_never_the_lesson_title(): void
    {
        // Bart: "Het leerdoel is niet de titel van de les." The teacher types what the class has to
        // learn (De VOC en ontdekkingsreizen); the lesson that answers it is Abel Tasman.
        $this->seedCanon();
        $request = \Illuminate\Http\Request::create('/', 'GET');
        $request->headers->set('Accept-Language', 'nl-NL,nl;q=0.9');
        DemoLesson::forget();

        $this->assertSame('De VOC en ontdekkingsreizen', DemoLesson::goal($request));
        $this->assertNotSame(DemoLesson::resolve($request)?->title, DemoLesson::goal($request));
    }

    public function test_a_fallback_lesson_types_its_own_goal_not_its_title(): void
    {
        // The configured English lesson had a failed scene, so the Batavian Republic won, and the hero
        // typed "The Batavian Republic: A Quest for Liberty" as if that were a learning goal.
        $this->lesson('The Batavian Republic: A Quest for Liberty', 'en')->update(['title_series' => 'tasman-standard']);
        $request = \Illuminate\Http\Request::create('/', 'GET');
        $request->headers->set('Accept-Language', 'en-GB,en;q=0.9');
        DemoLesson::forget();

        $this->assertSame('The first constitution of the Netherlands', DemoLesson::goal($request));
    }

    public function test_a_dutch_lesson_types_its_canon_leerdoel_not_its_title(): void
    {
        $this->lesson('De reis van Abel Tasman', 'nl')->update(['title_series' => 'tasman-standard']);

        DemoLesson::forget();
        $request = \Illuminate\Http\Request::create('/', 'GET');
        $request->headers->set('Accept-Language', 'nl-NL,nl;q=0.9');

        $goal = DemoLesson::goal($request);

        $this->assertNotSame('De reis van Abel Tasman', $goal);
        $this->assertSame('De VOC en ontdekkingsreizen', $goal);
    }

    public function test_the_url_language_beats_an_english_browser(): void
    {
        $this->lesson('Abel Tasman: the voyage into the unknown', 'en');
        $this->lesson('De reis van Abel Tasman', 'nl');

        $request = \Illuminate\Http\Request::create('/nl', 'GET');
        $request->headers->set('Accept-Language', 'en-US,en;q=0.9');
        $request->setRouteResolver(fn () => (new \Illuminate\Routing\Route('GET', '{locale}', []))->bind($request));

        $this->assertSame('nl', DemoLesson::language($request));
    }

    /**
     * Pair test round 5 (demo-killer): one scene of the original went `pending` during a
     * re-narration, the original dropped out, and a teacher's private Configureren copy with the
     * same title became the homepage link, a 404 for every visitor.
     */
    public function test_an_original_mid_regeneration_keeps_the_homepage_and_a_teachers_copy_never_wins(): void
    {
        $this->seedCanon();
        $original = Lesson::where('language', 'nl')->first();
        $original->update(['translation_group' => 'tasman']);
        Scene::create(['lesson_id' => $original->id, 'order' => 2, 'kind' => 'narration', 'status' => 'pending',
            'image_path' => 'lessons/1/scene-2.jpg']);
        $teacher = User::factory()->create();
        $copy = app(\App\Services\LessonCopier::class)->copy($original, $teacher, ['status' => 'configuring']);
        $copy->scenes()->update(['status' => 'ready']);

        $this->assertSame($original->id, $this->visit(['Accept-Language' => 'nl-NL,nl;q=0.9'])?->id);

        // The page itself links the original's code, never the copy's.
        DemoLesson::forget();
        $html = $this->withoutVite()->get('/nl')->assertOk()->getContent();
        $this->assertStringContainsString('/lesson/'.$original->lesson_code, $html);
        $this->assertStringNotContainsString('/lesson/'.$copy->lesson_code, $html);
    }

    public function test_a_private_lesson_is_never_the_demo_even_without_the_original(): void
    {
        $this->seedCanon();
        $original = Lesson::where('language', 'nl')->first();
        $copy = app(\App\Services\LessonCopier::class)->copy($original, User::factory()->create(), ['status' => 'configuring']);
        $original->delete();

        $this->assertNotSame($copy->id, $this->visit(['Accept-Language' => 'nl-NL,nl;q=0.9'])?->id);
    }

    /** Pair test round 5: /nl answered 500 because the fallback lesson had no title (typed string). */
    public function test_an_untitled_lesson_neither_becomes_the_demo_nor_breaks_the_goal(): void
    {
        $untitled = $this->lesson('tmp', 'nl');
        $untitled->forceFill(['title' => null])->save();

        $this->assertNotSame($untitled->id, $this->visit(['Accept-Language' => 'nl-NL,nl;q=0.9'])?->id);
        DemoLesson::forget();
        $this->withoutVite()->get('/nl')->assertOk();
    }

    /**
     * Pair test round 6: with the Dutch hand-picked demo gone, the newest Dutch lesson by anyone
     * took the front door. A lesson without a Figma poster series never stands in; the English
     * hand-picked demo does.
     */
    public function test_without_its_demo_a_language_falls_back_to_the_english_demo_not_a_random_lesson(): void
    {
        $english = $this->lesson('Abel Tasman: the voyage into the unknown', 'en');
        $this->lesson('Mijn eigen les over de Gouden Eeuw', 'nl');

        $this->assertSame($english->id, $this->visit(['Accept-Language' => 'nl-NL,nl;q=0.9'])?->id);
    }

    public function test_a_lesson_of_a_series_with_a_figma_poster_may_stand_in(): void
    {
        $this->lesson('Abel Tasman: the voyage into the unknown', 'en');
        $series = $this->lesson('Tasman, tweede editie', 'nl');
        $series->update(['title_series' => 'tasman-standard']);

        $this->assertSame($series->id, $this->visit(['Accept-Language' => 'nl-NL,nl;q=0.9'])?->id);
    }
}
