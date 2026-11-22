<?php

declare(strict_types=1);

namespace App\Services\Support;

use GdImage;

/**
 * The green screen out: everything transparent pictures are made on (solid #00FF00, CLAUDE.md, Bart 11-05) becomes
 * clear, and not only the exact key. Bart, 2026-11-22: "convert the green to just transparent pixels ... the range of
 * the colors automatically transparent". A screen is never one colour: ChatGPT paints it a little lighter here, a
 * little bluer there, and every hair and arm is blended into it.
 *
 * So the key is a range, measured as how much greener a pixel is than its red and blue: past KEY_EDGE it starts going
 * see-through, from KEY_FULL on it is all background. On the way it loses its green, and a pixel that is part figure,
 * part screen takes its colour from the clean figure pixels next to it, because taking the green off alone leaves olive
 * and yellow halos. Painted grass and olive cloth lead green by far less than KEY_EDGE, so they stay.
 *
 * The key runs over the whole picture, not only from the edge: the screen between an arm and the body is screen too.
 * It only runs when the picture sits on a green screen, so a painting with a green field is never touched.
 */
final class GreenKey
{
    /** This much greener than red and blue: the edge of the key begins. */
    public const KEY_EDGE = 40;

    /** And from here it is all background. */
    public const KEY_FULL = 140;

    /** Green leading by this much, too little to key: figure mixed with the screen. */
    private const TINT = 6;

    /** How many px in from clean colour such a mix is painted over. */
    private const TINT_REACH = 3;

    /** GD alpha (0 opaque .. 127 clear) below this counts as painted. */
    private const SOLID = 64;

    /** An edge pixel this much greener than red and blue is the screen (#00FF00 leads by 255, grass by 30 to 80) ... */
    private const SCREEN = 100;

    /** ... when it is also this bright: bright painted grass, RGB(60, 190, 50), leads by 130 but is darker. */
    private const SCREEN_GREEN = 200;

    /** Share of the edge that must be screen before the picture counts as made on one. */
    private const SCREEN_SHARE = 0.5;

    /** The key is all background from this share of the screen's own lead on: the screen's shading is screen too. */
    private const SCREEN_MARGIN = 0.85;

    /**
     * The picture with its green screen keyed out, as a GD image with alpha on; null when it does not sit on a green
     * screen (or already has transparency), so the caller stores it as it came.
     */
    public static function apply(string $bytes): ?GdImage
    {
        $img = @imagecreatefromstring($bytes);
        if ($img === false) {
            return null;
        }
        imagepalettetotruecolor($img);
        $screen = imagesx($img) < 3 || imagesy($img) < 3 || self::hasTransparency($img) ? null : self::screenSpill($img);
        if ($screen === null) {
            imagedestroy($img);

            return null;
        }
        imagealphablending($img, false);
        imagesavealpha($img, true);
        // a paler or bluer screen leads green by less than #00FF00 does: all of it still goes
        self::key($img, min(self::KEY_FULL, (int) round($screen * self::SCREEN_MARGIN)));

        return $img;
    }

    /** Is most of the picture's edge green screen? */
    public static function sitsOnGreen(GdImage $img): bool
    {
        return self::screenSpill($img) !== null;
    }

    /** How much the screen leads green by (the median over the edge pixels that are screen); null: not on a screen. */
    private static function screenSpill(GdImage $img): ?int
    {
        $screen = [];
        $total = 0;
        foreach (self::edgeSample($img) as $c) {
            $total++;
            if (self::spill($c) >= self::SCREEN && (($c >> 8) & 0xFF) >= self::SCREEN_GREEN) {
                $screen[] = self::spill($c);
            }
        }
        if ($total === 0 || count($screen) / $total <= self::SCREEN_SHARE) {
            return null;
        }
        sort($screen);

        return $screen[intdiv(count($screen), 2)];
    }

    /**
     * Key the green out of `$img` in place (alpha blending off, alpha saved): a pixel as green as the screen goes clear,
     * one in the range goes part clear and loses its green, and the blend at every edge takes the figure's own colour.
     */
    public static function key(GdImage $img, int $full = self::KEY_FULL): void
    {
        $full = max(self::KEY_EDGE + 20, $full);
        $w = imagesx($img);
        $h = imagesy($img);
        for ($y = 0; $y < $h; $y++) {
            for ($x = 0; $x < $w; $x++) {
                $c = imagecolorat($img, $x, $y);
                $spill = self::spill($c);
                if ($spill <= self::KEY_EDGE) {
                    continue;
                }
                $r = ($c >> 16) & 0xFF;
                $b = $c & 0xFF;
                $share = min(1.0, ($spill - self::KEY_EDGE) / ($full - self::KEY_EDGE));   // 1: all background
                $was = ($c >> 24) & 0x7F;
                $alpha = (int) round($was + (127 - $was) * $share);
                imagesetpixel($img, $x, $y, imagecolorallocatealpha($img, $r, max($r, $b), $b, $alpha));
            }
        }
        self::paintOverTint($img);
    }

    /** How much greener than its red and blue a GD colour is. */
    private static function spill(int $c): int
    {
        return (($c >> 8) & 0xFF) - max(($c >> 16) & 0xFF, $c & 0xFF);
    }

    /** Transparent already (a PNG cut-out): leave it as the teacher made it. */
    private static function hasTransparency(GdImage $img): bool
    {
        foreach (self::edgeSample($img) as $c) {
            if (($c >> 24) & 0x7F) {
                return true;
            }
        }

        return false;
    }

    /** @return iterable<int> about 40 colours along each side of the picture */
    private static function edgeSample(GdImage $img): iterable
    {
        $w = imagesx($img);
        $h = imagesy($img);
        for ($x = 0; $x < $w; $x += max(1, intdiv($w, 40))) {
            yield imagecolorat($img, $x, 0);
            yield imagecolorat($img, $x, $h - 1);
        }
        for ($y = 0; $y < $h; $y += max(1, intdiv($h, 40))) {
            yield imagecolorat($img, 0, $y);
            yield imagecolorat($img, $w - 1, $y);
        }
    }

    /**
     * A pixel that is part figure, part green keeps the see-through the key gave it, but takes its colour from the clean
     * pixels around it: taking the green off alone leaves olive and yellow, and green too faint to key stays green.
     */
    private static function paintOverTint(GdImage $im): void
    {
        $w = imagesx($im);
        $h = imagesy($im);
        $tinted = [];
        for ($y = 0; $y < $h; $y++) {
            for ($x = 0; $x < $w; $x++) {
                $c = imagecolorat($im, $x, $y);
                $alpha = ($c >> 24) & 0x7F;
                // too faint to key, but only a mix with the screen when the screen is near: olive paint inside the
                // figure is the figure's own colour
                if ($alpha < 127 && ($alpha > 0 || (self::spill($c) >= self::TINT && self::nearKeyed($im, $x, $y)))) {
                    $tinted[$y * $w + $x] = true;
                }
            }
        }
        for ($pass = 0; $pass < self::TINT_REACH && $tinted !== []; $pass++) {
            $painted = [];
            foreach ($tinted as $at => $_) {
                $x = $at % $w;
                $y = intdiv($at, $w);
                $around = self::cleanAround($im, $x, $y, $tinted);
                if ($around !== null) {
                    $alpha = (imagecolorat($im, $x, $y) >> 24) & 0x7F;
                    $painted[$at] = ($alpha << 24) | $around;
                }
            }
            foreach ($painted as $at => $colour) {
                imagesetpixel($im, $at % $w, intdiv($at, $w), $colour);
                unset($tinted[$at]);
            }
        }
        // nothing clean within reach (a stray hair with green on both sides): at least no green left in it
        foreach ($tinted as $at => $_) {
            $x = $at % $w;
            $y = intdiv($at, $w);
            $c = imagecolorat($im, $x, $y);
            $most = max(($c >> 16) & 0xFF, $c & 0xFF);
            imagesetpixel($im, $x, $y, ($c & 0x7FFF00FF) | (min(($c >> 8) & 0xFF, $most) << 8));
        }
    }

    /** Is anything keyed (part or all clear) within TINT_REACH px? */
    private static function nearKeyed(GdImage $im, int $x, int $y): bool
    {
        $w = imagesx($im);
        $h = imagesy($im);
        for ($dy = max(0, $y - self::TINT_REACH); $dy <= min($h - 1, $y + self::TINT_REACH); $dy++) {
            for ($dx = max(0, $x - self::TINT_REACH); $dx <= min($w - 1, $x + self::TINT_REACH); $dx++) {
                if ((imagecolorat($im, $dx, $dy) >> 24) & 0x7F) {
                    return true;
                }
            }
        }

        return false;
    }

    /** @return int|null the mean RGB of the painted, untinted pixels next to this one; null when it has none */
    private static function cleanAround(GdImage $im, int $x, int $y, array $tinted): ?int
    {
        $w = imagesx($im);
        $h = imagesy($im);
        [$r, $g, $b, $n] = [0, 0, 0, 0];
        for ($dy = max(0, $y - 1); $dy <= min($h - 1, $y + 1); $dy++) {
            for ($dx = max(0, $x - 1); $dx <= min($w - 1, $x + 1); $dx++) {
                $c = imagecolorat($im, $dx, $dy);
                if (isset($tinted[$dy * $w + $dx]) || (($c >> 24) & 0x7F) >= self::SOLID) {
                    continue;
                }
                $r += ($c >> 16) & 0xFF;
                $g += ($c >> 8) & 0xFF;
                $b += $c & 0xFF;
                $n++;
            }
        }

        if ($n === 0) {
            return null;
        }
        [$r, $g, $b] = [intdiv($r, $n), intdiv($g, $n), intdiv($b, $n)];

        return ($r << 16) | (min($g, max($r, $b)) << 8) | $b;
    }
}
