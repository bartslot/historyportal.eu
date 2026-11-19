<?php

declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;

/**
 * The editor's interface icons: one SVG file per meaning in resources/ui-icons, drawn by
 * <x-ui.icon name="…" /> in Blade and uiIcon('…') in JS (resources/js/ui/icons.js).
 *
 * The file name is the MEANING (text, draw, publish), never the picture (pencil, cloud), so a
 * picture can change without touching a view, and one picture never stands for two things.
 * Not under resources/icons: icons:import publishes every folder there into the teachers' library.
 */
final class UiIcon
{
    public const DIR = 'resources/ui-icons';

    /** @var array<string, string> name → the file's markup, read once per request */
    private static array $cache = [];

    /** Whether resources/ui-icons has this icon. */
    public static function exists(string $name): bool
    {
        return self::isValidName($name) && is_file(self::path($name));
    }

    /**
     * The icon's <svg>, with $attributes added to its root element (class, aria-hidden, …).
     *
     * @param  array<string, string|int|float|bool|null>  $attributes
     */
    public static function svg(string $name, array $attributes = []): string
    {
        if (! self::exists($name)) {
            throw new InvalidArgumentException("No interface icon named [{$name}] in ".self::DIR.'.');
        }

        $markup = self::$cache[$name] ??= trim((string) file_get_contents(self::path($name)));

        $extra = '';
        foreach ($attributes as $key => $value) {
            if ($value === null || $value === false) {
                continue;
            }
            $extra .= $value === true
                ? ' '.$key
                : ' '.$key.'="'.htmlspecialchars((string) $value, ENT_QUOTES).'"';
        }

        return (string) preg_replace('/^<svg\b/', '<svg'.$extra, $markup, 1);
    }

    /** @return list<string> every icon name, sorted */
    public static function names(): array
    {
        $names = array_map(
            static fn (string $file): string => basename($file, '.svg'),
            glob(base_path(self::DIR).'/*.svg') ?: [],
        );
        sort($names);

        return $names;
    }

    private static function isValidName(string $name): bool
    {
        return (bool) preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/', $name);
    }

    private static function path(string $name): string
    {
        return base_path(self::DIR.'/'.$name.'.svg');
    }
}
