<?php

declare(strict_types=1);

namespace App\Services\Support;

use GdImage;

/**
 * The green screen out: everything transparent pictures are made on (solid #00FF00, CLAUDE.md, Bart 11-05) becomes
 * clear, and not only the exact key. Bart, 2026-11-22: "convert the green to just transparent pixels ... the range of
 * the colors automatically transparent", and 11-23: "green is in almost all the images we upload. it's a range of
 * colors. we try not to produce anything in this range, so it's safe to say that this range can be converted to the
 * alpha channel".
 *
 * So the range is the alpha channel, in every uploaded layer picture, wherever it is: at the edge, between an arm and
 * the body, in a pocket of hair. Measured as how much greener a pixel is than its red and blue: past KEY_EDGE it starts
 * going see-through, from KEY_FULL on it is clear. On the way it loses its green, and a pixel that is part figure, part
 * screen takes its colour from the clean figure pixels next to it, because taking the green off alone leaves olive and
 * yellow halos. Olive and sap greens (RGB 110,130,60 leads by 20) are below KEY_EDGE and stay.
 */
final class GreenKey
{
    /** This much greener than red and blue: the edge of the key begins. */
    public const KEY_EDGE = 40;

    /**
     * And from here it is clear. A paler or bluer screen leads by less than #00FF00 (RGB 20,220,90 by 130), so when the
     * picture's own screen leads by less, the clear point moves down with it (SCREEN_MARGIN of its lead).
     */
    public const KEY_FULL = 140;

    /** A pixel this much greener than red and blue is the screen itself. */
    private const SCREEN = 100;

    /** The key is clear from this share of the screen's own lead on: the screen's shading is screen too. */
    private const SCREEN_MARGIN = 0.85;

    /** Green leading by this much, too little to key: figure mixed with the screen. */
    private const TINT = 6;

    /** How many px in from clean colour such a mix is painted over. */
    private const TINT_REACH = 3;

    /** GD alpha (0 opaque .. 127 clear) below this counts as painted. */
    private const SOLID = 64;

    /**
     * The picture with the green range keyed out, as a GD image with alpha on; null when it has no pixel in the range,
     * so the caller stores it as it came (or tries the white paper cut-out).
     */
    public static function apply(string $bytes): ?GdImage
    {
        $img = @imagecreatefromstring($bytes);
        if ($img === false) {
            return null;
        }
        imagepalettetotruecolor($img);
        if (! self::hasGreen($img)) {
            imagedestroy($img);

            return null;
        }
        imagealphablending($img, false);
        imagesavealpha($img, true);
        $screen = self::screenLead($img);
        self::key($img, $screen === null ? self::KEY_FULL : min(self::KEY_FULL, (int) round($screen * self::SCREEN_MARGIN)));

        return $img;
    }

    /** How much the picture's screen leads green by (median over its screen pixels, sampled); null: no screen in it. */
    private static function screenLead(GdImage $img): ?int
    {
        $w = imagesx($img);
        $h = imagesy($img);
        $step = max(1, intdiv(max($w, $h), 300));
        $leads = [];
        for ($y = 0; $y < $h; $y += $step) {
            for ($x = 0; $x < $w; $x += $step) {
                $c = imagecolorat($img, $x, $y);
                if ((($c >> 24) & 0x7F) < 127 && self::spill($c) >= self::SCREEN) {
                    $leads[] = self::spill($c);
                }
            }
        }
        if ($leads === []) {
            return null;
        }
        sort($leads);

        return $leads[intdiv(count($leads), 2)];
    }

    /** Does any visible pixel fall in the range? */
    public static function hasGreen(GdImage $img): bool
    {
        $w = imagesx($img);
        $h = imagesy($img);
        for ($y = 0; $y < $h; $y++) {
            for ($x = 0; $x < $w; $x++) {
                $c = imagecolorat($img, $x, $y);
                if ((($c >> 24) & 0x7F) < 127 && self::spill($c) > self::KEY_EDGE) {
                    return true;
                }
            }
        }

        return false;
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
