{{-- The preview-size slider of a picture grid: top right of the grid's header row. It only works
     inside x-data="imageGrid({ id, kind })" (resources/js/ui/image-grid.js), which owns the value,
     the range per kind and remembering it. Pure client side: no Livewire round trip, and
     wire:ignore so a re-render of the panel around it never resets it.

     :min/:max/:step come BEFORE x-model on purpose. Alpine applies bindings in attribute order and
     x-model after them; a value set while max is still the default 100 would be clamped to 100. --}}
<div {{ $attributes->class('flex shrink-0 items-center gap-1 text-slate-500') }}
     data-tooltip="{{ __('Preview size') }}" wire:ignore>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM13.5 10.5h-6" /></svg>
    <span class="range-panel-knob w-20"
          :style="`--range-t: ${(thumb - range.min) / (range.max - range.min)}`">
        <input type="range" class="range range-panel" aria-label="{{ __('Preview size') }}"
               :min="range.min" :max="range.max" :step="range.step" x-model.number="thumb" />
    </span>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6" /></svg>
</div>
