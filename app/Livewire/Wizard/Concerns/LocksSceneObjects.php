<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use Livewire\Attributes\On;

/**
 * Lock a layer, as in Photoshop's and Figma's layer lists: a locked layer can't be picked or dragged on
 * the canvas (a press goes through to whatever is under it), and the layer list and the canvas
 * right-click menu unlock it again.
 *
 * The flag sits on the layer's own record, so a reorder, a copy or an undo carries it along: `locked: 1` on
 * an artwork layer (every shot holding that asset) and on a 2.5D stage layer; absent means unlocked. Text
 * boxes keep it in config.texts and save it through the text layer's own save (saveSceneTexts). One scene
 * save each, so one Cmd-Z (SceneHistory) takes a lock back.
 */
trait LocksSceneObjects
{
    /** @param  string  $objectId  an object-list id: 'art_12' or 's25_layer-3' */
    #[On('scene:lock-object')]
    public function lockObject(string $objectId, bool $locked): void
    {
        if (preg_match('/^art_(\d+)$/', $objectId, $m) === 1) {
            $this->writeLayerFields((int) $m[1], ['locked' => $locked ? 1 : null]);

            return;
        }
        if (preg_match('/^s25_layer-(\d+)$/', $objectId, $m) === 1) {
            $this->lockStage25dLayer((int) $m[1], $locked);
        }
    }

    private function lockStage25dLayer(int $index, bool $locked): void
    {
        $scene = $this->stage25dScene();
        $layers = $scene?->config['stage25d']['set']['layers'] ?? null;
        if (! $scene || ! is_array($layers) || ! isset($layers[$index]) || ! is_array($layers[$index])) {
            return;
        }
        if ($locked) {
            $layers[$index]['locked'] = 1;
        } else {
            unset($layers[$index]['locked']);
        }
        $config = $scene->config;
        $config['stage25d']['set']['layers'] = $layers;
        $this->storeStage25dConfig($scene, $config);
        $this->selectSceneInternal($scene->id);   // the stage and the layer list re-read the flag
    }
}
