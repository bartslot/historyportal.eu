<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use Tests\TestCase;

/**
 * The balloon inspector has one action: delete the balloon, named after it. "Remove tail" sat here
 * and deleted the whole balloon (Bart, 2026-10-16).
 */
class BalloonInspectorTest extends TestCase
{
    private function render(string $kind): string
    {
        return (string) $this->blade('<x-lesson.balloon-inspector :balloon="$balloon" />', [
            'balloon' => ['id' => 'b1', 'kind' => $kind, 'text' => 'Moet ik daarboven klimmen?', 'tail' => ['tip' => [0.4, 0.8]]],
        ]);
    }

    public function test_the_only_action_names_the_layer(): void
    {
        $html = $this->render('speech');

        $this->assertStringContainsString('Delete Speech balloon', $html);
        $this->assertStringNotContainsString('Remove tail', $html);
    }

    public function test_a_thought_balloon_is_named_as_one(): void
    {
        $this->assertStringContainsString('Delete Thought balloon', $this->render('thought'));
    }

    public function test_dutch_reads_tekstballon_verwijderen(): void
    {
        app()->setLocale('nl');

        $this->assertStringContainsString('Tekstballon verwijderen', $this->render('speech'));
    }
}
