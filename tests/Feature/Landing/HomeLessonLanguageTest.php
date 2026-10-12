<?php

declare(strict_types=1);

namespace Tests\Feature\Landing;

use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The landing page's lesson carousels follow the same rule as the hero: the page's own language,
 * or English, never a third one.
 *
 * 2026-10-13 on prod: the Dutch home page opened its "Lessen die klaarstaan" carousel with a FRENCH
 * lesson, and /nl built its lists in a second route that had no language filter and no trending
 * links at all.
 */
class HomeLessonLanguageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

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
        Scene::create([
            'lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration',
            'status' => 'ready', 'audio_path' => 'lessons/x/a.mp3',
        ]);

        return $lesson;
    }

    public function test_the_dutch_home_page_never_shows_a_french_lesson(): void
    {
        $this->lesson("La Révolution française et l'ascension de Napoléon", 'fr');
        $this->lesson('The Silk Road', 'en');
        $this->lesson('De reis van Abel Tasman', 'nl');

        $lessons = $this->get('/nl')->assertOk()->viewData('playableLessons');

        $this->assertSame(['nl', 'en'], $lessons->pluck('language')->all());
    }

    public function test_own_language_comes_before_english_even_when_english_is_newer(): void
    {
        $this->lesson('De reis van Abel Tasman', 'nl');
        $this->lesson('The Silk Road', 'en');

        $titles = $this->get('/nl')->viewData('playableLessons')->pluck('title')->all();

        $this->assertSame(['De reis van Abel Tasman', 'The Silk Road'], $titles);
    }

    public function test_the_english_page_shows_english_only(): void
    {
        $this->lesson('De reis van Abel Tasman', 'nl');
        $this->lesson('The Silk Road', 'en');

        $languages = $this->get('/')->viewData('playableLessons')->pluck('language')->unique()->all();

        $this->assertSame(['en'], array_values($languages));
    }

    public function test_a_lesson_with_a_dutch_version_shows_only_that_version_on_the_dutch_page(): void
    {
        // Multilingual lessons are siblings linked by translation_group. A Dutch teacher should see
        // the Dutch edition once, not the Dutch and the English one side by side.
        $nl = $this->lesson('Dante Alighieri: het leven van een dichter in ballingschap', 'nl');
        $en = $this->lesson('Dante Alighieri: the life of a poet in exile', 'en');
        $nl->update(['translation_group' => 'dante']);
        $en->update(['translation_group' => 'dante']);
        $this->lesson('The Silk Road', 'en');

        $titles = $this->get('/nl')->viewData('playableLessons')->pluck('title')->all();

        $this->assertSame(['Dante Alighieri: het leven van een dichter in ballingschap', 'The Silk Road'], $titles);
    }

    public function test_the_localised_home_page_links_its_trending_cards(): void
    {
        $this->lesson('The Silk Road', 'en');

        $trending = $this->get('/nl')->viewData('trendingLessons');

        $this->assertTrue($trending->has('The Silk Road'));
    }
}
