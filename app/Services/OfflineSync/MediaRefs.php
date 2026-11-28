<?php

declare(strict_types=1);

namespace App\Services\OfflineSync;

/**
 * The files a lesson points at on the public disk, found and renamed wherever they are named:
 *  - a column or JSON key ending in `_path` holding a disk path ("lessons/12/scenes/40/bg.webp");
 *  - any string holding a /storage/ URL, relative or on a named host, inside a column or deep in JSON
 *    (layers, shots, gallery images, music).
 *
 * A pull copies every one to the laptop under OFFLINE_PREFIX and points the copy there, so nothing of a
 * lesson already on the laptop is ever overwritten; a push takes the prefix off again and uploads only
 * files made on the laptop. Other hosts (a CDN) are left as they are and need a connection.
 */
final class MediaRefs
{
    /** Where pulled files live on the laptop's public disk. */
    public const OFFLINE_PREFIX = 'offline-copy/';

    /**
     * A whole absolute URL (judged by its host and path in the callback), or a relative /storage/ URL that
     * is not the tail of some other URL.
     */
    private const URL = '#https?://[^\s"\'<>)]+|(?<![\w\-.%/:])/storage/[^\s"\'<>?\#)]+#';

    /**
     * Every disk path in a row's columns.
     *
     * @param  array<string, mixed>  $columns
     * @param  list<string>  $hosts  hosts whose /storage/ URLs are ours (relative URLs always are)
     * @return list<string>
     */
    public static function collect(array $columns, array $hosts): array
    {
        $found = [];
        self::rewrite($columns, function (string $path) use (&$found): string {
            $found[$path] = true;

            return $path;
        }, $hosts);

        return array_keys($found);
    }

    /**
     * Every disk path in a row's columns passed through $map(path): new path. URLs come back relative
     * (/storage/...), so a copy never points at the machine it came from.
     *
     * @param  array<string, mixed>  $columns
     * @param  callable(string): string  $map
     * @param  list<string>  $hosts
     * @return array<string, mixed>
     */
    public static function rewrite(array $columns, callable $map, array $hosts): array
    {
        return self::walk($columns, $map, $hosts, null);
    }

    /** $key: the array key $value sits under, at any depth; a `*_path` key holds a bare disk path. */
    private static function walk(mixed $value, callable $map, array $hosts, int|string|null $key): mixed
    {
        if (is_array($value)) {
            foreach ($value as $k => $v) {
                $value[$k] = self::walk($v, $map, $hosts, $k);
            }

            return $value;
        }
        if (! is_string($value)) {
            return $value;
        }
        if (is_string($key) && str_ends_with($key, '_path') && self::isDiskPath($value)) {
            return $map(ltrim($value, '/'));
        }
        if (! str_contains($value, '/storage/')) {
            return $value;
        }

        return (string) preg_replace_callback(self::URL, function (array $m) use ($map, $hosts): string {
            $url = $m[0];
            if (str_starts_with($url, '/storage/')) {
                return '/storage/'.$map(rawurldecode(substr($url, 9)));
            }
            $host = (string) parse_url($url, PHP_URL_HOST);
            $path = (string) parse_url($url, PHP_URL_PATH);
            if (! in_array($host, $hosts, true) || ! str_starts_with($path, '/storage/')) {
                return $url;   // another host, or not a file of ours
            }
            $rest = substr($url, strpos($url, $path) + strlen($path));   // query and fragment stay

            return '/storage/'.$map(rawurldecode(substr($path, 9))).$rest;
        }, $value);
    }

    /** "lessons/12/a.webp": a relative file name with an extension, not a URL, and no way out of the disk. */
    public static function isDiskPath(string $value): bool
    {
        return preg_match('#^[A-Za-z0-9_][A-Za-z0-9_\-./ %]*\.[A-Za-z0-9]{2,5}$#', $value) === 1
            && ! str_contains($value, '..')
            && ! str_starts_with($value, 'storage/');
    }

    /** A path is safe to read or write on the public disk. */
    public static function isSafe(string $path): bool
    {
        return self::isDiskPath($path) && ! str_starts_with($path, '/') && ! str_contains($path, "\0");
    }

    public static function toOffline(string $path): string
    {
        return str_starts_with($path, self::OFFLINE_PREFIX) ? $path : self::OFFLINE_PREFIX.$path;
    }

    /** The live path of a pulled file, or null for a file made on the laptop. */
    public static function fromOffline(string $path): ?string
    {
        return str_starts_with($path, self::OFFLINE_PREFIX) ? substr($path, strlen(self::OFFLINE_PREFIX)) : null;
    }
}
