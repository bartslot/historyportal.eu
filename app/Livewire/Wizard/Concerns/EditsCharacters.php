<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Services\Editor\Characters;
use Livewire\Attributes\Renderless;

/**
 * The Character tab's Save (resources/js/editor/character-tab.js): the person the browser painted and cut, onto the
 * teacher's shelf "My characters". A character saved again keeps its id, so every scene that shows it follows.
 */
trait EditsCharacters
{
    /**
     * @param  array<string,mixed>  $puppet
     * @param  array<string,mixed>  $recipe
     * @return array{ok: bool, id?: int, stage?: array<string,mixed>}
     */
    #[Renderless]
    public function saveCharacter(?int $id, string $atlas, string $shade, array $puppet, array $recipe, string $name = ''): array
    {
        $asset = Characters::save(auth()->user(), $id, $atlas, $shade, $puppet, $recipe, $name);
        if ($asset === null) {
            return ['ok' => false];
        }
        $row = Characters::stageRow($asset);
        $this->dispatch('cutouts-changed', id: $asset->id, stage: $row);

        return ['ok' => true, 'id' => $asset->id, 'stage' => $row];
    }

    /** A character off the shelf; scenes that show it keep showing it. */
    #[Renderless]
    public function removeCharacter(int $id): void
    {
        if (Characters::remove(auth()->user(), $id)) {
            $this->dispatch('cutouts-changed', id: $id, removed: 'chr-'.$id);
            $this->dispatch('toast', type: 'success', message: __('Removed from My characters.'));
        }
    }
}
