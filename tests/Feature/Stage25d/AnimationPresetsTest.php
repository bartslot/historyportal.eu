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
use Illuminate\Support\Facades\Log;
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

    public function test_the_server_lays_the_old_walk_clip_out_as_the_editor_does(): void
    {
        $fixture = json_decode((string) file_get_contents(base_path('tests/Fixtures/animations/expand-walk.json')), true);
        $clip = json_decode((string) file_get_contents(base_path('tests/Fixtures/animations/walk-clip.json')), true);

        $this->assertEquals($fixture['expected'], AnimationPresets::expand($clip, $fixture['options']));
    }

    public function test_no_preset_is_offered_until_drawn_walks_come(): void
    {
        $this->assertSame([], AnimationPresets::ids(), 'Bart 11-17: every bone animation went, the walk too');
        $this->assertSame([], AnimationPresets::picker());
        $this->assertNull(AnimationPresets::clip('walk'));
    }

    public function test_the_writers_schema_and_brief_offer_no_preset(): void
    {
        $schema = json_decode((string) file_get_contents(base_path('tools/lessongen/lesson.schema.json')), true);
        $figure = data_get($schema, 'properties.scenes.items.properties.figures.items.properties.animation')
            ?? collect(data_get($schema, '$defs', []))->pluck('properties.figures.items.properties.animation')->filter()->first();
        $this->assertNotNull($figure, 'figures[].animation stays allowed, so an older lesson still validates');
        $this->assertArrayNotHasKey('oneOf', $figure);
        $this->assertArrayNotHasKey('enum', $figure);
        $this->assertStringNotContainsString('Presets: walk', (string) file_get_contents(base_path('tools/lessongen/writer-brief.md')));
    }

    public function test_an_animation_names_no_preset_now(): void
    {
        $this->assertNull(AnimationPresets::spec('walk'), 'the bone walk went');
        $this->assertNull(AnimationPresets::spec(['id' => 'walk', 'start' => 1]));
        $this->assertNull(AnimationPresets::spec('wave'));
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

    public function test_a_saved_key_keeps_its_smooth_ease_and_its_face_and_nothing_else_that_is_not_a_number(): void
    {
        $keys = LayerKeys::sanitize([
            ['t' => 1, 'bone:head' => 4, 'ease' => 'smooth', 'face' => 'smile'],
            ['t' => 2, 'bone:head' => 0, 'ease' => 'bounce', 'face' => '<script>'],
            ['t' => 3, 'ease' => 'smooth'],
        ], 8.0);

        $this->assertSame([['t' => 1.0, 'bone:head' => 4.0, 'ease' => 'smooth', 'face' => 'smile'], ['t' => 2.0, 'bone:head' => 0.0]], $keys);
    }

    public function test_a_figure_asking_for_a_walk_stands_keeps_its_own_keys_and_it_is_logged(): void
    {
        Storage::fake('public');
        Log::spy();
        $own = [['t' => 0.0, 'x' => 0.3], ['t' => 2.0, 'x' => 0.5, 'bone:head' => 4.0]];
        $stage = ['bundle' => 'none', 'set' => ['layers' => [
            ['asset' => 'fig-a', 'depth' => 'fg', 'z' => 7.0, 'x' => 0.3, 'figure' => 'ana', 'puppet' => $this->puppet(), 'keys' => $own, 'animation' => ['id' => 'walk', 'start' => 1]],
            ['asset' => 'tree', 'depth' => 'mid'],
        ]]];

        [$out, $report] = AnimationPresets::fill($stage, 9.0);

        $this->assertSame(['animated' => 0, 'dropped' => 1], $report);
        $this->assertSame($own, $out['set']['layers'][0]['keys'], 'the keys a figure already has stay as they are');
        $this->assertArrayNotHasKey('animation', $out['set']['layers'][0]);
        $this->assertArrayNotHasKey('keys', $out['set']['layers'][1]);
        Log::shouldHaveReceived('info')->withArgs(fn ($msg, $ctx) => $msg === 'animation preset ignored' && $ctx['animation']['id'] === 'walk');
    }

    public function test_a_planned_scene_never_animates_a_figure_from_its_words(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('library/anim-test/library.json', json_encode(['assets' => [
            ['id' => 'sky-1', 'layer' => 'sky', 'file' => 's.webp', 'tags' => ['sky']],
            ['id' => 'fig-ana', 'layer' => 'figure', 'file' => 'a.webp', 'height_m' => 1.6, 'tags' => ['char:ana', 'pose:stand', 'facing:right'], 'puppet' => $this->puppet()],
            ['id' => 'fig-bo', 'layer' => 'figure', 'file' => 'b.webp', 'tags' => ['char:bo', 'pose:stand', 'facing:left']],
        ]]));

        $layers = collect(StageSet::forScene('anim-test', 's1', 'Ana loopt naar Bo.')['set']['layers']);

        $ana = $layers->firstWhere('figure', 'ana');
        $this->assertNotNull($ana);
        $this->assertArrayNotHasKey('keys', $ana, 'no walk from the words: she stands');
        $this->assertArrayNotHasKey('animation', $ana);
    }

    public function test_a_composed_lesson_asking_for_a_walk_still_imports_and_the_figure_stands(): void
    {
        Storage::fake('public');
        Log::spy();
        $lesson = json_decode((string) file_get_contents(base_path('tests/Fixtures/stage25d/mini-lesson.json')), true);
        $lesson['scenes'][0]['figures'][0]['animation'] = 'walk';
        $lesson['scenes'][0]['set']['layers'][1] = [...$lesson['scenes'][0]['set']['layers'][1], 'puppet' => $this->puppet(-1), 'animation' => 'walk'];

        $r = app(LessonImporter::class)->import($lesson, User::factory()->create());

        $figure = Scene::where('lesson_id', $r['lesson_id'])->orderBy('order')->first()->config['stage25d']['set']['layers'][1];
        $this->assertArrayNotHasKey('animation', $figure);
        $this->assertArrayNotHasKey('keys', $figure);
        $this->assertNotEmpty(array_filter($r['warnings'], fn ($w) => str_contains($w, 'animation')));
        Log::shouldHaveReceived('info')->withArgs(fn ($msg, $ctx) => $msg === 'animation preset ignored' && $ctx['animation'] === 'walk');
    }
}
