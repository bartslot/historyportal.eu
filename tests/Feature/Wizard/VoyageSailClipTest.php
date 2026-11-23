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
 * A voyage leg's crossing is a clip on the scene's timeline (Bart 2026-11-21: "the hormuz voyage leg is too long, I
 * want it to control the time, but it's not added to the timeline"). Its start and end are saved with the timeline.
 */
class VoyageSailClipTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{0: User, 1: Scene, 2: Scene} the teacher, the Hormuz leg and the itinerary */
    private function polo(): array
    {
        $teacher = User::factory()->create();
        $lesson = Lesson::create([
            'teacher_id' => $teacher->id, 'topic' => 'Marco Polo', 'subject' => 'history', 'grade_level' => 'Age 12',
            'image_style' => 'realistic', 'status' => LessonStatus::ScenesReady,
            'game_type' => 'voyage', 'game_config' => ['voyage' => 'marco-polo-1271'],
        ]);
        $overview = Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'voyage', 'status' => 'ready',
            'config' => ['voyage' => 'marco-polo-1271', 'leg' => 0, 'overview' => true, 'view' => 'flat']]);
        $hormuz = Scene::create(['lesson_id' => $lesson->id, 'order' => 2, 'kind' => 'voyage', 'status' => 'ready', 'location' => 'Hormuz',
            'config' => ['voyage' => 'marco-polo-1271', 'leg' => 5, 'view' => 'flat']]);

        return [$teacher, $hormuz, $overview];
    }

    public function test_the_crossing_is_saved_with_the_timeline_and_a_broken_one_is_dropped(): void
    {
        [$teacher, $hormuz] = $this->polo();
        $editor = Livewire::actingAs($teacher)->test(Step3SceneConfigurator::class, ['lesson' => $hormuz->lesson])
            ->call('selectScene', $hormuz->id);

        $editor->call('setTimeline', ['duration' => 8, 'targets' => [], 'tracks' => [], 'sail' => ['start' => 1.234, 'end' => 4.5]]);
        $this->assertSame(['start' => 1.23, 'end' => 4.5], $hormuz->fresh()->config['timeline']['sail']);

        $editor->call('setTimeline', ['duration' => 8, 'targets' => [], 'tracks' => [], 'sail' => ['start' => 3, 'end' => 3.1]]);
        $this->assertArrayNotHasKey('sail', $hormuz->fresh()->config['timeline'], 'a crossing under half a second is not one');
    }

    public function test_the_timeline_knows_the_legs_dates_but_the_itinerary_sails_nothing(): void
    {
        [$teacher, $hormuz, $overview] = $this->polo();
        $editor = Livewire::actingAs($teacher)->test(Step3SceneConfigurator::class, ['lesson' => $hormuz->lesson]);

        $editor->call('selectScene', $hormuz->id);
        $this->assertSame(['depart' => '1272-04-01', 'arrive' => '1272-08-10'], $editor->instance()->sailLeg());
        $editor->assertSeeHtml('Crossing to Hormuz');

        $editor->call('selectScene', $overview->id);
        $this->assertNull($editor->instance()->sailLeg());
    }
}
