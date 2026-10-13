<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Enums\LessonStatus;
use App\Models\Lesson;
use App\Models\SvgAsset;
use App\Models\User;
use App\Services\LessonComposer;
use App\Services\LessonExporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * A lesson spec says how its world moves: `ambient: 'swell'` and friends on layers, `camera` and
 * `entry` on scenes (and on verbatim shots). The composer stores them where the editor writes them,
 * the player receives them, and lessons:export writes them back: nothing exists only in code.
 */
class LessonComposerWorldMotionTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->teacher = User::factory()->create();
        foreach (['history-line/backdrops/sea/ocean-day' => 'webp', 'history-line/props/sea/sea-strip' => 'png', 'history-line/props/ships/heemskerck' => 'png', 'history-line/props/weather/rain' => 'png'] as $ref => $ext) {
            $path = "svg-assets/bundled/{$ref}.{$ext}";
            Storage::disk('public')->put($path, "bytes-of-{$ref}");
            SvgAsset::factory()->create([
                'user_id' => null, 'source' => 'bundled', 'source_ref' => "{$ref}.{$ext}",
                'svg_path' => $path, 'title' => basename($ref),
            ]);
        }
    }

    /** @param list<array<string,mixed>> $scenes */
    private function compose(array $scenes): Lesson
    {
        return app(LessonComposer::class)->build(['key' => 'World motion test', 'scenes' => $scenes], $this->teacher, narrate: false);
    }

    private function storm(): array
    {
        return [
            'type' => 'story',
            'script' => 'De storm.',
            'backdrop' => 'history-line/backdrops/sea/ocean-day',
            'camera' => ['move' => 'shake', 'amount' => 1.5, 'duration' => 1.2],
            'entry' => 'reveal',
            'layers' => [
                ['asset' => 'history-line/props/sea/sea-strip', 'y' => 85, 'depth' => 1.4, 'ambient' => 'swell', 'ambient_speed' => 1.5],
                ['asset' => 'history-line/props/ships/heemskerck', 'ambient' => 'roll', 'ambient_amount' => 1.6],
                ['asset' => 'history-line/props/ships/heemskerck', 'x' => 70, 'ambient' => 'billow'],
                ['asset' => 'history-line/props/weather/rain', 'ambient' => 'rain', 'ambient_amount' => 1.5],
                ['asset' => 'history-line/props/weather/rain', 'x' => 20, 'ambient' => 'flash'],
            ],
        ];
    }

    public function test_a_spec_stores_world_motion_and_the_panel_camera(): void
    {
        $scene = $this->compose([$this->storm()])->scenes()->firstOrFail();

        $shot = $scene->shots[0];
        $this->assertEquals(['move' => 'shake', 'amount' => 1.5, 'duration' => 1.2, 'ease' => 'move', 'delay' => 0.0], $shot['camera']);
        $this->assertSame('reveal', $shot['entry']);
        $modes = array_column(array_slice($shot['layers'], 1), 'ambient');
        $this->assertSame(['swell', 'roll', 'billow', 'rain', 'flash'], $modes);
        $this->assertEquals(1.5, $shot['layers'][1]['ambient_speed']);
    }

    public function test_the_player_receives_them(): void
    {
        $lesson = $this->compose([$this->storm()]);
        $lesson->update(['status' => LessonStatus::Published->value]);

        $html = $this->get(route('lesson.play', ['lessonCode' => $lesson->lesson_code]))->assertOk()->getContent();

        $this->assertStringContainsString('"camera":{"move":"shake","amount":1.5,"duration":1.2,"ease":"move","delay":0', $html);
        $this->assertStringContainsString('"entry":"reveal"', $html);
        foreach (['swell', 'roll', 'billow', 'rain', 'flash'] as $mode) {
            $this->assertStringContainsString("\"ambient\":\"{$mode}\"", $html);
        }
    }

    public function test_a_backdrop_only_scene_gets_a_panel_for_its_camera(): void
    {
        $scene = $this->compose([[
            'type' => 'story', 'script' => 'Zee.', 'backdrop' => 'history-line/backdrops/sea/ocean-day',
            'camera' => ['move' => 'pan-r'],
        ]])->scenes()->firstOrFail();

        $this->assertSame('pan-r', $scene->shots[0]['camera']['move']);
        $this->assertEquals(10.0, $scene->shots[0]['camera']['duration']);   // the move's own default
        $this->assertEquals(['path' => $scene->image_path, 'kind' => 'cover', 'depth' => 1.0], $scene->shots[0]['layers'][0]);
    }

    public function test_verbatim_shots_keep_their_own_cameras(): void
    {
        $scene = $this->compose([[
            'type' => 'story', 'script' => 'Twee panelen.',
            'shots' => [
                ['order' => 0, 'image_path' => 'a.png', 'layers' => [['path' => 'a.png', 'kind' => 'cover', 'depth' => 1]], 'camera' => ['move' => 'push'], 'entry' => 'cut'],
                ['order' => 1, 'image_path' => 'b.png', 'layers' => [['path' => 'b.png', 'kind' => 'cover', 'depth' => 1]], 'camera' => ['move' => 'tilt-up', 'delay' => 2]],
            ],
        ]])->scenes()->firstOrFail();

        $this->assertSame('push', $scene->shots[0]['camera']['move']);
        $this->assertSame('cut', $scene->shots[0]['entry']);
        $this->assertSame('tilt-up', $scene->shots[1]['camera']['move']);
        $this->assertEquals(2.0, $scene->shots[1]['camera']['delay']);
    }

    public function test_a_misspelt_motion_or_camera_fails_before_anything_is_deleted(): void
    {
        $lesson = $this->compose([$this->storm()]);
        $before = $lesson->scenes()->pluck('id')->all();

        foreach ([
            ['camera' => ['move' => 'barrel-roll']],
            ['camera' => ['move' => 'push', 'speed' => 2]],
            ['entry' => 'explode'],
        ] as $bad) {
            try {
                $this->compose([array_merge($this->storm(), $bad)]);
                $this->fail('A bad camera must fail the compose: '.json_encode($bad));
            } catch (\InvalidArgumentException $e) {
                $this->assertStringContainsString('Spec scene #1', $e->getMessage());
            }
        }

        $storm = $this->storm();
        $storm['layers'][0]['ambient'] = 'swel';
        try {
            $this->compose([$storm]);
            $this->fail('A misspelt ambient must fail the compose.');
        } catch (\InvalidArgumentException $e) {
            $this->assertStringContainsString('ambient must be one of', $e->getMessage());
        }

        $this->assertSame($before, $lesson->scenes()->pluck('id')->all());
    }

    public function test_export_writes_the_camera_back_as_spec_keys_and_it_rebuilds_the_same(): void
    {
        $lesson = $this->compose([$this->storm()]);
        $spec = app(LessonExporter::class)->toSpec($lesson->fresh());
        $sceneSpec = $spec['scenes'][0];

        $this->assertSame('shake', $sceneSpec['camera']['move']);
        $this->assertSame('reveal', $sceneSpec['entry']);
        $this->assertSame('swell', $sceneSpec['layers'][0]['ambient']);
        $this->assertArrayNotHasKey('shots', $sceneSpec);

        $rebuilt = app(LessonComposer::class)->build($spec, $this->teacher, narrate: false)->scenes()->firstOrFail();
        $this->assertEquals($sceneSpec['camera'], $rebuilt->shots[0]['camera']);
        $this->assertSame('reveal', $rebuilt->shots[0]['entry']);
    }
}
