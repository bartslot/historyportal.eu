<?php

declare(strict_types=1);

namespace App\Services\Import;

use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Reads a published Twine 2 story (the .html Twine saves) as data: the story's name and start passage, and per passage
 * its shot description, its lines (NARRATOR: ..., MARCO: ...) and its links. Only the <tw-storydata> and
 * <tw-passagedata> elements are read, with a regex, never parsed as a page: no script in the file ever runs, and story
 * code (Harlowe macros, variables) is cut out and reported, not run.
 */
final class TwineParser
{
    public const MAX_BYTES = 2_000_000;

    public const MAX_PASSAGES = 300;

    /** A speaker tag at the start of a line: NARRATOR:, KUBLAI KHAN:, NICCOLÒ: (upper case, so prose with a colon stays prose). */
    private const SPEAKER = '/^([\p{Lu}][\p{Lu}\p{M}\'’. -]{0,40}?)\s*:\s*(.+)$/u';

    /** A speaker tag that is not a speaker: "SETTING: Florence, 1283" names the scene's place and year. */
    public const SETTING = 'SETTING';

    /** A signature colour in a cast line's description: "Colour: red." (also Color, Kleur, Farbe, Colore). */
    private const COLOUR = '/\b(?:colou?r|kleur|farbe|colore)\s*:\s*([^.;\n]+)[.;]?/iu';

    /** A cast line: * Marco Polo (17 years old): Curious, observant ... */
    private const CAST_LINE = '/^[*-]\s*([^:(]+?)\s*(?:\(([^)]*)\))?\s*:\s*(.*)$/u';

    /** Story code Twine formats run: Harlowe macros (set: ...), variables $gold / _temp, SugarCube <<...>>, changers |name>[. */
    private const CODE = '/\((?:[a-z][\w-]*):|(?<![\w$])[$_][A-Za-z]\w*|<<|>>|\|[\w-]+>\[/u';

    /**
     * @return array{name:string, start:string, passages: array<string, array{name:string, text:string}>}
     */
    public static function story(string $html): array
    {
        if (strlen($html) > self::MAX_BYTES) {
            throw new InvalidArgumentException(__('This file is too large for a Twine story.'));
        }
        if (preg_match('/<tw-storydata\b([^>]*)>/i', $html, $story) !== 1) {
            throw new InvalidArgumentException(__('This is not a Twine 2 story. Publish it to a file in Twine and try again.'));
        }
        $attrs = self::attributes($story[1]);
        preg_match_all('/<tw-passagedata\b([^>]*)>(.*?)<\/tw-passagedata>/is', $html, $found, PREG_SET_ORDER);
        if ($found === [] || count($found) > self::MAX_PASSAGES) {
            throw new InvalidArgumentException(__('This Twine story has no passages, or too many to import.'));
        }
        $passages = [];
        $startName = null;
        foreach ($found as [, $raw, $body]) {
            $a = self::attributes($raw);
            $name = trim($a['name'] ?? '');
            if ($name === '' || isset($passages[$name])) {
                continue;
            }
            $passages[$name] = ['name' => $name, 'text' => self::decode($body)];
            if (($a['pid'] ?? null) === ($attrs['startnode'] ?? '')) {
                $startName = $name;
            }
        }

        return [
            'name' => trim($attrs['name'] ?? '') ?: __('Twine story'),
            'start' => $startName ?? array_key_first($passages),
            'passages' => $passages,
        ];
    }

    /**
     * A passage's parts: the shot description (prose before the first spoken line, only when the passage has
     * speakers), its lines in order, its links, whether it held story code, and its setting ("SETTING: Ravenna,
     * 1321", never read aloud).
     *
     * @return array{shot:string, lines: list<array{speaker:string, text:string}>, links: list<array{label:string, target:string}>, code:bool, setting:string}
     */
    public static function passage(string $text): array
    {
        $links = self::links($text);
        $code = preg_match(self::CODE, $text) === 1;
        $plain = trim((string) preg_replace(['/\[\[.*?\]\]/su', '/<<.*?>>/su', '/\((?:[a-z][\w-]*):[^()]*\)/u', "/''|\\*\\*/u"], ['', '', '', ''], $text));

        $lines = [];
        $prose = [];
        $setting = '';
        foreach (preg_split('/\R/u', $plain) ?: [] as $row) {
            $row = trim($row);
            if ($row === '' || preg_match('/^[\p{L} ]{1,40}:$/u', $row) === 1) {
                continue;   // a blank line, or a heading such as "Interactive Choice:"
            }
            if (preg_match(self::SPEAKER, $row, $m) === 1 && strtoupper(trim($m[1])) === self::SETTING) {
                $setting = trim($m[2]);

                continue;
            }
            if (preg_match(self::SPEAKER, $row, $m) === 1) {
                $said = trim((string) preg_replace('/^\([^)]*\)\s*/u', '', $m[2]));   // "(Shivering) Father..." is a direction
                if ($said !== '') {
                    $lines[] = ['speaker' => trim($m[1]), 'text' => $said];
                }

                continue;
            }
            $prose[] = ['row' => $row, 'before' => $lines === []];
        }
        if ($lines === []) {   // no speakers: the prose is the story the narrator tells
            return ['shot' => '', 'lines' => array_map(fn ($p) => ['speaker' => 'NARRATOR', 'text' => $p['row']], $prose), 'links' => $links, 'code' => $code, 'setting' => $setting];
        }
        $shot = implode("\n\n", array_column(array_filter($prose, fn ($p) => $p['before']), 'row'));
        foreach (array_filter($prose, fn ($p) => ! $p['before']) as $p) {
            $lines[] = ['speaker' => 'NARRATOR', 'text' => $p['row']];
        }

        return ['shot' => $shot, 'lines' => $lines, 'links' => $links, 'code' => $code, 'setting' => $setting];
    }

    /**
     * Every link in a passage, in order: [[Target]], [[Label->Target]], [[Target<-Label]], [[Label|Target]].
     *
     * @return list<array{label:string, target:string}>
     */
    public static function links(string $text): array
    {
        preg_match_all('/\[\[(.+?)\]\]/su', $text, $m);
        $out = [];
        foreach ($m[1] as $inner) {
            if (($i = strrpos($inner, '->')) !== false) {
                [$label, $target] = [substr($inner, 0, $i), substr($inner, $i + 2)];
            } elseif (($i = strpos($inner, '<-')) !== false) {
                [$target, $label] = [substr($inner, 0, $i), substr($inner, $i + 2)];
            } elseif (($i = strrpos($inner, '|')) !== false) {
                [$label, $target] = [substr($inner, 0, $i), substr($inner, $i + 1)];
            } else {
                $label = $target = $inner;
            }
            $target = trim($target);
            if ($target !== '') {
                $out[] = ['label' => trim($label) ?: $target, 'target' => $target];
            }
        }

        return $out;
    }

    /**
     * The cast a passage lists (* Name (who): description), the narrator left out. Empty when it is not a cast list.
     * A "Colour: red." in the description is the person's signature colour (StoryCraft::castRules). Write the colour
     * itself in English in every language ("Kleur: white."): the picture prompts read it, and "white" is the rule.
     *
     * @return list<array{name:string, description:string, colour:string}>
     */
    public static function cast(string $text): array
    {
        $cast = [];
        foreach (preg_split('/\R/u', $text) ?: [] as $row) {
            if (preg_match(self::CAST_LINE, trim($row), $m) !== 1 || self::key($m[1]) === 'narrator') {
                continue;
            }
            $about = trim($m[3]);
            $colour = preg_match(self::COLOUR, $about, $c) === 1 ? trim($c[1]) : '';
            $about = trim((string) preg_replace('/\s{2,}/u', ' ', (string) preg_replace(self::COLOUR, '', $about)));
            $cast[] = ['name' => trim($m[1]), 'description' => trim(implode('. ', array_filter([trim($m[2] ?? ''), $about]))), 'colour' => $colour];
        }

        return $cast;
    }

    /** A passage name as a scene title: " Node-PaperMoney" -> "Paper Money". */
    public static function title(string $name): string
    {
        $name = (string) preg_replace('/^node[\s_-]*/iu', '', trim($name));
        $name = (string) preg_replace('/(?<=\p{Ll})(?=\p{Lu})/u', ' ', $name);

        return trim((string) preg_replace('/[\s_-]+/u', ' ', $name)) ?: trim($name);
    }

    /** A name for matching: no accents, lower case ("NICCOLÒ" -> "niccolo"). */
    public static function key(string $name): string
    {
        return trim(mb_strtolower(Str::ascii($name)));
    }

    /** @return array<string,string> */
    private static function attributes(string $raw): array
    {
        preg_match_all('/([\w-]+)="([^"]*)"/u', $raw, $m, PREG_SET_ORDER);

        return collect($m)->mapWithKeys(fn ($a) => [strtolower($a[1]) => self::decode($a[2])])->all();
    }

    private static function decode(string $s): string
    {
        return html_entity_decode($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
}
