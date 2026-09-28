<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\Lessons\SceneDialogue;
use PHPUnit\Framework\TestCase;

class SceneDialogueCueTest extends TestCase
{
    private function lines(string ...$speakers): array
    {
        return array_map(fn (string $s): array => ['speaker' => $s, 'text' => "{$s} speaks"], $speakers);
    }

    public function test_a_line_starts_where_every_earlier_clip_and_gap_ends(): void
    {
        $cues = SceneDialogue::cue($this->lines('beatrice', 'dante', 'narrator'), [2.0, 1.0, 4.0], 0.5);

        // Absolute times: 0, 2.0 + 0.5, 2.5 + 1.0 + 0.5.
        $this->assertSame([0.0, 2.5, 4.0], array_column($cues, 'start'));
    }

    public function test_a_narrator_line_ends_when_its_clip_ends(): void
    {
        $cues = SceneDialogue::cue($this->lines('narrator', 'dante'), [3.0, 1.0], 0.5);

        $this->assertSame(3.0, $cues[0]['end']);
    }

    public function test_a_balloon_stays_through_the_reply_and_goes_when_the_line_after_starts(): void
    {
        $cues = SceneDialogue::cue($this->lines('beatrice', 'dante', 'narrator'), [2.0, 1.0, 4.0], 0.5);

        // Beatrice stays while Dante answers, and leaves as the narrator starts (4.0).
        $this->assertSame(4.0, $cues[0]['end']);
    }

    public function test_a_balloon_goes_as_soon_as_the_same_speaker_speaks_again(): void
    {
        $cues = SceneDialogue::cue($this->lines('dante', 'dante', 'guido'), [2.0, 1.0, 1.0], 0.5);

        $this->assertSame(2.5, $cues[0]['end']);
    }

    public function test_the_last_balloon_stays_to_the_end_of_the_track(): void
    {
        $cues = SceneDialogue::cue($this->lines('dante', 'guido'), [2.0, 1.5], 0.5);

        $this->assertSame(4.0, $cues[0]['end']);
        $this->assertSame(4.0, $cues[1]['end']);
    }
}
