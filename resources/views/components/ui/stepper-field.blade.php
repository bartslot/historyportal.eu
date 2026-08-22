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

     Figma's right-hand cell — a small outlined diamond — is NOT reproduced. That rhombus is
     Figma's own "bound to a variable" affordance from the tool's inspector chrome, which the mock
     inherited; it names nothing in this product. Drawing it would put a control on the panel that
     does nothing when clicked. --}}
{{-- Stock DaisyUI `input` in its label form, which is how DaisyUI 5 wants a prefixed field. The
     theme supplies the border, background and focus ring, so nothing here restates them. --}}
<label {{ $attributes->class(['input input-xs flex items-center gap-1.5 px-2']) }}
       style="height: var(--settings-panel-row-h, 2rem)">
    <span aria-hidden="true"
          class="shrink-0 text-2xs font-semibold uppercase tracking-wide text-base-content/55">{{ $glyph }}</span>
    <input type="number" min="{{ $min }}" max="{{ $max }}" step="{{ $step }}" value="{{ $value }}"
           aria-label="{{ $label }}"
           @if ($onInput) x-on:input="{{ $onInput }}" @endif
           @if ($onChange) wire:change="{{ $onChange }}" @endif
           class="w-full min-w-0 border-0 bg-transparent p-0 font-mono text-2xs outline-none
                  [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
</label>
