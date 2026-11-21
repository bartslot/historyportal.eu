<?php

declare(strict_types=1);

namespace App\Services\Lessons;

use App\Models\Lesson;
use App\Models\Scene;
use App\Services\Support\ScriptLanguage;
use App\Support\MediaUrl;

/**
 * What the narrator says when a scene's choices fade in (Bart 2026-11-21: "make sure the choices are also
 * narrated"): a prompt line, then the choices themselves. Stored on the scene as config.links_prompt (the
 * teacher can rewrite it in the Choices panel) and recorded by App\Jobs\GenerateChoicesAudio into
 * config.links_audio = {path, hash, text}.
 *
 * A new Choices layer gets one of three lines, taking turns through the lesson so two choice moments in a
 * row do not ask the same way. The first is Bart's own ("So now Marco is doubtful... but what would you
 * choose?"). Each has a version without a name, for a lesson that does not know its main character.
 */
final class ChoicePrompt
{
    /** The prompt the teacher can write. */
    public const MAX = 240;

    /**
     * [with the main character's name, without a name]. English source keys, translated in lang/*.json and
     * spoken in the lesson's language.
     */
    public const LINES = [
        ['So now :name is doubtful... but what would you choose?', 'So now the choice is yours... what would you choose?'],
        ['What should :name do now? Think it over, then choose.', 'What happens next? Think it over, then choose.'],
        ['The story could go either way. If you were :name, what would you do?', 'The story could go either way. What would you do?'],
    ];

    /** The line for a new Choices layer on this scene: the next in turn after the earlier choice moments. */
    public static function forNewChoices(Scene $scene): string
    {
        $lesson = $scene->lesson;
        $turn = $lesson->scenes()
            ->where('order', '<', $scene->order)
            ->get(['id', 'config'])
            ->filter(fn (Scene $s): bool => ! empty(($s->config ?? [])['links']))
            ->count();

        return self::line($lesson, $turn);
    }

    public static function line(Lesson $lesson, int $turn): string
    {
        return self::lineFor(self::hero($lesson), self::locale($lesson), $turn);
    }

    /** Line number $turn (taking turns through the three), with this name or without one, in this language. */
    public static function lineFor(?string $name, string $locale, int $turn): string
    {
        [$named, $plain] = self::LINES[$turn % count(self::LINES)];

        return $name !== null && $name !== '' ? __($named, ['name' => $name], $locale) : __($plain, [], $locale);
    }

    /**
     * The story's main character, by first name: the first of the cast a Twine story lists
     * ("Marco Polo (17 years old): ..." gives Marco). Null when the lesson names none.
     */
    public static function hero(Lesson $lesson): ?string
    {
        return self::firstName((array) (($lesson->import_report ?? [])['cast'] ?? []));
    }

    /** @param  array<int, array{name?: string}>  $cast */
    public static function firstName(array $cast): ?string
    {
        $full = trim((string) ($cast[0]['name'] ?? ''));
        if ($full === '') {
            return null;
        }

        return preg_split('/\s+/u', $full)[0] ?: null;
    }

    /** The language the lesson is written in: the prompt is spoken by the lesson's own narrator. */
    public static function locale(Lesson $lesson): string
    {
        return ScriptLanguage::detect(
            $lesson->scenes()->pluck('script_segment')->implode(' '),
            (string) ($lesson->language ?: ($lesson->teacher?->teachingLocale() ?? 'en')),
        );
    }

    public static function clean(mixed $text): string
    {
        $text = trim((string) preg_replace('/\s+/u', ' ', strip_tags(is_scalar($text) ? (string) $text : '')));

        return mb_substr($text, 0, self::MAX);
    }

    /** The prompt the teacher kept or wrote; '' when there is none. */
    public static function prompt(?array $config): string
    {
        return self::clean(($config ?? [])['links_prompt'] ?? '');
    }

    /**
     * Everything the narrator says over the choices: the prompt, then each choice as a question
     * ("Ask Niccolò where you are headed? Or watch the sailors loading the ship?").
     * '' when there is nothing to choose: an ending, no links, or a single link (a straight jump or one button).
     */
    public static function spoken(?array $config, string $locale = 'en'): string
    {
        $config ??= [];
        if (($config['ending'] ?? false) === true) {
            return '';
        }
        $links = array_values(array_filter((array) ($config['links'] ?? []), fn ($l): bool => is_array($l) && is_numeric($l['to'] ?? null)));
        $labels = array_values(array_filter(array_map(fn (array $l): string => SceneLinks::label($l['label'] ?? ''), $links), fn (string $l): bool => $l !== ''));
        if (count($links) < 2) {
            return '';   // one button is a way on, not a choice: nothing to ask
        }
        $questions = array_map(fn (string $l): string => rtrim($l, ' .!?…').'?', $labels);
        $or = ' '.ucfirst(__('or', [], $locale)).' ';

        return trim(self::prompt($config).' '.implode($or, $questions));
    }

    public static function hash(string $spoken): string
    {
        return sha1($spoken);
    }

    /** The recording of what the narrator says now, for the player; null while it is missing or out of date. */
    public static function audioUrl(Scene $scene): ?string
    {
        $config = $scene->config ?? [];
        $audio = $config['links_audio'] ?? null;
        if (! is_array($audio) || empty($audio['path']) || empty($audio['hash'])) {
            return null;
        }
        $spoken = self::spoken($config, (string) ($audio['locale'] ?? 'en'));
        if ($spoken === '' || self::hash($spoken) !== $audio['hash']) {
            return null;
        }
        $url = MediaUrl::of((string) $audio['path']);

        return $url === null ? null : $url.(str_contains($url, '?') ? '&' : '?').'v='.substr((string) $audio['hash'], 0, 10);
    }
}
