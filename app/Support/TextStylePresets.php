<?php

declare(strict_types=1);

namespace App\Support;

/**
 * The text styles a text layer can take with one click (the Styles grid at the top of a text's Format
 * tab). A style is how the letters LOOK, not which letters: colour, edge (outline, shadow, glow or
 * none) and the box behind them. The font stays the teacher's choice under Typography (Bart,
 * 2026-11-24: "lettertype is the font type, the text style is how it looks"). Comic is the one style
 * that is a hand as well, so it sets the comic lettering font too.
 *
 * A style writes ordinary fields, the same ones the Appearance rows edit, and resets every other look
 * field (LOOK_FIELDS), so the next style leaves nothing behind. Font, size, align, position, width,
 * list, the words, motion and pinning are never touched (except Comic's font).
 */
final class TextStylePresets
{
    /** The fields a style owns. Anything here a style leaves out is reset to its default (absent). */
    public const LOOK_FIELDS = [
        'color', 'colorOpacity', 'effect', 'effectColor', 'effectWidth', 'bg', 'bgColor', 'bgOpacity',
    ];

    /**
     * id => [English label (translated in lang/*.json), fields]. Six, shown 2 x 3.
     *
     * @var array<string, array{0: string, 1: array<string, string|float>}>
     */
    private const PRESETS = [
        'outline' => ['Outline', ['color' => '#ffffff', 'effect' => 'outline', 'effectColor' => '#000000']],
        'shadow' => ['Shadow', ['color' => '#ffffff', 'effect' => 'shadow']],
        'plain' => ['No edge', ['color' => '#ffffff', 'effect' => 'none']],
        'comic' => ['Comic', ['font' => 'comic', 'color' => '#1c1917', 'effect' => 'glow', 'effectColor' => '#fdf6e3']],
        'light-on-dark' => ['Light on dark', [
            'color' => '#ffffff', 'effect' => 'none', 'bg' => 'glass', 'bgColor' => '#000000', 'bgOpacity' => 0.85,
        ]],
        'dark-on-light' => ['Dark on light', [
            'color' => '#1c1917', 'effect' => 'none', 'bg' => 'glass', 'bgColor' => '#fdf6e3', 'bgOpacity' => 0.9,
        ]],
    ];

    /** The font stacks TextOverlayLayer.js FONTS draws with, for the previews. */
    public const FONT_STACKS = [
        'sans' => ["'Inter', ui-sans-serif, sans-serif", 600],
        'history' => ["'History', serif", 700],
        'cinzel' => ["'Cinzel', serif", 700],
        'comic' => ["'Comic Relief', 'Comic Neue', sans-serif", 700],
        'comic-america' => ["'Luckiest Guy', sans-serif", 400],
    ];

    /** @return array<string, string> id => translated label, in display order. */
    public static function labels(): array
    {
        return array_map(fn (array $p) => __($p[0]), self::PRESETS);
    }

    /** @return array<string, string|float>|null The fields style `$id` writes, or null for an unknown id. */
    public static function fields(string $id): ?array
    {
        return self::PRESETS[$id][1] ?? null;
    }

    /**
     * `$text` wearing style `$id`: the style's fields set, the other look fields back to default,
     * everything else as it was. Null for an unknown style.
     *
     * @param  array<string, mixed>  $text
     * @return array<string, mixed>|null
     */
    public static function apply(array $text, string $id): ?array
    {
        $fields = self::fields($id);
        if ($fields === null) {
            return null;
        }
        foreach (self::LOOK_FIELDS as $field) {
            unset($text[$field]);
        }

        return [...$text, 'bg' => 'none', ...$fields];
    }

    /** The style `$text` is wearing right now, or null once its look has been changed by hand. */
    public static function current(array $text): ?string
    {
        $norm = function (array $t): array {
            $effect = $t['effect'] ?? 'shadow';
            $bg = ($t['bg'] ?? 'none') === 'glass';

            return [
                'color' => strtolower((string) ($t['color'] ?? '#f8fafc')),
                'colorOpacity' => (float) ($t['colorOpacity'] ?? 1),
                'effect' => $effect,
                'effectColor' => in_array($effect, ['outline', 'glow'], true) ? strtolower((string) ($t['effectColor'] ?? '#000000')) : null,
                'effectWidth' => isset($t['effectWidth']) ? (float) $t['effectWidth'] : null,
                'bg' => $bg,
                'bgColor' => $bg ? strtolower((string) ($t['bgColor'] ?? '#0f172a')) : null,
                'bgOpacity' => $bg ? (float) ($t['bgOpacity'] ?? 0.3) : null,
            ];
        };
        $have = $norm($text);
        foreach (self::PRESETS as $id => [, $fields]) {
            if (isset($fields['font']) && ($text['font'] ?? 'sans') !== $fields['font']) {
                continue;
            }
            if ($norm($fields) == $have) {
                return $id;
            }
        }

        return null;
    }

    /**
     * How style `$id`'s tile draws the word "Text" in `$font` (the text's own font, or the style's when
     * it has one): the same colour, edge and box the stage will draw, small. Mirrors TextOverlayLayer.js
     * edgeOf / comicLook.
     *
     * @return array{comic: bool, text: string, card: string}
     */
    public static function preview(string $id, string $font = 'sans'): array
    {
        $f = self::fields($id) ?? [];
        $font = $f['font'] ?? $font;
        [$stack, $weight] = self::FONT_STACKS[$font] ?? self::FONT_STACKS['sans'];
        $comic = $font === 'comic-america';
        $effect = $f['effect'] ?? 'shadow';
        $ink = $f['effectColor'] ?? '#000000';
        $color = $f['color'] ?? '#f8fafc';

        $text = "font-family: {$stack}; font-weight: {$weight}; color: {$color};";
        if ($comic) {
            $caInk = match ($effect) { 'none' => 'transparent', 'outline', 'glow' => $ink, default => '#000000' };
            $text .= " --lp-ca-fill: {$color}; --lp-ca-ink: {$caInk};";
        } else {
            $text .= ' text-shadow: '.self::edge($effect, $ink, null).';';
        }

        $card = '';
        if (($f['bg'] ?? 'none') === 'glass') {
            [$r, $g, $b] = sscanf((string) ($f['bgColor'] ?? '#0f172a'), '#%02x%02x%02x');
            $a = $f['bgOpacity'] ?? 0.3;
            $card = "background: rgba({$r},{$g},{$b},{$a}); padding: 2px 10px; border-radius: 6px;";
        }

        return ['comic' => $comic, 'text' => $text, 'card' => $card];
    }

    /** The CSS text-shadow for an edge: the same recipe as TextOverlayLayer.js edgeOf. */
    public static function edge(string $effect, string $ink, ?float $width): string
    {
        $w = $width ?? 0.06;
        $em = fn (float $k) => round($w * $k, 3).'em';
        $ring = fn (string $d) => array_map(fn ($o) => "{$o} 0 {$ink}",
            ["{$d} 0", "-{$d} 0", "0 {$d}", "0 -{$d}", "{$d} {$d}", "-{$d} {$d}", "{$d} -{$d}", "-{$d} -{$d}"]);

        return match ($effect) {
            'none' => 'none',
            'outline' => implode(', ', $ring($em(1))),
            'glow' => implode(', ', [...$ring($em(0.5)), "0 0 {$em(3)} {$ink}", "0 0 {$em(3)} {$ink}"]),
            default => '0 2px 8px rgba(0,0,0,0.75)',
        };
    }
}
