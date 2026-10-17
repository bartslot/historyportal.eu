<?php

declare(strict_types=1);

namespace App\Livewire\Wizard;

use App\Models\CurriculumGoal;
use App\Models\Lesson;
use Illuminate\Support\Collection;
use Illuminate\View\View;
use Livewire\Component;

/**
 * Settings > Lesson: link this lesson to kerndoelen, tijdvakken, kenmerkende aspecten and Canon
 * windows. Its own component, so typing a search never re-renders the editor around it.
 */
class CurriculumPicker extends Component
{
    private const RESULT_LIMIT = 8;

    public Lesson $lesson;

    public string $search = '';

    public function mount(Lesson $lesson): void
    {
        abort_unless(auth()->user()?->canManage($lesson), 403);
        $this->lesson = $lesson;
    }

    public function attach(int $goalId): void
    {
        $this->authorizeEdit();
        $goal = CurriculumGoal::query()->findOrFail($goalId);
        $this->lesson->curriculumGoals()->syncWithoutDetaching([$goal->id => ['fit' => 'direct']]);
        $this->search = '';
    }

    public function setFit(int $goalId, string $fit): void
    {
        $this->authorizeEdit();
        if (! in_array($fit, CurriculumGoal::FITS, true)) {
            return;
        }
        $this->lesson->curriculumGoals()->updateExistingPivot($goalId, ['fit' => $fit]);
    }

    public function detach(int $goalId): void
    {
        $this->authorizeEdit();
        $this->lesson->curriculumGoals()->detach($goalId);
    }

    /** @return Collection<int, CurriculumGoal> */
    public function results(): Collection
    {
        $term = trim($this->search);
        if (mb_strlen($term) < 2) {
            return collect();
        }

        $linked = $this->lesson->curriculumGoals()->pluck('curriculum_goals.id');
        $words = preg_split('/\s+/', mb_strtolower($term)) ?: [];

        // Every word must appear in "Tijdvak 6 Tijd van regenten…", so "tijdvak 6" and "voc" both
        // work. ponytail: filters all 121 goals in PHP; a LIKE per word in SQL if the set grows.
        return CurriculumGoal::query()
            ->whereNotIn('id', $linked)
            ->orderBy('sort')
            ->get()
            ->filter(function (CurriculumGoal $goal) use ($words): bool {
                $haystack = mb_strtolower($goal->label().' '.$goal->title.' '.$goal->code);
                foreach ($words as $word) {
                    if (! str_contains($haystack, $word)) {
                        return false;
                    }
                }

                return true;
            })
            ->take(self::RESULT_LIMIT)
            ->values();
    }

    public function render(): View
    {
        return view('livewire.wizard.curriculum-picker', [
            'linked' => $this->lesson->curriculumGoals()->get(),
            'results' => $this->results(),
        ]);
    }

    private function authorizeEdit(): void
    {
        abort_unless(auth()->user()?->canManage($this->lesson), 403);
    }
}
