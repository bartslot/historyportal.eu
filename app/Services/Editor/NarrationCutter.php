<?php

declare(strict_types=1);

namespace App\Services\Editor;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;

/**
 * The audio half of the cut tool (SceneCut): a scene's narration file cut in two at a moment, with
 * the same ffmpeg the video loops use (config services.ffmpeg). The stream is copied, not encoded
 * again, so the voice is exactly the one that was generated and the cut takes a fraction of a second.
 *
 * Both pieces are NEW files. The original stays where it is, so undoing the cut only points the
 * scene back at it.
 */
class NarrationCutter
{
    public function __construct(
        private readonly string $ffmpegPath = 'ffmpeg',
        private readonly string $ffprobePath = 'ffprobe',
    ) {}

    public static function fromConfig(): self
    {
        return new self(
            (string) config('services.ffmpeg.path', 'ffmpeg'),
            (string) config('services.ffmpeg.probe_path', 'ffprobe'),
        );
    }

    /**
     * Write the part of `$src` from `$from` to `$to` seconds (null: to the end) to `$out`, on the public
     * disk. False when ffmpeg is missing or fails; nothing is left behind then.
     */
    public function cut(string $src, string $out, float $from, ?float $to): bool
    {
        $disk = Storage::disk('public');
        if (! $disk->exists($src)) {
            return false;
        }
        $final = $disk->path($out);
        @mkdir(dirname($final), 0775, true);
        $part = $final.'.part.'.pathinfo($out, PATHINFO_EXTENSION);
        $args = [$this->ffmpegPath, '-y', '-loglevel', 'error'];
        if ($from > 0) {
            $args = [...$args, '-ss', sprintf('%.3f', $from)];
        }
        $args = [...$args, '-i', $disk->path($src)];
        if ($to !== null) {
            $args = [...$args, '-t', sprintf('%.3f', max(0.05, $to - $from))];
        }
        $args = [...$args, '-map', '0:a', '-c', 'copy', $part];
        try {
            $process = new Process($args);
            $process->setTimeout(60);
            $process->run();
            if ($process->isSuccessful() && is_file($part) && filesize($part) > 0 && rename($part, $final)) {
                return true;
            }
            Log::warning('[NarrationCutter] cut failed', ['src' => $src, 'stderr' => mb_substr($process->getErrorOutput(), -400)]);
        } catch (\Throwable $e) {
            Log::warning('[NarrationCutter] cut failed', ['src' => $src, 'error' => $e->getMessage()]);
        }
        @unlink($part);

        return false;
    }

    /**
     * The quiet stretches in a narration file, as [start, end] pairs in seconds: where a sentence or
     * a breath leaves room to cut. Empty when ffmpeg cannot read it.
     *
     * @return list<array{0: float, 1: float}>
     */
    public function silences(string $src, float $noiseDb = -35.0, float $minSeconds = 0.12): array
    {
        $disk = Storage::disk('public');
        if (! $disk->exists($src)) {
            return [];
        }
        try {
            $process = new Process([
                $this->ffmpegPath, '-hide_banner', '-nostats', '-i', $disk->path($src),
                '-af', sprintf('silencedetect=noise=%sdB:d=%s', $noiseDb, $minSeconds), '-f', 'null', '-',
            ]);
            $process->setTimeout(60);
            $process->run();

            return self::parseSilences($process->getErrorOutput());
        } catch (\Throwable) {
            return [];
        }
    }

    /** The file's length in seconds, or null. */
    public function duration(string $src): ?float
    {
        $disk = Storage::disk('public');
        if (! $disk->exists($src)) {
            return null;
        }
        try {
            $process = new Process([
                $this->ffprobePath, '-v', 'error', '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1', $disk->path($src),
            ]);
            $process->setTimeout(30);
            $process->run();
            $value = (float) trim($process->getOutput());

            return $process->isSuccessful() && $value > 0 ? $value : null;
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * silencedetect's log lines ("silence_start: 1.2" … "silence_end: 1.6 | silence_duration: 0.4")
     * as pairs. A silence still open at the end of the file is left out: there is nothing after it.
     *
     * @return list<array{0: float, 1: float}>
     */
    public static function parseSilences(string $log): array
    {
        preg_match_all('/silence_(start|end): (-?[0-9.]+)/', $log, $m, PREG_SET_ORDER);
        $out = [];
        $start = null;
        foreach ($m as [, $kind, $value]) {
            if ($kind === 'start') {
                $start = max(0.0, (float) $value);
            } elseif ($start !== null) {
                $out[] = [$start, (float) $value];
                $start = null;
            }
        }

        return $out;
    }
}
