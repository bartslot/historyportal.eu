<?php

declare(strict_types=1);

namespace App\Services\Lessons;

use InvalidArgumentException;

/**
 * Where a figure's mouth is on its own picture, as a fraction of the picture: [x, y] in 0..1.
 * The player puts that fraction on the figure's RENDERED box, so the balloon follows whatever the
 * layer does (scale, depth, parallax, bob, a walk); a sprite sheet will later give this point per
 * frame, in the same units.
 *
 * The figure's own metadata wins: `mouths` in its art manifest ([x, y] of the picture), and later a
 * sprite sheet's per-frame point. Without it the mouth is predicted: every human is 170 cm at neutral scale and the mouth sits a
 * fixed MOUTH_CM below the top of the head (hair or cap included, as the library draws them). What
 * the picture's height stands for depends on the pose, declared per figure in the art manifest
 * (`poses`; a figure the manifest cuts off at the bottom is a half figure). The head is the top of
 * the picture in every pose, and x is the middle of what is drawn in that head band.
 */
final class FigureMouth
{
    /** Top of the head (hair or cap included) to the mouth, for a 170 cm person. */
    public const MOUTH_CM = 22.0;

    /** What the full height of a figure's picture stands for, per pose, in cm. */
    public const SHOWN_CM = [
        'standing' => 170.0,
        // Cut at the thigh, like the library's half figures.
        'half' => 100.0,
        'seated' => 130.0,
        // Horse and rider, rider's head to hooves.
        'rider' => 250.0,
        // ponytail: a rider cut at the horse's legs; measured on none yet, set it when one speaks.
        'rider-half' => 180.0,
    ];

    /** Alpha (0 opaque .. 127 transparent) below which a pixel counts as drawn. */
    private const DRAWN = 64;

    /**
     * The figure's mouth (its metadata, else the prediction) and the way it faces: 1 right, -1 left,
     * 0 unknown. Metadata may say 'left'/'right' as a third value; otherwise the mouth is compared
     * with the crown, as a sprite frame's mouth and head points will be: a face looks the way its
     * mouth sits from the top of its head.
     *
     * @return array{mouth: array{0: float, 1: float}, facing: int}
     */
    public static function of(string $ref): array
    {
        $meta = self::sheet($ref)['mouths'][basename($ref)] ?? null;
        $mouth = $meta !== null ? [(float) $meta[0], (float) $meta[1]] : self::predict($ref);
        $facing = match ($meta[2] ?? null) {
            'right' => 1,
            'left' => -1,
            default => self::facing($ref, $mouth[0]),
        };

        return ['mouth' => $mouth, 'facing' => $facing];
    }

    /** Which way the mouth sits from the crown (the middle of the top few cm drawn). */
    private static function facing(string $ref, float $mouthX): int
    {
        $img = @imagecreatefromstring((string) file_get_contents(self::file($ref)));
        if (! $img) {
            return 0;
        }
        $w = imagesx($img);
        [$top, $bottom] = self::drawnRows($img, $w, imagesy($img));
        $crownCm = 6.0;
        $crown = self::bandCentre($img, $w, $top, (int) ($top + $crownCm * ($bottom - $top + 1) / self::SHOWN_CM[self::pose($ref)])) / $w;
        $lean = $mouthX - $crown;

        // Under 2 % of the picture is a face looking at us: no side to prefer.
        return abs($lean) < 0.02 ? 0 : ($lean > 0 ? 1 : -1);
    }

    /** @return array{0: float, 1: float} */
    public static function predict(string $ref): array
    {
        $file = self::file($ref);
        $img = @imagecreatefromstring((string) file_get_contents($file))
            ?: throw new InvalidArgumentException("FigureMouth: cannot read {$file}.");
        $w = imagesx($img);
        $h = imagesy($img);

        [$top, $bottom] = self::drawnRows($img, $w, $h);
        $pxPerCm = ($bottom - $top + 1) / self::SHOWN_CM[self::pose($ref)];
        $mouthY = $top + self::MOUTH_CM * $pxPerCm;
        $x = self::bandCentre($img, $w, $top, (int) $mouthY);

        return [round($x / $w, 4), round($mouthY / $h, 4)];
    }

    /** The pose the art manifests declare for this figure: `poses`, else a cut-off one is half. */
    public static function pose(string $ref): string
    {
        $slug = basename($ref);
        $sheet = self::sheet($ref);
        $pose = $sheet['poses'][$slug] ?? (isset($sheet['cut_off'][$slug]) ? 'half' : 'standing');

        return isset(self::SHOWN_CM[$pose]) ? $pose
            : throw new InvalidArgumentException("FigureMouth: '{$slug}' has unknown pose '{$pose}'.");
    }

    /** The manifest sheet that draws this figure, or [] when none does. @return array<string,mixed> */
    private static function sheet(string $ref): array
    {
        $slug = basename($ref);
        foreach (glob(rtrim((string) config('art.manifests_path'), '/').'/*.php') ?: [] as $manifest) {
            foreach ((array) ((require $manifest)['sheets'] ?? []) as $sheet) {
                if (array_key_exists($slug, (array) ($sheet['items'] ?? []))) {
                    return (array) $sheet;
                }
            }
        }

        return [];
    }

    private static function file(string $ref): string
    {
        $base = resource_path('icons/'.trim($ref, '/ '));
        foreach (['webp', 'png'] as $ext) {
            if (is_file("{$base}.{$ext}")) {
                return "{$base}.{$ext}";
            }
        }
        throw new InvalidArgumentException("FigureMouth: no picture for '{$ref}' in resources/icons.");
    }

    /** First and last row with anything drawn. @return array{0:int,1:int} */
    private static function drawnRows(\GdImage $img, int $w, int $h): array
    {
        $drawn = function (int $y) use ($img, $w): bool {
            for ($x = 0; $x < $w; $x += 2) {
                if ((imagecolorat($img, $x, $y) >> 24 & 0x7F) < self::DRAWN) {
                    return true;
                }
            }

            return false;
        };
        $top = 0;
        while ($top < $h - 1 && ! $drawn($top)) {
            $top++;
        }
        $bottom = $h - 1;
        while ($bottom > $top && ! $drawn($bottom)) {
            $bottom--;
        }

        return [$top, $bottom];
    }

    /** Middle of the drawn pixels between two rows: the head, when the rows are its band. */
    private static function bandCentre(\GdImage $img, int $w, int $from, int $to): float
    {
        $sum = 0.0;
        $n = 0;
        for ($y = $from; $y <= $to; $y += 2) {
            $l = null;
            $r = null;
            for ($x = 0; $x < $w; $x += 2) {
                if ((imagecolorat($img, $x, $y) >> 24 & 0x7F) < self::DRAWN) {
                    $l ??= $x;
                    $r = $x;
                }
            }
            if ($l !== null) {
                $sum += ($l + $r) / 2;
                $n++;
            }
        }

        return $n ? $sum / $n : $w / 2;
    }
}
