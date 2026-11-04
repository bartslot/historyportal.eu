<?php

declare(strict_types=1);

namespace Tests\Feature\Music;

use App\Livewire\Wizard\LessonMusic;
use App\Livewire\Wizard\SceneMusic;
use App\Models\Lesson;
use App\Models\MusicTrack;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Lesson settings > Music: "this track from scene 1, that one from scene 15" lives in scenes.music
 * (a row = a scene with its own mix, the scenes after it continue), and every change undoes.
 */
class LessonMusicListTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    /** @var list<Scene> */
    private array $scenes = [];

    private MusicTrack $road;

    private MusicTrack $storm;

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::create(['teacher_id' => $this->teacher->id, 'topic' => 'The VOC', 'subject' => 'history', 'grade_level' => '6']);
        foreach (range(1, 20) as $n) {
            $this->scenes[] = Scene::create(['lesson_id' => $this->lesson->id, 'order' => $n, 'kind' => 'narration', 'status' => 'ready']);
        }
        $this->road = MusicTrack::create(['title' => 'Road ahead', 'licence' => 'suno_paid', 'path' => 'music/road.mp3']);
        $this->storm = MusicTrack::create(['title' => 'Storm', 'licence' => 'suno_paid', 'path' => 'music/storm.mp3']);
    }

    private function music(int $sceneNumber): ?array
    {
        return $this->scenes[$sceneNumber - 1]->fresh()->music;
    }

    public function test_the_list_round_trips_to_scene_music_and_undoes(): void
    {
        $this->actingAs($this->teacher);
        $c = Livewire::test(LessonMusic::class, ['lesson' => $this->lesson])
            ->call('addRow')
            ->set('rows.0.track_id', $this->road->id)
            ->call('addRow')
            ->set('rows.1.scene', 15)
            ->set('rows.1.track_id', $this->storm->id);

        $this->assertSame($this->road->id, $this->music(1)['layers'][0]['track_id']);
        foreach ([2, 3, 14, 16, 20] as $n) {
            $this->assertNull($this->music($n), "scene $n continues");
        }
        $this->assertSame($this->storm->id, $this->music(15)['layers'][0]['track_id']);
        $c->assertSet('rows', [
            ['scene' => 1, 'track_id' => $this->road->id, 'layers' => 1, 'origin' => 1],
            ['scene' => 15, 'track_id' => $this->storm->id, 'layers' => 1, 'origin' => 15],
        ]);

        // Swap the two tracks: scene numbers stay put.
        $c->call('moveRow', 1, -1);
        $this->assertSame($this->storm->id, $this->music(1)['layers'][0]['track_id']);
        $this->assertSame($this->road->id, $this->music(15)['layers'][0]['track_id']);

        $c->call('undo');
        $this->assertSame($this->road->id, $this->music(1)['layers'][0]['track_id']);
        $this->assertSame($this->storm->id, $this->music(15)['layers'][0]['track_id']);

        // Undo the scene-15 move and the second row: back to one track for the whole lesson.
        $c->call('undo')->call('undo')->call('undo');
        $this->assertNull($this->music(15));
        $this->assertNull($this->music(2));
        $this->assertCount(1, $c->get('rows'));
    }

    public function test_a_scene_edited_on_its_own_shows_up_in_the_list_and_keeps_its_mix(): void
    {
        $this->actingAs($this->teacher);
        Livewire::test(SceneMusic::class, ['scene' => $this->scenes[4]])
            ->call('setInherit', false)
            ->set('addTrackId', $this->road->id)
            ->call('addLayer')
            ->set('music.layers.0.volume', 0.25);

        $c = Livewire::test(LessonMusic::class, ['lesson' => $this->lesson])
            ->assertSet('rows', [['scene' => 5, 'track_id' => $this->road->id, 'layers' => 1, 'origin' => 5]]);

        // A list edit elsewhere leaves scene 5's own volume alone.
        $c->call('addRow')->set('rows.1.track_id', $this->storm->id);
        $this->assertSame(0.25, $this->music(5)['layers'][0]['volume']);
        $this->assertSame($this->storm->id, $this->music(6)['layers'][0]['track_id']);

        // Moving scene 5's row to scene 3 takes its own mix along; swapping rows swaps mixes.
        $c->set('rows.0.scene', 3);
        $this->assertNull($this->music(5));
        $this->assertSame(0.25, $this->music(3)['layers'][0]['volume']);
        $c->call('moveRow', 0, 1);
        $this->assertSame(0.25, $this->music(6)['layers'][0]['volume']);
        $this->assertSame($this->storm->id, $this->music(3)['layers'][0]['track_id']);
    }

    public function test_a_scene_number_used_twice_or_outside_the_lesson_is_refused(): void
    {
        $this->actingAs($this->teacher);
        $c = Livewire::test(LessonMusic::class, ['lesson' => $this->lesson])
            ->call('addRow')->call('addRow')
            ->set('rows.1.scene', 1)
            ->assertHasErrors('rows')
            ->set('rows.1.scene', 99)
            ->assertHasErrors('rows');
        $this->assertNotNull($this->music(2));
        $this->assertNotNull($this->music(1));
    }

    public function test_tempo_estimate_fills_once_and_only_an_admin_corrects_it(): void
    {
        $this->actingAs($this->teacher);
        $c = Livewire::test(LessonMusic::class, ['lesson' => $this->lesson])
            ->call('saveTempo', $this->road->id, 121.37, 0.42);
        $this->assertSame(121.4, $this->road->fresh()->bpm);
        $this->assertSame(0.42, $this->road->fresh()->beat_offset);

        $c->call('saveTempo', $this->road->id, 90, 0);
        $this->assertSame(121.4, $this->road->fresh()->bpm, 'an estimate never overwrites');
        $c->call('saveTempo', $this->road->id, 90, 0, true)->assertForbidden();

        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin);
        Livewire::test(LessonMusic::class, ['lesson' => $this->lesson])->call('saveTempo', $this->road->id, 92.5, 0.1, true);
        $this->assertSame(92.5, $this->road->fresh()->bpm);
        $this->assertSame(['url' => $this->road->url(), 'title' => 'Road ahead', 'bpm' => 92.5, 'beat_offset' => 0.1], $this->road->fresh()->forMixer());
    }

    public function test_another_teacher_cannot_open_the_list(): void
    {
        $this->actingAs(User::factory()->create());
        Livewire::test(LessonMusic::class, ['lesson' => $this->lesson])->assertForbidden();
    }
}
