<?php

declare(strict_types=1);

namespace App\Livewire;

use Illuminate\Support\Facades\File;
use Livewire\Component;

class TimeMap extends Component
{
    /** Seeded snapshot stops shown on the slider. */
    public array $stops = [-2000, -1500, -500, 200, 500, 1000, 1880];

    public int $year = 1600;

    public function render()
    {
        return view('livewire.time-map', ['transportNames' => $this->transportNames()])
            ->layout('components.layouts.app', ['title' => 'Time-Map']);
    }

    /**
     * The overland transports' names in the page language, for the route hover label (a camel leg
     * says "Kameel", not the fleet's ship). Labels come from the shared catalogue the map reads.
     *
     * @return array<string, string>
     */
    private function transportNames(): array
    {
        $catalogue = json_decode(File::get(resource_path('js/timemap/transports.json')), true);

        return collect($catalogue['transports'] ?? [])
            ->where('terrain', 'land')
            ->mapWithKeys(fn (array $t): array => [$t['id'] => __($t['label'])])
            ->all();
    }
}
