@props([
    /** Short uppercase label in the left column. Already translated by the caller. */
    'label',
    'min' => 0,
    'max' => 1,
    'step' => 0.01,
    /** Current value — the slider's position AND what `display` should have been derived from. */
    'value' => 0,
    /**
     * The value as the teacher reads it, already formatted by the caller (seconds, a count, two
     * decimals). Callers format differently enough that a `format` prop here would just be a
     * switch over every caller's need.
     */
    'display' => null,
    /** Small trailing unit shown next to the number, e.g. '%' or 's'. */
    'unit' => null,
    /**
     * Left column width. Defaults to the panel's own variable so the dev tuner moves every row at
     * once; pass a literal only where a row is outside the settings panel.
     */
    'labelWidth' => 'var(--settings-panel-label-w, 4.5rem)',
    /** Livewire expression for `wire:change` — the value the teacher settles on. */
    'onChange' => null,
    /** Alpine expression for `@input` — the live drag, applied locally without a round trip. */
    'onInput' => null,
])

{{-- ONE slider row for the whole app: label, track, value.

     This shape had been retyped eleven times across the layer, text and animate inspectors, and the
     copies had already drifted — three label widths, two value widths, and a value column that was
     `w-9` in most places and `w-7` in one, so the same panel's numbers did not line up with each
     other. The row is a Figma component (`slider-row`), so it is a component here too.

     NOT the stacked slider. The voyage, skybox and time-map panels put the label and value on a
     line ABOVE a full-width track, usually with min/max captions under it. That is a different
     component with a different job, not a variant of this one, and it is deliberately left alone.

     The wiring is two explicit props rather than the attribute bag, because the two halves of this
     row want different attributes: `x-show` and `x-cloak` belong to the ROW (the animate inspector
     hides whole rows), and `wire:change` belongs to the INPUT. A single bag put both on both.

     The value is `display`, never a re-derivation of `value` — the caller owns the formatting, and
     a row that recomputed it would show a number the panel above it disagrees with. --}}
<label {{ $attributes->class(['flex items-center gap-2']) }}>
    <span class="shrink-0 text-2xs font-semibold uppercase leading-tight tracking-wide text-base-content/55"
          style="width: {{ $labelWidth }}">{{ $label }}</span>

    <input type="range" min="{{ $min }}" max="{{ $max }}" step="{{ $step }}" value="{{ $value }}"
           aria-label="{{ $label }}"
           @if ($onInput) x-on:input="{{ $onInput }}" @endif
           @if ($onChange) wire:change="{{ $onChange }}" @endif
           class="range range-xs flex-1" />

    <span class="flex w-11 shrink-0 items-baseline justify-end gap-0.5">
        <span class="font-mono text-2xs text-base-content/85">{{ $display ?? $value }}</span>
        @if ($unit)
            <span class="text-2xs font-semibold uppercase tracking-wide text-base-content/55">{{ $unit }}</span>
        @endif
    </span>
</label>
