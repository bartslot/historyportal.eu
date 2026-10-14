<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Lesson;
use Illuminate\Support\Str;

/**
 * URLs and structured data for the public, indexable side of the site.
 *
 * Search engines need one URL per language, so the marketing pages are locale-prefixed: English
 * sits at the root (`/lessons`) and the others under their code (`/de/lessons`). Every public route
 * is therefore registered twice — see routes/web.php — and this class is the single place that knows
 * how to build either form, so canonical and hreflang tags can never drift apart.
 */
final class Seo
{
    /** Public routes, by the suffix used for both the plain and the locale-prefixed name. */
    public const PAGES = ['home', 'about', 'lessons', 'lesson', 'articles', 'article'];

    /**
     * English route names. The landing page and /about existed before the localised group, so they
     * keep their original names rather than being registered twice under a public.* alias.
     */
    private const ENGLISH_ROUTES = [
        'home' => 'home',
        'about' => 'about',
        'lessons' => 'public.lessons',
        'lesson' => 'public.lesson',
        'articles' => 'public.articles',
        'article' => 'public.article',
    ];

    /**
     * Absolute URL for a public page in a given language.
     *
     * @param  array<string,mixed>  $params
     */
    public static function url(string $page, array $params = [], ?string $locale = null): string
    {
        $locale ??= app()->getLocale();

        if ($locale === 'en') {
            return route(self::ENGLISH_ROUTES[$page] ?? "public.{$page}", $params);
        }

        return route("public.{$page}.localized", ['locale' => $locale] + $params);
    }

    /**
     * hreflang alternates: every shipped language plus x-default pointing at English.
     *
     * @param  array<string,mixed>  $params
     * @return array<string,string>
     */
    public static function alternates(string $page, array $params = []): array
    {
        $alternates = [];

        foreach (Locales::codes() as $code) {
            $alternates[Locales::region($code)] = self::url($page, $params, $code);
        }

        $alternates['x-default'] = self::url($page, $params, 'en');

        return $alternates;
    }

    /**
     * The one language a lesson's public page belongs to: its content language, or English when
     * the interface does not ship that language. Every other prefix is the same content, so it
     * names this one as canonical (SEO audit 2026-10-14: 13 lessons were 65 near-duplicates).
     */
    public static function lessonLocale(Lesson $lesson): string
    {
        $language = (string) $lesson->language;

        return in_array($language, Locales::codes(), true) ? $language : 'en';
    }

    /** Shorten to at most $max characters, cut at a word, with an ellipsis. */
    public static function clip(string $text, int $max): string
    {
        if (mb_strlen($text) <= $max) {
            return $text;
        }

        $cut = mb_substr($text, 0, $max - 1);
        $space = mb_strrpos($cut, ' ');

        return rtrim($space !== false ? mb_substr($cut, 0, $space) : $cut, ' ,.;:').'…';
    }

    /** A lesson's public slug: readable words plus the lesson code, which keeps it unique. */
    public static function lessonSlug(Lesson $lesson): string
    {
        $words = Str::slug(Str::limit((string) ($lesson->title ?: $lesson->topic ?: 'history lesson'), 60, ''));

        return trim($words.'-'.Str::lower((string) $lesson->lesson_code), '-');
    }

    /** Pull the lesson code back out of a slug (the last dash-separated chunk). */
    public static function codeFromSlug(string $slug): string
    {
        $parts = explode('-', $slug);

        return Str::upper((string) end($parts));
    }

    /**
     * A one-sentence description for a lesson, honest about what it is.
     * Falls back through the fields that are actually populated.
     */
    public static function lessonDescription(Lesson $lesson): string
    {
        // A lesson with a teacher guide is described by what the class learns (Bart, 2026-10-13).
        $goal = trim((string) ($lesson->teacher_guide['goal'] ?? ''));
        if ($goal !== '') {
            return $goal;
        }

        $subject = $lesson->title ?: $lesson->topic ?: __('a history topic');
        $minutes = $lesson->duration_seconds ? (int) ceil($lesson->duration_seconds / 60) : null;

        $parts = [__('A narrated history lesson about :subject.', ['subject' => $subject])];

        if ($lesson->grade_level) {
            $parts[] = __('Made for :grade.', ['grade' => $lesson->grade_level]);
        }

        if ($minutes) {
            $parts[] = __('About :minutes minutes, with a quiz.', ['minutes' => $minutes]);
        }

        $parts[] = __('Free to play in the browser, no account needed.');

        return implode(' ', $parts);
    }

    /**
     * Organisation + website graph for the landing page.
     *
     * @return array<string,mixed>
     */
    public static function organisationGraph(): array
    {
        return [
            '@context' => 'https://schema.org',
            '@graph' => [
                [
                    '@type' => 'Organization',
                    '@id' => url('/').'#organization',
                    'name' => 'The Learning Portal',
                    'url' => url('/'),
                    'description' => __('History lessons your class wants to see the end of. Real paintings, a narrated story, and a game they finish themselves. Built in minutes, plays anywhere.'),
                    'email' => 'info@historyportal.eu',
                ],
                [
                    '@type' => 'WebSite',
                    '@id' => url('/').'#website',
                    'url' => url('/'),
                    'name' => 'History Portal',
                    'publisher' => ['@id' => url('/').'#organization'],
                    'inLanguage' => array_map(fn (string $c) => Locales::region($c), Locales::codes()),
                ],
            ],
        ];
    }

    /**
     * A page's structured data with the FAQ added (homepage and /about show <x-landing.faq>).
     *
     * @param  array<string,mixed>  $graph  a graph with '@graph', or none
     * @return array<string,mixed>
     */
    public static function withFaq(array $graph = []): array
    {
        return [
            '@context' => 'https://schema.org',
            '@graph' => [...($graph['@graph'] ?? []), Faq::graphNode()],
        ];
    }

    /**
     * Schema.org LearningResource for one lesson.
     *
     * @return array<string,mixed>
     */
    public static function lessonGraph(Lesson $lesson): array
    {
        $graph = [
            '@context' => 'https://schema.org',
            '@type' => 'LearningResource',
            'name' => $lesson->title ?: $lesson->topic,
            'description' => self::lessonDescription($lesson),
            'url' => self::url('lesson', ['slug' => self::lessonSlug($lesson)]),
            'learningResourceType' => 'Interactive lesson',
            'educationalLevel' => $lesson->grade_level ?: null,
            'about' => $lesson->topic ?: null,
            'inLanguage' => Locales::region(app()->getLocale()),
            'isAccessibleForFree' => true,
            'provider' => ['@id' => url('/').'#organization'],
        ];

        if ($lesson->duration_seconds) {
            // ISO 8601 duration, e.g. PT12M.
            $graph['timeRequired'] = 'PT'.max(1, (int) ceil($lesson->duration_seconds / 60)).'M';
        }

        $guide = (array) ($lesson->teacher_guide ?? []);
        if (! empty($guide['goal'])) {
            $graph['teaches'] = (string) $guide['goal'];
        }

        $resource = array_filter($graph, fn ($value) => $value !== null);
        if (empty($guide['faq'])) {
            return $resource;
        }

        // The FAQ as FAQPage: Google no longer shows FAQ rich results for most sites (Aug 2023), but
        // the markup keeps the answers machine-readable for search and AI answers. It must match the
        // visible accordion word for word, so both read the same array.
        unset($resource['@context']);

        return [
            '@context' => 'https://schema.org',
            '@graph' => [
                $resource,
                [
                    '@type' => 'FAQPage',
                    'mainEntity' => array_map(fn (array $item) => [
                        '@type' => 'Question',
                        'name' => (string) $item['q'],
                        'acceptedAnswer' => ['@type' => 'Answer', 'text' => (string) $item['a']],
                    ], $guide['faq']),
                ],
            ],
        ];
    }

    /**
     * The lessons a visitor may see: published or previewable, with a code and something to play.
     *
     * @return \Illuminate\Database\Eloquent\Builder<Lesson>
     */
    public static function publicLessons()
    {
        return Lesson::query()
            ->whereIn('status', [
                \App\Enums\LessonStatus::Published->value,
                \App\Enums\LessonStatus::Previewable->value,
            ])
            ->whereNotNull('lesson_code')
            ->whereHas('scenes', fn ($q) => $q->whereNotNull('audio_path'));
    }
}
