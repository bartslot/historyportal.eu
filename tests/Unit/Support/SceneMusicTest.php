<?php

declare(strict_types=1);

namespace Tests\Unit\Support;

use App\Support\SceneMusic;
use PHPUnit\Framework\TestCase;

class SceneMusicTest extends TestCase
{
    public function test_it_clamps_values_and_drops_unknown_or_repeated_tracks(): void
    {
        $clean = SceneMusic::normalize([
            'layers' => [
                ['track_id' => 1, 'volume' => 3, 'loop' => '1', 'loop_start' => 10, 'loop_end' => 5, 'fade_in' => 99],
                ['track_id' => 1, 'volume' => 0.2],
                ['track_id' => 9],
                ['track_id' => '2', 'volume' => -1, 'loop' => false, 'offset' => 12.345],
            ],
            'crossfade' => 50,
            'duck' => 0.25,
        ], [1, 2]);

        $this->assertCount(2, $clean['layers']);
        $this->assertSame(1.0, $clean['layers'][0]['volume']);
        $this->assertTrue($clean['layers'][0]['loop']);
        $this->assertNull($clean['layers'][0]['loop_end'], 'a loop end before its start means "the end of the file"');
        $this->assertSame(30.0, $clean['layers'][0]['fade_in']);
        $this->assertSame(2, $clean['layers'][1]['track_id']);
        $this->assertSame(0.0, $clean['layers'][1]['volume']);
        $this->assertSame(12.35, $clean['layers'][1]['offset']);
        $this->assertSame(10.0, $clean['crossfade']);
        $this->assertSame(0.25, $clean['duck']);
    }

    public function test_it_keeps_at_most_three_layers(): void
    {
        $layers = array_map(fn (int $id) => ['track_id' => $id], [1, 2, 3, 4]);

        $this->assertCount(SceneMusic::MAX_LAYERS, SceneMusic::normalize(['layers' => $layers], [1, 2, 3, 4])['layers']);
    }
}
