<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Lesson;
use App\Services\LessonTaxonomy;

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

    /** Period keys in historical order, the order of the config. */
    public static function order(string $era): int
    {
        $i = array_search($era, array_keys((array) config('lesson-taxonomy.periods')), true);

        return $i === false ? PHP_INT_MAX : $i;
    }

    /**
     * The era a lesson's library opens on: its period (LessonTaxonomy), else the era its own
     * backdrops come from. A composed lesson such as Tasman names no year anywhere, but every one
     * of its scenes stands on a history-line backdrop whose folder says which era it is.
     */
    public static function forLesson(Lesson $lesson): ?string
    {
        $period = app(LessonTaxonomy::class)->period($lesson);
        if ($period !== null) {
            return $period;
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
