<?php

declare(strict_types=1);

namespace App\Services\Lessons;

use App\Jobs\GenerateSceneAudio;
use App\Models\Scene;
use App\Services\Support\PronunciationLexicon;
use App\Services\TtsService;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use RuntimeException;
use Symfony\Component\Process\Process;

/**
 * A scene told as LINES instead of one narrator script: the narrator frames, the characters speak
 * in their own voices, and each character line becomes a speech balloon in the player.
 *
 * Every line is synthesised as its own clip and the clips are joined into the scene's one
 * narration track, so a line's start is simply the length of everything before it. That is exact
 * in every language and needs no word timings, which Azure does not give.
 *
 * Spec shape: text/{lang}.php  'lines'  => [['beatrice', 'Buon giorno.'], ['narrator', '…'], …]
 *             scenes.php       a figure layer with 'speaks' => 'beatrice' (a speaker with no
 *                                          layer speaks from off-frame: a balloon with no tail)
 *             spec             'cast'   => ['beatrice' => ['voice' => [lang => id]]]
 *
 * Balloons carry no name: the main character is introduced in the script and looks like nobody
 * else, and the tail says who is talking.
 */
final class SceneDialogue
{
    /** Silence between two lines, so a reply does not land on the last syllable. */
    public const GAP_SECONDS = 0.35;

    /** Speaking rate for estimated timings when the scene is built without audio. */
    private const WORDS_PER_SECOND = 2.6;

    public function __construct(
        private readonly TtsService $tts,
        private readonly LibraryLayers $library,
    ) {}

    /**
     * @param  array<string,mixed>  $s  the scene spec (lines, mouths)
     * @param  array<string,array<string,mixed>>  $cast
     */
    public function apply(Scene $scene, array $s, array $cast, string $lang, bool $narrate): void
    {
        $lines = self::normalise((array) $s['lines'], $cast);
        // Each speaking figure, and where its mouth is on its own picture.
        $figures = array_map(
            fn (array $f): array => ['asset_id' => $f['asset_id'], ...FigureMouth::of($f['ref'])],
            $this->library->speakers($s, (int) $scene->order),
        );

        $durations = $narrate
            ? $this->record($scene, $lines, $cast, $lang)
            : array_map(fn (array $l): float => self::estimate($l['text']), $lines);

        $timed = self::cue($lines, $durations);
        $config = (array) ($scene->config ?? []);
        $config['lines'] = array_map(fn (array $l): array => $l + [
            'figure' => $figures[$l['speaker']] ?? null,
        ], $timed);

        $scene->update(['config' => $config]);
    }

    /**
     * Start and end of every line on the joined track. A narrator line lasts as long as it is
     * spoken (it is a caption). A character's balloon stays up through the next line, so a
     * reply can be read next to what it answers, and goes when the line after that starts or
     * the same speaker speaks again, whichever is first. The last lines stay to the scene's end.
     *
     * @param  list<array{speaker:string,text:string}>  $lines
     * @param  list<float>  $durations  seconds per line, same order
     * @return list<array{speaker:string,text:string,start:float,end:float}>
     */
    public static function cue(array $lines, array $durations, float $gap = self::GAP_SECONDS): array
    {
        $starts = [];
        $t = 0.0;
        foreach ($durations as $i => $d) {
            $starts[$i] = $t;
            $t += $d + $gap;
        }
        $total = max(0.0, $t - $gap);

        $out = [];
        foreach ($lines as $i => $line) {
            if ($line['speaker'] === 'narrator') {
                $end = $starts[$i] + $durations[$i];
            } else {
                $end = $starts[$i + 2] ?? $total;
                foreach (array_slice($lines, $i + 1, null, true) as $j => $next) {
                    if ($next['speaker'] === $line['speaker']) {
                        $end = min($end, $starts[$j]);
                        break;
                    }
                }
            }
            $out[] = $line + ['start' => round($starts[$i], 3), 'end' => round($end, 3)];
        }

        return $out;
    }

    /**
     * @param  array<int,mixed>  $raw
     * @param  array<string,mixed>  $cast
     * @return list<array{speaker:string,text:string}>
     */
    private static function normalise(array $raw, array $cast): array
    {
        $lines = [];
        foreach (array_values($raw) as $i => $line) {
            [$speaker, $text] = array_values((array) $line) + [null, null];
            $speaker = (string) $speaker;
            $text = trim((string) $text);
            if ($text === '' || ($speaker !== 'narrator' && ! isset($cast[$speaker]))) {
                throw new InvalidArgumentException("Line {$i}: speaker '{$speaker}' is not in the cast, or the line is empty.");
            }
            $lines[] = ['speaker' => $speaker, 'text' => $text];
        }

        return $lines;
    }

    private static function estimate(string $text): float
    {
        return round(max(1.0, str_word_count($text) / self::WORDS_PER_SECOND), 2);
    }

    /**
     * Synthesise every line (cached by voice + text), join them with a short silence into the
     * scene's narration.mp3 and return each clip's measured length.
     *
     * @param  list<array{speaker:string,text:string}>  $lines
     * @param  array<string,array<string,mixed>>  $cast
     * @return list<float>
     */
    private function record(Scene $scene, array $lines, array $cast, string $lang): array
    {
        $disk = Storage::disk('public');
        $clips = [];
        $durations = [];

        foreach ($lines as $i => $line) {
            $spoken = PronunciationLexicon::apply($this->tts->prepareSpeechText($line['text']), $lang);
            if ($line['speaker'] === 'narrator') {
                ['provider' => $provider, 'voice' => $voice] = GenerateSceneAudio::narratorVoice($scene, $spoken);
                $speed = (float) ($scene->lesson->narrator?->voice_speed ?? 1.0);
            } else {
                $voice = (string) ($cast[$line['speaker']]['voice'][$lang]
                    ?? throw new InvalidArgumentException("Cast '{$line['speaker']}' has no {$lang} voice."));
                $provider = 'azure';
                $speed = 1.0;
            }

            $cached = "lessons/{$scene->lesson_id}/narration-cache/lines/".sha1("{$provider}|{$voice}|{$speed}|{$spoken}").'.mp3';
            if (! $disk->exists($cached)) {
                $audio = $this->tts->generateAudioRaw($spoken, $voice, $speed, $provider)
                    ?? throw new RuntimeException("No audio for line {$i} ({$line['speaker']}, {$voice}).");
                $disk->put($cached, $audio);
            }
            $clips[] = $disk->path($cached);
            $durations[] = self::probe($disk->path($cached));
        }

        $path = "lessons/{$scene->lesson_id}/scenes/{$scene->id}/narration.mp3";
        $disk->makeDirectory(dirname($path));
        self::join($clips, $disk->path($path));

        $total = array_sum($durations) + self::GAP_SECONDS * (count($durations) - 1);
        $scene->update([
            'audio_path' => $path,
            'audio_script_hash' => sha1((string) $scene->script_segment),
            'audio_locale' => $lang,
            'audio_provider' => 'azure',
            'audio_alignment' => null,
            'duration_seconds' => (int) ceil($total),
        ]);

        return $durations;
    }

    private static function probe(string $file): float
    {
        $p = new Process(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', $file]);
        $p->mustRun();

        return round((float) trim($p->getOutput()), 3);
    }

    /**
     * Clips from different providers differ in rate and channels, so each is resampled to one
     * format and padded with the gap before the concat (the last one is not padded).
     *
     * @param  list<string>  $clips
     */
    private static function join(array $clips, string $out): void
    {
        $args = ['ffmpeg', '-y', '-v', 'error'];
        $chain = '';
        $last = count($clips) - 1;
        foreach ($clips as $i => $clip) {
            array_push($args, '-i', $clip);
            $pad = $i < $last ? ',apad=pad_dur='.self::GAP_SECONDS : '';
            $chain .= "[{$i}:a]aresample=44100,aformat=channel_layouts=mono{$pad}[a{$i}];";
        }
        $chain .= implode('', array_map(fn (int $i): string => "[a{$i}]", array_keys($clips)))
            .'concat=n='.count($clips).':v=0:a=1[out]';
        array_push($args, '-filter_complex', $chain, '-map', '[out]', '-c:a', 'libmp3lame', '-b:a', '128k', $out);

        (new Process($args))->setTimeout(120)->mustRun();
    }
}
