<?php

declare(strict_types=1);

namespace App\Livewire\Wizard;

use App\Models\Lesson;
use Illuminate\Contracts\View\View;
use Livewire\Component;

/**
 * What an import (a Twine story) brought in and what it could not, shown once when the editor first opens the new
 * lesson: the teacher closes it and it stays closed (import_report.seen).
 */
class ImportNotes extends Component
{
    public Lesson $lesson;

    public function mount(Lesson $lesson): void
    {
        abort_unless((bool) auth()->user()?->canEdit($lesson), 403);
        $this->lesson = $lesson;
    }

    public function dismiss(): void
    {
        abort_unless((bool) auth()->user()?->canEdit($this->lesson), 403);
        $report = $this->lesson->import_report;
        if (is_array($report)) {
            $this->lesson->update(['import_report' => ['seen' => true] + $report]);
        }
    }

    public function render(): View
    {
        $report = $this->lesson->import_report;

        return view('livewire.wizard.import-notes', [
            'report' => is_array($report) && empty($report['seen']) ? $report : null,
        ]);
    }
}
