@props([
    /** Where it goes back to. Already translated by the caller. */
    'label',
])

{{-- "‹ Scene" — Figma's `breadcrumb-row` (1470:1880).

     The way out of a selected object and back to the settings of the thing it sits on. It carries
     a word, not just an arrow: a bare chevron in a panel that also has a back-arrow-shaped collapse
     control is two different journeys drawn the same way.

     The chevron is the repo's Heroicon rather than the file's export — same glyph, and it already
     themes with currentColor. --}}
<button type="button" {{ $attributes->class([
        'flex shrink-0 items-center gap-1.5 rounded-full pr-2 text-xs font-medium',
        'text-panel-label transition-colors hover:text-base-content',
    ]) }}>
    <x-icons.chevron-left class="h-3 w-3 shrink-0" />
    {{ $label }}
</button>
