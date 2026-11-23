<?php

declare(strict_types=1);

namespace App\Livewire\Wizard;

use App\Enums\StoryMediaKind;
use App\Enums\StoryMediaStatus;
use App\Models\Lesson;
use App\Models\StoryMediaItem;
use App\Services\StoryVideo\ElevenLabsMedia;
use App\Services\StoryVideo\StoryVideoPlanner;
use App\Services\StoryVideo\StoryVideoRun;
use Illuminate\Contracts\View\View;
use Livewire\Attributes\Validate;
use Livewire\Component;

/**
 * Lesson settings > Video: story to video in three steps (characters, places, video). The teacher starts a step,
 * checks what came back, redoes what is off and approves; the next step opens once everything is approved.
 * See App\Services\StoryVideo\StoryVideoRun.
 */
class StoryVideo extends Component
{
    public Lesson $lesson;

    public string $step = 'character_sheet';

    public ?int $openItem = null;

    #[Validate('nullable|string|max:500')]
    public string $note = '';

    public function mount(Lesson $lesson): void
    {
        $this->authorizeLesson($lesson);
        $this->lesson = $lesson;
        if ($lesson->storyMedia()->exists()) {
            $this->step = $this->firstOpenStep()->value;
        }
    }

    /** Read the approved script again: what to make, per step. Spends nothing. */
    public function plan(): void
    {
        $this->authorizeLesson($this->lesson);
        (new StoryVideoPlanner)->plan($this->lesson);
        $this->step = $this->firstOpenStep()->value;
    }

    public function start(): void
    {
        $this->authorizeLesson($this->lesson);
        $kind = StoryMediaKind::from($this->step);
        if (! ElevenLabsMedia::make()->isConfigured() || ! StoryVideoRun::for($this->lesson)->canStart($kind)) {
            return;
        }
        StoryVideoRun::for($this->lesson)->start($kind);
    }

    public function approve(int $id): void
    {
        StoryVideoRun::for($this->lesson)->approve($this->item($id));
        $this->openItem = null;
    }

    public function approveAll(): void
    {
        $this->authorizeLesson($this->lesson);
        StoryVideoRun::for($this->lesson)->approveAll(StoryMediaKind::from($this->step));
    }

    public function redo(int $id): void
    {
        $this->validate();
        StoryVideoRun::for($this->lesson)->redo($this->item($id), $this->note);
        $this->note = '';
        $this->openItem = null;
    }

    public function render(): View
    {
        $items = $this->lesson->storyMedia()->get();
        $kind = StoryMediaKind::from($this->step);
        $here = $items->filter(fn (StoryMediaItem $i) => $i->kind === $kind)->values();
        $run = StoryVideoRun::for($this->lesson);

        return view('livewire.wizard.story-video', [
            'steps' => collect(StoryMediaKind::cases())->map(fn (StoryMediaKind $k) => [
                'kind' => $k,
                'count' => $items->where('kind', $k)->count(),
                'approved' => $items->where('kind', $k)->where('status', StoryMediaStatus::Approved)->count(),
            ])->all(),
            'items' => $here,
            'kind' => $kind,
            'planned' => $items->isNotEmpty(),
            'canStart' => $run->canStart($kind),
            'toMake' => $here->filter(fn ($i) => in_array($i->status, [StoryMediaStatus::Planned, StoryMediaStatus::Failed], true))->count(),
            'ready' => $here->where('status', StoryMediaStatus::Ready)->count(),
            'busy' => $items->contains(fn (StoryMediaItem $i) => $i->status->isBusy()),
            'seconds' => $kind->isVideo() ? $here->sum(fn ($i) => (int) (($i->input ?? [])['seconds'] ?? 0)) : 0,
            'configured' => ElevenLabsMedia::make()->isConfigured(),
            'open' => $this->openItem !== null ? $here->firstWhere('id', $this->openItem) : null,
        ]);
    }

    private function firstOpenStep(): StoryMediaKind
    {
        foreach (StoryMediaKind::cases() as $kind) {
            if ($this->lesson->storyMedia()->where('kind', $kind->value)->where('status', '!=', StoryMediaStatus::Approved->value)->exists()) {
                return $kind;
            }
        }

        return StoryMediaKind::Clip;
    }

    private function item(int $id): StoryMediaItem
    {
        $this->authorizeLesson($this->lesson);

        return $this->lesson->storyMedia()->whereKey($id)->firstOrFail();
    }

    private function authorizeLesson(Lesson $lesson): void
    {
        abort_unless((bool) auth()->user()?->canManage($lesson), 403);
    }
}
