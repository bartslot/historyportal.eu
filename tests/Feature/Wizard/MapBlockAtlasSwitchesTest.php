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
 * Bart, 2026-10-26: "The map hosts modern city names... this is almost always not wanted. Make that a
 * switch that is turned off. And territories should also be auto off."
 *
 * A map block's modern place names (show_cities) and territory borders/fill (show_borders) are off
 * when the keys are absent, which covers every existing scene; the teacher turns them on and off.
 */
class MapBlockAtlasSwitchesTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    private Scene $map;

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::create([
            'teacher_id' => $this->teacher->id,
            'topic' => 'Tasman', 'subject' => 'history', 'grade_level' => 'K-7',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        // An existing block linked to a territory, saved before the switches existed.
        $this->map = Scene::create([
            'lesson_id' => $this->lesson->id, 'order' => 1, 'kind' => 'map', 'status' => 'ready',
            'config' => ['qid' => 'Q55', 'year' => 1642],
        ]);
    }

    private function wizard()
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $this->map->id);
    }

    public function test_both_switches_are_off_for_a_block_that_never_set_them(): void
    {
        $this->wizard()
            ->assertSeeHtml('Modern place names')
            ->assertSeeHtml('Territory borders');

        $config = $this->map->fresh()->config;
        $this->assertFalse((bool) ($config['show_cities'] ?? false));
        $this->assertFalse((bool) ($config['show_borders'] ?? false));
    }

    public function test_the_teacher_can_turn_each_on_and_off_again(): void
    {
        $c = $this->wizard();

        $c->call('setMapDetail', 'show_cities', true)->call('setMapDetail', 'show_borders', 'true');
        $this->assertTrue($this->map->fresh()->config['show_cities']);
        $this->assertTrue($this->map->fresh()->config['show_borders']);
        $this->assertSame('Q55', $this->map->fresh()->config['qid'], 'the linked territory is kept');

        $c->call('setMapDetail', 'show_cities', false)->call('setMapDetail', 'show_borders', false);
        $this->assertFalse($this->map->fresh()->config['show_cities']);
        $this->assertFalse($this->map->fresh()->config['show_borders']);
    }

    public function test_unknown_keys_are_ignored(): void
    {
        $this->wizard()->call('setMapDetail', 'qid', true);
        $this->assertSame('Q55', $this->map->fresh()->config['qid']);
    }
}
