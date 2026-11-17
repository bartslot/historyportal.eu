<?php

declare(strict_types=1);

namespace App\Services\Import;

use App\Enums\LessonStatus;
use App\Models\Lesson;
use App\Models\Narrator;
use App\Models\Scene;
use App\Models\SvgAsset;
use App\Models\User;
use App\Services\Editor\Characters;
use App\Services\Lessons\SceneDialogue;
use App\Services\Stage25d\GroundDistance;
use App\Services\Stage25d\StageSet;
use App\Services\Stage25d\StageWorlds;
use App\Services\Support\ImageStyleTemplate;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * A Twine story as a new lesson of the teacher's: one empty 3D scene per passage, in the world the teacher picked.
 *
 * Order: from the start passage on. A passage whose two links lead to two passages that both go on to one shared
 * passage is a Decision point (the passage is the question, the two are the options, the link texts their buttons),
 * and the story goes on at the shared passage. Everything else is played in reading order, one after the other,
 * and what did not fit (a fan of three, a dead end, story code, a link back) is a note the teacher reads after.
 * A link back to a passage already played ends the lesson there: a lesson has no loops.
 *
 * Per scene: the narrator's lines are the script, word for word; the shot description is the scene's note; every
 * other speaker is a character standing on the ground, and their lines are silent balloons, one after the other.
 */
final class TwineImporter
{
    /** Decision points a lesson holds (Step3SceneConfigurator::MAX_BRANCH_GROUPS). */
    public const MAX_DECISIONS = 3;

    /** Reading and timing: words per second, the shortest hold, and a balloon split past this many words. */
    private const WORDS_PER_SECOND = 2.5;

    private const MIN_SECONDS = 1.0;

    private const MAX_BALLOON_WORDS = 25;

    /** A new 3D scene's length when its lines are short (Step3SceneConfigurator::addScene). */
    private const MIN_SCENE_SECONDS = 8;

    /** Figures stand this far apart (share of the picture width), around the middle. */
    private const FIGURE_SPACING = 0.16;

    /** A boy has no body of his own in the kit: the man's, shorter. */
    private const BOY_HEIGHT_M = 1.55;

    /** @var list<string> */
    private array $notes = [];

    /** @var array<string, SvgAsset|null> character by name */
    private array $made = [];

    public function import(string $html, User $teacher, string $worldKey): Lesson
    {
        $preset = StageWorlds::preset($worldKey, $teacher->id)
            ?? throw new InvalidArgumentException(__('Pick a world for the 3D scenes.'));
        $story = TwineParser::story($html);
        $this->notes = [];
        $this->made = [];

        $parsed = [];
        $cast = [];
        foreach ($story['passages'] as $name => $p) {
            $part = TwineParser::passage($p['text']);
            $listed = $part['links'] === [] ? TwineParser::cast($p['text']) : [];
            if ($listed !== [] && $name !== $story['start'] && (preg_match('/cast|character|personage|figur/i', $name) === 1 || count($listed) >= 2)) {
                $cast = [...$cast, ...$listed];

                continue;
            }
            $parsed[$name] = $part;
        }
        if (! isset($parsed[$story['start']])) {
            throw new InvalidArgumentException(__('This Twine story has no passages, or too many to import.'));
        }
        $plan = $this->order($story['start'], $parsed);

        return DB::transaction(function () use ($story, $teacher, $worldKey, $preset, $parsed, $cast, $plan) {
            $lesson = Lesson::create([
                'teacher_id' => $teacher->id,
                'title' => Str::limit($story['name'], Lesson::TITLE_MAX_CHARS, ''),
                'topic' => Str::limit($story['name'], 255, ''),
                'subject' => 'history',
                'grade_level' => 'Age 12',
                'tone' => 'storytelling',
                'source_mode' => 'internet',
                'image_style' => ImageStyleTemplate::STAGE,
                'avatar_id' => Narrator::where('is_active', true)->orderBy('sort_order')->value('id'),
                'status' => LessonStatus::Draft,
                'wizard_step' => 3,
            ]);
            foreach ($plan as $order => $step) {
                $this->scene($lesson, $order + 1, $step, $parsed[$step['name']], $cast, $teacher, $worldKey, $preset);
            }
            $auto = collect($this->made)->filter(fn (?SvgAsset $a) => $a !== null && ! empty($a->character['auto']))->keys();
            if ($auto->isNotEmpty()) {
                $this->notes[] = __(':names got a plain body. Open each in the Character tab to dress them.', ['names' => $auto->implode(', ')]);
            }
            $lesson->update(['import_report' => [
                'source' => 'twine',
                'story' => $story['name'],
                'scenes' => count($plan),
                'decisions' => collect($plan)->where('role', 'question')->count(),
                'cast' => collect($cast)->map(fn ($c) => $c + ['character_id' => $this->made[$c['name']]?->id ?? null])->values()->all(),
                'notes' => $this->notes,
                'seen' => false,
            ]]);

            return $lesson;
        });
    }

    /**
     * The passages in lesson order, each with its Decision point role.
     *
     * @param  array<string, array<string,mixed>>  $parsed
     * @return list<array{name:string, role:?string, group:?int, label:?string}>
     */
    private function order(string $start, array $parsed): array
    {
        $plan = [];
        $seen = [];
        $stack = [$start];
        $groups = 0;
        while ($stack !== []) {
            $name = array_pop($stack);
            if (isset($seen[$name])) {
                continue;
            }
            $seen[$name] = true;
            $title = TwineParser::title($name);
            $next = [];
            $back = [];
            foreach ($parsed[$name]['links'] as $link) {
                $target = $link['target'];
                if (! isset($parsed[$target])) {
                    $this->notes[] = __('":label" in :scene leads to a passage the story does not have. It was left out.', ['label' => $link['label'], 'scene' => $title]);
                } elseif (isset($seen[$target])) {
                    $back[] = $link;
                } else {
                    $next[$target] ??= $link['label'];
                }
            }
            foreach ($back as $link) {
                $this->notes[] = $next === [] && $stack === []
                    ? __('":label" in :scene went back to :target. The lesson ends there.', ['label' => $link['label'], 'scene' => $title, 'target' => TwineParser::title($link['target'])])
                    : __('":label" in :scene went back to :target. A lesson has no loops, so it was left out.', ['label' => $link['label'], 'scene' => $title, 'target' => TwineParser::title($link['target'])]);
            }
            if ($parsed[$name]['code']) {
                $this->notes[] = __(':scene has story code (variables or macros). It was left out.', ['scene' => $title]);
            }
            $join = count($next) === 2 ? $this->join(array_keys($next), $parsed, $seen) : null;
            if ($join !== null && $groups < self::MAX_DECISIONS) {
                $groups++;
                $plan[] = ['name' => $name, 'role' => 'question', 'group' => $groups, 'label' => null];
                foreach (array_keys($next) as $i => $option) {
                    $seen[$option] = true;
                    $plan[] = ['name' => $option, 'role' => $i === 0 ? 'option_a' : 'option_b', 'group' => $groups, 'label' => $next[$option]];
                    if ($parsed[$option]['code']) {
                        $this->notes[] = __(':scene has story code (variables or macros). It was left out.', ['scene' => TwineParser::title($option)]);
                    }
                }
                $stack[] = $join;

                continue;
            }
            if ($join !== null) {
                $this->notes[] = __('A lesson holds :n Decision points, so the choice in :scene is played one after the other.', ['n' => self::MAX_DECISIONS, 'scene' => $title]);
            } elseif (count($next) > 1) {
                $this->notes[] = __(':scene offers :n choices that do not meet again. They are played one after the other.', ['n' => count($next), 'scene' => $title]);
            }
            $plan[] = ['name' => $name, 'role' => null, 'group' => null, 'label' => null];
            foreach (array_reverse(array_keys($next)) as $target) {
                $stack[] = $target;
            }
            if ($next === [] && $stack !== [] && $parsed[$name]['links'] === []) {
                $this->notes[] = __(':scene has no links. The lesson goes on with the next passage.', ['scene' => $title]);
            }
        }
        foreach (array_diff_key($parsed, $seen) as $name => $p) {
            $plan[] = ['name' => $name, 'role' => null, 'group' => null, 'label' => null];
            $this->notes[] = __('No link leads to :scene. It was added at the end.', ['scene' => TwineParser::title($name)]);
        }

        return $plan;
    }

    /**
     * The passage both options go on to, when each has exactly that one way on; null otherwise.
     *
     * @param  list<string>  $options
     * @param  array<string, array<string,mixed>>  $parsed
     * @param  array<string,bool>  $seen
     */
    private function join(array $options, array $parsed, array $seen): ?string
    {
        $joins = [];
        foreach ($options as $option) {
            $targets = array_unique(array_column($parsed[$option]['links'], 'target'));
            if (count($targets) !== 1) {
                return null;
            }
            $joins[] = $targets[array_key_first($targets)];
        }
        $join = $joins[0];

        return count(array_unique($joins)) === 1 && isset($parsed[$join]) && ! isset($seen[$join]) && ! in_array($join, $options, true) ? $join : null;
    }

    /**
     * @param  array{name:string, role:?string, group:?int, label:?string}  $step
     * @param  array<string,mixed>  $part
     * @param  list<array{name:string, description:string}>  $cast
     * @param  array<string,mixed>  $preset
     */
    private function scene(Lesson $lesson, int $order, array $step, array $part, array $cast, User $teacher, string $worldKey, array $preset): void
    {
        $stage = StageWorlds::apply(StageSet::blank((string) $preset['bundle'], 's'.$order), $worldKey, $preset);

        // the people who speak here, each once, in the order they first speak
        $people = [];
        foreach ($part['lines'] as $line) {
            $person = $this->person($line['speaker'], $cast);
            if ($person !== null && ! isset($people[$person['name']])) {
                $people[$person['name']] = $person + ['handle' => Str::slug($person['name']) ?: 'figure-'.count($people)];
            }
        }
        $i = 0;
        foreach ($people as $name => $person) {
            $character = $this->character($teacher, $person);
            if ($character !== null) {
                $stage['set']['layers'][] = ['asset' => 'chr-'.$character->id, 'depth' => 'fg', 'y' => 0, 'scale' => 1, 'figure' => $person['handle'],
                    'x' => round(0.5 + ($i++ - (count($people) - 1) / 2) * self::FIGURE_SPACING, 3)];
            }
        }
        [$stage] = GroundDistance::fill($stage);

        // every line on one clock, in story order; the narrator's are the script, the others silent balloons
        $lines = [];
        foreach ($part['lines'] as $line) {
            $person = $this->person($line['speaker'], $cast);
            foreach ($person === null ? [$line['text']] : self::chunks($line['text']) as $text) {
                $lines[] = ['speaker' => $person === null ? 'narrator' : $people[$person['name']]['handle'], 'text' => $text];
            }
        }
        $durations = array_map(fn ($l) => max(self::MIN_SECONDS, round(str_word_count($l['text']) / self::WORDS_PER_SECOND, 2)), $lines);
        $timed = SceneDialogue::cue($lines, $durations);
        $balloons = array_values(array_map(fn ($l) => $l + [
            'kind' => 'speech',
            'figure' => ['asset_id' => 'stage25d:'.$l['speaker'], 'mouth' => [0.5, 0.3], 'facing' => 1],
            'group' => true,
        ], array_filter($timed, fn ($l) => $l['speaker'] !== 'narrator')));
        $end = $timed === [] ? 0 : max(array_map(fn ($l) => $l['end'], $timed));

        Scene::create([
            'lesson_id' => $lesson->id,
            'order' => $order,
            'kind' => 'stage25d',
            'chapter_name' => Str::limit(TwineParser::title($step['name']), 120, ''),
            'script_segment' => implode("\n\n", array_column(array_filter($lines, fn ($l) => $l['speaker'] === 'narrator'), 'text')),
            'image_style' => ImageStyleTemplate::STAGE,
            'status' => 'ready',
            'duration_seconds' => max(self::MIN_SCENE_SECONDS, (int) ceil($end)),
            'branch_group' => $step['group'],
            'branch_role' => $step['role'],
            'branch_choice_label' => $step['label'] !== null ? Str::limit($step['label'], 120, '') : null,
            'config' => ['stage25d' => $stage]
                + ($balloons !== [] ? ['lines' => $balloons] : [])
                + ($part['shot'] !== '' ? ['shot_note' => $part['shot']] : []),
        ]);
    }

    /**
     * Who a speaker tag names: a cast member (full name, or a first name: MARCO -> Marco Polo; accents and case do not
     * count), else the tag itself as a name. Null for the narrator.
     *
     * @param  list<array{name:string, description:string}>  $cast
     * @return array{name:string, description:string}|null
     */
    private function person(string $speaker, array $cast): ?array
    {
        $key = TwineParser::key($speaker);
        if ($key === 'narrator' || $key === '') {
            return null;
        }
        foreach ($cast as $member) {
            $words = explode(' ', TwineParser::key($member['name']));
            if (TwineParser::key($member['name']) === $key || in_array($key, $words, true)) {
                return $member;
            }
        }

        return ['name' => Str::title(mb_strtolower($speaker)), 'description' => ''];
    }

    /**
     * The teacher's own character of that name, else a plain one made from the kit body the description suggests.
     *
     * @param  array{name:string, description:string}  $person
     */
    private function character(User $teacher, array $person): ?SvgAsset
    {
        $name = $person['name'];
        if (! array_key_exists($name, $this->made)) {
            $own = Characters::of($teacher)->first(fn (SvgAsset $a) => TwineParser::key((string) $a->title) === TwineParser::key($name));
            $body = self::body($name.' '.$person['description']);
            $this->made[$name] = $own ?? Characters::starter($teacher, $name, $body === 'boy' ? 'man' : $body, $body === 'boy' ? self::BOY_HEIGHT_M : null);
            if ($this->made[$name] === null) {
                $this->notes[] = __(':name could not be made. Their lines are balloons without a figure.', ['name' => $name]);
            }
        }

        return $this->made[$name];
    }

    /** man, woman, girl or boy, from the words of a cast line ("Marco's Father", "17 years old"). Ponytail: a word list, not a model. */
    public static function body(string $words): string
    {
        $w = TwineParser::key($words);
        $female = preg_match('/\b(woman|women|girl|mother|wife|queen|daughter|sister|lady|empress|princess|grandmother|aunt|widow|nun|she|her)\b/', $w) === 1;
        $age = preg_match('/\b(\d{1,2})\s*(?:years?|yrs?)(?:\s*old)?\b/', $w, $m) === 1 ? (int) $m[1] : null;
        $child = preg_match('/\b(boy|girl|child|kid)\b/', $w) === 1 || ($age !== null && $age < 18);

        return match (true) {
            $female && $child => 'girl',
            $female => 'woman',
            $child => 'boy',
            default => 'man',
        };
    }

    /**
     * A long line as balloons a class can read: whole sentences, at most about MAX_BALLOON_WORDS words each.
     *
     * @return list<string>
     */
    private static function chunks(string $text): array
    {
        if (str_word_count($text) <= self::MAX_BALLOON_WORDS) {
            return [$text];
        }
        $out = [];
        $now = '';
        foreach (preg_split('/(?<=[.!?…])\s+/u', $text) ?: [$text] as $sentence) {
            if ($now !== '' && str_word_count($now.' '.$sentence) > self::MAX_BALLOON_WORDS) {
                $out[] = $now;
                $now = $sentence;
            } else {
                $now = trim($now.' '.$sentence);
            }
        }

        return $now === '' ? $out : [...$out, $now];
    }
}
