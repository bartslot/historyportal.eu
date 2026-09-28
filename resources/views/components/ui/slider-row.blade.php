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
     * Left column width. Kept for callers that still pass it; the shell owns the column now.
     * Defaults to the panel's own variable so the dev tuner moves every row at
     * once; pass a literal only where a row is outside the settings panel.
     */
    'labelWidth' => 'var(--settings-panel-label-w, 3.0625rem)',
    /** Livewire expression for `wire:change` — the value the teacher settles on. */
    'onChange' => null,
    /** Alpine expression for `@input` — the live drag, applied locally without a round trip. */
    'onInput' => null,
    /** Show the per-property keyframe diamond at the end of the row. */
    'keyframe' => false,
    /** What the diamond keys, e.g. 'art:231' and 'opacity'. Without both it stays a marker. */
    'keyframeTarget' => null,
    'keyframeProperty' => null,
    /**
     * The property's default. Double-clicking the label returns to it — the only way back once a
     * teacher has moved something and Escape's memory has gone with the focus.
     */
    'default' => null,
])

@php
    // Where the fill stops. The rail paints it as a gradient rather than letting DaisyUI cast it
    // off the thumb, so it needs a number — rendered here so the row is right on its first frame,
    // then kept in step by resources/js/ui/range-fill.js.
    $span = (float) $max - (float) $min;
    $fillPct = $span > 0
        ? max(0, min(100, (((float) $value - (float) $min) / $span) * 100))
        : 0;
@endphp

{{-- ONE slider row for the whole app: label, rail, value — Figma `row-rotate` (1471:2104).

     This shape had been retyped eleven times across the layer, text and animate inspectors, and the
     copies had already drifted — three label widths, two value widths, and a value column that was
     `w-9` in most places and `w-7` in one, so the same panel's numbers did not line up with each
     other. The row is a Figma component, so it is a component here too.

     THE RAIL IS THIN AND THE FILL IS NOT WHITE. The first build left DaisyUI's defaults, which
     draw a fat pill with the text colour as its fill; against the file's 7px rail, muted indigo
     fill and light grey knob that read as a completely different weight — a progress bar rather
     than a control. The geometry now comes from `.range-panel` in app.css, which sets DaisyUI's own
     --range-* variables. It is still DaisyUI's range: nothing here draws a track or a thumb, so
     the keyboard stepping, RTL handling and focus ring all still come from the component.

     NOT the stacked slider. The voyage, skybox and time-map panels put the label and value on a
     line ABOVE a full-width track, usually with min/max captions under it. That is a different
     component with a different job, and it is deliberately left alone.

     The wiring is two explicit props rather than the attribute bag, because the two halves of this
     row want different attributes: `x-show` and `x-cloak` belong to the ROW (the animate inspector
     hides whole rows), and `wire:change` belongs to the INPUT. A single bag put both on both.

     The value is `display`, never a re-derivation of `value` — the caller owns the formatting, and
     a row that recomputed it would show a number the panel above it disagrees with. --}}
<x-ui.panel-row :label="$label" :default="$default" :keyframe="$keyframe"
                :keyframe-target="$keyframeTarget" :keyframe-property="$keyframeProperty"
                {{ $attributes }}>
    {{-- The wrapper draws the knob (.range-panel-knob::after); the native thumb is invisible. --}}
    <span class="range-panel-knob min-w-0 flex-1"
          style="--range-pct: {{ round($fillPct, 2) }}%; --range-t: {{ round($fillPct / 100, 4) }}">
        <input type="range" min="{{ $min }}" max="{{ $max }}" step="{{ $step }}" value="{{ $value }}"
               aria-label="{{ $label }}"
               @if ($default !== null) data-default="{{ $default }}" @endif
               @if ($onInput) x-on:input="{{ $onInput }}" @endif
               @if ($onChange) wire:change="{{ $onChange }}" @endif
               style="--range-pct: {{ round($fillPct, 2) }}%; --range-t: {{ round($fillPct / 100, 4) }}"
               class="range range-panel min-w-0" />
    </span>

    <span class="flex w-11 shrink-0 items-baseline justify-end gap-0.5">
        <span class="text-xs font-medium text-panel-value">{{ $display ?? $value }}</span>
        @if ($unit)
            <span class="text-3xs font-semibold uppercase tracking-wide text-panel-label">{{ $unit }}</span>
        @endif
    </span>
</x-ui.panel-row>
