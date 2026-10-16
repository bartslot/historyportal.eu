<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Models\Scene;
use App\Services\SceneLayers;
use App\Services\Support\SceneSplit;
use Livewire\Attributes\On;

/**
 * Standard | Split: a scene shown as one picture, or as two comic panels (SceneSplit).
 *
 * The two panels are shots[0] and shots[1]. A click on a panel on the stage makes it the ACTIVE
 * panel: the Image picker, the layer list and the Animate tab then work on that panel only. Every
 * change is one scene save, so the scene history undoes it.
 */
trait EditsSplitPanels
{
    /** The panel of a split scene the inspector edits (0 or 1). Ignored on a standard scene. */
    public int $activePanel = 0;

    public function setSceneLayout(string $mode): void
    {
        if (! in_array($mode, ['standard', 'split'], true) || ! $this->selectedSceneId) {
            return;
        }
        $scene = $this->lesson->scenes()->findOrFail($this->selectedSceneId);
        $config = $scene->config ?? [];
        $shots = array_values((array) ($scene->shots ?? []));

        if ($mode === 'standard') {
            unset($config['split']);
            // A second panel the teacher never filled would play as an empty second shot.
            if (isset($shots[1]) && empty($shots[1]['layers']) && empty($shots[1]['image_path'])) {
                unset($shots[1]);
            }
            $this->activePanel = 0;
        } else {
            if (! SceneSplit::allowedFor($scene->kind)) {
                return;   // a quiz card, a map or a film owns the stage: the player never draws a split there
            }
            $config['split'] = SceneSplit::of($config) ?? ['dir' => 'h', 'at' => SceneSplit::AT_DEFAULT];
            $shots = self::twoPanels($scene, $shots);
        }

        $scene->update(['config' => $config, 'shots' => array_values($shots) ?: null]);
        $this->selectSceneInternal($scene->id);
    }

    /** The split's direction ('h' stacked, 'v' side by side) and/or position (0.25..0.75). */
    public function setSplit(?string $dir = null, ?float $at = null): void
    {
        if (! $this->selectedSceneId) {
            return;
        }
        $scene = $this->lesson->scenes()->findOrFail($this->selectedSceneId);
        $config = $scene->config ?? [];
        $split = SceneSplit::of($config);
        if ($split === null) {
            return;
        }
        $config['split'] = SceneSplit::normalize([
            'dir' => $dir ?? $split['dir'],
            'at' => $at ?? $split['at'],
        ]);
        if ($config['split'] === $split) {
            return;
        }
        $scene->update(['config' => $config]);
        $this->selectSceneInternal($scene->id);
    }

    /** The divider dragged on the stage: the same Position the slider sets. */
    #[On('split:at')]
    public function moveSplit(float $at): void
    {
        $this->setSplit(null, $at);
    }

    /**
     * A pane panned (drag) or zoomed (wheel) on the stage. The stage names the panel it happened
     * in, which need not be the active one.
     */
    #[On('split:view')]
    public function setPanelView(int $panel, float $x, float $y, float $zoom = 1.0): void
    {
        if (! $this->selectedSceneId) {
            return;
        }
        $scene = $this->lesson->scenes()->findOrFail($this->selectedSceneId);
        $shots = array_values((array) ($scene->shots ?? []));
        if (! SceneSplit::of($scene->config) || ! isset($shots[$panel])) {
            return;
        }
        $this->storePanelFocus($scene, $shots, $panel, SceneSplit::focus(['x' => $x, 'y' => $y, 'zoom' => $zoom]));
    }

    /** A panel was clicked on the stage: the inspector now edits that one. */
    #[On('split:panel')]
    public function selectPanel(int $panel): void
    {
        $panel = max(0, min(1, $panel));
        if ($panel === $this->activePanel || ! $this->selectedSceneId) {
            return;
        }
        $this->activePanel = $panel;
        $this->activeLayerId = null;
        $this->selectSceneInternal($this->selectedSceneId);
    }

    /**
     * The active panel's crop: x or y (0..100, which part of its picture stays in view) or zoom
     * (1..4). Null puts that one back to its default: the middle, no zoom.
     */
    public function setPanelFocus(string $axis, ?float $value = null): void
    {
        if (! in_array($axis, ['x', 'y', 'zoom'], true) || ! $this->selectedSceneId) {
            return;
        }
        $scene = $this->lesson->scenes()->findOrFail($this->selectedSceneId);
        $panel = $this->editedPanel($scene);
        $shots = array_values((array) ($scene->shots ?? []));
        if ($panel === null || ! isset($shots[$panel])) {
            return;
        }
        $focus = SceneSplit::focus($shots[$panel]['focus'] ?? []) ?? ['x' => 50.0, 'y' => 50.0];
        $focus[$axis] = $value ?? ($axis === 'zoom' ? 1.0 : 50.0);
        $this->storePanelFocus($scene, $shots, $panel, SceneSplit::focus($focus));
    }

    /**
     * @param  list<array<string,mixed>>  $shots
     * @param  array{x: float, y: float, zoom?: float}  $focus
     */
    private function storePanelFocus(Scene $scene, array $shots, int $panel, array $focus): void
    {
        if ($focus === ['x' => 50.0, 'y' => 50.0]) {
            unset($shots[$panel]['focus']);   // the default is the absence of the key
        } else {
            $shots[$panel]['focus'] = $focus;
        }
        if ($shots === array_values((array) $scene->shots)) {
            return;
        }
        $scene->update(['shots' => $shots]);
        $this->selectSceneInternal($scene->id);
    }

    /** The panel a layer or picture edit goes to: the active one on a split scene, null (all shots) otherwise. */
    private function editedPanel(Scene $scene): ?int
    {
        return SceneSplit::of($scene->config) ? $this->activePanel : null;
    }

    /** Does an edit to the layers touch shot $i? Every shot on a standard scene; the active panel on a split one. */
    private function editsShot(Scene $scene, int $i): bool
    {
        $panel = $this->editedPanel($scene);

        return $panel === null || $panel === $i;
    }

    /**
     * The scene's image_path after a new picture: on the second panel of a split scene the scene
     * keeps its own (the card, the poster, panel one), the new picture goes on the panel only.
     */
    private function sceneImagePath(Scene $scene, ?string $path): ?string
    {
        return ($this->editedPanel($scene) ?? 0) > 0 ? $scene->image_path : $path;
    }

    /**
     * Shots for a split: panel one as it is (the scene picture as its cover when it has no shot
     * yet), panel two a fresh panel on the same picture with no figures, ready for its own.
     *
     * @param  list<array<string,mixed>>  $shots
     * @return list<array<string,mixed>>
     */
    private static function twoPanels(Scene $scene, array $shots): array
    {
        $shots[0] ??= SceneLayers::shot($scene->image_path, []);
        if (! isset($shots[1])) {
            $cover = $shots[0]['image_path'] ?? $scene->image_path;
            $shots[1] = array_merge(SceneLayers::shot($cover, []), ['order' => 1]);
        }

        return $shots;
    }
}
