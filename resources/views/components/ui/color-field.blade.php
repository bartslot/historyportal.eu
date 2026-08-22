@props([
    /** Current colour as #rrggbb, or '' for "leave the artwork's own colours alone". */
    'color' => '',
    /** Fallback shown in the swatch while no colour is set. */
    'placeholder' => '#38bdf8',
    /** Strength, 0..1. */
    'opacity' => 1,
    'colorLabel' => 'Colour',
    'opacityLabel' => 'Strength',
    /** Livewire expressions. `$event.target.value` is available to both. */
    'onColorChange' => null,
    'onOpacityChange' => null,
    /** Alpine expressions for the live drag, applied without a round trip. */
    'onColorInput' => null,
    'onOpacityInput' => null,
])

@php
    $swatch = filled($color) ? $color : $placeholder;
    $hex = strtoupper(ltrim($swatch, '#'));
@endphp

{{-- Swatch, hex readout and strength in one bordered control — Figma's `color-swatch-border`.

     `input` fires on every move of the picker; `change` only when it closes. The canvas follows the
     drag locally and only the colour the teacher settles on is saved — one round trip instead of
     hundreds. That split is why both an Alpine and a Livewire hook exist for each half.

     The hex is a readout of the swatch, not a second input: two editable representations of one
     value need a reconciliation rule for half-typed hex, and there is nothing here that a picker
     does not already do. Clicking anywhere in the left cell opens the picker. --}}
{{-- Stock DaisyUI `input` in its label form: the theme draws the border, background and focus
     ring for the whole control, and the swatch, hex and strength sit inside it as one field. --}}
<div {{ $attributes->class(['input input-xs flex items-center gap-2 px-2']) }}
     style="height: var(--settings-panel-row-h, 2rem)">

    <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
        <span class="relative h-[18px] w-6 shrink-0 overflow-hidden rounded-sm ring-1 ring-inset ring-base-content/15"
              style="background: {{ $swatch }}">
            <input type="color" value="{{ $swatch }}"
                   aria-label="{{ $colorLabel }}"
                   @if ($onColorInput) x-on:input="{{ $onColorInput }}" @endif
                   @if ($onColorChange) wire:change="{{ $onColorChange }}" @endif
                   class="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        </span>
        <span class="flex min-w-0 items-baseline gap-0.5">
            <span class="text-3xs font-semibold text-panel-label">#</span>
            <span class="truncate text-xs tracking-wide text-panel-value">{{ $hex }}</span>
        </span>
    </label>

    <label class="flex shrink-0 cursor-text items-center gap-0.5 border-l border-panel-hairline pl-2">
        <input type="number" min="0" max="100" step="1" value="{{ (int) round(((float) $opacity) * 100) }}"
               aria-label="{{ $opacityLabel }}"
               @if ($onOpacityInput) x-on:input="{{ $onOpacityInput }}" @endif
               @if ($onOpacityChange) wire:change="{{ $onOpacityChange }}" @endif
               class="w-7 border-0 bg-transparent p-0 text-right text-xs outline-none
                      [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
        <span class="text-3xs font-semibold text-panel-label">%</span>
    </label>

    <x-ui.keyframe-diamond class="border-l border-panel-hairline pl-1" />
</div>
