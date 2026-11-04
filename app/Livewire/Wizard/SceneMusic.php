<?php

declare(strict_types=1);

namespace App\Livewire\Wizard;

use App\Enums\MusicLicence;
use App\Models\MusicTrack;
use App\Models\Scene;
use App\Support\SceneMusic as SceneMusicShape;
use Illuminate\Contracts\View\View;
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
 */
class SceneMusic extends Component
{
    use WithFileUploads;

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
        $this->scene->update(['music' => $previous['m'] ?? null, 'music_undo' => $stack ?: null]);
        $this->music = $this->scene->music;
        $this->dispatch('scene-music-changed');
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
        $tracks = MusicTrack::query()->orderBy('title')->get();

        return view('livewire.wizard.scene-music', [
            'tracks' => $tracks,
            'trackUrls' => $tracks->mapWithKeys(fn (MusicTrack $t) => [$t->id => $t->forMixer()])->all(),
            'canUndo' => ! empty($this->scene->music_undo),
            'isAdmin' => (bool) auth()->user()?->isAdmin(),
            'licences' => MusicLicence::cases(),
        ]);
    }

    private function save(?array $music): void
    {
        $this->authorizeScene($this->scene);
        $clean = $music === null ? null : SceneMusicShape::normalize($music, MusicTrack::query()->pluck('id')->all());
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

    private function authorizeScene(Scene $scene): void
    {
        abort_unless((bool) auth()->user()?->canManage($scene->lesson), 403);
    }
}
