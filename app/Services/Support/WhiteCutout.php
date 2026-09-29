<?php

declare(strict_types=1);

namespace App\Services\Support;

use GdImage;

/**
 * Makes the paper around a picture transparent: a drawing on a light background becomes a cut-out
 * the moment it is uploaded as a layer.
 *
 * The paper is whatever light colour most of the edge is: white, but also the pale yellow or pale
 * blue our image generator paints behind a figure (Bart). Our figures have strong black outlines,
 * so a flood through "close to the paper colour" stops at the ink.
 *
 * Only paper CONNECTED TO THE EDGE goes. Paper enclosed by ink (a face, a robe, the gap under an
 * arm) stays, because a hole and the figure's own paper are the same pixels; the teacher removes a
 * real hole with the quick mask. A photo or painting, whose edge is not mostly one light colour,
 * is returned untouched.
 */
final class WhiteCutout
{
    /** A pixel this bright (0-255 luma) or more counts as light: a candidate for paper. */
    private const LIGHT = 190;

    /** Colour distance (sum of channel differences) within which a pixel IS the paper. */
    private const PAPER_DISTANCE = 60;

    /** Up to this distance, a pixel touching the cleared area fades out: a soft edge. */
    private const EDGE_DISTANCE = 150;

    /** Share of edge pixels that must be the paper colour before we treat it as a background. */
    private const PAPER_BORDER_SHARE = 0.5;

    /** Paper colour sampled from the edge, as [r, g, b]. */
    private static array $paper = [255, 255, 255];

    /**
     * The picture with its outer white made transparent, as a GD image with alpha on; null when
     * it does not sit on white (or already has transparency), so the caller stores it as it came.
     */
    public static function apply(string $bytes): ?GdImage
    {
        $img = @imagecreatefromstring($bytes);
        if ($img === false) {
            return null;
        }
        imagepalettetotruecolor($img);

        $w = imagesx($img);
        $h = imagesy($img);
        if ($w < 3 || $h < 3 || self::hasTransparency($img, $w, $h) || ! self::sitsOnPaper($img, $w, $h)) {
            imagedestroy($img);

            return null;
        }

        $cleared = self::floodFromEdges($img, $w, $h);

        imagealphablending($img, false);
        imagesavealpha($img, true);
        self::paint($img, $w, $h, $cleared);

        return $img;
    }

    /** Transparent already (a PNG cut-out): leave it as the teacher made it. Sampled on the edge. */
    private static function hasTransparency(GdImage $img, int $w, int $h): bool
    {
        foreach (self::edgePixels($w, $h) as [$x, $y]) {
            if ((imagecolorat($img, $x, $y) >> 24) & 0x7F) {
                return true;
            }
        }

        return false;
    }

    /**
     * Find the paper: the median colour of the light edge pixels. Then count how much of the edge
     * is within PAPER_DISTANCE of it; more than half means the picture sits on it.
     */
    private static function sitsOnPaper(GdImage $img, int $w, int $h): bool
    {
        $light = [[], [], []];
        $total = 0;
        foreach (self::edgePixels($w, $h) as [$x, $y]) {
            $total++;
            $rgb = imagecolorat($img, $x, $y);
            [$r, $g, $b] = [($rgb >> 16) & 0xFF, ($rgb >> 8) & 0xFF, $rgb & 0xFF];
            if (0.299 * $r + 0.587 * $g + 0.114 * $b >= self::LIGHT) {
                $light[0][] = $r;
                $light[1][] = $g;
                $light[2][] = $b;
            }
        }
        if ($total === 0 || count($light[0]) / $total <= self::PAPER_BORDER_SHARE) {
            return false;
        }
        self::$paper = array_map(function (array $channel): int {
            sort($channel);

            return $channel[intdiv(count($channel), 2)];
        }, $light);

        $paper = 0;
        foreach (self::edgePixels($w, $h) as [$x, $y]) {
            $paper += self::isPaper(imagecolorat($img, $x, $y)) ? 1 : 0;
        }

        return $paper / $total > self::PAPER_BORDER_SHARE;
    }

    private static function distance(int $rgb): int
    {
        return abs((($rgb >> 16) & 0xFF) - self::$paper[0]) + abs((($rgb >> 8) & 0xFF) - self::$paper[1]) + abs(($rgb & 0xFF) - self::$paper[2]);
    }

    /** @return iterable<array{0:int,1:int}> every edge pixel, each once */
    private static function edgePixels(int $w, int $h): iterable
    {
        for ($x = 0; $x < $w; $x++) {
            yield [$x, 0];
            yield [$x, $h - 1];
        }
        for ($y = 1; $y < $h - 1; $y++) {
            yield [0, $y];
            yield [$w - 1, $y];
        }
    }

    private static function isPaper(int $rgb): bool
    {
        return self::distance($rgb) <= self::PAPER_DISTANCE;
    }

    /**
     * 4-connected flood through paper, seeded from every paper pixel on the edge. One byte per pixel
     * ("\1" = cleared) and an int stack: no per-pixel arrays, so a 2880px picture stays in budget.
     */
    private static function floodFromEdges(GdImage $img, int $w, int $h): string
    {
        $cleared = str_repeat("\0", $w * $h);
        $stack = [];
        foreach (self::edgePixels($w, $h) as [$x, $y]) {
            $stack[] = $y * $w + $x;
        }

        while ($stack !== []) {
            $i = array_pop($stack);
            if ($cleared[$i] === "\1") {
                continue;
            }
            $x = $i % $w;
            $y = intdiv($i, $w);
            if (! self::isPaper(imagecolorat($img, $x, $y))) {
                continue;
            }
            $cleared[$i] = "\1";
            if ($x > 0) {
                $stack[] = $i - 1;
            }
            if ($x < $w - 1) {
                $stack[] = $i + 1;
            }
            if ($y > 0) {
                $stack[] = $i - $w;
            }
            if ($y < $h - 1) {
                $stack[] = $i + $w;
            }
        }

        return $cleared;
    }

    /** Cleared pixels go fully transparent; near-paper pixels touching them fade, so the edge is soft. */
    private static function paint(GdImage $img, int $w, int $h, string $cleared): void
    {
        $clear = imagecolorallocatealpha($img, 255, 255, 255, 127);
        for ($y = 0; $y < $h; $y++) {
            for ($x = 0; $x < $w; $x++) {
                $i = $y * $w + $x;
                if ($cleared[$i] === "\1") {
                    imagesetpixel($img, $x, $y, $clear);

                    continue;
                }
                $touches = ($x > 0 && $cleared[$i - 1] === "\1") || ($x < $w - 1 && $cleared[$i + 1] === "\1")
                    || ($y > 0 && $cleared[$i - $w] === "\1") || ($y < $h - 1 && $cleared[$i + $w] === "\1");
                if (! $touches) {
                    continue;
                }
                $rgb = imagecolorat($img, $x, $y);
                $d = self::distance($rgb);
                if ($d <= self::EDGE_DISTANCE) {
                    // EDGE_DISTANCE → opaque (0) … PAPER_DISTANCE → nearly clear (127): the
                    // anti-aliasing between ink and paper fades out instead of leaving a halo.
                    $alpha = (int) round((self::EDGE_DISTANCE - $d) / (self::EDGE_DISTANCE - self::PAPER_DISTANCE) * 127);
                    imagesetpixel($img, $x, $y, imagecolorallocatealpha($img, ($rgb >> 16) & 0xFF, ($rgb >> 8) & 0xFF, $rgb & 0xFF, max(0, min(127, $alpha))));
                }
            }
        }
    }
}
