<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\Lessons\FigureMouth;
use Tests\TestCase;

/** Where a figure's mouth is on its picture: its metadata first, else predicted from its pose. */
class FigureMouthTest extends TestCase
{
    public function test_a_figure_with_mouth_metadata_uses_it(): void
    {
        $this->assertSame([0.648, 0.131], FigureMouth::of('history-line/figures/dante/beatrice')['mouth']);
    }

    public function test_the_pose_comes_from_the_manifest_and_a_cut_off_figure_is_half(): void
    {
        $this->assertSame('standing', FigureMouth::pose('history-line/figures/dante/beatrice'));
        $this->assertSame('half', FigureMouth::pose('history-line/figures/dante/dante-giovane'));
        $this->assertSame('seated', FigureMouth::pose('history-line/figures/dante/dante-scrive'));
        $this->assertSame('rider', FigureMouth::pose('history-line/figures/soldiers/cavaliere-guelfo'));
    }

    public function test_a_figure_faces_the_way_its_mouth_sits_from_its_crown(): void
    {
        // Both look to the viewer's right on their sheets.
        $this->assertSame(1, FigureMouth::of('history-line/figures/dante/beatrice')['facing']);
        $this->assertSame(1, FigureMouth::of('history-line/figures/dante/dante-giovane')['facing']);
    }

    public function test_the_prediction_lands_near_the_measured_mouth(): void
    {
        // Measured by eye on the sheets: Beatrice (standing) 0.131 down, young Dante (half) 0.219.
        [, $standing] = FigureMouth::predict('history-line/figures/dante/beatrice');
        [, $half] = FigureMouth::predict('history-line/figures/dante/dante-giovane');

        $this->assertEqualsWithDelta(0.131, $standing, 0.015);
        $this->assertEqualsWithDelta(0.219, $half, 0.015);
    }
}
