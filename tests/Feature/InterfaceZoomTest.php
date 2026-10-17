<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\LessonStatus;
use App\Livewire\Settings;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * The editor's zoom level, per teacher (Bart, 2026-10-17, after Spotify's "Zoom level"): three
 * named sizes with a picture of the editor each, a 70-130% scale, Reset. Stored on the account so
 * it follows the teacher to every device; drawn as the editor page's root font size.
 */
class InterfaceZoomTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create();
    }

    public function test_a_stored_size_reads_as_a_step_of_the_scale(): void
    {
        $this->assertSame([70, 80, 90, 100, 110, 120, 130], User::UI_SCALES);
        $this->assertSame(100, $this->teacher->uiScale());
        foreach ([[125, 130], [90, 90], [60, 70], [140, 130], [null, 100]] as [$stored, $read]) {
            $this->assertSame($read, $this->teacher->forceFill(['ui_scale' => $stored])->uiScale(), "stored {$stored}");
        }
    }

    public function test_choosing_a_size_saves_it_at_once_and_reset_puts_back_default(): void
    {
        $settings = Livewire::actingAs($this->teacher)->test(Settings::class)
            ->assertSeeText('Zoom level')
            ->assertSeeText('Dense')->assertSeeText('Default')->assertSeeText('Spacious');
        $this->assertMatchesRegularExpression('#value="100"[^>]*data-ui-scale[^>]*checked#', $settings->html());

        $settings->call('setUiScale', 70);
        $this->assertSame(70, $this->teacher->fresh()->ui_scale);
        $this->assertMatchesRegularExpression('#value="70"[^>]*data-ui-scale[^>]*checked#', $settings->html());

        $settings->call('setUiScale', 75);
        $this->assertSame(70, $this->teacher->fresh()->ui_scale, 'only a step of the scale');

        $settings->call('setUiScale', 100);
        $settings->call('setUiScale', 130)->call('resetUiScale');
        $this->assertSame(100, $this->teacher->fresh()->ui_scale);
    }

    public function test_the_editor_is_drawn_at_the_teachers_size_and_at_100_exactly_as_before(): void
    {
        $lesson = Lesson::create([
            'teacher_id' => $this->teacher->id, 'topic' => 'Tasman', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady, 'wizard_step' => 4,
        ]);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready', 'script_segment' => 'Eens.']);
        $editor = fn () => $this->actingAs($this->teacher->fresh())->get(route('teacher.lessons.wizard', $lesson).'?step=4')->assertOk()->getContent();

        $this->assertDoesNotMatchRegularExpression('#<html[^>]*font-size#', $editor());

        $this->teacher->update(['ui_scale' => 130]);
        $this->assertMatchesRegularExpression('#<html[^>]*style="font-size: 130%"#', $editor());

        // Only the editor: the dashboard keeps its size.
        $this->assertDoesNotMatchRegularExpression('#<html[^>]*font-size#', $this->actingAs($this->teacher)->get(route('settings.index'))->getContent());
    }
}
