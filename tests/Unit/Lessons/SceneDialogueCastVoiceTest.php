<?php

declare(strict_types=1);

namespace Tests\Unit\Lessons;

use App\Services\Lessons\SceneDialogue;
use PHPUnit\Framework\TestCase;

class SceneDialogueCastVoiceTest extends TestCase
{
    public function test_an_elevenlabs_voice_goes_to_elevenlabs(): void
    {
        $this->assertSame(['provider' => 'elevenlabs', 'voice' => 'gdTrLNuwWUaxC0z5n1j7'],
            SceneDialogue::castVoice('elevenlabs:gdTrLNuwWUaxC0z5n1j7'));
    }

    public function test_any_other_voice_is_azure(): void
    {
        $this->assertSame(['provider' => 'azure', 'voice' => 'nl-NL-Sander:MAI-Voice-2'],
            SceneDialogue::castVoice('nl-NL-Sander:MAI-Voice-2'));
    }

    public function test_a_silent_balloon_holds_for_its_reading_time(): void
    {
        $this->assertSame(1.8, SceneDialogue::readingTime('Daar!'));
        $this->assertSame(5.0, SceneDialogue::readingTime('een twee drie vier vijf zes zeven acht negen tien elf'));
    }

    public function test_a_balloon_shows_while_the_narrator_tells_it(): void
    {
        $lines = SceneDialogue::withBubbles([
            ['speaker' => 'narrator', 'text' => 'De jongen vraagt het.', 'start' => 2.0, 'end' => 6.5,
                'bubble' => ['speaker' => 'matroos', 'text' => 'Wat betekent dat?']],
            ['speaker' => 'narrator', 'text' => 'Kort.', 'start' => 7.0, 'end' => 7.4,
                'bubble' => ['speaker' => 'tasman', 'text' => 'Dat weten we niet.']],
        ]);

        $this->assertSame(['narrator', 'matroos', 'narrator', 'tasman'], array_column($lines, 'speaker'));
        $this->assertSame([2.0, 6.5], [$lines[1]['start'], $lines[1]['end']]);
        $this->assertSame(8.82, $lines[3]['end']);  // a short sentence still leaves the balloon up long enough to read
        $this->assertArrayNotHasKey('bubble', $lines[0]);
    }
}
