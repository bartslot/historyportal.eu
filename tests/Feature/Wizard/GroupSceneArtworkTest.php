<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\SvgAsset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Bart, 2026-11-28: "Grouping layers is not supported yet. I want to move a group and animate the group. I also would
 * like to set pivot points." Groups of pictures on a flat scene (GroupsSceneArtwork, ArtworkGroups).
 */
class GroupSceneArtworkTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Scene $scene;

    /** @var list<int> */
    private array $ids = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->teacher = User::factory()->create();
        $lesson = Lesson::create([
            'teacher_id' => $this->teacher->id,
            'topic' => 'Kublai', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        foreach (['Throne', 'Kublai', 'Guard'] as $n => $title) {
            $this->ids[] = SvgAsset::create([
                'user_id' => $this->teacher->id, 'source' => 'commons', 'source_ref' => 'k-'.$n,
                'source_url' => 'https://example.com/'.$n.'.png', 'title' => $title, 'license' => 'CC0',
                'svg_path' => 'assets/'.$n.'.png',
            ])->id;
        }
        $this->scene = Scene::create([
            'lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready',
            'image_path' => 'hall.png',
            'config' => ['timeline' => ['duration' => 10, 'tracks' => []]],
            'shots' => [['order' => 0, 'image_path' => 'hall.png', 'layers' => [
                ['path' => 'hall.png', 'kind' => 'cover', 'depth' => 1.0],
                ['asset_id' => $this->ids[0], 'path' => 'assets/0.png', 'kind' => 'figure', 'x' => 40.0, 'y' => 60.0, 'scale' => 1.0, 'height' => 40],
                ['asset_id' => $this->ids[1], 'path' => 'assets/1.png', 'kind' => 'figure', 'x' => 60.0, 'y' => 60.0, 'scale' => 1.0, 'height' => 40],
                ['asset_id' => $this->ids[2], 'path' => 'assets/2.png', 'kind' => 'figure', 'x' => 80.0, 'y' => 60.0, 'scale' => 1.0, 'height' => 40],
            ]]],
        ]);
    }

    private function wizard()
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->scene->lesson])
            ->call('selectScene', $this->scene->id);
    }

    private function layer(int $assetId): array
    {
        return collect($this->scene->fresh()->shots[0]['layers'])->firstWhere('asset_id', $assetId);
    }

    public function test_group_makes_one_group_round_the_pictures_and_selects_it(): void
    {
        $this->wizard()->call('groupArtworkLayers', [$this->ids[0], $this->ids[1]], 50.0, 55.0, 16 / 9)
            ->assertDispatched('artwork:select-group', id: 'grp_g1')
            ->assertSet('activeArtGroupId', 'g1');

        $shot = $this->scene->fresh()->shots[0];
        $this->assertSame('g1', $shot['groups'][0]['id']);
        $this->assertSame(50.0, $shot['groups'][0]['pivot_x']);
        $this->assertSame('g1', $this->layer($this->ids[0])['group']);
        $this->assertSame('g1', $this->layer($this->ids[1])['group']);
        $this->assertArrayNotHasKey('group', $this->layer($this->ids[2]));
    }

    public function test_the_editor_and_the_player_receive_the_groups_and_the_pivots(): void
    {
        $wizard = $this->wizard()->call('groupArtworkLayers', [$this->ids[0]], 40.0, 60.0);
        $wizard->call('setArtworkPivot', $this->ids[1], 0.0, 1.0, 58.0, 62.0);

        $shots = $wizard->instance()->serializeShots($this->scene->fresh());
        $this->assertSame('g1', $shots[0]['groups'][0]['id']);
        $byId = collect($shots[0]['layers'])->keyBy('asset_id');
        $this->assertSame('g1', $byId[$this->ids[0]]['group']);
        $this->assertSame(0.0, $byId[$this->ids[1]]['pivot_x']);
        $this->assertSame(1.0, $byId[$this->ids[1]]['pivot_y']);
        $this->assertEquals(58.0, $byId[$this->ids[1]]['x']);
    }

    public function test_canvas_and_panel_values_save_on_the_group_held_to_their_range(): void
    {
        $wizard = $this->wizard()->call('groupArtworkLayers', [$this->ids[0], $this->ids[1]], 50.0, 60.0);

        $wizard->call('moveArtworkGroup', 'g1', ['x' => 12.5, 'rotation' => 30, 'scale' => 99, 'evil' => 'x']);
        $wizard->call('updateArtworkGroup', 'g1', 'name', ' Throne <i>and</i> Khan ');
        $wizard->call('updateArtworkGroup', 'g1', 'nonsense', 3);

        $group = $this->scene->fresh()->shots[0]['groups'][0];
        $this->assertSame(12.5, $group['x']);
        $this->assertSame(30.0, $group['rotation']);
        $this->assertSame(6.0, $group['scale']);
        $this->assertSame('Throne and Khan', $group['name']);
        $this->assertArrayNotHasKey('evil', $group);
        $this->assertArrayNotHasKey('nonsense', $group);
    }

    public function test_group_keys_are_kept_by_the_timeline(): void
    {
        $wizard = $this->wizard()->call('groupArtworkLayers', [$this->ids[0], $this->ids[1]], 50.0, 60.0);
        $wizard->call('setTimeline', ['duration' => 10, 'tracks' => [
            ['target' => 'grp:g1', 'property' => 'x', 'keyframes' => [['time' => 0, 'value' => 0], ['time' => 2, 'value' => 20]]],
            ['target' => 'grp:g1', 'property' => 'bogus', 'keyframes' => [['time' => 0, 'value' => 1]]],
        ]]);

        $tracks = $this->scene->fresh()->config['timeline']['tracks'];
        $this->assertSame(['grp:g1'], array_column($tracks, 'target'));
        $this->assertSame('x', $tracks[0]['property']);
    }

    public function test_ungroup_leaves_the_pictures_where_the_group_put_them_and_drops_its_keys(): void
    {
        $wizard = $this->wizard()->call('groupArtworkLayers', [$this->ids[0], $this->ids[1]], 50.0, 60.0);
        $wizard->call('moveArtworkGroup', 'g1', ['x' => 10]);
        $wizard->call('setTimeline', ['duration' => 10, 'tracks' => [
            ['target' => 'grp:g1', 'property' => 'x', 'keyframes' => [['time' => 0, 'value' => 0], ['time' => 2, 'value' => 20]]],
        ]]);

        $wizard->call('ungroupArtwork', 'g1', 16 / 9)->assertSet('activeArtGroupId', null);

        $scene = $this->scene->fresh();
        $this->assertArrayNotHasKey('groups', $scene->shots[0]);
        $this->assertArrayNotHasKey('group', $this->layer($this->ids[0]));
        $this->assertEqualsWithDelta(50.0, $this->layer($this->ids[0])['x'], 1e-6);
        $this->assertSame([], $scene->config['timeline']['tracks']);
    }

    public function test_deleting_a_group_deletes_its_pictures_and_deleting_its_last_picture_deletes_the_group(): void
    {
        $wizard = $this->wizard()->call('groupArtworkLayers', [$this->ids[0], $this->ids[1]], 50.0, 60.0);
        $wizard->dispatch('scene:delete-object', objectId: 'grp_g1');
        $layers = $this->scene->fresh()->shots[0]['layers'];
        $this->assertSame([$this->ids[2]], array_values(array_filter(array_column($layers, 'asset_id'))));

        $wizard->call('groupArtworkLayers', [$this->ids[2]], 80.0, 60.0);
        $wizard->call('detachArtwork', $this->ids[2]);
        $this->assertArrayNotHasKey('groups', $this->scene->fresh()->shots[0] ?? []);
    }

    public function test_a_canvas_pivot_drag_saves_with_the_move(): void
    {
        $this->wizard()->dispatch('artwork:move', assetId: $this->ids[2], x: 79.0, y: 61.0, scale: 1.0, rotation: 15.0, pivotX: 0.5, pivotY: 1.0);

        $layer = $this->layer($this->ids[2]);
        $this->assertSame(0.5, $layer['pivot_x']);
        $this->assertSame(1.0, $layer['pivot_y']);
        $this->assertSame(15.0, $layer['rotation']);
    }

    public function test_detaching_the_last_picture_of_an_animated_group_drops_its_keys_and_its_id_is_not_reused(): void
    {
        $wizard = $this->wizard()->call('groupArtworkLayers', [$this->ids[0]], 40.0, 60.0);
        $wizard->call('setTimeline', ['duration' => 10, 'tracks' => [
            ['target' => 'grp:g1', 'property' => 'x', 'keyframes' => [['time' => 0, 'value' => 0], ['time' => 2, 'value' => 20]]],
        ]]);
        $wizard->call('detachArtwork', $this->ids[0]);
        $this->assertSame([], $this->scene->fresh()->config['timeline']['tracks']);

        $wizard->call('groupArtworkLayers', [$this->ids[1]], 60.0, 60.0)->assertSet('activeArtGroupId', 'g1');
    }

    public function test_opening_another_scene_closes_the_group_panel(): void
    {
        $other = Scene::create([
            'lesson_id' => $this->scene->lesson_id, 'order' => 2, 'kind' => 'narration', 'status' => 'ready',
            'image_path' => 'yard.png', 'config' => [],
        ]);
        $this->wizard()->call('groupArtworkLayers', [$this->ids[0]], 40.0, 60.0)
            ->assertSet('activeArtGroupId', 'g1')
            ->call('selectScene', $other->id)
            ->assertSet('activeArtGroupId', null);
    }
}
