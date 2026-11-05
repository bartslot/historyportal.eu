<?php

declare(strict_types=1);

namespace App\Services\Local;

use GdImage;
use RuntimeException;
use SplQueue;

/**
 * ChatGPT's answer back in the picture's own frame. A library figure keeps its metres per pixel, so a result at another
 * pixel size would change the figure's size on stage: a cut-out's figure is laid over the old figure's box, feet on its
 * feet; an opaque picture fills the frame. A cut-out comes back on #00FF00, which is keyed out first.
 */
final class FitEditedPicture
{
    private const PAPER = 238;      // every channel at least this, reached from the border: paper

    private const KEY_EDGE = 40;    // this much greener than red and blue: the edge of the green key begins

    private const KEY_FULL = 140;   // and from here it is all background

    private const SOLID = 64;       // GD alpha (0 opaque .. 127 clear) below this counts as painted

    private const TINT = 6;         // green leading by this much, too little to key: figure mixed with the background

    private const TINT_REACH = 3;   // how many px in from clean colour such a mix is painted over

    /** @return string PNG bytes the size of `$source` */
    public static function fit(string $source, string $result): string
    {
        $old = self::open($source);
        $new = self::open($result);
        $w = imagesx($old);
        $h = imagesy($old);
        $frame = imagecreatetruecolor($w, $h);
        imagealphablending($frame, false);
        imagesavealpha($frame, true);
        imagefilledrectangle($frame, 0, 0, $w, $h, imagecolorallocatealpha($frame, 0, 0, 0, 127));

        if (self::isCutOut($old)) {
            if (! self::isCutOut($new)) {
                self::keyGreen($new);
                if (! self::isCutOut($new)) {
                    self::clearPaper($new);   // it came back on white after all
                }
            }
            [$ox0, $oy0, $ox1, $oy1] = self::box($old);
            [$nx0, $ny0, $nx1, $ny1] = self::box($new);
            // as tall as it was, so it keeps its size on stage; narrower only when it would not fit the frame
            $k = min($w / ($nx1 - $nx0 + 1), ($oy1 - $oy0 + 1) / ($ny1 - $ny0 + 1));
            $dw = (int) round(($nx1 - $nx0 + 1) * $k);
            $dh = (int) round(($ny1 - $ny0 + 1) * $k);
            $dx = (int) max(0, min($w - $dw, round(($ox0 + $ox1) / 2 - $dw / 2)));
            $dy = $oy1 + 1 - $dh;   // on its feet
            imagecopyresampled($frame, $new, $dx, $dy, $nx0, $ny0, $dw, $dh, $nx1 - $nx0 + 1, $ny1 - $ny0 + 1);
        } else {
            // cover: a small difference in shape is cropped, never stretched
            $k = max($w / imagesx($new), $h / imagesy($new));
            $sw = (int) round($w / $k);
            $sh = (int) round($h / $k);
            imagecopyresampled($frame, $new, 0, 0, (int) ((imagesx($new) - $sw) / 2), (int) ((imagesy($new) - $sh) / 2), $w, $h, $sw, $sh);
        }
        ob_start();
        imagepng($frame);

        return (string) ob_get_clean();
    }

    /** Is the picture's border see-through? Then it is a cut-out, not a painting that fills its frame. */
    public static function isCutOut(GdImage $im): bool
    {
        $w = imagesx($im);
        $h = imagesy($im);
        $clear = 0;
        $seen = 0;
        for ($x = 0; $x < $w; $x += max(1, (int) ($w / 40))) {
            foreach ([0, $h - 1] as $y) {
                $seen++;
                $clear += ((imagecolorat($im, $x, $y) >> 24) & 0x7F) >= self::SOLID ? 1 : 0;
            }
        }
        for ($y = 0; $y < $h; $y += max(1, (int) ($h / 40))) {
            foreach ([0, $w - 1] as $x) {
                $seen++;
                $clear += ((imagecolorat($im, $x, $y) >> 24) & 0x7F) >= self::SOLID ? 1 : 0;
            }
        }

        return $clear > $seen / 2;
    }

    public static function open(string $path): GdImage
    {
        $bytes = @file_get_contents($path);
        $im = $bytes === false ? false : @imagecreatefromstring($bytes);
        if (! $im instanceof GdImage) {
            throw new RuntimeException("Not a picture: {$path}");
        }
        imagepalettetotruecolor($im);
        imagealphablending($im, false);
        imagesavealpha($im, true);

        return $im;
    }

    /**
     * The #00FF00 background out (Bart 11-05): a pixel as green as the key goes clear, one on the edge goes part clear
     * and loses its green, so no fringe stays around hair and thin lines.
     */
    private static function keyGreen(GdImage $im): void
    {
        $w = imagesx($im);
        $h = imagesy($im);
        for ($y = 0; $y < $h; $y++) {
            for ($x = 0; $x < $w; $x++) {
                $c = imagecolorat($im, $x, $y);
                $r = ($c >> 16) & 0xFF;
                $g = ($c >> 8) & 0xFF;
                $b = $c & 0xFF;
                $spill = $g - max($r, $b);
                if ($spill <= self::KEY_EDGE) {
                    continue;
                }
                $share = min(1.0, ($spill - self::KEY_EDGE) / (self::KEY_FULL - self::KEY_EDGE));   // 1: all background
                imagesetpixel($im, $x, $y, imagecolorallocatealpha($im, $r, min($g, max($r, $b)), $b, (int) round($share * 127)));
            }
        }
        self::paintOverTint($im);
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
                $alpha = $c >> 24;
                if ($alpha < 127 && ($alpha > 0 || (($c >> 8) & 0xFF) - max(($c >> 16) & 0xFF, $c & 0xFF) >= self::TINT)) {
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
                    $alpha = imagecolorat($im, $x, $y) >> 24;
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
            imagesetpixel($im, $x, $y, ($c & 0xFFFF00FF) | (min(($c >> 8) & 0xFF, $most) << 8));
        }
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
                if (isset($tinted[$dy * $w + $dx]) || ($c >> 24) >= self::SOLID) {
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
        [$r, $g, $b] = [(int) ($r / $n), (int) ($g / $n), (int) ($b / $n)];

        return ($r << 16) | (min($g, max($r, $b)) << 8) | $b;
    }

    /** Paper reached from the border goes clear. Paper enclosed by the figure stays: it may be a white shirt. */
    private static function clearPaper(GdImage $im): void
    {
        $w = imagesx($im);
        $h = imagesy($im);
        $seen = [];
        $todo = new SplQueue;
        $push = function (int $x, int $y) use (&$seen, $todo, $im, $w): void {
            $at = $y * $w + $x;
            if (isset($seen[$at])) {
                return;
            }
            $c = imagecolorat($im, $x, $y);
            if ((($c >> 16) & 0xFF) >= self::PAPER && (($c >> 8) & 0xFF) >= self::PAPER && ($c & 0xFF) >= self::PAPER) {
                $seen[$at] = true;
                $todo->enqueue([$x, $y]);
            }
        };
        for ($x = 0; $x < $w; $x++) {
            $push($x, 0);
            $push($x, $h - 1);
        }
        for ($y = 0; $y < $h; $y++) {
            $push(0, $y);
            $push($w - 1, $y);
        }
        $clear = imagecolorallocatealpha($im, 255, 255, 255, 127);
        while (! $todo->isEmpty()) {
            [$x, $y] = $todo->dequeue();
            imagesetpixel($im, $x, $y, $clear);
            if ($x > 0) {
                $push($x - 1, $y);
            }
            if ($x < $w - 1) {
                $push($x + 1, $y);
            }
            if ($y > 0) {
                $push($x, $y - 1);
            }
            if ($y < $h - 1) {
                $push($x, $y + 1);
            }
        }
    }

    /** @return array{0:int,1:int,2:int,3:int} the painted box: x0, y0, x1, y1 */
    private static function box(GdImage $im): array
    {
        $w = imagesx($im);
        $h = imagesy($im);
        [$x0, $y0, $x1, $y1] = [$w, $h, 0, 0];
        for ($y = 0; $y < $h; $y++) {
            for ($x = 0; $x < $w; $x++) {
                if (((imagecolorat($im, $x, $y) >> 24) & 0x7F) < self::SOLID) {
                    $x0 = min($x0, $x);
                    $x1 = max($x1, $x);
                    $y0 = min($y0, $y);
                    $y1 = max($y1, $y);
                }
            }
        }
        if ($x1 < $x0) {
            throw new RuntimeException('The picture came back empty.');
        }

        return [$x0, $y0, $x1, $y1];
    }
}
