@props([
    /** Style key, e.g. 'soft-atlas'. */
    'value',
    /** Short uppercase name under the thumbnail. Already translated by the caller. */
    'label',
    /** Path under public/, e.g. 'img/map-styles/soft-atlas.webp'. */
    'thumb',
    'selected' => false,
    /** Alpine expression run on click. */
    'onSelect' => null,
    /** Alpine expression that evaluates truthy when this card is the chosen one. */
    'selectedWhen' => null,
])

@php
    // Server-rendered highlight. When `selectedWhen` is given Alpine owns the class instead, so
    // these are only the starting classes it will overwrite on its first tick.
    $ringOn = 'ring-2 ring-base-content';
    $ringOff = 'ring-1 ring-base-300/70 group-hover:ring-base-content/40';
    $ring = $selected ? $ringOn : $ringOff;
@endphp

{{-- One basemap, shown as what it looks like rather than as its name.

     A style list reading "Soft Atlas / Night / Earth" asks a teacher to remember which is which;
     the picture is the label. The thumbnails already existed unused in public/img/map-styles.

     Selected is a solid white ring, not amber: amber belongs to the public site, and inside the
     teacher app the chosen state is white. The ring is drawn with `ring` rather than `border` so
     it sits INSIDE the box and the cards keep the same footprint whichever is chosen — a border
     would move its neighbours by two pixels on every switch.

     `selectedWhen` lets Alpine own the highlight where the choice lives client-side; `selected`
     covers the server-rendered case. Both are supported because the time-map holds its style in
     Alpine while a scene would hold it in Livewire. --}}
<button type="button"
        @if ($onSelect) x-on:click="{{ $onSelect }}" @endif
        @if ($selectedWhen)
            :aria-pressed="({{ $selectedWhen }}) ? 'true' : 'false'"
        @else
            aria-pressed="{{ $selected ? 'true' : 'false' }}"
        @endif
        {{ $attributes->class(['group flex min-w-0 flex-1 flex-col items-start gap-0.5']) }}>

    {{-- The height is the panel's own variable so the dev tuner moves it; see
         resources/js/dev/settings-panel-tuner.js. --}}
    <span class="relative block w-full overflow-hidden rounded-lg ring-inset transition {{ $ring }}"
          style="height: var(--settings-panel-thumb-h, 4rem)"
          @if ($selectedWhen) :class="({{ $selectedWhen }}) ? '{{ $ringOn }}' : '{{ $ringOff }}'" @endif>
        {{-- Both dimensions are set on the container AND the image: an `auto` height renders the
             thumbnail at its intrinsic size for one frame and shoves the panel down. --}}
        <img src="{{ asset($thumb) }}" alt="" width="135" height="64" loading="lazy"
             class="h-full w-full object-cover" />
    </span>

    <span class="text-2xs font-semibold uppercase tracking-wide {{ $selected ? 'text-base-content/85' : 'text-base-content/55' }}"
          @if ($selectedWhen) :class="({{ $selectedWhen }}) ? 'text-base-content/85' : 'text-base-content/55'" @endif>{{ $label }}</span>
</button>
