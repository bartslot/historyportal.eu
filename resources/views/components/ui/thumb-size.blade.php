{{-- The preview size of a picture grid, top right of the grid's header row, in COLUMNS: one stop
     per column count the grid's width really allows (imageGrid's columnStops, recomputed when it
     resizes). Three or more: a slider. Two: a toggle between large and small tiles. One: nothing,
     there is nothing to choose (Bart, 2026-10-17: "voorbeeldgrootte is BS. it's 2 settings").
     Only inside x-data="imageGrid({ id, kind })" (resources/js/ui/image-grid.js), which owns the
     value and remembers it. Pure client side, wire:ignore so a re-render never resets it.

     :max comes BEFORE x-model on purpose: Alpine applies bindings in attribute order, and a value
     set while max is still the default would be clamped. --}}
<div {{ $attributes->class('flex shrink-0 items-center gap-1 text-panel-hint') }}
     x-show="sizeMode !== 'none'" x-cloak data-thumb-size :data-size-mode="sizeMode" wire:ignore>
    <template x-if="sizeMode === 'slider'">
        <div class="flex items-center gap-1" data-tooltip="{{ __('Preview size') }}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM13.5 10.5h-6" /></svg>
            <span class="range-panel-knob w-20" :style="`--range-t: ${stops.length > 1 ? stopIndex / (stops.length - 1) : 0}`">
                <input type="range" class="range range-panel" aria-label="{{ __('Preview size') }}"
                       min="0" :max="stops.length - 1" step="1" x-model.number="stopIndex" />
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6" /></svg>
        </div>
    </template>
    <template x-if="sizeMode === 'toggle'">
        <div class="flex items-center gap-0.5" role="group" aria-label="{{ __('Preview size') }}">
            {{-- Heroicons outline: table-cells (small tiles), squares-2x2 (large tiles). --}}
            <button type="button" x-on:click="stopIndex = 0" :aria-pressed="stopIndex === 0 ? 'true' : 'false'" data-tooltip="{{ __('Small') }}" aria-label="{{ __('Small') }}"
                    class="grid h-6 w-6 place-items-center rounded transition-colors hover:text-base-content" :class="stopIndex === 0 && 'text-primary'">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" /></svg>
            </button>
            <button type="button" x-on:click="stopIndex = 1" :aria-pressed="stopIndex === 1 ? 'true' : 'false'" data-tooltip="{{ __('Large') }}" aria-label="{{ __('Large') }}"
                    class="grid h-6 w-6 place-items-center rounded transition-colors hover:text-base-content" :class="stopIndex === 1 && 'text-primary'">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>
            </button>
        </div>
    </template>
</div>
