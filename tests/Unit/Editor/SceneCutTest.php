<?php

declare(strict_types=1);

namespace Tests\Unit\Editor;

use App\Services\Editor\NarrationCutter;
use App\Services\Editor\SceneCut;
use PHPUnit\Framework\TestCase;

class SceneCutTest extends TestCase
{
    /** One timing per character, each 0.1 s long, with a 0.3 s pause on every space. */
    private function timed(string $text): array
    {
        $out = [];
        $t = 0.0;
        foreach (mb_str_split($text) as $c) {
            $len = $c === ' ' ? 0.3 : 0.1;
            $out[] = ['character' => $c, 'start_time' => round($t, 3), 'end_time' => round($t + $len, 3)];
            $t += $len;
        }

        return $out;
    }

    public function test_the_cut_lands_on_the_word_gap_nearest_the_playhead(): void
    {
        $align = $this->timed('Marco sailed east');   // "Marco" ends 0.5, "sailed" 0.8-1.4, "east" 1.7-2.1
        $this->assertSame(['index' => 5, 'time' => 0.65], SceneCut::wordGap($align, 0.4));
        $this->assertSame(['index' => 12, 'time' => 1.55], SceneCut::wordGap($align, 1.6));
    }

    public function test_no_gap_without_timings_or_with_one_word(): void
    {
        $this->assertNull(SceneCut::wordGap(null, 1.0));
        $this->assertNull(SceneCut::wordGap($this->timed('Venice'), 0.3));
    }

    public function test_the_timings_divide_at_the_gap_and_the_second_counts_from_the_cut(): void
    {
        $align = $this->timed('Marco sailed east');
        [$a, $b] = SceneCut::splitAlignment($align, 5, 0.65);
        $this->assertSame('Marco', implode('', array_column($a, 'character')));
        $this->assertSame('sailed east', implode('', array_column($b, 'character')));
        $this->assertSame(0.15, $b[0]['start_time']);
    }

    public function test_the_script_divides_on_the_same_space_when_it_is_the_timed_text(): void
    {
        $this->assertSame(['Marco', 'sailed east'], SceneCut::splitScript('Marco sailed east', 5 / 17, true));
    }

    public function test_a_script_split_never_cuts_a_word_and_prefers_a_sentence_end_nearby(): void
    {
        $script = 'The ship left Venice. It sailed for weeks.';
        $this->assertSame(['The ship left Venice.', 'It sailed for weeks.'], SceneCut::splitScript($script, 0.55));
        $this->assertSame(['Marco', 'sailed east'], SceneCut::splitScript('Marco sailed east', 0.4));
    }

    public function test_balloons_go_to_the_piece_they_are_seen_in(): void
    {
        $config = [
            'lines' => [
                ['text' => 'early', 'start' => 0, 'end' => 2],
                ['text' => 'across', 'start' => 1, 'end' => 6],
                ['text' => 'late', 'start' => 5, 'end' => null],
            ],
            'timeline' => ['tracks' => [
                ['target' => 'bal:0', 'property' => 'opacity', 'keyframes' => []],
                ['target' => 'bal:2', 'property' => 'opacity', 'keyframes' => []],
            ]],
        ];
        $first = SceneCut::linesFor($config, 4.0, false);
        $this->assertSame(['early', 'across'], array_column($first['lines'], 'text'));
        $this->assertNull($first['lines'][1]['end']);
        $this->assertSame(['bal:0'], array_column($first['timeline']['tracks'], 'target'));

        $second = SceneCut::linesFor($config, 4.0, true);
        $this->assertSame(['across', 'late'], array_column($second['lines'], 'text'));
        $this->assertSame([0.0, 2.0], [$second['lines'][0]['start'], $second['lines'][0]['end']]);
        $this->assertSame(1.0, $second['lines'][1]['start']);
        $this->assertSame(['bal:1'], array_column($second['timeline']['tracks'], 'target'));
    }

    public function test_a_layer_appears_as_late_in_the_second_piece_as_it_did_after_the_cut(): void
    {
        $shots = [['layers' => [['asset_id' => 1, 'anim_delay' => 6.0], ['asset_id' => 2, 'anim_delay' => 1.0], ['asset_id' => 3]]]];
        $out = SceneCut::shotsAfter($shots, 4.0);
        $this->assertSame([2.0, 0.0], [$out[0]['layers'][0]['anim_delay'], $out[0]['layers'][1]['anim_delay']]);
        $this->assertArrayNotHasKey('anim_delay', $out[0]['layers'][2]);
    }

    public function test_untimed_narration_is_cut_in_the_nearest_pause(): void
    {
        $log = "[silencedetect @ 0x1] silence_start: 1.2\n[silencedetect @ 0x1] silence_end: 1.6 | silence_duration: 0.4\n"
            ."[silencedetect @ 0x1] silence_start: 4.9\n[silencedetect @ 0x1] silence_end: 5.3 | silence_duration: 0.4\n"
            ."[silencedetect @ 0x1] silence_start: 9.8\n";
        $silences = NarrationCutter::parseSilences($log);
        $this->assertSame([[1.2, 1.6], [4.9, 5.3]], $silences);
        $this->assertSame(5.1, SceneCut::nearestSilence($silences, 4.4));
        $this->assertSame(1.3, SceneCut::nearestSilence($silences, 1.3));   // already in a pause: stays
        $this->assertNull(SceneCut::nearestSilence($silences, 8.0));
    }
}
