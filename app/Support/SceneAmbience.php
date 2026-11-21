<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\MusicTrack;
use App\Models\Scene;
use Illuminate\Support\Collection;

/**
 * The ambience bed under a scene: wind, waves, a bazaar. It loops beside the scene's music, in a
 * second MusicMixer in the player, so it never touches the music's "continue from the scene before".
 *
 * scene.config.ambience is the teacher's choice: absent = Auto, 'off' = silence, or
 * {track_id, volume} = that bed. Auto reads what the scene says (script, place, chapter, picture
 * prompt) against each bed's tags; a voyage leg always sails. A 3D scene with its own sound plan
 * keeps it and gets no Auto bed on top.
 */
final class SceneAmbience
{
    public const DEFAULT_VOLUME = 0.5;

    /** How loud the bed stays while the narrator speaks: lower than music dips, it is background. */
    public const DUCK = 0.6;

    /** Words that say nothing about a place, so they never pick a bed on their own. */
    private const GENERIC = [
        'wind', 'sky', 'air', 'outdoor', 'field', 'veld', 'dry', 'droog', 'morning', 'ochtend', 'evening', 'avond',
        'night', 'nacht', 'work', 'build', 'carry', 'kneel', 'stone', 'steen', 'stenen', 'god', 'les', 'lesson',
        'interior', 'home', 'huis', 'house', 'huizen', 'thuis', 'family', 'familie', 'water', 'mensen', 'room',
    ];

    /** A voyage leg's bed by what the narration says: a storm, a dead calm, or plain sailing. */
    private const VOYAGE = [
        'sea-storm' => ['storm', 'stormde', 'onweer', 'gale', 'tempest', 'orkaan'],
        'becalmed-sea' => ['windstil', 'windstilte', 'becalmed', 'kalm', 'calm'],
    ];

    private const SAILING = 'sail-open-sea';

    /** 'auto', 'off', or the chosen track id. */
    public static function choice(Scene $scene): string|int
    {
        $a = $scene->config['ambience'] ?? null;
        if ($a === 'off') {
            return 'off';
        }

        return is_array($a) && (int) ($a['track_id'] ?? 0) > 0 ? (int) $a['track_id'] : 'auto';
    }

    public static function volume(Scene $scene): float
    {
        $a = $scene->config['ambience'] ?? null;

        return is_array($a) && isset($a['volume']) ? round(max(0.0, min(1.0, (float) $a['volume'])), 3) : self::DEFAULT_VOLUME;
    }

    /**
     * The mix the player's ambience mixer plays under this scene (SceneMusic's shape), or null for none.
     *
     * @return array{layers: list<array<string, mixed>>, crossfade: float, duck: float}|null
     */
    public static function forScene(Scene $scene): ?array
    {
        $choice = self::choice($scene);
        $track = match (true) {
            $choice === 'off' => null,
            $choice === 'auto' => self::auto($scene),
            default => self::tracks()->firstWhere('id', $choice),
        };
        if (! $track) {
            return null;
        }

        return [
            'layers' => [['track_id' => $track->id, ...SceneMusic::LAYER_DEFAULTS, 'volume' => self::volume($scene)]],
            'crossfade' => SceneMusic::DEFAULTS['crossfade'],
            'duck' => self::DUCK,
        ];
    }

    /** The bed Auto picks, or null when nothing the scene says fits one. */
    public static function auto(Scene $scene): ?MusicTrack
    {
        if ($scene->kind === 'stage25d' && ! empty($scene->config['stage25d']['sound']['ambience'] ?? null)) {
            return null;   // the 3D stage plays its own beds
        }
        $tracks = self::tracks();
        $words = self::words($scene);

        if ($scene->kind === 'voyage') {
            foreach (self::VOYAGE as $slug => $cues) {
                if (array_intersect($cues, $words) && ($t = $tracks->firstWhere('slug', $slug))) {
                    return $t;
                }
            }

            return $tracks->firstWhere('slug', self::SAILING);
        }

        $context = null;
        $best = null;
        $bestScore = 0;
        foreach ($tracks as $track) {
            $tags = (array) $track->tags;
            $regions = array_map(fn ($t) => substr((string) $t, 1), array_filter($tags, fn ($t) => str_starts_with((string) $t, '!')));
            if ($regions) {
                $context ??= self::words($scene, withLesson: true);
                if (! array_intersect($regions, $context)) {
                    continue;   // a regional bed (Dutch heath, Babylon steppe) only plays where the lesson is
                }
            }
            $score = count(array_intersect(array_diff($tags, self::GENERIC), $words));
            if ($score > $bestScore) {
                [$best, $bestScore] = [$track, $score];
            }
        }

        return $best;
    }

    /** @return Collection<int, MusicTrack> every ambience bed, read once per request (Once::flush() after adding one) */
    public static function tracks(): Collection
    {
        return once(fn () => MusicTrack::query()->ambience()->orderBy('title')->get());
    }

    /** @return list<string> */
    private static function words(Scene $scene, bool $withLesson = false): array
    {
        $text = implode(' ', [$scene->script_segment, $scene->location, $scene->chapter_name, $scene->image_prompt]);
        if ($withLesson) {
            $text .= ' '.($scene->lesson?->topic ?? '');   // the player hands every scene its lesson: no query each
        }

        return array_values(array_unique(preg_split('/[^\p{L}0-9-]+/u', mb_strtolower($text), -1, PREG_SPLIT_NO_EMPTY)));
    }
}
