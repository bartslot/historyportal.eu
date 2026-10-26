<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\LessonStatus;
use App\Models\Lesson;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * The one lesson the landing page shows off: the hero animation types its topic, warps, and hands
 * the visitor Configure / Play for it.
 *
 * LANGUAGE IS THE HARD RULE. A visitor is offered a lesson in their own language or the English
 * one, and never a third language. This used to be picked by country alone with a "newest playable
 * lesson" fallback underneath, and on production — where neither Tasman edition had been deployed —
 * that fallback quietly handed Dutch teachers "The Silk Road" in English. A demo in the wrong
 * language is not a slightly worse demo; it is a different product.
 *
 * The visitor's language comes from two signals, browser first:
 *
 *  1. Accept-Language, when it names one of ours. This is the visitor's own setting, and it is what
 *     makes a French speaker anywhere in the world get the French lesson.
 *  2. Otherwise the country's language (config('demo.country_language')). A teacher in Amsterdam
 *     with an English laptop still teaches in Dutch.
 *
 * Resolved by title (config('demo.by_language')) rather than id, because the Canon lessons get
 * rebuilt by `lessons:compose` and come back with a new id and lesson_code. The winning lesson's
 * `language` column is then checked against the language we resolved for: a title can be edited by
 * hand, so a title match alone is not proof, and shipping the wrong language is the one failure
 * this class exists to prevent.
 */
final class DemoLesson
{
    private const CACHE_KEY = 'demo.lesson';

    private const CACHE_MINUTES = 10;

    /** The language every visitor can be served, and the only one it is acceptable to fall back to. */
    public const FALLBACK_LANGUAGE = 'en';

    /** The statuses a visitor can open (LessonPlayerController plays only these to the public). */
    private const PUBLIC_STATUSES = [LessonStatus::Published->value, LessonStatus::Previewable->value];

    /**
     * The lesson this visitor's hero should build, or null when even English has nothing playable.
     */
    public static function resolve(?Request $request = null): ?Lesson
    {
        $language = self::language($request);

        return Cache::remember(
            self::cacheKey($language),
            now()->addMinutes(self::CACHE_MINUTES),
            fn () => self::inLanguage($language)
                ?? ($language === self::FALLBACK_LANGUAGE ? null : self::inLanguage(self::FALLBACK_LANGUAGE)),
        );
    }

    /**
     * The language this visitor's demo must be in.
     *
     * Public because the hero and the guest sandbox both need to know which language they are
     * presenting, and because it is the single decision most worth testing on its own.
     */
    public static function language(?Request $request = null): string
    {
        $request ??= request();

        // A page whose URL names its language (/nl, /de) is that language, whatever the browser says.
        $fromUrl = $request->route()?->parameter('locale');
        if (is_string($fromUrl) && Locales::isSupported($fromUrl)) {
            return $fromUrl;
        }

        // Then the page's own language: the hero sits inside that page, so a Dutch page with an
        // English lesson in it is the one result that is always wrong. SetLocale has already decided
        // it, from the signed-in teacher's setting before the browser. (2026-10-13: Bart, Dutch
        // account on an English browser, got a Dutch page around an English lesson.)
        $page = app()->getLocale();
        if ($page !== self::FALLBACK_LANGUAGE && Locales::isSupported($page)) {
            return $page;
        }

        $browser = self::fromBrowser($request);

        // A browser asking for a language that is NOT English is someone who went and set it, so it
        // wins outright — that is what gets a French speaker in Canada the French lesson.
        //
        // English is a weak signal by comparison. It is the out-of-the-box default on most machines
        // sold anywhere, so "en" usually means nobody chose, not "I want English". A teacher in
        // Amsterdam on a laptop that shipped in English still teaches in Dutch, and a visitor in
        // France still wants the French Revolution. So where they are gets the next say, and plain
        // English is what is left when neither signal says anything.
        if ($browser !== null && $browser !== self::FALLBACK_LANGUAGE) {
            return $browser;
        }

        return self::fromCountry($request)
            ?? $browser
            ?? self::FALLBACK_LANGUAGE;
    }

    /**
     * The learning goal the hero types out.
     *
     * It has to describe the lesson the buttons open, so it only uses the configured line when that
     * line belongs to the lesson that actually won; otherwise `demo.goals` is looked up by the
     * winner's title. A goal is the curriculum topic the teacher has to teach ("De VOC en
     * ontdekkingsreizen"), never the lesson's title (Bart, 2026-10-13); the title is only the last
     * resort for a lesson nobody wrote a goal for.
     * Nothing on screen may promise a lesson the visitor is not about to get — including promising
     * it in a language the lesson is not written in.
     */
    public static function goal(?Request $request = null): string
    {
        $lesson = self::resolve($request);
        if (! $lesson) {
            return (string) config('demo.lesson_goal');
        }

        $goal = ((array) config('demo.goals', []))[$lesson->title] ?? null;
        if ($goal) {
            return (string) $goal;
        }

        // English keeps its env override (DEMO_LESSON_GOAL) for the pinned default lesson.
        if ($lesson->title === config('demo.lesson_title') && $lesson->language === self::FALLBACK_LANGUAGE) {
            return (string) config('demo.lesson_goal');
        }

        // Null-safe: an untitled lesson took /nl down with a 500 (typed string return, pair test round 5).
        return filled($lesson->title) ? (string) $lesson->title : __('A history lesson your class plays together');
    }

    /** Hand-picked hero footage for the lesson that won, if its language entry names any. */
    public static function footage(?Request $request = null): ?string
    {
        $lesson = self::resolve($request);
        $entry = self::entryFor($lesson?->language ?: self::FALLBACK_LANGUAGE);

        return $entry['footage'] ?? config('demo.lesson_footage');
    }

    /**
     * The best playable lesson in one language — the configured one, else any other in it.
     *
     * Never reaches outside the language. That is the whole point: with no rule here, "the newest
     * playable lesson" is what a Dutch visitor got, and it was English.
     */
    private static function inLanguage(string $language): ?Lesson
    {
        $title = self::entryFor($language)['title'] ?? null;

        return self::configured($title, $language)
            ?? self::allowListed(self::playable()->where('language', $language))->latest()->first();
    }

    /**
     * The fallback is never "the newest public lesson by anyone": that put a random teacher's
     * lesson, without a Figma poster, on the front door with its title typed as the goal (pair
     * test round 6). Only an OFFICIAL lesson of a series with a Figma title poster may stand in;
     * otherwise the English hand-picked demo does.
     *
     * Official = `translation_group`, which LessonCopier never copies. Not `title_series`: copies
     * keep that (so they keep the poster), and a teacher's renamed, published copy took over the
     * homepage through it (round 7). The hand-picked titles need no clause here: configured()
     * already serves them.
     */
    private static function allowListed($query)
    {
        return $query->whereIn('translation_group', TitlePoster::seriesWithPosters() ?: ['-']);
    }

    /**
     * The language's configured entry, if it has one.
     *
     * English is not in `by_language`: it comes from `lesson_title` / `lesson_goal`, so
     * DEMO_LESSON_TITLE remains the single env var that pins the default demo, and English has one
     * source of truth rather than two that can disagree.
     */
    private static function entryFor(?string $language): array
    {
        if ($language === self::FALLBACK_LANGUAGE) {
            return [
                'title' => config('demo.lesson_title'),
                'footage' => config('demo.lesson_footage'),
            ];
        }

        $map = (array) config('demo.by_language', []);

        return $language && isset($map[$language]) ? (array) $map[$language] : [];
    }

    /** The Accept-Language header's first preference among the languages we ship, if any. */
    private static function fromBrowser(Request $request): ?string
    {
        $header = (string) $request->header('Accept-Language');
        if ($header === '') {
            return null;
        }

        // Symfony's getPreferredLanguage() returns the FIRST item of the list it was given when the
        // browser matches none of them, so on its own it cannot tell "asked for English" apart from
        // "asked for nothing we have" — and that difference decides whether the country gets a say.
        // So read the header directly.
        foreach (explode(',', $header) as $tag) {
            $code = strtolower(substr(trim(explode(';', $tag)[0]), 0, 2));

            if (Locales::isSupported($code)) {
                return $code;
            }
        }

        return null;
    }

    /** The language the visitor's country implies. */
    private static function fromCountry(Request $request): ?string
    {
        $country = VisitorCountry::code($request);
        $language = $country ? (((array) config('demo.country_language'))[$country] ?? null) : null;

        return Locales::isSupported($language) ? $language : null;
    }

    private static function cacheKey(string $language): string
    {
        return self::CACHE_KEY.'.'.$language;
    }

    /**
     * The lesson named in config/demo.php — trusted because somebody chose it deliberately, but
     * only once its `language` column agrees.
     *
     * It must be public: the homepage links visitors to it, and a private lesson 404s for them.
     * (This once skipped the status check because opening a lesson in the editor unpublished it;
     * Step3SceneConfigurator::mount no longer does that to a playable lesson.)
     */
    private static function configured(?string $title, string $language): ?Lesson
    {
        if (! $title) {
            return null;
        }

        // Every visitor who presses Configure gets a private copy with this same title and
        // language (GuestDemoSession), and a signed-in teacher keeps theirs (GuestDemoController).
        // Those copies are never public, so a public status keeps them off the homepage, where a
        // visitor would 404 on them (pair test round 5). Editing a playable lesson no longer
        // unpublishes it (Step3SceneConfigurator::mount), so the original keeps its status.
        // The hand-picked original carries a translation_group (a copy never does) and is the
        // oldest: it leads, so a teacher's published copy can never win while it is there.
        //
        // A scene being re-narrated or regenerated is not "every scene ready", but it still has
        // its picture and the lesson still plays: the original must not drop out for that.
        $query = self::listed()
            ->whereIn('status', self::PUBLIC_STATUSES)
            ->where('title', $title)
            ->where('language', $language)
            ->whereHas('scenes')
            // A scene still being made with nothing to show yet; an empty scene the editor added
            // (nothing to generate) does not count (round 7).
            ->whereDoesntHave('scenes', fn ($scenes) => $scenes->awaitingMedia()
                ->whereNull('image_path')->whereNull('audio_path')->whereNull('shots'))
            ->whereDoesntHave('scenes', fn ($scenes) => $scenes->where('status', 'failed'));

        // Once the official original exists (it alone carries a translation_group), a copy that
        // kept its title never stands in for it, even while the original is unavailable (round 7).
        $hasOriginal = Lesson::where('title', $title)->where('language', $language)
            ->whereNotNull('translation_group')->exists();
        if ($hasOriginal) {
            $query->whereNotNull('translation_group');
        }

        return $query->orderBy('id')->first();
    }

    /**
     * Lessons a visitor can actually open: public status, a code to open it by, and scenes that are
     * all finished.
     *
     * Deliberately NOT "has a narrated scene", which is what the landing carousel asks. A voyage
     * lesson built by `lessons:make-voyage` is a map tour: every scene is ready and none of them is
     * narrated, so a narration test would reject a lesson that plays perfectly. What actually makes
     * a lesson unopenable is a scene still waiting on the generation pipeline.
     */
    private static function playable()
    {
        return self::listed()
            ->whereIn('status', self::PUBLIC_STATUSES)
            // An untitled lesson has nothing for the hero to type (and took /nl down, round 5).
            ->whereNotNull('title')->where('title', '!=', '')
            ->whereHas('scenes')
            ->whereDoesntHave('scenes', fn ($scenes) => $scenes->awaitingMedia())
            ->whereDoesntHave('scenes', fn ($scenes) => $scenes->where('status', 'failed'));
    }

    /** Not a guest's sandbox copy, and a code to open it by. */
    private static function listed()
    {
        return Lesson::query()
            ->whereDoesntHave('teacher', fn ($owner) => $owner->where('is_guest_demo', true))
            ->whereNotNull('lesson_code');
    }

    /** Drop every language's cached pick — a lesson save can change any of them. */
    public static function forget(): void
    {
        Cache::forget(self::CACHE_KEY); // pre-language key, still worth clearing

        foreach (Locales::codes() as $code) {
            Cache::forget(self::cacheKey($code));
        }
    }
}
