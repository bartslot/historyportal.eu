<?php

declare(strict_types=1);

namespace Tests\Feature\Stage25d;

use App\Models\Lesson;
use App\Models\Narrator;
use App\Models\Scene;
use App\Models\User;
use App\Services\Stage25d\LessonImporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use Tests\TestCase;

class LessonImporterTest extends TestCase
{
    use RefreshDatabase;

    private string $audio;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->audio = sys_get_temp_dir().'/s25d-audio-'.uniqid();
        mkdir($this->audio.'/mini', 0777, true);
        foreach (['sc01', 'sc02'] as $f) { // sc03 has no recording on purpose
            file_put_contents("{$this->audio}/mini/{$f}.mp3", 'ID3fake');
        }
    }

    protected function tearDown(): void
    {
        array_map('unlink', glob($this->audio.'/mini/*') ?: []);
        @rmdir($this->audio.'/mini');
        @rmdir($this->audio);
        parent::tearDown();
    }

    private function lesson(): array
    {
        return json_decode((string) file_get_contents(base_path('tests/Fixtures/stage25d/mini-lesson.json')), true);
    }

    public function test_imports_stage_scenes_with_audio_balloons_and_a_quiz(): void
    {
        $teacher = User::factory()->create();
        $r = app(LessonImporter::class)->import($this->lesson(), $teacher, $this->audio);

        $this->assertSame(3, $r['scenes']);
        $this->assertSame(2, $r['audio']);
        $this->assertSame(2, $r['balloons']);
        $this->assertSame(1, $r['quizzes']);
        $this->assertCount(1, $r['skipped'], 'power-meter is reported, not dropped');

        $lesson = Lesson::findOrFail($r['lesson_id']);
        $this->assertSame('25d:mini', $lesson->topic);
        $this->assertSame('nl', $lesson->language);
        $scenes = $lesson->scenes()->orderBy('order')->get();
        // sc01, sc02, its quiz, sc03
        $this->assertSame(['stage25d', 'stage25d', 'game', 'stage25d'], $scenes->pluck('kind')->all());

        $first = $scenes[0];
        $this->assertTrue($first->isStage25d());
        $this->assertTrue($first->drawsOwnBackdrop());
        $this->assertSame('nl-prehistory', $first->config['stage25d']['bundle']);
        $this->assertSame('push', $first->config['stage25d']['camera']['move']);
        $this->assertSame('stone-chamber-01', $first->config['stage25d']['set']['layers'][0]['asset']);
        $lines = $first->config['lines'];
        $this->assertSame('Hij zit muurvast!', $lines[0]['text']);
        // scene time 3.3-5.7 on a narration that starts 1.0 s in = 2.3-4.7 on the narration's clock
        $this->assertEqualsWithDelta(2.3, $lines[0]['start'], 0.001);
        $this->assertEqualsWithDelta(4.7, $lines[0]['end'], 0.001);
        // the speaker with a painted figure layer: the tail points at its head on the stage, facing left
        $this->assertSame(['asset_id' => 'stage25d:meisje', 'mouth' => [0.5, 0.3], 'facing' => -1], $lines[0]['figure']);
        $this->assertNull($lines[1]['figure'], 'a voice with no figure on stage has no tail');
        // the figures ride along verbatim, next to the figure layers the director made from them
        $this->assertSame('meisje', $first->config['stage25d']['figures'][0]['char']);
        $this->assertSame('left', $first->config['stage25d']['figures'][0]['facing']);
        $this->assertSame('meisje', $first->config['stage25d']['set']['layers'][1]['figure']);
        $this->assertTrue($first->hasFreshAudio());
        Storage::disk('public')->assertExists($first->audio_path);

        $this->assertNull($scenes[3]->audio_path);
        $this->assertSame(1, $lesson->quizQuestions()->count());
        $this->assertSame(0, $lesson->quizQuestions()->first()->correct_index);
    }

    public function test_second_import_refuses_without_force_and_rebuilds_with_it(): void
    {
        $teacher = User::factory()->create();
        $importer = app(LessonImporter::class);
        $first = $importer->import($this->lesson(), $teacher, $this->audio);

        try {
            $importer->import($this->lesson(), $teacher, $this->audio);
            $this->fail('expected a refusal');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('--force', $e->getMessage());
        }

        $again = $importer->import($this->lesson(), $teacher, $this->audio, force: true);
        $this->assertSame($first['lesson_id'], $again['lesson_id'], 'same lesson row, no duplicate');
        $this->assertSame(4, Scene::where('lesson_id', $again['lesson_id'])->count());
        $this->assertSame(1, Lesson::where('topic', '25d:mini')->count());
    }

    public function test_dry_run_writes_nothing(): void
    {
        $teacher = User::factory()->create();
        $r = app(LessonImporter::class)->import($this->lesson(), $teacher, $this->audio, dryRun: true);

        $this->assertSame(3, $r['scenes']);
        $this->assertSame(0, Lesson::count());
        $this->assertSame(0, Scene::count());
    }

    public function test_rejects_a_lesson_without_a_valid_bundle(): void
    {
        $lesson = $this->lesson();
        $lesson['bundle'] = '../etc';
        $this->expectException(InvalidArgumentException::class);
        app(LessonImporter::class)->import($lesson, User::factory()->create(), $this->audio);
    }

    public function test_the_named_narrator_becomes_the_lesson_narrator(): void
    {
        $joe = Narrator::factory()->create(['slug' => 'grandfather-joe']);
        $lesson = $this->lesson();
        $lesson['narrator'] = ['slug' => 'grandfather-joe', 'provider' => 'elevenlabs', 'voice' => 'x'];
        $lesson['narration'] = ['provider' => 'elevenlabs', 'voice' => 'x'];

        $r = app(LessonImporter::class)->import($lesson, User::factory()->create(), $this->audio);

        $row = Lesson::findOrFail($r['lesson_id']);
        $this->assertSame($joe->id, $row->avatar_id);
        $voiced = $row->scenes()->whereNotNull('audio_path')->first();
        $this->assertSame(['elevenlabs', 'x'], [$voiced->audio_provider, $voiced->audio_voice]);
    }

    public function test_an_unknown_narrator_is_refused(): void
    {
        $lesson = $this->lesson();
        $lesson['narrator'] = ['slug' => 'nobody'];
        $this->expectException(InvalidArgumentException::class);
        app(LessonImporter::class)->import($lesson, User::factory()->create(), $this->audio);
    }

    /** sc01, then group 1: question sc10, option_a sc11+sc12, option_b sc13, then sc02 (rejoin, quiz) and sc03. */
    private function branchedLesson(): array
    {
        $lesson = $this->lesson();
        $lesson['game'] = ['meters' => [
            ['key' => 'moed', 'label' => 'Moed', 'icon' => 'ti-flame', 'start' => 60],
            ['key' => 'voedsel', 'label' => 'Voedsel', 'start' => 140],
        ], 'fail_threshold' => 0];
        $shot = fn (string $id, array $branch, ?array $interaction = null) => array_merge($lesson['scenes'][0], ['id' => $id, 'audio' => null, 'branch' => $branch, 'interaction' => $interaction]);
        array_splice($lesson['scenes'], 1, 0, [
            $shot('sc10', ['group' => 1, 'role' => 'question', 'labels' => ['a' => 'Trek de steen', 'b' => 'Wacht op hulp']]),
            $shot('sc11', ['group' => 1, 'role' => 'option_a', 'effects' => ['deltas' => ['moed' => 10, 'voedsel' => -5], 'consequence_line' => 'Iedereen is moe.', 'historical_note' => 'Zo ging het echt.']]),
            $shot('sc12', ['group' => 1, 'role' => 'option_a'], $lesson['scenes'][1]['interaction']),
            $shot('sc13', ['group' => 1, 'role' => 'option_b', 'effects' => ['deltas' => ['moed' => -40, 'goud' => 9]]]),
        ]);

        return $lesson;
    }

    public function test_a_branching_lesson_becomes_a_story_game_with_option_runs(): void
    {
        $r = app(LessonImporter::class)->import($this->branchedLesson(), User::factory()->create(), $this->audio);

        $this->assertSame(1, $r['branches']);
        $this->assertContains('sc12: interaction on a branch scene (the choice is the interaction)', $r['skipped']);
        $lesson = Lesson::findOrFail($r['lesson_id']);
        $this->assertSame('story_game', $lesson->game_type);
        $this->assertSame('branching', $lesson->narrative_framework->value);
        $this->assertSame([
            ['key' => 'moed', 'label' => 'Moed', 'icon' => 'ti-flame', 'start' => 60],
            ['key' => 'voedsel', 'label' => 'Voedsel', 'icon' => '', 'start' => 100],
        ], $lesson->game_config['meters']);
        $this->assertSame(0, $lesson->game_config['fail_threshold']);

        $scenes = $lesson->scenes()->orderBy('order')->get();
        // sc01, question, option_a x2, option_b, sc02 + its quiz, sc03: no quiz scene inside the branch
        $this->assertSame(['stage25d', 'stage25d', 'stage25d', 'stage25d', 'stage25d', 'stage25d', 'game', 'stage25d'], $scenes->pluck('kind')->all());
        $this->assertSame([null, 1, 1, 1, 1, null, null, null], $scenes->pluck('branch_group')->all());
        $this->assertSame([null, 'question', 'option_a', 'option_a', 'option_b', null, null, null], $scenes->pluck('branch_role')->all());
        $this->assertSame([null, null, 'Trek de steen', null, 'Wacht op hulp', null, null, null], $scenes->pluck('branch_choice_label')->all());

        [$a1, $a2, $b1] = [$scenes[2], $scenes[3], $scenes[4]];
        $this->assertSame(['deltas' => ['moed' => 10, 'voedsel' => -5], 'consequence_line' => 'Iedereen is moe.', 'historical_note' => 'Zo ging het echt.'], $a1->config['branch_effects']);
        $this->assertArrayNotHasKey('branch_effects', $a2->config, 'the run\'s first shot carries the effects');
        $this->assertSame(['moed' => -25, 'voedsel' => 0], $b1->config['branch_effects']['deltas'], 'clamped, unknown meter dropped');
        $this->assertSame('sc11', $a1->config['stage25d']['id'], 'a branch scene is still a stage scene');
        $this->assertSame([], $lesson->incompleteStoryGameGroups(), 'one shot with deltas completes the run');
    }

    public function test_publish_gate_flags_an_option_run_without_deltas(): void
    {
        $r = app(LessonImporter::class)->import($this->branchedLesson(), User::factory()->create(), $this->audio);
        $lesson = Lesson::findOrFail($r['lesson_id']);
        $b1 = $lesson->scenes()->where('branch_role', 'option_b')->firstOrFail();
        $b1->update(['config' => array_diff_key($b1->config, ['branch_effects' => 1])]);

        $this->assertSame([1], $lesson->incompleteStoryGameGroups());
    }

    public function test_without_a_game_block_branches_are_ignored_and_a_choice_card_is_reported(): void
    {
        $lesson = $this->branchedLesson();
        unset($lesson['game']);
        $lesson['scenes'][6]['interaction'] = ['type' => 'choice', 'prompt' => 'Wat doe jij?', 'options' => [['text' => 'a', 'outcome' => 'x'], ['text' => 'b', 'outcome' => 'y']]];

        $r = app(LessonImporter::class)->import($lesson, User::factory()->create(), $this->audio);

        $row = Lesson::findOrFail($r['lesson_id']);
        $this->assertSame('quiz', $row->game_type);
        $this->assertSame(0, $row->scenes()->whereNotNull('branch_group')->count());
        $this->assertContains('sc03: choice interaction without a branch (the player has no dilemma card; a branch plays it)', $r['skipped']);
    }

    /** sc01, a Fertile Crescent overview (narrated), sc02 (+ its quiz), a route from the steppe to Babylon, sc03. */
    private function lessonWithMaps(): array
    {
        $lesson = $this->lesson();
        $map = fn (string $id, array $spec, ?string $audio = null) => [
            'id' => $id, 'kind' => 'map', 'beat' => 'setup', 'narration' => 'Kijk naar de groene band.', 'est_s' => 8,
            'tts_s' => 6.4, 'audio' => $audio, 'interaction' => null, 'fact_refs' => ['s1'], 'map' => $spec,
        ];
        file_put_contents("{$this->audio}/mini/sc04.mp3", 'ID3fake');
        array_splice($lesson['scenes'], 1, 0, [$map('sc04', [
            'labels' => [['name' => 'Babylon', 'lng' => 44.42, 'lat' => 32.54], ['name' => 'Eufraat', 'lng' => 40.5, 'lat' => 35.0, 'kind' => 'river']],
            'region' => ['name' => 'Vruchtbare Halvemaan', 'highlight' => 'fertile-crescent'],
            'camera' => ['center' => [40.5, 32.5], 'zoom' => 4.2],
        ], 'mini/sc04.mp3')]);
        array_splice($lesson['scenes'], 3, 0, [$map('sc05', [
            'labels' => [['name' => 'Ons kamp', 'lng' => 39.0, 'lat' => 34.0, 'kind' => 'camp'], ['name' => 'Babylon', 'lng' => 44.42, 'lat' => 32.54]],
            'route' => [[39.0, 34.0], [41.5, 33.6], [44.42, 32.54]],
        ])]);

        return $lesson;
    }

    public function test_a_map_scene_becomes_a_narrated_lesson_map_scene_in_order(): void
    {
        $r = app(LessonImporter::class)->import($this->lessonWithMaps(), User::factory()->create(), $this->audio);

        $scenes = Lesson::findOrFail($r['lesson_id'])->scenes()->orderBy('order')->get();
        $this->assertSame(['stage25d', 'map', 'stage25d', 'game', 'map', 'stage25d'], $scenes->pluck('kind')->all());

        $overview = $scenes[1];
        $this->assertSame('Kijk naar de groene band.', $overview->script_segment);
        $this->assertSame('lessons/'.$overview->lesson_id."/scenes/{$overview->id}/narration.mp3", $overview->audio_path);
        Storage::disk('public')->assertExists($overview->audio_path);
        $this->assertSame(8, $overview->duration_seconds);
        // assertEquals: the JSON column gives 35.0 back as 35
        $this->assertEquals([
            'projection' => 'mercator',
            'playback_mode' => 'timed',
            'hold_seconds' => 8,
            'annotations' => [['type' => 'focus', 'lng' => 44.42, 'lat' => 32.54, 'label' => 'Babylon', 'historical' => null, 'capital' => false]],
            'labels' => [['text' => 'Eufraat', 'lng' => 40.5, 'lat' => 35.0]],
            'region' => ['name' => 'Vruchtbare Halvemaan', 'url' => '/map-regions/fertile-crescent.geojson'],
            'camera' => ['center' => [40.5, 32.5], 'zoom' => 4.2],
        ], $overview->config);
        $this->assertFileExists(public_path('map-regions/fertile-crescent.geojson'));

        $route = $scenes[4]->config;
        $this->assertEquals([[39.0, 34.0], [41.5, 33.6], [44.42, 32.54]], $route['route']);
        $this->assertSame('labels', $route['fit'], 'no camera: the map frames the pins and the route');
        $this->assertSame(['Ons kamp', 'Babylon'], array_column($route['annotations'], 'label'), 'a camp gets a dot like a city');
        $this->assertArrayNotHasKey('region', $route);
        $this->assertNull($scenes[4]->audio_path);
    }

    public function test_a_map_scene_with_an_unknown_region_is_imported_without_it_and_warned(): void
    {
        $lesson = $this->lessonWithMaps();
        $lesson['scenes'][1]['map']['region']['highlight'] = 'atlantis';

        $r = app(LessonImporter::class)->import($lesson, User::factory()->create(), $this->audio);

        $this->assertContains("sc04: map region 'atlantis' has no polygon in public/map-regions", $r['warnings']);
        $overview = Lesson::findOrFail($r['lesson_id'])->scenes()->where('kind', 'map')->orderBy('order')->firstOrFail();
        $this->assertArrayNotHasKey('region', $overview->config);
    }

    public function test_a_map_scene_can_be_a_shot_of_a_branch_run(): void
    {
        $lesson = $this->branchedLesson();
        $lesson['scenes'][2] = ['id' => 'sc11', 'kind' => 'map', 'beat' => 'setup', 'narration' => 'Ze trekken naar het westen.', 'est_s' => 7,
            'interaction' => null, 'fact_refs' => ['s1'], 'branch' => $lesson['scenes'][2]['branch'],
            'map' => ['route' => [[39.0, 34.0], [44.42, 32.54]]]];

        $r = app(LessonImporter::class)->import($lesson, User::factory()->create(), $this->audio);

        $a1 = Lesson::findOrFail($r['lesson_id'])->scenes()->where('branch_role', 'option_a')->orderBy('order')->firstOrFail();
        $this->assertSame('map', $a1->kind);
        $this->assertSame(1, $a1->branch_group);
        $this->assertSame('Trek de steen', $a1->branch_choice_label);
        $this->assertSame(['moed' => 10, 'voedsel' => -5], $a1->config['branch_effects']['deltas']);
    }

    public function test_a_plain_scene_is_not_a_stage_scene(): void
    {
        $this->assertFalse((new Scene(['kind' => 'narration', 'config' => []]))->isStage25d());
        $this->assertFalse((new Scene(['kind' => 'stage25d', 'config' => []]))->isStage25d(), 'kind alone is not enough');
    }
}
