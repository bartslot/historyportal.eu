<?php

declare(strict_types=1);

namespace Tests\Unit\StoryVideo;

use App\Services\Art\HistoryLineStyle;
use App\Services\Art\StyleCheck;
use App\Services\StoryVideo\StoryVideoPrompts;
use PHPUnit\Framework\TestCase;

class StoryVideoPromptsTest extends TestCase
{
    public function test_a_character_sheet_wears_its_signature_colour_and_no_white_unless_it_owns_white(): void
    {
        $marco = StoryVideoPrompts::characterSheet(['name' => 'Marco Polo', 'colour' => 'red', 'look' => 'a boy of 17, brown hair'], '1271', 'Venice', ['Beatrice']);

        $this->assertStringContainsString('signature colour is red', $marco);
        $this->assertStringContainsString('no white garment: white belongs to Beatrice only', $marco);
        $this->assertStringContainsString('18% neutral grey', $marco);
        $this->assertStringContainsString(HistoryLineStyle::ONE_PASS, $marco);

        $beatrice = StoryVideoPrompts::characterSheet(['name' => 'Beatrice', 'colour' => 'white'], '1290', 'Florence', ['Beatrice']);
        $this->assertStringNotContainsString('no white garment', $beatrice);
    }

    public function test_a_world_shot_is_empty_and_uses_the_brief(): void
    {
        $prompt = StoryVideoPrompts::worldShot([
            'location' => 'Venice', 'year' => '1271', 'viewerPosition' => 'standing on the quay',
            'visualEvidence' => ['galleys at anchor'], 'avoidList' => ['gondolas with motors'],
        ], '13th century');

        $this->assertStringContainsString('Venice, 1271', $prompt);
        $this->assertStringContainsString('THE PLACE IS EMPTY', $prompt);
        $this->assertStringContainsString('galleys at anchor', $prompt);
        $this->assertStringContainsString('Leave out: gondolas with motors', $prompt);
        $this->assertStringContainsString('49 BC', StoryVideoPrompts::worldShot(['location' => 'Rubicon', 'year' => '-49'], ''));
    }

    public function test_a_clip_numbers_its_sheets_after_the_place_and_has_no_text(): void
    {
        $prompt = StoryVideoPrompts::clip('Shot 1, 0-4 s: wide.', 8, [['name' => 'Marco', 'colour' => 'red'], ['name' => 'Niccolò', 'colour' => 'blue']]);

        $this->assertStringContainsString('image 1 = the place only', $prompt);
        $this->assertStringContainsString("image 2 = Marco's character sheet", $prompt);
        $this->assertStringContainsString("image 3 = Niccolò's character sheet", $prompt);
        $this->assertStringContainsString('NO ON-SCREEN TEXT', $prompt);
        $this->assertStringContainsString('8 seconds', $prompt);
        $this->assertStringNotContainsString('THE SHEETS LOCK', StoryVideoPrompts::clip('x', 5, []));
    }

    public function test_the_style_check_flags_a_dark_picture_and_passes_a_pale_inked_one(): void
    {
        $this->assertArrayHasKey('too much black', StyleCheck::problems(['ink' => 40.0, 'pale' => 10.0, 'saturation' => 0.2]));
        $this->assertSame([], StyleCheck::problems(['ink' => 9.0, 'pale' => 45.0, 'saturation' => 0.15]));
        // A sheet's grey field is not paper.
        $this->assertSame([], StyleCheck::problems(['ink' => 9.0, 'pale' => 5.0, 'saturation' => 0.15], sheet: true));
        $this->assertStringContainsString('Correction', StyleCheck::correction(['too much black' => 'Less black.']));
    }
}
