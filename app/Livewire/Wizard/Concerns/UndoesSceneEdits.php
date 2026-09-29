<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Services\Editor\SceneHistory;

/**
 * Cmd-Z / Cmd-Shift-Z for the selected scene's own edits (SceneHistory). The editor switches
 * recording on for its requests, so only a teacher's edits in the editor are undoable.
 */
trait UndoesSceneEdits
{
    public function bootUndoesSceneEdits(): void
    {
        SceneHistory::enable();
    }

    /** Undo the selected scene's last edit; the stage redraws from the restored scene. */
    private function undoSceneEdit(): void
    {
        $scene = $this->selectedSceneId ? $this->lesson->scenes()->find($this->selectedSceneId) : null;
        if ($scene && SceneHistory::undo($scene)) {
            $this->afterHistoryStep($scene->id, __('Undone.'));
        }
    }

    public function redoLastEdit(): void
    {
        $scene = $this->selectedSceneId ? $this->lesson->scenes()->find($this->selectedSceneId) : null;
        if ($scene && SceneHistory::redo($scene)) {
            $this->afterHistoryStep($scene->id, __('Redone.'));
        }
    }

    private function afterHistoryStep(int $sceneId, string $message): void
    {
        $this->activeDioramaId = null;          // what it pointed at may be gone now
        $this->selectSceneInternal($sceneId);   // re-fires scene:load: the stage and panels redraw
        $this->dispatch('toast', type: 'info', message: $message);
    }
}
