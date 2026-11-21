<?php

declare(strict_types=1);

namespace Tests\Feature\Import;

use App\Livewire\Wizard\ImportNotes;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\SvgAsset;
use App\Models\User;
use App\Services\Editor\Characters;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/** "Import from Twine": a Twine story becomes a lesson of empty 3D scenes with Decision points, cast and balloons. */
class TwineImportTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        config(['worlds' => ['test-port' => [
            'label' => 'Port', 'continent' => 'Europe', 'region' => 'Italy', 'bundle' => 'nl-prehistory', 'thumb' => 'worlds/port.webp',
            'set' => ['sky' => 'sky-summer-01', 'groundSlots' => [['asset' => 'meadow-01', 'from_m' => 0]], 'layers' => [['asset' => 'bg-farmland-01', 'depth' => 'bg', 'x' => 0.5]]],
        ]]]);
        $this->teacher = User::factory()->teacher()->create();
    }

    private function upload(string $html, string $world = 'test-port')
    {
        return $this->actingAs($this->teacher)->post(route('teacher.lessons.import-twine'), [
            'story' => UploadedFile::fake()->createWithContent('story.html', $html),
            'world' => $world,
        ]);
    }

    private function marcoPolo(): Lesson
    {
        $this->upload((string) file_get_contents(base_path('tests/Fixtures/twine/marco-polo.html')))->assertRedirect();

        return Lesson::where('teacher_id', $this->teacher->id)->sole();
    }

    /** @return \Illuminate\Support\Collection<string, Scene> by title */
    private function scenes(Lesson $lesson)
    {
        return $lesson->scenes()->orderBy('order')->get()->keyBy('chapter_name');
    }

    /** @return list<array{0: string, 1: string}> a scene's choices as [button text, scene it jumps to] */
    private function choices(Scene $scene): array
    {
        return collect($scene->config['links'] ?? [])->map(fn ($l) => [$l['label'], Scene::find($l['to'])->chapter_name])->all();
    }

    public function test_the_story_becomes_twelve_3d_scenes_in_reading_order_linked_the_way_twine_links_them(): void
    {
        $lesson = $this->marcoPolo();
        $scenes = $lesson->scenes()->orderBy('order')->get();
        $byName = $scenes->keyBy('chapter_name');

        $this->assertSame('Marco Polo', $lesson->title);
        $this->assertSame(
            ['Venice', 'Destination', 'Cargo', 'Embark', 'Hormuz', 'Silk', 'Spices', 'Pamir', 'Cambaluc', 'Paper Money', 'Coal', 'Kublai Khan'],
            $scenes->pluck('chapter_name')->all(),
        );
        $this->assertTrue($scenes->every(fn (Scene $s) => $s->kind === 'stage25d' && $s->config['stage25d']['bundle'] === 'nl-prehistory' && $s->config['stage25d']['world_id'] === 'test-port'));
        $this->assertSame(
            [['Ask Niccolò where you are headed', 'Destination'], ['Watch the sailors loading the ship', 'Cargo']],
            $this->choices($byName['Venice']),
        );
        // both choices go on to the same scene, each with its own button, as in Twine
        $this->assertSame([['Board the galley', 'Embark']], $this->choices($byName['Destination']));
        $this->assertSame([['Board the galley', 'Embark']], $this->choices($byName['Cargo']));
        $this->assertSame([['Leave the market and head toward the mountains', 'Pamir']], $this->choices($byName['Spices']));
        // the link back is kept: the last scene offers the journey again
        $this->assertSame([['Replay the journey from Venice', 'Venice']], $this->choices($byName['Kublai Khan']));
        $this->assertTrue($scenes->every(fn (Scene $s) => $s->branch_role === null && empty($s->config['ending'])));
        $this->assertSame(15, $lesson->import_report['choices']);
        // the narrator asks before reading the choices out, in turn one of three lines, naming the story's hero
        $this->assertSame('So now Marco is doubtful... but what would you choose?', $byName['Venice']->config['links_prompt']);
        $this->assertArrayNotHasKey('links_prompt', $byName['Kublai Khan']->config);   // one button is not a choice: nothing to ask
    }

    public function test_the_narration_is_the_narrators_words_exactly_and_the_shot_is_the_note(): void
    {
        $scenes = $this->scenes($this->marcoPolo());

        $this->assertSame(
            'The year is 1271. Venice is the Queen of the Seas, a crossroads of merchants and adventurers. On this dock stands a seventeen-year-old boy about to embark on the longest journey in history.',
            $scenes['Venice']->script_segment,
        );
        $this->assertSame(
            'In the Middle Ages, Venetian glass was considered a technological marvel, a true currency of immense value.',
            $scenes['Cargo']->script_segment,
        );
        $this->assertSame(6, count(explode("\n\n", $scenes['Destination']->script_segment)));
        $this->assertSame(35, $scenes['Venice']->duration_seconds);   // the lines on one clock: 3 narrated sentences, 3 balloons
        $this->assertEquals(35, $scenes['Venice']->config['timeline']['duration']);
        $this->assertStringStartsWith("A bird's-eye panoramic shot of the port of Venice in 1271.", $scenes['Venice']->config['shot_note']);
    }

    public function test_speakers_stand_on_the_stage_and_speak_in_silent_balloons(): void
    {
        $scenes = $this->scenes($this->marcoPolo());
        $figures = fn (Scene $s) => collect($s->config['stage25d']['set']['layers'])->pluck('figure')->filter()->values()->all();

        $this->assertSame(['marco-polo', 'niccolo-polo'], $figures($scenes['Venice']));
        $this->assertSame(['zafar', 'marco-polo'], $figures($scenes['Hormuz']));
        $this->assertSame(['kublai-khan', 'marco-polo'], $figures($scenes['Kublai Khan']));
        $this->assertSame(['marco-polo', 'niccolo-polo'], $figures($scenes['Pamir']));

        $lines = collect($scenes['Venice']->config['lines']);
        // Niccolò's long line is two balloons, whole sentences, one after the other
        $this->assertSame(['marco-polo', 'niccolo-polo', 'niccolo-polo'], $lines->pluck('speaker')->all());
        $this->assertSame('Precious goods, Marco. Murano glass, woolen fabrics, and silver. We\'ll need them to trade along the road to the East.', $lines[1]['text']);
        $this->assertSame('Are you ready to leave home? We won\'t be back for many years.', $lines[2]['text']);
        $this->assertGreaterThan($lines[1]['start'], $lines[2]['start']);
        $this->assertStringStartsWith('Father, I didn\'t think', $lines[0]['text']);
        $this->assertSame('stage25d:marco-polo', $lines[0]['figure']['asset_id']);
        $this->assertGreaterThan($lines[0]['start'], $lines[1]['start']);
        $this->assertGreaterThan(0, $lines[0]['start'], 'the narrator speaks first');
        $this->assertNotContains('narrator', $lines->pluck('speaker')->all());
        $this->assertSame('Father... even our breath freezes! And why won\'t our campfire burn properly up here?', $scenes['Pamir']->config['lines'][0]['text']);

        // a figure layer is one of the teacher's characters, made from a kit body and marked to dress later
        $layer = collect($scenes['Venice']->config['stage25d']['set']['layers'])->firstWhere('figure', 'marco-polo');
        $marco = SvgAsset::find(Characters::idOf($layer['asset']));
        $this->assertSame('Marco Polo', $marco->title);
        $this->assertSame($this->teacher->id, $marco->user_id);
        $this->assertTrue($marco->character['auto']);
        $this->assertSame('man', $marco->character['recipe']['body']);
        $this->assertSame(7.0, (float) $layer['z']);
        $this->assertSame(4, Characters::of($this->teacher)->count());
    }

    public function test_an_own_character_with_the_same_name_is_used(): void
    {
        $zafar = Characters::starter($this->teacher, 'Zafar', 'man');
        $lesson = $this->marcoPolo();
        $layer = collect($this->scenes($lesson)['Hormuz']->config['stage25d']['set']['layers'])->firstWhere('figure', 'zafar');

        $this->assertSame('chr-'.$zafar->id, $layer['asset']);
        $this->assertSame(4, Characters::of($this->teacher)->count());
        $this->assertSame(['Marco Polo', 'Niccolò Polo', 'Zafar', 'Kublai Khan'], array_column($lesson->import_report['cast'], 'name'));
        $this->assertFalse($lesson->import_report['seen']);
    }

    public function test_a_file_that_is_not_a_twine_story_is_refused(): void
    {
        $this->upload('<html><body><h1>My essay</h1></body></html>')->assertSessionHasErrors('story');
        $this->upload((string) file_get_contents(base_path('tests/Fixtures/twine/marco-polo.html')), 'no-such-world')->assertSessionHasErrors('world');

        $this->assertSame(0, Lesson::count());
    }

    public function test_story_code_and_shapes_that_do_not_fit_still_import_with_notes(): void
    {
        $html = '<tw-storydata name="Gold" startnode="1" format="Harlowe">'
            .'<tw-passagedata pid="1" name="Start">(set: $gold to 5)NARRATOR: You have $gold coins.'."\n".'[[Left]] [[Middle]] [[Right]]</tw-passagedata>'
            .'<tw-passagedata pid="2" name="Left">NARRATOR: Left.'."\n".'[[End]]</tw-passagedata>'
            .'<tw-passagedata pid="3" name="Middle">NARRATOR: Middle.'."\n".'[[End]]</tw-passagedata>'
            .'<tw-passagedata pid="4" name="Right">NARRATOR: Right.</tw-passagedata>'
            .'<tw-passagedata pid="5" name="End">NARRATOR: The end.</tw-passagedata>'
            .'<tw-passagedata pid="6" name="Lost">NARRATOR: Nobody comes here.</tw-passagedata>'
            .'</tw-storydata>';

        $this->upload($html)->assertRedirect();
        $lesson = Lesson::sole();

        $scenes = $lesson->scenes()->orderBy('order')->get()->keyBy('chapter_name');
        $this->assertSame(['Start', 'Left', 'Middle', 'Right', 'End', 'Lost'], $scenes->keys()->all());
        $this->assertSame(0, $lesson->scenes()->whereNotNull('branch_role')->count());
        // three choices are three buttons; a passage with no links ends the lesson
        $this->assertSame([['Left', 'Left'], ['Middle', 'Middle'], ['Right', 'Right']], $this->choices($scenes['Start']));
        $this->assertSame([['End', 'End']], $this->choices($scenes['Middle']));
        $this->assertSame(
            ['Start' => false, 'Left' => false, 'Middle' => false, 'Right' => true, 'End' => true, 'Lost' => true],
            $scenes->map(fn (Scene $s) => ($s->config['ending'] ?? false) === true)->all(),
        );
        $notes = implode("\n", $lesson->import_report['notes']);
        $this->assertStringContainsString('Start has story code', $notes);
        $this->assertStringContainsString('No link leads to Lost', $notes);
    }

    public function test_the_notes_show_once_and_close_for_good(): void
    {
        $lesson = $this->marcoPolo();

        Livewire::actingAs($this->teacher)->test(ImportNotes::class, ['lesson' => $lesson])
            ->assertSee('Imported from Twine: 12 scenes, 15 choices.')
            ->call('dismiss')
            ->assertDontSee('Imported from Twine');
        $this->assertTrue($lesson->refresh()->import_report['seen']);
    }

    public function test_the_player_gets_the_choices_without_meters(): void
    {
        $lesson = $this->marcoPolo();

        $html = $this->actingAs($this->teacher)->get(route('lesson.play', ['lessonCode' => $lesson->lesson_code]))->assertOk()->getContent();
        preg_match('/window\.LESSON = (\{.*?\});\n/s', $html, $m);
        $data = json_decode($m[1], true);
        $scenes = collect($data['scenes']);

        // scene-links.js reads config.links: each button names the id of a scene the player has
        $links = $scenes[0]['config']['links'];
        $this->assertSame(['Ask Niccolò where you are headed', 'Watch the sailors loading the ship'], array_column($links, 'label'));
        $this->assertSame([$scenes[1]['id'], $scenes[2]['id']], array_column($links, 'to'));
        $this->assertSame([null], $scenes->pluck('branch_role')->unique()->values()->all());
        $this->assertEmpty($data['game_config']['meters'] ?? []);
    }
}
