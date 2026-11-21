<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Editing a voyage's stops from the itinerary (Bart 2026-11-21: "So how do I change Acre into Jerusalem" … "would be
 * nice to just drag the location on the map … the number"): drag a stop's number to move it, rename it in the list.
 */
class VoyageStopEditTest extends TestCase
{
    use RefreshDatabase;

    private function lesson(): array
    {
        $teacher = User::factory()->create();
        $lesson = Lesson::create([
            'teacher_id' => $teacher->id, 'topic' => 'Marco Polo', 'subject' => 'history', 'grade_level' => 'Age 12',
            'image_style' => 'realistic', 'status' => LessonStatus::ScenesReady,
            'game_type' => 'voyage', 'game_config' => ['voyage' => 'marco-polo-1271'],
        ]);
        $overview = Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'voyage', 'status' => 'ready',
            'config' => ['voyage' => 'marco-polo-1271', 'leg' => 0, 'overview' => true, 'view' => 'flat']]);
        $leg2 = Scene::create(['lesson_id' => $lesson->id, 'order' => 2, 'kind' => 'voyage', 'status' => 'ready',
            'config' => ['voyage' => 'marco-polo-1271', 'leg' => 2, 'view' => 'flat']]);

        return [$teacher, $lesson, $overview, $leg2];
    }

    public function test_dragging_a_stop_number_on_the_itinerary_moves_that_landfall_only(): void
    {
        [$teacher, $lesson, $overview, $leg2] = $this->lesson();
        $editor = Livewire::actingAs($teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->call('selectScene', $overview->id);
        $legs = $editor->instance()->voyageDef()['legs'];
        $stop = (int) $legs[5]['wp'][1];
        $bend = (int) $legs[5]['wp'][1] - 1 > (int) $legs[5]['wp'][0] ? (int) $legs[5]['wp'][1] - 1 : null;

        $editor->dispatch('voyageStopMoved', sceneId: $overview->id, wpIndex: $stop, lng: 51.4, lat: 35.7);
        $wps = $lesson->fresh()->game_config['voyage_def']['waypoints'];
        $this->assertEquals([51.4, 35.7], $wps[$stop]);

        // Not a stop: a bend stays where it is from the itinerary.
        if ($bend !== null) {
            $before = $wps[$bend];
            $editor->dispatch('voyageStopMoved', sceneId: $overview->id, wpIndex: $bend, lng: 10, lat: 10);
            $this->assertEquals($before, $lesson->fresh()->game_config['voyage_def']['waypoints'][$bend]);
        }

        // Only from the itinerary scene.
        $editor->call('selectScene', $leg2->id)
            ->dispatch('voyageStopMoved', sceneId: $leg2->id, wpIndex: $stop, lng: 1, lat: 1);
        $this->assertEquals([51.4, 35.7], $lesson->fresh()->game_config['voyage_def']['waypoints'][$stop]);
    }

    public function test_a_stop_is_renamed_from_the_list_with_or_without_a_scene(): void
    {
        [$teacher, $lesson, $overview, $leg2] = $this->lesson();
        $editor = Livewire::actingAs($teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->call('selectScene', $overview->id)
            ->assertSeeHtml('data-stop-rename');

        $editor->call('renameVoyageStop', 2, '  Jeruzalem ');
        $this->assertSame('Jeruzalem', $lesson->fresh()->game_config['voyage_def']['legs'][2]['title']);
        $this->assertSame('Jeruzalem', $leg2->fresh()->location, 'the leg scene carries the name for the map and the rail');

        $editor->call('renameVoyageStop', 7, 'Hormuz');
        $this->assertSame('Hormuz', $lesson->fresh()->game_config['voyage_def']['legs'][7]['title'], 'no scene needed');
        $this->assertSame('Jeruzalem', $leg2->fresh()->location);
    }
}
