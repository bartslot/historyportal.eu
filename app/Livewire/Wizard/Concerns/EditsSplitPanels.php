<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Models\Scene;
use App\Services\SceneLayers;
use App\Services\Support\SceneSplit;
use Livewire\Attributes\On;

/**
 * The scene's layout: one picture (single), or two to four comic panels (SceneSplit::LAYOUTS),
 * picked from one strip of layout tiles (Figma 2346:503).
 *
 * The panels are shots[0..n-1]. A click on a panel on the stage makes it the ACTIVE panel: the
 * Image picker, the layer list and the Animate tab then work on that panel only. Every change is
 * one scene save, so the scene history undoes it.
 */
trait EditsSplitPanels
{
    /** The panel of a split scene the inspector edits (0..n-1). Ignored on a standard scene. */
    public int $activePanel = 0;

    /**
     * A layout from the picker: 'single' for one picture, or a SceneSplit::LAYOUTS key. A layout
     * with more panels adds them, each on the scene's picture with no figures yet; one with fewer
     * keeps the others' contents in the scene (pick it again and they come back).
     */
    public function setSplitLayout(string $layout): void
    {
        if (($layout !== 'single' && ! isset(SceneSplit::LAYOUTS[$layout])) || ! $this->selectedSceneId) {
            return;
        }
        $scene = $this->lesson->scenes()->findOrFail($this->selectedSceneId);
        $config = $scene->config ?? [];
        $shots = array_values((array) ($scene->shots ?? []));

        if ($layout === 'single') {
            unset($config['split']);
            // Panels the teacher never filled would play as empty extra shots.
            while (count($shots) > 1 && empty(end($shots)['layers']) && empty(end($shots)['image_path'])) {
                array_pop($shots);
            }
        } else {
            if (! SceneSplit::allowedFor($scene->kind)) {
                return;   // a quiz card, a map or a film owns the stage: the player never draws a split there
            }
            // The dividers start from the layout's defaults.
            $config['split'] = SceneSplit::normalize(['layout' => $layout]);
            $shots = self::panels($scene, $shots, SceneSplit::LAYOUTS[$layout]['panes']);
        }
        $this->activePanel = 0;   // a new arrangement starts on its first panel

        $scene->update(['config' => $config, 'shots' => array_values($shots) ?: null]);
        $this->selectSceneInternal($scene->id);
    }

    /** One divider's position from its slider: 0.2..0.8 of the stage. */
    public function setSplitAt(int $divider, float $at): void
    {
        $split = $this->editedSplit();
        if ($split === null || ! array_key_exists($divider, $split['at'])) {
            return;
        }
        $split['at'][$divider] = $at;
        $this->storeSplit($split);
    }

    /** The dividers dragged on the stage: every position, as the stage now has them. */
    #[On('split:at')]
    public function moveSplit(array $at): void
    {
        $split = $this->editedSplit();
        if ($split !== null) {
            $this->storeSplit(['layout' => $split['layout'], 'at' => $at]);
        }
    }

    /** @return array{layout: string, at: list<float>}|null */
    private function editedSplit(): ?array
    {
        if (! $this->selectedSceneId) {
            return null;
        }

        return SceneSplit::of($this->lesson->scenes()->findOrFail($this->selectedSceneId)->config);
    }

    /** @param  array<string, mixed>  $split */
    private function storeSplit(array $split): void
    {
        $scene = $this->lesson->scenes()->findOrFail($this->selectedSceneId);
        $config = $scene->config ?? [];
        $next = SceneSplit::normalize($split);
        if ($next === null || $next === ($config['split'] ?? null)) {
            return;
        }
        $config['split'] = $next;
        $scene->update(['config' => $config]);
        $this->selectSceneInternal($scene->id);
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
        $panes = SceneSplit::panes($this->selectedSceneId ? $this->lesson->scenes()->find($this->selectedSceneId)?->config['split'] ?? null : null);
        $panel = max(0, min(max(0, $panes - 1), $panel));
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
     * Shots for a split of $n panels: panel one as it is (the scene picture as its cover when it has
     * no shot yet), every panel it lacks a fresh one on the same picture, with no figures yet.
     *
     * @param  list<array<string,mixed>>  $shots
     * @return list<array<string,mixed>>
     */
    private static function panels(Scene $scene, array $shots, int $n): array
    {
        $shots[0] ??= SceneLayers::shot($scene->image_path, []);
        $cover = $shots[0]['image_path'] ?? $scene->image_path;
        for ($i = 1; $i < $n; $i++) {
            $shots[$i] ??= array_merge(SceneLayers::shot($cover, []), ['order' => $i]);
        }

        return $shots;
    }
}
