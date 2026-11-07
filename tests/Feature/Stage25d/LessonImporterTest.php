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

    public function test_a_plain_scene_is_not_a_stage_scene(): void
    {
        $this->assertFalse((new Scene(['kind' => 'narration', 'config' => []]))->isStage25d());
        $this->assertFalse((new Scene(['kind' => 'stage25d', 'config' => []]))->isStage25d(), 'kind alone is not enough');
    }
}
