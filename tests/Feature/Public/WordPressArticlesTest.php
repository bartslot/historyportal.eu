<?php

declare(strict_types=1);

namespace Tests\Feature\Public;

use App\Services\WordPressContent;
use App\Support\Seo;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * The WordPress bridge, exercised against faked responses — the real marketing site is not a test
 * dependency, and these tests must pass with no network.
 */
class WordPressArticlesTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        config()->set('services.wordpress.url', 'https://example.test');
    }

    /** @param array<int,array<string,mixed>> $posts */
    private function fakeWordPress(array $posts): void
    {
        Http::fake([
            'example.test/wp-json/wp/v2/posts*' => Http::response($posts),
        ]);
    }

    /** A post shaped the way the WordPress REST API shapes them. */
    private function wpPost(array $overrides = []): array
    {
        return array_replace([
            'id' => 12,
            'slug' => 'why-stories-beat-timelines',
            'date' => '2026-07-20T09:00:00',
            'modified' => '2026-07-21T09:00:00',
            'link' => 'https://example.test/why-stories-beat-timelines',
            'title' => ['rendered' => 'Why stories beat timelines'],
            'excerpt' => ['rendered' => '<p>A class remembers a person before it remembers a date.</p>'],
            'content' => ['rendered' => '<p>'.str_repeat('A class remembers a person before it remembers a date. ', 12).'</p>'],
        ], $overrides);
    }

    public function test_a_published_article_appears_on_the_subdomain(): void
    {
        $this->fakeWordPress([$this->wpPost()]);

        $this->get(route('public.articles'))
            ->assertOk()
            ->assertSee('Why stories beat timelines')
            ->assertSee('A class remembers a person');

        $this->get(route('public.article', ['slug' => 'why-stories-beat-timelines']))
            ->assertOk()
            ->assertSee('Why stories beat timelines')
            ->assertSee('<link rel="canonical"', escape: false);
    }

    public function test_elementor_placeholder_posts_are_never_surfaced(): void
    {
        // A template site seeds these; they have no body and all share one title.
        $this->fakeWordPress([
            $this->wpPost(['title' => ['rendered' => 'Project Title'], 'slug' => 'project-title']),
            $this->wpPost(['content' => ['rendered' => '<p>Too short.</p>'], 'slug' => 'stub']),
        ]);

        $response = $this->get(route('public.articles'))->assertOk();

        $response->assertDontSee('Project Title');
        $response->assertSee(__('Nothing published here yet.'));
    }

    public function test_an_empty_feed_asks_not_to_be_indexed(): void
    {
        $this->fakeWordPress([]);

        $this->get(route('public.articles'))
            ->assertOk()
            ->assertSee('name="robots" content="noindex', escape: false);
    }

    public function test_a_populated_feed_is_indexable(): void
    {
        $this->fakeWordPress([$this->wpPost()]);

        $this->get(route('public.articles'))
            ->assertOk()
            ->assertSee('name="robots" content="index, follow', escape: false);
    }

    public function test_wordpress_being_down_does_not_take_this_site_with_it(): void
    {
        Http::fake(['example.test/*' => Http::response('gateway timeout', 504)]);

        $this->get(route('public.articles'))
            ->assertOk()
            ->assertSee(__('Nothing published here yet.'));
    }

    public function test_a_wordpress_error_page_never_becomes_an_article(): void
    {
        Http::fake(['example.test/*' => fn () => throw new \RuntimeException('connection refused')]);

        $this->get(route('public.articles'))->assertOk();
        $this->get(route('public.article', ['slug' => 'anything']))->assertNotFound();
    }

    public function test_an_unconfigured_feed_simply_shows_nothing(): void
    {
        config()->set('services.wordpress.url', null);
        Http::fake();

        $this->assertFalse(app(WordPressContent::class)->configured());
        $this->get(route('public.articles'))->assertOk();
        Http::assertNothingSent();
    }

    /** WordPress embeds a post's categories and tags as groups of terms under _embedded.wp:term. */
    private function inLanguage(string $slug, array $overrides = []): array
    {
        return $this->wpPost($overrides + [
            '_embedded' => [
                'wp:term' => [
                    [['taxonomy' => 'category', 'slug' => $slug]],
                    [],
                ],
            ],
        ]);
    }

    public function test_an_article_lives_once_in_the_sitemap_under_its_own_language(): void
    {
        $this->fakeWordPress([
            $this->wpPost(),
            $this->inLanguage('nl', ['id' => 13, 'slug' => 'van-tien-naar-zes-tijdvakken']),
        ]);

        $xml = $this->get(route('sitemap'))->assertOk()->getContent();

        $this->assertStringContainsString('<loc>'.Seo::url('article', ['slug' => 'why-stories-beat-timelines'], 'en').'</loc>', $xml);
        $this->assertStringContainsString('<loc>'.Seo::url('article', ['slug' => 'van-tien-naar-zes-tijdvakken'], 'nl').'</loc>', $xml);

        foreach (['nl', 'de', 'fr', 'it'] as $locale) {
            $this->assertStringNotContainsString(Seo::url('article', ['slug' => 'why-stories-beat-timelines'], $locale), $xml);
        }
        foreach (['en', 'de', 'fr', 'it'] as $locale) {
            $this->assertStringNotContainsString(Seo::url('article', ['slug' => 'van-tien-naar-zes-tijdvakken'], $locale), $xml);
        }
    }

    public function test_a_dutch_article_names_its_dutch_url_as_canonical_on_every_prefix(): void
    {
        $this->fakeWordPress([$this->inLanguage('nl', ['slug' => 'van-tien-naar-zes-tijdvakken'])]);
        $dutch = Seo::url('article', ['slug' => 'van-tien-naar-zes-tijdvakken'], 'nl');

        foreach (['/articles/', '/de/articles/', '/nl/articles/'] as $prefix) {
            $this->get($prefix.'van-tien-naar-zes-tijdvakken')
                ->assertOk()
                ->assertSee('<link rel="canonical" href="'.$dutch.'">', escape: false)
                ->assertDontSee('hreflang=', escape: false);
        }
    }

    public function test_an_article_without_a_language_category_is_english(): void
    {
        $this->fakeWordPress([$this->inLanguage('filter-1')]);

        $this->get('/nl/articles/why-stories-beat-timelines')
            ->assertOk()
            ->assertSee('<link rel="canonical" href="'.Seo::url('article', ['slug' => 'why-stories-beat-timelines'], 'en').'">', escape: false);
    }

    public function test_the_index_links_each_article_in_its_own_language(): void
    {
        $this->fakeWordPress([$this->inLanguage('nl', ['slug' => 'van-tien-naar-zes-tijdvakken'])]);

        $this->get(route('public.articles'))
            ->assertOk()
            ->assertSee('href="'.Seo::url('article', ['slug' => 'van-tien-naar-zes-tijdvakken'], 'nl').'"', escape: false);
    }

    public function test_an_article_carries_blog_posting_structured_data(): void
    {
        $this->fakeWordPress([$this->inLanguage('nl', [
            'slug' => 'van-tien-naar-zes-tijdvakken',
            'title' => ['rendered' => 'Van tien naar zes tijdvakken'],
            '_embedded' => [
                'wp:term' => [[['taxonomy' => 'category', 'slug' => 'nl']]],
                'wp:featuredmedia' => [['source_url' => 'https://example.test/napoleon.jpg']],
            ],
        ])]);

        $html = $this->get('/nl/articles/van-tien-naar-zes-tijdvakken')->assertOk()->getContent();

        preg_match('#<script type="application/ld\+json">(.*?)</script>#s', $html, $match);
        $graph = json_decode($match[1] ?? '{}', true);

        $this->assertSame('BlogPosting', $graph['@type'] ?? null);
        $this->assertSame('Van tien naar zes tijdvakken', $graph['headline']);
        $this->assertSame('nl-NL', $graph['inLanguage']);
        $this->assertSame('2026-07-20', substr($graph['datePublished'], 0, 10));
        $this->assertSame('https://example.test/napoleon.jpg', $graph['image']);
        $this->assertSame(Seo::url('article', ['slug' => 'van-tien-naar-zes-tijdvakken'], 'nl'), $graph['mainEntityOfPage']);
        $this->assertStringContainsString('<meta property="og:image" content="https://example.test/napoleon.jpg">', $html);
    }

    public function test_wordpress_is_asked_to_embed_terms_and_the_featured_image(): void
    {
        $this->fakeWordPress([$this->wpPost()]);

        app(WordPressContent::class)->posts(5);

        Http::assertSent(fn ($request) => str_contains(urldecode($request->url()), '_embed=wp:term,wp:featuredmedia')
            && str_contains(urldecode($request->url()), '_embedded'));
    }

    public function test_an_empty_feed_keeps_articles_out_of_the_sitemap(): void
    {
        $this->fakeWordPress([]);

        $this->assertStringNotContainsString('/articles', $this->get(route('sitemap'))->getContent());
    }

    public function test_reading_time_rounds_up_at_two_hundred_words_a_minute(): void
    {
        $words = fn (int $count) => '<p>'.str_repeat('woord ', $count).'</p>';

        $this->fakeWordPress([
            $this->wpPost(['slug' => 'exactly-two', 'content' => ['rendered' => $words(400)]]),
            $this->wpPost(['slug' => 'just-over-two', 'content' => ['rendered' => $words(401)]]),
            $this->wpPost(['slug' => 'short', 'content' => ['rendered' => $words(60)]]),
        ]);

        $minutes = app(WordPressContent::class)->posts(3)->pluck('reading_minutes', 'slug');

        $this->assertSame(2, $minutes['exactly-two']);
        $this->assertSame(3, $minutes['just-over-two']);
        $this->assertSame(1, $minutes['short']);
    }

    public function test_reading_time_counts_what_a_reader_reads_and_not_the_markup(): void
    {
        // Elementor drops styles and scripts into the body; accented words count as one word.
        $body = '<style>.a { color: red; }</style><script>var a = 1;</script>'
            .'<p class="x" data-y="z">'.str_repeat('één geschiedenisles ', 100).'</p>';
        $this->fakeWordPress([$this->wpPost(['content' => ['rendered' => $body.$body.$body]])]);

        $this->assertSame(3, app(WordPressContent::class)->posts(1)->first()['reading_minutes']);
    }

    public function test_every_article_shows_its_own_reading_time(): void
    {
        $posts = collect([1, 2, 3, 4, 5])->map(fn (int $minutes) => $this->wpPost([
            'slug' => "post-{$minutes}",
            'title' => ['rendered' => "Post {$minutes}"],
            'content' => ['rendered' => '<p>'.str_repeat('woord ', $minutes * 200).'</p>'],
        ]))->all();
        $this->fakeWordPress($posts);

        $index = $this->get(route('public.articles'))->assertOk();

        foreach ([1, 2, 3, 4, 5] as $minutes) {
            $index->assertSee("{$minutes} min read");
        }

        $this->get(route('public.article', ['slug' => 'post-1']))->assertOk()->assertSee('1 min read');
    }

    public function test_the_three_newest_are_featured_and_the_rest_are_a_list(): void
    {
        $this->fakeWordPress(collect(range(1, 5))->map(fn (int $n) => $this->wpPost([
            'slug' => "post-{$n}",
            'title' => ['rendered' => "Post {$n}"],
        ]))->all());

        $html = $this->get(route('public.articles'))->assertOk()->getContent();

        $this->assertSame(3, substr_count($html, 'data-article-featured'));
        $this->assertSame(2, substr_count($html, 'data-article-row'));
    }

    public function test_wordpress_is_asked_only_for_published_posts(): void
    {
        $this->fakeWordPress([$this->wpPost()]);

        app(WordPressContent::class)->posts(5);

        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'status=publish')
                && str_contains($request->url(), 'per_page=5');
        });
    }
}
