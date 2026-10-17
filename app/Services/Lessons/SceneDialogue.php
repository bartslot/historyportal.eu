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

    /** Reading rate and minimum hold for a silent balloon. */
    private const READ_WORDS_PER_SECOND = 2.2;

    private const MIN_READ_SECONDS = 1.8;

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
            fn (array $f): array => ['asset_id' => $f['asset_id'], ...(isset($f['mouth'])
                ? ['mouth' => $f['mouth'], 'facing' => $f['facing']]
                : FigureMouth::of($f['ref']))],
            $this->library->speakers($s, (int) $scene->order),
        );

        $durations = $narrate
            ? $this->record($scene, $lines, $cast, $lang)
            : array_map(fn (array $l): float => self::estimate($l['text']), $lines);

        $timed = self::withBubbles(self::cue($lines, $durations));
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
     * A narrator line can carry a character's balloon: the narrator tells what the character says, and the
     * balloon is on screen exactly while that sentence is spoken (at least its reading time). The balloon is
     * text only (Bart, 2026-10-13: "text bubbles have to be shown on the specific moment").
     *
     * @param  list<array<string,mixed>>  $timed
     * @return list<array<string,mixed>>
     */
    public static function withBubbles(array $timed): array
    {
        $out = [];
        foreach ($timed as $line) {
            $bubble = $line['bubble'] ?? null;
            unset($line['bubble']);
            $out[] = $line;
            if ($bubble !== null) {
                $out[] = ['speaker' => $bubble['speaker'], 'text' => $bubble['text'], 'start' => $line['start'],
                    'end' => round(max($line['end'], $line['start'] + self::readingTime($bubble['text'])), 3)];
            }
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
            [$speaker, $text, $bubble] = array_values((array) $line) + [null, null, null];
            $speaker = (string) $speaker;
            $text = trim((string) $text);
            if ($text === '' || ($speaker !== 'narrator' && ! isset($cast[$speaker]))) {
                throw new InvalidArgumentException("Line {$i}: speaker '{$speaker}' is not in the cast, or the line is empty.");
            }
            $entry = ['speaker' => $speaker, 'text' => $text];
            if ($bubble !== null) {
                [$who, $said] = array_values((array) $bubble) + [null, null];
                if ($speaker !== 'narrator' || ! isset($cast[(string) $who]) || trim((string) $said) === '') {
                    throw new InvalidArgumentException("Line {$i}: a balloon rides on a narrator line and needs a cast speaker and text.");
                }
                $entry['bubble'] = ['speaker' => (string) $who, 'text' => trim((string) $said)];
            }
            $lines[] = $entry;
        }

        return $lines;
    }

    /** How long a silent balloon stays up: a twelve-year-old reading aloud in their head. */
    public static function readingTime(string $text): float
    {
        return round(max(self::MIN_READ_SECONDS, str_word_count($text) / self::READ_WORDS_PER_SECOND), 2);
    }

    /** A cached silent clip of that length, so a silent balloon sits on the joined track like a spoken line. */
    private function silence(\Illuminate\Contracts\Filesystem\Filesystem $disk, Scene $scene, float $seconds): string
    {
        $cached = "lessons/{$scene->lesson_id}/narration-cache/lines/silence-".(int) round($seconds * 1000).'.m4a';
        if (! $disk->exists($cached)) {
            $disk->makeDirectory(dirname($cached));
            (new Process(['ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono',
                '-t', (string) $seconds, '-c:a', 'aac', '-b:a', '32k', '-f', 'ipod', $disk->path($cached)]))->setTimeout(60)->mustRun();
        }

        return $disk->path($cached);
    }

    private static function estimate(string $text): float
    {
        return round(max(1.0, str_word_count($text) / self::WORDS_PER_SECOND), 2);
    }

    /**
     * Synthesise every line (cached by voice + text), join them with a short silence into the
     * scene's narration.m4a and return each clip's measured length.
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
            // A character without a voice is a silent balloon: it holds for its reading time and only the
            // narrator is heard (Bart, 2026-10-13: "just the narrator ... textbubbles").
            if ($line['speaker'] !== 'narrator' && empty($cast[$line['speaker']]['voice'][$lang])) {
                $seconds = self::readingTime($line['text']);
                $clips[] = $this->silence($disk, $scene, $seconds);
                $durations[] = $seconds;

                continue;
            }
            $spoken = PronunciationLexicon::apply($this->tts->prepareSpeechText($line['text']), $lang);
            if ($line['speaker'] === 'narrator') {
                ['provider' => $provider, 'voice' => $voice] = GenerateSceneAudio::narratorVoice($scene, $spoken);
                $speed = (float) ($scene->lesson->narrator?->voice_speed ?? 1.0);
            } else {
                ['provider' => $provider, 'voice' => $voice] = self::castVoice((string) ($cast[$line['speaker']]['voice'][$lang]
                    ?? throw new InvalidArgumentException("Cast '{$line['speaker']}' has no {$lang} voice.")));
                $speed = 1.0;
            }

            $cached = $this->clip($scene, $spoken, $provider, $voice, $speed, "line {$i} ({$line['speaker']})");
            $clips[] = $disk->path($cached);
            $durations[] = self::probe($disk->path($cached));
        }

        // AAC in .m4a: ffmpeg's own encoder, present on every server (prod's ffmpeg has no libmp3lame).
        $path = "lessons/{$scene->lesson_id}/scenes/{$scene->id}/narration.m4a";
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

    /**
     * One narrator sentence on its own (a power-meter moment's "after" line): the same voice, speed,
     * lexicon and cache as the narrator's lines in the scene track. Returns the public-disk path.
     */
    public function narratorClip(Scene $scene, string $text, string $lang): string
    {
        $spoken = PronunciationLexicon::apply($this->tts->prepareSpeechText($text), $lang);
        ['provider' => $provider, 'voice' => $voice] = GenerateSceneAudio::narratorVoice($scene, $spoken);

        return $this->clip($scene, $spoken, $provider, $voice, (float) ($scene->lesson->narrator?->voice_speed ?? 1.0), 'narrator clip');
    }

    /** A clip cached by voice + text; synthesised once. Throws when the provider chain fell through. */
    private function clip(Scene $scene, string $spoken, string $provider, string $voice, float $speed, string $label): string
    {
        $disk = Storage::disk('public');
        $cached = "lessons/{$scene->lesson_id}/narration-cache/lines/".sha1("{$provider}|{$voice}|{$speed}|{$spoken}").'.mp3';
        if (! $disk->exists($cached)) {
            $audio = $this->tts->generateAudioRaw($spoken, $voice, $speed, $provider)
                ?? throw new RuntimeException("No audio for {$label}, {$voice}.");
            // The provider chain falls through silently; a line in someone else's voice is wrong. That
            // includes the narrator: a refused ElevenLabs voice once fell back to an English default.
            // Except an edge-tts voice read by Azure in that same voice: edge is refused from the
            // server and its voice ids are Azure Neural names (TtsService), the rule a plain scene
            // follows too (Scene::narrationWasDowngraded). That is the narrator, not a stand-in.
            $sameVoice = $provider === 'edge_tts' && $this->tts->lastProvider() === 'azure' && $this->tts->lastVoice() === $voice;
            if ($this->tts->lastProvider() !== $provider && ! $sameVoice) {
                throw new RuntimeException(ucfirst($label).' came from '.($this->tts->lastProvider() ?? 'nothing').", not {$provider}.");
            }
            $disk->put($cached, $audio);
        }

        return $cached;
    }

    /**
     * A cast voice: 'elevenlabs:<voice id>' for the flagship cast, anything else is an Azure voice name.
     *
     * @return array{provider: string, voice: string}
     */
    public static function castVoice(string $voice): array
    {
        return str_starts_with($voice, 'elevenlabs:')
            ? ['provider' => 'elevenlabs', 'voice' => substr($voice, strlen('elevenlabs:'))]
            : ['provider' => 'azure', 'voice' => $voice];
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
        array_push($args, '-filter_complex', $chain, '-map', '[out]', '-c:a', 'aac', '-b:a', '96k', '-f', 'ipod', $out);

        (new Process($args))->setTimeout(120)->mustRun();
    }
}
