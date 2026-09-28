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
    public const FINGERPRINT = 'aac-lc-32k-mono-24k-lufs16';

    /**
     * Every clip is levelled to this integrated loudness before encoding. The Storia research said "no
     * filters" for ONE consistent narrator; a cast is different: the ElevenLabs voices came out between
     * -31 and -20 LUFS, so each change of speaker jumped in volume (Bart). -16 LUFS is the usual level
     * for speech on phones and laptops; true peak stays under -1.5 dBTP so the AAC encode cannot clip.
     */
    public const LOUDNESS_LUFS = -16;

    private const TRUE_PEAK_DB = -1.5;

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
            $in = self::level($in, "{$dir}/level.wav") ?? $in;

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
            @unlink("{$dir}/in.{$inputExtension}");
            @unlink("{$dir}/level.wav");
            @unlink($out);
            @rmdir($dir);
        }
    }

    /**
     * Two-pass loudness levelling: measure (ffmpeg loudnorm, EBU R128), then one gain for the whole
     * clip so the voice keeps its own dynamics and a shout stays a shout. Returns the levelled
     * 24 kHz mono WAV, or null (no ffmpeg, or the measurement failed) and the clip goes on as it was.
     */
    private static function level(string $in, string $out): ?string
    {
        $ffmpeg = self::binary('ffmpeg');
        if ($ffmpeg === null) {
            return null;
        }
        $target = 'I='.self::LOUDNESS_LUFS.':TP='.self::TRUE_PEAK_DB.':LRA=11';
        $measure = Process::timeout(60)->run([$ffmpeg, '-hide_banner', '-i', $in, '-af', "loudnorm={$target}:print_format=json", '-f', 'null', '-']);
        if (! preg_match('/\{[^{}]*"input_i"[^{}]*\}/s', $measure->errorOutput(), $m)) {
            return null;
        }
        $v = json_decode($m[0], true);
        if (! is_array($v) || ! is_numeric($v['input_i'] ?? null) || (float) $v['input_i'] < -70) {
            return null;   // silence or unreadable: nothing to level
        }
        // One gain to the target, then a limiter for the few peaks that would pass -1.5 dBTP. Linear
        // loudnorm refuses to raise a clip past its own peaks, which left a quiet voice 7 LU short.
        $gain = self::LOUDNESS_LUFS - (float) $v['input_i'];
        $limit = round(10 ** (self::TRUE_PEAK_DB / 20), 3);
        $apply = sprintf('volume=%.2fdB,alimiter=limit=%s:attack=5:release=50:level=false', $gain, $limit);
        $run = Process::timeout(60)->run([$ffmpeg, '-y', '-loglevel', 'error', '-i', $in, '-af', $apply, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', $out]);

        return $run->successful() && is_file($out) && filesize($out) > 0 ? $out : null;
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
