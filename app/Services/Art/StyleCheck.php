<?php

declare(strict_types=1);

namespace App\Services\Art;

/**
 * The History Lines smoke test (docs/history-lines-style.md §2): how much black ink, how much very pale paper
 * and how strong the colour is. Catches big drift only (a dark painterly picture, no line, a poster-bright
 * one); whether a picture really is History Lines stays a human call.
 *
 * Ranges widened a little for snow and desert: the Pamir plate runs 5% ink, 75% pale, 0.08 saturation.
 * Same numbers as scripts/elevenlabs-image-test.php, which tested them against the Marco Polo plates.
 */
final class StyleCheck
{
    /**
     * @return array{ink: float, pale: float, saturation: float}
     */
    public static function metrics(string $bytes): array
    {
        $src = @imagecreatefromstring($bytes);
        if ($src === false) {
            return ['ink' => 0.0, 'pale' => 0.0, 'saturation' => 0.0];
        }
        $w = 384;
        $h = max(1, (int) round(imagesy($src) * $w / max(1, imagesx($src))));
        $img = imagescale($src, $w, $h);
        $dark = $pale = 0;
        $sat = 0.0;
        for ($y = 0; $y < $h; $y++) {
            for ($x = 0; $x < $w; $x++) {
                $c = imagecolorat($img, $x, $y);
                $r = ($c >> 16) & 255;
                $g = ($c >> 8) & 255;
                $b = $c & 255;
                $max = max($r, $g, $b) / 255;
                $min = min($r, $g, $b) / 255;
                $s = $max > 0 ? ($max - $min) / $max : 0;
                $lum = (0.2126 * $r + 0.7152 * $g + 0.0722 * $b) / 255;
                $dark += $lum < 0.30 ? 1 : 0;
                $pale += ($max > 0.85 && $s < 0.18) ? 1 : 0;
                $sat += $s;
            }
        }
        $n = $w * $h;

        return ['ink' => round($dark / $n * 100, 1), 'pale' => round($pale / $n * 100, 1), 'saturation' => round($sat / $n, 2)];
    }

    /**
     * What is off, as name => the correction to send with the redo. Empty means on style.
     *
     * @param  array{ink: float, pale: float, saturation: float}  $m
     * @param  bool  $sheet  a character sheet on 18% grey: no pale-paper floor (the grey is not paper)
     * @return array<string, string>
     */
    public static function problems(array $m, bool $sheet = false): array
    {
        return array_filter([
            'too much black' => $m['ink'] > 14 ? 'There is too much black: keep ink to about 10% of the picture, darkness built from hatching lines, no solid black fills or dark frames.' : null,
            'too little line' => $m['ink'] < 4 ? 'The ink line is too weak: draw confident black contours and controlled hatching over the watercolour.' : null,
            'too little paper' => ! $sheet && $m['pale'] < 30 ? 'Too little paper shows: leave 35 to 45% of the picture very pale, keep buildings and ground close to white, colour only the focal things.' : null,
            'too saturated' => $m['saturation'] > 0.30 ? 'The colour is too strong: use thin transparent washes, selective colour, quieter background.' : null,
        ]);
    }

    /** The redo line appended to the prompt. */
    public static function correction(array $problems): string
    {
        return $problems === [] ? '' : ' Correction, the last attempt was off the History Lines style: '.implode(' ', $problems);
    }
}
