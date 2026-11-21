<?php

declare(strict_types=1);

namespace Tests\Unit\Lessons;

use App\Services\Lessons\ChoicePrompt;
use App\Services\Lessons\SceneLinks;
use Tests\TestCase;

/** What the narrator says when a scene's choices fade in (Bart 2026-11-21: "make sure the choices are also narrated"). */
class ChoicePromptTest extends TestCase
{
    public function test_the_narrator_asks_then_reads_each_choice_as_a_question(): void
    {
        $config = ['links_prompt' => 'What would you choose?', 'links' => [['label' => 'Stay in Venice.', 'to' => 1], ['label' => 'Sail east', 'to' => 2]]];

        $this->assertSame('What would you choose? Stay in Venice? Or Sail east?', ChoicePrompt::spoken($config));
        $this->assertSame('Wat zou jij kiezen? Stay in Venice? Of Sail east?', ChoicePrompt::spoken(['links_prompt' => 'Wat zou jij kiezen?'] + $config, 'nl'));
    }

    public function test_nothing_is_said_where_no_choice_card_shows(): void
    {
        $this->assertSame('', ChoicePrompt::spoken(['ending' => true, 'links_prompt' => 'Hm?']));
        $this->assertSame('', ChoicePrompt::spoken(['links_prompt' => 'Hm?', 'links' => [['label' => '', 'to' => 3]]]));   // a straight jump
        $this->assertSame('', ChoicePrompt::spoken(['links_prompt' => 'Hm?', 'links' => [['label' => 'Go on', 'to' => 3]]]));   // one button, no choice
        $this->assertSame('', ChoicePrompt::spoken(['links_prompt' => 'Hm?', 'links' => [['label' => 'Go', 'to' => 3], ['label' => 'Stay', 'to' => null]]]));   // not set up yet
        $this->assertSame('Hm?', ChoicePrompt::spoken(['links_prompt' => 'Hm?', 'links' => [['label' => '', 'to' => 3], ['label' => '', 'to' => 4]]]));
    }

    public function test_three_lines_take_turns_with_and_without_a_name(): void
    {
        $this->assertSame('So now Marco is doubtful... but what would you choose?', ChoicePrompt::lineFor('Marco', 'en', 0));
        $this->assertSame('What should Marco do now? Think it over, then choose.', ChoicePrompt::lineFor('Marco', 'en', 1));
        $this->assertSame('The story could go either way. If you were Marco, what would you do?', ChoicePrompt::lineFor('Marco', 'en', 2));
        $this->assertSame('So now Marco is doubtful... but what would you choose?', ChoicePrompt::lineFor('Marco', 'en', 3));
        $this->assertSame('The story could go either way. What would you do?', ChoicePrompt::lineFor(null, 'en', 2));
        $this->assertSame('Nu twijfelt Marco... maar wat zou jij kiezen?', ChoicePrompt::lineFor('Marco', 'nl', 0));
        $this->assertSame('Marco', ChoicePrompt::firstName([['name' => 'Marco Polo (17)']]));
    }

    public function test_removing_the_choices_removes_what_the_narrator_says(): void
    {
        $config = SceneLinks::into(['links_prompt' => 'Hm?', 'links_audio' => ['path' => 'x'], 'links' => [['label' => 'A', 'to' => 1]]], [], true);

        $this->assertSame(['ending' => true], $config);
    }
}
