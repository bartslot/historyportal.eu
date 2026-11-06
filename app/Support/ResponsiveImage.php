<?php

declare(strict_types=1);

namespace App\Support;

/**
 * The srcset for a picture in our webroot that has smaller copies beside it: picture.webp with
 * picture-480.webp, named for their width. Without copies, or for a picture that is not on our
 * disk (a CDN URL), there is no srcset and the plain src carries on as it did.
 */
final class ResponsiveImage
{
    /** The widths worth keeping a copy of: a phone's card, a phone's full width, a laptop's. */
    private const WIDTHS = [480, 828, 1600];

    private const COPY_QUALITY = 70;

    public static function srcset(string $url): ?string
    {
        $path = parse_url($url, PHP_URL_PATH);

        if (! is_string($path) || str_contains($path, '..')) {
            return null;
        }

        $original = public_path(ltrim($path, '/'));

        if (! is_file($original)) {
            return null;
        }

        $extension = pathinfo($path, PATHINFO_EXTENSION);
        $stem = substr($url, 0, -strlen('.'.$extension));
        $diskStem = substr($original, 0, -strlen('.'.$extension));

        $copies = array_values(array_filter(self::WIDTHS, fn (int $width) => is_file("{$diskStem}-{$width}.webp")));

        if ($copies === []) {
            return null;
        }

        $entries = array_map(fn (int $width) => "{$stem}-{$width}.webp {$width}w", $copies);
        $entries[] = $url.' '.getimagesize($original)[0].'w';

        return implode(', ', $entries);
    }

    /**
     * Write the smaller copies of a picture on disk, replacing older ones.
     *
     * @param  list<int>  $widths
     */
    public static function writeCopies(string $original, array $widths): void
    {
        $picture = imagecreatefromstring((string) file_get_contents($original));
        $stem = substr($original, 0, -strlen('.'.pathinfo($original, PATHINFO_EXTENSION)));

        foreach ($widths as $width) {
            imagewebp(imagescale($picture, $width), "{$stem}-{$width}.webp", self::COPY_QUALITY);
        }
    }
}
