<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Exception\ProcessTimedOutException;
use Symfony\Component\Process\Process;

/**
 * Turn an uploaded video into something a classroom can stream.
 *
 * Video arrives at whatever the camera or phone produced. Ron Slot's twenty-five second
 * introduction was 8.6 MB of 1080p — a broadcast master, for a clip that plays in a modal. Thirty
 * children on one school wifi pulling that is the difference between a lesson starting and a lesson
 * buffering, and it is the same problem BackgroundImageOptimizer already solves for stills.
 *
 * So: 720p, H.264 High, AAC, and the moov atom moved to the front so playback can start before the
 * file has finished arriving. Measured on that introduction: 8.6 MB → 2.7 MB, no visible loss at
 * the size it is actually displayed.
 *
 * THE ORIGINAL IS NEVER LOST WITHOUT A REPLACEMENT. Every failure path — ffmpeg missing, ffmpeg
 * erroring, a timeout, an output somehow larger than the input — leaves the stored file exactly as
 * it was and returns a result saying why. A transcoder that eats the only copy of someone's video
 * because a codec was unavailable is worse than no transcoder.
 *
 * Idempotent: a file already inside the ceiling is left alone, so re-running over a library does
 * not re-encode it and lose a generation each time.
 */
class VideoTranscoder
{
    /** The tallest we ship. 720p is the point where a talking head stops looking better. */
    private const MAX_HEIGHT = 720;

    /**
     * Constant Rate Factor. 23 is ffmpeg's default and visually transparent for this material;
     * higher numbers are smaller and softer. 25 was measured as the point where Ron's beard starts
     * to smear on a projector.
     */
    private const CRF = 23;

    /** Long enough for a ten-minute clip on shared hosting, short enough to not hang a request. */
    private const TIMEOUT_SECONDS = 600;

    public function __construct(
        private readonly string $ffmpegPath = 'ffmpeg',
        private readonly string $ffprobePath = 'ffprobe',
    ) {}

    public static function make(): self
    {
        return new self(
            (string) config('services.ffmpeg.path', 'ffmpeg'),
            (string) config('services.ffmpeg.probe_path', 'ffprobe'),
        );
    }

    /**
     * Transcode a video already stored on a disk, replacing it in place.
     *
     * @param  string  $path  path on the disk, e.g. "avatar-introductions/ron-slot/introduction.mp4"
     * @return array{ok: bool, skipped: bool, reason: string, before: int, after: int}
     */
    public function transcodeStored(string $path, string $disk = 'public'): array
    {
        $storage = Storage::disk($disk);

        if (! $storage->exists($path)) {
            return $this->result(false, false, 'file not found', 0, 0);
        }

        $before = (int) $storage->size($path);
        $absolute = $storage->path($path);

        $outcome = $this->transcodeFile($absolute);

        if ($outcome['ok'] && ! $outcome['skipped']) {
            Log::info('[VideoTranscoder] transcoded', [
                'path' => $path,
                'before' => $before,
                'after' => $outcome['after'],
                'saved_pct' => $before > 0 ? (int) round(100 - ($outcome['after'] / $before * 100)) : 0,
            ]);
        }

        return ['before' => $before] + $outcome;
    }

    /**
     * Transcode a file on the local filesystem, in place.
     *
     * @return array{ok: bool, skipped: bool, reason: string, before: int, after: int}
     */
    public function transcodeFile(string $absolutePath): array
    {
        $before = is_file($absolutePath) ? (int) filesize($absolutePath) : 0;

        if (! $this->isAvailable()) {
            // Not an error the uploader can do anything about, and not a reason to lose the file.
            Log::warning('[VideoTranscoder] ffmpeg not available — storing the original', ['path' => $absolutePath]);

            return $this->result(false, true, 'ffmpeg not available', $before, $before);
        }

        if ($this->alreadyWithinCeiling($absolutePath)) {
            return $this->result(true, true, 'already 720p H.264', $before, $before);
        }

        // Encode beside the original, never over it: ffmpeg writing to its own input truncates the
        // file the moment it opens, so a crash halfway through would leave nothing to fall back to.
        $temp = $absolutePath.'.transcoding.mp4';

        try {
            $process = new Process([
                $this->ffmpegPath, '-y', '-loglevel', 'error',
                '-i', $absolutePath,
                // Scale to 720p tall, keep the aspect, and round the width to an even number —
                // H.264 chroma subsampling cannot encode an odd dimension. Portrait phone video
                // stays portrait; `min()` means a clip already smaller is never blown UP.
                '-vf', 'scale=-2:min('.self::MAX_HEIGHT.'\,ih)',
                '-c:v', 'libx264', '-crf', (string) self::CRF, '-preset', 'medium',
                '-profile:v', 'high', '-pix_fmt', 'yuv420p',
                '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
                // Playback can start before the download finishes. Without this a browser waits for
                // the whole file just to find the index at the end of it.
                '-movflags', '+faststart',
                $temp,
            ]);
            $process->setTimeout(self::TIMEOUT_SECONDS);
            $process->run();

            if (! $process->isSuccessful() || ! is_file($temp) || filesize($temp) === 0) {
                @unlink($temp);
                Log::warning('[VideoTranscoder] ffmpeg failed — keeping the original', [
                    'path' => $absolutePath,
                    'stderr' => mb_substr($process->getErrorOutput(), -400),
                ]);

                return $this->result(false, true, 'ffmpeg failed', $before, $before);
            }

            $after = (int) filesize($temp);

            // An already-efficient file can come out BIGGER. Keeping that would be a re-encode that
            // costs quality and bytes at once, which is the worst of both.
            if ($before > 0 && $after >= $before) {
                @unlink($temp);

                return $this->result(true, true, 'original is already smaller', $before, $before);
            }

            rename($temp, $absolutePath);

            return $this->result(true, false, 'transcoded to 720p H.264', $before, $after);
        } catch (ProcessTimedOutException) {
            @unlink($temp);
            Log::warning('[VideoTranscoder] timed out — keeping the original', ['path' => $absolutePath]);

            return $this->result(false, true, 'timed out', $before, $before);
        } catch (\Throwable $e) {
            @unlink($temp);
            Log::warning('[VideoTranscoder] failed — keeping the original', [
                'path' => $absolutePath, 'error' => $e->getMessage(),
            ]);

            return $this->result(false, true, $e->getMessage(), $before, $before);
        }
    }

    /**
     * Already 720p or shorter AND already H.264, so re-encoding would only cost a generation.
     *
     * Deliberately does not check the bitrate: a 720p H.264 file that is merely large is still a
     * file every browser plays, and the quality lost by squeezing it again is not worth the bytes.
     */
    private function alreadyWithinCeiling(string $absolutePath): bool
    {
        $probe = $this->probe($absolutePath);

        return $probe !== null
            && $probe['height'] > 0
            && $probe['height'] <= self::MAX_HEIGHT
            && $probe['codec'] === 'h264';
    }

    /** @return array{height: int, codec: string}|null */
    public function probe(string $absolutePath): ?array
    {
        try {
            $process = new Process([
                $this->ffprobePath, '-v', 'error',
                '-select_streams', 'v:0',
                '-show_entries', 'stream=height,codec_name',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                $absolutePath,
            ]);
            $process->setTimeout(30);
            $process->run();

            if (! $process->isSuccessful()) {
                return null;
            }

            $lines = array_values(array_filter(array_map('trim', explode("\n", $process->getOutput())), 'strlen'));

            // ffprobe prints the entries in the order they were asked for: codec_name, then height.
            return count($lines) >= 2
                ? ['codec' => $lines[0], 'height' => (int) $lines[1]]
                : null;
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Encode a scene's moving picture for class: a 720p, 12 fps, silent H.264 MP4, and an AV1 copy
     * for browsers that play AV1. Both are NEW files beside the upload ("x.mp4" → "x.loop.mp4" and
     * "x.loop.av1.mp4"), so no browser keeps playing a cached copy of the file it replaces; the
     * caller points the scene at them and deletes the upload.
     *
     * The settings are the render test of 2026-11-23 on the Hormuz clip: 15 s came out 1.4 MB as
     * AV1 (CRF 44) and 2.2 MB as H.264 (CRF 29); VP9 was 3 MB and is not worth a third file. The
     * loops are drawn "on twos", so 12 fps is the real frame rate, not a cut. They play muted, so the
     * audio track is dropped. AV1 is not on older Safari, which is why H.264 stays the main file.
     *
     * Idempotent: an input that is already a ".loop.mp4" is not encoded again; only a missing AV1
     * copy is made. Nothing is ever deleted here, and a failed encode leaves no file behind.
     *
     * @return array{ok: bool, src: ?string, av1: ?string, reason: string, before: int, after: int}
     */
    public function encodeLoop(string $path, string $disk = 'public'): array
    {
        $storage = Storage::disk($disk);
        $fail = fn (string $why, int $size = 0) => ['ok' => false, 'src' => null, 'av1' => null, 'reason' => $why, 'before' => $size, 'after' => $size];
        if (! $storage->exists($path)) {
            return $fail('file not found');
        }
        $before = (int) $storage->size($path);
        if (! $this->isAvailable()) {
            return $fail('ffmpeg not available', $before);
        }
        $encoders = $this->encoders();
        $reasons = [];

        $src = self::isEncodedLoop($path) ? $path : self::loopPathFor($path);
        if ($src !== $path && ! $storage->exists($src)) {
            if (! in_array('libx264', $encoders, true)) {
                return $fail('no H.264 encoder', $before);
            }
            $ok = $this->runEncode($storage->path($path), $storage->path($src), [
                '-c:v', 'libx264', '-crf', '29', '-preset', 'slow',
                '-profile:v', 'high', '-pix_fmt', 'yuv420p',
            ]);
            if (! $ok) {
                return $fail('H.264 encode failed', $before);
            }
        }

        $av1 = self::av1PathFor($src);
        if (! $storage->exists($av1)) {
            $av1Args = match (true) {
                in_array('libsvtav1', $encoders, true) => ['-c:v', 'libsvtav1', '-crf', '44', '-preset', '6', '-pix_fmt', 'yuv420p'],
                in_array('libaom-av1', $encoders, true) => ['-c:v', 'libaom-av1', '-crf', '44', '-b:v', '0', '-cpu-used', '6', '-row-mt', '1', '-pix_fmt', 'yuv420p'],
                default => null,
            };
            if ($av1Args === null) {
                $reasons[] = 'no AV1 encoder';
                $av1 = null;
            } elseif (! $this->runEncode($storage->path($path), $storage->path($av1), $av1Args)) {
                $reasons[] = 'AV1 encode failed';
                $av1 = null;
            }
        }

        $after = (int) $storage->size($src);
        Log::info('[VideoTranscoder] loop encoded', compact('path', 'src', 'av1', 'before', 'after', 'reasons'));

        return ['ok' => true, 'src' => $src, 'av1' => $av1, 'reason' => $reasons === [] ? 'encoded' : implode(', ', $reasons), 'before' => $before, 'after' => $after];
    }

    /** The class-ready H.264 loop made from an upload: "x.mp4" → "x.loop.mp4". */
    public static function loopPathFor(string $path): string
    {
        return preg_replace('/\.[^.\/]+$/', '', $path).'.loop.mp4';
    }

    /** A loop's AV1 copy: "x.loop.mp4" → "x.loop.av1.mp4". */
    public static function av1PathFor(string $path): string
    {
        return preg_replace('/\.mp4$/', '', $path).'.av1.mp4';
    }

    public static function isEncodedLoop(string $path): bool
    {
        return str_ends_with($path, '.loop.mp4');
    }

    /**
     * One loop encode into $out: 720p at most, 12 fps, no audio, fast start. True when $out is a
     * finished, non-empty file; otherwise nothing is left behind.
     *
     * @param  list<string>  $codecArgs
     */
    private function runEncode(string $in, string $out, array $codecArgs): bool
    {
        $final = $out;
        $out .= '.part.mp4';   // a half-written file must never look like a finished loop
        try {
            $process = new Process([
                $this->ffmpegPath, '-y', '-loglevel', 'error', '-i', $in,
                '-vf', 'fps=12,scale=-2:min('.self::MAX_HEIGHT.'\,ih)',
                ...$codecArgs,
                '-an', '-movflags', '+faststart',
                $out,
            ]);
            $process->setTimeout(self::TIMEOUT_SECONDS);
            $process->run();
            if ($process->isSuccessful() && is_file($out) && filesize($out) > 0) {
                return rename($out, $final);
            }
            Log::warning('[VideoTranscoder] loop encode failed', ['out' => $out, 'stderr' => mb_substr($process->getErrorOutput(), -400)]);
        } catch (\Throwable $e) {
            Log::warning('[VideoTranscoder] loop encode failed', ['out' => $out, 'error' => $e->getMessage()]);
        }
        @unlink($out);

        return false;
    }

    /**
     * The video encoders this ffmpeg was built with. SiteGround's own /usr/local/bin/ffmpeg has
     * none (checked 2026-11-23: a non-GPL build, decoders only), so the answer decides what runs.
     *
     * @return list<string>
     */
    public function encoders(): array
    {
        try {
            $process = new Process([$this->ffmpegPath, '-hide_banner', '-encoders']);
            $process->setTimeout(10);
            $process->run();
            preg_match_all('/^\s*V\S*\s+(\S+)/m', $process->getOutput(), $m);

            return $m[1];
        } catch (\Throwable) {
            return [];
        }
    }

    /**
     * The video's first frame as image bytes (JPEG), or null when ffmpeg is missing or fails.
     * A moving scene picture keeps a still for everything that needs one (rail thumb, poster).
     */
    public function firstFrame(string $absolutePath): ?string
    {
        if (! is_file($absolutePath) || ! $this->isAvailable()) {
            return null;
        }
        $out = $absolutePath.'.poster.jpg';
        try {
            $process = new Process([
                $this->ffmpegPath, '-y', '-loglevel', 'error', '-i', $absolutePath,
                '-frames:v', '1', '-q:v', '2', $out,
            ]);
            $process->setTimeout(60);
            $process->run();
            $bytes = $process->isSuccessful() && is_file($out) ? (string) file_get_contents($out) : '';

            return $bytes !== '' ? $bytes : null;
        } catch (\Throwable $e) {
            Log::warning('[VideoTranscoder] first frame failed', ['path' => $absolutePath, 'error' => $e->getMessage()]);

            return null;
        } finally {
            @unlink($out);
        }
    }

    public function isAvailable(): bool
    {
        try {
            $process = new Process([$this->ffmpegPath, '-version']);
            $process->setTimeout(10);
            $process->run();

            return $process->isSuccessful();
        } catch (\Throwable) {
            return false;
        }
    }

    /** @return array{ok: bool, skipped: bool, reason: string, before: int, after: int} */
    private function result(bool $ok, bool $skipped, string $reason, int $before, int $after): array
    {
        return compact('ok', 'skipped', 'reason', 'before', 'after');
    }
}
