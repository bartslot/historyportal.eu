<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Enums\LessonStatus;
use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Support\Locales;
use App\Support\TrendingTopics;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * The landing page, for `/` and every `/{locale}`.
 *
 * One controller because there used to be two closures: the English one cached and linked the
 * trending cards, the localised one did neither and had no language filter, so the Dutch page
 * opened with a French lesson. Lessons shown follow the hero's rule (App\Support\DemoLesson): the
 * page's own language first, then English, never a third language.
 */
class HomeController extends Controller
{
    private const CACHE_MINUTES = 10;

    private const FALLBACK_LANGUAGE = 'en';

    private const CAROUSEL_SIZE = 12;

    public function __invoke(): View
    {
        $language = app()->getLocale();

        return view('historyportal', [
            'playableLessons' => $this->playableLessons($language),
            'trendingLessons' => $this->trendingLessons(),
        ]);
    }

    /**
     * Cached per language (~2s cold against the remote DB, ~40ms warm). Lesson::booted forgets
     * every language's key on any lesson save, so a newly published lesson shows at once.
     */
    private function playableLessons(string $language): Collection
    {
        return Cache::remember(self::cacheKey($language), now()->addMinutes(self::CACHE_MINUTES), function () use ($language) {
            $languages = array_values(array_unique([$language, self::FALLBACK_LANGUAGE]));

            $lessons = $this->publicPlayable()
                ->whereIn('language', $languages)
                ->with(['firstScene', 'source'])
                // Own language first, newest first within each language.
                ->orderByRaw('CASE WHEN language = ? THEN 0 ELSE 1 END', [$language])
                ->latest()
                ->get();

            return $this->withoutTranslatedSiblings($lessons, $language)
                ->take(self::CAROUSEL_SIZE)
                ->values();
        });
    }

    /**
     * A multilingual lesson is a set of siblings sharing `translation_group`. When the page's own
     * language edition is in the list, its English sibling is dropped, so a Dutch teacher sees the
     * Dutch Dante once instead of the Dutch and the English one side by side.
     */
    private function withoutTranslatedSiblings(Collection $lessons, string $language): Collection
    {
        $groupsInOwnLanguage = $lessons
            ->where('language', $language)
            ->pluck('translation_group')
            ->filter()
            ->all();

        return $lessons->reject(fn (Lesson $lesson) => $lesson->language !== $language
            && $lesson->translation_group !== null
            && in_array($lesson->translation_group, $groupsInOwnLanguage, true));
    }

    /**
     * The five curated cards, keyed by lesson title so each poster links to its real lesson.
     * Ascending on purpose: keyBy keeps the LAST row for a duplicate title, so a rebuilt lesson
     * (same title, higher id) wins.
     */
    private function trendingLessons(): Collection
    {
        return Cache::remember('home.trending_lessons', now()->addMinutes(self::CACHE_MINUTES), fn () => $this->publicPlayable()
            ->whereIn('title', TrendingTopics::lessonTitles())
            ->orderBy('id')
            ->get()
            ->keyBy('title'));
    }

    /** Published or previewable, openable by code, with at least one narrated scene. */
    private function publicPlayable(): Builder
    {
        return Lesson::query()
            ->whereIn('status', [LessonStatus::Published->value, LessonStatus::Previewable->value])
            ->whereNotNull('lesson_code')
            // Excludes empty stubs that would open the player to a perpetual "audio generating" screen.
            ->whereHas('scenes', fn ($q) => $q->whereNotNull('audio_path'));
    }

    public static function cacheKey(string $language): string
    {
        return 'home.playable_lessons.'.$language;
    }

    /** Drop every language's cached carousel. */
    public static function forget(): void
    {
        foreach (Locales::codes() as $code) {
            Cache::forget(self::cacheKey($code));
        }
    }
}
