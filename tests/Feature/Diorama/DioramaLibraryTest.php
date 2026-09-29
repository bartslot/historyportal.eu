<?php

declare(strict_types=1);

namespace Tests\Feature\Diorama;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\SvgAsset;
use App\Models\User;
use App\Services\Diorama\LibraryAssets;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class DioramaLibraryTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    private Scene $scene;

    protected function setUp(): void
    {
        parent::setUp();

        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::create([
            'teacher_id' => $this->teacher->id, 'topic' => 'Florence', 'subject' => 'history', 'grade_level' => '9th',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        $spec = json_decode((string) file_get_contents(base_path('docs/diorama-example.json')), true);
        $this->scene = Scene::create([
            'lesson_id' => $this->lesson->id, 'order' => 1, 'kind' => 'narration', 'year' => '1300', 'location' => 'Florence',
            'script_segment' => 'Script.', 'status' => 'ready', 'config' => ['diorama' => $spec],
        ]);
    }

    /** A 1000 × 1600 picture whose drawing fills rows 0.1 .. 0.9 of it: 1280 drawn px for 1.6 m. */
    private function libraryPicture(string $placement = 'stands', ?float $heightM = 1.6): SvgAsset
    {
        return SvgAsset::create([
            'user_id' => null, 'source' => 'bundled', 'source_ref' => 'history-line/figures/citizens/donna.webp', 'source_url' => '',
            'title' => 'Donna fiorentina', 'license' => 'Royalty-free', 'svg_path' => 'svg-assets/library/donna.webp',
            'width' => 1000, 'height' => 1600, 'collection' => 'history-line', 'category' => 'figures',
            'description' => 'A Florentine woman, standing.', 'placement' => $placement, 'height_m' => $heightM,
            'opaque_box' => [0.2, 0.1, 0.6, 0.9],
        ]);
    }

    private function editor()
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $this->scene->id);
    }

    public function test_a_library_picture_is_sized_by_its_drawn_part_and_stands_on_its_bottom_centre(): void
    {
        $a = $this->libraryPicture();
        $stage = LibraryAssets::forSpec(['items' => [['asset' => 'library:'.$a->id]]])['library:'.$a->id];

        $this->assertSame(800.0, $stage['px_per_m']);                 // (0.9 - 0.1) × 1600 px / 1.6 m
        $this->assertEquals([1.25, 2.0], $stage['frame_m']);           // the whole picture in metres
        $this->assertEquals([0.4, 0.9], $stage['anchor']);             // bottom centre of the drawing
        $this->assertSame('A Florentine woman, standing.', $stage['description']);
    }

    public function test_dropping_a_picture_adds_it_on_the_floor_cell_with_a_readable_id(): void
    {
        $a = $this->libraryPicture();

        $this->editor()->dispatch('diorama:add', assetId: $a->id, floor: 'quay', cell: [1.25, 8])
            ->assertDispatched('scene:load');
        $this->editor()->dispatch('diorama:add', assetId: $a->id, floor: 'quay', cell: [3, 8]);

        $items = collect($this->scene->fresh()->config['diorama']['items'])->keyBy('id');
        $this->assertEquals(['floor' => 'quay', 'cell' => [1.25, 8], 'asset' => 'library:'.$a->id],
            array_intersect_key($items['donna_fiorentina_1'], array_flip(['floor', 'cell', 'asset'])));
        $this->assertTrue($items->has('donna_fiorentina_2'));
    }

    public function test_a_cloud_cannot_stand_on_the_floor_and_says_why(): void
    {
        $cloud = $this->libraryPicture('sky', null);
        $before = $this->scene->config['diorama']['items'];

        $this->editor()->dispatch('diorama:add', assetId: $cloud->id, floor: 'quay', cell: [0, 8])
            ->assertDispatched('toast', message: 'Clouds and birds belong in the sky, not on the floor.');

        $this->assertSame($before, $this->scene->fresh()->config['diorama']['items']);
    }

    public function test_deleting_the_boat_takes_its_deck_and_crew_with_it(): void
    {
        $this->editor()->dispatch('scene:delete-object', objectId: 'dio_boat');

        $spec = $this->scene->fresh()->config['diorama'];
        $this->assertSame(['barrel_1'], array_column($spec['items'], 'id'));
        $this->assertSame(['quay', 'sea'], array_column($spec['floors'], 'id'));
        $this->assertSame(['doorway'], array_column($spec['spots'], 'id'));
    }

    public function test_dropping_a_backdrop_makes_it_the_whole_background(): void
    {
        $backdrop = SvgAsset::create([
            'user_id' => null, 'source' => 'bundled', 'source_ref' => 'history-line/backdrops/florence/lungarno.webp', 'source_url' => '',
            'title' => 'Lungarno', 'license' => 'Royalty-free', 'svg_path' => 'svg-assets/library/lungarno.webp',
            'cdn_url' => 'https://res.cloudinary.com/x/lungarno.webp', 'width' => 2880, 'height' => 1607,
            'collection' => 'history-line', 'category' => 'backdrops',
        ]);
        $items = $this->scene->config['diorama']['items'];
        $this->scene->update(['config' => ['diorama' => [...$this->scene->config['diorama'], 'plate' => ['base' => '/diorama/x/', 'image' => 'bg.webp', 'occluders' => [['id' => 'wall', 'image' => 'wall.webp', 'depth_m' => [14, 14.4]]]]]]]);

        $this->editor()->dispatch('diorama:add', assetId: $backdrop->id, floor: 'quay', cell: [0, 8])
            ->assertDispatched('scene:load');

        $spec = $this->scene->fresh()->config['diorama'];
        $this->assertSame('https://res.cloudinary.com/x/lungarno.webp', $spec['plate']['image']);
        $this->assertSame([], $spec['plate']['occluders']);
        $this->assertSame($items, $spec['items'], 'the figures stay where they stand');
        $this->assertSame('/diorama/x/', $spec['plate']['base'], 'the scene keeps where its own pictures live');
    }

    public function test_selecting_a_diorama_item_opens_its_own_format_panel(): void
    {
        $this->editor()
            ->call('selectInspectorTarget', 'dio_sailor_1')
            ->assertSet('activeDioramaId', 'sailor_1')
            ->assertSeeHtml('data-diorama-inspector="sailor_1"')
            ->call('selectInspectorTarget', 'dio_nobody')
            ->assertSet('activeDioramaId', null)
            ->call('selectInspectorTarget', 'dio_sailor_1')
            ->call('selectInspectorTarget', '')
            ->assertSet('activeDioramaId', null)
            ->assertDontSeeHtml('data-diorama-inspector=');
    }
}
