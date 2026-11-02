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
        static $cache = [];
        if (! preg_match('/^[a-z0-9][a-z0-9-]*$/', $bundle)) {
            return null;
        }
        $cache[$bundle] ??= collect(json_decode((string) Storage::disk('public')->get(self::DIR."/{$bundle}/library.json"), true)['assets'] ?? [])
            ->mapWithKeys(fn ($a) => [(string) ($a['id'] ?? '') => (string) ($a['layer'] ?? 'mid')])->all();

        return $cache[$bundle][$assetId] ?? null;
    }

    public static function url(string $bundle): string
    {
        self::assertName($bundle);

        return '/storage/'.self::DIR."/{$bundle}/library.json";
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
}
