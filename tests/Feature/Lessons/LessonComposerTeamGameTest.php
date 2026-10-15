<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Models\Lesson;
use App\Models\SvgAsset;
use App\Models\User;
use App\Services\LessonComposer;
use App\Services\LessonExporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
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

    private function libraryAsset(string $ref): void
    {
        $path = "svg-assets/bundled/{$ref}.webp";
        Storage::disk('public')->put($path, "bytes-of-{$ref}");
        SvgAsset::factory()->create([
            'user_id' => null, 'source' => 'bundled', 'source_ref' => "{$ref}.webp", 'svg_path' => $path, 'title' => basename($ref),
        ]);
    }

    /** A budget game drawn as a ship's hold: the art from the library, the hold from the ship's .hold.json. */
    private function holdGame(): array
    {
        return [
            'type' => 'team', 'mode' => 'budget', 'capacity' => 16,
            'hold' => [
                'ship' => 'asset:history-line/props/tasman/hold_ship_cutaway',
                'backdrop' => 'asset:history-line/backdrops/tasman/batavia_roadstead',
                'draught' => 'maybe', 'zones' => null, 'junk' => 'dropped',
            ],
            'mission' => 'Wat nemen jullie mee?', 'minutes' => 3, 'timers' => ['compare' => 'x', 'sail' => 9999],
            'fixed' => [['id' => 'water', 'name' => 'Watervaten', 'cost' => 3, 'image' => 'asset:history-line/props/tasman/cargo_watervaten', 'tags' => ['Water', 'water', 'no spaces!']]],
            'items' => [
                ['id' => 'Rice', 'name' => 'Rijst', 'cost' => 3, 'image' => 'asset:history-line/props/tasman/cargo_rijst', 'tags' => ['food'], 'real' => true],
                ['id' => 'water', 'name' => 'Touw', 'cost' => 2, 'image' => 'javascript:alert(1)'],
                ['id' => 'not an id!', 'name' => 'Hout', 'cost' => 3],
            ],
        ];
    }

    public function test_a_hold_game_resolves_its_art_reads_the_painted_hold_and_cleans_the_rest(): void
    {
        Storage::fake('public');
        foreach (['props/tasman/hold_ship_cutaway', 'backdrops/tasman/batavia_roadstead', 'props/tasman/cargo_watervaten', 'props/tasman/cargo_rijst'] as $ref) {
            $this->libraryAsset("history-line/{$ref}");
        }
        $painted = json_decode((string) file_get_contents(resource_path('icons/history-line/props/tasman/hold_ship_cutaway.hold.json')), true);

        $scene = $this->compose([$this->holdGame()])->scenes()->firstOrFail();
        $team = $scene->config['team'];

        $this->assertSame('hold', $team['presentation']);                                // a ship: the hold by default
        $this->assertStringContainsString('hold_ship_cutaway', $team['hold']['ship']);
        $this->assertStringNotContainsString('asset:', $team['hold']['ship']);
        $this->assertStringContainsString('batavia_roadstead', $team['hold']['backdrop']);
        $this->assertCount(count($painted['zones']), $team['hold']['zones']);               // from the .hold.json
        $this->assertSame(count($painted['posts']), count($team['hold']['posts']));        // the posts too: cargo stands between them
        $this->assertEqualsWithDelta($painted['posts'][1]['x'], $team['hold']['posts'][1]['x'], 0.001);
        $this->assertEqualsWithDelta($painted['aspect'], $team['hold']['aspect'], 0.001);
        $this->assertTrue($team['hold']['draught']);                                       // the sinking ship: on unless off
        $this->assertArrayNotHasKey('junk', $team['hold']);
        $this->assertStringContainsString('cargo_rijst', $team['items'][0]['image']);
        $this->assertTrue($team['items'][0]['real']);
        $this->assertFalse($team['items'][1]['real']);
        $this->assertSame('', $team['items'][1]['image']);                                 // javascript: dropped
        $this->assertSame(['water'], $team['fixed'][0]['tags']);                            // slugged, unique, bad ones out
        $this->assertSame(['food'], $team['items'][0]['tags']);
        // Stable ids (plan §4): kept lower-case, a repeat made unique, a bad one replaced.
        $this->assertSame(['water', 'rice', 'water_', 'item_3'], [$team['fixed'][0]['id'], ...array_column($team['items'], 'id')]);
        // Each step's timer, clamped; the chapter estimate is the whole flow, in whole minutes.
        $this->assertSame(['mission' => 20, 'compare' => 60, 'exchange' => 60, 'sail' => 600], $team['timers']);
        $this->assertSame('Wat nemen jullie mee?', $team['mission']);
        $this->assertTrue($team['roles_on']);
        $this->assertSame((int) ceil((20 + 180 + 60 + 60 + 600) / 60) * 60, $scene->duration_seconds);
    }

    public function test_the_tasman_lading_runs_six_minutes_with_the_plan_ids_and_the_rotating_roles(): void
    {
        $game = json_decode((string) file_get_contents(resource_path('lessons/tasman/text/nl.json')), true)['games']['lading'];
        $team = \App\Services\Lessons\TeamGameSpec::normalize($game);

        $this->assertSame(['Kapitein', 'Bootsman', 'Verkenner', 'Stuurman'], $team['roles']);
        $this->assertSame(['water', 'compass'], array_column($team['fixed'], 'id'));
        $this->assertSame(['rice', 'ships_bread', 'meat', 'spare_sails', 'spare_rope', 'spare_timber', 'tools', 'firewood', 'charts', 'paper_ink', 'trade_textiles', 'trade_metal'], array_column($team['items'], 'id'));
        $this->assertSame(['water'], $team['fixed'][0]['tags']);
        $this->assertSame(['navigation'], $team['fixed'][1]['tags']);
        $this->assertSame(['fuel'], $team['items'][7]['tags']);
        $this->assertSame(16, $team['capacity']);
        $this->assertSame(4, $team['fixed'][0]['cost'] + $team['fixed'][1]['cost']);
        $this->assertSame(6 * 60, (int) ceil(\App\Services\Lessons\TeamGameSpec::holdSeconds($team) / 60) * 60);
    }

    public function test_a_hold_game_exports_its_library_refs_and_composes_back_the_same(): void
    {
        Storage::fake('public');
        foreach (['props/tasman/hold_ship_cutaway', 'backdrops/tasman/batavia_roadstead', 'props/tasman/cargo_watervaten', 'props/tasman/cargo_rijst'] as $ref) {
            $this->libraryAsset("history-line/{$ref}");
        }
        $lesson = $this->compose([$this->holdGame()]);

        $entry = app(LessonExporter::class)->toSpec($lesson)['scenes'][0];

        $this->assertSame('asset:history-line/props/tasman/hold_ship_cutaway', $entry['hold']['ship']);
        $this->assertSame('asset:history-line/backdrops/tasman/batavia_roadstead', $entry['hold']['backdrop']);
        $this->assertSame('asset:history-line/props/tasman/cargo_rijst', $entry['items'][0]['image']);
        $this->assertSame('hold', $entry['presentation']);
        $this->assertSame(['food'], $entry['items'][0]['tags']);
        $this->assertArrayNotHasKey('extra_config', $entry);

        $rebuilt = app(LessonComposer::class)->build(['key' => 'again', 'scenes' => [$entry]] + ['language' => 'nl'], $lesson->teacher, narrate: false);
        $again = $rebuilt->scenes()->firstOrFail()->config['team'];
        $this->assertSame($lesson->scenes()->firstOrFail()->config['team']['hold']['zones'], $again['hold']['zones']);
        $this->assertSame($lesson->scenes()->firstOrFail()->config['team']['items'][0]['tags'], $again['items'][0]['tags']);
    }

    public function test_a_budget_game_without_a_ship_falls_back_to_the_cards_and_the_teacher_may_choose(): void
    {
        $games = $this->compose([
            ['type' => 'team', 'mode' => 'budget'],
            ['type' => 'team', 'mode' => 'budget', 'presentation' => 'grid', 'hold' => ['ship' => '/storage/s.webp']],
            ['type' => 'team', 'mode' => 'budget', 'presentation' => 'carousel'],
        ])->scenes()->orderBy('order')->get()->map(fn ($s) => $s->config['team']['presentation'])->all();

        $this->assertSame(['grid', 'grid', 'grid'], $games);
    }
}
