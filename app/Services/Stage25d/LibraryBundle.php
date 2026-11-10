<?php

declare(strict_types=1);

namespace App\Services\Stage25d;

use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;

/**
 * The painted-asset bundles the 2.5D stage draws from (library.json + its image files).
 *
 * They live on the public disk under library/<bundle>/ (storage/app/public, which the deploy rsync
 * never touches), and the stage fetches them from /storage/library/<bundle>/library.json.
 */
final class LibraryBundle
{
    public const DIR = 'library';

    /** Bundle names are folder names: lowercase words, digits, dashes. */
    public static function assertName(string $bundle): void
    {
        if (! preg_match('/^[a-z0-9][a-z0-9-]*$/', $bundle)) {
            throw new InvalidArgumentException("Bundle name '{$bundle}' must be lowercase letters, digits and dashes.");
        }
    }

    /** Is `$assetId` in the bundle's library.json on the public disk, and which layer kind is it ('mid', 'figure', ...)? */
    public static function assetLayer(string $bundle, string $assetId): ?string
    {
        if (! preg_match('/^[a-z0-9][a-z0-9-]*$/', $bundle)) {
            return null;
        }

        return self::layers($bundle)[$assetId] ?? null;
    }

    /** The asset's picture on the public disk, or null when the bundle has no such asset. */
    public static function assetPath(string $bundle, string $assetId): ?string
    {
        if (! preg_match('/^[a-z0-9][a-z0-9-]*$/', $bundle)) {
            return null;
        }
        $asset = collect(json_decode((string) Storage::disk('public')->get(self::DIR."/{$bundle}/library.json"), true)['assets'] ?? [])
            ->firstWhere('id', $assetId);

        return isset($asset['file']) ? self::DIR."/{$bundle}/{$asset['file']}" : null;
    }

    /** @return array<string,string> asset id => layer kind, read once per request per bundle */
    private static function layers(string $bundle): array
    {
        return once(fn () => collect(json_decode((string) Storage::disk('public')->get(self::DIR."/{$bundle}/library.json"), true)['assets'] ?? [])
            ->mapWithKeys(fn ($a) => [(string) ($a['id'] ?? '') => (string) ($a['layer'] ?? 'mid')])->all());
    }

    /** Tags that make a standing picture a strip of ground (engine-mvp stage25d/layout.ts GROUND_STRIP_TAGS). */
    private const GROUND_STRIP_TAGS = ['ground', 'path', 'field', 'ramp', 'water'];

    /** The least width-to-height of a band picture (layout.ts BAND_MIN_ASPECT): a band is three views wide. */
    private const BAND_MIN_ASPECT = 2.0;

    /**
     * Can the picture be a ground band (set.groundBands)? A wide strip of land painted to stand on the floor (layout.ts
     * isBandPicture). A far backdrop plate is not: painted to be seen 70 m off, as a band it is a close-up of its land;
     * nor a single plant: three views wide, it would stand as tall as the view.
     *
     * @param  array<string,mixed>  $asset
     */
    public static function isGroundBand(array $asset): bool
    {
        return ! in_array($asset['layer'] ?? null, ['bg', 'sky', 'figure', 'ground'], true)
            && empty($asset['tileable_x'])
            && (float) ($asset['height_m'] ?? 0) >= 2
            && array_intersect((array) ($asset['tags'] ?? []), self::GROUND_STRIP_TAGS) !== []
            && (float) ($asset['w'] ?? 0) / max(1.0, (float) ($asset['h'] ?? 0)) >= self::BAND_MIN_ASPECT;
    }

    /**
     * The scene's backdrop: a far strip that does not tile (farmland, a storm sea, a coast). One per scene, grouped with
     * the ground and the sky under "Scene" (Bart, 2026-11-10): swapped, never copied or deleted. Same rule as the
     * stage's `strip` (resources/js/scene/stage25d/engine.js).
     *
     * @param  array<string,mixed>  $asset
     */
    public static function isBackdrop(array $asset): bool
    {
        return ($asset['layer'] ?? null) === 'bg' && empty($asset['tileable_x']);
    }

    /**
     * The series a picture belongs to: the character a figure shows (its `char:` tag, else fig-<character>-<pose>-01),
     * the same rule as stage25d/series.js seriesOf. null for a picture that stands alone.
     *
     * @param  array<string,mixed>  $asset
     */
    public static function seriesOf(array $asset): ?string
    {
        $id = (string) ($asset['id'] ?? '');
        if (($asset['layer'] ?? null) !== 'figure' && ! str_starts_with($id, 'fig-')) {
            return null;
        }
        foreach ((array) ($asset['tags'] ?? []) as $tag) {
            if (is_string($tag) && str_starts_with($tag, 'char:') && strlen($tag) > 5) {
                return substr($tag, 5);
            }
        }

        return preg_match('/^fig-(.+)-[a-z]+-\d+(-l)?$/', $id, $m) ? $m[1] : null;
    }

    /** @param  array<string,mixed>  $asset  which way a picture looks: 'left' or 'right' (its `facing:` tag, else its id) */
    public static function facingOf(array $asset): string
    {
        return in_array('facing:left', (array) ($asset['tags'] ?? []), true) || str_ends_with((string) ($asset['id'] ?? ''), '-l') ? 'left' : 'right';
    }

    /** @return array<string,mixed>|null one asset of a bundle on the public disk */
    public static function asset(string $bundle, string $assetId): ?array
    {
        return collect(self::assets($bundle))->firstWhere('id', $assetId);
    }

    /** @return list<string> the bundles on the public disk */
    public static function names(): array
    {
        return array_values(array_filter(
            array_map('basename', Storage::disk('public')->directories(self::DIR)),
            fn (string $b) => (bool) preg_match('/^[a-z0-9][a-z0-9-]*$/', $b),
        ));
    }

    /**
     * A stamp that changes whenever any bundle's library.json does: the pages put it on the list's URL, because the
     * host's proxy cache kept serving an old list for hours after a library:sync, whatever the browser asked for.
     */
    public static function version(): string
    {
        $disk = Storage::disk('public');

        return substr(md5(implode(',', array_map(
            fn (string $b) => $disk->exists(self::DIR."/{$b}/library.json") ? $disk->lastModified(self::DIR."/{$b}/library.json") : 0,
            self::names(),
        ))), 0, 10);
    }

    public static function url(string $bundle): string
    {
        self::assertName($bundle);

        return '/storage/'.self::DIR."/{$bundle}/library.json";
    }

    /**
     * The assets of a bundle already on the public disk, each with its image `url`; [] when the
     * bundle is missing or unreadable. Read once per request.
     *
     * @return list<array<string,mixed>>
     */
    public static function assets(string $bundle): array
    {
        if (! preg_match('/^[a-z0-9][a-z0-9-]*$/', $bundle)) {
            return [];
        }

        // once(), not a static: a static outlives the request (queue:work, the test suite).
        return once(function () use ($bundle) {
            $disk = Storage::disk('public');
            $json = json_decode((string) ($disk->exists(self::DIR."/{$bundle}/library.json") ? $disk->get(self::DIR."/{$bundle}/library.json") : ''), true);

            return collect(is_array($json) ? ($json['assets'] ?? []) : [])
                ->filter(fn ($a) => is_array($a) && is_string($a['id'] ?? null) && is_string($a['file'] ?? null))
                ->map(fn (array $a) => $a + ['url' => '/storage/'.self::DIR."/{$bundle}/".$a['file']])
                ->values()
                ->all();
        });
    }

    /**
     * Read and check a bundle folder: library.json with an assets list whose files all exist.
     *
     * @return array<string,mixed> the decoded library.json
     */
    public function validate(string $dir): array
    {
        $file = rtrim($dir, '/').'/library.json';
        if (! is_file($file)) {
            throw new InvalidArgumentException("No library.json in {$dir}.");
        }
        $lib = json_decode((string) file_get_contents($file), true);
        if (! is_array($lib) || ! is_array($lib['assets'] ?? null)) {
            throw new InvalidArgumentException("{$file} has no assets list.");
        }
        $missing = [];
        foreach ($lib['assets'] as $a) {
            $f = (string) ($a['file'] ?? '');
            if ($f === '' || str_contains($f, '..') || ! is_file(rtrim($dir, '/').'/'.$f)) {
                $missing[] = $f !== '' ? $f : (string) ($a['id'] ?? '?');
            }
        }
        if ($missing !== []) {
            throw new InvalidArgumentException('Bundle files missing: '.implode(', ', array_slice($missing, 0, 8)).(count($missing) > 8 ? ' ...' : ''));
        }

        return $lib;
    }

    /**
     * Copy a bundle folder onto the public disk; files whose size and hash already match are skipped.
     * Only library.json and the files it names are copied (not the _held / _staging folders next to them).
     *
     * @return array{bundle:string,copied:int,skipped:int}
     */
    public function sync(string $dir, ?string $bundle = null): array
    {
        $lib = $this->validate($dir);
        $bundle ??= (string) ($lib['bundle'] ?? basename(rtrim($dir, '/')));
        self::assertName($bundle);
        $disk = Storage::disk('public');
        $files = array_values(array_unique(['library.json', ...array_map(fn ($a) => (string) $a['file'], $lib['assets'])]));
        $copied = $skipped = 0;
        foreach ($files as $f) {
            $src = rtrim($dir, '/').'/'.$f;
            $dst = self::DIR."/{$bundle}/{$f}";
            if ($disk->exists($dst) && $disk->size($dst) === filesize($src) && md5((string) $disk->get($dst)) === md5_file($src)) {
                $skipped++;

                continue;
            }
            $disk->put($dst, (string) file_get_contents($src));
            $copied++;
        }

        return ['bundle' => $bundle, 'copied' => $copied, 'skipped' => $skipped];
    }

    /** The longest side of a shelf thumbnail: a 64 px tile on a 2x screen, with room to spare. */
    public const THUMB_PX = 256;

    /**
     * Small copies of a bundle's still pictures in library/<bundle>/thumbs/, for the Assets shelf: its tiles showed the
     * full paintings (up to 500 KB each, ~6 MB per shelf). An animation keeps its sheet (its tile plays it). A thumb
     * newer than its picture is kept; a picture GD cannot read is reported in `failed`, and its tile shows the full one.
     *
     * @return array{made:int,kept:int,failed:list<string>}
     */
    public function thumbs(string $bundle): array
    {
        self::assertName($bundle);
        $disk = Storage::disk('public');
        $lib = json_decode((string) $disk->get(self::DIR."/{$bundle}/library.json"), true);
        $made = $kept = 0;
        $failed = [];
        foreach ((array) ($lib['assets'] ?? []) as $a) {
            $f = (string) ($a['file'] ?? '');
            if ($f === '' || str_contains($f, '..') || ($a['kind'] ?? null) === 'animation') {
                continue;
            }
            $src = self::DIR."/{$bundle}/{$f}";
            $dst = self::DIR."/{$bundle}/thumbs/{$f}";
            if ($disk->exists($dst) && $disk->lastModified($dst) >= $disk->lastModified($src)) {
                $kept++;

                continue;
            }
            $webp = self::shrink((string) $disk->get($src));
            if ($webp === null) {
                $failed[] = $f;

                continue;
            }
            $disk->put($dst, $webp);
            $made++;
        }

        return ['made' => $made, 'kept' => $kept, 'failed' => $failed];
    }

    /** The picture scaled to fit THUMB_PX (never up), as webp with its transparency; null when GD cannot read it. */
    private static function shrink(string $bytes): ?string
    {
        $img = @imagecreatefromstring($bytes);
        if ($img === false) {
            return null;
        }
        $w = imagesx($img);
        $h = imagesy($img);
        $k = min(1.0, self::THUMB_PX / max($w, $h));
        $out = imagecreatetruecolor(max(1, (int) round($w * $k)), max(1, (int) round($h * $k)));
        imagealphablending($out, false);
        imagesavealpha($out, true);
        imagefill($out, 0, 0, imagecolorallocatealpha($out, 0, 0, 0, 127));
        imagecopyresampled($out, $img, 0, 0, 0, 0, imagesx($out), imagesy($out), $w, $h);
        ob_start();
        imagewebp($out, null, 80);

        return (string) ob_get_clean();
    }
}
