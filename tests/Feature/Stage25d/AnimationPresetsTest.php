<?php

declare(strict_types=1);

namespace Tests\Feature\Stage25d;

use App\Models\Scene;
use App\Models\User;
use App\Services\Stage25d\AnimationPresets;
use App\Services\Stage25d\LayerKeys;
use App\Services\Stage25d\LessonImporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AnimationPresetsTest extends TestCase
{
    use RefreshDatabase;

    private const BONES = ['hips', 'chest', 'head', 'upperarm_n', 'forearm_n', 'upperarm_f', 'forearm_f', 'thigh_n', 'shin_n', 'foot_n', 'thigh_f', 'shin_f', 'foot_f'];

    /** @return array<string,mixed> a figure's rig as the stage reads it, its bones only (the rest does not matter here) */
    private function puppet(int $facing = 1): array
    {
        return ['atlas' => 'x.webp', 'width' => 100, 'height' => 200, 'facing' => $facing, 'parts' => [],
            'bones' => array_map(fn ($b) => ['name' => $b, 'parent' => null, 'from' => [0, 0]], self::BONES)];
    }

    public function test_the_server_lays_a_clip_out_exactly_as_the_editor_does(): void
    {
        $fixture = json_decode((string) file_get_contents(base_path('tests/Fixtures/animations/expand.json')), true);

        $this->assertEquals($fixture['expected'], AnimationPresets::expand($fixture['clip'], $fixture['options']));
    }

    public function test_every_preset_in_the_catalogue_has_a_clip_and_a_label_in_every_language(): void
    {
        $this->assertGreaterThanOrEqual(22, count(AnimationPresets::ids()));
        foreach (AnimationPresets::catalogue() as $p) {
            $this->assertNotNull(AnimationPresets::clip($p['id']), "clip for {$p['id']}");
            foreach (['nl', 'de', 'fr', 'es', 'it'] as $lang) {
                $labels = json_decode((string) file_get_contents(lang_path("{$lang}.json")), true);
                $this->assertArrayHasKey($p['label'], $labels, "{$lang} label for {$p['id']}");
            }
        }
    }

    public function test_an_animation_names_a_known_preset_and_its_timing_is_held_to_range(): void
    {
        $this->assertSame(['id' => 'walk', 'start' => 0.0, 'length' => null, 'speed' => 1.0], AnimationPresets::spec('walk'));
        $this->assertSame(['id' => 'wave', 'start' => 0.0, 'length' => 3.0, 'speed' => 4.0], AnimationPresets::spec(['id' => 'wave', 'start' => -2, 'length' => 3, 'speed' => 99]));
        $this->assertNull(AnimationPresets::spec('moonwalk'));
        $this->assertNull(AnimationPresets::spec(['start' => 1]));
    }

    public function test_a_clip_takes_over_only_the_fields_it_moves_in_its_own_stretch_of_time(): void
    {
        $keys = [['t' => 0.0, 'bone:head' => 1.0], ['t' => 1.5, 'bone:head' => 9.0, 'scale' => 2.0], ['t' => 3.0, 'bone:head' => 0.0]];
        $added = [['t' => 1.0, 'ease' => 'smooth', 'bone:head' => 5.0], ['t' => 2.0, 'bone:head' => -5.0]];

        $this->assertEquals([['t' => 0.0, 'bone:head' => 1.0], ['t' => 1.0, 'ease' => 'smooth', 'bone:head' => 5.0], ['t' => 1.5, 'scale' => 2.0], ['t' => 2.0, 'bone:head' => -5.0], ['t' => 3.0, 'bone:head' => 0.0]], AnimationPresets::apply($keys, $added));
    }

    public function test_a_saved_key_keeps_its_smooth_ease_and_its_face_and_nothing_else_that_is_not_a_number(): void
    {
        $keys = LayerKeys::sanitize([
            ['t' => 1, 'bone:head' => 4, 'ease' => 'smooth', 'face' => 'smile'],
            ['t' => 2, 'bone:head' => 0, 'ease' => 'bounce', 'face' => '<script>'],
            ['t' => 3, 'ease' => 'smooth'],
        ], 8.0);

        $this->assertSame([['t' => 1.0, 'bone:head' => 4.0, 'ease' => 'smooth', 'face' => 'smile'], ['t' => 2.0, 'bone:head' => 0.0]], $keys);
    }

    public function test_a_figure_with_a_walk_gets_walk_keys_on_its_bones_and_crosses_the_ground(): void
    {
        Storage::fake('public');
        $stage = ['bundle' => 'none', 'set' => ['layers' => [
            ['asset' => 'fig-a', 'depth' => 'fg', 'z' => 7.0, 'x' => 0.3, 'figure' => 'ana', 'puppet' => $this->puppet(), 'animation' => ['id' => 'walk', 'start' => 1]],
            ['asset' => 'fig-b', 'depth' => 'fg', 'x' => 0.7, 'figure' => 'bo', 'animation' => 'walk'],
            ['asset' => 'tree', 'depth' => 'mid'],
        ]]];

        [$out, $report] = AnimationPresets::fill($stage, 9.0);

        $this->assertSame(['animated' => 1, 'dropped' => 1], $report, 'the figure without bones cannot walk');
        $keys = $out['set']['layers'][0]['keys'];
        $this->assertSame(1.0, $keys[0]['t']);
        $this->assertSame('smooth', $keys[0]['ease']);
        $this->assertArrayHasKey('bone:thigh_n', $keys[0]);
        $this->assertGreaterThan(0.3, end($keys)['x'], 'facing right, a walk goes right');
        $this->assertEqualsWithDelta(9.0, end($keys)['t'], 0.01, 'a loop fills the scene');
        $this->assertArrayNotHasKey('animation', $out['set']['layers'][0]);
        $this->assertArrayNotHasKey('animation', $out['set']['layers'][1]);
        $this->assertArrayNotHasKey('keys', $out['set']['layers'][2]);
    }

    public function test_a_composed_lesson_with_animations_imports_figures_that_play_them(): void
    {
        Storage::fake('public');
        $lesson = json_decode((string) file_get_contents(base_path('tests/Fixtures/stage25d/mini-lesson.json')), true);
        $lesson['scenes'][0]['figures'][0]['animation'] = 'wave';
        $lesson['scenes'][0]['set']['layers'][1] = [...$lesson['scenes'][0]['set']['layers'][1], 'puppet' => $this->puppet(-1), 'animation' => 'wave'];

        $r = app(LessonImporter::class)->import($lesson, User::factory()->create());

        $scene = Scene::where('lesson_id', $r['lesson_id'])->orderBy('order')->first();
        $figure = $scene->config['stage25d']['set']['layers'][1];
        $this->assertArrayNotHasKey('animation', $figure);
        $arm = array_values(array_filter(array_column($figure['keys'], 'bone:upperarm_n'), fn ($v) => $v !== null));
        $this->assertNotEmpty($arm, 'the wave moves the near arm');
        $this->assertGreaterThan(30, max(array_map('abs', $arm)), 'a real wave lifts the arm');
        $this->assertGreaterThan(0, max($arm), 'mirrored for a figure looking left: forward is clockwise');
        $this->assertSame([], array_values(array_filter($r['warnings'], fn ($w) => str_contains($w, 'animation'))));
    }
}
