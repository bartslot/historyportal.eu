<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Services\Diorama\DioramaSpec;
use Illuminate\Support\Facades\Log;
use Livewire\Attributes\On;

/**
 * Saves a drag on the diorama stage (DioramaStage.js): an item moved to a floor cell. The whole
 * diorama JSON is re-validated before it is stored, so the editor can never save what an agent's
 * import would have been refused for (off the grid, unknown floor, a boat on its own deck).
 */
trait EditsDiorama
{
    /** @param  array<int, mixed>  $cell */
    #[On('diorama:move')]
    public function moveDioramaItem(string $itemId, string $floor, array $cell): void
    {
        if (! $this->selectedSceneId) {
            return;
        }

        $scene = $this->lesson->scenes()->findOrFail($this->selectedSceneId);
        if (! $scene->isDiorama()) {
            return;
        }

        $spec = $scene->config['diorama'];
        $spec['items'] = array_map(
            fn (array $item): array => ($item['id'] ?? null) === $itemId ? [...$item, 'floor' => $floor, 'cell' => array_values($cell)] : $item,
            $spec['items'] ?? [],
        );

        $errors = DioramaSpec::errors($spec);
        if ($errors !== []) {
            Log::warning('diorama:move refused', ['scene' => $scene->id, 'item' => $itemId, 'errors' => $errors]);
            $this->dispatch('toast', message: __('That spot is not on the floor. The move was not saved.'), type: 'warning');

            return;
        }

        // No scene:load re-dispatch: the stage already shows the new place (same rule as artwork:move).
        $scene->update(['config' => [...$scene->config, 'diorama' => $spec]]);
    }
}
