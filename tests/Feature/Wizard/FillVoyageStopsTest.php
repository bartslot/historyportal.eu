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
 * A voyage's empty stops fill from its tour pack (Bart 2026-11-20: "Can we auto populate the stops of Marco Polo?"):
 * name, date, title and story, and never over what a teacher wrote.
 */
class FillVoyageStopsTest extends TestCase
{
    use RefreshDatabase;

    private function polo(User $teacher): Lesson
    {
        $lesson = Lesson::create([
            'teacher_id' => $teacher->id, 'topic' => 'Marco Polo', 'subject' => 'history', 'grade_level' => 'Age 12',
            'image_style' => 'realistic', 'status' => LessonStatus::ScenesReady,
            'game_type' => 'voyage', 'game_config' => ['voyage' => 'marco-polo-1271'],
        ]);
        foreach ([0, 3, 4] as $i => $leg) { // Akko, Ayas, Tabriz
            Scene::create(['lesson_id' => $lesson->id, 'order' => $i + 1, 'kind' => 'voyage', 'status' => 'ready',
                'location' => $leg === 3 ? 'Lajazzo' : null,
                'config' => ['voyage' => 'marco-polo-1271', 'leg' => $leg, 'view' => 'flat', 'gallery' => ['title' => '', 'story' => '']]]);
        }

        return $lesson->fresh();
    }

    public function test_empty_stops_fill_with_name_date_title_and_story_and_a_typed_name_stays(): void
    {
        $teacher = User::factory()->create();
        $lesson = $this->polo($teacher);
        $first = $lesson->scenes()->ordered()->first();

        $editor = Livewire::actingAs($teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->call('selectScene', $first->id);
        $this->assertSame(3, $editor->instance()->fillableStops());

        $editor->call('fillVoyageStops', true);

        $scenes = $lesson->scenes()->ordered()->get();
        $this->assertSame('Akko', $scenes[0]->location);
        $this->assertSame('20 mei 1271', $scenes[0]->config['gallery']['date_label']);
        $this->assertNotSame('', $scenes[0]->config['gallery']['story']);
        $this->assertSame($scenes[0]->config['gallery']['story'], $scenes[0]->script_segment, 'the story is the stop\'s script');
        $this->assertSame('Lajazzo', $scenes[1]->location, 'a name the teacher typed is kept');
        $this->assertSame('Tabriz', $scenes[2]->location);
        $this->assertSame('Akko', $lesson->fresh()->game_config['voyage_def']['legs'][0]['title']);
        $this->assertSame(0, $editor->instance()->fillableStops());
    }
}
