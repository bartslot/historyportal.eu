<?php

declare(strict_types=1);

namespace App\Services\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Re-encode arbitrary image bytes to WebP at a given quality. Used to keep stored
 * scene assets small — a lossless PNG storyboard shot is ~1 MB, the same cell as
 * WebP at quality 60 is ~110 KB with no visible loss at player resolution.
 *
 * Quality is WebP-style: 100 ≈ lossless/largest, 60 ≈ high-res-but-small, lower ≈ smaller.
 * Falls back to the original bytes when GD or WebP support is unavailable, or when the
 * bytes can't be decoded — callers never have to guard for it.
 *
 * Bart (2026-09-28): "everything needs to be WebP, no more several MB big png's". Every picture we
 * store goes through here (storeUpload / put); backdrops take BackgroundImageOptimizer (AVIF/WebP).
 */
final class WebpEncoder
{
    /** Longest side we keep. 2880, not the 1920 stage: the camera zooms in and pans (Bart). */
    public const MAX_SIDE = 2880;

    /** Bart: "80% quality". */
    public const UPLOAD_QUALITY = 80;

    public static function encode(string $bytes, int $quality, ?int $maxSide = null): string
    {
        if ($bytes === '' || ! function_exists('imagewebp') || ! function_exists('imagecreatefromstring')) {
            return $bytes;
        }

        $img = @imagecreatefromstring($bytes);
        if ($img === false) {
            return $bytes;
        }

        // Preserve transparency (hero poses / cut-outs) — WebP supports alpha, but GD only
        // writes it when save-alpha is on and blending is off.
        imagepalettetotruecolor($img);
        imagealphablending($img, false);
        imagesavealpha($img, true);

        if ($maxSide !== null) {
            $img = self::fit($img, $maxSide);
        }

        $quality = max(0, min(100, $quality));

        ob_start();
        imagewebp($img, null, $quality);
        $out = (string) ob_get_clean();

        // Free the GD handle — encode() runs on every generated/upscaled image inside a
        // long-lived queue worker, so a leaked handle here accumulates until OOM.
        imagedestroy($img);

        return $out !== '' ? $out : $bytes;
    }

    /**
     * Store picture bytes as WebP at "$pathWithoutExtension.webp". When the bytes cannot be
     * re-encoded they are stored as they came, under $fallbackExtension. Returns the stored path.
     */
    public static function put(string $bytes, string $pathWithoutExtension, string $fallbackExtension, string $disk = 'public', int $quality = self::UPLOAD_QUALITY): string
    {
        $webp = self::encode($bytes, $quality, self::MAX_SIDE);
        $path = $pathWithoutExtension.'.'.($webp !== $bytes ? 'webp' : $fallbackExtension);
        Storage::disk($disk)->put($path, $webp);

        return $path;
    }

    /**
     * An uploaded picture, stored as WebP. A GIF is stored as it is: GD would keep only its first
     * frame, and an animated GIF is exactly what the teacher meant to upload.
     */
    public static function storeUpload(UploadedFile $file, string $dir, ?string $name = null, string $disk = 'public'): string
    {
        if ($file->getMimeType() === 'image/gif') {
            return $name ? $file->storeAs($dir, $name.'.gif', $disk) : $file->store($dir, $disk);
        }

        $extension = strtolower($file->guessExtension() ?: $file->getClientOriginalExtension() ?: 'png');

        return self::put($file->get(), rtrim($dir, '/').'/'.($name ?? Str::random(40)), $extension, $disk);
    }

    /** Scale down (never up) so the longest side is at most $maxSide, keeping the alpha channel. */
    private static function fit(\GdImage $img, int $maxSide): \GdImage
    {
        $w = imagesx($img);
        $h = imagesy($img);
        $ratio = $maxSide / max($w, $h);
        if ($ratio >= 1) {
            return $img;
        }

        $nw = max(1, (int) round($w * $ratio));
        $nh = max(1, (int) round($h * $ratio));
        $out = imagecreatetruecolor($nw, $nh);
        imagealphablending($out, false);
        imagesavealpha($out, true);
        imagefill($out, 0, 0, imagecolorallocatealpha($out, 0, 0, 0, 127));
        imagecopyresampled($out, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
        imagedestroy($img);

        return $out;
    }
}
