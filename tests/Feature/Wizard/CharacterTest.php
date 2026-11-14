<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\SvgAsset;
use App\Models\User;
use App\Services\Editor\Characters;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/** The Character tab's Save: a person from the kit onto "My characters", rigged for the stage, checked on the way in. */
class CharacterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    private static function webp(int $w = 8, int $h = 8): string
    {
        $img = imagecreatetruecolor($w, $h);
        ob_start();
        imagewebp($img);

        return 'data:image/webp;base64,'.base64_encode((string) ob_get_clean());
    }

    /** @return array<string,mixed> */
    private static function puppet(): array
    {
        return [
            'width' => 300, 'height' => 700, 'facing' => 1, 'paint' => 'flat',
            'bones' => [
                ['name' => 'hips', 'parent' => null, 'from' => [150, 350], 'to' => [150, 300]],
                ['name' => 'chest', 'parent' => 'hips', 'from' => [150, 300], 'to' => [150, 150], 'limit' => [-8, 8], 'band' => 30, 'reach' => 120],
                ['name' => 'head', 'parent' => 'chest', 'from' => [150, 150], 'to' => [150, 10], 'limit' => [-25, 25]],
            ],
            'parts' => [
                ['bone' => 'hips', 'quad' => [[100, 300], [200, 300], [200, 700], [100, 700]], 'uv' => [0, 0, 0.5, 0.5]],
                ['bone' => 'head', 'quad' => [[100, 0], [200, 0], [200, 160], [100, 160]], 'uv' => [0.5, 0, 1, 0.5]],
            ],
            'faces' => ['sad' => [0, 0.5, 0.5, 1], 'grin' => [0, 0, 1, 1]],
        ];
    }

    /** @return array<string,mixed> */
    private static function recipe(array $over = []): array
    {
        return [
            'kit' => 'babylonia-old-babylonian', 'body' => 'woman', 'outfit' => 'work-tunic-apron', 'face' => 'woman-n',
            'parts' => ['hair/woman-bun', 'headwear/woman-headband'], 'eyes' => 'woman-round', 'skin' => 's3', 'hair_colour' => 'black-brown',
            'height_m' => 1.55, 'zones' => ['garment' => 'undyed-wool', 'apron' => 'indigo-blue'], 'role' => 'Weaver', ...$over,
        ];
    }

    private function scene(User $teacher): Scene
    {
        $lesson = Lesson::create([
            'teacher_id' => $teacher->id, 'topic' => 'X', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);

        return Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'script_segment' => 'x', 'status' => 'ready']);
    }

    public function test_a_character_lands_on_the_shelf_rigged_with_its_recipe_and_shade(): void
    {
        $teacher = User::factory()->create();
        $scene = $this->scene($teacher);

        Livewire::actingAs($teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])
            ->call('selectScene', $scene->id)
            ->call('saveCharacter', null, self::webp(), self::webp(), self::puppet(), self::recipe(), 'Weaver')
            ->assertReturned(fn ($r) => $r['ok'] === true && $r['stage']['id'] === 'chr-'.$r['id'] && $r['stage']['puppet']['paint'] === 'flat')
            ->assertDispatched('cutouts-changed');

        $asset = SvgAsset::where('source', Characters::SOURCE)->sole();
        $this->assertSame('Weaver', $asset->title);
        $this->assertSame(1.55, $asset->height_m);
        Storage::disk('public')->assertExists($asset->svg_path);
        Storage::disk('public')->assertExists(Characters::shadePath($asset->svg_path));
        $this->assertSame(['sad'], array_keys($asset->character['puppet']['faces']), 'an unknown expression is dropped');
        $this->assertSame('woman-round', $asset->character['recipe']['eyes']);
        $row = Characters::stageRow($asset);
        $this->assertSame('/storage/'.$asset->svg_path, $row['puppet']['atlas']);
        $this->assertSame(['figure', 'character'], $row['tags']);
    }

    public function test_saving_again_keeps_the_id_and_replaces_the_files(): void
    {
        $teacher = User::factory()->create();
        $first = Characters::save($teacher, null, self::webp(), self::webp(), self::puppet(), self::recipe(), 'A');
        $old = $first->svg_path;
        $again = Characters::save($teacher, $first->id, self::webp(), self::webp(), self::puppet(), self::recipe(['outfit' => 'long-wrap']), 'B');

        $this->assertSame($first->id, $again->id);
        $this->assertSame('long-wrap', $again->character['recipe']['outfit']);
        Storage::disk('public')->assertMissing($old);
        $this->assertSame(1, SvgAsset::where('source', Characters::SOURCE)->count());
        $this->assertNull(Characters::save(User::factory()->create(), $first->id, self::webp(), self::webp(), self::puppet(), self::recipe(), 'C'), 'not theirs');
    }

    public function test_a_bad_recipe_puppet_or_picture_saves_nothing(): void
    {
        $teacher = User::factory()->create();
        $bad = [
            'unknown outfit' => [self::webp(), self::webp(), self::puppet(), self::recipe(['outfit' => 'robe'])],
            'unknown kit' => [self::webp(), self::webp(), self::puppet(), self::recipe(['kit' => '../x'])],
            'unknown bone' => [self::webp(), self::webp(), ['bones' => [['name' => 'tail', 'parent' => null, 'from' => [1, 1]]]] + self::puppet(), self::recipe()],
            'part on no bone' => [self::webp(), self::webp(), ['parts' => [['bone' => 'arm', 'quad' => [[0, 0], [1, 0], [1, 1], [0, 1]], 'uv' => [0, 0, 1, 1]]]] + self::puppet(), self::recipe()],
            'uv out of the atlas' => [self::webp(), self::webp(), ['parts' => [['bone' => 'hips', 'quad' => [[0, 0], [1, 0], [1, 1], [0, 1]], 'uv' => [0, 0, 2, 1]]]] + self::puppet(), self::recipe()],
            'svg atlas' => ['data:image/svg+xml;base64,PHN2Zz4=', self::webp(), self::puppet(), self::recipe()],
            'png shade' => [self::webp(), 'data:image/png;base64,iVBORw0KGgo=', self::puppet(), self::recipe()],
            'huge frame' => [self::webp(), self::webp(), ['width' => 99999] + self::puppet(), self::recipe()],
        ];
        foreach ($bad as $why => [$atlas, $shade, $puppet, $recipe]) {
            $this->assertNull(Characters::save($teacher, null, $atlas, $shade, $puppet, $recipe, 'x'), $why);
        }
        $this->assertSame(0, SvgAsset::count());
        $this->assertSame([], Storage::disk('public')->allFiles('characters'), 'nothing left behind');
    }

    public function test_the_recipe_keeps_only_kit_ids(): void
    {
        $kit = Characters::kit('babylonia-old-babylonian');
        $r = Characters::recipe($kit, self::recipe(['parts' => ['hair/woman-bun', 'hair/../../etc', 7], 'skin' => 'blue', 'zones' => ['garment' => '#fff', 'apron' => 'madder-red'], 'height_m' => 9, 'mouth' => 'nope']));

        $this->assertSame(['hair/woman-bun'], $r['parts']);
        $this->assertSame('s1', $r['skin']);
        $this->assertSame(['apron' => 'madder-red'], $r['zones']);
        $this->assertSame(2.1, $r['height_m']);
        $this->assertArrayNotHasKey('mouth', $r);
    }

    public function test_a_lesson_shows_its_characters_to_the_class_and_the_shelf_lets_go(): void
    {
        $teacher = User::factory()->create();
        $asset = Characters::save($teacher, null, self::webp(), self::webp(), self::puppet(), self::recipe(), 'Weaver');
        $scene = $this->scene($teacher);
        $scene->update(['config' => ['stage25d' => ['set' => ['layers' => [['asset' => 'chr-'.$asset->id, 'depth' => 'mid']]]]]]);

        $this->assertSame('figure', Characters::layerOf('chr-'.$asset->id, $teacher->id));
        $this->assertNull(Characters::layerOf('chr-'.$asset->id, User::factory()->create()->id));
        $this->assertTrue(Characters::remove($teacher, $asset->id));
        $rows = Characters::forStage(null, $scene->lesson->fresh());
        $this->assertSame(['chr-'.$asset->id], array_column($rows, 'id'), 'a removed one still plays in the lesson');
        $this->assertTrue($rows[0]['removed']);
        $this->assertSame([], Characters::forStage($teacher), 'off the shelf');
    }
}
