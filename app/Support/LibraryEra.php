<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Lesson;
use App\Services\LessonTaxonomy;
use App\Services\Stage25d\LibraryBundle;

/**
 * The era facet of the history-line library: which tijdvak a picture belongs to, and which one a
 * lesson opens on. The vocabulary is the ten periods of config('lesson-taxonomy.periods'), the same
 * one LessonTaxonomy files lessons under, so a lesson's period and a picture's era are one key.
 */
final class LibraryEra
{
    /** A picture's era: its own meta.json entry, else its folder's (config), else null = timeless. */
    public static function resolve(?string $metaEra, ?string $folder): ?string
    {
        $era = $metaEra ?: config('lesson-taxonomy.library_eras.'.$folder);

        return is_string($era) && self::isKnown($era) ? $era : null;
    }

    /**
     * The tijdvakken a group covers in a collection whose pictures carry no era (the line-art
     * icons, config lesson-taxonomy.group_eras): by subcategory, else category. [] is deep time,
     * null timeless.
     *
     * @return list<string>|null
     */
    public static function groupEras(string $collection, ?string $category, ?string $subcategory = null): ?array
    {
        $map = (array) config('lesson-taxonomy.group_eras.'.$collection);
        $eras = $map[(string) $subcategory] ?? $map[(string) $category] ?? null;

        return is_array($eras) ? array_values(array_filter($eras, fn ($e) => is_string($e) && self::isKnown($e))) : null;
    }

    /** Whether a group belongs under an era chip: timeless always, deep time never, else its own. */
    public static function groupFits(?array $eras, string $era): bool
    {
        return $eras === null || in_array($era, $eras, true);
    }

    public static function isKnown(string $era): bool
    {
        return array_key_exists($era, (array) config('lesson-taxonomy.periods'));
    }

    /** "Tijd van regenten en vorsten (1600-1700)"; the years only for an era after year 0. */
    public static function label(string $era): string
    {
        $period = config('lesson-taxonomy.periods.'.$era);
        if (! is_array($period)) {
            return $era;
        }
        $name = self::names()[$era] ?? $period['label'];

        return $period['from'] >= 0 ? "{$name} ({$period['from']}-{$period['to']})" : $name;
    }

    /**
     * The config labels, translated. Spelled out as literal __() calls so lang:audit counts them
     * (it reads only literal strings, and --prune would drop a key it never sees).
     *
     * @return array<string,string>
     */
    private static function names(): array
    {
        return [
            'hunters-farmers' => __('Hunters and farmers'),
            'greeks-romans' => __('Greeks and Romans'),
            'monks-knights' => __('Monks and knights'),
            'cities-states' => __('Cities and states'),
            'discoverers-reformers' => __('Discoverers and reformers'),
            'regents-rulers' => __('Regents and rulers'),
            'wigs-revolutions' => __('Wigs and revolutions'),
            'citizens-steam' => __('Citizens and steam engines'),
            'world-wars' => __('World wars'),
            'television-computer' => __('Television and computer'),
        ];
    }

    /**
     * The era of the tijdvak a lesson is linked to: tijdvak n is the n-th period of the config (the
     * same ten), a kenmerkend aspect "n.m" belongs to tijdvak n. The earliest when it has several.
     */
    private static function fromTijdvak(Lesson $lesson): ?string
    {
        $keys = array_keys((array) config('lesson-taxonomy.periods'));
        $n = $lesson->curriculumGoals()->whereIn('type', ['tijdvak', 'kenmerkend_aspect'])->pluck('code')
            ->map(fn ($code) => (int) strtok((string) $code, '.'))
            ->filter(fn (int $n) => $n >= 1 && $n <= count($keys))
            ->min();

        return $n ? $keys[$n - 1] : null;
    }

    /** The tijdvak a year falls in; negative years are BCE. */
    public static function forYear(int $year): ?string
    {
        foreach ((array) config('lesson-taxonomy.periods') as $key => $period) {
            if ($year >= $period['from'] && $year < $period['to']) {
                return $key;
            }
        }

        return null;
    }

    /**
     * The tijdvak of a date label such as "c. 3400-2850 BCE", "1642", "v. Chr. 3000" or
     * "c. 150,000 years ago": the first year it names, which is where the thing starts. A label
     * that names no era marker (BCE, AD, v. Chr.) and no year of three digits ("figure-v1", "modern")
     * is null.
     */
    public static function forLabel(?string $label): ?string
    {
        $text = (string) preg_replace('/(?<=\d)[,. ](?=\d{3}\b)/', '', (string) $label);
        if (preg_match('/(\d+)\s*years?\s+ago/i', $text, $m)) {
            return self::forYear(1950 - (int) $m[1]);
        }
        $bce = (bool) preg_match('/\b(bce|bc)\b|v\.?\s?chr/i', $text);
        $dated = $bce || preg_match('/\b(ce|ad)\b|n\.?\s?chr/i', $text);
        if (! preg_match($dated ? '/\d+/' : '/\b\d{3,7}\b/', $text, $m)) {
            return null;
        }

        return self::forYear($bce ? -(int) $m[0] : (int) $m[0]);
    }

    /**
     * The era the painted stage bundles of a lesson's stage25d scenes come from: each asset in
     * library.json carries a date label, and the most common tijdvak among them wins.
     */
    private static function fromStageBundles(Lesson $lesson): ?string
    {
        return self::eraOfAssets($lesson->scenes()->where('kind', 'stage25d')->pluck('config')
            ->map(fn ($config) => is_array($config) ? ($config['stage25d']['bundle'] ?? null) : null)
            ->filter(fn ($bundle) => is_string($bundle))
            ->unique()
            ->flatMap(fn (string $bundle) => LibraryBundle::assets($bundle))
            ->all());
    }

    /** @param  list<array<string,mixed>>  $assets  the most common tijdvak among the assets' date labels */
    private static function eraOfAssets(array $assets): ?string
    {
        return collect($assets)
            ->map(fn (array $asset) => self::forLabel(is_string($asset['era'] ?? null) ? $asset['era'] : null))
            ->filter()
            ->countBy()
            ->sortDesc()
            ->keys()
            ->first();
    }

    /**
     * The painted stage bundle of an era (the bundle on the public disk whose assets are mostly from it),
     * the set a teacher's 3D scene is built from. Null: no bundle for the era yet, so no 3D.
     */
    public static function stageBundle(?string $era): ?string
    {
        $eras = once(fn () => collect(LibraryBundle::names())
            ->mapWithKeys(fn (string $bundle) => [$bundle => self::eraOfAssets(LibraryBundle::assets($bundle))])
            ->all());
        $bundle = $era === null ? false : array_search($era, $eras, true);

        return is_string($bundle) ? $bundle : null;
    }

    /** The stage bundle of the era a lesson is set in, or null. */
    public static function stageBundleFor(Lesson $lesson): ?string
    {
        return self::stageBundle(self::forLesson($lesson));
    }

    /**
     * The tijdvak a period name names: a key ("hunters-farmers") or its name in any interface language,
     * with or without the years after it ("Tijd van regenten en vorsten (1600-1700)"). The chat and step 1
     * store the name, and the BCE ones carry no year to read.
     */
    public static function named(?string $text): ?string
    {
        $name = mb_strtolower(trim((string) preg_replace('/\s*\(.*\)\s*$/u', '', (string) $text)));
        if ($name === '') {
            return null;
        }
        foreach ((array) config('lesson-taxonomy.periods') as $key => $period) {
            $names = array_map(fn (string $locale) => mb_strtolower(trans($period['label'], [], $locale)), Locales::codes());
            if ($name === $key || in_array($name, $names, true)) {
                return $key;
            }
        }

        return null;
    }

    /**
     * The ten tijdvakken as choices, in historical order, each labelled in the interface language.
     *
     * @return array<string,string> key => label
     */
    public static function choices(): array
    {
        return collect(array_keys((array) config('lesson-taxonomy.periods')))
            ->mapWithKeys(fn (string $key) => [$key => self::label($key)])
            ->all();
    }

    /** Period keys in historical order, the order of the config. */
    public static function order(string $era): int
    {
        $i = array_search($era, array_keys((array) config('lesson-taxonomy.periods')), true);

        return $i === false ? PHP_INT_MAX : $i;
    }

    /**
     * The era a lesson's library opens on, ONE derivation: a year it names (era, title, topic),
     * then the tijdvak it is linked to (curriculum_goal_lesson), then its earliest dated scene
     * (LessonTaxonomy), then the era of its painted stage bundles, then the era its own backdrops
     * come from. A composed lesson such as Tasman names no year anywhere, but its tijdvak and its
     * history-line backdrops say which era it is.
     * Null: unknown, every era shown.
     */
    public static function forLesson(Lesson $lesson): ?string
    {
        $taxonomy = app(LessonTaxonomy::class);
        $period = self::named($lesson->era) ?? $taxonomy->period($lesson, withScenes: false) ?? self::fromTijdvak($lesson) ?? $taxonomy->period($lesson);
        if ($period !== null) {
            return $period;
        }
        if (($stage = self::fromStageBundles($lesson)) !== null) {
            return $stage;
        }

        return $lesson->scenes()->pluck('image_path')
            ->map(fn ($path) => preg_match('#history-line/[^/]+/([^/?]+)/#', (string) $path, $m) ? self::resolve(null, $m[1]) : null)
            ->filter()
            ->countBy()
            ->sortDesc()
            ->keys()
            ->first();
    }
}
