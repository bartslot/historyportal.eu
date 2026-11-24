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
use App\Services\Lessons\ChoicePrompt;
use App\Services\Lessons\SceneDialogue;
use App\Services\Lessons\SceneLinks;
use App\Services\Stage25d\GroundDistance;
use App\Services\Stage25d\StageSet;
use App\Services\Stage25d\StageWorlds;
use App\Services\Support\ImageStyleTemplate;
use App\Services\Support\ScriptLanguage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * A Twine story as a new lesson of the teacher's: one empty 3D scene per passage, in the world the teacher picked.
 *
 * Order: breadth-first from the start passage, so a passage's choices follow it. Every Twine link becomes a scene link
 * (App\Services\Lessons\SceneLinks): the link text is the button, the passage it names is the scene the class jumps
 * to, links back included (Bart 2026-11-21: "links to other scenes", the way Marianna built her story). A passage
 * with no links is an ending. What did not fit (story code, a link to a missing passage) is a note the teacher reads.
 *
 * Per scene: the narrator's lines are the script, word for word; the shot description is the scene's note; every
 * other speaker is a character standing on the ground, and their lines are silent balloons, one after the other. A
 * "SETTING: Florence, 1283" line is the scene's place and year. The lesson's outline gets the cast with their
 * signature colours and a brief per scene, so story to video can draw the sheets and the empty places.
 */
final class TwineImporter
{
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

    /**
     * @param  string  $gradeLevel  the class the teacher picked ("Age 10"): never assumed, the story is written for it
     */
    public function import(string $html, User $teacher, string $worldKey, string $gradeLevel): Lesson
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
        // The lesson's language is the story's own: a Dutch story in an English teacher's account stays Dutch.
        $language = ScriptLanguage::detect(self::narration($parsed), $teacher->teachingLocale());

        return DB::transaction(function () use ($story, $teacher, $worldKey, $preset, $parsed, $cast, $plan, $gradeLevel, $language) {
            $lesson = Lesson::create([
                'teacher_id' => $teacher->id,
                'title' => Str::limit($story['name'], Lesson::TITLE_MAX_CHARS, ''),
                'topic' => Str::limit($story['name'], 255, ''),
                'subject' => 'history',
                'grade_level' => $gradeLevel,
                'language' => $language,
                'tone' => 'storytelling',
                'source_mode' => 'internet',
                'image_style' => ImageStyleTemplate::STAGE,
                'avatar_id' => Narrator::where('is_active', true)->orderBy('sort_order')->value('id'),
                'status' => LessonStatus::Draft,
                'wizard_step' => 3,
            ]);
            $ids = [];
            foreach ($plan as $order => $name) {
                $ids[$name] = $this->scene($lesson, $order + 1, $name, $parsed[$name], $cast, $teacher, $worldKey, $preset)->id;
            }
            // Second pass: every scene exists now, so each Twine link can name the scene it jumps to.
            $choices = 0;
            $turn = 0;
            $hero = ChoicePrompt::firstName($cast);
            $locale = ChoicePrompt::locale($lesson);
            foreach ($plan as $name) {
                $links = self::links($parsed[$name], $ids);
                $choices += count($links);
                $scene = $lesson->scenes()->findOrFail($ids[$name]);
                // A passage with nowhere to go is an ending: the scene after it in the list is another path.
                $config = SceneLinks::into($scene->config, $links, $links === []);
                // The narrator asks before reading the choices out, one of three lines in turn ("So now Marco
                // is doubtful... but what would you choose?"). Recorded with the scene's narration.
                if (ChoicePrompt::spoken($config, $locale) !== '') {
                    $config['links_prompt'] = ChoicePrompt::lineFor($hero, $locale, $turn++);
                }
                $scene->update(['config' => $config]);
            }
            // The story as an outline, so the rest of the app reads it like a generated lesson: the cast with
            // their signature colours (story to video draws a sheet each) and a brief per scene (who is in it,
            // where and when, and the shot as the picture's seed).
            $lesson->update(['outline' => self::outline($plan, $parsed, $cast)]);
            $auto = collect($this->made)->filter(fn (?SvgAsset $a) => $a !== null && ! empty($a->character['auto']))->keys();
            if ($auto->isNotEmpty()) {
                $this->notes[] = __(':names got a plain body. Open each in the Character tab to dress them.', ['names' => $auto->implode(', ')]);
            }
            $lesson->update(['import_report' => [
                'source' => 'twine',
                'story' => $story['name'],
                'scenes' => count($plan),
                'choices' => $choices,
                'cast' => collect($cast)->map(fn ($c) => $c + ['character_id' => $this->made[$c['name']]?->id ?? null])->values()->all(),
                'notes' => $this->notes,
                'seen' => false,
            ]]);

            return $lesson;
        });
    }

    /**
     * The passages in lesson order: breadth-first from the start passage, so the choices a passage offers sit
     * together right after it (Venice, Destination, Cargo, Embark...). Passages no link reaches come last.
     *
     * @param  array<string, array<string,mixed>>  $parsed
     * @return list<string> passage names
     */
    private function order(string $start, array $parsed): array
    {
        $plan = [];
        $seen = [$start => true];
        $queue = [$start];
        while ($queue !== []) {
            $name = array_shift($queue);
            $plan[] = $name;
            $title = TwineParser::title($name);
            foreach ($parsed[$name]['links'] as $link) {
                $target = $link['target'];
                if (! isset($parsed[$target])) {
                    $this->notes[] = __('":label" in :scene leads to a passage the story does not have. It was left out.', ['label' => $link['label'], 'scene' => $title]);
                } elseif (! isset($seen[$target])) {
                    $seen[$target] = true;
                    $queue[] = $target;
                }
            }
            if ($parsed[$name]['code']) {
                $this->notes[] = __(':scene has story code (variables or macros). It was left out.', ['scene' => $title]);
            }
        }
        foreach (array_diff_key($parsed, $seen) as $name => $p) {
            $plan[] = $name;
            $this->notes[] = __('No link leads to :scene. It was added at the end.', ['scene' => TwineParser::title($name)]);
            if ($p['code']) {
                $this->notes[] = __(':scene has story code (variables or macros). It was left out.', ['scene' => TwineParser::title($name)]);
            }
        }

        return $plan;
    }

    /**
     * Every Twine link of a passage as a scene link (SceneLinks): its words on the button, its passage as the
     * scene it jumps to. Links back to an earlier passage stay, so "Replay the journey" replays it.
     *
     * @param  array<string,mixed>  $part
     * @param  array<string,int>  $ids  scene id by passage name
     * @return list<array{label:string, to:int}>
     */
    private static function links(array $part, array $ids): array
    {
        $links = [];
        foreach ($part['links'] as $link) {
            if (isset($ids[$link['target']]) && count($links) < SceneLinks::MAX_LINKS) {
                $links[] = ['label' => SceneLinks::label($link['label']), 'to' => $ids[$link['target']]];
            }
        }

        return $links;
    }

    /**
     * @param  array<string,mixed>  $part
     * @param  list<array{name:string, description:string}>  $cast
     * @param  array<string,mixed>  $preset
     */
    private function scene(Lesson $lesson, int $order, string $passage, array $part, array $cast, User $teacher, string $worldKey, array $preset): Scene
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
        $length = max(self::MIN_SCENE_SECONDS, (int) ceil($end));

        return Scene::create([
            'lesson_id' => $lesson->id,
            'order' => $order,
            'kind' => 'stage25d',
            'chapter_name' => Str::limit(TwineParser::title($passage), 120, ''),
            ...self::setting($part['setting'] ?? ''),
            'script_segment' => implode("\n\n", array_column(array_filter($lines, fn ($l) => $l['speaker'] === 'narrator'), 'text')),
            'image_style' => ImageStyleTemplate::STAGE,
            'status' => 'ready',
            'duration_seconds' => $length,
            // the timeline runs as long as the lines, so every balloon is on it (the editor's default is 8 s)
            'config' => ['stage25d' => $stage, 'timeline' => ['duration' => (float) $length, 'targets' => [], 'tracks' => []]]
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

    /**
     * Every narrator line of the story, for telling its language.
     *
     * @param  array<string, array{lines: list<array{speaker: string, text: string}>}>  $parsed
     */
    private static function narration(array $parsed): string
    {
        $text = [];
        foreach ($parsed as $part) {
            foreach ($part['lines'] as $line) {
                if (strtoupper($line['speaker']) === 'NARRATOR') {
                    $text[] = $line['text'];
                }
            }
        }

        return implode(' ', $text);
    }

    /**
     * "Ravenna, september 1321" as the scene's place and year: the year is the first one named ("1301-1302" is
     * 1301), the place what stands before the date. A setting with no year is all place.
     *
     * @return array{location?: string, year?: string}
     */
    private static function setting(string $setting): array
    {
        $setting = trim($setting);
        if ($setting === '') {
            return [];
        }
        $year = preg_match('/(?<!\d)(\d{3,4})(?!\d)/u', $setting, $y) === 1 ? $y[1] : null;
        $place = $year === null ? $setting : trim((string) preg_replace('/,?[^,]*\d{3,4}.*$/u', '', $setting), ' ,');
        if ($place === '' && $year !== null) {   // "Florence 1283": no comma before the date
            $place = trim((string) preg_replace('/\d{3,4}.*$/u', '', $setting), ' ,');
        }

        return array_filter(['location' => Str::limit($place, 255, ''), 'year' => $year], fn ($v) => $v !== null && $v !== '');
    }

    /**
     * The lesson outline a Twine story gives: its cast (name, signature colour, look) and one brief per scene in
     * order (the cast who speak or are named in the shot, the setting, the shot as the picture's seed).
     *
     * @param  list<string>  $plan
     * @param  array<string, array<string,mixed>>  $parsed
     * @param  list<array{name:string, description:string, colour?:string}>  $cast
     * @return array{cast: list<array{name:string, colour:string, look:string}>, scene_briefs: list<array<string,mixed>>}
     */
    private static function outline(array $plan, array $parsed, array $cast): array
    {
        $briefs = [];
        foreach ($plan as $order => $name) {
            $part = $parsed[$name];
            $people = [];
            foreach ($cast as $member) {
                $named = str_contains(TwineParser::key((string) $part['shot']), TwineParser::key($member['name']));
                $speaks = collect($part['lines'])->contains(fn ($l) => self::firstMatch($l['speaker'], $cast) === $member['name']);
                if ($named || $speaks) {
                    $people[] = $member['name'];
                }
            }
            $briefs[] = array_filter([
                'order' => $order + 1,
                'kind' => 'narration',
                'characters' => $people,
                ...self::setting((string) ($part['setting'] ?? '')),
                'image_prompt_seed' => (string) $part['shot'],
            ], fn ($v) => $v !== '' && $v !== []);
        }

        return [
            'cast' => array_values(array_map(fn ($c) => [
                'name' => $c['name'], 'colour' => (string) ($c['colour'] ?? ''), 'look' => $c['description'],
            ], $cast)),
            'scene_briefs' => $briefs,
        ];
    }

    /**
     * The cast member a speaker tag names first (the same rule as person()): MARCO is Marco Polo.
     *
     * @param  list<array{name:string, description:string}>  $cast
     */
    private static function firstMatch(string $speaker, array $cast): ?string
    {
        $key = TwineParser::key($speaker);
        foreach ($cast as $member) {
            if (TwineParser::key($member['name']) === $key || in_array($key, explode(' ', TwineParser::key($member['name'])), true)) {
                return $member['name'];
            }
        }

        return null;
    }
}
