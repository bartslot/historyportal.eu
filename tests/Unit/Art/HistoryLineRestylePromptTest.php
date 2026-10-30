<?php

declare(strict_types=1);

namespace Tests\Unit\Art;

use App\Services\Art\HistoryLineStyle;
use PHPUnit\Framework\TestCase;

class HistoryLineRestylePromptTest extends TestCase
{
    public function test_the_ink_pass_carries_bart_hatching_rule_verbatim_and_no_colour(): void
    {
        $ink = HistoryLineStyle::restyleInk();

        $this->assertStringContainsString('approximately 10 to 14% black coverage. Use single-direction hatching for medium shadows and no more than two intersecting directions for deep shadows. Keep 65 to 75% white space. Cross-hatching should occupy no more than 20% of the shaded area.', $ink);
        $this->assertStringContainsString('composition, framing, subject, pose, scale and identity', $ink);
        $this->assertStringContainsString('No solid black fills', $ink);
        $this->assertStringContainsString('No colour', $ink);
        $this->assertStringNotContainsString(HistoryLineStyle::COLOUR_PROMPT, $ink);
    }

    public function test_the_colour_pass_is_the_edit_lock_plus_bart_colour_prompt_plus_the_cloud_addendum(): void
    {
        $colour = HistoryLineStyle::restyleColour();

        $this->assertStringStartsWith(HistoryLineStyle::EDIT_LOCK, $colour);
        $this->assertStringContainsString(HistoryLineStyle::COLOUR_PROMPT, $colour);
        $this->assertStringContainsString(HistoryLineStyle::CLOUD_ADDENDUM, $colour);
        $this->assertStringContainsString('blooms, backruns, granulation, tide-lines, paper tooth and uneven glazes', $colour);
        $this->assertStringContainsString('no repainting of linework', $colour);
        $this->assertLessThan(strpos($colour, 'Color the existing'), strpos($colour, 'locked source'));
    }

    public function test_a_figure_stays_whole_and_loses_baked_in_props_in_both_passes(): void
    {
        $this->assertStringNotContainsString('head to feet', HistoryLineStyle::restyleInk());

        foreach ([HistoryLineStyle::restyleInk(figure: true, era: 'the year 1642'), HistoryLineStyle::restyleColour(figure: true)] as $prompt) {
            $this->assertStringContainsString('head to feet, nothing cropped', $prompt);
            $this->assertStringContainsString('Remove tables, crates', $prompt);
        }
        $this->assertStringContainsString('the year 1642', HistoryLineStyle::restyleInk(figure: true, era: 'the year 1642'));
    }

    public function test_every_anchor_file_exists_and_each_pass_has_its_own_kind(): void
    {
        $this->assertNotSame(HistoryLineStyle::anchors(1, true), HistoryLineStyle::anchors(1, false));
        $this->assertContains('texture-watercolour.jpg', HistoryLineStyle::anchors(2, false));
        $this->assertContains('texture-watercolour.jpg', HistoryLineStyle::anchors(2, true));

        foreach ([1, 2] as $pass) {
            foreach ([true, false] as $figure) {
                foreach (HistoryLineStyle::anchors($pass, $figure) as $file) {
                    $this->assertFileExists(dirname(__DIR__, 3).'/resources/art/style-anchors/history-lines/'.$file);
                }
            }
        }
    }
}
