<?php

declare(strict_types=1);

namespace App\Services;

use App\Support\Locales;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Reads the marketing site's WordPress as a headless CMS.
 *
 * historyportal.eu runs WordPress (Elementor) with the public REST API open, so published posts
 * can be pulled with no credentials — Bart writes in WordPress, and the article appears on
 * historyportal.eu in the app's own design, with the app's SEO tags and inside its
 * sitemap. Nothing is written back; this is read-only by design.
 *
 * Everything here fails soft. The marketing site being slow or down must never take the subdomain
 * with it, so a failed fetch logs and returns an empty collection: the articles page then renders
 * its "nothing published yet" state instead of an error.
 */
class WordPressContent
{
    /** Long enough that WordPress is hit rarely, short enough that a new post shows up the same day. */
    private const CACHE_MINUTES = 30;

    private const TIMEOUT_SECONDS = 6;

    /** A common adult reading speed for non-fiction, in any of our languages. */
    private const WORDS_PER_MINUTE = 200;

    public function __construct(
        private readonly ?string $baseUrl = null,
    ) {}

    public function configured(): bool
    {
        return filled($this->url());
    }

    private function url(): ?string
    {
        $url = $this->baseUrl ?? config('services.wordpress.url');

        return is_string($url) && $url !== '' ? rtrim($url, '/') : null;
    }

    /**
     * Published posts, newest first, already cleaned up for display.
     *
     * @return \Illuminate\Support\Collection<int,array<string,mixed>>
     */
    public function posts(int $limit = 12): \Illuminate\Support\Collection
    {
        return Cache::remember(
            "wordpress.posts.{$limit}",
            now()->addMinutes(self::CACHE_MINUTES),
            fn () => $this->fetch('posts', $limit),
        );
    }

    /** One post by slug, or null. */
    public function post(string $slug): ?array
    {
        $slug = Str::slug($slug);

        if ($slug === '') {
            return null;
        }

        return Cache::remember(
            "wordpress.post.{$slug}",
            now()->addMinutes(self::CACHE_MINUTES),
            fn () => $this->fetch('posts', 1, ['slug' => $slug])->first(),
        );
    }

    /**
     * @param  array<string,string|int>  $query
     * @return \Illuminate\Support\Collection<int,array<string,mixed>>
     */
    private function fetch(string $resource, int $limit, array $query = []): \Illuminate\Support\Collection
    {
        if (! $this->configured()) {
            return collect();
        }

        try {
            $response = Http::timeout(self::TIMEOUT_SECONDS)
                ->retry(2, 200, throw: false)
                ->acceptJson()
                ->get("{$this->url()}/wp-json/wp/v2/{$resource}", $query + [
                    'per_page' => max(1, min($limit, 50)),
                    'status' => 'publish',
                    'orderby' => 'date',
                    'order' => 'desc',
                    // Categories, tags and the featured image arrive in the same request; WordPress
                    // only returns them when _links and _embedded survive the _fields filter.
                    '_embed' => 'wp:term,wp:featuredmedia',
                    '_fields' => 'id,slug,date,modified,link,title,excerpt,content,_links,_embedded',
                ]);

            if (! $response->successful()) {
                Log::warning('WordPress content fetch failed', [
                    'resource' => $resource,
                    'status' => $response->status(),
                ]);

                return collect();
            }

            return collect($response->json())
                ->map(fn (array $item) => $this->normalise($item))
                ->filter(fn (array $item) => $this->publishable($item))
                ->values();
        } catch (\Throwable $e) {
            // The marketing site is not a dependency of this one.
            Log::warning('WordPress content unavailable', ['error' => $e->getMessage()]);

            return collect();
        }
    }

    /** @return array<string,mixed> */
    private function normalise(array $item): array
    {
        $title = $this->plain($item['title']['rendered'] ?? '');
        $excerpt = $this->plain($item['excerpt']['rendered'] ?? '');
        $html = (string) ($item['content']['rendered'] ?? '');

        return [
            'id' => (int) ($item['id'] ?? 0),
            'slug' => (string) ($item['slug'] ?? ''),
            'title' => $title,
            'excerpt' => Str::limit($excerpt !== '' ? $excerpt : $this->plain($html), 220),
            'html' => $html,
            'reading_minutes' => $this->readingMinutes($html),
            'published_at' => isset($item['date']) ? Carbon::parse($item['date']) : null,
            'updated_at' => isset($item['modified']) ? Carbon::parse($item['modified']) : null,
            'source_url' => (string) ($item['link'] ?? ''),
            'language' => $this->language($item),
            'image' => $item['_embedded']['wp:featuredmedia'][0]['source_url'] ?? null,
        ];
    }

    /**
     * The one language a post is written in: a category or tag whose slug is a shipped locale code
     * ("nl"), otherwise English. WordPress itself has no language field, and without one every
     * post would sit under all five prefixes as five duplicates.
     */
    private function language(array $item): string
    {
        $slugs = collect($item['_embedded']['wp:term'] ?? [])
            ->flatten(1)
            ->pluck('slug');

        return $slugs->first(fn ($slug) => in_array($slug, Locales::codes(), true)) ?? 'en';
    }

    /**
     * Elementor seeds a template site with placeholder posts all called "Project Title" and no body.
     * Surfacing those as articles would be worse than showing nothing, so they are filtered out.
     */
    private function publishable(array $item): bool
    {
        if ($item['slug'] === '' || $item['title'] === '') {
            return false;
        }

        if (Str::lower($item['title']) === 'project title') {
            return false;
        }

        return Str::length(trim(strip_tags($item['html']))) >= 200;
    }

    private function readingMinutes(string $html): int
    {
        // strip_tags keeps what is inside <style> and <script>, and Elementor leaves both in a body.
        $text = $this->plain((string) preg_replace('#<(style|script)\b.*?</\1>#is', ' ', $html));
        $words = preg_match_all("/[\p{L}\p{N}'’-]+/u", $text);

        return max(1, (int) ceil($words / self::WORDS_PER_MINUTE));
    }

    private function plain(string $html): string
    {
        return trim(html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    }
}
