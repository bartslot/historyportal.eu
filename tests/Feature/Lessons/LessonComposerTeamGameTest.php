<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Models\Lesson;
use App\Models\User;
use App\Services\LessonComposer;
use App\Services\LessonExporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

/**
 * Team games (kind=game, game_type=team) authored as data: the three modes land as cleaned
 * config.team rows with their own reset default, and a spec mistake fails the compose.
 */
class LessonComposerTeamGameTest extends TestCase
{
    use RefreshDatabase;

    private function compose(array $scenes): Lesson
    {
        return app(LessonComposer::class)->build([
            'key' => 'Team game test',
            'language' => 'nl',
            'scenes' => $scenes,
        ], User::factory()->create(), narrate: false);
    }

    private function threeModes(): array
    {
        return [
            ['type' => 'story', 'script' => 'Batavia, 1642.'],
            [
                'type' => 'team', 'mode' => 'budget', 'chapter' => 'De lading', 'minutes' => 5, 'teams' => 6,
                'capacity' => 16,
                'fixed' => [['name' => 'Watervaten', 'cost' => 3], ['name' => 'Rijst', 'cost' => 3], ['name' => 'Kompas', 'cost' => 1]],
                'items' => [
                    ['name' => 'Reservezeilen', 'why' => '<b>Gescheurd</b> zeildoek?', 'cost' => 3],
                    ['name' => 'Touw', 'why' => 'Een lijn herstellen.', 'cost' => 500],
                ],
                'reveal' => 'Een echt VOC-schip moest voorraden meenemen.',
                'needs' => 'Reservezeil in de storm.',
                'secret' => 'dropped',
            ],
            [
                'type' => 'team', 'mode' => 'choose', 'chapter' => 'De scheepsraad', 'minutes' => 4,
                'situation' => 'Het is 7 november 1642.',
                'cards' => [['title' => 'Weer', 'text' => 'Storm, hagel en sneeuw.', 'but' => 'Omkeren maakt de zee niet rustig.']],
                'options' => [
                    ['label' => 'A', 'text' => 'Verder naar het zuiden'],
                    ['label' => 'B', 'text' => 'Noordelijker, daarna naar het oosten', 'image' => 'javascript:alert(1)'],
                    ['label' => 'C', 'text' => 'Terugkeer plannen', 'image' => 'https://example.org/c.png'],
                ],
                'question' => 'Welke optie kiezen jullie?',
                'answer' => 'B',
                'source' => 'Tasman, journaal, 7 november 1642.',
            ],
            [
                'type' => 'team', 'mode' => 'discuss', 'chapter' => 'Slotvraag', 'minutes' => 99,
                'question' => 'Abel Tasman ontdekte Tasmanie en Nieuw-Zeeland. Klopt dat?',
                'prompts' => ['Voor wie waren deze landen onbekend?', 'Wat bleef onzeker?'],
                'evidence' => [['image' => '/storage/a.png', 'caption' => 'Europese kusttekening'], ['image' => '//evil.example/b.png', 'caption' => 'Bewoonde kust']],
                'closing' => 'Welke woorden kiezen jullie?',
            ],
        ];
    }

    public function test_the_three_modes_compose_into_team_game_scenes(): void
    {
        $lesson = $this->compose($this->threeModes());
        $games = $lesson->scenes()->where('kind', 'game')->orderBy('order')->get();

        $this->assertCount(3, $games);
        $this->assertSame(['team', 'team', 'team'], $games->pluck('game_type')->all());
        $this->assertSame([1, 2, 3], $games->pluck('game_segment_index')->all());
        $this->assertSame(['ready', 'ready', 'ready'], $games->pluck('status')->all());
        $this->assertSame(3, $lesson->game_split_count);

        [$budget, $choose, $discuss] = $games->map(fn ($s) => $s->config['team'])->all();

        $this->assertSame('budget', $budget['mode']);
        $this->assertSame(16, $budget['capacity']);
        $this->assertSame(6, $budget['teams']);
        $this->assertCount(3, $budget['fixed']);
        $this->assertSame('Gescheurd zeildoek?', $budget['items'][0]['why']);   // tags stripped
        $this->assertSame(99, $budget['items'][1]['cost']);                   // clamped
        $this->assertArrayNotHasKey('secret', $budget);                        // unknown key dropped
        $this->assertSame('De lading', $games[0]->chapter_name);
        $this->assertSame(5 * 60 + 120, $games[0]->duration_seconds);

        $this->assertSame('choose', $choose['mode']);
        $this->assertSame(1, $choose['answer']);                               // "B"
        $this->assertSame('', $choose['options'][1]['image']);                // javascript: dropped
        $this->assertSame('https://example.org/c.png', $choose['options'][2]['image']);
        $this->assertSame('Omkeren maakt de zee niet rustig.', $choose['cards'][0]['but']);

        $this->assertSame('discuss', $discuss['mode']);
        $this->assertSame(30, $discuss['minutes']);                            // clamped
        $this->assertSame('/storage/a.png', $discuss['evidence'][0]['image']);
        $this->assertSame('', $discuss['evidence'][1]['image']);              // protocol-relative dropped

        // Every game keeps its spec copy for the editor's reset.
        foreach ($games as $game) {
            $this->assertSame($game->config['team'], $game->config['team_default']);
        }
    }

    public function test_an_unknown_mode_fails_the_compose(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->compose([['type' => 'team', 'mode' => 'poll']]);
    }

    public function test_a_team_game_exports_back_as_a_team_entry(): void
    {
        $lesson = $this->compose($this->threeModes());

        $spec = app(LessonExporter::class)->toSpec($lesson);
        $entry = $spec['scenes'][1];

        $this->assertSame('team', $entry['type']);
        $this->assertSame('budget', $entry['mode']);
        $this->assertSame(16, $entry['capacity']);
        $this->assertArrayNotHasKey('extra_config', $entry);

        // And the export composes again into the same game.
        $rebuilt = app(LessonComposer::class)->build($spec, $lesson->teacher, narrate: false);
        $this->assertSame(
            $lesson->scenes()->where('order', 2)->first()->config['team'],
            $rebuilt->scenes()->where('order', 2)->first()->config['team'],
        );
    }
}
