<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use Tests\TestCase;
use UnexpectedValueException;

/**
 * The Tasman standard lesson is data: story.json (renderer-neutral), text/{lang}.json (words) and
 * cast.json (voices). The Dutch spec must merge into one scene per comic panel with the three team
 * games in their place, and every speaking character must have a voice.
 */
class TasmanSpecTest extends TestCase
{
    public function test_the_dutch_spec_has_a_scene_per_panel_and_three_team_games(): void
    {
        $spec = require resource_path('lessons/tasman-standard-nl.php');
        $story = json_decode((string) file_get_contents(resource_path('lessons/tasman/story.json')), true);
        $panels = array_sum(array_map(fn (array $s): int => count($s['panels']), $story['scenes']));

        $this->assertSame('nl', $spec['language']);
        $this->assertSame('serge-de-beer', $spec['avatar']);
        // The title screen reads the central question, never the spec key.
        $this->assertStringStartsWith('Waarom', $spec['details']);
        // What the class can expect (the banner's white strip); lines 1 and 3 are Bart's from Figma.
        $this->assertSame([
            'Hoe was het aan boord van een ontdekkingsreis?',
            'Wie woonden er al, waar Tasman aankwam?',
            'De gevaren en de gevolgen',
        ], $spec['expect']);
        $this->assertSame($spec['expect'], \App\Models\Lesson::cleanExpect($spec['expect']), 'each line fits the title screen as written');
        $this->assertFileExists(public_path('lesson-logos/'.$spec['translation_group'].'.svg'));
        $this->assertCount($panels + 3, $spec['scenes']);

        $games = array_values(array_filter($spec['scenes'], fn (array $s): bool => $s['type'] === 'team'));
        $this->assertSame(['budget', 'choose', 'discuss'], array_column($games, 'mode'));
        $this->assertSame('team', $spec['scenes'][array_key_last($spec['scenes'])]['type']);

        // Two power-meter moments: the anchor at the Mauritius departure, the wind on the empty ocean.
        $moments = array_values(array_filter(array_column($spec['scenes'], 'moment')));
        $this->assertSame(['Anker op', 'Wind in de zeilen'], array_column($moments, 'name'));
        foreach ($moments as $moment) {
            \App\Services\Lessons\MomentSpec::normalize(['react' => [], 'payoff' => ['type' => $moment['payoff']['type']]] + $moment);
            $this->assertCount(4, $moment['words']['right']);
        }
        // The departure from Mauritius is the harbour race; its after line names the crews.
        $this->assertTrue($moments[0]['race']['enabled']);
        $this->assertStringContainsString('{crew:heemskerck}', $moments[0]['race']['after']);
        $this->assertStringNotContainsString('{crew:zeehaen', $moments[0]['race']['after_solo']);
        $this->assertArrayNotHasKey('race', $moments[1]);

        foreach ($spec['scenes'] as $scene) {
            foreach ($scene['lines'] ?? [] as [$speaker, $words]) {
                $this->assertNotSame('', $words);
                if ($speaker !== 'narrator') {
                    $this->assertArrayHasKey($speaker, $spec['cast'], "{$speaker} is not in the cast");
                }
            }
        }
    }

    public function test_a_text_missing_a_line_throws(): void
    {
        $text = json_decode((string) file_get_contents(resource_path('lessons/tasman/text/nl.json')), true);
        unset($text['scenes']['S07']['lines']['S07-B.2']);

        $this->expectException(UnexpectedValueException::class);
        (require resource_path('lessons/tasman/spec.php'))('nl', $text);
    }
}
