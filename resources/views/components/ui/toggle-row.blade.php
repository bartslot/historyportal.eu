@props([
    /** Short uppercase label. Already translated by the caller. */
    'label',
    'checked' => false,
    /** Livewire expression for `wire:change`. */
    'onChange' => null,
    /** Alpine expression for `@change` — applied locally so the canvas follows immediately. */
    'onToggle' => null,
])

{{-- Label on the left, switch on the right — Figma's `grayscale-row` / `pin-toggle-row`.

     The switch is DaisyUI's plain `toggle`, NOT `toggle-warning`. Amber is the public site's
     colour; inside the teacher app an on-state reads solid white. The inspectors had drifted to
     amber toggles because that was the only variant anyone had reached for. --}}
<label {{ $attributes->class(['flex items-center justify-between gap-3 py-1']) }}>
    <span class="text-3xs font-semibold uppercase leading-tight tracking-wide text-panel-label">{{ $label }}</span>
    <input type="checkbox" @checked($checked)
           @if ($onToggle) x-on:change="{{ $onToggle }}" @endif
           @if ($onChange) wire:change="{{ $onChange }}" @endif
           class="toggle toggle-sm shrink-0" />
</label>
