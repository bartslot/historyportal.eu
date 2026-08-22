@props([
    /** One-glyph name for the axis: X, Y, W, H. */
    'glyph',
    /** Accessible name, since a single glyph is not one. Already translated by the caller. */
    'label',
    'min' => 0,
    'max' => 100,
    'step' => 1,
    'value' => 0,
    /** Livewire expression for `wire:change`. */
    'onChange' => null,
    /** Alpine expression for `@input` — the live drag/type, applied without a round trip. */
    'onInput' => null,
])

{{-- A numeric field with its axis letter in front — Figma's `input` in the position and size rows.

     A REAL number input, not a styled readout. The Figma cell shows the value as text, but a
     teacher nudging a layer one percent left needs somewhere to type it and an arrow key that
     steps it; a readout would leave the slider as the only way to hit a round number.

     The right-hand cell is the file's per-property keyframe marker. It is drawn and inert; see
     <x-ui.keyframe-diamond> for why. --}}
{{-- Stock DaisyUI `input` in its label form, which is how DaisyUI 5 wants a prefixed field. The
     theme supplies the border, background and focus ring, so nothing here restates them. --}}
<label {{ $attributes->class(['input input-xs flex items-center gap-1.5 px-2']) }}
       style="height: var(--settings-panel-row-h, 2rem)">
    {{-- data-scrub: drag the glyph sideways to change the number. See resources/js/ui/scrub.js. --}}
    <span data-scrub aria-hidden="true"
          class="shrink-0 cursor-ew-resize select-none text-3xs font-semibold uppercase tracking-wide text-panel-label">{{ $glyph }}</span>
    <input type="number" min="{{ $min }}" max="{{ $max }}" step="{{ $step }}" value="{{ $value }}"
           aria-label="{{ $label }}"
           @if ($onInput) x-on:input="{{ $onInput }}" @endif
           @if ($onChange) wire:change="{{ $onChange }}" @endif
           class="w-full min-w-0 border-0 bg-transparent p-0 text-xs outline-none
                  [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
    <x-ui.keyframe-diamond class="border-l border-panel-hairline pl-1" />
</label>
