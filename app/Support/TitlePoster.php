<?php

declare(strict_types=1);

namespace App\Support;

use App\Services\Support\LayerAmbient;

/**
 * A lesson series' comic title poster: public/lesson-titles/{translation_group}/poster.json plus
 * its pictures; a variant lives in a subfolder (the Tintin-style cover: {group}/cover/). The
 * player draws it (resources/js/title-poster.js); this reads the file, keeps only what that
 * renderer understands, and turns every file name into a URL.
 *
 * Boxes are shares of the frame in percent: x/w of its width, y/h of its height.
 */
final class TitlePoster
{
    private const DIR = 'lesson-titles';

    /** Subfolders a poster may live in ('' = the series folder itself). */
    public const VARIANTS = ['', 'cover'];

    private const FITS = ['contain', 'cover'];

    private const SUBTITLE_FONTS = ['comic', 'comicroma'];

    public static function exists(?string $group, string $variant = ''): bool
    {
        return self::path($group, $variant) !== null;
    }

    /**
     * The parsed poster with resolved URLs, or null when the series has none (or it is unreadable).
     *
     * @return array<string, mixed>|null
     */
    public static function for(?string $group, string $variant = ''): ?array
    {
        $path = self::path($group, $variant);
        if ($path === null) {
            return null;
        }

        $data = json_decode((string) file_get_contents($path), true);
        if (! is_array($data) || ! is_array($data['layers'] ?? null) || ! self::isBox($data['frame'] ?? null, ['w', 'h'])) {
            report(new \UnexpectedValueException("Unreadable title poster: {$path}"));

            return null;
        }

        $folder = $variant === '' ? $group : "{$group}/{$variant}";
        $url = fn (string $file): string => asset(self::DIR."/{$folder}/".ltrim($file, '/'));

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

    private static function path(?string $group, string $variant = ''): ?string
    {
        // The group names a folder: never let it climb out of lesson-titles/.
        if ($group === null || ! preg_match('/^[a-z0-9][a-z0-9-]*$/', $group) || ! in_array($variant, self::VARIANTS, true)) {
            return null;
        }
        $path = public_path(self::DIR."/{$group}/".($variant === '' ? '' : "{$variant}/").'poster.json');

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
