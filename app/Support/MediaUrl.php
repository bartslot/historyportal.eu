<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Facades\Storage;

/**
 * A stored picture reference as a URL a browser can load.
 *
 * A scene's image_path, a shot's paths and a layer's path hold EITHER a public-disk path
 * ('lessons/12/scenes/34/bg.webp') OR, for pictures that live on Cloudinary, a full URL. Every
 * place that turns one into an <img src> goes through here, so neither kind is ever mangled into
 * '/storage/https://…'. The JS side does the same in wizard-bridge.js toStorage().
 */
final class MediaUrl
{
    /** A full URL (with or without scheme) or a root-relative one: already loadable as it is. */
    public static function isRemote(?string $pathOrUrl): bool
    {
        return $pathOrUrl !== null && (preg_match('#^(https?:)?//#i', $pathOrUrl) === 1 || str_starts_with($pathOrUrl, '/'));
    }

    /** Null for an empty value; a URL as it is; a disk path as its public-disk URL. */
    public static function of(?string $pathOrUrl): ?string
    {
        if ($pathOrUrl === null || $pathOrUrl === '') {
            return null;
        }

        return self::isRemote($pathOrUrl) ? $pathOrUrl : Storage::disk('public')->url($pathOrUrl);
    }

    /**
     * The same, with a cache-busting ?v= for a file on our disk that may be rewritten in place. A
     * CDN URL is left alone: its public id changes version on upload, and a query string would
     * only split the CDN cache.
     */
    public static function versioned(?string $pathOrUrl, int|string|null $version): ?string
    {
        $url = self::of($pathOrUrl);

        return $url === null || self::isRemote($pathOrUrl) || $version === null || $version === ''
            ? $url
            : $url.'?v='.$version;
    }
}
