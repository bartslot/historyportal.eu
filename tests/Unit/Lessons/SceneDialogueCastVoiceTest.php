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
}
