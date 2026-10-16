<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Models\User;
use App\Services\LessonComposer;
use App\Services\LessonExporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * A split scene (two comic panels) travels through a spec: `split` => ['dir', 'at'] plus its two
 * `shots`, one per panel. And the retired Parallax / Drawing mode keys never come back out.
 */
class SplitSceneSpecTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();

        $this->teacher = User::factory()->create();
        Storage::fake('public');
        Http::fake(['*' => Http::response('fake-image-bytes')]);
    }

    /** @return array<string,mixed> */
    private function spec(array $scene): array
    {
        return [
            'key' => 'Split round trip',
            'title' => 'Split round trip',
            'subject' => 'history',
            'grade_level' => '6',
            'tone' => 'storytelling',
            'scenes' => [array_merge([
                'type' => 'story',
                'chapter' => 'The bay',
                'location' => 'Golden Bay',
                'year' => 1642,
                'script' => 'They saw the bay.',
            ], $scene)],
        ];
    }

    /** @return list<array<string,mixed>> */
    private function panels(): array
    {
        return [
            ['order' => 0, 'image_path' => 'lessons/x/bay.webp', 'layers' => [['path' => 'lessons/x/bay.webp', 'kind' => 'cover', 'depth' => 1.0]],
                'camera' => ['move' => 'pan-r']],
            ['order' => 1, 'image_path' => 'lessons/x/deck.webp', 'layers' => [['path' => 'lessons/x/deck.webp', 'kind' => 'cover', 'depth' => 1.0]],
                'focus' => ['x' => 40.0, 'y' => 20.0]],
        ];
    }

    public function test_a_split_scene_survives_compose_and_export(): void
    {
        $spec = $this->spec(['split' => ['dir' => 'v', 'at' => 0.4], 'shots' => $this->panels()]);

        $lesson = app(LessonComposer::class)->build($spec, $this->teacher, narrate: false);
        $scene = $lesson->scenes()->first();

        $this->assertSame(['dir' => 'v', 'at' => 0.4], $scene->config['split']);
        $this->assertCount(2, $scene->shots);
        $this->assertSame('pan-r', $scene->shots[0]['camera']['move']);
        $this->assertEquals(['x' => 40, 'y' => 20], $scene->shots[1]['focus']);

        $exported = app(LessonExporter::class)->toSpec($lesson->fresh())['scenes'][0];
        $this->assertSame(['dir' => 'v', 'at' => 0.4], $exported['split']);
        $this->assertArrayNotHasKey('split', $exported['extra_config'] ?? []);
        $this->assertSame('lessons/x/deck.webp', $exported['shots'][1]['image_path']);

        // …and the exported spec rebuilds into the same split.
        $again = app(LessonComposer::class)->build(array_merge($spec, ['scenes' => [array_merge($spec['scenes'][0], $exported)]]), $this->teacher, narrate: false);
        $this->assertSame(['dir' => 'v', 'at' => 0.4], $again->scenes()->first()->config['split']);
    }

    public function test_a_split_is_clamped_to_the_editor_range(): void
    {
        $lesson = app(LessonComposer::class)->build(
            $this->spec(['split' => ['dir' => 'x', 'at' => 0.95], 'shots' => $this->panels()]), $this->teacher, narrate: false);

        $this->assertSame(['dir' => 'h', 'at' => 0.75], $lesson->scenes()->first()->config['split']);
    }

    public function test_a_split_without_two_panels_fails_before_anything_is_built(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('two `shots`');

        app(LessonComposer::class)->build(
            $this->spec(['split' => ['dir' => 'h', 'at' => 0.5], 'shots' => [$this->panels()[0]]]), $this->teacher, narrate: false);
    }

    public function test_the_retired_parallax_and_drawing_keys_read_as_standard_and_are_not_exported(): void
    {
        $lesson = app(LessonComposer::class)->build(
            $this->spec(['extra_config' => ['slideshow_mode' => 'drawing', 'parallax' => true, 'transition' => 'fade']]),
            $this->teacher, narrate: false);
        $scene = $lesson->scenes()->first();
        // The data is still there (no data loss); nothing reads it.
        $this->assertSame('drawing', $scene->config['slideshow_mode']);
        $this->assertSame('standard', \App\Services\Support\SceneSplit::mode($scene->config));

        $exported = app(LessonExporter::class)->toSpec($lesson->fresh())['scenes'][0];
        $this->assertSame(['transition' => 'fade'], $exported['extra_config']);
        $this->assertArrayNotHasKey('split', $exported);
    }
}
