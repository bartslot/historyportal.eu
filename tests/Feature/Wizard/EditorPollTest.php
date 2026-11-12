<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/** The editor's 3 s poll draws the whole editor only when the lesson changed under it. */
class EditorPollTest extends TestCase
{
    use RefreshDatabase;

    private function editor(): array
    {
        $lesson = Lesson::create([
            'teacher_id' => User::factory()->create()->id,
            'topic' => 'Hunebedden', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        $scene = Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'stage25d', 'script_segment' => 'x', 'status' => 'ready',
            'config' => ['stage25d' => ['bundle' => 'nl-prehistory', 'set' => ['layers' => []]]]]);
        $editor = Livewire::actingAs($lesson->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson])->call('selectScene', $scene->id);

        return [$editor, $scene];
    }

    private function rendered($editor): bool
    {
        return array_key_exists('html', $editor->effects);
    }

    public function test_an_idle_poll_sends_no_render(): void
    {
        [$editor] = $this->editor();

        $editor->call('poll');

        $this->assertFalse($this->rendered($editor));
        $editor->assertNotDispatched('scene:load');
    }

    public function test_a_scene_a_job_changed_is_drawn_and_reloaded_on_the_next_poll(): void
    {
        [$editor, $scene] = $this->editor();
        $this->travel(5)->seconds();
        $scene->update(['status' => 'generating']);

        $editor->call('poll');

        $this->assertTrue($this->rendered($editor));
        $editor->assertDispatched('scene:load');
        $editor->call('poll');
        $this->assertFalse($this->rendered($editor), 'drawn once, then quiet again');
    }

    public function test_a_new_thumbnail_is_drawn_on_the_next_poll(): void
    {
        [$editor, $scene] = $this->editor();
        $this->travel(5)->seconds();
        $scene->forceFill(['image_path' => 'lessons/x/still-abc.jpg'])->saveQuietly();

        $editor->call('poll');

        $this->assertTrue($this->rendered($editor));
    }

    public function test_thumbnails_drawn_in_the_background_cost_no_render_each(): void
    {
        [$editor, $scene] = $this->editor();
        Storage::fake('public');
        $this->travel(5)->seconds();

        $editor->call('saveStage25dStill', $scene->id, 'data:image/jpeg;base64,'.base64_encode("\xFF\xD8\xFF\xE0rest"), null, true);
        $this->assertFalse($this->rendered($editor));
        $this->assertNotNull($scene->fresh()->image_path);

        $editor->call('poll');
        $this->assertFalse($this->rendered($editor), 'the poll does not draw it again: the caller refreshes once');
    }

    public function test_a_thumbnail_the_scene_already_has_is_not_stored_again_and_draws_nothing(): void
    {
        [$editor, $scene] = $this->editor();
        Storage::fake('public');
        $jpeg = 'data:image/jpeg;base64,'.base64_encode("\xFF\xD8\xFF\xE0rest");
        $editor->call('saveStage25dStill', $scene->id, $jpeg);
        $this->assertTrue($this->rendered($editor), 'a new thumbnail: the rail shows it');
        $stamp = $scene->fresh()->updated_at;
        $this->travel(5)->seconds();

        $editor->call('saveStage25dStill', $scene->id, $jpeg);

        $this->assertFalse($this->rendered($editor));
        $this->assertEquals($stamp, $scene->fresh()->updated_at, 'not written again');
    }

    public function test_a_layer_moved_on_the_stage_is_saved_without_a_render_and_the_poll_stays_quiet(): void
    {
        [$editor, $scene] = $this->editor();
        $this->stageLayer($scene);
        $this->travel(5)->seconds();

        $editor->dispatch('stage25d:layer', index: 0, patch: ['x' => 0.4, 'z' => 7.5], sceneId: $scene->id);

        $this->assertFalse($this->rendered($editor), 'the stage and its Format panel already show it');
        $this->assertSame(0.4, $scene->fresh()->config['stage25d']['set']['layers'][0]['x']);
        $editor->call('poll');
        $this->assertFalse($this->rendered($editor), 'nor does the next poll draw it again');
    }

    public function test_a_ground_strip_moved_back_is_saved_without_a_render_but_a_new_strip_picture_is_drawn(): void
    {
        [$editor, $scene] = $this->editor();
        $config = $scene->config;
        $config['stage25d']['set']['groundBands'] = [['asset' => 'terrain-dunes-01', 'z' => 40.0]];
        $scene->update(['config' => $config]);

        $editor->dispatch('stage25d:layer', index: 0, patch: ['band' => ['index' => 0, 'z' => 80.0]], sceneId: $scene->id);
        $this->assertFalse($this->rendered($editor));
        $this->assertEquals(80.0, $scene->fresh()->config['stage25d']['set']['groundBands'][0]['z']);

        $editor->dispatch('stage25d:layer', index: 0, patch: ['band' => ['index' => 0, 'asset' => 'terrain-dunes-02']], sceneId: $scene->id);
        $this->assertTrue($this->rendered($editor));
    }

    public function test_a_layer_edit_the_page_shows_is_still_drawn(): void
    {
        [$editor, $scene] = $this->editor();
        $this->stageLayer($scene);

        $editor->dispatch('stage25d:layer', index: 0, patch: ['x' => 0.4, 'depth' => 'fg'], sceneId: $scene->id);

        $this->assertTrue($this->rendered($editor));
    }

    private function stageLayer(Scene $scene): void
    {
        $config = $scene->config;
        $config['stage25d']['set']['layers'] = [['asset' => 'girl-01', 'depth' => 'mid', 'x' => 0.2, 'z' => 7.0]];
        $scene->update(['config' => $config]);
    }

    public function test_an_idle_lesson_polls_slowly_and_one_being_made_polls_fast(): void
    {
        [$editor, $scene] = $this->editor();
        $editor->assertSeeHtml('wire:poll.15s="poll"')->assertDontSeeHtml('wire:poll.3s');

        $this->travel(5)->seconds();
        $scene->update(['status' => 'generating']);
        $editor->call('poll');

        $editor->assertSeeHtml('wire:poll.3s="poll"')->assertDontSeeHtml('wire:poll.15s');
    }

    public function test_a_world_being_made_polls_fast(): void
    {
        [$editor, $scene] = $this->editor();
        $this->travel(5)->seconds();
        $scene->update(['world_labs_status' => 'pending']);

        $editor->call('poll');

        $editor->assertSeeHtml('wire:poll.3s="poll"');
    }

    public function test_a_teacher_action_sent_in_the_same_request_as_the_poll_is_still_drawn(): void
    {
        [$editor] = $this->editor();
        // Livewire sends calls made at the same moment in one request: the poll tick and a selection
        $editor->update(calls: [
            ['method' => 'poll', 'params' => [], 'path' => ''],
            ['method' => 'selectInspectorTarget', 'params' => ['s25_layer-0'], 'path' => ''],
        ]);

        $this->assertTrue($this->rendered($editor));
    }
}
