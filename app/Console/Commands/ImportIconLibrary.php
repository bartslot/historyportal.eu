<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\SvgAsset;
use App\Services\Lessons\LibraryCdn;
use App\Services\Svg\SvgSanitizer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use SplFileInfo;
use Symfony\Component\Finder\Finder;

/**
 * Publishes the icon set that ships in resources/icons into the shared library the Icons
 * panel reads — sanitising every file on the way through, exactly as a teacher's own import
 * is sanitised.
 *
 * The directory tree IS the taxonomy, so adding icons is a matter of dropping files in:
 *
 *   resources/icons/<collection>/<category>/<subcategory>/*.svg   →  line-art
 *   resources/icons/<collection>/*.svg                            →  arrows, shapes
 *   resources/icons/<collection>/<category>/<subcategory>/*.webp|png  →  art:make packs (stored as-is)
 *   resources/icons/<collection>/cdn.json  →  pictures already on Cloudinary (LibraryCdn). Their
 *       files are not in git, so a picture listed here is imported from its URL alone.
 *
 * Re-running is safe: each file is keyed on its path, so an edited icon is replaced in
 * place and the scenes already using it keep pointing at the same asset id.
 *
 * The licence defaults describe the set we bought: royalty-free for commercial use, no credit
 * line owed. Pass --license / --attribution for a set that comes with different terms, so what
 * is recorded against an icon is what its licence actually says rather than the last set's.
 */
class ImportIconLibrary extends Command
{
    protected $signature = 'icons:import
        {--path= : the icon set to publish (default: resources/icons)}
        {--collection=* : only these collections (default: every folder under the path)}
        {--license=Royalty-free (commercial) : licence recorded on every icon imported this run}
        {--attribution= : credit line, when the licence asks for one}
        {--prune : delete library icons whose source file has gone}';

    protected $description = 'Publish resources/icons into the shared icon library used by the Icons panel';

    /** Where the sanitised copies live on the public disk. */
    private const DISK_ROOT = 'svg-assets/library';

    public function handle(SvgSanitizer $sanitizer): int
    {
        $root = (string) ($this->option('path') ?: resource_path('icons'));
        if (! is_dir($root)) {
            $this->error("No icon set at {$root}.");

            return self::FAILURE;
        }

        $only = array_filter((array) $this->option('collection'));
        $collections = collect(scandir($root) ?: [])
            ->reject(fn (string $name) => str_starts_with($name, '.'))
            ->filter(fn (string $name) => is_dir($root.'/'.$name))
            ->when($only !== [], fn ($c) => $c->filter(fn (string $name) => in_array($name, $only, true)))
            ->values();

        if ($collections->isEmpty()) {
            $this->error('No collections to import.');

            return self::FAILURE;
        }

        $seen = [];
        $imported = 0;
        $failed = 0;

        foreach ($collections as $collection) {
            $cdn = LibraryCdn::manifest($collection, $root);
            foreach ($this->libraryFiles($root.'/'.$collection) as $file) {
                $rest = str_replace('\\', '/', $file->getRelativePathname());
                $ref = $collection.'/'.$rest;
                $seen[] = $ref;

                try {
                    $this->importOne($sanitizer, $collection, $file, $ref, $cdn[$rest]['url'] ?? null);
                    $imported++;
                } catch (RuntimeException $e) {
                    // One malformed file must not abort a 128-file publish — name it and carry on.
                    $failed++;
                    $this->warn("  skipped {$ref}: {$e->getMessage()}");
                }
                unset($cdn[$rest]);
            }
            // What is left in the manifest has no file here: it lives on Cloudinary only.
            foreach ($cdn as $rest => $entry) {
                $ref = $collection.'/'.$rest;
                $seen[] = $ref;
                $this->importFromCdn($collection, $ref, (array) $entry);
                $imported++;
            }
            $this->line("  {$collection}");
        }

        $this->info("Imported {$imported} icon(s)".($failed > 0 ? ", {$failed} skipped" : '').'.');

        if ($this->option('prune')) {
            $this->pruneMissing($seen, $collections->all());
        }

        return self::SUCCESS;
    }

    /** @return iterable<SplFileInfo> */
    private function libraryFiles(string $dir): iterable
    {
        return Finder::create()->files()->in($dir)->name(['*.svg', '*.webp', '*.png'])->sortByName();
    }

    private function isRaster(SplFileInfo $file): bool
    {
        return in_array(strtolower($file->getExtension()), ['webp', 'png'], true);
    }

    /**
     * Raster art (art:make packs) is our own output, not third-party markup: stored as-is.
     *
     * @return array{bytes: string, width: int, height: int, view_box: null}
     */
    private function raster(string $raw): array
    {
        $size = @getimagesizefromstring($raw);
        if ($size === false) {
            throw new RuntimeException('not a readable image');
        }

        return ['bytes' => $raw, 'width' => (int) $size[0], 'height' => (int) $size[1], 'view_box' => null];
    }

    private function importOne(SvgSanitizer $sanitizer, string $collection, SplFileInfo $file, string $ref, ?string $cdnUrl = null): void
    {
        $raw = file_get_contents($file->getPathname());
        if ($raw === false) {
            throw new RuntimeException('unreadable');
        }

        $clean = $this->isRaster($file) ? $this->raster($raw) : $sanitizer->sanitize($raw);

        // Mirror the source tree on the disk so a stored file is traceable back to its icon.
        $path = self::DISK_ROOT.'/'.$this->diskPath($ref);
        Storage::disk('public')->put($path, $clean['bytes'] ?? $clean['svg']);

        [$category, $subcategory] = $this->taxonomy($file->getRelativePath());

        $this->bundledRow($ref)->fill([
            'collection' => $collection,
            'category' => $category,
            'subcategory' => $subcategory,
            'source_url' => '',
            'title' => $this->isRaster($file)
                ? $this->rasterTitle($file->getFilenameWithoutExtension())
                : $this->title($file->getFilenameWithoutExtension()),
            'license' => (string) $this->option('license'),
            'attribution' => (string) $this->option('attribution') ?: null,
            'svg_path' => $path,
            // A picture re-exported with the same name keeps its CDN copy only while the manifest
            // still lists it; drop the line from cdn.json to have the next lesson re-upload it.
            'cdn_url' => $cdnUrl,
            'width' => $clean['width'],
            'height' => $clean['height'],
            'view_box' => $clean['view_box'],
        ])->save();
    }

    /**
     * A picture that lives on Cloudinary only (listed in cdn.json, file not on this machine). The
     * row points at the CDN; svg_path is where the file WOULD be, so the ref and its paths match
     * what a machine that has the file writes.
     *
     * @param  array<string,mixed>  $entry
     */
    private function importFromCdn(string $collection, string $ref, array $entry): void
    {
        $rest = substr($ref, strlen($collection) + 1);
        [$category, $subcategory] = $this->taxonomy(dirname($rest) === '.' ? '' : dirname($rest));

        $this->bundledRow($ref)->fill([
            'collection' => $collection,
            'category' => $category,
            'subcategory' => $subcategory,
            'source_url' => '',
            'title' => $this->rasterTitle(pathinfo($rest, PATHINFO_FILENAME)),
            'license' => (string) $this->option('license'),
            'attribution' => (string) $this->option('attribution') ?: null,
            'svg_path' => self::DISK_ROOT.'/'.$this->diskPath($ref),
            'cdn_url' => (string) ($entry['url'] ?? ''),
            'width' => isset($entry['width']) ? (int) $entry['width'] : null,
            'height' => isset($entry['height']) ? (int) $entry['height'] : null,
            'view_box' => null,
        ])->save();
    }

    /**
     * The bundled row for a ref, or a new one. NOT updateOrCreate: its attribute match compiles
     * `user_id = null`, which no row ever satisfies in SQL, so every run would insert a duplicate.
     */
    private function bundledRow(string $ref): SvgAsset
    {
        return SvgAsset::query()->whereNull('user_id')->where('source', 'bundled')->where('source_ref', $ref)->first()
            ?? new SvgAsset(['user_id' => null, 'source' => 'bundled', 'source_ref' => $ref]);
    }

    private function rasterTitle(string $filename): string
    {
        return Str::ucfirst(str_replace(['-', '_'], ' ', $filename));
    }

    /**
     * The folders between the collection and the file are the two pill rows.
     * A flat collection (arrows, shapes) simply has neither.
     *
     * @return array{0: ?string, 1: ?string}
     */
    private function taxonomy(string $relativeDir): array
    {
        $parts = array_values(array_filter(explode('/', str_replace('\\', '/', $relativeDir))));

        return [$parts[0] ?? null, $parts[1] ?? null];
    }

    /** Slugified mirror of the source path, so folder names with spaces and & stay filesystem-safe. */
    private function diskPath(string $ref): string
    {
        $parts = explode('/', $ref);
        $filename = array_pop($parts);

        return implode('/', array_map(fn (string $p) => Str::slug($p), $parts))
            .'/'.Str::slug(pathinfo($filename, PATHINFO_FILENAME)).'.'.strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    }

    /**
     * A readable name out of a stock-icon filename:
     *   np_stone-age-ax_700621_000000  →  Stone age ax
     *   noun-pharaoh-8159984           →  Pharaoh
     */
    private function title(string $filename): string
    {
        $name = preg_replace('/^(np|noun)[_-]/i', '', $filename) ?? $filename;
        $name = preg_replace('/[_-]\d+(?=([_-]\d+)*$)/', '', $name) ?? $name;   // trailing id segments
        $name = trim(str_replace(['_', '-'], ' ', $name));

        return $name === '' ? 'Icon' : Str::ucfirst($name);
    }

    /**
     * Drop library rows whose source file no longer exists. Only ever touches bundled rows in
     * the collections this run covered, so a partial import can't wipe the rest of the library.
     *
     * @param  list<string>  $seen
     * @param  list<string>  $collections
     */
    private function pruneMissing(array $seen, array $collections): void
    {
        $stale = SvgAsset::query()
            ->bundled()
            ->whereIn('collection', $collections)
            ->whereNotIn('source_ref', $seen)
            ->get();

        foreach ($stale as $asset) {
            Storage::disk('public')->delete($asset->svg_path);   // a CDN-only row has none: a no-op
            $asset->delete();
        }

        if ($stale->isNotEmpty()) {
            $this->info("Pruned {$stale->count()} icon(s) whose source file has gone.");
        }
    }
}
