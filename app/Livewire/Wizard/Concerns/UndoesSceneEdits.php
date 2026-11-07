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
            $this->quizFollowsRestoredDraft($scene->fresh());
            $this->afterHistoryStep($scene->id, __('Undone.'));
        }
    }

    public function redoLastEdit(): void
    {
        $scene = $this->selectedSceneId ? $this->lesson->scenes()->find($this->selectedSceneId) : null;
        if ($scene && SceneHistory::redo($scene)) {
            $this->quizFollowsRestoredDraft($scene->fresh());
            $this->afterHistoryStep($scene->id, __('Redone.'));
        }
    }

    private function afterHistoryStep(int $sceneId, string $message): void
    {
        $layer = $this->activeStage25dLayer;
        $this->activeDioramaId = null;
        $this->activeStage25dLayer = null;          // what it pointed at may be gone now
        $this->selectSceneInternal($sceneId);   // re-fires scene:load: the stage and panels redraw
        // A layer that is still there stays selected: an undo is a step back, not a click on nothing (Bart, 2026-11-05)
        $layers = $this->lesson->scenes()->find($sceneId)?->config['stage25d']['set']['layers'] ?? [];
        $keep = $layer !== null && preg_match('/^layer-(\d+)$/', $layer, $m) === 1 && isset($layers[(int) $m[1]]);
        if ($keep) {
            $this->selectInspectorTarget('s25_'.$layer);
        }
        // The Timeline tab keeps its own copy of the tracks (it outlives a morph on purpose, see
        // SESSIONS in timeline-panel.js), so it is handed the restored ones. Without this, Cmd-Z
        // restored a removed keyframe on the server while the panel kept showing it gone.
        $timeline = $this->lesson->scenes()->find($sceneId)?->config['timeline'] ?? [];
        $this->dispatch('timeline-restored', timeline: $timeline, keepSelection: $keep);
        $this->dispatch('toast', type: 'info', message: $message);
    }
}
