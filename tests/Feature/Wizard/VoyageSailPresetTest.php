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
 * The itinerary's "Sail the whole voyage" preset (Bart 2026-11-21: "make a preset so we can show the whole route
 * animated"): the traveller sails every leg in one scene, so it is given two seconds a leg to do it in.
 */
class VoyageSailPresetTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_preset_gives_the_voyage_time_to_sail_and_a_plain_draw_takes_it_back(): void
    {
        $teacher = User::factory()->create();
        $lesson = Lesson::create([
            'teacher_id' => $teacher->id, 'topic' => 'Marco Polo', 'subject' => 'history', 'grade_level' => 'Age 12',
            'image_style' => 'realistic', 'status' => LessonStatus::ScenesReady,
            'game_type' => 'voyage', 'game_config' => ['voyage' => 'marco-polo-1271'],
        ]);
        $overview = Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'voyage', 'status' => 'ready',
            'config' => ['voyage' => 'marco-polo-1271', 'leg' => 0, 'overview' => true, 'view' => 'flat']]);

        $editor = Livewire::actingAs($teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->call('selectScene', $overview->id)
            ->call('setOverviewAnim', 'route', 'sail');
        $anim = $overview->fresh()->config['overview_anim'];
        $this->assertSame('sail', $anim['route']);
        $this->assertEquals(32, $anim['duration'], 'sixteen legs, two seconds each');

        $editor->call('setOverviewAnim', 'duration', 75);
        $this->assertEquals(75, $overview->fresh()->config['overview_anim']['duration'], 'a sail may run longer than a draw');

        $editor->call('setOverviewAnim', 'route', 'draw');
        $this->assertEquals(10, $overview->fresh()->config['overview_anim']['duration'], 'a draw stays inside its ten seconds');
        $editor->assertSeeHtml(__('Sail the whole voyage'));
    }
}
