<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Services\Editor\Drawings;
use PHPUnit\Framework\TestCase;

/** The eraser works on the line as it is drawn, and never drops what it did not touch. */
class DrawingsEraseTest extends TestCase
{
    public function test_it_rubs_the_curve_that_shows_not_its_control_points(): void
    {
        $pen = ['tool' => 'pen', 'colour' => '#111827', 'width' => 4.0, 'points' => [[10.0, 50.0], [50.0, 10.0], [90.0, 50.0]]];
        // the curve passes through (45, 25); the control point (50, 10) is empty paper
        $this->assertSame([$pen], Drawings::erase([$pen], [[50.0, 10.0]], 1.2, 1.0), 'rubbing empty paper leaves it');
        $this->assertCount(2, Drawings::erase([$pen], [[45.0, 25.0]], 1.2, 1.0), 'rubbing the curve cuts it');
    }

    public function test_a_long_piece_is_kept_whole(): void
    {
        $zigzag = array_map(fn (int $i) => [($i % 2) * 3.0 + 10.0, $i * 0.05], range(0, 1499));
        $pen = ['tool' => 'pen', 'colour' => '#111827', 'width' => 4.0, 'points' => $zigzag];
        $out = Drawings::erase([$pen], [[10.0, 0.0]], 0.6, 1.0);
        $last = end($out)['points'];
        $this->assertEqualsWithDelta(74.95, end($last)[1], 0.5, 'the far end is still there');
        foreach ($out as $s) {
            $this->assertLessThanOrEqual(2000, count($s['points']));
        }
    }
}
