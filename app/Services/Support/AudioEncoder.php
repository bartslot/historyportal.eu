<?php

declare(strict_types=1);

namespace App\Services\Support;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;

/**
 * Narration encode: AAC-LC, 32 kbps, mono, 24 kHz, in .m4a. The recipe from the Storia research
 * (Memory/historyportal/research_2026-09-28_2038_storia-audio-compression-azure): half the bytes of
 * 64k with no audible loss on earbuds; 24k is where speech artefacts start. No filters: TTS output
 * is already clean mono, and "fixing" it only makes it less consistent.
 *
 * afconvert (macOS, where lessons are rendered) first, ffmpeg's native `aac` second. Not aac_at,
 * which silently ignores -ac 1. Neither available: callers keep the provider's MP3.
 */
final class AudioEncoder
{
    public const BITRATE = 32000;

    public const EXTENSION = 'm4a';

    /** Goes into the narration cache key, so changing the encode actually re-renders. */
    public const FINGERPRINT = 'aac-lc-32k-mono-24k';

    public static function available(): bool
    {
        return self::binary('afconvert') !== null || self::binary('ffmpeg') !== null;
    }

    /**
     * Any audio the encoders read (PCM WAV from Azure, an MP3) as AAC-LC 32k mono 24 kHz .m4a
     * bytes. Null when no encoder is installed or the encode failed.
     */
    public static function toAac(string $audio, string $inputExtension = 'wav'): ?string
    {
        if ($audio === '') {
            return null;
        }
        $dir = sys_get_temp_dir().'/narration-'.bin2hex(random_bytes(6));
        @mkdir($dir);
        $in = "{$dir}/in.{$inputExtension}";
        $out = "{$dir}/out.m4a";
        file_put_contents($in, $audio);

        try {
            foreach (self::commands($in, $out) as $command) {
                @unlink($out);
                $run = Process::timeout(120)->run($command);
                if ($run->successful() && is_file($out) && filesize($out) > 0) {
                    return (string) file_get_contents($out);
                }
                Log::warning('[AudioEncoder] '.$command[0].' failed: '.substr($run->errorOutput(), 0, 300));
            }

            return null;
        } finally {
            @unlink($in);
            @unlink($out);
            @rmdir($dir);
        }
    }

    /** @return list<list<string>> */
    private static function commands(string $in, string $out): array
    {
        $commands = [];
        if ($afconvert = self::binary('afconvert')) {
            // 'aac ' is a four-character code (hence the space); '@24000' sets the sample rate.
            $commands[] = [$afconvert, '-f', 'm4af', '-d', 'aac @24000', '-c', '1', '-b', (string) self::BITRATE, $in, $out];
        }
        if ($ffmpeg = self::binary('ffmpeg')) {
            $commands[] = [$ffmpeg, '-y', '-loglevel', 'error', '-i', $in, '-c:a', 'aac', '-b:a', '32k', '-ac', '1', '-ar', '24000', '-f', 'ipod', $out];
        }

        return $commands;
    }

    /** Average bitrate of an audio file in bits/s (ffprobe), or null when it cannot be read. */
    public static function bitrate(string $absolutePath): ?int
    {
        $ffprobe = self::binary('ffprobe');
        if ($ffprobe === null || ! is_file($absolutePath)) {
            return null;
        }
        $run = Process::timeout(30)->run([$ffprobe, '-v', 'error', '-show_entries', 'format=bit_rate', '-of', 'default=nw=1:nk=1', $absolutePath]);
        $rate = (int) trim($run->output());

        return $run->successful() && $rate > 0 ? $rate : null;
    }

    private static function binary(string $name): ?string
    {
        foreach (['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin'] as $dir) {
            if (is_executable("{$dir}/{$name}")) {
                return "{$dir}/{$name}";
            }
        }

        return null;
    }
}
