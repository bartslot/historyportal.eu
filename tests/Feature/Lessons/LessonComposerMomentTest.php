<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Models\Lesson;
use App\Models\SvgAsset;
use App\Models\User;
use App\Services\LessonComposer;
use App\Services\LessonExporter;
use App\Services\Lessons\MomentSpec;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use Tests\TestCase;

/**
 * Power-meter moments authored as data: a story panel's `moment` lands cleaned in config.moment
 * with its reset copy, its layer refs become the panel's asset ids, lessons:export writes it back
 * as refs, and a spec mistake fails the compose before anything is deleted.
 */
class LessonComposerMomentTest extends TestCase
{
    use RefreshDatabase;

    private const SHIP = 'history-line/props/tasman/ships_pair_far';

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->teacher = User::factory()->create();
        foreach (['history-line/backdrops/tasman/ocean_empty_wide', self::SHIP] as $ref) {
            $path = "svg-assets/bundled/{$ref}.webp";
            Storage::disk('public')->put($path, "bytes-of-{$ref}");
            SvgAsset::factory()->create([
                'user_id' => null, 'source' => 'bundled', 'source_ref' => "{$ref}.webp",
                'svg_path' => $path, 'title' => basename($ref),
            ]);
        }
    }

    private function moment(array $over = []): array
    {
        return array_replace_recursive([
            'name' => 'Wind in de zeilen',
            'meter_label' => 'Windmeter',
            'prompt' => 'Roep de woorden die de wind laten <b>waaien</b>!',
            'words' => ['right' => ['westenwind', 'zeilen', 'vertrekken', 'Mauritius'], 'wrong' => ['stoommachine', 'motor', 'noordpool']],
            'after' => 'En daar komt de westenwind.',
            'react' => ['layer' => self::SHIP, 'ambient' => 'bob', 'amount' => 9],
            'payoff' => ['type' => 'move', 'layer' => self::SHIP, 'to_x' => 400, 'duration' => 5],
            'secret' => 'dropped',
        ], $over);
    }

    private function compose(array $scenes): Lesson
    {
        return app(LessonComposer::class)->build(['key' => 'Moment test', 'language' => 'nl', 'scenes' => $scenes], $this->teacher, narrate: false);
    }

    private function panel(array $moment): array
    {
        return [
            'type' => 'story', 'script' => 'Er staat geen zuchtje wind.',
            'backdrop' => 'history-line/backdrops/tasman/ocean_empty_wide',
            'layers' => [['asset' => self::SHIP, 'x' => 58, 'y' => 44, 'ambient' => 'bob', 'waterline' => 0.2]],
            'moment' => $moment,
        ];
    }

    private function shipId(): int
    {
        return SvgAsset::query()->where('source_ref', self::SHIP.'.webp')->value('id');
    }

    public function test_a_moment_composes_cleaned_with_its_reset_copy_and_resolved_layers(): void
    {
        $config = $this->compose([$this->panel($this->moment())])->scenes()->firstOrFail()->config;
        $moment = $config['moment'];

        $this->assertSame($moment, $config['moment_default']);
        $this->assertTrue($moment['enabled']);
        $this->assertSame('Roep de woorden die de wind laten waaien!', $moment['prompt']);
        $this->assertSame(4, $moment['goal']);
        $this->assertSame('words', $moment['input']);
        $this->assertSame('end', $moment['at']);
        $this->assertSame(0, $moment['seconds']);
        $this->assertSame('shared', $moment['team_meter']);
        $this->assertSame($this->shipId(), $moment['react']['layer']);
        $this->assertEquals(2.0, $moment['react']['amount']);
        $this->assertSame($this->shipId(), $moment['payoff']['layer']);
        $this->assertEquals(150.0, $moment['payoff']['to_x']);
        $this->assertSame('', $moment['after_audio']);
        $this->assertArrayNotHasKey('secret', $moment);
    }

    public function test_export_writes_the_moment_back_as_refs_and_it_round_trips(): void
    {
        $lesson = $this->compose([$this->panel($this->moment())]);
        $before = $lesson->scenes()->firstOrFail()->config['moment'];

        $spec = app(LessonExporter::class)->toSpec($lesson->fresh());
        $scene = $spec['scenes'][0];

        $this->assertSame(self::SHIP, $scene['moment']['react']['layer']);
        $this->assertSame(self::SHIP, $scene['moment']['payoff']['layer']);
        $this->assertArrayNotHasKey('moment', $scene['extra_config'] ?? []);
        $this->assertArrayNotHasKey('moment_default', $scene['extra_config'] ?? []);

        $again = app(LessonComposer::class)->build($spec, $this->teacher, narrate: false);
        $this->assertSame($before, $again->scenes()->firstOrFail()->config['moment']);
    }

    public function test_a_spec_mistake_fails_before_anything_is_deleted(): void
    {
        $lesson = $this->compose([$this->panel($this->moment())]);
        $sceneId = $lesson->scenes()->firstOrFail()->id;

        foreach ([
            [$this->panel($this->moment(['input' => 'telepathy'])), "input 'telepathy'"],
            [$this->panel($this->moment(['payoff' => ['type' => 'teleport']])), "payoff 'teleport'"],
            [$this->panel($this->moment(['react' => ['layer' => 'history-line/props/tasman/nope']])), 'is not a layer of this panel'],
            [['type' => 'team', 'mode' => 'discuss', 'moment' => $this->moment()], 'sits only on a story scene'],
        ] as [$scene, $message]) {
            try {
                $this->compose([$scene]);
                $this->fail("Expected '{$message}'.");
            } catch (InvalidArgumentException $e) {
                $this->assertStringContainsString($message, $e->getMessage());
            }
        }
        $this->assertSame($sceneId, $lesson->scenes()->firstOrFail()->id);
    }

    public function test_clean_keeps_the_stored_input_and_payoff_when_the_browser_sends_junk(): void
    {
        $stored = MomentSpec::normalize($this->moment(['react' => ['layer' => 7], 'payoff' => ['type' => 'camera', 'layer' => 7]]));

        $clean = MomentSpec::clean(['input' => 'mindreading', 'payoff' => ['type' => '<script>'], 'teams' => 1, 'goal' => 99,
            'words' => ['right' => ['a', 'b'], 'wrong' => [['x']]], 'after_audio' => '//evil.example/a.mp3'], $stored);

        $this->assertSame('words', $clean['input']);
        $this->assertSame('camera', $clean['payoff']['type']);
        $this->assertSame(2, $clean['teams']);
        $this->assertSame(2, $clean['goal']);
        $this->assertSame([], $clean['words']['wrong']);
        $this->assertSame('', $clean['after_audio']);
        $this->assertSame('', MomentSpec::normalize(['after_audio' => '/\\evil.example/a.mp3'])['after_audio']);
        $this->assertSame('/storage/a.mp3', MomentSpec::normalize(['after_audio' => '/storage/a.mp3'])['after_audio']);
        $this->assertFalse(MomentSpec::blank()['enabled']);

        $race = MomentSpec::normalize(['race' => ['enabled' => 1, 'ghost_seconds' => 1, 'finish_x' => 900, 'after' => '<b>{crew:heemskerck}</b> vaart.', 'x' => 1]])['race'];
        $this->assertEquals(['enabled' => true, 'ghost_seconds' => 5.0, 'start_x' => 25.0, 'finish_x' => 150.0, 'after' => '{crew:heemskerck} vaart.'], $race);
        $this->assertFalse(MomentSpec::blank()['race']['enabled']);
    }
}
