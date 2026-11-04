<?php

declare(strict_types=1);

namespace Tests\Feature\Music;

use App\Livewire\Wizard\SceneMusic;
use App\Models\Lesson;
use App\Models\MusicTrack;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Scene inspector > Music: every change saves, every change undoes, and only an admin can put a
 * track in the library (whoever uploads vouches for its licence).
 */
class SceneMusicEditorTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Scene $scene;

    private MusicTrack $track;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->teacher = User::factory()->create();
        $lesson = Lesson::create(['teacher_id' => $this->teacher->id, 'topic' => 'The VOC', 'subject' => 'history', 'grade_level' => '6']);
        $this->scene = Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready']);
        $this->track = MusicTrack::create(['title' => 'Road ahead', 'licence' => 'suno_paid', 'path' => 'music/road.mp3']);
    }

    public function test_a_teacher_adds_a_track_changes_it_and_undoes_step_by_step(): void
    {
        $this->actingAs($this->teacher);

        $c = Livewire::test(SceneMusic::class, ['scene' => $this->scene])
            ->call('setInherit', false)
            ->set('addTrackId', $this->track->id)
            ->call('addLayer')
            ->set('music.layers.0.volume', 0.3)
            ->set('music.layers.0.loop_end', 42);

        $music = $this->scene->fresh()->music;
        $this->assertSame($this->track->id, $music['layers'][0]['track_id']);
        $this->assertSame(0.3, $music['layers'][0]['volume']);
        $this->assertEquals(42, $music['layers'][0]['loop_end']);

        $c->call('undo');
        $this->assertNull($this->scene->fresh()->music['layers'][0]['loop_end']);
        $c->call('undo')->call('undo');
        $this->assertSame([], $this->scene->fresh()->music['layers']);
        $c->call('undo');
        $this->assertNull($this->scene->fresh()->music, 'back to "continue from the scene before"');
        $this->assertNull($this->scene->fresh()->music_undo);
    }

    public function test_another_teacher_cannot_touch_the_scene(): void
    {
        $this->actingAs(User::factory()->create());

        Livewire::test(SceneMusic::class, ['scene' => $this->scene])->assertForbidden();
    }

    public function test_only_an_admin_uploads_and_the_track_lands_in_the_scene(): void
    {
        $file = UploadedFile::fake()->create('road.mp3', 500, 'audio/mpeg');

        $this->actingAs($this->teacher);
        Livewire::test(SceneMusic::class, ['scene' => $this->scene])
            ->set('upload', $file)->set('uploadTitle', 'Nope')
            ->call('saveUpload')->assertForbidden();

        $this->teacher->update(['role' => 'admin']);
        Livewire::test(SceneMusic::class, ['scene' => $this->scene])
            ->set('upload', $file)
            ->set('uploadTitle', 'Harbour at dawn')
            ->set('uploadSource', 'https://suno.com/s/fTrDC3Nbq9febwlm')
            ->set('uploadLicence', 'suno_paid')
            ->call('saveUpload')
            ->assertHasNoErrors();

        $track = MusicTrack::where('title', 'Harbour at dawn')->firstOrFail();
        Storage::disk('public')->assertExists($track->path);
        $this->assertSame($track->id, $this->scene->fresh()->music['layers'][0]['track_id']);
    }

    public function test_a_pasted_suno_link_fills_the_title_and_other_links_are_not_fetched(): void
    {
        Http::fake(['suno.com/*' => Http::response('<meta property="og:title" content="Road ahead &amp; home">')]);
        $this->teacher->update(['role' => 'admin']);
        $this->actingAs($this->teacher);

        Livewire::test(SceneMusic::class, ['scene' => $this->scene])
            ->set('uploadSource', 'https://suno.com/s/fTrDC3Nbq9febwlm')
            ->assertSet('uploadTitle', 'Road ahead & home')
            ->set('uploadTitle', 'My own title')
            ->set('uploadSource', 'https://suno.com/s/other')
            ->assertSet('uploadTitle', 'My own title');

        Livewire::test(SceneMusic::class, ['scene' => $this->scene])
            ->set('uploadSource', 'http://169.254.169.254/latest')
            ->assertSet('uploadTitle', '');
        Http::assertSentCount(1);
    }

    public function test_an_unknown_licence_is_refused(): void
    {
        $this->teacher->update(['role' => 'admin']);
        $this->actingAs($this->teacher);

        Livewire::test(SceneMusic::class, ['scene' => $this->scene])
            ->set('upload', UploadedFile::fake()->create('a.mp3', 100, 'audio/mpeg'))
            ->set('uploadTitle', 'A')
            ->set('uploadLicence', 'suno_free')
            ->call('saveUpload')
            ->assertHasErrors('uploadLicence');
    }

    public function test_the_player_ships_the_mix_and_its_tracks(): void
    {
        $this->scene->update(['music' => ['layers' => [['track_id' => $this->track->id, 'volume' => 0.5]], 'crossfade' => 2, 'duck' => 0.4]]);

        $tracks = MusicTrack::forScenes([$this->scene->fresh()]);

        $this->assertSame(['url' => $this->track->url(), 'title' => 'Road ahead'], $tracks[$this->track->id]);
        $this->assertSame([], MusicTrack::forScenes([]));
    }

    public function test_the_import_command_reads_the_file_and_licence(): void
    {
        $file = tempnam(sys_get_temp_dir(), 'm').'.mp3';
        file_put_contents($file, 'ID3');

        $this->artisan('music:import', ['file' => $file, '--title' => 'Road ahead 2', '--licence' => 'suno_paid'])->assertSuccessful();
        $this->artisan('music:import', ['file' => $file, '--licence' => 'suno_free'])->assertFailed();

        Storage::disk('public')->assertExists(MusicTrack::where('title', 'Road ahead 2')->firstOrFail()->path);
    }
}
