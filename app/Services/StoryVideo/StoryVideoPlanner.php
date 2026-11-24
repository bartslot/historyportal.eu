<?php

declare(strict_types=1);

namespace App\Services\StoryVideo;

use App\Enums\StoryMediaKind;
use App\Enums\StoryMediaStatus;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\StoryMediaItem;
use Illuminate\Support\Str;

/**
 * Reads an approved script and lists what story to video will make: one sheet per cast member, one empty world
 * shot per narrated scene, and the clips. Planning spends nothing and can run again after the script changes:
 * an item whose input is unchanged keeps what was made; a changed one goes back to "not made yet"; one that no
 * longer exists is removed.
 *
 * Clip beats: the scene's narration sentences, grouped in order into clips of clip_min..clip_max seconds
 * (Seedance takes 4-15 s). A clip runs the whole beat; a clip that comes back short holds its last frame.
 */
final class StoryVideoPlanner
{
    /** Spoken words per second when a scene has no narration audio yet (about 155 words a minute). */
    private const WORDS_PER_SECOND = 2.6;

    /** @return array<string, int> counts per kind */
    public function plan(Lesson $lesson): array
    {
        $outline = is_array($lesson->outline) ? $lesson->outline : [];
        $cast = self::cast($outline);
        $keep = [];
        $position = 0;

        foreach ($cast as $person) {
            $keep[] = $this->upsert($lesson, null, StoryMediaKind::CharacterSheet, 'cast-'.Str::slug($person['name']), $position++,
                $person['name'], $person);
        }

        $scenes = $lesson->scenes()->get()->filter(fn (Scene $s) => self::narrated($s))->values();
        foreach ($scenes as $scene) {
            $brief = self::brief($outline, $scene);
            $keep[] = $this->upsert($lesson, $scene, StoryMediaKind::WorldShot, "scene-{$scene->id}", $position++,
                $scene->chapterName(), ['brief' => $brief, 'fallback' => self::placeHint($scene)]);
        }

        $clips = 0;
        $max = (int) config('story_video.max_clips_per_lesson', 80);
        foreach ($scenes as $scene) {
            $people = self::peopleIn(self::brief(is_array($lesson->outline) ? $lesson->outline : [], $scene), $cast);
            foreach (self::beats($scene) as $n => $beat) {
                if ($clips++ >= $max) {
                    break 2;
                }
                $keep[] = $this->upsert($lesson, $scene, StoryMediaKind::Clip, "scene-{$scene->id}-beat-{$n}", $position++,
                    $scene->chapterName().' · '.($n + 1), [...$beat, 'people' => array_column($people, 'name')]);
            }
        }

        $lesson->storyMedia()->whereNotIn('id', $keep)->delete();

        return $lesson->storyMedia()->get()->countBy(fn (StoryMediaItem $i) => $i->kind->value)->all();
    }

    /**
     * The cast with signature colours from the outline (StoryCraft::castRules), cleaned: named entries only.
     *
     * @param  array<string, mixed>  $outline
     * @return list<array{name: string, colour: string, look: string}>
     */
    public static function cast(array $outline): array
    {
        $out = [];
        foreach ((array) ($outline['cast'] ?? []) as $c) {
            $name = is_array($c) ? trim((string) ($c['name'] ?? '')) : '';
            if ($name !== '') {
                $out[] = ['name' => $name, 'colour' => trim((string) ($c['colour'] ?? '')), 'look' => trim((string) ($c['look'] ?? ''))];
            }
        }

        return $out;
    }

    /** @param  list<array{name: string, colour: string, look: string}>  $cast  @return list<string> */
    public static function whiteOwners(array $cast): array
    {
        return array_values(array_map(fn ($c) => $c['name'], array_filter($cast, fn ($c) => mb_strtolower($c['colour']) === 'white')));
    }

    /**
     * The cast members a scene brief names, in cast order.
     *
     * @param  array<string, mixed>  $brief
     * @param  list<array{name: string, colour: string, look: string}>  $cast
     * @return list<array{name: string, colour: string, look: string}>
     */
    public static function peopleIn(array $brief, array $cast): array
    {
        $names = array_map(fn ($n) => mb_strtolower(trim((string) $n)), (array) ($brief['characters'] ?? []));

        return array_values(array_filter($cast, function (array $c) use ($names): bool {
            $name = mb_strtolower($c['name']);
            foreach ($names as $n) {
                if ($n !== '' && (str_contains($name, $n) || str_contains($n, $name))) {
                    return true;
                }
            }

            return false;
        }));
    }

    /** @param  array<string, mixed>  $outline  @return array<string, mixed> */
    public static function brief(array $outline, Scene $scene): array
    {
        foreach ((array) ($outline['scene_briefs'] ?? []) as $brief) {
            if (is_array($brief) && (int) ($brief['order'] ?? 0) === (int) $scene->order) {
                return $brief;
            }
        }

        return array_filter(['location' => $scene->location, 'year' => $scene->year === null ? null : (string) $scene->year]);
    }

    /**
     * What the place looks like when the outline has no brief for the scene (a Twine import, an older lesson): the
     * scene's picture prompt, else the Twine shot line, else its location, else the opening of its narration. Without
     * this the world shot prompt named no place at all (lesson 129, 2026-11-23).
     */
    public static function placeHint(Scene $scene): string
    {
        $config = is_array($scene->config) ? $scene->config : [];
        foreach ([$scene->image_prompt, $config['shot_note'] ?? null, $scene->location] as $hint) {
            if (is_string($hint) && trim($hint) !== '') {
                return trim($hint);
            }
        }
        $story = trim((string) $scene->script_segment);

        return $story !== '' ? 'The place where this happens: '.Str::limit(preg_replace('/\s+/', ' ', $story), 400, '') : '';
    }

    public static function narrated(Scene $scene): bool
    {
        return ! in_array($scene->kind, Scene::NO_VOICE_KINDS, true) && trim((string) $scene->script_segment) !== '';
    }

    /**
     * The scene's narration as clip beats: whole sentences, grouped so each beat runs at least clip_min seconds and
     * no more than clip_max (a single longer sentence is its own beat, capped at clip_max).
     *
     * @return list<array{text: string, start: float, seconds: int}>
     */
    public static function beats(Scene $scene): array
    {
        $min = (int) config('story_video.clip_min_seconds', 4);
        $max = (int) config('story_video.clip_max_seconds', 15);
        $segments = $scene->scriptSegments();
        if ($segments === []) {
            return [];
        }
        $timed = ! empty($scene->audio_alignment) && (float) $scene->duration_seconds > 0;
        $total = $timed ? (float) $scene->duration_seconds : 0.0;

        $lengths = [];
        foreach ($segments as $i => $seg) {
            $lengths[$i] = $timed
                ? max(0.5, (($segments[$i + 1]['start'] ?? $total) - $seg['start']))
                : max(1.0, str_word_count($seg['text']) / self::WORDS_PER_SECOND);
        }

        $beats = [];
        $text = [];
        $start = null;
        $len = 0.0;
        $flush = function () use (&$beats, &$text, &$start, &$len, $min, $max): void {
            if ($text !== []) {
                $beats[] = ['text' => implode(' ', $text), 'start' => round((float) $start, 2), 'seconds' => (int) min($max, max($min, ceil($len)))];
            }
            $text = [];
            $start = null;
            $len = 0.0;
        };
        foreach ($segments as $i => $seg) {
            if ($text !== [] && $len + $lengths[$i] > $max) {
                $flush();
            }
            $start ??= $timed ? $seg['start'] : array_sum(array_slice($lengths, 0, $i));
            $text[] = $seg['text'];
            $len += $lengths[$i];
            if ($len >= $min * 2) {   // a comfortable beat: cut here rather than grow toward the cap
                $flush();
            }
        }
        $flush();

        return $beats;
    }

    /** @param  array<string, mixed>  $input */
    private function upsert(Lesson $lesson, ?Scene $scene, StoryMediaKind $kind, string $key, int $position, string $label, array $input): int
    {
        $item = StoryMediaItem::firstOrNew(['lesson_id' => $lesson->id, 'kind' => $kind->value, 'key' => $key]);
        $changed = $item->exists && $item->input != $input;
        $item->fill(['scene_id' => $scene?->id, 'position' => $position, 'label' => mb_substr($label, 0, 250)]);
        // A busy item keeps the input its generation was made from, so the next plan still sees the change.
        if (! $item->exists || ($changed && ! $item->status->isBusy())) {
            $item->fill(['input' => $input]);
        }
        if ($changed && ! $item->status->isBusy()) {
            $item->fill(['status' => StoryMediaStatus::Planned, 'prompt' => null, 'generation_id' => null, 'error' => null]);
        }
        $item->save();

        return $item->id;
    }
}
