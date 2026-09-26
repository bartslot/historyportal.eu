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
        $this->assertSame(['path' => $scene->image_path, 'kind' => 'cover', 'depth' => 0.4], $cover);

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

    public function test_an_unknown_gallery_asset_fails_loudly(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $this->compose(['type' => 'gallery', 'images' => ['asset:history-line/nope']]);
    }
}
