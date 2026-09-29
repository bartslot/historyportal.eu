<?php

declare(strict_types=1);

namespace Tests\Feature\Diorama;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class DioramaCommandsTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    private Scene $scene;

    private string $dir;

    protected function setUp(): void
    {
        parent::setUp();

        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::create([
            'teacher_id' => $this->teacher->id,
            'topic' => 'Tasman', 'subject' => 'history', 'grade_level' => '9th',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        $this->scene = Scene::create([
            'lesson_id' => $this->lesson->id, 'order' => 1, 'kind' => 'narration',
            'year' => '1642', 'location' => 'Batavia', 'script_segment' => 'Script.',
            'image_path' => 'bg.png', 'audio_path' => 'a.mp3', 'audio_script_hash' => sha1('Script.'),
            'status' => 'ready', 'config' => ['texts' => [['id' => 'txt_title', 'text' => 'Batavia']]],
        ]);
        $this->dir = sys_get_temp_dir().'/diorama-test-'.getmypid();
        @mkdir($this->dir);
    }

    private function example(): string
    {
        return base_path('docs/diorama-example.json');
    }

    private function writeJson(string $name, array $data): string
    {
        $path = "{$this->dir}/{$name}";
        file_put_contents($path, json_encode($data));

        return $path;
    }

    public function test_import_saves_the_diorama_and_keeps_the_rest_of_the_config(): void
    {
        $this->artisan('diorama:import', ['scene' => $this->scene->id, 'file' => $this->example()])
            ->expectsOutputToContain('3 floor(s), 3 item(s)')
            ->assertSuccessful();

        $scene = $this->scene->fresh();
        $this->assertTrue($scene->isDiorama());
        $this->assertSame([-3, 6.25], $scene->config['diorama']['items'][2]['keys'][1]['cell']);
        $this->assertSame('Batavia', $scene->config['texts'][0]['text']);
    }

    public function test_export_returns_what_was_imported_so_agents_can_round_trip(): void
    {
        $this->artisan('diorama:import', ['scene' => $this->scene->id, 'file' => $this->example()])->assertSuccessful();
        $out = "{$this->dir}/out.json";

        $this->artisan('diorama:export', ['scene' => $this->scene->id, '--out' => $out])->assertSuccessful();

        $this->assertEquals(
            json_decode((string) file_get_contents($this->example()), true),
            json_decode((string) file_get_contents($out), true),
        );
    }

    public function test_a_bad_file_saves_nothing_and_lists_every_problem(): void
    {
        $spec = json_decode((string) file_get_contents($this->example()), true);
        $spec['items'][1]['cell'] = [2, 99];
        $spec['items'][2]['floor'] = 'mast';

        $this->artisan('diorama:import', ['scene' => $this->scene->id, 'file' => $this->writeJson('bad.json', $spec)])
            ->expectsOutputToContain('problem(s), nothing saved')
            ->expectsOutputToContain('items[1].cell: [2,99] is outside floor quay')
            ->expectsOutputToContain('items[2].floor: no floor with id "mast"')
            ->assertFailed();

        $this->assertFalse($this->scene->fresh()->isDiorama());
    }

    public function test_check_validates_without_saving(): void
    {
        $this->artisan('diorama:import', ['scene' => $this->scene->id, 'file' => $this->example(), '--check' => true])
            ->expectsOutputToContain('Valid. Nothing saved')
            ->assertSuccessful();

        $this->assertFalse($this->scene->fresh()->isDiorama());
    }

    public function test_a_blender_camera_replaces_the_camera_block(): void
    {
        $camera = $this->writeJson('quay_camera.json', [
            'shot' => 'quay', 'resolution' => [1920, 1080], 'camera_location_m' => [0.0, -6.0, 1.6],
            'camera_rotation_deg' => [90.0, 0.0, 0.0], 'focal_px' => 1506.9, 'horizon_y_px' => 360.0,
        ]);

        $this->artisan('diorama:import', ['scene' => $this->scene->id, 'file' => $this->example(), '--camera' => $camera])
            ->assertSuccessful();

        $saved = $this->scene->fresh()->config['diorama']['camera'];
        $this->assertSame(1920, $saved['width']);
        $this->assertEquals([960, 360.0], $saved['principal_px']);
        $this->assertSame('quay', $saved['source']);
    }

    public function test_broken_json_is_named(): void
    {
        $path = "{$this->dir}/broken.json";
        file_put_contents($path, '{"diorama": 1,');

        $this->artisan('diorama:import', ['scene' => $this->scene->id, 'file' => $path])
            ->expectsOutputToContain('is not valid JSON')
            ->assertFailed();
    }

    public function test_a_teacher_save_never_overwrites_a_newer_agent_import(): void
    {
        // The teacher opens the scene while it is still an old diorama …
        $this->artisan('diorama:import', ['scene' => $this->scene->id, 'file' => $this->example()])->assertSuccessful();
        $editor = Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $this->scene->id);

        // … an agent moves the barrel …
        $spec = json_decode((string) file_get_contents($this->example()), true);
        $spec['items'][1]['cell'] = [5, 9];
        $this->artisan('diorama:import', ['scene' => $this->scene->id, 'file' => $this->writeJson('moved.json', $spec)])->assertSuccessful();

        // … and the teacher's next save (of an unrelated text) must not put the barrel back.
        $editor->set('selectedScene.config.texts.0.text', 'Batavia, 1642')->call('saveSelected');

        $config = $this->scene->fresh()->config;
        $this->assertSame([5, 9], $config['diorama']['items'][1]['cell']);
        $this->assertSame('Batavia, 1642', $config['texts'][0]['text']);
    }

    public function test_an_unknown_scene_fails_cleanly(): void
    {
        $this->artisan('diorama:export', ['scene' => 999999])->assertFailed();
        $this->artisan('diorama:export', ['scene' => $this->scene->id])
            ->expectsOutputToContain('is not a diorama yet')
            ->assertFailed();
    }

    public function test_a_drag_in_the_editor_saves_the_new_cell(): void
    {
        $this->artisan('diorama:import', ['scene' => $this->scene->id, 'file' => $this->example()])->assertSuccessful();

        Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $this->scene->id)
            ->dispatch('diorama:move', itemId: 'barrel_1', floor: 'quay', cell: [3.25, 7.5])
            ->assertNotDispatched('scene:load');

        $items = $this->scene->fresh()->config['diorama']['items'];
        $this->assertSame([3.25, 7.5], $items[1]['cell']);
        $this->assertSame([10, 30], $items[0]['cell'], 'the other items are untouched');
    }

    public function test_a_drag_off_the_grid_is_refused_and_says_so(): void
    {
        $this->artisan('diorama:import', ['scene' => $this->scene->id, 'file' => $this->example()])->assertSuccessful();

        Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $this->scene->id)
            ->dispatch('diorama:move', itemId: 'barrel_1', floor: 'quay', cell: [3, 99])
            ->assertDispatched('toast');

        $this->assertSame([2, 6], $this->scene->fresh()->config['diorama']['items'][1]['cell']);
    }
}
