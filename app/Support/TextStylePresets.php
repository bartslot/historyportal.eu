<?php

declare(strict_types=1);

namespace App\Support;

/**
 * The ready-made looks a text layer can take with one click (the Styles strip at the top of a text's
 * Format tab). A preset writes ordinary fields, the same ones the Typography and Appearance rows
 * edit, so after a click every value is the teacher's to change.
 *
 * A preset sets the WHOLE look: every field in LOOK_FIELDS it does not name goes back to its default
 * (absent). Picking "Ink caption" after "Comic title" must not leave the comic outline behind.
 * Position, width, list, the words, motion and pinning are never touched.
 *
 * The colours come from the History Lines palette (docs/brand-guidelines.md, the style guide's ink
 * and paper): white and black ink for the comic letters, warm cream and sepia ink for paper,
 * amber gold for a title.
 */
final class TextStylePresets
{
    /** The fields a preset owns. Anything here a preset leaves out is reset. */
    public const LOOK_FIELDS = [
        'font', 'size', 'align', 'color', 'colorOpacity', 'effect', 'effectColor', 'bg', 'bgColor', 'bgOpacity',
    ];

    /** Fields whose absence is not their default: written explicitly when a preset leaves them out. */
    private const DEFAULTS = ['font' => 'sans', 'size' => 'md', 'align' => 'left', 'bg' => 'none'];

    /**
     * id => [English label (translated in lang/*.json), fields].
     *
     * @var array<string, array{0: string, 1: array<string, string|float>}>
     */
    private const PRESETS = [
        'comic-title' => ['Comic title', [
            'font' => 'comic-america', 'size' => 'lg', 'color' => '#ffffff', 'effect' => 'outline', 'effectColor' => '#000000',
        ]],
        'sound-word' => ['Sound word', [
            'font' => 'comic-america', 'size' => 'lg', 'align' => 'center', 'color' => '#fcd34d', 'effect' => 'outline', 'effectColor' => '#1c1917',
        ]],
        'place-year' => ['Place and year', [
            'font' => 'cinzel', 'size' => 'md', 'color' => '#fdf6e3', 'effect' => 'shadow',
        ]],
        'gold-title' => ['Gold title', [
            'font' => 'cinzel', 'size' => 'lg', 'align' => 'center', 'color' => '#fbbf24', 'effect' => 'outline', 'effectColor' => '#3b2412',
        ]],
        'ink-caption' => ['Ink caption', [
            'font' => 'history', 'size' => 'md', 'color' => '#2b1d14', 'effect' => 'none',
        ]],
        'parchment-label' => ['Parchment label', [
            'font' => 'history', 'size' => 'md', 'align' => 'center', 'color' => '#3b2a1a', 'effect' => 'none',
            'bg' => 'glass', 'bgColor' => '#f3e7c9', 'bgOpacity' => 0.85,
        ]],
        'subtitle' => ['Subtitle', [
            'font' => 'sans', 'size' => 'sm', 'align' => 'center', 'color' => '#ffffff', 'effect' => 'none',
            'bg' => 'glass', 'bgColor' => '#0f172a', 'bgOpacity' => 0.55,
        ]],
        'narrator' => ['Narrator', [
            'font' => 'history', 'size' => 'md', 'color' => '#fdf6e3', 'effect' => 'shadow',
        ]],
    ];

    /** Presets meant for plain paper rather than over a picture: their tile shows them on paper. */
    private const ON_PAPER = ['ink-caption'];

    /** The font stacks TextOverlayLayer.js FONTS draws with, for the tiles' previews. */
    private const FONT_STACKS = [
        'sans' => ["'Inter', ui-sans-serif, sans-serif", 600],
        'history' => ["'History', serif", 700],
        'cinzel' => ["'Cinzel', serif", 700],
        'comic-america' => ["'Luckiest Guy', sans-serif", 400],
    ];

    /**
     * How preset `$id`'s tile draws its own name: the same font, colour, edge and card the stage will
     * draw, small. Mirrors TextOverlayLayer.js edgeOf / comicLook.
     *
     * @return array{comic: bool, paper: bool, text: string, card: string}
     */
    public static function preview(string $id): array
    {
        $f = self::fields($id) ?? [];
        $font = $f['font'] ?? 'sans';
        [$stack, $weight] = self::FONT_STACKS[$font];
        $comic = $font === 'comic-america';
        $effect = $f['effect'] ?? 'shadow';
        $ink = $f['effectColor'] ?? '#000000';
        $color = $f['color'] ?? '#f8fafc';

        $text = "font-family: {$stack}; font-weight: {$weight}; color: {$color};";
        if ($comic) {
            $text .= " --lp-ca-fill: {$color}; --lp-ca-ink: ".($effect === 'none' ? 'transparent' : $ink).';';
        } else {
            $d = '0.06em';
            $text .= ' text-shadow: '.match ($effect) {
                'none' => 'none',
                'outline' => implode(', ', array_map(fn ($o) => "{$o} 0 {$ink}",
                    ["{$d} 0", "-{$d} 0", "0 {$d}", "0 -{$d}", "{$d} {$d}", "-{$d} {$d}", "{$d} -{$d}", "-{$d} -{$d}", '0.03em 0.09em'])),
                default => '0 2px 8px rgba(0,0,0,0.75)',
            }.';';
        }

        $card = '';
        if (($f['bg'] ?? 'none') === 'glass') {
            [$r, $g, $b] = sscanf((string) ($f['bgColor'] ?? '#0f172a'), '#%02x%02x%02x');
            $a = $f['bgOpacity'] ?? 0.3;
            $card = "background: rgba({$r},{$g},{$b},{$a}); padding: 2px 8px; border-radius: 6px;";
        }

        return ['comic' => $comic, 'paper' => in_array($id, self::ON_PAPER, true), 'text' => $text, 'card' => $card];
    }

    /** @return array<string, string> id => translated label, in display order. */
    public static function labels(): array
    {
        return array_map(fn (array $p) => __($p[0]), self::PRESETS);
    }

    /** @return array<string, string|float>|null The fields preset `$id` writes, or null for an unknown id. */
    public static function fields(string $id): ?array
    {
        return self::PRESETS[$id][1] ?? null;
    }

    /**
     * `$text` wearing preset `$id`: the preset's fields set, the other look fields back to default,
     * everything else as it was. Null for an unknown preset.
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

        return [...$text, ...self::DEFAULTS, ...$fields];
    }

    /** The preset `$text` is wearing right now, or null once any of its look has been changed by hand. */
    public static function current(array $text): ?string
    {
        foreach (self::PRESETS as $id => [, $fields]) {
            $want = [...self::DEFAULTS, ...$fields];
            $match = true;
            foreach (self::LOOK_FIELDS as $field) {
                $has = $text[$field] ?? self::DEFAULTS[$field] ?? null;
                $expected = $want[$field] ?? null;
                // bgColor / bgOpacity only matter while the glass card is on.
                if (in_array($field, ['bgColor', 'bgOpacity'], true) && ($want['bg'] ?? 'none') !== 'glass') {
                    continue;
                }
                // colorOpacity 1 and effect 'shadow' are the drawn defaults, the same as absent.
                if ($field === 'colorOpacity' && (float) ($has ?? 1) === 1.0 && $expected === null) {
                    continue;
                }
                if ($field === 'effect' && ($has ?? 'shadow') === ($expected ?? 'shadow')) {
                    continue;
                }
                if ($field === 'effectColor' && ($want['effect'] ?? 'shadow') !== 'outline') {
                    continue;
                }
                if (is_string($has) && is_string($expected) ? strtolower($has) !== strtolower($expected) : $has != $expected) {
                    $match = false;
                    break;
                }
            }
            if ($match) {
                return $id;
            }
        }

        return null;
    }
}
