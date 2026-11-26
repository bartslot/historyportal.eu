<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Support\VoyageCheckpoints;
use Livewire\Attributes\On;

/**
 * Checkpoints along a voyage leg (Bart 2026-11-26): click the route line in the editor and a checkpoint lands
 * there. It holds pictures and text like a landfall's gallery, and the class sees it as a small card in the
 * bottom-left corner when the ship or caravan passes, by itself or behind a bubble on the map.
 *
 * Stored on the leg's own scene, at config.checkpoints (App\Support\VoyageCheckpoints has the shape). The point
 * is kept as a coordinate, and the map snaps it onto the route, so bending the route never strands one.
 */
trait EditsVoyageCheckpoints
{
    /** The checkpoint the inspector opens on its next render (the one just added). */
    public ?string $voyageCheckpointFocus = null;

    /** The checkpoint the image picker adds to while it is open in 'checkpoint_image' mode. */
    public ?string $checkpointPickerId = null;

    /** @return array<int,array<string,mixed>> */
    private function checkpoints(): array
    {
        return VoyageCheckpoints::clean($this->selectedScene['config']['checkpoints'] ?? []);
    }

    /** @param  array<int,array<string,mixed>>  $list */
    private function storeCheckpoints(array $list): void
    {
        $this->selectedScene['config']['checkpoints'] = VoyageCheckpoints::clean($list);
        $this->saveSelected();
    }

    private function isVoyageLegScene(int $sceneId): bool
    {
        return $this->selectedScene
            && (int) ($this->selectedScene['id'] ?? 0) === $sceneId
            && ($this->selectedScene['kind'] ?? null) === 'voyage'
            && empty($this->selectedScene['config']['overview']);
    }

    /** @param  callable(array<string,mixed>):array<string,mixed>  $edit */
    private function editCheckpoint(string $id, callable $edit): void
    {
        $list = $this->checkpoints();
        foreach ($list as $i => $cp) {
            if ($cp['id'] === $id) {
                $list[$i] = $edit($cp);
                $this->storeCheckpoints($list);

                return;
            }
        }
    }

    /** A click on the route line in the editor. */
    #[On('voyageCheckpointAdded')]
    public function addVoyageCheckpoint(int $sceneId, $lng, $lat): void
    {
        if (! $this->isVoyageLegScene($sceneId) || ! VoyageCheckpoints::validPoint($lng, $lat)) {
            return;
        }
        $list = $this->checkpoints();
        if (count($list) >= VoyageCheckpoints::MAX) {
            $this->dispatch('toast', type: 'warning', message: __('A leg can have at most :n checkpoints.', ['n' => VoyageCheckpoints::MAX]));

            return;
        }
        $cp = VoyageCheckpoints::make((float) $lng, (float) $lat);
        $list[] = $cp;
        $this->voyageCheckpointFocus = $cp['id'];
        $this->storeCheckpoints($list);
    }

    /** A checkpoint dragged along the route. */
    #[On('voyageCheckpointMoved')]
    public function moveVoyageCheckpoint(int $sceneId, string $id, $lng, $lat): void
    {
        if (! $this->isVoyageLegScene($sceneId) || ! VoyageCheckpoints::validPoint($lng, $lat)) {
            return;
        }
        $this->editCheckpoint($id, fn (array $cp) => array_merge($cp, ['lng' => round((float) $lng, 4), 'lat' => round((float) $lat, 4)]));
    }

    public function removeVoyageCheckpoint(string $id): void
    {
        $this->storeCheckpoints(array_values(array_filter($this->checkpoints(), fn (array $cp) => $cp['id'] !== $id)));
    }

    public function setCheckpointText(string $id, string $field, string $value): void
    {
        if (! in_array($field, ['title', 'story'], true)) {
            return;
        }
        $this->editCheckpoint($id, fn (array $cp) => array_merge($cp, [$field => $value]));
    }

    /** On: the class gets a bubble on the map and opens the card. Off (the default): it shows by itself. */
    public function setCheckpointButton(string $id, bool $on): void
    {
        $this->editCheckpoint($id, fn (array $cp) => array_merge($cp, ['button' => $on]));
    }

    public function addCheckpointImage(string $id, string $url, string $credit = ''): void
    {
        $url = trim($url);
        if ($url === '') {
            return;
        }
        $this->editCheckpoint($id, function (array $cp) use ($url, $credit) {
            if (count($cp['images']) >= VoyageCheckpoints::IMAGES_MAX) {
                $this->dispatch('toast', type: 'warning', message: __('Maximum of :n gallery images reached.', ['n' => VoyageCheckpoints::IMAGES_MAX]));

                return $cp;
            }
            $cp['images'][] = ['url' => $url, 'credit' => trim($credit)];

            return $cp;
        });
    }

    public function removeCheckpointImage(string $id, int $index): void
    {
        $this->editCheckpoint($id, function (array $cp) use ($index) {
            array_splice($cp['images'], $index, 1);

            return $cp;
        });
    }

    public function moveCheckpointImage(string $id, int $from, int $to): void
    {
        $this->editCheckpoint($id, function (array $cp) use ($from, $to) {
            if (! isset($cp['images'][$from]) || $to < 0 || $to >= count($cp['images'])) {
                return $cp;
            }
            $moved = array_splice($cp['images'], $from, 1);
            array_splice($cp['images'], $to, 0, $moved);

            return $cp;
        });
    }

    /** The shared picture picker (library, collection, Commons, upload), adding to one checkpoint. */
    public function openCheckpointImagePicker(string $id): void
    {
        $this->checkpointPickerId = $id;
        $this->paintingPickerMode = 'checkpoint_image';
        $this->openPaintingPickerCommon();
        $this->seedLandfallImageSearch();
    }

    /** Where the picker sends a picture in 'checkpoint_image' mode. */
    private function addPickedCheckpointImage(string $url, string $credit = ''): void
    {
        if ($this->checkpointPickerId) {
            $this->addCheckpointImage($this->checkpointPickerId, $url, $credit);
        }
    }
}
