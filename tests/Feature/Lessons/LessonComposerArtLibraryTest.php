<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Models\Scene;
use App\Models\SvgAsset;
use App\Models\User;
use App\Services\LessonComposer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * A spec can build a scene from the shared art library: a backdrop copied into the lesson, and
 * figure layers placed exactly as the editor's attachArtwork() would place them.
 */
class LessonComposerArtLibraryTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->teacher = User::factory()->create();
    }

    private function libraryAsset(string $ref, string $ext): SvgAsset
    {
        $path = "svg-assets/bundled/{$ref}.{$ext}";
        Storage::disk('public')->put($path, "bytes-of-{$ref}");

        return SvgAsset::factory()->create([
            'user_id' => null,
            'source' => 'bundled',
            'source_ref' => "{$ref}.{$ext}",
            'svg_path' => $path,
            'title' => basename($ref),
        ]);
    }

    private function compose(array $scene): Scene
    {
        $lesson = app(LessonComposer::class)->build([
            'key' => 'Art library test',
            'scenes' => [$scene],
        ], $this->teacher, narrate: false);

        return $lesson->scenes()->firstOrFail();
    }

    public function test_backdrop_is_copied_into_the_scene_and_becomes_its_image(): void
    {
        $this->libraryAsset('history-line/backdrops/florence/firenze-strada', 'webp');

        $scene = $this->compose([
            'type' => 'story',
            'script' => 'Firenze.',
            'backdrop' => 'history-line/backdrops/florence/firenze-strada',
            'image' => 'commons:Should be ignored.jpg',
        ]);

        $expected = "lessons/{$scene->lesson_id}/scenes/{$scene->id}/bg.webp";
        $this->assertSame($expected, $scene->image_path);
        Storage::disk('public')->assertExists($expected);
        $this->assertSame('bytes-of-history-line/backdrops/florence/firenze-strada', Storage::disk('public')->get($expected));
    }

    public function test_a_line_art_backdrop_turns_the_players_backdrop_shade_off(): void
    {
        // Ink on white paper: the player's stage shade greyed it while the figures stayed white.
        $this->libraryAsset('history-line/backdrops/florence/firenze-strada', 'webp');
        $this->libraryAsset('paintings/some-oil-painting', 'webp');

        $lineArt = $this->compose(['type' => 'story', 'script' => 'Firenze.', 'backdrop' => 'history-line/backdrops/florence/firenze-strada']);
        $painting = $this->compose(['type' => 'story', 'script' => 'Olio.', 'backdrop' => 'paintings/some-oil-painting']);

        $this->assertFalse($lineArt->config['backdrop_shade']);
        $this->assertArrayNotHasKey('backdrop_shade', $painting->config);   // paintings keep the shade

        // The drawn room shows whole ("Whole image"), letterboxed on its own white paper, camera still.
        $this->assertSame('contain', $lineArt->config['background_fit']);
        $this->assertSame('#ffffff', $lineArt->background_color);
        $this->assertFalse($lineArt->kb_animated);
        $this->assertArrayNotHasKey('background_fit', $painting->config);
    }

    public function test_layers_resolve_from_the_library_with_editor_defaults(): void
    {
        $this->libraryAsset('history-line/backdrops/florence/firenze-strada', 'webp');
        $dante = $this->libraryAsset('history-line/figures/dante/dante-giovane', 'webp');
        $cypress = $this->libraryAsset('history-line/props/trees/cipresso', 'png');

        $scene = $this->compose([
            'type' => 'story',
            'script' => 'Dante.',
            'backdrop' => 'history-line/backdrops/florence/firenze-strada',
            'layers' => [
                ['asset' => 'history-line/figures/dante/dante-giovane', 'x' => 30, 'y' => 78, 'height' => 60, 'depth' => 1.0, 'anim' => 'fade', 'anim_delay' => 0.4, 'ambient' => 'bob'],
                ['asset' => 'history-line/props/trees/cipresso', 'x' => 10],
                ['asset' => 'history-line/props/trees/cipresso', 'x' => 90],
            ],
        ]);

        $shot = $scene->shots[0];
        $this->assertSame(0, $shot['order']);
        $this->assertSame($scene->image_path, $shot['image_path']);

        [$cover, $figure, $treeA, $treeB] = $shot['layers'];
        // Depth 1, not the editor's 0.4: the figures stand on this floor, so it moves with them.
        $this->assertEquals(['path' => $scene->image_path, 'kind' => 'cover', 'depth' => 1.0], $cover);

        $this->assertSame($dante->id, $figure['asset_id']);
        $this->assertSame($dante->svg_path, $figure['path']);
        $this->assertSame('figure', $figure['kind']);
        $this->assertEquals(30, $figure['x']);
        $this->assertEquals(78, $figure['y']);
        $this->assertEquals(60, $figure['height']);
        $this->assertEquals(1.0, $figure['depth']);
        $this->assertEquals(1.0, $figure['scale']);
        $this->assertSame('fade', $figure['anim']);
        $this->assertSame('bob', $figure['ambient']);
        $this->assertArrayNotHasKey('asset', $figure);

        // Unset keys take the editor's attach defaults.
        $this->assertSame($cypress->id, $treeA['asset_id']);
        $this->assertEquals(10, $treeA['x']);
        $this->assertEquals(58, $treeA['y']);
        $this->assertEquals(40, $treeA['height']);
        $this->assertEquals(1.3, $treeA['depth']);
        $this->assertSame($cypress->id, $treeB['asset_id']);
        $this->assertEquals(90, $treeB['x']);
    }

    public function test_layers_on_a_scene_without_a_backdrop_make_a_layer_only_shot(): void
    {
        $this->libraryAsset('history-line/figures/dante/dante-giovane', 'webp');

        $scene = $this->compose([
            'type' => 'map',
            'script' => 'Map.',
            'layers' => [['asset' => 'history-line/figures/dante/dante-giovane']],
        ]);

        $this->assertArrayNotHasKey('image_path', $scene->shots[0]);
        $this->assertCount(1, $scene->shots[0]['layers']);
    }

    public function test_an_unknown_asset_fails_the_compose_loudly(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/scene #1.*history-line\/figures\/dante\/typo/');

        $this->compose([
            'type' => 'story',
            'chapter' => 'Un bambino',
            'layers' => [['asset' => 'history-line/figures/dante/typo']],
        ]);
    }

    public function test_an_unknown_layer_key_fails_the_compose_loudly(): void
    {
        $this->libraryAsset('history-line/figures/dante/dante-giovane', 'webp');

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/flip/');

        $this->compose([
            'type' => 'story',
            'layers' => [['asset' => 'history-line/figures/dante/dante-giovane', 'flip' => true]],
        ]);
    }

    public function test_an_unknown_backdrop_fails_the_compose_loudly(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $this->compose(['type' => 'story', 'backdrop' => 'history-line/backdrops/nowhere']);
    }

    public function test_a_teachers_own_upload_is_not_the_library(): void
    {
        $asset = $this->libraryAsset('history-line/figures/dante/dante-giovane', 'webp');
        $asset->update(['user_id' => $this->teacher->id]);

        $this->expectException(\InvalidArgumentException::class);

        $this->compose(['type' => 'story', 'layers' => [['asset' => 'history-line/figures/dante/dante-giovane']]]);
    }

    public function test_gallery_asset_images_are_copied_into_the_lesson(): void
    {
        $this->libraryAsset('history-line/backdrops/commedia/dore-inferno', 'webp');

        $scene = $this->compose([
            'type' => 'gallery',
            'script' => 'Inferno.',
            'images' => [
                'asset:history-line/backdrops/commedia/dore-inferno',
                ['url' => 'https://example.test/one.jpg', 'credit' => 'Someone'],
            ],
        ]);

        $images = $scene->config['images'];
        $this->assertCount(2, $images);
        $path = "lessons/{$scene->lesson_id}/gallery/dore-inferno.webp";
        $this->assertSame('/storage/'.$path, $images[0]['url']);
        Storage::disk('public')->assertExists($path);
        $this->assertSame('https://example.test/one.jpg', $images[1]['url']);
    }

    public function test_recompose_clears_the_previous_scene_copies_only(): void
    {
        $this->libraryAsset('history-line/backdrops/florence/firenze-strada', 'webp');
        $this->libraryAsset('history-line/backdrops/commedia/dore-inferno', 'webp');
        $spec = [
            ['type' => 'story', 'backdrop' => 'history-line/backdrops/florence/firenze-strada'],
            ['type' => 'gallery', 'images' => ['asset:history-line/backdrops/commedia/dore-inferno']],
        ];

        $first = $this->compose($spec[0]);
        $disk = Storage::disk('public');
        $lessonDir = "lessons/{$first->lesson_id}";
        $disk->put("{$lessonDir}/narration-cache/abc.mp3", 'audio');
        $disk->put("{$lessonDir}/paintings/kept.jpg", 'painting');
        $disk->put("{$lessonDir}/gallery/stale.webp", 'stale');
        // A path an exported spec still points at survives, even inside the cleared folders.
        $disk->put("{$lessonDir}/scenes/999/upload.png", 'referenced');

        $second = app(LessonComposer::class)->build([
            'key' => 'Art library test',
            'scenes' => [
                $spec[0] + ['shots' => [['order' => 0, 'layers' => [['asset_id' => 1, 'path' => "{$lessonDir}/scenes/999/upload.png"]]]]],
                $spec[1],
            ],
        ], $this->teacher, narrate: false)->scenes()->orderBy('order')->firstOrFail();

        $this->assertSame($first->lesson_id, $second->lesson_id);
        $disk->assertMissing("{$lessonDir}/scenes/{$first->id}");
        $disk->assertExists($second->image_path);
        $disk->assertExists("{$lessonDir}/narration-cache/abc.mp3");
        $disk->assertExists("{$lessonDir}/paintings/kept.jpg");
        $disk->assertExists("{$lessonDir}/scenes/999/upload.png");
        $disk->assertMissing("{$lessonDir}/gallery/stale.webp");
        $disk->assertExists("{$lessonDir}/gallery/dore-inferno.webp");
    }

    public function test_a_bad_ref_on_a_later_scene_leaves_the_existing_lesson_untouched(): void
    {
        $this->libraryAsset('history-line/backdrops/florence/firenze-strada', 'webp');
        $composer = app(LessonComposer::class);
        $good = [
            'key' => 'Art library test',
            'scenes' => [
                ['type' => 'quiz', 'when' => 'pre', 'questions' => [['q' => 'Where?', 'o' => ['A', 'B'], 'c' => 0]]],
                ['type' => 'story', 'backdrop' => 'history-line/backdrops/florence/firenze-strada'],
            ],
        ];
        $lesson = $composer->build($good, $this->teacher, narrate: false);
        $this->assertTrue($composer->publish($lesson));
        $sceneIds = $lesson->scenes()->orderBy('order')->pluck('id')->all();
        $bg = $lesson->scenes()->whereNotNull('image_path')->value('image_path');

        $bad = $good;
        $bad['scenes'][] = ['type' => 'story', 'layers' => [['asset' => 'history-line/figures/dante/typo']]];

        try {
            $composer->build($bad, $this->teacher, narrate: false);
            $this->fail('A bad library ref must throw.');
        } catch (\InvalidArgumentException $e) {
            $this->assertStringContainsString('scene #3', $e->getMessage());
        }

        $lesson->refresh();
        $this->assertSame($sceneIds, $lesson->scenes()->orderBy('order')->pluck('id')->all());
        $this->assertSame(1, $lesson->quizQuestions()->count());
        $this->assertSame(\App\Enums\LessonStatus::Published, $lesson->status);
        Storage::disk('public')->assertExists($bg);
    }

    public function test_a_build_that_fails_mid_way_leaves_no_copies_behind(): void
    {
        $this->libraryAsset('history-line/backdrops/florence/firenze-strada', 'webp');
        $backdrop = ['type' => 'story', 'backdrop' => 'history-line/backdrops/florence/firenze-strada'];
        $first = $this->compose($backdrop);
        $disk = Storage::disk('public');
        $before = $disk->allFiles("lessons/{$first->lesson_id}/scenes");

        // Scene 1 copies its backdrop into a new scene folder, then scene 2 dies: the transaction
        // rolls that scene row back, so nothing would ever name (or clean) the copy.
        $this->mock(\App\Services\SceneImageSourcer::class)
            ->shouldReceive('find')->andThrow(new \RuntimeException('Commons is down'));

        try {
            app(LessonComposer::class)->build([
                'key' => 'Art library test',
                'scenes' => [$backdrop, ['type' => 'story', 'image' => 'Some painting']],
            ], $this->teacher, narrate: false);
            $this->fail('The sourcing failure must propagate.');
        } catch (\RuntimeException $e) {
            $this->assertSame('Commons is down', $e->getMessage());
        }

        $this->assertSame($before, $disk->allFiles("lessons/{$first->lesson_id}/scenes"));
    }

    public function test_a_spec_that_is_not_valid_utf8_deletes_no_files(): void
    {
        $this->libraryAsset('history-line/backdrops/florence/firenze-strada', 'webp');
        $first = $this->compose(['type' => 'story', 'backdrop' => 'history-line/backdrops/florence/firenze-strada']);

        // Never stored, so the build succeeds; only the spec-wide path match is in doubt.
        app(LessonComposer::class)->build([
            'key' => 'Art library test',
            'note' => "bad \xB1 bytes",
            'scenes' => [['type' => 'story', 'backdrop' => 'history-line/backdrops/florence/firenze-strada']],
        ], $this->teacher, narrate: false);

        Storage::disk('public')->assertExists($first->image_path);
    }

    public function test_an_unknown_gallery_asset_fails_loudly(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $this->compose(['type' => 'gallery', 'images' => ['asset:history-line/nope']]);
    }
}
