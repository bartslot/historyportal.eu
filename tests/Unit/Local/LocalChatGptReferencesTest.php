<?php

declare(strict_types=1);

namespace Tests\Unit\Local;

use App\Services\Local\LocalChatGpt;
use PHPUnit\Framework\TestCase;

/** Story pictures send only style plates: ChatGPT must make a new picture, not edit the first plate. */
class LocalChatGptReferencesTest extends TestCase
{
    public function test_marked_inputs_are_references_only(): void
    {
        // As they arrive on the Mac through the relay: the server's in-N- prefix, then the mark.
        $this->assertTrue(LocalChatGpt::onlyReferences(['/tmp/x/1-in-1-styleref-colour-caesar.jpg', '/tmp/x/2-in-2-styleref-texture-watercolour.jpg']));
    }

    public function test_an_unmarked_first_image_is_edited(): void
    {
        $this->assertFalse(LocalChatGpt::onlyReferences(['/tmp/x/1-source.png', '/tmp/x/2-styleref-colour-caesar.jpg']));
        $this->assertFalse(LocalChatGpt::onlyReferences([]));
    }
}
