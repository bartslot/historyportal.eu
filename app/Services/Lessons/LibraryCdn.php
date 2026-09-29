<?php

declare(strict_types=1);

namespace App\Services\Lessons;

use App\Models\SvgAsset;
use App\Services\CloudinaryService;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

/**
 * Puts a library picture on Cloudinary the first time a lesson uses it, so only pictures a lesson
 * actually shows ever get uploaded, and records the URL in the collection's cdn.json.
 *
 * That manifest is what lets the pictures themselves stay out of git: `icons:import` on another
 * machine (or prod) reads it and gets the CDN URL without ever having the file.
 */
class LibraryCdn
{
    private readonly string $iconRoot;

    /** $iconRoot: where the collections live (resources/icons); a test points it at a temp dir. */
    public function __construct(private readonly CloudinaryService $cloud, ?string $iconRoot = null)
    {
        $this->iconRoot = $iconRoot ?? resource_path('icons');
    }

    /**
     * The asset's CDN URL, uploading it now if it has none. Null when Cloudinary is not configured
     * or the upload failed: the lesson then keeps using the copy on our own disk.
     */
    public function ensure(SvgAsset $asset): ?string
    {
        if ($asset->cdn_url) {
            return $asset->cdn_url;
        }
        if (! $asset->isRaster() || ! $this->cloud->configured() || ! Storage::disk('public')->exists($asset->svg_path)) {
            return null;
        }

        $url = $this->cloud->uploadLessonPicture(
            (string) Storage::disk('public')->get($asset->svg_path),
            self::publicId($asset->source_ref),
        );
        if ($url === null) {
            return null;
        }

        $asset->update(['cdn_url' => $url]);
        $this->record($asset);

        return $url;
    }

    /** 'history-line/figures/dante/virgilio.webp' → 'library/history-line/figures/dante/virgilio'. */
    public static function publicId(string $sourceRef): string
    {
        return 'library/'.preg_replace('/\.[^.\/]+$/', '', trim($sourceRef, '/'));
    }

    /** resources/icons/<collection>/cdn.json */
    public static function manifestPath(string $collection, ?string $root = null): string
    {
        return ($root ?? resource_path('icons')).'/'.$collection.'/cdn.json';
    }

    /**
     * The manifest as ref-within-collection → {url, width, height}.
     *
     * @return array<string, array{url:string,width:?int,height:?int}>
     */
    public static function manifest(string $collection, ?string $root = null): array
    {
        $path = self::manifestPath($collection, $root);
        if (! is_file($path)) {
            return [];
        }
        $data = json_decode((string) file_get_contents($path), true);

        return is_array($data) ? $data : [];
    }

    private function record(SvgAsset $asset): void
    {
        [$collection, $rest] = array_pad(explode('/', $asset->source_ref, 2), 2, '');
        if ($collection === '' || $rest === '') {
            return;
        }

        $entries = self::manifest($collection, $this->iconRoot);
        $entries[$rest] = ['url' => (string) $asset->cdn_url, 'width' => $asset->width, 'height' => $asset->height];
        ksort($entries);

        $path = self::manifestPath($collection, $this->iconRoot);
        File::ensureDirectoryExists(dirname($path));
        File::put($path, json_encode($entries, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n");
    }
}
