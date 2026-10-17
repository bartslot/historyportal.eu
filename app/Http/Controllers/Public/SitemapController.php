<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Support\Locales;
use App\Support\Seo;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;

/**
 * sitemap.xml, generated from the routes and the published lessons.
 *
 * Each entry lists every language as an xhtml:link alternate, which is how Google is told that the
 * five URLs are one page in five languages rather than five thin duplicates. A lesson is the
 * exception: its content has one language, so it is listed once, at that language's URL.
 */
class SitemapController extends Controller
{
    private const CACHE_MINUTES = 60;

    public function __invoke(): Response
    {
        // Keyed by root URL: a render from the console (tinker, a cron warm-up) resolves URLs against
        // http://localhost, and under one shared key that cached copy was served to Google for an hour
        // (2026-10-12).
        $key = 'sitemap.xml:'.url('/');

        $xml = Cache::remember($key, now()->addMinutes(self::CACHE_MINUTES), function (): string {
            $entries = [];

            foreach (['home' => '1.0', 'lessons' => '0.9', 'about' => '0.6'] as $page => $priority) {
                $entries[] = $this->entry($page, [], $priority, 'weekly');
            }

            foreach (Seo::publicLessons()->latest()->get() as $lesson) {
                $entries[] = $this->entry(
                    'lesson',
                    ['slug' => Seo::lessonSlug($lesson)],
                    '0.8',
                    'monthly',
                    $lesson->updated_at?->toAtomString(),
                    Seo::lessonLocale($lesson),
                );
            }

            // The Dutch curriculum pages: Dutch only, so one URL each and no alternates.
            $entries[] = $this->url(route('public.curriculum'), '0.6', 'monthly', null, '');
            foreach (\App\Models\CurriculumGoal::query()->orderBy('sort')->pluck('slug') as $slug) {
                $entries[] = $this->url(route('public.curriculum.goal', $slug), '0.5', 'monthly', null, '');
            }

            // Articles come from WordPress. The index only earns a place once something is published
            // there, so an empty feed keeps it out of the sitemap entirely.
            $articles = app(\App\Services\WordPressContent::class)->posts(50);

            if ($articles->isNotEmpty()) {
                $entries[] = $this->entry('articles', [], '0.7', 'weekly');

                foreach ($articles as $article) {
                    $entries[] = $this->entry(
                        'article',
                        ['slug' => $article['slug']],
                        '0.6',
                        'monthly',
                        $article['updated_at']?->toAtomString(),
                    );
                }
            }

            return '<?xml version="1.0" encoding="UTF-8"?>'."\n"
                .'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
                .'xmlns:xhtml="http://www.w3.org/1999/xhtml">'."\n"
                .implode('', $entries)
                .'</urlset>'."\n";
        });

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }

    /**
     * @param  array<string,mixed>  $params
     * @param  string|null  $only  a page that exists in one language (a lesson): one <url>, no alternates
     */
    private function entry(string $page, array $params, string $priority, string $changefreq, ?string $lastmod = null, ?string $only = null): string
    {
        if ($only !== null) {
            return $this->url(Seo::url($page, $params, $only), $priority, $changefreq, $lastmod, '');
        }

        $alternates = '';

        foreach (Locales::codes() as $code) {
            $alternates .= sprintf(
                '    <xhtml:link rel="alternate" hreflang="%s" href="%s"/>'."\n",
                Locales::region($code),
                e(Seo::url($page, $params, $code)),
            );
        }

        // One <url> per language, each carrying the full alternate set, per Google's guidance.
        $xml = '';

        foreach (Locales::codes() as $code) {
            $xml .= $this->url(Seo::url($page, $params, $code), $priority, $changefreq, $lastmod, $alternates);
        }

        return $xml;
    }

    private function url(string $loc, string $priority, string $changefreq, ?string $lastmod, string $alternates): string
    {
        return '  <url>'."\n"
            .'    <loc>'.e($loc).'</loc>'."\n"
            .($lastmod ? '    <lastmod>'.e($lastmod).'</lastmod>'."\n" : '')
            .'    <changefreq>'.$changefreq.'</changefreq>'."\n"
            .'    <priority>'.$priority.'</priority>'."\n"
            .$alternates
            .'  </url>'."\n";
    }
}
