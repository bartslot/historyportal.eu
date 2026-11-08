<?php

declare(strict_types=1);

namespace App\Services\Stage25d;

use Illuminate\Support\Collection;

/**
 * A teacher's 3D scene (config.stage25d) built from an era's painted bundle, without the director: the same
 * shape lessons:import-25d writes, so the stage editor and the player read it unchanged.
 *
 * starter(): the backdrop only (sky, far ground, a ground band, the house camera); the teacher drags the rest
 * in from the Decor shelf. forScene(): that backdrop plus the bundle's pictures whose tags the scene's own words
 * name (a building, people in a pose, a prop, a plant), each on its depth band with its distance in metres
 * (GroundDistance). Word matching, no model call: free, and the same scene text always gives the same set.
 */
final class StageSet
{
    /** Where a ground band stands (m); the importer's lessons put theirs at 30. */
    private const BAND_Z = 30;

    /** The tallest plant (m) that may stand in front of the people. */
    private const NEAR_MAX_M = 4.0;

    /** Poses a scene's words can ask for; a figure stands otherwise. */
    private const POSES = ['walk', 'carry', 'push', 'dig', 'kneel', 'sit', 'point'];

    private const BARE_FLOOR = '#d8cfbc';

    /** People from a later time painted into a bundle for one lesson (nl-prehistory: the 1912 dig); only when named. */
    private const CAMEOS = ['holwerda', 'titia'];

    /** @return array<string,mixed> config.stage25d of an empty scene */
    public static function starter(string $bundle, string $id): array
    {
        LibraryBundle::assertName($bundle);
        $assets = collect(LibraryBundle::assets($bundle));

        return self::stage($bundle, $id, self::backdrop($assets, []));
    }

    /** @return array<string,mixed> config.stage25d of a scene the teacher fills: no sky, a bare floor (a colour is no picture) */
    public static function blank(string $bundle, string $id): array
    {
        LibraryBundle::assertName($bundle);

        return self::stage($bundle, $id, ['ground' => self::BARE_FLOOR]);
    }

    /** @return array<string,mixed> config.stage25d for a scene the pipeline planned, its pictures picked by its words */
    public static function forScene(string $bundle, string $id, string $text, int $seed = 0): array
    {
        LibraryBundle::assertName($bundle);
        $assets = collect(LibraryBundle::assets($bundle));
        $words = self::words($text);
        $set = self::backdrop($assets, $words);
        $band = $set['groundBands'][0]['asset'] ?? null;

        $layers = [];
        $building = self::best($assets->where('layer', 'mid')->reject(fn ($a) => $a['id'] === $band || self::isGround($a)), $words, fallback: true);
        if ($building) {
            $layers[] = ['asset' => $building['id'], 'depth' => 'mid', 'x' => 0.64];
        }
        foreach (self::figures($assets, $words, $seed) as $i => $figure) {
            $layers[] = ['asset' => $figure['id'], 'depth' => 'fg', 'x' => $i === 0 ? 0.42 : 0.56, 'figure' => self::char($figure)];
        }
        if ($prop = self::best($assets->where('layer', 'prop'), $words)) {
            $layers[] = ['asset' => $prop['id'], 'depth' => 'near', 'x' => 0.7];
        }
        $plant = self::best($assets->where('layer', 'fg')->reject(fn ($a) => self::isGround($a)), $words)
            ?? $assets->where('layer', 'fg')->reject(fn ($a) => self::isGround($a))->values()->get($seed % max(1, $assets->where('layer', 'fg')->count()));
        if ($plant) {
            $sways = array_intersect((array) ($plant['tags'] ?? []), ['tree', 'shrub', 'grass', 'reeds', 'heather']) !== [];
            // A tree near the camera fills half the frame and hides the people: it stands back at the edge.
            $tall = (float) ($plant['height_m'] ?? 0) > self::NEAR_MAX_M;
            $layers[] = ['asset' => $plant['id'], 'depth' => $tall ? 'mid' : 'near', 'x' => $tall ? 0.08 : 0.12]
                + ($sways ? ['motion' => ['kind' => 'sway', 'amount' => $tall ? 0.3 : 1, 'speed' => $tall ? 0.55 : 1]] : []);
        }

        return self::stage($bundle, $id, ['layers' => [...$set['layers'], ...$layers]] + $set);
    }

    /**
     * Sky, far ground and a ground band, each the best match for the words (the first of its kind otherwise).
     *
     * @param  Collection<int,array<string,mixed>>  $assets
     * @param  list<string>  $words
     * @return array<string,mixed> set
     */
    private static function backdrop(Collection $assets, array $words): array
    {
        $sky = self::best($assets->where('layer', 'sky'), $words, fallback: true);
        $far = self::best($assets->where('layer', 'bg'), $words, fallback: true);
        $band = self::best($assets->filter(fn ($a) => LibraryBundle::isGroundBand($a)), $words, fallback: true);

        return array_filter([
            'sky' => $sky['id'] ?? null,
            'layers' => $far ? [['asset' => $far['id'], 'depth' => 'bg', 'x' => 0.5]] : [],
            'groundBands' => $band ? [['asset' => $band['id'], 'z' => self::BAND_Z]] : null,
        ], fn ($v) => $v !== null);
    }

    /**
     * One or two people: the characters the words name, else two picked by the seed (scene order), each in the
     * pose the words ask for, facing the middle of the picture.
     *
     * @param  Collection<int,array<string,mixed>>  $assets
     * @param  list<string>  $words
     * @return list<array<string,mixed>>
     */
    private static function figures(Collection $assets, array $words, int $seed): array
    {
        $figures = $assets->where('layer', 'figure');
        $chars = $figures->map(fn ($a) => self::char($a))->filter()->unique()->values();
        if ($chars->isEmpty()) {
            return [];
        }
        $named = $chars->filter(fn (string $c) => in_array($c, $words, true))->values();
        $extras = $chars->reject(fn (string $c) => in_array($c, self::CAMEOS, true))->values();
        $picked = ($named->isNotEmpty() || $extras->isEmpty() ? $named : collect([$extras[$seed % $extras->count()], $extras[($seed + 1) % $extras->count()]]))->unique()->take(2);
        $pose = collect(self::POSES)->first(fn (string $p) => in_array($p, $words, true)) ?? 'stand';

        return $picked->values()->map(function (string $char, int $i) use ($figures, $pose) {
            $own = $figures->filter(fn ($a) => self::char($a) === $char);
            $facing = $i === 0 ? 'facing:right' : 'facing:left';
            $match = fn (string $p) => $own->first(fn ($a) => in_array("pose:{$p}", $a['tags'] ?? [], true) && in_array($facing, $a['tags'] ?? [], true));

            return $match($pose) ?? $match('stand') ?? $own->first();
        })->filter()->values()->all();
    }

    /**
     * The asset whose tags share most words with the scene; null when none shares one (the first with $fallback).
     *
     * @param  Collection<int,array<string,mixed>>  $assets
     * @param  list<string>  $words
     * @return array<string,mixed>|null
     */
    private static function best(Collection $assets, array $words, bool $fallback = false): ?array
    {
        $scored = $assets->values()->map(fn ($a) => [$a, count(array_intersect((array) ($a['tags'] ?? []), $words))]);
        $top = $scored->sortByDesc(fn ($s) => $s[1])->first();

        return $top && ($top[1] > 0 || $fallback) ? $top[0] : null;
    }

    /** @return list<string> the scene's words, lowercased, plural s dropped so "cows" finds the tag "cow" */
    private static function words(string $text): array
    {
        $words = preg_split('/[^\p{L}\p{N}-]+/u', mb_strtolower($text), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        return array_values(array_unique([...$words, ...array_map(fn ($w) => (string) preg_replace('/s$/u', '', $w), $words)]));
    }

    /** @param  array<string,mixed>  $asset */
    private static function isGround(array $asset): bool
    {
        return in_array('ground', (array) ($asset['tags'] ?? []), true);
    }

    /** @param  array<string,mixed>  $asset  its character ("meisje"), from the tag char:meisje */
    private static function char(array $asset): ?string
    {
        foreach ((array) ($asset['tags'] ?? []) as $tag) {
            if (str_starts_with((string) $tag, 'char:')) {
                return substr((string) $tag, 5);
            }
        }

        return null;
    }

    /**
     * @param  array<string,mixed>  $set
     * @return array<string,mixed>
     */
    private static function stage(string $bundle, string $id, array $set): array
    {
        [$stage] = GroundDistance::fill(['id' => $id, 'bundle' => $bundle, 'set' => $set + ['layers' => []]]);

        return $stage;
    }
}
