<?php

declare(strict_types=1);

namespace App\Support;

use App\Services\Support\LayerAmbient;

/**
 * A lesson series' comic title screens. Each CANDIDATE is a folder
 * public/lesson-titles/{translation_group}/{candidate}/ holding a poster.json plus its pictures
 * (the Good Talk poster is `poster`, the Tintin cover `cover`, Bart's banner `banner`). Adding a
 * candidate is data only: a new folder with a poster.json, and the teacher's picker offers it.
 *
 * poster.json names itself for that picker: `label` (a lang key, or {nl: .., en: ..}), `order`
 * (low first; the first is the series' default) and an optional `thumb` picture in its folder.
 *
 * The player draws a poster (resources/js/title-poster.js); this reads the file, keeps only what
 * that renderer understands, and turns every file name into a URL.
 *
 * Boxes are shares of the frame in percent: x/w of its width, y/h of its height.
 */
final class TitlePoster
{
    private const DIR = 'lesson-titles';

    /** The title styles that are not a candidate folder: the series wordmark, the lettered title
     *  (ComicRoma, resources/js/title-letters.js) and the plain title (the History font). */
    public const LOGO = 'logo';

    public const LETTERS = 'letters';

    public const PLAIN = 'plain';

    public const BUILT_IN = [self::LOGO, self::LETTERS, self::PLAIN];

    /** title_style values from before candidates (the TitleStyle enum) and the candidate each became. */
    public const LEGACY = ['comic' => 'poster'];

    private const KEY = '/^[a-z0-9][a-z0-9-]*$/';

    private const FITS = ['contain', 'cover'];

    private const SUBTITLE_FONTS = ['comic', 'comicroma', 'lettering'];

    public const BADGE_LAYOUTS = ['row', 'column'];

    /** colour: each badge in its own brand colour; dark: all three in ink (Figma 2321:5150), for a flat poster colour they would vanish into. */
    public const BADGE_STYLES = ['colour', 'dark'];

    /**
     * What a title screen keeps clear of the join QR (resources/js/title-qr.js): a face is never
     * covered, nor the letters; a figure or the subject costs its weight.
     */
    public const KEEP_CLEAR_KINDS = ['face', 'figure', 'letters', 'subject'];

    /** The teacher's QR places besides auto and hidden (Lesson::qrPosition). */
    public const QR_CORNERS = ['bottom-right', 'top-right', 'bottom-left', 'top-left'];

    /** How a candidate draws the lesson's "what you can expect" lines in its own slot. */
    public const EXPECT_STYLES = ['strip'];

    /** A title_style value as stored: a legacy value mapped, anything not shaped like a key refused. */
    public static function key(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $value = self::LEGACY[$value] ?? $value;

        return preg_match(self::KEY, $value) === 1 ? $value : null;
    }

    /**
     * The series' candidates for the picker, by `order` then key.
     *
     * @return list<array{key: string, label: string, order: int, thumb_url: ?string}>
     */
    public static function candidates(?string $group): array
    {
        if ($group === null || preg_match(self::KEY, $group) !== 1) {
            return [];
        }
        $out = [];
        foreach (glob(public_path(self::DIR."/{$group}/*/poster.json")) ?: [] as $path) {
            $key = basename(dirname($path));
            if (preg_match(self::KEY, $key) !== 1 || in_array($key, self::BUILT_IN, true)) {
                continue;
            }
            $data = json_decode((string) file_get_contents($path), true);
            if (! is_array($data)) {
                report(new \UnexpectedValueException("Unreadable title poster: {$path}"));

                continue;
            }
            $thumb = is_string($data['thumb'] ?? null) ? ltrim(basename($data['thumb']), '.') : '';
            $thumb = $thumb !== '' && is_file(dirname($path).'/'.$thumb) ? $thumb : null;
            $out[] = [
                'key' => $key,
                'label' => self::label($data['label'] ?? null, $key),
                'order' => is_numeric($data['order'] ?? null) ? (int) $data['order'] : PHP_INT_MAX,
                'thumb_url' => $thumb !== null ? asset(self::DIR."/{$group}/{$key}/{$thumb}") : null,
            ];
        }
        usort($out, fn (array $a, array $b): int => [$a['order'], $a['key']] <=> [$b['order'], $b['key']]);

        return $out;
    }

    public static function exists(?string $group, string $candidate): bool
    {
        return self::path($group, $candidate) !== null;
    }

    /**
     * The parsed poster with resolved URLs, or null when the series has none (or it is unreadable).
     *
     * @return array<string, mixed>|null
     */
    public static function for(?string $group, string $candidate): ?array
    {
        $path = self::path($group, $candidate);
        if ($path === null) {
            return null;
        }
        $poster = self::parse($path, (string) $group, $candidate);
        if ($poster === null) {
            return null;
        }
        // The upright variant (a phone held upright, resources/js/title-poster.js variantFor):
        // portrait.json beside poster.json, the same data, read by the same parser.
        $portrait = dirname($path).'/portrait.json';

        return $poster + ['portrait' => is_file($portrait) ? self::parse($portrait, (string) $group, $candidate) : null];
    }

    /**
     * One poster file with resolved URLs, or null when it is unreadable.
     *
     * @return array<string, mixed>|null
     */
    private static function parse(string $path, string $group, string $candidate): ?array
    {
        $data = json_decode((string) file_get_contents($path), true);
        if (! is_array($data) || ! is_array($data['layers'] ?? null) || ! self::isBox($data['frame'] ?? null, ['w', 'h'])) {
            report(new \UnexpectedValueException("Unreadable title poster: {$path}"));

            return null;
        }

        $url = fn (string $file): string => asset(self::DIR."/{$group}/{$candidate}/".ltrim($file, '/'));

        $layers = [];
        foreach ($data['layers'] as $layer) {
            if (! is_array($layer) || ! is_string($layer['src'] ?? null) || ! self::isBox($layer['box'] ?? null)) {
                continue;
            }
            $layers[] = [
                'id' => (string) ($layer['id'] ?? $layer['src']),
                'url' => $url($layer['src']),
                'box' => self::box($layer['box']),
                'group' => is_string($layer['group'] ?? null) ? $layer['group'] : null,
                'flip' => in_array($layer['flip'] ?? null, ['x', 'y', 'xy'], true) ? $layer['flip'] : null,
                'rotate' => is_numeric($layer['rotate'] ?? null) ? (float) $layer['rotate'] : null,
                'enter' => in_array($layer['enter'] ?? null, ['drop', 'fade'], true) ? $layer['enter'] : null,
            ] + LayerAmbient::payload($layer);
        }

        $groups = [];
        foreach ((array) ($data['groups'] ?? []) as $name => $def) {
            if (! is_array($def)) {
                continue;
            }
            $groups[(string) $name] = [
                'box' => self::isBox($def['box'] ?? null) ? self::box($def['box']) : ['x' => 0.0, 'y' => 0.0, 'w' => 100.0, 'h' => 100.0],
                'mask_url' => is_string($def['mask'] ?? null) ? $url($def['mask']) : null,
                'shadow' => self::isBox($def['shadow'] ?? null, ['x', 'y']) ? [
                    'x' => (float) $def['shadow']['x'],
                    'y' => (float) $def['shadow']['y'],
                    'color' => self::colour($def['shadow']['color'] ?? null) ?? '#000000',
                ] : null,
            ];
        }

        return [
            'frame' => ['w' => (float) $data['frame']['w'], 'h' => (float) $data['frame']['h']],
            // contain: the whole frame, letterboxed in the background colour (the comic poster);
            // cover: the frame fills the view (a painted cover) with its focus box kept in sight.
            'fit' => in_array($data['fit'] ?? null, self::FITS, true) ? $data['fit'] : 'contain',
            'background' => self::colour($data['background'] ?? null) ?? '#000000',
            // On a tall phone a cover leaves colour above and below it: background above, this below.
            'background_bottom' => self::colour($data['background_bottom'] ?? null),
            'focus' => self::isBox($data['focus'] ?? null) ? self::box($data['focus']) : null,
            'groups' => $groups,
            'layers' => $layers,
            // The lesson-type badges at bottom right: a row (Figma 2321:1315), or a column for a
            // poster whose letters reach into the bottom right and leave only a strip at the side.
            // The poster as one picture, for a tall card or a tall share image (portrait.json).
            'still_url' => is_string($data['still'] ?? null) && is_file(dirname($path).'/'.ltrim(basename($data['still']), '.')) ? $url(ltrim(basename($data['still']), '.')) : null,
            'badges' => in_array($data['badges'] ?? null, self::BADGE_LAYOUTS, true) ? $data['badges'] : 'row',
            'badge_style' => in_array($data['badge_style'] ?? null, self::BADGE_STYLES, true) ? $data['badge_style'] : 'colour',
            'keep_clear' => self::keepClear($data['keep_clear'] ?? null),
            // The candidate's own place for the "what you can expect" lines (the banner's white strip).
            'expect' => self::isBox(self::boxOf($data['expect']['box'] ?? null)) && in_array($data['expect']['style'] ?? null, self::EXPECT_STYLES, true) ? [
                'box' => self::box(self::boxOf($data['expect']['box'])),
                'style' => $data['expect']['style'],
            ] : null,
            'subtitle' => self::isBox($data['subtitle']['box'] ?? null) ? [
                'box' => self::box($data['subtitle']['box']),
                'size' => (float) ($data['subtitle']['size'] ?? 2.3),
                'color' => self::colour($data['subtitle']['color'] ?? null) ?? '#FFFFFF',
                'font' => in_array($data['subtitle']['font'] ?? null, self::SUBTITLE_FONTS, true) ? $data['subtitle']['font'] : 'comic',
            ] : null,
        ];
    }

    /**
     * The poster with the teacher's picture as its picture: it takes the place of the poster's
     * full-frame layer (the Comic cover's plate, the banner's painting), or goes under the letters
     * of a poster that has none. What the poster kept clear in its own picture (faces, figures)
     * is not in this one, so only the letters stay clear.
     *
     * @param  array<string, mixed>  $poster  from for()
     * @return array<string, mixed>
     */
    public static function withPicture(array $poster, string $url): array
    {
        $full = fn (array $b): bool => $b['x'] <= 0 && $b['y'] <= 0 && $b['x'] + $b['w'] >= 100 && $b['y'] + $b['h'] >= 100;
        $at = collect($poster['layers'])->search(fn (array $layer) => $full($layer['box']));

        $layers = $poster['layers'];
        if ($at === false) {
            array_unshift($layers, [
                'id' => 'picture', 'url' => $url, 'box' => ['x' => 0.0, 'y' => 0.0, 'w' => 100.0, 'h' => 100.0],
                'group' => null, 'flip' => null, 'rotate' => null, 'enter' => 'fade',
            ] + LayerAmbient::payload([]));
        } else {
            $layers[$at] = ['url' => $url] + $layers[$at];
        }

        return ['layers' => $layers, 'keep_clear' => array_values(array_filter(
            $poster['keep_clear'], fn (array $entry) => $entry['kind'] === 'letters',
        ))] + $poster;
    }

    /** A label in the interface language: a per-language map, else a lang key, else the folder name. */
    private static function label(mixed $label, string $key): string
    {
        if (is_array($label)) {
            $text = $label[app()->getLocale()] ?? $label['en'] ?? reset($label);

            return is_string($text) && $text !== '' ? $text : ucfirst($key);
        }

        return is_string($label) && $label !== '' ? __($label) : ucfirst($key);
    }

    private static function path(?string $group, string $candidate): ?string
    {
        // Group and candidate name folders: never let either climb out of lesson-titles/.
        if ($group === null || preg_match(self::KEY, $group) !== 1 || preg_match(self::KEY, $candidate) !== 1) {
            return null;
        }
        $path = public_path(self::DIR."/{$group}/{$candidate}/poster.json");

        return is_file($path) ? $path : null;
    }

    /**
     * keep_clear entries as the player reads them, the unusable ones dropped: {box: [x, y, w, h]
     * (or {x, y, w, h}) in % of the frame, kind, weight?}. Also the shape of a lesson's
     * title_keep_clear (then % of the title picture).
     *
     * @return list<array{box: array{x: float, y: float, w: float, h: float}, kind: string, weight: ?float}>
     */
    public static function keepClear(mixed $entries): array
    {
        $out = [];
        foreach (is_array($entries) ? $entries : [] as $entry) {
            $box = self::boxOf($entry['box'] ?? null);
            if (! is_array($entry) || ! self::isBox($box) || ! in_array($entry['kind'] ?? null, self::KEEP_CLEAR_KINDS, true)) {
                continue;
            }
            $out[] = [
                'box' => self::box($box),
                'kind' => $entry['kind'],
                'weight' => is_numeric($entry['weight'] ?? null) ? max(0.0, (float) $entry['weight']) : null,
            ];
        }

        return $out;
    }

    /** A box written as [x, y, w, h] read as {x, y, w, h}; anything else passed through. */
    private static function boxOf(mixed $box): mixed
    {
        return is_array($box) && array_is_list($box) && count($box) === 4 ? array_combine(['x', 'y', 'w', 'h'], $box) : $box;
    }

    /** @param list<string> $keys */
    private static function isBox(mixed $box, array $keys = ['x', 'y', 'w', 'h']): bool
    {
        if (! is_array($box)) {
            return false;
        }
        foreach ($keys as $key) {
            if (! is_numeric($box[$key] ?? null)) {
                return false;
            }
        }

        return true;
    }

    /** @return array{x: float, y: float, w: float, h: float} */
    private static function box(array $box): array
    {
        return ['x' => (float) $box['x'], 'y' => (float) $box['y'], 'w' => (float) $box['w'], 'h' => (float) $box['h']];
    }

    private static function colour(mixed $value): ?string
    {
        return is_string($value) && preg_match('/^#[0-9a-fA-F]{6}$/', $value) ? $value : null;
    }
}
