<?php

declare(strict_types=1);

namespace Tests\Unit\Import;

use App\Services\Import\TwineParser;
use InvalidArgumentException;
use Tests\TestCase;

class TwineParserTest extends TestCase
{
    public function test_every_link_syntax_gives_label_and_target(): void
    {
        $links = TwineParser::links('[[Venice]] [[Go on->Next one]] [[Back home<-Leave]] [[Ask Niccolò | Node-Destination]] [[a->b->c]]');

        $this->assertSame([
            ['label' => 'Venice', 'target' => 'Venice'],
            ['label' => 'Go on', 'target' => 'Next one'],
            ['label' => 'Leave', 'target' => 'Back home'],
            ['label' => 'Ask Niccolò', 'target' => 'Node-Destination'],
            ['label' => 'a->b', 'target' => 'c'],
        ], $links);
    }

    public function test_an_empty_link_is_no_link(): void
    {
        $this->assertSame([], TwineParser::links('[[ ]] [[Label->]]'));
    }

    public function test_a_passage_splits_into_shot_lines_and_links(): void
    {
        $p = TwineParser::passage("A wide shot of the port.\n\nNARRATOR: The year is 1271.\n\nMARCO: (Shivering) Father!\n\nInteractive Choice:\n\n[[Go | Node-Embark]]");

        $this->assertSame('A wide shot of the port.', $p['shot']);
        $this->assertSame([['speaker' => 'NARRATOR', 'text' => 'The year is 1271.'], ['speaker' => 'MARCO', 'text' => 'Father!']], $p['lines']);
        $this->assertSame([['label' => 'Go', 'target' => 'Node-Embark']], $p['links']);
        $this->assertFalse($p['code']);
    }

    public function test_prose_without_speakers_is_narration_and_code_is_flagged_and_cut(): void
    {
        $p = TwineParser::passage("(set: \$gold to 5)You find a coin.\n\$gold coins now.\n[[On]]");

        $this->assertTrue($p['code']);
        $this->assertSame('', $p['shot']);
        $this->assertSame('You find a coin.', $p['lines'][0]['text']);
        $this->assertSame('NARRATOR', $p['lines'][0]['speaker']);
    }

    public function test_the_cast_list_leaves_out_the_narrator(): void
    {
        $cast = TwineParser::cast("* Narrator: Warm voice.\n* Marco Polo (17 years old): Curious.\n* Zafar: Trader.");

        $this->assertSame([
            ['name' => 'Marco Polo', 'description' => '17 years old. Curious.', 'colour' => ''],
            ['name' => 'Zafar', 'description' => 'Trader.', 'colour' => ''],
        ], $cast);
    }

    public function test_a_cast_line_can_name_a_signature_colour_and_a_setting_is_not_spoken(): void
    {
        $this->assertSame(
            [['name' => 'Beatrice', 'description' => 'Always in white.', 'colour' => 'white']],
            TwineParser::cast('* Beatrice: Always in white. Kleur: white.'),
        );

        $p = TwineParser::passage("SETTING: Florence, 1283\nA street.\nNARRATOR: She greets him.");
        $this->assertSame('Florence, 1283', $p['setting']);
        $this->assertSame('A street.', $p['shot']);
        $this->assertSame([['speaker' => 'NARRATOR', 'text' => 'She greets him.']], $p['lines']);
    }

    public function test_a_passage_name_reads_as_a_title(): void
    {
        $this->assertSame('Paper Money', TwineParser::title(' Node-PaperMoney'));
        $this->assertSame('Venice', TwineParser::title('Node-Venice'));
        $this->assertSame('The long road', TwineParser::title('The long road'));
        $this->assertSame('niccolo', TwineParser::key('NICCOLÒ'));
    }

    public function test_a_file_without_story_data_is_refused(): void
    {
        $this->expectException(InvalidArgumentException::class);

        TwineParser::story('<html><body><p>Not a story</p></body></html>');
    }

    public function test_story_reads_start_and_decodes_text(): void
    {
        $story = TwineParser::story('<tw-storydata name="Tale &amp; Co" startnode="2"><tw-passagedata pid="1" name="A">x</tw-passagedata><tw-passagedata pid="2" name=" B ">Tom &amp; &quot;Jerry&quot;</tw-passagedata></tw-storydata>');

        $this->assertSame('Tale & Co', $story['name']);
        $this->assertSame('B', $story['start']);
        $this->assertSame('Tom & "Jerry"', $story['passages']['B']['text']);
    }
}
