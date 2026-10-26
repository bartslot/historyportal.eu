<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\Support\LayerFrames;
use InvalidArgumentException;
use Tests\TestCase;

class LayerFramesTest extends TestCase
{
    public function test_the_sheet_sits_beside_its_picture(): void
    {
        $this->assertSame('a/ships-pair-far.frames.webp', LayerFrames::sheetPath('a/ships-pair-far.webp'));
    }

    public function test_a_spec_grid_that_is_no_grid_fails(): void
    {
        $this->assertSame(['count' => 4, 'columns' => 4], LayerFrames::spec(['count' => 4], 'here'));
        $this->assertSame(['count' => 6, 'columns' => 3], LayerFrames::spec(['count' => 6, 'columns' => 3], 'here'));
        foreach ([['count' => 1], ['count' => '4'], ['count' => 4, 'columns' => 5], null] as $bad) {
            try {
                LayerFrames::spec($bad, 'here');
                $this->fail('accepted '.json_encode($bad));
            } catch (InvalidArgumentException) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function test_the_payload_is_clamped_and_junk_plays_no_sheet(): void
    {
        $layer = ['frames' => ['path' => 'svg-assets/s.frames.webp', 'count' => 4, 'columns' => 9], 'frames_play' => 'loop', 'frames_fps' => 99];
        $frames = LayerFrames::payload($layer)['frames'];
        $this->assertStringEndsWith('/storage/svg-assets/s.frames.webp', $frames['url']);
        $this->assertSame(4, $frames['columns']);
        $this->assertSame('loop', $frames['play']);
        $this->assertSame(24.0, $frames['fps']);
        $this->assertSame('wind', LayerFrames::payload(['frames_play' => 'x'] + $layer)['frames']['play']);
        $this->assertNull(LayerFrames::payload(['frames' => ['path' => '../../etc/passwd', 'count' => 4]])['frames']);
        $this->assertNull(LayerFrames::payload([])['frames']);
    }
}
