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

    /** The two title styles that are not a candidate folder: the series wordmark and the plain title. */
    public const LOGO = 'logo';

    public const PLAIN = 'plain';

    /** title_style values from before candidates (the TitleStyle enum) and the candidate each became. */
    public const LEGACY = ['comic' => 'poster'];

    private const KEY = '/^[a-z0-9][a-z0-9-]*$/';

    private const FITS = ['contain', 'cover'];

    private const SUBTITLE_FONTS = ['comic', 'comicroma', 'lettering'];

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
            if (preg_match(self::KEY, $key) !== 1 || in_array($key, [self::LOGO, self::PLAIN], true)) {
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
            'subtitle' => self::isBox($data['subtitle']['box'] ?? null) ? [
                'box' => self::box($data['subtitle']['box']),
                'size' => (float) ($data['subtitle']['size'] ?? 2.3),
                'color' => self::colour($data['subtitle']['color'] ?? null) ?? '#FFFFFF',
                'font' => in_array($data['subtitle']['font'] ?? null, self::SUBTITLE_FONTS, true) ? $data['subtitle']['font'] : 'comic',
            ] : null,
        ];
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
