<?php

declare(strict_types=1);

namespace Tests\Unit\Art;

use App\Services\Art\HistoryLineStyle;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class HistoryLineStyleTest extends TestCase
{
    public static function prompts(): array
    {
        return [
            'base' => [HistoryLineStyle::BASE],
            'convert' => [HistoryLineStyle::convert('keep the howdah readable')],
            'sheet' => [HistoryLineStyle::sheet(['a', 'b', 'c', 'd'], 2, 2, 'c. 1300', 'Florence', figures: true)],
        ];
    }

    #[DataProvider('prompts')]
    public function test_every_prompt_carries_the_controlled_hatching_rule(string $prompt): void
    {
        foreach (['10 to 14% black coverage', 'single-direction hatching for medium shadows', 'no more than 20% of the shaded area', '65 to 75% white space', 'No solid black fills'] as $rule) {
            $this->assertStringContainsString($rule, $prompt);
        }
    }

    #[DataProvider('prompts')]
    public function test_no_prompt_carries_the_old_style_language(string $prompt): void
    {
        foreach (['dense crosshatching', 'halftone shading', 'etching', 'engraved', 'sumi-e', 'copperplate'] as $old) {
            $this->assertStringNotContainsStringIgnoringCase($old, $prompt);
        }
    }

    public function test_sheet_numbers_every_cell_in_reading_order(): void
    {
        $prompt = HistoryLineStyle::sheet(['a', 'b', 'c', 'd'], 2, 2, 'c. 1300', 'Florence');

        $this->assertStringContainsString('cell 1: a; cell 2: b; cell 3: c; cell 4: d', $prompt);
        $this->assertStringContainsString('A 2x2 sheet of 4', $prompt);
    }

    public function test_a_figure_sheet_keeps_every_figure_whole_inside_its_cell(): void
    {
        $prompt = HistoryLineStyle::sheet(['a', 'b', 'c', 'd'], 2, 2, 'c. 1300', 'Florence', figures: true);

        $this->assertStringContainsString('soles of both feet', $prompt);
        $this->assertStringContainsString('Never crop a figure at the cell edge', $prompt);
        $this->assertStringNotContainsString('soles of both feet', HistoryLineStyle::sheet(['a'], 1, 1, 'c. 1300', 'Florence'));
    }

    public function test_convert_appends_scene_constraints_only_when_given(): void
    {
        $this->assertStringEndsWith('keep the howdah readable', HistoryLineStyle::convert('keep the howdah readable'));
        $this->assertStringEndsWith(HistoryLineStyle::SAFETY, HistoryLineStyle::convert());
    }
}
