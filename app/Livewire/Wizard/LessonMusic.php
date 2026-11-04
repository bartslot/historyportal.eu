<?php

declare(strict_types=1);

namespace App\Livewire\Wizard;

use App\Models\Lesson;
use App\Models\MusicTrack;
use App\Models\Scene;
use App\Support\LessonMusicCues;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\DB;
use Livewire\Attributes\On;
use Livewire\Component;

/**
 * Lesson settings > Music: which track plays from which scene. Each row is a scene with a mix of its
 * own (LessonMusicCues); the scenes between rows continue the music, and the player changes track
 * on the beat (scene/music-mixer.js). Every change saves at once and can be undone.
 */
class LessonMusic extends Component
{
    private const UNDO_DEPTH = 30;

    public Lesson $lesson;

    /** @var list<array{scene: int, track_id: ?int, layers: int, origin: ?int}> */
    public array $rows = [];

    public function mount(Lesson $lesson): void
    {
        $this->authorizeLesson($lesson);
        $this->lesson = $lesson;
        $this->rows = LessonMusicCues::rows($this->scenes());
    }

    /** A scene's own Music tab changed: the list reads the scenes again. */
    #[On('scene-music-changed')]
    public function reload(): void
    {
        $this->lesson->refresh();
        $this->rows = LessonMusicCues::rows($this->scenes());
    }

    public function addRow(): void
    {
        $last = end($this->rows);
        $scene = $last ? min($last['scene'] + 1, $this->lesson->scenes()->count()) : 1;
        if ($last && $scene === $last['scene']) {
            return;   // every scene already starts a row
        }
        $rows = $this->rows;
        $rows[] = ['scene' => $scene, 'track_id' => MusicTrack::query()->orderBy('title')->value('id'), 'layers' => 1, 'origin' => null];
        $this->save($rows);
    }

    public function removeRow(int $index): void
    {
        $rows = $this->rows;
        unset($rows[$index]);
        $this->save(array_values($rows));
    }

    /** Swap a row's music (track and mix) with its neighbour's; the scene numbers stay where they are. */
    public function moveRow(int $index, int $direction): void
    {
        $other = $index + ($direction < 0 ? -1 : 1);
        if (! isset($this->rows[$index], $this->rows[$other])) {
            return;
        }
        $rows = $this->rows;
        foreach (['track_id', 'origin', 'layers'] as $key) {
            [$rows[$index][$key], $rows[$other][$key]] = [$rows[$other][$key], $rows[$index][$key]];
        }
        $this->save($rows);
    }

    /** A track select or "from scene" field changed (wire:model.change). */
    public function updatedRows(): void
    {
        $this->save($this->rows);
    }

    public function undo(): void
    {
        $this->authorizeLesson($this->lesson);
        $stack = $this->lesson->music_undo ?? [];
        if ($stack === []) {
            return;
        }
        $previous = array_pop($stack);
        DB::transaction(function () use ($previous, $stack) {
            foreach ($previous['s'] ?? [] as $sceneId => $music) {
                $this->lesson->scenes()->whereKey($sceneId)->first()?->update(['music' => $music]);
            }
            $this->lesson->update(['music_undo' => $stack ?: null]);
        });
        $this->afterChange();
    }

    /** The editor estimated a track's tempo from its audio; an admin may also type one in. */
    public function saveTempo(int $trackId, mixed $bpm, mixed $beatOffset = 0, bool $correction = false): void
    {
        $this->authorizeLesson($this->lesson);
        $isAdmin = (bool) auth()->user()?->isAdmin();
        abort_if($correction && ! $isAdmin, 403);
        $bpm = is_numeric($bpm) && (float) $bpm > 0 ? (float) $bpm : null;
        if (! $correction && $bpm === null) {
            return;
        }
        MusicTrack::query()->find($trackId)?->recordTempo($bpm, is_numeric($beatOffset) ? (float) $beatOffset : 0.0, $correction);
    }

    public function render(): View
    {
        $tracks = MusicTrack::query()->orderBy('title')->get();
        $used = collect($this->rows)->pluck('track_id')->filter()->unique();

        return view('livewire.wizard.lesson-music', [
            'tracks' => $tracks,
            'sceneCount' => $this->lesson->scenes()->count(),
            'canUndo' => ! empty($this->lesson->music_undo),
            'isAdmin' => (bool) auth()->user()?->isAdmin(),
            // Tracks in the list with no tempo yet: the browser estimates and sends it (saveTempo).
            'untimed' => $tracks->whereIn('id', $used)->whereNull('bpm')->map(fn (MusicTrack $t) => ['id' => $t->id, 'url' => $t->url()])->values()->all(),
        ]);
    }

    /** @param  list<array{scene: int|string, track_id: int|string|null}>  $rows */
    private function save(array $rows): void
    {
        $this->authorizeLesson($this->lesson);
        $scenes = $this->scenes();
        try {
            $changes = LessonMusicCues::apply($scenes, $rows, MusicTrack::query()->pluck('id')->all());
        } catch (\InvalidArgumentException) {
            $this->addError('rows', __('Each row needs its own scene, between 1 and :count.', ['count' => count($scenes)]));
            $this->rows = LessonMusicCues::rows($scenes);

            return;
        }
        $this->resetErrorBag('rows');
        if ($changes === []) {
            $this->rows = LessonMusicCues::rows($scenes);

            return;
        }
        $before = collect($scenes)->keyBy('id')->only(array_keys($changes))->map(fn ($s) => $s['music'])->all();
        DB::transaction(function () use ($changes, $before) {
            foreach ($changes as $sceneId => $music) {
                Scene::query()->whereKey($sceneId)->first()?->update(['music' => $music]);
            }
            $stack = $this->lesson->music_undo ?? [];
            $stack[] = ['s' => $before];
            $this->lesson->update(['music_undo' => array_slice($stack, -self::UNDO_DEPTH)]);
        });
        $this->afterChange();
    }

    private function afterChange(): void
    {
        $this->lesson->refresh();
        $this->rows = LessonMusicCues::rows($this->scenes());
        $this->dispatch('lesson-music-changed');
    }

    /** @return list<array{id: int, music: ?array}> */
    private function scenes(): array
    {
        return $this->lesson->scenes()->get(['id', 'music', 'order'])
            ->map(fn (Scene $s) => ['id' => $s->id, 'music' => $s->music])->all();
    }

    private function authorizeLesson(Lesson $lesson): void
    {
        abort_unless((bool) auth()->user()?->canManage($lesson), 403);
    }
}
