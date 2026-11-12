<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\SceneRail;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/** The scene rail is its own component: the editor's renders leave it out and refresh it only when it changed. */
class SceneRailTest extends TestCase
{
    use RefreshDatabase;

    private function lesson(): Lesson
    {
        $lesson = Lesson::create([
            'teacher_id' => User::factory()->create()->id,
            'topic' => 'Hunebedden', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        foreach ([1, 2] as $order) {
            Scene::create(['lesson_id' => $lesson->id, 'order' => $order, 'kind' => 'stage25d', 'script_segment' => 'x', 'status' => 'ready',
                'location' => "Place {$order}", 'config' => ['stage25d' => ['bundle' => 'nl-prehistory', 'set' => ['layers' => []]]]]);
        }

        return $lesson;
    }

    public function test_the_rail_draws_the_scenes_and_sends_its_clicks_to_the_editor(): void
    {
        $lesson = $this->lesson();
        $scene = $lesson->scenes()->ordered()->first();
        Livewire::actingAs($lesson->teacher)->test(SceneRail::class, ['lessonId' => $lesson->id, 'selectedSceneId' => $scene->id])
            ->assertSee('Place 2')
            ->assertSeeHtml('wire:click="$parent.selectScene('.$scene->id.')"')
            ->assertSeeHtml('data-thumb-selected');
    }

    public function test_another_teacher_never_sees_the_rail(): void
    {
        $lesson = $this->lesson();
        Livewire::actingAs(User::factory()->create())->test(SceneRail::class, ['lessonId' => $lesson->id])->assertForbidden();
    }

    public function test_the_editor_refreshes_the_rail_only_when_what_it_shows_changed(): void
    {
        $lesson = $this->lesson();
        [$first, $second] = $lesson->scenes()->ordered()->get()->all();
        $editor = Livewire::actingAs($lesson->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson])->call('selectScene', $first->id);

        $editor->call('selectScene', $second->id)->assertNotDispatched('rail-refresh');
        $this->assertStringNotContainsString('data-scene-block', (string) ($editor->effects['html'] ?? ''), 'the rail is not in the editor\'s render');

        $second->update(['location' => 'Somewhere else']);
        $editor->call('selectScene', $first->id)->assertDispatched('rail-refresh');
    }
}
