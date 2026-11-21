<?php

declare(strict_types=1);

namespace Tests\Feature\Music;

use App\Livewire\Wizard\SceneMusic;
use App\Models\Lesson;
use App\Models\MusicTrack;
use App\Models\Scene;
use App\Models\User;
use App\Support\SceneAmbience;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * The sound under a scene: Auto picks a bed from what the scene says (a voyage always sails), the
 * teacher can pick another, turn it off, change its volume, undo, or describe a new one.
 */
class SceneAmbienceTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::create(['teacher_id' => $this->teacher->id, 'topic' => 'Marco Polo', 'subject' => 'history', 'grade_level' => '6']);
        foreach ([
            ['sail-open-sea', ['voyage', 'sail', 'ship']],
            ['sea-storm', ['storm', 'onweer']],
            ['desert-wind', ['desert', 'woestijn', 'sand', 'wind']],
            ['steppe-wind', ['steppe', 'vlakte', '!babylon']],
        ] as [$slug, $tags]) {
            MusicTrack::create(['title' => $slug, 'kind' => 'ambience', 'slug' => $slug, 'tags' => $tags, 'licence' => 'other', 'path' => "music/ambience/{$slug}.m4a"]);
        }
        MusicTrack::create(['title' => 'A song', 'licence' => 'suno_paid', 'path' => 'music/song.mp3']);
    }

    private int $order = 0;

    private function scene(string $kind, string $script, array $config = []): Scene
    {
        return Scene::create(['lesson_id' => $this->lesson->id, 'order' => ++$this->order, 'kind' => $kind, 'status' => 'ready', 'script_segment' => $script, 'config' => $config]);
    }

    private function slug(Scene $scene): ?string
    {
        $id = SceneAmbience::forScene($scene)['layers'][0]['track_id'] ?? null;

        return $id ? MusicTrack::find($id)->slug : null;
    }

    public function test_a_voyage_leg_sails_and_a_storm_in_the_narration_brings_the_storm(): void
    {
        $this->assertSame('sail-open-sea', $this->slug($this->scene('voyage', 'De schepen vertrekken uit Venetië.')));
        $this->assertSame('sea-storm', $this->slug($this->scene('voyage', 'Dan komt er een zware storm op.')));
    }

    public function test_auto_reads_the_scene_and_ignores_words_that_name_no_place(): void
    {
        $this->assertSame('desert-wind', $this->slug($this->scene('narration', 'De karavaan trekt door de woestijn.')));
        $this->assertNull($this->slug($this->scene('narration', 'Er staat wind.')));   // generic: no bed
    }

    public function test_a_regional_bed_only_plays_where_the_lesson_is(): void
    {
        $this->assertNull($this->slug($this->scene('narration', 'Een kale vlakte.')));   // Marco Polo, not Babylon
        $this->lesson->update(['topic' => 'Babylon en de eerste boeren']);
        $this->assertSame('steppe-wind', $this->slug($this->scene('narration', 'Een kale vlakte.')->fresh()));
    }

    public function test_a_3d_scene_with_its_own_beds_gets_no_auto_bed(): void
    {
        $scene = $this->scene('stage25d', 'De woestijn.', ['stage25d' => ['sound' => ['ambience' => [['id' => 'steppe-wind', 'gain' => 0.5]]]]]);
        $this->assertNull(SceneAmbience::forScene($scene));
    }

    public function test_the_teacher_picks_a_bed_changes_its_volume_turns_it_off_and_undoes(): void
    {
        $this->actingAs($this->teacher);
        $scene = $this->scene('narration', 'De karavaan trekt door de woestijn.');
        $storm = MusicTrack::where('slug', 'sea-storm')->first();

        $c = Livewire::test(SceneMusic::class, ['scene' => $scene])
            ->assertSee('Auto: desert-wind')
            ->call('setAmbience', (string) $storm->id)
            ->call('setAmbienceVolume', 0.2);
        $this->assertSame(['track_id' => $storm->id, 'volume' => 0.2], $scene->fresh()->config['ambience']);

        $c->call('setAmbience', 'off');
        $this->assertNull(SceneAmbience::forScene($scene->fresh()));

        $c->call('undo')->call('undo')->call('undo');
        $this->assertArrayNotHasKey('ambience', $scene->fresh()->config ?? []);
        $this->assertSame('desert-wind', $this->slug($scene->fresh()));
    }

    public function test_the_music_list_never_offers_an_ambience_bed(): void
    {
        $this->actingAs($this->teacher);
        $scene = $this->scene('narration', 'x');
        $bed = MusicTrack::where('slug', 'sea-storm')->first();

        Livewire::test(SceneMusic::class, ['scene' => $scene])
            ->call('setInherit', false)
            ->set('addTrackId', $bed->id)
            ->call('addLayer');
        $this->assertSame([], $scene->fresh()->music['layers']);
    }

    public function test_a_described_sound_is_made_stored_and_put_under_the_scene(): void
    {
        Http::fake(['api.elevenlabs.io/v1/sound-generation*' => Http::response('ID3fake-mp3', 200)]);
        $this->actingAs($this->teacher);
        $scene = $this->scene('narration', 'Een Apache op de berg.');

        Livewire::test(SceneMusic::class, ['scene' => $scene])
            ->set('soundPrompt', 'Desert wind over rocky mountains, a distant eagle cry')
            ->call('makeAmbience')
            ->assertHasNoErrors();

        $track = MusicTrack::query()->ambience()->whereNotNull('user_id')->sole();
        $this->assertSame('Desert wind over rocky mountains, a distant eagle cry', $track->prompt);
        Storage::disk('public')->assertExists($track->path);
        $this->assertSame($track->id, $scene->fresh()->config['ambience']['track_id']);
        Http::assertSent(fn ($r) => $r['loop'] === true && str_contains($r['text'], 'No music'));
    }

    public function test_a_failed_sound_says_so_and_changes_nothing(): void
    {
        Http::fake(['api.elevenlabs.io/*' => Http::response('quota', 401)]);
        $this->actingAs($this->teacher);
        $scene = $this->scene('narration', 'x');

        Livewire::test(SceneMusic::class, ['scene' => $scene])
            ->set('soundPrompt', 'Waves on a stony beach at night')
            ->call('makeAmbience')
            ->assertHasErrors('soundPrompt');
        $this->assertSame(4, MusicTrack::query()->ambience()->count());
    }
}
