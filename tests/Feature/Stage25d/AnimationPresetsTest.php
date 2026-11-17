<?php

declare(strict_types=1);

namespace Tests\Feature\Stage25d;

use App\Models\Scene;
use App\Models\User;
use App\Services\Stage25d\AnimationPresets;
use App\Services\Stage25d\LayerKeys;
use App\Services\Stage25d\LessonImporter;
use App\Services\Stage25d\StageSet;
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

    public function test_the_server_lays_the_shipped_walk_out_as_the_editor_does(): void
    {
        $fixture = json_decode((string) file_get_contents(base_path('tests/Fixtures/animations/expand-walk.json')), true);

        $this->assertEquals($fixture['expected'], AnimationPresets::expand(AnimationPresets::clip($fixture['clip']), $fixture['options']));
    }

    public function test_every_preset_in_the_catalogue_has_a_clip_and_a_label_in_every_language(): void
    {
        $this->assertSame(['walk'], AnimationPresets::ids(), 'Bart 11-17: the old library went');
        foreach (AnimationPresets::catalogue() as $p) {
            $this->assertNotNull(AnimationPresets::clip($p['id']), "clip for {$p['id']}");
            foreach (['nl', 'de', 'fr', 'es', 'it'] as $lang) {
                $labels = json_decode((string) file_get_contents(lang_path("{$lang}.json")), true);
                $this->assertArrayHasKey($p['label'], $labels, "{$lang} label for {$p['id']}");
            }
        }
    }

    public function test_the_writers_schema_and_brief_offer_exactly_the_presets_there_are(): void
    {
        $schema = json_decode((string) file_get_contents(base_path('tools/lessongen/lesson.schema.json')), true);
        $figure = data_get($schema, 'properties.scenes.items.properties.figures.items.properties.animation')
            ?? collect(data_get($schema, '$defs', []))->pluck('properties.figures.items.properties.animation')->filter()->first();
        $this->assertNotNull($figure, 'figures[].animation in lesson.schema.json');
        $this->assertSame(AnimationPresets::ids(), $figure['oneOf'][0]['enum']);
        $this->assertSame(AnimationPresets::ids(), $figure['oneOf'][1]['properties']['id']['enum']);
        $brief = (string) file_get_contents(base_path('tools/lessongen/writer-brief.md'));
        foreach (AnimationPresets::ids() as $id) {
            $this->assertStringContainsString($id, $brief);
        }
    }

    public function test_an_animation_names_a_known_preset_and_its_timing_is_held_to_range(): void
    {
        $this->assertSame(['id' => 'walk', 'start' => 0.0, 'length' => null, 'speed' => 1.0], AnimationPresets::spec('walk'));
        $this->assertSame(['id' => 'walk', 'start' => 0.0, 'length' => 3.0, 'speed' => 4.0], AnimationPresets::spec(['id' => 'walk', 'start' => -2, 'length' => 3, 'speed' => 99]));
        $this->assertNull(AnimationPresets::spec('moonwalk'));
        $this->assertNull(AnimationPresets::spec('wave'), 'a preset that was removed names nothing');
        $this->assertNull(AnimationPresets::spec(['start' => 1]));
    }

    public function test_a_clip_takes_over_only_the_fields_it_moves_in_its_own_stretch_of_time(): void
    {
        $keys = [['t' => 0.0, 'bone:head' => 1.0], ['t' => 1.5, 'bone:head' => 9.0, 'scale' => 2.0], ['t' => 3.0, 'bone:head' => 0.0]];
        $added = [['t' => 1.0, 'ease' => 'smooth', 'bone:head' => 5.0], ['t' => 2.0, 'bone:head' => -5.0]];

        $this->assertEquals([['t' => 0.0, 'bone:head' => 1.0], ['t' => 1.0, 'ease' => 'smooth', 'bone:head' => 5.0], ['t' => 1.5, 'scale' => 2.0], ['t' => 2.0, 'bone:head' => -5.0], ['t' => 3.0, 'bone:head' => 0.0]], AnimationPresets::apply($keys, $added));
    }

    public function test_after_a_clip_the_figure_shows_its_own_face_again_and_a_still_clip_leaves_its_x_alone(): void
    {
        $added = [['t' => 1.0, 'bone:head' => 5.0, 'face' => 'amazed'], ['t' => 2.0, 'bone:head' => 0.0]];
        $this->assertSame(['sad', 'amazed', 'sad'], array_column(AnimationPresets::apply([['t' => 0.0, 'face' => 'sad', 'x' => 0.1]], $added), 'face'));
        $still = ['id' => 's', 'loop' => false, 'duration' => 1.0, 'travel' => 0.0, 'keys' => [['t' => 0, 'bone:head' => 1, 'dx' => 0, 'bob' => 0], ['t' => 1, 'bone:head' => 2, 'dx' => 0.0003, 'bob' => 0]]];
        $this->assertFalse(collect(AnimationPresets::expand($still, ['bones' => ['head'], 'xPerHeight' => 1.0]))->contains(fn ($k) => isset($k['x'])));
    }

    public function test_a_robed_figure_travels_and_sinks_only_as_far_as_its_legs_carry_it(): void
    {
        $this->assertEqualsWithDelta([12 / 45, 8 / 120], AnimationPresets::legRoom(['thigh_n' => [-6, 6], 'shin_n' => [0, 8]]), 1e-9);
        $fixture = json_decode((string) file_get_contents(base_path('tests/Fixtures/animations/expand.json')), true);
        $full = AnimationPresets::expand($fixture['clip'], $fixture['options']);
        $robed = AnimationPresets::expand($fixture['clip'], [...$fixture['options'], 'limits' => ['thigh_n' => [-6, 6], 'shin_n' => [0, 8]]]);
        $this->assertEqualsWithDelta(abs(end($full)['x'] - 0.6) * 12 / 45, abs(end($robed)['x'] - 0.6), 0.002);
    }

    public function test_a_clip_in_place_keeps_the_teachers_x_and_longer_legs_drop_further(): void
    {
        $slide = [['t' => 0.0, 'x' => 0.2], ['t' => 4.0, 'x' => 0.6]];
        $clip = [['t' => 1.0, 'x' => 0.5, 'bone:head' => 1.0], ['t' => 2.0, 'x' => 0.55, 'bone:head' => 0.0]];
        $this->assertSame([0.2, 0.6], array_column(AnimationPresets::apply($slide, $clip, inPlace: true), 'x'), 'in place: the teacher\'s x stays as it is');
        $this->assertSame([0.2, 0.5, 0.55, 0.6], array_column(AnimationPresets::apply($slide, $clip), 'x'), 'a walk is a move: it replaces x');
        $kit = [['name' => 'head', 'from' => [260, 258], 'to' => [301, 9]], ['name' => 'thigh_n', 'from' => [160, 607], 'to' => [165, 984]], ['name' => 'shin_n', 'from' => [165, 984], 'to' => [170, 1362]], ['name' => 'foot_n', 'from' => [170, 1362], 'to' => [285, 1470]]];
        $this->assertEqualsWithDelta(755 / 1461, AnimationPresets::legShareOf($kit), 0.005);
    }

    public function test_a_fall_tips_the_whole_figure_over(): void
    {
        $fall = ['id' => 'f', 'loop' => false, 'duration' => 1.0, 'travel' => 0.0, 'keys' => [['t' => 0, 'dx' => 0, 'bob' => 0], ['t' => 0.5, 'rot' => -70, 'dx' => 0, 'bob' => -0.2], ['t' => 1, 'dx' => 0, 'bob' => 0]]];
        $this->assertEquals([5, -65, 5], array_column(AnimationPresets::expand($fall, ['r0' => 5.0]), 'rotation'));
        $this->assertEquals([0, 70, 0], array_column(AnimationPresets::expand($fall, ['facing' => -1]), 'rotation'));
    }

    public function test_a_move_near_the_end_of_the_scene_is_cut_there(): void
    {
        Storage::fake('public');
        $stage = ['bundle' => 'none', 'set' => ['layers' => [['asset' => 'f', 'depth' => 'fg', 'z' => 7.0, 'puppet' => $this->puppet(), 'animation' => ['id' => 'walk', 'start' => 7.5]]]]];

        [$out] = AnimationPresets::fill($stage, 8.0);

        $times = array_column($out['set']['layers'][0]['keys'], 't');
        $this->assertLessThanOrEqual(8.0, max($times));
        $this->assertSame(count($times), count(array_unique(array_map('strval', $times))), 'no keys squeezed onto one moment');
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
        $cycle = AnimationPresets::clip('walk')['duration'];
        $this->assertEqualsWithDelta(1.0 + 3 * $cycle + min(0.5, $cycle / 2), end($keys)['t'], 0.01, 'a walk crosses the shot for a few steps, then settles, not the whole scene off screen');
        $this->assertEquals(0, end($keys)['bone:thigh_n'], 'it stops standing, not mid-stride');
        $this->assertArrayNotHasKey('animation', $out['set']['layers'][0]);
        $this->assertArrayNotHasKey('animation', $out['set']['layers'][1]);
        $this->assertArrayNotHasKey('keys', $out['set']['layers'][2]);
    }

    public function test_a_planned_scene_gives_a_figure_with_bones_the_preset_its_words_ask_for(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('library/anim-test/library.json', json_encode(['assets' => [
            ['id' => 'sky-1', 'layer' => 'sky', 'file' => 's.webp', 'tags' => ['sky']],
            ['id' => 'fig-ana', 'layer' => 'figure', 'file' => 'a.webp', 'height_m' => 1.6, 'tags' => ['char:ana', 'pose:stand', 'facing:right'], 'puppet' => $this->puppet()],
            ['id' => 'fig-bo', 'layer' => 'figure', 'file' => 'b.webp', 'tags' => ['char:bo', 'pose:stand', 'facing:left']],
        ]]));

        $layers = collect(StageSet::forScene('anim-test', 's1', 'Ana loopt naar Bo.')['set']['layers']);

        $ana = $layers->firstWhere('figure', 'ana');
        $this->assertArrayHasKey('bone:thigh_n', $ana['keys'][0], 'Ana walks: the words say she does');
        $this->assertArrayNotHasKey('animation', $ana);
        $this->assertArrayNotHasKey('keys', $layers->firstWhere('figure', 'bo'), 'Bo has no bones: nothing to play');
    }

    public function test_a_composed_lesson_with_a_walk_imports_a_figure_that_walks(): void
    {
        Storage::fake('public');
        $lesson = json_decode((string) file_get_contents(base_path('tests/Fixtures/stage25d/mini-lesson.json')), true);
        $lesson['scenes'][0]['figures'][0]['animation'] = 'walk';
        $lesson['scenes'][0]['set']['layers'][1] = [...$lesson['scenes'][0]['set']['layers'][1], 'puppet' => $this->puppet(-1), 'animation' => 'walk'];

        $r = app(LessonImporter::class)->import($lesson, User::factory()->create());

        $scene = Scene::where('lesson_id', $r['lesson_id'])->orderBy('order')->first();
        $figure = $scene->config['stage25d']['set']['layers'][1];
        $this->assertArrayNotHasKey('animation', $figure);
        $thigh = array_values(array_filter(array_column($figure['keys'], 'bone:thigh_n'), fn ($v) => $v !== null));
        $this->assertGreaterThan(10, max(array_map('abs', $thigh)), 'the legs swing');
        $this->assertSame([], array_values(array_filter($r['warnings'], fn ($w) => str_contains($w, 'animation'))));
    }
}
