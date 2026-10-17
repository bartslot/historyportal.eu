<?php

declare(strict_types=1);

namespace Tests\Feature\Public;

use App\Enums\LessonStatus;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Support\Locales;
use App\Support\Seo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeoPagesTest extends TestCase
{
    use RefreshDatabase;

    private function publishedLesson(array $attributes = []): Lesson
    {
        $lesson = Lesson::factory()->for(User::factory()->teacher(), 'teacher')->create($attributes + [
            'title' => 'Anne Frank and the Secret Annex',
            'topic' => 'Anne Frank',
            'status' => LessonStatus::Published,
            'grade_level' => 'Age 12',
            'duration_seconds' => 720,
        ]);

        // Only lessons with narrated scenes are public — that is what makes them playable.
        Scene::create([
            'lesson_id' => $lesson->id,
            'order' => 1,
            'kind' => 'narration',
            'status' => 'ready',
            'audio_path' => "lessons/{$lesson->id}/scenes/1/audio.mp3",
            'config' => [],
        ]);

        return $lesson->refresh();
    }

    public function test_the_lesson_library_lists_published_lessons(): void
    {
        $lesson = $this->publishedLesson();

        $this->get(route('public.lessons'))
            ->assertOk()
            ->assertSee($lesson->title)
            ->assertSee(Seo::lessonSlug($lesson));
    }

    public function test_a_lesson_that_is_not_public_stays_out_of_the_library(): void
    {
        $draft = Lesson::factory()->for(User::factory()->teacher(), 'teacher')->create([
            'title' => 'Unfinished Draft Lesson',
            'status' => LessonStatus::Draft,
        ]);

        $this->get(route('public.lessons'))->assertOk()->assertDontSee($draft->title);
        $this->get(route('public.lesson', ['slug' => Seo::lessonSlug($draft)]))->assertNotFound();
    }

    public function test_a_lesson_page_carries_the_tags_a_search_engine_needs(): void
    {
        $lesson = $this->publishedLesson();
        $slug = Seo::lessonSlug($lesson);
        $url = route('public.lesson', ['slug' => $slug]);

        $response = $this->get($url)->assertOk();

        $response->assertSee('<link rel="canonical" href="'.$url.'"', escape: false);
        $response->assertSee('property="og:title"', escape: false);
        $response->assertSee('property="og:image"', escape: false);
        $response->assertSee('name="twitter:card"', escape: false);
        $response->assertSee('"@type":"LearningResource"', escape: false);
        $response->assertSee('"timeRequired":"PT12M"', escape: false);
        $response->assertSee('name="robots" content="index, follow', escape: false);
    }

    /**
     * SEO audit 2026-10-14: an English lesson also lived at /nl/, /de/, /fr/ and /it/ with the same
     * English content, so 13 lessons were 65 near-duplicates. A lesson is one page, in its own
     * language: every other prefix still renders (its buttons are translated) but names that page
     * as canonical and claims no alternates.
     */
    public function test_a_lesson_has_one_canonical_page_in_its_own_language(): void
    {
        $lesson = $this->publishedLesson(['language' => 'nl']);
        $slug = Seo::lessonSlug($lesson);
        $own = Seo::url('lesson', ['slug' => $slug], 'nl');

        foreach (Locales::codes() as $code) {
            $this->get(Seo::url('lesson', ['slug' => $slug], $code))
                ->assertOk()
                ->assertSee('<link rel="canonical" href="'.$own.'"', escape: false)
                ->assertDontSee('hreflang=', escape: false);
        }
    }

    public function test_a_lesson_in_an_unshipped_language_is_canonical_in_english(): void
    {
        $lesson = $this->publishedLesson(['language' => 'es']);
        $slug = Seo::lessonSlug($lesson);

        $this->get(Seo::url('lesson', ['slug' => $slug], 'de'))
            ->assertOk()
            ->assertSee('<link rel="canonical" href="'.Seo::url('lesson', ['slug' => $slug], 'en').'"', escape: false);
    }

    /** Google cuts a title past ~60 characters: a long one drops the brand rather than get cut. */
    public function test_a_long_lesson_title_drops_the_brand_suffix(): void
    {
        $lesson = $this->publishedLesson(['title' => 'The Haitian Revolution: The Journey of Toussaint Louverture']);

        $this->get(route('public.lesson', ['slug' => Seo::lessonSlug($lesson)]))
            ->assertOk()
            ->assertSee('<title>The Haitian Revolution: The Journey of Toussaint Louverture</title>', escape: false);
    }

    public function test_a_short_title_keeps_the_brand_suffix(): void
    {
        $lesson = $this->publishedLesson(['title' => 'Gladiators']);

        $this->get(route('public.lesson', ['slug' => Seo::lessonSlug($lesson)]))
            ->assertOk()
            ->assertSee('<title>Gladiators · History Portal</title>', escape: false);
    }

    public function test_no_public_description_runs_past_160_characters(): void
    {
        $lesson = $this->publishedLesson(['title' => 'The Haitian Revolution: The Journey of Toussaint Louverture']);
        $pages = [route('public.lesson', ['slug' => Seo::lessonSlug($lesson)])];

        foreach (Locales::codes() as $code) {
            $pages[] = Seo::url('home', [], $code);
        }

        foreach ($pages as $url) {
            preg_match('/<meta name="description" content="([^"]*)"/', $this->get($url)->getContent(), $m);
            $description = html_entity_decode($m[1] ?? '', ENT_QUOTES);

            $this->assertNotSame('', $description, $url);
            $this->assertLessThanOrEqual(160, mb_strlen($description), "{$url}: {$description}");
        }
    }

    public function test_a_localised_page_renders_in_the_url_language_whoever_is_reading(): void
    {
        $this->publishedLesson();

        // A signed-in Dutch teacher must still get German at a /de/ URL: that is the page Google
        // indexed, so that is the page the reader has to see.
        $teacher = User::factory()->teacher()->create(['locale' => 'nl']);

        $this->actingAs($teacher)
            ->get(Seo::url('lessons', [], 'de'))
            ->assertOk()
            ->assertSee(__('Lesson library', [], 'de'))
            ->assertSee('lang="de-DE"', escape: false);
    }

    public function test_a_wrong_slug_redirects_to_the_canonical_one(): void
    {
        $lesson = $this->publishedLesson();

        $this->get(route('public.lesson', ['slug' => 'some-old-title-'.strtolower($lesson->lesson_code)]))
            ->assertRedirect(route('public.lesson', ['slug' => Seo::lessonSlug($lesson)]));
    }

    public function test_the_sitemap_lists_pages_in_every_language_and_a_lesson_once(): void
    {
        $lesson = $this->publishedLesson(['language' => 'en']);
        $slug = Seo::lessonSlug($lesson);

        $response = $this->get(route('sitemap'))->assertOk();
        $response->assertHeader('Content-Type', 'application/xml; charset=UTF-8');

        $xml = $response->getContent();

        // Well-formed, or a crawler discards the whole file.
        $this->assertInstanceOf(\SimpleXMLElement::class, simplexml_load_string($xml));

        foreach (Locales::codes() as $code) {
            $this->assertStringContainsString('<loc>'.Seo::url('lessons', [], $code).'</loc>', $xml);
        }

        $this->assertSame(1, substr_count($xml, $slug), 'a lesson is listed once, in its own language');
        $this->assertStringContainsString('<loc>'.Seo::url('lesson', ['slug' => $slug], 'en').'</loc>', $xml);
    }

    public function test_a_sitemap_rendered_on_another_host_is_never_served_to_the_real_one(): void
    {
        // 2026-10-12: a console render (tinker) cached URLs on http://localhost under the shared key,
        // and Google was handed that copy on the live domain for an hour.
        $this->get('http://localhost/sitemap.xml')->assertOk();

        $live = $this->get('https://historyportal.eu/sitemap.xml')->assertOk()->getContent();

        $this->assertStringNotContainsString('http://localhost', $live);
        $this->assertStringContainsString('<loc>https://historyportal.eu', $live);
    }

    public function test_robots_points_crawlers_at_the_sitemap_and_away_from_the_app(): void
    {
        $robots = file_get_contents(public_path('robots.txt'));

        $this->assertStringContainsString('Sitemap: https://historyportal.eu/sitemap.xml', $robots);
        $this->assertStringContainsString('Disallow: /teacher/', $robots);
    }

    public function test_the_locale_prefix_cannot_swallow_the_app_routes(): void
    {
        // 'teacher' and 'login' are not languages; they must reach their own routes.
        $this->get('/login')->assertOk();
        $this->get('/es/history-lessons')->assertNotFound();
    }
}
