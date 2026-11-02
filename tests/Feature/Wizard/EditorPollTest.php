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
