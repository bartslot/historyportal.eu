<?php

declare(strict_types=1);

namespace App\Livewire\Wizard;

use App\Enums\MusicLicence;
use App\Livewire\Wizard\Concerns\GuardsLessonClaims;
use App\Models\Lesson;
use App\Models\MusicTrack;
use App\Models\Scene;
use App\Services\Collaboration\LessonCollaboration;
use App\Services\ElevenLabsService;
use App\Support\SceneAmbience;
use App\Support\SceneMusic as SceneMusicShape;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Once;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Livewire\Attributes\On;
use Livewire\Attributes\Validate;
use Livewire\Component;
use Livewire\WithFileUploads;

/**
 * Scene inspector > Music: which library tracks play under this scene, how loud, from where, looped
 * between which points, and how they fade. Every change saves at once and can be undone (house
 * rule: the teacher can change and reverse everything). The player mixes it (scene/music-mixer.js).
 *
 * Only admins add tracks to the library: whoever uploads vouches for the licence.
 *
 * Below it, Sound: the ambience bed under the scene (App\Support\SceneAmbience), Auto, a bed from the
 * library, or Off, with its volume, and a field to describe a new one that ElevenLabs makes.
 */
class SceneMusic extends Component
{
    use GuardsLessonClaims;
    use WithFileUploads;

    protected function claimLesson(): ?Lesson
    {
        return isset($this->scene) ? $this->scene->lesson : null;
    }

    /** The music belongs to the scene it sits in: whoever holds that scene. */
    protected function claimTarget(): ?string
    {
        return isset($this->scene) ? LessonCollaboration::sceneTarget((int) $this->scene->id) : null;
    }

    protected function claimFreeMethods(): array
    {
        return ['$refresh', 'reload'];
    }

    protected function claimFreeProperties(): array
    {
        return ['soundPrompt', 'uploadTitle', 'uploadLicence', 'addTrackId'];
    }

    private const UNDO_DEPTH = 30;

    public Scene $scene;

    /** The scene's mix as the form edits it; null = carry on with the previous scene's music. */
    public ?array $music = null;

    public ?int $addTrackId = null;

    #[Validate('required|file|mimetypes:audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a|max:20480')]
    public $upload = null;

    #[Validate('required|string|max:120')]
    public string $uploadTitle = '';

    #[Validate('nullable|url|max:500')]
    public string $uploadSource = '';

    public string $uploadLicence = 'suno_paid';

    /** What a new ambience bed should sound like ("Desert wind over rocky mountains, a distant eagle"). */
    public string $soundPrompt = '';

    /** New sounds per teacher per hour: each one is an ElevenLabs call. */
    private const SOUNDS_PER_HOUR = 10;

    #[Validate('nullable|string|max:500')]
    public string $uploadNote = '';

    public function mount(Scene $scene): void
    {
        $this->authorizeScene($scene);
        $this->scene = $scene;
        $this->music = $scene->music;
    }

    /** Lesson settings > Music rewrote some scenes' music: show this scene's as it is now. */
    #[On('lesson-music-changed')]
    public function reload(): void
    {
        $this->scene->refresh();
        $this->music = $this->scene->music;
    }

    /** "Continue the music from the scene before" on, or a mix of this scene's own (empty = silence). */
    public function setInherit(bool $inherit): void
    {
        $this->save($inherit ? null : ['layers' => []] + SceneMusicShape::DEFAULTS);
    }

    public function addLayer(): void
    {
        if (! $this->addTrackId) {
            return;
        }
        $music = $this->music ?? (['layers' => []] + SceneMusicShape::DEFAULTS);
        $music['layers'][] = ['track_id' => $this->addTrackId] + SceneMusicShape::LAYER_DEFAULTS;
        $this->addTrackId = null;
        $this->save($music);
    }

    /** The song list's Use: this song plays under the scene (a scene that continued gets a mix of its own). */
    public function useTrack(int $trackId): void
    {
        if (! MusicTrack::query()->music()->whereKey($trackId)->exists()) {
            return;
        }
        if (count($this->music['layers'] ?? []) >= SceneMusicShape::MAX_LAYERS) {
            return;
        }
        $this->addTrackId = $trackId;
        $this->addLayer();
    }

    public function removeLayer(int $index): void
    {
        if ($this->music === null) {
            return;
        }
        $music = $this->music;
        unset($music['layers'][$index]);
        $music['layers'] = array_values($music['layers']);
        $this->save($music);
    }

    /** A field bound with wire:model.live changed: keep it. */
    public function updatedMusic(): void
    {
        if ($this->music !== null) {
            $this->save($this->music);
        }
    }

    public function undo(): void
    {
        $this->authorizeScene($this->scene);
        $stack = $this->scene->music_undo ?? [];
        if ($stack === []) {
            return;
        }
        $previous = array_pop($stack);
        $this->scene->update(array_key_exists('a', $previous)
            ? ['config' => self::withAmbience($this->scene->fresh()->config, $previous['a']), 'music_undo' => $stack ?: null]
            : ['music' => $previous['m'] ?? null, 'music_undo' => $stack ?: null]);
        $this->music = $this->scene->music;
        $this->dispatch('scene-music-changed');
    }

    /** Sound: 'auto', 'off', or a bed's track id. */
    public function setAmbience(string $value): void
    {
        if ($value === 'auto' || $value === 'off') {
            $this->saveAmbience($value === 'off' ? 'off' : null);

            return;
        }
        $id = (int) $value;
        if (! SceneAmbience::tracks()->contains('id', $id)) {
            return;
        }
        $this->saveAmbience(['track_id' => $id, 'volume' => SceneAmbience::volume($this->scene)]);
    }

    /** The bed's volume; picking a volume on Auto keeps Auto's bed as the scene's own. */
    public function setAmbienceVolume(float $volume): void
    {
        $track = SceneAmbience::forScene($this->scene)['layers'][0]['track_id'] ?? null;
        if ($track) {
            $this->saveAmbience(['track_id' => $track, 'volume' => round(max(0.0, min(1.0, $volume)), 3)]);
        }
    }

    /** Describe a sound, ElevenLabs makes a looping bed, it goes in the library and under this scene. */
    public function makeAmbience(ElevenLabsService $eleven): void
    {
        $this->authorizeScene($this->scene);
        $this->validate(['soundPrompt' => 'required|string|min:8|max:500']);
        $key = 'scene-sound:'.auth()->id();
        if (RateLimiter::tooManyAttempts($key, self::SOUNDS_PER_HOUR)) {
            $this->addError('soundPrompt', __('That is a lot of new sounds for one hour. Try again a little later.'));

            return;
        }
        RateLimiter::hit($key, 3600);

        $prompt = trim($this->soundPrompt);
        $audio = $eleven->soundEffect($prompt.' No music, no speech, no words, no modern sounds.');
        if ($audio === null) {
            $this->addError('soundPrompt', __('The sound could not be made just now. Try again in a minute.'));

            return;
        }
        $path = 'music/ambience/'.Str::uuid().'.mp3';
        Storage::disk('public')->put($path, $audio);
        $track = MusicTrack::create([
            'user_id' => auth()->id(),
            'title' => Str::limit($prompt, 48),
            'kind' => MusicTrack::KIND_AMBIENCE,
            'prompt' => $prompt,
            'licence' => MusicLicence::Other,
            'licence_note' => 'ElevenLabs sound effects, paid plan: commercial use granted.',
            'path' => $path,
        ]);
        Once::flush();   // SceneAmbience::tracks() has to see the new bed
        $this->soundPrompt = '';
        $this->saveAmbience(['track_id' => $track->id, 'volume' => SceneAmbience::volume($this->scene)]);
        $this->dispatch('toast', type: 'success', message: __('New sound added under this scene.'));
    }

    /** A pasted Suno link fills an empty title with the song's own. */
    public function updatedUploadSource(): void
    {
        if (trim($this->uploadTitle) === '' && auth()->user()?->isAdmin()) {
            $this->uploadTitle = MusicTrack::titleFromLink(trim($this->uploadSource)) ?? '';
        }
    }

    public function saveUpload(): void
    {
        abort_unless((bool) auth()->user()?->isAdmin(), 403);
        $this->validate();
        $this->validate(['uploadLicence' => ['required', Rule::enum(MusicLicence::class)]]);

        $track = MusicTrack::create([
            'user_id' => auth()->id(),
            'title' => trim($this->uploadTitle),
            'source_url' => $this->uploadSource ?: null,
            'licence' => $this->uploadLicence,
            'licence_note' => $this->uploadNote ?: null,
            'path' => $this->upload->store('music', 'public'),
        ]);

        $this->reset('upload', 'uploadTitle', 'uploadSource', 'uploadNote');
        $this->addTrackId = $track->id;
        $this->addLayer();
        $this->dispatch('toast', type: 'success', message: __('Track added to the music library.'));
    }

    public function render(): View
    {
        $tracks = MusicTrack::query()->music()->orderBy('title')->get();
        $beds = SceneAmbience::tracks();

        return view('livewire.wizard.scene-music', [
            'tracks' => $tracks,
            'trackUrls' => $tracks->concat($beds)->mapWithKeys(fn (MusicTrack $t) => [$t->id => $t->forMixer()])->all(),
            'beds' => $beds,
            'ambienceChoice' => SceneAmbience::choice($this->scene),
            'ambienceVolume' => SceneAmbience::volume($this->scene),
            'ambienceAuto' => SceneAmbience::auto($this->scene),
            'ambienceMix' => SceneAmbience::forScene($this->scene),
            'canUndo' => ! empty($this->scene->music_undo),
            'isAdmin' => (bool) auth()->user()?->isAdmin(),
            'licences' => MusicLicence::cases(),
        ]);
    }

    private function save(?array $music): void
    {
        $this->authorizeScene($this->scene);
        $clean = $music === null ? null : SceneMusicShape::normalize($music, MusicTrack::query()->music()->pluck('id')->all());
        if ($clean === $this->scene->music) {
            $this->music = $clean;

            return;
        }
        $stack = $this->scene->music_undo ?? [];
        $stack[] = ['m' => $this->scene->music];
        $this->scene->update([
            'music' => $clean,
            'music_undo' => array_slice($stack, -self::UNDO_DEPTH),
        ]);
        $this->music = $clean;
        $this->dispatch('scene-music-changed');
    }

    /** @param  'off'|array{track_id: int, volume: float}|null  $ambience  null = Auto */
    private function saveAmbience(string|array|null $ambience): void
    {
        $this->authorizeScene($this->scene);
        $config = $this->scene->fresh()->config ?? [];
        $before = $config['ambience'] ?? null;
        if ($before === $ambience) {
            return;
        }
        $stack = $this->scene->music_undo ?? [];
        $stack[] = ['a' => $before];
        $this->scene->update([
            'config' => self::withAmbience($config, $ambience),
            'music_undo' => array_slice($stack, -self::UNDO_DEPTH),
        ]);
        $this->dispatch('scene-music-changed');
    }

    /** @param  array<string, mixed>|null  $config */
    private static function withAmbience(?array $config, string|array|null $ambience): array
    {
        $config ??= [];
        if ($ambience === null) {
            unset($config['ambience']);
        } else {
            $config['ambience'] = $ambience;
        }

        return $config;
    }

    private function authorizeScene(Scene $scene): void
    {
        abort_unless((bool) auth()->user()?->canEdit($scene->lesson), 403);
    }
}
